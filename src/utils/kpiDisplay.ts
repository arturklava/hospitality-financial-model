import type { DebtKpi } from '@domain/types';
import { formatCurrency } from './formatters';

export const formatPercentValue = (value: number | null | undefined, digits = 2): string => {
  if (value === null || value === undefined) return '-';
  if (!Number.isFinite(value)) return 'N/A';
  return `${(value * 100).toFixed(digits)}%`;
};

export const formatMultiple = (value: number | null | undefined, digits = 2): string => {
  if (value === null || value === undefined) return '-';
  if (!Number.isFinite(value)) return 'N/A';
  return `${value.toFixed(digits)}x`;
};

export const formatNumberValue = (value: number | null | undefined, digits = 2): string => {
  if (value === null || value === undefined) return '-';
  if (!Number.isFinite(value)) return 'N/A';
  return value.toFixed(digits);
};

export const formatYears = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  if (!Number.isFinite(value)) return 'N/A';
  return `${value.toFixed(1)} yrs`;
};

export const formatCurrencyValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  if (!Number.isFinite(value)) return 'N/A';
  try {
    return formatCurrency(value);
  } catch (e) {
    return 'N/A';
  }
};

/**
 * Safe currency formatter that never throws.
 */
export const safeCurrency = (val: any): string => {
  if (val === null || val === undefined) return '-';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (!Number.isFinite(num)) return 'N/A';
  try {
    return formatCurrency(num);
  } catch (e) {
    return 'N/A';
  }
};

/**
 * Safe percentage formatter that never throws.
 */
export const safePercent = (val: any, digits = 2): string => {
  if (val === null || val === undefined) return '-';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (!Number.isFinite(num)) return 'N/A';
  return `${(num * 100).toFixed(digits)}%`;
};

export interface DebtKpiSummary {
  averageDscr: number | null;
  maxLtv: number | null;
}

export function summarizeDebtKpis(debtKpis: DebtKpi[]): DebtKpiSummary {
  const validDscrs = debtKpis.map((kpi) => kpi.dscr).filter((dscr): dscr is number => dscr !== null && Number.isFinite(dscr));
  const averageDscr = validDscrs.length > 0
    ? validDscrs.reduce((sum, dscr) => sum + dscr, 0) / validDscrs.length
    : null;

  const validLtvs = debtKpis.map((kpi) => kpi.ltv).filter((ltv): ltv is number => ltv !== null && Number.isFinite(ltv));
  const maxLtv = validLtvs.length > 0 ? Math.max(...validLtvs) : null;

  return { averageDscr, maxLtv };
}

export const KPI_TOOLTIPS = {
  npv: 'Net present value of unlevered free cash flows (USD). Includes initial investment as Year 0 outflow.',
  unleveredIrr: 'Internal rate of return on unlevered cash flows before financing.',
  equityMultiple: 'Total unlevered cash inflows divided by total unlevered outflows; excludes financing.',
  payback: 'Years until cumulative unlevered cash flow turns positive (time to recover equity).',
  enterpriseValue: 'Present value of all unlevered free cash flows including terminal value.',
  equityValue: 'Equity value from unlevered valuation (no debt adjustments).',
  averageDscr: 'Debt service coverage ratio using NOI / debt service; levered metric.',
  maxLtv: 'Maximum loan-to-value observed in schedule; levered and based on total project cost.',
} as const;
