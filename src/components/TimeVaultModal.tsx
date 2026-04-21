// src/components/TimeVaultModal.tsx

interface TimeVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeDepositMs: number;
  formatFullTime: (ms: number) => string;
  onBuyGemWithTime: () => void; // <-- NEW PROP
}

export function TimeVaultModal({ isOpen, onClose, timeDepositMs, formatFullTime, onBuyGemWithTime }: TimeVaultModalProps) {
  if (!isOpen) return null;

  // Calculate if they can afford the gem (1 Week = 604,800,000 ms)
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const canAffordGem = timeDepositMs >= oneWeekMs;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative w-full max-w-sm bg-white rounded-4xl shadow-2xl animate-fade-in overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-blue-600 px-8 py-6 text-center shrink-0">
          <div className="text-4xl mb-2">⏳</div>
          <h2 className="text-2xl font-bold text-white mb-1">Time Vault</h2>
          <p className="text-blue-100 text-sm font-medium">Your stored potential.</p>
        </div>

        {/* CONTENT */}
        <div className="px-8 py-8 flex flex-col items-center justify-center bg-blue-50">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Time Saved</p>
          
          <div className="bg-white px-6 py-4 rounded-2xl shadow-inner border border-blue-100 w-full text-center">
            <span className="text-3xl font-black text-blue-600 tracking-tight">
              {formatFullTime(timeDepositMs)}
            </span>
          </div>
          
          <p className="text-xs text-blue-400 mt-4 text-center max-w-50 leading-relaxed">
            Time earned by finishing quests early. Spend this balance to take guilt-free Break Activities!
          </p>

          {/* --- NEW: THE TIME EXCHANGE SHOP --- */}
          <div className="mt-6 w-full bg-orange-50 border border-orange-100 rounded-2xl p-4 flex flex-col items-center shadow-sm">
            <p className="text-orange-600 text-[10px] font-bold uppercase tracking-wider mb-1">Exchange Market</p>
            <p className="text-xs text-orange-800 text-center mb-3">
              Need more shields? Trade your spare time for premium currency.
            </p>
            <button
              onClick={onBuyGemWithTime}
              disabled={!canAffordGem}
              className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                canAffordGem 
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md cursor-pointer active:scale-95' 
                  : 'bg-orange-200 text-orange-50 cursor-not-allowed opacity-70'
              }`}
            >
              <span>Trade 1 Week ➔ 💎 1 Gem</span>
            </button>
          </div>
          {/* --- END EXCHANGE SHOP --- */}

        </div>

        {/* FOOTER */}
        <div className="bg-white px-8 py-4 shrink-0 border-t border-gray-100">
          <button 
            onClick={onClose} 
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-md cursor-pointer"
          >
            Close Vault
          </button>
        </div>

      </div>
    </div>
  );
}