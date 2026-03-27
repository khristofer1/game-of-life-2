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
                // --- THE RECYCLE BIN SWEEPER ---
                if (task.deletedAt) {
                    const timeInBin = now - task.deletedAt;
                    // If it's been in the bin for > 24 hours (86,400,000 ms), destroy it permanently
                    if (timeInBin > 24 * 60 * 60 * 1000) {
                        if (task.id) await deleteTaskFromDB(task.id);
                        continue; // Skip adding this to processedTasks
                    }
                    processedTasks.push(task);
                    continue; // Skip the rest of the game logic for deleted items
                }

                if (task.isArchived) {
                    processedTasks.push(task);
                    continue;
                }

                const isPending = task.startDate && now < task.startDate;
                if (isPending) {
                    if (task.energyPercent !== 100) {
                        task.energyPercent = 100;
                        tasksUpdated = true;
                    }
                    return task;
                }

                // Midnight Sweeper (Daily Gem Claim)
                if (task.completed && !task.gemClaimed && task.completedAt) {
                    const todayDay = new Date(now).setHours(0, 0, 0, 0);
                    const completedDay = new Date(task.completedAt).setHours(0, 0, 0, 0);

                    if (todayDay > completedDay) {
                        totalGemsEarned += 1;
                        task.gemClaimed = true;
                        tasksUpdated = true;
                        // Note: If one-time, you'd trigger a delete here, but for React 
                        // it's safer to mark as archived and filter it out.
                        if (task.isOneTime) task.isArchived = true;
                    }
                }

                // Energy & Active Deadline Math
                let activeTimeLeft = 0;
                let activeDuration = 1;

                if (task.isOneTime) {
                    activeTimeLeft = (task.deadline || 0) - now;
                    activeDuration = task.durationMs;
                } else {
                    // Safety fallback for old quests
                    if (!task.cycleStart) task.cycleStart = task.createdAt || task.startDate;
                    if (!task.activeDeadlineMs) task.activeDeadlineMs = task.durationMs;

                    // Cycle Leaping Logic
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

                // Apply energy calculation
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

            const active = processedTasks
                .filter(t => !t.completed && !t.isArchived && !(t.startDate && now < t.startDate))
                .sort((a, b) => getRealDeadline(a) - getRealDeadline(b));

            const coming = processedTasks
                .filter(t => !t.completed && !t.isArchived && (t.startDate && now < t.startDate))
                .sort((a, b) => a.startDate - b.startDate);

            const completed = processedTasks
                .filter(t => t.completed && !t.isArchived)
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