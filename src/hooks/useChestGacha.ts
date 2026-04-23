// src/hooks/useChestGacha.ts
import { useState } from 'react';
import { setMeta } from '../services/db';
import confetti from 'canvas-confetti';

export type ChestTier = 'bronze' | 'silver' | 'gold';
export interface GachaResult {
  gems: number;
  tp: number;
  rarity: 'common' | 'rare' | 'legendary';
  tier: ChestTier;
}

export function useChestGacha(
  keys: { bronze: number; silver: number; gold: number },
  gems: number,
  timePoints: number,
  forceRefresh: () => void,
  triggerToast: (msg: string) => void
) {
  const [isOpening, setIsOpening] = useState(false);
  const [recentResults, setRecentResults] = useState<GachaResult[] | null>(null);

  const openChest = async (tier: ChestTier, amount: number) => {
    if (keys[tier] < amount) {
      triggerToast(`Not enough ${tier} keys!`);
      return;
    }

    setIsOpening(true);

    let totalGems = 0;
    let totalTP = 0;
    const results: GachaResult[] = [];
    let hitLegendary = false;

    // The Slot Machine Loop
    for (let i = 0; i < amount; i++) {
      const roll = Math.random(); // 0.0 to 1.0
      let result: GachaResult = { gems: 0, tp: 0, rarity: 'common', tier };

      if (tier === 'bronze') {
        if (roll < 0.80) result = Math.random() > 0.5 ? { ...result, gems: 1 } : { ...result, tp: 2 };
        else if (roll < 0.95) result = { ...result, rarity: 'rare', gems: 1, tp: 5 };
        else result = { ...result, rarity: 'legendary', gems: 2, tp: 10 };
      } 
      else if (tier === 'silver') {
        if (roll < 0.80) result = Math.random() > 0.5 ? { ...result, gems: 2 } : { ...result, tp: 5 };
        else if (roll < 0.95) result = { ...result, rarity: 'rare', gems: 3, tp: 10 };
        else result = { ...result, rarity: 'legendary', gems: 5, tp: 20 };
      } 
      else if (tier === 'gold') {
        if (roll < 0.80) result = Math.random() > 0.5 ? { ...result, gems: 5 } : { ...result, tp: 10 };
        else if (roll < 0.95) result = { ...result, rarity: 'rare', gems: 10, tp: 25 };
        else result = { ...result, rarity: 'legendary', gems: 15, tp: 50 };
      }

      if (result.rarity === 'legendary') hitLegendary = true;
      totalGems += result.gems;
      totalTP += result.tp;
      results.push(result);
    }

    // Deduct Keys and Add Rewards
    await setMeta("keys", { ...keys, [tier]: keys[tier] - amount });
    await setMeta("gems", gems + totalGems);
    await setMeta("timePoints", timePoints + totalTP);

    // Simulate anticipation delay
    setTimeout(() => {
      if (hitLegendary) {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#fbbf24', '#f59e0b', '#ffffff'] });
      }
      setRecentResults(results);
      setIsOpening(false);
      forceRefresh();
    }, 600);
  };

  return { openChest, isOpening, recentResults, setRecentResults };
}