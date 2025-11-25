/**
 * Senior Living operation engine.
 * This will generate monthly and annual P&L statements for senior living operations.
 * Pattern: Keys/Units × Occupancy × Rate (similar to HOTEL/VILLAS)
 */

import type {
  SeniorLivingConfig,
  MonthlyPnl,
  AnnualPnl,
} from '@domain/types';
import { aggregateAnnualPnl, applyRampUp, applySeasonality, getSeasonalityCurve } from './utils';

export interface SeniorLivingEngineResult {
  monthlyPnl: MonthlyPnl[];
  annualPnl: AnnualPnl[];
}

/**
 * Runs the senior living operation engine to generate monthly and annual P&L statements.
 *
 * @param config - Senior living configuration
 * @returns Monthly and annual P&L results
 */
export function runSeniorLivingEngine(config: SeniorLivingConfig): SeniorLivingEngineResult {
  const monthlyPnl: MonthlyPnl[] = [];

  // Get normalized seasonality curve (v3.5: Operational Logic)
  const seasonalityCurve = getSeasonalityCurve(config.seasonalityCurve);

  // Loop over all years
  for (let yearIndex = 0; yearIndex < config.horizonYears; yearIndex++) {
    // Loop over all months in the year
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      // Calculate absolute month number (for ramp-up calculation)
      const absoluteMonth = yearIndex * 12 + monthIndex;
      
      const baseOccupancy = config.occupancyByMonth[monthIndex];

      // Apply seasonality to occupancy (v3.5: Operational Logic)
      const adjustedOccupancy = applySeasonality(baseOccupancy, monthIndex, seasonalityCurve);
      
      // v5.2: Apply ramp-up to occupancy if configured
      const rampUpConfig = config.rampUpConfig;
      const occupancyAfterRampUp = rampUpConfig?.applyToOccupancy !== false
        ? applyRampUp(adjustedOccupancy, absoluteMonth, rampUpConfig)
        : adjustedOccupancy;
      
      // Clamp occupancy to [0, 1] range
      const occupancy = Math.max(0, Math.min(1, occupancyAfterRampUp));

      // Calculate occupied units
      // occupiedUnits = units × occupancy
      const occupiedUnits = config.units * occupancy;

      // Revenue calculations
      // rentalRevenue = occupiedUnits × avgMonthlyRate
      let rentalRevenue = occupiedUnits * config.avgMonthlyRate;
      let careRevenue = rentalRevenue * config.careRevenuePctOfRental;
      let foodRevenue = rentalRevenue * config.foodRevenuePctOfRental;
      let otherRevenue = rentalRevenue * config.otherRevenuePctOfRental;
      let totalRevenue = rentalRevenue + careRevenue + foodRevenue + otherRevenue;
      
      // v5.2: Apply ramp-up to revenue if configured
      if (rampUpConfig?.applyToRevenue) {
        totalRevenue = applyRampUp(totalRevenue, absoluteMonth, rampUpConfig);
        // Proportionally adjust revenue components
        const revenueFactor = (rentalRevenue + careRevenue + foodRevenue + otherRevenue) > 0 
          ? totalRevenue / (rentalRevenue + careRevenue + foodRevenue + otherRevenue) 
          : 0;
        rentalRevenue = rentalRevenue * revenueFactor;
        careRevenue = careRevenue * revenueFactor;
        foodRevenue = foodRevenue * revenueFactor;
        otherRevenue = otherRevenue * revenueFactor;
      }

      // COGS calculations
      const foodCogs = foodRevenue * config.foodCogsPct;
      const careCogs = careRevenue * config.careCogsPct;
      // Note: careCogs is stored in beverageCogs field for consistency with MonthlyPnl type
      // beverageRevenue field is set to 0 since senior living doesn't have beverage revenue
      const beverageCogs = careCogs;

      // Opex calculations (v3.5: Fixed + Variable model)
      // Payroll = Fixed + (Variable % of revenue)
      const fixedPayroll = config.fixedPayroll ?? 0;
      const variablePayroll = totalRevenue * config.payrollPct;
      const payroll = fixedPayroll + variablePayroll;

      // Other expenses = Fixed + (Variable % of revenue)
      const fixedOtherExpenses = config.fixedOtherExpenses ?? 0;
      const variableOtherExpenses = totalRevenue * config.otherOpexPct;
      const otherOpex = fixedOtherExpenses + variableOtherExpenses;

      // Other opex items remain as % of totalRevenue
      const utilities = totalRevenue * config.utilitiesPct;
      const marketing = totalRevenue * config.marketingPct;
      const maintenanceOpex = totalRevenue * config.maintenanceOpexPct;
      
      const totalOpex = payroll + utilities + marketing + maintenanceOpex + otherOpex;

      // Maintenance capex
      const maintenanceCapex = totalRevenue * config.maintenanceCapexPct;

      // Profitability calculations
      const grossOperatingProfit = totalRevenue - (foodCogs + beverageCogs);
      const ebitda = grossOperatingProfit - totalOpex;
      const noi = ebitda - maintenanceCapex;

      // Cash flow proxy (for now, this equals NOI)
      const cashFlow = noi;

      // Create monthly P&L entry
      // Note: Using roomRevenue field to store rentalRevenue for consistency with MonthlyPnl type
      // careRevenue is included in otherRevenue along with otherRevenue
      const monthly: MonthlyPnl = {
        yearIndex,
        monthIndex,
        operationId: config.id,
        roomRevenue: rentalRevenue,
        foodRevenue,
        beverageRevenue: 0, // No beverage revenue for senior living
        otherRevenue: careRevenue + otherRevenue, // Combine careRevenue and otherRevenue
        foodCogs,
        beverageCogs, // Stores careCogs
        payroll,
        utilities,
        marketing,
        maintenanceOpex,
        otherOpex,
        grossOperatingProfit,
        ebitda,
        noi,
        maintenanceCapex,
        cashFlow,
      };

      monthlyPnl.push(monthly);
    }
  }

  const annualPnl = aggregateAnnualPnl(monthlyPnl, config.horizonYears, config.id);

  return { monthlyPnl, annualPnl };
}

