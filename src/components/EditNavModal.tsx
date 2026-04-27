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
  { id: 'active', label: 'Active', emoji: '📝' },
  { id: 'coming', label: 'Coming', emoji: '⏳' },
  { id: 'completed', label: 'Completed', emoji: '✅' },
  { id: 'shop', label: 'Shop', emoji: '🏪' },
  { id: 'break', label: 'Break', emoji: '☕' },
  { id: 'deleted', label: 'Deleted', emoji: '🗑️' }
];

export function EditNavModal({ isOpen, onClose, currentLayout, onSave }: EditNavModalProps) {
  const [slots, setSlots] = useState<TabType[]>(currentLayout);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(slots);
    onClose();
  };

  const handleSlotChange = (indexToChange: number, newValue: TabType) => {
    const newSlots = [...slots];
    const existingIndex = newSlots.indexOf(newValue);
    if (existingIndex !== -1) newSlots[existingIndex] = newSlots[indexToChange];
    newSlots[indexToChange] = newValue;
    setSlots(newSlots);
  };

  const handleAddSlot = () => {
    const unassignedTabs = AVAILABLE_TABS.map(t => t.id).filter(id => !slots.includes(id));
    if (unassignedTabs.length > 0 && slots.length < 6) {
      if (slots.length === 4 && unassignedTabs.length >= 2) {
        setSlots([...slots, unassignedTabs[0], unassignedTabs[1]]);
      } else {
        setSlots([...slots, unassignedTabs[0]]);
      }
    }
  };

  const handleRemoveSlot = (indexToRemove: number) => {
    let newSlots = slots.filter((_, i) => i !== indexToRemove);
    if (newSlots.length === 5) newSlots = newSlots.slice(0, 4); 
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

        <div className="px-6 py-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {slots.map((currentTab, index) => {
            return (
              <div key={index} className="relative group">
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-xs font-bold text-orange-600 uppercase tracking-wider">Slot {index + 1}</label>
                  <button onClick={() => handleRemoveSlot(index)} className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors">Remove</button>
                </div>
                <select value={currentTab} onChange={(e) => handleSlotChange(index, e.target.value as TabType)} className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 font-semibold text-dark focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer appearance-none">
                  {AVAILABLE_TABS.map(tab => <option key={`s${index}-${tab.id}`} value={tab.id}>{tab.emoji} {tab.label}</option>)}
                </select>
              </div>
            );
          })}
          
          {slots.length < 6 && (
            <button onClick={handleAddSlot} className="w-full py-3 mt-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg> Add New Slot
            </button>
          )}
          <p className="text-xs text-muted text-center italic mt-4 pt-2 border-t border-gray-100">Any unassigned tabs will be pushed into the "More" menu.</p>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex w-full gap-3 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-5 py-2.5 bg-dark text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-transform active:scale-95 cursor-pointer">Save Layout</button>
        </div>
      </div>
    </div>
  );
}