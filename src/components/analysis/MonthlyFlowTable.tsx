import { useMemo } from 'react';
import { DataTable } from '../ui/DataTable';
import type { MonthlyCashFlow, MonthlyDebtKpi, CovenantStatus } from '../../domain/types';
import { useTranslation } from '../../contexts/LanguageContext';
import { formatCurrency, formatPercent, type SupportedLocale } from '../../utils/formatters';

interface MonthlyFlowTableProps {
  monthlyCashFlow: MonthlyCashFlow[];
  monthlyDebtKpis?: MonthlyDebtKpi[];
  covenantStatus?: CovenantStatus[];
}

function formatMonthLabel(yearIndex: number, monthIndex: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Y${yearIndex + 1} ${months[monthIndex]}`;
}

function hasBreach(monthNumber: number, covenantStatus?: CovenantStatus[]): boolean {
  if (!covenantStatus) return false;
  return covenantStatus.some(status => status.monthNumber === monthNumber && !status.passed);
}

export function MonthlyFlowTable({
  monthlyCashFlow,
  monthlyDebtKpis = [],
  covenantStatus = []
}: MonthlyFlowTableProps) {
  const { t, language } = useTranslation();
  const lang = language as SupportedLocale;

  // Merge monthly cash flow with debt KPIs
  const tableData = useMemo(() => {
    return monthlyCashFlow.map(flow => {
      const kpi = monthlyDebtKpis.find(k => k.monthNumber === flow.monthNumber);
      return {
        ...flow,
        dscr: kpi?.dscr ?? null,
        ltv: kpi?.ltv ?? null,
        hasBreach: hasBreach(flow.monthNumber, covenantStatus),
      };
    });
  }, [monthlyCashFlow, monthlyDebtKpis, covenantStatus]);

  // Limit to first 60 months for performance
  const displayData = tableData.slice(0, 60);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('liquidity.monthlyFlow')}</h3>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>
          {t('common.showing')} {displayData.length} {t('common.of')} {monthlyCashFlow.length} {t('common.months')}
        </span>
      </div>

      <DataTable
        striped
        hover={false}
        maxHeight="600px"
        minWidth="1200px"
      >
        <thead>
          <tr>
            <th className="text" style={{
              position: 'sticky',
              left: 0,
              backgroundColor: 'var(--surface-hover, #f1f5f9)',
              zIndex: 11,
              minWidth: '100px',
            }}>
              {t('common.month')}
            </th>
            <th className="numeric" style={{ minWidth: '120px' }}>{t('pnl.noi')}</th>
            <th className="numeric" style={{ minWidth: '120px' }}>{t('financial.debtService')}</th>
            <th className="numeric" style={{ minWidth: '120px' }}>Capex</th>
            <th className="numeric" style={{ minWidth: '120px' }}>{t('pnl.cashFlow')}</th>
            <th className="numeric" style={{ minWidth: '140px' }}>{t('liquidity.chart.cumulativeCash')}</th>
            <th className="numeric" style={{ minWidth: '120px' }}>{t('liquidity.chart.monthlyCashFlow')}</th>
            <th className="numeric" style={{ minWidth: '100px' }}>{t('financial.dscr')}</th>
            <th className="numeric" style={{ minWidth: '100px' }}>{t('financial.ltv')}</th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, index) => {
            const rowBgColor = row.hasBreach ? '#ffebee' : undefined;
            const baseBgColor = index % 2 === 0 ? 'white' : 'var(--surface-hover, #f1f5f9)';
            const stickyBgColor = rowBgColor || baseBgColor;
            return (
              <tr
                key={index}
                style={{
                  backgroundColor: rowBgColor,
                }}
                onMouseEnter={(e) => {
                  if (!row.hasBreach) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-hover, #f1f5f9)';
                    const firstCell = e.currentTarget.querySelector('td:first-child') as HTMLElement;
                    if (firstCell) {
                      firstCell.style.backgroundColor = 'var(--surface-hover, #f1f5f9)';
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (!row.hasBreach) {
                    e.currentTarget.style.backgroundColor = rowBgColor || '';
                    const firstCell = e.currentTarget.querySelector('td:first-child') as HTMLElement;
                    if (firstCell) {
                      firstCell.style.backgroundColor = stickyBgColor;
                    }
                  }
                }}
              >
                <td
                  className="text"
                  style={{
                    position: 'sticky',
                    left: 0,
                    backgroundColor: stickyBgColor,
                    zIndex: 1,
                    borderRight: '1px solid var(--border, #e2e8f0)',
                    fontWeight: 500,
                  }}
                >
                  {formatMonthLabel(row.yearIndex, row.monthIndex)}
                  {row.hasBreach && (
                    <span style={{
                      marginLeft: '0.5rem',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      {t('liquidity.status.breach').toUpperCase()}
                    </span>
                  )}
                </td>
                <td className="numeric">{formatCurrency(row.noi, lang)}</td>
                <td className="numeric">{formatCurrency(row.debtService, lang)}</td>
                <td className="numeric">{formatCurrency(row.maintenanceCapex, lang)}</td>
                <td className="numeric" style={{
                  fontWeight: 600,
                  color: row.monthlyCashFlow < 0 ? '#f44336' : '#4CAF50',
                }}>
                  {formatCurrency(row.monthlyCashFlow, lang)}
                </td>
                <td className="numeric" style={{
                  fontWeight: 500,
                  color: row.cumulativeCashFlow < 0 ? '#f44336' : '#2196F3',
                }}>
                  {formatCurrency(row.cumulativeCashFlow, lang)}
                </td>
                <td className="numeric" style={{
                  fontWeight: 500,
                  color: row.cashPosition < 0 ? '#f44336' : '#2196F3',
                }}>
                  {formatCurrency(row.cashPosition, lang)}
                </td>
                <td className="numeric">
                  {row.dscr !== null ? row.dscr.toFixed(2) : 'N/A'}
                </td>
                <td className="numeric">
                  {formatPercent(row.ltv, lang)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </div>
  );
}
