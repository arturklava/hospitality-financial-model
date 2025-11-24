import { describe, it, expect } from 'vitest';
import { runVillasEngine } from '@engines/operations/villasEngine';
import type { VillasConfig } from '@domain/types';

describe('Villas Engine', () => {
  const createTestConfig = (overrides?: Partial<VillasConfig>): VillasConfig => {
    return {
      id: 'test-villas-1',
      name: 'Test Villas',
      operationType: 'VILLAS',
      startYear: 2026,
      horizonYears: 1,
      units: 20,
      avgNightlyRate: 500,
      occupancyByMonth: Array(12).fill(0.6),
      foodRevenuePctOfRental: 0.25,
      beverageRevenuePctOfRental: 0.12,
      otherRevenuePctOfRental: 0.08,
      foodCogsPct: 0.35,
      beverageCogsPct: 0.25,
      payrollPct: 0.30,
      utilitiesPct: 0.06,
      marketingPct: 0.04,
      maintenanceOpexPct: 0.05,
      otherOpexPct: 0.03,
      maintenanceCapexPct: 0.03,
      ...overrides,
    };
  };

  describe('Happy path', () => {
    it('should generate 12 monthly P&L entries and 1 annual P&L entry for 1 year', () => {
      const config = createTestConfig();
      const result = runVillasEngine(config);

      expect(result.monthlyPnl.length).toBe(12);
      expect(result.annualPnl.length).toBe(1);
    });

    it('should have positive revenue for non-zero occupancy', () => {
      const config = createTestConfig();
      const result = runVillasEngine(config);

      expect(result.annualPnl[0].revenueTotal).toBeGreaterThan(0);
    });

    it('should aggregate monthly totals correctly into annual totals', () => {
      const config = createTestConfig();
      const result = runVillasEngine(config);

      const annual = result.annualPnl[0];
      const yearMonths = result.monthlyPnl.filter((m) => m.yearIndex === 0);

      // Sum monthly revenues
      const monthlyRevenueSum = yearMonths.reduce(
        (sum, m) => sum + m.roomRevenue + m.foodRevenue + m.beverageRevenue + m.otherRevenue,
        0
      );
      expect(annual.revenueTotal).toBeCloseTo(monthlyRevenueSum, 2);

      // Sum monthly COGS
      const monthlyCogsSum = yearMonths.reduce(
        (sum, m) => sum + m.foodCogs + m.beverageCogs,
        0
      );
      expect(annual.cogsTotal).toBeCloseTo(monthlyCogsSum, 2);

      // Sum monthly OPEX
      const monthlyOpexSum = yearMonths.reduce(
        (sum, m) => sum + m.payroll + m.utilities + m.marketing + m.maintenanceOpex + m.otherOpex,
        0
      );
      expect(annual.opexTotal).toBeCloseTo(monthlyOpexSum, 2);

      // Sum monthly EBITDA
      const monthlyEbitdaSum = yearMonths.reduce((sum, m) => sum + m.ebitda, 0);
      expect(annual.ebitda).toBeCloseTo(monthlyEbitdaSum, 2);

      // Sum monthly NOI
      const monthlyNoiSum = yearMonths.reduce((sum, m) => sum + m.noi, 0);
      expect(annual.noi).toBeCloseTo(monthlyNoiSum, 2);

      // Sum monthly maintenance capex
      const monthlyCapexSum = yearMonths.reduce((sum, m) => sum + m.maintenanceCapex, 0);
      expect(annual.maintenanceCapex).toBeCloseTo(monthlyCapexSum, 2);

      // Sum monthly cash flow
      const monthlyCashFlowSum = yearMonths.reduce((sum, m) => sum + m.cashFlow, 0);
      expect(annual.cashFlow).toBeCloseTo(monthlyCashFlowSum, 2);
    });

    it('should calculate rental revenue correctly', () => {
      const config = createTestConfig({
        units: 20,
        avgNightlyRate: 500,
        occupancyByMonth: Array(12).fill(0.6),
      });
      const result = runVillasEngine(config);

      // Expected rental revenue per month:
      // occupiedNights = 20 * 0.6 * 30 = 360
      // rentalRevenue = 360 * 500 = 180,000
      const expectedMonthlyRentalRevenue = 20 * 0.6 * 30 * 500;
      expect(result.monthlyPnl[0].roomRevenue).toBe(expectedMonthlyRentalRevenue);
    });

    it('should calculate food and beverage revenue as percentage of rental revenue', () => {
      const config = createTestConfig({
        foodRevenuePctOfRental: 0.25,
        beverageRevenuePctOfRental: 0.12,
      });
      const result = runVillasEngine(config);

      const firstMonth = result.monthlyPnl[0];
      expect(firstMonth.foodRevenue).toBeCloseTo(firstMonth.roomRevenue * 0.25, 2);
      expect(firstMonth.beverageRevenue).toBeCloseTo(firstMonth.roomRevenue * 0.12, 2);
    });

    it('should handle multiple years correctly', () => {
      const config = createTestConfig({
        horizonYears: 3,
      });
      const result = runVillasEngine(config);

      expect(result.monthlyPnl.length).toBe(36); // 3 years * 12 months
      expect(result.annualPnl.length).toBe(3);

      // Verify year indices
      expect(result.annualPnl[0].yearIndex).toBe(0);
      expect(result.annualPnl[1].yearIndex).toBe(1);
      expect(result.annualPnl[2].yearIndex).toBe(2);

      // Verify month indices
      const year0Months = result.monthlyPnl.filter((m) => m.yearIndex === 0);
      expect(year0Months.length).toBe(12);
      expect(year0Months[0].monthIndex).toBe(0);
      expect(year0Months[11].monthIndex).toBe(11);
    });
  });

  describe('Zero occupancy', () => {
    it('should generate zero revenues, COGS, OPEX, and cash flows when occupancy is zero', () => {
      const config = createTestConfig({
        occupancyByMonth: Array(12).fill(0),
      });
      const result = runVillasEngine(config);

      // Check monthly P&L
      for (const monthly of result.monthlyPnl) {
        expect(monthly.roomRevenue).toBe(0);
        expect(monthly.foodRevenue).toBe(0);
        expect(monthly.beverageRevenue).toBe(0);
        expect(monthly.otherRevenue).toBe(0);
        expect(monthly.foodCogs).toBe(0);
        expect(monthly.beverageCogs).toBe(0);
        expect(monthly.payroll).toBe(0);
        expect(monthly.utilities).toBe(0);
        expect(monthly.marketing).toBe(0);
        expect(monthly.maintenanceOpex).toBe(0);
        expect(monthly.otherOpex).toBe(0);
        expect(monthly.grossOperatingProfit).toBe(0);
        expect(monthly.ebitda).toBe(0);
        expect(monthly.noi).toBe(0);
        expect(monthly.maintenanceCapex).toBe(0);
        expect(monthly.cashFlow).toBe(0);
      }

      // Check annual P&L
      for (const annual of result.annualPnl) {
        expect(annual.revenueTotal).toBe(0);
        expect(annual.cogsTotal).toBe(0);
        expect(annual.opexTotal).toBe(0);
        expect(annual.ebitda).toBe(0);
        expect(annual.noi).toBe(0);
        expect(annual.maintenanceCapex).toBe(0);
        expect(annual.cashFlow).toBe(0);
      }
    });
  });

  describe('Operation ID', () => {
    it('should set operationId correctly in all monthly and annual P&L entries', () => {
      const config = createTestConfig({
        id: 'custom-villas-id',
      });
      const result = runVillasEngine(config);

      for (const monthly of result.monthlyPnl) {
        expect(monthly.operationId).toBe('custom-villas-id');
      }

      for (const annual of result.annualPnl) {
        expect(annual.operationId).toBe('custom-villas-id');
      }
    });
  });
});

