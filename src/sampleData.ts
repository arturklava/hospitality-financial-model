/**
 * Sample data helpers for building a consistent test scenario.
 * All functions are pure and deterministic.
 */

import type {
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
  HotelConfig,
  NamedScenario,
  FullModelInput,
} from '@domain/types';

export type ScenarioKey = 'BASE' | 'DOWNSIDE' | 'UPSIDE';

export interface NamedScenarioBundle {
  key: ScenarioKey;
  label: string;
  scenario: ProjectScenario;
  projectConfig: ProjectConfig;
  capitalConfig: CapitalStructureConfig;
  waterfallConfig: WaterfallConfig;
}

/**
 * Builds a sample hotel configuration.
 */
export function buildSampleHotelConfig(): HotelConfig {
  return {
    id: 'sample-hotel-1',
    name: 'Sample Luxury Hotel',
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

    // Opex as % of total revenue
    payrollPct: 0.35,
    utilitiesPct: 0.05,
    marketingPct: 0.03,
    maintenanceOpexPct: 0.04,
    otherOpexPct: 0.03,

    // Maintenance capex as % of total revenue
    maintenanceCapexPct: 0.02,
  };
}

/**
 * Builds a sample project scenario with a single hotel operation.
 */
export function buildSampleScenario(): ProjectScenario {
  return {
    id: 'sample-scenario-1',
    name: 'Sample Hospitality Project',
    startYear: 2026,
    horizonYears: 5,
    operations: [buildSampleHotelConfig()],
  };
}

/**
 * Builds a sample project configuration.
 */
export function buildSampleProjectConfig(): ProjectConfig {
  return {
    discountRate: 0.10, // 10% discount rate
    terminalGrowthRate: 0.02, // 2% terminal growth
    initialInvestment: 50000000, // $50M initial investment
    workingCapitalPercentage: 0.05, // 5% of revenue
  };
}

/**
 * Builds a sample capital structure configuration.
 */
export function buildSampleCapitalConfig(): CapitalStructureConfig {
  const initialInvestment = 50000000;
  const debtAmount = Math.round(initialInvestment * 0.65); // 65% debt

  return {
    initialInvestment,
    debtTranches: [
      {
        id: 'senior-loan',
        amount: debtAmount,
        interestRate: 0.10, // 10% interest rate
        termYears: 5,
        amortizationYears: 5,
        // v2.10: Financial Types - default values
        seniority: 'senior', // Default to senior debt
        // refinanceAmountPct is optional, not included by default
      },
    ],
  };
}

/**
 * Builds a sample waterfall configuration.
 */
export function buildSampleWaterfallConfig(): WaterfallConfig {
  return {
    equityClasses: [
      {
        id: 'lp',
        name: 'Limited Partner',
        contributionPct: 0.7,
        distributionPct: 0.7,
      },
      {
        id: 'gp',
        name: 'General Partner',
        contributionPct: 0.3,
        distributionPct: 0.3,
      },
    ],
  };
}

/**
 * Builds a hotel configuration for a specific scenario.
 */
function buildHotelConfigForScenario(key: ScenarioKey): HotelConfig {
  switch (key) {
    case 'BASE':
      return buildSampleHotelConfig();
    case 'DOWNSIDE':
      return {
        id: 'downside-hotel-1',
        name: 'Downside Hotel',
        operationType: 'HOTEL',
        startYear: 2026,
        horizonYears: 5,
        keys: 100,
        avgDailyRate: 200, // Lower ADR: $200 vs $250
        occupancyByMonth: Array(12).fill(0.60), // Lower occupancy: 60% vs 70%

        // Revenue mix as % of room revenue
        foodRevenuePctOfRooms: 0.30,
        beverageRevenuePctOfRooms: 0.15,
        otherRevenuePctOfRooms: 0.10,

        // COGS as % of respective revenue
        foodCogsPct: 0.38, // Higher COGS: 38% vs 35%
        beverageCogsPct: 0.28, // Higher COGS: 28% vs 25%

        // Opex as % of total revenue (higher percentages)
        payrollPct: 0.40, // Higher: 40% vs 35%
        utilitiesPct: 0.06, // Higher: 6% vs 5%
        marketingPct: 0.04, // Higher: 4% vs 3%
        maintenanceOpexPct: 0.05, // Higher: 5% vs 4%
        otherOpexPct: 0.04, // Higher: 4% vs 3%

        // Maintenance capex as % of total revenue
        maintenanceCapexPct: 0.03, // Higher: 3% vs 2%
      };
    case 'UPSIDE':
      return {
        id: 'upside-hotel-1',
        name: 'Upside Hotel',
        operationType: 'HOTEL',
        startYear: 2026,
        horizonYears: 5,
        keys: 100,
        avgDailyRate: 300, // Higher ADR: $300 vs $250
        occupancyByMonth: Array(12).fill(0.80), // Higher occupancy: 80% vs 70%

        // Revenue mix as % of room revenue
        foodRevenuePctOfRooms: 0.30,
        beverageRevenuePctOfRooms: 0.15,
        otherRevenuePctOfRooms: 0.10,

        // COGS as % of respective revenue (better margins)
        foodCogsPct: 0.32, // Lower: 32% vs 35%
        beverageCogsPct: 0.22, // Lower: 22% vs 25%

        // Opex as % of total revenue (better margins)
        payrollPct: 0.32, // Lower: 32% vs 35%
        utilitiesPct: 0.04, // Lower: 4% vs 5%
        marketingPct: 0.025, // Lower: 2.5% vs 3%
        maintenanceOpexPct: 0.035, // Lower: 3.5% vs 4%
        otherOpexPct: 0.025, // Lower: 2.5% vs 3%

        // Maintenance capex as % of total revenue
        maintenanceCapexPct: 0.015, // Lower: 1.5% vs 2%
      };
  }
}

/**
 * Builds a complete scenario bundle for a given scenario key.
 */
export function buildScenarioBundle(key: ScenarioKey): NamedScenarioBundle {
  const hotelConfig = buildHotelConfigForScenario(key);
  const scenario: ProjectScenario = {
    id: `scenario-${key.toLowerCase()}`,
    name: `${key} Scenario`,
    startYear: 2026,
    horizonYears: 5,
    operations: [hotelConfig],
  };

  // All scenarios use the same project, capital, and waterfall configs
  const projectConfig = buildSampleProjectConfig();
  const capitalConfig = buildSampleCapitalConfig();
  const waterfallConfig = buildSampleWaterfallConfig();

  const labels: Record<ScenarioKey, string> = {
    BASE: 'Base Case',
    DOWNSIDE: 'Downside',
    UPSIDE: 'Upside',
  };

  return {
    key,
    label: labels[key],
    scenario,
    projectConfig,
    capitalConfig,
    waterfallConfig,
  };
}

/**
 * Lists all available scenario bundles.
 */
export function listScenarioBundles(): NamedScenarioBundle[] {
  return ['BASE', 'DOWNSIDE', 'UPSIDE'].map((key) =>
    buildScenarioBundle(key as ScenarioKey)
  );
}

/**
 * Creates a default scenario library with Base Case, Stress Case, and Upside Case.
 * 
 * v5.6: Default Scenarios
 * - Base Case: Standard hotel configuration
 * - Stress Case: Base Case with -10% Occupancy and -10% ADR
 * - Upside Case: Base Case with +10% Occupancy and +10% ADR
 * 
 * @returns Array of NamedScenario instances ready for the scenario library
 */
export function createDefaultLibrary(): NamedScenario[] {
  // Create Base Case
  const baseScenario = buildSampleScenario();
  const baseProjectConfig = buildSampleProjectConfig();
  const baseCapitalConfig = buildSampleCapitalConfig();
  const baseWaterfallConfig = buildSampleWaterfallConfig();

  const baseModelConfig: FullModelInput = {
    scenario: baseScenario,
    projectConfig: baseProjectConfig,
    capitalConfig: baseCapitalConfig,
    waterfallConfig: baseWaterfallConfig,
  };

  const baseCase: NamedScenario = {
    id: 'base-case',
    name: 'Base Case',
    description: 'Standard hotel operation scenario with baseline occupancy and ADR',
    modelConfig: baseModelConfig,
  };

  // Create Stress Case: Clone Base Case and modify Occupancy/ADR (-10%)
  const stressScenario: ProjectScenario = {
    ...baseScenario,
    id: 'stress-case-scenario',
    name: 'Stress Case Scenario',
    operations: baseScenario.operations.map((op) => {
      if (op.operationType === 'HOTEL') {
        const hotelOp = op as HotelConfig;
        return {
          ...hotelOp,
          id: 'stress-hotel-1',
          name: 'Stress Case Hotel',
          avgDailyRate: Math.round(hotelOp.avgDailyRate * 0.9), // -10% ADR
          occupancyByMonth: hotelOp.occupancyByMonth.map((occ) => Math.max(0, occ * 0.9)), // -10% Occupancy
        } as HotelConfig;
      }
      return op;
    }),
  };

  const stressModelConfig: FullModelInput = {
    scenario: stressScenario,
    projectConfig: { ...baseProjectConfig },
    capitalConfig: { ...baseCapitalConfig },
    waterfallConfig: { ...baseWaterfallConfig },
  };

  const stressCase: NamedScenario = {
    id: 'stress-case',
    name: 'Stress Case',
    description: 'Base Case with 10% lower occupancy and 10% lower ADR',
    modelConfig: stressModelConfig,
  };

  // Create Upside Case: Clone Base Case and modify Occupancy/ADR (+10%)
  const upsideScenario: ProjectScenario = {
    ...baseScenario,
    id: 'upside-case-scenario',
    name: 'Upside Case Scenario',
    operations: baseScenario.operations.map((op) => {
      if (op.operationType === 'HOTEL') {
        const hotelOp = op as HotelConfig;
        return {
          ...hotelOp,
          id: 'upside-hotel-1',
          name: 'Upside Case Hotel',
          avgDailyRate: Math.round(hotelOp.avgDailyRate * 1.1), // +10% ADR
          occupancyByMonth: hotelOp.occupancyByMonth.map((occ) => Math.min(1, occ * 1.1)), // +10% Occupancy (capped at 100%)
        } as HotelConfig;
      }
      return op;
    }),
  };

  const upsideModelConfig: FullModelInput = {
    scenario: upsideScenario,
    projectConfig: { ...baseProjectConfig },
    capitalConfig: { ...baseCapitalConfig },
    waterfallConfig: { ...baseWaterfallConfig },
  };

  const upsideCase: NamedScenario = {
    id: 'upside-case',
    name: 'Upside Case',
    description: 'Base Case with 10% higher occupancy and 10% higher ADR',
    modelConfig: upsideModelConfig,
  };

  return [baseCase, stressCase, upsideCase];
}

