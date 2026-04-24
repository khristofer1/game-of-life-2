// src/types/pendingRewards.ts
export interface PendingRewards {
  gems: number;
  tp: number;
  medals: {
    bronze: number;
    silver: number;
    gold: number;
  };
  hasClaimedToday: boolean;
}