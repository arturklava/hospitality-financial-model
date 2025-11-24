/**
 * Health engine for financial model validation (v1.5: Audit & Health Logic).
 * 
 * Performs health checks on the financial model output to identify potential issues
 * such as low DSCR, high LTV, or negative cash balances.
 */

import type { FullModelOutput } from '@domain/types';

/**
 * Result of a single health check.
 */
export interface HealthCheckResult {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  value: number | null;
}

/**
 * Runs health checks on the full model output.
 * 
 * Checks:
 * - Minimum DSCR > 1.2
 * - Maximum LTV < 75%
 * - Negative cash balances (negative annual cash flow)
 * 
 * @param output - Full model output to validate
 * @returns Array of health check results
 */
export function runHealthChecks(output: FullModelOutput): HealthCheckResult[] {
  const results: HealthCheckResult[] = [];

  // Check 1: Minimum DSCR > 1.2
  const dscrValues = output.capital.debtKpis
    .map(kpi => kpi.dscr)
    .filter((dscr): dscr is number => dscr !== null && Number.isFinite(dscr));
  
  if (dscrValues.length > 0) {
    const minDscr = Math.min(...dscrValues);
    const status = minDscr > 1.2 ? 'pass' : minDscr > 1.0 ? 'warning' : 'fail';
    const message = minDscr > 1.2
      ? `Minimum DSCR is ${minDscr.toFixed(2)}, which is above the 1.2 threshold`
      : minDscr > 1.0
      ? `Minimum DSCR is ${minDscr.toFixed(2)}, which is below the 1.2 threshold but above 1.0`
      : `Minimum DSCR is ${minDscr.toFixed(2)}, which is below 1.0 and indicates insufficient debt coverage`;
    
    results.push({
      id: 'dscr-min',
      label: 'Minimum DSCR Check',
      status,
      message,
      value: minDscr,
    });
  } else {
    results.push({
      id: 'dscr-min',
      label: 'Minimum DSCR Check',
      status: 'warning',
      message: 'No DSCR values available (likely no debt)',
      value: null,
    });
  }

  // Check 2: Maximum LTV < 75%
  const ltvValues = output.capital.debtKpis
    .map(kpi => kpi.ltv)
    .filter((ltv): ltv is number => ltv !== null && Number.isFinite(ltv));
  
  if (ltvValues.length > 0) {
    const maxLtv = Math.max(...ltvValues);
    const ltvPercent = maxLtv * 100;
    const status = maxLtv < 0.75 ? 'pass' : maxLtv < 0.85 ? 'warning' : 'fail';
    const message = maxLtv < 0.75
      ? `Maximum LTV is ${ltvPercent.toFixed(1)}%, which is below the 75% threshold`
      : maxLtv < 0.85
      ? `Maximum LTV is ${ltvPercent.toFixed(1)}%, which exceeds the 75% threshold but is below 85%`
      : `Maximum LTV is ${ltvPercent.toFixed(1)}%, which exceeds the 75% threshold and indicates high leverage`;
    
    results.push({
      id: 'ltv-max',
      label: 'Maximum LTV Check',
      status,
      message,
      value: maxLtv,
    });
  } else {
    results.push({
      id: 'ltv-max',
      label: 'Maximum LTV Check',
      status: 'pass',
      message: 'No LTV values available (likely no debt)',
      value: null,
    });
  }

  // Check 3: Negative cash balances (negative annual cash flow)
  const negativeCashFlowYears: number[] = [];
  output.capital.leveredFcfByYear.forEach((leveredFcf, index) => {
    if (leveredFcf.leveredFreeCashFlow < 0) {
      negativeCashFlowYears.push(index);
    }
  });

  if (negativeCashFlowYears.length > 0) {
    const yearsList = negativeCashFlowYears.length <= 3
      ? negativeCashFlowYears.join(', ')
      : `${negativeCashFlowYears.slice(0, 3).join(', ')}, and ${negativeCashFlowYears.length - 3} more`;
    
    results.push({
      id: 'negative-cash-flow',
      label: 'Negative Cash Flow Check',
      status: 'warning',
      message: `Negative levered free cash flow detected in year(s): ${yearsList}`,
      value: negativeCashFlowYears.length,
    });
  } else {
    results.push({
      id: 'negative-cash-flow',
      label: 'Negative Cash Flow Check',
      status: 'pass',
      message: 'All years show positive or zero levered free cash flow',
      value: 0,
    });
  }

  // Check 4: Bad Deal - Debt > Investment
  const firstYearDebtSchedule = output.capital.debtSchedule.entries[0];
  const totalDebt = firstYearDebtSchedule?.beginningBalance ?? 0;
  
  // Calculate initial investment from LTV: investment = debt / LTV (when LTV > 0)
  let initialInvestment: number | null = null;
  if (ltvValues.length > 0 && totalDebt > 0) {
    const firstYearLtv = output.capital.debtKpis[0]?.ltv;
    if (firstYearLtv !== null && firstYearLtv !== undefined && firstYearLtv > 0) {
      initialInvestment = totalDebt / firstYearLtv;
    }
  }

  if (totalDebt > 0 && initialInvestment !== null) {
    if (totalDebt > initialInvestment) {
      results.push({
        id: 'bad-deal',
        label: 'Bad Deal Check',
        status: 'fail',
        message: `Total debt (${totalDebt.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}) exceeds initial investment (${initialInvestment.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}). This indicates a bad deal structure.`,
        value: totalDebt - initialInvestment,
      });
    } else {
      results.push({
        id: 'bad-deal',
        label: 'Bad Deal Check',
        status: 'pass',
        message: `Total debt (${totalDebt.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}) is within initial investment (${initialInvestment.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })})`,
        value: initialInvestment - totalDebt,
      });
    }
  } else if (totalDebt > 0) {
    // Debt exists but we can't calculate investment (no LTV data)
    results.push({
      id: 'bad-deal',
      label: 'Bad Deal Check',
      status: 'warning',
      message: 'Cannot verify debt vs investment ratio (LTV data unavailable)',
      value: null,
    });
  } else {
    // No debt, so this check doesn't apply
    results.push({
      id: 'bad-deal',
      label: 'Bad Deal Check',
      status: 'pass',
      message: 'No debt in capital structure',
      value: 0,
    });
  }

  return results;
}

