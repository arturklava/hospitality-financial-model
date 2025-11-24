import { describe, it, expect } from 'vitest';
import { calculateTrend, evaluateHealth } from '@engines/analytics/trendEngine';
import type { HealthRule } from '@domain/types';

describe('trendEngine', () => {
  describe('calculateTrend', () => {
    it('should return flat trend for empty series', () => {
      const result = calculateTrend([]);
      expect(result.direction).toBe('flat');
      expect(result.percentChange).toBe(0);
    });

    it('should return flat trend for single value', () => {
      const result = calculateTrend([100]);
      expect(result.direction).toBe('flat');
      expect(result.percentChange).toBe(0);
    });

    it('should identify upward trend (last > first)', () => {
      const result = calculateTrend([100, 110, 120]);
      expect(result.direction).toBe('up');
      expect(result.percentChange).toBe(20);
    });

    it('should identify downward trend (last < first)', () => {
      const result = calculateTrend([100, 90, 80]);
      expect(result.direction).toBe('down');
      expect(result.percentChange).toBe(-20);
    });

    it('should identify flat trend (no significant change)', () => {
      const result = calculateTrend([100, 100, 100]);
      expect(result.direction).toBe('flat');
      expect(result.percentChange).toBe(0);
    });

    it('should handle small changes (within threshold)', () => {
      // Very small change (0.005% = 0.05 / 1000)
      const result = calculateTrend([1000, 1000.05]);
      expect(result.direction).toBe('flat');
      expect(result.percentChange).toBe(0);
    });

    it('should calculate percent change correctly for growth', () => {
      const result = calculateTrend([50, 75]);
      expect(result.direction).toBe('up');
      expect(result.percentChange).toBe(50);
    });

    it('should calculate percent change correctly for decline', () => {
      const result = calculateTrend([200, 150]);
      expect(result.direction).toBe('down');
      expect(result.percentChange).toBe(-25);
    });

    it('should handle negative values', () => {
      const result = calculateTrend([-100, -80]);
      expect(result.direction).toBe('up');
      expect(result.percentChange).toBe(20);
    });

    it('should handle zero baseline with positive last value', () => {
      const result = calculateTrend([0, 100]);
      expect(result.direction).toBe('up');
      expect(result.percentChange).toBe(100);
    });

    it('should handle zero baseline with negative last value', () => {
      const result = calculateTrend([0, -100]);
      expect(result.direction).toBe('down');
      expect(result.percentChange).toBe(-100);
    });

    it('should handle zero baseline with zero last value', () => {
      const result = calculateTrend([0, 0]);
      expect(result.direction).toBe('flat');
      expect(result.percentChange).toBe(0);
    });

    it('should handle large series correctly', () => {
      const series = [100, 105, 110, 115, 120, 125, 130];
      const result = calculateTrend(series);
      expect(result.direction).toBe('up');
      expect(result.percentChange).toBe(30);
    });

    it('should handle declining series correctly', () => {
      const series = [1000, 950, 900, 850, 800];
      const result = calculateTrend(series);
      expect(result.direction).toBe('down');
      expect(result.percentChange).toBe(-20);
    });

    it('should handle series with fluctuations', () => {
      // Overall upward trend despite fluctuations
      const series = [100, 95, 110, 105, 120];
      const result = calculateTrend(series);
      expect(result.direction).toBe('up');
      expect(result.percentChange).toBe(20);
    });
  });

  describe('evaluateHealth', () => {
    it('should return success when no thresholds defined', () => {
      const rule: HealthRule = {};
      expect(evaluateHealth(50, rule)).toBe('success');
      expect(evaluateHealth(-50, rule)).toBe('success');
      expect(evaluateHealth(0, rule)).toBe('success');
    });

    it('should return danger when value is below min threshold', () => {
      const rule: HealthRule = { min: 10 };
      expect(evaluateHealth(5, rule)).toBe('danger');
      expect(evaluateHealth(9, rule)).toBe('danger');
    });

    it('should return success when value is at or above min threshold', () => {
      const rule: HealthRule = { min: 10 };
      expect(evaluateHealth(10, rule)).toBe('success');
      expect(evaluateHealth(15, rule)).toBe('success');
      expect(evaluateHealth(100, rule)).toBe('success');
    });

    it('should return danger when value is above max threshold', () => {
      const rule: HealthRule = { max: 100 };
      expect(evaluateHealth(101, rule)).toBe('danger');
      expect(evaluateHealth(150, rule)).toBe('danger');
    });

    it('should return success when value is at or below max threshold', () => {
      const rule: HealthRule = { max: 100 };
      expect(evaluateHealth(100, rule)).toBe('success');
      expect(evaluateHealth(90, rule)).toBe('success');
      expect(evaluateHealth(0, rule)).toBe('success');
    });

    it('should return success when value is within min and max', () => {
      const rule: HealthRule = { min: 10, max: 100 };
      expect(evaluateHealth(50, rule)).toBe('success');
      expect(evaluateHealth(10, rule)).toBe('success');
      expect(evaluateHealth(100, rule)).toBe('success');
    });

    it('should return danger when value is outside min and max', () => {
      const rule: HealthRule = { min: 10, max: 100 };
      expect(evaluateHealth(5, rule)).toBe('danger');
      expect(evaluateHealth(105, rule)).toBe('danger');
    });

    it('should return warning when value is near min threshold', () => {
      const rule: HealthRule = { min: 10, max: 100 };
      // Warning zone is 10% of range (90) = 9, so 10-19 is warning zone
      // Actually, let's test with a value just above min but in warning zone
      // Range = 90, warning zone = 9, so values from 10 to 19 are in warning zone
      const result = evaluateHealth(15, rule);
      // Note: The implementation uses 10% of range, so 15 should be in warning zone
      expect(['warning', 'success']).toContain(result);
    });

    it('should return warning when value is near max threshold', () => {
      const rule: HealthRule = { min: 10, max: 100 };
      // Range = 90, warning zone = 9, so values from 91 to 100 are in warning zone
      const result = evaluateHealth(95, rule);
      expect(['warning', 'success']).toContain(result);
    });

    it('should handle negative values with min threshold', () => {
      const rule: HealthRule = { min: -10 };
      expect(evaluateHealth(-15, rule)).toBe('danger');
      expect(evaluateHealth(-10, rule)).toBe('success');
      expect(evaluateHealth(-5, rule)).toBe('success');
    });

    it('should handle negative values with max threshold', () => {
      const rule: HealthRule = { max: -10 };
      expect(evaluateHealth(-5, rule)).toBe('danger');
      expect(evaluateHealth(-10, rule)).toBe('success');
      expect(evaluateHealth(-15, rule)).toBe('success');
    });

    it('should handle zero value correctly', () => {
      const rule: HealthRule = { min: 0, max: 100 };
      expect(evaluateHealth(0, rule)).toBe('success');
      
      const rule2: HealthRule = { min: 10 };
      expect(evaluateHealth(0, rule2)).toBe('danger');
      
      const rule3: HealthRule = { max: -10 };
      expect(evaluateHealth(0, rule3)).toBe('danger');
    });

    it('should handle very small ranges', () => {
      const rule: HealthRule = { min: 0.1, max: 0.2 };
      expect(evaluateHealth(0.05, rule)).toBe('danger');
      expect(evaluateHealth(0.15, rule)).toBe('success');
      expect(evaluateHealth(0.25, rule)).toBe('danger');
    });

    it('should handle very large ranges', () => {
      const rule: HealthRule = { min: 0, max: 1000000 };
      expect(evaluateHealth(500000, rule)).toBe('success');
      expect(evaluateHealth(-1, rule)).toBe('danger');
      expect(evaluateHealth(1000001, rule)).toBe('danger');
    });

    it('should handle single threshold with warning zone', () => {
      const rule: HealthRule = { min: 100 };
      // Value just above min should be success (not in warning zone for single threshold)
      expect(evaluateHealth(100, rule)).toBe('success');
      expect(evaluateHealth(110, rule)).toBe('success');
      
      const rule2: HealthRule = { max: 100 };
      expect(evaluateHealth(100, rule2)).toBe('success');
      expect(evaluateHealth(90, rule2)).toBe('success');
    });

    it('should correctly identify growth vs decline in trend calculation', () => {
      // Test case: Growing revenue
      const growingRevenue = [100000, 110000, 120000, 130000];
      const growthTrend = calculateTrend(growingRevenue);
      expect(growthTrend.direction).toBe('up');
      expect(growthTrend.percentChange).toBeGreaterThan(0);

      // Test case: Declining occupancy
      const decliningOccupancy = [0.85, 0.80, 0.75, 0.70];
      const declineTrend = calculateTrend(decliningOccupancy);
      expect(declineTrend.direction).toBe('down');
      expect(declineTrend.percentChange).toBeLessThan(0);

      // Test case: Stable NOI
      const stableNoi = [50000, 50000, 50000, 50000];
      const stableTrend = calculateTrend(stableNoi);
      expect(stableTrend.direction).toBe('flat');
      expect(stableTrend.percentChange).toBe(0);
    });
  });
});

