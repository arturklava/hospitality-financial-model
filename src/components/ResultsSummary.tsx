import { useState } from 'react';
import { useAudit } from '../ui/contexts/AuditContext';
import { AuditTooltip, type AuditInfo } from './audit/AuditTooltip';
import { InspectorDrawer } from './audit/InspectorDrawer';
import type { InspectorData } from './audit/InspectorOverlay';
import type { ProjectKpis, DcfValuation, DebtKpi, FullModelOutput } from '@domain/types';
import { formatCurrency } from '../utils/formatters';
import {
  formatCurrencyValue,
  formatMultiple,
  formatNumberValue,
  formatPercentValue,
  formatYears,
  KPI_TOOLTIPS,
  summarizeDebtKpis,
} from '../utils/kpiDisplay';

interface ResultsSummaryProps {
  projectKpis: ProjectKpis;
  dcfValuation?: DcfValuation;
  debtKpis?: DebtKpi[];
  fullOutput?: FullModelOutput; // Optional: for detailed audit info
  onNavigateToGlossary?: () => void; // Optional: callback to navigate to glossary
}

/**
 * Generates audit info for a KPI value.
 */
function getAuditInfo(
  kpiType: string,
  projectKpis: ProjectKpis,
  dcfValuation: DcfValuation,
  averageDscr: number | null,
  maxLtv: number | null,
  debtKpis: DebtKpi[]
): AuditInfo {
  switch (kpiType) {
    case 'npv':
      return {
        value: formatCurrency(projectKpis.npv),
        formula: 'NPV = Σ(CF_t / (1 + r)^t)',
        inputs: [
          { label: 'Discount Rate', value: `${(dcfValuation.discountRate * 100).toFixed(2)}%` },
          { label: 'Initial Investment', value: formatCurrency(-dcfValuation.cashFlows[0]) },
          { label: 'Terminal Growth Rate', value: `${(dcfValuation.terminalGrowthRate * 100).toFixed(2)}%` },
          { label: 'Terminal Value', value: formatCurrency(dcfValuation.terminalValue) },
        ],
      };
    case 'irr':
      return {
        value: formatPercentValue(projectKpis.unleveredIrr),
        formula: 'Unlevered IRR: discount rate where NPV of unlevered CF = 0',
        inputs: [
          { label: 'Cash Flows', value: `${dcfValuation.cashFlows.length} periods` },
          { label: 'Initial Investment', value: formatCurrency(-dcfValuation.cashFlows[0]) },
        ],
      };
    case 'equityMultiple':
      return {
        value: formatMultiple(projectKpis.equityMultiple),
        formula: 'Equity Multiple = Total unlevered inflows / total unlevered outflows',
        inputs: [
          { label: 'Reported Multiple', value: formatMultiple(projectKpis.equityMultiple) },
          { label: 'Cash Flow Periods', value: `${dcfValuation.cashFlows.length} periods` },
        ],
      };
    case 'payback':
      return {
        value: formatYears(projectKpis.paybackPeriod),
        formula: 'Payback Period = Years until cumulative unlevered CFs turn positive',
        inputs: [
          { label: 'Initial Investment', value: formatCurrency(-dcfValuation.cashFlows[0]) },
        ],
      };
    case 'enterpriseValue':
      return {
        value: formatCurrency(dcfValuation.enterpriseValue),
        formula: 'Enterprise Value = NPV of all cash flows',
        inputs: [
          { label: 'NPV', value: formatCurrency(projectKpis.npv) },
          { label: 'Discount Rate', value: `${(dcfValuation.discountRate * 100).toFixed(2)}%` },
        ],
      };
    case 'equityValue':
      return {
        value: formatCurrency(dcfValuation.equityValue),
        formula: 'Equity Value = Enterprise Value (no debt adjustment)',
        inputs: [
          { label: 'Enterprise Value', value: formatCurrency(dcfValuation.enterpriseValue) },
        ],
      };
    case 'dscr':
      const totalDebtService = debtKpis.reduce((sum, kpi) => {
        // Estimate debt service from DSCR if available
        return sum + (kpi.dscr !== null ? 1 : 0);
      }, 0);
      return {
        value: formatNumberValue(averageDscr),
        formula: 'DSCR = NOI / Debt Service',
        inputs: [
          { label: 'Average DSCR', value: formatNumberValue(averageDscr) },
          { label: 'Years with DSCR', value: `${totalDebtService} years` },
        ],
      };
    case 'ltv':
      return {
        value: formatPercentValue(maxLtv),
        formula: 'LTV = Debt Balance / Initial Investment',
        inputs: [
          { label: 'Max LTV', value: formatPercentValue(maxLtv) },
        ],
      };
    default:
      return {
        value: 'N/A',
        formula: 'Unknown',
        inputs: [],
      };
  }
}

export function ResultsSummary({
  projectKpis,
  dcfValuation,
  debtKpis = [],
  fullOutput: _fullOutput,
  onNavigateToGlossary,
}: ResultsSummaryProps) {
  const { isAuditMode } = useAudit();
  const [auditInfo, setAuditInfo] = useState<AuditInfo | null>(null);
  const [auditPosition, setAuditPosition] = useState<{ x: number; y: number } | undefined>(undefined);
  const [inspectorData, setInspectorData] = useState<InspectorData | null>(null);

  const { averageDscr, maxLtv } = summarizeDebtKpis(debtKpis);

  const handleKpiClick = (kpiType: string, _event: React.MouseEvent) => {
    if (!isAuditMode || !dcfValuation) return;

    const info = getAuditInfo(kpiType, projectKpis, dcfValuation, averageDscr, maxLtv, debtKpis);
    
    // Convert AuditInfo to InspectorData format
    const inspectorData: InspectorData = {
      value: info.value,
      formula: info.formula,
      inputs: info.inputs,
    };
    
    setInspectorData(inspectorData);
    setAuditInfo(null); // Clear old tooltip
    setAuditPosition(undefined);
  };

  const handleCloseAudit = () => {
    setAuditInfo(null);
    setAuditPosition(undefined);
    setInspectorData(null);
  };

  const auditStyle = isAuditMode
    ? {
      textDecoration: 'underline',
      textDecorationStyle: 'dashed' as const,
      textDecorationColor: '#9C27B0',
      cursor: 'pointer',
    }
    : {};

  return (
    <>
      <div className="results-summary card">
        <h2>Project Summary KPIs</h2>
        <div className="kpi-grid">
          <div className="kpi-item kpi-category-valuation">
            <div className="kpi-label" title={KPI_TOOLTIPS.npv}>NPV (unlevered, USD)</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('npv', e)}
            >
              {formatCurrency(projectKpis.npv)}
            </div>
          </div>
          <div className="kpi-item kpi-category-return">
            <div className="kpi-label" title={KPI_TOOLTIPS.unleveredIrr}>Unlevered IRR (%)</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('irr', e)}
            >
              {formatPercentValue(projectKpis.unleveredIrr)}
            </div>
          </div>
          <div className="kpi-item kpi-category-return">
            <div className="kpi-label" title={KPI_TOOLTIPS.equityMultiple}>Equity Multiple (unlevered)</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('equityMultiple', e)}
            >
              {formatMultiple(projectKpis.equityMultiple, 2)}
            </div>
          </div>
          <div className="kpi-item kpi-category-return">
            <div className="kpi-label" title={KPI_TOOLTIPS.payback}>Payback Period (unlevered)</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('payback', e)}
            >
              {formatYears(projectKpis.paybackPeriod)}
            </div>
          </div>
          <div className="kpi-item kpi-category-valuation">
            <div className="kpi-label" title={KPI_TOOLTIPS.enterpriseValue}>Enterprise Value (unlevered, USD)</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('enterpriseValue', e)}
            >
              {formatCurrencyValue(dcfValuation?.enterpriseValue)}
            </div>
          </div>
          <div className="kpi-item kpi-category-valuation">
            <div className="kpi-label" title={KPI_TOOLTIPS.equityValue}>Equity Value (unlevered, USD)</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('equityValue', e)}
            >
              {formatCurrencyValue(dcfValuation?.equityValue)}
            </div>
          </div>
          <div className="kpi-item kpi-category-debt">
            <div className="kpi-label" title={KPI_TOOLTIPS.averageDscr}>Average DSCR (levered)</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('dscr', e)}
            >
              {formatNumberValue(averageDscr)}
            </div>
          </div>
          <div className="kpi-item kpi-category-debt">
            <div className="kpi-label" title={KPI_TOOLTIPS.maxLtv}>Max LTV (levered)</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('ltv', e)}
            >
              {formatPercentValue(maxLtv, 2)}
            </div>
          </div>
        </div>
      </div>
      {auditInfo && (
        <AuditTooltip
          auditInfo={auditInfo}
          onClose={handleCloseAudit}
          position={auditPosition}
        />
      )}
      {inspectorData && (
        <InspectorDrawer
          data={inspectorData}
          onClose={handleCloseAudit}
          onNavigateToGlossary={onNavigateToGlossary}
        />
      )}
    </>
  );
}

