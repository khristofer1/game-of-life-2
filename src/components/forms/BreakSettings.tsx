// src/components/forms/BreakSettings.tsx
interface BreakSettingsProps {
  breakNum: number; setBreakNum: (v: number) => void;
  breakUnit: string; setBreakUnit: (v: string) => void;
}

export function BreakSettings({ breakNum, setBreakNum, breakUnit, setBreakUnit }: BreakSettingsProps) {
  return (
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
  );
}