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

export function QuestCard({ quest, onToggleComplete, onEdit, onDelete, onRestore, onHardDelete, onTakeBreak, onBuyShield }: QuestCardProps) {
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

  // --- SHIELD & TIER CALCULATIONS ---
  const isRecurring = !quest.isOneTime && !quest.isBreak;
  const daysInCycle = Math.max(1, Math.round((quest.activeDeadlineMs || 86400000) / 86400000));
  const isLongCycle = daysInCycle >= 6;
  
  let maxShields = 1;
  let tierDivisor = 1;
  let tierColors = 'ring-1 ring-gray-100'; // Standard style
  
  switch (quest.tier) {
    case 'bronze': maxShields = 2; tierDivisor = 2; tierColors = 'ring-2 ring-[#cd7f32] bg-[#cd7f32]/5'; break;
    case 'silver': maxShields = 3; tierDivisor = 3; tierColors = 'ring-2 ring-gray-400 bg-gray-400/5'; break;
    case 'gold': maxShields = 4; tierDivisor = 4; tierColors = 'ring-2 ring-yellow-400 bg-yellow-400/10'; break;
    case 'diamond': maxShields = 5; tierDivisor = 5; tierColors = 'ring-2 ring-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.3)]'; break;
  }
  
  if (isLongCycle) maxShields = 1; // Long cycles are always capped at 1 slot
  
  const currentShields = quest.shields || 0;
  const shieldCost = isLongCycle ? Math.ceil((5 * daysInCycle) / tierDivisor) : 5;
  // --- END SHIELD CALCULATIONS ---

  let barColor;
  if (quest.completed || isPending) barColor = 'bg-gray-300';
  else if (percent > 50) barColor = 'bg-green-500';
  else if (percent > 25) barColor = 'bg-yellow-500';
  else barColor = 'bg-red-500';

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
        ${quest.completed ? 'ring-2 ring-orange-400 bg-white/40 ring-inset' : tierColors} 
        ${isPending ? 'opacity-75 grayscale-[0.2]' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-3 gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-dark leading-tight line-clamp-1">{quest.name}</h3>
          {quest.desc && <p className="text-xs text-muted mt-1 line-clamp-2 whitespace-pre-wrap">{formatDescriptionWithLinks(quest.desc)}</p>}
        </div>

        {/* --- THE SHIELD SOCKETS UI --- */}
        {isRecurring && (
          <div className="flex gap-1 shrink-0">
            {[...Array(maxShields)].map((_, i) => {
              const isFilled = i < currentShields;
              return (
                <button
                  key={i}
                  disabled={isFilled || isPending}
                  onClick={() => !isFilled && quest.id && onBuyShield && onBuyShield(quest.id, shieldCost)}
                  title={isFilled ? "Shield Active" : `Buy Shield (${shieldCost} Gems)`}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all text-xs border ${
                    isFilled 
                      ? 'bg-blue-50 text-blue-500 border-blue-200 shadow-sm' 
                      : 'bg-gray-50 text-gray-300 border-gray-200 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200 cursor-pointer'
                  } ${(isPending || quest.completed) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isFilled ? '🛡️' : '+'}
                </button>
              );
            })}
          </div>
        )}
        {/* --- END SHIELD SOCKETS UI --- */}

      </div>

      <div className="mt-auto pt-2 mb-5">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
            {quest.displayFreq}
            {/* Show Hidden XP next to the frequency! */}
            {isRecurring && <span className="text-[10px] text-orange-400 normal-case bg-orange-50 px-1.5 rounded-sm">Lv.{quest.accumulatedDays || 0}</span>}
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
          <>
            <button onClick={() => quest.id && onRestore?.(quest.id)} className="grow flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">Restore</button>
            <button onClick={() => quest.id && onHardDelete?.(quest.id)} className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90" title="Delete Permanently">🗑️</button>
          </>
        ) : (
          <>
            {quest.isBreak ? (
              <button onClick={() => quest.id && onTakeBreak?.(quest.id)} disabled={quest.energyPercent! < 100} className={`grow flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${quest.energyPercent! >= 100 ? 'bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}>
                {quest.energyPercent! >= 100 ? '☕ Take Break' : '⏳ Cooling Down'}
              </button>
            ) : (
              <button onClick={() => !isPending && quest.id && onToggleComplete(quest.id)} disabled={isPending} className={`grow flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${btnClass}`}>
                {btnText}
              </button>
            )}

            <div className="flex gap-1 shrink-0 ml-2">
              <button onClick={() => quest.id && onEdit(quest.id)} className="p-3 rounded-xl bg-gray-50 text-muted hover:text-orange-500 hover:bg-orange-50 transition-all active:scale-90">✏️</button>
              <button onClick={() => quest.id && onDelete(quest.id)} className="p-3 rounded-xl bg-gray-50 text-muted hover:text-red-500 hover:bg-red-50 transition-all active:scale-90">🗑️</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}