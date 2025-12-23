/**
 * DataTable Component (v2.4)
 * 
 * A unified, beautiful table wrapper component with:
 * - Sticky header
 * - Hover state for rows
 * - Optional zebra striping
 * - Typography with tabular-nums for numeric columns
 * - Condensed mode option
 * - Right-aligned numeric columns, left-aligned text columns
 */

import type { ReactNode } from 'react';

export interface DataTableProps {
  children: ReactNode;
  stickyHeader?: boolean;
  hover?: boolean;
  striped?: boolean;
  condensed?: boolean;
  className?: string;
  maxHeight?: string;
  minWidth?: string;
}

export function DataTable({
  children,
  stickyHeader = true,
  hover = true,
  striped = false,
  condensed = false,
  className = '',
  maxHeight,
  minWidth,
}: DataTableProps) {
  const tableClasses = [
    'data-table',
    condensed && 'data-table--condensed',
    striped && 'data-table--striped',
    hover && 'data-table--hover',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    overflowX: 'auto',
    ...(maxHeight && { maxHeight, overflowY: 'auto' }),
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    ...(minWidth && { minWidth }),
  };

  return (
    <div style={wrapperStyle} className="data-table-wrapper">
      <table className={tableClasses} style={tableStyle}>
        {children}
      </table>
      <style>{`
        .data-table-wrapper {
          width: 100%;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: ${condensed ? '0.875rem' : '0.95rem'};
          background-color: var(--surface, #ffffff);
          font-family: var(--font-body, 'Montserrat', sans-serif);
        }

        .data-table thead {
          background-color: var(--surface-hover, #f1f5f9);
        }

        .data-table thead th {
          ${stickyHeader ? 'position: sticky; top: 0; z-index: 10;' : ''}
          background-color: var(--surface-hover, #f1f5f9);
          font-weight: 600;
          text-align: left;
          padding: ${condensed ? '0.5rem 0.75rem' : '0.75rem 1rem'};
          border-bottom: 2px solid var(--border, #e2e8f0);
          color: var(--text-secondary, #64748b);
          font-size: ${condensed ? '0.7rem' : '0.75rem'};
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-family: var(--font-body, 'Montserrat', sans-serif);
        }

        .data-table tbody tr {
          transition: background-color 0.15s ease;
        }

        .data-table--striped tbody tr:nth-child(even) {
          background-color: var(--surface-hover, #f1f5f9);
        }

        .data-table--hover tbody tr:hover {
          background-color: var(--surface-hover, #f1f5f9);
        }

        .data-table tbody td {
          padding: ${condensed ? '0.5rem 0.75rem' : '0.75rem 1rem'};
          border-bottom: 1px solid var(--border, #e2e8f0);
          color: var(--text-primary, #0f172a);
          font-size: ${condensed ? '0.875rem' : '0.95rem'};
          font-family: var(--font-body, 'Montserrat', sans-serif);
        }

        /* Numeric columns should be right-aligned with tabular-nums */
        .data-table .numeric,
        .data-table td.numeric,
        .data-table th.numeric {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        /* Text columns should be left-aligned */
        .data-table .text,
        .data-table td.text,
        .data-table th.text {
          text-align: left;
        }
      `}</style>
    </div>
  );
}

