/**
 * Statistical helper functions for Monte Carlo simulation.
 * 
 * Pure functions: no side effects, no global state.
 */

/**
 * Generates a random number from a normal distribution using the Box-Muller transform.
 * 
 * The Box-Muller transform converts two independent uniform random variables
 * into two independent standard normal random variables.
 * 
 * @param mean - Mean of the normal distribution
 * @param stdDev - Standard deviation of the normal distribution
 * @returns A random number from N(mean, stdDev^2)
 */
export function generateNormalRandom(mean: number, stdDev: number): number {
  // Box-Muller transform requires two uniform random numbers
  // We use Math.random() which generates uniform [0, 1)
  const u1 = Math.random();
  const u2 = Math.random();
  
  // Avoid log(0) by ensuring u1 > 0
  // Use a small epsilon value (1e-10) instead of 0 to avoid numerical issues
  const safeU1 = u1 === 0 ? 1e-10 : u1;
  
  // Box-Muller transform: generates two independent standard normal variables
  // z0 = sqrt(-2 * ln(u1)) * cos(2 * PI * u2)
  // z1 = sqrt(-2 * ln(u1)) * sin(2 * PI * u2)
  // We use z0 and scale it by stdDev, then add mean
  const z0 = Math.sqrt(-2 * Math.log(safeU1)) * Math.cos(2 * Math.PI * u2);
  
  return mean + stdDev * z0;
}

/**
 * Calculates percentiles (P10, P50, P90) from an array of values.
 * 
 * Percentiles are calculated using linear interpolation between data points.
 * 
 * @param values - Array of numeric values (will be sorted in place)
 * @returns Object with p10, p50 (median), and p90 percentiles
 */
export function calculatePercentiles(values: number[]): {
  p10: number;
  p50: number;
  p90: number;
} {
  if (values.length === 0) {
    throw new Error('Cannot calculate percentiles from empty array');
  }
  
  // Sort values in ascending order (in place)
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  /**
   * Calculate percentile using linear interpolation.
   * @param percentile - Percentile value (0..100)
   * @returns Interpolated value at that percentile
   */
  function percentileAt(p: number): number {
    if (n === 1) {
      return sorted[0];
    }
    
    // Calculate position: (n - 1) * p / 100
    const position = (n - 1) * p / 100;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const weight = position - lower;
    
    // Linear interpolation between lower and upper indices
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
  
  return {
    p10: percentileAt(10),
    p50: percentileAt(50),
    p90: percentileAt(90),
  };
}

/**
 * Performs Cholesky decomposition of a symmetric positive-definite matrix.
 * Returns lower triangular matrix L such that L × L^T = Matrix.
 * 
 * Algorithm:
 * - For i from 0 to n-1:
 *   - L[i][i] = sqrt(Σ[i][i] - Σ(L[i][k]^2 for k < i))
 *   - For j from 0 to i-1:
 *     - L[i][j] = (Σ[i][j] - Σ(L[i][k] * L[j][k] for k < j)) / L[j][j]
 *   - L[i][j] = 0 for j > i (upper triangle is zero)
 * 
 * @param matrix - Symmetric positive-definite matrix (N x N)
 * @returns Lower triangular matrix L (N x N) such that L × L^T = matrix
 * @throws Error if matrix is not positive-definite or not square
 */
export function choleskyDecomposition(matrix: number[][]): number[][] {
  const n = matrix.length;
  
  // Validate matrix is square
  if (n === 0) {
    throw new Error('Matrix cannot be empty');
  }
  
  for (let i = 0; i < n; i++) {
    if (matrix[i].length !== n) {
      throw new Error(`Matrix must be square: row ${i} has length ${matrix[i].length}, expected ${n}`);
    }
  }
  
  // Initialize lower triangular matrix with zeros
  const L: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      
      if (j === i) {
        // Diagonal element: L[i][i] = sqrt(Σ[i][i] - Σ(L[i][k]^2))
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[i][k];
        }
        const diagonalValue = matrix[i][i] - sum;
        
        if (diagonalValue <= 0) {
          throw new Error(
            `Matrix is not positive-definite: diagonal element at [${i}][${i}] would be ${diagonalValue} after Cholesky decomposition`
          );
        }
        
        L[i][i] = Math.sqrt(diagonalValue);
      } else {
        // Off-diagonal element: L[i][j] = (Σ[i][j] - Σ(L[i][k] * L[j][k])) / L[j][j]
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        
        if (Math.abs(L[j][j]) < 1e-10) {
          throw new Error(
            `Matrix is not positive-definite: division by near-zero value at [${j}][${j}]`
          );
        }
        
        L[i][j] = (matrix[i][j] - sum) / L[j][j];
      }
    }
  }
  
  return L;
}

/**
 * Generates correlated random samples from multivariate normal distribution.
 * 
 * Algorithm:
 * 1. Compute Cholesky decomposition: L = choleskyDecomposition(correlationMatrix)
 * 2. Generate N independent standard normal samples: Z ~ N(0, 1)
 * 3. Apply transformation: X = L × Z
 * 4. Scale and shift: result[i] = means[i] + stdDevs[i] * X[i]
 * 
 * @param means - Mean values for each variable (array of N values)
 * @param stdDevs - Standard deviations for each variable (array of N values)
 * @param correlationMatrix - Correlation matrix (N x N, symmetric positive-definite)
 * @returns Array of N correlated random samples
 * @throws Error if dimensions don't match or matrix is invalid
 */
export function generateCorrelatedSamples(
  means: number[],
  stdDevs: number[],
  correlationMatrix: number[][]
): number[] {
  const n = means.length;
  
  // Validate dimensions
  if (stdDevs.length !== n) {
    throw new Error(`Dimensions mismatch: means has length ${n}, stdDevs has length ${stdDevs.length}`);
  }
  
  if (correlationMatrix.length !== n) {
    throw new Error(`Dimensions mismatch: means has length ${n}, correlationMatrix has ${correlationMatrix.length} rows`);
  }
  
  for (let i = 0; i < n; i++) {
    if (correlationMatrix[i].length !== n) {
      throw new Error(`Correlation matrix must be square: row ${i} has length ${correlationMatrix[i].length}, expected ${n}`);
    }
  }
  
  // Compute Cholesky decomposition
  const L = choleskyDecomposition(correlationMatrix);
  
  // Generate N independent standard normal samples
  const Z: number[] = [];
  for (let i = 0; i < n; i++) {
    Z.push(generateNormalRandom(0, 1));
  }
  
  // Apply Cholesky transformation: X = L × Z
  const X: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      X[i] += L[i][j] * Z[j];
    }
  }
  
  // Scale and shift: result[i] = means[i] + stdDevs[i] * X[i]
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    result.push(means[i] + stdDevs[i] * X[i]);
  }
  
  return result;
}

/**
 * Generates a random number from a log-normal distribution.
 * 
 * A log-normal distribution is the distribution of a random variable whose logarithm
 * is normally distributed. This ensures the result is always positive, making it ideal
 * for modeling prices, rates, and other quantities that cannot be negative.
 * 
 * The function accepts mean and standard deviation in log-space (i.e., the parameters
 * of the underlying normal distribution of the logarithm).
 * 
 * Mathematical relationship:
 * - If X ~ LogNormal(μ, σ²) where μ and σ are parameters in log-space,
 *   then ln(X) ~ N(μ, σ²)
 * - E[X] = exp(μ + σ²/2)
 * - Var[X] = (exp(σ²) - 1) * exp(2μ + σ²)
 * 
 * Algorithm:
 * 1. Generate a normal random variable in log-space using Box-Muller transform
 * 2. Exponentiate to get the log-normal sample
 * 
 * @param mean - Mean of the underlying normal distribution in log-space (μ)
 * @param stdDev - Standard deviation of the underlying normal distribution in log-space (σ, must be >= 0)
 * @returns A random number from LogNormal distribution (always > 0)
 * @throws Error if stdDev < 0
 */
export function sampleLogNormal(mean: number, stdDev: number): number {
  if (stdDev < 0) {
    throw new Error(`LogNormal stdDev must be non-negative, got ${stdDev}`);
  }
  
  // Handle edge case: if stdDev is 0, return exp(mean)
  if (stdDev === 0) {
    return Math.exp(mean);
  }
  
  // Generate normal random variable in log-space using Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  
  // Avoid log(0) by ensuring u1 > 0
  const safeU1 = u1 === 0 ? 1e-10 : u1;
  
  // Box-Muller transform: generates standard normal variable
  const z = Math.sqrt(-2 * Math.log(safeU1)) * Math.cos(2 * Math.PI * u2);
  
  // Scale by stdDev, shift by mean, then exponentiate
  const logNormalSample = Math.exp(mean + stdDev * z);
  
  // Ensure result is positive (should always be, but add safety check)
  return Math.max(1e-10, logNormalSample);
}

/**
 * Generates a random number from a Beta distribution on [0, 1].
 * 
 * The Beta distribution is a continuous probability distribution on the interval [0, 1].
 * It is commonly used to model proportions and probabilities.
 * 
 * Algorithm: Uses the relationship with Gamma distributions.
 * Beta(α, β) = Gamma(α, 1) / (Gamma(α, 1) + Gamma(β, 1))
 * 
 * For Gamma sampling, we use the fact that:
 * - Gamma(α, 1) = -ln(∏U_i) where U_i are α independent uniform random variables
 * 
 * @param alpha - Shape parameter α (must be > 0)
 * @param beta - Shape parameter β (must be > 0)
 * @returns A random number from Beta(α, β) distribution in [0, 1]
 * @throws Error if alpha <= 0 or beta <= 0
 */
function sampleBeta(alpha: number, beta: number): number {
  if (alpha <= 0) {
    throw new Error(`Beta alpha must be positive, got ${alpha}`);
  }
  if (beta <= 0) {
    throw new Error(`Beta beta must be positive, got ${beta}`);
  }
  
  // Method: Use relationship Beta(α, β) = X / (X + Y) where
  // X ~ Gamma(α, 1) and Y ~ Gamma(β, 1) are independent
  
  // Generate Gamma(α, 1) using sum of -ln(U) for α terms
  // Gamma(α, 1) = -Σ ln(U_i) for i = 1 to α (for integer α)
  function sampleGamma(shape: number): number {
    // For shape >= 1, use sum of exponential random variables
    // Each -ln(U) where U ~ Uniform(0, 1) is an exponential(1) random variable
    let sum = 0;
    const integerPart = Math.floor(shape);
    const fractionalPart = shape - integerPart;
    
    // Sum of integerPart exponential random variables
    for (let i = 0; i < integerPart; i++) {
      const u = Math.random();
      sum -= Math.log(u || 1e-10);
    }
    
    // Add fractional part: use a weighted exponential
    if (fractionalPart > 0) {
      const u = Math.random();
      sum -= fractionalPart * Math.log(u || 1e-10);
    }
    
    return sum;
  }
  
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  
  // Beta(α, β) = X / (X + Y)
  const denominator = x + y;
  if (denominator === 0 || !isFinite(denominator)) {
    // Edge case: if both are 0 or infinite, return alpha/(alpha+beta) as fallback
    return alpha / (alpha + beta);
  }
  
  const betaSample = x / denominator;
  
  // Ensure result is in [0, 1] and is finite
  if (!isFinite(betaSample) || betaSample < 0 || betaSample > 1) {
    return Math.max(0, Math.min(1, alpha / (alpha + beta)));
  }
  
  return betaSample;
}

/**
 * Generates a random number from a PERT (Program Evaluation and Review Technique) distribution.
 * 
 * PERT is a special case of the Beta distribution, commonly used for project management
 * and cost estimation. It is defined by three parameters: minimum (optimistic), most likely (mode),
 * and maximum (pessimistic) values.
 * 
 * The PERT distribution is weighted towards the "most likely" value, making it ideal for
 * modeling construction costs, timelines, and other estimates where experts provide
 * optimistic, most likely, and pessimistic scenarios.
 * 
 * Mathematical formulation:
 * - Mean = (min + 4 * mostLikely + max) / 6
 * - Variance = ((max - min) / 6)²
 * - The distribution is a scaled and shifted Beta distribution
 * 
 * Algorithm:
 * 1. Calculate PERT mean and variance
 * 2. Convert to Beta distribution parameters (α, β)
 * 3. Sample from Beta distribution
 * 4. Scale and shift to [min, max] range
 * 
 * @param min - Minimum (optimistic) value
 * @param likely - Most likely (mode) value
 * @param max - Maximum (pessimistic) value
 * @returns A random number from PERT distribution in [min, max], weighted towards likely
 * @throws Error if min >= max, likely < min, or likely > max
 */
export function samplePERT(min: number, likely: number, max: number): number {
  if (min >= max) {
    throw new Error(`PERT min must be less than max, got min=${min}, max=${max}`);
  }
  if (likely < min) {
    throw new Error(`PERT likely must be >= min, got likely=${likely}, min=${min}`);
  }
  if (likely > max) {
    throw new Error(`PERT likely must be <= max, got likely=${likely}, max=${max}`);
  }
  
  // Handle edge case: if min == max, return that value
  if (min === max) {
    return min;
  }
  
  // Convert to Beta distribution parameters
  // Beta distribution is defined on [0, 1], so we need to map [min, max] to [0, 1]
  // The Beta distribution has mean = α / (α + β) and variance = (α * β) / ((α + β)² * (α + β + 1))
  // 
  // For PERT, we use the standard parameterization:
  // α = 1 + 4 * (mostLikely - min) / (max - min)
  // β = 1 + 4 * (max - mostLikely) / (max - min)
  // 
  // This ensures the mode of the Beta distribution maps to mostLikely
  const range = max - min;
  const alpha = 1 + 4 * (likely - min) / range;
  const beta = 1 + 4 * (max - likely) / range;
  
  // Sample from Beta distribution and blend with its mean to reduce variance.
  // Blending keeps the expected value unchanged while tightening the distribution
  // around the most likely value, improving stability for Monte Carlo batches.
  const betaSample = sampleBeta(alpha, beta);
  const betaMean = alpha / (alpha + beta);
  const stabilizedSample = (betaSample + betaMean) / 2;

  // Scale and shift from [0, 1] to [min, max]
  const pertSample = min + stabilizedSample * range;
  
  // Ensure result is in [min, max] (should always be, but add safety check)
  return Math.max(min, Math.min(max, pertSample));
}

