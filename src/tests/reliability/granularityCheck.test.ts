/**
 * Granularity Check Tests (Milestone v5.8: Granularity Check)
 * 
 * Verifies:
 * 1. Aggregation Test: Consolidated.foodRevenue equals Hotel.foodRevenue + Restaurant.foodRevenue
 * 2. KPI Logic Test: Retail KPI calculates Rent / sqm correctly
 */

import { describe, it, expect } from 'vitest';
import { runScenarioEngine } from '@engines/scenario/scenarioEngine';
import { getOperationKpis } from '@engines/analytics/kpiFactory';
import { buildHotelConfig, buildRestaurantConfig, buildRetailConfig } from '../helpers/buildOperationConfig';
import type { ProjectScenario } from '@domain/types';

describe('Granularity Check (v5.8)', () => {
  describe('Aggregation Test: Consolidated foodRevenue', () => {
    it('should verify that Consolidated.foodRevenue equals Hotel.foodRevenue + Restaurant.foodRevenue', () => {
      // Create scenario with 1 Hotel + 1 Restaurant
      const hotel = buildHotelConfig({
        id: 'hotel-1',
        name: 'Test Hotel',
        startYear: 2026,
        horizonYears: 1,
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.7),
        foodRevenuePctOfRooms: 0.3, // 30% food revenue from rooms
      });

      const restaurant = buildRestaurantConfig({
        id: 'restaurant-1',
        name: 'Test Restaurant',
        startYear: 2026,
        horizonYears: 1,
        covers: 150,
        avgCheck: 60,
        turnoverByMonth: Array(12).fill(1.5),
        foodRevenuePctOfTotal: 0.7, // 70% food revenue
      });

      const scenario: ProjectScenario = {
        id: 'test-scenario-granularity',
        name: 'Test Granularity Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotel, restaurant],
      };

      const result = runScenarioEngine(scenario);

      // Verify we have results for both operations
      expect(result.operations.length).toBe(2);
      expect(result.operations[0].operationId).toBe('hotel-1');
      expect(result.operations[1].operationId).toBe('restaurant-1');

      // Get consolidated annual P&L for year 0
      const consolidated = result.consolidatedAnnualPnl[0];
      expect(consolidated).toBeDefined();
      expect(consolidated.foodRevenue).toBeDefined();

      // Calculate expected foodRevenue from individual operations
      // Sum foodRevenue from monthly P&L for each operation (sponsor-adjusted)
      let expectedHotelFoodRevenue = 0;
      let expectedRestaurantFoodRevenue = 0;

      const hotelOperation = result.operations[0];
      const restaurantOperation = result.operations[1];

      // Sum monthly foodRevenue for hotel (year 0)
      const hotelMonthlyForYear = hotelOperation.monthlyPnl.filter(m => m.yearIndex === 0);
      for (const monthly of hotelMonthlyForYear) {
        // Since ownership is 100% (default), sponsor foodRevenue equals asset foodRevenue
        expectedHotelFoodRevenue += monthly.foodRevenue;
      }

      // Sum monthly foodRevenue for restaurant (year 0)
      const restaurantMonthlyForYear = restaurantOperation.monthlyPnl.filter(m => m.yearIndex === 0);
      for (const monthly of restaurantMonthlyForYear) {
        // Since ownership is 100% (default), sponsor foodRevenue equals asset foodRevenue
        expectedRestaurantFoodRevenue += monthly.foodRevenue;
      }

      const expectedConsolidatedFoodRevenue = expectedHotelFoodRevenue + expectedRestaurantFoodRevenue;

      // Verify consolidated foodRevenue equals sum of individual operations
      const tolerance = 0.01; // $0.01 tolerance for floating point precision
      expect(Math.abs(consolidated.foodRevenue! - expectedConsolidatedFoodRevenue)).toBeLessThan(tolerance);

      // Verify both operations have positive foodRevenue
      expect(expectedHotelFoodRevenue).toBeGreaterThan(0);
      expect(expectedRestaurantFoodRevenue).toBeGreaterThan(0);
      expect(consolidated.foodRevenue!).toBeGreaterThan(0);

      // Additional verification: Check that revenue breakdown sum equals total revenue
      const revenueBreakdownSum = (consolidated.roomRevenue || 0) + 
                                   (consolidated.foodRevenue || 0) + 
                                   (consolidated.beverageRevenue || 0) + 
                                   (consolidated.otherRevenue || 0);
      
      // Revenue breakdown should approximately equal total revenue (within tolerance)
      expect(Math.abs(revenueBreakdownSum - consolidated.revenueTotal)).toBeLessThan(tolerance * 100); // Slightly larger tolerance for total revenue
    });
  });

  describe('KPI Logic Test: Retail Rent per sqm', () => {
    it('should verify that Retail KPI calculates Rent / sqm correctly', () => {
      // Create Retail operation with known parameters
      const sqm = 1000;
      const avgRentPerSqm = 100; // Monthly rent per sqm
      const avgOccupancy = 0.85; // 85% average occupancy
      const otherRevenuePctOfTotal = 0.1; // 10% other revenue

      const retail = buildRetailConfig({
        id: 'retail-1',
        name: 'Test Retail',
        startYear: 2026,
        horizonYears: 1,
        sqm: sqm,
        avgRentPerSqm: avgRentPerSqm,
        occupancyByMonth: Array(12).fill(avgOccupancy),
        rentalRevenuePctOfTotal: 0.9,
        otherRevenuePctOfTotal: otherRevenuePctOfTotal,
      });

      const scenario: ProjectScenario = {
        id: 'test-scenario-retail-kpi',
        name: 'Test Retail KPI Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [retail],
      };

      const result = runScenarioEngine(scenario);

      // Verify we have results for retail operation
      expect(result.operations.length).toBe(1);
      expect(result.operations[0].operationType).toBe('RETAIL');

      // Get annual P&L results
      const retailOperation = result.operations[0];
      const annualPnl = retailOperation.annualPnl;

      // Calculate KPIs using kpiFactory
      const kpis = getOperationKpis(retail, annualPnl);

      // Find the "Rent per sqm" KPI
      const rentPerSqmKpi = kpis.find(kpi => kpi.label === 'Rent per sqm');
      expect(rentPerSqmKpi).toBeDefined();

      // Extract the numeric value from the formatted currency string
      // Format is like "$1,234.56", so we need to parse it
      const rentPerSqmValueStr = rentPerSqmKpi!.value.replace(/[^0-9.-]/g, '');
      const rentPerSqmFromKpi = parseFloat(rentPerSqmValueStr);

      // Calculate expected rent per sqm (annual)
      // Expected annual revenue = (sqm * occupancy * avgRentPerSqm) * 12 months * (1 + otherRevenuePctOfTotal)
      // Since rentalRevenuePctOfTotal = 0.9 and otherRevenuePctOfTotal = 0.1,
      // totalRevenue = rentalRevenue / 0.9 = (sqm * occupancy * avgRentPerSqm * 12) / 0.9
      // Actually, looking at retailEngine.ts:
      // rentalRevenue = occupiedSqm * avgRentPerSqm
      // otherRevenue = rentalRevenue * otherRevenuePctOfTotal
      // totalRevenue = rentalRevenue + otherRevenue = rentalRevenue * (1 + otherRevenuePctOfTotal)
      // But wait, the engine calculates:
      // rentalRevenue = occupiedSqm * avgRentPerSqm (monthly)
      // otherRevenue = rentalRevenue * otherRevenuePctOfTotal (monthly)
      // totalRevenue = rentalRevenue + otherRevenue (monthly) * 12 for annual
      
      // Let's calculate from actual annual P&L
      const actualAnnualRevenue = annualPnl[0].revenueTotal;
      
      // Expected annual rent per sqm = annual revenue / sqm
      const expectedRentPerSqm = actualAnnualRevenue / sqm;

      // Verify KPI value matches expected calculation
      const tolerance = 0.01; // $0.01 tolerance
      expect(Math.abs(rentPerSqmFromKpi - expectedRentPerSqm)).toBeLessThan(tolerance);

      // Additional verification: Manual calculation
      // Monthly rental revenue = sqm * occupancy * avgRentPerSqm
      const monthlyRentalRevenue = sqm * avgOccupancy * avgRentPerSqm;
      // Monthly other revenue = monthlyRentalRevenue * otherRevenuePctOfTotal
      const monthlyOtherRevenue = monthlyRentalRevenue * otherRevenuePctOfTotal;
      // Monthly total revenue = rentalRevenue + otherRevenue
      const monthlyTotalRevenue = monthlyRentalRevenue + monthlyOtherRevenue;
      // Annual total revenue = monthly * 12
      const expectedAnnualRevenue = monthlyTotalRevenue * 12;
      // Annual rent per sqm = annual revenue / sqm
      const expectedRentPerSqmManual = expectedAnnualRevenue / sqm;

      // Verify manual calculation matches KPI
      expect(Math.abs(rentPerSqmFromKpi - expectedRentPerSqmManual)).toBeLessThan(tolerance);

      // Verify the calculation is correct: rent per sqm should equal
      // occupancy * avgRentPerSqm * (1 + otherRevenuePctOfTotal) * 12
      const expectedRentPerSqmFormula = avgOccupancy * avgRentPerSqm * (1 + otherRevenuePctOfTotal) * 12;
      expect(Math.abs(rentPerSqmFromKpi - expectedRentPerSqmFormula)).toBeLessThan(tolerance);
    });
  });
});

