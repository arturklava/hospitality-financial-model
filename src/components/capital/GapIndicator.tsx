/**
 * Gap Indicator Component (v3.1)
 * 
 * Visual bar showing if (Debt + Equity) matches (Investment).
 * Displays funding gap or overfunding status.
 */

import { formatCurrency } from '../../utils/formatters';

interface GapIndicatorProps {
  totalCapital: number; // Debt + Equity
  totalInvestment: number; // Required investment
  className?: string;
}

/**
 * Calculates funding gap/overfunding.
 * Returns positive value for gap (shortfall), negative for overfunding.
 */
function calculateGap(capital: number, investment: number): number {
  return investment - capital;
}

export function GapIndicator({
  totalCapital,
  totalInvestment,
  className = '',
}: GapIndicatorProps) {
  const gap = calculateGap(totalCapital, totalInvestment);
  const gapPercent = totalInvestment > 0 
    ? Math.abs((gap / totalInvestment) * 100) 
    : 0;
  
  const isGap = gap > 0;
  const isOverfunded = gap < 0;
  const isBalanced = Math.abs(gap) < 1; // Within $1 tolerance

  // Determine colors
  const barColor = isGap 
    ? 'var(--color-chart-rose)' // Red for gap
    : isOverfunded 
      ? 'var(--color-chart-amber)' // Amber for overfunding
      : 'var(--success)'; // Green for balanced

  const textColor = isGap
    ? 'var(--danger)'
    : isOverfunded
      ? 'var(--warning)'
      : 'var(--success)';

  // Calculate bar widths
  const capitalPercent = totalInvestment > 0 
    ? (totalCapital / totalInvestment) * 100 
    : 0;
  const gapPercentBar = Math.min(gapPercent, 100);

  return (
    <div 
      className={`card ${className}`}
      style={{
        padding: '1.5rem',
      }}
    >
      <div style={{
        marginBottom: '1rem',
      }}>
        <h3 style={{
          margin: 0,
          marginBottom: '0.5rem',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          Funding Status
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.5rem',
        }}>
          <span style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: textColor,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {isGap 
              ? `Funding Gap: ${formatCurrency(gap)}`
              : isOverfunded
                ? `Overfunded: ${formatCurrency(Math.abs(gap))}`
                : 'Fully Funded'}
          </span>
          {!isBalanced && (
            <span style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              ({gapPercent.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>

      {/* Visual Bar */}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: 'var(--surface-hover)',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '0.75rem',
      }}>
        {/* Capital Bar */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${Math.min(capitalPercent, 100)}%`,
          backgroundColor: isBalanced 
            ? 'var(--success)' 
            : isOverfunded 
              ? 'var(--color-chart-amber)'
              : 'var(--color-chart-blue)',
          transition: 'width 0.3s ease-out',
        }} />
        
        {/* Gap/Overfunding Indicator */}
        {!isBalanced && (
          <div style={{
            position: 'absolute',
            left: `${Math.min(capitalPercent, 100)}%`,
            top: 0,
            height: '100%',
            width: `${gapPercentBar}%`,
            backgroundColor: barColor,
            transition: 'width 0.3s ease-out',
            opacity: 0.8,
          }} />
        )}
      </div>

      {/* Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        fontSize: '0.875rem',
      }}>
        <div>
          <div style={{
            color: 'var(--text-secondary)',
            marginBottom: '0.25rem',
          }}>
            Required Investment
          </div>
          <div style={{
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatCurrency(totalInvestment)}
          </div>
        </div>
        <div>
          <div style={{
            color: 'var(--text-secondary)',
            marginBottom: '0.25rem',
          }}>
            Total Capital
          </div>
          <div style={{
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatCurrency(totalCapital)}
          </div>
        </div>
      </div>
    </div>
  );
}

