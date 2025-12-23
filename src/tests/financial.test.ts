import { describe, it, expect } from 'vitest';
import { npv, irr, equityMultiple, paybackPeriod } from '../domain/financial';

describe('Financial utilities', () => {
  describe('npv', () => {
    it('should calculate NPV correctly for a simple cash flow', () => {
      const cashFlows = [-1000, 500, 600, 700];
      const rate = 0.10;
      const result = npv(rate, cashFlows);
      // NPV = -1000 + 500/1.1 + 600/1.1^2 + 700/1.1^3
      // = -1000 + 454.545 + 495.868 + 525.920 ≈ 476.33
      expect(result).toBeCloseTo(476.33, 2);
    });

    it('should return 0 for empty cash flows', () => {
      expect(npv(0.10, [])).toBe(0);
    });

    it('should handle zero discount rate', () => {
      const cashFlows = [-1000, 500, 600];
      const result = npv(0, cashFlows);
      expect(result).toBe(100); // Sum of cash flows
    });
  });

  describe('irr', () => {
    it('should calculate IRR correctly', () => {
      const cashFlows = [-1000, 500, 600, 700];
      const result = irr(cashFlows);
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
      
      // NPV at the calculated IRR should be approximately zero
      if (result !== null) {
        const npvAtIrr = npv(result, cashFlows);
        expect(Math.abs(npvAtIrr)).toBeLessThan(0.01);
      }
    });

    it('should return null for all-zero cash flows', () => {
      const cashFlows = [0, 0, 0, 0];
      expect(irr(cashFlows)).toBeNull();
    });

    it('should return null for all-positive cash flows', () => {
      const cashFlows = [100, 200, 300];
      expect(irr(cashFlows)).toBeNull();
    });

    it('should return null for all-negative cash flows', () => {
      const cashFlows = [-100, -200, -300];
      expect(irr(cashFlows)).toBeNull();
    });

    it('should handle a simple two-period case', () => {
      // Investment of -100, return of 110 in one period
      // IRR should be 10%
      const cashFlows = [-100, 110];
      const result = irr(cashFlows);
      expect(result).not.toBeNull();
      if (result !== null) {
        expect(result).toBeCloseTo(0.10, 2);
      }
    });
  });

  describe('equityMultiple', () => {
    it('should calculate equity multiple correctly', () => {
      const cashFlows = [-1000, 500, 600, 700];
      const result = equityMultiple(cashFlows);
      // Positive sum: 500 + 600 + 700 = 1800
      // Negative sum (absolute): 1000
      // Multiple: 1800 / 1000 = 1.8
      expect(result).toBe(1.8);
    });

    it('should return 0 for empty cash flows', () => {
      expect(equityMultiple([])).toBe(0);
    });

    it('should handle all-positive cash flows', () => {
      const cashFlows = [100, 200, 300];
      const result = equityMultiple(cashFlows);
      expect(result).toBe(Infinity);
    });

    it('should handle all-negative cash flows', () => {
      const cashFlows = [-100, -200, -300];
      expect(equityMultiple(cashFlows)).toBe(0);
    });
  });

  describe('paybackPeriod', () => {
    it('should calculate payback period correctly', () => {
      const cashFlows = [-1000, 500, 600, 700];
      const result = paybackPeriod(cashFlows);
      // Year 0: -1000 (not paid back)
      // Year 1: -1000 + 500 = -500 (not paid back, completed 1 year)
      // Year 2: -500 + 600 = 100 (paid back during year 2)
      // Linear interpolation: 500 / 600 = 0.833
      // Payback: 1 (completed years) + 0.833 (fraction of year 2) = 1.833
      expect(result).not.toBeNull();
      if (result !== null) {
        expect(result).toBeCloseTo(1.833, 2);
      }
    });

    it('should return null if payback never occurs', () => {
      const cashFlows = [-1000, 100, 100, 100];
      const result = paybackPeriod(cashFlows);
      // Total returns: 300, investment: 1000, never paid back
      expect(result).toBeNull();
    });

    it('should handle immediate payback', () => {
      const cashFlows = [-100, 200];
      const result = paybackPeriod(cashFlows);
      // After year 0: -100 (not paid back)
      // After year 1: -100 + 200 = 100 (paid back)
      // Fraction: 100 / 200 = 0.5
      // Payback: 0 + 0.5 = 0.5
      expect(result).toBeCloseTo(0.5, 2);
    });

    it('should return null for empty cash flows', () => {
      expect(paybackPeriod([])).toBeNull();
    });
  });
});

