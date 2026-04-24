// src/hooks/useTasks.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllTasks, saveTaskToDB, getMeta, setMeta, deleteTaskFromDB } from '../services/db';
import type { Quest } from '../types/quest';
import type { User } from 'firebase/auth';
import type { PendingRewards } from '../types/pendingRewards';

export function useTasks(user: User | null) {
	// 1. React State: This replaces your manual DOM manipulation
  const [allTasks, setAllTasks] = useState<Quest[]>([]);
	const [activeTasks, setActiveTasks] = useState<Quest[]>([]);
	const [comingTasks, setComingTasks] = useState<Quest[]>([]);
	const [completedTasks, setCompletedTasks] = useState<Quest[]>([]);
  const [breakTasks, setBreakTasks] = useState<Quest[]>([]);
	const [deletedTasks, setDeletedTasks] = useState<Quest[]>([]);

  const [pendingRewards, setPendingRewards] = useState<PendingRewards>({
    gems: 0,
    tp: 0,
    medals: { bronze: 0, silver: 0, gold: 0 },
    hasClaimedToday: false
  });
  
  const archivedTasks = useMemo(() => 
    allTasks.filter(t => !t.deletedAt && t.isOneTime && t.completed && t.gemClaimed)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [allTasks]
  );

	// Game Economy State
	const [gems, setGems] = useState<number>(0);
  const [timePoints, setTimePoints] = useState<number>(0);
  const [medals, setmedals] = useState({ bronze: 0, silver: 0, gold: 0 });

	// 2. The Core Engine: Replaces your old refreshTasks() function
	const refreshTasks = useCallback(async () => {
		try {
			// Fetch raw data from IndexedDB
			const rawTasks: Quest[] = await getAllTasks();
			let currentGems = await getMeta("gems", 0);
      const globalTP = await getMeta("timePoints", 0);

			const now = Date.now();
			let tasksUpdated = false;
			let totalGemsEarned = 0;
      let totalTPEarned = 0;
      let newBronzemedals = 0;
      let newSilvermedals = 0;
      let newGoldmedals = 0;

			// Engine Sweep: Process logic for every task
      const processedTasks: Quest[] = [];

      for (const task of rawTasks) {
        // 1. The Recycle Bin Sweeper
        if (task.deletedAt) {
          const timeInBin = now - task.deletedAt;
          if (timeInBin > 7 * 24 * 60 * 60 * 1000) {
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

        // --- BREAK ACTIVITIES MATH ---
        if (task.isBreak) {
          // --- THE BREAK MIDNIGHT SWEEPER ---
          if (!task.gemClaimed && task.lastDoneAt) {
            const todayDay = new Date(now).setHours(0, 0, 0, 0);
            const doneDay = new Date(task.lastDoneAt).setHours(0, 0, 0, 0);

            if (todayDay > doneDay) {
              totalGemsEarned += 1;
              task.gemClaimed = true;
              tasksUpdated = true;
            }
          }
          
          // How long has it been since they last took this break? (If never, default to 0)
          const timeSinceLastDone = now - (task.lastDoneAt || 0);
          const timeLeft = (task.cooldownMs || 0) - timeSinceLastDone;

          if (timeLeft > 0) {
            // Still cooling down. Progress bar fills up from 0% to 99% as it gets closer to being ready!
            const newPercent = Math.max(0, Math.min(100, Math.round((timeSinceLastDone / (task.cooldownMs || 1)) * 100)));
            if (task.energyPercent !== newPercent) {
              task.energyPercent = newPercent;
              tasksUpdated = true;
            }
          } else {
            // Ready to be claimed! 100% Energy.
            if (task.energyPercent !== 100) {
              task.energyPercent = 100;
              tasksUpdated = true;
            }
          }

          // Push to the array and skip the rest of the normal quest math
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
              if (task.pendingMedal === 'gold') newGoldmedals++;
              else if (task.pendingMedal === 'silver') newSilvermedals++;
              else if (task.pendingMedal === 'bronze') newBronzemedals++;
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

			// --- THE PENDING VAULT ---
      if (totalGemsEarned > 0) {
        const existingUnclaimed = await getMeta("unclaimedGems", 0);
        await setMeta("unclaimedGems", existingUnclaimed + totalGemsEarned);
      }

      // --- SAVE UNCLAIMED TP ---
      if (totalTPEarned > 0) {
        const existingUnclaimedTP = await getMeta("unclaimedTP", 0);
        await setMeta("unclaimedTP", existingUnclaimedTP + totalTPEarned);
      }

      // --- SAVE UNCLAIMED medals ---
      if (newBronzemedals > 0 || newSilvermedals > 0 || newGoldmedals > 0) {
        const existingmedals = await getMeta("unclaimedmedals", { bronze: 0, silver: 0, gold: 0 });
        await setMeta("unclaimedmedals", {
            bronze: existingmedals.bronze + newBronzemedals,
            silver: existingmedals.silver + newSilvermedals,
            gold: existingmedals.gold + newGoldmedals
        });
      }

      // Fetch the UI Claim State
      const lastClaimDate = await getMeta("lastClaimDate", "");
      const todayStr = new Date().toISOString().split('T')[0];
      const hasClaimedToday = lastClaimDate === todayStr;

      const unclaimedGems = await getMeta("unclaimedGems", 0);
      const unclaimedTP = await getMeta("unclaimedTP", 0);
      const unclaimedmedals = await getMeta("unclaimedmedals", { bronze: 0, silver: 0, gold: 0 });
      const currentmedals = await getMeta("medals", { bronze: 0, silver: 0, gold: 0 });

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
        .filter(t => !t.deletedAt && !t.completed && !t.isArchived && !t.isBreak && !checkIsComing(t))
        .sort((a, b) => getRealDeadline(a) - getRealDeadline(b));

      const coming = processedTasks
        .filter(t => {
          if (t.deletedAt || t.isBreak) return false;
          
          // Condition A: Standard pending/missed tasks
          const isPending = t.startDate && now < t.startDate;
          const isMissedRecurring = !t.isOneTime && !t.completed && now >= ((t.cycleStart || 0) + (t.activeDeadlineMs || 0));
          
          // Condition B: Rewarded recurring quests waiting for next cycle
          const isRewardedRecurring = t.completed && t.gemClaimed && !t.isOneTime;

          return isPending || isMissedRecurring || isRewardedRecurring;
        })
        .sort((a, b) => {
          const aNext = (a.startDate && now < a.startDate) ? (a.startDate) : ((a.cycleStart || 0) + a.durationMs);
          const bNext = (b.startDate && now < b.startDate) ? (b.startDate) : ((b.cycleStart || 0) + b.durationMs);
          return aNext - bNext;
        });

      const completed = processedTasks
        .filter(t => !t.deletedAt && t.completed && !t.gemClaimed && !t.isArchived && !t.isBreak) 
        .sort((a, b) => getRealDeadline(a) - getRealDeadline(b));

			const deleted = processedTasks
				.filter(t => t.deletedAt)
				.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
      
      const breakList = processedTasks
        .filter(t => !t.deletedAt && !t.isArchived && t.isBreak)
        .sort((a, b) => {
          // Sort by "Ready" first, then by shortest cooldown time left
          const aTimeLeft = Math.max(0, (a.cooldownMs || 0) - (now - (a.lastDoneAt || 0)));
          const bTimeLeft = Math.max(0, (b.cooldownMs || 0) - (now - (b.lastDoneAt || 0)));
          
          if (aTimeLeft === 0 && bTimeLeft === 0) return (a.cooldownMs || 0) - (b.cooldownMs || 0);
          return aTimeLeft - bTimeLeft;
        });

			// Update React State
      setAllTasks(processedTasks);
			setActiveTasks(active);
			setComingTasks(coming);
			setCompletedTasks(completed);
      setBreakTasks(breakList);
			setDeletedTasks(deleted);
			setGems(currentGems);
      setTimePoints(globalTP);
      setmedals(currentmedals);
      setPendingRewards({
        gems: unclaimedGems,
        tp: unclaimedTP,
        medals: unclaimedmedals,
        hasClaimedToday
      });

		} catch (error) {
			console.error("Failed to refresh tasks:", error);
		}
	}, []);

	// 4. The Background Loop: Safely replaces your old setInterval
	useEffect(() => {
    // Don't try to fetch data until the user is logged in
    if (!user) return;
    
		refreshTasks();

		const intervalId = setInterval(() => {
			refreshTasks();
		}, 60000);

		// React Cleanup: Prevents memory leaks if the component unmounts!
		return () => clearInterval(intervalId);
	}, [user]);

	// Return the data so your UI components can use it
	return {
    allTasks,
		activeTasks,
		comingTasks,
		completedTasks,
    breakTasks,
		deletedTasks,
    archivedTasks,
		gems,
    timePoints,
    medals,
    pendingRewards,
		forceRefresh: refreshTasks
	};
}