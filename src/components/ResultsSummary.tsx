import { useState } from 'react';
import { useAudit } from '../ui/contexts/AuditContext';
import { AuditTooltip, type AuditInfo } from './audit/AuditTooltip';
import { InspectorDrawer } from './audit/InspectorDrawer';
import type { InspectorData } from './audit/InspectorOverlay';
import type { ProjectKpis, DcfValuation, DebtKpi, FullModelOutput } from '@domain/types';

interface ResultsSummaryProps {
  projectKpis: ProjectKpis;
  dcfValuation?: DcfValuation;
  debtKpis?: DebtKpi[];
  fullOutput?: FullModelOutput; // Optional: for detailed audit info
  onNavigateToGlossary?: () => void; // Optional: callback to navigate to glossary
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
        value: formatPercent(projectKpis.unleveredIrr),
        formula: 'IRR: NPV = 0 when discount rate = IRR',
        inputs: [
          { label: 'Cash Flows', value: `${dcfValuation.cashFlows.length} periods` },
          { label: 'Initial Investment', value: formatCurrency(-dcfValuation.cashFlows[0]) },
        ],
      };
    case 'equityMultiple':
      const positiveFlows = dcfValuation.cashFlows.filter(cf => cf > 0).reduce((sum, cf) => sum + cf, 0);
      const negativeFlows = Math.abs(dcfValuation.cashFlows.filter(cf => cf < 0).reduce((sum, cf) => sum + cf, 0));
      return {
        value: formatNumber(projectKpis.equityMultiple),
        formula: 'Equity Multiple = Sum of Positive CFs / |Sum of Negative CFs|',
        inputs: [
          { label: 'Sum of Positive CFs', value: formatCurrency(positiveFlows) },
          { label: 'Sum of Negative CFs', value: formatCurrency(-negativeFlows) },
        ],
      };
    case 'payback':
      return {
        value: projectKpis.paybackPeriod !== null ? `${formatNumber(projectKpis.paybackPeriod)} years` : 'N/A',
        formula: 'Payback Period = Years until cumulative CFs turn positive',
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
        value: formatNumber(averageDscr),
        formula: 'DSCR = NOI / Debt Service',
        inputs: [
          { label: 'Average DSCR', value: averageDscr !== null ? formatNumber(averageDscr) : 'N/A' },
          { label: 'Years with DSCR', value: `${totalDebtService} years` },
        ],
      };
    case 'ltv':
      return {
        value: formatPercent(maxLtv),
        formula: 'LTV = Debt Balance / Initial Investment',
        inputs: [
          { label: 'Max LTV', value: maxLtv !== null ? formatPercent(maxLtv) : 'N/A' },
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

  // Calculate average DSCR and max LTV from debt KPIs
  const validDscrs = debtKpis.map((kpi) => kpi.dscr).filter((dscr): dscr is number => dscr !== null);
  const averageDscr = validDscrs.length > 0
    ? validDscrs.reduce((sum, dscr) => sum + dscr, 0) / validDscrs.length
    : null;

  const validLtvs = debtKpis.map((kpi) => kpi.ltv).filter((ltv): ltv is number => ltv !== null);
  const maxLtv = validLtvs.length > 0 ? Math.max(...validLtvs) : null;

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
            <div className="kpi-label">NPV</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('npv', e)}
            >
              {formatCurrency(projectKpis.npv)}
            </div>
          </div>
          <div className="kpi-item kpi-category-return">
            <div className="kpi-label">Unlevered IRR</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('irr', e)}
            >
              {formatPercent(projectKpis.unleveredIrr)}
            </div>
          </div>
          <div className="kpi-item kpi-category-return">
            <div className="kpi-label">Equity Multiple</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('equityMultiple', e)}
            >
              {formatNumber(projectKpis.equityMultiple)}
            </div>
          </div>
          <div className="kpi-item kpi-category-return">
            <div className="kpi-label">Payback Period</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('payback', e)}
            >
              {projectKpis.paybackPeriod !== null ? `${formatNumber(projectKpis.paybackPeriod)} years` : 'N/A'}
            </div>
          </div>
          <div className="kpi-item kpi-category-valuation">
            <div className="kpi-label">Enterprise Value</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('enterpriseValue', e)}
            >
              {dcfValuation ? formatCurrency(dcfValuation.enterpriseValue) : 'N/A'}
            </div>
          </div>
          <div className="kpi-item kpi-category-valuation">
            <div className="kpi-label">Equity Value</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('equityValue', e)}
            >
              {dcfValuation ? formatCurrency(dcfValuation.equityValue) : 'N/A'}
            </div>
          </div>
          <div className="kpi-item kpi-category-debt">
            <div className="kpi-label">Average DSCR</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('dscr', e)}
            >
              {formatNumber(averageDscr)}
            </div>
          </div>
          <div className="kpi-item kpi-category-debt">
            <div className="kpi-label">Max LTV</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('ltv', e)}
            >
              {formatPercent(maxLtv)}
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

