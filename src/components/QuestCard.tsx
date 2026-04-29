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
  onTakeBreak?: (id: number) => void;
  onBuyShield?: (id: number, cost: number) => void;
  onOpenTierModal: (quest: Quest) => void;
}

const formatDescriptionWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-500 hover:text-orange-600 hover:underline transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export function QuestCard({ quest, onToggleComplete, onEdit, onDelete, onRestore, onHardDelete, onTakeBreak, onOpenTierModal }: QuestCardProps) {
  const [now, setNow] = useState(Date.now());

  const activeDeadline = quest.isOneTime
    ? (quest.deadline || 0)
    : ((quest.cycleStart || 0) + (quest.activeDeadlineMs || 0));

  const activeDuration = quest.isOneTime
    ? quest.durationMs
    : (quest.activeDeadlineMs || 1);

  const isFutureStart = !!(quest.startDate && now < quest.startDate && !quest.isBreak);
  const isDeadZone = !quest.isOneTime && !quest.completed && !quest.isBreak && now >= activeDeadline;
  const isPending = isFutureStart || isDeadZone;
  const isDynamic = !quest.completed && !isPending;

  useEffect(() => {
    if (!isDynamic) return;
    const intervalId = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(intervalId);
  }, [isDynamic]);

  let percent = 100;
  if (quest.isBreak) {
    const timeSinceLastDone = now - (quest.lastDoneAt || 0);
    const cooldownLeft = (quest.cooldownMs || 0) - timeSinceLastDone;
    if (cooldownLeft > 0) percent = Math.max(0, Math.min(100, Math.round((timeSinceLastDone / (quest.cooldownMs || 1)) * 100)));
  } else if (!isFutureStart && !quest.completed) {
    const timeLeft = activeDeadline - now;
    if (timeLeft > 0) percent = Math.max(0, Math.min(100, Math.round((timeLeft / activeDuration) * 100)));
    else percent = 0;
  } else if (quest.completed) {
    percent = quest.energyPercent;
  }

  // --- TIER CALCULATIONS ---
  const isRecurring = !quest.isOneTime && !quest.isBreak;

  let tierColors = 'ring-1 ring-gray-300 bg-gradient-to-br from-white/80 to-gray-100';
  let barBorder = 'border-gray-200 bg-linear-to-b from-gray-200 to-white';
  switch (quest.tier) {
    case 'bronze':
      tierColors = 'ring-1 ring-[#cd7f32] bg-gradient-to-br from-white/80 to-[#cd7f32]/25';
      barBorder = 'border-[#cd7f32]/40 bg-gradient-to-b from-[#cd7f32]/30 to-white/60';
      break;
    case 'silver':
      tierColors = 'ring-1 ring-gray-400 bg-gradient-to-br from-white/80 to-gray-400/25';
      barBorder = 'border-gray-400/40 bg-gradient-to-b from-gray-400/30 to-white/60';
      break;
    case 'gold':
      tierColors = 'ring-1 ring-yellow-400 bg-gradient-to-br from-white/80 to-yellow-400/35';
      barBorder = 'border-yellow-400/50 bg-gradient-to-b from-yellow-400/40 to-white/70';
      break;
    case 'diamond':
      tierColors = 'ring-1 ring-cyan-400 bg-gradient-to-br from-white/80 to-cyan-400/35 shadow-[0_0_15px_rgba(34,211,238,0.3)]';
      barBorder = 'border-cyan-400/50 bg-gradient-to-b from-cyan-400/40 to-white/70';
      break;
  }
  // --- END TIER CALCULATIONS ---

  let barColor;
  if (quest.completed || isPending) barColor = 'bg-gray-300';
  else if (percent > 50) barColor = 'bg-linear-to-b from-green-400 to-green-500';
  else if (percent > 25) barColor = 'bg-linear-to-b from-yellow-400 to-yellow-500';
  else barColor = 'bg-linear-to-b from-red-400 to-red-500';

  let btnClass = '';
  let btnText = '';
  if (isPending) {
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
      className={`glass-card flex flex-col h-full rounded-4xl p-6 transition-all shadow-premium
        ${tierColors} 
        ${isPending ? 'opacity-75 grayscale-[0.2]' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-3 gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-dark leading-tight line-clamp-1">{quest.name}</h3>
          {quest.desc && <p className="text-xs text-muted mt-1 line-clamp-2 whitespace-pre-wrap">{formatDescriptionWithLinks(quest.desc)}</p>}
        </div>

        {isRecurring && (
          <button
            onClick={() => onOpenTierModal(quest)}
            disabled={isPending}
            title="View Tier & Shields"
            className={`flex shrink-0 items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-xl font-black text-sm shadow-sm transition-transform hover:scale-105 active:scale-95 bg-white cursor-pointer ${tierColors} ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            🔥{quest.streak || 0}
          </button>
        )}
      </div>

      <div className="mt-auto pt-2 mb-5">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
            {quest.displayFreq}
          </span>
          <div className="text-right">
            <span className={`text-sm font-bold ${isPending ? 'text-gray-400' : (quest.completed ? 'text-green-500' : 'text-orange-500')}`}>
              {isPending ? 'Locked' : (quest.completed ? `Safe at ${percent}%` : `${percent}%`)}
            </span>
          </div>
        </div>
        <div className={`w-full rounded-full h-2.5 overflow-hidden border ${barBorder} transition-all duration-500`}>
          <div
            className={`${barColor} h-full rounded-full transition-all duration-1000 ease-out shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]`}
            style={{ width: `${percent}%` }}
          ></div>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between gap-2">
        {quest.deletedAt ? (
          <>
            <button onClick={() => quest.id && onRestore?.(quest.id)} className="grow flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">Restore</button>
            <button onClick={() => quest.id && onHardDelete?.(quest.id)} className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90" title="Delete Permanently">🗑️</button>
          </>
        ) : (
          <>
            {quest.isBreak ? (
              <button onClick={() => quest.id && onTakeBreak?.(quest.id)} disabled={quest.energyPercent! < 100} className={`grow flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${quest.energyPercent! >= 100 ? 'bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'} ${barBorder}`}>
                {quest.energyPercent! >= 100 ? '☕ Take Break' : '⏳ Cooling Down'}
              </button>
            ) : (
              <button onClick={() => !isPending && quest.id && onToggleComplete(quest.id)} disabled={isPending} className={`grow flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${btnClass} ${tierColors} hover:scale-102 active:scale-95`}>
                {btnText}
              </button>
            )}

            <div className="flex gap-1 shrink-0 ml-2">
              <button onClick={() => quest.id && onEdit(quest.id)} className={`p-3 rounded-xl bg-gray-50 text-muted hover:text-orange-500 hover:bg-orange-50 transition-all hover:scale-105 active:scale-95 ${tierColors}`}>✏️</button>
              <button onClick={() => quest.id && onDelete(quest.id)} className={`p-3 rounded-xl bg-gray-50 text-muted hover:text-red-500 hover:bg-red-50 transition-all hover:scale-105 active:scale-95 ${tierColors}`}>🗑️</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}