import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { DataTable } from '../ui/DataTable';
import { useTranslation } from '../../contexts/LanguageContext';
import { getCurrencySymbol, getLocaleConfig } from '../../utils/formatters';

export interface StatementRow {
  id: string;
  label: string;
  level: number; // 0 = top level, 1 = child, 2 = grandchild, etc.
  isGroup?: boolean; // If true, this row can be expanded/collapsed
  isTotal?: boolean; // If true, this is a total row (bold)
  values: (number | null)[]; // Array of values for each year/period
  children?: StatementRow[]; // Child rows for grouping
}

interface StatementTableProps {
  rows: StatementRow[];
  columnHeaders: string[]; // e.g., ['Year 1', 'Year 2', ...]
  currencySymbol?: string;
  showNegativeInParentheses?: boolean; // If true, show (500) instead of -500
}

/**
 * Get text color for a value (red if negative)
 */
function getValueColor(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'var(--text-secondary)';
  }
  if (value < 0) {
    return 'var(--danger)';
  }
  return 'var(--text-primary)';
}

export function StatementTable({
  rows,
  columnHeaders,
  currencySymbol,
  showNegativeInParentheses = true,
}: StatementTableProps) {
  const { t, language } = useTranslation();
  const { locale } = getLocaleConfig(language);
  const resolvedCurrencySymbol = currencySymbol ?? getCurrencySymbol(language);

  // Groups are collapsed by default (empty set means nothing is expanded)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  /**
   * Format a number as currency using the current locale
   */
  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '—';
    }

    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absValue);

    if (showNegativeInParentheses && value < 0) {
      return `(${resolvedCurrencySymbol}${formatted})`;
    }

    return `${value < 0 ? '-' : ''}${resolvedCurrencySymbol}${formatted}`;
  };

  /**
   * Flatten rows with visibility based on expanded state
   */
  const flattenRows = (rows: StatementRow[], parentExpanded: boolean = true): StatementRow[] => {
    const result: StatementRow[] = [];

    for (const row of rows) {
      if (parentExpanded) {
        result.push(row);
      }

      if (row.children && row.children.length > 0) {
        const isExpanded = expandedRows.has(row.id);
        const childRows = flattenRows(row.children, parentExpanded && isExpanded);
        if (parentExpanded) {
          result.push(...childRows);
        }
      }
    }

    return result;
  };

  const visibleRows = flattenRows(rows);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <DataTable
        stickyHeader={true}
        hover={true}
        striped={true}
        condensed={true}
        className="statement-table"
      >
        <thead>
          <tr>
            <th
              style={{
                position: 'sticky',
                left: 0,
                zIndex: 20,
                backgroundColor: 'var(--surface-hover)',
                minWidth: '250px',
              }}
            >
              {t('common.description')}
            </th>
            {columnHeaders.map((header, idx) => (
              <th
                key={idx}
                className="numeric"
                style={{
                  minWidth: '120px',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const isExpanded = expandedRows.has(row.id);
            const hasChildren = row.children && row.children.length > 0;
            const indent = row.level * 24;

            return (
              <tr
                key={row.id}
                className={row.isTotal ? 'statement-row-total' : row.level === 0 ? 'statement-row-header' : 'statement-row-data'}
                style={{
                  backgroundColor: row.isTotal ? 'var(--surface-hover)' : 'transparent',
                }}
              >
                <td
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 10,
                    backgroundColor: row.isTotal ? 'var(--surface-hover)' : 'var(--surface)',
                    paddingLeft: `${0.75 + indent / 16}rem`,
                    fontWeight: row.isTotal ? 700 : row.level === 0 ? 600 : 400,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {hasChildren && (
                      <button
                        onClick={() => toggleRow(row.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          padding: 0,
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>
                    )}
                    {!hasChildren && <span style={{ width: '20px', display: 'inline-block' }} />}
                    <span>{row.label}</span>
                  </div>
                </td>
                {row.values.map((value, idx) => (
                  <td
                    key={idx}
                    className="numeric"
                    style={{
                      fontWeight: row.isTotal ? 700 : 400,
                      color: getValueColor(value),
                    }}
                  >
                    {formatValue(value)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </DataTable>
      <style>{`
        .statement-table {
          width: 100%;
          font-family: var(--font-body, 'Montserrat', sans-serif);
        }
        .statement-table th {
          font-family: var(--font-body, 'Montserrat', sans-serif);
          font-size: var(--font-body-small, 0.875rem);
        }
        .statement-table td {
          font-family: var(--font-body, 'Montserrat', sans-serif);
          font-size: var(--font-body-size, 1rem);
        }
        .statement-table h1,
        .statement-table h2,
        .statement-table h3 {
          font-family: var(--font-display, 'Josefin Sans', sans-serif);
        }
        .statement-table tbody tr:hover {
          background-color: var(--surface-hover);
        }
        .statement-table tbody tr:hover td:first-child {
          background-color: var(--surface-hover);
        }
        /* Subtotal rows: Top border + Bold */
        .statement-table tbody tr.statement-row-total {
          border-top: 2px solid var(--border, #e2e8f0);
        }
        /* Header rows: Bold */
        .statement-table tbody tr.statement-row-header td:first-child {
          font-weight: 600;
        }
        /* Data rows: Normal */
        .statement-table tbody tr.statement-row-data {
          font-weight: 400;
        }
      `}</style>
    </div>
  );
}

