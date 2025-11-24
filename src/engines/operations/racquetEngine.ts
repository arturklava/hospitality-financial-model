/**
 * Racquet operation engine.
 * This will generate monthly and annual P&L statements for racquet operations.
 * Pattern: Volume × Ticket (similar to RESTAURANT)
 */

import type {
  RacquetConfig,
  MonthlyPnl,
  AnnualPnl,
} from '@domain/types';
import { getSeasonalityCurve, applySeasonality, applyRampUp } from './utils';

export interface RacquetEngineResult {
  monthlyPnl: MonthlyPnl[];
  annualPnl: AnnualPnl[];
}

/**
 * Runs the racquet operation engine to generate monthly and annual P&L statements.
 *
 * @param config - Racquet configuration
 * @returns Monthly and annual P&L results
 */
export function runRacquetEngine(config: RacquetConfig): RacquetEngineResult {
  const monthlyPnl: MonthlyPnl[] = [];
  const DAYS_PER_MONTH = 30;

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

      // Calculate court revenue
      // courtHoursPerMonth = courts × utilization × hoursPerDay × DAYS_PER_MONTH
      const courtHoursPerMonth = config.courts * utilization * config.hoursPerDay * DAYS_PER_MONTH;
      const courtRevenue = courtHoursPerMonth * config.avgCourtRate;

      // Total primary revenue (courts + memberships)
      const primaryRevenue = courtRevenue + monthlyMembershipRevenue;

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

