/**
 * Sample scenario configuration for the UI.
 * This is a hardcoded scenario used for demonstration.
 */

import type {
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
  HotelConfig,
} from '@domain/types';

/**
 * Builds a sample hotel configuration.
 */
function buildSampleHotelConfig(): HotelConfig {
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
 * Sample project scenario with a single hotel operation.
 */
export const sampleScenario: ProjectScenario = {
  id: 'sample-scenario-1',
  name: 'Sample Hospitality Project',
  startYear: 2026,
  horizonYears: 5,
  operations: [buildSampleHotelConfig()],
};

/**
 * Sample project configuration.
 */
export const sampleProjectConfig: ProjectConfig = {
  discountRate: 0.10, // 10% discount rate
  terminalGrowthRate: 0.02, // 2% terminal growth
  initialInvestment: 50000000, // $50M initial investment
  workingCapitalPercentage: 0.05, // 5% of revenue
};

/**
 * Sample capital structure configuration.
 */
export const sampleCapitalConfig: CapitalStructureConfig = {
  initialInvestment: 50000000,
  debtTranches: [
    {
      id: 'senior-loan',
      amount: Math.round(50000000 * 0.65), // 65% debt
      interestRate: 0.10, // 10% interest rate
      termYears: 5,
      amortizationYears: 5,
    },
  ],
};

/**
 * Sample waterfall configuration.
 */
export const sampleWaterfallConfig: WaterfallConfig = {
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

