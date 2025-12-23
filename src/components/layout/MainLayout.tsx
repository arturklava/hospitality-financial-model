import type { ReactNode } from 'react';

import { Sidebar, type ViewId } from './Sidebar';

interface MainLayoutProps {
  header: ReactNode;
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
  children: ReactNode;
}

export function MainLayout({
  header,
  activeView,
  onViewChange,
  children,
}: MainLayoutProps) {
  return (
    <div className="app-container">
      <Sidebar activeView={activeView} onViewChange={onViewChange} />

      <div className="main-content-wrapper">
        {header}
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}
