import type { DebtSchedule, DebtKpi } from '@domain/types';
import { formatCurrency } from '../utils/formatters';
import { formatNumberValue, formatPercentValue, KPI_TOOLTIPS } from '../utils/kpiDisplay';

interface DebtSummaryPanelProps {
  debtSchedule: DebtSchedule;
  debtKpis?: DebtKpi[];
}

export function DebtSummaryPanel({ debtSchedule, debtKpis }: DebtSummaryPanelProps) {
  // Check if there's any debt (non-zero entries)
  const hasDebt = debtSchedule.entries.some(
    (entry) => entry.beginningBalance > 0 || entry.interest > 0 || entry.principal > 0
  );

  if (!hasDebt) {
    return (
      <div className="debt-summary-panel card">
        <h2>Debt Schedule (levered)</h2>
        <p>No debt in this scenario.</p>
      </div>
    );
  }

  // Show first 5 years or all years if less than 5
  const displayYears = debtSchedule.entries.slice(0, 5);

  return (
    <div className="debt-summary-panel card">
      <h2>Debt Schedule (USD)</h2>
      <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary, #64748b)' }}>
        Balances and cash outflows reflect levered debt service. DSCR and LTV align with aggregate project debt.
      </p>
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th title="Outstanding balance at start of year">Beginning Balance (USD)</th>
            <th title="Interest paid for the year">Interest (USD)</th>
            <th title="Principal amortized for the year">Principal (USD)</th>
            <th title="Outstanding balance after payments">Ending Balance (USD)</th>
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
          <h3>Debt KPIs (levered)</h3>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th title={KPI_TOOLTIPS.averageDscr}>DSCR (x)</th>
                <th title={KPI_TOOLTIPS.maxLtv}>LTV (%)</th>
              </tr>
            </thead>
            <tbody>
              {debtKpis.slice(0, 5).map((kpi) => (
                <tr key={kpi.yearIndex}>
                  <td>{kpi.yearIndex}</td>
                  <td>{formatNumberValue(kpi.dscr)}</td>
                  <td>{formatPercentValue(kpi.ltv, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

