/**
 * Statement generator engine (v5.7: Statement Logic).
 * 
 * Provides filtered P&L and Cash Flow statements based on selected operations.
 * This engine performs on-the-fly aggregation from FullModelOutput.
 */

import type {
  FullModelOutput,
  ConsolidatedAnnualPnl,
  CapitalEngineResult,
  ProjectConfig,
  CapitalStructureConfig,
} from '@domain/types';
import type { StatementRow } from '../../components/financials/StatementTable';
import { runScenarioEngine } from '@engines/scenario/scenarioEngine';
import { calculateSponsorCashFlow } from '@engines/operations/sponsorLogic';
import { generateAllLandFlows } from '@engines/project/landEngine';
import { generateDrawdownCurve } from '@engines/project/constructionEngine';

/**
 * Filters and aggregates P&L for selected operations.
 * 
 * Re-runs the scenario engine to get individual operation results,
 * filters by selected operation IDs, then aggregates into ConsolidatedAnnualPnl.
 * 
 * Undistributed Expenses: Each operation has its own `opexTotal` which represents
 * undistributed expenses for that operation. When filtering, we sum up the selected
 * operations' `opexTotal`.
 * 
 * @param output - Full model output from runFullModel
 * @param selectedOperationIds - Array of operation IDs to include in the aggregation
 * @returns Filtered consolidated annual P&L array
 * 
 * @example
 * // Select only Hotel operations
 * const hotelPnl = filterAndAggregatePnl(output, ['hotel-1', 'hotel-2']);
 */
export function filterAndAggregatePnl(
  output: FullModelOutput,
  selectedOperationIds: string[]
): ConsolidatedAnnualPnl[] {
  // Re-run scenario engine to get individual operation results
  const scenarioResult = runScenarioEngine(output.scenario);
  if (!scenarioResult.ok) return [];

  const { operations } = scenarioResult.data;
  
  const horizonYears = output.scenario.horizonYears;
  
  // Build consolidated annual P&L for filtered operations
  const consolidatedAnnualPnl: ConsolidatedAnnualPnl[] = [];
  
  // Create a Set for O(1) lookup performance
  const selectedIdsSet = new Set(selectedOperationIds);
  
  for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
    // Sum across selected operations' Sponsor P&L for this yearIndex
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
      const config = output.scenario.operations[i];
      
      // Filter: Only include if operation ID is in selectedOperationIds
      if (!selectedIdsSet.has(operation.operationId)) {
        continue;
      }
      
      // Find the Asset P&L for this yearIndex
      const assetPnl = operation.annualPnl.find((a) => a.yearIndex === yearIndex);
      if (assetPnl) {
        // Calculate Sponsor P&L from Asset P&L based on ownership model
        const sponsorPnl = calculateSponsorCashFlow(assetPnl, config);
        
        // Aggregate Sponsor P&L (not Asset P&L) for consolidation
        revenueTotal += sponsorPnl.revenueTotal;
        cogsTotal += sponsorPnl.cogsTotal;
        opexTotal += sponsorPnl.opexTotal; // Undistributed expenses per operation
        ebitda += sponsorPnl.ebitda;
        noi += sponsorPnl.noi;
        maintenanceCapex += sponsorPnl.maintenanceCapex;
        cashFlow += sponsorPnl.cashFlow;
      }
      
      // v5.8: Aggregate breakdown from MonthlyPnl for this year
      const monthlyPnlForYear = operation.monthlyPnl.filter(m => m.yearIndex === yearIndex);
      for (const monthly of monthlyPnlForYear) {
        // Apply ownership model to monthly breakdown (same logic as annual)
        const ownershipPct = config.ownershipPct ?? 1.0;
        const ownershipModel = config.ownershipModel ?? 'BUILD_AND_OPERATE';
        
        // For BUILD_AND_OPERATE, use full amounts; for lease models, adjust accordingly
        let revenueMultiplier = ownershipPct;
        if (ownershipModel === 'BUILD_AND_LEASE_FIXED' || ownershipModel === 'BUILD_AND_LEASE_VARIABLE') {
          // For lease models, revenue breakdown is not applicable (revenue is rent)
          revenueMultiplier = 0;
        }
        
        roomRevenue += monthly.roomRevenue * revenueMultiplier;
        foodRevenue += monthly.foodRevenue * revenueMultiplier;
        beverageRevenue += monthly.beverageRevenue * revenueMultiplier;
        otherRevenue += monthly.otherRevenue * revenueMultiplier;
        foodCogs += monthly.foodCogs * revenueMultiplier;
        beverageCogs += monthly.beverageCogs * revenueMultiplier;
        payroll += monthly.payroll * revenueMultiplier;
        utilities += monthly.utilities * revenueMultiplier;
        marketing += monthly.marketing * revenueMultiplier;
        maintenanceOpex += monthly.maintenanceOpex * revenueMultiplier;
        otherOpex += monthly.otherOpex * revenueMultiplier;
      }
    }
    
    // USALI Calculations (consistent with scenario engine)
    // Ensure all values default to 0 to prevent NaN
    const revenue = revenueTotal ?? 0;
    const cogs = cogsTotal ?? 0;
    const opex = opexTotal ?? 0;
    const maintenanceCapexValue = maintenanceCapex ?? 0;
    
    // Departmental Expenses = COGS + direct departmental labor (for now, we map COGS to departmental expenses)
    const departmentalExpenses = cogs;
    
    // GOP (Gross Operating Profit) = Revenue - Departmental Expenses
    const gop = revenue - departmentalExpenses;
    
    // Undistributed Expenses = OPEX (expenses not directly attributable to departments)
    // Sum of selected operations' opexTotal (each operation's undistributed expenses)
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
      revenueTotal: revenue,
      departmentalExpenses,
      gop,
      undistributedExpenses,
      managementFees,
      nonOperatingIncomeExpense,
      noi: noiUsali,
      // Legacy fields (for backward compatibility)
      cogsTotal: cogs,
      opexTotal: opex,
      ebitda,
      maintenanceCapex: maintenanceCapexValue,
      cashFlow,
      // v5.8: Granular Financials - Breakdown fields
      roomRevenue: roomRevenue > 0 ? roomRevenue : undefined,
      foodRevenue: foodRevenue > 0 ? foodRevenue : undefined,
      beverageRevenue: beverageRevenue > 0 ? beverageRevenue : undefined,
      otherRevenue: otherRevenue > 0 ? otherRevenue : undefined,
      foodCogs: foodCogs > 0 ? foodCogs : undefined,
      beverageCogs: beverageCogs > 0 ? beverageCogs : undefined,
      payroll: payroll > 0 ? payroll : undefined,
      utilities: utilities > 0 ? utilities : undefined,
      marketing: marketing > 0 ? marketing : undefined,
      maintenanceOpex: maintenanceOpex > 0 ? maintenanceOpex : undefined,
      otherOpex: otherOpex > 0 ? otherOpex : undefined,
    };
    
    consolidatedAnnualPnl.push(consolidated);
  }
  
  return consolidatedAnnualPnl;
}

/**
 * Generates a Cash Flow statement from filtered P&L and capital structure.
 * 
 * Transforms the P&L into a Cash Flow view starting from NOI.
 * Debt Service is project-level (not operation-specific), so we apply the full
 * project debt service to the filtered operations' NOI.
 * 
 * @param pnl - Filtered consolidated annual P&L array
 * @param capital - Capital engine result containing debt schedule
 * @returns Cash flow statement data with NOI, capex, debt service, and net cash flow
 * 
 * @example
 * const filteredPnl = filterAndAggregatePnl(output, ['hotel-1']);
 * const cashFlow = generateCashFlowStatement(filteredPnl, output.capital);
 */
export function generateCashFlowStatement(
  pnl: ConsolidatedAnnualPnl[],
  capital: CapitalEngineResult
): Array<{
  yearIndex: number;
  noi: number;
  maintenanceCapex: number;
  debtService: number;
  interest: number;
  principal: number;
  netCashFlow: number;
}> {
  const cashFlowStatement: Array<{
    yearIndex: number;
    noi: number;
    maintenanceCapex: number;
    debtService: number;
    interest: number;
    principal: number;
    netCashFlow: number;
  }> = [];
  
  for (const pnlEntry of pnl) {
    const yearIndex = pnlEntry.yearIndex;
    
    // Get debt service for this year from capital engine result
    const debtScheduleEntry = capital.debtSchedule.entries.find(
      (entry) => entry.yearIndex === yearIndex
    );
    
    const interest = debtScheduleEntry?.interest ?? 0;
    const principal = debtScheduleEntry?.principal ?? 0;
    // v5.8: Include exit fees in debt service to match leveredFcf calculation
    const leveredFcfEntry = capital.leveredFcfByYear.find(l => l.yearIndex === yearIndex);
    const exitFees = leveredFcfEntry?.transactionCosts ?? 0;
    const debtService = interest + principal + exitFees;
    
    // NOI from filtered P&L
    const noi = pnlEntry.noi;
    
    // Maintenance Capex from filtered P&L
    const maintenanceCapex = pnlEntry.maintenanceCapex;
    
    // Net Cash Flow = NOI - Maintenance Capex - Debt Service
    const netCashFlow = noi - maintenanceCapex - debtService;
    
    cashFlowStatement.push({
      yearIndex,
      noi,
      maintenanceCapex,
      debtService,
      interest,
      principal,
      netCashFlow,
    });
  }
  
  return cashFlowStatement;
}

/**
 * Helper function to calculate annual land outflow by year from ProjectConfig.
 * 
 * @param projectConfig - Project configuration (must contain landConfigs)
 * @param horizonYears - Number of years in the projection horizon
 * @returns Array of land outflow amounts by year index
 */
function calculateLandOutflowByYear(
  projectConfig: ProjectConfig | undefined,
  horizonYears: number
): number[] {
  const landOutflowByYear = new Array(horizonYears).fill(0);
  
  if (!projectConfig?.landConfigs || projectConfig.landConfigs.length === 0) {
    return landOutflowByYear;
  }
  
  // Generate land flows using the same logic as projectEngine
  const landFlows = generateAllLandFlows(projectConfig.landConfigs, 0);
  
  // Aggregate to annual (matching projectEngine logic)
  for (const landFlow of landFlows) {
    if (landFlow.monthIndex < 0) {
      // Negative months: aggregate into Year 0
      landOutflowByYear[0] += Math.abs(landFlow.cashFlow);
    } else {
      const yearIndex = Math.floor(landFlow.monthIndex / 12);
      if (yearIndex >= 0 && yearIndex < horizonYears) {
        landOutflowByYear[yearIndex] += Math.abs(landFlow.cashFlow);
      }
    }
  }
  
  return landOutflowByYear;
}

/**
 * Helper function to calculate annual construction outflow by year from ProjectConfig.
 * 
 * @param projectConfig - Project configuration (must contain constructionConfig or constructionDuration)
 * @param horizonYears - Number of years in the projection horizon
 * @returns Array of construction outflow amounts by year index
 */
function calculateConstructionOutflowByYear(
  projectConfig: ProjectConfig | undefined,
  horizonYears: number
): number[] {
  const constructionOutflowByYear = new Array(horizonYears).fill(0);
  
  if (!projectConfig) {
    return constructionOutflowByYear;
  }
  
  // Priority: constructionConfig > constructionDuration (legacy)
  if (projectConfig.constructionConfig) {
    const constructionConfig = projectConfig.constructionConfig;
    const drawdownResult = generateDrawdownCurve(
      constructionConfig.totalBudget,
      constructionConfig.durationMonths,
      constructionConfig.curveType === 's-curve' ? 's-curve' : 'linear'
    );
    if (!drawdownResult.ok) {
      return constructionOutflowByYear;
    }
    
    // Distribute monthly drawdowns to years (matching projectEngine logic)
    for (let i = 0; i < drawdownResult.data.length; i++) {
      const monthIndex = constructionConfig.startMonth + i;
      const yearIndex = Math.floor(monthIndex / 12);
      if (yearIndex >= 0 && yearIndex < horizonYears) {
        constructionOutflowByYear[yearIndex] += drawdownResult.data[i];
      } else if (yearIndex < 0) {
        // Negative months: aggregate into Year 0
        constructionOutflowByYear[0] += drawdownResult.data[i];
      }
    }
  } else if (projectConfig.constructionDuration && projectConfig.constructionDuration > 0) {
    // Legacy behavior - use constructionDuration
    const drawdownResult = generateDrawdownCurve(
      projectConfig.initialInvestment,
      projectConfig.constructionDuration,
      projectConfig.constructionCurve ?? 's-curve'
    );
    if (!drawdownResult.ok) {
      return constructionOutflowByYear;
    }
    
    // Aggregate monthly to annual (assume all construction occurs before/in Year 0)
    const constructionOutflowYear0 = drawdownResult.data.reduce((sum, drawdown) => sum + drawdown, 0);
    constructionOutflowByYear[0] = constructionOutflowYear0;
  }
  
  return constructionOutflowByYear;
}

/**
 * Helper function to calculate debt proceeds (net drawdowns) by year.
 * 
 * Debt proceeds = initialPrincipal - originationFee for tranches starting at that year.
 * 
 * @param capitalConfig - Capital structure configuration (must contain debtTranches)
 * @param horizonYears - Number of years in the projection horizon
 * @returns Array of debt proceeds amounts by year index (positive = cash inflow)
 */
function calculateDebtProceedsByYear(
  capitalConfig: CapitalStructureConfig | undefined,
  horizonYears: number
): number[] {
  const debtProceedsByYear = new Array(horizonYears).fill(0);
  
  if (!capitalConfig?.debtTranches || capitalConfig.debtTranches.length === 0) {
    return debtProceedsByYear;
  }
  
  for (const tranche of capitalConfig.debtTranches) {
    // Get initial principal (handles both initialPrincipal and amount for backward compatibility)
    const initialPrincipal = tranche.initialPrincipal ?? tranche.amount ?? 0;
    if (initialPrincipal <= 0) {
      continue;
    }
    
    // Calculate origination fee (defaults to 0)
    const originationFeePct = tranche.originationFeePct ?? 0;
    const originationFee = initialPrincipal * originationFeePct;
    
    // Net proceeds = initial principal minus origination fee
    const netProceeds = initialPrincipal - originationFee;
    
    // Debt proceeds occur at tranche startYear
    const startYear = tranche.startYear ?? 0;
    if (startYear >= 0 && startYear < horizonYears) {
      debtProceedsByYear[startYear] += netProceeds;
    }
  }
  
  return debtProceedsByYear;
}

/**
 * Generates a detailed Cash Flow Statement with 3 sections (Operating, Investing, Financing).
 * v5.7: Statement Logic Enhancement
 * 
 * Creates a comprehensive cash flow statement organized into:
 * 1. Operating Activities: NOI, Change in Working Capital, Cash from Operations
 * 2. Investing Activities: Land Costs, Construction Costs, Maintenance Capex
 * 3. Financing Activities: Debt Proceeds, Equity Contributions, Debt Service
 * 
 * @param output - Full model output from runFullModel
 * @param selectedOps - Optional array of operation IDs to filter (if not provided, uses all operations)
 * @param projectConfig - Optional project configuration (required for land/construction flows)
 * @param capitalConfig - Optional capital structure configuration (required for debt proceeds)
 * @returns Array of StatementRow objects ready for display in StatementTable
 * 
 * @example
 * // Generate cash flow statement for all operations
 * const rows = generateCashFlowStatement(output);
 * 
 * // Generate cash flow statement for selected operations with full detail
 * const rows = generateCashFlowStatement(output, ['hotel-1'], projectConfig, capitalConfig);
 */
export function generateCashFlowStatementRows(
  output: FullModelOutput,
  selectedOps?: string[],
  projectConfig?: ProjectConfig,
  capitalConfig?: CapitalStructureConfig
): StatementRow[] {
  const horizonYears = output.scenario.horizonYears;
  
  // Step 1: Filter and aggregate P&L for selected operations
  const selectedOperationIds = selectedOps && selectedOps.length > 0
    ? selectedOps
    : output.scenario.operations.map(op => op.id);
  
  const filteredPnl = filterAndAggregatePnl(output, selectedOperationIds);
  
  if (filteredPnl.length === 0) {
    return [];
  }
  
  // Step 2: Extract data for cash flow statement
  const project = output.project;
  const capital = output.capital;
  
  // Calculate land and construction outflows (if configs provided)
  const landOutflowByYear = calculateLandOutflowByYear(projectConfig, horizonYears);
  const constructionOutflowByYear = calculateConstructionOutflowByYear(projectConfig, horizonYears);
  
  // Calculate debt proceeds (if capitalConfig provided)
  const debtProceedsByYear = calculateDebtProceedsByYear(capitalConfig, horizonYears);
  
  // Step 3: Build cash flow statement entries
  const entries: Array<{
    yearIndex: number;
    // Operating Activities
    noi: number;
    changeInWorkingCapital: number;
    cashFromOperations: number;
    // Investing Activities
    landOutflow: number;
    constructionOutflow: number;
    maintenanceCapex: number;
    totalInvestingActivities: number;
    // Financing Activities
    debtProceeds: number;
    equityContributions: number;
    interestExpense: number;
    principalRepayment: number;
    exitFees: number;
    totalDebtService: number;
    cashFromFinancing: number;
    // Net Cash Flow
    netCashFlow: number;
    leveredFcf: number; // For validation
  }> = [];
  
  for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
    const pnlEntry = filteredPnl.find(p => p.yearIndex === yearIndex);
    const ufcfEntry = project.unleveredFcf.find(u => u.yearIndex === yearIndex);
    const leveredFcfEntry = capital.leveredFcfByYear.find(l => l.yearIndex === yearIndex);
    const debtScheduleEntry = capital.debtSchedule.entries.find(d => d.yearIndex === yearIndex);
    
    // Operating Activities
    const noi = pnlEntry?.noi ?? 0;
    const changeInWorkingCapital = ufcfEntry?.changeInWorkingCapital ?? 0;
    const cashFromOperations = noi - changeInWorkingCapital;
    
    // Investing Activities
    const landOutflow = landOutflowByYear[yearIndex] ?? 0;
    const constructionOutflow = constructionOutflowByYear[yearIndex] ?? 0;
    const maintenanceCapex = pnlEntry?.maintenanceCapex ?? 0;
    const totalInvestingActivities = -(landOutflow + constructionOutflow + maintenanceCapex); // Negative = outflow
    
    // Financing Activities
    const debtProceeds = debtProceedsByYear[yearIndex] ?? 0;
    
    // Equity contributions: Year 0 is negative in ownerLeveredCashFlows (equity invested)
    // Convert to positive for display (cash inflow)
    const equityContributions = yearIndex === 0 && capital.ownerLeveredCashFlows[0] < 0
      ? -capital.ownerLeveredCashFlows[0]
      : 0;
    
    // Debt Service
    const interestExpense = debtScheduleEntry?.interest ?? 0;
    const principalRepayment = debtScheduleEntry?.principal ?? 0;
    // Exit fees are included in transactionCosts field of LeveredFcf
    const exitFees = leveredFcfEntry?.transactionCosts ?? 0;
    const totalDebtService = interestExpense + principalRepayment + exitFees;
    
    // Cash from Financing = Debt Proceeds + Equity Contributions - Debt Service
    const cashFromFinancing = debtProceeds + equityContributions - totalDebtService;
    
    // Net Cash Flow
    // Note: Net Cash Flow = Operating + Investing + Financing
    // However, for validation against LeveredFCF, we need to account for:
    // LeveredFCF = NOI - Maintenance Capex - Change in WC - Land - Construction - Debt Service
    // Net Cash Flow (excluding financing proceeds) = NOI - Change in WC - (Land + Construction + Maintenance Capex) - Debt Service
    // But we also have financing: Debt Proceeds + Equity Contributions
    // So: Net Cash Flow = LeveredFCF + Debt Proceeds + Equity Contributions (only for Year 0)
    const netCashFlow = cashFromOperations + totalInvestingActivities + cashFromFinancing;
    
    // Validation: Compare with LeveredFCF
    // LeveredFCF doesn't include financing proceeds (debt/equity), so we should validate:
    // Net Cash Flow (excluding financing proceeds) should match LeveredFCF
    // But actually, for Year 0, equity contribution is negative in ownerLeveredCashFlows
    // So: LeveredFCF for Year 0 = UnleveredFCF - Debt Service - Equity (negative)
    // Let's calculate what LeveredFCF should be:
    const leveredFcf = leveredFcfEntry?.leveredFreeCashFlow ?? 0;
    
    // For validation: Net Cash Flow should equal LeveredFCF when excluding financing proceeds from Years 1+
    // For Year 0: Net Cash Flow includes equity contributions and debt proceeds
    
    entries.push({
      yearIndex,
      noi,
      changeInWorkingCapital,
      cashFromOperations,
      landOutflow,
      constructionOutflow,
      maintenanceCapex,
      totalInvestingActivities,
      debtProceeds,
      equityContributions,
      interestExpense,
      principalRepayment,
      exitFees,
      totalDebtService,
      cashFromFinancing,
      netCashFlow,
      leveredFcf,
    });
  }
  
  // Step 4: Transform entries into StatementRow format
  const rows: StatementRow[] = [];
  
  // Section 1: Operating Activities
  const operatingSection: StatementRow = {
    id: 'operating-activities',
    label: 'Operating Activities',
    level: 0,
    isGroup: true,
    values: entries.map(e => e.cashFromOperations),
    children: [
      {
        id: 'noi',
        label: 'Net Operating Income (NOI)',
        level: 1,
        values: entries.map(e => e.noi),
      },
      {
        id: 'change-wc',
        label: 'Change in Working Capital',
        level: 1,
        values: entries.map(e => -e.changeInWorkingCapital), // Negative for display (outflow)
      },
      {
        id: 'cash-from-operations',
        label: 'Cash from Operations',
        level: 0,
        isTotal: true,
        values: entries.map(e => e.cashFromOperations),
      },
    ],
  };
  rows.push(operatingSection);
  
  // Section 2: Investing Activities
  // Always include Investing Activities section, even if empty
  const investingChildren: StatementRow[] = [];
  
  if (entries.some(e => e.landOutflow > 0)) {
    investingChildren.push({
      id: 'land-costs',
      label: 'Land Acquisition Costs',
      level: 1,
      values: entries.map(e => -e.landOutflow), // Negative for display (outflow)
    });
  }
  
  if (entries.some(e => e.constructionOutflow > 0)) {
    investingChildren.push({
      id: 'construction-costs',
      label: 'Construction Hard Costs',
      level: 1,
      values: entries.map(e => -e.constructionOutflow), // Negative for display (outflow)
    });
  }
  
  if (entries.some(e => e.maintenanceCapex > 0)) {
    investingChildren.push({
      id: 'maintenance-capex',
      label: 'FF&E / Maintenance CAPEX',
      level: 1,
      values: entries.map(e => -e.maintenanceCapex), // Negative for display (outflow)
    });
  }
  
  // Always include total investing activities row
  investingChildren.push({
    id: 'total-investing',
    label: 'Total Investing Activities',
    level: 0,
    isTotal: true,
    values: entries.map(e => e.totalInvestingActivities),
  });
  
  const investingSection: StatementRow = {
    id: 'investing-activities',
    label: 'Investing Activities',
    level: 0,
    isGroup: true,
    values: entries.map(e => e.totalInvestingActivities),
    children: investingChildren,
  };
  rows.push(investingSection);
  
  // Section 3: Financing Activities
  const financingChildren: StatementRow[] = [];
  
  if (entries.some(e => e.debtProceeds > 0)) {
    financingChildren.push({
      id: 'debt-proceeds',
      label: 'Debt Proceeds (Drawdowns)',
      level: 1,
      values: entries.map(e => e.debtProceeds),
    });
  }
  
  if (entries.some(e => e.equityContributions > 0)) {
    financingChildren.push({
      id: 'equity-contributions',
      label: 'Equity Contributions',
      level: 1,
      values: entries.map(e => e.equityContributions),
    });
  }
  
  if (entries.some(e => e.totalDebtService > 0)) {
    financingChildren.push({
      id: 'debt-service-group',
      label: 'Debt Service',
      level: 1,
      isGroup: true,
      values: entries.map(e => -e.totalDebtService), // Negative for display (outflow)
      children: [
        {
          id: 'interest-expense',
          label: 'Interest Expense',
          level: 2,
          values: entries.map(e => -e.interestExpense), // Negative for display
        },
        {
          id: 'principal-repayment',
          label: 'Principal Repayment',
          level: 2,
          values: entries.map(e => -e.principalRepayment), // Negative for display
        },
        ...(entries.some(e => e.exitFees > 0) ? [{
          id: 'exit-fees',
          label: 'Exit Fees',
          level: 2,
          values: entries.map(e => -e.exitFees), // Negative for display
        }] : []),
      ],
    });
  }
  
  financingChildren.push({
    id: 'cash-from-financing',
    label: 'Cash from Financing',
    level: 0,
    isTotal: true,
    values: entries.map(e => e.cashFromFinancing),
  });
  
  const financingSection: StatementRow = {
    id: 'financing-activities',
    label: 'Financing Activities',
    level: 0,
    isGroup: true,
    values: entries.map(e => e.cashFromFinancing),
    children: financingChildren,
  };
  rows.push(financingSection);
  
  // Net Cash Flow (with validation note)
  const netCashFlowRow: StatementRow = {
    id: 'net-cash-flow',
    label: 'Net Cash Flow',
    level: 0,
    isTotal: true,
    values: entries.map(e => e.netCashFlow),
  };
  rows.push(netCashFlowRow);
  
  return rows;
}

/**
 * Generates a P&L Statement table with USALI structure.
 * v5.7: Statement Logic Enhancement
 * 
 * @param output - Full model output from runFullModel
 * @param selectedOps - Optional array of operation IDs to filter (if not provided, uses all operations)
 * @returns Array of StatementRow objects ready for display in StatementTable
 */
export function generatePnLTable(
  output: FullModelOutput,
  selectedOps?: string[]
): StatementRow[] {
  const selectedOperationIds = selectedOps && selectedOps.length > 0
    ? selectedOps
    : output.scenario.operations.map(op => op.id);
  
  const filteredPnl = filterAndAggregatePnl(output, selectedOperationIds);
  
  if (filteredPnl.length === 0) {
    return [];
  }
  
  // Build revenue section
  const revenueRows: StatementRow[] = [
    {
      id: 'revenue-total',
      label: 'Total Revenue',
      level: 0,
      isTotal: true,
      values: filteredPnl.map(entry => entry.revenueTotal),
    },
  ];
  
  // Build expenses section
  const expensesRows: StatementRow[] = [
    {
      id: 'expenses-dept',
      label: 'Departmental Expenses',
      level: 1,
      values: filteredPnl.map(entry => entry.departmentalExpenses),
    },
  ];
  
  // GOP row
  const gopRow: StatementRow = {
    id: 'gop',
    label: 'Gross Operating Profit (GOP)',
    level: 0,
    isTotal: true,
    values: filteredPnl.map(entry => entry.gop),
  };
  
  // Undistributed expenses
  const undistributedRow: StatementRow = {
    id: 'undistributed',
    label: 'Undistributed Expenses',
    level: 1,
    values: filteredPnl.map(entry => entry.undistributedExpenses),
  };
  
  // Management fees (if any)
  const hasManagementFees = filteredPnl.some(entry => entry.managementFees && entry.managementFees !== 0);
  const managementFeesRow: StatementRow | null = hasManagementFees
    ? {
        id: 'management-fees',
        label: 'Management Fees',
        level: 1,
        values: filteredPnl.map(entry => entry.managementFees ?? 0),
      }
    : null;
  
  // Non-operating income/expense (if any)
  const hasNonOperating = filteredPnl.some(entry => entry.nonOperatingIncomeExpense && entry.nonOperatingIncomeExpense !== 0);
  const nonOperatingRow: StatementRow | null = hasNonOperating
    ? {
        id: 'non-operating',
        label: 'Non-Operating Income/(Expense)',
        level: 1,
        values: filteredPnl.map(entry => entry.nonOperatingIncomeExpense ?? 0),
      }
    : null;
  
  // NOI row
  const noiRow: StatementRow = {
    id: 'noi',
    label: 'Net Operating Income (NOI)',
    level: 0,
    isTotal: true,
    values: filteredPnl.map(entry => entry.noi),
  };
  
  // Maintenance Capex
  const capexRow: StatementRow = {
    id: 'maintenance-capex',
    label: 'Maintenance CAPEX',
    level: 1,
    values: filteredPnl.map(entry => entry.maintenanceCapex),
  };
  
  // Cash Flow
  const cashFlowRow: StatementRow = {
    id: 'cash-flow',
    label: 'Cash Flow',
    level: 0,
    isTotal: true,
    values: filteredPnl.map(entry => entry.cashFlow),
  };
  
  // Build grouped structure
  const revenueGroup: StatementRow = {
    id: 'revenue-group',
    label: 'Revenue',
    level: 0,
    isGroup: true,
    values: filteredPnl.map(entry => entry.revenueTotal),
    children: revenueRows,
  };
  
  const operatingExpensesGroup: StatementRow = {
    id: 'operating-expenses-group',
    label: 'Operating Expenses',
    level: 0,
    isGroup: true,
    values: filteredPnl.map(entry => entry.departmentalExpenses + entry.undistributedExpenses),
    children: [
      ...expensesRows,
      undistributedRow,
      ...(managementFeesRow ? [managementFeesRow] : []),
      ...(nonOperatingRow ? [nonOperatingRow] : []),
    ],
  };
  
  return [
    revenueGroup,
    gopRow,
    operatingExpensesGroup,
    noiRow,
    capexRow,
    cashFlowRow,
  ];
}

