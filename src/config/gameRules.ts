// src/config/gameRules.ts

export const GAME_CONFIG = {
  // CD7: Unpredictability (Chest Drop Rates)
  gacha: {
    bronze: { rareThreshold: 0.80, legendaryThreshold: 0.95 },
    silver: { rareThreshold: 0.80, legendaryThreshold: 0.95 },
    gold:   { rareThreshold: 0.80, legendaryThreshold: 0.95 },
  },

  // CD4: Ownership & Possession (Economy Pricing)
  economy: {
    mintGemCostTP: 10,       
    shatterGemYieldTP: 9,    
    maxTPRewardPerTask: 10,  
  },

  // CD2 / Progression - Tier Thresholds (in Days)
  tiers: {
    standard: 0,
    bronze: 7,
    silver: 30,
    gold: 120,
    diamond: 365,
  },

  // CD2: Development & Accomplishment (Energy & Medals)
  energy: {
    greenThreshold: 50,    
    yellowThreshold: 25,  
  }
};