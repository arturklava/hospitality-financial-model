/**
 * Statistics Tests (v2.1)
 * 
 * Tests for advanced statistical functions including:
 * - Cholesky decomposition
 * - Correlated normal sampling
 * - Correlation preservation verification
 */

import { describe, it, expect } from 'vitest';
import {
  choleskyDecomposition,
  generateCorrelatedSamples,
} from '@domain/statistics';

/**
 * Helper function to multiply two matrices: A × B
 */
function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const m = B[0].length;
  const p = B.length;
  const result: number[][] = Array(n).fill(0).map(() => Array(m).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      for (let k = 0; k < p; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }

  return result;
}

/**
 * Helper function to transpose a matrix
 */
function matrixTranspose(A: number[][]): number[][] {
  const n = A.length;
  const m = A[0].length;
  const result: number[][] = Array(m).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      result[j][i] = A[i][j];
    }
  }

  return result;
}

/**
 * Helper function to calculate sample correlation coefficient
 */
function calculateSampleCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length) {
    throw new Error('Arrays must have same length');
  }

  const n = x.length;
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }

  const denominator = Math.sqrt(sumSqX * sumSqY);
  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

describe('choleskyDecomposition', () => {
  it('should decompose identity matrix correctly', () => {
    const identity: number[][] = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];

    const L = choleskyDecomposition(identity);

    // Identity matrix should decompose to itself
    expect(L).toEqual(identity);

    // Verify L × L^T = I
    const LTranspose = matrixTranspose(L);
    const reconstructed = matrixMultiply(L, LTranspose);
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(reconstructed[i][j]).toBeCloseTo(identity[i][j], 10);
      }
    }
  });

  it('should decompose known 3x3 correlation matrix correctly', () => {
    const correlationMatrix: number[][] = [
      [1.0, 0.7, 0.0],
      [0.7, 1.0, 0.0],
      [0.0, 0.0, 1.0],
    ];

    const L = choleskyDecomposition(correlationMatrix);

    // Verify L is lower triangular (upper triangle should be zero)
    expect(L[0][1]).toBe(0);
    expect(L[0][2]).toBe(0);
    expect(L[1][2]).toBe(0);

    // Verify L × L^T = correlationMatrix
    const LTranspose = matrixTranspose(L);
    const reconstructed = matrixMultiply(L, LTranspose);

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(reconstructed[i][j]).toBeCloseTo(correlationMatrix[i][j], 10);
      }
    }
  });

  it('should throw error for perfect correlation matrix (all 1.0) - singular matrix', () => {
    const perfectCorrelation: number[][] = [
      [1.0, 1.0, 1.0],
      [1.0, 1.0, 1.0],
      [1.0, 1.0, 1.0],
    ];

    // This matrix is positive semi-definite but not positive-definite (singular)
    // Standard Cholesky decomposition requires positive-definite matrices
    // This is an edge case that should throw an error
    expect(() => choleskyDecomposition(perfectCorrelation)).toThrow('not positive-definite');
  });

  it('should throw error for non-square matrix', () => {
    const nonSquare: number[][] = [
      [1, 0],
      [0, 1],
      [0, 0],
    ];

    expect(() => choleskyDecomposition(nonSquare)).toThrow('Matrix must be square');
  });

  it('should throw error for non-positive-definite matrix', () => {
    // Matrix with correlation > 1.0 (invalid)
    const invalidMatrix: number[][] = [
      [1.0, 1.5],
      [1.5, 1.0],
    ];

    expect(() => choleskyDecomposition(invalidMatrix)).toThrow('not positive-definite');
  });

  it('should throw error for empty matrix', () => {
    expect(() => choleskyDecomposition([])).toThrow('Matrix cannot be empty');
  });
});

describe('generateCorrelatedSamples', () => {
  it('should generate independent samples when correlation is 0.0', () => {
    const means = [0, 0];
    const stdDevs = [1, 1];
    const correlationMatrix: number[][] = [
      [1.0, 0.0],
      [0.0, 1.0],
    ];

    // Generate many samples
    const samples: number[][] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(generateCorrelatedSamples(means, stdDevs, correlationMatrix));
    }

    // Extract x and y values
    const x = samples.map(s => s[0]);
    const y = samples.map(s => s[1]);

    // Calculate sample correlation
    const sampleCorrelation = calculateSampleCorrelation(x, y);

    // Should be approximately 0.0 (within ±0.1 tolerance for 1000 samples)
    expect(Math.abs(sampleCorrelation)).toBeLessThan(0.1);
  });

  it('should generate highly correlated samples when correlation is 0.9', () => {
    const means = [0, 0];
    const stdDevs = [1, 1];
    const correlationMatrix: number[][] = [
      [1.0, 0.9],
      [0.9, 1.0],
    ];

    // Generate 1000 samples
    const samples: number[][] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(generateCorrelatedSamples(means, stdDevs, correlationMatrix));
    }

    // Extract x and y values
    const x = samples.map(s => s[0]);
    const y = samples.map(s => s[1]);

    // Calculate sample correlation
    const sampleCorrelation = calculateSampleCorrelation(x, y);

    // Should be approximately 0.9 (within tolerance of ±0.05)
    expect(sampleCorrelation).toBeGreaterThan(0.85);
    expect(sampleCorrelation).toBeLessThan(0.95);
  });

  it('should generate negatively correlated samples when correlation is -0.9', () => {
    const means = [0, 0];
    const stdDevs = [1, 1];
    const correlationMatrix: number[][] = [
      [1.0, -0.9],
      [-0.9, 1.0],
    ];

    // Generate 1000 samples
    const samples: number[][] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(generateCorrelatedSamples(means, stdDevs, correlationMatrix));
    }

    // Extract x and y values
    const x = samples.map(s => s[0]);
    const y = samples.map(s => s[1]);

    // Calculate sample correlation
    const sampleCorrelation = calculateSampleCorrelation(x, y);

    // Should be approximately -0.9 (within tolerance of ±0.05)
    expect(sampleCorrelation).toBeGreaterThan(-0.95);
    expect(sampleCorrelation).toBeLessThan(-0.85);
  });

  it('should handle 3x3 correlation matrix correctly', () => {
    const means = [0, 0, 0];
    const stdDevs = [1, 1, 1];
    const correlationMatrix: number[][] = [
      [1.0, 0.7, 0.0],
      [0.7, 1.0, 0.0],
      [0.0, 0.0, 1.0],
    ];

    // Generate samples
    const samples: number[][] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(generateCorrelatedSamples(means, stdDevs, correlationMatrix));
    }

    // Extract variable pairs
    const x1 = samples.map(s => s[0]); // Variable 1
    const x2 = samples.map(s => s[1]); // Variable 2
    const x3 = samples.map(s => s[2]); // Variable 3

    // Check correlation between variable 1 and 2 (should be ~0.7)
    const corr12 = calculateSampleCorrelation(x1, x2);
    expect(corr12).toBeGreaterThan(0.65);
    expect(corr12).toBeLessThan(0.75);

    // Check correlation between variable 1 and 3 (should be ~0.0)
    const corr13 = calculateSampleCorrelation(x1, x3);
    // With 1000 samples, correlation should be close to 0 (within ±0.1)
    expect(Math.abs(corr13)).toBeLessThan(0.1);

    // Check correlation between variable 2 and 3 (should be ~0.0)
    const corr23 = calculateSampleCorrelation(x2, x3);
    // With 1000 samples, correlation should be close to 0 (within ±0.1)
    expect(Math.abs(corr23)).toBeLessThan(0.1);
  });

  it('should apply means and standard deviations correctly', () => {
    const means = [10, 20];
    const stdDevs = [2, 3];
    const correlationMatrix: number[][] = [
      [1.0, 0.0],
      [0.0, 1.0],
    ];

    // Generate many samples
    const samples: number[][] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(generateCorrelatedSamples(means, stdDevs, correlationMatrix));
    }

    // Calculate sample means
    const sampleMean1 = samples.reduce((sum, s) => sum + s[0], 0) / samples.length;
    const sampleMean2 = samples.reduce((sum, s) => sum + s[1], 0) / samples.length;

    // Calculate sample standard deviations
    const sampleVar1 = samples.reduce((sum, s) => sum + Math.pow(s[0] - sampleMean1, 2), 0) / samples.length;
    const sampleStdDev1 = Math.sqrt(sampleVar1);
    const sampleVar2 = samples.reduce((sum, s) => sum + Math.pow(s[1] - sampleMean2, 2), 0) / samples.length;
    const sampleStdDev2 = Math.sqrt(sampleVar2);

    // Means should be approximately correct (within 0.5)
    expect(sampleMean1).toBeCloseTo(means[0], 0);
    expect(sampleMean2).toBeCloseTo(means[1], 0);

    // Standard deviations should be approximately correct (within 0.3)
    expect(sampleStdDev1).toBeCloseTo(stdDevs[0], 0);
    expect(sampleStdDev2).toBeCloseTo(stdDevs[1], 0);
  });

  it('should throw error for dimension mismatch', () => {
    const means = [0, 0];
    const stdDevs = [1, 1, 1]; // Wrong length
    const correlationMatrix: number[][] = [
      [1.0, 0.0],
      [0.0, 1.0],
    ];

    expect(() => generateCorrelatedSamples(means, stdDevs, correlationMatrix)).toThrow('Dimensions mismatch');
  });

  it('should throw error for non-square correlation matrix', () => {
    const means = [0, 0];
    const stdDevs = [1, 1];
    const correlationMatrix: number[][] = [
      [1.0, 0.0, 0.0],
      [0.0, 1.0],
    ];

    expect(() => generateCorrelatedSamples(means, stdDevs, correlationMatrix)).toThrow('Correlation matrix must be square');
  });
});

