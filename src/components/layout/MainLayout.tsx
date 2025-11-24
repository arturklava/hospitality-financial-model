import type { ReactNode } from 'react';

import { Sidebar, type ViewId } from './Sidebar';
import { GuestBanner } from './GuestBanner';

interface MainLayoutProps {
  header: ReactNode;
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
  children: ReactNode;
  showGuestBanner?: boolean;
}

export function MainLayout({
  header,
  activeView,
  onViewChange,
  children,
  showGuestBanner = false,
}: MainLayoutProps) {
  return (
    <div className="app-container">
      <Sidebar activeView={activeView} onViewChange={onViewChange} />

      <div className="main-content-wrapper">
        {header}
        {showGuestBanner && <GuestBanner />}
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}
