import { useState } from 'react';
import { useAudit } from '../ui/contexts/AuditContext';
import { AuditTooltip, type AuditInfo } from './audit/AuditTooltip';
import { DataTable } from './ui/DataTable';
import type { WaterfallResult } from '@domain/types';
import { formatCurrency } from '../utils/formatters';
import { formatMultiple, formatPercentValue } from '../utils/kpiDisplay';

interface WaterfallTableProps {
  waterfall: WaterfallResult;
}

export function WaterfallTable({ waterfall }: WaterfallTableProps) {
  const { isAuditMode } = useAudit();
  const [auditInfo, setAuditInfo] = useState<AuditInfo | null>(null);
  const [auditPosition, setAuditPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  // Check if any rows have clawback adjustments
  const hasClawback = waterfall.annualRows.some(
    (row) => row.clawbackAdjustments && Object.keys(row.clawbackAdjustments).length > 0
  );

  const handleValueClick = (
    value: number,
    _label: string,
    formula: string,
    inputs: Array<{ label: string; value: string }>,
    event: React.MouseEvent
  ) => {
    if (!isAuditMode) return;

    setAuditInfo({
      value: formatCurrency(value),
      formula,
      inputs,
    });
    setAuditPosition({ x: event.clientX, y: event.clientY });
  };

  const handleCloseAudit = () => {
    setAuditInfo(null);
    setAuditPosition(undefined);
  };

  const auditStyle = isAuditMode
    ? {
      textDecoration: 'underline',
      textDecorationStyle: 'dashed' as const,
      textDecorationColor: '#9C27B0',
      cursor: 'pointer',
    }
    : {};

  return (
    <>
      <div className="waterfall-table">
        <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Equity Waterfall</h2>
        <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary, #64748b)' }}>
          Owner cash flow and partner splits are levered distributions from the capital engine. Values shown in project currency.
        </p>
        {hasClawback && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#E3F2FD',
            borderRadius: '4px',
            fontSize: '0.9em',
            color: '#1976D2'
          }}>
            <strong>Note:</strong> This waterfall includes clawback adjustments. Clawback amounts are shown in parentheses in the partner distribution columns.
          </div>
        )}
        <DataTable striped hover>
          <thead>
            <tr>
              <th className="text">Year</th>
              <th className="numeric" title="Levered distributable cash flow before partner splits">Owner CF (levered, USD)</th>
              {waterfall.partners.map((partner) => (
                <th
                  key={partner.partnerId}
                  className="numeric"
                  title={`Distribution to ${partner.partnerId.toUpperCase()} after promotes`}
                >
                  {`${partner.partnerId.toUpperCase()} Distribution (USD)`}
                </th>
              ))}
              {hasClawback && <th className="text">Clawback Adjustments</th>}
            </tr>
          </thead>
          <tbody>
            {waterfall.annualRows.map((row) => {
              const hasRowClawback = row.clawbackAdjustments && Object.keys(row.clawbackAdjustments).length > 0;
              return (
                <tr
                  key={row.yearIndex}
                  style={{
                    backgroundColor: hasRowClawback ? '#FFF3E0' : undefined,
                  }}
                >
                  <td className="text">{row.yearIndex}</td>
                  <td
                    className="numeric"
                    style={auditStyle}
                    onClick={(e) => handleValueClick(
                      row.ownerCashFlow,
                      'Owner Cash Flow (levered)',
                      'Owner CF = Levered distributable cash flow passed into waterfall',
                      [
                        { label: 'Year', value: `${row.yearIndex}` },
                        { label: 'Total Owner CF', value: formatCurrency(row.ownerCashFlow) },
                      ],
                      e
                    )}
                  >
                    {formatCurrency(row.ownerCashFlow)}
                  </td>
                  {waterfall.partners.map((partner) => {
                    const distribution = row.partnerDistributions[partner.partnerId] ?? 0;
                    const clawback = row.clawbackAdjustments?.[partner.partnerId] ?? 0;
                    const netDistribution = distribution + clawback;
                    return (
                      <td key={partner.partnerId} className="numeric">
                        <span
                          style={auditStyle}
                          onClick={(e) => handleValueClick(
                            distribution,
                            `${partner.partnerId.toUpperCase()} Distribution`,
                            'Partner Distribution = Owner CF × promote sharing rules',
                            [
                              { label: 'Partner', value: partner.partnerId.toUpperCase() },
                              { label: 'Distribution', value: formatCurrency(distribution) },
                              { label: 'Owner CF', value: formatCurrency(row.ownerCashFlow) },
                            ],
                            e
                          )}
                        >
                          {formatCurrency(distribution)}
                        </span>
                        {clawback !== 0 && (
                          <span style={{
                            fontSize: '0.85em',
                            color: clawback < 0 ? '#F44336' : '#4CAF50',
                            marginLeft: '0.25rem'
                          }}>
                            ({clawback > 0 ? '+' : ''}{formatCurrency(clawback)})
                          </span>
                        )}
                        {clawback !== 0 && (
                          <div style={{ fontSize: '0.75em', color: '#666', marginTop: '0.25rem' }}>
                            Net: {formatCurrency(netDistribution)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {hasClawback && (
                    <td className="text">
                      {hasRowClawback ? (
                        <div style={{ fontSize: '0.85em' }}>
                          {Object.entries(row.clawbackAdjustments || {}).map(([partnerId, amount]) => (
                            <div key={partnerId} style={{
                              color: amount < 0 ? '#F44336' : '#4CAF50',
                              marginBottom: '0.25rem'
                            }}>
                              {partnerId.toUpperCase()}: {formatCurrency(amount)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.85em' }}>—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </DataTable>
        <div className="waterfall-kpis">
          <h3 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Partner KPIs</h3>
          <DataTable striped hover>
            <thead>
              <tr>
                <th className="text">Partner</th>
                <th className="numeric">IRR (%)</th>
                <th className="numeric">MOIC (x)</th>
              </tr>
            </thead>
            <tbody>
              {waterfall.partners.map((partner) => (
                <tr key={partner.partnerId}>
                  <td className="text">{partner.partnerId.toUpperCase()}</td>
                  <td
                    className="numeric"
                    style={auditStyle}
                    onClick={(e) => handleValueClick(
                      partner.irr ?? 0,
                      `${partner.partnerId.toUpperCase()} IRR`,
                      'Partner IRR (levered) calculated from that partner\'s cash flows',
                      [
                        { label: 'Partner', value: partner.partnerId.toUpperCase() },
                        { label: 'IRR', value: formatPercentValue(partner.irr) },
                      ],
                      e
                    )}
                  >
                    {formatPercentValue(partner.irr)}
                  </td>
                  <td
                    className="numeric"
                    style={auditStyle}
                    onClick={(e) => handleValueClick(
                      partner.moic,
                      `${partner.partnerId.toUpperCase()} MOIC`,
                      'MOIC (x) = Total partner distributions / total partner contributions',
                      [
                        { label: 'Partner', value: partner.partnerId.toUpperCase() },
                        { label: 'MOIC', value: formatMultiple(partner.moic) },
                      ],
                      e
                    )}
                  >
                    {formatMultiple(partner.moic)}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
        {auditInfo && (
          <AuditTooltip
            auditInfo={auditInfo}
            onClose={handleCloseAudit}
            position={auditPosition}
          />
        )}
      </div>
    </>
  );
}

