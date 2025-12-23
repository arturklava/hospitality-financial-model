/**
 * Financial utility functions for hospitality financial modeling.
 * All functions are pure and deterministic with explicit input/output types.
 */

/**
 * Calculates the Net Present Value (NPV) of a series of cash flows.
 *
 * @param rate - Discount rate as a decimal (e.g., 0.10 for 10%)
 * @param cashFlows - Array of cash flows, where year 0 is typically negative (investment)
 * @returns The NPV of the cash flows
 *
 * @example
 * // Investment of -1000 in year 0, returns of 500, 600, 700 in years 1-3, 10% discount rate
 * npv(0.10, [-1000, 500, 600, 700]) // ≈ 488.35
 */
export function npv(rate: number, cashFlows: number[]): number {
  if (cashFlows.length === 0) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    sum += cashFlows[i] / Math.pow(1 + rate, i);
  }
  return sum;
}

/**
 * Calculates the present value of a future cash flow.
 *
 * @param rate - Discount rate as a decimal
 * @param futureValue - Future cash flow amount
 * @param periods - Number of periods in the future
 * @returns Present value of the future cash flow
 */
export function presentValue(rate: number, futureValue: number, periods: number): number {
  return futureValue / Math.pow(1 + rate, periods);
}

/**
 * Calculates the future value of a present cash flow.
 *
 * @param rate - Interest rate as a decimal
 * @param presentValue - Present cash flow amount
 * @param periods - Number of periods in the future
 * @returns Future value of the present cash flow
 */
export function futureValue(rate: number, presentValue: number, periods: number): number {
  return presentValue * Math.pow(1 + rate, periods);
}

/**
 * Calculates the Internal Rate of Return (IRR) using binary search.
 *
 * Sign convention: Year 0 should normally be negative (investment).
 * Returns null if no valid root is found or all cash flows are 0.
 *
 * @param cashFlows - Array of cash flows, where year 0 is typically negative (investment)
 * @param tolerance - Tolerance for convergence (default: 1e-6)
 * @param maxIterations - Maximum number of iterations (default: 100)
 * @returns The IRR as a decimal, or null if no valid root is found
 *
 * @example
 * // Investment of -1000, returns of 500, 600, 700
 * irr([-1000, 500, 600, 700]) // ≈ 0.25 (25%)
 */
export function irr(
  cashFlows: number[],
  tolerance: number = 1e-6,
  maxIterations: number = 100
): number | null {
  if (cashFlows.length === 0) {
    return null;
  }

  // Check if all cash flows are zero
  const allZero = cashFlows.every((cf) => Math.abs(cf) < tolerance);
  if (allZero) {
    return null;
  }

  // Check if all cash flows are positive or all negative
  const allPositive = cashFlows.every((cf) => cf >= 0);
  const allNegative = cashFlows.every((cf) => cf <= 0);
  if (allPositive || allNegative) {
    return null;
  }

  // Binary search for IRR
  let low = -0.99; // -99% lower bound (IRR can't be less than -100%)
  let high = 10.0; // 1000% upper bound

  // Check if there's a sign change in NPV
  const npvLow = npv(low, cashFlows);
  const npvHigh = npv(high, cashFlows);

  // If both have the same sign, no valid IRR exists
  if (Math.sign(npvLow) === Math.sign(npvHigh)) {
    return null;
  }

  // Binary search
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid, cashFlows);

    if (Math.abs(npvMid) < tolerance) {
      return mid;
    }

    if (Math.sign(npvMid) === Math.sign(npvLow)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  // Return the midpoint if we've converged close enough
  const finalRate = (low + high) / 2;
  if (Math.abs(npv(finalRate, cashFlows)) < tolerance * 10) {
    return finalRate;
  }

  return null;
}

/**
 * Calculates the equity multiple.
 *
 * Equity multiple = (sum of positive flows) / (absolute sum of negative flows)
 *
 * @param cashFlows - Array of cash flows
 * @returns The equity multiple
 *
 * @example
 * // Investment of -1000, returns of 500, 600, 700
 * equityMultiple([-1000, 500, 600, 700]) // = 1800 / 1000 = 1.8
 */
export function equityMultiple(cashFlows: number[]): number {
  if (cashFlows.length === 0) {
    return 0;
  }

  let positiveSum = 0;
  let negativeSum = 0;

  for (const cf of cashFlows) {
    if (cf > 0) {
      positiveSum += cf;
    } else {
      negativeSum += Math.abs(cf);
    }
  }

  if (negativeSum === 0) {
    return positiveSum > 0 ? Infinity : 0;
  }

  return positiveSum / negativeSum;
}

/**
 * Calculates the payback period in years.
 *
 * @param cashFlows - Array of cash flows, where year 0 is typically negative (investment)
 * @returns The payback period in years, or null if payback never occurs
 *
 * @example
 * // Investment of -1000, returns of 500, 600, 700
 * paybackPeriod([-1000, 500, 600, 700]) // = 1.83 (payback occurs in year 1.83)
 */
export function paybackPeriod(cashFlows: number[]): number | null {
  if (cashFlows.length === 0) {
    return null;
  }

  let cumulativeCashFlow = 0;

  for (let i = 0; i < cashFlows.length; i++) {
    const previousCumulative = cumulativeCashFlow;
    cumulativeCashFlow += cashFlows[i];

    // If we've broken even in this period
    if (cumulativeCashFlow >= 0 && previousCumulative < 0) {
      // Linear interpolation to find exact payback point
      // We need to recover Math.abs(previousCumulative) amount
      // In this period we get cashFlows[i] amount
      const fraction = Math.abs(previousCumulative) / cashFlows[i];
      // Payback happens during period i, so we've completed (i-1) full periods
      // and part of period i. Return (i-1) + fraction.
      return i > 0 ? i - 1 + fraction : fraction;
    }

    // If we've already broken even at the start (year 0 is positive or zero)
    if (cumulativeCashFlow >= 0 && i === 0) {
      return 0;
    }
  }

  // Payback never occurred
  return null;
}

