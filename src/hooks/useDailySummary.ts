// src/hooks/useDailySummary.ts
import { useState, useEffect, useRef } from 'react';
import { getMeta, setMeta, deleteTaskFromDB } from '../services/db';
import type { Quest } from '../types/quest';

export const useDailySummary = (allTasks: Quest[]) => {
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
				completed: completedYesterday,
				expired: expiredOneTime,
				gemsGained: totalGemsGained
			});

			// 🧹 2. ONLY AUTO-POPUP & PURGE ONCE PER DAY
			if (today > lastSummary) {
				const sevenDaysAgo = today - (7 * 24 * 60 * 60 * 1000);
				const tasksToPurge = allTasks.filter(t =>
					t.isOneTime && t.completed && t.gemClaimed && t.completedAt && t.completedAt < sevenDaysAgo
				);

				for (const task of tasksToPurge) {
					if (task.id) await deleteTaskFromDB(task.id);
				}

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
	}, [allTasks]);

	const handleCloseSummary = async () => {
		setShowSummaryModal(false);
		const today = new Date().setHours(0, 0, 0, 0);
		await setMeta("lastSummaryDate", today); 
	};

	return { showSummaryModal, setShowSummaryModal, summaryData, setSummaryData, handleCloseSummary };
};