/**
 * Operations engine utilities (v3.5: Operational Logic).
 *
 * Provides shared utilities for operation engines including seasonality adjustment
 * and operational expense calculations.
 */
import type { AnnualPnl, MonthlyPnl } from '@domain/types';

export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_MONTH = 30;

/**
 * Default seasonality curve (flat, no seasonality).
 * All months normalized to 1.0.
 */
const DEFAULT_SEASONALITY_CURVE: number[] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

/**
 * Normalizes a seasonality curve to average 1.0.
 * Ensures that the average of all 12 months equals 1.0.
 * 
 * @param curve - Array of 12 monthly multipliers (0..12)
 * @returns Normalized curve array (average = 1.0)
 * 
 * @example
 * // Input: [1.2, 1.2, 1.0, 1.0, 0.8, 0.8, 0.8, 0.8, 1.0, 1.0, 1.2, 1.2]
 * // Average: 1.0, normalized output will average to 1.0
 */
export function normalizeSeasonalityCurve(curve: number[]): number[] {
  if (curve.length !== 12) {
    throw new Error('Seasonality curve must have exactly 12 values (one per month)');
  }

  // Calculate average
  const sum = curve.reduce((acc, val) => acc + val, 0);
  const average = sum / 12;

  // If average is already ~1.0 (within tolerance), return as-is
  const TOLERANCE = 0.001;
  if (Math.abs(average - 1.0) < TOLERANCE) {
    return [...curve];
  }

  // Normalize: divide each value by average so new average = 1.0
  return curve.map(val => val / average);
}

/**
 * Gets the seasonality curve from config, defaulting to flat curve if not provided.
 * Normalizes the curve to ensure average = 1.0.
 * 
 * @param configCurve - Optional seasonality curve from config (length 12)
 * @returns Normalized seasonality curve (average = 1.0)
 */
export function getSeasonalityCurve(configCurve?: number[]): number[] {
  if (!configCurve || configCurve.length === 0) {
    return [...DEFAULT_SEASONALITY_CURVE];
  }

  if (configCurve.length !== 12) {
    throw new Error('Seasonality curve must have exactly 12 values (one per month)');
  }

  // Normalize to ensure average = 1.0
  return normalizeSeasonalityCurve(configCurve);
}

/**
 * Applies seasonality adjustment to a base value for a specific month.
 * 
 * Formula: adjustedValue = baseValue * seasonalityCurve[monthIndex]
 * 
 * @param baseValue - Base value to adjust (revenue, occupancy, etc.)
 * @param monthIndex - Month index (0-11, where 0 = January, 11 = December)
 * @param curve - Seasonality curve array (length 12, should average to 1.0)
 * @returns Seasonality-adjusted value
 * 
 * @example
 * // Apply 20% increase in peak season (month 0 = January, curve[0] = 1.2)
 * const baseRevenue = 100000;
 * const seasonalityCurve = [1.2, 1.2, 1.0, 1.0, 0.8, 0.8, 0.8, 0.8, 1.0, 1.0, 1.2, 1.2];
 * const adjustedRevenue = applySeasonality(baseRevenue, 0, seasonalityCurve); // Returns 120000
 */
export function applySeasonality(
  baseValue: number,
  monthIndex: number,
  curve: number[]
): number {
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error(`Month index must be between 0 and 11, got ${monthIndex}`);
  }

  if (curve.length !== 12) {
    throw new Error('Seasonality curve must have exactly 12 values');
  }

  const multiplier = curve[monthIndex];
  return baseValue * multiplier;
}

/**
 * Applies ramp-up factor to a value based on operational ramp-up configuration.
 * v5.2: Operational Ramp-up
 * 
 * @param value - Base value to adjust (revenue, occupancy, etc.)
 * @param month - Absolute month number (0-based, where 0 = first month of operations)
 * @param config - Ramp-up configuration (optional)
 * @returns Ramp-up adjusted value
 * 
 * @example
 * // Linear ramp-up over 12 months
 * const baseRevenue = 100000;
 * const rampUpConfig = { rampUpMonths: 12, rampUpCurve: 'linear', startMonth: 0, ... };
 * const adjustedRevenue = applyRampUp(baseRevenue, 0, rampUpConfig); // Returns 10000 (10% of base)
 * const adjustedRevenue = applyRampUp(baseRevenue, 6, rampUpConfig); // Returns 55000 (55% of base)
 * const adjustedRevenue = applyRampUp(baseRevenue, 12, rampUpConfig); // Returns 100000 (100% of base)
 */
export function applyRampUp(
  value: number,
  month: number,
  config?: { rampUpMonths: number; rampUpCurve: 'linear' | 's-curve' | 'exponential' | 'custom'; startMonth: number; customFactors?: number[] }
): number {
  // If no ramp-up config, return value as-is
  if (!config) {
    return value;
  }

  // Calculate months since ramp-up started
  const monthsSinceStart = month - config.startMonth;

  // If before ramp-up starts, return 0 (or minimal value)
  if (monthsSinceStart < 0) {
    return 0;
  }

  // If after ramp-up period, return full value
  if (monthsSinceStart >= config.rampUpMonths) {
    return value;
  }

  // Calculate ramp-up factor based on curve type
  let factor: number;

  switch (config.rampUpCurve) {
    case 'linear':
      // Linear: factor = monthsSinceStart / rampUpMonths
      factor = monthsSinceStart / config.rampUpMonths;
      break;

    case 's-curve':
      // S-curve: Use sigmoid function (similar to construction S-curve)
      // Normalize progress to [0, 1]
      const progress = monthsSinceStart / config.rampUpMonths;
      // Sigmoid: 0.5 * (1 + sin(π * (progress - 0.5)))
      factor = 0.5 * (1 + Math.sin(Math.PI * (progress - 0.5)));
      break;

    case 'exponential':
      // Exponential: factor = 1 - e^(-monthsSinceStart / rampUpMonths)
      factor = 1 - Math.exp(-monthsSinceStart / config.rampUpMonths);
      break;

    case 'custom':
      // Custom: Use customFactors array
      if (config.customFactors && config.customFactors.length > monthsSinceStart) {
        factor = config.customFactors[monthsSinceStart];
      } else {
        // Fallback to linear if custom factors not provided
        factor = monthsSinceStart / config.rampUpMonths;
      }
      break;

    default:
      // Default to linear
      factor = monthsSinceStart / config.rampUpMonths;
  }

  // Clamp factor to [0, 1]
  factor = Math.max(0, Math.min(1, factor));

  return value * factor;
}

/**
 * Helper to sum all revenue components for a monthly P&L entry.
 */
function sumMonthlyRevenue(month: MonthlyPnl): number {
  return month.roomRevenue + month.foodRevenue + month.beverageRevenue + month.otherRevenue;
}

type AggregationOptions = {
  /** Optional per-month adjustment to COGS (e.g., commissions calculated on room revenue). */
  cogsAdjustmentPerMonth?: (month: MonthlyPnl) => number;
};

/**
 * Aggregates monthly P&L entries into annual P&L using consistent 12-month grouping.
 *
 * Ensures all operation engines share the same roll-up convention and rounding behavior.
 */
export function aggregateAnnualPnl(
  monthlyPnl: MonthlyPnl[],
  horizonYears: number,
  operationId: string,
  options: AggregationOptions = {}
): AnnualPnl[] {
  const annualPnl: AnnualPnl[] = [];

  for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
    const yearMonths = monthlyPnl.filter((m) => m.yearIndex === yearIndex);

    const revenueTotal = yearMonths.reduce((sum, m) => sum + sumMonthlyRevenue(m), 0);
    const baseCogsTotal = yearMonths.reduce((sum, m) => sum + m.foodCogs + m.beverageCogs, 0);
    const cogsAdjustment = options.cogsAdjustmentPerMonth
      ? yearMonths.reduce((sum, m) => sum + options.cogsAdjustmentPerMonth!(m), 0)
      : 0;
    const cogsTotal = baseCogsTotal + cogsAdjustment;

    const opexTotal = yearMonths.reduce(
      (sum, m) => sum + m.payroll + m.utilities + m.marketing + m.maintenanceOpex + m.otherOpex,
      0
    );
    const ebitda = yearMonths.reduce((sum, m) => sum + m.ebitda, 0);
    const noi = yearMonths.reduce((sum, m) => sum + m.noi, 0);
    const maintenanceCapex = yearMonths.reduce((sum, m) => sum + m.maintenanceCapex, 0);
    const cashFlow = yearMonths.reduce((sum, m) => sum + m.cashFlow, 0);

    annualPnl.push({
      yearIndex,
      operationId,
      revenueTotal,
      cogsTotal,
      opexTotal,
      ebitda,
      noi,
      maintenanceCapex,
      cashFlow,
    });
  }

  return annualPnl;
}

