import { useMemo } from 'react';
import { WaterfallPanel } from '../components/WaterfallPanel';
import { ProjectKpiPanel } from '../components/ProjectKpiPanel';
import { WaterfallChart } from '../components/charts/WaterfallChart';
import { ScenarioSummaryPanel } from '../components/ScenarioSummaryPanel';
import { StatementTable, type StatementRow } from '../components/financials/StatementTable';
import { calculateBreakevenOccupancy } from '@engines/project/projectEngine';
import type { FullModelOutput, ConsolidatedAnnualPnl } from '@domain/types';
import { useTranslation } from '../contexts/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { getCurrencySymbol } from '../utils/formatters';

interface FinancialsViewProps {
  output: FullModelOutput | null;
}

/**
 * Transform ConsolidatedAnnualPnl into StatementRow format with row grouping
 * v5.8: Enhanced with revenue breakdown grouping (Total Revenue → Room Revenue, F&B Revenue)
 * v10.0: Added i18n support with translation function
 */
function transformFinancialsToRows(
  pnl: ConsolidatedAnnualPnl[],
  t: (key: TranslationKey) => string
): StatementRow[] {
  if (pnl.length === 0) {
    return [];
  }

  // Build revenue section with grouping
  const revenueBreakdownRows: StatementRow[] = [];

  // Check if we have breakdown data
  const hasRoomRevenue = pnl.some(e => e.roomRevenue && e.roomRevenue > 0);
  const hasFoodRevenue = pnl.some(e => e.foodRevenue && e.foodRevenue > 0);
  const hasBeverageRevenue = pnl.some(e => e.beverageRevenue && e.beverageRevenue > 0);
  const hasOtherRevenue = pnl.some(e => e.otherRevenue && e.otherRevenue > 0);

  // Room Revenue (indented sub-row)
  if (hasRoomRevenue) {
    revenueBreakdownRows.push({
      id: 'revenue-room',
      label: t('financial.roomRevenue'),
      level: 1,
      values: pnl.map(entry => entry.roomRevenue ?? 0),
    });
  }

  // F&B Revenue grouping: Food + Beverage as sub-rows
  if (hasFoodRevenue || hasBeverageRevenue) {
    if (hasFoodRevenue) {
      revenueBreakdownRows.push({
        id: 'revenue-food',
        label: t('financial.foodRevenue'),
        level: 1,
        values: pnl.map(entry => entry.foodRevenue ?? 0),
      });
    }
    if (hasBeverageRevenue) {
      revenueBreakdownRows.push({
        id: 'revenue-beverage',
        label: t('financial.beverageRevenue'),
        level: 1,
        values: pnl.map(entry => entry.beverageRevenue ?? 0),
      });
    }
  }

  if (hasOtherRevenue) {
    revenueBreakdownRows.push({
      id: 'revenue-other',
      label: t('financial.otherRevenue'),
      level: 1,
      values: pnl.map(entry => entry.otherRevenue ?? 0),
    });
  }

  // Total Revenue row (bold, parent group)
  const revenueTotalRow: StatementRow = {
    id: 'revenue-total',
    label: t('financial.totalRevenue'),
    level: 0,
    isTotal: true,
    isGroup: revenueBreakdownRows.length > 0,
    values: pnl.map(entry => entry.revenueTotal),
    children: revenueBreakdownRows.length > 0 ? revenueBreakdownRows : undefined,
  };

  // Departmental Expenses
  const deptExpensesRow: StatementRow = {
    id: 'expenses-dept',
    label: t('financial.departmentalExpenses'),
    level: 0,
    values: pnl.map(entry => entry.departmentalExpenses),
  };

  // GOP row
  const gopRow: StatementRow = {
    id: 'gop',
    label: t('financial.gop'),
    level: 0,
    isTotal: true,
    values: pnl.map(entry => entry.gop),
  };

  // Undistributed Expenses
  const undistributedExpensesRow: StatementRow = {
    id: 'expenses-undistributed',
    label: t('financial.undistributedExpenses'),
    level: 0,
    values: pnl.map(entry => entry.undistributedExpenses),
  };

  // Management Fees (if applicable)
  const hasManagementFees = pnl.some(e => e.managementFees && e.managementFees !== 0);
  const managementFeesRow: StatementRow | null = hasManagementFees ? {
    id: 'management-fees',
    label: t('financial.managementFees'),
    level: 0,
    values: pnl.map(entry => entry.managementFees ?? 0),
  } : null;

  // NOI row
  const noiRow: StatementRow = {
    id: 'noi',
    label: t('financial.noi'),
    level: 0,
    isTotal: true,
    values: pnl.map(entry => entry.noi),
  };

  // Maintenance Capex
  const maintenanceCapexRow: StatementRow = {
    id: 'maintenance-capex',
    label: t('financial.maintenanceCapex'),
    level: 0,
    values: pnl.map(entry => entry.maintenanceCapex),
  };

  // Cash Flow
  const cashFlowRow: StatementRow = {
    id: 'cash-flow',
    label: t('financial.cashFlow'),
    level: 0,
    isTotal: true,
    values: pnl.map(entry => entry.cashFlow),
  };

  // Build final rows array
  const rows: StatementRow[] = [
    revenueTotalRow,
    deptExpensesRow,
    gopRow,
    undistributedExpensesRow,
    ...(managementFeesRow ? [managementFeesRow] : []),
    noiRow,
    maintenanceCapexRow,
    cashFlowRow,
  ];

  return rows;
}

export function FinancialsView({ output }: FinancialsViewProps) {
  const { t, language } = useTranslation();
  const currencySymbol = getCurrencySymbol(language);

  // Transform P&L data to statement rows
  const statementRows = useMemo(() => {
    if (!output) return [];
    return transformFinancialsToRows(output.consolidatedAnnualPnl, t);
  }, [output, t]);

  // Generate column headers
  const columnHeaders = useMemo(() => {
    if (!output) return [];
    const startYear = output.scenario.startYear;
    const horizonYears = output.scenario.horizonYears;
    return Array.from({ length: horizonYears }, (_, i) => {
      const year = startYear ? startYear + i : i + 1;
      return `Year ${year}`;
    });
  }, [output]);

  if (!output) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        <p>{t('error.noModelResults')}</p>
      </div>
    );
  }

  // Calculate breakeven occupancy
  const totalDebtService = output.capital.debtSchedule.entries.length > 0
    ? output.capital.debtSchedule.entries[0].interest + output.capital.debtSchedule.entries[0].principal
    : 0;
  const breakevenMetrics = calculateBreakevenOccupancy(output.consolidatedAnnualPnl, totalDebtService);

  return (
    <div className="financials-view" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
      <ProjectKpiPanel
        projectKpis={output.project.projectKpis}
        dcfValuation={output.project.dcfValuation}
        breakevenMetrics={breakevenMetrics}
      />

      <ScenarioSummaryPanel
        consolidatedAnnualPnl={output.consolidatedAnnualPnl}
        fullOutput={output}
      />

      {/* Financial Statement Table */}
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        overflow: 'auto',
      }}>
        <h2 style={{
          margin: 0,
          marginBottom: '1.5rem',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
        }}>
          {t('financial.financialStatement')}
        </h2>
        {statementRows.length > 0 ? (
          <StatementTable
            rows={statementRows}
            columnHeaders={columnHeaders}
            currencySymbol={currencySymbol}
            showNegativeInParentheses={true}
          />
        ) : (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}>
            <p style={{ margin: 0, fontSize: '0.9375rem' }}>
              {t('financial.noData')}
            </p>
          </div>
        )}
      </div>

      <WaterfallPanel waterfallResult={output.waterfall} />

      <div className="table-section">
        <h3>{t('waterfall.distributionsChart')}</h3>
        <WaterfallChart waterfallResult={output.waterfall} />
      </div>
    </div>
  );
}

