// src/hooks/useQuestManager.ts
import { saveTaskToDB, setMeta } from '../services/db';
import type { Quest } from '../types/quest';

export function useQuestManager(
	allTasks: Quest[],
	activeTasks: Quest[],
	comingTasks: Quest[],
	deletedTasks: Quest[],
	timePoints: number,
	forceRefresh: () => void,
	setSummaryData: React.Dispatch<React.SetStateAction<any>>
) {
	
	const handleSaveQuest = async (newQuestData: Partial<Quest>, editingQuest: Quest | null, onSuccess: () => void) => {
		const now = Date.now();
		let finalQuest: Quest;

		if (editingQuest) {
			// MERGE EDIT DATA
			finalQuest = { ...editingQuest, ...newQuestData } as Quest;

			// UNCONDITIONAL SYNC: Nuke the ghost time. 
			finalQuest.cycleStart = newQuestData.startDate;

			const isPending = finalQuest.startDate && now < finalQuest.startDate;
			if (isPending) {
				finalQuest.energyPercent = 100;
			} else if (!finalQuest.completed) {
				if (finalQuest.isOneTime) {
					const timeLeft = (finalQuest.deadline || 0) - now;
					finalQuest.energyPercent = Math.max(0, Math.min(100, Math.round((timeLeft / finalQuest.durationMs) * 100)));
				} else {
					const activeTimeLeft = (finalQuest.cycleStart || 0) + (finalQuest.activeDeadlineMs || 0) - now;
					finalQuest.energyPercent = activeTimeLeft > 0
						? Math.max(0, Math.min(100, Math.round((activeTimeLeft / (finalQuest.activeDeadlineMs || 1)) * 100)))
						: 0;
				}
			}
		} else {
			// BRAND NEW QUEST - Deduct 10 TP unless it's their very first card
			if (allTasks.length > 0 && timePoints < 10) {
				alert("Not enough Time Points to create a new card!");
				return;
			}
			if (allTasks.length > 0) {
				await setMeta("timePoints", timePoints - 10);
			}

			finalQuest = {
				...newQuestData,
				isArchived: false,
				createdAt: newQuestData.startDate || now,
				cycleStart: newQuestData.startDate || now,
				streak: 0,
				completed: false,
				energyPercent: 100,
				accumulatedDays: 0,
				shields: 0,
				tier: 'standard'
			} as Quest;
		}

		await saveTaskToDB(finalQuest);
		forceRefresh(); 
		onSuccess(); // Triggers the modal to close!
	};

	const handleReviveCard = async (taskId: number) => {
		if (timePoints < 10) return alert("Not enough Time Points to revive this card!");

		const taskToRevive = [...activeTasks, ...comingTasks, ...deletedTasks].find(t => t.id === taskId);
		if (!taskToRevive) return;

		// Removes it from the "Trash" state
		delete taskToRevive.deletedAt;

		// Deduct 10 TP
		const newTp = timePoints - 10;
		await setMeta("timePoints", newTp);

		// Reset the card times to NOW, keeping the original duration
		const now = Date.now();
		taskToRevive.startDate = now;
		taskToRevive.deadline = now + taskToRevive.durationMs;
		taskToRevive.cycleStart = now;
		taskToRevive.energyPercent = 100; // Refill the progress bar

		await saveTaskToDB(taskToRevive);
		forceRefresh();

		// Immediately remove it from the summary modal list
		setSummaryData((prev: any) => ({
			...prev,
			expired: prev.expired.filter((t: Quest) => t.id !== taskId)
		}));
	};

	return { handleSaveQuest, handleReviveCard };
}