/**
 * Villas operation engine.
 * This will generate monthly and annual P&L statements for villa operations.
 */

import type {
  VillasConfig,
  MonthlyPnl,
  AnnualPnl,
} from '@domain/types';
import { aggregateAnnualPnl, applyRampUp, applySeasonality, DAYS_PER_MONTH, getSeasonalityCurve } from './utils';

export interface VillasEngineResult {
  monthlyPnl: MonthlyPnl[];
  annualPnl: AnnualPnl[];
}

/**
 * Runs the villas operation engine to generate monthly and annual P&L statements.
 *
 * @param config - Villas configuration
 * @returns Monthly and annual P&L results
 */
export function runVillasEngine(config: VillasConfig): VillasEngineResult {
  const monthlyPnl: MonthlyPnl[] = [];
  const commissionsPct = config.commissionsPct ?? 0;

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

      // Calculate occupied villa nights
      const occupiedNights = config.units * occupancy * DAYS_PER_MONTH;

      // Revenue calculations
      let rentalRevenue = occupiedNights * config.avgNightlyRate;
      let foodRevenue = rentalRevenue * config.foodRevenuePctOfRental;
      let beverageRevenue = rentalRevenue * config.beverageRevenuePctOfRental;
      let otherRevenue = rentalRevenue * config.otherRevenuePctOfRental;
      let totalRevenue = rentalRevenue + foodRevenue + beverageRevenue + otherRevenue;
      
      // v5.2: Apply ramp-up to revenue if configured
      if (rampUpConfig?.applyToRevenue) {
        totalRevenue = applyRampUp(totalRevenue, absoluteMonth, rampUpConfig);
        // Proportionally adjust revenue components
        const revenueFactor = (rentalRevenue + foodRevenue + beverageRevenue + otherRevenue) > 0 
          ? totalRevenue / (rentalRevenue + foodRevenue + beverageRevenue + otherRevenue) 
          : 0;
        rentalRevenue = rentalRevenue * revenueFactor;
        foodRevenue = foodRevenue * revenueFactor;
        beverageRevenue = beverageRevenue * revenueFactor;
        otherRevenue = otherRevenue * revenueFactor;
      }

      // COGS calculations
      const foodCogs = foodRevenue * config.foodCogsPct;
      const beverageCogs = beverageRevenue * config.beverageCogsPct;

      // Commissions calculation (v1.2.3: Engine Drivers Logic)
      // Commissions are calculated as % of rental revenue and included in departmental expenses
      const commissionsPct = config.commissionsPct ?? 0;
      const commissions = rentalRevenue * commissionsPct;

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
      // GOP = Revenue - Departmental Expenses (COGS + Commissions)
      const departmentalExpenses = foodCogs + beverageCogs + commissions;
      const grossOperatingProfit = totalRevenue - departmentalExpenses;
      const ebitda = grossOperatingProfit - totalOpex;
      const noi = ebitda - maintenanceCapex;

      // Cash flow proxy (for now, this equals NOI)
      const cashFlow = noi;

      // Create monthly P&L entry
      // Note: Using roomRevenue field to store rentalRevenue for consistency with MonthlyPnl type
      const monthly: MonthlyPnl = {
        yearIndex,
        monthIndex,
        operationId: config.id,
        roomRevenue: rentalRevenue,
        foodRevenue,
        beverageRevenue,
        otherRevenue,
        foodCogs,
        beverageCogs,
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

  const annualPnl = aggregateAnnualPnl(monthlyPnl, config.horizonYears, config.id, {
    cogsAdjustmentPerMonth: (month) => month.roomRevenue * commissionsPct,
  });

  return { monthlyPnl, annualPnl };
}

