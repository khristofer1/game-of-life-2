// src/components/DailySummaryModal.tsx
import { useState } from 'react';
import type { Quest } from '../types/quest';
import type { PendingRewards } from '../types/pendingRewards';
import { RewardFlyer } from './RewardFlyer';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedYesterday: Quest[];
  expiredQuests: Quest[];
  gems: number;
  gemsGained: number;
  timePoints: number;
  onRevive: (taskId: number) => void;
  rewards: PendingRewards;
  onClaim: () => void;
}

export function DailySummaryModal({
  isOpen, onClose, completedYesterday, expiredQuests,
  gems, gemsGained, timePoints, onRevive, rewards, onClaim
}: DailySummaryModalProps) {

  // State for animations
  const [activeFlyers, setActiveFlyers] = useState<{id: number, type: 'tp'|'gem', x: number, y: number}[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleInternalClaim = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const newFlyers: any[] = [];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Create a burst of 8 icons with random scatter coordinates
    for (let i = 0; i < 8; i++) {
      newFlyers.push({ 
        id: Math.random(), 
        type: i % 2 === 0 ? 'tp' : 'gem',
        x: centerX + (Math.random() * 160 - 80),
        y: centerY + (Math.random() * 160 - 80)
      });
    }
    
    setActiveFlyers(newFlyers);

    // Wait for the flyers to finish before updating Firebase (1300ms is slightly longer than the 1.2s animation)
    setTimeout(() => {
      onClaim();
      setIsAnimating(false);
    }, 1300);
  };

  const removeFlyer = (id: number) => {
    setActiveFlyers(prev => prev.filter(f => f.id !== id));
  };
  
  if (!isOpen) return null;

  return (
    <>
      {/* RENDER FLYERS OUTSIDE THE MODAL TREE */}
      {activeFlyers.map(f => (
        <RewardFlyer key={f.id} id={f.id} type={f.type} startX={f.x} startY={f.y} onComplete={removeFlyer} />
      ))}

      <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
        <div className="relative w-full max-w-md bg-white rounded-4xl shadow-2xl modal-enter overflow-hidden flex flex-col max-h-[85vh]">

          <div className="bg-dark px-8 py-6 text-center shrink-0">
            <h2 className="text-2xl font-bold text-white mb-2">Daily Summary</h2>
            {/* Show their current balances here */}
            <p className="text-gray-300 text-sm">
              Here is how you did yesterday.<br></br>
              <span className="font-bold text-orange-400">
                <span className='mr-3'>💎 {gems}</span>
                <span>⏳ {timePoints}</span>
              </span>
            </p>
          </div>

          <div className="px-8 py-6 overflow-y-auto custom-scrollbar space-y-8">

            {/* YESTERDAY'S WINS */}
            <div>
              <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                <span>🏆</span> Triumphs
              </h3>
              {completedYesterday.length === 0 ? (
                <p className="text-sm text-muted italic bg-gray-50 p-4 rounded-2xl">No cards completed yesterday. Today is a fresh start!</p>
              ) : (
                <div className="space-y-2">
                  {completedYesterday.map(quest => (
                    <div key={quest.id} className="flex items-center justify-between bg-green-50 px-4 py-3 rounded-2xl border border-green-100">
                      <span className="font-semibold text-green-900 text-sm truncate pr-4">{quest.name}</span>
                      <span className="shrink-0 text-sm font-bold text-green-600">+1 💎</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Loot Drop Display */}
            {gemsGained > 0 && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between shadow-inner">
                <div>
                  <h3 className="text-orange-800 font-bold text-sm uppercase tracking-wider">Gems Earned</h3>
                  <p className="text-orange-600 text-xs mt-1">From yesterday's efforts</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-orange-100">
                  <span className="font-black text-orange-500">💎+{gemsGained}</span>
                </div>
              </div>
            )}

            {/* EXPIRED CARDS */}
            {expiredQuests.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                  <span>⚠️</span> Fallen Cards
                </h3>
                <p className="text-xs text-muted mb-4">These one-time cards expired. You can revive them for 1 Gem each to try again today.</p>

                <div className="space-y-3">
                  {expiredQuests.map(quest => (
                    <div key={quest.id} className="flex flex-col gap-3 bg-red-50 px-4 py-4 rounded-2xl border border-red-100">
                      <div className="font-semibold text-red-900 text-sm">{quest.name}</div>

                      {/* Smart disabled state for the button */}
                      <button
                        onClick={() => onRevive(quest.id!)}
                        disabled={gems < 1}
                        className={`w-full py-2 border rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition-all ${gems >= 1
                          ? 'bg-white border-red-200 text-red-600 hover:bg-red-600 hover:text-white cursor-pointer'
                          : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                          }`}
                      >
                        <span>{gems >= 1 ? 'Revive Card' : 'Not Enough Gems'}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs ${gems >= 1 ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'}`}>
                          💎 1
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="bg-gray-50 px-8 py-4 shrink-0 border-t border-gray-100">
            {rewards.hasClaimedToday ? (
              <button 
                onClick={onClose} 
                className="w-full bg-dark text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-colors shadow-lg cursor-pointer active:scale-95"
              >
                Continue to Dashboard
              </button>
            ) : (
              <button 
                onClick={handleInternalClaim}
                disabled={isAnimating}
                className={`w-full py-3 rounded-2xl font-bold text-white shadow-xl transition-all cursor-pointer ${
                  isAnimating ? 'bg-gray-400 scale-95' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 animate-pulse'
                }`}
              >
                {isAnimating ? 'Banking Rewards...' : `Claim Rewards (+${rewards.tp} ⏳, +${rewards.gems} 💎)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}