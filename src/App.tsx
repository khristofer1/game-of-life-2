// src/App.tsx
import { useState, useRef, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, logoutFromGoogle } from './services/firebase';
import { Login } from './components/Login';
import { useTasks } from './hooks/useTasks';
import { QuestCard } from './components/QuestCard';
import { TaskModal } from './components/TaskModal';
import { saveTaskToDB, deleteTaskFromDB, getMeta, setMeta } from './services/db';
import type { Quest } from './types/quest';
import logo from './assets/logo.svg';
import { DailySummaryModal } from './components/DailySummaryModal';
import confetti from 'canvas-confetti';
import successSound from './assets/success.mp3';
import { TimeVaultModal } from './components/TimeVaultModal';
import { formatTimeDeposit, formatShortTimeDeposit } from './utils/timeFormat';
import type { ToastAction } from './hooks/useToast';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ToastContainer';
import { useDailySummary } from './hooks/useDailySummary';
import { BottomNav } from './components/layout/BottomNav';
import type { TabType } from './components/layout/BottomNav';

export default function App() {
	// --- AUTHENTICATION STATE ---
	const [user, setUser] = useState<User | null>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(true);

	// --- UI & SETTINGS STATE ---
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [volumeLevel, setVolumeLevel] = useState(3);
	const settingsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			// If the Settings menu is open AND the click was outside of it -> Close it
			if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
				setIsSettingsOpen(false);
			}
		};

		// Attach the listener
		document.addEventListener("mousedown", handleClickOutside);

		// Clean up the listener when the component unmounts
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Load saved volume on mount
	useEffect(() => {
		// Only fetch the volume AFTER Firebase confirms who is logged in!
		if (user) {
			getMeta("volumeLevel", 3).then((savedVolume) => {
				// Wrap it in Number() to protect against strict-equality bugs 
				// just in case the database saved it as a string (e.g., "2" instead of 2)
				setVolumeLevel(Number(savedVolume));
			});
		}
	}, [user]);

	useEffect(() => {
		// listens for login/logout events automatically
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			setUser(currentUser);
			setIsAuthLoading(false);
		});
		return unsubscribe;
	}, []);

	// Pull everything we need from our custom background engine!
	const { allTasks, activeTasks, comingTasks, completedTasks, deletedTasks, breakTasks, archivedTasks, gems, timeDeposit, forceRefresh } = useTasks(user);

	// --- DAILY SUMMARY ENGINE ---
	const { showSummaryModal, setShowSummaryModal, summaryData, setSummaryData, handleCloseSummary } = useDailySummary(allTasks);

	// For debugging: shows all the cards object
	// useEffect(() => {
	// 	// We use (window as any) to stop TypeScript from complaining
	// 	(window as any).debugTasks = allTasks;
	// }, [allTasks]);

	// --- TOAST NOTIFICATION SYSTEM ---
	const { toast, triggerToast, closeToast } = useToast();

	const handleUndoAction = (action: ToastAction, taskId: number) => {
		if (action === 'delete') handleRestore(taskId, true);
		if (action === 'complete') handleToggleComplete(taskId, true);
		if (action === 'restore') handleDelete(taskId, true);
		if (action === 'break') handleUndoBreak(taskId);
	};

	// React State to manage the bottom navigation
	const [activeTab, setActiveTab] = useState<TabType>('active');
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
	const [modalDefaultIsBreak, setModalDefaultIsBreak] = useState(false);
	const [isBankModalOpen, setIsBankModalOpen] = useState(false);

	// --- DAILY SUMMARY STATE ---

	const handleReviveCard = async (taskId: number) => {
		if (gems < 1) return alert("Not enough gems to revive this card!");

		const taskToRevive = [...activeTasks, ...comingTasks, ...deletedTasks].find(t => t.id === taskId);
		if (!taskToRevive) return;

		// Removes it from the "Trash" state
		delete taskToRevive.deletedAt;

		// Deduct 1 gem
		const newGems = gems - 1;
		await setMeta("gems", newGems);

		// Reset the card times to NOW, keeping the original duration
		const now = Date.now();
		taskToRevive.startDate = now;
		taskToRevive.deadline = now + taskToRevive.durationMs;
		taskToRevive.cycleStart = now;
		taskToRevive.energyPercent = 100; // Refill the progress bar

		await saveTaskToDB(taskToRevive);
		forceRefresh();

		// Immediately remove it from the summary modal list
		setSummaryData(prev => ({
			...prev,
			expired: prev.expired.filter(t => t.id !== taskId)
		}));
	};

	if (isAuthLoading) {
		return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-muted animate-pulse">Loading Game of Life...</div>;
	}

	if (!user) {
		return <Login />;
	}

	// --- Action Handlers (Stubs) ---

	const handleFabClick = () => {
		if (activeTab === 'break') {
			setModalDefaultIsBreak(true);
		} else {
			setModalDefaultIsBreak(false);
		}
		setEditingQuest(null);
		setIsModalOpen(true);
	}

	// --- SHIELD PURCHASE LOGIC ---
	const handleBuyShield = async (taskId: number, cost: number) => {
		const taskToUpdate = allTasks.find(t => t.id === taskId);
		if (!taskToUpdate) return;

		// 1. Check Wallet First
		if (gems < cost) {
			alert(`Not enough gems! You need ${cost} 💎 to buy this shield.`);
			return;
		}

		// --- THE CONFIRMATION DIALOGUE ---
		// We format it nicely with line breaks (\n) for readability
		const isConfirmed = window.confirm(
			`Equip a shield to "${taskToUpdate.name}"?\n\nCost: ${cost} 💎\nCurrent Balance: ${gems} 💎`
		);
		
		// If they click "Cancel", we stop the function right here
		if (!isConfirmed) return; 
		// --- END CONFIRMATION ---

		// 2. Deduct the Gems
		const newGems = gems - cost;
		await setMeta("gems", newGems);

		// 3. Equip the Shield
		taskToUpdate.shields = (taskToUpdate.shields || 0) + 1;
		await saveTaskToDB(taskToUpdate);

		// 4. Update the UI
		forceRefresh();
		// We can now safely call triggerToast with just ONE argument!
		triggerToast(`Shield equipped to ${taskToUpdate.name}! 🛡️`);
	};

	const handleBuyGemWithTime = async () => {
		const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
		
		// 1. Check if they have enough Time Deposit
		if (timeDeposit < oneWeekMs) {
			alert("Not enough Time! You need at least 1 Week in your vault to buy a Gem.");
			return;
		}

		// 2. Confirmation Dialog
		const isConfirmed = window.confirm(
			`Trade 1 Week of Time for 1 Gem? 💎\n\nThis will deduct 7 days from your Time Vault.`
		);
		if (!isConfirmed) return;

		// 3. Process the Exchange
		const newTime = timeDeposit - oneWeekMs;
		await setMeta("timeDepositMs", newTime);

		const newGems = gems + 1;
		await setMeta("gems", newGems);

		// 4. Update UI and Notify
		forceRefresh();
		triggerToast("Exchange complete! +1 Gem 💎");
	};

	const handleToggleComplete = async (id: number, isUndoFromToast = false) => {
		const taskToUpdate = allTasks.find(t => t.id === id);
		if (!taskToUpdate) return;

		const now = Date.now();
		const updatedTask = { ...taskToUpdate };

		// Toggling to COMPLETED
		if (!updatedTask.completed) {
			updatedTask.completed = true;
			updatedTask.completedAt = now;
			updatedTask.gemClaimed = false;

			if (!updatedTask.completionDates) updatedTask.completionDates = [];
      
      // 1. Add today's stamp
      updatedTask.completionDates.push(now);
      
      // 2. Immediately filter out anything older than 7 days!
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      updatedTask.completionDates = updatedTask.completionDates.filter(date => date >= sevenDaysAgo);

			let activeDuration = updatedTask.isOneTime ? updatedTask.durationMs : (updatedTask.activeDeadlineMs || 1);
			let activeDeadline = updatedTask.isOneTime ? (updatedTask.deadline || 0) : ((updatedTask.cycleStart || 0) + (updatedTask.activeDeadlineMs || 0));
			let timeLeft = activeDeadline - now;

			if (timeLeft > 0) {
				updatedTask.energyPercent = Math.max(0, Math.min(100, Math.round((timeLeft / activeDuration) * 100)));
				
				// Calculate Deposit: Cap at 1 Week (604,800,000 ms) AND cap at the original task duration
				const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
				const depositAmount = Math.floor(Math.min(timeLeft, activeDuration, oneWeekMs));
				
				updatedTask.lastDepositMs = depositAmount;
				await setMeta("timeDepositMs", timeDeposit + depositAmount);
			} else {
				updatedTask.energyPercent = 0;
				updatedTask.lastDepositMs = 0;
			}

			if (timeLeft > 0) {
				updatedTask.energyPercent = Math.max(0, Math.min(100, Math.round((timeLeft / activeDuration) * 100)));
			} else {
				updatedTask.energyPercent = 0;
			}

			// --- THE HIDDEN XP & LEVEL UP ENGINE ---
			if (!updatedTask.isOneTime && !updatedTask.isBreak) {
				// 1. Calculate the days in this cycle
				const activeDurationMs = updatedTask.activeDeadlineMs || 86400000;
				const daysInCycle = Math.max(1, Math.round(activeDurationMs / 86400000));
				
				// 2. Add XP and increment Individual Streak
				updatedTask.accumulatedDays = (updatedTask.accumulatedDays || 0) + daysInCycle;
				updatedTask.streak = (updatedTask.streak || 0) + 1;

				// 3. Level-Up Logic (No Double Leveling!)
				const totalDays = updatedTask.accumulatedDays;
				let currentTier = updatedTask.tier || 'standard';
				let leveledUp = false;
				let newMaxCapacity = 1;

				if (currentTier === 'standard' && totalDays >= 7) {
					updatedTask.tier = 'bronze';
					newMaxCapacity = 2;
					leveledUp = true;
				} else if (currentTier === 'bronze' && totalDays >= 30) {
					updatedTask.tier = 'silver';
					newMaxCapacity = 3;
					leveledUp = true;
				} else if (currentTier === 'silver' && totalDays >= 180) {
					updatedTask.tier = 'gold';
					newMaxCapacity = 4;
					leveledUp = true;
				} else if (currentTier === 'gold' && totalDays >= 365) {
					updatedTask.tier = 'diamond';
					newMaxCapacity = 5;
					leveledUp = true;
				} else {
          // Optimized: Use a switch or else-if for mutually exclusive values
          switch (currentTier) {
            case 'standard': newMaxCapacity = 1; break;
            case 'bronze':   newMaxCapacity = 2; break;
            case 'silver':   newMaxCapacity = 3; break;
            case 'gold':     newMaxCapacity = 4; break;
            case 'diamond':  newMaxCapacity = 5; break;
            default:         newMaxCapacity = 1;
          }
        }

				// Override for Long-Cycle Quests (6+ days): Capacity is ALWAYS 1
				if (daysInCycle >= 6) {
					newMaxCapacity = 1;
				}

				// 4. The "Full Heal" Level-Up Bonus
				if (leveledUp) {
					updatedTask.shields = newMaxCapacity;
					// Fire a special toast!
					triggerToast(`Level Up! ${updatedTask.name} is now ${(updatedTask.tier || 'standard').toUpperCase()}! Shields refilled.`, 'complete', id);
				}
			}
			// --- END HIDDEN XP ENGINE ---

			// 🎇 THE CELEBRATION ENGINE 🎇

			// 1. Play the Sound (with error handling in case the browser blocks it)
			const audio = new Audio(successSound);
			const volumeMap = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
			audio.volume = volumeMap[volumeLevel];

			// Only play if it isn't muted!
			if (volumeLevel > 0) {
				audio.play().catch(error => console.log("Audio blocked by browser:", error));
			}

			// 2. Fire the Confetti!
			confetti({
				particleCount: 150, // Number of pieces
				spread: 80,         // How wide the explosion is
				origin: { y: 0.6 }, // Starts slightly below the middle of the screen
				colors: ['#f97316', '#fbbf24', '#34d399', '#3b82f6'] // Tailwind Orange, Yellow, Green, Blue
			});

		// UNDOING a Completion (Moving back to Active)
		} else {
			updatedTask.completed = false;
			updatedTask.completedAt = null;
			updatedTask.gemClaimed = false;
			updatedTask.isArchived = false;

			// --- NEW: THE REVERSAL ENGINE (Undo XP and Tier) ---
			if (!updatedTask.isOneTime && !updatedTask.isBreak) {
				const activeDurationMs = updatedTask.activeDeadlineMs || 86400000;
				const daysInCycle = Math.max(1, Math.round(activeDurationMs / 86400000));

				// 1. Revert the XP and Individual Streak
				updatedTask.accumulatedDays = Math.max(0, (updatedTask.accumulatedDays || 0) - daysInCycle);
				updatedTask.streak = Math.max(0, (updatedTask.streak || 0) - 1);

				// 2. Strict Tier Recalculation (In case the undo drops them below a threshold)
				const totalDays = updatedTask.accumulatedDays;
				let newTier: 'standard' | 'bronze' | 'silver' | 'gold' | 'diamond' = 'standard';
				let newMaxCapacity = 1;

				if (totalDays >= 365) { newTier = 'diamond'; newMaxCapacity = 5; }
				else if (totalDays >= 180) { newTier = 'gold'; newMaxCapacity = 4; }
				else if (totalDays >= 30) { newTier = 'silver'; newMaxCapacity = 3; }
				else if (totalDays >= 7) { newTier = 'bronze'; newMaxCapacity = 2; }

				// Override for long cycles
				if (daysInCycle >= 6) newMaxCapacity = 1;

				updatedTask.tier = newTier;

				// 3. Confiscate illegally held shields (if capacity dropped)
				if ((updatedTask.shields || 0) > newMaxCapacity) {
					updatedTask.shields = newMaxCapacity;
				}
			}
			// --- END REVERSAL ENGINE ---

			if (updatedTask.lastDepositMs) {
				// Don't let the bank go below 0 just in case
				const newBankBalance = Math.max(0, timeDeposit - updatedTask.lastDepositMs);
				await setMeta("timeDepositMs", newBankBalance);
				updatedTask.lastDepositMs = 0;
			}

			if (updatedTask.completionDates && updatedTask.completionDates.length > 0) {
        updatedTask.completionDates.pop();
      }

			await saveTaskToDB(updatedTask);
			forceRefresh();
			if (!isUndoFromToast) triggerToast("Card restored to active.", 'complete', id);
		}
	};

	const handleTakeBreak = async (id: number) => {
		const task = breakTasks.find(t => t.id === id);
		if (!task) return;

		const breakCost = task.cooldownMs || 0;
		if (timeDeposit < breakCost) {
			triggerToast(`Not enough Time Deposits! You need ${formatTimeDeposit(breakCost)}.`, 'break', id);
			return; // Stops them from taking the break!
		}
		
		// Deduct from the bank
		await setMeta("timeDepositMs", timeDeposit - breakCost);

		// Save the previous state for the Undo button
		task.previousLastDoneAt = task.lastDoneAt;
		task.previousGemClaimed = task.gemClaimed;

		// 1. Reset the cooldown timer
		task.lastDoneAt = Date.now();
		task.energyPercent = 0;
		task.gemClaimed = false;

		await saveTaskToDB(task);
		forceRefresh();

		// 2. Change the toast to reflect the delayed gratification!
		triggerToast(`Break taken! Gem will arrive at midnight 🌙`, 'break', id);
	};

	const handleUndoBreak = async (id: number) => {
		const allTasks = [...activeTasks, ...comingTasks, ...completedTasks, ...breakTasks];
		const taskToUpdate = allTasks.find(t => t.id === id);
		if (!taskToUpdate) return;
		const breakCost = taskToUpdate.cooldownMs || 0;
		await setMeta("timeDepositMs", timeDeposit + breakCost);

		// 1. Restore the previous cooldown timer
		taskToUpdate.lastDoneAt = taskToUpdate.previousLastDoneAt || 0;

		// 2. Restore the previous gem flag
		if (taskToUpdate.previousGemClaimed !== undefined) {
			taskToUpdate.gemClaimed = taskToUpdate.previousGemClaimed;
		}

		await saveTaskToDB(taskToUpdate);
		forceRefresh();
	};

	// 1. Click "Edit" on a card
	const handleEdit = (id: number) => {
		const quest = allTasks.find(t => t.id === id);
		if (quest) {
			setEditingQuest(quest);
			setIsModalOpen(true);
		}
	};

	const handleDelete = async (id: number, isUndoFromToast = false) => {
		const taskToTrash = allTasks.find(t => t.id === id);

		if (taskToTrash) {
			taskToTrash.deletedAt = Date.now();
			await saveTaskToDB(taskToTrash);
			forceRefresh();
			if (!isUndoFromToast) triggerToast("Card moved to trash.", 'delete', id);
		}
	};

	const handleRestore = async (id: number, isUndoFromToast = false) => {
		const task = deletedTasks.find(t => t.id === id);
		if (task) {
			delete task.deletedAt; // Remove the delete timestamp
			await saveTaskToDB(task);
			forceRefresh();
			if (!isUndoFromToast) triggerToast("Card restored from trash.", 'restore', id);
		}
	};

	const handleHardDelete = async (id: number) => {
		if (window.confirm("Destroy this card forever?")) {
			await deleteTaskFromDB(id);
			forceRefresh();
		}
	};

	// 2. Click "Save" inside the Modal
	const handleSaveQuest = async (newQuestData: Partial<Quest>) => {
		const now = Date.now();
		let finalQuest: Quest;

		if (editingQuest) {
			// MERGE EDIT DATA
			finalQuest = { ...editingQuest, ...newQuestData } as Quest;

			// UNCONDITIONAL SYNC: Nuke the ghost time. 
			// Whatever is in the UI form is now the absolute truth.
			finalQuest.cycleStart = newQuestData.startDate;

			const isPending = finalQuest.startDate && now < finalQuest.startDate;
			if (isPending) {
				finalQuest.energyPercent = 100;
			} else if (!finalQuest.completed) {
				if (finalQuest.isOneTime) {
					const timeLeft = (finalQuest.deadline || 0) - now;
					finalQuest.energyPercent = Math.max(0, Math.min(100, Math.round((timeLeft / finalQuest.durationMs) * 100)));
				} else {
					const activeTimeLeft = (finalQuest.cycleStart || 0) + (finalQuest.activeDeadlineMs || 0) - now;
					finalQuest.energyPercent = activeTimeLeft > 0
						? Math.max(0, Math.min(100, Math.round((activeTimeLeft / (finalQuest.activeDeadlineMs || 1)) * 100)))
						: 0;
				}
			}
		} else {
			// BRAND NEW QUEST
			finalQuest = {
				...newQuestData,
				isArchived: false,
				createdAt: newQuestData.startDate || now,
				cycleStart: newQuestData.startDate || now,
				streak: 0,
				completed: false,
				energyPercent: 100,
				accumulatedDays: 0,
				shields: 0,
				tier: 'standard'
			} as Quest;
		}

		await saveTaskToDB(finalQuest);
		setIsModalOpen(false);
		forceRefresh(); // Trigger the background engine to re-sweep the UI!
	};

	// --- Render Logic ---
	// Determine which array to loop through based on the clicked tab
	let displayedTasks = activeTasks;
	if (activeTab === 'coming') displayedTasks = comingTasks;
	if (activeTab === 'completed') displayedTasks = completedTasks;
	if (activeTab === 'break') displayedTasks = breakTasks;
	if (activeTab === 'deleted') displayedTasks = deletedTasks;
	if (activeTab === 'archived') displayedTasks = archivedTasks;

	return (
		<div className="min-h-screen pb-20 bg-gray-50/50 animate-fade-in">
			{/* TOP HEADER */}
			<header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 mb-8">
				<div className="max-w-7xl mx-auto flex justify-between items-center">
					
					{/* LOGO AREA: Added shrink-0 so the logo never gets crushed */}
					<button
						onClick={() => setShowSummaryModal(true)}
						className="flex items-center gap-2 sm:gap-3 focus:outline-none group transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
						title="View Daily Summary"
					>
						<img
							src={logo}
							alt="Game of Life Logo"
							className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500 group-hover:drop-shadow-md transition-all"
						/>
						{/* Text stays hidden on mobile, appears on sm screens and up */}
						<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-dark hidden sm:block group-hover:text-orange-600 transition-colors">
							Game of Life
						</h1>
					</button>

					{/* REWARDS AREA: Tighter gaps on mobile (gap-1.5) vs desktop (gap-4) */}
					<div className="flex items-center gap-1.5 sm:gap-4">
						
						{/* 1. GEMS */}
						<button
							className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-1.5 bg-orange-50 text-orange-600 rounded-full font-bold shadow-sm border border-orange-100 transition-all cursor-pointer hover:scale-105 active:scale-95"
						>
							<span className="text-xs sm:text-sm">💎</span>
							<span className="text-sm sm:text-base">{gems}</span>
						</button>

						{/* 2. TIME VAULT */}
						<button
							onClick={() => setIsBankModalOpen(true)}
							className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-1.5 bg-blue-50 text-blue-600 rounded-full font-bold shadow-sm border border-blue-100 transition-all cursor-pointer hover:scale-105 active:scale-95"
							title="View Time Vault"
						>
							<span className="text-xs sm:text-sm">⏳</span>
							<span className="text-sm sm:text-base">{formatShortTimeDeposit(timeDeposit)}</span>
						</button>

						{/* SETTINGS GEAR */}
						<div className="relative ml-1 sm:ml-0" ref={settingsRef}>
							<button
								onClick={() => setIsSettingsOpen(!isSettingsOpen)}
								className="text-xl sm:text-2xl p-1 hover:bg-gray-100 rounded-full transition-all focus:outline-none cursor-pointer hover:scale-110 active:scale-95 grayscale hover:grayscale-0"
								title="Settings"
							>
								⚙️
							</button>

							{/* Settings Dropdown Menu (No changes here, just paste your existing one back in if needed) */}
							{isSettingsOpen && (
								<div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in flex flex-col">
									{/* Volume Controls */}
									<div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
										<span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block text-center">
											Sound Effects
										</span>
										<div className="flex justify-between items-center gap-1">
											{[0, 1, 2, 3, 4, 5].map((level) => (
												<button
													key={level}
													onClick={async () => {
														setVolumeLevel(level);
														await setMeta("volumeLevel", level);
														if (level > 0) {
															const testAudio = new Audio(successSound);
															testAudio.volume = [0, 0.2, 0.4, 0.6, 0.8, 1.0][level];
															testAudio.play().catch(() => { });
														}
													}}
													className={`w-8 h-8 rounded-full text-xs flex items-center justify-center transition-all ${volumeLevel === level
															? 'bg-orange-500 text-white font-bold shadow-md scale-110'
															: 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
														}`}
												>
													{level === 0 ? '🔇' : level}
												</button>
											))}
										</div>
									</div>

									{/* Logout Button */}
									<button
										onClick={logoutFromGoogle}
										className="px-4 py-3 text-sm font-bold text-left text-red-500 hover:bg-red-50 transition-colors flex items-center gap-3"
									>
										<span className="text-lg">🚪</span> Logout
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</header>

			{/* MAIN CONTENT AREA */}
			<main className="max-w-7xl mx-auto px-6 pb-24">
				<div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-2">
					<h2 className="text-2xl font-bold text-dark capitalize">
						{activeTab === 'break' ? 'Break Activities' : `${activeTab} Quests`}
					</h2>
				</div>

				{displayedTasks.length === 0 ? (
					<div className="text-center py-10">
						<p className="text-muted text-sm italic">No cards found in this tab.</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mx-auto max-w-sm md:max-w-3xl lg:max-w-none">
						{/* THE MAGIC LOOP: Render a QuestCard for every item in the array */}
						{displayedTasks.map(quest => (
							<QuestCard
								key={quest.id}
								quest={quest}
								onToggleComplete={handleToggleComplete}
								onEdit={handleEdit}
								onDelete={handleDelete}
								onRestore={handleRestore}
								onHardDelete={handleHardDelete}
								onTakeBreak={handleTakeBreak}
								onBuyShield={handleBuyShield}
							/>
						))}
					</div>
				)}
			</main>

			{/* BOTTOM NAVIGATION */}
			<BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

			{/* FLOATING ACTION BUTTON (Add Quest) */}
			<button
				onClick={handleFabClick}
				className="fixed bottom-20 right-6 z-40 w-14 h-14 bg-dark text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-orange-500 hover:scale-110 active:scale-95 transition-all focus:outline-none"
			>
				<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
				</svg>
			</button>

			{/* TOAST NOTIFICATION */}
			<ToastContainer
				toast={toast}
				onClose={closeToast}
				onUndo={handleUndoAction}
			/>

			{/* MODALS */}
			<TaskModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				initialData={editingQuest}
				onSave={handleSaveQuest}
				defaultIsBreak={modalDefaultIsBreak}
			/>

			<TimeVaultModal
				isOpen={isBankModalOpen}
				onClose={() => setIsBankModalOpen(false)}
				timeDepositMs={timeDeposit}
				formatFullTime={formatTimeDeposit}
				onBuyGemWithTime={handleBuyGemWithTime}
			/>

			<DailySummaryModal
				isOpen={showSummaryModal}
				onClose={handleCloseSummary}
				completedYesterday={summaryData.completed}
				expiredQuests={summaryData.expired}
				gems={gems}
				gemsGained={summaryData.gemsGained}
				onRevive={handleReviveCard}
			/>
		</div>
	);
}