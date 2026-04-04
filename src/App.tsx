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

export default function App() {
	// --- AUTHENTICATION STATE ---
	const [user, setUser] = useState<User | null>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(true);

	useEffect(() => {
		// listens for login/logout events automatically
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			setUser(currentUser);
			setIsAuthLoading(false);
		});
		return unsubscribe;
	}, []);
	
	// Pull everything we need from our custom background engine!
	const { activeTasks, comingTasks, completedTasks, deletedTasks, gems, freezes, streak, forceRefresh } = useTasks(user);

	// --- TOAST NOTIFICATION SYSTEM ---
  const [toast, setToast] = useState<{ id: number, message: string, action: 'delete' | 'complete' | 'restore', taskId: number } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const triggerToast = (message: string, action: 'delete' | 'complete' | 'restore', taskId: number) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ id: Date.now(), message, action, taskId });
    // Toast disappears automatically after 5 seconds
    toastTimeout.current = setTimeout(() => setToast(null), 5000);
  };

	// React State to manage the bottom navigation
	const [activeTab, setActiveTab] = useState<'active' | 'coming' | 'completed' | 'deleted'>('active');
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
	const [isShopOpen, setIsShopOpen] = useState(false);

	if (isAuthLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-muted animate-pulse">Loading Game of Life...</div>;
  }

  if (!user) {
    return <Login />;
  }

	// --- Action Handlers (Stubs) ---

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
    const allTasks = [...activeTasks, ...comingTasks, ...completedTasks];
    const taskToUpdate = allTasks.find(t => t.id === id);
    if (!taskToUpdate) return;

    const now = Date.now();
    const updatedTask = { ...taskToUpdate };

    // Toggling to COMPLETED
    if (!updatedTask.completed) {
      updatedTask.completed = true;
      updatedTask.completedAt = now;
      updatedTask.gemClaimed = false;

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
      triggerToast("Quest completed!", 'complete', id);

    // UNDOING a Completion (Moving back to Active)
    } else {
      updatedTask.completed = false;
      updatedTask.completedAt = null;
      updatedTask.gemClaimed = false;

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
      triggerToast("Quest restored to active.", 'complete', id);
    }
  };

	// 1. Click "Edit" on a card
	const handleEdit = (id: number) => {
		const allTasks = [...activeTasks, ...comingTasks, ...completedTasks];
		const quest = allTasks.find(t => t.id === id);
		if (quest) {
			setEditingQuest(quest);
			setIsModalOpen(true);
		}
	};

	const handleDelete = async (id: number) => {
    const allTasks = [...activeTasks, ...comingTasks, ...completedTasks];
    const taskToTrash = allTasks.find(t => t.id === id);
    
    if (taskToTrash) {
      taskToTrash.deletedAt = Date.now();
      await saveTaskToDB(taskToTrash);
      forceRefresh();
      triggerToast("Quest moved to trash.", 'delete', id);
    }
  };

	const handleRestore = async (id: number) => {
		const task = deletedTasks.find(t => t.id === id);
		if (task) {
			delete task.deletedAt; // Remove the delete timestamp
			await saveTaskToDB(task);
			forceRefresh();
			triggerToast("Quest restored from trash.", 'restore', id);
		}
	};

	const handleHardDelete = async (id: number) => {
		if (window.confirm("Destroy this quest forever?")) {
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
	if (activeTab === 'deleted') displayedTasks = deletedTasks;

	return (
		<div className="min-h-screen pb-20 bg-gray-50/50 animate-fade-in">
			{/* TOP HEADER */}
			<header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 mb-8">
				<div className="max-w-7xl mx-auto flex justify-between items-center">
					<div className="flex items-center gap-3">
						{/* THE LOGO */}
						<img
							src={logo}
							alt="Game of Life Logo"
							className='w-8 h-8 text-orange-500'
						/>
						
						<h1 className="text-2xl font-bold tracking-tight text-dark hidden sm:block">
							Game of Life
						</h1>
					</div>

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

						<button onClick={logoutFromGoogle} className="text-xs font-bold text-muted hover:text-dark mr-2">
              Logout
            </button>
					</div>
				</div>
			</header>

			{/* MAIN CONTENT AREA */}
			<main className="max-w-7xl mx-auto px-6 pb-24">
				<div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-2">
					<h2 className="text-2xl font-bold text-dark capitalize">{activeTab} Quests</h2>
				</div>

				{displayedTasks.length === 0 ? (
					<div className="text-center py-10">
						<p className="text-muted text-sm italic">No quests found in this tab.</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-md mx-auto md:max-w-none">
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
							/>
						))}
					</div>
				)}
			</main>

			{/* BOTTOM NAVIGATION */}
			<nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-40 px-6 py-2 flex justify-between items-center text-xs font-semibold pb-safe">
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

				<button
					onClick={() => setActiveTab('deleted')}
					className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'deleted'
						? 'text-red-500 scale-105'
						: 'text-gray-400 hover:text-dark'
						}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
					<span className="uppercase tracking-wider">Deleted</span>
				</button>
			</nav>

			{/* FLOATING ACTION BUTTON (Add Quest) */}
			<button
				onClick={() => { setEditingQuest(null); setIsModalOpen(true); }} // <-- Updated
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
			/>

			<ShopModal
				isOpen={isShopOpen}
				onClose={() => setIsShopOpen(false)}
				gems={gems}
				freezes={freezes}
				onBuyFreeze={handleBuyFreeze}
			/>
		</div>
	);
}