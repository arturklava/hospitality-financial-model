import { useState, useMemo } from 'react';
import type { FullModelOutput, FullModelInput, OperationConfig } from '../domain/types';
import { OperationMultiSelect } from '../components/filters/OperationMultiSelect';
import { StatementTable } from '../components/financials/StatementTable';
import { generateCashFlowStatementRows } from '../engines/analytics/statementGenerator';

interface CashFlowViewProps {
  operations: OperationConfig[];
  modelOutput: FullModelOutput;
  input: FullModelInput;
}

export function CashFlowView({ operations, modelOutput, input }: CashFlowViewProps) {
  const [selectedOperationIds, setSelectedOperationIds] = useState<Set<string>>(
    new Set(operations.map(op => op.id))
  );

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
      return `Year ${year}`;
    });
  }, [statementRows, modelOutput.scenario.startYear, modelOutput.scenario.horizonYears]);

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
          Cash Flow Statement
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
          }}
        >
          Cash flow for selected operations after debt service
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
          {statementRows.length > 0 ? (
            <StatementTable
              rows={statementRows}
              columnHeaders={columnHeaders}
              currencySymbol="$"
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
                Select at least one operation to view cash flow statement
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

