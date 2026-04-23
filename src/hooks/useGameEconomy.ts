// src/hooks/useGameEconomy.ts
import { setMeta, getMeta, saveTaskToDB } from '../services/db';
import type { Quest } from '../types/quest';
import type { ToastAction } from './useToast';
import { GAME_CONFIG } from '../config/gameRules';

// We pass in the state and functions this hook needs to do its job
export function useGameEconomy(
	gems: number,
	timePoints: number,
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
		const cost = GAME_CONFIG.economy.mintGemCostTP
		if (timePoints < cost) {
			triggerToast("Not enough Time Points! You need ${cost} TP to mint a Gem.");
			return;
		}

		await setMeta("timePoints", timePoints - cost);
		await setMeta("gems", gems + 1);
		forceRefresh();
		triggerToast("Gem minted successfully! 💎");
	};

	const handleBuyTimeWithGem = async () => {
		if (gems < 1) {
			triggerToast("You don't have any Gems to shatter!");
			return;
		}

		const yieldTP = GAME_CONFIG.economy.shatterGemYieldTP;
		await setMeta("gems", gems - 1);
		await setMeta("timePoints", timePoints + yieldTP);
		forceRefresh();
		triggerToast(`Gem shattered! Gained ${yieldTP} TP ⏳`);
	};

	const handleClaimRewards = async (
		pendingGems: number,
		pendingTP: number,
		pendingKeys: { bronze: number; silver: number; gold: number }
	) => {
		const todayStr = new Date().toISOString().split('T')[0];
		
		// 1. Move pending to actual balance
		await setMeta("gems", gems + pendingGems);
		await setMeta("timePoints", timePoints + pendingTP);

		// --- MOVE KEYS TO INVENTORY ---
		const currentKeys = await getMeta("keys", { bronze: 0, silver: 0, gold: 0 });
		await setMeta("keys", {
			bronze: currentKeys.bronze + pendingKeys.bronze,
			silver: currentKeys.silver + pendingKeys.silver,
			gold: currentKeys.gold + pendingKeys.gold
		});
		
		// 2. Clear the pending buckets
		await setMeta("unclaimedGems", 0);
		await setMeta("unclaimedTP", 0);
		await setMeta("unclaimedKeys", { bronze: 0, silver: 0, gold: 0 });
		
		// 3. Mark today as claimed
		await setMeta("lastClaimDate", todayStr);
		
		forceRefresh();
	};

	// Expose these functions to whoever uses the hook!
	return {
		handleBuyShield,
		handleBuyGemWithTime,
		handleBuyTimeWithGem,
		handleClaimRewards
	};
}