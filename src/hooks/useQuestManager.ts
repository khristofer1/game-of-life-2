// src/hooks/useQuestManager.ts
import { saveTaskToDB, setMeta } from '../services/db';
import type { Quest } from '../types/quest';

export function useQuestManager(
	activeTasks: Quest[],
	comingTasks: Quest[],
	deletedTasks: Quest[],
	gems: number,
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
			// BRAND NEW QUEST
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
		if (gems < 1) return alert("Not enough gems to revive this card!");

		const taskToRevive = [...activeTasks, ...comingTasks, ...deletedTasks].find(t => t.id === taskId);
		if (!taskToRevive) return;

		// Removes it from the "Trash" state
		delete taskToRevive.deletedAt;

		// Deduct 1 gem
		const newGems = gems - 1;
		await setMeta("gems", newGems);

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