import type { DebtSchedule, DebtKpi } from '@domain/types';
import { formatCurrency, formatPercent, getLocaleConfig, type SupportedLocale } from '../utils/formatters';
import { useTranslation } from '../contexts/LanguageContext';

interface DebtSummaryPanelProps {
  debtSchedule: DebtSchedule;
  debtKpis?: DebtKpi[];
}

export function DebtSummaryPanel({ debtSchedule, debtKpis }: DebtSummaryPanelProps) {
  const { t, language } = useTranslation();
  const lang = language as SupportedLocale;
  const { currency } = getLocaleConfig(lang);

  // Check if there's any debt (non-zero entries)
  const hasDebt = debtSchedule.entries.some(
    (entry) => entry.beginningBalance > 0 || entry.interest > 0 || entry.principal > 0
  );

  if (!hasDebt) {
    return (
      <div className="debt-summary-panel card">
        <h2>{t('capital.debtManagement')}</h2>
        <p>{t('capital.noTranches')}</p>
      </div>
    );
  }

  // Show first 5 years or all years if less than 5
  const displayYears = debtSchedule.entries.slice(0, 5);

  return (
    <div className="debt-summary-panel card">
      <h2>{t('capital.debtManagement')} ({currency})</h2>
      <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary, #64748b)' }}>
        {t('capital.simulateUnleveredDesc')}
      </p>
      <table>
        <thead>
          <tr>
            <th>{t('common.year')}</th>
            <th title={t('capital.tooltips.beginningBalance')}>{t('capital.table.beginningBalance')}</th>
            <th title={t('capital.tooltips.interest')}>{t('capital.interest')}</th>
            <th title={t('capital.tooltips.amortization')}>{t('capital.amortization')}</th>
            <th title={t('capital.tooltips.endingBalance')}>{t('capital.table.endingBalance')}</th>
          </tr>
        </thead>
        <tbody>
          {displayYears.map((entry) => (
            <tr key={entry.yearIndex}>
              <td>{entry.yearIndex}</td>
              <td>{formatCurrency(entry.beginningBalance, lang)}</td>
              <td>{formatCurrency(entry.interest, lang)}</td>
              <td>{formatCurrency(entry.principal, lang)}</td>
              <td>{formatCurrency(entry.endingBalance, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {debtKpis && debtKpis.length > 0 && (
        <div className="debt-kpis">
          <h3>{t('dashboard.keyMetrics')}</h3>
          <table>
            <thead>
              <tr>
                <th>{t('common.year')}</th>
                <th title={t('financial.tooltips.averageDscr')}>{t('financial.dscr')} (x)</th>
                <th title={t('financial.tooltips.maxLtv')}>{t('financial.ltv')} (%)</th>
              </tr>
            </thead>
            <tbody>
              {debtKpis.slice(0, 5).map((kpi) => (
                <tr key={kpi.yearIndex}>
                  <td>{kpi.yearIndex}</td>
                  <td>{kpi.dscr !== null ? kpi.dscr.toFixed(2) : '-'}</td>
                  <td>{formatPercent(kpi.ltv, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
