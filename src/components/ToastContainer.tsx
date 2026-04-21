// src/components/ToastContainer.tsx
import type { ToastState, ToastAction } from '../hooks/useToast';

interface ToastContainerProps {
	toast: ToastState | null;
	onClose: () => void;
	onUndo: (action: ToastAction, taskId: number) => void;
}

export function ToastContainer({ toast, onClose, onUndo }: ToastContainerProps) {
	if (!toast) return null;

	// Check if this toast is meant to have an undo action
	const hasUndoAction = toast.action !== undefined && toast.taskId !== undefined;

	return (
		<div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
			<div className="bg-dark text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 text-sm font-semibold border border-gray-700">
				<span>{toast.message}</span>
				
				{/* Only render the divider and the Undo button if the action is valid */}
				{hasUndoAction && (
					<>
						<div className="w-px h-4 bg-gray-600"></div>
						<button
							onClick={() => {
								// The '!' tells TypeScript we guarantee these exist because of our hasUndoAction check
								onUndo(toast.action!, toast.taskId!);
								onClose();
							}}
							className="text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-wider text-xs px-1 cursor-pointer focus:outline-none active:scale-95"
						>
							Undo
						</button>
					</>
				)}
			</div>
		</div>
	);
}