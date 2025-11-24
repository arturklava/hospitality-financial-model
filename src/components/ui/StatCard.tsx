import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number; // Formatted value (string) or raw number
  trend?: number; // Percentage change (positive = green, negative = red)
  icon?: LucideIcon;
  children?: ReactNode; // Optional chart or additional content
  className?: string;
}

/**
 * StatCard Component (v4.2)
 * 
 * Clean, modern card for displaying KPIs and statistics.
 * Features:
 * - Dominant value display (text-3xl equivalent)
 * - Optional trend indicator (pill badge)
 * - Optional icon
 * - Optional chart/children content
 * - Floating shadow on hover (for active cards)
 */
export function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  children,
  className = '',
}: StatCardProps) {
  const formattedValue = typeof value === 'number' 
    ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : value;

  const trendColor = trend !== undefined
    ? trend >= 0 
      ? 'var(--success)' 
      : 'var(--danger)'
    : undefined;

  const trendSymbol = trend !== undefined
    ? trend >= 0 ? '↑' : '↓'
    : '';

  return (
    <div
      className={`stat-card ${className}`}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-soft)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-floating)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header: Label + Icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}
        >
          {Icon && (
            <Icon
              size={18}
              style={{
                color: 'var(--text-secondary)',
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {label}
          </span>
        </div>
        {trend !== undefined && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: trendColor 
                ? (trend >= 0 
                    ? 'rgba(16, 185, 129, 0.1)' 
                    : 'rgba(239, 68, 68, 0.1)')
                : 'transparent',
              color: trendColor || 'var(--text-secondary)',
            }}
          >
            <span>{trendSymbol}</span>
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </span>
        )}
      </div>

      {/* Value: Dominant Display */}
      <div
        style={{
          fontSize: '1.875rem', // text-3xl equivalent (30px)
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.2,
        }}
      >
        {formattedValue}
      </div>

      {/* Optional Chart/Children */}
      {children && (
        <div
          style={{
            marginTop: 'var(--space-sm)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

