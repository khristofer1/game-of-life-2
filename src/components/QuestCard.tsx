// src/components/QuestCard.tsx
import { useState, useEffect } from 'react';
import type { Quest } from '../types/quest';

interface QuestCardProps {
  quest: Quest;
  onToggleComplete: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;
  onHardDelete: (id: number) => void;
}

export function QuestCard({ quest, onToggleComplete, onEdit, onDelete, onRestore, onHardDelete }: QuestCardProps) {
  const [now, setNow] = useState(Date.now());

  // --- Dynamic Math Calculations ---
  // We calculate deadlines first so we can check if it's in the "Dead Zone"
  const activeDeadline = quest.isOneTime 
    ? (quest.deadline || 0) 
    : ((quest.cycleStart || 0) + (quest.activeDeadlineMs || 0));
      
  const activeDuration = quest.isOneTime 
    ? quest.durationMs 
    : (quest.activeDeadlineMs || 1);

  // A quest is "Pending" (Locked) if it hasn't started yet, 
  // OR if it's a recurring quest that completely missed its active window.
  const isFutureStart = !!(quest.startDate && now < quest.startDate);
  const isDeadZone = !quest.isOneTime && !quest.completed && now >= activeDeadline;

  const isPending = isFutureStart || isDeadZone;
  const isDynamic = !quest.completed && !isPending;

  // Real-time ticking logic
  useEffect(() => {
    if (!isDynamic) return;
    const intervalId = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(intervalId); 
  }, [isDynamic]);

  const timeLeft = activeDeadline - now;
  
  // Calculate precise energy percent for the UI
  let percent = 100;
  if (isFutureStart) {
    percent = 100;
  } else if (quest.completed) {
    percent = quest.energyPercent;
  } else if (timeLeft > 0) {
    percent = Math.max(0, Math.min(100, Math.round((timeLeft / activeDuration) * 100)));
  } else {
    percent = 0;
  }

  // --- UI Formatting ---
  let barColor = 'bg-green-500';
  if (percent <= 50) barColor = 'bg-yellow-500';
  if (percent <= 25) barColor = 'bg-red-500';
  if (quest.completed || isPending) barColor = 'bg-gray-300';

  let btnClass = '';
  let btnText = '';
  if (isPending) {
    // If it's in the dead zone, tell them when the next cycle starts!
    const nextStartMs = isFutureStart ? (quest.startDate as number) : ((quest.cycleStart || 0) + quest.durationMs);
    const startD = new Date(nextStartMs);
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
      `}
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
        {quest.deletedAt ? (
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