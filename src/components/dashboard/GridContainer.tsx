/**
 * GridContainer Component (v4.2)
 * 
 * Responsive CSS Grid wrapper for 12-column layouts.
 * Supports Bento Grid patterns with flexible column spans.
 * 
 * Design Philosophy:
 * - 12-column base grid system
 * - Responsive breakpoints (mobile, tablet, desktop)
 * - Flexible column spans via children props
 */

import type { ReactNode, CSSProperties } from 'react';

export interface GridContainerProps {
  children: ReactNode;
  gap?: string; // Grid gap (e.g., '1.5rem', '2rem')
  className?: string;
  style?: CSSProperties;
}

/**
 * GridItem props for individual grid items with column span control.
 */
export interface GridItemProps {
  children: ReactNode;
  colSpan?: number | { mobile?: number; tablet?: number; desktop?: number }; // Column span (1-12)
  rowSpan?: number; // Row span (optional)
  className?: string;
  style?: CSSProperties;
}

/**
 * Main Grid Container - 12-column responsive grid.
 */
export function GridContainer({
  children,
  gap = '1.5rem',
  className = '',
  style,
}: GridContainerProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap,
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Grid Item - Individual grid cell with responsive column spans.
 */
export function GridItem({
  children,
  colSpan = 12,
  rowSpan,
  className = '',
  style,
}: GridItemProps) {
  // Handle responsive colSpan
  const getColSpan = (): string => {
    if (typeof colSpan === 'number') {
      return `span ${colSpan}`;
    }
    
    // Responsive object - use desktop value as default
    // Note: Full responsive support would require CSS classes or styled-components
    const { desktop = 12 } = colSpan;
    return `span ${desktop}`;
  };

  const gridColumn = getColSpan();
  const gridRow = rowSpan ? `span ${rowSpan}` : undefined;

  return (
    <div
      className={className}
      style={{
        gridColumn,
        gridRow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

