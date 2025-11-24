import { describe, it, expect } from 'vitest';
import { runRacquetEngine } from '@engines/operations/racquetEngine';
import type { RacquetConfig } from '@domain/types';

describe('Racquet Engine', () => {
  const createTestConfig = (overrides?: Partial<RacquetConfig>): RacquetConfig => {
    return {
      id: 'test-racquet-1',
      name: 'Test Racquet',
      operationType: 'RACQUET',
      startYear: 2026,
      horizonYears: 1,
      courts: 8,
      avgCourtRate: 40,
      utilizationByMonth: Array(12).fill(0.7),
      hoursPerDay: 14,
      memberships: 300,
      avgMembershipFee: 2000,
      foodRevenuePctOfTotal: 0.25,
      beverageRevenuePctOfTotal: 0.15,
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
      const result = runRacquetEngine(config);

      expect(result.monthlyPnl.length).toBe(12);
      expect(result.annualPnl.length).toBe(1);
    });

    it('should have positive revenue for non-zero utilization', () => {
      const config = createTestConfig();
      const result = runRacquetEngine(config);

      expect(result.annualPnl[0].revenueTotal).toBeGreaterThan(0);
    });

    it('should calculate court revenue correctly', () => {
      const config = createTestConfig({
        courts: 8,
        avgCourtRate: 40,
        utilizationByMonth: Array(12).fill(0.7),
        hoursPerDay: 14,
      });
      const result = runRacquetEngine(config);

      // Expected court revenue per month:
      // courtHoursPerMonth = 8 * 0.7 * 14 * 30 = 2352
      // courtRevenue = 2352 * 40 = 94,080
      const expectedCourtRevenue = 8 * 0.7 * 14 * 30 * 40;
      expect(result.monthlyPnl[0].roomRevenue).toBeGreaterThanOrEqual(expectedCourtRevenue);
    });

    it('should handle multiple years correctly', () => {
      const config = createTestConfig({
        horizonYears: 3,
      });
      const result = runRacquetEngine(config);

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
      const result = runRacquetEngine(config);

      for (const monthly of result.monthlyPnl) {
        expect(monthly.roomRevenue).toBe(0);
        expect(monthly.noi).toBe(0);
      }
    });
  });
});

