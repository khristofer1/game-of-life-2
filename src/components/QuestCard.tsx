// src/components/QuestCard.tsx
import { useState, useEffect } from 'react';
import type { Quest } from '../types/quest';

interface QuestCardProps {
  quest: Quest;
  isDeleting?: boolean;
  isCompleting?: boolean;
  onToggleComplete: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;
  onHardDelete: (id: number) => void;
  onCancelDelete?: (id: number) => void;
  onCancelComplete?: (id: number) => void;
}

export function QuestCard({ quest, isDeleting, isCompleting, onToggleComplete, onEdit, onDelete, onRestore, onHardDelete, onCancelDelete, onCancelComplete }: QuestCardProps) {
  // Local state to force the card to re-render every minute for the countdown
  const [now, setNow] = useState(Date.now());

  const isPending = !!(quest.startDate && now < quest.startDate);
  const isDynamic = !quest.completed && !isPending;

  // Real-time ticking logic
  useEffect(() => {
    if (!isDynamic) return;

    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => clearInterval(intervalId); // Cleanup prevents memory leaks!
  }, [isDynamic]);

  // --- Dynamic Math Calculations ---
  const activeDeadline = quest.isOneTime
    ? (quest.deadline || 0)
    : ((quest.cycleStart || 0) + (quest.activeDeadlineMs || 0));

  const activeDuration = quest.isOneTime
    ? quest.durationMs
    : (quest.activeDeadlineMs || 1);

  const timeLeft = activeDeadline - now;

  // Calculate precise energy percent for the UI
  let percent = 100;
  if (isPending) {
    percent = 100;
  } else if (quest.completed) {
    percent = quest.energyPercent; // Lock at the saved percentage
  } else if (timeLeft > 0) {
    percent = Math.max(0, Math.min(100, Math.round((timeLeft / activeDuration) * 100)));
  } else {
    percent = 0;
  }

  // --- UI Formatting ---
  let barColor = 'bg-green-500';
  if (percent <= 25) barColor = 'bg-red-500';
  if (quest.completed || isPending) barColor = 'bg-gray-300';

  let timeText = '';
  if (isDynamic) {
    if (timeLeft > 0) {
      const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const h = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      if (d > 0) timeText = `${d}d ${h}h left`;
      else if (h > 0) timeText = `${h}h ${m}m left`;
      else timeText = `${m}m left`;
    } else {
      timeText = 'Expired';
    }
  }

  let btnClass = '';
  let btnText = '';
  if (isPending) {
    const startD = new Date(quest.startDate);
    const dateStr = startD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeStr = startD.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    btnClass = 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200';
    btnText = `⏳ Starts ${dateStr}, ${timeStr}`;
  } else {
    btnClass = quest.completed
      ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
      : 'bg-gray-100 text-dark hover:bg-orange-50 hover:text-orange-600';
    btnText = quest.completed ? '✓ Done (Undo)' : 'Complete';
  }

  return (
    <div 
      className={`glass-card flex flex-col h-full rounded-4xl p-6 shadow-premium transition-all 
        ${quest.completed ? 'ring-2 ring-orange-400 bg-white/40 ring-inset' : ''} 
        ${isPending ? 'opacity-75 grayscale-[0.2]' : ''}
        ${isDeleting || isCompleting ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}
      `}
      style={{ transitionDuration: (isDeleting || isCompleting) ? '3000ms' : '300ms' }}
    >

      <div className="flex justify-between items-start mb-3 gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-dark leading-tight line-clamp-1">{quest.name}</h3>
          {quest.desc && <p className="text-xs text-muted mt-1 line-clamp-2">{quest.desc}</p>}
        </div>
      </div>

      <div className="mt-auto pt-2 mb-5">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">
            {quest.displayFreq}
          </span>
          <div className="text-right">
            {isDynamic && (
              <span className="text-[10px] font-bold text-muted block mb-0.5">
                {timeText}
              </span>
            )}
            <span className={`text-sm font-bold ${isPending ? 'text-gray-400' : (quest.completed ? 'text-green-500' : 'text-orange-500')}`}>
              {isPending ? 'Locked' : (quest.completed ? `Safe at ${percent}%` : `${percent}%`)}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`${barColor} h-2 rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${percent}%` }}
          ></div>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between gap-2">
        {isDeleting ? (
          // --- THE 3-SECOND UNDO WINDOW ---
          <button 
            onClick={() => quest.id && onCancelDelete?.(quest.id)}
            className="grow flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-dark text-white hover:bg-gray-800 transition-all shadow-lg"
          >
            Restore
          </button>
        ) : isCompleting ? (
          // --- THE 3-SECOND COMPLETION UNDO WINDOW ---
          <button 
            onClick={() => quest.id && onCancelComplete?.(quest.id)}
            className="grow flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-orange-100 text-orange-600 hover:bg-orange-200 transition-all shadow-sm"
          >
            Undo Action
          </button>
        ) : quest.deletedAt ? (
          // --- RECYCLE BIN ACTIONS ---
          <>
            <button
              onClick={() => quest.id && onRestore?.(quest.id)}
              className="grow flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
            >
              Restore
            </button>
            <button
              onClick={() => quest.id && onHardDelete?.(quest.id)}
              className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90"
              title="Delete Permanently"
            >
              🗑️
            </button>
          </>
        ) : (
          // --- STANDARD ACTIONS (Active/Coming/Completed) ---
          <>
            <button
              onClick={() => !isPending && quest.id && onToggleComplete(quest.id)}
              disabled={isPending}
              className={`grow flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm whitespace-nowrap ${btnClass}`}
            >
              {btnText}
            </button>

            <div className="flex gap-1 shrink-0 ml-2">
              <button
                onClick={() => quest.id && onEdit(quest.id)}
                className="p-3 rounded-xl bg-gray-50 text-muted hover:text-orange-500 hover:bg-orange-50 transition-all active:scale-90"
              >
                ✏️
              </button>
              <button
                onClick={() => quest.id && onDelete(quest.id)}
                className="p-3 rounded-xl bg-gray-50 text-muted hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
              >
                🗑️
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}