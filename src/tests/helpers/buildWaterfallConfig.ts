/**
 * Helper functions to build valid, deterministic waterfall configs for testing.
 * 
 * These helpers ensure that waterfall configurations can be easily instantiated in tests
 * with realistic but deterministic values for v0.5 Waterfall v2 features.
 * 
 * v0.5 Test Matrix Coverage:
 * - Baseline waterfall (v0.3 multi-tier without catch-up)
 * - Catch-up waterfall (v0.5 with catch-up provisions)
 */

import type {
  WaterfallConfig,
  WaterfallTier,
} from '@domain/types';

/**
 * Builds a baseline multi-tier waterfall config (v0.3 style, no catch-up).
 * 
 * This reproduces v0.3 behavior: Return of Capital → Preferred Return → Promote.
 * Catch-up is disabled, so this should match v0.4 expectations.
 * 
 * @param overrides - Optional overrides for specific fields
 * @returns WaterfallConfig with multi-tier waterfall (no catch-up)
 */
export function buildBaselineWaterfallConfig(
  overrides?: Partial<WaterfallConfig>
): WaterfallConfig {
  const defaultConfig: WaterfallConfig = {
    equityClasses: [
      {
        id: 'lp',
        name: 'Limited Partner',
        contributionPct: 0.9,
      },
      {
        id: 'gp',
        name: 'General Partner',
        contributionPct: 0.1,
      },
    ],
    tiers: [
      {
        id: 'roc',
        type: 'return_of_capital',
        distributionSplits: {}, // Not used for ROC
      },
      {
        id: 'pref',
        type: 'preferred_return',
        hurdleIrr: 0.08, // 8% hurdle
        distributionSplits: {
          lp: 1.0, // LP gets 100% of preferred return
          gp: 0.0,
        },
      },
      {
        id: 'promote',
        type: 'promote',
        enableCatchUp: false, // Catch-up disabled (baseline v0.3 behavior)
        distributionSplits: {
          lp: 0.7,
          gp: 0.3,
        },
      },
    ],
  };

  return {
    ...defaultConfig,
    ...overrides,
    equityClasses: overrides?.equityClasses ?? defaultConfig.equityClasses,
    tiers: overrides?.tiers ?? defaultConfig.tiers,
  };
}

/**
 * Builds a waterfall config specifically designed to test catch-up behavior.
 * 
 * This config creates a scenario where catch-up can be clearly observed:
 * - LP contributes 90%, GP contributes 10%
 * - Preferred return goes 100% to LP until 8% hurdle is met
 * - Catch-up phase: distributions allocated to reach 70/30 target split
 * - Promote phase: distributions follow 70/30 split after catch-up
 * 
 * @param overrides - Optional overrides for specific fields
 * @returns WaterfallConfig with catch-up enabled
 */
export function buildWaterfallConfigWithCatchUp(
  overrides?: Partial<WaterfallConfig>
): WaterfallConfig {
  const defaultConfig: WaterfallConfig = {
    equityClasses: [
      {
        id: 'lp',
        name: 'Limited Partner',
        contributionPct: 0.9, // LP contributes 90%
      },
      {
        id: 'gp',
        name: 'General Partner',
        contributionPct: 0.1, // GP contributes 10%
      },
    ],
    tiers: [
      {
        id: 'roc',
        type: 'return_of_capital',
        distributionSplits: {}, // Not used for ROC
      },
      {
        id: 'pref',
        type: 'preferred_return',
        hurdleIrr: 0.08, // 8% hurdle
        distributionSplits: {
          lp: 1.0, // LP gets 100% of preferred return
          gp: 0.0,
        },
      },
      {
        id: 'promote',
        type: 'promote',
        enableCatchUp: true, // Catch-up enabled
        catchUpTargetSplit: {
          lp: 0.7, // Target: 70% LP, 30% GP after catch-up
          gp: 0.3,
        },
        distributionSplits: {
          lp: 0.7, // Promote split: 70/30
          gp: 0.3,
        },
      },
    ],
  };

  return {
    ...defaultConfig,
    ...overrides,
    equityClasses: overrides?.equityClasses ?? defaultConfig.equityClasses,
    tiers: overrides?.tiers ?? defaultConfig.tiers,
  };
}

/**
 * Builds a simple single-tier waterfall config (v0.2 style).
 * 
 * This is useful for testing backward compatibility.
 * 
 * @param overrides - Optional overrides for specific fields
 * @returns WaterfallConfig without tiers (single-tier mode)
 */
export function buildSingleTierWaterfallConfig(
  overrides?: Partial<WaterfallConfig>
): WaterfallConfig {
  const defaultConfig: WaterfallConfig = {
    equityClasses: [
      {
        id: 'lp',
        name: 'Limited Partner',
        contributionPct: 0.7,
        distributionPct: 0.7,
      },
      {
        id: 'gp',
        name: 'General Partner',
        contributionPct: 0.3,
        distributionPct: 0.3,
      },
    ],
    // No tiers - uses single-tier v0.2 logic
  };

  return {
    ...defaultConfig,
    ...overrides,
    equityClasses: overrides?.equityClasses ?? defaultConfig.equityClasses,
  };
}

/**
 * Builds a waterfall config with clawback enabled for volatile cash flow scenarios (v0.6).
 * 
 * This config is designed to test clawback behavior with volatile cash flows:
 * - High profits early, losses later (triggers clawback)
 * - Clawback enabled with hypothetical liquidation method
 * - Can be configured for final_period or annual evaluation
 * 
 * @param overrides - Optional overrides for specific fields
 * @param clawbackTrigger - When clawback is evaluated ('final_period' or 'annual')
 * @returns WaterfallConfig with clawback enabled
 */
export function buildClawbackScenario(
  overrides?: Partial<WaterfallConfig>,
  clawbackTrigger: 'final_period' | 'annual' = 'final_period'
): WaterfallConfig {
  const defaultConfig: WaterfallConfig = {
    equityClasses: [
      {
        id: 'lp',
        name: 'Limited Partner',
        contributionPct: 0.9, // LP contributes 90%
      },
      {
        id: 'gp',
        name: 'General Partner',
        contributionPct: 0.1, // GP contributes 10%
      },
    ],
    tiers: [
      {
        id: 'roc',
        type: 'return_of_capital',
        distributionSplits: {}, // Not used for ROC
      },
      {
        id: 'pref',
        type: 'preferred_return',
        hurdleIrr: 0.08, // 8% hurdle
        distributionSplits: {
          lp: 1.0, // LP gets 100% of preferred return
          gp: 0.0,
        },
      },
      {
        id: 'promote',
        type: 'promote',
        enableCatchUp: true, // Catch-up enabled
        catchUpTargetSplit: {
          lp: 0.7,
          gp: 0.3,
        },
        enableClawback: true, // v0.6: Clawback enabled
        clawbackTrigger: clawbackTrigger,
        clawbackMethod: 'hypothetical_liquidation', // v0.6: Hypothetical liquidation method
        distributionSplits: {
          lp: 0.7,
          gp: 0.3,
        },
      },
    ],
  };

  return {
    ...defaultConfig,
    ...overrides,
    equityClasses: overrides?.equityClasses ?? defaultConfig.equityClasses,
    tiers: overrides?.tiers ?? defaultConfig.tiers,
  };
}

/**
 * Builds a custom waterfall config with specified tiers.
 * 
 * @param equityClasses - Array of equity class configs
 * @param tiers - Optional array of waterfall tiers
 * @returns WaterfallConfig
 */
export function buildCustomWaterfallConfig(
  equityClasses: WaterfallConfig['equityClasses'],
  tiers?: WaterfallTier[]
): WaterfallConfig {
  return {
    equityClasses,
    tiers,
  };
}

