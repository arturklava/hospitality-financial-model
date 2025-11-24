import { describe, it, expect } from 'vitest';
import { runHotelEngine } from '@engines/operations/hotelEngine';
import type { HotelConfig } from '@domain/types';

describe('Hotel Engine', () => {
  const createTestConfig = (overrides?: Partial<HotelConfig>): HotelConfig => {
    return {
      id: 'test-hotel-1',
      name: 'Test Hotel',
      operationType: 'HOTEL',
      startYear: 2026,
      horizonYears: 1,
      keys: 100,
      avgDailyRate: 200,
      occupancyByMonth: Array(12).fill(0.7),
      foodRevenuePctOfRooms: 0.3,
      beverageRevenuePctOfRooms: 0.15,
      otherRevenuePctOfRooms: 0.1,
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
      const result = runHotelEngine(config);

      expect(result.monthlyPnl.length).toBe(12);
      expect(result.annualPnl.length).toBe(1);
    });

    it('should have positive revenue for non-zero occupancy', () => {
      const config = createTestConfig();
      const result = runHotelEngine(config);

      expect(result.annualPnl[0].revenueTotal).toBeGreaterThan(0);
    });

    it('should aggregate monthly totals correctly into annual totals', () => {
      const config = createTestConfig();
      const result = runHotelEngine(config);

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

    it('should calculate room revenue correctly', () => {
      const config = createTestConfig({
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.7),
      });
      const result = runHotelEngine(config);

      // Expected room revenue per month:
      // occupiedRooms = 100 * 0.7 * 30 = 2100
      // roomRevenue = 2100 * 200 = 420,000
      const expectedMonthlyRoomRevenue = 100 * 0.7 * 30 * 200;
      expect(result.monthlyPnl[0].roomRevenue).toBe(expectedMonthlyRoomRevenue);
    });

    it('should calculate food and beverage revenue as percentage of room revenue', () => {
      const config = createTestConfig({
        foodRevenuePctOfRooms: 0.3,
        beverageRevenuePctOfRooms: 0.15,
      });
      const result = runHotelEngine(config);

      const firstMonth = result.monthlyPnl[0];
      expect(firstMonth.foodRevenue).toBeCloseTo(firstMonth.roomRevenue * 0.3, 2);
      expect(firstMonth.beverageRevenue).toBeCloseTo(firstMonth.roomRevenue * 0.15, 2);
    });

    it('should handle multiple years correctly', () => {
      const config = createTestConfig({
        horizonYears: 3,
      });
      const result = runHotelEngine(config);

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
      const result = runHotelEngine(config);

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
        id: 'custom-hotel-id',
      });
      const result = runHotelEngine(config);

      for (const monthly of result.monthlyPnl) {
        expect(monthly.operationId).toBe('custom-hotel-id');
      }

      for (const annual of result.annualPnl) {
        expect(annual.operationId).toBe('custom-hotel-id');
      }
    });
  });
});

