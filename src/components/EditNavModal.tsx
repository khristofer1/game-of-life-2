// src/components/EditNavModal.tsx
import { useState } from 'react';
import type { TabType } from './layout/BottomNav';

interface EditNavModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: TabType[];
  onSave: (newLayout: TabType[]) => void;
}

const AVAILABLE_TABS: { id: TabType, label: string, emoji: string }[] = [
  { id: 'coming', label: 'Coming', emoji: '⏳' },
  { id: 'completed', label: 'Completed', emoji: '✅' },
  { id: 'shop', label: 'Shop', emoji: '🏪' },
  { id: 'break', label: 'Break', emoji: '☕' },
  { id: 'archived', label: 'Archived', emoji: '🏛️' },
  { id: 'deleted', label: 'Deleted', emoji: '🗑️' }
];

export function EditNavModal({ isOpen, onClose, currentLayout, onSave }: EditNavModalProps) {
  // Use a dynamic array to hold the layout
  const [slots, setSlots] = useState<TabType[]>(currentLayout);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(slots);
    onClose();
  };

  // --- DYNAMIC SWAP LOGIC ---
  const handleSlotChange = (indexToChange: number, newValue: TabType) => {
    const newSlots = [...slots];
    const existingIndex = newSlots.indexOf(newValue);
    
    // If the tab they selected is already in another slot, swap them!
    if (existingIndex !== -1) {
        newSlots[existingIndex] = newSlots[indexToChange];
    }
    
    newSlots[indexToChange] = newValue;
    setSlots(newSlots);
  };

  // --- THE "JUMP TO 7" LOGIC ---
  const handleAddSlot = () => {
    // Find all available tabs that aren't currently assigned to a slot
    const unassignedTabs = AVAILABLE_TABS.map(t => t.id).filter(id => !slots.includes(id));
    
    if (unassignedTabs.length > 0 && slots.length < 7) {
      // If we are at 5 slots and trying to add a 6th, we jump straight to 7
      // by injecting both of the remaining unassigned tabs at once!
      if (slots.length === 5 && unassignedTabs.length >= 2) {
        setSlots([...slots, unassignedTabs[0], unassignedTabs[1]]);
      } else {
        setSlots([...slots, unassignedTabs[0]]);
      }
    }
  };

  // --- THE "DROP TO 5" LOGIC ---
  const handleRemoveSlot = (indexToRemove: number) => {
    let newSlots = slots.filter((_, i) => i !== indexToRemove);
    
    // If removing a slot drops us from 7 down to 6, we must instantly drop to 5.
    // We achieve this by slicing off the very last item in the array.
    if (newSlots.length === 6) {
      newSlots = newSlots.slice(0, 5); // Keeps index 0 through 4 (5 items total)
    }
    
    setSlots(newSlots);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-white rounded-4xl shadow-2xl modal-enter overflow-hidden flex flex-col">
        
        <div className="bg-dark px-6 py-5 text-center shrink-0">
          <h2 className="text-xl font-bold text-white">Customize Navigation</h2>
          <p className="text-gray-300 text-xs mt-1">Design your workspace layout</p>
        </div>

        <div className="px-6 py-6 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {/* SLOT 1 - LOCKED */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Slot 1 (Locked)</label>
            <div className="w-full bg-gray-100 text-gray-500 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 opacity-70 cursor-not-allowed font-semibold">
               <span>📝</span> Active Quests
            </div>
          </div>

          {/* DYNAMIC SLOTS */}
          {slots.slice(1).map((currentTab, index) => {
            const actualSlotIndex = index + 1; // because we sliced off index 0
            
            return (
              <div key={actualSlotIndex} className="relative group">
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-xs font-bold text-orange-600 uppercase tracking-wider">Slot {actualSlotIndex + 1}</label>
                  {/* Remove Button */}
                  <button 
                    onClick={() => handleRemoveSlot(actualSlotIndex)}
                    className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors"
                  >
                    Remove
                  </button>
                </div>
                
                <select
                  value={currentTab}
                  onChange={(e) => handleSlotChange(actualSlotIndex, e.target.value as TabType)}
                  className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 font-semibold text-dark focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer appearance-none"
                >
                  {AVAILABLE_TABS.map(tab => (
                    <option key={`s${actualSlotIndex}-${tab.id}`} value={tab.id}>
                      {tab.emoji} {tab.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          
          {/* ADD SLOT BUTTON */}
          {slots.length < 7 && (
            <button 
              onClick={handleAddSlot}
              className="w-full py-3 mt-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add New Slot
            </button>
          )}

          <p className="text-xs text-muted text-center italic mt-4 pt-2 border-t border-gray-100">
            Any unassigned tabs will be pushed into the "More" menu.
          </p>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2.5 bg-dark text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-transform active:scale-95 cursor-pointer">
            Save Layout
          </button>
        </div>
      </div>
    </div>
  );
}