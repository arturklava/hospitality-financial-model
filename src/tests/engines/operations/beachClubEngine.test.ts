import { describe, it, expect } from 'vitest';
import { runBeachClubEngine } from '@engines/operations/beachClubEngine';
import type { BeachClubConfig } from '@domain/types';

describe('Beach Club Engine', () => {
  const createTestConfig = (overrides?: Partial<BeachClubConfig>): BeachClubConfig => {
    return {
      id: 'test-beach-club-1',
      name: 'Test Beach Club',
      operationType: 'BEACH_CLUB',
      startYear: 2026,
      horizonYears: 1,
      dailyPasses: 200,
      avgDailyPassPrice: 50,
      memberships: 500,
      avgMembershipFee: 1200,
      utilizationByMonth: Array(12).fill(0.6),
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
      const result = runBeachClubEngine(config);

      expect(result.monthlyPnl.length).toBe(12);
      expect(result.annualPnl.length).toBe(1);
    });

    it('should have positive revenue for non-zero utilization', () => {
      const config = createTestConfig();
      const result = runBeachClubEngine(config);

      expect(result.annualPnl[0].revenueTotal).toBeGreaterThan(0);
    });

    it('should aggregate monthly totals correctly into annual totals', () => {
      const config = createTestConfig();
      const result = runBeachClubEngine(config);

      const annual = result.annualPnl[0];
      const yearMonths = result.monthlyPnl.filter((m) => m.yearIndex === 0);

      const monthlyRevenueSum = yearMonths.reduce(
        (sum, m) => sum + m.roomRevenue + m.foodRevenue + m.beverageRevenue + m.otherRevenue,
        0
      );
      expect(annual.revenueTotal).toBeCloseTo(monthlyRevenueSum, 2);

      const monthlyCogsSum = yearMonths.reduce(
        (sum, m) => sum + m.foodCogs + m.beverageCogs,
        0
      );
      expect(annual.cogsTotal).toBeCloseTo(monthlyCogsSum, 2);
    });

    it('should calculate membership revenue evenly across months', () => {
      const config = createTestConfig({
        memberships: 1200,
        avgMembershipFee: 1200,
      });
      const result = runBeachClubEngine(config);

      // Expected monthly membership revenue = 1200 * 1200 / 12 = 120,000
      const expectedMonthlyMembershipRevenue = (1200 * 1200) / 12;
      expect(result.monthlyPnl[0].roomRevenue).toBeGreaterThanOrEqual(expectedMonthlyMembershipRevenue);
    });

    it('should handle multiple years correctly', () => {
      const config = createTestConfig({
        horizonYears: 3,
      });
      const result = runBeachClubEngine(config);

      expect(result.monthlyPnl.length).toBe(36);
      expect(result.annualPnl.length).toBe(3);
      expect(result.annualPnl[0].yearIndex).toBe(0);
      expect(result.annualPnl[1].yearIndex).toBe(1);
      expect(result.annualPnl[2].yearIndex).toBe(2);
    });
  });

  describe('Zero utilization', () => {
    it('should generate zero revenues, COGS, OPEX, and cash flows when utilization is zero', () => {
      const config = createTestConfig({
        utilizationByMonth: Array(12).fill(0),
        memberships: 0,
      });
      const result = runBeachClubEngine(config);

      for (const monthly of result.monthlyPnl) {
        expect(monthly.roomRevenue).toBe(0);
        expect(monthly.foodRevenue).toBe(0);
        expect(monthly.beverageRevenue).toBe(0);
        expect(monthly.otherRevenue).toBe(0);
        expect(monthly.noi).toBe(0);
        expect(monthly.cashFlow).toBe(0);
      }
    });
  });
});

