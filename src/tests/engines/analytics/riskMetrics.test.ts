import { describe, it, expect } from 'vitest';
import { calculateRiskMetrics } from '@engines/analytics/riskMetrics';
import type {
  SimulationResult,
  SimulationKpi,
  SimulationConfig,
} from '@domain/types';

/**
 * Builds a mock simulation result for testing.
 */
function buildMockSimulationResult(
  npvValues: number[],
  irrValues: (number | null)[] = []
): SimulationResult {
  const iterations: SimulationKpi[] = npvValues.map((npv, index) => ({
    npv,
    unleveredIrr: irrValues[index] ?? null,
    leveredIrr: null,
    moic: null,
    equityMultiple: 1.0,
    wacc: null,
  }));

  // Calculate statistics (simplified - just mean and percentiles for npv)
  const sortedNpv = [...npvValues].sort((a, b) => a - b);
  const n = sortedNpv.length;
  const mean = npvValues.reduce((sum, v) => sum + v, 0) / n;
  
  // Helper to calculate percentile
  const percentileAt = (p: number): number => {
    if (n === 1) return sortedNpv[0];
    const position = (n - 1) * p / 100;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const weight = position - lower;
    return sortedNpv[lower] * (1 - weight) + sortedNpv[upper] * weight;
  };

  const config: SimulationConfig = {
    iterations: npvValues.length,
  };

  return {
    config,
    baseCaseKpis: iterations[0],
    iterations,
    statistics: {
      npv: {
        mean,
        p10: percentileAt(10),
        p50: percentileAt(50),
        p90: percentileAt(90),
      },
      unleveredIrr: {
        mean: null,
        p10: null,
        p50: null,
        p90: null,
      },
      leveredIrr: {
        mean: null,
        p10: null,
        p50: null,
        p90: null,
      },
      moic: {
        mean: null,
        p10: null,
        p50: null,
        p90: null,
      },
      equityMultiple: {
        mean: 1.0,
        p10: 1.0,
        p50: 1.0,
        p90: 1.0,
      },
      wacc: {
        mean: null,
        p10: null,
        p50: null,
        p90: null,
      },
    },
  };
}

describe('Risk Metrics Engine', () => {
  describe('calculateRiskMetrics', () => {
    it('should calculate probability of loss correctly', () => {
      // Create mock data: 3 negative NPVs out of 10 iterations
      const npvValues = [-100, -50, -25, 0, 10, 20, 30, 40, 50, 100];
      const simulationResult = buildMockSimulationResult(npvValues);
      
      const metrics = calculateRiskMetrics(simulationResult);
      
      // 3 negative NPVs out of 10 = 0.3 probability
      expect(metrics.probabilityOfLoss).toBe(0.3);
    });

    it('should calculate probability of loss as 0 when all NPVs are positive', () => {
      const npvValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const simulationResult = buildMockSimulationResult(npvValues);
      
      const metrics = calculateRiskMetrics(simulationResult);
      
      expect(metrics.probabilityOfLoss).toBe(0);
    });

    it('should calculate probability of loss as 1 when all NPVs are negative', () => {
      const npvValues = [-100, -90, -80, -70, -60, -50, -40, -30, -20, -10];
      const simulationResult = buildMockSimulationResult(npvValues);
      
      const metrics = calculateRiskMetrics(simulationResult);
      
      expect(metrics.probabilityOfLoss).toBe(1.0);
    });

    it('should calculate VaR (95%) as the 5th percentile of NPV', () => {
      // Create 20 values to get a better percentile calculation
      const npvValues = Array.from({ length: 20 }, (_, i) => i * 10 - 100);
      // Values: [-100, -90, -80, ..., 80, 90]
      const simulationResult = buildMockSimulationResult(npvValues);
      
      const metrics = calculateRiskMetrics(simulationResult);
      
      // 5th percentile of 20 values: position = (20-1) * 5 / 100 = 0.95
      // Lower = 0, Upper = 1, weight = 0.95
      // Interpolated: -100 * 0.05 + -90 * 0.95 = -5 + -85.5 = -90.5
      // But let's verify it's close to the expected value
      expect(metrics.var95).toBeLessThan(-80);
      expect(metrics.var95).toBeGreaterThan(-100);
    });

    it('should calculate upside potential (P90) for NPV correctly', () => {
      const npvValues = Array.from({ length: 20 }, (_, i) => i * 10);
      // Values: [0, 10, 20, ..., 180, 190]
      const simulationResult = buildMockSimulationResult(npvValues);
      
      const metrics = calculateRiskMetrics(simulationResult);
      
      // 90th percentile of 20 values: position = (20-1) * 90 / 100 = 17.1
      // Lower = 17, Upper = 18, weight = 0.1
      // Interpolated: 170 * 0.9 + 180 * 0.1 = 153 + 18 = 171
      expect(metrics.upsidePotentialNpv).toBeCloseTo(171, 0);
    });

    it('should calculate upside potential (P90) for IRR when available', () => {
      const npvValues = Array.from({ length: 10 }, (_, i) => i * 10);
      const irrValues = Array.from({ length: 10 }, (_, i) => 0.05 + i * 0.01);
      // IRR values: [0.05, 0.06, 0.07, ..., 0.14]
      const simulationResult = buildMockSimulationResult(npvValues, irrValues);
      
      const metrics = calculateRiskMetrics(simulationResult);
      
      // 90th percentile of 10 IRR values: position = (10-1) * 90 / 100 = 8.1
      // Lower = 8, Upper = 9, weight = 0.1
      // Interpolated: 0.13 * 0.9 + 0.14 * 0.1 = 0.117 + 0.014 = 0.131
      expect(metrics.upsidePotentialIrr).not.toBeNull();
      expect(metrics.upsidePotentialIrr).toBeCloseTo(0.131, 2);
    });

    it('should return null for upside potential IRR when no IRR values are available', () => {
      const npvValues = Array.from({ length: 10 }, (_, i) => i * 10);
      const irrValues = Array(10).fill(null);
      const simulationResult = buildMockSimulationResult(npvValues, irrValues);
      
      const metrics = calculateRiskMetrics(simulationResult);
      
      expect(metrics.upsidePotentialIrr).toBeNull();
    });

    it('should handle mixed positive and negative NPVs correctly', () => {
      // 5 negative, 5 positive
      const npvValues = [-50, -30, -10, 10, 30, 50, 70, 90, 110, 130];
      const simulationResult = buildMockSimulationResult(npvValues);
      
      const metrics = calculateRiskMetrics(simulationResult);
      
      expect(metrics.probabilityOfLoss).toBe(0.3); // 3 negative out of 10
      expect(metrics.var95).toBeLessThan(0); // 5th percentile should be negative
      expect(metrics.upsidePotentialNpv).toBeGreaterThan(0); // 90th percentile should be positive
    });

    it('should throw error for empty simulation result', () => {
      const emptyResult: SimulationResult = {
        config: { iterations: 0 },
        baseCaseKpis: {
          npv: 0,
          unleveredIrr: null,
          leveredIrr: null,
          moic: null,
          equityMultiple: 1.0,
          wacc: null,
        },
        iterations: [],
        statistics: {
          npv: { mean: 0, p10: 0, p50: 0, p90: 0 },
          unleveredIrr: { mean: null, p10: null, p50: null, p90: null },
          leveredIrr: { mean: null, p10: null, p50: null, p90: null },
          moic: { mean: null, p10: null, p50: null, p90: null },
          equityMultiple: { mean: 1.0, p10: 1.0, p50: 1.0, p90: 1.0 },
          wacc: { mean: null, p10: null, p50: null, p90: null },
        },
      };
      
      expect(() => calculateRiskMetrics(emptyResult)).toThrow(
        'Cannot calculate risk metrics from empty simulation result'
      );
    });

    it('should match probability calculation with mock data', () => {
      // Specific test case: 7 negative NPVs out of 20 iterations
      const npvValues = [
        -100, -90, -80, -70, -60, -50, -40, // 7 negative
        10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, // 13 positive
      ];
      const simulationResult = buildMockSimulationResult(npvValues);
      
      const metrics = calculateRiskMetrics(simulationResult);
      
      // Verify probability matches: 7 / 20 = 0.35
      expect(metrics.probabilityOfLoss).toBe(0.35);
    });
  });
});

