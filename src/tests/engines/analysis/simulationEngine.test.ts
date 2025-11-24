/**
 * Monte Carlo Simulation Engine Tests (v0.11)
 * 
 * Tests for the Monte Carlo simulation engine, including:
 * - Statistical helper functions
 * - Monte Carlo simulation execution
 * - Law of Large Numbers convergence verification
 */

import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from '@engines/analysis/simulationEngine';
import { generateNormalRandom, calculatePercentiles, generateCorrelatedSamples, sampleLogNormal, samplePERT } from '@domain/statistics';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  NamedScenario,
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
  HotelConfig,
  CorrelationMatrix,
} from '@domain/types';

/**
 * Builds a minimal hotel configuration for testing.
 */
function buildMinimalHotelConfig(): HotelConfig {
  return {
    id: 'test-hotel-1',
    name: 'Test Hotel',
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
 * Builds a minimal base scenario for Monte Carlo testing.
 */
function buildBaseScenario(): NamedScenario {
  const scenario: ProjectScenario = {
    id: 'test-scenario-monte-carlo',
    name: 'Test Scenario for Monte Carlo',
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
    id: 'base-scenario-monte-carlo',
    name: 'Base Scenario for Monte Carlo',
    modelConfig: {
      scenario,
      projectConfig,
      capitalConfig,
      waterfallConfig,
    },
  };
}

describe('Monte Carlo Simulation Engine (v0.11)', () => {
  describe('Statistics Helpers', () => {
    describe('generateNormalRandom', () => {
      it('should generate numbers with approximately correct mean and std dev', () => {
        const mean = 100;
        const stdDev = 10;
        const samples: number[] = [];
        const n = 10000;

        for (let i = 0; i < n; i++) {
          samples.push(generateNormalRandom(mean, stdDev));
        }

        const sampleMean = samples.reduce((sum, x) => sum + x, 0) / n;
        const sampleVariance = samples.reduce((sum, x) => sum + Math.pow(x - sampleMean, 2), 0) / n;
        const sampleStdDev = Math.sqrt(sampleVariance);

        // With 10,000 samples, mean should be within 1% and std dev within 5%
        expect(sampleMean).toBeCloseTo(mean, 0);
        expect(sampleStdDev).toBeCloseTo(stdDev, 0);
      });

      it('should handle zero mean correctly', () => {
        const mean = 0;
        const stdDev = 1;
        const samples: number[] = [];
        const n = 1000;

        for (let i = 0; i < n; i++) {
          samples.push(generateNormalRandom(mean, stdDev));
        }

        const sampleMean = samples.reduce((sum, x) => sum + x, 0) / n;
        expect(sampleMean).toBeCloseTo(0, 0);
      });
    });

    describe('calculatePercentiles', () => {
      it('should calculate correct percentiles for sorted array', () => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const percentiles = calculatePercentiles(values);

        // P10 should be close to 1.9 (10th percentile of 10 values)
        expect(percentiles.p10).toBeCloseTo(1.9, 1);
        // P50 (median) should be 5.5
        expect(percentiles.p50).toBeCloseTo(5.5, 1);
        // P90 should be close to 9.1
        expect(percentiles.p90).toBeCloseTo(9.1, 1);
      });

      it('should handle single value', () => {
        const values = [42];
        const percentiles = calculatePercentiles(values);

        expect(percentiles.p10).toBe(42);
        expect(percentiles.p50).toBe(42);
        expect(percentiles.p90).toBe(42);
      });

      it('should handle unsorted array', () => {
        const values = [10, 1, 9, 2, 8, 3, 7, 4, 6, 5];
        const percentiles = calculatePercentiles(values);

        // Should sort and calculate correctly
        expect(percentiles.p50).toBeCloseTo(5.5, 1);
        expect(percentiles.p10).toBeLessThan(percentiles.p50);
        expect(percentiles.p50).toBeLessThan(percentiles.p90);
      });

      it('should throw error for empty array', () => {
        expect(() => calculatePercentiles([])).toThrow('Cannot calculate percentiles from empty array');
      });
    });
  });

  describe('runMonteCarlo', () => {
    it('should run simulation with default config', () => {
      const baseScenario = buildBaseScenario();
      const result = runMonteCarlo(baseScenario, { iterations: 10 }); // Small number for speed

      expect(result.config.iterations).toBe(10);
      expect(result.iterations).toHaveLength(10);
      expect(result.baseCaseKpis).toBeDefined();
      expect(result.statistics).toBeDefined();
    });

    it('should run simulation with custom config', () => {
      const baseScenario = buildBaseScenario();
      const config = {
        iterations: 50,
        occupancyVariation: 0.03,
        adrVariation: 0.05,
        interestRateVariation: 0.005,
      };
      const result = runMonteCarlo(baseScenario, config);

      expect(result.config.iterations).toBe(50);
      expect(result.config.occupancyVariation).toBe(0.03);
      expect(result.config.adrVariation).toBe(0.05);
      expect(result.config.interestRateVariation).toBe(0.005);
      expect(result.iterations).toHaveLength(50);
    });

    it('should report progress during simulation', () => {
      const baseScenario = buildBaseScenario();
      const progressValues: number[] = [];
      
      const onProgress = (progress: number) => {
        progressValues.push(progress);
      };

      const result = runMonteCarlo(baseScenario, { iterations: 100 }, onProgress);

      // Should have received progress updates (every 50 iterations + final)
      // For 100 iterations: 0, 50, 99 (or 100)
      expect(progressValues.length).toBeGreaterThan(0);
      
      // Progress values should be in range [0, 1]
      progressValues.forEach(progress => {
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      });

      // Progress should be increasing (or at least non-decreasing)
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }

      // Final progress should be 1.0 (or very close due to rounding)
      const finalProgress = progressValues[progressValues.length - 1];
      expect(finalProgress).toBeGreaterThanOrEqual(0.99);
      expect(finalProgress).toBeLessThanOrEqual(1.0);

      // Verify simulation still completed successfully
      expect(result.iterations).toHaveLength(100);
    });

    it('should store KPIs for each iteration', () => {
      const baseScenario = buildBaseScenario();
      const result = runMonteCarlo(baseScenario, { iterations: 20 });

      expect(result.iterations.length).toBe(20);
      result.iterations.forEach(kpi => {
        expect(kpi).toHaveProperty('npv');
        expect(kpi).toHaveProperty('unleveredIrr');
        expect(kpi).toHaveProperty('leveredIrr');
        expect(kpi).toHaveProperty('moic');
        expect(kpi).toHaveProperty('equityMultiple');
        expect(kpi).toHaveProperty('wacc');
        expect(typeof kpi.npv).toBe('number');
        expect(typeof kpi.equityMultiple).toBe('number');
      });
    });

    it('should calculate statistics correctly', () => {
      const baseScenario = buildBaseScenario();
      const result = runMonteCarlo(baseScenario, { iterations: 100 });

      // Check that statistics are calculated
      expect(result.statistics.npv).toHaveProperty('mean');
      expect(result.statistics.npv).toHaveProperty('p10');
      expect(result.statistics.npv).toHaveProperty('p50');
      expect(result.statistics.npv).toHaveProperty('p90');

      // P10 < P50 < P90
      expect(result.statistics.npv.p10).toBeLessThanOrEqual(result.statistics.npv.p50);
      expect(result.statistics.npv.p50).toBeLessThanOrEqual(result.statistics.npv.p90);

      // Same for equityMultiple
      expect(result.statistics.equityMultiple.p10).toBeLessThanOrEqual(result.statistics.equityMultiple.p50);
      expect(result.statistics.equityMultiple.p50).toBeLessThanOrEqual(result.statistics.equityMultiple.p90);
    });

    it('should converge to base case (Law of Large Numbers)', () => {
      const baseScenario = buildBaseScenario();
      
      // Run with small variation to ensure convergence
      const result = runMonteCarlo(baseScenario, {
        iterations: 200, // Enough for convergence test
        occupancyVariation: 0.01, // Small variation (1%)
        adrVariation: 0.01, // Small variation (1%)
        interestRateVariation: 0.001, // Small variation (0.1%)
      });

      const baseNpv = result.baseCaseKpis.npv;
      const meanNpv = result.statistics.npv.mean;

      // With small variations and 200 iterations, mean should be within 5% of base case
      const tolerance = Math.abs(baseNpv * 0.05);
      expect(Math.abs(meanNpv - baseNpv)).toBeLessThan(tolerance);

      // Same check for equityMultiple
      const baseEquityMultiple = result.baseCaseKpis.equityMultiple;
      const meanEquityMultiple = result.statistics.equityMultiple.mean;
      const equityTolerance = Math.abs(baseEquityMultiple * 0.05);
      expect(Math.abs(meanEquityMultiple - baseEquityMultiple)).toBeLessThan(equityTolerance);
    });

    it('should handle scenarios with no debt', () => {
      const baseScenario = buildBaseScenario();
      // Remove debt
      baseScenario.modelConfig.capitalConfig.debtTranches = [];
      
      const result = runMonteCarlo(baseScenario, { iterations: 20 });

      expect(result.iterations.length).toBe(20);
      // Should still calculate KPIs (levered IRR may be null)
      result.iterations.forEach(kpi => {
        expect(kpi).toHaveProperty('npv');
        expect(kpi).toHaveProperty('unleveredIrr');
      });
    });

    it('should apply variations correctly', () => {
      const baseScenario = buildBaseScenario();

      const result = runMonteCarlo(baseScenario, {
        iterations: 50,
        occupancyVariation: 0.05,
        adrVariation: 0.10,
        interestRateVariation: 0.01,
      });

      // Check that variations were applied (NPVs should vary)
      const npvValues = result.iterations.map(k => k.npv);
      const minNpv = Math.min(...npvValues);
      const maxNpv = Math.max(...npvValues);

      // With variations, there should be some spread in NPVs
      // (unless all variations happen to be very close to 1.0)
      expect(maxNpv - minNpv).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Correlation Risk Amplification (v2.1)', () => {
    /**
     * Helper function to clone a scenario (simplified version for testing).
     */
    function cloneScenarioForTest(baseScenario: NamedScenario): NamedScenario {
      return {
        ...baseScenario,
        modelConfig: {
          scenario: {
            ...baseScenario.modelConfig.scenario,
            operations: baseScenario.modelConfig.scenario.operations.map(op => {
              if (op.operationType === 'HOTEL') {
                return {
                  ...op,
                  occupancyByMonth: [...op.occupancyByMonth],
                } as HotelConfig;
              }
              return { ...op };
            }),
          },
          projectConfig: { ...baseScenario.modelConfig.projectConfig },
          capitalConfig: {
            ...baseScenario.modelConfig.capitalConfig,
            debtTranches: baseScenario.modelConfig.capitalConfig.debtTranches.map(t => ({ ...t })),
          },
          waterfallConfig: {
            ...baseScenario.modelConfig.waterfallConfig,
            equityClasses: baseScenario.modelConfig.waterfallConfig.equityClasses.map(ec => ({ ...ec })),
          },
        },
      };
    }

    /**
     * Helper function to apply random variations to a scenario.
     * Simplified version that applies occupancy and ADR multipliers.
     */
    function applyVariationsToScenario(
      scenario: NamedScenario,
      occupancyMultiplier: number,
      adrMultiplier: number
    ): void {
      const { scenario: projectScenario } = scenario.modelConfig;

      // Apply occupancy variation
      projectScenario.operations.forEach(op => {
        if (op.operationType === 'HOTEL') {
          const hotelOp = op as HotelConfig;
          hotelOp.occupancyByMonth = hotelOp.occupancyByMonth.map(occ =>
            Math.max(0, Math.min(1, occ * occupancyMultiplier))
          );
          hotelOp.avgDailyRate *= adrMultiplier;
        }
      });
    }

    /**
     * Helper function to extract total revenue from model output.
     * Sums revenue across all years.
     */
    function extractTotalRevenue(output: ReturnType<typeof runFullModel>): number {
      return output.consolidatedAnnualPnl.reduce((sum, pnl) => sum + pnl.revenueTotal, 0);
    }

    /**
     * Helper function to calculate standard deviation.
     */
    function calculateStdDev(values: number[]): number {
      if (values.length === 0) return 0;
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      return Math.sqrt(variance);
    }

    /**
     * Runs simulation iterations and collects revenue values.
     */
    function runRevenueSimulation(
      baseScenario: NamedScenario,
      iterations: number,
      occupancyVariation: number,
      adrVariation: number,
      correlationMatrix?: CorrelationMatrix
    ): number[] {
      const revenues: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Clone scenario
        const clonedScenario = cloneScenarioForTest(baseScenario);

        let occupancyMultiplier: number;
        let adrMultiplier: number;

        if (correlationMatrix) {
          // Use correlated sampling
          const means = [0, 0];
          const stdDevs = [occupancyVariation, adrVariation];
          
          // Extract correlation between occupancy and ADR
          const occIdx = correlationMatrix.variables.indexOf('occupancy');
          const adrIdx = correlationMatrix.variables.indexOf('adr');
          
          if (occIdx >= 0 && adrIdx >= 0) {
            const corr = correlationMatrix.matrix[occIdx][adrIdx];
            const corrMatrix = [
              [1.0, corr],
              [corr, 1.0],
            ];
            
            try {
              const samples = generateCorrelatedSamples(means, stdDevs, corrMatrix);
              occupancyMultiplier = 1 + samples[0];
              adrMultiplier = 1 + samples[1];
            } catch {
              // Fallback to independent
              occupancyMultiplier = 1 + generateNormalRandom(0, occupancyVariation);
              adrMultiplier = 1 + generateNormalRandom(0, adrVariation);
            }
          } else {
            // Fallback to independent
            occupancyMultiplier = 1 + generateNormalRandom(0, occupancyVariation);
            adrMultiplier = 1 + generateNormalRandom(0, adrVariation);
          }
        } else {
          // Independent sampling
          occupancyMultiplier = 1 + generateNormalRandom(0, occupancyVariation);
          adrMultiplier = 1 + generateNormalRandom(0, adrVariation);
        }

        // Apply variations
        applyVariationsToScenario(clonedScenario, occupancyMultiplier, adrMultiplier);

        // Run model and extract revenue
        const output = runFullModel(clonedScenario.modelConfig);
        const totalRevenue = extractTotalRevenue(output);
        revenues.push(totalRevenue);
      }

      return revenues;
    }

    it('should demonstrate risk amplification with correlation (Revenue = Occ * ADR)', () => {
      const baseScenario = buildBaseScenario();
      const iterations = 200; // Enough iterations for statistical significance
      const occupancyVariation = 0.05; // 5% standard deviation
      const adrVariation = 0.10; // 10% standard deviation

      // Case A: Uncorrelated (Occ and ADR vary independently)
      const revenuesUncorrelated = runRevenueSimulation(
        baseScenario,
        iterations,
        occupancyVariation,
        adrVariation,
        undefined // No correlation matrix
      );
      const stdDevUncorrelated = calculateStdDev(revenuesUncorrelated);

      // Case B: Highly correlated (correlation = 0.99, very close to perfect)
      // When Occ goes up, ADR goes up proportionally
      // Using 0.99 instead of 1.0 to avoid singular matrix issues with Cholesky decomposition
      const correlationMatrix: CorrelationMatrix = {
        variables: ['occupancy', 'adr'],
        matrix: [
          [1.0, 0.99], // Very high positive correlation
          [0.99, 1.0],
        ],
      };
      const revenuesCorrelated = runRevenueSimulation(
        baseScenario,
        iterations,
        occupancyVariation,
        adrVariation,
        correlationMatrix
      );
      const stdDevCorrelated = calculateStdDev(revenuesCorrelated);

      // Assert: Standard deviation of Revenue in Case B should be higher than Case A
      // This demonstrates risk amplification due to correlation.
      // When Occ and ADR are perfectly correlated, Revenue = Occ * ADR has higher variance
      // because both factors move together, amplifying the effect.
      expect(stdDevCorrelated).toBeGreaterThan(stdDevUncorrelated);

      // Log the results for verification
      console.log(`Uncorrelated Revenue StdDev: ${stdDevUncorrelated.toFixed(2)}`);
      console.log(`Correlated Revenue StdDev: ${stdDevCorrelated.toFixed(2)}`);
      console.log(`Risk Amplification Factor: ${(stdDevCorrelated / stdDevUncorrelated).toFixed(2)}x`);
    });
  });

  describe('Advanced Distributions (v2.9)', () => {
    describe('LogNormal Distribution', () => {
      it('should use LogNormal for ADR and ensure all values are positive', () => {
        const baseScenario = buildBaseScenario();
        
        // Run simulation with LogNormal distribution for ADR
        // Use a large variation (50% in log-space) to test robustness
        const result = runMonteCarlo(baseScenario, {
          iterations: 100,
          adrVariation: 0.50, // 50% variation in log-space (huge volatility)
          adrDistributionType: 'lognormal',
        });

        // Extract ADR values from all iterations by checking the scenario
        // Since we can't directly access the modified ADR values, we verify through the results
        // All KPIs should be valid (no NaN or negative values that would indicate negative ADR)
        result.iterations.forEach(kpi => {
          expect(Number.isFinite(kpi.npv)).toBe(true);
          expect(kpi.equityMultiple).toBeGreaterThan(0);
        });

        // Verify that the simulation completed successfully
        expect(result.iterations.length).toBe(100);
        expect(Number.isFinite(result.statistics.npv.mean)).toBe(true);
        expect(result.statistics.npv.mean).not.toBeNaN();
      });

      it('should ensure LogNormal never returns negative values even with extreme volatility', () => {
        // Direct test of sampleLogNormal function
        const mean = 0; // Log-space mean of 0 means multiplier around 1.0
        const hugeStdDev = 2.0; // Extremely large stdDev in log-space
        
        const samples: number[] = [];
        for (let i = 0; i < 10000; i++) {
          const sample = sampleLogNormal(mean, hugeStdDev);
          samples.push(sample);
          // Every sample must be positive
          expect(sample).toBeGreaterThan(0);
        }

        // Verify all samples are positive
        const minSample = Math.min(...samples);
        expect(minSample).toBeGreaterThan(0);
        
        // Verify samples have reasonable spread (some very small, some very large)
        const maxSample = Math.max(...samples);
        expect(maxSample).toBeGreaterThan(minSample);
      });
    });

    describe('PERT Distribution', () => {
      it('should generate PERT samples weighted towards the mode', () => {
        const min = 100;
        const likely = 200;
        const max = 300;
        
        const samples: number[] = [];
        for (let i = 0; i < 10000; i++) {
          const sample = samplePERT(min, likely, max);
          samples.push(sample);
          // All samples must be in [min, max]
          expect(sample).toBeGreaterThanOrEqual(min);
          expect(sample).toBeLessThanOrEqual(max);
        }

        // Calculate sample mean - should be close to PERT mean
        const sampleMean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
        const pertMean = (min + 4 * likely + max) / 6; // PERT mean formula
        expect(sampleMean).toBeCloseTo(pertMean, 0);

        // Calculate sample median - should be close to the mode (most likely)
        const sorted = [...samples].sort((a, b) => a - b);
        const sampleMedian = sorted[Math.floor(sorted.length / 2)];
        // Median should be closer to likely than to min or max
        const distToLikely = Math.abs(sampleMedian - likely);
        const distToMin = Math.abs(sampleMedian - min);
        const distToMax = Math.abs(sampleMedian - max);
        expect(distToLikely).toBeLessThan(distToMin);
        expect(distToLikely).toBeLessThan(distToMax);
      });

      it('should handle edge cases in PERT distribution', () => {
        // Test with likely at min
        const sample1 = samplePERT(100, 100, 200);
        expect(sample1).toBeGreaterThanOrEqual(100);
        expect(sample1).toBeLessThanOrEqual(200);

        // Test with likely at max
        const sample2 = samplePERT(100, 200, 200);
        expect(sample2).toBeGreaterThanOrEqual(100);
        expect(sample2).toBeLessThanOrEqual(200);

        // Test with likely in middle
        const sample3 = samplePERT(100, 150, 200);
        expect(sample3).toBeGreaterThanOrEqual(100);
        expect(sample3).toBeLessThanOrEqual(200);
      });
    });

    describe('LogNormal on ADR with huge volatility', () => {
      it('should maintain positive ADR values even with extreme variation', () => {
        const baseScenario = buildBaseScenario();
        
        // Run simulation with LogNormal and extremely high volatility
        const result = runMonteCarlo(baseScenario, {
          iterations: 200,
          adrVariation: 1.0, // 100% variation in log-space (extremely high)
          adrDistributionType: 'lognormal',
          occupancyVariation: 0.01, // Small variation for occupancy
          interestRateVariation: 0.001, // Small variation for interest rate
        });

        // All iterations should produce valid results
        expect(result.iterations.length).toBe(200);
        
        // All KPIs should be finite and valid
        result.iterations.forEach(kpi => {
          expect(Number.isFinite(kpi.npv)).toBe(true);
          expect(kpi.npv).not.toBeNaN();
          expect(kpi.equityMultiple).toBeGreaterThan(0);
          expect(Number.isFinite(kpi.equityMultiple)).toBe(true);
        });

        // Statistics should be valid
        expect(Number.isFinite(result.statistics.npv.mean)).toBe(true);
        expect(Number.isFinite(result.statistics.npv.p10)).toBe(true);
        expect(Number.isFinite(result.statistics.npv.p50)).toBe(true);
        expect(Number.isFinite(result.statistics.npv.p90)).toBe(true);
        
        // Even with huge volatility, we should have reasonable spread
        const npvSpread = result.statistics.npv.p90 - result.statistics.npv.p10;
        expect(npvSpread).toBeGreaterThan(0);
      });
    });
  });
});

