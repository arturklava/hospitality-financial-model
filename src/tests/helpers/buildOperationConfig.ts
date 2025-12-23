/**
 * Helper functions to build valid, deterministic operation configs for testing.
 * 
 * These helpers ensure that all OperationTypes can be easily instantiated in tests
 * with realistic but deterministic values.
 */

import type {
  OperationConfig,
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

/**
 * Builds a valid HotelConfig for testing.
 */
export function buildHotelConfig(overrides?: Partial<HotelConfig>): HotelConfig {
  return {
    id: 'test-hotel',
    name: 'Test Hotel',
    operationType: 'HOTEL',
    startYear: 2026,
    horizonYears: 5,
    keys: 100,
    avgDailyRate: 250,
    occupancyByMonth: Array(12).fill(0.70),
    foodRevenuePctOfRooms: 0.30,
    beverageRevenuePctOfRooms: 0.15,
    otherRevenuePctOfRooms: 0.10,
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
}

/**
 * Builds a valid VillasConfig for testing.
 */
export function buildVillasConfig(overrides?: Partial<VillasConfig>): VillasConfig {
  return {
    id: 'test-villas',
    name: 'Test Villas',
    operationType: 'VILLAS',
    startYear: 2026,
    horizonYears: 5,
    units: 20,
    avgNightlyRate: 500,
    occupancyByMonth: Array(12).fill(0.60),
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
    ...overrides,
  };
}

/**
 * Builds a valid RestaurantConfig for testing.
 */
export function buildRestaurantConfig(overrides?: Partial<RestaurantConfig>): RestaurantConfig {
  return {
    id: 'test-restaurant',
    name: 'Test Restaurant',
    operationType: 'RESTAURANT',
    startYear: 2026,
    horizonYears: 5,
    covers: 100,
    avgCheck: 50,
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
    ...overrides,
  };
}

/**
 * Builds a valid BeachClubConfig for testing.
 */
export function buildBeachClubConfig(overrides?: Partial<BeachClubConfig>): BeachClubConfig {
  return {
    id: 'test-beach-club',
    name: 'Test Beach Club',
    operationType: 'BEACH_CLUB',
    startYear: 2026,
    horizonYears: 5,
    dailyPasses: 200,
    avgDailyPassPrice: 75,
    memberships: 500,
    avgMembershipFee: 2000,
    utilizationByMonth: Array(12).fill(0.50),
    foodRevenuePctOfTotal: 0.40,
    beverageRevenuePctOfTotal: 0.30,
    otherRevenuePctOfTotal: 0.30,
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,
    payrollPct: 0.30,
    utilitiesPct: 0.06,
    marketingPct: 0.04,
    maintenanceOpexPct: 0.05,
    otherOpexPct: 0.03,
    maintenanceCapexPct: 0.03,
    ...overrides,
  };
}

/**
 * Builds a valid RacquetConfig for testing.
 */
export function buildRacquetConfig(overrides?: Partial<RacquetConfig>): RacquetConfig {
  return {
    id: 'test-racquet',
    name: 'Test Racquet Club',
    operationType: 'RACQUET',
    startYear: 2026,
    horizonYears: 5,
    courts: 8,
    avgCourtRate: 50,
    utilizationByMonth: Array(12).fill(0.60),
    hoursPerDay: 12,
    memberships: 300,
    avgMembershipFee: 1500,
    foodRevenuePctOfTotal: 0.30,
    beverageRevenuePctOfTotal: 0.20,
    otherRevenuePctOfTotal: 0.50,
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,
    payrollPct: 0.30,
    utilitiesPct: 0.06,
    marketingPct: 0.04,
    maintenanceOpexPct: 0.05,
    otherOpexPct: 0.03,
    maintenanceCapexPct: 0.03,
    ...overrides,
  };
}

/**
 * Builds a valid RetailConfig for testing.
 */
export function buildRetailConfig(overrides?: Partial<RetailConfig>): RetailConfig {
  return {
    id: 'test-retail',
    name: 'Test Retail',
    operationType: 'RETAIL',
    startYear: 2026,
    horizonYears: 5,
    sqm: 1000,
    avgRentPerSqm: 100,
    occupancyByMonth: Array(12).fill(0.85),
    rentalRevenuePctOfTotal: 0.90,
    otherRevenuePctOfTotal: 0.10,
    payrollPct: 0.15,
    utilitiesPct: 0.05,
    marketingPct: 0.02,
    maintenanceOpexPct: 0.03,
    otherOpexPct: 0.02,
    maintenanceCapexPct: 0.02,
    ...overrides,
  };
}

/**
 * Builds a valid FlexConfig for testing.
 */
export function buildFlexConfig(overrides?: Partial<FlexConfig>): FlexConfig {
  return {
    id: 'test-flex',
    name: 'Test Flexible Space',
    operationType: 'FLEX',
    startYear: 2026,
    horizonYears: 5,
    sqm: 500,
    avgRentPerSqm: 80,
    occupancyByMonth: Array(12).fill(0.75),
    rentalRevenuePctOfTotal: 0.95,
    otherRevenuePctOfTotal: 0.05,
    payrollPct: 0.10,
    utilitiesPct: 0.05,
    marketingPct: 0.02,
    maintenanceOpexPct: 0.03,
    otherOpexPct: 0.02,
    maintenanceCapexPct: 0.02,
    ...overrides,
  };
}

/**
 * Builds a valid WellnessConfig for testing.
 */
export function buildWellnessConfig(overrides?: Partial<WellnessConfig>): WellnessConfig {
  return {
    id: 'test-wellness',
    name: 'Test Wellness Center',
    operationType: 'WELLNESS',
    startYear: 2026,
    horizonYears: 5,
    memberships: 400,
    avgMembershipFee: 1800,
    dailyPasses: 50,
    avgDailyPassPrice: 60,
    utilizationByMonth: Array(12).fill(0.55),
    foodRevenuePctOfTotal: 0.20,
    beverageRevenuePctOfTotal: 0.15,
    otherRevenuePctOfTotal: 0.65,
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,
    payrollPct: 0.35,
    utilitiesPct: 0.06,
    marketingPct: 0.04,
    maintenanceOpexPct: 0.05,
    otherOpexPct: 0.03,
    maintenanceCapexPct: 0.03,
    ...overrides,
  };
}

/**
 * Builds a valid SeniorLivingConfig for testing.
 */
export function buildSeniorLivingConfig(overrides?: Partial<SeniorLivingConfig>): SeniorLivingConfig {
  return {
    id: 'test-senior-living',
    name: 'Test Senior Living',
    operationType: 'SENIOR_LIVING',
    startYear: 2026,
    horizonYears: 5,
    units: 50,
    avgMonthlyRate: 3000,
    occupancyByMonth: Array(12).fill(0.90),
    careRevenuePctOfRental: 0.20,
    foodRevenuePctOfRental: 0.15,
    otherRevenuePctOfRental: 0.10,
    foodCogsPct: 0.35,
    careCogsPct: 0.40,
    payrollPct: 0.40,
    utilitiesPct: 0.06,
    marketingPct: 0.02,
    maintenanceOpexPct: 0.04,
    otherOpexPct: 0.03,
    maintenanceCapexPct: 0.03,
    ...overrides,
  };
}

/**
 * Builds all 9 operation configs for comprehensive testing.
 * Useful for "all-ops" scenarios.
 */
export function buildAllOperationConfigs(): OperationConfig[] {
  return [
    buildHotelConfig({ id: 'op-hotel', name: 'Main Hotel' }),
    buildVillasConfig({ id: 'op-villas', name: 'Luxury Villas' }),
    buildRestaurantConfig({ id: 'op-restaurant', name: 'Fine Dining' }),
    buildBeachClubConfig({ id: 'op-beach-club', name: 'Beach Club' }),
    buildRacquetConfig({ id: 'op-racquet', name: 'Tennis Club' }),
    buildRetailConfig({ id: 'op-retail', name: 'Retail Shops' }),
    buildFlexConfig({ id: 'op-flex', name: 'Flexible Space' }),
    buildWellnessConfig({ id: 'op-wellness', name: 'Wellness Center' }),
    buildSeniorLivingConfig({ id: 'op-senior-living', name: 'Senior Living' }),
  ];
}

