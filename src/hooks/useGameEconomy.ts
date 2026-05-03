// src/hooks/useGameEconomy.ts
import { useState, useCallback } from 'react';
import { setMeta, getMeta, saveTaskToDB, incrementMeta } from '../services/db';
import type { Quest } from '../types/quest';
import type { ToastAction } from './useToast';
import { GAME_CONFIG } from '../config/gameRules';
import type { PendingRewards } from '../types/pendingRewards';

export function useGameEconomy(
	allTasks: Quest[],
	forceRefresh: () => void,
	triggerToast: (message: string, action?: ToastAction, taskId?: number) => void
) {
	// Moved Economy State from useTasks
	const [gems, setGems] = useState<number>(0);
	const [timePoints, setTimePoints] = useState<number>(0);
	const [medals, setMedals] = useState({ bronze: 0, silver: 0, gold: 0 });
	const [pendingRewards, setPendingRewards] = useState<PendingRewards>({
		gems: 0,
		tp: 0,
		medals: { bronze: 0, silver: 0, gold: 0 },
		hasClaimedToday: false
	});

	const refreshEconomy = useCallback(async () => {
		try {
			const currentGems = await getMeta("gems", 0);
			const globalTP = await getMeta("timePoints", 0);
			const currentMedals = await getMeta("medals", { bronze: 0, silver: 0, gold: 0 });

			const lastClaimDate = await getMeta("lastClaimDate", "");
			const todayStr = new Date().toISOString().split('T')[0];
			const hasClaimedToday = lastClaimDate === todayStr;

			const unclaimedGems = await getMeta("unclaimedGems", 0);
			const unclaimedTP = await getMeta("unclaimedTP", 0);
			const unclaimedMedals = await getMeta("unclaimedMedals", { bronze: 0, silver: 0, gold: 0 });

			setGems(currentGems);
			setTimePoints(globalTP);
			setMedals(currentMedals);
			setPendingRewards({
				gems: unclaimedGems,
				tp: unclaimedTP,
				medals: unclaimedMedals,
				hasClaimedToday
			});
		} catch (error) {
			console.error("Failed to refresh economy:", error);
		}
	}, []);

	const handleBuyShield = async (taskId: number, cost: number) => {
		const taskToUpdate = allTasks.find(t => t.id === taskId);
		if (!taskToUpdate) return;

		const freshGems = await getMeta("gems", 0);

		if (freshGems < cost) {
			alert(`Not enough gems! You need ${cost} 💎 to buy this shield.`);
			return;
		}

		const isConfirmed = window.confirm(
			`Equip a shield to "${taskToUpdate.name}"?\n\nCost: ${cost} 💎\nCurrent Balance: ${freshGems} 💎`
		);

		if (!isConfirmed) return;

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

		// 1. Await all DB updates
		if (pendingGems > 0) await incrementMeta("gems", pendingGems);
		if (pendingTP > 0) await incrementMeta("timePoints", pendingTP);

		const currentMedals = await getMeta("medals", { bronze: 0, silver: 0, gold: 0 });
		await setMeta("medals", {
			bronze: currentMedals.bronze + pendingMedal.bronze,
			silver: currentMedals.silver + pendingMedal.silver,
			gold: currentMedals.gold + pendingMedal.gold
		});

		await setMeta("unclaimedGems", 0);
		await setMeta("unclaimedTP", 0);
		await setMeta("unclaimedMedals", { bronze: 0, silver: 0, gold: 0 });
		await setMeta("lastClaimDate", todayStr);

		// 2. OPTIMISTIC UPDATE: Flip the local state immediately!
		// This is what tells the Modal to switch the button to "Continue"
		setPendingRewards(prev => ({
			...prev,
			gems: 0,
			tp: 0,
			medals: { bronze: 0, silver: 0, gold: 0 },
			hasClaimedToday: true
		}));

		// 3. Trigger the global background sync
		forceRefresh();
	};

	return {
		gems, timePoints, medals, pendingRewards, refreshEconomy,
		handleBuyShield, handleBuyGemWithTime, handleBuyTimeWithGem, handleClaimRewards
	};
}