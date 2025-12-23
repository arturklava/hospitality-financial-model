/**
 * Performance Tests for Monte Carlo Simulation (v0.11)
 * 
 * Tests the performance and validity of Monte Carlo simulation with 1,000 iterations.
 * Ensures the simulation completes within acceptable time limits and that statistical
 * results are consistent with the base case.
 */

import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from '@engines/analysis/simulationEngine';
import type {
  NamedScenario,
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
  HotelConfig,
} from '@domain/types';

/**
 * Builds a minimal hotel configuration for performance testing.
 */
function buildMinimalHotelConfig(): HotelConfig {
  return {
    id: 'perf-hotel-1',
    name: 'Performance Test Hotel',
    operationType: 'HOTEL',
    startYear: 2026,
    horizonYears: 5,
    keys: 100, // 100 rooms
    avgDailyRate: 200, // $200 per room per night
    occupancyByMonth: Array(12).fill(0.70), // 70% occupancy year-round

    // Revenue mix as % of room revenue
    foodRevenuePctOfRooms: 0.30,
    beverageRevenuePctOfRooms: 0.15,
    otherRevenuePctOfRooms: 0.10,

    // COGS as % of respective revenue
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,

    // Opex as % of total revenue
    payrollPct: 0.35,
    utilitiesPct: 0.05,
    marketingPct: 0.03,
    maintenanceOpexPct: 0.04,
    otherOpexPct: 0.03,

    // Maintenance capex as % of total revenue
    maintenanceCapexPct: 0.02,
  };
}

/**
 * Builds a base scenario for performance testing.
 */
function buildBaseScenario(): NamedScenario {
  const scenario: ProjectScenario = {
    id: 'perf-test-scenario',
    name: 'Performance Test Scenario',
    startYear: 2026,
    horizonYears: 5,
    operations: [buildMinimalHotelConfig()],
  };

  const projectConfig: ProjectConfig = {
    discountRate: 0.10, // 10% discount rate
    terminalGrowthRate: 0.02, // 2% terminal growth
    initialInvestment: 20_000_000, // $20M initial investment
    workingCapitalPercentage: 0.05, // 5% of revenue
  };

  const capitalConfig: CapitalStructureConfig = {
    initialInvestment: projectConfig.initialInvestment,
    debtTranches: [
      {
        id: 'loan-1',
        initialPrincipal: 10_000_000, // $10M debt (50% LTV)
        interestRate: 0.06, // 6% interest rate
        amortizationType: 'mortgage',
        termYears: 10,
        amortizationYears: 10,
      },
    ],
  };

  const waterfallConfig: WaterfallConfig = {
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
  };

  return {
    id: 'perf-base-scenario',
    name: 'Performance Base Scenario',
    modelConfig: {
      scenario,
      projectConfig,
      capitalConfig,
      waterfallConfig,
    },
  };
}

describe('Monte Carlo Simulation Performance Tests (v0.11)', () => {
  describe('1,000 Iteration Simulation', () => {
    it('should complete 1,000 iteration simulation within 2-3 seconds', () => {
      const baseScenario = buildBaseScenario();

      // Start timing
      const startTime = performance.now();

      // Run Monte Carlo with 1,000 iterations
      const result = runMonteCarlo(baseScenario, {
        iterations: 1000,
        occupancyVariation: 0.05, // 5% standard deviation
        adrVariation: 0.10, // 10% standard deviation
        interestRateVariation: 0.01, // 1% standard deviation
      });

      // End timing
      const endTime = performance.now();
      const elapsedSeconds = (endTime - startTime) / 1000;

      // Assert: Simulation completed
      expect(result.config.iterations).toBe(1000);
      expect(result.iterations).toHaveLength(1000);
      expect(result.baseCaseKpis).toBeDefined();
      expect(result.statistics).toBeDefined();

      // Assert: Performance benchmark - should complete within 3 seconds
      // (allowing some margin for slower machines, but targeting 2-3 seconds)
      expect(elapsedSeconds).toBeLessThan(3.5); // 3.5 seconds as upper bound

      // Log performance for monitoring
      console.log(`Monte Carlo 1,000 iterations completed in ${elapsedSeconds.toFixed(2)} seconds`);

      // Assert: All iterations have valid KPIs
      result.iterations.forEach(kpi => {
        expect(Number.isFinite(kpi.npv)).toBe(true);
        expect(Number.isFinite(kpi.equityMultiple)).toBe(true);
        // IRR can be null, but if it exists, it should be finite
        if (kpi.unleveredIrr !== null) {
          expect(Number.isFinite(kpi.unleveredIrr)).toBe(true);
        }
        if (kpi.leveredIrr !== null) {
          expect(Number.isFinite(kpi.leveredIrr)).toBe(true);
        }
      });

      // Assert: Statistics are calculated correctly
      expect(result.statistics.npv).toHaveProperty('mean');
      expect(result.statistics.npv).toHaveProperty('p10');
      expect(result.statistics.npv).toHaveProperty('p50');
      expect(result.statistics.npv).toHaveProperty('p90');

      // P10 < P50 < P90 (percentiles should be ordered)
      expect(result.statistics.npv.p10).toBeLessThanOrEqual(result.statistics.npv.p50);
      expect(result.statistics.npv.p50).toBeLessThanOrEqual(result.statistics.npv.p90);
    });

    it('should have P50 (Median) IRR close to Base Case IRR', () => {
      const baseScenario = buildBaseScenario();

      // Run Monte Carlo with 1,000 iterations
      // Use small variations to ensure median converges to base case
      const result = runMonteCarlo(baseScenario, {
        iterations: 1000,
        occupancyVariation: 0.02, // 2% standard deviation (small variation)
        adrVariation: 0.02, // 2% standard deviation (small variation)
        interestRateVariation: 0.005, // 0.5% standard deviation (small variation)
      });

      // Get base case IRR (prefer unlevered, fall back to levered if available)
      const baseCaseIrr = result.baseCaseKpis.unleveredIrr ?? result.baseCaseKpis.leveredIrr;
      const p50Irr = result.statistics.unleveredIrr?.p50 ?? result.statistics.leveredIrr?.p50;

      // Both should be defined for this test
      expect(baseCaseIrr).not.toBeNull();
      expect(p50Irr).not.toBeNull();

      if (baseCaseIrr !== null && p50Irr !== null) {
        // With 1,000 iterations and small variations, P50 should be close to base case
        // Allow a small margin: ±2% relative difference or ±0.01 absolute difference
        const relativeDifference = Math.abs((p50Irr - baseCaseIrr) / baseCaseIrr);
        const absoluteDifference = Math.abs(p50Irr - baseCaseIrr);

        // Assert: P50 IRR is within acceptable margin of base case
        // Using a tolerance that accounts for statistical variation
        // With 1,000 iterations and 2% input variation, we expect P50 to be within ~3-5% of base case
        const maxRelativeDifference = 0.05; // 5% relative tolerance
        const maxAbsoluteDifference = 0.02; // 2% absolute tolerance (for IRR as decimal)

        expect(relativeDifference).toBeLessThan(maxRelativeDifference);
        expect(absoluteDifference).toBeLessThan(maxAbsoluteDifference);

        // Log for monitoring
        console.log(
          `Base Case IRR: ${(baseCaseIrr * 100).toFixed(2)}%, ` +
          `P50 IRR: ${(p50Irr * 100).toFixed(2)}%, ` +
          `Difference: ${(relativeDifference * 100).toFixed(2)}%`
        );
      }
    });

    it('should validate statistical properties of simulation results', () => {
      const baseScenario = buildBaseScenario();

      const result = runMonteCarlo(baseScenario, {
        iterations: 1000,
        occupancyVariation: 0.05,
        adrVariation: 0.10,
        interestRateVariation: 0.01,
      });

      // Assert: Base case KPIs are defined
      expect(result.baseCaseKpis).toBeDefined();
      expect(Number.isFinite(result.baseCaseKpis.npv)).toBe(true);
      expect(Number.isFinite(result.baseCaseKpis.equityMultiple)).toBe(true);

      // Assert: Statistics are calculated for all KPIs
      expect(result.statistics.npv).toBeDefined();
      expect(result.statistics.equityMultiple).toBeDefined();

      // Assert: Percentiles are ordered correctly for NPV
      expect(result.statistics.npv.p10).toBeLessThanOrEqual(result.statistics.npv.p50);
      expect(result.statistics.npv.p50).toBeLessThanOrEqual(result.statistics.npv.p90);

      // Assert: Percentiles are ordered correctly for Equity Multiple
      expect(result.statistics.equityMultiple.p10).toBeLessThanOrEqual(
        result.statistics.equityMultiple.p50
      );
      expect(result.statistics.equityMultiple.p50).toBeLessThanOrEqual(
        result.statistics.equityMultiple.p90
      );

      // Assert: Mean should be between P10 and P90 (generally, though not always true)
      // This is a sanity check - with symmetric distributions, mean should be near P50
      const npvMean = result.statistics.npv.mean;
      expect(npvMean).toBeGreaterThanOrEqual(result.statistics.npv.p10);
      expect(npvMean).toBeLessThanOrEqual(result.statistics.npv.p90);
    });
  });
});

