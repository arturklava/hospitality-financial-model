/**
 * KPI Scorecard Component (v2.5)
 * 
 * Rich KPI display component with label, value, sparkline, and trend comparison.
 * Uses Card styling from v2.4 design tokens.
 */

import { Sparkline } from './Sparkline';

interface KpiScorecardProps {
  label: string;
  value: string; // Pre-formatted value string (e.g., "$1.5M", "18.5%")
  dataSeries: number[]; // Array of numbers for sparkline (e.g., [100, 120, 115, 140])
  target?: number; // Optional target value for comparison
  trend?: 'up' | 'down' | 'neutral'; // Optional trend override
  comparisonText?: string; // Optional custom comparison text (e.g., "+5% vs Year 1")
  statusDot?: 'success' | 'warning' | 'danger' | 'neutral'; // Optional status indicator
  className?: string;
}

/**
 * Calculates percentage change between first and last value.
 */
function calculateChange(dataSeries: number[]): { value: number; direction: 'up' | 'down' | 'neutral' } | null {
  if (dataSeries.length < 2) return null;
  
  const first = dataSeries[0];
  const last = dataSeries[dataSeries.length - 1];
  
  if (first === 0) return null;
  
  const changePercent = ((last - first) / Math.abs(first)) * 100;
  
  // Use a small threshold to avoid floating point issues
  if (Math.abs(changePercent) < 0.01) {
    return { value: 0, direction: 'neutral' };
  }
  
  return {
    value: Math.abs(changePercent),
    direction: changePercent > 0 ? 'up' : 'down'
  };
}

/**
 * Generates comparison text from data series.
 */
function generateComparisonText(dataSeries: number[], target?: number, customText?: string): string {
  if (customText) return customText;
  
  if (target !== undefined && dataSeries.length > 0) {
    const current = dataSeries[dataSeries.length - 1];
    const diff = current - target;
    const diffPercent = target !== 0 ? (diff / Math.abs(target)) * 100 : 0;
    
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diffPercent.toFixed(1)}% vs Target`;
  }
  
  const change = calculateChange(dataSeries);
  if (change) {
    const sign = change.direction === 'up' ? '+' : '-';
    return `${sign}${change.value.toFixed(1)}% vs Year 1`;
  }
  
  return '';
}

/**
 * Gets status dot color based on status type.
 */
function getStatusDotColor(status?: 'success' | 'warning' | 'danger' | 'neutral'): string {
  switch (status) {
    case 'success':
      return 'var(--success)';
    case 'warning':
      return 'var(--warning)';
    case 'danger':
      return 'var(--danger)';
    default:
      return 'var(--text-muted)';
  }
}

export function KpiScorecard({
  label,
  value,
  dataSeries,
  target,
  trend,
  comparisonText,
  statusDot,
  className = ''
}: KpiScorecardProps) {
  // Calculate trend from data if not provided
  const computedTrend = trend ?? (() => {
    if (dataSeries.length < 2) return 'neutral';
    const first = dataSeries[0];
    const last = dataSeries[dataSeries.length - 1];
    const diff = last - first;
    if (Math.abs(diff) < 0.001) return 'neutral';
    return diff > 0 ? 'up' : 'down';
  })();

  // Generate comparison text
  const displayComparisonText = generateComparisonText(dataSeries, target, comparisonText);

  return (
    <div className={`card ${className}`} style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '180px',
      padding: '1.25rem 1.5rem',
    }}>
      {/* Top: Label + Status Dot */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.5rem',
      }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {label}
        </span>
        {statusDot && (
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusDotColor(statusDot),
            flexShrink: 0,
          }} />
        )}
      </div>

      {/* Middle: Large Value */}
      <div style={{
        fontSize: '1.875rem',
        fontWeight: 700,
        color: 'var(--text-strong)',
        marginBottom: '0.75rem',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.2,
      }}>
        {value}
      </div>

      {/* Bottom: Sparkline + Comparison Text */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginTop: 'auto',
      }}>
        <div style={{ height: '40px', width: '100%' }}>
          <Sparkline 
            data={dataSeries} 
            height={40}
            trend={computedTrend}
          />
        </div>
        {displayComparisonText && (
          <div style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            <span style={{
              color: computedTrend === 'up' 
                ? 'var(--success)' 
                : computedTrend === 'down' 
                  ? 'var(--danger)' 
                  : 'var(--text-muted)',
              fontWeight: 500,
            }}>
              {computedTrend === 'up' ? '↑' : computedTrend === 'down' ? '↓' : '→'}
            </span>
            {displayComparisonText}
          </div>
        )}
      </div>
    </div>
  );
}

