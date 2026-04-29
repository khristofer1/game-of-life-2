// src/components/TierModal.tsx
import type { Quest } from '../types/quest';
import { GAME_CONFIG } from '../config/gameRules';
import { calculateShieldCapacity, calculateShieldCost } from '../utils/questCalculations';

interface TierModalProps {
  isOpen: boolean;
  onClose: () => void;
  quest: Quest | null;
  onBuyShield: (id: number, cost: number) => void;
}

export function TierModal({ isOpen, onClose, quest, onBuyShield }: TierModalProps) {
  if (!isOpen || !quest) return null;

  const streak = quest.streak || 0;
  const sp = quest.streakPoints || 0;

  // --- TIER PROGRESSION LOGIC (Powered by SP) ---
  const getTierProgress = (currentSP: number) => {
    if (currentSP < GAME_CONFIG.tiers.bronze) return { next: GAME_CONFIG.tiers.bronze, targetTier: 'Bronze 🥉', min: GAME_CONFIG.tiers.standard };
    if (currentSP < GAME_CONFIG.tiers.silver) return { next: GAME_CONFIG.tiers.silver, targetTier: 'Silver 🥈', min: GAME_CONFIG.tiers.bronze };
    if (currentSP < GAME_CONFIG.tiers.gold) return { next: GAME_CONFIG.tiers.gold, targetTier: 'Gold 🥇', min: GAME_CONFIG.tiers.silver };
    if (currentSP < GAME_CONFIG.tiers.diamond) return { next: GAME_CONFIG.tiers.diamond, targetTier: 'Diamond 💎', min: GAME_CONFIG.tiers.gold };
    return { next: currentSP, targetTier: 'Max Level 🌟', min: GAME_CONFIG.tiers.diamond };
  };

  const { next, targetTier, min } = getTierProgress(sp);
  let progressPercent = 100;
  if (next !== sp) {
    const range = next - min;
    const progressIntoRange = sp - min;
    progressPercent = Math.max(0, Math.min(100, Math.round((progressIntoRange / range) * 100)));
  }

  // --- SHIELD & COMPLETION LOGIC ---
  const isRecurring = !quest.isOneTime && !quest.isBreak;
  const daysInCycle = Math.max(1, Math.round((quest.activeDeadlineMs || 86400000) / 86400000));
  const isDaily = daysInCycle === 1;
  
  // Calculate how many more completions are needed based on the quest's frequency
  const completionsLeft = sp < next ? Math.ceil((next - sp) / daysInCycle) : 0;

  const maxShields = calculateShieldCapacity(quest.tier, daysInCycle);
  const currentShields = quest.shields || 0;
  const shieldCost = calculateShieldCost(daysInCycle, quest.tier);

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

          {/* Main Hero Display (Purely Streak) */}
          <div className="flex flex-col items-center justify-center text-center mt-2">
            <span className="text-6xl mb-2 drop-shadow-md">🔥</span>
            <div className="text-5xl font-black text-orange-500">{streak}</div>
            <div className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Total Streak</div>
          </div>

          {/* Progression Card */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col gap-3 mb-3">
            {/* Header: Next Tier & SP Counter */}
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Next: {targetTier}</span>
              <span className="text-sm font-bold text-blue-600 flex items-center gap-1">
                ⭐ {sp} <span className="text-dark font-medium">/ {next} SP</span>
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div className="bg-blue-400 h-3 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
            </div>
            
            {/* Footer: Completions Left */}
            {sp < next && (
              <div className="flex flex-col items-center gap-3 mt-1">
                <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-dark shadow-sm">
                  🎯 {completionsLeft} more {completionsLeft === 1 ? 'completion' : 'completions'} to level up!
                </span>
              </div>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-gray-400 text-center px-2 mb-3">
            <strong className="text-gray-500">How it works:</strong> Streak Points (SP) track your total dedication. Quests with longer durations earn points faster per completion!
          </p>

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
                        title={!isDaily && quest.tier !== 'standard' ? `Buy Shield (-${shieldCost} 💎) [Tier Discount Applied!]` : `Buy Shield (-${shieldCost} 💎)`}
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