// src/hooks/useQuestActions.ts
import { saveTaskToDB, deleteTaskFromDB, setMeta } from '../services/db';
import type { Quest } from '../types/quest';
import type { ToastAction } from './useToast';
import confetti from 'canvas-confetti';
import successSound from '../assets/success.mp3';
import { formatTimeDeposit } from '../utils/timeFormat';

export function useQuestActions(
	allTasks: Quest[],
	breakTasks: Quest[],
	deletedTasks: Quest[],
	timeDeposit: number,
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

			let activeDuration = updatedTask.isOneTime ? updatedTask.durationMs : (updatedTask.activeDeadlineMs || 1);
			let activeDeadline = updatedTask.isOneTime ? (updatedTask.deadline || 0) : ((updatedTask.cycleStart || 0) + (updatedTask.activeDeadlineMs || 0));
			let timeLeft = activeDeadline - now;

			if (timeLeft > 0) {
				const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
				const depositAmount = Math.floor(Math.min(timeLeft, activeDuration, oneWeekMs));
				
				updatedTask.lastDepositMs = depositAmount;
				await setMeta("timeDepositMs", timeDeposit + depositAmount);
			} else {
				updatedTask.lastDepositMs = 0;
			}

			if (timeLeft > 0) {
				updatedTask.energyPercent = Math.max(0, Math.min(100, Math.round((timeLeft / activeDuration) * 100)));
			} else {
				updatedTask.energyPercent = 0;
			}

			// --- THE HIDDEN XP & LEVEL UP ENGINE ---
			if (!updatedTask.isOneTime && !updatedTask.isBreak) {
				const activeDurationMs = updatedTask.activeDeadlineMs || 86400000;
				const daysInCycle = Math.max(1, Math.round(activeDurationMs / 86400000));
				
				updatedTask.accumulatedDays = (updatedTask.accumulatedDays || 0) + daysInCycle;
				updatedTask.streak = (updatedTask.streak || 0) + 1;

				const totalDays = updatedTask.accumulatedDays;
				let currentTier = updatedTask.tier || 'standard';
				let leveledUp = false;
				let newMaxCapacity = 1;

				if (currentTier === 'standard' && totalDays >= 7) {
					updatedTask.tier = 'bronze';
					newMaxCapacity = 2;
					leveledUp = true;
				} else if (currentTier === 'bronze' && totalDays >= 30) {
					updatedTask.tier = 'silver';
					newMaxCapacity = 3;
					leveledUp = true;
				} else if (currentTier === 'silver' && totalDays >= 120) {
					updatedTask.tier = 'gold';
					newMaxCapacity = 4;
					leveledUp = true;
				} else if (currentTier === 'gold' && totalDays >= 365) {
					updatedTask.tier = 'diamond';
					newMaxCapacity = 5;
					leveledUp = true;
				} else {
					switch (currentTier) {
						case 'standard': newMaxCapacity = 1; break;
						case 'bronze':   newMaxCapacity = 2; break;
						case 'silver':   newMaxCapacity = 3; break;
						case 'gold':     newMaxCapacity = 4; break;
						case 'diamond':  newMaxCapacity = 5; break;
						default:         newMaxCapacity = 1;
					}
				}

				if (daysInCycle >= 6) newMaxCapacity = 1;

				if (leveledUp) {
					updatedTask.shields = newMaxCapacity;
					triggerToast(`Level Up! ${updatedTask.name} is now ${(updatedTask.tier || 'standard').toUpperCase()}! Shields refilled.`, 'complete', id);
				}
			}

			// 🎇 THE CELEBRATION ENGINE 🎇
			const audio = new Audio(successSound);
			const volumeMap = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
			audio.volume = volumeMap[volumeLevel];

			if (volumeLevel > 0) {
				audio.play().catch(error => console.log("Audio blocked by browser:", error));
			}

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
				const activeDurationMs = updatedTask.activeDeadlineMs || 86400000;
				const daysInCycle = Math.max(1, Math.round(activeDurationMs / 86400000));

				updatedTask.accumulatedDays = Math.max(0, (updatedTask.accumulatedDays || 0) - daysInCycle);
				updatedTask.streak = Math.max(0, (updatedTask.streak || 0) - 1);

				const totalDays = updatedTask.accumulatedDays;
				let newTier: 'standard' | 'bronze' | 'silver' | 'gold' | 'diamond' = 'standard';
				let newMaxCapacity = 1;

				if (totalDays >= 365) { newTier = 'diamond'; newMaxCapacity = 5; }
				else if (totalDays >= 120) { newTier = 'gold'; newMaxCapacity = 4; }
				else if (totalDays >= 30) { newTier = 'silver'; newMaxCapacity = 3; }
				else if (totalDays >= 7) { newTier = 'bronze'; newMaxCapacity = 2; }

				if (daysInCycle >= 6) newMaxCapacity = 1;

				updatedTask.tier = newTier;

				if ((updatedTask.shields || 0) > newMaxCapacity) {
					updatedTask.shields = newMaxCapacity;
				}
			}

			if (updatedTask.lastDepositMs) {
				const newBankBalance = Math.max(0, timeDeposit - updatedTask.lastDepositMs);
				await setMeta("timeDepositMs", newBankBalance);
				updatedTask.lastDepositMs = 0;
			}

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

		const breakCost = task.cooldownMs || 0;
		if (timeDeposit < breakCost) {
			triggerToast(`Not enough Time! You need ${formatTimeDeposit(breakCost)}.`);
			return; 
		}
		
		await setMeta("timeDepositMs", timeDeposit - breakCost);
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
		
		const breakCost = taskToUpdate.cooldownMs || 0;
		await setMeta("timeDepositMs", timeDeposit + breakCost);

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