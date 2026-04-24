// src/hooks/useDailySummary.ts
import { useState, useEffect, useRef } from 'react';
import { getMeta, setMeta, deleteTaskFromDB, saveTaskToDB } from '../services/db';
import type { Quest } from '../types/quest';

// 1. Add pendingRewards as the second argument
export const useDailySummary = (allTasks: Quest[], pendingRewards: { gems: number, tp: number }) => {
	const [showSummaryModal, setShowSummaryModal] = useState(false);
	const [summaryData, setSummaryData] = useState({ completed: [] as Quest[], expired: [] as Quest[], gemsGained: 0 });
	const hasCheckedSummary = useRef(false);

	useEffect(() => {
		const checkDailySummary = async () => {
			const today = new Date().setHours(0, 0, 0, 0);
			const lastSummary = await getMeta("lastSummaryDate", 0);
			const yesterdayStart = today - (24 * 60 * 60 * 1000);

			// 📊 1. ALWAYS CALCULATE THE DATA
			const completedYesterday = allTasks.filter(t => {
				if (t.completionDates && t.completionDates.length > 0) {
					return t.completionDates.some(date => date >= yesterdayStart && date < today);
				}
				return t.completedAt && t.completedAt >= yesterdayStart && t.completedAt < today;
			});

			const expiredOneTime = allTasks.filter(t =>
				t.isOneTime && !t.completed && !t.deletedAt && t.deadline && t.deadline < today
			);

			const breaksYesterday = allTasks.filter(t =>
				t.isBreak && t.lastDoneAt && t.lastDoneAt >= yesterdayStart && t.lastDoneAt < today
			);

			const totalGemsGained = completedYesterday.length + breaksYesterday.length;

			setSummaryData({
				completed: [...completedYesterday, ...breaksYesterday],
				expired: expiredOneTime,
				gemsGained: totalGemsGained
			});

			// --- NEW GATEKEEPER CHECK ---
			// We trust the dynamic engine instead of Firestore
			const hasUnclaimedRewards = pendingRewards.gems > 0 || pendingRewards.tp > 0;

			// 🚪 ALWAYS OPEN IF THERE ARE REWARDS
			// This is now safely completely outside the "once-a-day" block
			if (hasUnclaimedRewards) {
				setShowSummaryModal(true);
			}

			// 🧹 2. ONLY AUTO-POPUP & PURGE ONCE PER DAY
			if (today > lastSummary) {
				
				// --- THE DOWNGRADE RULE (Shield Insurance) ---
				const recurringToUpdate: Quest[] = [];
				
				for (const task of allTasks) {
					if (!task.isOneTime && !task.isBreak && !task.completed && !task.deletedAt && task.cycleStart && task.activeDeadlineMs) {
						const deadline = task.cycleStart + task.activeDeadlineMs;
						
						if (deadline >= yesterdayStart && deadline < today) {
							let updatedTask = { ...task };
							const daysInCycle = Math.max(1, Math.round(task.activeDeadlineMs / 86400000));
							const shieldsNeeded = daysInCycle >= 6 ? 1 : daysInCycle;
							const currentShields = task.shields || 0;

							if (currentShields >= shieldsNeeded) {
								updatedTask.shields = currentShields - shieldsNeeded;
								recurringToUpdate.push(updatedTask);
							} else {
								if (task.tier !== 'standard' || currentShields > 0 || (task.accumulatedDays && task.accumulatedDays > 0)) {
									updatedTask.tier = 'standard';
									updatedTask.shields = 0;
									updatedTask.accumulatedDays = 0;
									updatedTask.streak = 0; 
									recurringToUpdate.push(updatedTask);
								}
							}
						}
					}
				}

				for (const t of recurringToUpdate) {
					if (t.id) await saveTaskToDB(t);
				}
				// --- END DOWNGRADE RULE ---

				const sevenDaysAgo = today - (7 * 24 * 60 * 60 * 1000);
				const tasksToPurge = allTasks.filter(t =>
					t.isOneTime && t.completed && t.gemClaimed && t.completedAt && t.completedAt < sevenDaysAgo
				);

				for (const task of tasksToPurge) {
					if (task.id) await deleteTaskFromDB(task.id);
				}

				// If there were no rewards, but tasks WERE completed/expired yesterday, open it.
				// Otherwise, quietly mark the day as checked.
				if (completedYesterday.length > 0 || expiredOneTime.length > 0) {
					setShowSummaryModal(true);
				} else {
					await setMeta("lastSummaryDate", today);
				}
			}
		};

		if (!hasCheckedSummary.current && allTasks.length > 0) {
			checkDailySummary();
			hasCheckedSummary.current = true;
		}
	// Add pendingRewards to the dependency array so React has the fresh calculation
	}, [allTasks, pendingRewards]); 

	const handleCloseSummary = async () => {
		setShowSummaryModal(false);
		const today = new Date().setHours(0, 0, 0, 0);
		await setMeta("lastSummaryDate", today); 
	};

	return { showSummaryModal, setShowSummaryModal, summaryData, setSummaryData, handleCloseSummary };
};