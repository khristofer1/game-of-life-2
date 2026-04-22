// src/components/TaskModal.tsx
import { useState, useEffect, useRef } from 'react';
import type { Quest } from '../types/quest';
import { formatQuestDuration } from '../utils/timeFormat';
import { useSmartTextarea } from '../hooks/useSmartTextarea';
import { calculateQuestData } from '../utils/questCalculations';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Quest | null;
  onSave: (questData: Partial<Quest>) => void;
  defaultIsBreak?: boolean;
}

// Helper to format timestamps for the <input type="datetime-local">
const formatDateTimeLocal = (timestamp?: number) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const tzoffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
};

export function TaskModal({ isOpen, onClose, initialData, onSave, defaultIsBreak }: TaskModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // --- FORM STATE ---
  const [name, setName] = useState('');
  const { desc, setDesc, handleDescChange, handleDescKeyDown } = useSmartTextarea('');
  const [startDateStr, setStartDateStr] = useState('');
  const [questType, setQuestType] = useState<'onetime' | 'recurring' | 'break'>('onetime');
  const [hasManuallySetTime, setHasManuallySetTime] = useState(false);

  // One-Time State
  const [otType, setOtType] = useState<'duration' | 'date'>('duration');
  const [otNum, setOtNum] = useState(1);
  const [otUnit, setOtUnit] = useState('weeks');
  const [otDeadlineStr, setOtDeadlineStr] = useState('');

  // Recurring State
  const [freqNum, setFreqNum] = useState(1);
  const [freqUnit, setFreqUnit] = useState('weeks');
  const [hasShorterDeadline, setHasShorterDeadline] = useState(false);
  const [activeNum, setActiveNum] = useState(3);
  const [activeUnit, setActiveUnit] = useState('hours');
  const [hasLimit, setHasLimit] = useState(false);
  const [limitType, setLimitType] = useState<'duration' | 'date' | 'occurrences'>('duration');
  const [limitNum, setLimitNum] = useState(1);
  const [limitUnit, setLimitUnit] = useState('months');
  const [limitDateStr, setLimitDateStr] = useState('');
  const [limitOccurrences, setLimitOccurrences] = useState(10);
  const [activeWindowType, setActiveWindowType] = useState<'duration' | 'date'>('duration');
  const [activeWindowDateStr, setActiveWindowDateStr] = useState('');

  // Break activity state
  const [breakNum, setBreakNum] = useState(1);
  const [breakUnit, setBreakUnit] = useState('days');

  // --- INITIALIZATION (Runs when modal opens) ---
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // EDIT MODE: Populate fields
        setName(initialData.name);
        setDesc(initialData.desc || '');
        setStartDateStr(formatDateTimeLocal(initialData.startDate));
        setHasManuallySetTime(true);

        if (initialData.isBreak) {
          setQuestType('break');
          if (initialData.cooldownData) {
            setBreakNum(initialData.cooldownData.num || 1);
            setBreakUnit(initialData.cooldownData.unit || 'days');
          }
        } else {
          setQuestType(initialData.isOneTime ? 'onetime' : 'recurring');
        }
        
        if (initialData.isOneTime) {
          if (initialData.oneTimeData) {
            setOtType(initialData.oneTimeData.type as 'duration' | 'date');
            setOtNum(initialData.oneTimeData.num || 1);
            setOtUnit(initialData.oneTimeData.unit || 'days');
            setOtDeadlineStr(formatDateTimeLocal(initialData.deadline));
          }
        } else {
          setFreqNum(initialData.freqNum || 1);
          setFreqUnit(initialData.freqUnit || 'weeks');

          if (initialData.activeDeadlineMs && initialData.activeDeadlineMs < initialData.durationMs) {
            setHasShorterDeadline(true);
            
            // Check if they previously saved using the new data object
            if (initialData.activeWindowData) {
              setActiveWindowType(initialData.activeWindowData.type as 'duration' | 'date');
              if (initialData.activeWindowData.type === 'duration') {
                setActiveNum(initialData.activeWindowData.num || 3);
                setActiveUnit(initialData.activeWindowData.unit || 'hours');
              } else {
                setActiveWindowDateStr(initialData.activeWindowData.dateStr || '');
              }
            } else {
              // Fallback for older quests created before this update
              setActiveWindowType('duration');
              let ms = initialData.activeDeadlineMs;
              if (ms % (7 * 24 * 60 * 60 * 1000) === 0) { setActiveNum(ms / (7 * 24 * 60 * 60 * 1000)); setActiveUnit('weeks'); }
              else if (ms % (24 * 60 * 60 * 1000) === 0) { setActiveNum(ms / (24 * 60 * 60 * 1000)); setActiveUnit('days'); }
              else if (ms % (60 * 60 * 1000) === 0) { setActiveNum(ms / (60 * 60 * 1000)); setActiveUnit('hours'); }
              else { setActiveNum(Math.floor(ms / (60 * 1000))); setActiveUnit('minutes'); }
            }
          } else {
            setHasShorterDeadline(false);
            setActiveWindowType('duration');
            setActiveNum(3);
            setActiveUnit('hours');
            setActiveWindowDateStr('');
          }

          setHasLimit(initialData.hasLimit || false);
          if (initialData.limitData) {
            setLimitType(initialData.limitData.type as any);
            setLimitNum(initialData.limitData.num || 1);
            setLimitUnit(initialData.limitData.unit || 'months');
            setLimitDateStr(formatDateTimeLocal(initialData.expireAt));
            setLimitOccurrences(initialData.limitData.count || 10);
          }
        }
      } else {
        // ADD MODE: Reset to defaults
        setName('');
        setDesc('');
        setQuestType(defaultIsBreak ? 'break' : 'onetime');
        setHasShorterDeadline(false);
        setHasLimit(false);
        setActiveWindowType('date');

        // 1. Set Start Date exactly to NOW
        const now = new Date();
        const tzoffset = now.getTimezoneOffset() * 60000;
        setStartDateStr(new Date(now.getTime() - tzoffset).toISOString().slice(0, 16));
        setHasManuallySetTime(false);

        // 2. Set Deadlines to today at 09:00 PM
        const tonight = new Date();
        tonight.setHours(21, 0, 0, 0);
        const tonightIso = new Date(tonight.getTime() - tzoffset).toISOString().slice(0, 16);
        
        // 3. Feed this 9 PM string to the states that actually control your inputs!
        setOtDeadlineStr(tonightIso);         // For One-Time Quests
        setActiveWindowDateStr(tonightIso);   // For Recurring Quests (Custom Deadline)

        // Focus the input slightly after the modal finishes rendering and animating
        setTimeout(() => {
          if (nameInputRef.current) {
            nameInputRef.current.focus();
          }
        }, 100);
      }
    }
  }, [isOpen, initialData, defaultIsBreak]);

  // --- TEXTAREA AUTO-FORMATTING ---
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value; 
    if (!newValue) {
      setStartDateStr('');
      return;
    }

    if (hasManuallySetTime) {
      // The user already locked in a specific time. Respect whatever they do.
      setStartDateStr(newValue);
    } else {
      // Split the ISO string into [Date, Time] -> e.g. ["2026-04-17", "21:33"]
      const oldTime = startDateStr.split('T')[1];
      const newTime = newValue.split('T')[1];
      const newDate = newValue.split('T')[0];

      if (oldTime !== newTime) {
        // The time part changed! That means they clicked the clock. Lock it in!
        setHasManuallySetTime(true);
        setStartDateStr(newValue);
      } else {
        // The time is identical, which means they only changed the calendar date.
        // Snap the time to 06:00 AM!
        setStartDateStr(`${newDate}T06:00`);
      }
    }
  };

  const handleClose = () => {
    let hasUnsavedChanges = false;

    if (initialData) {
      // EDIT MODE: Check if the current name or description differ from the original data
      hasUnsavedChanges = 
        name !== initialData.name || 
        desc !== (initialData.desc || '');
    } else {
      // ADD MODE: Check if they have typed anything at all
      hasUnsavedChanges = name.trim() !== '' || desc.trim() !== '';
    }

    // If there are changes, show the native confirmation dialog
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm("You have unsaved changes. Are you sure you want to discard them?");
      
      // If the user clicks "Cancel" on the dialog, stop here and keep the modal open
      if (!confirmDiscard) {
        return; 
      }
    }

    // If there are no changes, OR if the user clicked "OK" to discard, close it
    onClose();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return alert("Please enter a card name.");

    try {
      // Gather all current state variables into one object
      const formData = {
        name, desc, startDateStr, questType,
        otType, otNum, otUnit, otDeadlineStr,
        freqNum, freqUnit, hasShorterDeadline, activeWindowType, activeNum, activeUnit, activeWindowDateStr,
        hasLimit, limitType, limitNum, limitUnit, limitDateStr, limitOccurrences,
        breakNum, breakUnit, lastDoneAt: initialData?.lastDoneAt
      };

      // Let the pure function do all the heavy lifting!
      const finalQuestData = calculateQuestData(formData, formatQuestDuration);
      
      // Send it back up to App.tsx
      onSave(finalQuestData);

    } catch (error: any) {
      // Our utility throws an Error if the user forgets a deadline, so we catch it here and alert them!
      alert(error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={handleClose}></div>
      <div className="relative w-full max-w-xl bg-white rounded-4xl shadow-2xl modal-enter overflow-hidden flex flex-col max-h-[90vh]">

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
                value={name}
                onChange={e => setName(e.target.value)} required
                placeholder="e.g. Read 1 Chapter..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-dark mb-2">
                Description <span className="text-muted font-normal">(Optional)</span>
              </label>
              <textarea 
                value={desc} 
                onChange={handleDescChange} 
                onKeyDown={handleDescKeyDown}
                placeholder="Card details..." 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all resize-none field-sizing-content"
              ></textarea>

              {(desc.match(/(https?:\/\/[^\s]+)/g) || []).length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fade-in">
                  {(desc.match(/(https?:\/\/[^\s]+)/g) || []).map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      // 1. ADDED `min-w-0` to the parent so the grid allows it to shrink
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-xl text-xs font-bold hover:bg-orange-100 hover:scale-105 transition-all shadow-sm min-w-0"
                    >
                      {/* 2. ADDED `shrink-0` so the emoji never gets squished */}
                      <span className="shrink-0">🔗</span> 
                      
                      {/* 3. ADDED `truncate` and removed the Javascript substring! */}
                      <span className="truncate">{link}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* START DATE */}
            <div>
              <label className="block font-semibold text-dark mb-2">Start Date & Time</label>
              <input type="datetime-local" value={startDateStr} onChange={handleStartDateChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer text-center" />
            </div>

             {/* TYPE SELECTOR */}
            <div>
              <label className="block font-semibold text-dark mb-2">Card Type</label>
              <select value={questType} onChange={e => setQuestType(e.target.value as 'onetime' | 'recurring' | 'break')} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer">
                <option value="onetime">🎯 One-Time Quest</option>
                <option value="recurring">🔁 Recurring Quest</option>
                <option value="break">☕ Break Activity</option>
              </select>
            </div>

            {/* ONE-TIME SETTINGS */}
            {questType === 'onetime' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block font-semibold text-dark mb-2">Deadline Type</label>
                  <select value={otType} onChange={e => setOtType(e.target.value as 'duration' | 'date')} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer">
                    <option value="duration">By Duration (Days/Weeks/Months)</option>
                    <option value="date">By Specific Date & Time</option>
                  </select>
                </div>
                {otType === 'duration' ? (
                  <div className="flex gap-3">
                    <input type="number" min="1" value={otNum} onChange={e => setOtNum(parseInt(e.target.value))} className="w-24 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark text-center" />
                    <select value={otUnit} onChange={e => setOtUnit(e.target.value)} className="grow px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark">
                      <option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option><option value="years">Years</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-dark mb-2">Hard Deadline <span className="text-red-500">*</span></label>
                    <input type="datetime-local" value={otDeadlineStr} onChange={e => setOtDeadlineStr(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer text-center" />
                  </div>
                )}
              </div>
            )}

            {/* RECURRING SETTINGS */}
            {questType === 'recurring' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block font-semibold text-dark mb-2">Repeat Every</label>
                  <div className="flex gap-3">
                    <input type="number" min="1" value={freqNum} onChange={e => setFreqNum(parseInt(e.target.value))} className="w-24 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark text-center" />
                    <select value={freqUnit} onChange={e => setFreqUnit(e.target.value)} className="grow px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark">
                      <option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option><option value="years">Years</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={hasShorterDeadline} onChange={e => setHasShorterDeadline(e.target.checked)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400" />
                    <span className="font-semibold text-dark">Use a custom deadline</span>
                  </label>
                  
                  {hasShorterDeadline && (
                    <div className="space-y-3 animate-fade-in">
                      <select 
                        value={activeWindowType} 
                        onChange={e => setActiveWindowType(e.target.value as 'duration' | 'date')} 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer"
                      >
                        <option value="date">By Specific Date & Time</option>
                        <option value="duration">By Duration</option>
                      </select>

                      {activeWindowType === 'duration' ? (
                        <div className="flex gap-3">
                          <input type="number" min="1" value={activeNum} onChange={e => setActiveNum(parseInt(e.target.value))} className="w-24 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark text-center" />
                          <select value={activeUnit} onChange={e => setActiveUnit(e.target.value)} className="grow px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark">
                            <option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option><option value="weeks">Weeks</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <input 
                            type="datetime-local" 
                            value={activeWindowDateStr} 
                            onChange={e => setActiveWindowDateStr(e.target.value)} 
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer text-center" 
                          />
                          <p className="text-xs text-muted mt-2 px-1">
                            Note: The exact time difference between your Start Date and this Deadline will become the standard active window for all future cycles.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={hasLimit} onChange={e => setHasLimit(e.target.checked)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400" />
                    <span className="font-semibold text-dark">This quest has a time limit</span>
                  </label>
                  {hasLimit && (
                    <div className="space-y-3 animate-fade-in">
                      <select value={limitType} onChange={e => setLimitType(e.target.value as any)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark">
                        <option value="duration">By Duration</option><option value="date">By Specific Date</option><option value="occurrences">By Occurrences</option>
                      </select>
                      {limitType === 'duration' && (
                        <div className="flex gap-3">
                          <input type="number" min="1" value={limitNum} onChange={e => setLimitNum(parseInt(e.target.value))} className="w-20 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-center" />
                          <select value={limitUnit} onChange={e => setLimitUnit(e.target.value)} className="grow px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl">
                            <option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option><option value="years">Years</option>
                          </select>
                        </div>
                      )}
                      {limitType === 'date' && (
                        <input type="datetime-local" value={limitDateStr} onChange={e => setLimitDateStr(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-center" />
                      )}
                      {limitType === 'occurrences' && (
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-muted px-2">Ends after</div>
                          <input type="number" min="1" value={limitOccurrences} onChange={e => setLimitOccurrences(parseInt(e.target.value))} className="w-24 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-center" />
                          <div className="font-semibold text-muted px-2">times</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BREAK ACTIVITY SETTINGS */}
            {questType === 'break' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block font-semibold text-dark mb-2">Cooldown Duration</label>
                  <p className="text-xs text-muted mb-3">How long until you are allowed to do this activity again?</p>
                  <div className="flex gap-3">
                    <input type="number" min="1" value={breakNum} onChange={e => setBreakNum(parseInt(e.target.value))} className="w-24 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark text-center" />
                    <select value={breakUnit} onChange={e => setBreakUnit(e.target.value)} className="grow px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark">
                      <option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option><option value="weeks">Weeks</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* FOOTER BUTTONS */}
        <div className="bg-gray-50 px-8 py-4 flex gap-3 shrink-0 border-t border-gray-100 text-sm">
          <button onClick={handleClose} className="flex-1 px-6 py-3 rounded-2xl font-semibold text-muted hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex-1 bg-dark text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-500 transition-colors shadow-lg">Save Card</button>
        </div>
      </div>
    </div>
  );
}