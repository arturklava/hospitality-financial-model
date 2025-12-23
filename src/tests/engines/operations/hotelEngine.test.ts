import { describe, it, expect } from 'vitest';
import { runHotelEngine } from '@engines/operations/hotelEngine';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '@engines/operations/utils';
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

    it('should reconcile annual revenue to monthly assumptions using 30-day months', () => {
      const config = createTestConfig({
        occupancyByMonth: Array(12).fill(0.65),
        avgDailyRate: 180,
        foodRevenuePctOfRooms: 0.25,
        beverageRevenuePctOfRooms: 0.1,
        otherRevenuePctOfRooms: 0.05,
      });
      const result = runHotelEngine(config);

      const expectedMonthlyRoomRevenue = config.keys * 0.65 * DAYS_PER_MONTH * config.avgDailyRate;
      const expectedMonthlyTotalRevenue = expectedMonthlyRoomRevenue
        * (1 + config.foodRevenuePctOfRooms + config.beverageRevenuePctOfRooms + config.otherRevenuePctOfRooms);
      const expectedAnnualRevenue = expectedMonthlyTotalRevenue * MONTHS_PER_YEAR;

      expect(result.monthlyPnl).toHaveLength(MONTHS_PER_YEAR);
      expect(result.annualPnl[0].revenueTotal).toBeCloseTo(expectedAnnualRevenue, 2);
      const summedMonthly = result.monthlyPnl.reduce(
        (sum, month) => sum + month.roomRevenue + month.foodRevenue + month.beverageRevenue + month.otherRevenue,
        0,
      );
      expect(result.annualPnl[0].revenueTotal).toBeCloseTo(summedMonthly, 6);
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

  describe('KPI Validation: GOP (Gross Operating Profit)', () => {
    it('should calculate GOP correctly as totalRevenue - departmentalExpenses', () => {
      const config = createTestConfig({
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.7),
        foodRevenuePctOfRooms: 0.3,
        beverageRevenuePctOfRooms: 0.15,
        foodCogsPct: 0.35,
        beverageCogsPct: 0.25,
        commissionsPct: 0.10, // 10% commissions
      });
      const result = runHotelEngine(config);

      const firstMonth = result.monthlyPnl[0];

      // Calculate expected departmental expenses (COGS + commissions)
      const expectedFoodCogs = firstMonth.foodRevenue * 0.35;
      const expectedBeverageCogs = firstMonth.beverageRevenue * 0.25;
      const expectedCommissions = firstMonth.roomRevenue * 0.10;
      const expectedDepartmentalExpenses = expectedFoodCogs + expectedBeverageCogs + expectedCommissions;

      // Calculate expected GOP
      const totalRevenue = firstMonth.roomRevenue + firstMonth.foodRevenue + firstMonth.beverageRevenue + firstMonth.otherRevenue;
      const expectedGOP = totalRevenue - expectedDepartmentalExpenses;

      expect(firstMonth.grossOperatingProfit).toBeCloseTo(expectedGOP, 2);
      expect(firstMonth.grossOperatingProfit).toBeGreaterThan(0);
    });

    it('should have GOP <= totalRevenue (invariant)', () => {
      const config = createTestConfig();
      const result = runHotelEngine(config);

      for (const monthly of result.monthlyPnl) {
        const totalRevenue = monthly.roomRevenue + monthly.foodRevenue + monthly.beverageRevenue + monthly.otherRevenue;
        expect(monthly.grossOperatingProfit).toBeLessThanOrEqual(totalRevenue);
      }
    });

    it('should calculate GOP margin % correctly', () => {
      const config = createTestConfig({
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.7),
        foodCogsPct: 0.30,
        beverageCogsPct: 0.25,
      });
      const result = runHotelEngine(config);

      const firstMonth = result.monthlyPnl[0];
      const totalRevenue = firstMonth.roomRevenue + firstMonth.foodRevenue + firstMonth.beverageRevenue + firstMonth.otherRevenue;
      const gopMarginPct = (firstMonth.grossOperatingProfit / totalRevenue) * 100;

      expect(gopMarginPct).toBeGreaterThan(0);
      expect(gopMarginPct).toBeLessThan(100);
      expect(Number.isFinite(gopMarginPct)).toBe(true);
    });
  });

  describe('KPI Validation: RevPAR (Revenue per Available Room)', () => {
    it('should validate RevPAR formula: RevPAR = ADR × occupancy × (360/365)', () => {
      const config = createTestConfig({
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.70),
        horizonYears: 1,
      });
      const result = runHotelEngine(config);

      // Calculate total room revenue from monthly P&L
      const totalRoomRevenue = result.monthlyPnl.reduce((sum, m) => sum + m.roomRevenue, 0);

      // Calculate RevPAR using the formula from assetAnalytics.ts
      // RevPAR = totalRoomRevenue / (keys × 365 × horizonYears)
      const daysInHorizon = config.horizonYears * 365;
      const availableRoomNights = config.keys * daysInHorizon;
      const calculatedRevPAR = totalRoomRevenue / availableRoomNights;

      // Expected RevPAR accounting for 360/365 discrepancy
      // Engines use 30 days/month = 360 days/year
      // RevPAR denominator uses 365 days/year
      const expectedRevPAR = config.avgDailyRate * 0.70 * (360 / 365);

      expect(calculatedRevPAR).toBeCloseTo(expectedRevPAR, 1);
      expect(calculatedRevPAR).toBeLessThan(config.avgDailyRate); // RevPAR < ADR when occupancy < 100%
    });

    it('should have RevPAR <= ADR (invariant for occupancy <= 100%)', () => {
      const config = createTestConfig({
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.85),
        horizonYears: 1,
      });
      const result = runHotelEngine(config);

      const totalRoomRevenue = result.monthlyPnl.reduce((sum, m) => sum + m.roomRevenue, 0);
      const availableRoomNights = config.keys * 365 * config.horizonYears;
      const revPAR = totalRoomRevenue / availableRoomNights;

      expect(revPAR).toBeLessThanOrEqual(config.avgDailyRate);
    });

    it('should calculate RevPAR = 0 when occupancy = 0', () => {
      const config = createTestConfig({
        occupancyByMonth: Array(12).fill(0),
      });
      const result = runHotelEngine(config);

      const totalRoomRevenue = result.monthlyPnl.reduce((sum, m) => sum + m.roomRevenue, 0);
      expect(totalRoomRevenue).toBe(0);

      const availableRoomNights = config.keys * 365 * config.horizonYears;
      const revPAR = totalRoomRevenue / availableRoomNights;
      expect(revPAR).toBe(0);
    });
  });

  describe('Edge Cases: Extreme ADR', () => {
    it('should handle very high ADR (luxury resort scenario)', () => {
      const config = createTestConfig({
        keys: 50,
        avgDailyRate: 10000, // $10,000/night luxury resort
        occupancyByMonth: Array(12).fill(0.60),
        horizonYears: 1,
      });
      const result = runHotelEngine(config);

      expect(result.monthlyPnl[0].roomRevenue).toBeGreaterThan(0);
      expect(Number.isFinite(result.monthlyPnl[0].roomRevenue)).toBe(true);
      expect(result.annualPnl[0].revenueTotal).toBeGreaterThan(0);
    });

    it('should handle very low ADR (budget hotel scenario)', () => {
      const config = createTestConfig({
        keys: 200,
        avgDailyRate: 25, // $25/night budget hotel
        occupancyByMonth: Array(12).fill(0.80),
        horizonYears: 1,
      });
      const result = runHotelEngine(config);

      expect(result.monthlyPnl[0].roomRevenue).toBeGreaterThan(0);
      expect(Number.isFinite(result.monthlyPnl[0].roomRevenue)).toBe(true);
    });
  });

  describe('Edge Cases: Zero Costs', () => {
    it('should have GOP = totalRevenue when all cost percentages = 0', () => {
      const config = createTestConfig({
        foodCogsPct: 0,
        beverageCogsPct: 0,
        commissionsPct: 0,
        payrollPct: 0,
        utilitiesPct: 0,
        marketingPct: 0,
        maintenanceOpexPct: 0,
        otherOpexPct: 0,
        maintenanceCapexPct: 0,
      });
      const result = runHotelEngine(config);

      for (const monthly of result.monthlyPnl) {
        const totalRevenue = monthly.roomRevenue + monthly.foodRevenue + monthly.beverageRevenue + monthly.otherRevenue;
        expect(monthly.grossOperatingProfit).toBeCloseTo(totalRevenue, 2);
        expect(monthly.ebitda).toBeCloseTo(totalRevenue, 2);
        expect(monthly.noi).toBeCloseTo(totalRevenue, 2);
      }
    });

    it('should have all values finite (no NaN or Infinity)', () => {
      const config = createTestConfig();
      const result = runHotelEngine(config);

      for (const monthly of result.monthlyPnl) {
        expect(Number.isFinite(monthly.roomRevenue)).toBe(true);
        expect(Number.isFinite(monthly.foodRevenue)).toBe(true);
        expect(Number.isFinite(monthly.beverageRevenue)).toBe(true);
        expect(Number.isFinite(monthly.otherRevenue)).toBe(true);
        expect(Number.isFinite(monthly.foodCogs)).toBe(true);
        expect(Number.isFinite(monthly.beverageCogs)).toBe(true);
        expect(Number.isFinite(monthly.grossOperatingProfit)).toBe(true);
        expect(Number.isFinite(monthly.ebitda)).toBe(true);
        expect(Number.isFinite(monthly.noi)).toBe(true);
        expect(Number.isFinite(monthly.maintenanceCapex)).toBe(true);
        expect(Number.isFinite(monthly.cashFlow)).toBe(true);
      }
    });
  });
});

