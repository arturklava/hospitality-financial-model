import type { DebtSchedule, DebtKpi } from '@domain/types';

interface DebtSummaryPanelProps {
  debtSchedule: DebtSchedule;
  debtKpis?: DebtKpi[];
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

/**
 * Formats a number as a percentage.
 */
function formatPercent(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function DebtSummaryPanel({ debtSchedule, debtKpis }: DebtSummaryPanelProps) {
  // Check if there's any debt (non-zero entries)
  const hasDebt = debtSchedule.entries.some(
    (entry) => entry.beginningBalance > 0 || entry.interest > 0 || entry.principal > 0
  );

  if (!hasDebt) {
    return (
      <div className="debt-summary-panel card">
        <h2>Debt Schedule</h2>
        <p>No debt in this scenario.</p>
      </div>
    );
  }

  // Show first 5 years or all years if less than 5
  const displayYears = debtSchedule.entries.slice(0, 5);

  return (
    <div className="debt-summary-panel card">
      <h2>Debt Schedule</h2>
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>Beginning Balance</th>
            <th>Interest</th>
            <th>Principal</th>
            <th>Ending Balance</th>
          </tr>
        </thead>
        <tbody>
          {displayYears.map((entry) => (
            <tr key={entry.yearIndex}>
              <td>{entry.yearIndex}</td>
              <td>{formatCurrency(entry.beginningBalance)}</td>
              <td>{formatCurrency(entry.interest)}</td>
              <td>{formatCurrency(entry.principal)}</td>
              <td>{formatCurrency(entry.endingBalance)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {debtKpis && debtKpis.length > 0 && (
        <div className="debt-kpis">
          <h3>Debt KPIs</h3>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>DSCR</th>
                <th>LTV</th>
              </tr>
            </thead>
            <tbody>
              {debtKpis.slice(0, 5).map((kpi) => (
                <tr key={kpi.yearIndex}>
                  <td>{kpi.yearIndex}</td>
                  <td>{formatNumber(kpi.dscr)}</td>
                  <td>{formatPercent(kpi.ltv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

