import { Plus } from 'lucide-react';
import { DataTable } from './ui/DataTable';
import type { DebtSchedule, DebtKpi } from '@domain/types';

interface DebtTableProps {
  debtSchedule: DebtSchedule;
  debtKpis: DebtKpi[];
  onAddTranche?: () => void;
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
 * Formats a number with 2 decimal places.
 */
function formatNumber(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return value.toFixed(2);
}

export function DebtTable({ debtSchedule, debtKpis, onAddTranche }: DebtTableProps) {
  // Detect refinancing years: when principal equals beginning balance and ending balance is 0
  const refinancingYears = new Set<number>();
  debtSchedule.entries.forEach((entry) => {
    // Refinancing is indicated by: principal payment equals beginning balance AND ending balance is 0
    // (with some tolerance for floating point)
    const isRefinancing = entry.beginningBalance > 0
      && Math.abs(entry.principal - entry.beginningBalance) < 0.01
      && entry.endingBalance < 0.01;
    if (isRefinancing) {
      refinancingYears.add(entry.yearIndex);
    }
  });

  return (
    <div className="debt-table">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Debt Schedule</h2>
        {onAddTranche && (
          <button
            onClick={onAddTranche}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary)';
            }}
          >
            <Plus size={16} />
            Add Tranche
          </button>
        )}
      </div>
      <DataTable striped hover>
        <thead>
          <tr>
            <th className="text">Year</th>
            <th className="numeric">Beginning Balance</th>
            <th className="numeric">Interest</th>
            <th className="numeric">Principal</th>
            <th className="numeric">Debt Service</th>
            <th className="numeric">Ending Balance</th>
            <th className="text">Status</th>
            <th className="numeric">DSCR</th>
            <th className="numeric">LTV</th>
          </tr>
        </thead>
        <tbody>
          {debtSchedule.entries.map((entry, index) => {
            const debtService = entry.interest + entry.principal;
            const kpi = debtKpis[index];
            const isRefinancing = refinancingYears.has(entry.yearIndex);
            return (
              <tr
                key={entry.yearIndex}
                style={{
                  backgroundColor: isRefinancing ? '#FFF3E0' : undefined,
                }}
              >
                <td className="text">{entry.yearIndex}</td>
                <td className="numeric">{formatCurrency(entry.beginningBalance)}</td>
                <td className="numeric">{formatCurrency(entry.interest)}</td>
                <td className="numeric" style={{ 
                  fontWeight: isRefinancing ? 600 : undefined,
                }}>
                  {formatCurrency(entry.principal)}
                  {isRefinancing && ' 🔄'}
                </td>
                <td className="numeric" style={{ 
                  fontWeight: isRefinancing ? 600 : undefined,
                }}>
                  {formatCurrency(debtService)}
                </td>
                <td className="numeric">{formatCurrency(entry.endingBalance)}</td>
                <td className="text">
                  {isRefinancing ? (
                    <span style={{
                      color: '#FF9800',
                      fontWeight: 600,
                      fontSize: '0.9em'
                    }}>
                      Refinanced
                    </span>
                  ) : (
                    <span style={{ color: '#666', fontSize: '0.9em' }}>Active</span>
                  )}
                </td>
                <td className="numeric">{formatNumber(kpi.dscr)}</td>
                <td className="numeric">{kpi.ltv !== null ? `${(kpi.ltv * 100).toFixed(1)}%` : 'N/A'}</td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
      {refinancingYears.size > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#FFF3E0',
          borderRadius: '4px',
          fontSize: '0.9em',
          color: '#666'
        }}>
          <strong>Note:</strong> Years marked with 🔄 indicate refinancing events where the debt was fully repaid.
        </div>
      )}
    </div>
  );
}

