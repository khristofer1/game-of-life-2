// src/hooks/useQuestManager.ts
import { saveTaskToDB, setMeta } from '../services/db';
import type { Quest } from '../types/quest';
import { GAME_CONFIG } from '../config/gameRules'; // Import dynamic costs

export function useQuestManager(
	allTasks: Quest[],
	activeTasks: Quest[],
	comingTasks: Quest[],
	deletedTasks: Quest[],
	timePoints: number,
	forceRefresh: () => void,
	setSummaryData: React.Dispatch<React.SetStateAction<any>>,
	refreshEconomy: () => void 
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
			const isNewCard = allTasks.length > 0;
			
			// 1. Derive the quest type from the boolean flags that Partial<Quest> knows about
			let derivedType: 'onetime' | 'recurring' | 'break' = 'recurring';
			if (newQuestData.isBreak) derivedType = 'break';
			else if (newQuestData.isOneTime) derivedType = 'onetime';

			// 2. Look up the cost using the CORRECT property name from GAME_CONFIG
			const cost = GAME_CONFIG.cardCosts[derivedType];

			// Deduct TP dynamically based on quest type
			if (isNewCard && cost > 0) {
				if (timePoints < cost) {
					alert(`Not enough Time Points! You need ${cost} TP to create a ${derivedType} card.`);
					return;
				}
				await setMeta("timePoints", timePoints - cost);
				refreshEconomy(); // SYNC THE ECONOMY UI INSTANTLY
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
		const reviveCost = 10; // Keeping revive cost hardcoded to 10 for now
		if (timePoints < reviveCost) return alert("Not enough Time Points to revive this card!");

		const taskToRevive = [...activeTasks, ...comingTasks, ...deletedTasks].find(t => t.id === taskId);
		if (!taskToRevive) return;

		// Removes it from the "Trash" state
		delete taskToRevive.deletedAt;

		// Deduct TP and Sync
		const newTp = timePoints - reviveCost;
		await setMeta("timePoints", newTp);
		refreshEconomy(); // SYNC THE ECONOMY UI INSTANTLY

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