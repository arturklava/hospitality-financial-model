import type { WaterfallResult } from '@domain/types';

interface WaterfallPanelProps {
  waterfallResult: WaterfallResult;
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
 * Formats a number as a percentage.
 */
function formatPercent(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(2)}%`;
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
 * Checks if the waterfall invariant is satisfied for all years.
 * Invariant: |sum(partner CFs) - owner CF| ≤ 0.01
 */
function checkWaterfallInvariant(waterfallResult: WaterfallResult): boolean {
  const tolerance = 0.01;
  for (const row of waterfallResult.annualRows) {
    const ownerCF = row.ownerCashFlow;
    const sumPartners = Object.values(row.partnerDistributions).reduce(
      (sum, cf) => sum + cf,
      0
    );
    const difference = Math.abs(ownerCF - sumPartners);
    if (difference > tolerance) {
      return false;
    }
  }
  return true;
}

export function WaterfallPanel({ waterfallResult }: WaterfallPanelProps) {
  const invariantSatisfied = checkWaterfallInvariant(waterfallResult);

  return (
    <div className="waterfall-panel card">
      <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Equity Waterfall</h2>

      {!invariantSatisfied && (
        <div className="waterfall-warning" style={{ color: 'orange', fontWeight: 'bold', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          ⚠️ Warning: Waterfall invariant violation detected (partner CFs do not sum to owner CF)
        </div>
      )}
      {invariantSatisfied && (
        <div className="waterfall-check" style={{ color: 'green', fontWeight: 'bold', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          ✓ Waterfall invariant satisfied
        </div>
      )}

      <div className="partner-kpis">
        <h3 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Partner KPIs</h3>
        <table style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          <thead>
            <tr>
              <th style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>Partner</th>
              <th style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>IRR</th>
              <th style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>MOIC</th>
            </tr>
          </thead>
          <tbody>
            {waterfallResult.partners.map((partner) => (
              <tr key={partner.partnerId}>
                <td style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{partner.partnerId.toUpperCase()}</td>
                <td style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{formatPercent(partner.irr)}</td>
                <td style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{formatNumber(partner.moic)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="waterfall-table">
        <h3 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Annual Cash Flows</h3>
        {/* Check if any rows have clawback adjustments */}
        {waterfallResult.annualRows.some(
          (row) => row.clawbackAdjustments && Object.keys(row.clawbackAdjustments).length > 0
        ) && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: '#E3F2FD',
              borderRadius: '4px',
              fontSize: '0.9em',
              color: '#1976D2'
            }}>
              <strong>Note:</strong> This waterfall includes clawback adjustments. Net distributions (after clawback) are shown.
            </div>
          )}
        <table style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          <thead>
            <tr>
              <th style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>Year</th>
              <th style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>Owner CF</th>
              {waterfallResult.partners.map((partner) => (
                <th key={partner.partnerId} style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{partner.partnerId.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waterfallResult.annualRows.map((row) => {
              const hasClawback = row.clawbackAdjustments && Object.keys(row.clawbackAdjustments).length > 0;
              return (
                <tr
                  key={row.yearIndex}
                  style={{
                    backgroundColor: hasClawback ? '#FFF3E0' : undefined,
                  }}
                >
                  <td>{row.yearIndex}</td>
                  <td>{formatCurrency(row.ownerCashFlow)}</td>
                  {waterfallResult.partners.map((partner) => {
                    const distribution = row.partnerDistributions[partner.partnerId] ?? 0;
                    const clawback = row.clawbackAdjustments?.[partner.partnerId] ?? 0;
                    const netDistribution = distribution + clawback; // Clawback is already signed
                    return (
                      <td key={partner.partnerId}>
                        {clawback !== 0 ? (
                          <>
                            <div>{formatCurrency(distribution)}</div>
                            <div style={{
                              fontSize: '0.85em',
                              color: clawback < 0 ? '#F44336' : '#4CAF50'
                            }}>
                              Clawback: {formatCurrency(clawback)}
                            </div>
                            <div style={{
                              fontWeight: 600,
                              marginTop: '0.25rem',
                              fontSize: '0.9em'
                            }}>
                              Net: {formatCurrency(netDistribution)}
                            </div>
                          </>
                        ) : (
                          formatCurrency(distribution)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

