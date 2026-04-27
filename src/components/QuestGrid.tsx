// src/components/QuestGrid.tsx
import type { Quest } from '../types/quest';
import { QuestCard } from './QuestCard';

interface QuestGridProps {
	tasks: Quest[];
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
	tasks,
	onToggleComplete,
	onEdit,
	onDelete,
	onRestore,
	onHardDelete,
	onTakeBreak,
	onBuyShield,
	isCompletedTab
}: QuestGridProps) {
	
	// Handle the empty state cleanly inside the component
	if (tasks.length === 0) {
		return (
			<div className="text-center py-10">
				<p className="text-muted text-sm italic">No cards found in this tab.</p>
			</div>
		);
	}

	// --- LOOT CALCULATION LOGIC ---
	const totalGems = tasks.length; 
	const totalTP = tasks.reduce((sum, t) => sum + (t.lastDepositMs || 0), 0);
	const totalBronze = tasks.filter(t => t.pendingMedal === 'bronze').length;
	const totalSilver = tasks.filter(t => t.pendingMedal === 'silver').length;
	const totalGold = tasks.filter(t => t.pendingMedal === 'gold').length;

	return (
		<div className="flex flex-col relative">
			
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
				{tasks.map(quest => (
					<QuestCard
						key={quest.id}
						quest={quest}
						onToggleComplete={onToggleComplete}
						onEdit={onEdit}
						onDelete={onDelete}
						onRestore={onRestore}
						onHardDelete={onHardDelete}
						onTakeBreak={onTakeBreak}
						onBuyShield={onBuyShield}
					/>
				))}
			</div>

			{/* PENDING LOOT BANNER - CHANGED TO FIXED POSITIONING */}
			{isCompletedTab && tasks.length > 0 && (
				<div className="fixed bottom-19 left-0 w-full z-30 pointer-events-none px-4 sm:px-6">
					<div className="max-w-7xl mx-auto relative">
						{/* The pr-20 (padding-right) ensures the FAB doesn't block the loot numbers! */}
						<div className="bg-white/90 backdrop-blur-md border border-orange-200 rounded-3xl p-4 shadow-md animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto pr-20 sm:pr-24 mx-auto max-w-sm md:max-w-3xl lg:max-w-none">
							
							<div className="text-sm font-bold text-dark flex items-center gap-2">
								<span className="text-xl">🎁</span> 
								<span className="hidden sm:inline">Pending Loot Summary</span>
								<span className="sm:hidden">Pending Loot</span>
							</div>

							<div className="flex flex-wrap justify-start sm:justify-end gap-2">
								{totalGems > 0 && <span className="font-black text-orange-500 bg-white px-2 sm:px-3 py-1 rounded-lg shadow-sm border border-orange-100">💎 +{totalGems}</span>}
								{totalTP > 0 && <span className="font-black text-blue-600 bg-white px-2 sm:px-3 py-1 rounded-lg shadow-sm border border-blue-100">⏳ +{totalTP}</span>}
								{totalBronze > 0 && <span className="font-black text-amber-700 bg-white px-2 sm:px-3 py-1 rounded-lg shadow-sm border border-amber-100">🥉 +{totalBronze}</span>}
								{totalSilver > 0 && <span className="font-black text-slate-500 bg-white px-2 sm:px-3 py-1 rounded-lg shadow-sm border border-slate-100">🥈 +{totalSilver}</span>}
								{totalGold > 0 && <span className="font-black text-yellow-500 bg-white px-2 sm:px-3 py-1 rounded-lg shadow-sm border border-yellow-100">🥇 +{totalGold}</span>}
							</div>

						</div>
					</div>
				</div>
			)}
		</div>
	);
}