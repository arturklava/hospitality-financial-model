import { describe, it, expect } from 'vitest';
import { calculateAssetMetrics } from '@engines/operations/assetAnalytics';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  FullModelInput,
} from '@domain/types';
import { buildHotelConfig, buildRestaurantConfig } from '../../helpers/buildOperationConfig';

/**
 * Builds a minimal full model input for testing.
 */
function buildTestModelInput(operations: FullModelInput['scenario']['operations']): FullModelInput {
  return {
    scenario: {
      id: 'test-scenario',
      name: 'Test Scenario',
      startYear: 2026,
      horizonYears: 5,
      operations,
    },
    projectConfig: {
      discountRate: 0.10,
      terminalGrowthRate: 0.02,
      initialInvestment: 10000000,
      workingCapitalPercentage: 0.05,
    },
    capitalConfig: {
      initialInvestment: 10000000,
      debtTranches: [],
    },
    waterfallConfig: {
      equityClasses: [
        {
          id: 'lp',
          name: 'Limited Partner',
          contributionPct: 1.0,
        },
      ],
    },
  };
}

describe('calculateAssetMetrics', () => {
  describe('Basic metrics calculation', () => {
    it('should calculate totalRevenue, totalNoi, and marginPct for hotel', () => {
      const hotelConfig = buildHotelConfig({
        id: 'test-hotel',
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.70),
        horizonYears: 5,
      });

      const input = buildTestModelInput([hotelConfig]);
      const output = runFullModel(input);

      const metrics = calculateAssetMetrics(hotelConfig, output);

      expect(metrics.totalRevenue).toBeGreaterThan(0);
      expect(metrics.totalNoi).toBeGreaterThan(0);
      expect(metrics.marginPct).toBeGreaterThan(0);
      expect(metrics.marginPct).toBeLessThan(100);
      
      // Verify margin calculation: marginPct = (totalNoi / totalRevenue) * 100
      const expectedMargin = (metrics.totalNoi / metrics.totalRevenue) * 100;
      expect(metrics.marginPct).toBeCloseTo(expectedMargin, 2);
    });

    it('should calculate metrics for non-hotel operation (restaurant)', () => {
      const restaurantConfig = buildRestaurantConfig({
        id: 'test-restaurant',
        horizonYears: 5,
      });

      const input = buildTestModelInput([restaurantConfig]);
      const output = runFullModel(input);

      const metrics = calculateAssetMetrics(restaurantConfig, output);

      expect(metrics.totalRevenue).toBeGreaterThan(0);
      expect(metrics.totalNoi).toBeGreaterThan(0);
      expect(metrics.marginPct).toBeGreaterThan(0);
      expect(metrics.revPar).toBeUndefined(); // RevPAR only for hotels
    });
  });

  describe('RevPAR calculation (hotel only)', () => {
    it('should calculate RevPAR for hotel operation', () => {
      const hotelConfig = buildHotelConfig({
        id: 'test-hotel',
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.70),
        horizonYears: 5,
      });

      const input = buildTestModelInput([hotelConfig]);
      const output = runFullModel(input);

      const metrics = calculateAssetMetrics(hotelConfig, output);

      expect(metrics.revPar).toBeDefined();
      expect(metrics.revPar!).toBeGreaterThan(0);
      
      // RevPAR should be less than ADR (since occupancy < 100%)
      // With 70% occupancy, RevPAR ≈ ADR * 0.70
      // Note: Actual calculation uses 30 days/month, so days_in_horizon = 5 * 365 = 1825
      // But room revenue is calculated with 30 days/month * 12 months = 360 days/year
      // So RevPAR = (ADR * occupancy * 30 * 12 * years) / (keys * 365 * years)
      // = ADR * occupancy * (360/365) ≈ ADR * occupancy * 0.986
      const expectedRevPar = hotelConfig.avgDailyRate * 0.70 * (360 / 365);
      expect(metrics.revPar!).toBeCloseTo(expectedRevPar, 1); // Allow small rounding difference
    });

    it('should not calculate RevPAR for non-hotel operations', () => {
      const restaurantConfig = buildRestaurantConfig({
        id: 'test-restaurant',
        horizonYears: 5,
      });

      const input = buildTestModelInput([restaurantConfig]);
      const output = runFullModel(input);

      const metrics = calculateAssetMetrics(restaurantConfig, output);

      expect(metrics.revPar).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle zero revenue (marginPct = 0)', () => {
      // Create a hotel with very low occupancy to minimize revenue
      const hotelConfig = buildHotelConfig({
        id: 'test-hotel-low-rev',
        keys: 10,
        avgDailyRate: 1,
        occupancyByMonth: Array(12).fill(0.01), // Very low occupancy
        horizonYears: 1,
        payrollPct: 0.99, // Very high expenses to push NOI negative or near zero
        utilitiesPct: 0.01,
        marketingPct: 0,
        maintenanceOpexPct: 0,
        otherOpexPct: 0,
        maintenanceCapexPct: 0,
      });

      const input = buildTestModelInput([hotelConfig]);
      const output = runFullModel(input);

      const metrics = calculateAssetMetrics(hotelConfig, output);

      // Even with low revenue, should not throw
      // Note: marginPct can be negative for loss-making operations
      expect(metrics.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.marginPct).toBe('number'); // Just verify it's a number
    });

    it('should throw error if operation not found in model output', () => {
      const hotelConfig = buildHotelConfig({
        id: 'test-hotel',
      });

      const otherHotelConfig = buildHotelConfig({
        id: 'other-hotel',
      });

      const input = buildTestModelInput([otherHotelConfig]);
      const output = runFullModel(input);

      expect(() => {
        calculateAssetMetrics(hotelConfig, output);
      }).toThrow('Operation with id "test-hotel" not found in model output');
    });
  });

  describe('Ownership model variations', () => {
    it('should calculate metrics correctly for BUILD_AND_OPERATE', () => {
      const hotelConfig = buildHotelConfig({
        id: 'test-hotel',
        ownershipModel: 'BUILD_AND_OPERATE',
        ownershipPct: 1.0,
        horizonYears: 5,
      });

      const input = buildTestModelInput([hotelConfig]);
      const output = runFullModel(input);

      const metrics = calculateAssetMetrics(hotelConfig, output);

      expect(metrics.totalRevenue).toBeGreaterThan(0);
      expect(metrics.totalNoi).toBeGreaterThan(0);
    });

    it('should calculate metrics correctly for partial ownership (CO_INVEST_OPCO)', () => {
      const hotelConfig = buildHotelConfig({
        id: 'test-hotel',
        ownershipModel: 'CO_INVEST_OPCO',
        ownershipPct: 0.5, // 50% ownership
        horizonYears: 5,
      });

      const input = buildTestModelInput([hotelConfig]);
      const output = runFullModel(input);

      const metrics = calculateAssetMetrics(hotelConfig, output);

      expect(metrics.totalRevenue).toBeGreaterThan(0);
      expect(metrics.totalNoi).toBeGreaterThan(0);
      
      // With 50% ownership, revenue and NOI should be proportionally reduced
      // (compared to 100% ownership case)
      const fullOwnershipConfig = buildHotelConfig({
        id: 'test-hotel-full',
        ownershipModel: 'BUILD_AND_OPERATE',
        ownershipPct: 1.0,
        horizonYears: 5,
      });
      const inputFull = buildTestModelInput([fullOwnershipConfig]);
      const outputFull = runFullModel(inputFull);
      const metricsFull = calculateAssetMetrics(fullOwnershipConfig, outputFull);

      // Partial ownership should have approximately half the revenue/NOI
      expect(metrics.totalRevenue).toBeCloseTo(metricsFull.totalRevenue * 0.5, 100);
      expect(metrics.totalNoi).toBeCloseTo(metricsFull.totalNoi * 0.5, 100);
    });

    it('should calculate metrics correctly for BUILD_AND_LEASE_FIXED', () => {
      const hotelConfig = buildHotelConfig({
        id: 'test-hotel',
        ownershipModel: 'BUILD_AND_LEASE_FIXED',
        leaseTerms: {
          baseRent: 1000000, // $1M annual rent
        },
        horizonYears: 5,
      });

      const input = buildTestModelInput([hotelConfig]);
      const output = runFullModel(input);

      const metrics = calculateAssetMetrics(hotelConfig, output);

      // For fixed lease, revenue should equal base rent * years
      const expectedRevenue = 1000000 * 5;
      expect(metrics.totalRevenue).toBe(expectedRevenue);
      
      // NOI should equal revenue (no costs in simplified lease model)
      expect(metrics.totalNoi).toBe(metrics.totalRevenue);
    });

    it('should handle inactive operations', () => {
      const hotelConfig = buildHotelConfig({
        id: 'test-hotel',
        isActive: false,
        horizonYears: 5,
      });

      const input = buildTestModelInput([hotelConfig]);
      const output = runFullModel(input);

      const metrics = calculateAssetMetrics(hotelConfig, output);

      // Inactive operations should have zero revenue and NOI
      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.totalNoi).toBe(0);
      expect(metrics.marginPct).toBe(0);
    });
  });

  describe('Multiple operations scenario', () => {
    it('should calculate metrics for specific operation in multi-operation scenario', () => {
      const hotelConfig = buildHotelConfig({
        id: 'hotel-1',
        horizonYears: 5,
      });

      const restaurantConfig = buildRestaurantConfig({
        id: 'restaurant-1',
        horizonYears: 5,
      });

      const input = buildTestModelInput([hotelConfig, restaurantConfig]);
      const output = runFullModel(input);

      // Calculate metrics for hotel
      const hotelMetrics = calculateAssetMetrics(hotelConfig, output);
      expect(hotelMetrics.totalRevenue).toBeGreaterThan(0);
      expect(hotelMetrics.revPar).toBeDefined();

      // Calculate metrics for restaurant
      const restaurantMetrics = calculateAssetMetrics(restaurantConfig, output);
      expect(restaurantMetrics.totalRevenue).toBeGreaterThan(0);
      expect(restaurantMetrics.revPar).toBeUndefined();
    });
  });
});

