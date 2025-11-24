/**
 * Skeleton Component (v2.8)
 * 
 * Loading placeholders with pulse animation.
 * Variants: Card, Text, Table
 */

import { clsx } from 'clsx';

interface SkeletonProps {
  /** Variant type */
  variant?: 'card' | 'text' | 'table';
  /** Additional CSS classes */
  className?: string;
  /** Width (for text variant) */
  width?: string | number;
  /** Height (for text variant) */
  height?: string | number;
  /** Number of lines (for text variant) */
  lines?: number;
  /** Number of rows (for table variant) */
  rows?: number;
  /** Number of columns (for table variant) */
  columns?: number;
}

/**
 * Base skeleton with pulse animation
 */
function SkeletonBase({ className, width, height, style }: { className?: string; width?: string | number; height?: string | number; style?: React.CSSProperties }) {
  return (
    <div
      className={clsx('skeleton', className)}
      style={{
        backgroundColor: '#e2e8f0', // bg-slate-200 equivalent
        borderRadius: '4px',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        width: width || '100%',
        height: height || '1rem',
        ...style,
      }}
    />
  );
}

/**
 * Skeleton Card - Full card placeholder
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={clsx('skeleton-card', className)}
      style={{
        backgroundColor: 'var(--bg-surface, white)',
        padding: '1.5rem',
        borderRadius: 'var(--radius, 8px)',
        boxShadow: 'var(--shadow-md, 0 1px 3px 0 rgba(0, 0, 0, 0.1))',
        border: '1px solid var(--border-soft, #e0e0e0)',
      }}
    >
      <SkeletonBase height="1.5rem" width="60%" style={{ marginBottom: '1rem' }} />
      <SkeletonBase height="1rem" width="100%" style={{ marginBottom: '0.75rem' }} />
      <SkeletonBase height="1rem" width="90%" style={{ marginBottom: '0.75rem' }} />
      <SkeletonBase height="1rem" width="80%" />
    </div>
  );
}

/**
 * Skeleton Text - Text line placeholders
 */
export function SkeletonText({ 
  className, 
  width, 
  height, 
  lines = 1 
}: SkeletonProps) {
  if (lines === 1) {
    return <SkeletonBase className={className} width={width} height={height} />;
  }

  return (
    <div className={clsx('skeleton-text', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          width={i === lines - 1 ? '80%' : '100%'}
          height={height || '1rem'}
          style={{ marginBottom: i < lines - 1 ? '0.5rem' : 0 }}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton Table - Table placeholder
 */
export function SkeletonTable({ 
  className, 
  rows = 5, 
  columns = 4 
}: SkeletonProps) {
  return (
    <div className={clsx('skeleton-table', className)}>
      {/* Table Header */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '2px solid var(--border-soft, #e0e0e0)' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBase key={`header-${i}`} height="1rem" width="100%" />
        ))}
      </div>
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`row-${rowIdx}`} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <SkeletonBase key={`cell-${rowIdx}-${colIdx}`} height="1rem" width="100%" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Main Skeleton component - exports all variants
 */
export function Skeleton(props: SkeletonProps) {
  const { variant = 'text', ...rest } = props;

  switch (variant) {
    case 'card':
      return <SkeletonCard className={rest.className} />;
    case 'table':
      return <SkeletonTable {...rest} />;
    case 'text':
    default:
      return <SkeletonText {...rest} />;
  }
}

