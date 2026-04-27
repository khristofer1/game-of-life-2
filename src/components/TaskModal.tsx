// src/components/TaskModal.tsx
import { useRef, useEffect } from 'react';
import type { Quest } from '../types/quest';
import { formatQuestDuration } from '../utils/timeFormat';
import { calculateQuestData } from '../utils/questCalculations';
import { useTaskFormState } from '../hooks/useTaskFormState';
import { BreakSettings } from './forms/BreakSettings';
import { OneTimeSettings } from './forms/OneTimeSettings';
import { RecurringSettings } from './forms/RecurringSettings';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Quest | null;
  onSave: (questData: Partial<Quest>) => void;
  defaultIsBreak?: boolean;
  timePoints: number;
  totalTasks: number;
}

export function TaskModal({ isOpen, onClose, initialData, onSave, defaultIsBreak, timePoints, totalTasks }: TaskModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // 1. Pull all state and logic from our custom hook
  const state = useTaskFormState(initialData, isOpen, defaultIsBreak);

  // 2. Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleClose = () => {
    const hasUnsavedChanges = initialData 
      ? (state.name !== initialData.name || state.desc !== (initialData.desc || ''))
      : (state.name.trim() !== '' || state.desc.trim() !== '');

    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to discard them?")) return; 
    }
    onClose();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.name) return alert("Please enter a card name.");

    try {
      const formData = {
        name: state.name, desc: state.desc, startDateStr: state.startDateStr, questType: state.questType,
        otType: state.otType, otNum: state.otNum, otUnit: state.otUnit, otDeadlineStr: state.otDeadlineStr,
        freqNum: state.freqNum, freqUnit: state.freqUnit, hasShorterDeadline: state.hasShorterDeadline, 
        activeWindowType: state.activeWindowType, activeNum: state.activeNum, activeUnit: state.activeUnit, activeWindowDateStr: state.activeWindowDateStr,
        hasLimit: state.hasLimit, limitType: state.limitType, limitNum: state.limitNum, limitUnit: state.limitUnit, limitDateStr: state.limitDateStr, limitOccurrences: state.limitOccurrences,
        breakNum: state.breakNum, breakUnit: state.breakUnit, lastDoneAt: initialData?.lastDoneAt
      };

      const finalQuestData = calculateQuestData(formData, formatQuestDuration);
      onSave(finalQuestData);
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={handleClose}></div>
      <div className="relative w-full max-w-md bg-white rounded-4xl shadow-2xl modal-enter overflow-hidden flex flex-col max-h-[90vh]">

        <div className="px-8 pt-8 pb-6 overflow-y-auto custom-scrollbar">
          <h2 className="text-xl font-bold text-dark mb-6">
            {initialData ? 'Edit Card' : 'New Card'}
          </h2>

          <form onSubmit={handleSave} className="space-y-6 text-sm">
            {/* NAME & DESC */}
            <div>
              <label className="block font-semibold text-dark mb-2">Card Name</label>
              <input
                ref={nameInputRef}
                type="text"
                value={state.name}
                onChange={e => state.setName(e.target.value)} required
                placeholder="e.g. Read 1 Chapter..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-dark mb-2">
                Description <span className="text-muted font-normal">(Optional)</span>
              </label>
              <textarea 
                value={state.desc} 
                onChange={state.handleDescChange} 
                onKeyDown={state.handleDescKeyDown}
                placeholder="Card details..." 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all resize-none field-sizing-content"
              ></textarea>

              {(state.desc.match(/(https?:\/\/[^\s]+)/g) || []).length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fade-in">
                  {(state.desc.match(/(https?:\/\/[^\s]+)/g) || []).map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-xl text-xs font-bold hover:bg-orange-100 hover:scale-105 transition-all shadow-sm min-w-0">
                      <span className="shrink-0">🔗</span> 
                      <span className="truncate">{link}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* START DATE & TYPE SELECTOR */}
            <div>
              <label className="block font-semibold text-dark mb-2">Start Date & Time</label>
              <input type="datetime-local" value={state.startDateStr} onChange={state.handleStartDateChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer text-center" />
            </div>

            <div>
              <label className="block font-semibold text-dark mb-2">Card Type</label>
              <select value={state.questType} onChange={e => state.setQuestType(e.target.value as 'onetime' | 'recurring' | 'break')} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer">
                <option value="onetime">🎯 One-Time Quest</option>
                <option value="recurring">🔁 Recurring Quest</option>
                <option value="break">☕ Break Activity</option>
              </select>
            </div>

            {/* DYNAMIC FORM COMPONENTS */}
            {state.questType === 'onetime' && (
              <OneTimeSettings 
                otType={state.otType} setOtType={state.setOtType} otNum={state.otNum} setOtNum={state.setOtNum}
                otUnit={state.otUnit} setOtUnit={state.setOtUnit} otDeadlineStr={state.otDeadlineStr} setOtDeadlineStr={state.setOtDeadlineStr}
              />
            )}

            {state.questType === 'recurring' && (
              <RecurringSettings 
                freqNum={state.freqNum} setFreqNum={state.setFreqNum} freqUnit={state.freqUnit} setFreqUnit={state.setFreqUnit}
                hasShorterDeadline={state.hasShorterDeadline} setHasShorterDeadline={state.setHasShorterDeadline}
                activeWindowType={state.activeWindowType} setActiveWindowType={state.setActiveWindowType}
                activeNum={state.activeNum} setActiveNum={state.setActiveNum} activeUnit={state.activeUnit} setActiveUnit={state.setActiveUnit}
                activeWindowDateStr={state.activeWindowDateStr} setActiveWindowDateStr={state.setActiveWindowDateStr}
                hasLimit={state.hasLimit} setHasLimit={state.setHasLimit} limitType={state.limitType} setLimitType={state.setLimitType}
                limitNum={state.limitNum} setLimitNum={state.setLimitNum} limitUnit={state.limitUnit} setLimitUnit={state.setLimitUnit}
                limitDateStr={state.limitDateStr} setLimitDateStr={state.setLimitDateStr} limitOccurrences={state.limitOccurrences} setLimitOccurrences={state.setLimitOccurrences}
              />
            )}

            {state.questType === 'break' && (
              <BreakSettings 
                breakNum={state.breakNum} setBreakNum={state.setBreakNum} breakUnit={state.breakUnit} setBreakUnit={state.setBreakUnit}
              />
            )}
          </form>
        </div>

        {/* FOOTER BUTTONS */}
        <div className="bg-gray-50 px-8 py-4 flex gap-3 shrink-0 border-t border-gray-100 text-sm">
          <button onClick={handleClose} className="flex-1 px-6 py-3 rounded-2xl font-semibold text-muted hover:bg-gray-200 transition-colors">Cancel</button>
          
          {(() => {
            const isNewCard = !initialData;
            const needsTp = isNewCard && totalTasks > 0;
            const canAfford = !needsTp || timePoints >= 10;

            return (
              <button 
                onClick={handleSave} 
                disabled={!canAfford}
                className={`flex-1 px-6 py-3 rounded-2xl font-semibold transition-colors shadow-lg flex justify-center items-center gap-2 ${canAfford ? 'bg-dark text-white hover:bg-blue-500' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
              >
                <span>Save Card</span>
                {needsTp && (
                  <span className={`px-2 py-0.5 rounded-lg text-xs ${canAfford ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-500'}`}>
                    ⏳ 10
                  </span>
                )}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}