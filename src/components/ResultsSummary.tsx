import { useState } from 'react';
import { useAudit } from '../ui/contexts/AuditContext';
import { AuditTooltip, type AuditInfo } from './audit/AuditTooltip';
import { InspectorDrawer } from './audit/InspectorDrawer';
import type { InspectorData } from './audit/InspectorOverlay';
import type { ProjectKpis, DcfValuation, DebtKpi, FullModelOutput } from '@domain/types';
import { useTranslation } from '../contexts/LanguageContext';
import { formatCurrency, formatPercent, type SupportedLocale } from '../utils/formatters';
import {
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
  debtKpis: DebtKpi[],
  language: SupportedLocale
): AuditInfo {
  const formatVal = (val: number | null | undefined) => val !== undefined && val !== null ? formatCurrency(val, language) : '—';
  const formatPct = (val: number | null | undefined) => val !== undefined && val !== null ? formatPercent(val, language) : '—';
  const formatMult = (val: number | null | undefined) => val !== undefined && val !== null ? `${val.toFixed(2)}x` : '—';
  const formatYrs = (val: number | null | undefined) => val !== undefined && val !== null ? `${val.toFixed(1)} ${language === 'pt' ? 'anos' : 'years'}` : '—';
  const formatNum = (val: number | null | undefined) => val !== undefined && val !== null ? val.toFixed(2) : '-';

  switch (kpiType) {
    case 'npv':
      return {
        value: formatVal(projectKpis.npv),
        formula: 'NPV = Σ(CF_t / (1 + r)^t)',
        inputs: [
          { label: 'Discount Rate', value: formatPct(dcfValuation.discountRate) },
          { label: 'Initial Investment', value: formatVal(-dcfValuation.cashFlows[0]) },
          { label: 'Terminal Growth Rate', value: formatPct(dcfValuation.terminalGrowthRate) },
          { label: 'Terminal Value', value: formatVal(dcfValuation.terminalValue) },
        ],
      };
    case 'irr':
      return {
        value: formatPct(projectKpis.unleveredIrr),
        formula: 'Unlevered IRR: discount rate where NPV of unlevered CF = 0',
        inputs: [
          { label: 'Cash Flows', value: `${dcfValuation.cashFlows.length} periods` },
          { label: 'Initial Investment', value: formatVal(-dcfValuation.cashFlows[0]) },
        ],
      };
    case 'equityMultiple':
      return {
        value: formatMult(projectKpis.equityMultiple),
        formula: 'Equity Multiple = Total unlevered inflows / total unlevered outflows',
        inputs: [
          { label: 'Reported Multiple', value: formatMult(projectKpis.equityMultiple) },
          { label: 'Cash Flow Periods', value: `${dcfValuation.cashFlows.length} periods` },
        ],
      };
    case 'payback':
      return {
        value: formatYrs(projectKpis.paybackPeriod),
        formula: 'Payback Period = Years until cumulative unlevered CFs turn positive',
        inputs: [
          { label: 'Initial Investment', value: formatVal(-dcfValuation.cashFlows[0]) },
        ],
      };
    case 'enterpriseValue':
      return {
        value: formatVal(dcfValuation.enterpriseValue),
        formula: 'Enterprise Value = NPV of all cash flows',
        inputs: [
          { label: 'NPV', value: formatVal(projectKpis.npv) },
          { label: 'Discount Rate', value: formatPct(dcfValuation.discountRate) },
        ],
      };
    case 'equityValue':
      return {
        value: formatVal(dcfValuation.equityValue),
        formula: 'Equity Value = Enterprise Value (no debt adjustment)',
        inputs: [
          { label: 'Enterprise Value', value: formatVal(dcfValuation.enterpriseValue) },
        ],
      };
    case 'dscr':
      const totalDebtService = debtKpis.reduce((sum, kpi) => {
        // Estimate debt service from DSCR if available
        return sum + (kpi.dscr !== null ? 1 : 0);
      }, 0);
      return {
        value: formatNum(averageDscr),
        formula: 'DSCR = NOI / Debt Service',
        inputs: [
          { label: 'Average DSCR', value: formatNum(averageDscr) },
          { label: 'Years with DSCR', value: `${totalDebtService} years` },
        ],
      };
    case 'ltv':
      return {
        value: formatPct(maxLtv || 0),
        formula: 'LTV = Debt Balance / Initial Investment',
        inputs: [
          { label: 'Max LTV', value: formatPct(maxLtv || 0) },
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
  const { t, language } = useTranslation();
  const lang = language as SupportedLocale;
  const [auditInfo, setAuditInfo] = useState<AuditInfo | null>(null);
  const [auditPosition, setAuditPosition] = useState<{ x: number; y: number } | undefined>(undefined);
  const [inspectorData, setInspectorData] = useState<InspectorData | null>(null);

  const { averageDscr, maxLtv } = summarizeDebtKpis(debtKpis);

  const handleKpiClick = (kpiType: string, _event: React.MouseEvent) => {
    if (!isAuditMode || !dcfValuation) return;

    const info = getAuditInfo(kpiType, projectKpis, dcfValuation, averageDscr, maxLtv, debtKpis, lang);

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

  // Formatting helpers considering locale
  const formatVal = (val: number | null | undefined) => val !== undefined && val !== null ? formatCurrency(val, lang) : '—';
  const formatPctVal = (val: number | null | undefined) => val !== undefined && val !== null ? formatPercent(val, lang) : '—';
  const formatNumVal = (val: number | null | undefined) => val !== undefined && val !== null ? val.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const formatMultVal = (val: number | null | undefined) => val !== undefined && val !== null ? `${val.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x` : '—';
  const formatYrsVal = (val: number | null | undefined) => val !== undefined && val !== null ? `${val.toFixed(1)} ${t('common.years')}` : '—';

  return (
    <>
      <div className="results-summary card">
        <h2>{t('dashboard.kpi.title')}</h2>
        <div className="kpi-grid">
          <div className="kpi-item kpi-category-valuation">
            <div className="kpi-label" title={t('financial.tooltips.npv')}>{t('financial.npv')}</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('npv', e)}
            >
              {formatVal(projectKpis.npv)}
            </div>
          </div>
          <div className="kpi-item kpi-category-return">
            <div className="kpi-label" title={t('financial.tooltips.unleveredIrr')}>{t('financial.unleveredIrr')}</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('irr', e)}
            >
              {formatPctVal(projectKpis.unleveredIrr)}
            </div>
          </div>
          <div className="kpi-item kpi-category-return">
            <div className="kpi-label" title={t('financial.tooltips.equityMultiple')}>{t('financial.equityMultiple')}</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('equityMultiple', e)}
            >
              {formatMultVal(projectKpis.equityMultiple)}
            </div>
          </div>
          <div className="kpi-item kpi-category-return">
            <div className="kpi-label" title={t('financial.tooltips.payback')}>{t('financial.paybackPeriod')}</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('payback', e)}
            >
              {formatYrsVal(projectKpis.paybackPeriod)}
            </div>
          </div>
          <div className="kpi-item kpi-category-valuation">
            <div className="kpi-label" title={t('financial.tooltips.enterpriseValue')}>{t('financial.valuation')} (Enterprise)</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('enterpriseValue', e)}
            >
              {formatVal(dcfValuation?.enterpriseValue)}
            </div>
          </div>
          <div className="kpi-item kpi-category-valuation">
            <div className="kpi-label" title={t('financial.tooltips.equityValue')}>{t('financial.valuation')} (Equity)</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('equityValue', e)}
            >
              {formatVal(dcfValuation?.equityValue)}
            </div>
          </div>
          <div className="kpi-item kpi-category-debt">
            <div className="kpi-label" title={t('financial.tooltips.averageDscr')}>{t('financial.dscr')} ({t('common.average') || 'Average'})</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('dscr', e)}
            >
              {formatNumVal(averageDscr)}
            </div>
          </div>
          <div className="kpi-item kpi-category-debt">
            <div className="kpi-label" title={t('financial.tooltips.maxLtv')}>{t('financial.ltv')} (Max)</div>
            <div
              className="kpi-value"
              style={auditStyle}
              onClick={(e) => handleKpiClick('ltv', e)}
            >
              {formatPctVal(maxLtv)}
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
