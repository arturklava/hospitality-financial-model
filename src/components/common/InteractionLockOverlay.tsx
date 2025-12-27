import { useEffect, useRef } from 'react';

interface InteractionLockOverlayProps {
  isOpen: boolean;
  title: string;
  description?: string;
}

/**
 * Fullscreen overlay that blocks user interaction during long-running operations.
 */
export function InteractionLockOverlay({ isOpen, title, description }: InteractionLockOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          @keyframes hfm-lock-spinner {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        tabIndex={-1}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          cursor: 'wait',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.5rem 2rem',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            borderRadius: '16px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
            textAlign: 'center',
            color: 'var(--text-primary, #111827)',
            fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            width: 'min(90%, 420px)',
          }}
        >
          <div
            aria-hidden
            style={{
              width: '52px',
              height: '52px',
              border: '5px solid rgba(59, 130, 246, 0.25)',
              borderTopColor: 'var(--primary, #1f2937)',
              borderRadius: '50%',
              animation: 'hfm-lock-spinner 0.9s linear infinite',
            }}
          />
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{title}</div>
            {description && (
              <p style={{
                margin: '0.35rem 0 0',
                color: 'var(--text-secondary, #4b5563)',
                fontSize: '0.95rem',
                lineHeight: 1.4,
              }}>
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
