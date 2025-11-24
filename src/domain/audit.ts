/**
 * Audit helpers for explaining financial calculations (v0.10).
 * 
 * Provides functions to explain how financial metrics are calculated,
 * including formulas and the actual values used in calculations.
 */

/**
 * Audit trace showing how a value was calculated.
 * Contains the formula and the actual values used.
 */
export interface AuditTrace {
  field: string;
  formula: string;
  value: number;
  components: Array<{
    name: string;
    value: number;
    description?: string;
  }>;
}

/**
 * Detailed audit trace (v5.9: Audit & Glossary Logic).
 * 
 * Enhanced audit trace with rich metadata including values dictionary and result.
 * Provides detailed breakdown for UI display and audit trail.
 */
export interface DetailedAuditTrace {
  /** The field identifier (e.g., 'dscr', 'noi', 'npv') */
  field: string;
  /** Human-readable formula (e.g., "NOI / Debt Service") */
  formula: string;
  /** Dictionary of input values used in calculation (e.g., { noi: 500000, debtService: 400000 }) */
  values: Record<string, number>;
  /** The calculated result (e.g., 1.25) */
  result: number;
  /** Optional: Source module/engine (e.g., "capitalEngine", "scenarioEngine") */
  source?: string;
  /** Optional: Calculation step within the module */
  calculationStep?: string;
  /** Optional: Year index if this is a time-series value */
  yearIndex?: number;
  /** Optional: Operation ID if this is operation-specific */
  operationId?: string;
  /** Optional: Additional component breakdown for UI display */
  components?: Array<{
    name: string;
    value: number;
    description?: string;
  }>;
}

/**
 * Gets the human-readable formula for a financial metric.
 * 
 * @param field - The field name (e.g., 'gop', 'noi', 'ebitda', 'ufcf', 'wacc')
 * @returns Human-readable formula string
 * 
 * @example
 * getFormulaFor('gop') // Returns "Total Revenue - Departmental Expenses"
 * getFormulaFor('noi') // Returns "GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense - Maintenance Capex"
 */
export function getFormulaFor(field: string): string {
  const normalizedField = field.toLowerCase().trim();

  switch (normalizedField) {
    case 'gop':
    case 'grossoperatingprofit':
      return 'Total Revenue - Departmental Expenses';

    case 'noi':
    case 'netoperatingincome':
      return 'GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense - Maintenance Capex';

    case 'ebitda':
      return 'Total Revenue - COGS - OPEX';

    case 'departmentalexpenses':
    case 'departmental_expenses':
      return 'COGS + Direct Departmental Labor';

    case 'undistributedexpenses':
    case 'undistributed_expenses':
      return 'OPEX (Administrative, Marketing, Utilities, etc.)';

    case 'ufcf':
    case 'unleveredfcf':
    case 'unlevered_free_cash_flow':
      return 'NOI - Maintenance Capex - Change in Working Capital';

    case 'wacc':
    case 'weightedaveragecostofcapital':
      return '(Equity % × Cost of Equity) + (Debt % × Cost of Debt × (1 - Tax Rate))';

    case 'npv':
    case 'netpresentvalue':
      return 'Sum of Discounted Cash Flows - Initial Investment';

    case 'irr':
    case 'internalrateofreturn':
      return 'Discount Rate where NPV = 0';

    case 'dscr':
    case 'debtservicecoverageratio':
      return 'NOI / Total Debt Service';

    case 'ltv':
    case 'loantovalue':
      return 'Total Debt / Initial Investment';

    case 'equitymultiple':
    case 'moic':
    case 'multipleoninvestedcapital':
      return 'Total Distributions / Total Contributions';

    case 'payback':
    case 'paybackperiod':
      return 'Years until cumulative cash flows turn positive';

    case 'enterprisevalue':
    case 'enterprise_value':
      return 'NPV of all cash flows (including terminal value)';

    case 'equityvalue':
    case 'equity_value':
      return 'Enterprise Value (no debt adjustment in current model)';

    case 'breakevenoccupancy':
    case 'breakeven_occupancy':
      return 'Occupancy rate where NOI = Debt Service';

    default:
      return `Formula for ${field} is not defined`;
  }
}

/**
 * Explains how a value was calculated, including the formula and actual values used.
 * 
 * @param field - The field name to explain
 * @param context - Context object containing the values used in the calculation
 * @returns Audit trace with formula and component values
 * 
 * @example
 * explainValue('gop', {
 *   revenueTotal: 1000000,
 *   departmentalExpenses: 300000
 * })
 * // Returns: {
 * //   field: 'gop',
 * //   formula: 'Total Revenue - Departmental Expenses',
 * //   value: 700000,
 * //   components: [
 * //     { name: 'Total Revenue', value: 1000000 },
 * //     { name: 'Departmental Expenses', value: 300000 }
 * //   ]
 * // }
 */
export function explainValue(field: string, context: any): AuditTrace {
  const normalizedField = field.toLowerCase().trim();
  const formula = getFormulaFor(field);

  switch (normalizedField) {
    case 'gop':
    case 'grossoperatingprofit': {
      const revenue = context.revenueTotal ?? context.revenue ?? 0;
      const deptExpenses = context.departmentalExpenses ?? context.departmental_expenses ?? 0;
      const value = revenue - deptExpenses;

      return {
        field: 'gop',
        formula,
        value,
        components: [
          { name: 'Total Revenue', value: revenue, description: 'Total revenue from all departments' },
          { name: 'Departmental Expenses', value: deptExpenses, description: 'Direct expenses (COGS + direct labor)' },
        ],
      };
    }

    case 'noi':
    case 'netoperatingincome': {
      const gop = context.gop ?? 0;
      const undistributedExpenses = context.undistributedExpenses ?? context.undistributed_expenses ?? 0;
      const managementFees = context.managementFees ?? context.management_fees ?? 0;
      const nonOperating = context.nonOperatingIncomeExpense ?? context.non_operating_income_expense ?? 0;
      const maintenanceCapex = context.maintenanceCapex ?? context.maintenance_capex ?? 0;
      const value = gop - undistributedExpenses - managementFees - nonOperating - maintenanceCapex;

      return {
        field: 'noi',
        formula,
        value,
        components: [
          { name: 'GOP', value: gop, description: 'Gross Operating Profit' },
          { name: 'Undistributed Expenses', value: undistributedExpenses, description: 'OPEX not directly attributable to departments' },
          { name: 'Management Fees', value: managementFees, description: 'Fees paid to management company' },
          { name: 'Non-Operating Income/Expense', value: nonOperating, description: 'Non-operating items' },
          { name: 'Maintenance Capex', value: maintenanceCapex, description: 'Maintenance capital expenditures' },
        ],
      };
    }

    case 'ebitda': {
      const revenue = context.revenueTotal ?? context.revenue ?? 0;
      const cogs = context.cogsTotal ?? context.cogs ?? 0;
      const opex = context.opexTotal ?? context.opex ?? 0;
      const value = revenue - cogs - opex;

      return {
        field: 'ebitda',
        formula,
        value,
        components: [
          { name: 'Total Revenue', value: revenue },
          { name: 'COGS', value: cogs, description: 'Cost of Goods Sold' },
          { name: 'OPEX', value: opex, description: 'Operating Expenses' },
        ],
      };
    }

    case 'ufcf':
    case 'unleveredfcf':
    case 'unlevered_free_cash_flow': {
      const noi = context.noi ?? 0;
      const maintenanceCapex = context.maintenanceCapex ?? context.maintenance_capex ?? 0;
      const changeInWC = context.changeInWorkingCapital ?? context.change_in_working_capital ?? 0;
      const value = noi - maintenanceCapex - changeInWC;

      return {
        field: 'ufcf',
        formula,
        value,
        components: [
          { name: 'NOI', value: noi, description: 'Net Operating Income' },
          { name: 'Maintenance Capex', value: maintenanceCapex },
          { name: 'Change in Working Capital', value: changeInWC },
        ],
      };
    }

    case 'wacc':
    case 'weightedaveragecostofcapital': {
      const equityPct = context.equityPercentage ?? context.equity_percentage ?? 0;
      const costOfEquity = context.costOfEquity ?? context.cost_of_equity ?? 0;
      const debtPct = context.debtPercentage ?? context.debt_percentage ?? 0;
      const costOfDebt = context.costOfDebt ?? context.cost_of_debt ?? 0;
      const taxRate = context.taxRate ?? context.tax_rate ?? 0;
      const value = (equityPct * costOfEquity) + (debtPct * costOfDebt * (1 - taxRate));

      return {
        field: 'wacc',
        formula,
        value,
        components: [
          { name: 'Equity %', value: equityPct, description: 'Equity / (Equity + Debt)' },
          { name: 'Cost of Equity', value: costOfEquity, description: 'Required return on equity' },
          { name: 'Debt %', value: debtPct, description: 'Debt / (Equity + Debt)' },
          { name: 'Cost of Debt', value: costOfDebt, description: 'Weighted average interest rate' },
          { name: 'Tax Rate', value: taxRate, description: 'Corporate tax rate' },
        ],
      };
    }

    case 'dscr':
    case 'debtservicecoverageratio': {
      const noi = context.noi ?? 0;
      const debtService = context.debtService ?? context.debt_service ?? 0;
      const value = debtService > 0 ? noi / debtService : 0;

      return {
        field: 'dscr',
        formula,
        value: Number.isFinite(value) ? value : 0,
        components: [
          { name: 'NOI', value: noi, description: 'Net Operating Income' },
          { name: 'Total Debt Service', value: debtService, description: 'Interest + Principal payments' },
        ],
      };
    }

    case 'ltv':
    case 'loantovalue': {
      const totalDebt = context.totalDebt ?? context.total_debt ?? 0;
      const initialInvestment = context.initialInvestment ?? context.initial_investment ?? 0;
      const value = initialInvestment > 0 ? totalDebt / initialInvestment : 0;

      return {
        field: 'ltv',
        formula,
        value: Number.isFinite(value) ? value : 0,
        components: [
          { name: 'Total Debt', value: totalDebt },
          { name: 'Initial Investment', value: initialInvestment },
        ],
      };
    }

    default: {
      // Generic fallback for unknown fields
      const value = context.value ?? context[field] ?? 0;
      return {
        field: normalizedField,
        formula,
        value,
        components: [],
      };
    }
  }
}

