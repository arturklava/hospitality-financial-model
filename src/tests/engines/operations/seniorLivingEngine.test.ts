import { describe, it, expect } from 'vitest';
import { runSeniorLivingEngine } from '@engines/operations/seniorLivingEngine';
import type { SeniorLivingConfig } from '@domain/types';

describe('Senior Living Engine', () => {
  const createTestConfig = (overrides?: Partial<SeniorLivingConfig>): SeniorLivingConfig => {
    return {
      id: 'test-senior-living-1',
      name: 'Test Senior Living',
      operationType: 'SENIOR_LIVING',
      startYear: 2026,
      horizonYears: 1,
      units: 100,
      avgMonthlyRate: 5000,
      occupancyByMonth: Array(12).fill(0.90),
      careRevenuePctOfRental: 0.20,
      foodRevenuePctOfRental: 0.15,
      otherRevenuePctOfRental: 0.10,
      foodCogsPct: 0.35,
      careCogsPct: 0.25,
      payrollPct: 0.40,
      utilitiesPct: 0.06,
      marketingPct: 0.03,
      maintenanceOpexPct: 0.05,
      otherOpexPct: 0.03,
      maintenanceCapexPct: 0.02,
      ...overrides,
    };
  };

  describe('Happy path', () => {
    it('should generate 12 monthly P&L entries and 1 annual P&L entry for 1 year', () => {
      const config = createTestConfig();
      const result = runSeniorLivingEngine(config);

      expect(result.monthlyPnl.length).toBe(12);
      expect(result.annualPnl.length).toBe(1);
    });

    it('should have positive revenue for non-zero occupancy', () => {
      const config = createTestConfig();
      const result = runSeniorLivingEngine(config);

      expect(result.annualPnl[0].revenueTotal).toBeGreaterThan(0);
    });

    it('should calculate rental revenue correctly', () => {
      const config = createTestConfig({
        units: 100,
        avgMonthlyRate: 5000,
        occupancyByMonth: Array(12).fill(0.90),
      });
      const result = runSeniorLivingEngine(config);

      // Expected rental revenue per month:
      // occupiedUnits = 100 * 0.90 = 90
      // rentalRevenue = 90 * 5000 = 450,000
      const expectedRentalRevenue = 100 * 0.90 * 5000;
      expect(result.monthlyPnl[0].roomRevenue).toBe(expectedRentalRevenue);
    });

    it('should aggregate monthly totals correctly into annual totals', () => {
      const config = createTestConfig();
      const result = runSeniorLivingEngine(config);

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
      const result = runSeniorLivingEngine(config);

      expect(result.monthlyPnl.length).toBe(36);
      expect(result.annualPnl.length).toBe(3);
    });
  });

  describe('Zero occupancy', () => {
    it('should generate zero revenues when occupancy is zero', () => {
      const config = createTestConfig({
        occupancyByMonth: Array(12).fill(0),
      });
      const result = runSeniorLivingEngine(config);

      for (const monthly of result.monthlyPnl) {
        expect(monthly.roomRevenue).toBe(0);
        expect(monthly.noi).toBe(0);
      }
    });
  });
});

