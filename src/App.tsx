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
import { ShopModal } from "./components/ShopModal";
import { GAME_CONFIG } from './config/gameConstants';
import logo from './assets/logo.svg';
import { DailySummaryModal } from './components/DailySummaryModal';
import confetti from 'canvas-confetti';
import successSound from './assets/success.mp3';

export default function App() {
	// --- AUTHENTICATION STATE ---
	const [user, setUser] = useState<User | null>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(true);

	// --- UI & SETTINGS STATE ---
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [volumeLevel, setVolumeLevel] = useState(3);
	const settingsRef = useRef<HTMLDivElement>(null);
	const moreMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			// If the Settings menu is open AND the click was outside of it -> Close it
			if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
				setIsSettingsOpen(false);
			}

			// If the More menu is open AND the click was outside of it -> Close it
			if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
				setIsMoreMenuOpen(false);
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
	const { allTasks, activeTasks, comingTasks, completedTasks, deletedTasks, breakTasks, archivedTasks, gems, freezes, streak, forceRefresh } = useTasks(user);

	// --- TOAST NOTIFICATION SYSTEM ---
	const [toast, setToast] = useState<{ id: number, message: string, action: 'delete' | 'complete' | 'restore' | 'break', taskId: number } | null>(null);
	const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const triggerToast = (message: string, action: 'delete' | 'complete' | 'restore' | 'break', taskId: number) => {
		if (toastTimeout.current) clearTimeout(toastTimeout.current);
		setToast({ id: Date.now(), message, action, taskId });
		// Toast disappears automatically after 5 seconds
		toastTimeout.current = setTimeout(() => setToast(null), 5000);
	};

	// React State to manage the bottom navigation
	const [activeTab, setActiveTab] = useState<'active' | 'coming' | 'completed' | 'break' | 'deleted' | 'archived'>('active');
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
	const [modalDefaultIsBreak, setModalDefaultIsBreak] = useState(false);
	const [isShopOpen, setIsShopOpen] = useState(false);

	// --- DAILY SUMMARY STATE ---
	const [showSummaryModal, setShowSummaryModal] = useState(false);
	const [summaryData, setSummaryData] = useState({ completed: [] as Quest[], expired: [] as Quest[], gemsGained: 0 });
	const hasCheckedSummary = useRef(false);

	// The Daily Check Engine & 7-Day Purge
	useEffect(() => {
		const checkDailySummary = async () => {
			const today = new Date().setHours(0, 0, 0, 0);
			const lastSummary = await getMeta("lastSummaryDate", 0);

			// 📊 1. ALWAYS CALCULATE THE DATA
			const yesterdayStart = today - (24 * 60 * 60 * 1000);

			const completedYesterday = allTasks.filter(t => {
					// 1. Check the History Array for recurring quests
					if (t.completionDates && t.completionDates.length > 0) {
							// .some() returns true if ANY timestamp in the array was yesterday
							return t.completionDates.some(date => date >= yesterdayStart && date < today);
					}
					
					// 2. Fallback for older one-time quests that don't have the array yet
					return t.completedAt && t.completedAt >= yesterdayStart && t.completedAt < today;
			});

			const expiredOneTime = allTasks.filter(t =>
				t.isOneTime && !t.completed && !t.deletedAt && t.deadline && t.deadline < today
			);

			// Find breaks taken yesterday to include them in the gem math
			const breaksYesterday = allTasks.filter(t =>
				t.isBreak && t.lastDoneAt && t.lastDoneAt >= yesterdayStart && t.lastDoneAt < today
			);

			// 1 gem per completed quest + 1 gem per break taken
			const totalGemsGained = completedYesterday.length + breaksYesterday.length;

			// ✅ Update the state setter to include the gemsGained
			setSummaryData({
				completed: completedYesterday,
				expired: expiredOneTime,
				gemsGained: totalGemsGained
			});

			// 🧹 2. ONLY AUTO-POPUP & PURGE ONCE PER DAY
			if (today > lastSummary) {
				const sevenDaysAgo = today - (7 * 24 * 60 * 60 * 1000);
				const tasksToPurge = allTasks.filter(t =>
					t.isOneTime && t.completed && t.gemClaimed && t.completedAt && t.completedAt < sevenDaysAgo
				);

				for (const task of tasksToPurge) {
					if (task.id) await deleteTaskFromDB(task.id);
				}

				if (completedYesterday.length > 0 || expiredOneTime.length > 0) {
					setShowSummaryModal(true);
				} else {
					await setMeta("lastSummaryDate", today);
				}
			}
		};

		// Run check once data is loaded
		if (!hasCheckedSummary.current && allTasks.length > 0) {
			checkDailySummary();
			hasCheckedSummary.current = true;
		}
	}, [allTasks]);

	const handleCloseSummary = async () => {
		setShowSummaryModal(false);
		const today = new Date().setHours(0, 0, 0, 0);
		await setMeta("lastSummaryDate", today); // Lock it so it doesn't show again today
	};

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

	// Shop Logic
	const handleBuyFreeze = async () => {
		if (gems >= GAME_CONFIG.REWARDS.FREEZE_COST) {
			const newGems = gems - GAME_CONFIG.REWARDS.FREEZE_COST;
			const newFreezes = freezes + 1;

			await setMeta("gems", newGems);
			await setMeta("globalFreezes", newFreezes);

			forceRefresh(); // Instantly update the UI
		} else {
			alert("Not enough gems!");
		}
	};

	const handleToggleComplete = async (id: number) => {
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
			} else {
				updatedTask.energyPercent = 0;
			}

			// STREAK ADD LOGIC
			const lastDate = await getMeta("lastStreakUpdate", 0);
			let globalStreak = await getMeta("globalStreak", 0);
			const todayDay = new Date(now).setHours(0, 0, 0, 0);
			const lastStreakDay = new Date(lastDate).setHours(0, 0, 0, 0);

			if (lastDate === 0 || todayDay > lastStreakDay) {
				globalStreak += 1;
				await setMeta("globalStreak", globalStreak);
				await setMeta("lastStreakUpdate", now);
			}

			await saveTaskToDB(updatedTask);
			forceRefresh();
			triggerToast("Card completed!", 'complete', id);

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

			if (updatedTask.completionDates && updatedTask.completionDates.length > 0) {
        updatedTask.completionDates.pop();
      }

			const todayDay = new Date(now).setHours(0, 0, 0, 0);
			const otherCompletedTasks = allTasks.some(t =>
				t.id !== updatedTask.id && t.completed && t.completedAt &&
				new Date(t.completedAt).setHours(0, 0, 0, 0) === todayDay
			);

			if (!otherCompletedTasks) {
				let globalStreak = await getMeta("globalStreak", 0);
				if (globalStreak > 0) {
					globalStreak -= 1;
					await setMeta("globalStreak", globalStreak);
					const yesterday = now - (24 * 60 * 60 * 1000);
					await setMeta("lastStreakUpdate", yesterday);
				}
			}

			await saveTaskToDB(updatedTask);
			forceRefresh();
			triggerToast("Card restored to active.", 'complete', id);
		}
	};

	const handleTakeBreak = async (id: number) => {
		const task = breakTasks.find(t => t.id === id);
		if (!task) return;

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

	const handleDelete = async (id: number) => {
		const taskToTrash = allTasks.find(t => t.id === id);

		if (taskToTrash) {
			taskToTrash.deletedAt = Date.now();
			await saveTaskToDB(taskToTrash);
			forceRefresh();
			triggerToast("Card moved to trash.", 'delete', id);
		}
	};

	const handleRestore = async (id: number) => {
		const task = deletedTasks.find(t => t.id === id);
		if (task) {
			delete task.deletedAt; // Remove the delete timestamp
			await saveTaskToDB(task);
			forceRefresh();
			triggerToast("Card restored from trash.", 'restore', id);
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
				energyPercent: 100
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
			<header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 mb-8">
				<div className="max-w-7xl mx-auto flex justify-between items-center">
					<button
						onClick={() => setShowSummaryModal(true)}
						className="flex items-center gap-3 focus:outline-none group transition-transform hover:scale-105 active:scale-95 cursor-pointer"
						title="View Daily Summary"
					>
						{/* THE LOGO */}
						<img
							src={logo}
							alt="Game of Life Logo"
							className="w-8 h-8 text-orange-500 group-hover:drop-shadow-md transition-all"
						/>

						<h1 className="text-2xl font-bold tracking-tight text-dark hidden sm:block group-hover:text-orange-600 transition-colors">
							Game of Life
						</h1>
					</button>

					<div className="flex items-center gap-4">
						<button
							onClick={() => setIsShopOpen(true)}
							className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-500 rounded-full font-bold shadow-sm border border-red-100 transition-all cursor-pointer hover:scale-105 active:scale-95"
						>
							<span className="text-sm">🔥</span>
							<span>{streak}</span>
						</button>

						<button
							onClick={() => setIsShopOpen(true)}
							className="flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full font-bold shadow-sm border border-orange-100 transition-all cursor-pointer hover:scale-105 active:scale-95"
						>
							<span className="text-sm">💎</span>
							<span>{gems}</span>
						</button>

						<div className="relative" ref={settingsRef}>
							<button
								onClick={() => setIsSettingsOpen(!isSettingsOpen)}
								className="text-2xl p-1 hover:bg-gray-100 rounded-full transition-all focus:outline-none cursor-pointer hover:scale-110 active:scale-95 grayscale hover:grayscale-0"
								title="Settings"
							>
								⚙️
							</button>

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

														// Play a tiny test sound when they click a level (if not muted)
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
							/>
						))}
					</div>
				)}
			</main>

			{/* BOTTOM NAVIGATION */}
			<nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50 px-6 py-2 flex justify-between items-center text-xs font-semibold pb-safe">
				<button
					onClick={() => setActiveTab('active')}
					className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'active'
						? 'text-orange-500 scale-105'
						: 'text-gray-400 hover:text-dark'
						}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
					</svg>
					<span className="uppercase tracking-wider">Active</span>
				</button>

				<button
					onClick={() => setActiveTab('coming')}
					className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'coming'
						? 'text-orange-500 scale-105'
						: 'text-gray-400 hover:text-dark'
						}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					<span className="uppercase tracking-wider">Coming</span>
				</button>

				<button
					onClick={() => setActiveTab('completed')}
					className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'completed'
						? 'text-orange-500 scale-105'
						: 'text-gray-400 hover:text-dark'
						}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
					</svg>
					<span className="uppercase tracking-wider">Completed</span>
				</button>

				{/* MORE MENU (3 DOTS) */}
				<div className="flex-1 flex justify-center relative" ref={moreMenuRef}>
					<button
						onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
						className={`flex flex-col items-center gap-1 transition-all ${(activeTab === 'deleted' || activeTab === 'break')
								? 'text-orange-500 scale-105'
								: 'text-gray-400 hover:text-dark'
							}`}
					>
						<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
						</svg>
						<span className="uppercase tracking-wider">More</span>
					</button>

					{/* THE POPUP DROPDOWN */}
					{isMoreMenuOpen && (
						<div className="absolute bottom-full mb-4 right-4 w-40 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in flex flex-col">
							<button
								onClick={() => { setActiveTab('break'); setIsMoreMenuOpen(false); }}
								className={`px-4 py-3 text-sm font-bold text-left hover:bg-orange-50 transition-colors flex items-center gap-2 ${activeTab === 'break' ? 'text-orange-500 bg-orange-50/50' : 'text-dark'}`}
							>
								<span className="text-lg">☕</span> Break
							</button>

							<button
								onClick={() => { setActiveTab('archived'); setIsMoreMenuOpen(false); }}
								className={`px-4 py-3 text-sm font-bold text-left hover:bg-blue-50 transition-colors border-t border-gray-100 flex items-center gap-2 ${activeTab === 'archived' ? 'text-blue-500 bg-blue-50/50' : 'text-dark'}`}
							>
								<span className="text-lg">🏛️</span> Archived
							</button>

							<button
								onClick={() => { setActiveTab('deleted'); setIsMoreMenuOpen(false); }}
								className={`px-4 py-3 text-sm font-bold text-left hover:bg-red-50 transition-colors border-t border-gray-100 flex items-center gap-2 ${activeTab === 'deleted' ? 'text-red-500 bg-red-50/50' : 'text-dark'}`}
							>
								<span className="text-lg">🗑️</span> Deleted
							</button>
						</div>
					)}
				</div>
			</nav>

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
			{toast && (
				<div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
					<div className="bg-dark text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 text-sm font-semibold border border-gray-700">
						<span>{toast.message}</span>
						<div className="w-px h-4 bg-gray-600"></div>
						<button
							onClick={() => {
								// Route the undo click to the correct function!
								if (toast.action === 'delete') handleRestore(toast.taskId);
								if (toast.action === 'complete') handleToggleComplete(toast.taskId);
								if (toast.action === 'restore') handleDelete(toast.taskId);
								if (toast.action === 'break') handleUndoBreak(toast.taskId);

								// Close the toast immediately
								setToast(null);
								if (toastTimeout.current) clearTimeout(toastTimeout.current);
							}}
							className="text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-wider text-xs px-1"
						>
							Undo
						</button>
					</div>
				</div>
			)}

			{/* MODALS */}
			<TaskModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				initialData={editingQuest}
				onSave={handleSaveQuest}
				defaultIsBreak={modalDefaultIsBreak}
			/>

			<ShopModal
				isOpen={isShopOpen}
				onClose={() => setIsShopOpen(false)}
				gems={gems}
				freezes={freezes}
				onBuyFreeze={handleBuyFreeze}
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