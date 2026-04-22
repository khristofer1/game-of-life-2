// src/components/forms/RecurringSettings.tsx
interface RecurringSettingsProps {
  freqNum: number; setFreqNum: (v: number) => void;
  freqUnit: string; setFreqUnit: (v: string) => void;
  hasShorterDeadline: boolean; setHasShorterDeadline: (v: boolean) => void;
  activeWindowType: 'duration' | 'date'; setActiveWindowType: (v: 'duration' | 'date') => void;
  activeNum: number; setActiveNum: (v: number) => void;
  activeUnit: string; setActiveUnit: (v: string) => void;
  activeWindowDateStr: string; setActiveWindowDateStr: (v: string) => void;
  hasLimit: boolean; setHasLimit: (v: boolean) => void;
  limitType: 'duration' | 'date' | 'occurrences'; setLimitType: (v: 'duration' | 'date' | 'occurrences') => void;
  limitNum: number; setLimitNum: (v: number) => void;
  limitUnit: string; setLimitUnit: (v: string) => void;
  limitDateStr: string; setLimitDateStr: (v: string) => void;
  limitOccurrences: number; setLimitOccurrences: (v: number) => void;
}

export function RecurringSettings({
  freqNum, setFreqNum, freqUnit, setFreqUnit,
  hasShorterDeadline, setHasShorterDeadline, activeWindowType, setActiveWindowType,
  activeNum, setActiveNum, activeUnit, setActiveUnit, activeWindowDateStr, setActiveWindowDateStr,
  hasLimit, setHasLimit, limitType, setLimitType, limitNum, setLimitNum, limitUnit, setLimitUnit,
  limitDateStr, setLimitDateStr, limitOccurrences, setLimitOccurrences
}: RecurringSettingsProps) {
  return (
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
            <select value={activeWindowType} onChange={e => setActiveWindowType(e.target.value as 'duration' | 'date')} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer">
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
                <input type="datetime-local" value={activeWindowDateStr} onChange={e => setActiveWindowDateStr(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-dark cursor-pointer text-center" />
                <p className="text-xs text-muted mt-2 px-1">Note: The exact time difference between your Start Date and this Deadline will become the standard active window for all future cycles.</p>
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
  );
}