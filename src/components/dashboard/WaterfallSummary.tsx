/**
 * Waterfall Summary Component (v4.2)
 * 
 * Simplified card showing key waterfall metrics: LP/GP IRR and MOIC.
 */

import type { WaterfallResult } from '../../domain/types';
import { formatCurrency } from '../../utils/formatters';
import { formatMultiple, formatPercentValue } from '../../utils/kpiDisplay';

interface WaterfallSummaryProps {
  waterfall: WaterfallResult;
}

export function WaterfallSummary({ waterfall }: WaterfallSummaryProps) {
  // Get LP and GP partners (or first two partners if no LP/GP distinction)
  const lpPartner = waterfall.partners.find(p => 
    p.partnerId.toLowerCase().includes('lp') || p.partnerId.toLowerCase() === 'lp'
  ) ?? waterfall.partners[0];
  
  const gpPartner = waterfall.partners.find(p => 
    (p.partnerId.toLowerCase().includes('gp') || p.partnerId.toLowerCase() === 'gp') && 
    p.partnerId !== lpPartner?.partnerId
  ) ?? waterfall.partners[1];

  // Calculate total distributions
  const totalDistributions = waterfall.annualRows.reduce((sum, row) => {
    return sum + Object.values(row.partnerDistributions).reduce((rowSum, dist) => rowSum + Math.max(0, dist), 0);
  }, 0);

  return (
    <div className="card" style={{
      padding: '1.5rem',
      backgroundColor: 'var(--surface, #ffffff)',
      border: '1px solid var(--border, #e2e8f0)',
      borderRadius: 'var(--radius, 8px)',
    }}>
      <h3 style={{
        margin: 0,
        marginBottom: '1.5rem',
        fontSize: '1.125rem',
        fontWeight: 600,
        color: 'var(--text-primary, #1e293b)',
      }}>
        Equity Waterfall Summary
      </h3>
      <p style={{ marginTop: '-0.5rem', color: 'var(--text-secondary, #64748b)' }}>
        Partner metrics are levered cash flows after the promote; currency values are in project dollars.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* LP Metrics */}
        {lpPartner && (
          <div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary, #64748b)',
              marginBottom: '0.75rem',
            }}>
              {lpPartner.partnerId.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary, #64748b)',
                  marginBottom: '0.25rem',
                }}>
                  IRR (levered)
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--text-primary, #1e293b)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatPercentValue(lpPartner.irr, 1)}
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary, #64748b)',
                  marginBottom: '0.25rem',
                }}>
                  MOIC (x)
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--text-primary, #1e293b)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatMultiple(lpPartner.moic)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GP Metrics */}
        {gpPartner && (
          <div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary, #64748b)',
              marginBottom: '0.75rem',
            }}>
              {gpPartner.partnerId.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary, #64748b)',
                  marginBottom: '0.25rem',
                }}>
                  IRR (levered)
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--text-primary, #1e293b)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatPercentValue(gpPartner.irr, 1)}
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary, #64748b)',
                  marginBottom: '0.25rem',
                }}>
                  MOIC (x)
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--text-primary, #1e293b)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatMultiple(gpPartner.moic)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Distributions */}
        <div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary, #64748b)',
            marginBottom: '0.75rem',
          }}>
            Total Distributions
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary, #1e293b)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatCurrency(totalDistributions)}
          </div>
        </div>
      </div>
    </div>
  );
}

