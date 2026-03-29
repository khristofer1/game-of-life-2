// src/components/TaskModal.tsx
import { useState, useEffect } from 'react';
import type { Quest } from '../types/quest';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Quest | null;
  onSave: (questData: Partial<Quest>) => void;
}

// Helper to format timestamps for the <input type="datetime-local">
const formatDateTimeLocal = (timestamp?: number) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const tzoffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
};

export function TaskModal({ isOpen, onClose, initialData, onSave }: TaskModalProps) {
  // --- FORM STATE ---
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [questType, setQuestType] = useState<'onetime' | 'recurring'>('onetime');

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

  // --- INITIALIZATION (Runs when modal opens) ---
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // EDIT MODE: Populate fields
        setName(initialData.name);
        setDesc(initialData.desc || '');
        setStartDateStr(formatDateTimeLocal(initialData.startDate));
        setQuestType(initialData.isOneTime ? 'onetime' : 'recurring');

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
        setName(''); setDesc(''); setQuestType('onetime'); setHasShorterDeadline(false); setHasLimit(false);

        // Set to exactly now
        const now = new Date();
        const tzoffset = now.getTimezoneOffset() * 60000;
        setStartDateStr(new Date(now.getTime() - tzoffset).toISOString().slice(0, 16));
      }
    }
  }, [isOpen, initialData]);

  // --- SAVE LOGIC ---
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return alert("Please enter a quest name.");

    const startDate = startDateStr ? new Date(startDateStr).getTime() : new Date().setHours(0, 0, 0, 0);
    const isOneTime = questType === 'onetime';

    let durationMs = 0;
    let deadline = undefined;
    let oneTimeData = null;
    let expireAt = undefined;
    let activeDeadlineMs = 0;
    let displayFreq = '';
    let limitData = { type: 'none' } as any;
    let activeWindowData: any = undefined;

    if (isOneTime) {
      if (otType === 'duration') {
        let days = otNum;
        if (otUnit === 'weeks') days = otNum * 7;
        if (otUnit === 'months') days = otNum * 30;
        if (otUnit === 'years') days = otNum * 365;
        durationMs = days * 24 * 60 * 60 * 1000;
        deadline = startDate + durationMs;
        oneTimeData = { type: 'duration', num: otNum, unit: otUnit };
      } else {
        if (!otDeadlineStr) return alert("Please set a hard deadline.");
        deadline = new Date(otDeadlineStr).getTime();
        if (deadline <= startDate) return alert("Deadline must be after Start Date.");
        durationMs = deadline - startDate;
        oneTimeData = { type: 'date', dateStr: otDeadlineStr };
      }
      displayFreq = "One-Time Quest";
      activeDeadlineMs = durationMs;
    } else {
      // Recurring Math
      let days = freqNum;
      if (freqUnit === 'weeks') days = freqNum * 7;
      if (freqUnit === 'months') days = freqNum * 30;
      if (freqUnit === 'years') days = freqNum * 365;
      durationMs = days * 24 * 60 * 60 * 1000;

      const unitText = freqNum === 1 ? freqUnit.slice(0, -1) : freqUnit;
      displayFreq = `Every ${freqNum} ${unitText.charAt(0).toUpperCase() + unitText.slice(1)}`;

      if (hasShorterDeadline) {
        if (activeWindowType === 'duration') {
          let activeMulti = 1;
          if (activeUnit === 'minutes') activeMulti = 60 * 1000;
          if (activeUnit === 'hours') activeMulti = 60 * 60 * 1000;
          if (activeUnit === 'days') activeMulti = 24 * 60 * 60 * 1000;
          if (activeUnit === 'weeks') activeMulti = 7 * 24 * 60 * 60 * 1000;
          activeDeadlineMs = activeNum * activeMulti;
          activeWindowData = { type: 'duration', num: activeNum, unit: activeUnit };
        } else {
          // Calculate the duration mathematically based on the selected date
          if (!activeWindowDateStr) return alert("Please select a specific date and time for the active window.");
          const targetTime = new Date(activeWindowDateStr).getTime();
          activeDeadlineMs = targetTime - startDate;
          
          if (activeDeadlineMs <= 0) return alert("The active window deadline must be after the Start Date.");
          activeWindowData = { type: 'date', dateStr: activeWindowDateStr };
        }

        if (activeDeadlineMs > durationMs) return alert("Active window cannot be longer than the repeat interval!");
      } else {
        activeDeadlineMs = durationMs;
      }

      if (hasLimit) {
        if (limitType === 'duration') {
          let lDays = limitNum;
          if (limitUnit === 'weeks') lDays = limitNum * 7;
          if (limitUnit === 'months') lDays = limitNum * 30;
          if (limitUnit === 'years') lDays = limitNum * 365;
          expireAt = startDate + (lDays * 24 * 60 * 60 * 1000);
          limitData = { type: 'duration', num: limitNum, unit: limitUnit };
        } else if (limitType === 'date') {
          if (!limitDateStr) return alert("Please select an end date.");
          expireAt = new Date(limitDateStr).getTime();
          limitData = { type: 'date', dateStr: limitDateStr };
        } else if (limitType === 'occurrences') {
          expireAt = startDate + (limitOccurrences * durationMs);
          limitData = { type: 'occurrences', count: limitOccurrences };
        }
      }
    }

    // Pass the calculated data back to App.tsx to save!
    onSave({
      name, desc, startDate, isOneTime, durationMs, deadline, oneTimeData,
      freqNum, freqUnit, displayFreq, hasLimit, limitData, expireAt, activeDeadlineMs, activeWindowData
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-xl bg-white rounded-4xl shadow-2xl modal-enter overflow-hidden flex flex-col max-h-[90vh]">

        <div className="px-8 pt-8 pb-6 overflow-y-auto custom-scrollbar">
          <h2 className="text-xl font-bold text-dark mb-6">{initialData ? 'Edit Quest' : 'New Quest'}</h2>

          <form onSubmit={handleSave} className="space-y-6 text-sm">
            {/* NAME & DESC */}
            <div>
              <label className="block font-semibold text-dark mb-2">Quest Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Read 1 Chapter..." className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-semibold" />
            </div>

            <div>
              <label className="block font-semibold text-dark mb-2">Description <span className="text-muted font-normal">(Optional)</span></label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Quest details..." className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all resize-none field-sizing-content"></textarea>
            </div>

            {/* START DATE */}
            <div>
              <label className="block font-semibold text-dark mb-2">Start Date & Time</label>
              <input type="datetime-local" value={startDateStr} onChange={e => setStartDateStr(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer text-center" />
            </div>

            {/* TYPE SELECTOR */}
            <div>
              <label className="block font-semibold text-dark mb-2">Quest Type</label>
              <select value={questType} onChange={e => setQuestType(e.target.value as 'onetime' | 'recurring')} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer">
                <option value="onetime">🎯 One-Time Quest</option>
                <option value="recurring">🔁 Recurring Quest</option>
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
                        <option value="duration">By Duration</option>
                        <option value="date">By Specific Date & Time</option>
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
          </form>
        </div>

        {/* FOOTER BUTTONS */}
        <div className="bg-gray-50 px-8 py-4 flex gap-3 shrink-0 border-t border-gray-100 text-sm">
          <button onClick={onClose} className="flex-1 px-6 py-3 rounded-2xl font-semibold text-muted hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex-1 bg-dark text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-500 transition-colors shadow-lg">Save Quest</button>
        </div>
      </div>
    </div>
  );
}