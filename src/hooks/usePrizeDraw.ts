// src/hooks/usePrizeDraw.ts
import { useState } from 'react';
import { setMeta } from '../services/db';
import confetti from 'canvas-confetti';
import rattleSound from '../assets/rattle.mp3';
import rareChestSound from '../assets/rareChest.mp3';
import legendaryChestSound from "../assets/legendaryChest.mp3";
import { GAME_CONFIG } from '../config/gameRules';

export type PrizeTier = 'bronze' | 'silver' | 'gold';
export interface GachaResult {
  gems: number;
  tp: number;
  rarity: 'common' | 'rare' | 'legendary';
  tier: PrizeTier;
}

export function useChestGacha(
  medals: { bronze: number; silver: number; gold: number },
  gems: number,
  timePoints: number,
  volumeLevel: number,
  forceRefresh: () => void,
  triggerToast: (msg: string) => void
) {
  const [openingTier, setOpeningTier] = useState<PrizeTier | null>(null);
  const [recentResults, setRecentResults] = useState<GachaResult[] | null>(null);

  const onDraw = async (tier: PrizeTier, amount: number) => {
    if (medals[tier] < amount) {
      triggerToast(`Not enough ${tier} medals!`);
      return;
    }

    setOpeningTier(tier);

    // --- STEP 1: IMMEDIATE CLICK SOUND ---
    const volumeMap = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const currentVol = volumeMap[volumeLevel] || 0;

    if (currentVol > 0) {
      const baseAudio = new Audio(rattleSound);
      baseAudio.volume = currentVol;
      baseAudio.play().catch(error => console.log("Audio blocked:", error));
    }

    let totalGems = 0;
    let totalTP = 0;
    const results: GachaResult[] = [];
    let hitLegendary = false;
    let hitRare = false;

    // The Slot Machine Loop
    for (let i = 0; i < amount; i++) {
      const roll = Math.random(); // 0.0 to 1.0
      let result: GachaResult = { gems: 0, tp: 0, rarity: 'common', tier };
      const dropRates = GAME_CONFIG.gacha[tier];

      if (tier === 'bronze') {
        if (roll < dropRates.rareThreshold) result = Math.random() > 0.5 ? { ...result, gems: 1 } : { ...result, tp: 2 };
        else if (roll < dropRates.legendaryThreshold) result = { ...result, rarity: 'rare', gems: 1, tp: 5 };
        else result = { ...result, rarity: 'legendary', gems: 2, tp: 10 };
      } 
      else if (tier === 'silver') {
        if (roll < dropRates.rareThreshold) result = Math.random() > 0.5 ? { ...result, gems: 2 } : { ...result, tp: 5 };
        else if (roll < dropRates.legendaryThreshold) result = { ...result, rarity: 'rare', gems: 3, tp: 10 };
        else result = { ...result, rarity: 'legendary', gems: 5, tp: 20 };
      } 
      else if (tier === 'gold') {
        if (roll < dropRates.rareThreshold) result = Math.random() > 0.5 ? { ...result, gems: 5 } : { ...result, tp: 10 };
        else if (roll < dropRates.legendaryThreshold) result = { ...result, rarity: 'rare', gems: 10, tp: 25 };
        else result = { ...result, rarity: 'legendary', gems: 15, tp: 50 };
      }

      if (result.rarity === 'rare') hitRare = true;
      else if (result.rarity === 'legendary') hitLegendary = true;

      totalGems += result.gems;
      totalTP += result.tp;
      results.push(result);
    }

    // Deduct medals and Add Rewards
    await setMeta("medals", { ...medals, [tier]: medals[tier] - amount });
    await setMeta("gems", gems + totalGems);
    await setMeta("timePoints", timePoints + totalTP);

    // --- STEP 2: THE SUSPENSE REVEAL (1.2s LATER) ---
    setTimeout(() => {
      // Trigger special sounds only on the reveal!
      if (currentVol > 0) {
        if (hitLegendary) {
          const legAudio = new Audio(legendaryChestSound);
          legAudio.volume = currentVol;
          legAudio.play().catch(error => console.log("Audio blocked:", error));
        } else if (hitRare) {
          const rareAudio = new Audio(rareChestSound);
          rareAudio.volume = currentVol;
          rareAudio.play().catch(error => console.log("Audio blocked:", error));
        }
      }

      // Visuals
      if (hitLegendary) {
        confetti({ 
            particleCount: 250, 
            spread: 100, 
            origin: { y: 0.5 }, 
            colors: ['#fbbf24', '#f59e0b', '#ffffff'] 
        });
      }
      
      setRecentResults(results);
      setOpeningTier(null); // Stop shaking
      forceRefresh();
    }, 1200); 
  };
  
  return { onDraw, openingTier, recentResults, setRecentResults };
}