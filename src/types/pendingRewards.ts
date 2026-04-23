// src/types/pendingRewards.ts
export interface PendingRewards {
  gems: number;
  tp: number;
  keys: {
    bronze: number;
    silver: number;
    gold: number;
  };
  hasClaimedToday: boolean;
}