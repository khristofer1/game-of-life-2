// src/App.tsx
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from './services/firebase';
import { Login } from './components/Login';
import { useTasks } from './hooks/useTasks';
import { TaskModal } from './components/TaskModal';
import { getMeta } from './services/db';
import { DailySummaryModal } from './components/DailySummaryModal';
import { TimeVaultModal } from './components/TimeVaultModal';
import type { ToastAction } from './hooks/useToast';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ToastContainer';
import { useDailySummary } from './hooks/useDailySummary';
import { BottomNav } from './components/layout/BottomNav';
import { GemShopModal } from './components/GemShopModal';
import { useGameEconomy } from './hooks/useGameEconomy';
import { useQuestActions } from './hooks/useQuestActions';
import { Header } from './components/layout/Header';
import { useQuestManager } from './hooks/useQuestManager';
import { ShopTab } from './components/ShopTab';
import { usePrizeDraw } from './hooks/usePrizeDraw';
import { EditNavModal } from './components/EditNavModal';
import { useNavigation } from './hooks/useNavigation';
import { useAppState } from './hooks/useAppState';
import { QuestGrid } from './components/QuestGrid';

export default function App() {
	// --- AUTHENTICATION STATE ---
	const [user, setUser] = useState<User | null>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(true);
		
	// Pull everything we need from our custom background engine!
	const {
		allTasks, activeTasks, comingTasks, completedTasks, deletedTasks, breakTasks,
		archivedTasks, gems, timePoints, medals, pendingRewards, forceRefresh
	} = useTasks(user);

	// --- UI & SETTINGS STATE ---
	const [volumeLevel, setVolumeLevel] = useState(3);

	// --- NAVIGATION ENGINE ---
	const { 
		activeTab, setActiveTab, navLayout, 
		handleSaveNavLayout, isEditNavOpen, setIsEditNavOpen 
	} = useNavigation(user);

	// --- APP UI STATE ENGINE ---
	const {
		isModalOpen, setIsModalOpen, editingQuest, modalDefaultIsBreak,
		isBankModalOpen, setIsBankModalOpen, isGemShopOpen, setIsGemShopOpen,
		handleFabClick, handleEdit
	} = useAppState(allTasks, activeTab);

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

	// --- DAILY SUMMARY ENGINE ---
	const { showSummaryModal, setShowSummaryModal, summaryData, setSummaryData,
		handleCloseSummary
	} = useDailySummary(allTasks, pendingRewards);

	// --- QUEST MANAGER ENGINE ---
	const { handleSaveQuest, handleReviveCard } = useQuestManager(
		activeTasks, comingTasks, deletedTasks, gems, forceRefresh, setSummaryData
	);

	// For debugging: shows all the cards object
	// useEffect(() => {
	// 	// We use (window as any) to stop TypeScript from complaining
	// 	(window as any).debugTasks = allTasks;
	// }, [allTasks]);

	// --- TOAST NOTIFICATION SYSTEM ---
	const { toast, triggerToast, closeToast } = useToast();
	
	// --- GACHA ENGINE ---
	const { onDraw, openingTier, recentResults, setRecentResults } = usePrizeDraw(
		medals, gems, timePoints, volumeLevel, forceRefresh, triggerToast
	);

	// --- ECONOMY ENGINE ---
	const {
		handleBuyShield, handleBuyGemWithTime, handleBuyTimeWithGem, handleClaimRewards
	} = useGameEconomy(allTasks, forceRefresh, triggerToast);

	// --- QUEST ACTIONS ENGINE ---
	const { 
		handleToggleComplete, handleTakeBreak, handleUndoBreak, 
		handleDelete, handleRestore, handleHardDelete 
	} = useQuestActions(
		allTasks, breakTasks, deletedTasks, timePoints, 
		volumeLevel, forceRefresh, triggerToast
	);

	const handleUndoAction = (action: ToastAction, taskId: number) => {
		if (action === 'delete') handleRestore(taskId, true);
		if (action === 'complete') handleToggleComplete(taskId, true);
		if (action === 'restore') handleDelete(taskId, true);
		if (action === 'break') handleUndoBreak(taskId);
	};

	if (isAuthLoading) {
		return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-muted animate-pulse">Loading Game of Life...</div>;
	}

	if (!user) {
		return <Login />;
	}

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
				timePoints={timePoints} volumeLevel={volumeLevel} setVolumeLevel={setVolumeLevel}
				onOpenSummary={() => setShowSummaryModal(true)}
				onOpenGemShop={() => setIsGemShopOpen(true)}
				onOpenTimeVault={() => setIsBankModalOpen(true)}
				onOpenEditNav={() => setIsEditNavOpen(true)}
			/>

			{/* MAIN CONTENT AREA */}
			<main className="max-w-7xl mx-auto px-6 pb-24">
				<div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-2">
					<h2 className="text-2xl font-bold text-dark capitalize">
						{activeTab === 'break' ? 'Break Activities' : 
						 activeTab === 'shop' ? 'Shop' : 
						 `${activeTab} Quests`}
					</h2>
				</div>

				{activeTab === 'shop' ? (
					<ShopTab 
						medals={medals} onDraw={onDraw} openingTier={openingTier}
						recentResults={recentResults} onCloseResults={() => setRecentResults(null)}
					/>
				) : (
					<QuestGrid 
						tasks={displayedTasks} onToggleComplete={handleToggleComplete}
						onEdit={handleEdit} onDelete={handleDelete}
						onRestore={handleRestore} onHardDelete={handleHardDelete}
						onTakeBreak={handleTakeBreak} onBuyShield={handleBuyShield}
					/>
				)}
			</main>

			{/* BOTTOM NAVIGATION */}
			<BottomNav 
				activeTab={activeTab} setActiveTab={setActiveTab} navLayout={navLayout}
			/>

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
				toast={toast} onClose={closeToast} onUndo={handleUndoAction}
			/>

			{/* MODALS */}
			<TaskModal
				isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
				initialData={editingQuest}
				onSave={(newQuestData) => handleSaveQuest(newQuestData, editingQuest, () => setIsModalOpen(false))} defaultIsBreak={modalDefaultIsBreak}
			/>

			<TimeVaultModal
				isOpen={isBankModalOpen} onClose={() => setIsBankModalOpen(false)}
				timePoints={timePoints}
			/>

			<GemShopModal
				isOpen={isGemShopOpen} onClose={() => setIsGemShopOpen(false)}
				gems={gems} timePoints={timePoints}
				onBuyGemWithTime={handleBuyGemWithTime}
				onBuyTimeWithGem={handleBuyTimeWithGem}
			/>

			<DailySummaryModal
				isOpen={showSummaryModal} onClose={handleCloseSummary}
				completedYesterday={summaryData.completed}
				expiredQuests={summaryData.expired}
				gems={gems} gemsGained={summaryData.gemsGained}
				timePoints={timePoints} onRevive={handleReviveCard}
				rewards={pendingRewards}
				onClaim={() => handleClaimRewards(
					pendingRewards.gems,
					pendingRewards.tp,
					pendingRewards.medals
				)}
			/>

			<EditNavModal
				isOpen={isEditNavOpen} onClose={() => setIsEditNavOpen(false)}
				currentLayout={navLayout} onSave={handleSaveNavLayout}
			/>
		</div>
	);
}