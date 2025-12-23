import { describe, it, expect } from 'vitest';
import { aggregateByOperationType, calculateReaasMetrics } from '@engines/analytics/portfolioEngine';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
  HotelConfig,
  SeniorLivingConfig,
  FullModelInput,
} from '@domain/types';

/**
 * Builds a minimal hotel configuration for testing (Non-REaaS).
 */
function buildMinimalHotelConfig(): HotelConfig {
  return {
    id: 'test-hotel-1',
    name: 'Test Hotel',
    operationType: 'HOTEL',
    startYear: 2026,
    horizonYears: 5,
    keys: 50, // 50 rooms
    avgDailyRate: 200, // $200 per room per night
    occupancyByMonth: Array(12).fill(0.70), // 70% occupancy year-round

    // Revenue mix as % of room revenue
    foodRevenuePctOfRooms: 0.30,
    beverageRevenuePctOfRooms: 0.15,
    otherRevenuePctOfRooms: 0.10,

    // COGS as % of respective revenue
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,

    // Opex as % of total revenue
    payrollPct: 0.35,
    utilitiesPct: 0.05,
    marketingPct: 0.03,
    maintenanceOpexPct: 0.04,
    otherOpexPct: 0.03,

    // Maintenance capex as % of total revenue
    maintenanceCapexPct: 0.02,

    // Explicitly set isREaaS to false (Non-REaaS)
    isREaaS: false,
  };
}

/**
 * Builds a minimal senior living configuration for testing (REaaS).
 */
function buildMinimalSeniorLivingConfig(): SeniorLivingConfig {
  return {
    id: 'test-senior-living-1',
    name: 'Test Senior Living',
    operationType: 'SENIOR_LIVING',
    startYear: 2026,
    horizonYears: 5,
    units: 100, // 100 units
    avgMonthlyRate: 5000, // $5,000 per unit per month
    occupancyByMonth: Array(12).fill(0.85), // 85% occupancy year-round

    // Revenue mix as % of rental revenue
    careRevenuePctOfRental: 0.20,
    foodRevenuePctOfRental: 0.10,
    otherRevenuePctOfRental: 0.05,

    // COGS as % of respective revenue
    foodCogsPct: 0.30,
    careCogsPct: 0.40,

    // Opex as % of total revenue
    payrollPct: 0.40,
    utilitiesPct: 0.06,
    marketingPct: 0.02,
    maintenanceOpexPct: 0.05,
    otherOpexPct: 0.02,

    // Maintenance capex as % of total revenue
    maintenanceCapexPct: 0.03,

    // Explicitly set isREaaS to true (REaaS)
    isREaaS: true,
  };
}

describe('Portfolio Engine', () => {
  describe('aggregateByOperationType', () => {
    it('should aggregate metrics by operation type correctly', () => {
      const scenario: ProjectScenario = {
        id: 'test-scenario-portfolio',
        name: 'Test Portfolio Scenario',
        startYear: 2026,
        horizonYears: 5,
        operations: [
          buildMinimalHotelConfig(),
          buildMinimalSeniorLivingConfig(),
        ],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000, // $50M initial investment
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [],
      };

      const waterfallConfig: WaterfallConfig = {
        equityClasses: [
          {
            id: 'lp',
            name: 'Limited Partner',
            contributionPct: 1.0,
            distributionPct: 1.0,
          },
        ],
      };

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);
      const aggregation = aggregateByOperationType(output);

      // Verify HOTEL aggregation
      expect(aggregation.HOTEL.revenue).toBeGreaterThan(0);
      expect(aggregation.HOTEL.noi).toBeGreaterThan(0);
      // Valuation (NPV) can be negative if initial investment exceeds cash flow returns
      // This is mathematically valid - negative NPV indicates an unprofitable investment
      expect(Number.isFinite(aggregation.HOTEL.valuation)).toBe(true);

      // Verify SENIOR_LIVING aggregation
      expect(aggregation.SENIOR_LIVING.revenue).toBeGreaterThan(0);
      expect(aggregation.SENIOR_LIVING.noi).toBeGreaterThan(0);
      // Valuation (NPV) can be negative if initial investment exceeds cash flow returns
      expect(Number.isFinite(aggregation.SENIOR_LIVING.valuation)).toBe(true);

      // Verify other operation types are initialized to zero
      expect(aggregation.VILLAS.revenue).toBe(0);
      expect(aggregation.VILLAS.noi).toBe(0);
      expect(aggregation.VILLAS.valuation).toBe(0);

      // Verify valuation sums approximately to enterprise value (allowing for rounding)
      const totalValuation = Object.values(aggregation).reduce(
        (sum, metrics) => sum + metrics.valuation,
        0
      );
      expect(totalValuation).toBeCloseTo(output.project.dcfValuation.enterpriseValue, 0);
    });

    it('should satisfy conservation of mass: aggregateByOperationType sums equal consolidatedPnl totals', () => {
      // This test validates that the sum of parts equals the whole (conservation of mass)
      // The sum of all operation type aggregations must equal the consolidated totals
      const scenario: ProjectScenario = {
        id: 'test-scenario-conservation',
        name: 'Test Conservation of Mass Scenario',
        startYear: 2026,
        horizonYears: 5,
        operations: [
          buildMinimalHotelConfig(),
          buildMinimalSeniorLivingConfig(),
        ],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000,
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [],
      };

      const waterfallConfig: WaterfallConfig = {
        equityClasses: [
          {
            id: 'lp',
            name: 'Limited Partner',
            contributionPct: 1.0,
            distributionPct: 1.0,
          },
        ],
      };

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);
      const aggregation = aggregateByOperationType(output);

      // Calculate totals from aggregateByOperationType
      const aggregatedTotalRevenue = Object.values(aggregation).reduce(
        (sum, metrics) => sum + metrics.revenue,
        0
      );
      const aggregatedTotalNoi = Object.values(aggregation).reduce(
        (sum, metrics) => sum + metrics.noi,
        0
      );

      // Calculate totals from consolidatedPnl
      const consolidatedTotalRevenue = output.consolidatedAnnualPnl.reduce(
        (sum, pnl) => sum + pnl.revenueTotal,
        0
      );
      const consolidatedTotalNoi = output.consolidatedAnnualPnl.reduce(
        (sum, pnl) => sum + pnl.noi,
        0
      );

      // Conservation of mass: The sum of parts must equal the whole
      // Using toBeCloseTo to handle floating-point precision issues
      expect(aggregatedTotalRevenue).toBeCloseTo(consolidatedTotalRevenue, 2);
      expect(aggregatedTotalNoi).toBeCloseTo(consolidatedTotalNoi, 2);

      // Additional validation: Both totals should be positive for a valid scenario
      expect(aggregatedTotalRevenue).toBeGreaterThan(0);
      expect(aggregatedTotalNoi).toBeGreaterThan(0);
      expect(consolidatedTotalRevenue).toBeGreaterThan(0);
      expect(consolidatedTotalNoi).toBeGreaterThan(0);
    });
  });

  describe('calculateReaasMetrics', () => {
    it('should calculate REaaS metrics correctly for Hotel (Non-REaaS) and Senior Living (REaaS)', () => {
      const scenario: ProjectScenario = {
        id: 'test-scenario-reaas',
        name: 'Test REaaS Scenario',
        startYear: 2026,
        horizonYears: 5,
        operations: [
          buildMinimalHotelConfig(), // Non-REaaS
          buildMinimalSeniorLivingConfig(), // REaaS
        ],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000,
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [],
      };

      const waterfallConfig: WaterfallConfig = {
        equityClasses: [
          {
            id: 'lp',
            name: 'Limited Partner',
            contributionPct: 1.0,
            distributionPct: 1.0,
          },
        ],
      };

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);
      const reaasMetrics = calculateReaasMetrics(output, input);

      // Verify REaaS revenue is positive (from Senior Living)
      expect(reaasMetrics.totalReaasRevenue).toBeGreaterThan(0);

      // Verify REaaS NOI is positive
      expect(reaasMetrics.reaasNoi).toBeGreaterThan(0);

      // Verify revenue share is between 0 and 1
      expect(reaasMetrics.reaasRevenueShare).toBeGreaterThan(0);
      expect(reaasMetrics.reaasRevenueShare).toBeLessThanOrEqual(1);

      // Calculate total revenue from consolidated P&L
      const totalRevenue = output.consolidatedAnnualPnl.reduce(
        (sum, pnl) => sum + pnl.revenueTotal,
        0
      );

      // Verify revenue share calculation is correct
      const expectedRevenueShare = totalRevenue > 0
        ? reaasMetrics.totalReaasRevenue / totalRevenue
        : 0;
      expect(reaasMetrics.reaasRevenueShare).toBeCloseTo(expectedRevenueShare, 6);

      // Verify REaaS revenue is less than total revenue (since Hotel is Non-REaaS)
      expect(reaasMetrics.totalReaasRevenue).toBeLessThan(totalRevenue);

      // Verify REaaS revenue share should be significant (Senior Living typically has high revenue)
      // In this test, Senior Living should contribute a substantial portion
      expect(reaasMetrics.reaasRevenueShare).toBeGreaterThan(0.3); // At least 30% from Senior Living
    });

    it('should handle scenario with no REaaS operations', () => {
      const scenario: ProjectScenario = {
        id: 'test-scenario-no-reaas',
        name: 'Test No REaaS Scenario',
        startYear: 2026,
        horizonYears: 5,
        operations: [
          buildMinimalHotelConfig(), // Non-REaaS
        ],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 30000000,
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [],
      };

      const waterfallConfig: WaterfallConfig = {
        equityClasses: [
          {
            id: 'lp',
            name: 'Limited Partner',
            contributionPct: 1.0,
            distributionPct: 1.0,
          },
        ],
      };

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);
      const reaasMetrics = calculateReaasMetrics(output, input);

      // Verify REaaS metrics are zero when no REaaS operations
      expect(reaasMetrics.totalReaasRevenue).toBe(0);
      expect(reaasMetrics.reaasNoi).toBe(0);
      expect(reaasMetrics.reaasRevenueShare).toBe(0);
    });
  });
});

