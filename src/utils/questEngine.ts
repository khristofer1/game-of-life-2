// src/utils/questEngine.ts
import type { Quest } from '../types/quest';

interface EngineResult {
  processedTasks: Quest[];
  totalGemsEarned: number;
  totalTPEarned: number;
  newMedals: { bronze: number; silver: number; gold: number };
  tasksUpdated: boolean;
  deletedTaskIds: number[];
}

export function processQuests(rawTasks: Quest[], now: number): EngineResult {
  const processedTasks: Quest[] = [];
  const deletedTaskIds: number[] = [];

  let tasksUpdated = false;
  let totalGemsEarned = 0;
  let totalTPEarned = 0;
  let newMedals = { bronze: 0, silver: 0, gold: 0 };

  for (const task of rawTasks) {
    // 1. The Recycle Bin Sweeper
    if (task.deletedAt) {
      const timeInBin = now - task.deletedAt;
      if (timeInBin > 7 * 24 * 60 * 60 * 1000) {
        if (task.id) deletedTaskIds.push(task.id);
        continue;
      }
      processedTasks.push(task);
      continue;
    }

    if (task.isArchived) {
      processedTasks.push(task);
      continue;
    }

    // --- BREAK ACTIVITIES MATH ---
    if (task.isBreak) {
      if (!task.gemClaimed && task.lastDoneAt) {
        const todayDay = new Date(now).setHours(0, 0, 0, 0);
        const doneDay = new Date(task.lastDoneAt).setHours(0, 0, 0, 0);

        if (todayDay > doneDay) {
          totalGemsEarned += 1;
          task.gemClaimed = true;
          tasksUpdated = true;
        }
      }

      const timeSinceLastDone = now - (task.lastDoneAt || 0);
      const timeLeft = (task.cooldownMs || 0) - timeSinceLastDone;

      if (timeLeft > 0) {
        const newPercent = Math.max(0, Math.min(100, Math.round((timeSinceLastDone / (task.cooldownMs || 1)) * 100)));
        if (task.energyPercent !== newPercent) {
          task.energyPercent = newPercent;
          tasksUpdated = true;
        }
      } else {
        if (task.energyPercent !== 100) {
          task.energyPercent = 100;
          tasksUpdated = true;
        }
      }

      processedTasks.push(task);
      continue;
    }

    // 2. Pending Quests
    const isPending = task.startDate && now < task.startDate;
    if (isPending) {
      if (task.energyPercent !== 100) {
        task.energyPercent = 100;
        tasksUpdated = true;
      }
      processedTasks.push(task);
      continue;
    }

    // 3. Midnight Sweeper (Daily Reward Claim)
    if (task.completed && !task.gemClaimed && task.completedAt) {
      const todayDay = new Date(now).setHours(0, 0, 0, 0);
      const completedDay = new Date(task.completedAt).setHours(0, 0, 0, 0);

      if (todayDay > completedDay) {
        totalGemsEarned += 1;

        if (task.lastDepositMs) {
          totalTPEarned += task.lastDepositMs;
        }

        if (task.pendingMedal) {
          if (task.pendingMedal === 'gold') newMedals.gold++;
          else if (task.pendingMedal === 'silver') newMedals.silver++;
          else if (task.pendingMedal === 'bronze') newMedals.bronze++;
        }

        task.gemClaimed = true;
        tasksUpdated = true;
        if (task.isOneTime) task.isArchived = true;
      }
    }

    // 4. Energy & Active Deadline Math
    let activeTimeLeft = 0;
    let activeDuration = 1;

    if (task.isOneTime) {
      activeTimeLeft = (task.deadline || 0) - now;
      activeDuration = task.durationMs;

      if (activeTimeLeft <= 0 && !task.completed) {
        task.deletedAt = now;
        task.energyPercent = 0;
        tasksUpdated = true;
        processedTasks.push(task);
        continue;
      }
    } else {
      if (!task.cycleStart) task.cycleStart = task.createdAt || task.startDate;
      if (!task.activeDeadlineMs) task.activeDeadlineMs = task.durationMs;

      if (now >= task.cycleStart + task.durationMs) {
        const cyclesMissed = Math.floor((now - task.cycleStart) / task.durationMs);
        task.cycleStart += (cyclesMissed * task.durationMs);
        task.completed = false;
        task.gemClaimed = false;
        task.completedAt = null;
        tasksUpdated = true;
      }

      const currentCycleDeadline = task.cycleStart + task.activeDeadlineMs;
      activeTimeLeft = currentCycleDeadline - now;
      activeDuration = task.activeDeadlineMs;
    }

    if (activeTimeLeft > 0 && !task.completed) {
      const newPercent = Math.max(0, Math.min(100, Math.round((activeTimeLeft / activeDuration) * 100)));
      if (task.energyPercent !== newPercent) {
        task.energyPercent = newPercent;
        tasksUpdated = true;
      }
    } else if (activeTimeLeft <= 0 && !task.completed) {
      if (task.energyPercent !== 0) {
        task.energyPercent = 0;
        tasksUpdated = true;
      }
    }

    processedTasks.push(task);
  }

  return { processedTasks, totalGemsEarned, totalTPEarned, newMedals, tasksUpdated, deletedTaskIds };
}