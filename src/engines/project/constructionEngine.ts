/**
 * Construction engine.
 * Generates construction drawdown curves and distributes funding between equity and debt sources.
 * 
 * v3.6: Construction Logic
 * v5.1: S-Curve Logic - Added generateSCurve with sigmoid-based S-curve, linear, and early shapes
 */

/**
 * Generates a monthly drawdown curve from total construction budget.
 * 
 * Returns monthly drawdown amounts (positive values) that sum to the total budget.
 * 
 * @param total - Total construction budget
 * @param months - Number of months for construction duration
 * @param type - Drawdown curve type: 's-curve' (Sigmoid-like) or 'linear' (equal monthly)
 * @returns Array of monthly drawdown amounts (length = months, sum = total)
 * 
 * @example
 * // S-curve over 12 months
 * generateDrawdownCurve(12000000, 12, 's-curve') // [small, small, ..., large, ..., small, small]
 * 
 * // Linear over 12 months
 * generateDrawdownCurve(12000000, 12, 'linear') // [1000000, 1000000, ..., 1000000]
 */
export function generateDrawdownCurve(
  total: number,
  months: number,
  type: 's-curve' | 'linear' = 's-curve'
): number[] {
  if (months <= 0) {
    throw new Error('Construction duration must be greater than 0 months');
  }
  
  if (total <= 0) {
    throw new Error('Total construction budget must be greater than 0');
  }

  if (type === 'linear') {
    // Equal monthly drawdowns
    const monthlyAmount = total / months;
    return new Array(months).fill(monthlyAmount);
  }

  // S-curve: Use cosine approximation for cumulative distribution
  // Pattern: Slow start (10-15%) → Peak (60-70%) → Slow finish (15-20%)
  const drawdowns: number[] = [];
  
  for (let i = 0; i < months; i++) {
    const progressStart = i / months;
    const progressEnd = (i + 1) / months;
    
    // Cumulative distribution function (CDF) using cosine approximation
    // Transforms linear progress (0 to 1) into S-curve cumulative percentage (0 to 1)
    const cdfStart = sCurveCdf(progressStart);
    const cdfEnd = sCurveCdf(progressEnd);
    
    // Monthly drawdown = difference in cumulative percentages × total
    const monthlyDrawdown = total * (cdfEnd - cdfStart);
    drawdowns.push(monthlyDrawdown);
  }

  // Normalize to ensure exact sum (account for floating-point precision)
  const sum = drawdowns.reduce((acc, val) => acc + val, 0);
  const difference = total - sum;
  
  // Adjust the last month to ensure exact sum
  if (Math.abs(difference) > 0.01) { // Only adjust if difference is significant (> 1 cent)
    drawdowns[months - 1] += difference;
  }

  // Invariant check: sum should equal total (within floating-point precision)
  const finalSum = drawdowns.reduce((acc, val) => acc + val, 0);
  if (Math.abs(finalSum - total) > 0.01) {
    console.warn(
      `[Construction Engine] Drawdown sum (${finalSum}) does not equal total (${total}). Difference: ${Math.abs(finalSum - total)}`
    );
  }

  return drawdowns;
}

/**
 * S-curve cumulative distribution function (CDF) using cosine approximation.
 * 
 * Transforms linear progress (0 to 1) into S-curve cumulative percentage (0 to 1).
 * 
 * @param x - Normalized progress (0 to 1)
 * @returns Cumulative percentage (0 to 1)
 * 
 * Formula: 0.5 * (1 + sin(π * (x - 0.5)))
 * This produces an S-curve that starts slow, accelerates in the middle, then slows at the end.
 */
function sCurveCdf(x: number): number {
  // Clamp x to [0, 1] for safety
  const clampedX = Math.max(0, Math.min(1, x));
  
  // Cosine-based S-curve: 0.5 * (1 + sin(π * (x - 0.5)))
  // Alternative sigmoid-like function for smoother curve
  // Using sine function: produces smooth S-curve
  return 0.5 * (1 + Math.sin(Math.PI * (clampedX - 0.5)));
}

/**
 * Distributes construction drawdowns between equity and debt sources.
 * 
 * Returns monthly equity draws and debt draws that sum to the monthly drawdowns.
 * 
 * @param drawdowns - Monthly construction drawdowns (positive values)
 * @param debtCap - Total debt capacity (maximum debt funding available)
 * @param equityCap - Total equity capacity (maximum equity funding available)
 * @param method - Funding distribution method: 'equity_first' (use equity until exhausted, then debt)
 * @returns Object with equityDraws and debtDraws arrays (both positive, same length as drawdowns)
 * 
 * @example
 * // Equity-first: $8M equity, $4M debt capacity, $10M total drawdowns
 * distributeFunding([2000000, 3000000, 3000000, 2000000], 4000000, 8000000, 'equity_first')
 * // Returns: { equityDraws: [2000000, 3000000, 3000000, 2000000], debtDraws: [0, 0, 0, 0] }
 */
export function distributeFunding(
  drawdowns: number[],
  debtCap: number,
  equityCap: number,
  method: 'equity_first' = 'equity_first'
): { equityDraws: number[]; debtDraws: number[] } {
  if (drawdowns.length === 0) {
    return { equityDraws: [], debtDraws: [] };
  }

  if (method !== 'equity_first') {
    throw new Error(`Funding distribution method '${method}' is not yet implemented. Only 'equity_first' is supported.`);
  }

  const equityDraws: number[] = [];
  const debtDraws: number[] = [];
  
  let remainingEquity = equityCap;
  let remainingDebt = debtCap;

  for (const drawdown of drawdowns) {
    if (drawdown < 0) {
      throw new Error('Drawdown amounts must be non-negative');
    }

    // Equity-first method: Use equity until exhausted, then debt
    let equityDraw = 0;
    let debtDraw = 0;

    if (remainingEquity > 0) {
      // Use equity first (up to remaining equity capacity)
      equityDraw = Math.min(drawdown, remainingEquity);
      remainingEquity -= equityDraw;
    }

    // If equity is insufficient, use debt
    const remainingDrawdown = drawdown - equityDraw;
    if (remainingDrawdown > 0) {
      if (remainingDebt <= 0) {
        throw new Error(
          `Insufficient funding capacity. ` +
          `Drawdown of ${drawdown} requires ${remainingDrawdown} more, but only ${remainingEquity + remainingDebt} remaining capacity.`
        );
      }
      
      debtDraw = Math.min(remainingDrawdown, remainingDebt);
      remainingDebt -= debtDraw;
    }

    // Invariant check: equityDraw + debtDraw should equal drawdown
    const totalDraw = equityDraw + debtDraw;
    if (Math.abs(totalDraw - drawdown) > 0.01) {
      console.warn(
        `[Construction Engine] Funding distribution mismatch: ` +
        `equityDraw (${equityDraw}) + debtDraw (${debtDraw}) = ${totalDraw}, ` +
        `but drawdown = ${drawdown}`
      );
      
      // Adjust to ensure exact match (within floating-point precision)
      const difference = drawdown - totalDraw;
      if (difference > 0 && remainingEquity > 0) {
        equityDraw += difference;
        remainingEquity -= difference;
      } else if (difference > 0 && remainingDebt > 0) {
        debtDraw += difference;
        remainingDebt -= difference;
      }
    }

    equityDraws.push(equityDraw);
    debtDraws.push(debtDraw);
  }

  return { equityDraws, debtDraws };
}

/**
 * Generates an S-Curve (Sigmoid) construction spending pattern.
 * v5.1: Construction Dynamics (The S-Curve)
 * 
 * Uses a Sigmoid or Cumulative Normal Distribution function to generate spending curves.
 * 
 * @param totalBudget - Total construction budget
 * @param months - Number of months for construction duration
 * @param shape - Curve shape: 'linear' (equal monthly), 's-curve' (low start/end, high middle), 'early' (front-loaded)
 * @returns Array of monthly spending amounts (length = months, sum = totalBudget exactly)
 * 
 * @example
 * // S-curve over 12 months
 * generateSCurve(12000000, 12, 's-curve') // [small, small, ..., large, ..., small, small]
 * 
 * // Linear over 12 months
 * generateSCurve(12000000, 12, 'linear') // [1000000, 1000000, ..., 1000000]
 * 
 * // Early/front-loaded over 12 months
 * generateSCurve(12000000, 12, 'early') // [large, large, ..., small, small]
 */
export function generateSCurve(
  totalBudget: number,
  months: number,
  shape: 'linear' | 's-curve' | 'early' = 's-curve'
): number[] {
  if (months <= 0) {
    throw new Error('Construction duration must be greater than 0 months');
  }
  
  if (totalBudget <= 0) {
    throw new Error('Total construction budget must be greater than 0');
  }

  // Linear: Equal monthly spending
  if (shape === 'linear') {
    const monthlyAmount = totalBudget / months;
    return new Array(months).fill(monthlyAmount);
  }

  // S-curve or Early: Use sigmoid-based cumulative distribution
  const spending: number[] = [];
  
  for (let i = 0; i < months; i++) {
    const progressStart = i / months;
    const progressEnd = (i + 1) / months;
    
    // Get cumulative distribution function values
    let cdfStart: number;
    let cdfEnd: number;
    
    if (shape === 'early') {
      // For early/front-loaded curve: use exponential decay function
      // CDF(x) = 1 - e^(-k*x) gives steep rise at start, flat at end
      // This produces high spending at start (steep rise), low spending at end (flat)
      const k = 5.0; // Steepness parameter (higher = steeper initial rise)
      cdfStart = 1 - Math.exp(-k * progressStart);
      cdfEnd = 1 - Math.exp(-k * progressEnd);
      
      // Ensure edge cases are handled
      if (progressStart <= 0) cdfStart = 0;
      if (progressEnd >= 1) cdfEnd = 1;
    } else {
      // S-curve: standard sigmoid (low at start, high in middle, low at end)
      cdfStart = sigmoidCdf(progressStart);
      cdfEnd = sigmoidCdf(progressEnd);
    }
    
    // Monthly spending = difference in cumulative percentages × total budget
    const monthlySpending = totalBudget * (cdfEnd - cdfStart);
    spending.push(monthlySpending);
  }

  // Normalize to ensure exact sum (distribute rounding errors)
  const sum = spending.reduce((acc, val) => acc + val, 0);
  const difference = totalBudget - sum;
  
  // Distribute rounding error proportionally to non-zero values
  // If all values are zero (shouldn't happen), adjust the first month
  if (Math.abs(difference) > 0.01) {
    const nonZeroCount = spending.filter(val => val > 0).length;
    if (nonZeroCount > 0) {
      // Distribute evenly to non-zero months
      const adjustmentPerMonth = difference / nonZeroCount;
      for (let i = 0; i < months; i++) {
        if (spending[i] > 0) {
          spending[i] += adjustmentPerMonth;
        }
      }
    } else {
      // Fallback: adjust last month
      spending[months - 1] += difference;
    }
  }

  // Final normalization pass: ensure exact sum by adjusting last non-zero month
  const finalSum = spending.reduce((acc, val) => acc + val, 0);
  const finalDifference = totalBudget - finalSum;
  if (Math.abs(finalDifference) > 0.0001) {
    // Find last non-zero month or use last month
    let lastNonZeroIndex = months - 1;
    for (let i = months - 1; i >= 0; i--) {
      if (spending[i] > 0) {
        lastNonZeroIndex = i;
        break;
      }
    }
    spending[lastNonZeroIndex] += finalDifference;
  }

  // Invariant check: sum should equal totalBudget (within floating-point precision)
  const invariantSum = spending.reduce((acc, val) => acc + val, 0);
  if (Math.abs(invariantSum - totalBudget) > 0.01) {
    console.warn(
      `[Construction Engine] S-curve sum (${invariantSum}) does not equal totalBudget (${totalBudget}). Difference: ${Math.abs(invariantSum - totalBudget)}`
    );
  }

  return spending;
}

/**
 * Sigmoid cumulative distribution function (CDF).
 * 
 * Uses the standard sigmoid function: S(t) = 1 / (1 + e^(-k * (t - midpoint)))
 * This produces an S-curve that starts slow, accelerates in the middle, then slows at the end.
 * 
 * @param x - Normalized progress (0 to 1)
 * @param steepness - Steepness parameter k (default: 6.0, higher = steeper curve)
 * @param midpoint - Midpoint of the curve (default: 0.5, center of construction period)
 * @returns Cumulative percentage (0 to 1)
 * 
 * Mathematical formula:
 * S(t) = 1 / (1 + exp(-k * (t - midpoint)))
 * 
 * For S-curve construction spending:
 * - Low spending at start (t ≈ 0): S(t) ≈ 0
 * - Peak spending in middle (t ≈ 0.5): S(t) ≈ 0.5, highest rate of change
 * - Low spending at end (t ≈ 1): S(t) ≈ 1
 */
function sigmoidCdf(x: number, steepness: number = 6.0, midpoint: number = 0.5): number {
  // Clamp x to [0, 1] for safety
  const clampedX = Math.max(0, Math.min(1, x));
  
  // Avoid edge cases at exactly 0 and 1
  if (clampedX <= 0) return 0;
  if (clampedX >= 1) return 1;
  
  // Sigmoid function: 1 / (1 + exp(-k * (t - midpoint)))
  const exponent = -steepness * (clampedX - midpoint);
  const sigmoid = 1 / (1 + Math.exp(exponent));
  
  return sigmoid;
}


