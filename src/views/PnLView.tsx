import { useState, useMemo } from 'react';
import type { FullModelOutput, OperationConfig } from '../domain/types';
import { OperationFilter } from '../components/filters/OperationFilter';
import { StatementTable, type StatementRow } from '../components/financials/StatementTable';
import { filterAndAggregatePnl } from '../engines/analytics/statementGenerator';
import { useTranslation } from '../contexts/LanguageContext';

interface PnLViewProps {
  operations: OperationConfig[];
  modelOutput: FullModelOutput;
}

/**
 * Transform consolidated P&L into StatementRow format for display
 * v5.8: Enhanced with full USALI breakdown and i18n
 */
function useTransformPnlToRows(
  pnl: Array<{
    yearIndex: number;
    revenueTotal: number;
    departmentalExpenses: number;
    gop: number;
    undistributedExpenses: number;
    managementFees?: number;
    nonOperatingIncomeExpense?: number;
    noi: number;
    maintenanceCapex: number;
    cashFlow: number;
    // v5.8: Breakdown fields
    roomRevenue?: number;
    foodRevenue?: number;
    beverageRevenue?: number;
    otherRevenue?: number;
    foodCogs?: number;
    beverageCogs?: number;
    payroll?: number;
    utilities?: number;
    marketing?: number;
    maintenanceOpex?: number;
    otherOpex?: number;
    incentiveFees?: number;
  }>
): StatementRow[] {
  const { t } = useTranslation();

  if (pnl.length === 0) {
    return [];
  }

  // v5.8: Build revenue section with breakdown
  const revenueBreakdownRows: StatementRow[] = [];

  // Check if we have breakdown data
  const hasRoomRevenue = pnl.some(e => e.roomRevenue && e.roomRevenue > 0);
  const hasFoodRevenue = pnl.some(e => e.foodRevenue && e.foodRevenue > 0);
  const hasBeverageRevenue = pnl.some(e => e.beverageRevenue && e.beverageRevenue > 0);
  const hasOtherRevenue = pnl.some(e => e.otherRevenue && e.otherRevenue > 0);

  if (hasRoomRevenue) {
    revenueBreakdownRows.push({
      id: 'revenue-room',
      label: t('pnl.roomRevenue'),
      level: 1,
      values: pnl.map(entry => entry.roomRevenue ?? 0),
    });
  }
  if (hasFoodRevenue) {
    revenueBreakdownRows.push({
      id: 'revenue-food',
      label: t('pnl.foodRevenue'),
      level: 1,
      values: pnl.map(entry => entry.foodRevenue ?? 0),
    });
  }
  if (hasBeverageRevenue) {
    revenueBreakdownRows.push({
      id: 'revenue-beverage',
      label: t('pnl.beverageRevenue'),
      level: 1,
      values: pnl.map(entry => entry.beverageRevenue ?? 0),
    });
  }
  if (hasOtherRevenue) {
    revenueBreakdownRows.push({
      id: 'revenue-other',
      label: t('pnl.otherRevenue'),
      level: 1,
      values: pnl.map(entry => entry.otherRevenue ?? 0),
    });
  }

  // Total Revenue row
  const revenueTotalRow: StatementRow = {
    id: 'revenue-total',
    label: t('pnl.totalRevenue'),
    level: revenueBreakdownRows.length > 0 ? 1 : 0,
    isTotal: true,
    values: pnl.map(entry => entry.revenueTotal),
  };

  const revenueRows: StatementRow[] = revenueBreakdownRows.length > 0
    ? [...revenueBreakdownRows, revenueTotalRow]
    : [revenueTotalRow];

  // v5.8: Build departmental expenses section with breakdown
  const deptExpensesBreakdownRows: StatementRow[] = [];

  const hasFoodCogs = pnl.some(e => e.foodCogs && e.foodCogs > 0);
  const hasBeverageCogs = pnl.some(e => e.beverageCogs && e.beverageCogs > 0);

  if (hasFoodCogs) {
    deptExpensesBreakdownRows.push({
      id: 'cogs-food',
      label: t('pnl.foodCogs'),
      level: 2,
      values: pnl.map(entry => entry.foodCogs ?? 0),
    });
  }
  if (hasBeverageCogs) {
    deptExpensesBreakdownRows.push({
      id: 'cogs-beverage',
      label: t('pnl.beverageCogs'),
      level: 2,
      values: pnl.map(entry => entry.beverageCogs ?? 0),
    });
  }

  const deptExpensesTotalRow: StatementRow = {
    id: 'expenses-dept',
    label: t('pnl.totalDepartmentalExpenses'),
    level: deptExpensesBreakdownRows.length > 0 ? 2 : 1,
    isTotal: deptExpensesBreakdownRows.length > 0,
    values: pnl.map(entry => entry.departmentalExpenses),
  };

  const expensesRows: StatementRow[] = deptExpensesBreakdownRows.length > 0
    ? [...deptExpensesBreakdownRows, deptExpensesTotalRow]
    : [deptExpensesTotalRow];

  // GOP row
  const gopRow: StatementRow = {
    id: 'gop',
    label: t('pnl.gop'),
    level: 0,
    isTotal: true,
    values: pnl.map(entry => entry.gop),
  };

  // v5.8: Build undistributed expenses section with breakdown
  const undistributedBreakdownRows: StatementRow[] = [];

  const hasPayroll = pnl.some(e => e.payroll && e.payroll > 0);
  const hasUtilities = pnl.some(e => e.utilities && e.utilities > 0);
  const hasMarketing = pnl.some(e => e.marketing && e.marketing > 0);
  const hasMaintenanceOpex = pnl.some(e => e.maintenanceOpex && e.maintenanceOpex > 0);
  const hasOtherOpex = pnl.some(e => e.otherOpex && e.otherOpex > 0);

  if (hasPayroll) {
    undistributedBreakdownRows.push({
      id: 'opex-payroll',
      label: t('pnl.payroll'),
      level: 2,
      values: pnl.map(entry => entry.payroll ?? 0),
    });
  }
  if (hasUtilities) {
    undistributedBreakdownRows.push({
      id: 'opex-utilities',
      label: t('pnl.utilities'),
      level: 2,
      values: pnl.map(entry => entry.utilities ?? 0),
    });
  }
  if (hasMarketing) {
    undistributedBreakdownRows.push({
      id: 'opex-marketing',
      label: t('pnl.marketing'),
      level: 2,
      values: pnl.map(entry => entry.marketing ?? 0),
    });
  }
  if (hasMaintenanceOpex) {
    undistributedBreakdownRows.push({
      id: 'opex-maintenance',
      label: t('pnl.maintenance'),
      level: 2,
      values: pnl.map(entry => entry.maintenanceOpex ?? 0),
    });
  }
  if (hasOtherOpex) {
    undistributedBreakdownRows.push({
      id: 'opex-other',
      label: t('pnl.other'),
      level: 2,
      values: pnl.map(entry => entry.otherOpex ?? 0),
    });
  }

  const undistributedTotalRow: StatementRow = {
    id: 'undistributed',
    label: t('pnl.totalUndistributedExpenses'),
    level: undistributedBreakdownRows.length > 0 ? 2 : 1,
    isTotal: undistributedBreakdownRows.length > 0,
    values: pnl.map(entry => entry.undistributedExpenses),
  };

  const undistributedRows: StatementRow[] = undistributedBreakdownRows.length > 0
    ? [...undistributedBreakdownRows, undistributedTotalRow]
    : [undistributedTotalRow];

  // Management fees (if any)
  const hasManagementFees = pnl.some(entry => entry.managementFees && entry.managementFees !== 0);
  const managementFeesRow: StatementRow | null = hasManagementFees
    ? {
      id: 'management-fees',
      label: t('pnl.managementFees'),
      level: 1,
      values: pnl.map(entry => entry.managementFees ?? 0),
    }
    : null;

  // v5.8: Incentive fees (if any)
  const hasIncentiveFees = pnl.some(entry => entry.incentiveFees && entry.incentiveFees !== 0);
  const incentiveFeesRow: StatementRow | null = hasIncentiveFees
    ? {
      id: 'incentive-fees',
      label: t('pnl.incentiveFees'),
      level: 1,
      values: pnl.map(entry => entry.incentiveFees ?? 0),
    }
    : null;

  // Non-operating income/expense (if any)
  const hasNonOperating = pnl.some(entry => entry.nonOperatingIncomeExpense && entry.nonOperatingIncomeExpense !== 0);
  const nonOperatingRow: StatementRow | null = hasNonOperating
    ? {
      id: 'non-operating',
      label: t('pnl.nonOperating'),
      level: 1,
      values: pnl.map(entry => entry.nonOperatingIncomeExpense ?? 0),
    }
    : null;

  // NOI row
  const noiRow: StatementRow = {
    id: 'noi',
    label: t('pnl.noi'),
    level: 0,
    isTotal: true,
    values: pnl.map(entry => entry.noi),
  };

  // Maintenance Capex
  const capexRow: StatementRow = {
    id: 'maintenance-capex',
    label: t('pnl.maintenanceCapex'),
    level: 1,
    values: pnl.map(entry => entry.maintenanceCapex),
  };

  // Cash Flow
  const cashFlowRow: StatementRow = {
    id: 'cash-flow',
    label: t('pnl.cashFlow'),
    level: 0,
    isTotal: true,
    values: pnl.map(entry => entry.cashFlow),
  };

  // Build grouped structure
  const revenueGroup: StatementRow = {
    id: 'revenue-group',
    label: t('pnl.revenue'),
    level: 0,
    isGroup: true,
    values: pnl.map(entry => entry.revenueTotal),
    children: revenueRows,
  };

  // v5.8: Build operating expenses group with nested structure
  const operatingExpensesChildren: StatementRow[] = [];

  // Departmental expenses group (if has breakdown)
  if (deptExpensesBreakdownRows.length > 0) {
    operatingExpensesChildren.push({
      id: 'dept-expenses-group',
      label: t('pnl.departmentalExpenses'),
      level: 1,
      isGroup: true,
      values: pnl.map(entry => entry.departmentalExpenses),
      children: expensesRows,
    });
  } else {
    operatingExpensesChildren.push(...expensesRows);
  }

  // Undistributed expenses group (if has breakdown)
  if (undistributedBreakdownRows.length > 0) {
    operatingExpensesChildren.push({
      id: 'undistributed-expenses-group',
      label: t('pnl.undistributedExpenses'),
      level: 1,
      isGroup: true,
      values: pnl.map(entry => entry.undistributedExpenses),
      children: undistributedRows,
    });
  } else {
    operatingExpensesChildren.push(...undistributedRows);
  }

  // Add fees and non-operating
  if (managementFeesRow) {
    operatingExpensesChildren.push(managementFeesRow);
  }
  if (incentiveFeesRow) {
    operatingExpensesChildren.push(incentiveFeesRow);
  }
  if (nonOperatingRow) {
    operatingExpensesChildren.push(nonOperatingRow);
  }

  const operatingExpensesGroup: StatementRow = {
    id: 'operating-expenses-group',
    label: t('pnl.operatingExpenses'),
    level: 0,
    isGroup: true,
    values: pnl.map(entry => entry.departmentalExpenses + entry.undistributedExpenses),
    children: operatingExpensesChildren,
  };

  return [
    revenueGroup,
    gopRow,
    operatingExpensesGroup,
    noiRow,
    capexRow,
    cashFlowRow,
  ];
}

export function PnLView({ operations, modelOutput }: PnLViewProps) {
  const { t, language } = useTranslation();
  const [selectedOperationIds, setSelectedOperationIds] = useState<Set<string>>(
    new Set(operations.map(op => op.id))
  );

  // Filter and aggregate P&L for selected operations
  const filteredPnl = useMemo(() => {
    if (selectedOperationIds.size === 0) {
      return [];
    }
    return filterAndAggregatePnl(modelOutput, Array.from(selectedOperationIds));
  }, [modelOutput, selectedOperationIds]);

  // Transform to StatementRow format using custom hook logic (directly invoked here since it's a hook call)
  const statementRows = useTransformPnlToRows(filteredPnl);

  // Generate column headers
  const columnHeaders = useMemo(() => {
    if (filteredPnl.length === 0) {
      return [];
    }
    const startYear = modelOutput.scenario.startYear;
    return filteredPnl.map((entry) => {
      const year = startYear ? startYear + entry.yearIndex : entry.yearIndex + 1;
      return `${t('common.year')} ${year}`;
    });
  }, [filteredPnl, modelOutput.scenario.startYear, t]);

  // Determine currency symbol based on language
  const currencySymbol = language === 'pt' ? 'R$ ' : '$ ';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        padding: '2rem',
        height: '100%',
        overflow: 'auto',
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            marginBottom: '0.5rem',
            fontSize: '1.75rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
          }}
        >
          {t('pnl.consolidatedStatement')}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
          }}
        >
          {t('pnl.subtitle')}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        <OperationFilter
          operations={operations}
          selectedOperationIds={selectedOperationIds}
          onSelectionChange={setSelectedOperationIds}
        />

        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.5rem',
            overflow: 'auto',
          }}
        >
          {statementRows.length > 0 ? (
            <StatementTable
              rows={statementRows}
              columnHeaders={columnHeaders}
              currencySymbol={currencySymbol}
              showNegativeInParentheses={true}
            />
          ) : (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.9375rem' }}>
                {t('common.selectOperation')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
