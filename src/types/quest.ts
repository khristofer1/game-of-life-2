export interface Quest {
    id?: number;
    name: string;
    desc: string;
    isOneTime: boolean;
    startDate: number;
    createdAt: number;
    
    // One-Time specific
    deadline?: number;
    durationMs: number;
    oneTimeData?: {
        type: string;
        num?: number;
        unit?: string;
        dateStr?: string;
    } | null;

    // Recurring specific
    freqNum?: number;
    freqUnit?: string;
    displayFreq?: string;
    hasLimit?: boolean;
    expireAt?: number;
    activeDeadlineMs?: number;
    cycleStart?: number;
    limitData?: {
        type: string;
        num?: number;
        unit?: string;
        dateStr?: string;
        count?: number;
    } | null;

    // State & Progress
    isArchived: boolean;
    deletedAt?: number;
    completed: boolean;
    completedAt?: number | null;
    gemClaimed?: boolean;
    energyPercent: number;
    streak: number;
}