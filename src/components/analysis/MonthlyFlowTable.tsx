/**
 * Monthly Flow Table Component (v2.2: Liquidity Dashboard)
 * 
 * Displays monthly liquidity data in a scrollable table (1-60 months).
 * Shows NOI, Debt Service, Capex, Cash Flow, Cumulative Cash Flow, Cash Position, DSCR, LTV.
 * Highlights breach months with red background.
 */

import { useMemo } from 'react';
import { DataTable } from '../ui/DataTable';
import type { MonthlyCashFlow, MonthlyDebtKpi, CovenantStatus } from '../../domain/types';

interface MonthlyFlowTableProps {
  monthlyCashFlow: MonthlyCashFlow[];
  monthlyDebtKpis?: MonthlyDebtKpi[];
  covenantStatus?: CovenantStatus[];
}

/**
 * Format month label.
 */
function formatMonthLabel(yearIndex: number, monthIndex: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Y${yearIndex + 1} ${months[monthIndex]}`;
}

/**
 * Format currency value.
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
 * Format percentage.
 */
function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Check if a month has any covenant breaches.
 */
function hasBreach(monthNumber: number, covenantStatus?: CovenantStatus[]): boolean {
  if (!covenantStatus) return false;
  return covenantStatus.some(status => status.monthNumber === monthNumber && !status.passed);
}

export function MonthlyFlowTable({ 
  monthlyCashFlow, 
  monthlyDebtKpis = [], 
  covenantStatus = [] 
}: MonthlyFlowTableProps) {
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
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Monthly Liquidity Flow</h3>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>
          Showing {displayData.length} of {monthlyCashFlow.length} months
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
              Month
            </th>
            <th className="numeric" style={{ minWidth: '120px' }}>NOI</th>
            <th className="numeric" style={{ minWidth: '120px' }}>Debt Service</th>
            <th className="numeric" style={{ minWidth: '120px' }}>Capex</th>
            <th className="numeric" style={{ minWidth: '120px' }}>Cash Flow</th>
            <th className="numeric" style={{ minWidth: '140px' }}>Cumulative Cash</th>
            <th className="numeric" style={{ minWidth: '120px' }}>Cash Position</th>
            <th className="numeric" style={{ minWidth: '100px' }}>DSCR</th>
            <th className="numeric" style={{ minWidth: '100px' }}>LTV</th>
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
                    // Update sticky column background on hover
                    const firstCell = e.currentTarget.querySelector('td:first-child') as HTMLElement;
                    if (firstCell) {
                      firstCell.style.backgroundColor = 'var(--surface-hover, #f1f5f9)';
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (!row.hasBreach) {
                    e.currentTarget.style.backgroundColor = rowBgColor || '';
                    // Restore sticky column background
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
                      BREACH
                    </span>
                  )}
                </td>
                <td className="numeric">{formatCurrency(row.noi)}</td>
                <td className="numeric">{formatCurrency(row.debtService)}</td>
                <td className="numeric">{formatCurrency(row.maintenanceCapex)}</td>
                <td className="numeric" style={{ 
                  fontWeight: 600,
                  color: row.monthlyCashFlow < 0 ? '#f44336' : '#4CAF50',
                }}>
                  {formatCurrency(row.monthlyCashFlow)}
                </td>
                <td className="numeric" style={{ 
                  fontWeight: 500,
                  color: row.cumulativeCashFlow < 0 ? '#f44336' : '#2196F3',
                }}>
                  {formatCurrency(row.cumulativeCashFlow)}
                </td>
                <td className="numeric" style={{ 
                  fontWeight: 500,
                  color: row.cashPosition < 0 ? '#f44336' : '#2196F3',
                }}>
                  {formatCurrency(row.cashPosition)}
                </td>
                <td className="numeric">
                  {row.dscr !== null ? row.dscr.toFixed(2) : 'N/A'}
                </td>
                <td className="numeric">
                  {formatPercent(row.ltv)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </div>
  );
}

