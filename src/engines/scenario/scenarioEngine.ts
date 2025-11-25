/**
 * Scenario engine.
 * This will orchestrate multiple operations and generate consolidated results.
 */

import type {
  ProjectScenario,
  ConsolidatedAnnualPnl,
  ConsolidatedMonthlyPnl,
  FullModelOutput,
  ScenarioSummary,
  MonthlyPnl,
  OperationConfig,
  OwnershipModel,
} from '@domain/types';
import type { DetailedAuditTrace } from '@domain/audit';
import { projectScenarioSchema } from '@domain/schemas';
import { runOperation, type OperationEngineResult } from '@engines/operations';
import { calculateSponsorCashFlow } from '@engines/operations/sponsorLogic';
import {
  engineFailure,
  engineSuccess,
  mapZodIssues,
  type EngineResult,
} from '@engines/result';

/**
 * Calculates Sponsor Monthly P&L from Asset Monthly P&L based on ownership model.
 * Similar to calculateSponsorCashFlow but for monthly granularity.
 * 
 * v2.2: Monthly Engines & Covenants
 */
function calculateSponsorMonthlyCashFlow(
  assetMonthlyPnl: MonthlyPnl,
  config: OperationConfig
): MonthlyPnl {
  const ownershipModel: OwnershipModel = config.ownershipModel ?? 'BUILD_AND_OPERATE';
  const ownershipPct: number = config.ownershipPct ?? 1.0;
  const isActive: boolean = config.isActive ?? true;

  // If inactive, return zero P&L
  if (!isActive) {
    return {
      ...assetMonthlyPnl,
      roomRevenue: 0,
      foodRevenue: 0,
      beverageRevenue: 0,
      otherRevenue: 0,
      foodCogs: 0,
      beverageCogs: 0,
      payroll: 0,
      utilities: 0,
      marketing: 0,
      maintenanceOpex: 0,
      otherOpex: 0,
      grossOperatingProfit: 0,
      ebitda: 0,
      noi: 0,
      maintenanceCapex: 0,
      cashFlow: 0,
    };
  }

  switch (ownershipModel) {
    case 'BUILD_AND_OPERATE':
    case 'CO_INVEST_OPCO': {
      // Sponsor receives proportional share of asset P&L
      return {
        ...assetMonthlyPnl,
        roomRevenue: assetMonthlyPnl.roomRevenue * ownershipPct,
        foodRevenue: assetMonthlyPnl.foodRevenue * ownershipPct,
        beverageRevenue: assetMonthlyPnl.beverageRevenue * ownershipPct,
        otherRevenue: assetMonthlyPnl.otherRevenue * ownershipPct,
        foodCogs: assetMonthlyPnl.foodCogs * ownershipPct,
        beverageCogs: assetMonthlyPnl.beverageCogs * ownershipPct,
        payroll: assetMonthlyPnl.payroll * ownershipPct,
        utilities: assetMonthlyPnl.utilities * ownershipPct,
        marketing: assetMonthlyPnl.marketing * ownershipPct,
        maintenanceOpex: assetMonthlyPnl.maintenanceOpex * ownershipPct,
        otherOpex: assetMonthlyPnl.otherOpex * ownershipPct,
        grossOperatingProfit: assetMonthlyPnl.grossOperatingProfit * ownershipPct,
        ebitda: assetMonthlyPnl.ebitda * ownershipPct,
        noi: assetMonthlyPnl.noi * ownershipPct,
        maintenanceCapex: assetMonthlyPnl.maintenanceCapex * ownershipPct,
        cashFlow: assetMonthlyPnl.cashFlow * ownershipPct,
      };
    }

    case 'BUILD_AND_LEASE_FIXED': {
      // Sponsor receives fixed rent (monthly = annual / 12)
      const baseRent = (config.leaseTerms?.baseRent ?? 0) / 12;
      const ownerCosts = 0;
      const sponsorRevenue = baseRent;
      const sponsorNoi = sponsorRevenue - ownerCosts;
      
      return {
        ...assetMonthlyPnl,
        roomRevenue: sponsorRevenue,
        foodRevenue: 0,
        beverageRevenue: 0,
        otherRevenue: 0,
        foodCogs: 0,
        beverageCogs: 0,
        payroll: 0,
        utilities: 0,
        marketing: 0,
        maintenanceOpex: 0,
        otherOpex: ownerCosts,
        grossOperatingProfit: sponsorRevenue,
        ebitda: sponsorNoi,
        noi: sponsorNoi,
        maintenanceCapex: 0,
        cashFlow: sponsorNoi,
      };
    }

    case 'BUILD_AND_LEASE_VARIABLE': {
      // Sponsor receives base rent + variable rent based on asset performance
      const baseRent = (config.leaseTerms?.baseRent ?? 0) / 12;
      const variableRentPct = config.leaseTerms?.variableRentPct ?? 0;
      const variableRentBasis = config.leaseTerms?.variableRentBasis ?? 'revenue';
      
      // Calculate total revenue for this month
      const monthlyRevenue = assetMonthlyPnl.roomRevenue + assetMonthlyPnl.foodRevenue + 
                            assetMonthlyPnl.beverageRevenue + assetMonthlyPnl.otherRevenue;
      
      // Determine basis for variable rent calculation
      const basis = variableRentBasis === 'revenue' 
        ? monthlyRevenue 
        : assetMonthlyPnl.noi;
      
      const variableRent = basis * variableRentPct;
      const totalRent = baseRent + variableRent;
      const ownerCosts = 0;
      const sponsorRevenue = totalRent;
      const sponsorNoi = sponsorRevenue - ownerCosts;
      
      return {
        ...assetMonthlyPnl,
        roomRevenue: sponsorRevenue,
        foodRevenue: 0,
        beverageRevenue: 0,
        otherRevenue: 0,
        foodCogs: 0,
        beverageCogs: 0,
        payroll: 0,
        utilities: 0,
        marketing: 0,
        maintenanceOpex: 0,
        otherOpex: ownerCosts,
        grossOperatingProfit: sponsorRevenue,
        ebitda: sponsorNoi,
        noi: sponsorNoi,
        maintenanceCapex: 0,
        cashFlow: sponsorNoi,
      };
    }

    default: {
      // Fallback: treat as BUILD_AND_OPERATE
      return {
        ...assetMonthlyPnl,
        roomRevenue: assetMonthlyPnl.roomRevenue * ownershipPct,
        foodRevenue: assetMonthlyPnl.foodRevenue * ownershipPct,
        beverageRevenue: assetMonthlyPnl.beverageRevenue * ownershipPct,
        otherRevenue: assetMonthlyPnl.otherRevenue * ownershipPct,
        foodCogs: assetMonthlyPnl.foodCogs * ownershipPct,
        beverageCogs: assetMonthlyPnl.beverageCogs * ownershipPct,
        payroll: assetMonthlyPnl.payroll * ownershipPct,
        utilities: assetMonthlyPnl.utilities * ownershipPct,
        marketing: assetMonthlyPnl.marketing * ownershipPct,
        maintenanceOpex: assetMonthlyPnl.maintenanceOpex * ownershipPct,
        otherOpex: assetMonthlyPnl.otherOpex * ownershipPct,
        grossOperatingProfit: assetMonthlyPnl.grossOperatingProfit * ownershipPct,
        ebitda: assetMonthlyPnl.ebitda * ownershipPct,
        noi: assetMonthlyPnl.noi * ownershipPct,
        maintenanceCapex: assetMonthlyPnl.maintenanceCapex * ownershipPct,
        cashFlow: assetMonthlyPnl.cashFlow * ownershipPct,
      };
    }
  }
}

export interface ScenarioEngineResult {
  operations: OperationEngineResult[];
  consolidatedAnnualPnl: ConsolidatedAnnualPnl[];
  consolidatedMonthlyPnl: ConsolidatedMonthlyPnl[];  // v2.2: Monthly granularity
}

function buildScenarioAuditTrace(
  field: string,
  scenarioId: string,
  values: Record<string, number | string | undefined>
): DetailedAuditTrace {
  return {
    field,
    formula: 'Scenario engine aggregation and validation',
    values,
    result: 1,
    source: 'scenarioEngine',
    calculationStep: field,
  };
}

/**
 * Runs the scenario engine to consolidate multiple operations.
 *
 * @param scenario - Project scenario with multiple operations
 * @returns Individual operation results and consolidated annual P&L
 */
export function runScenarioEngine(
  scenario: ProjectScenario
): EngineResult<ScenarioEngineResult> {
  const parsedScenario = projectScenarioSchema.safeParse(scenario);
  if (!parsedScenario.success) {
    return engineFailure(
      'SCENARIO_INVALID_CONFIG',
      'Scenario configuration failed validation',
      {
        issues: mapZodIssues(parsedScenario.error.issues),
        auditTrace: [
          {
            field: 'scenario_validation',
            formula: 'Zod schema validation',
            values: { scenarioId: scenario.id },
            result: 0,
            source: 'scenarioEngine',
          },
        ],
      }
    );
  }

  const safeScenario = parsedScenario.data;

  const operations: OperationEngineResult[] = [];
  const auditTrace: DetailedAuditTrace[] = [];
  for (const config of safeScenario.operations) {
    const result = runOperation(config);
    if (!result.ok) {
      return engineFailure(
        'SCENARIO_OPERATION_FAILURE',
        `Operation ${config.name} failed to execute`,
        {
          issues: result.error.issues,
          details: {
            failingOperationId: config.id,
          },
          auditTrace: [
            ...(result.auditTrace ?? []),
            {
              field: 'scenario_operation_failure',
              formula: 'Scenario engine stopped on failed operation',
              values: { scenarioId: safeScenario.id, operationId: config.id },
              result: 0,
              source: 'scenarioEngine',
            },
          ],
        }
      );
    }
    auditTrace.push(...result.auditTrace);
    operations.push(result.data);
  }

  // Build consolidated annual P&L
  const consolidatedAnnualPnl: ConsolidatedAnnualPnl[] = [];
  const horizonYears = safeScenario.horizonYears;

  for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
    // Sum across all operations' Sponsor P&L for this yearIndex (v1.2: Advanced Asset Dynamics)
    // Note: We calculate both Asset P&L (from operation engines) and Sponsor P&L (what AG7 receives)
    // The consolidated P&L uses Sponsor P&L, which is what feeds into Project Metrics (NPV/IRR)
    let revenueTotal = 0;
    let cogsTotal = 0;
    let opexTotal = 0;
    let ebitda = 0;
    let noi = 0;
    let maintenanceCapex = 0;
    let cashFlow = 0;

    // v5.8: Granular Financials - Breakdown aggregation from MonthlyPnl
    let roomRevenue = 0;
    let foodRevenue = 0;
    let beverageRevenue = 0;
    let otherRevenue = 0;
    let foodCogs = 0;
    let beverageCogs = 0;
    let payroll = 0;
    let utilities = 0;
    let marketing = 0;
    let maintenanceOpex = 0;
    let otherOpex = 0;

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const config = safeScenario.operations[i];
      
      // Find the Asset P&L for this yearIndex
      const assetPnl = operation.annualPnl.find((a) => a.yearIndex === yearIndex);
      if (assetPnl) {
        // Calculate Sponsor P&L from Asset P&L based on ownership model
        const sponsorPnl = calculateSponsorCashFlow(assetPnl, config);
        
        // Aggregate Sponsor P&L (not Asset P&L) for consolidation
        revenueTotal += sponsorPnl.revenueTotal;
        cogsTotal += sponsorPnl.cogsTotal;
        opexTotal += sponsorPnl.opexTotal;
        ebitda += sponsorPnl.ebitda;
        noi += sponsorPnl.noi;
        maintenanceCapex += sponsorPnl.maintenanceCapex;
        cashFlow += sponsorPnl.cashFlow;
      }

      // v5.8: Aggregate breakdown from MonthlyPnl for this year
      // Use sponsor monthly P&L (already adjusted for ownership model)
      const monthlyPnlForYear = operation.monthlyPnl.filter(m => m.yearIndex === yearIndex);
      for (const assetMonthly of monthlyPnlForYear) {
        // Calculate Sponsor Monthly P&L from Asset Monthly P&L
        const sponsorMonthly = calculateSponsorMonthlyCashFlow(assetMonthly, config);
        
        // Aggregate granular line items
        roomRevenue += sponsorMonthly.roomRevenue;
        foodRevenue += sponsorMonthly.foodRevenue;
        beverageRevenue += sponsorMonthly.beverageRevenue;
        otherRevenue += sponsorMonthly.otherRevenue;
        foodCogs += sponsorMonthly.foodCogs;
        beverageCogs += sponsorMonthly.beverageCogs;
        payroll += sponsorMonthly.payroll;
        utilities += sponsorMonthly.utilities;
        marketing += sponsorMonthly.marketing;
        maintenanceOpex += sponsorMonthly.maintenanceOpex;
        otherOpex += sponsorMonthly.otherOpex;
      }
    }

    // v5.8: Validation - Ensure Sum(Breakdown) === Total
    const revenueBreakdownSum = roomRevenue + foodRevenue + beverageRevenue + otherRevenue;
    const cogsBreakdownSum = foodCogs + beverageCogs;
    const opexBreakdownSum = payroll + utilities + marketing + maintenanceOpex + otherOpex;
    
    // Use breakdown sums if they match totals (within rounding tolerance), otherwise use totals
    // This ensures consistency while handling potential floating-point precision issues
    const tolerance = 0.01; // 1 cent tolerance
    const finalRevenueTotal = Math.abs(revenueBreakdownSum - revenueTotal) < tolerance ? revenueBreakdownSum : revenueTotal;
    const finalCogsTotal = Math.abs(cogsBreakdownSum - cogsTotal) < tolerance ? cogsBreakdownSum : cogsTotal;
    const finalOpexTotal = Math.abs(opexBreakdownSum - opexTotal) < tolerance ? opexBreakdownSum : opexTotal;

    // USALI Calculations (v0.9)
    // Ensure all values default to 0 to prevent NaN
    const revenue = finalRevenueTotal ?? 0;
    const cogs = finalCogsTotal ?? 0;
    const opex = finalOpexTotal ?? 0;
    const maintenanceCapexValue = maintenanceCapex ?? 0;
    
    // Departmental Expenses = COGS + direct departmental labor (for now, we map COGS to departmental expenses)
    const departmentalExpenses = cogs;
    
    // GOP (Gross Operating Profit) = Revenue - Departmental Expenses
    const gop = revenue - departmentalExpenses;
    
    // Undistributed Expenses = OPEX (expenses not directly attributable to departments)
    const undistributedExpenses = opex;
    
    // Management Fees (optional, default to 0)
    const managementFees = 0;
    
    // Non-Operating Income/Expense (optional, default to 0)
    const nonOperatingIncomeExpense = 0;
    
    // NOI (USALI) = GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense
    // Note: To match operation-level NOI calculation (ebitda - maintenanceCapex), we also subtract maintenanceCapex
    // This ensures consolidated NOI equals the sum of operation NOIs for backward compatibility
    // Operation-level: noi = ebitda - maintenanceCapex = (revenue - cogs - opex) - maintenanceCapex
    // USALI equivalent: noi = gop - undistributedExpenses - maintenanceCapex = (revenue - cogs) - opex - maintenanceCapex
    const noiUsali = gop - undistributedExpenses - managementFees - nonOperatingIncomeExpense - maintenanceCapexValue;

    const consolidated: ConsolidatedAnnualPnl = {
      yearIndex,
      revenueTotal: finalRevenueTotal,
      // USALI fields
      departmentalExpenses,
      gop,
      undistributedExpenses,
      managementFees,
      nonOperatingIncomeExpense,
      noi: noiUsali,
      // Legacy fields (deprecated, maintained for backward compatibility)
      cogsTotal: finalCogsTotal,
      opexTotal: finalOpexTotal,
      ebitda: gop - undistributedExpenses,
      // Other fields
      maintenanceCapex,
      cashFlow,
      // v5.8: Granular Financials - Revenue Breakdown
      roomRevenue,
      foodRevenue,
      beverageRevenue,
      otherRevenue,
      // v5.8: Granular Financials - Expense Breakdown
      foodCogs,
      beverageCogs,
      payroll,
      utilities,
      marketing,
      maintenanceOpex,
      otherOpex,
    };

    consolidatedAnnualPnl.push(consolidated);
  }

  // Build consolidated monthly P&L (v2.2: Monthly Engines & Covenants)
  const consolidatedMonthlyPnl: ConsolidatedMonthlyPnl[] = [];
  const monthlyPnlMap = new Map<string, MonthlyPnl[]>();

  // Collect all monthly P&L entries from all operations
  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    const config = safeScenario.operations[i];
    
    for (const assetMonthlyPnl of operation.monthlyPnl) {
      // Calculate Sponsor Monthly P&L from Asset Monthly P&L
      const sponsorMonthlyPnl = calculateSponsorMonthlyCashFlow(assetMonthlyPnl, config);
      
      // Group by month (yearIndex, monthIndex)
      const monthKey = `${sponsorMonthlyPnl.yearIndex}-${sponsorMonthlyPnl.monthIndex}`;
      if (!monthlyPnlMap.has(monthKey)) {
        monthlyPnlMap.set(monthKey, []);
      }
      monthlyPnlMap.get(monthKey)!.push(sponsorMonthlyPnl);
    }
  }

  // Aggregate by month
  for (const [monthKey, monthlyPnls] of monthlyPnlMap.entries()) {
    const [yearIndexStr, monthIndexStr] = monthKey.split('-');
    const yearIndex = parseInt(yearIndexStr, 10);
    const monthIndex = parseInt(monthIndexStr, 10);
    const monthNumber = yearIndex * 12 + monthIndex;

    // Sum across all operations for this month
    let revenueTotal = 0;
    let cogsTotal = 0;
    let opexTotal = 0;
    let maintenanceCapex = 0;

    for (const monthlyPnl of monthlyPnls) {
      // Calculate total revenue
      const monthlyRevenue = monthlyPnl.roomRevenue + monthlyPnl.foodRevenue + 
                            monthlyPnl.beverageRevenue + monthlyPnl.otherRevenue;
      revenueTotal += monthlyRevenue;
      
      // Calculate total COGS
      cogsTotal += monthlyPnl.foodCogs + monthlyPnl.beverageCogs;
      
      // Calculate total OPEX
      opexTotal += monthlyPnl.payroll + monthlyPnl.utilities + monthlyPnl.marketing + 
                   monthlyPnl.maintenanceOpex + monthlyPnl.otherOpex;
      
      maintenanceCapex += monthlyPnl.maintenanceCapex;
    }

    // USALI Calculations (consistent with annual)
    const revenue = revenueTotal ?? 0;
    const cogs = cogsTotal ?? 0;
    const opex = opexTotal ?? 0;
    const maintenanceCapexValue = maintenanceCapex ?? 0;
    
    // Departmental Expenses = COGS + direct departmental labor (for now, we map COGS to departmental expenses)
    const departmentalExpenses = cogs;
    
    // GOP (Gross Operating Profit) = Revenue - Departmental Expenses
    const gop = revenue - departmentalExpenses;
    
    // Undistributed Expenses = OPEX (expenses not directly attributable to departments)
    const undistributedExpenses = opex;
    
    // Management Fees (optional, default to 0)
    const managementFees = 0;
    
    // Non-Operating Income/Expense (optional, default to 0)
    const nonOperatingIncomeExpense = 0;
    
    // NOI (USALI) = GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense - maintenanceCapex
    const noiUsali = gop - undistributedExpenses - managementFees - nonOperatingIncomeExpense - maintenanceCapexValue;
    
    // Monthly cash flow = NOI (maintenanceCapex already subtracted in NOI calculation)
    const cashFlow = noiUsali;

    consolidatedMonthlyPnl.push({
      yearIndex,
      monthIndex,
      monthNumber,
      revenueTotal: revenue,
      departmentalExpenses,
      gop,
      undistributedExpenses,
      managementFees,
      nonOperatingIncomeExpense,
      noi: noiUsali,
      maintenanceCapex: maintenanceCapexValue,
      cashFlow,
    });
  }

  // Sort by monthNumber
  consolidatedMonthlyPnl.sort((a, b) => a.monthNumber - b.monthNumber);

  auditTrace.push(
    buildScenarioAuditTrace('scenario_consolidation', safeScenario.id, {
      horizonYears: safeScenario.horizonYears,
      operationCount: safeScenario.operations.length,
    })
  );

  return engineSuccess(
    {
      operations,
      consolidatedAnnualPnl,
      consolidatedMonthlyPnl,
    },
    auditTrace
  );
}

/**
 * Builds a scenario summary from full model output (Scenario Builder v1).
 * 
 * Extracts key KPIs from project, capital, and waterfall results for side-by-side comparison.
 * This is a pure, deterministic helper function with no side effects.
 * 
 * @param output - Full model output from runFullModel
 * @returns Scenario summary with key KPIs ready for UI comparison
 */
export function buildScenarioSummary(output: FullModelOutput): ScenarioSummary {
  const { scenario, project, capital, waterfall } = output;

  // Extract project KPIs
  const projectKpis = project.projectKpis;

  // Calculate aggregated capital KPIs
  const debtKpis = capital.debtKpis;
  const debtSchedule = capital.debtSchedule;

  // Average DSCR (exclude nulls)
  const dscrValues = debtKpis.map((kpi) => kpi.dscr).filter((d): d is number => d !== null);
  const avgDscr = dscrValues.length > 0
    ? dscrValues.reduce((sum, d) => sum + d, 0) / dscrValues.length
    : null;

  // Final LTV (last year's LTV)
  const finalLtv = debtKpis.length > 0 ? debtKpis[debtKpis.length - 1].ltv : null;

  // Total debt service and principal
  let totalDebtService = 0;
  let totalDebtPrincipal = 0;
  for (const entry of debtSchedule.entries) {
    totalDebtService += entry.interest + entry.principal;
    totalDebtPrincipal += entry.principal;
  }

  // Extract waterfall KPIs per partner
  const waterfallKpis = waterfall.partners.map((partner) => {
    // Find partner name from waterfall config (if available) or use partnerId
    // Note: waterfall result doesn't include partner names, so we use partnerId
    // The UI can map partnerId to names from the waterfall config if needed
    const partnerName = partner.partnerId; // Fallback to partnerId if name not available

    return {
      partnerId: partner.partnerId,
      partnerName,
      irr: partner.irr,
      moic: partner.moic,
    };
  });

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    projectKpis,
    capitalKpis: {
      avgDscr,
      finalLtv,
      totalDebtService,
      totalDebtPrincipal,
    },
    waterfallKpis,
  };
}
