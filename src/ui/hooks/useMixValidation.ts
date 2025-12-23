/**
 * useMixValidation Hook
 * 
 * Validates that a set of related percentage values doesn't exceed a limit.
 * Useful for ensuring OPEX totals don't exceed 100%, revenue mixes sum correctly, etc.
 */

import { useMemo } from 'react';

export interface UseMixValidationOptions {
    /** Object mapping field keys to their current values (as decimals, e.g., 0.35 for 35%) */
    values: Record<string, number>;
    /** Maximum allowed sum (default: 1.0 for 100%) */
    limit?: number;
    /** Threshold above which to show a warning (default: 0.8 for 80%) */
    warnThreshold?: number;
}

export interface UseMixValidationResult {
    /** Current sum of all values */
    total: number;
    /** How much "budget" remains before hitting the limit */
    remaining: number;
    /** True if total exceeds the limit */
    isOverLimit: boolean;
    /** True if total exceeds the warning threshold but not the limit */
    isWarning: boolean;
    /** Returns the maximum allowed value for a specific field (limit minus sum of other fields) */
    getMaxFor: (key: string) => number;
    /** Returns clamped value if it would exceed the remaining budget */
    clampValue: (key: string, newValue: number) => number;
}

/**
 * Hook for validating mix/percentage constraints across related fields.
 * 
 * @example
 * ```tsx
 * const opexValidation = useMixValidation({
 *   values: {
 *     payroll: 0.35,
 *     utilities: 0.05,
 *     marketing: 0.03,
 *   },
 *   limit: 1.0,
 *   warnThreshold: 0.8,
 * });
 * 
 * // Get max for a specific field
 * const maxPayroll = opexValidation.getMaxFor('payroll'); // 0.57 (1 - 0.05 - 0.03 - 0.35 + 0.35)
 * 
 * // Check if over limit
 * if (opexValidation.isOverLimit) {
 *   // Show error
 * }
 * ```
 */
export function useMixValidation({
    values,
    limit = 1.0,
    warnThreshold = 0.8,
}: UseMixValidationOptions): UseMixValidationResult {
    return useMemo(() => {
        const entries = Object.entries(values);
        const total = entries.reduce((sum, [, val]) => sum + (val || 0), 0);
        const remaining = Math.max(0, limit - total);
        const isOverLimit = total > limit;
        const isWarning = total > warnThreshold && total <= limit;

        const getMaxFor = (key: string): number => {
            const otherSum = entries
                .filter(([k]) => k !== key)
                .reduce((sum, [, val]) => sum + (val || 0), 0);
            return Math.max(0, limit - otherSum);
        };

        const clampValue = (key: string, newValue: number): number => {
            const maxAllowed = getMaxFor(key);
            return Math.min(newValue, maxAllowed);
        };

        return {
            total,
            remaining,
            isOverLimit,
            isWarning,
            getMaxFor,
            clampValue,
        };
    }, [values, limit, warnThreshold]);
}
