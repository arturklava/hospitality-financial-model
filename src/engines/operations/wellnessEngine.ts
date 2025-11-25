/**
 * Wellness operation engine.
 * This will generate monthly and annual P&L statements for wellness operations.
 * Pattern: Volume × Ticket (similar to RESTAURANT)
 */

import type {
  WellnessConfig,
  MonthlyPnl,
  AnnualPnl,
} from '@domain/types';
import { aggregateAnnualPnl, applyRampUp, applySeasonality, DAYS_PER_MONTH, getSeasonalityCurve } from './utils';

export interface WellnessEngineResult {
  monthlyPnl: MonthlyPnl[];
  annualPnl: AnnualPnl[];
}

/**
 * Runs the wellness operation engine to generate monthly and annual P&L statements.
 *
 * @param config - Wellness configuration
 * @returns Monthly and annual P&L results
 */
export function runWellnessEngine(config: WellnessConfig): WellnessEngineResult {
  const monthlyPnl: MonthlyPnl[] = [];

  // Get normalized seasonality curve (v3.5: Operational Logic)
  const seasonalityCurve = getSeasonalityCurve(config.seasonalityCurve);

  // Membership revenue per month (allocated evenly across 12 months)
  const monthlyMembershipRevenue = (config.memberships * config.avgMembershipFee) / 12;

  // Loop over all years
  for (let yearIndex = 0; yearIndex < config.horizonYears; yearIndex++) {
    // Loop over all months in the year
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      // Calculate absolute month number (for ramp-up calculation)
      const absoluteMonth = yearIndex * 12 + monthIndex;
      
      const baseUtilization = config.utilizationByMonth[monthIndex];

      // Apply seasonality to utilization (v3.5: Operational Logic)
      const adjustedUtilization = applySeasonality(baseUtilization, monthIndex, seasonalityCurve);
      
      // v5.2: Apply ramp-up to utilization if configured
      const rampUpConfig = config.rampUpConfig;
      const utilizationAfterRampUp = rampUpConfig?.applyToOccupancy !== false
        ? applyRampUp(adjustedUtilization, absoluteMonth, rampUpConfig)
        : adjustedUtilization;
      
      // Clamp utilization to [0, 1] range
      const utilization = Math.max(0, Math.min(1, utilizationAfterRampUp));

      // Calculate daily pass revenue
      // passesPerMonth = dailyPasses × utilization × DAYS_PER_MONTH
      const passesPerMonth = config.dailyPasses * utilization * DAYS_PER_MONTH;
      const dailyPassRevenue = passesPerMonth * config.avgDailyPassPrice;

      // Total primary revenue (daily passes + memberships)
      const primaryRevenue = dailyPassRevenue + monthlyMembershipRevenue;

      // Revenue breakdown as % of total revenue
      // Similar to beach club: totalRevenue = primaryRevenue / (1 - foodRevenuePctOfTotal - beverageRevenuePctOfTotal - otherRevenuePctOfTotal)
      const remainingRevenuePct = 1 - config.foodRevenuePctOfTotal - config.beverageRevenuePctOfTotal - config.otherRevenuePctOfTotal;
      let totalRevenue = remainingRevenuePct > 0 ? primaryRevenue / remainingRevenuePct : primaryRevenue;
      
      // v5.2: Apply ramp-up to revenue if configured
      if (rampUpConfig?.applyToRevenue) {
        totalRevenue = applyRampUp(totalRevenue, absoluteMonth, rampUpConfig);
      }
      
      const foodRevenue = totalRevenue * config.foodRevenuePctOfTotal;
      const beverageRevenue = totalRevenue * config.beverageRevenuePctOfTotal;
      const otherRevenue = totalRevenue * config.otherRevenuePctOfTotal;

      // Note: roomRevenue field stores the remaining revenue after food/beverage/other
      const roomRevenue = totalRevenue - foodRevenue - beverageRevenue - otherRevenue;

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

