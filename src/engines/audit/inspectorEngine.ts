/**
 * Inspector engine for audit trace generation (v5.9: Audit & Glossary Logic).
 * 
 * Provides detailed audit traces for specific fields, showing how values are calculated
 * with formulas, input values, and results extracted from FullModelOutput.
 */

import type { FullModelOutput } from '@domain/types';
import type { DetailedAuditTrace } from '@domain/audit';

/**
 * Gets a detailed audit trace for a specific field from the model output.
 * 
 * Extracts values from FullModelOutput and returns a DetailedAuditTrace with:
 * - Formula: Human-readable formula (e.g., "NOI / Debt Service")
 * - Values: Dictionary of input values (e.g., { noi: 500000, debtService: 400000 })
 * - Result: The calculated result (e.g., 1.25)
 * 
 * Supported fields in v5.9:
 * - 'noi': Net Operating Income
 * - 'dscr': Debt Service Coverage Ratio
 * - 'ltv': Loan to Value
 * - 'irr': Internal Rate of Return
 * - 'npv': Net Present Value
 * - 'gop': Gross Operating Profit
 * - 'ufcf': Unlevered Free Cash Flow
 * - 'lfcf': Levered Free Cash Flow
 * - 'wacc': Weighted Average Cost of Capital
 * - 'moic': Multiple on Invested Capital (Equity Multiple)
 * - 'payback': Payback Period
 * 
 * @param fieldId - The field identifier to trace (e.g., 'dscr', 'noi', 'npv')
 * @param output - Full model output containing the data
 * @param yearIndex - Optional year index for time-series values (default: 0)
 * @returns Detailed audit trace with formula, values, and result
 * 
 * @example
 * const trace = getAuditTrace('dscr', output, 0);
 * // Returns: {
 * //   field: 'dscr',
 * //   formula: 'NOI / Debt Service',
 * //   values: { noi: 500000, debtService: 400000 },
 * //   result: 1.25,
 * //   source: 'capitalEngine',
 * //   yearIndex: 0
 * // }
 */
export function getAuditTrace(
  fieldId: string,
  output: FullModelOutput,
  yearIndex: number = 0
): DetailedAuditTrace {
  const normalizedField = fieldId.toLowerCase().trim();

  // Validate yearIndex is within bounds
  const validYearIndex = Math.max(0, Math.min(yearIndex, output.scenario.horizonYears - 1));

  switch (normalizedField) {
    case 'noi':
    case 'netoperatingincome': {
      const yearPnl = output.consolidatedAnnualPnl[validYearIndex];
      if (!yearPnl) {
        return {
          field: 'noi',
          formula: 'NOI = GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense - Maintenance Capex',
          values: {},
          result: 0,
          source: 'scenarioEngine',
          yearIndex: validYearIndex,
        };
      }

      const gop = yearPnl.gop;
      const undistributedExpenses = yearPnl.undistributedExpenses;
      const managementFees = yearPnl.managementFees ?? 0;
      const nonOperatingIncomeExpense = yearPnl.nonOperatingIncomeExpense ?? 0;
      const maintenanceCapex = yearPnl.maintenanceCapex;
      
      const noi = yearPnl.noi; // Use actual NOI from P&L

      return {
        field: 'noi',
        formula: 'NOI = GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense - Maintenance Capex',
        values: {
          gop,
          undistributedExpenses,
          managementFees,
          nonOperatingIncomeExpense,
          maintenanceCapex,
        },
        result: noi,
        source: 'scenarioEngine',
        calculationStep: 'calculateNOI',
        yearIndex: validYearIndex,
        components: [
          {
            name: 'GOP',
            value: gop,
            description: 'Gross Operating Profit',
          },
          {
            name: 'Undistributed Expenses',
            value: undistributedExpenses,
            description: 'Expenses not directly attributable to departments',
          },
          {
            name: 'Management Fees',
            value: managementFees,
            description: 'Fees paid to management company',
          },
          {
            name: 'Non-Operating Income/Expense',
            value: nonOperatingIncomeExpense,
            description: 'Non-operating items',
          },
          {
            name: 'Maintenance Capex',
            value: maintenanceCapex,
            description: 'Maintenance capital expenditures',
          },
        ],
      };
    }

    case 'dscr':
    case 'debtservicecoverageratio': {
      const yearPnl = output.consolidatedAnnualPnl[validYearIndex];
      const yearDebtKpi = output.capital.debtKpis[validYearIndex];
      const yearLeveredFcf = output.capital.leveredFcfByYear[validYearIndex];

      if (!yearPnl || !yearDebtKpi || !yearLeveredFcf) {
        return {
          field: 'dscr',
          formula: 'DSCR = NOI / Debt Service',
          values: {},
          result: 0,
          source: 'capitalEngine',
          yearIndex: validYearIndex,
        };
      }

      const noi = yearPnl.noi;
      const debtService = yearLeveredFcf.debtService;
      const interest = yearLeveredFcf.interest;
      const principal = yearLeveredFcf.principal;
      const dscr = yearDebtKpi.dscr ?? (debtService > 0 ? noi / debtService : 0);

      return {
        field: 'dscr',
        formula: 'DSCR = NOI / Debt Service',
        values: {
          noi,
          debtService,
          interest,
          principal,
        },
        result: Number.isFinite(dscr) ? dscr : 0,
        source: 'capitalEngine',
        calculationStep: 'calculateDebtKpis',
        yearIndex: validYearIndex,
        components: [
          {
            name: 'NOI',
            value: noi,
            description: 'Net Operating Income',
          },
          {
            name: 'Debt Service',
            value: debtService,
            description: 'Interest + Principal payments',
          },
          {
            name: 'Interest',
            value: interest,
            description: 'Interest expense',
          },
          {
            name: 'Principal',
            value: principal,
            description: 'Principal repayment',
          },
        ],
      };
    }

    case 'ltv':
    case 'loantovalue': {
      const yearDebtKpi = output.capital.debtKpis[validYearIndex];
      const yearDebtSchedule = output.capital.debtSchedule.entries[validYearIndex];

      if (!yearDebtKpi || !yearDebtSchedule) {
        return {
          field: 'ltv',
          formula: 'LTV = (Total Debt / Initial Investment) × 100%',
          values: {},
          result: 0,
          source: 'capitalEngine',
          yearIndex: validYearIndex,
        };
      }

      const beginningBalance = yearDebtSchedule.beginningBalance;
      const initialInvestment = output.capital.debtSchedule.entries[0]?.beginningBalance 
        ? output.capital.debtSchedule.entries[0].beginningBalance 
        : (output.scenario.operations.reduce((sum) => {
            // Approximate initial investment from project config if available
            return sum;
          }, 0) || 10000000); // Fallback to 10M if unavailable
      
      // For LTV calculation, use initial investment from capital config if available
      // This is a simplified approach - in practice, initial investment should come from FullModelInput
      const effectiveInitialInvestment = output.capital.debtSchedule.entries[0]?.beginningBalance 
        ? output.capital.debtSchedule.entries[0].beginningBalance * 1.5 // Rough estimate
        : initialInvestment;
      
      const ltv = yearDebtKpi.ltv ?? (effectiveInitialInvestment > 0 
        ? beginningBalance / effectiveInitialInvestment 
        : 0);

      return {
        field: 'ltv',
        formula: 'LTV = (Total Debt / Initial Investment) × 100%',
        values: {
          beginningBalance,
          initialInvestment: effectiveInitialInvestment,
        },
        result: Number.isFinite(ltv) ? ltv : 0,
        source: 'capitalEngine',
        calculationStep: 'calculateDebtKpis',
        yearIndex: validYearIndex,
      };
    }

    case 'irr':
    case 'internalrateofreturn': {
      const unleveredIrr = output.project.projectKpis.unleveredIrr;
      
      // IRR is calculated from cash flow series, not directly extractable from single values
      // We return the KPI result
      return {
        field: 'irr',
        formula: 'IRR = Discount rate where NPV = 0',
        values: {
          cashFlowSeries: output.project.dcfValuation.cashFlows.length,
        },
        result: unleveredIrr ?? 0,
        source: 'projectEngine',
        calculationStep: 'calculateIRR',
      };
    }

    case 'npv':
    case 'netpresentvalue': {
      const npv = output.project.projectKpis.npv;
      const cashFlows = output.project.dcfValuation.cashFlows;
      const discountRate = output.project.dcfValuation.discountRate;
      const initialInvestment = -cashFlows[0]; // Year 0 is typically negative (investment)

      return {
        field: 'npv',
        formula: 'NPV = Σ (Cash Flow_t / (1 + r)^t) - Initial Investment',
        values: {
          initialInvestment,
          discountRate,
          cashFlowCount: cashFlows.length,
        },
        result: npv,
        source: 'projectEngine',
        calculationStep: 'calculateNPV',
      };
    }

    case 'gop':
    case 'grossoperatingprofit': {
      const yearPnl = output.consolidatedAnnualPnl[validYearIndex];
      if (!yearPnl) {
        return {
          field: 'gop',
          formula: 'GOP = Total Revenue - Departmental Expenses',
          values: {},
          result: 0,
          source: 'scenarioEngine',
          yearIndex: validYearIndex,
        };
      }

      const revenueTotal = yearPnl.revenueTotal;
      const departmentalExpenses = yearPnl.departmentalExpenses;
      const gop = yearPnl.gop;

      return {
        field: 'gop',
        formula: 'GOP = Total Revenue - Departmental Expenses',
        values: {
          revenueTotal,
          departmentalExpenses,
        },
        result: gop,
        source: 'scenarioEngine',
        calculationStep: 'calculateGOP',
        yearIndex: validYearIndex,
      };
    }

    case 'ufcf':
    case 'unleveredfcf':
    case 'unleveredfreecashflow': {
      const yearUfcf = output.project.unleveredFcf[validYearIndex];
      const yearPnl = output.consolidatedAnnualPnl[validYearIndex];

      if (!yearUfcf || !yearPnl) {
        return {
          field: 'ufcf',
          formula: 'UFCF = NOI - Maintenance Capex - Change in Working Capital',
          values: {},
          result: 0,
          source: 'projectEngine',
          yearIndex: validYearIndex,
        };
      }

      const noi = yearPnl.noi;
      const maintenanceCapex = yearUfcf.maintenanceCapex;
      const changeInWorkingCapital = yearUfcf.changeInWorkingCapital;
      const ufcf = yearUfcf.unleveredFreeCashFlow;

      return {
        field: 'ufcf',
        formula: 'UFCF = NOI - Maintenance Capex - Change in Working Capital',
        values: {
          noi,
          maintenanceCapex,
          changeInWorkingCapital,
        },
        result: ufcf,
        source: 'projectEngine',
        calculationStep: 'calculateUnleveredFcf',
        yearIndex: validYearIndex,
      };
    }

    case 'lfcf':
    case 'leveredfcf':
    case 'leveredfreecashflow': {
      const yearLeveredFcf = output.capital.leveredFcfByYear[validYearIndex];
      const yearUfcf = output.project.unleveredFcf[validYearIndex];

      if (!yearLeveredFcf || !yearUfcf) {
        return {
          field: 'lfcf',
          formula: 'LFCF = UFCF - Debt Service',
          values: {},
          result: 0,
          source: 'capitalEngine',
          yearIndex: validYearIndex,
        };
      }

      const unleveredFcf = yearUfcf.unleveredFreeCashFlow;
      const debtService = yearLeveredFcf.debtService;
      const lfcf = yearLeveredFcf.leveredFreeCashFlow;

      return {
        field: 'lfcf',
        formula: 'LFCF = UFCF - Debt Service',
        values: {
          unleveredFcf,
          debtService,
        },
        result: lfcf,
        source: 'capitalEngine',
        calculationStep: 'calculateLeveredFcf',
        yearIndex: validYearIndex,
      };
    }

    case 'wacc':
    case 'weightedaveragecostofcapital': {
      // WACC is typically not stored in FullModelOutput directly
      // This would require access to FullModelInput to get capital structure
      // For now, return a placeholder
      return {
        field: 'wacc',
        formula: 'WACC = (Equity % × Cost of Equity) + (Debt % × Cost of Debt × (1 - Tax Rate))',
        values: {},
        result: 0,
        source: 'projectEngine',
        calculationStep: 'calculateWACC',
      };
    }

    case 'moic':
    case 'equitymultiple':
    case 'multipleoninvestedcapital': {
      const equityMultiple = output.project.projectKpis.equityMultiple;
      
      return {
        field: 'moic',
        formula: 'Equity Multiple = Total Distributions / Total Contributions',
        values: {
          // These would need to be extracted from waterfall results
        },
        result: equityMultiple,
        source: 'projectEngine',
        calculationStep: 'calculateEquityMultiple',
      };
    }

    case 'payback':
    case 'paybackperiod': {
      const paybackPeriod = output.project.projectKpis.paybackPeriod;
      
      return {
        field: 'payback',
        formula: 'Payback Period = Years until cumulative cash flows ≥ Initial Investment',
        values: {
          // Cash flow series needed for detailed breakdown
        },
        result: paybackPeriod ?? 0,
        source: 'projectEngine',
        calculationStep: 'calculatePaybackPeriod',
      };
    }

    default: {
      return {
        field: normalizedField,
        formula: `Formula for ${normalizedField} is not defined`,
        values: {},
        result: 0,
        source: 'unknown',
      };
    }
  }
}

