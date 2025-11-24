/**
 * Sample model configuration for the UI playground.
 * Provides a deterministic "toy" scenario for testing and demonstration.
 */

import type {
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
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

export interface SampleModelConfig {
  scenario: ProjectScenario;
  projectConfig: ProjectConfig;
  capitalConfig: CapitalStructureConfig;
  waterfallConfig: WaterfallConfig;
}

/**
 * Creates a comprehensive sample model configuration for v0.4.
 * 
 * Configuration:
 * - All operation types: HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING
 * - Project: $50M investment, 10% discount rate, 2% terminal growth
 * - Capital: 60% LTV debt, 6% rate, 10-year term, 20-year amortization
 * - Waterfall: Multi-tier (Return of Capital → Preferred Return → Promote)
 */
export function createSampleModelConfig(): SampleModelConfig {
  // Hotel operation configuration
  const hotelConfig: HotelConfig = {
    id: 'playground-hotel-1',
    name: 'Playground Hotel',
    operationType: 'HOTEL',
    startYear: 2026,
    horizonYears: 5,
    keys: 100, // 100 rooms
    avgDailyRate: 250, // $250 per room per night
    occupancyByMonth: Array(12).fill(0.70), // 70% occupancy year-round

    // Revenue mix as % of room revenue
    foodRevenuePctOfRooms: 0.30,
    beverageRevenuePctOfRooms: 0.15,
    otherRevenuePctOfRooms: 0.10,

    // COGS as % of respective revenue
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,

    // Opex as % of total revenue (reasonable percentages that produce positive EBITDA/NOI)
    payrollPct: 0.35,
    utilitiesPct: 0.05,
    marketingPct: 0.03,
    maintenanceOpexPct: 0.04,
    otherOpexPct: 0.03,

    // Maintenance capex as % of total revenue
    maintenanceCapexPct: 0.02,
  };

  // Villas operation configuration
  const villasConfig: VillasConfig = {
    id: 'playground-villas-1',
    name: 'Playground Villas',
    operationType: 'VILLAS',
    startYear: 2026,
    horizonYears: 5,
    units: 20, // 20 villa units
    avgNightlyRate: 500, // $500 per unit per night
    occupancyByMonth: Array(12).fill(0.65), // 65% occupancy year-round

    // Revenue mix as % of rental revenue
    foodRevenuePctOfRental: 0.20,
    beverageRevenuePctOfRental: 0.10,
    otherRevenuePctOfRental: 0.05,

    // COGS as % of respective revenue
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,

    // Opex as % of total revenue
    payrollPct: 0.30,
    utilitiesPct: 0.06,
    marketingPct: 0.04,
    maintenanceOpexPct: 0.05,
    otherOpexPct: 0.03,

    // Maintenance capex as % of total revenue
    maintenanceCapexPct: 0.03,
  };

  // Restaurant operation configuration
  const restaurantConfig: RestaurantConfig = {
    id: 'playground-restaurant-1',
    name: 'Playground Restaurant',
    operationType: 'RESTAURANT',
    startYear: 2026,
    horizonYears: 5,
    covers: 80, // 80 covers/seats
    avgCheck: 75, // $75 average check per cover
    turnoverByMonth: Array(12).fill(1.2), // 1.2 turns per day

    // Revenue mix as % of total revenue
    foodRevenuePctOfTotal: 0.70,
    beverageRevenuePctOfTotal: 0.25,
    otherRevenuePctOfTotal: 0.05,

    // COGS as % of respective revenue
    foodCogsPct: 0.32,
    beverageCogsPct: 0.22,

    // Opex as % of total revenue
    payrollPct: 0.30,
    utilitiesPct: 0.04,
    marketingPct: 0.03,
    maintenanceOpexPct: 0.02,
    otherOpexPct: 0.02,

    // Maintenance capex as % of total revenue
    maintenanceCapexPct: 0.02,
  };

  // Beach Club operation configuration
  const beachClubConfig: BeachClubConfig = {
    id: 'playground-beach-club-1',
    name: 'Playground Beach Club',
    operationType: 'BEACH_CLUB',
    startYear: 2026,
    horizonYears: 5,
    dailyPasses: 200,
    avgDailyPassPrice: 50,
    memberships: 500,
    avgMembershipFee: 2000,
    utilizationByMonth: Array(12).fill(0.60),
    foodRevenuePctOfTotal: 0.25,
    beverageRevenuePctOfTotal: 0.20,
    otherRevenuePctOfTotal: 0.05,
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,
    payrollPct: 0.30,
    utilitiesPct: 0.05,
    marketingPct: 0.04,
    maintenanceOpexPct: 0.04,
    otherOpexPct: 0.03,
    maintenanceCapexPct: 0.03,
  };

  // Racquet operation configuration
  const racquetConfig: RacquetConfig = {
    id: 'playground-racquet-1',
    name: 'Playground Racquet Club',
    operationType: 'RACQUET',
    startYear: 2026,
    horizonYears: 5,
    courts: 8,
    avgCourtRate: 40,
    utilizationByMonth: Array(12).fill(0.50),
    hoursPerDay: 12,
    memberships: 300,
    avgMembershipFee: 1500,
    foodRevenuePctOfTotal: 0.20,
    beverageRevenuePctOfTotal: 0.15,
    otherRevenuePctOfTotal: 0.05,
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,
    payrollPct: 0.28,
    utilitiesPct: 0.06,
    marketingPct: 0.03,
    maintenanceOpexPct: 0.05,
    otherOpexPct: 0.03,
    maintenanceCapexPct: 0.03,
  };

  // Retail operation configuration
  const retailConfig: RetailConfig = {
    id: 'playground-retail-1',
    name: 'Playground Retail',
    operationType: 'RETAIL',
    startYear: 2026,
    horizonYears: 5,
    sqm: 500,
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
  };

  // Flex operation configuration
  const flexConfig: FlexConfig = {
    id: 'playground-flex-1',
    name: 'Playground Flex Space',
    operationType: 'FLEX',
    startYear: 2026,
    horizonYears: 5,
    sqm: 300,
    avgRentPerSqm: 80,
    occupancyByMonth: Array(12).fill(0.75),
    rentalRevenuePctOfTotal: 0.95,
    otherRevenuePctOfTotal: 0.05,
    payrollPct: 0.10,
    utilitiesPct: 0.04,
    marketingPct: 0.02,
    maintenanceOpexPct: 0.03,
    otherOpexPct: 0.02,
    maintenanceCapexPct: 0.02,
  };

  // Wellness operation configuration
  const wellnessConfig: WellnessConfig = {
    id: 'playground-wellness-1',
    name: 'Playground Wellness Center',
    operationType: 'WELLNESS',
    startYear: 2026,
    horizonYears: 5,
    memberships: 400,
    avgMembershipFee: 1800,
    dailyPasses: 50,
    avgDailyPassPrice: 30,
    utilizationByMonth: Array(12).fill(0.55),
    foodRevenuePctOfTotal: 0.15,
    beverageRevenuePctOfTotal: 0.10,
    otherRevenuePctOfTotal: 0.05,
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,
    payrollPct: 0.32,
    utilitiesPct: 0.06,
    marketingPct: 0.04,
    maintenanceOpexPct: 0.05,
    otherOpexPct: 0.03,
    maintenanceCapexPct: 0.03,
  };

  // Senior Living operation configuration
  const seniorLivingConfig: SeniorLivingConfig = {
    id: 'playground-senior-living-1',
    name: 'Playground Senior Living',
    operationType: 'SENIOR_LIVING',
    startYear: 2026,
    horizonYears: 5,
    units: 60,
    avgMonthlyRate: 3500,
    occupancyByMonth: Array(12).fill(0.90),
    careRevenuePctOfRental: 0.20,
    foodRevenuePctOfRental: 0.15,
    otherRevenuePctOfRental: 0.05,
    foodCogsPct: 0.35,
    careCogsPct: 0.25,
    payrollPct: 0.40,
    utilitiesPct: 0.06,
    marketingPct: 0.02,
    maintenanceOpexPct: 0.04,
    otherOpexPct: 0.03,
    maintenanceCapexPct: 0.03,
  };

  // Project scenario with all operation types (v0.4)
  const scenario: ProjectScenario = {
    id: 'playground-scenario-v0.4',
    name: 'All Operation Types (v0.4)',
    startYear: 2026,
    horizonYears: 5,
    operations: [
      hotelConfig,
      villasConfig,
      restaurantConfig,
      beachClubConfig,
      racquetConfig,
      retailConfig,
      flexConfig,
      wellnessConfig,
      seniorLivingConfig,
    ],
  };

  // Project configuration
  // Initial investment: $50M (comprehensive multi-operation project)
  const initialInvestment = 50_000_000;
  const projectConfig: ProjectConfig = {
    discountRate: 0.10, // 10% discount rate
    terminalGrowthRate: 0.02, // 2% terminal growth
    initialInvestment,
    workingCapitalPercentage: 0.05, // 5% of revenue
  };

  // Capital structure configuration
  // 60% LTV = 60% of initial investment
  const debtAmount = Math.round(initialInvestment * 0.60);
  const capitalConfig: CapitalStructureConfig = {
    initialInvestment,
    debtTranches: [
      {
        id: 'senior-loan',
        amount: debtAmount,
        interestRate: 0.06, // 6% interest rate
        termYears: 10, // 10-year term
        amortizationYears: 20, // 20-year amortization
      },
    ],
  };

  // Waterfall configuration (v0.3 multi-tier)
  // LP 90% / GP 10% equity contributions
  // Multi-tier: Return of Capital → Preferred Return (8% hurdle) → Promote (70/30 split)
  const waterfallConfig: WaterfallConfig = {
    equityClasses: [
      {
        id: 'lp',
        name: 'Limited Partner',
        contributionPct: 0.9, // 90% contribution
      },
      {
        id: 'gp',
        name: 'General Partner',
        contributionPct: 0.1, // 10% contribution
      },
    ],
    tiers: [
      {
        id: 'roc',
        type: 'return_of_capital',
        distributionSplits: {
          lp: 0.9, // Pro rata based on contribution
          gp: 0.1,
        },
      },
      {
        id: 'pref',
        type: 'preferred_return',
        hurdleIrr: 0.08, // 8% preferred return hurdle
        distributionSplits: {
          lp: 0.9, // Until LP reaches 8% IRR
          gp: 0.1,
        },
      },
      {
        id: 'promote',
        type: 'promote',
        distributionSplits: {
          lp: 0.70, // 70% LP / 30% GP promote split
          gp: 0.30,
        },
      },
    ],
  };

  return {
    scenario,
    projectConfig,
    capitalConfig,
    waterfallConfig,
  };
}

