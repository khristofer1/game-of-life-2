// src/components/QuestGrid.tsx
import { useState } from 'react';
import type { Quest } from '../types/quest';
import { QuestCard } from './QuestCard';

interface QuestGridProps {
	tasks: Quest[];
	archivedTasks?: Quest[]; // <-- NEW
	onToggleComplete: (id: number, isUndo?: boolean) => void;
	onEdit: (id: number) => void;
	onDelete: (id: number, isUndo?: boolean) => void;
	onRestore: (id: number, isUndo?: boolean) => void;
	onHardDelete: (id: number) => void;
	onTakeBreak: (id: number) => void;
	onBuyShield: (id: number, cost: number) => void;
	isCompletedTab?: boolean; 
}

export function QuestGrid({
	tasks, archivedTasks, onToggleComplete, onEdit, onDelete,
	onRestore, onHardDelete, onTakeBreak, onBuyShield, isCompletedTab
}: QuestGridProps) {
	
	const [isCompletedOpen, setIsCompletedOpen] = useState(true);
	const [isArchiveOpen, setIsArchiveOpen] = useState(false);

	// Empty state check
	if (!isCompletedTab && tasks.length === 0) {
		return <div className="text-center py-10"><p className="text-muted text-sm italic">No cards found in this tab.</p></div>;
	}
	if (isCompletedTab && tasks.length === 0 && (!archivedTasks || archivedTasks.length === 0)) {
		return <div className="text-center py-10"><p className="text-muted text-sm italic">No records found.</p></div>;
	}

	// --- LOOT CALCULATION (Only applies to today's unrewarded tasks) ---
	const totalGems = tasks.length; 
	const totalTP = tasks.reduce((sum, t) => sum + (t.lastDepositMs || 0), 0);
	const totalBronze = tasks.filter(t => t.pendingMedal === 'bronze').length;
	const totalSilver = tasks.filter(t => t.pendingMedal === 'silver').length;
	const totalGold = tasks.filter(t => t.pendingMedal === 'gold').length;

	return (
		<div className="flex flex-col relative w-full">
			
			{isCompletedTab ? (
				<div className="space-y-8 w-full">
					
					{/* 1. COMPLETED TODAY DRAWER */}
					<div className="space-y-4">
						<button onClick={() => setIsCompletedOpen(!isCompletedOpen)} className="w-full flex items-center justify-between bg-white px-5 py-4 rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
							<div className="flex items-center gap-3">
								<span className="text-xl">✅</span>
								<span className="font-bold text-dark text-lg">Completed Today</span>
								<span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-xs font-bold">{tasks.length}</span>
							</div>
							<span className={`transform transition-transform text-gray-400 ${isCompletedOpen ? 'rotate-180' : ''}`}>▼</span>
						</button>

						{isCompletedOpen && (
							tasks.length > 0 ? (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
									{tasks.map(quest => <QuestCard key={quest.id} quest={quest} onToggleComplete={onToggleComplete} onEdit={onEdit} onDelete={onDelete} onRestore={onRestore} onHardDelete={onHardDelete} onTakeBreak={onTakeBreak} onBuyShield={onBuyShield} />)}
								</div>
							) : (
								<p className="text-muted text-sm italic text-center py-4">No completed tasks yet today.</p>
							)
						)}
					</div>

					{/* 2. PENDING LOOT SUMMARY (Normal Flow, No longer fixed) */}
					{tasks.length > 0 && (
						<div className="bg-linear-to-r from-orange-50 to-blue-50 border border-orange-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
							<div className="text-sm font-bold text-dark flex items-center gap-2">
								<span className="text-xl">🎁</span> 
								<span>Pending Loot Summary</span>
							</div>
							<div className="flex flex-wrap justify-start sm:justify-end gap-2">
								{totalGems > 0 && <span className="font-black text-orange-500 bg-white px-3 py-1 rounded-lg shadow-sm border border-orange-100">💎 +{totalGems}</span>}
								{totalTP > 0 && <span className="font-black text-blue-600 bg-white px-3 py-1 rounded-lg shadow-sm border border-blue-100">⏳ +{totalTP}</span>}
								{totalBronze > 0 && <span className="font-black text-amber-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-amber-100">🥉 +{totalBronze}</span>}
								{totalSilver > 0 && <span className="font-black text-slate-500 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">🥈 +{totalSilver}</span>}
								{totalGold > 0 && <span className="font-black text-yellow-500 bg-white px-3 py-1 rounded-lg shadow-sm border border-yellow-100">🥇 +{totalGold}</span>}
							</div>
						</div>
					)}

					{/* 3. ARCHIVE DRAWER */}
					{archivedTasks && (
						<div className="space-y-4">
							<button onClick={() => setIsArchiveOpen(!isArchiveOpen)} className="w-full flex items-center justify-between bg-white px-5 py-4 rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer mt-4">
								<div className="flex items-center gap-3">
									<span className="text-xl">🏛️</span>
									<span className="font-bold text-dark text-lg">Archive History</span>
									<span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-xs font-bold">{archivedTasks.length}</span>
								</div>
								<span className={`transform transition-transform text-gray-400 ${isArchiveOpen ? 'rotate-180' : ''}`}>▼</span>
							</button>

							{isArchiveOpen && (
								archivedTasks.length > 0 ? (
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
										{archivedTasks.map(quest => <QuestCard key={quest.id} quest={quest} onToggleComplete={onToggleComplete} onEdit={onEdit} onDelete={onDelete} onRestore={onRestore} onHardDelete={onHardDelete} onTakeBreak={onTakeBreak} onBuyShield={onBuyShield} />)}
									</div>
								) : (
									<p className="text-muted text-sm italic text-center py-4">Your archive is empty.</p>
								)
							)}
						</div>
					)}

				</div>
			) : (
				// STANDARD GRID VIEW (For all other tabs)
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
					{tasks.map(quest => (
						<QuestCard key={quest.id} quest={quest} onToggleComplete={onToggleComplete} onEdit={onEdit} onDelete={onDelete} onRestore={onRestore} onHardDelete={onHardDelete} onTakeBreak={onTakeBreak} onBuyShield={onBuyShield} />
					))}
				</div>
			)}

		</div>
	);
}