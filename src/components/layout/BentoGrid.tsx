import type { ReactNode, CSSProperties } from 'react';

interface BentoGridProps {
  children: ReactNode;
  gap?: string; // Gap between grid items (default: 1rem)
  className?: string;
}

interface BentoGridItemProps {
  children: ReactNode;
  colSpan?: number; // Number of columns to span (1 to 4 on lg, 1 to 2 on md, 1 on mobile)
  rowSpan?: number; // Number of rows to span (optional)
  className?: string;
}

/**
 * BentoGrid Component (v4.2)
 * 
 * A responsive grid container for creating "bento box" style layouts.
 * Responsive breakpoints:
 * - Mobile: 1 column
 * - Medium (md): 2 columns
 * - Large (lg): 4 columns
 * 
 * Supports column and row spanning for children.
 * 
 * Usage:
 * ```tsx
 * <BentoGrid>
 *   <BentoGrid.Item colSpan={2}>Wide item (spans 2 columns on lg)</BentoGrid.Item>
 *   <BentoGrid.Item colSpan={1}>Narrow item</BentoGrid.Item>
 *   <BentoGrid.Item colSpan={1}>Narrow item</BentoGrid.Item>
 * </BentoGrid>
 * ```
 */
export function BentoGrid({
  children,
  gap = '1rem',
  className = '',
}: BentoGridProps) {
  return (
    <div
      className={`bento-grid ${className}`}
      style={{
        display: 'grid',
        gap,
      } as CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * BentoGridItem Component
 * 
 * Individual item within a BentoGrid that can span multiple columns/rows.
 * Responsive behavior:
 * - On mobile: colSpan is clamped to 1
 * - On md: colSpan is clamped to 2
 * - On lg: colSpan can be up to 4
 */
function BentoGridItem({
  children,
  colSpan = 1,
  rowSpan,
  className = '',
}: BentoGridItemProps) {
  const gridRow = rowSpan && rowSpan > 1 ? `span ${rowSpan}` : undefined;

  return (
    <div
      className={`bento-grid-item ${className}`}
      data-colspan={colSpan}
      style={{
        gridRow: gridRow || undefined,
      } as CSSProperties}
    >
      {children}
    </div>
  );
}

// Attach Item as a static property for convenient usage
BentoGrid.Item = BentoGridItem;

