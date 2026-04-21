// src/components/GemShopModal.tsx

interface GemShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  gems: number;
  timeDepositMs: number;
  onBuyGemWithTime: () => void;
  onBuyTimeWithGem: () => void;
}

export function GemShopModal({ isOpen, onClose, gems, timeDepositMs, onBuyGemWithTime, onBuyTimeWithGem }: GemShopModalProps) {
  if (!isOpen) return null;

  // Economy Math
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const canAffordGem = timeDepositMs >= oneWeekMs;
  const canAffordTime = gems >= 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative w-full max-w-sm bg-white rounded-4xl shadow-2xl animate-fade-in overflow-hidden flex flex-col border border-orange-100">
        
        {/* HEADER */}
        <div className="bg-linear-to-br from-orange-400 to-orange-600 px-8 py-6 text-center shrink-0 shadow-inner">
          <div className="text-4xl mb-2 drop-shadow-md">💎</div>
          <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Exchange Market</h2>
          <p className="text-orange-100 text-sm font-medium">Trade resources to survive.</p>
        </div>

        {/* CONTENT */}
        <div className="px-6 py-6 flex flex-col gap-4 bg-orange-50/50">
          
          {/* Option 1: Buy Gem */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-dark">Mint a Gem</span>
              <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md">Cost: 1 Week</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Convert 7 days of stored time into 1 Premium Gem. Use Gems to buy shields for your quests.
            </p>
            <button
              onClick={onBuyGemWithTime}
              disabled={!canAffordGem}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 ${
                canAffordGem 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md cursor-pointer active:scale-95' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Trade 7 Days ➔ 💎 +1
            </button>
          </div>

          {/* Option 2: Buy Time (The 6-Day Spread) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-dark">Buy Time</span>
              <span className="text-xs font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded-md">Cost: 1 Gem</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Shatter 1 Premium Gem to instantly add 6 days to your Time Vault. Careful, the exchange rate is heavily taxed!
            </p>
            <button
              onClick={onBuyTimeWithGem}
              disabled={!canAffordTime}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 ${
                canAffordTime 
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md cursor-pointer active:scale-95' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Trade 1 Gem ➔ ⏳ +6 Days
            </button>
          </div>

        </div>

        {/* FOOTER */}
        <div className="bg-white px-6 py-4 shrink-0 border-t border-gray-100">
          <button 
            onClick={onClose} 
            className="w-full bg-gray-100 text-dark px-6 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-colors cursor-pointer active:scale-95"
          >
            Leave Market
          </button>
        </div>

      </div>
    </div>
  );
}