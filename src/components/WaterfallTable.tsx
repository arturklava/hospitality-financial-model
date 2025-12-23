import { useState } from 'react';
import { useAudit } from '../ui/contexts/AuditContext';
import { AuditTooltip, type AuditInfo } from './audit/AuditTooltip';
import { DataTable } from './ui/DataTable';
import type { WaterfallResult } from '@domain/types';
import { formatCurrency } from '../utils/formatters';
import { formatMultiple, formatPercentValue } from '../utils/kpiDisplay';
import { useTranslation } from '../contexts/LanguageContext';

interface WaterfallTableProps {
  waterfall: WaterfallResult;
}

export function WaterfallTable({ waterfall }: WaterfallTableProps) {
  const { isAuditMode } = useAudit();
  const { t, language } = useTranslation();
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
      value: formatCurrency(value, language),
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
        <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('waterfall.title')}</h2>
        <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary, #64748b)' }}>
          {t('waterfall.subtitle')}
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
            <strong>{t('waterfall.clawback')}:</strong> {t('waterfall.clawbackNote')}
          </div>
        )}
        <DataTable striped hover>
          <thead>
            <tr>
              <th className="text">{t('common.year')}</th>
              <th className="numeric" title={t('waterfall.ownerCfTooltip')}>
                {t('waterfall.ownerCf')}
              </th>
              {waterfall.partners.map((partner) => (
                <th
                  key={partner.partnerId}
                  className="numeric"
                  title={`${t('waterfall.distributionTo')} ${partner.partnerId.toUpperCase()}`}
                >
                  {`${partner.partnerId.toUpperCase()} ${t('waterfall.distribution')}`}
                </th>
              ))}
              {hasClawback && <th className="text">{t('waterfall.clawbackAdjustments')}</th>}
            </tr>
          </thead>
          <tbody>
            {waterfall.annualRows.map((row, index) => {
              const hasRowClawback = row.clawbackAdjustments && Object.keys(row.clawbackAdjustments).length > 0;
              const isLastYear = index === waterfall.annualRows.length - 1;
              return (
                <tr
                  key={row.yearIndex}
                  style={{
                    backgroundColor: hasRowClawback ? '#FFF3E0' : undefined,
                    borderLeft: hasRowClawback ? '4px solid var(--warning)' : undefined,
                  }}
                >
                  <td className="text" style={{ whiteSpace: 'nowrap' }}>
                    {row.yearIndex}
                    {isLastYear && hasRowClawback && (
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '2px 4px',
                        backgroundColor: 'var(--warning)',
                        color: 'white',
                        borderRadius: '4px',
                        marginLeft: '0.5rem',
                        textTransform: 'uppercase',
                        fontWeight: 'bold',
                        verticalAlign: 'middle'
                      }}>
                        {t('waterfall.clawback')}
                      </span>
                    )}
                  </td>
                  <td
                    className="numeric"
                    style={auditStyle}
                    onClick={(e) => handleValueClick(
                      row.ownerCashFlow,
                      t('waterfall.ownerCf'),
                      'Owner CF = Levered distributable cash flow passed into waterfall',
                      [
                        { label: t('common.year'), value: `${row.yearIndex}` },
                        { label: t('waterfall.ownerCf'), value: formatCurrency(row.ownerCashFlow, language) },
                      ],
                      e
                    )}
                  >
                    {formatCurrency(row.ownerCashFlow, language)}
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
                            `${partner.partnerId.toUpperCase()} ${t('waterfall.distribution')}`,
                            'Partner Distribution = Owner CF × promote sharing rules',
                            [
                              { label: t('common.partner'), value: partner.partnerId.toUpperCase() },
                              { label: t('waterfall.distribution'), value: formatCurrency(distribution, language) },
                              { label: t('waterfall.ownerCf'), value: formatCurrency(row.ownerCashFlow, language) },
                            ],
                            e
                          )}
                        >
                          {formatCurrency(distribution, language)}
                        </span>
                        {clawback !== 0 && (
                          <span style={{
                            fontSize: '0.85em',
                            color: clawback < 0 ? '#F44336' : '#4CAF50',
                            marginLeft: '0.25rem'
                          }}>
                            ({clawback > 0 ? '+' : ''}{formatCurrency(clawback, language)})
                          </span>
                        )}
                        {clawback !== 0 && (
                          <div style={{ fontSize: '0.75em', color: '#666', marginTop: '0.25rem' }}>
                            Net: {formatCurrency(netDistribution, language)}
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
                              {partnerId.toUpperCase()}: {formatCurrency(amount, language)}
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
          <h3 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('dashboard.keyMetrics')}</h3>
          <DataTable striped hover>
            <thead>
              <tr>
                <th className="text">{t('common.partner')}</th>
                <th className="numeric">{t('financial.irr')}</th>
                <th className="numeric">{t('financial.equityMultiple')}</th>
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
                      `${partner.partnerId.toUpperCase()} ${t('financial.irr')}`,
                      'Partner IRR (levered) calculated from that partner\'s cash flows',
                      [
                        { label: t('common.partner'), value: partner.partnerId.toUpperCase() },
                        { label: t('financial.irr'), value: formatPercentValue(partner.irr) },
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
                      `${partner.partnerId.toUpperCase()} ${t('financial.equityMultiple')}`,
                      'MOIC (x) = Total partner distributions / total partner contributions',
                      [
                        { label: t('common.partner'), value: partner.partnerId.toUpperCase() },
                        { label: t('financial.equityMultiple'), value: formatMultiple(partner.moic) },
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
