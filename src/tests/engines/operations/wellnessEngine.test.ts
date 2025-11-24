import { describe, it, expect } from 'vitest';
import { runWellnessEngine } from '@engines/operations/wellnessEngine';
import type { WellnessConfig } from '@domain/types';

describe('Wellness Engine', () => {
  const createTestConfig = (overrides?: Partial<WellnessConfig>): WellnessConfig => {
    return {
      id: 'test-wellness-1',
      name: 'Test Wellness',
      operationType: 'WELLNESS',
      startYear: 2026,
      horizonYears: 1,
      memberships: 400,
      avgMembershipFee: 1500,
      dailyPasses: 150,
      avgDailyPassPrice: 45,
      utilizationByMonth: Array(12).fill(0.65),
      foodRevenuePctOfTotal: 0.30,
      beverageRevenuePctOfTotal: 0.20,
      otherRevenuePctOfTotal: 0.10,
      foodCogsPct: 0.35,
      beverageCogsPct: 0.25,
      payrollPct: 0.35,
      utilitiesPct: 0.05,
      marketingPct: 0.03,
      maintenanceOpexPct: 0.04,
      otherOpexPct: 0.03,
      maintenanceCapexPct: 0.02,
      ...overrides,
    };
  };

  describe('Happy path', () => {
    it('should generate 12 monthly P&L entries and 1 annual P&L entry for 1 year', () => {
      const config = createTestConfig();
      const result = runWellnessEngine(config);

      expect(result.monthlyPnl.length).toBe(12);
      expect(result.annualPnl.length).toBe(1);
    });

    it('should have positive revenue for non-zero utilization', () => {
      const config = createTestConfig();
      const result = runWellnessEngine(config);

      expect(result.annualPnl[0].revenueTotal).toBeGreaterThan(0);
    });

    it('should aggregate monthly totals correctly into annual totals', () => {
      const config = createTestConfig();
      const result = runWellnessEngine(config);

      const annual = result.annualPnl[0];
      const yearMonths = result.monthlyPnl.filter((m) => m.yearIndex === 0);

      const monthlyRevenueSum = yearMonths.reduce(
        (sum, m) => sum + m.roomRevenue + m.foodRevenue + m.beverageRevenue + m.otherRevenue,
        0
      );
      expect(annual.revenueTotal).toBeCloseTo(monthlyRevenueSum, 2);
    });

    it('should handle multiple years correctly', () => {
      const config = createTestConfig({
        horizonYears: 3,
      });
      const result = runWellnessEngine(config);

      expect(result.monthlyPnl.length).toBe(36);
      expect(result.annualPnl.length).toBe(3);
    });
  });

  describe('Zero utilization', () => {
    it('should generate zero revenues when utilization is zero and no memberships', () => {
      const config = createTestConfig({
        utilizationByMonth: Array(12).fill(0),
        memberships: 0,
      });
      const result = runWellnessEngine(config);

      for (const monthly of result.monthlyPnl) {
        expect(monthly.roomRevenue).toBe(0);
        expect(monthly.noi).toBe(0);
      }
    });
  });
});

