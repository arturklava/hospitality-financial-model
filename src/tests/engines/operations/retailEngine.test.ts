import { describe, it, expect } from 'vitest';
import { runRetailEngine } from '@engines/operations/retailEngine';
import type { RetailConfig } from '@domain/types';

describe('Retail Engine', () => {
  const createTestConfig = (overrides?: Partial<RetailConfig>): RetailConfig => {
    return {
      id: 'test-retail-1',
      name: 'Test Retail',
      operationType: 'RETAIL',
      startYear: 2026,
      horizonYears: 1,
      sqm: 1000,
      avgRentPerSqm: 100,
      occupancyByMonth: Array(12).fill(0.85),
      rentalRevenuePctOfTotal: 0.90,
      otherRevenuePctOfTotal: 0.10,
      payrollPct: 0.15,
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
      const result = runRetailEngine(config);

      expect(result.monthlyPnl.length).toBe(12);
      expect(result.annualPnl.length).toBe(1);
    });

    it('should have positive revenue for non-zero occupancy', () => {
      const config = createTestConfig();
      const result = runRetailEngine(config);

      expect(result.annualPnl[0].revenueTotal).toBeGreaterThan(0);
    });

    it('should calculate rental revenue correctly', () => {
      const config = createTestConfig({
        sqm: 1000,
        avgRentPerSqm: 100,
        occupancyByMonth: Array(12).fill(0.85),
      });
      const result = runRetailEngine(config);

      // Expected rental revenue per month:
      // occupiedSqm = 1000 * 0.85 = 850
      // rentalRevenue = 850 * 100 = 85,000
      const expectedRentalRevenue = 1000 * 0.85 * 100;
      expect(result.monthlyPnl[0].roomRevenue).toBe(expectedRentalRevenue);
    });

    it('should have zero food and beverage revenue', () => {
      const config = createTestConfig();
      const result = runRetailEngine(config);

      for (const monthly of result.monthlyPnl) {
        expect(monthly.foodRevenue).toBe(0);
        expect(monthly.beverageRevenue).toBe(0);
        expect(monthly.foodCogs).toBe(0);
        expect(monthly.beverageCogs).toBe(0);
      }
    });

    it('should handle multiple years correctly', () => {
      const config = createTestConfig({
        horizonYears: 3,
      });
      const result = runRetailEngine(config);

      expect(result.monthlyPnl.length).toBe(36);
      expect(result.annualPnl.length).toBe(3);
    });
  });

  describe('Zero occupancy', () => {
    it('should generate zero revenues when occupancy is zero', () => {
      const config = createTestConfig({
        occupancyByMonth: Array(12).fill(0),
      });
      const result = runRetailEngine(config);

      for (const monthly of result.monthlyPnl) {
        expect(monthly.roomRevenue).toBe(0);
        expect(monthly.noi).toBe(0);
      }
    });
  });
});

