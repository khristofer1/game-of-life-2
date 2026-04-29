// src/utils/questCalculations.ts
import { GAME_CONFIG } from "../config/gameRules";

// We define exactly what data the form needs to send to the calculator
export interface TaskFormState {
  name: string;
  desc: string;
  startDateStr: string;
  questType: 'onetime' | 'recurring' | 'break';
  otType: 'duration' | 'date';
  otNum: number;
  otUnit: string;
  otDeadlineStr: string;
  freqNum: number;
  freqUnit: string;
  hasShorterDeadline: boolean;
  activeWindowType: 'duration' | 'date';
  activeNum: number;
  activeUnit: string;
  activeWindowDateStr: string;
  hasLimit: boolean;
  limitType: 'duration' | 'date' | 'occurrences';
  limitNum: number;
  limitUnit: string;
  limitDateStr: string;
  limitOccurrences: number;
  breakNum: number;
  breakUnit: string;
  lastDoneAt?: number;
}

// We pass in the formatQuestDuration function so this file doesn't need to import React/DOM logic
export function calculateQuestData(data: TaskFormState, formatDuration: (start: string, end: string) => string) {
  // --- BREAK ACTIVITY MATH ---
  if (data.questType === 'break') {
    let multi = 1;
    if (data.breakUnit === 'minutes') multi = 60 * 1000;
    if (data.breakUnit === 'hours') multi = 60 * 60 * 1000;
    if (data.breakUnit === 'days') multi = 24 * 60 * 60 * 1000;
    if (data.breakUnit === 'weeks') multi = 7 * 24 * 60 * 60 * 1000;
    
    const cooldownMs = data.breakNum * multi;
    const cooldownData = { num: data.breakNum, unit: data.breakUnit };

    const unitText = data.breakNum === 1 ? data.breakUnit.slice(0, -1) : data.breakUnit;
    const displayFreq = `Cooldown: ${data.breakNum} ${unitText.charAt(0).toUpperCase() + unitText.slice(1)}`;

    return {
      name: data.name, desc: data.desc, isBreak: true, cooldownMs, cooldownData, displayFreq,
      isOneTime: false, startDate: new Date().getTime(), lastDoneAt: data.lastDoneAt || 0
    };
  }

  // --- STANDARD QUEST MATH ---
  const startDate = data.startDateStr ? new Date(data.startDateStr).getTime() : new Date().setHours(0, 0, 0, 0);
  const isOneTime = data.questType === 'onetime';

  // not modified variables
  const { name, desc, freqNum, freqUnit, hasLimit } = data;

  // modified variables
  let durationMs = 0;
  let deadline = undefined;
  let oneTimeData = null;
  let expireAt = undefined;
  let activeDeadlineMs = 0;
  let displayFreq = '';
  let limitData = { type: 'none' } as any;
  let activeWindowData: any = undefined;

  if (isOneTime) {
    if (data.otType === 'duration') {
      let days = data.otNum;
      if (data.otUnit === 'weeks') days = data.otNum * 7;
      if (data.otUnit === 'months') days = data.otNum * 30;
      if (data.otUnit === 'years') days = data.otNum * 365;
      durationMs = days * 24 * 60 * 60 * 1000;
      deadline = startDate + durationMs;
      oneTimeData = { type: 'duration', num: data.otNum, unit: data.otUnit };
      
      const unitText = data.otNum === 1 ? data.otUnit.slice(0, -1) : data.otUnit;
      displayFreq = `${data.otNum} ${unitText.charAt(0).toUpperCase() + unitText.slice(1)}`;
    } else {
      if (!data.otDeadlineStr) throw new Error("Please set a hard deadline.");
      deadline = new Date(data.otDeadlineStr).getTime();
      if (deadline <= startDate) throw new Error("Deadline must be after Start Date.");
      durationMs = deadline - startDate;
      oneTimeData = { type: 'date', dateStr: data.otDeadlineStr };
      displayFreq = formatDuration(data.startDateStr, data.otDeadlineStr);
    }
    activeDeadlineMs = durationMs;
  } else {
    // Recurring Math
    let days = data.freqNum;
    if (data.freqUnit === 'weeks') days = data.freqNum * 7;
    if (data.freqUnit === 'months') days = data.freqNum * 30;
    if (data.freqUnit === 'years') days = data.freqNum * 365;
    durationMs = days * 24 * 60 * 60 * 1000;

    // 1. Calculate Active Deadline
    if (data.hasShorterDeadline) {
      if (data.activeWindowType === 'duration') {
        let activeMulti = 1;
        if (data.activeUnit === 'minutes') activeMulti = 60 * 1000;
        if (data.activeUnit === 'hours') activeMulti = 60 * 60 * 1000;
        if (data.activeUnit === 'days') activeMulti = 24 * 60 * 60 * 1000;
        if (data.activeUnit === 'weeks') activeMulti = 7 * 24 * 60 * 60 * 1000;
        activeDeadlineMs = data.activeNum * activeMulti;
        activeWindowData = { type: 'duration', num: data.activeNum, unit: data.activeUnit };
      } else {
        if (!data.activeWindowDateStr) throw new Error("Please select a specific date and time for the active window.");
        const targetTime = new Date(data.activeWindowDateStr).getTime();
        activeDeadlineMs = targetTime - startDate;
        
        if (activeDeadlineMs <= 0) throw new Error("The active window deadline must be after the Start Date.");
        activeWindowData = { type: 'date', dateStr: data.activeWindowDateStr };
      }
      if (activeDeadlineMs > durationMs) throw new Error("Active window cannot be longer than the repeat interval!");
    } else {
      activeDeadlineMs = durationMs;
    }

    // 2. Construct Frequency String
    const freqBaseUnit = data.freqNum === 1 ? data.freqUnit.slice(0, -1) : data.freqUnit;
    const freqBaseStr = `${data.freqNum} ${freqBaseUnit}`;

    if (data.hasShorterDeadline) {
      let activeStr = '';
      if (data.activeWindowType === 'duration') {
        const aUnit = data.activeNum === 1 ? data.activeUnit.slice(0, -1) : data.activeUnit;
        activeStr = `${data.activeNum} ${aUnit}`;
      } else {
        const ms = activeDeadlineMs;
        const d = Math.floor(ms / (24 * 60 * 60 * 1000));
        const h = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        
        if (d > 0) activeStr = `${d} day${d !== 1 ? 's' : ''}`;
        else if (h > 0) activeStr = `${h} hour${h !== 1 ? 's' : ''}`;
        else activeStr = `${m} min${m !== 1 ? 's' : ''}`;
      }
      displayFreq = `${activeStr} every ${freqBaseStr}`;
      displayFreq = displayFreq.charAt(0).toUpperCase() + displayFreq.slice(1);
    } else {
      displayFreq = `Every ${freqBaseStr}`;
      displayFreq = displayFreq.charAt(0).toUpperCase() + displayFreq.slice(1);
    }

    // 3. Limit Math
    if (data.hasLimit) {
      if (data.limitType === 'duration') {
        let lDays = data.limitNum;
        if (data.limitUnit === 'weeks') lDays = data.limitNum * 7;
        if (data.limitUnit === 'months') lDays = data.limitNum * 30;
        if (data.limitUnit === 'years') lDays = data.limitNum * 365;
        expireAt = startDate + (lDays * 24 * 60 * 60 * 1000);
        limitData = { type: 'duration', num: data.limitNum, unit: data.limitUnit };
      } else if (data.limitType === 'date') {
        if (!data.limitDateStr) throw new Error("Please select an end date.");
        expireAt = new Date(data.limitDateStr).getTime();
        limitData = { type: 'date', dateStr: data.limitDateStr };
      } else if (data.limitType === 'occurrences') {
        expireAt = startDate + (data.limitOccurrences * durationMs);
        limitData = { type: 'occurrences', count: data.limitOccurrences };
      }
    }
  }

  return {
    name, desc, startDate, isOneTime, durationMs, deadline, oneTimeData,
    freqNum, freqUnit, displayFreq, hasLimit, limitData, expireAt, activeDeadlineMs, activeWindowData
  };
}

/**
 * Calculates the "Effective Streak" based on completions and frequency.
 * Formula: ((Completion Count - 1) * Frequency) + 1
 */
export function calculateEffectiveStreak(completionCount: number, frequencyDays: number): number {
  if (completionCount <= 0) return 0;
  return ((completionCount - 1) * frequencyDays) + 1;
}

export type TierLevel = 'standard' | 'bronze' | 'silver' | 'gold' | 'diamond';
const TIER_ORDER: TierLevel[] = ['standard', 'bronze', 'silver', 'gold', 'diamond'];

// --- STREAK POINTS (SP) MATH ---
export function calculateStreakPoints(currentSP: number, frequencyInDays: number): number {
  if (currentSP === 0) return 1; // 1st completion is always 1 SP
  return currentSP + frequencyInDays; // Subsequent completions add the frequency
}

// --- TIER MATH ---
export function determineNextTier(currentTier: TierLevel | undefined, streakPoints: number): TierLevel {
  const safeCurrentTier = currentTier || 'standard';
  const currentIndex = TIER_ORDER.indexOf(safeCurrentTier);

  // 1. Find absolute max tier qualified by raw math
  let qualifiedIndex = 0;
  if (streakPoints >= GAME_CONFIG.tiers.diamond) qualifiedIndex = 4;
  else if (streakPoints >= GAME_CONFIG.tiers.gold) qualifiedIndex = 3;
  else if (streakPoints >= GAME_CONFIG.tiers.silver) qualifiedIndex = 2;
  else if (streakPoints >= GAME_CONFIG.tiers.bronze) qualifiedIndex = 1;

  // 2. Enforce the "One Tier At A Time" rule
  const maxAllowedUpgradeIndex = currentIndex + 1;
  const finalIndex = Math.min(qualifiedIndex, maxAllowedUpgradeIndex);

  return TIER_ORDER[Math.max(0, finalIndex)];
}

// Helper for "Undo" actions, bypassing the sequential limit to instantly demote if needed
export function getQualifiedTier(streakPoints: number): TierLevel {
  if (streakPoints >= GAME_CONFIG.tiers.diamond) return 'diamond';
  if (streakPoints >= GAME_CONFIG.tiers.gold) return 'gold';
  if (streakPoints >= GAME_CONFIG.tiers.silver) return 'silver';
  if (streakPoints >= GAME_CONFIG.tiers.bronze) return 'bronze';
  return 'standard';
}

// --- SHIELD ECONOMY MATH ---
export function calculateShieldCapacity(tier: TierLevel | undefined, frequencyInDays: number): number {
  if (frequencyInDays > 1) return 1;

  switch (tier) {
    case 'diamond': return 5;
    case 'gold': return 4;
    case 'silver': return 3;
    case 'bronze': return 2;
    case 'standard':
    default: return 1;
  }
}

export function calculateShieldCost(frequencyInDays: number, tier: TierLevel | undefined): number {
  const baseCost = GAME_CONFIG.economy.shieldBaseCost * frequencyInDays;
  if (frequencyInDays === 1) return baseCost; // Dailies get no discount

  let discount = 0;
  switch (tier) {
    case 'diamond': discount = 0.80; break;
    case 'gold': discount = 0.60; break;
    case 'silver': discount = 0.40; break;
    case 'bronze': discount = 0.20; break;
    default: discount = 0; break;
  }

  // Return the discounted price (rounded in case of decimals)
  return Math.round(baseCost * (1 - discount));
}