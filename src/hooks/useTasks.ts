// src/hooks/useTasks.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllTasks, saveTaskToDB, getMeta, setMeta, deleteTaskFromDB } from '../services/db';
import type { Quest } from '../types/quest';
import type { User } from 'firebase/auth';
import { processQuests } from '../utils/questEngine';

export function useTasks(user: User | null, refreshEconomy: () => void) {
  const [allTasks, setAllTasks] = useState<Quest[]>([]);

  // Use Memo for UI filtering (Replaces manual state updates)
  const archivedTasks = useMemo(() =>
    allTasks.filter(t => !t.deletedAt && t.isOneTime && t.completed && t.gemClaimed)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [allTasks]
  );

  const getRealDeadline = (t: Quest) => t.isOneTime ? (t.deadline || 0) : ((t.cycleStart || 0) + (t.activeDeadlineMs || 0));

  const checkIsComing = useCallback((t: Quest, now: number) => {
    if (t.startDate && now < t.startDate) return true;
    if (!t.isOneTime && !t.completed) {
      const cycleDeadline = (t.cycleStart || 0) + (t.activeDeadlineMs || 0);
      if (now >= cycleDeadline) return true;
    }
    return false;
  }, []);

  const activeTasks = useMemo(() => {
    const now = Date.now();
    return allTasks
      .filter(t => !t.deletedAt && !t.completed && !t.isArchived && !t.isBreak && !checkIsComing(t, now))
      .sort((a, b) => getRealDeadline(a) - getRealDeadline(b));
  }, [allTasks, checkIsComing]);

  const comingTasks = useMemo(() => {
    const now = Date.now();
    return allTasks
      .filter(t => {
        if (t.deletedAt || t.isBreak) return false;
        const isPending = t.startDate && now < t.startDate;
        const isMissedRecurring = !t.isOneTime && !t.completed && now >= ((t.cycleStart || 0) + (t.activeDeadlineMs || 0));
        const isRewardedRecurring = t.completed && t.gemClaimed && !t.isOneTime;
        return isPending || isMissedRecurring || isRewardedRecurring;
      })
      .sort((a, b) => {
        const aNext = (a.startDate && now < a.startDate) ? (a.startDate) : ((a.cycleStart || 0) + a.durationMs);
        const bNext = (b.startDate && now < b.startDate) ? (b.startDate) : ((b.cycleStart || 0) + b.durationMs);
        return aNext - bNext;
      });
  }, [allTasks]);

  const completedTasks = useMemo(() =>
    allTasks
      .filter(t => !t.deletedAt && t.completed && !t.gemClaimed && !t.isArchived && !t.isBreak)
      .sort((a, b) => getRealDeadline(a) - getRealDeadline(b)),
    [allTasks]);

  const deletedTasks = useMemo(() =>
    allTasks
      .filter(t => t.deletedAt)
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)),
    [allTasks]);

  const breakTasks = useMemo(() => {
    const now = Date.now();
    return allTasks
      .filter(t => !t.deletedAt && !t.isArchived && t.isBreak)
      .sort((a, b) => {
        const aTimeLeft = Math.max(0, (a.cooldownMs || 0) - (now - (a.lastDoneAt || 0)));
        const bTimeLeft = Math.max(0, (b.cooldownMs || 0) - (now - (b.lastDoneAt || 0)));
        if (aTimeLeft === 0 && bTimeLeft === 0) return (a.cooldownMs || 0) - (b.cooldownMs || 0);
        return aTimeLeft - bTimeLeft;
      });
  }, [allTasks]);

  const refreshTasks = useCallback(async () => {
    try {
      const rawTasks: Quest[] = await getAllTasks();
      const now = Date.now();

      // 1. Run the pure engine
      const result = processQuests(rawTasks, now);

      // 2. Handle DB Side Effects
      for (const id of result.deletedTaskIds) {
        await deleteTaskFromDB(id);
      }

      if (result.tasksUpdated) {
        for (const t of result.processedTasks) {
          await saveTaskToDB(t);
        }
      }

      // 3. Handle Pending Rewards
      let economyChanged = false;
      if (result.totalGemsEarned > 0) {
        const existingUnclaimed = await getMeta("unclaimedGems", 0);
        await setMeta("unclaimedGems", existingUnclaimed + result.totalGemsEarned);
        economyChanged = true;
      }

      if (result.totalTPEarned > 0) {
        const existingUnclaimedTP = await getMeta("unclaimedTP", 0);
        await setMeta("unclaimedTP", existingUnclaimedTP + result.totalTPEarned);
        economyChanged = true;
      }

      if (result.newMedals.bronze > 0 || result.newMedals.silver > 0 || result.newMedals.gold > 0) {
        const existingmedals = await getMeta("unclaimedMedals", { bronze: 0, silver: 0, gold: 0 });
        await setMeta("unclaimedMedals", {
          bronze: existingmedals.bronze + result.newMedals.bronze,
          silver: existingmedals.silver + result.newMedals.silver,
          gold: existingmedals.gold + result.newMedals.gold
        });
        economyChanged = true;
      }

      // Update UI State
      setAllTasks(result.processedTasks);

      // Sync economy hook if needed
      if (economyChanged) refreshEconomy();

    } catch (error) {
      console.error("Failed to refresh tasks:", error);
    }
  }, [refreshEconomy]);

  useEffect(() => {
    if (!user) return;
    refreshTasks();
    const intervalId = setInterval(() => {
      refreshTasks();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [user, refreshTasks]);

  return {
    allTasks, activeTasks, comingTasks, completedTasks,
    breakTasks, deletedTasks, archivedTasks, forceRefresh: refreshTasks
  };
}