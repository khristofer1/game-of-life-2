// src/components/forms/OneTimeSettings.tsx
interface OneTimeSettingsProps {
  otType: 'duration' | 'date'; setOtType: (v: 'duration' | 'date') => void;
  otNum: number; setOtNum: (v: number) => void;
  otUnit: string; setOtUnit: (v: string) => void;
  otDeadlineStr: string; setOtDeadlineStr: (v: string) => void;
}

export function OneTimeSettings({ otType, setOtType, otNum, setOtNum, otUnit, setOtUnit, otDeadlineStr, setOtDeadlineStr }: OneTimeSettingsProps) {
  return (
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
  );
}