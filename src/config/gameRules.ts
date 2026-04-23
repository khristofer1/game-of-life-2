// src/config/gameRules.ts

export const GAME_CONFIG = {
  // CD7: Unpredictability (Chest Drop Rates)
  // Values represent the threshold out of 1.0 (e.g., 0.80 = 80% common, up to 0.95 = 15% rare, above = 5% legendary)
  gacha: {
    bronze: { rareThreshold: 0.80, legendaryThreshold: 0.95 },
    silver: { rareThreshold: 0.80, legendaryThreshold: 0.95 },
    gold:   { rareThreshold: 0.80, legendaryThreshold: 0.95 },
  },

  // CD4: Ownership & Possession (Economy Pricing)
  economy: {
    mintGemCostTP: 10,       // How much TP it costs to buy 1 Gem
    shatterGemYieldTP: 9,    // How much TP you get for destroying 1 Gem
    maxTPRewardPerTask: 10,  // The cap on TP earned from a single task
  },

  // CD2: Development & Accomplishment (Energy & Keys)
  energy: {
    goldKeyThreshold: 50,    // Energy > 50% gives Gold
    silverKeyThreshold: 25,  // Energy > 25% gives Silver
  }
};