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
}

export function QuestGrid({
	tasks,
	onToggleComplete,
	onEdit,
	onDelete,
	onRestore,
	onHardDelete,
	onTakeBreak,
	onBuyShield
}: QuestGridProps) {
	
	// Handle the empty state cleanly inside the component
	if (tasks.length === 0) {
		return (
			<div className="text-center py-10">
				<p className="text-muted text-sm italic">No cards found in this tab.</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mx-auto max-w-sm md:max-w-3xl lg:max-w-none">
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
	);
}