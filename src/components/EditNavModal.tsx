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
  // Local state for the dropdowns
  const [slot2, setSlot2] = useState<TabType>(currentLayout[1]);
  const [slot3, setSlot3] = useState<TabType>(currentLayout[2]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(['active', slot2, slot3]);
    onClose();
  };

  // --- THE SMART SWAP LOGIC ---
  const handleSlot2Change = (newValue: TabType) => {
    if (newValue === slot3) {
      setSlot3(slot2); // Push the old Slot 2 value over to Slot 3
    }
    setSlot2(newValue);
  };

  const handleSlot3Change = (newValue: TabType) => {
    if (newValue === slot2) {
      setSlot2(slot3); // Push the old Slot 3 value over to Slot 2
    }
    setSlot3(newValue);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-white rounded-4xl shadow-2xl modal-enter overflow-hidden flex flex-col">
        
        <div className="bg-dark px-6 py-5 text-center shrink-0">
          <h2 className="text-xl font-bold text-white">Customize Navigation</h2>
          <p className="text-gray-300 text-xs mt-1">Design your workspace layout</p>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* SLOT 1 - LOCKED */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Slot 1 (Locked)</label>
            <div className="w-full bg-gray-100 text-gray-500 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 opacity-70 cursor-not-allowed font-semibold">
               <span>📝</span> Active Quests
            </div>
          </div>

          {/* SLOT 2 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Slot 2</label>
            <select
              value={slot2}
              onChange={(e) => handleSlot2Change(e.target.value as TabType)}
              className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 font-semibold text-dark focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer appearance-none"
            >
              {AVAILABLE_TABS.map(tab => (
                <option key={`s2-${tab.id}`} value={tab.id}>
                  {tab.emoji} {tab.label}
                </option>
              ))}
            </select>
          </div>

          {/* SLOT 3 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Slot 3</label>
            <select
              value={slot3}
              onChange={(e) => handleSlot3Change(e.target.value as TabType)}
              className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 font-semibold text-dark focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer appearance-none"
            >
              {AVAILABLE_TABS.map(tab => (
                <option key={`s3-${tab.id}`} value={tab.id}>
                  {tab.emoji} {tab.label}
                </option>
              ))}
            </select>
          </div>
          
          <p className="text-xs text-muted text-center italic mt-2">
            Remaining tabs will be moved to the "More" menu.
          </p>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">
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