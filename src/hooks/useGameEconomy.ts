// src/hooks/useGameEconomy.ts
import { setMeta, getMeta, saveTaskToDB, incrementMeta } from '../services/db';
import type { Quest } from '../types/quest';
import type { ToastAction } from './useToast';
import { GAME_CONFIG } from '../config/gameRules';

// We pass in the state and functions this hook needs to do its job
export function useGameEconomy(
	allTasks: Quest[],
	forceRefresh: () => void,
	triggerToast: (message: string, action?: ToastAction, taskId?: number) => void
) {

	const handleBuyShield = async (taskId: number, cost: number) => {
		const taskToUpdate = allTasks.find(t => t.id === taskId);
		if (!taskToUpdate) return;

		// Fetch the absolute latest gem count right before purchase
		const freshGems = await getMeta("gems", 0);

		if (freshGems < cost) {
			alert(`Not enough gems! You need ${cost} 💎 to buy this shield.`);
			return;
		}

		const isConfirmed = window.confirm(
			`Equip a shield to "${taskToUpdate.name}"?\n\nCost: ${cost} 💎\nCurrent Balance: ${freshGems} 💎`
		);

		if (!isConfirmed) return;

		// Use atomic decrement
		await incrementMeta("gems", -cost);

		taskToUpdate.shields = (taskToUpdate.shields || 0) + 1;
		await saveTaskToDB(taskToUpdate);

		forceRefresh();
		triggerToast(`Shield equipped to ${taskToUpdate.name}! 🛡️`);
	};

	const handleBuyGemWithTime = async () => {
		const cost = GAME_CONFIG.economy.mintGemCostTP;
		const freshTP = await getMeta("timePoints", 0);

		if (freshTP < cost) {
			triggerToast(`Not enough Time Points! You need ${cost} TP to mint a Gem.`);
			return;
		}

		// Use atomic math
		await incrementMeta("timePoints", -cost);
		await incrementMeta("gems", 1);
		forceRefresh();
		triggerToast("Gem minted successfully! 💎");
	};

	const handleBuyTimeWithGem = async () => {
		const freshGems = await getMeta("gems", 0);
		if (freshGems < 1) {
			triggerToast("You don't have any Gems to shatter!");
			return;
		}

		const yieldTP = GAME_CONFIG.economy.shatterGemYieldTP;
		// Use atomic math
		await incrementMeta("gems", -1);
		await incrementMeta("timePoints", yieldTP);
		forceRefresh();
		triggerToast(`Gem shattered! Gained ${yieldTP} TP ⏳`);
	};

	const handleClaimRewards = async (
		pendingGems: number,
		pendingTP: number,
		pendingMedal: { bronze: number; silver: number; gold: number }
	) => {
		const todayStr = new Date().toISOString().split('T')[0];

		// 1. Move pending to actual balance using ATOMIC INCREMENTS
		// This solves the stale state bug!
		if (pendingGems > 0) await incrementMeta("gems", pendingGems);
		if (pendingTP > 0) await incrementMeta("timePoints", pendingTP);

		// --- MOVE MEDALS TO INVENTORY ---
		const currentMedals = await getMeta("medals", { bronze: 0, silver: 0, gold: 0 });
		await setMeta("medals", {
			bronze: currentMedals.bronze + pendingMedal.bronze,
			silver: currentMedals.silver + pendingMedal.silver,
			gold: currentMedals.gold + pendingMedal.gold
		});

		// 2. Clear the pending buckets
		await setMeta("unclaimedGems", 0);
		await setMeta("unclaimedTP", 0);
		await setMeta("unclaimedMedals", { bronze: 0, silver: 0, gold: 0 });

		// 3. Mark today as claimed
		await setMeta("lastClaimDate", todayStr);

		forceRefresh();
	};

	return {
		handleBuyShield,
		handleBuyGemWithTime,
		handleBuyTimeWithGem,
		handleClaimRewards
	};
}