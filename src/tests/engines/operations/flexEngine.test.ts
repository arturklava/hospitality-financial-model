import { describe, it, expect } from 'vitest';
import { runFlexEngine } from '@engines/operations/flexEngine';
import type { FlexConfig } from '@domain/types';

describe('Flex Engine', () => {
  const createTestConfig = (overrides?: Partial<FlexConfig>): FlexConfig => {
    return {
      id: 'test-flex-1',
      name: 'Test Flex',
      operationType: 'FLEX',
      startYear: 2026,
      horizonYears: 1,
      sqm: 2000,
      avgRentPerSqm: 80,
      occupancyByMonth: Array(12).fill(0.75),
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
      const result = runFlexEngine(config);

      expect(result.monthlyPnl.length).toBe(12);
      expect(result.annualPnl.length).toBe(1);
    });

    it('should have positive revenue for non-zero occupancy', () => {
      const config = createTestConfig();
      const result = runFlexEngine(config);

      expect(result.annualPnl[0].revenueTotal).toBeGreaterThan(0);
    });

    it('should calculate rental revenue correctly', () => {
      const config = createTestConfig({
        sqm: 2000,
        avgRentPerSqm: 80,
        occupancyByMonth: Array(12).fill(0.75),
      });
      const result = runFlexEngine(config);

      const expectedRentalRevenue = 2000 * 0.75 * 80;
      expect(result.monthlyPnl[0].roomRevenue).toBe(expectedRentalRevenue);
    });

    it('should have zero food and beverage revenue', () => {
      const config = createTestConfig();
      const result = runFlexEngine(config);

      for (const monthly of result.monthlyPnl) {
        expect(monthly.foodRevenue).toBe(0);
        expect(monthly.beverageRevenue).toBe(0);
      }
    });

    it('should handle multiple years correctly', () => {
      const config = createTestConfig({
        horizonYears: 3,
      });
      const result = runFlexEngine(config);

      expect(result.monthlyPnl.length).toBe(36);
      expect(result.annualPnl.length).toBe(3);
    });
  });
});

