// src/components/DailySummaryModal.tsx
import { useState, useEffect } from 'react';
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

  // --- THE SMART FREEZER ---
  const [frozenRewards, setFrozenRewards] = useState<PendingRewards | null>(null);

  useEffect(() => {
    // Keep taking snapshots as long as the user hasn't claimed yet today.
    if (!rewards.hasClaimedToday) {
      setFrozenRewards(rewards);
    }
  }, [rewards]);

  // Use the frozen snapshot if it exists, otherwise fall back to the live props
  const displayRewards = frozenRewards || rewards;

  // --- THE ZERO-REWARD CHECKER ---
  const hasClaimableRewards = 
    displayRewards.tp > 0 || 
    displayRewards.gems > 0 || 
    (displayRewards.medals?.bronze || 0) > 0 ||
    (displayRewards.medals?.silver || 0) > 0 ||
    (displayRewards.medals?.gold || 0) > 0;

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

    // Wait for the flyers to finish before updating Firebase
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
                      
                      {/* Display both the TP and the Gem */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-green-600">+1 💎</span>
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                          +{quest.lastDepositMs} ⏳
                        </span>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* EXPIRED CARDS */}
            {expiredQuests.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                  <span>⚠️</span> Fallen Cards
                </h3>
                <p className="text-xs text-muted mb-4">These one-time cards expired. You can revive them for 10 TP each to try again today.</p>

                <div className="space-y-3">
                  {expiredQuests.map(quest => (
                    <div key={quest.id} className="flex flex-col gap-3 bg-red-50 px-4 py-4 rounded-2xl border border-red-100">
                      <div className="font-semibold text-red-900 text-sm">{quest.name}</div>

                      {/* Smart disabled state for the button */}
                      <button
                        onClick={() => onRevive(quest.id!)}
                        disabled={timePoints < 10}
                        className={`w-full py-2 border rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition-all ${timePoints >= 10
                          ? 'bg-white border-red-200 text-red-600 hover:bg-red-600 hover:text-white cursor-pointer'
                          : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                          }`}
                      >
                        <span>{timePoints >= 10 ? 'Revive Card' : 'Not Enough TP'}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs ${timePoints >= 10 ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'}`}>
                          ⏳ 10
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
            {(gemsGained > 0 || displayRewards.tp > 0 || hasClaimableRewards) && (
              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <h3 className="text-orange-700 font-bold text-sm tracking-wider text-center">Rewards earned from yesterday's efforts:</h3>
                </div>
                
                <div className="flex flex-wrap justify-center gap-3 bg-white px-4 py-3 rounded-lg shadow-sm border border-orange-100">
                  {gemsGained > 0 && <span className="font-black text-orange-500">💎 +{gemsGained}</span>}
                  {displayRewards.tp > 0 && <span className="font-black text-blue-600">⏳ +{displayRewards.tp}</span>}
                  
                  {/* MEDAL BREAKDOWN */}
                  {displayRewards.medals?.bronze > 0 && <span className="font-black text-amber-700">🥉 +{displayRewards.medals.bronze}</span>}
                  {displayRewards.medals?.silver > 0 && <span className="font-black text-slate-400">🥈 +{displayRewards.medals.silver}</span>}
                  {displayRewards.medals?.gold > 0 && <span className="font-black text-yellow-500">🥇 +{displayRewards.medals.gold}</span>}
                </div>
              </div>
            )}
            
            {/* Show "Continue" if they already claimed OR if there are 0 rewards across the board */}
            {rewards.hasClaimedToday || !hasClaimableRewards ? (
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
                {isAnimating ? 'Banking Rewards...' : "Claim Rewards"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}