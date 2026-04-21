// src/hooks/useGameEconomy.ts
import { setMeta, saveTaskToDB } from '../services/db';
import type { Quest } from '../types/quest';
import type { ToastAction } from './useToast';

// We pass in the state and functions this hook needs to do its job
export function useGameEconomy(
	gems: number,
	timeDeposit: number,
	allTasks: Quest[],
	forceRefresh: () => void,
	triggerToast: (message: string, action?: ToastAction, taskId?: number) => void
) {
	
	const handleBuyShield = async (taskId: number, cost: number) => {
		const taskToUpdate = allTasks.find(t => t.id === taskId);
		if (!taskToUpdate) return;

		if (gems < cost) {
			alert(`Not enough gems! You need ${cost} 💎 to buy this shield.`);
			return;
		}

		const isConfirmed = window.confirm(
			`Equip a shield to "${taskToUpdate.name}"?\n\nCost: ${cost} 💎\nCurrent Balance: ${gems} 💎`
		);
		
		if (!isConfirmed) return; 

		const newGems = gems - cost;
		await setMeta("gems", newGems);

		taskToUpdate.shields = (taskToUpdate.shields || 0) + 1;
		await saveTaskToDB(taskToUpdate);

		forceRefresh();
		triggerToast(`Shield equipped to ${taskToUpdate.name}! 🛡️`);
	};

	const handleBuyGemWithTime = async () => {
		const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
		
		if (timeDeposit < oneWeekMs) {
			alert("Not enough Time! You need at least 1 Week in your vault to buy a Gem.");
			return;
		}

		const isConfirmed = window.confirm(
			`Trade 1 Week of Time for 1 Gem? 💎\n\nThis will deduct 7 days from your Time Vault.`
		);
		if (!isConfirmed) return;

		const newTime = timeDeposit - oneWeekMs;
		await setMeta("timeDepositMs", newTime);

		const newGems = gems + 1;
		await setMeta("gems", newGems);

		forceRefresh();
		triggerToast("Exchange complete! +1 Gem 💎");
	};

	const handleBuyTimeWithGem = async () => {
		if (gems < 1) {
			alert("Not enough Gems! You need at least 1 💎 to buy time.");
			return;
		}

		const isConfirmed = window.confirm(
			`Shatter 1 Gem for 6 Days of Time? ⏳\n\nThis will instantly add 6 days to your Time Vault.`
		);
		if (!isConfirmed) return;

		const newGems = gems - 1;
		await setMeta("gems", newGems);

		const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
		await setMeta("timeDepositMs", timeDeposit + sixDaysMs);

		forceRefresh();
		triggerToast("Exchange complete! +6 Days ⏳");
	};

	// Expose these functions to whoever uses the hook!
	return {
		handleBuyShield,
		handleBuyGemWithTime,
		handleBuyTimeWithGem
	};
}