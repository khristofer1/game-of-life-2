import { GAME_CONFIG } from "../config/gameConstants";

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  gems: number;
  freezes: number;
  onBuyFreeze: () => void;
}

export function ShopModal({ isOpen, onClose, gems, freezes, onBuyFreeze }: ShopModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-white rounded-4xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
        <div className="px-8 pt-8 pb-6">
          <h2 className="text-2xl font-bold text-dark mb-2">Rewards Stash</h2>
          <p className="text-muted text-sm mb-6">Spend your hard-earned gems to protect your progress.</p>
          
          {/* CURRENCY DISPLAY */}
          <div className="flex gap-4 mb-8">
            <div className="flex-1 bg-orange-50 rounded-3xl p-4 text-center border border-orange-100 shadow-sm">
              <div className="text-3xl mb-1 drop-shadow-sm">💎</div>
              <div className="font-bold text-orange-600 text-2xl">{gems}</div>
              <div className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Gems</div>
            </div>
            <div className="flex-1 bg-blue-50 rounded-3xl p-4 text-center border border-blue-100 shadow-sm">
              <div className="text-3xl mb-1 drop-shadow-sm">❄️</div>
              <div className="font-bold text-blue-600 text-2xl">{freezes}</div>
              <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Freezes</div>
            </div>
          </div>

          {/* SHOP ITEMS */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-3xl border border-gray-100 transition-all hover:border-blue-200 hover:bg-blue-50/50">
              <div className="flex items-center gap-4">
                <div className="text-4xl drop-shadow-md">❄️</div>
                <div>
                  <div className="font-bold text-dark text-lg leading-tight">Streak Freeze</div>
                  <div className="text-xs text-muted mt-1">Protects your 🔥 from resetting if you miss a day.</div>
                </div>
              </div>
              
              <button 
                onClick={onBuyFreeze}
                disabled={gems < GAME_CONFIG.REWARDS.FREEZE_COST}
                className={`shrink-0 w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
                  gems >= GAME_CONFIG.REWARDS.FREEZE_COST 
                    ? 'bg-dark text-white hover:bg-blue-500 shadow-lg hover:shadow-blue-500/25' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {GAME_CONFIG.REWARDS.FREEZE_COST} 💎
              </button>
            </div>
          </div>
        </div>
        
        {/* FOOTER */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
          <button 
            onClick={onClose} 
            className="w-full px-6 py-4 rounded-2xl font-bold text-muted hover:bg-gray-200 hover:text-dark transition-colors"
          >
            Close Stash
          </button>
        </div>
      </div>
    </div>
  );
}