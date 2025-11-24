import type { ProjectKpis, DcfValuation, BreakevenMetrics } from '@domain/types';

interface ProjectKpiPanelProps {
  projectKpis: ProjectKpis;
  dcfValuation?: DcfValuation;
  breakevenMetrics?: BreakevenMetrics;
}

/**
 * Formats a number as currency.
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a number as a percentage.
 */
function formatPercent(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Formats a number with 2 decimal places.
 */
function formatNumber(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return value.toFixed(2);
}

export function ProjectKpiPanel({ projectKpis, dcfValuation, breakevenMetrics }: ProjectKpiPanelProps) {
  return (
    <div className="project-kpi-panel card">
      <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Project KPIs</h2>
      <div className="kpi-grid">
        <div className="kpi-card kpi-category-valuation">
          <div className="kpi-label">NPV</div>
          <div className="kpi-value">{formatCurrency(projectKpis.npv)}</div>
        </div>
        <div className="kpi-card kpi-category-return">
          <div className="kpi-label">Unlevered IRR</div>
          <div className="kpi-value">{formatPercent(projectKpis.unleveredIrr)}</div>
        </div>
        <div className="kpi-card kpi-category-return">
          <div className="kpi-label">Equity Multiple</div>
          <div className="kpi-value">{formatNumber(projectKpis.equityMultiple)}</div>
        </div>
        <div className="kpi-card kpi-category-return">
          <div className="kpi-label">Payback Period</div>
          <div className="kpi-value">
            {projectKpis.paybackPeriod !== null ? `${formatNumber(projectKpis.paybackPeriod)} years` : 'N/A'}
          </div>
        </div>
        {projectKpis.wacc !== null && projectKpis.wacc !== undefined && (
          <div className="kpi-card kpi-category-valuation">
            <div className="kpi-label">WACC</div>
            <div className="kpi-value">{formatPercent(projectKpis.wacc)}</div>
          </div>
        )}
        {breakevenMetrics && (
          <div className="kpi-card kpi-category-operational">
            <div className="kpi-label">Breakeven Occupancy</div>
            <div className="kpi-value">
              {breakevenMetrics.breakevenOccupancy !== null
                ? formatPercent(breakevenMetrics.breakevenOccupancy)
                : 'N/A'}
            </div>
          </div>
        )}
        {dcfValuation && (
          <>
            <div className="kpi-card kpi-category-valuation">
              <div className="kpi-label">Enterprise Value</div>
              <div className="kpi-value">{formatCurrency(dcfValuation.enterpriseValue)}</div>
            </div>
            <div className="kpi-card kpi-category-valuation">
              <div className="kpi-label">Equity Value</div>
              <div className="kpi-value">{formatCurrency(dcfValuation.equityValue)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

