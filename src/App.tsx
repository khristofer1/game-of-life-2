// src/App.tsx
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from './services/firebase';
import { Login } from './components/Login';
import { useTasks } from './hooks/useTasks';
import { QuestCard } from './components/QuestCard';
import { TaskModal } from './components/TaskModal';
import { saveTaskToDB, getMeta, setMeta } from './services/db';
import type { Quest } from './types/quest';
import { DailySummaryModal } from './components/DailySummaryModal';
import { TimeVaultModal } from './components/TimeVaultModal';
import { formatTimeDeposit } from './utils/timeFormat';
import type { ToastAction } from './hooks/useToast';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ToastContainer';
import { useDailySummary } from './hooks/useDailySummary';
import { BottomNav } from './components/layout/BottomNav';
import type { TabType } from './components/layout/BottomNav';
import { GemShopModal } from './components/GemShopModal';
import { useGameEconomy } from './hooks/useGameEconomy';
import { useQuestActions } from './hooks/useQuestActions';
import { Header } from './components/layout/Header';

export default function App() {
	// --- AUTHENTICATION STATE ---
	const [user, setUser] = useState<User | null>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(true);

	// --- UI & SETTINGS STATE ---
	const [volumeLevel, setVolumeLevel] = useState(3);

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

	// --- ECONOMY ENGINE ---
	const { handleBuyShield, handleBuyGemWithTime, handleBuyTimeWithGem } = useGameEconomy(gems, timeDeposit, allTasks, forceRefresh, triggerToast);

	// --- QUEST ACTIONS ENGINE ---
	const { 
		handleToggleComplete, handleTakeBreak, handleUndoBreak, 
		handleDelete, handleRestore, handleHardDelete 
	} = useQuestActions(
		allTasks, breakTasks, deletedTasks, timeDeposit, 
		volumeLevel, forceRefresh, triggerToast
	);

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
	const [isGemShopOpen, setIsGemShopOpen] = useState(false);

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

	const handleEdit = (id: number) => {
		const quest = allTasks.find(t => t.id === id);
		if (quest) {
			setEditingQuest(quest);
			setIsModalOpen(true);
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
			<Header 
				gems={gems}
				timeDeposit={timeDeposit}
				volumeLevel={volumeLevel}
				setVolumeLevel={setVolumeLevel}
				onOpenSummary={() => setShowSummaryModal(true)}
				onOpenGemShop={() => setIsGemShopOpen(true)}
				onOpenTimeVault={() => setIsBankModalOpen(true)}
			/>

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
			/>

			<GemShopModal
				isOpen={isGemShopOpen}
				onClose={() => setIsGemShopOpen(false)}
				gems={gems}
				timeDepositMs={timeDeposit}
				onBuyGemWithTime={handleBuyGemWithTime}
				onBuyTimeWithGem={handleBuyTimeWithGem}
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