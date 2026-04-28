// src/components/TierModal.tsx
import type { Quest } from '../types/quest';

interface TierModalProps {
  isOpen: boolean;
  onClose: () => void;
  quest: Quest | null;
  onBuyShield: (id: number, cost: number) => void;
}

export function TierModal({ isOpen, onClose, quest, onBuyShield }: TierModalProps) {
  if (!isOpen || !quest) return null;

  const streak = quest.streak || 0;

  // --- TIER PROGRESSION LOGIC ---
  const getTierProgress = (currentStreak: number) => {
    if (currentStreak < 7) return { next: 7, targetTier: 'Bronze 🥉', min: 0 };
    if (currentStreak < 30) return { next: 30, targetTier: 'Silver 🥈', min: 7 };
    if (currentStreak < 120) return { next: 120, targetTier: 'Gold 🥇', min: 30 };
    if (currentStreak < 365) return { next: 365, targetTier: 'Diamond 💎', min: 120 };
    return { next: currentStreak, targetTier: 'Max Level 🌟', min: 365 };
  };

  const { next, targetTier, min } = getTierProgress(streak);
  let progressPercent = 100;
  if (next !== streak) {
    const range = next - min;
    const progressIntoRange = streak - min;
    progressPercent = Math.max(0, Math.min(100, Math.round((progressIntoRange / range) * 100)));
  }

  // --- SHIELD LOGIC ---
  const isRecurring = !quest.isOneTime && !quest.isBreak;
  const daysInCycle = Math.max(1, Math.round((quest.activeDeadlineMs || 86400000) / 86400000));
  const isDaily = daysInCycle === 1; // Exactly 24 hours

  // RULE: Non-daily quests are strictly capped at 1 shield.
  // Daily quests grow capacity based on their tier.
  let maxShields = 1;
  let discountMultiplier = 1.0;

  switch (quest.tier) {
    case 'bronze':
      if (isDaily) maxShields = 2; else discountMultiplier = 0.8;
      break;
    case 'silver':
      if (isDaily) maxShields = 3; else discountMultiplier = 0.6;
      break;
    case 'gold':
      if (isDaily) maxShields = 4; else discountMultiplier = 0.4;
      break;
    case 'diamond':
      if (isDaily) maxShields = 5; else discountMultiplier = 0.2;
      break;
  }

  const currentShields = quest.shields || 0;

  // Formula: (Base Cost * Frequency) * Tier Discount
  const baseCost = 5 * daysInCycle;
  const shieldCost = Math.ceil(baseCost * discountMultiplier);

  const handleBuyShieldClick = () => {
    if (quest.id && window.confirm(`Are you sure you want to buy a shield for ${shieldCost} 💎?`)) {
      onBuyShield(quest.id, shieldCost);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-dark">{quest.name}</h2>
            <p className="text-sm font-bold text-muted uppercase tracking-wide mt-1">
              Current Tier: {quest.tier || 'Standard'}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-8">

          {/* Main Streak Display */}
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-6xl mb-2 drop-shadow-md">🔥</span>
            <div className="text-5xl font-black text-orange-500">{streak}</div>
            <div className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Total Streak</div>
          </div>

          {/* Progression Bar */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-muted">Next: {targetTier}</span>
              <span className="text-sm font-bold text-dark">{streak} / {next}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="bg-orange-400 h-3 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
            </div>
            {streak < next && (
              <p className="text-xs text-center text-muted mt-3 font-medium">
                {next - streak} more completions to reach {targetTier}!
              </p>
            )}
          </div>

          {/* Shields Section */}
          {isRecurring && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-bold text-dark mb-4 text-center">Shield Protection</h3>

              <div className="flex justify-center gap-3 mb-6">
                {[...Array(maxShields)].map((_, i) => {
                  const isFilled = i < currentShields;

                  if (isFilled) {
                    return (
                      <div key={i} className="w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 bg-blue-50 border-blue-200 shadow-sm" title="Shield Active">
                        🛡️
                      </div>
                    );
                  } else {
                    return (
                      <button
                        key={i}
                        onClick={handleBuyShieldClick}
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 bg-gray-50 border-gray-200 border-dashed text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all active:scale-95"
                        title={!isDaily && discountMultiplier < 1 ? `Buy Shield (-${shieldCost} 💎) [Tier Discount Applied!]` : `Buy Shield (-${shieldCost} 💎)`}
                      >
                        +
                      </button>
                    );
                  }
                })}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-gray-100 text-dark hover:bg-gray-200 active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}