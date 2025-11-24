/**
 * StatCard Component (v4.2)
 * 
 * Modern financial product KPI card with distinct Header, Body, and Footer anatomy.
 * Features integrated sparkline support, enhanced typography contrast, and action support.
 * 
 * Design Philosophy:
 * - Header: Title + Action (optional)
 * - Body: Large value with context
 * - Footer: Trend/Context metadata
 */

import { Sparkline } from './Sparkline';
import type { ReactNode } from 'react';

export interface StatCardProps {
  // Header
  title: string;
  action?: ReactNode; // Optional action button/icon in header
  
  // Body
  value: string | number; // Main value (will be formatted if number)
  valueFormatter?: (val: number) => string; // Custom formatter for numeric values
  subtitle?: string; // Optional subtitle below value
  
  // Footer
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string; // e.g., "+12.5% vs last year"
  sparklineData?: number[]; // Optional sparkline data
  metadata?: string; // Additional context text
  
  // Visual
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'default' | 'large'; // Card size variant
  variant?: 'default' | 'hero' | 'minimal'; // Card style variant (v4.2)
  className?: string;
}

/**
 * Gets status color based on status type.
 */
function getStatusColor(status?: 'success' | 'warning' | 'danger' | 'neutral'): string {
  switch (status) {
    case 'success':
      return 'var(--success, #4CAF50)';
    case 'warning':
      return 'var(--warning, #FF9800)';
    case 'danger':
      return 'var(--danger, #F44336)';
    default:
      return 'var(--text-primary, #1e293b)';
  }
}

/**
 * Gets trend indicator color.
 */
function getTrendColor(trend?: 'up' | 'down' | 'neutral'): string {
  switch (trend) {
    case 'up':
      return 'var(--success, #4CAF50)';
    case 'down':
      return 'var(--danger, #F44336)';
    default:
      return 'var(--text-secondary, #64748b)';
  }
}

/**
 * Formats numeric value with default currency formatter.
 */
function formatValue(value: string | number, formatter?: (val: number) => string): string {
  if (typeof value === 'string') return value;
  if (formatter) return formatter(value);
  
  // Default: currency formatter
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function StatCard({
  title,
  action,
  value,
  valueFormatter,
  subtitle,
  trend,
  trendLabel,
  sparklineData,
  metadata,
  status,
  size = 'default',
  variant = 'default',
  className = '',
}: StatCardProps) {
  const statusColor = getStatusColor(status);
  const trendColor = getTrendColor(trend);
  const formattedValue = formatValue(value, valueFormatter);
  
  // Size variants
  const isLarge = size === 'large';
  const titleSize = isLarge ? '0.8125rem' : '0.75rem';
  const valueSize = isLarge ? '2.25rem' : '1.875rem';
  const padding = isLarge ? '1.5rem' : '1.25rem 1.5rem';
  const minHeight = isLarge ? '220px' : '180px';
  
  // Variant styles (v4.2)
  const isHero = variant === 'hero';
  const isMinimal = variant === 'minimal';
  
  // Hero variant: larger font, subtle gradient background
  const heroValueSize = isHero ? '2.5rem' : valueSize;
  const heroBackground = isHero 
    ? 'linear-gradient(to bottom, rgba(248, 250, 252, 0.5), rgba(255, 255, 255, 1))'
    : 'var(--surface, #ffffff)';
  
  // Minimal variant: no border, just label and value
  const minimalBorder = isMinimal ? 'none' : '1px solid var(--border, #e2e8f0)';
  const minimalPadding = isMinimal ? '1rem' : padding;

  return (
    <div 
      className={`card ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: isMinimal ? 'auto' : minHeight,
        padding: minimalPadding,
        background: heroBackground,
        border: minimalBorder,
        borderRadius: 'var(--radius, 8px)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: action ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
      }}
    >
      {/* Header: Title + Action */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
      }}>
        <span style={{
          fontSize: titleSize,
          fontWeight: 600,
          color: 'var(--text-secondary, #64748b)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {title}
        </span>
        {action && (
          <div style={{ flexShrink: 0 }}>
            {action}
          </div>
        )}
        {status && status !== 'neutral' && !action && (
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            flexShrink: 0,
          }} />
        )}
      </div>

      {/* Body: Value + Subtitle */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        marginBottom: isMinimal ? '0' : '1rem',
      }}>
        <div style={{
          fontSize: heroValueSize,
          fontWeight: 700,
          color: status && status !== 'neutral' ? statusColor : 'var(--text-primary, #1e293b)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.2,
          marginBottom: subtitle ? '0.5rem' : 0,
        }}>
          {formattedValue}
        </div>
        {subtitle && (
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-secondary, #64748b)',
          }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Footer: Sparkline + Trend/Metadata */}
      {!isMinimal && (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        marginTop: 'auto',
      }}>
        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 ? (
          <div style={{ height: '40px', width: '100%' }}>
            <Sparkline 
              data={sparklineData} 
              height={40}
              trend={trend}
            />
          </div>
        ) : (
          <div style={{ 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center',
            color: 'var(--text-muted, #94a3b8)',
            fontSize: '0.75rem',
          }}>
            No trend data
          </div>
        )}
        
        {/* Trend Label + Metadata */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}>
          {trendLabel && (
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: trendColor,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}>
              <span>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
              </span>
              <span>{trendLabel}</span>
            </div>
          )}
          {metadata && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted, #94a3b8)',
            }}>
              {metadata}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

