// src/components/ShopTab.tsx
import type { ChestTier, GachaResult } from '../hooks/useChestGacha';
import { motion } from 'framer-motion';

interface ShopTabProps {
  keys: { bronze: number; silver: number; gold: number };
  openChest: (tier: ChestTier, amount: number) => void;
  openingTier: ChestTier | null;
  recentResults: GachaResult[] | null;
  onCloseResults: () => void;
}

export function ShopTab({ keys, openChest, openingTier, recentResults, onCloseResults }: ShopTabProps) {
  
  const chests: { id: ChestTier; name: string; color: string; icon: string; desc: string }[] = [
    { id: 'bronze', name: 'Bronze Chest', color: 'from-orange-400 to-red-500', icon: '🥉', desc: 'A modest reward for completing late tasks.' },
    { id: 'silver', name: 'Silver Chest', color: 'from-gray-300 to-gray-500', icon: '🥈', desc: 'Standard rewards. Has a chance for rare loot.' },
    { id: 'gold', name: 'Gold Chest', color: 'from-yellow-300 to-yellow-500', icon: '🥇', desc: 'High tier rewards for proactive energy!' }
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in relative">
      
      {/* Key Inventory Header */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex justify-around items-center">
        <div className="text-center"><div className="text-2xl">{keys.bronze}</div><div className="text-xs font-bold text-orange-700 uppercase">Bronze</div></div>
        <div className="text-center border-l border-r border-gray-100 px-8"><div className="text-2xl">{keys.silver}</div><div className="text-xs font-bold text-gray-500 uppercase">Silver</div></div>
        <div className="text-center"><div className="text-2xl">{keys.gold}</div><div className="text-xs font-bold text-yellow-600 uppercase">Gold</div></div>
      </div>

      {/* The Chests */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {chests.map(chest => (
          <div key={chest.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-md flex flex-col items-center text-center">
            {/* Framer Motion Suspense Shake */}
            <motion.div 
              animate={openingTier === chest.id ? { 
                rotate: [-5, 5, -5, 5, -5, 5, 0], 
                scale: [1, 1.1, 1.1, 1.2, 1.2, 1.1, 1] 
              } : {}}
              transition={{ duration: 0.4, repeat: openingTier === chest.id ? Infinity : 0 }}
              className={`w-24 h-24 rounded-full bg-linear-to-br ${chest.color} flex items-center justify-center text-5xl shadow-inner mb-4`}
            >
              {chest.icon}
            </motion.div>

            <h3 className="font-bold text-xl text-dark">{chest.name}</h3>
            <p className="text-xs text-muted mt-2 mb-6 h-8">{chest.desc}</p>
            
            <div className="flex gap-2 w-full mt-auto">
              <button 
                onClick={() => openChest(chest.id, 1)}
                disabled={openingTier !== null || keys[chest.id] < 1}
                className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 border border-gray-200 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                Open 1
              </button>
              <button 
                onClick={() => openChest(chest.id, 10)}
                disabled={openingTier !== null || keys[chest.id] < 10}
                className={`flex-1 py-3 text-white disabled:opacity-50 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer bg-linear-to-r ${chest.color}`}
              >
                Open 10
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* The Results Modal */}
      {recentResults && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={onCloseResults}></div>
          <div className="relative bg-white w-full max-w-lg rounded-4xl shadow-2xl p-6 animate-fade-in flex flex-col max-h-[80vh]">
            <h2 className="text-2xl font-black text-center mb-6">Loot Acquired!</h2>
            
            <div className="overflow-y-auto custom-scrollbar flex-1 grid grid-cols-2 gap-3 pb-4">
              {recentResults.map((res, i) => (
                <div key={i} className={`p-4 rounded-2xl border text-center flex flex-col justify-center items-center ${
                  res.rarity === 'legendary' ? 'bg-yellow-50 border-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.5)]' :
                  res.rarity === 'rare' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 opacity-50">{res.rarity}</div>
                  <div className="flex gap-3 justify-center items-center">
                    {res.gems > 0 && <span className="font-black text-green-600 text-lg">+{res.gems} 💎</span>}
                    {res.tp > 0 && <span className="font-black text-blue-600 text-lg">+{res.tp} ⏳</span>}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={onCloseResults} className="w-full mt-4 py-4 bg-dark text-white rounded-2xl font-bold cursor-pointer active:scale-95">
              Collect to Vault
            </button>
          </div>
        </div>
      )}
    </div>
  );
}