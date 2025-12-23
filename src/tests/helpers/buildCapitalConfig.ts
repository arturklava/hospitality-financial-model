/**
 * Helper functions to build valid, deterministic capital structure configs for testing.
 * 
 * These helpers ensure that capital configurations can be easily instantiated in tests
 * with realistic but deterministic values for v0.5 Capital Stack 2.0 features.
 * 
 * v0.5 Test Matrix Coverage:
 * - Single-tranche (v0.4 compatibility)
 * - Multi-tranche (2-3 tranches with different rates/terms)
 * - Refinancing (at least one tranche refinanced mid-horizon)
 * 
 * ============================================================================
 * v0.5 Test Matrix Summary
 * ============================================================================
 * 
 * Operation Coverage:
 *   ✅ All 9 operation types (HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, 
 *      RETAIL, FLEX, WELLNESS, SENIOR_LIVING) - already full from v0.4
 * 
 * Capital Coverage:
 *   ✅ Single-tranche: v0.4-style configs with `amount` field (backward compatibility)
 *   ✅ Multi-tranche: 2-3 tranches with different rates, terms, and amortization types
 *   ✅ Refinancing: At least one tranche refinanced mid-horizon (simple "pay off old, start new")
 * 
 * Waterfall Coverage:
 *   ✅ Baseline: Multi-tier waterfall (v0.3) without catch-up (matches v0.4 behavior)
 *   ✅ Catch-up: Waterfall v2 with catch-up provisions enabled
 * 
 * Pipeline Coverage:
 *   ✅ All-ops stress test: All 9 operations + multi-tranche capital + refinancing + catch-up
 *   ✅ All existing invariants: lengths, finiteness, debt/waterfall invariants, KPIs
 * 
 * Scenario Comparison Coverage:
 *   ✅ Scenario Builder v1: Build at least 2 scenarios, run through pipeline, build summaries
 *   ✅ Qualitative comparison: Scenarios with different leverage show different equity IRRs
 * 
 * Test Helpers:
 *   - buildSingleTrancheCapitalConfig(): v0.4-style single tranche
 *   - buildMultiTrancheCapitalConfig(): 2-3 tranches with different characteristics
 *   - buildRefinancingCapitalConfig(): Refinancing scenario
 *   - buildBaselineWaterfallConfig(): v0.3 multi-tier without catch-up
 *   - buildWaterfallConfigWithCatchUp(): v0.5 waterfall with catch-up enabled
 * 
 * ============================================================================
 */

import type {
  CapitalStructureConfig,
  DebtExecution,
} from '@domain/types';

/**
 * Builds a v0.4-style single-tranche capital config for backward compatibility testing.
 * 
 * This reproduces a v0.4-style config using the `amount` field (backward compatibility).
 * 
 * @param overrides - Optional overrides for specific fields
 * @returns CapitalStructureConfig with a single debt tranche
 */
export function buildSingleTrancheCapitalConfig(
  overrides?: Partial<CapitalStructureConfig>
): CapitalStructureConfig {
  const defaultConfig: CapitalStructureConfig = {
    initialInvestment: 50000000, // $50M
    debt: [
      {
        id: 'senior-loan',
        amount: 30000000, // $30M (60% LTV) - v0.4 backward compatibility
        interestRate: 0.08, // 8%
        termYears: 10,
        amortizationYears: 10,
      },
    ],
  };

  return {
    ...defaultConfig,
    ...overrides,
    debt: overrides?.debt ?? defaultConfig.debt,
  };
}

/**
 * Builds a multi-tranche capital config with 2-3 tranches with different rates/terms.
 * 
 * This tests v0.5 Capital Stack 2.0 multi-tranche support:
 * - Senior loan: lower rate, longer term
 * - Mezzanine debt: higher rate, shorter term
 * - Optional third tranche: bridge loan
 * 
 * @param overrides - Optional overrides for specific fields
 * @returns CapitalStructureConfig with multiple debt tranches
 */
export function buildMultiTrancheCapitalConfig(
  overrides?: Partial<CapitalStructureConfig>
): CapitalStructureConfig {
  const defaultConfig: CapitalStructureConfig = {
    initialInvestment: 100000000, // $100M
    debt: [
      {
        id: 'senior-loan',
        label: 'Senior Loan',
        type: 'SENIOR',
        initialPrincipal: 50000000, // $50M
        interestRate: 0.06, // 6%
        amortizationType: 'mortgage',
        termYears: 10,
        amortizationYears: 10,
        startYear: 0,
      },
      {
        id: 'mezz-debt',
        label: 'Mezzanine Debt',
        type: 'MEZZ',
        initialPrincipal: 20000000, // $20M
        interestRate: 0.12, // 12%
        amortizationType: 'mortgage',
        termYears: 7,
        amortizationYears: 7,
        startYear: 0,
      },
      {
        id: 'bridge-loan',
        label: 'Bridge Loan',
        type: 'BRIDGE',
        initialPrincipal: 10000000, // $10M
        interestRate: 0.10, // 10%
        amortizationType: 'interest_only',
        termYears: 5,
        ioYears: 3, // 3 years IO, then full repayment
        startYear: 0,
      },
    ],
  };

  return {
    ...defaultConfig,
    ...overrides,
    debt: overrides?.debt ?? defaultConfig.debt,
  };
}

/**
 * Builds a capital config with at least one tranche refinanced mid-horizon.
 * 
 * This tests v0.5 simple refinancing model:
 * - Original tranche: starts at Year 0, refinanced at Year 3
 * - Refinanced tranche: starts at Year 3 with principal ≈ repaid amount
 * 
 * @param overrides - Optional overrides for specific fields
 * @returns CapitalStructureConfig with refinancing scenario
 */
export function buildRefinancingCapitalConfig(
  overrides?: Partial<CapitalStructureConfig>
): CapitalStructureConfig {
  const defaultConfig: CapitalStructureConfig = {
    initialInvestment: 50000000, // $50M
    debt: [
      {
        id: 'original-loan',
        label: 'Original Senior Loan',
        type: 'SENIOR',
        initialPrincipal: 30000000, // $30M
        interestRate: 0.08, // 8%
        amortizationType: 'mortgage',
        termYears: 5,
        amortizationYears: 5,
        startYear: 0,
        refinanceAtYear: 3, // Refinance at Year 3
      },
      {
        id: 'refinanced-loan',
        label: 'Refinanced Senior Loan',
        type: 'SENIOR',
        initialPrincipal: 19200000, // Approx remaining balance after 3 years of amortization (30M - 3*3.6M ≈ 19.2M)
        interestRate: 0.07, // 7% (lower rate after refinancing)
        amortizationType: 'mortgage',
        termYears: 5,
        amortizationYears: 5,
        startYear: 3, // Starts in same year as refinancing
      },
    ],
  };

  return {
    ...defaultConfig,
    ...overrides,
    debt: overrides?.debt ?? defaultConfig.debt,
  };
}

/**
 * Builds a complex capital config with multiple tranches AND fees (v0.6).
 * 
 * This tests v0.6 Capital Stack 2.1 with transaction costs:
 * - Multiple tranches with different characteristics
 * - Origination fees (reduce net proceeds at startYear)
 * - Exit fees (paid at maturity or refinanceAtYear)
 * 
 * @param overrides - Optional overrides for specific fields
 * @returns CapitalStructureConfig with multiple tranches and fees
 */
export function buildComplexCapitalConfig(
  overrides?: Partial<CapitalStructureConfig>
): CapitalStructureConfig {
  const defaultConfig: CapitalStructureConfig = {
    initialInvestment: 100000000, // $100M
    debt: [
      {
        id: 'senior-loan',
        label: 'Senior Loan',
        type: 'SENIOR',
        initialPrincipal: 50000000, // $50M
        interestRate: 0.06, // 6%
        amortizationType: 'mortgage',
        termYears: 10,
        amortizationYears: 10,
        startYear: 0,
        originationFeePct: 0.01, // 1% origination fee
        exitFeePct: 0.005, // 0.5% exit fee
      },
      {
        id: 'mezz-debt',
        label: 'Mezzanine Debt',
        type: 'MEZZ',
        initialPrincipal: 20000000, // $20M
        interestRate: 0.12, // 12%
        amortizationType: 'mortgage',
        termYears: 7,
        amortizationYears: 7,
        startYear: 0,
        originationFeePct: 0.02, // 2% origination fee (higher for mezz)
        exitFeePct: 0.01, // 1% exit fee
      },
      {
        id: 'bridge-loan',
        label: 'Bridge Loan',
        type: 'BRIDGE',
        initialPrincipal: 10000000, // $10M
        interestRate: 0.10, // 10%
        amortizationType: 'interest_only',
        termYears: 5,
        ioYears: 3,
        startYear: 0,
        refinanceAtYear: 5, // Refinance at Year 5
        originationFeePct: 0.015, // 1.5% origination fee
        exitFeePct: 0.0075, // 0.75% exit fee (paid at refinance)
      },
      {
        id: 'refinanced-bridge',
        label: 'Refinanced Bridge Loan',
        type: 'BRIDGE',
        initialPrincipal: 10000000, // Approx remaining balance
        interestRate: 0.08, // Lower rate after refinancing
        amortizationType: 'mortgage',
        termYears: 5,
        amortizationYears: 5,
        startYear: 5, // Starts in same year as refinancing
        originationFeePct: 0.01, // 1% origination fee for refinanced loan
        exitFeePct: 0.005, // 0.5% exit fee
      },
    ],
  };

  return {
    ...defaultConfig,
    ...overrides,
    debt: overrides?.debt ?? defaultConfig.debt,
  };
}

/**
 * Builds a simple capital config for testing specific scenarios.
 * 
 * @param initialInvestment - Total project investment
 * @param tranches - Array of debt tranche configs
 * @returns CapitalStructureConfig
 */
export function buildCustomCapitalConfig(
  initialInvestment: number,
  tranches: DebtExecution[]
): CapitalStructureConfig {
  return {
    initialInvestment,
    debt: tranches,
  };
}

