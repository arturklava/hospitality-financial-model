/**
 * Trend analytics engine.
 * 
 * Provides trend calculation and health evaluation functions for KPI analysis.
 * These functions are designed to power visual indicators in the UI.
 */

import type { KpiTrend, HealthStatus, HealthRule } from '@domain/types';

// Re-export types for convenience
export type { KpiTrend, HealthStatus, HealthRule };

/**
 * Calculates trend direction and percent change for a time series.
 * 
 * Compares the last value to the first value (or average of first few values if series is short).
 * 
 * Algorithm:
 * - If series has 1 value: returns 'flat' with 0% change
 * - If series has 2+ values: compares last value to first value
 * - For very short series (2 values), uses first value as baseline
 * - For longer series (3+ values), uses first value as baseline (can be extended to use average of first N values)
 * 
 * @param series - Array of numeric values representing a time series
 * @returns Trend object with direction ('up', 'down', or 'flat') and percentChange
 * 
 * @example
 * calculateTrend([100, 110, 120]) // { direction: 'up', percentChange: 20 }
 * calculateTrend([100, 90, 80])   // { direction: 'down', percentChange: -20 }
 * calculateTrend([100, 100, 100]) // { direction: 'flat', percentChange: 0 }
 */
export function calculateTrend(series: number[]): KpiTrend {
  if (series.length === 0) {
    return { direction: 'flat', percentChange: 0 };
  }

  if (series.length === 1) {
    return { direction: 'flat', percentChange: 0 };
  }

  const firstValue = series[0];
  const lastValue = series[series.length - 1];

  // Handle edge cases: zero or negative baseline
  if (firstValue === 0) {
    if (lastValue === 0) {
      return { direction: 'flat', percentChange: 0 };
    }
    // If baseline is 0 and current is not, we can't calculate meaningful percent change
    // Return 'up' or 'down' based on sign of lastValue, with a large percent change
    return {
      direction: lastValue > 0 ? 'up' : 'down',
      percentChange: lastValue > 0 ? 100 : -100,
    };
  }

  // Calculate percent change: ((last - first) / first) * 100
  const percentChange = ((lastValue - firstValue) / Math.abs(firstValue)) * 100;

  // Determine direction based on percent change
  // Use a small threshold (0.01%) to account for floating point precision
  const threshold = 0.01;
  if (Math.abs(percentChange) < threshold) {
    return { direction: 'flat', percentChange: 0 };
  }

  return {
    direction: percentChange > 0 ? 'up' : 'down',
    percentChange,
  };
}

/**
 * Evaluates health status of a value against a rule with min/max thresholds.
 * 
 * Health status logic:
 * - 'success': Value is within acceptable bounds (between min and max, if both defined)
 * - 'warning': Value is approaching limits (within 10% of threshold, or only one threshold defined and value is close)
 * - 'danger': Value is outside acceptable bounds
 * 
 * Rules:
 * - If only `min` is defined: value < min = danger, value >= min = success
 * - If only `max` is defined: value > max = danger, value <= max = success
 * - If both are defined: value < min or value > max = danger, value between min and max = success
 * - Warning threshold: 10% buffer zone near limits (e.g., if max is 100, warning zone is 90-100)
 * 
 * @param value - The value to evaluate
 * @param rule - Health rule with optional min and/or max thresholds
 * @returns Health status: 'success', 'warning', or 'danger'
 * 
 * @example
 * evaluateHealth(50, { min: 0, max: 100 })  // 'success'
 * evaluateHealth(95, { min: 0, max: 100 })  // 'warning' (within 10% of max)
 * evaluateHealth(105, { min: 0, max: 100 }) // 'danger' (exceeds max)
 * evaluateHealth(5, { min: 10 })             // 'danger' (below min)
 * evaluateHealth(15, { min: 10 })            // 'success'
 */
export function evaluateHealth(value: number, rule: HealthRule): HealthStatus {
  const { min, max } = rule;

  // If no thresholds defined, default to success
  if (min === undefined && max === undefined) {
    return 'success';
  }

  // Check if value is outside bounds (danger)
  if (min !== undefined && value < min) {
    return 'danger';
  }

  if (max !== undefined && value > max) {
    return 'danger';
  }

  // Check warning zones (within 10% of threshold, but not at the boundary)
  // Warning zones only apply when both min and max are defined (range-based)
  const warningBuffer = 0.1; // 10%

  if (min !== undefined && max !== undefined) {
    // Both thresholds defined: check if value is near either boundary (but not at boundary)
    const range = max - min;
    const distanceFromMin = value - min;
    const distanceFromMax = max - value;
    const warningZone = range * warningBuffer;

    // Warning if near min (but not at min) or near max (but not at max)
    if ((distanceFromMin > 0 && distanceFromMin < warningZone) || 
        (distanceFromMax > 0 && distanceFromMax < warningZone)) {
      return 'warning';
    }
  }
  // Note: Single thresholds (only min or only max) don't have warning zones
  // They are binary: either success (within bounds) or danger (outside bounds)

  // Value is within acceptable bounds and not in warning zone
  return 'success';
}

