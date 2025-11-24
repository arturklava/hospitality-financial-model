/**
 * Export Utilities (v0.13)
 * 
 * Provides data transformation helpers for Excel export.
 * Flattens nested data structures into simple row/column formats
 * that can be easily written to Excel without complex logic in the UI layer.
 */

import type {
  NamedScenario,
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
  ConsolidatedAnnualPnl,
} from './types';

/**
 * Flattened assumption row structure.
 * Each row represents a single assumption value with its category and item name.
 */
export interface FlattenedAssumption {
  Category: string;
  Item: string;
  Value: string | number | boolean;
}

/**
 * Flatten scenario assumptions into a flat list for Excel export.
 * 
 * Converts the nested NamedScenario structure into a flat list of rows
 * with Category, Item, and Value columns. This makes it easy to write
 * to Excel without complex nested logic in the UI layer.
 * 
 * Categories:
 * - "Scenario": Top-level scenario metadata (id, name, description)
 * - "Project Config": Project-level settings (discount rate, initial investment, etc.)
 * - "Capital Config": Capital structure settings
 * - "Debt Tranche": Individual debt tranche configurations
 * - "Waterfall Config": Waterfall configuration
 * - "Equity Class": Individual equity class configurations
 * - "Waterfall Tier": Individual waterfall tier configurations
 * - "Operation": Individual operation configurations
 * 
 * @param scenario - The scenario to flatten
 * @returns Array of flattened assumption rows
 */
export function flattenAssumptions(
  scenario: NamedScenario
): FlattenedAssumption[] {
  const rows: FlattenedAssumption[] = [];

  // Scenario metadata
  rows.push({ Category: 'Scenario', Item: 'ID', Value: scenario.id });
  rows.push({ Category: 'Scenario', Item: 'Name', Value: scenario.name });
  if (scenario.description) {
    rows.push({
      Category: 'Scenario',
      Item: 'Description',
      Value: scenario.description,
    });
  }

  // Project Config
  const projectConfig = scenario.modelConfig.projectConfig;
  rows.push({
    Category: 'Project Config',
    Item: 'Discount Rate',
    Value: projectConfig.discountRate,
  });
  rows.push({
    Category: 'Project Config',
    Item: 'Terminal Growth Rate',
    Value: projectConfig.terminalGrowthRate,
  });
  rows.push({
    Category: 'Project Config',
    Item: 'Initial Investment',
    Value: projectConfig.initialInvestment,
  });
  if (projectConfig.workingCapitalPercentage !== undefined) {
    rows.push({
      Category: 'Project Config',
      Item: 'Working Capital Percentage',
      Value: projectConfig.workingCapitalPercentage,
    });
  }
  if (projectConfig.workingCapitalPercent !== undefined) {
    rows.push({
      Category: 'Project Config',
      Item: 'Working Capital Percent',
      Value: projectConfig.workingCapitalPercent,
    });
  }
  if (projectConfig.taxRate !== undefined) {
    rows.push({
      Category: 'Project Config',
      Item: 'Tax Rate',
      Value: projectConfig.taxRate,
    });
  }

  // Scenario-level settings
  const scenarioConfig = scenario.modelConfig.scenario;
  rows.push({
    Category: 'Scenario',
    Item: 'Start Year',
    Value: scenarioConfig.startYear,
  });
  rows.push({
    Category: 'Scenario',
    Item: 'Horizon Years',
    Value: scenarioConfig.horizonYears,
  });

  // Capital Config
  const capitalConfig = scenario.modelConfig.capitalConfig;
  rows.push({
    Category: 'Capital Config',
    Item: 'Initial Investment',
    Value: capitalConfig.initialInvestment,
  });

  // Debt Tranches
  capitalConfig.debtTranches.forEach((tranche, index) => {
    const prefix = `Debt Tranche ${index + 1}`;
    rows.push({
      Category: prefix,
      Item: 'ID',
      Value: tranche.id,
    });
    if (tranche.label) {
      rows.push({
        Category: prefix,
        Item: 'Label',
        Value: tranche.label,
      });
    }
    if (tranche.type) {
      rows.push({
        Category: prefix,
        Item: 'Type',
        Value: tranche.type,
      });
    }
    if (tranche.initialPrincipal !== undefined) {
      rows.push({
        Category: prefix,
        Item: 'Initial Principal',
        Value: tranche.initialPrincipal,
      });
    }
    if (tranche.amount !== undefined) {
      rows.push({
        Category: prefix,
        Item: 'Amount',
        Value: tranche.amount,
      });
    }
    rows.push({
      Category: prefix,
      Item: 'Interest Rate',
      Value: tranche.interestRate,
    });
    if (tranche.amortizationType) {
      rows.push({
        Category: prefix,
        Item: 'Amortization Type',
        Value: tranche.amortizationType,
      });
    }
    rows.push({
      Category: prefix,
      Item: 'Term Years',
      Value: tranche.termYears,
    });
    if (tranche.amortizationYears !== undefined) {
      rows.push({
        Category: prefix,
        Item: 'Amortization Years',
        Value: tranche.amortizationYears,
      });
    }
    if (tranche.ioYears !== undefined) {
      rows.push({
        Category: prefix,
        Item: 'IO Years',
        Value: tranche.ioYears,
      });
    }
    if (tranche.startYear !== undefined) {
      rows.push({
        Category: prefix,
        Item: 'Start Year',
        Value: tranche.startYear,
      });
    }
    if (tranche.refinanceAtYear !== undefined) {
      rows.push({
        Category: prefix,
        Item: 'Refinance At Year',
        Value: tranche.refinanceAtYear,
      });
    }
    if (tranche.originationFeePct !== undefined) {
      rows.push({
        Category: prefix,
        Item: 'Origination Fee %',
        Value: tranche.originationFeePct,
      });
    }
    if (tranche.exitFeePct !== undefined) {
      rows.push({
        Category: prefix,
        Item: 'Exit Fee %',
        Value: tranche.exitFeePct,
      });
    }
  });

  // Waterfall Config
  const waterfallConfig = scenario.modelConfig.waterfallConfig;

  // Equity Classes
  waterfallConfig.equityClasses.forEach((equityClass, index) => {
    const prefix = `Equity Class ${index + 1}`;
    rows.push({
      Category: prefix,
      Item: 'ID',
      Value: equityClass.id,
    });
    rows.push({
      Category: prefix,
      Item: 'Name',
      Value: equityClass.name,
    });
    rows.push({
      Category: prefix,
      Item: 'Contribution %',
      Value: equityClass.contributionPct,
    });
    if (equityClass.distributionPct !== undefined) {
      rows.push({
        Category: prefix,
        Item: 'Distribution %',
        Value: equityClass.distributionPct,
      });
    }
  });

  // Waterfall Tiers
  if (waterfallConfig.tiers) {
    waterfallConfig.tiers.forEach((tier, index) => {
      const prefix = `Waterfall Tier ${index + 1}`;
      rows.push({
        Category: prefix,
        Item: 'ID',
        Value: tier.id,
      });
      rows.push({
        Category: prefix,
        Item: 'Type',
        Value: tier.type,
      });
      if (tier.hurdleIrr !== undefined) {
        rows.push({
          Category: prefix,
          Item: 'Hurdle IRR',
          Value: tier.hurdleIrr,
        });
      }
      // Distribution splits as JSON string for simplicity
      if (Object.keys(tier.distributionSplits).length > 0) {
        rows.push({
          Category: prefix,
          Item: 'Distribution Splits',
          Value: JSON.stringify(tier.distributionSplits),
        });
      }
      if (tier.enableCatchUp !== undefined) {
        rows.push({
          Category: prefix,
          Item: 'Enable Catch-Up',
          Value: tier.enableCatchUp,
        });
      }
      if (tier.catchUpTargetSplit) {
        rows.push({
          Category: prefix,
          Item: 'Catch-Up Target Split',
          Value: JSON.stringify(tier.catchUpTargetSplit),
        });
      }
      if (tier.catchUpRate !== undefined) {
        rows.push({
          Category: prefix,
          Item: 'Catch-Up Rate',
          Value: tier.catchUpRate,
        });
      }
      if (tier.enableClawback !== undefined) {
        rows.push({
          Category: prefix,
          Item: 'Enable Clawback',
          Value: tier.enableClawback,
        });
      }
      if (tier.clawbackTrigger) {
        rows.push({
          Category: prefix,
          Item: 'Clawback Trigger',
          Value: tier.clawbackTrigger,
        });
      }
      if (tier.clawbackMethod) {
        rows.push({
          Category: prefix,
          Item: 'Clawback Method',
          Value: tier.clawbackMethod,
        });
      }
    });
  }

  // Operations
  scenarioConfig.operations.forEach((operation, index) => {
    flattenOperation(operation, index + 1, rows);
  });

  return rows;
}

/**
 * Flatten a single operation configuration.
 */
function flattenOperation(
  operation: OperationConfig,
  operationIndex: number,
  rows: FlattenedAssumption[]
): void {
  const prefix = `Operation ${operationIndex}`;

  // Common fields
  rows.push({
    Category: prefix,
    Item: 'ID',
    Value: operation.id,
  });
  rows.push({
    Category: prefix,
    Item: 'Name',
    Value: operation.name,
  });
  rows.push({
    Category: prefix,
    Item: 'Type',
    Value: operation.operationType,
  });
  rows.push({
    Category: prefix,
    Item: 'Start Year',
    Value: operation.startYear,
  });
  rows.push({
    Category: prefix,
    Item: 'Horizon Years',
    Value: operation.horizonYears,
  });

  // Operation-specific fields
  switch (operation.operationType) {
    case 'HOTEL':
      flattenHotelConfig(operation, prefix, rows);
      break;
    case 'VILLAS':
      flattenVillasConfig(operation, prefix, rows);
      break;
    case 'RESTAURANT':
      flattenRestaurantConfig(operation, prefix, rows);
      break;
    case 'BEACH_CLUB':
      flattenBeachClubConfig(operation, prefix, rows);
      break;
    case 'RACQUET':
      flattenRacquetConfig(operation, prefix, rows);
      break;
    case 'RETAIL':
      flattenRetailConfig(operation, prefix, rows);
      break;
    case 'FLEX':
      flattenFlexConfig(operation, prefix, rows);
      break;
    case 'WELLNESS':
      flattenWellnessConfig(operation, prefix, rows);
      break;
    case 'SENIOR_LIVING':
      flattenSeniorLivingConfig(operation, prefix, rows);
      break;
  }
}

function flattenHotelConfig(
  config: HotelConfig,
  prefix: string,
  rows: FlattenedAssumption[]
): void {
  rows.push({ Category: prefix, Item: 'Keys', Value: config.keys });
  rows.push({
    Category: prefix,
    Item: 'Average Daily Rate',
    Value: config.avgDailyRate,
  });
  rows.push({
    Category: prefix,
    Item: 'Occupancy By Month',
    Value: JSON.stringify(config.occupancyByMonth),
  });
  rows.push({
    Category: prefix,
    Item: 'Food Revenue % of Rooms',
    Value: config.foodRevenuePctOfRooms,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage Revenue % of Rooms',
    Value: config.beverageRevenuePctOfRooms,
  });
  rows.push({
    Category: prefix,
    Item: 'Other Revenue % of Rooms',
    Value: config.otherRevenuePctOfRooms,
  });
  rows.push({
    Category: prefix,
    Item: 'Food COGS %',
    Value: config.foodCogsPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage COGS %',
    Value: config.beverageCogsPct,
  });
  rows.push({ Category: prefix, Item: 'Payroll %', Value: config.payrollPct });
  rows.push({
    Category: prefix,
    Item: 'Utilities %',
    Value: config.utilitiesPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Marketing %',
    Value: config.marketingPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance OPEX %',
    Value: config.maintenanceOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Other OPEX %',
    Value: config.otherOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance CAPEX %',
    Value: config.maintenanceCapexPct,
  });
}

function flattenVillasConfig(
  config: VillasConfig,
  prefix: string,
  rows: FlattenedAssumption[]
): void {
  rows.push({ Category: prefix, Item: 'Units', Value: config.units });
  rows.push({
    Category: prefix,
    Item: 'Average Nightly Rate',
    Value: config.avgNightlyRate,
  });
  rows.push({
    Category: prefix,
    Item: 'Occupancy By Month',
    Value: JSON.stringify(config.occupancyByMonth),
  });
  rows.push({
    Category: prefix,
    Item: 'Food Revenue % of Rental',
    Value: config.foodRevenuePctOfRental,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage Revenue % of Rental',
    Value: config.beverageRevenuePctOfRental,
  });
  rows.push({
    Category: prefix,
    Item: 'Other Revenue % of Rental',
    Value: config.otherRevenuePctOfRental,
  });
  rows.push({
    Category: prefix,
    Item: 'Food COGS %',
    Value: config.foodCogsPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage COGS %',
    Value: config.beverageCogsPct,
  });
  rows.push({ Category: prefix, Item: 'Payroll %', Value: config.payrollPct });
  rows.push({
    Category: prefix,
    Item: 'Utilities %',
    Value: config.utilitiesPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Marketing %',
    Value: config.marketingPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance OPEX %',
    Value: config.maintenanceOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Other OPEX %',
    Value: config.otherOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance CAPEX %',
    Value: config.maintenanceCapexPct,
  });
}

function flattenRestaurantConfig(
  config: RestaurantConfig,
  prefix: string,
  rows: FlattenedAssumption[]
): void {
  rows.push({ Category: prefix, Item: 'Covers', Value: config.covers });
  rows.push({
    Category: prefix,
    Item: 'Average Check',
    Value: config.avgCheck,
  });
  rows.push({
    Category: prefix,
    Item: 'Turnover By Month',
    Value: JSON.stringify(config.turnoverByMonth),
  });
  rows.push({
    Category: prefix,
    Item: 'Food Revenue % of Total',
    Value: config.foodRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage Revenue % of Total',
    Value: config.beverageRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Other Revenue % of Total',
    Value: config.otherRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Food COGS %',
    Value: config.foodCogsPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage COGS %',
    Value: config.beverageCogsPct,
  });
  rows.push({ Category: prefix, Item: 'Payroll %', Value: config.payrollPct });
  rows.push({
    Category: prefix,
    Item: 'Utilities %',
    Value: config.utilitiesPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Marketing %',
    Value: config.marketingPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance OPEX %',
    Value: config.maintenanceOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Other OPEX %',
    Value: config.otherOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance CAPEX %',
    Value: config.maintenanceCapexPct,
  });
}

function flattenBeachClubConfig(
  config: BeachClubConfig,
  prefix: string,
  rows: FlattenedAssumption[]
): void {
  rows.push({
    Category: prefix,
    Item: 'Daily Passes',
    Value: config.dailyPasses,
  });
  rows.push({
    Category: prefix,
    Item: 'Average Daily Pass Price',
    Value: config.avgDailyPassPrice,
  });
  rows.push({
    Category: prefix,
    Item: 'Memberships',
    Value: config.memberships,
  });
  rows.push({
    Category: prefix,
    Item: 'Average Membership Fee',
    Value: config.avgMembershipFee,
  });
  rows.push({
    Category: prefix,
    Item: 'Utilization By Month',
    Value: JSON.stringify(config.utilizationByMonth),
  });
  rows.push({
    Category: prefix,
    Item: 'Food Revenue % of Total',
    Value: config.foodRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage Revenue % of Total',
    Value: config.beverageRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Other Revenue % of Total',
    Value: config.otherRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Food COGS %',
    Value: config.foodCogsPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage COGS %',
    Value: config.beverageCogsPct,
  });
  rows.push({ Category: prefix, Item: 'Payroll %', Value: config.payrollPct });
  rows.push({
    Category: prefix,
    Item: 'Utilities %',
    Value: config.utilitiesPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Marketing %',
    Value: config.marketingPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance OPEX %',
    Value: config.maintenanceOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Other OPEX %',
    Value: config.otherOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance CAPEX %',
    Value: config.maintenanceCapexPct,
  });
}

function flattenRacquetConfig(
  config: RacquetConfig,
  prefix: string,
  rows: FlattenedAssumption[]
): void {
  rows.push({ Category: prefix, Item: 'Courts', Value: config.courts });
  rows.push({
    Category: prefix,
    Item: 'Average Court Rate',
    Value: config.avgCourtRate,
  });
  rows.push({
    Category: prefix,
    Item: 'Utilization By Month',
    Value: JSON.stringify(config.utilizationByMonth),
  });
  rows.push({
    Category: prefix,
    Item: 'Hours Per Day',
    Value: config.hoursPerDay,
  });
  rows.push({
    Category: prefix,
    Item: 'Memberships',
    Value: config.memberships,
  });
  rows.push({
    Category: prefix,
    Item: 'Average Membership Fee',
    Value: config.avgMembershipFee,
  });
  rows.push({
    Category: prefix,
    Item: 'Food Revenue % of Total',
    Value: config.foodRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage Revenue % of Total',
    Value: config.beverageRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Other Revenue % of Total',
    Value: config.otherRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Food COGS %',
    Value: config.foodCogsPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage COGS %',
    Value: config.beverageCogsPct,
  });
  rows.push({ Category: prefix, Item: 'Payroll %', Value: config.payrollPct });
  rows.push({
    Category: prefix,
    Item: 'Utilities %',
    Value: config.utilitiesPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Marketing %',
    Value: config.marketingPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance OPEX %',
    Value: config.maintenanceOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Other OPEX %',
    Value: config.otherOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance CAPEX %',
    Value: config.maintenanceCapexPct,
  });
}

function flattenRetailConfig(
  config: RetailConfig,
  prefix: string,
  rows: FlattenedAssumption[]
): void {
  rows.push({ Category: prefix, Item: 'Square Meters', Value: config.sqm });
  rows.push({
    Category: prefix,
    Item: 'Average Rent Per Sqm',
    Value: config.avgRentPerSqm,
  });
  rows.push({
    Category: prefix,
    Item: 'Occupancy By Month',
    Value: JSON.stringify(config.occupancyByMonth),
  });
  rows.push({
    Category: prefix,
    Item: 'Rental Revenue % of Total',
    Value: config.rentalRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Other Revenue % of Total',
    Value: config.otherRevenuePctOfTotal,
  });
  rows.push({ Category: prefix, Item: 'Payroll %', Value: config.payrollPct });
  rows.push({
    Category: prefix,
    Item: 'Utilities %',
    Value: config.utilitiesPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Marketing %',
    Value: config.marketingPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance OPEX %',
    Value: config.maintenanceOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Other OPEX %',
    Value: config.otherOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance CAPEX %',
    Value: config.maintenanceCapexPct,
  });
}

function flattenFlexConfig(
  config: FlexConfig,
  prefix: string,
  rows: FlattenedAssumption[]
): void {
  rows.push({ Category: prefix, Item: 'Square Meters', Value: config.sqm });
  rows.push({
    Category: prefix,
    Item: 'Average Rent Per Sqm',
    Value: config.avgRentPerSqm,
  });
  rows.push({
    Category: prefix,
    Item: 'Occupancy By Month',
    Value: JSON.stringify(config.occupancyByMonth),
  });
  rows.push({
    Category: prefix,
    Item: 'Rental Revenue % of Total',
    Value: config.rentalRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Other Revenue % of Total',
    Value: config.otherRevenuePctOfTotal,
  });
  rows.push({ Category: prefix, Item: 'Payroll %', Value: config.payrollPct });
  rows.push({
    Category: prefix,
    Item: 'Utilities %',
    Value: config.utilitiesPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Marketing %',
    Value: config.marketingPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance OPEX %',
    Value: config.maintenanceOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Other OPEX %',
    Value: config.otherOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance CAPEX %',
    Value: config.maintenanceCapexPct,
  });
}

function flattenWellnessConfig(
  config: WellnessConfig,
  prefix: string,
  rows: FlattenedAssumption[]
): void {
  rows.push({
    Category: prefix,
    Item: 'Memberships',
    Value: config.memberships,
  });
  rows.push({
    Category: prefix,
    Item: 'Average Membership Fee',
    Value: config.avgMembershipFee,
  });
  rows.push({
    Category: prefix,
    Item: 'Daily Passes',
    Value: config.dailyPasses,
  });
  rows.push({
    Category: prefix,
    Item: 'Average Daily Pass Price',
    Value: config.avgDailyPassPrice,
  });
  rows.push({
    Category: prefix,
    Item: 'Utilization By Month',
    Value: JSON.stringify(config.utilizationByMonth),
  });
  rows.push({
    Category: prefix,
    Item: 'Food Revenue % of Total',
    Value: config.foodRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage Revenue % of Total',
    Value: config.beverageRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Other Revenue % of Total',
    Value: config.otherRevenuePctOfTotal,
  });
  rows.push({
    Category: prefix,
    Item: 'Food COGS %',
    Value: config.foodCogsPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Beverage COGS %',
    Value: config.beverageCogsPct,
  });
  rows.push({ Category: prefix, Item: 'Payroll %', Value: config.payrollPct });
  rows.push({
    Category: prefix,
    Item: 'Utilities %',
    Value: config.utilitiesPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Marketing %',
    Value: config.marketingPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance OPEX %',
    Value: config.maintenanceOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Other OPEX %',
    Value: config.otherOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance CAPEX %',
    Value: config.maintenanceCapexPct,
  });
}

function flattenSeniorLivingConfig(
  config: SeniorLivingConfig,
  prefix: string,
  rows: FlattenedAssumption[]
): void {
  rows.push({ Category: prefix, Item: 'Units', Value: config.units });
  rows.push({
    Category: prefix,
    Item: 'Average Monthly Rate',
    Value: config.avgMonthlyRate,
  });
  rows.push({
    Category: prefix,
    Item: 'Occupancy By Month',
    Value: JSON.stringify(config.occupancyByMonth),
  });
  rows.push({
    Category: prefix,
    Item: 'Care Revenue % of Rental',
    Value: config.careRevenuePctOfRental,
  });
  rows.push({
    Category: prefix,
    Item: 'Food Revenue % of Rental',
    Value: config.foodRevenuePctOfRental,
  });
  rows.push({
    Category: prefix,
    Item: 'Other Revenue % of Rental',
    Value: config.otherRevenuePctOfRental,
  });
  rows.push({
    Category: prefix,
    Item: 'Food COGS %',
    Value: config.foodCogsPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Care COGS %',
    Value: config.careCogsPct,
  });
  rows.push({ Category: prefix, Item: 'Payroll %', Value: config.payrollPct });
  rows.push({
    Category: prefix,
    Item: 'Utilities %',
    Value: config.utilitiesPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Marketing %',
    Value: config.marketingPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance OPEX %',
    Value: config.maintenanceOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Other OPEX %',
    Value: config.otherOpexPct,
  });
  rows.push({
    Category: prefix,
    Item: 'Maintenance CAPEX %',
    Value: config.maintenanceCapexPct,
  });
}

/**
 * Flatten consolidated annual P&L into a 2D array for Excel export.
 * 
 * Converts the ConsolidatedAnnualPnl array into a 2D array (rows/columns)
 * that can be directly inserted into Excel. The first row contains headers,
 * and subsequent rows contain one year of data each.
 * 
 * Columns:
 * - Year (calendar year, calculated from yearIndex + startYear if available)
 * - Revenue Total
 * - Departmental Expenses
 * - GOP (Gross Operating Profit)
 * - Undistributed Expenses
 * - Management Fees (if present)
 * - Non-Operating Income/Expense (if present)
 * - NOI (Net Operating Income)
 * - Maintenance CAPEX
 * - Cash Flow
 * 
 * @param pnl - Array of consolidated annual P&L entries
 * @param startYear - Optional start year to calculate calendar years (defaults to using yearIndex)
 * @returns 2D array where first row is headers and subsequent rows are data
 */
export function flattenCashFlow(
  pnl: ConsolidatedAnnualPnl[],
  startYear?: number
): any[][] {
  const rows: any[][] = [];

  // Header row
  const headers = [
    'Year',
    'Revenue Total',
    'Departmental Expenses',
    'GOP',
    'Undistributed Expenses',
    'Management Fees',
    'Non-Operating Income/Expense',
    'NOI',
    'Maintenance CAPEX',
    'Cash Flow',
  ];
  rows.push(headers);

  // Data rows
  for (const entry of pnl) {
    const calendarYear = startYear !== undefined
      ? startYear + entry.yearIndex
      : entry.yearIndex;

    const row = [
      calendarYear,
      entry.revenueTotal,
      entry.departmentalExpenses,
      entry.gop,
      entry.undistributedExpenses,
      entry.managementFees ?? null,
      entry.nonOperatingIncomeExpense ?? null,
      entry.noi,
      entry.maintenanceCapex,
      entry.cashFlow,
    ];
    rows.push(row);
  }

  return rows;
}

