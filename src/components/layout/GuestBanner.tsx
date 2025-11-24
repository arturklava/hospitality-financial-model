/**
 * Guest Banner Component (v4.1)
 * 
 * Dismissible banner for guest users that doesn't block the header.
 * Pushes content down or floats unobtrusively.
 */

import { useState, useEffect } from 'react';

interface GuestBannerProps {
  message?: string;
  onDismiss?: () => void;
}

export function GuestBanner({ 
  message = "You're viewing in guest mode. Some features may be limited.",
  onDismiss 
}: GuestBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check sessionStorage on mount
  useEffect(() => {
    const dismissed = sessionStorage.getItem('guestBannerDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('guestBannerDismissed', 'true');
    if (onDismiss) {
      onDismiss();
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: 'var(--primary, #2563eb)',
        color: 'white',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        fontSize: '0.875rem',
        boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))',
        zIndex: 5, // Below header (z-index: 10) but above content
        position: 'relative', // Non-blocking, pushes content down
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontWeight: 500 }}>{message}</span>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          padding: '0.25rem 0.5rem',
          borderRadius: 'var(--radius, 0.25rem)',
          fontSize: '1.25rem',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s',
          minWidth: '24px',
          minHeight: '24px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-label="Dismiss banner"
      >
        ×
      </button>
    </div>
  );
}

