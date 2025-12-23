import { useEffect, useMemo, useState } from 'react';
import type { FullModelOutput, FullModelInput, OperationConfig } from '../domain/types';
import { OperationMultiSelect } from '../components/filters/OperationMultiSelect';
import { StatementTable } from '../components/financials/StatementTable';
import { generateCashFlowStatementRows } from '../engines/analytics/statementGenerator';
import { useTranslation } from '../contexts/LanguageContext';
import { getCurrencySymbol } from '../utils/formatters';

interface CashFlowViewProps {
  operations: OperationConfig[];
  modelOutput: FullModelOutput;
  input: FullModelInput;
}

export function CashFlowView({ operations, modelOutput, input }: CashFlowViewProps) {
  const { t, language } = useTranslation();
  const [selectedOperationIds, setSelectedOperationIds] = useState<Set<string>>(
    new Set(operations.map(op => op.id))
  );

  // Keep selection in sync with operations (preserve existing selections, add new active ones)
  useEffect(() => {
    const activeOperationIds = operations
      .filter(op => op.isActive ?? true)
      .map(op => op.id);

    setSelectedOperationIds((prevSelection) => {
      const preservedSelections = Array.from(prevSelection).filter((id) =>
        activeOperationIds.includes(id)
      );

      const newlyActive = activeOperationIds.filter((id) => !prevSelection.has(id));

      return new Set([...preservedSelections, ...newlyActive]);
    });
  }, [operations]);

  // Generate comprehensive cash flow statement with 3 sections (Operating, Investing, Financing)
  const statementRows = useMemo(() => {
    if (selectedOperationIds.size === 0) {
      return [];
    }
    return generateCashFlowStatementRows(
      modelOutput,
      Array.from(selectedOperationIds),
      input.projectConfig,
      input.capitalConfig
    );
  }, [modelOutput, selectedOperationIds, input.projectConfig, input.capitalConfig]);

  // Generate column headers
  const columnHeaders = useMemo(() => {
    if (statementRows.length === 0) {
      return [];
    }
    const startYear = modelOutput.scenario.startYear;
    const horizonYears = modelOutput.scenario.horizonYears;
    return Array.from({ length: horizonYears }, (_, i) => {
      const year = startYear ? startYear + i : i + 1;
      return `${t('common.year')} ${year}`;
    });
  }, [statementRows, modelOutput.scenario.startYear, modelOutput.scenario.horizonYears, t]);

  // Determine currency symbol based on language
  const currencySymbol = getCurrencySymbol(language);

  const hasActiveOperations = operations.some(op => op.isActive ?? true);

  // Transform rows to localized labels
  const localizedRows = useMemo(() => {
    // recursively map labels
    const mapRow = (row: any): any => {
      let labelKey = '';
      switch (row.id) {
        case 'operating-activities': labelKey = 'financial.operatingActivities'; break;
        case 'noi': labelKey = 'pnl.noi'; break;
        case 'change-wc': labelKey = 'financial.workingCapital'; break;
        case 'cash-from-operations': labelKey = 'financial.operatingCashFlow'; break;
        case 'investing-activities': labelKey = 'financial.investingActivities'; break;
        case 'land-costs': labelKey = 'financial.landAcquisition'; break;
        case 'construction-costs': labelKey = 'financial.construction'; break;
        case 'maintenance-capex': labelKey = 'pnl.maintenanceCapex'; break;
        case 'total-investing': labelKey = 'financial.totalInvesting'; break;
        case 'financing-activities': labelKey = 'financial.financingActivities'; break;
        case 'debt-proceeds': labelKey = 'financial.debtProceeds'; break;
        case 'equity-contributions': labelKey = 'financial.equityContributions'; break;
        case 'debt-service-group': labelKey = 'financial.debtService'; break;
        case 'interest-expense': labelKey = 'capital.interest'; break;
        case 'principal-repayment': labelKey = 'capital.principal'; break;
        case 'exit-fees': labelKey = 'capital.exitFee'; break;
        case 'cash-from-financing': labelKey = 'financial.cashFromFinancing'; break;
        case 'net-cash-flow': labelKey = 'financial.netCashFlow'; break;
        default: labelKey = '';
      }

      return {
        ...row,
        label: labelKey ? t(labelKey as any) : row.label,
        children: row.children ? row.children.map(mapRow) : undefined
      };
    };

    return statementRows.map(mapRow);
  }, [statementRows, t]);

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
          {t('cashflow.statement')}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
          }}
        >
          {t('cashflow.subtitle')}
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
        <OperationMultiSelect
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
          {localizedRows.length > 0 ? (
            <StatementTable
              rows={localizedRows}
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
                {hasActiveOperations ? t('common.selectOperation') : t('common.noActiveOperations')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
