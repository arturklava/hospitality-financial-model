/**
 * Metric Card Component (v3.1)
 * 
 * Specialized card for displaying WACC, LTV, and other capital metrics.
 * Features micro-sparkline, trend indicator, and conditional color coding.
 */

import { Sparkline } from '../dashboard/Sparkline';
import { formatPercent } from '../../utils/formatters';

interface MetricCardProps {
  label: string;
  value: number; // Raw numeric value (will be formatted as percentage)
  dataSeries?: number[]; // Optional time series for sparkline
  previousValue?: number; // Optional previous value for trend comparison
  threshold?: number; // Optional threshold for conditional coloring (e.g., LTV > 70%)
  thresholdColor?: 'amber' | 'danger' | 'warning'; // Color when threshold exceeded
  className?: string;
}

/**
 * Determines if value exceeds threshold and returns appropriate color.
 */
function getValueColor(
  value: number,
  threshold?: number,
  thresholdColor?: 'amber' | 'danger' | 'warning'
): string {
  if (threshold !== undefined && value > threshold) {
    switch (thresholdColor) {
      case 'amber':
        return 'var(--color-chart-amber)';
      case 'danger':
        return 'var(--danger)';
      case 'warning':
        return 'var(--warning)';
      default:
        return 'var(--color-chart-amber)';
    }
  }
  return 'var(--text-primary)';
}

/**
 * Calculates trend indicator from previous value.
 */
function getTrendIndicator(current: number, previous?: number): {
  direction: 'up' | 'down' | 'neutral';
  change: number;
} | null {
  if (previous === undefined || previous === 0) return null;
  
  const change = ((current - previous) / previous) * 100;
  const absChange = Math.abs(change);
  
  if (absChange < 0.01) {
    return { direction: 'neutral', change: 0 };
  }
  
  return {
    direction: change > 0 ? 'up' : 'down',
    change: Math.abs(change),
  };
}

export function MetricCard({
  label,
  value,
  dataSeries = [],
  previousValue,
  threshold,
  thresholdColor = 'amber',
  className = '',
}: MetricCardProps) {
  const valueColor = getValueColor(value, threshold, thresholdColor);
  const trend = getTrendIndicator(value, previousValue);
  
  // Determine sparkline trend
  const sparklineTrend = dataSeries.length >= 2
    ? (dataSeries[dataSeries.length - 1] > dataSeries[0] ? 'up' : 'down')
    : trend?.direction || 'neutral';

  return (
    <div 
      className={`card ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '180px',
        padding: '1.25rem 1.5rem',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
    >
      {/* Top: Label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.5rem',
      }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {label}
        </span>
        {threshold !== undefined && value > threshold && (
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: valueColor,
            flexShrink: 0,
          }} />
        )}
      </div>

      {/* Middle: Large Value */}
      <div style={{
        fontSize: '1.875rem',
        fontWeight: 700,
        color: '#d4af37', /* v4.2: Gold color for metric values */
        marginBottom: '0.75rem',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.2,
        transition: 'color 0.2s',
      }}>
        {formatPercent(value)}
      </div>

      {/* Bottom: Sparkline + Trend Indicator */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginTop: 'auto',
      }}>
        {/* Sparkline */}
        {dataSeries.length > 0 ? (
          <div style={{ height: '40px', width: '100%' }}>
            <Sparkline 
              data={dataSeries} 
              height={40}
              trend={sparklineTrend}
            />
          </div>
        ) : (
          <div style={{ 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
          }}>
            No trend data
          </div>
        )}
        
        {/* Trend Indicator */}
        {trend && (
          <div style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            <span style={{
              color: trend.direction === 'up' 
                ? 'var(--success)' 
                : trend.direction === 'down' 
                  ? 'var(--danger)' 
                  : 'var(--text-muted)',
              fontWeight: 500,
            }}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
            </span>
            <span>
              {trend.direction === 'up' ? '+' : ''}{trend.change.toFixed(1)}% vs Previous
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
