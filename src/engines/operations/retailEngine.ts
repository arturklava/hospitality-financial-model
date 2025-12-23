/**
 * Retail operation engine.
 * This will generate monthly and annual P&L statements for retail operations.
 * Pattern: Volume × Rate (similar to RESTAURANT)
 */

import type {
  RetailConfig,
  MonthlyPnl,
  AnnualPnl,
} from '@domain/types';
import { aggregateAnnualPnl, applyRampUp, applySeasonality, getSeasonalityCurve } from './utils';

export interface RetailEngineResult {
  monthlyPnl: MonthlyPnl[];
  annualPnl: AnnualPnl[];
}

/**
 * Runs the retail operation engine to generate monthly and annual P&L statements.
 *
 * @param config - Retail configuration
 * @returns Monthly and annual P&L results
 */
export function runRetailEngine(config: RetailConfig): RetailEngineResult {
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

      // Calculate rental revenue
      // occupiedSqm = sqm × occupancy
      // rentalRevenue = occupiedSqm × avgRentPerSqm
      const occupiedSqm = config.sqm * occupancy;
      let rentalRevenue = occupiedSqm * config.avgRentPerSqm;

      // Revenue breakdown as % of total revenue
      let otherRevenue = rentalRevenue * config.otherRevenuePctOfTotal;

      // Total revenue
      let totalRevenue = rentalRevenue + otherRevenue;
      
      // v5.2: Apply ramp-up to revenue if configured
      if (rampUpConfig?.applyToRevenue) {
        totalRevenue = applyRampUp(totalRevenue, absoluteMonth, rampUpConfig);
        // Proportionally adjust revenue components
        const revenueFactor = (rentalRevenue + otherRevenue) > 0 ? totalRevenue / (rentalRevenue + otherRevenue) : 0;
        rentalRevenue = rentalRevenue * revenueFactor;
        otherRevenue = otherRevenue * revenueFactor;
      }

      // Note: roomRevenue field stores the rental revenue
      // foodRevenue and beverageRevenue are zero for retail (no F&B)
      const roomRevenue = rentalRevenue;
      const foodRevenue = 0;
      const beverageRevenue = 0;

      // COGS: none for retail (lease-based, no direct COGS)
      const foodCogs = 0;
      const beverageCogs = 0;

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
      const monthly: MonthlyPnl = {
        yearIndex,
        monthIndex,
        operationId: config.id,
        roomRevenue,
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

  const annualPnl = aggregateAnnualPnl(monthlyPnl, config.horizonYears, config.id);

  return { monthlyPnl, annualPnl };
}

