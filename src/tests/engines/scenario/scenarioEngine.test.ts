import { describe, it, expect } from 'vitest';
import { runScenarioEngine } from '@engines/scenario/scenarioEngine';
import type {
  ProjectScenario,
  HotelConfig,
  VillasConfig,
  RestaurantConfig,
  BeachClubConfig,
  RacquetConfig,
  RetailConfig,
  FlexConfig,
  WellnessConfig,
  SeniorLivingConfig,
} from '@domain/types';

describe('Scenario Engine', () => {
  const createHotelConfig = (overrides: Partial<HotelConfig>): HotelConfig => {
    return {
      id: 'hotel-1',
      name: 'Hotel 1',
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

  describe('Consolidation with multiple operations', () => {
    it('should consolidate two hotel operations correctly', () => {
      const hotel1: HotelConfig = createHotelConfig({
        id: 'hotel-1',
        name: 'Hotel 1',
        avgDailyRate: 200,
      });

      const hotel2: HotelConfig = createHotelConfig({
        id: 'hotel-2',
        name: 'Hotel 2',
        avgDailyRate: 300, // Different ADR
      });

      const scenario: ProjectScenario = {
        id: 'test-scenario-1',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotel1, hotel2],
      };

      const result = runScenarioEngine(scenario);

      // Verify we have results for both operations
      expect(result.operations.length).toBe(2);
      expect(result.operations[0].operationId).toBe('hotel-1');
      expect(result.operations[1].operationId).toBe('hotel-2');

      // Verify consolidated annual P&L
      expect(result.consolidatedAnnualPnl.length).toBe(1);

      const consolidated = result.consolidatedAnnualPnl[0];
      const hotel1Annual = result.operations[0].annualPnl[0];
      const hotel2Annual = result.operations[1].annualPnl[0];

      // Verify consolidation sums match
      expect(consolidated.revenueTotal).toBeCloseTo(
        hotel1Annual.revenueTotal + hotel2Annual.revenueTotal,
        2
      );

      expect(consolidated.cogsTotal).toBeCloseTo(
        hotel1Annual.cogsTotal + hotel2Annual.cogsTotal,
        2
      );

      expect(consolidated.opexTotal).toBeCloseTo(
        hotel1Annual.opexTotal + hotel2Annual.opexTotal,
        2
      );

      expect(consolidated.ebitda).toBeCloseTo(
        hotel1Annual.ebitda + hotel2Annual.ebitda,
        2
      );

      expect(consolidated.noi).toBeCloseTo(
        hotel1Annual.noi + hotel2Annual.noi,
        2
      );

      expect(consolidated.maintenanceCapex).toBeCloseTo(
        hotel1Annual.maintenanceCapex + hotel2Annual.maintenanceCapex,
        2
      );

      expect(consolidated.cashFlow).toBeCloseTo(
        hotel1Annual.cashFlow + hotel2Annual.cashFlow,
        2
      );
    });

    it('should handle multiple years correctly', () => {
      const hotel1: HotelConfig = createHotelConfig({
        id: 'hotel-1',
        horizonYears: 3,
      });

      const hotel2: HotelConfig = createHotelConfig({
        id: 'hotel-2',
        horizonYears: 3,
      });

      const scenario: ProjectScenario = {
        id: 'test-scenario-2',
        name: 'Test Scenario 2',
        startYear: 2026,
        horizonYears: 3,
        operations: [hotel1, hotel2],
      };

      const result = runScenarioEngine(scenario);

      // Verify we have 3 years of consolidated P&L
      expect(result.consolidatedAnnualPnl.length).toBe(3);

      // Verify year indices
      expect(result.consolidatedAnnualPnl[0].yearIndex).toBe(0);
      expect(result.consolidatedAnnualPnl[1].yearIndex).toBe(1);
      expect(result.consolidatedAnnualPnl[2].yearIndex).toBe(2);

      // Verify each year's consolidation
      for (let yearIndex = 0; yearIndex < 3; yearIndex++) {
        const consolidated = result.consolidatedAnnualPnl[yearIndex];
        const hotel1Annual = result.operations[0].annualPnl[yearIndex];
        const hotel2Annual = result.operations[1].annualPnl[yearIndex];

        expect(consolidated.revenueTotal).toBeCloseTo(
          hotel1Annual.revenueTotal + hotel2Annual.revenueTotal,
          2
        );

        expect(consolidated.cashFlow).toBeCloseTo(
          hotel1Annual.cashFlow + hotel2Annual.cashFlow,
          2
        );
      }
    });

    it('should handle a single operation', () => {
      const hotel1: HotelConfig = createHotelConfig({
        id: 'hotel-1',
      });

      const scenario: ProjectScenario = {
        id: 'test-scenario-3',
        name: 'Test Scenario 3',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotel1],
      };

      const result = runScenarioEngine(scenario);

      expect(result.operations.length).toBe(1);
      expect(result.consolidatedAnnualPnl.length).toBe(1);

      const consolidated = result.consolidatedAnnualPnl[0];
      const operationAnnual = result.operations[0].annualPnl[0];

      // Consolidated should equal the single operation
      expect(consolidated.revenueTotal).toBeCloseTo(operationAnnual.revenueTotal, 2);
      expect(consolidated.cogsTotal).toBeCloseTo(operationAnnual.cogsTotal, 2);
      expect(consolidated.opexTotal).toBeCloseTo(operationAnnual.opexTotal, 2);
      expect(consolidated.ebitda).toBeCloseTo(operationAnnual.ebitda, 2);
      expect(consolidated.noi).toBeCloseTo(operationAnnual.noi, 2);
      expect(consolidated.maintenanceCapex).toBeCloseTo(operationAnnual.maintenanceCapex, 2);
      expect(consolidated.cashFlow).toBeCloseTo(operationAnnual.cashFlow, 2);
    });

    it('should handle empty operations array', () => {
      const scenario: ProjectScenario = {
        id: 'test-scenario-4',
        name: 'Test Scenario 4',
        startYear: 2026,
        horizonYears: 1,
        operations: [],
      };

      const result = runScenarioEngine(scenario);

      expect(result.operations.length).toBe(0);
      expect(result.consolidatedAnnualPnl.length).toBe(1);

      const consolidated = result.consolidatedAnnualPnl[0];
      expect(consolidated.revenueTotal).toBe(0);
      expect(consolidated.cogsTotal).toBe(0);
      expect(consolidated.opexTotal).toBe(0);
      expect(consolidated.ebitda).toBe(0);
      expect(consolidated.noi).toBe(0);
      expect(consolidated.maintenanceCapex).toBe(0);
      expect(consolidated.cashFlow).toBe(0);
    });

    it('should consolidate HOTEL and VILLAS operations correctly', () => {
      const hotel: HotelConfig = createHotelConfig({
        id: 'hotel-1',
        name: 'Hotel 1',
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.7),
      });

      const villas: VillasConfig = {
        id: 'villas-1',
        name: 'Villas 1',
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
      };

      const scenario: ProjectScenario = {
        id: 'test-scenario-multi',
        name: 'Test Multi-Operation Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotel, villas],
      };

      const result = runScenarioEngine(scenario);

      // Verify we have results for both operations
      expect(result.operations.length).toBe(2);
      expect(result.operations[0].operationId).toBe('hotel-1');
      expect(result.operations[1].operationId).toBe('villas-1');
      expect(result.operations[0].operationType).toBe('HOTEL');
      expect(result.operations[1].operationType).toBe('VILLAS');

      // Verify consolidated annual P&L
      expect(result.consolidatedAnnualPnl.length).toBe(1);

      const consolidated = result.consolidatedAnnualPnl[0];
      const hotelAnnual = result.operations[0].annualPnl[0];
      const villasAnnual = result.operations[1].annualPnl[0];

      // Verify consolidation sums match
      expect(consolidated.revenueTotal).toBeCloseTo(
        hotelAnnual.revenueTotal + villasAnnual.revenueTotal,
        2
      );

      expect(consolidated.cogsTotal).toBeCloseTo(
        hotelAnnual.cogsTotal + villasAnnual.cogsTotal,
        2
      );

      expect(consolidated.opexTotal).toBeCloseTo(
        hotelAnnual.opexTotal + villasAnnual.opexTotal,
        2
      );

      expect(consolidated.ebitda).toBeCloseTo(
        hotelAnnual.ebitda + villasAnnual.ebitda,
        2
      );

      expect(consolidated.noi).toBeCloseTo(
        hotelAnnual.noi + villasAnnual.noi,
        2
      );

      expect(consolidated.maintenanceCapex).toBeCloseTo(
        hotelAnnual.maintenanceCapex + villasAnnual.maintenanceCapex,
        2
      );

      expect(consolidated.cashFlow).toBeCloseTo(
        hotelAnnual.cashFlow + villasAnnual.cashFlow,
        2
      );

      // Verify both operations produce positive revenue
      expect(consolidated.revenueTotal).toBeGreaterThan(0);
      expect(consolidated.noi).toBeGreaterThan(0);
    });

    it('should consolidate HOTEL + VILLAS + RESTAURANT operations correctly', () => {
      const hotel: HotelConfig = createHotelConfig({
        id: 'hotel-1',
        name: 'Hotel 1',
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.7),
      });

      const villas: VillasConfig = {
        id: 'villas-1',
        name: 'Villas 1',
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
      };

      const restaurant: RestaurantConfig = {
        id: 'restaurant-1',
        name: 'Restaurant 1',
        operationType: 'RESTAURANT',
        startYear: 2026,
        horizonYears: 1,
        covers: 150,
        avgCheck: 60,
        turnoverByMonth: Array(12).fill(1.5),
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
      };

      const scenario: ProjectScenario = {
        id: 'test-scenario-triple',
        name: 'Test Triple-Operation Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotel, villas, restaurant],
      };

      const result = runScenarioEngine(scenario);

      // Verify we have results for all three operations
      expect(result.operations.length).toBe(3);
      expect(result.operations[0].operationId).toBe('hotel-1');
      expect(result.operations[1].operationId).toBe('villas-1');
      expect(result.operations[2].operationId).toBe('restaurant-1');
      expect(result.operations[0].operationType).toBe('HOTEL');
      expect(result.operations[1].operationType).toBe('VILLAS');
      expect(result.operations[2].operationType).toBe('RESTAURANT');

      // Verify consolidated annual P&L
      expect(result.consolidatedAnnualPnl.length).toBe(1);

      const consolidated = result.consolidatedAnnualPnl[0];
      const hotelAnnual = result.operations[0].annualPnl[0];
      const villasAnnual = result.operations[1].annualPnl[0];
      const restaurantAnnual = result.operations[2].annualPnl[0];

      // Verify consolidation sums match
      expect(consolidated.revenueTotal).toBeCloseTo(
        hotelAnnual.revenueTotal + villasAnnual.revenueTotal + restaurantAnnual.revenueTotal,
        2
      );

      expect(consolidated.cogsTotal).toBeCloseTo(
        hotelAnnual.cogsTotal + villasAnnual.cogsTotal + restaurantAnnual.cogsTotal,
        2
      );

      expect(consolidated.opexTotal).toBeCloseTo(
        hotelAnnual.opexTotal + villasAnnual.opexTotal + restaurantAnnual.opexTotal,
        2
      );

      expect(consolidated.ebitda).toBeCloseTo(
        hotelAnnual.ebitda + villasAnnual.ebitda + restaurantAnnual.ebitda,
        2
      );

      expect(consolidated.noi).toBeCloseTo(
        hotelAnnual.noi + villasAnnual.noi + restaurantAnnual.noi,
        2
      );

      expect(consolidated.maintenanceCapex).toBeCloseTo(
        hotelAnnual.maintenanceCapex + villasAnnual.maintenanceCapex + restaurantAnnual.maintenanceCapex,
        2
      );

      expect(consolidated.cashFlow).toBeCloseTo(
        hotelAnnual.cashFlow + villasAnnual.cashFlow + restaurantAnnual.cashFlow,
        2
      );

      // Verify all operations produce positive revenue and NOI
      expect(consolidated.revenueTotal).toBeGreaterThan(0);
      expect(consolidated.noi).toBeGreaterThan(0);
      
      // Verify yearIndex consistency
      expect(consolidated.yearIndex).toBe(0);
      expect(hotelAnnual.yearIndex).toBe(0);
      expect(villasAnnual.yearIndex).toBe(0);
      expect(restaurantAnnual.yearIndex).toBe(0);

      // Verify no NaN or Infinity values
      expect(Number.isFinite(consolidated.revenueTotal)).toBe(true);
      expect(Number.isFinite(consolidated.noi)).toBe(true);
      expect(Number.isFinite(consolidated.ebitda)).toBe(true);
      expect(Number.isFinite(consolidated.maintenanceCapex)).toBe(true);
      expect(Number.isFinite(consolidated.cashFlow)).toBe(true);
    });

    it('should consolidate ALL 9 operation types correctly (HOTEL + VILLAS + RESTAURANT + BEACH_CLUB + RACQUET + RETAIL + FLEX + WELLNESS + SENIOR_LIVING)', () => {
      const hotel: HotelConfig = createHotelConfig({
        id: 'hotel-1',
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.7),
      });

      const villas: VillasConfig = {
        id: 'villas-1',
        name: 'Villas 1',
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
      };

      const restaurant: RestaurantConfig = {
        id: 'restaurant-1',
        name: 'Restaurant 1',
        operationType: 'RESTAURANT',
        startYear: 2026,
        horizonYears: 1,
        covers: 150,
        avgCheck: 60,
        turnoverByMonth: Array(12).fill(1.5),
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
      };

      const beachClub: BeachClubConfig = {
        id: 'beach-club-1',
        name: 'Beach Club 1',
        operationType: 'BEACH_CLUB',
        startYear: 2026,
        horizonYears: 1,
        dailyPasses: 200,
        avgDailyPassPrice: 50,
        memberships: 500,
        avgMembershipFee: 1200,
        utilizationByMonth: Array(12).fill(0.6),
        foodRevenuePctOfTotal: 0.30,
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
      };

      const racquet: RacquetConfig = {
        id: 'racquet-1',
        name: 'Racquet 1',
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
      };

      const retail: RetailConfig = {
        id: 'retail-1',
        name: 'Retail 1',
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
      };

      const flex: FlexConfig = {
        id: 'flex-1',
        name: 'Flex 1',
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
      };

      const wellness: WellnessConfig = {
        id: 'wellness-1',
        name: 'Wellness 1',
        operationType: 'WELLNESS',
        startYear: 2026,
        horizonYears: 1,
        memberships: 400,
        avgMembershipFee: 1500,
        dailyPasses: 150,
        avgDailyPassPrice: 45,
        utilizationByMonth: Array(12).fill(0.65),
        foodRevenuePctOfTotal: 0.30,
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
      };

      const seniorLiving: SeniorLivingConfig = {
        id: 'senior-living-1',
        name: 'Senior Living 1',
        operationType: 'SENIOR_LIVING',
        startYear: 2026,
        horizonYears: 1,
        units: 100,
        avgMonthlyRate: 5000,
        occupancyByMonth: Array(12).fill(0.90),
        careRevenuePctOfRental: 0.20,
        foodRevenuePctOfRental: 0.15,
        otherRevenuePctOfRental: 0.10,
        foodCogsPct: 0.35,
        careCogsPct: 0.25,
        payrollPct: 0.40,
        utilitiesPct: 0.06,
        marketingPct: 0.03,
        maintenanceOpexPct: 0.05,
        otherOpexPct: 0.03,
        maintenanceCapexPct: 0.02,
      };

      const scenario: ProjectScenario = {
        id: 'test-scenario-all-ops',
        name: 'Test All Operations Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotel, villas, restaurant, beachClub, racquet, retail, flex, wellness, seniorLiving],
      };

      const result = runScenarioEngine(scenario);

      // Verify we have results for all 9 operations
      expect(result.operations.length).toBe(9);
      expect(result.operations[0].operationType).toBe('HOTEL');
      expect(result.operations[1].operationType).toBe('VILLAS');
      expect(result.operations[2].operationType).toBe('RESTAURANT');
      expect(result.operations[3].operationType).toBe('BEACH_CLUB');
      expect(result.operations[4].operationType).toBe('RACQUET');
      expect(result.operations[5].operationType).toBe('RETAIL');
      expect(result.operations[6].operationType).toBe('FLEX');
      expect(result.operations[7].operationType).toBe('WELLNESS');
      expect(result.operations[8].operationType).toBe('SENIOR_LIVING');

      // Verify consolidated annual P&L
      expect(result.consolidatedAnnualPnl.length).toBe(1);

      const consolidated = result.consolidatedAnnualPnl[0];

      // Calculate expected totals by summing all operations
      let expectedRevenueTotal = 0;
      let expectedCogsTotal = 0;
      let expectedOpexTotal = 0;
      let expectedEbitda = 0;
      let expectedNoi = 0;
      let expectedMaintenanceCapex = 0;
      let expectedCashFlow = 0;

      for (const operation of result.operations) {
        const annual = operation.annualPnl[0];
        expectedRevenueTotal += annual.revenueTotal;
        expectedCogsTotal += annual.cogsTotal;
        expectedOpexTotal += annual.opexTotal;
        expectedEbitda += annual.ebitda;
        expectedNoi += annual.noi;
        expectedMaintenanceCapex += annual.maintenanceCapex;
        expectedCashFlow += annual.cashFlow;
      }

      // Verify consolidation sums match
      expect(consolidated.revenueTotal).toBeCloseTo(expectedRevenueTotal, 2);
      expect(consolidated.cogsTotal).toBeCloseTo(expectedCogsTotal, 2);
      expect(consolidated.opexTotal).toBeCloseTo(expectedOpexTotal, 2);
      expect(consolidated.ebitda).toBeCloseTo(expectedEbitda, 2);
      expect(consolidated.noi).toBeCloseTo(expectedNoi, 2);
      expect(consolidated.maintenanceCapex).toBeCloseTo(expectedMaintenanceCapex, 2);
      expect(consolidated.cashFlow).toBeCloseTo(expectedCashFlow, 2);

      // Verify all operations produce positive revenue and NOI
      expect(consolidated.revenueTotal).toBeGreaterThan(0);
      expect(consolidated.noi).toBeGreaterThan(0);

      // Verify no NaN or Infinity values
      expect(Number.isFinite(consolidated.revenueTotal)).toBe(true);
      expect(Number.isFinite(consolidated.noi)).toBe(true);
      expect(Number.isFinite(consolidated.ebitda)).toBe(true);
      expect(Number.isFinite(consolidated.maintenanceCapex)).toBe(true);
      expect(Number.isFinite(consolidated.cashFlow)).toBe(true);

      // Verify yearIndex consistency
      expect(consolidated.yearIndex).toBe(0);
      for (const operation of result.operations) {
        expect(operation.annualPnl[0].yearIndex).toBe(0);
      }
    });
  });
});

