import { describe, it, expect } from 'vitest';
import { runRestaurantEngine } from '@engines/operations/restaurantEngine';
import type { RestaurantConfig } from '@domain/types';

describe('Restaurant Engine', () => {
  const createTestConfig = (overrides?: Partial<RestaurantConfig>): RestaurantConfig => {
    return {
      id: 'test-restaurant-1',
      name: 'Test Restaurant',
      operationType: 'RESTAURANT',
      startYear: 2026,
      horizonYears: 1,
      covers: 100,
      avgCheck: 50,
      turnoverByMonth: Array(12).fill(1.5), // 1.5 turns per day
      foodRevenuePctOfTotal: 0.70,
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
      const result = runRestaurantEngine(config);

      expect(result.monthlyPnl.length).toBe(12);
      expect(result.annualPnl.length).toBe(1);
    });

    it('should have positive revenue for non-zero turnover', () => {
      const config = createTestConfig();
      const result = runRestaurantEngine(config);

      expect(result.annualPnl[0].revenueTotal).toBeGreaterThan(0);
    });

    it('should aggregate monthly totals correctly into annual totals', () => {
      const config = createTestConfig();
      const result = runRestaurantEngine(config);

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

    it('should calculate total revenue correctly', () => {
      const config = createTestConfig({
        covers: 100,
        avgCheck: 50,
        turnoverByMonth: Array(12).fill(1.5),
      });
      const result = runRestaurantEngine(config);

      // Expected revenue per month:
      // totalCovers = 100 * 1.5 * 30 = 4500
      // totalRevenue = 4500 * 50 = 225,000
      const expectedMonthlyTotalRevenue = 100 * 1.5 * 30 * 50;
      
      // Total revenue = roomRevenue + foodRevenue + beverageRevenue + otherRevenue
      const firstMonth = result.monthlyPnl[0];
      const totalRevenue = firstMonth.roomRevenue + firstMonth.foodRevenue + firstMonth.beverageRevenue + firstMonth.otherRevenue;
      expect(totalRevenue).toBe(expectedMonthlyTotalRevenue);
    });

    it('should calculate food and beverage revenue as percentage of total revenue', () => {
      const config = createTestConfig({
        foodRevenuePctOfTotal: 0.70,
        beverageRevenuePctOfTotal: 0.20,
        otherRevenuePctOfTotal: 0.10,
      });
      const result = runRestaurantEngine(config);

      const firstMonth = result.monthlyPnl[0];
      const totalRevenue = firstMonth.roomRevenue + firstMonth.foodRevenue + firstMonth.beverageRevenue + firstMonth.otherRevenue;
      
      expect(firstMonth.foodRevenue).toBeCloseTo(totalRevenue * 0.70, 2);
      expect(firstMonth.beverageRevenue).toBeCloseTo(totalRevenue * 0.20, 2);
      expect(firstMonth.otherRevenue).toBeCloseTo(totalRevenue * 0.10, 2);
    });

    it('should handle multiple years correctly', () => {
      const config = createTestConfig({
        horizonYears: 3,
      });
      const result = runRestaurantEngine(config);

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

  describe('Zero turnover', () => {
    it('should generate zero revenues, COGS, OPEX, and cash flows when turnover is zero', () => {
      const config = createTestConfig({
        turnoverByMonth: Array(12).fill(0),
      });
      const result = runRestaurantEngine(config);

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
        id: 'custom-restaurant-id',
      });
      const result = runRestaurantEngine(config);

      for (const monthly of result.monthlyPnl) {
        expect(monthly.operationId).toBe('custom-restaurant-id');
      }

      for (const annual of result.annualPnl) {
        expect(annual.operationId).toBe('custom-restaurant-id');
      }
    });
  });
});

