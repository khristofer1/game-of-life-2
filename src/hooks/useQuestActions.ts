// src/hooks/useQuestActions.ts
import { saveTaskToDB, deleteTaskFromDB, setMeta } from '../services/db';
import type { Quest } from '../types/quest';
import type { ToastAction } from './useToast';
import confetti from 'canvas-confetti';
import successSound from '../assets/success.mp3';
import { GAME_CONFIG } from '../config/gameRules';
import {
	calculateStreakPoints,
	determineNextTier,
	getQualifiedTier,
	calculateShieldCapacity
} from '../utils/questCalculations';

export function useQuestActions(
	allTasks: Quest[],
	breakTasks: Quest[],
	deletedTasks: Quest[],
	timePoints: number,
	volumeLevel: number,
	forceRefresh: () => void,
	triggerToast: (message: string, action?: ToastAction, taskId?: number) => void
) {

	const handleToggleComplete = async (id: number, isUndoFromToast = false) => {
		const taskToUpdate = allTasks.find(t => t.id === id);
		if (!taskToUpdate) return;

		const now = Date.now();
		const updatedTask = { ...taskToUpdate };

		// --- COMPLETING A TASK ---
		if (!updatedTask.completed) {
			updatedTask.completed = true;
			updatedTask.completedAt = now;
			updatedTask.gemClaimed = false;

			if (!updatedTask.completionDates) updatedTask.completionDates = [];
			updatedTask.completionDates.push(now);

			const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
			updatedTask.completionDates = updatedTask.completionDates.filter(date => date >= sevenDaysAgo);

			// 🌟 STREAK POINTS & TIER LOGIC 🌟
			if (!updatedTask.isOneTime && !updatedTask.isBreak) {
				const durationMs = updatedTask.activeDeadlineMs || 86400000;
				const activeDeadline = (updatedTask.cycleStart || 0) + durationMs;
				const daysInCycle = Math.max(1, Math.round(durationMs / 86400000));

				const currentSP = updatedTask.streakPoints || 0;
				const currentTier = updatedTask.tier || 'standard';

				if (now >= activeDeadline) {
					// --- LATE COMPLETION: SHIELD CHECK ---
					const msPastDeadline = now - activeDeadline;
					const cyclesMissed = Math.ceil(msPastDeadline / durationMs);
					const currentShields = updatedTask.shields || 0;

					if (currentShields >= cyclesMissed) {
						// 🛡️ SHIELD SAVES THE STREAK!
						updatedTask.shields = currentShields - cyclesMissed;
						updatedTask.streakPoints = calculateStreakPoints(currentSP, daysInCycle);
						updatedTask.tier = determineNextTier(currentTier, updatedTask.streakPoints);

						triggerToast(`Shield activated! Saved your streak (-${cyclesMissed} 🛡️)`);
					} else {
						// 💔 STREAK BROKEN
						updatedTask.streakPoints = 1;   // Start fresh with 1 SP for this completion
						updatedTask.tier = 'standard';  // Drop back to baseline
						updatedTask.shields = 0;        // Shatter any remaining shields

						triggerToast("Streak broken! Not enough shields to protect it.");
					}
				} else {
					// --- ON-TIME COMPLETION ---
					updatedTask.streakPoints = calculateStreakPoints(currentSP, daysInCycle);
					updatedTask.tier = determineNextTier(currentTier, updatedTask.streakPoints);
				}

				// --- LEVEL UP LOGIC ---
				// If the tier changed during this completion, we refill shields!
				if (updatedTask.tier !== currentTier) {
					updatedTask.shields = calculateShieldCapacity(updatedTask.tier, daysInCycle);
					triggerToast(`Level Up! ${updatedTask.name} is now ${updatedTask.tier!.toUpperCase()}! Shields refilled.`, 'complete', id);
				}
			}

			let activeDuration = updatedTask.isOneTime ? updatedTask.durationMs : (updatedTask.activeDeadlineMs || 1);
			let activeDeadline = updatedTask.isOneTime ? (updatedTask.deadline || 0) : ((updatedTask.cycleStart || 0) + (updatedTask.activeDeadlineMs || 0));
			let timeLeft = activeDeadline - now;

			if (timeLeft > 0) {
				updatedTask.energyPercent = Math.max(0, Math.min(100, Math.round((timeLeft / activeDuration) * 100)));
				if (updatedTask.energyPercent >= GAME_CONFIG.energy.greenThreshold) {
					updatedTask.pendingMedal = 'gold';
				} else if (updatedTask.energyPercent >= GAME_CONFIG.energy.yellowThreshold) {
					updatedTask.pendingMedal = 'silver';
				} else {
					updatedTask.pendingMedal = 'bronze';
				}

				const hoursSaved = timeLeft / (1000 * 60 * 60);
				const earnedTP = Math.floor(hoursSaved);
				updatedTask.lastDepositMs = Math.min(earnedTP, 10);
			} else {
				updatedTask.energyPercent = 0;
				updatedTask.lastDepositMs = 0;
			}

			const audio = new Audio(successSound);
			const volumeMap = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
			audio.volume = volumeMap[volumeLevel];
			if (volumeLevel > 0) audio.play().catch(error => console.log("Audio blocked by browser:", error));

			confetti({
				particleCount: 150,
				spread: 80,
				origin: { y: 0.6 },
				colors: ['#f97316', '#fbbf24', '#34d399', '#3b82f6']
			});

			await saveTaskToDB(updatedTask);
			forceRefresh();
			if (!isUndoFromToast) triggerToast(`Completed: ${updatedTask.name}`, 'complete', id);

			// --- UNDOING A COMPLETION ---
		} else {
			updatedTask.completed = false;
			updatedTask.completedAt = null;
			updatedTask.gemClaimed = false;
			updatedTask.isArchived = false;

			if (!updatedTask.isOneTime && !updatedTask.isBreak) {
				updatedTask.streak += 1;
				
				const activeDurationMs = updatedTask.activeDeadlineMs || 86400000;
				const daysInCycle = Math.max(1, Math.round(activeDurationMs / 86400000));

				const currentSP = updatedTask.streakPoints || 0;

				// Rollback SP Math
				if (currentSP > 1) {
					updatedTask.streakPoints = Math.max(0, currentSP - daysInCycle);
				} else {
					updatedTask.streakPoints = 0;
				}

				// Recalculate Tier and Shields based on raw SP to ensure clean downgrade
				updatedTask.tier = getQualifiedTier(updatedTask.streakPoints);
				const newMaxCapacity = calculateShieldCapacity(updatedTask.tier, daysInCycle);

				if ((updatedTask.shields || 0) > newMaxCapacity) {
					updatedTask.shields = newMaxCapacity;
				}
			}

			if (updatedTask.lastDepositMs) updatedTask.lastDepositMs = 0;
			if (updatedTask.pendingMedal) delete updatedTask.pendingMedal;
			if (updatedTask.completionDates && updatedTask.completionDates.length > 0) {
				updatedTask.completionDates.pop();
			}

			await saveTaskToDB(updatedTask);
			forceRefresh();
			if (!isUndoFromToast) triggerToast("Card restored to active.", 'complete', id);
		}
	};

	const handleTakeBreak = async (id: number) => {
		const task = breakTasks.find(t => t.id === id);
		if (!task) return;

		const cooldownHours = (task.cooldownMs || 0) / (1000 * 60 * 60);
		const tpCost = Math.min(10, Math.ceil(cooldownHours)); // 1 TP per hour, maximum cost of 10

		// Check if they can afford it
		if (timePoints < tpCost) {
			triggerToast(`Not enough TPs! You need ${tpCost} TP to take this break.`);
			return;
		}

		// Deduct the TP
		await setMeta("timePoints", timePoints - tpCost);

		task.previousLastDoneAt = task.lastDoneAt;
		task.previousGemClaimed = task.gemClaimed;
		task.lastDoneAt = Date.now();
		task.energyPercent = 0;
		task.gemClaimed = false;

		await saveTaskToDB(task);
		forceRefresh();
		triggerToast(`Break taken! Gem will arrive at midnight 🌙`, 'break', id);
	};

	const handleUndoBreak = async (id: number) => {
		const taskToUpdate = allTasks.find(t => t.id === id);
		if (!taskToUpdate) return;

		// Recalculate the TP cost to refund it accurately
		const cooldownHours = (taskToUpdate.cooldownMs || 0) / (1000 * 60 * 60);
		const tpRefund = Math.min(10, Math.ceil(cooldownHours));

		await setMeta("timePoints", timePoints + tpRefund);

		taskToUpdate.lastDoneAt = taskToUpdate.previousLastDoneAt || 0;
		if (taskToUpdate.previousGemClaimed !== undefined) {
			taskToUpdate.gemClaimed = taskToUpdate.previousGemClaimed;
		}

		await saveTaskToDB(taskToUpdate);
		forceRefresh();
	};

	const handleDelete = async (id: number, isUndoFromToast = false) => {
		const taskToTrash = allTasks.find(t => t.id === id);
		if (taskToTrash) {
			taskToTrash.deletedAt = Date.now();
			await saveTaskToDB(taskToTrash);
			forceRefresh();
			if (!isUndoFromToast) triggerToast("Card moved to trash.", 'delete', id);
		}
	};

	const handleRestore = async (id: number, isUndoFromToast = false) => {
		const task = deletedTasks.find(t => t.id === id);
		if (task) {
			delete task.deletedAt;
			await saveTaskToDB(task);
			forceRefresh();
			if (!isUndoFromToast) triggerToast("Card restored from trash.", 'restore', id);
		}
	};

	const handleHardDelete = async (id: number) => {
		if (window.confirm("Destroy this card forever?")) {
			await deleteTaskFromDB(id);
			forceRefresh();
		}
	};

	return {
		handleToggleComplete,
		handleTakeBreak,
		handleUndoBreak,
		handleDelete,
		handleRestore,
		handleHardDelete
	};
}