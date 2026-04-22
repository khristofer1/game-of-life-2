// src/hooks/useTaskFormState.ts
import { useState, useEffect } from 'react';
import type { Quest } from '../types/quest';
import { useSmartTextarea } from './useSmartTextarea';

const formatDateTimeLocal = (timestamp?: number) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const tzoffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
};

export function useTaskFormState(initialData: Quest | null, isOpen: boolean, defaultIsBreak?: boolean) {
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

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
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
            if (initialData.activeWindowData) {
              setActiveWindowType(initialData.activeWindowData.type as 'duration' | 'date');
              if (initialData.activeWindowData.type === 'duration') {
                setActiveNum(initialData.activeWindowData.num || 3);
                setActiveUnit(initialData.activeWindowData.unit || 'hours');
              } else {
                setActiveWindowDateStr(initialData.activeWindowData.dateStr || '');
              }
            } else {
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
        setName('');
        setDesc('');
        setQuestType(defaultIsBreak ? 'break' : 'onetime');
        setHasShorterDeadline(false);
        setHasLimit(false);
        setActiveWindowType('date');

        const now = new Date();
        const tzoffset = now.getTimezoneOffset() * 60000;
        setStartDateStr(new Date(now.getTime() - tzoffset).toISOString().slice(0, 16));
        setHasManuallySetTime(false);

        const tonight = new Date();
        tonight.setHours(21, 0, 0, 0);
        const tonightIso = new Date(tonight.getTime() - tzoffset).toISOString().slice(0, 16);
        
        setOtDeadlineStr(tonightIso);
        setActiveWindowDateStr(tonightIso);
      }
    }
  }, [isOpen, initialData, defaultIsBreak]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value; 
    if (!newValue) {
      setStartDateStr('');
      return;
    }

    if (hasManuallySetTime) {
      setStartDateStr(newValue);
    } else {
      const oldTime = startDateStr.split('T')[1];
      const newTime = newValue.split('T')[1];
      const newDate = newValue.split('T')[0];

      if (oldTime !== newTime) {
        setHasManuallySetTime(true);
        setStartDateStr(newValue);
      } else {
        setStartDateStr(`${newDate}T06:00`);
      }
    }
  };

  return {
    name, setName, desc, handleDescChange, handleDescKeyDown,
    startDateStr, handleStartDateChange, questType, setQuestType,
    otType, setOtType, otNum, setOtNum, otUnit, setOtUnit, otDeadlineStr, setOtDeadlineStr,
    freqNum, setFreqNum, freqUnit, setFreqUnit, hasShorterDeadline, setHasShorterDeadline,
    activeNum, setActiveNum, activeUnit, setActiveUnit, hasLimit, setHasLimit,
    limitType, setLimitType, limitNum, setLimitNum, limitUnit, setLimitUnit,
    limitDateStr, setLimitDateStr, limitOccurrences, setLimitOccurrences,
    activeWindowType, setActiveWindowType, activeWindowDateStr, setActiveWindowDateStr,
    breakNum, setBreakNum, breakUnit, setBreakUnit
  };
}