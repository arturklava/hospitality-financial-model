/**
 * Restaurant operation engine.
 * This will generate monthly and annual P&L statements for restaurant operations.
 */

import type {
  RestaurantConfig,
  MonthlyPnl,
  AnnualPnl,
} from '@domain/types';
import { getSeasonalityCurve, applySeasonality, applyRampUp } from './utils';

export interface RestaurantEngineResult {
  monthlyPnl: MonthlyPnl[];
  annualPnl: AnnualPnl[];
}

/**
 * Runs the restaurant operation engine to generate monthly and annual P&L statements.
 *
 * @param config - Restaurant configuration
 * @returns Monthly and annual P&L results
 */
export function runRestaurantEngine(config: RestaurantConfig): RestaurantEngineResult {
  const monthlyPnl: MonthlyPnl[] = [];
  const DAYS_PER_MONTH = 30;

  // Get normalized seasonality curve (v3.5: Operational Logic)
  const seasonalityCurve = getSeasonalityCurve(config.seasonalityCurve);

  // Loop over all years
  for (let yearIndex = 0; yearIndex < config.horizonYears; yearIndex++) {
    // Loop over all months in the year
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      // Calculate absolute month number (for ramp-up calculation)
      const absoluteMonth = yearIndex * 12 + monthIndex;
      
      const baseTurnover = config.turnoverByMonth[monthIndex];

      // Apply seasonality to turnover (v3.5: Operational Logic)
      const turnover = applySeasonality(baseTurnover, monthIndex, seasonalityCurve);
      
      // v5.2: Apply ramp-up to turnover if configured (treat turnover as occupancy/utilization)
      const rampUpConfig = config.rampUpConfig;
      const turnoverAfterRampUp = rampUpConfig?.applyToOccupancy !== false
        ? applyRampUp(turnover, absoluteMonth, rampUpConfig)
        : turnover;
      
      // Ensure turnover is non-negative
      const adjustedTurnover = Math.max(0, turnoverAfterRampUp);

      // Calculate total covers served per month
      // coversPerDay = covers × turnover
      // totalCovers = coversPerDay × DAYS_PER_MONTH
      const totalCovers = config.covers * adjustedTurnover * DAYS_PER_MONTH;

      // Revenue calculations
      // Total revenue = totalCovers × avgCheck
      let totalRevenue = totalCovers * config.avgCheck;
      
      // v5.2: Apply ramp-up to revenue if configured
      if (rampUpConfig?.applyToRevenue) {
        totalRevenue = applyRampUp(totalRevenue, absoluteMonth, rampUpConfig);
      }
      
      // Revenue breakdown as % of total revenue
      const foodRevenue = totalRevenue * config.foodRevenuePctOfTotal;
      const beverageRevenue = totalRevenue * config.beverageRevenuePctOfTotal;
      const otherRevenue = totalRevenue * config.otherRevenuePctOfTotal;
      
      // Note: roomRevenue field is used to store the remaining revenue after food/beverage/other
      // This maintains consistency with MonthlyPnl type structure
      // roomRevenue = totalRevenue - foodRevenue - beverageRevenue - otherRevenue
      // But since food/beverage/other are percentages of totalRevenue, we calculate:
      const remainingRevenuePct = 1 - config.foodRevenuePctOfTotal - config.beverageRevenuePctOfTotal - config.otherRevenuePctOfTotal;
      const roomRevenue = totalRevenue * remainingRevenuePct;

      // COGS calculations
      const foodCogs = foodRevenue * config.foodCogsPct;
      const beverageCogs = beverageRevenue * config.beverageCogsPct;

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
      // Note: Using roomRevenue field to store total revenue for consistency with MonthlyPnl type
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

  // Aggregate monthly P&L into annual P&L
  const annualPnl: AnnualPnl[] = [];

  for (let yearIndex = 0; yearIndex < config.horizonYears; yearIndex++) {
    // Get all months for this year
    const yearMonths = monthlyPnl.filter((m) => m.yearIndex === yearIndex);

    // Sum all metrics for the year
    const revenueTotal = yearMonths.reduce((sum, m) => sum + m.roomRevenue + m.foodRevenue + m.beverageRevenue + m.otherRevenue, 0);
    const cogsTotal = yearMonths.reduce((sum, m) => sum + m.foodCogs + m.beverageCogs, 0);
    const opexTotal = yearMonths.reduce((sum, m) => sum + m.payroll + m.utilities + m.marketing + m.maintenanceOpex + m.otherOpex, 0);
    const ebitda = yearMonths.reduce((sum, m) => sum + m.ebitda, 0);
    const noi = yearMonths.reduce((sum, m) => sum + m.noi, 0);
    const maintenanceCapex = yearMonths.reduce((sum, m) => sum + m.maintenanceCapex, 0);
    const cashFlow = yearMonths.reduce((sum, m) => sum + m.cashFlow, 0);

    const annual: AnnualPnl = {
      yearIndex,
      operationId: config.id,
      revenueTotal,
      cogsTotal,
      opexTotal,
      ebitda,
      noi,
      maintenanceCapex,
      cashFlow,
    };

    annualPnl.push(annual);
  }

  return {
    monthlyPnl,
    annualPnl,
  };
}

