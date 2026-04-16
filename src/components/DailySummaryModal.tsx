// src/components/DailySummaryModal.tsx
import type { Quest } from '../types/quest';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedYesterday: Quest[];
  expiredQuests: Quest[];
  gems: number;
  onRevive: (taskId: number) => void;
}

export function DailySummaryModal({ isOpen, onClose, completedYesterday, expiredQuests, gems, onRevive }: DailySummaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white rounded-4xl shadow-2xl modal-enter overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="bg-dark px-8 py-6 text-center shrink-0">
          <h2 className="text-2xl font-bold text-white mb-2">Daily Summary</h2>
          <p className="text-gray-300 text-sm">Here is how you did yesterday.</p>
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
                    <button 
                      onClick={() => onRevive(quest.id!)}
                      className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-600 hover:text-white transition-colors flex justify-center items-center gap-2 shadow-sm"
                    >
                      <span>Revive Card</span>
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-xs">💎 1</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 px-8 py-4 shrink-0 border-t border-gray-100">
          <button onClick={onClose} className="w-full bg-dark text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-colors shadow-lg">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}