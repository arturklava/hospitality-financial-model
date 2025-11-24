/**
 * Project engine.
 * This will perform DCF valuation and calculate project-level KPIs.
 */

import type {
  ConsolidatedAnnualPnl,
  ProjectConfig,
  UnleveredFcf,
  DcfValuation,
  ProjectEngineResult,
  CapitalStructureConfig,
  BreakevenMetrics,
} from '@domain/types';
import {
  npv,
  irr,
  equityMultiple,
  paybackPeriod,
} from '@domain/financial';
import { calculateWACC } from '@engines/capital/capitalEngine';
import { generateDrawdownCurve } from './constructionEngine';
import { generateAllLandFlows, type MonthlyLandFlow } from './landEngine';

/**
 * Runs the project engine to calculate unlevered free cash flow, DCF valuation, and KPIs.
 *
 * @param consolidatedPnl - Consolidated annual P&L from scenario engine
 * @param config - Project configuration (discount rate, terminal growth, etc.)
 * @param capitalConfig - Optional capital structure configuration (for WACC calculation)
 * @returns Unlevered FCF, DCF valuation, and project KPIs
 */
export function runProjectEngine(
  consolidatedPnl: ConsolidatedAnnualPnl[],
  config: ProjectConfig,
  capitalConfig?: CapitalStructureConfig
): ProjectEngineResult {
  const N = consolidatedPnl.length;
  const r = config.discountRate;
  const g = config.terminalGrowthRate;

  // Working capital model
  const workingCapitalPercentage =
    config.workingCapitalPercentage ?? config.workingCapitalPercent ?? 0;

  // Calculate working capital for each year
  const workingCapital: number[] = [];
  for (let t = 0; t < N; t++) {
    const revenue_t = consolidatedPnl[t].revenueTotal;
    const wc_t = revenue_t * workingCapitalPercentage;
    workingCapital.push(wc_t);
  }

  // Calculate changes in working capital
  const changeInWorkingCapital: number[] = [];
  for (let t = 0; t < N; t++) {
    if (t === 0) {
      changeInWorkingCapital.push(workingCapital[0] - 0);
    } else {
      changeInWorkingCapital.push(workingCapital[t] - workingCapital[t - 1]);
    }
  }

  // v5.0: Calculate land flows (if applicable)
  const landFlows: MonthlyLandFlow[] = config.landConfigs && config.landConfigs.length > 0
    ? generateAllLandFlows(config.landConfigs, 0)
    : [];
  
  // Aggregate land flows to annual (negative months before Year 0, Year 0, etc.)
  const landOutflowByYear: number[] = new Array(N).fill(0);
  for (const landFlow of landFlows) {
    // Land flows can occur before Year 0 (negative monthIndex)
    // For Year 0, we include flows at monthIndex 0
    // For negative months, we aggregate into Year 0
    if (landFlow.monthIndex < 0) {
      // Negative months: aggregate into Year 0
      landOutflowByYear[0] += Math.abs(landFlow.cashFlow); // cashFlow is negative, so we take absolute value
    } else {
      // Non-negative months: map to year
      const yearIndex = Math.floor(landFlow.monthIndex / 12);
      if (yearIndex >= 0 && yearIndex < N) {
        landOutflowByYear[yearIndex] += Math.abs(landFlow.cashFlow);
      }
    }
  }

  // v5.1: Calculate construction outflows (if applicable)
  // Priority: constructionConfig > constructionDuration (legacy)
  let constructionOutflowByYear: number[] = new Array(N).fill(0);
  
  if (config.constructionConfig) {
    // v5.1: Use ConstructionConfig
    const constructionConfig = config.constructionConfig;
    const monthlyDrawdowns = generateDrawdownCurve(
      constructionConfig.totalBudget,
      constructionConfig.durationMonths,
      constructionConfig.curveType === 's-curve' ? 's-curve' : 'linear'
    );
    
    // Distribute monthly drawdowns to years
    for (let i = 0; i < monthlyDrawdowns.length; i++) {
      const monthIndex = constructionConfig.startMonth + i;
      const yearIndex = Math.floor(monthIndex / 12);
      if (yearIndex >= 0 && yearIndex < N) {
        constructionOutflowByYear[yearIndex] += monthlyDrawdowns[i];
      } else if (yearIndex < 0) {
        // Negative months: aggregate into Year 0
        constructionOutflowByYear[0] += monthlyDrawdowns[i];
      }
    }
  } else if (config.constructionDuration && config.constructionDuration > 0) {
    // v3.6: Legacy behavior - use constructionDuration
    const monthlyDrawdowns = generateDrawdownCurve(
      config.initialInvestment,
      config.constructionDuration,
      config.constructionCurve ?? 's-curve'
    );
    
    // Aggregate monthly to annual (assume all construction occurs before/in Year 0)
    const constructionOutflowYear0 = monthlyDrawdowns.reduce((sum, drawdown) => sum + drawdown, 0);
    constructionOutflowByYear[0] = constructionOutflowYear0;
    
    // Invariant: Sum should equal initialInvestment (within floating-point precision)
    if (Math.abs(constructionOutflowYear0 - config.initialInvestment) > 0.01) {
      console.warn(
        `[Project Engine] Construction outflow sum (${constructionOutflowYear0}) ` +
        `does not equal initialInvestment (${config.initialInvestment}). ` +
        `Difference: ${Math.abs(constructionOutflowYear0 - config.initialInvestment)}`
      );
    }
  }
  // Else: Legacy behavior - constructionDuration is 0 or undefined
  // Construction outflow stays at 0 (not subtracted from UFCF, only appears in DCF cash flow series)

  // Calculate unlevered free cash flow per year
  // Note: Uses USALI NOI (v0.9) = GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense
  // v5.0/v5.1: Land and construction outflows reduce UFCF
  const unleveredFcf: UnleveredFcf[] = [];
  for (let t = 0; t < N; t++) {
    // USALI NOI is already calculated in scenario engine according to USALI standards
    const noi_t = consolidatedPnl[t].noi; // USALI NOI
    const maintenanceCapex_t = consolidatedPnl[t].maintenanceCapex;
    const changeInWC_t = changeInWorkingCapital[t];
    
    // v5.0: Subtract land outflow
    const landOutflow_t = landOutflowByYear[t] ?? 0;
    
    // v5.1: Subtract construction outflow
    const constructionOutflow_t = constructionOutflowByYear[t] ?? 0;
    
    // v5.0/v5.1: UFCF = NOI - Maintenance Capex - Change in WC - Land Outflow - Construction Outflow
    const ufcf_t = noi_t - maintenanceCapex_t - changeInWC_t - landOutflow_t - constructionOutflow_t;

    // Invariant check: UFCF must be finite
    if (!Number.isFinite(ufcf_t)) {
      console.warn(
        `[Project Engine] Non-finite UFCF at yearIndex ${t}: ` +
          `NOI = ${noi_t}, ` +
          `maintenanceCapex = ${maintenanceCapex_t}, ` +
          `changeInWC = ${changeInWC_t}, ` +
          `UFCF = ${ufcf_t}`
      );
    }

    unleveredFcf.push({
      yearIndex: t,
      noi: noi_t,
      maintenanceCapex: maintenanceCapex_t,
      changeInWorkingCapital: changeInWC_t,
      unleveredFreeCashFlow: ufcf_t,
    });
  }

  // Build cash flow series for DCF
  const cashFlows: number[] = [];

  // v5.0/v5.1: If land or construction flows are configured, they're already in UFCF
  // Otherwise, use legacy initialInvestment
  const hasLandOrConstructionFlows = (config.landConfigs && config.landConfigs.length > 0) ||
                                      config.constructionConfig ||
                                      (config.constructionDuration && config.constructionDuration > 0);
  
  if (hasLandOrConstructionFlows) {
    // Land and construction outflows are already included in UFCF
    // Year 0: UFCF (includes land + construction outflows)
    cashFlows.push(unleveredFcf[0].unleveredFreeCashFlow);
    
    // Years 1 to N-1: UFCF from previous year (skip Year 0, start at Year 1)
    for (let t = 1; t < N; t++) {
      cashFlows.push(unleveredFcf[t].unleveredFreeCashFlow);
    }
  } else {
    // Legacy behavior: separate initial investment
    cashFlows.push(-config.initialInvestment);
    
    // Years 1 to N-1: UFCF from previous year
    for (let t = 1; t < N; t++) {
      cashFlows.push(unleveredFcf[t - 1].unleveredFreeCashFlow);
    }
  }

  // Year N: last UFCF + terminal value
  const lastUFCF = unleveredFcf[N - 1].unleveredFreeCashFlow;

  // Calculate terminal value
  let terminalValue = 0;
  if (r > g) {
    terminalValue = (lastUFCF * (1 + g)) / (r - g);
  }

  cashFlows.push(lastUFCF + terminalValue);

  // Calculate NPV (enterprise value)
  const enterpriseValue = npv(r, cashFlows);

  // For now, assume no debt, so equity value equals enterprise value
  const equityValue = enterpriseValue;

  // Calculate KPIs
  const unleveredIrr = irr(cashFlows);
  const multiple = equityMultiple(cashFlows);
  const payback = paybackPeriod(cashFlows);

  const dcfValuation: DcfValuation = {
    discountRate: r,
    terminalGrowthRate: g,
    cashFlows,
    npv: enterpriseValue,
    enterpriseValue,
    equityValue,
    terminalValue,
  };

  // Calculate WACC if capitalConfig is provided (v0.7)
  let wacc: number | null = null;
  if (capitalConfig) {
    const waccMetrics = calculateWACC(config, capitalConfig);
    wacc = waccMetrics.wacc;
  }

  const projectKpis: ProjectEngineResult['projectKpis'] = {
    npv: enterpriseValue,
    unleveredIrr,
    equityMultiple: multiple,
    paybackPeriod: payback,
    wacc,
  };

  return {
    unleveredFcf,
    dcfValuation,
    projectKpis,
  };
}

/**
 * Calculates breakeven occupancy using DSCR breakeven method (v0.7).
 * 
 * This is a simplified approximation: NOI Required for 1.0 DSCR = Total Debt Service.
 * 
 * The breakeven occupancy is calculated as:
 * Breakeven = (Fixed Opex + Debt Service) / (Total Revenue at 100% Occupancy - Variable Costs)
 * 
 * For a simpler implementation, we use the DSCR breakeven approach:
 * - NOI Required for 1.0 DSCR = Total Debt Service (from first year)
 * - This gives us the minimum NOI needed to cover debt service
 * 
 * @param consolidatedPnl - Consolidated annual P&L from scenario engine (Year 0 used as baseline)
 * @param totalDebtService - Total debt service from capital engine (typically Year 0)
 * @returns Breakeven metrics including required NOI and occupancy approximation
 */
export function calculateBreakevenOccupancy(
  consolidatedPnl: ConsolidatedAnnualPnl[],
  totalDebtService: number
): BreakevenMetrics {
  if (consolidatedPnl.length === 0) {
    return {
      breakevenOccupancy: null,
      noiRequiredForBreakeven: null,
      method: 'dscr_breakeven',
    };
  }

  // Use Year 0 as baseline
  const baselinePnl = consolidatedPnl[0];
  const baselineRevenue = baselinePnl.revenueTotal;
  const baselineNOI = baselinePnl.noi;

  // NOI required for DSCR = 1.0 is simply the debt service
  const noiRequiredForBreakeven = totalDebtService;

  // If debt service is 0, breakeven is at 0% occupancy (or undefined)
  if (totalDebtService <= 0) {
    return {
      breakevenOccupancy: 0,
      noiRequiredForBreakeven: 0,
      method: 'dscr_breakeven',
    };
  }

  // If baseline NOI is 0 or negative, we can't calculate a meaningful breakeven
  if (baselineNOI <= 0 || baselineRevenue <= 0) {
    return {
      breakevenOccupancy: null,
      noiRequiredForBreakeven: noiRequiredForBreakeven,
      method: 'dscr_breakeven',
    };
  }

  // Approximation: Breakeven occupancy = (NOI Required / Baseline NOI) * Baseline Occupancy
  // Since we don't have baseline occupancy, we assume 100% occupancy in baseline
  // This is a simplification: breakevenOccupancy = NOI Required / Baseline NOI
  // If this exceeds 1.0, breakeven is not achievable at 100% occupancy
  const breakevenOccupancy = Math.min(1.0, noiRequiredForBreakeven / baselineNOI);

  // If breakeven occupancy > 1.0, it's not achievable
  if (noiRequiredForBreakeven > baselineNOI) {
    return {
      breakevenOccupancy: null,
      noiRequiredForBreakeven: noiRequiredForBreakeven,
      method: 'dscr_breakeven',
    };
  }

  return {
    breakevenOccupancy,
    noiRequiredForBreakeven,
    method: 'dscr_breakeven',
  };
}
