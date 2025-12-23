import type { ReactNode } from 'react';

interface MasterDetailLayoutProps {
  master: ReactNode;
  detail: ReactNode;
  masterWidth?: string;
}

/**
 * MasterDetailLayout component.
 * 
 * Provides a reusable master-detail layout pattern:
 * - Left panel (master): Fixed width, scrollable list
 * - Right panel (detail): Flexible width, scrollable content
 */
export function MasterDetailLayout({
  master,
  detail,
  masterWidth = '300px',
}: MasterDetailLayoutProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${masterWidth} 1fr`,
        backgroundColor: 'var(--background)',
        minHeight: '100%',
      }}
    >
      {/* Master Panel (Sidebar) - Sticky */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: 'fit-content',
          borderRight: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          maxHeight: '100vh',
        }}
      >
        {master}
      </div>

      {/* Detail Panel (Content) - Grows naturally */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--background)',
        }}
      >
        {detail}
      </div>
    </div>
  );
}

