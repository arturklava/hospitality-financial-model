/**
 * Risk metrics analytics engine.
 * 
 * Provides risk metrics calculation from Monte Carlo simulation results.
 * These metrics are designed to be easily bound to UI Cards.
 */

import type { SimulationResult } from '@domain/types';

/**
 * Risk metrics calculated from simulation results.
 * 
 * Designed for easy binding to UI Cards.
 */
export interface RiskMetrics {
  /** Probability of loss (0..1): Count(Negative NPV) / Total Iterations */
  probabilityOfLoss: number;
  /** Value at Risk (95%): The NPV value at the 5th percentile */
  var95: number;
  /** Upside Potential (P90): The NPV at the 90th percentile */
  upsidePotentialNpv: number;
  /** Upside Potential (P90): The IRR at the 90th percentile (unlevered) */
  upsidePotentialIrr: number | null;
}

/**
 * Calculates a specific percentile from an array of values.
 * 
 * Uses linear interpolation between data points.
 * 
 * @param values - Array of numeric values (will be sorted)
 * @param percentile - Percentile value (0..100)
 * @returns Interpolated value at that percentile
 */
function calculatePercentileAt(values: number[], percentile: number): number {
  if (values.length === 0) {
    throw new Error('Cannot calculate percentile from empty array');
  }
  
  if (percentile < 0 || percentile > 100) {
    throw new Error('Percentile must be between 0 and 100');
  }
  
  // Sort values in ascending order
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  if (n === 1) {
    return sorted[0];
  }
  
  // Calculate position: (n - 1) * p / 100
  const position = (n - 1) * percentile / 100;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  
  // Linear interpolation between lower and upper indices
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculates risk metrics from Monte Carlo simulation results.
 * 
 * Metrics calculated:
 * - Probability of Loss: Count(Negative NPV) / Total Iterations
 * - VaR (95%): The NPV value at the 5th percentile
 * - Upside Potential (P90): The NPV/IRR at the 90th percentile
 * 
 * @param simulationResult - Results from Monte Carlo simulation
 * @returns Risk metrics formatted for UI Cards
 */
export function calculateRiskMetrics(
  simulationResult: SimulationResult
): RiskMetrics {
  const { iterations } = simulationResult;
  
  if (iterations.length === 0) {
    throw new Error('Cannot calculate risk metrics from empty simulation result');
  }
  
  // Extract NPV values
  const npvValues = iterations.map(kpi => kpi.npv);
  
  // Calculate Probability of Loss: Count(Negative NPV) / Total Iterations
  const negativeNpvCount = npvValues.filter(npv => npv < 0).length;
  const probabilityOfLoss = negativeNpvCount / iterations.length;
  
  // Calculate VaR (95%): The NPV value at the 5th percentile
  const var95 = calculatePercentileAt(npvValues, 5);
  
  // Calculate Upside Potential (P90): The NPV at the 90th percentile
  // We can use the existing statistics.p90, but we'll calculate it directly for consistency
  const upsidePotentialNpv = calculatePercentileAt(npvValues, 90);
  
  // Calculate Upside Potential (P90) for IRR: The IRR at the 90th percentile
  // Filter out null values for IRR
  const irrValues = iterations
    .map(kpi => kpi.unleveredIrr)
    .filter((irr): irr is number => irr !== null);
  
  const upsidePotentialIrr = irrValues.length > 0
    ? calculatePercentileAt(irrValues, 90)
    : null;
  
  return {
    probabilityOfLoss,
    var95,
    upsidePotentialNpv,
    upsidePotentialIrr,
  };
}

