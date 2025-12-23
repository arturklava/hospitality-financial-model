import type { ProjectKpis, DcfValuation, BreakevenMetrics } from '@domain/types';
import {
  formatCurrencyValue,
  formatMultiple,
  formatPercentValue,
  formatYears,
  KPI_TOOLTIPS,
} from '../utils/kpiDisplay';

interface ProjectKpiPanelProps {
  projectKpis: ProjectKpis;
  dcfValuation?: DcfValuation;
  breakevenMetrics?: BreakevenMetrics;
}

export function ProjectKpiPanel({ projectKpis, dcfValuation, breakevenMetrics }: ProjectKpiPanelProps) {
  return (
    <div className="project-kpi-panel card">
      <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Project KPIs</h2>
      <div className="kpi-grid">
        <div className="kpi-card kpi-category-valuation">
          <div className="kpi-label" title={KPI_TOOLTIPS.npv}>NPV (unlevered, USD)</div>
          <div className="kpi-value">{formatCurrencyValue(projectKpis.npv)}</div>
        </div>
        <div className="kpi-card kpi-category-return">
          <div className="kpi-label" title={KPI_TOOLTIPS.unleveredIrr}>Unlevered IRR (%)</div>
          <div className="kpi-value">{formatPercentValue(projectKpis.unleveredIrr)}</div>
        </div>
        <div className="kpi-card kpi-category-return">
          <div className="kpi-label" title={KPI_TOOLTIPS.equityMultiple}>Equity Multiple (unlevered)</div>
          <div className="kpi-value">{formatMultiple(projectKpis.equityMultiple)}</div>
        </div>
        <div className="kpi-card kpi-category-return">
          <div className="kpi-label" title={KPI_TOOLTIPS.payback}>Payback Period (unlevered)</div>
          <div className="kpi-value">{formatYears(projectKpis.paybackPeriod)}</div>
        </div>
        {projectKpis.wacc !== null && projectKpis.wacc !== undefined && (
          <div className="kpi-card kpi-category-valuation">
            <div className="kpi-label">WACC</div>
            <div className="kpi-value">{formatPercentValue(projectKpis.wacc)}</div>
          </div>
        )}
        {breakevenMetrics && (
          <div className="kpi-card kpi-category-operational">
            <div className="kpi-label">Breakeven Occupancy</div>
            <div className="kpi-value">
              {formatPercentValue(breakevenMetrics.breakevenOccupancy)}
            </div>
          </div>
        )}
        {dcfValuation && (
          <>
            <div className="kpi-card kpi-category-valuation">
              <div className="kpi-label" title={KPI_TOOLTIPS.enterpriseValue}>Enterprise Value (unlevered, USD)</div>
              <div className="kpi-value">{formatCurrencyValue(dcfValuation.enterpriseValue)}</div>
            </div>
            <div className="kpi-card kpi-category-valuation">
              <div className="kpi-label" title={KPI_TOOLTIPS.equityValue}>Equity Value (unlevered, USD)</div>
              <div className="kpi-value">{formatCurrencyValue(dcfValuation.equityValue)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

