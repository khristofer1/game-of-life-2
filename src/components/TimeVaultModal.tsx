// src/components/TimeVaultModal.tsx

interface TimeVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  timePoints: number;
  formatFullTime: (ms: number) => string;
}

export function TimeVaultModal({ isOpen, onClose, timePoints }: TimeVaultModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative w-full max-w-sm bg-white rounded-4xl shadow-2xl animate-fade-in overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-blue-600 px-8 py-6 text-center shrink-0">
          <div className="text-4xl mb-2">⏳</div>
          <h2 className="text-2xl font-bold text-white mb-1">Time Vault</h2>
          <p className="text-blue-100 text-sm font-medium">Your stored Time Points.</p>
        </div>

        {/* CONTENT */}
        <div className="px-8 py-8 flex flex-col items-center justify-center bg-blue-50">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Balance</p>
          
          <div className="bg-white px-6 py-4 rounded-2xl shadow-inner border border-blue-100 w-full text-center">
            {/* Display the integer TP directly! */}
            <span className="text-3xl font-black text-blue-600 tracking-tight">
              {timePoints} TP
            </span>
          </div>
          
          <p className="text-xs text-blue-400 mt-6 text-center max-w-60 leading-relaxed">
            1 Hour saved = 1 TP. Max 10 TP per quest. Spend this balance to take guilt-free Break Activities!
          </p>
        </div>

        {/* FOOTER */}
        <div className="bg-white px-8 py-4 shrink-0 border-t border-gray-100">
          <button 
            onClick={onClose} 
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-md cursor-pointer active:scale-95"
          >
            Close Vault
          </button>
        </div>

      </div>
    </div>
  );
}