// src/hooks/useTasks.ts
import { useState, useEffect, useCallback } from 'react';
import { getAllTasks, saveTaskToDB, getMeta, setMeta, deleteTaskFromDB } from '../services/db';
import type { Quest } from '../types/quest';

export function useTasks() {
	// 1. React State: This replaces your manual DOM manipulation
	const [activeTasks, setActiveTasks] = useState<Quest[]>([]);
	const [comingTasks, setComingTasks] = useState<Quest[]>([]);
	const [completedTasks, setCompletedTasks] = useState<Quest[]>([]);
	const [deletedTasks, setDeletedTasks] = useState<Quest[]>([]);

	// Game Economy State
	const [gems, setGems] = useState<number>(0);
	const [streak, setStreak] = useState<number>(0);
	const [freezes, setFreezes] = useState<number>(0);

	// 2. The Core Engine: Replaces your old refreshTasks() function
	const refreshTasks = useCallback(async () => {
		try {
			// Fetch raw data from IndexedDB
			const rawTasks: Quest[] = await getAllTasks();
			let currentGems = await getMeta("gems", 0);
			const globalFreezes = await getMeta("globalFreezes", 0);
			const globalStreak = await getMeta("globalStreak", 0);

			const now = Date.now();
			let tasksUpdated = false;
			let totalGemsEarned = 0;

			// Engine Sweep: Process logic for every task
      const processedTasks: Quest[] = [];

      for (const task of rawTasks) {
        // 1. The Recycle Bin Sweeper
        if (task.deletedAt) {
          const timeInBin = now - task.deletedAt;
          if (timeInBin > 24 * 60 * 60 * 1000) {
            if (task.id) await deleteTaskFromDB(task.id);
            continue; 
          }
          processedTasks.push(task);
          continue; 
        }

        if (task.isArchived) {
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
          // THE FIX: Push to array and continue the loop instead of returning!
          processedTasks.push(task); 
          continue;                  
        }

        // 3. Midnight Sweeper (Daily Gem Claim)
        if (task.completed && !task.gemClaimed && task.completedAt) {
          const todayDay = new Date(now).setHours(0, 0, 0, 0);
          const completedDay = new Date(task.completedAt).setHours(0, 0, 0, 0);

          if (todayDay > completedDay) {
            totalGemsEarned += 1;
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
          
          // One-Time Auto-Trash if expired
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

        // Make sure the surviving task actually gets added to the new array!
        processedTasks.push(task); 
      };

			// Save back to DB if anything mutated
			if (tasksUpdated) {
				for (const t of processedTasks) {
					await saveTaskToDB(t);
				}
			}

			if (totalGemsEarned > 0) {
				currentGems += totalGemsEarned;
				await setMeta("gems", currentGems);
			}

			// 3. Sorting & Filtering for the UI
      const getRealDeadline = (t: Quest) => t.isOneTime ? (t.deadline || 0) : ((t.cycleStart || 0) + (t.activeDeadlineMs || 0));

			// Helper to determine if a task is waiting for its time
      const checkIsComing = (t: Quest) => {
        if (t.startDate && now < t.startDate) return true; // Hasn't started yet
        if (!t.isOneTime && !t.completed) {
          const cycleDeadline = (t.cycleStart || 0) + (t.activeDeadlineMs || 0);
          if (now >= cycleDeadline) return true; // Recurring missed its active window
        }
        return false;
      };

      const active = processedTasks
        .filter(t => !t.deletedAt && !t.completed && !t.isArchived && !checkIsComing(t))
        .sort((a, b) => getRealDeadline(a) - getRealDeadline(b));

      const coming = processedTasks
        .filter(t => !t.deletedAt && !t.completed && !t.isArchived && checkIsComing(t))
        .sort((a, b) => {
          // Sort Coming tasks by when they are next available
          const aNext = (a.startDate && now < a.startDate) ? (a.startDate) : ((a.cycleStart || 0) + a.durationMs);
          const bNext = (b.startDate && now < b.startDate) ? (b.startDate) : ((b.cycleStart || 0) + b.durationMs);
          return aNext - bNext;
        });

      const completed = processedTasks
        .filter(t => !t.deletedAt && t.completed && !t.isArchived)
        .sort((a, b) => getRealDeadline(a) - getRealDeadline(b));

			const deleted = processedTasks
				.filter(t => t.deletedAt)
				.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));

			// Update React State
			setActiveTasks(active);
			setComingTasks(coming);
			setCompletedTasks(completed);
			setDeletedTasks(deleted);
			setGems(currentGems);
			setStreak(globalStreak);
			setFreezes(globalFreezes);

		} catch (error) {
			console.error("Failed to refresh tasks:", error);
		}
	}, []);

	// 4. The Background Loop: Safely replaces your old setInterval
	useEffect(() => {
		// Run immediately on mount
		refreshTasks();

		// Then run every 60 seconds
		const intervalId = setInterval(() => {
			refreshTasks();
		}, 60000);

		// React Cleanup: Prevents memory leaks if the component unmounts!
		return () => clearInterval(intervalId);
	}, [refreshTasks]);

	// Return the data so your UI components can use it
	return {
		activeTasks,
		comingTasks,
		completedTasks,
		deletedTasks,
		gems,
		streak,
		freezes,
		forceRefresh: refreshTasks
	};
}