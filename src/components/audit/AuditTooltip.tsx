import { useRef, useEffect } from 'react';

export interface AuditInfo {
  value: string;
  formula: string;
  inputs: Array<{ label: string; value: string }>;
}

interface AuditTooltipProps {
  auditInfo: AuditInfo;
  onClose: () => void;
  position?: { x: number; y: number };
}

export function AuditTooltip({ auditInfo, onClose, position }: AuditTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Position tooltip near click position, but adjust if it goes off-screen
    if (tooltipRef.current && position) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = position.x + 10;
      let top = position.y + 10;

      // Adjust if tooltip goes off right edge
      if (left + rect.width > viewportWidth) {
        left = position.x - rect.width - 10;
      }

      // Adjust if tooltip goes off bottom edge
      if (top + rect.height > viewportHeight) {
        top = position.y - rect.height - 10;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
  }, [position]);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}
        onClick={onClose}
      />
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          zIndex: 9999,
          backgroundColor: 'white',
          border: '2px solid #2196F3',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          maxWidth: '400px',
          minWidth: '300px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#2196F3' }}>Audit Details</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              padding: 0,
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '0.25rem' }}>Value</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 600, color: '#1976D2' }}>{auditInfo.value}</div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '0.25rem' }}>Formula</div>
          <div
            style={{
              fontSize: '1rem',
              fontFamily: 'monospace',
              backgroundColor: '#f5f5f5',
              padding: '0.75rem',
              borderRadius: '4px',
              color: '#333',
            }}
          >
            {auditInfo.formula}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '0.5rem' }}>Inputs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {auditInfo.inputs.map((input, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                <span style={{ fontSize: '0.9em', color: '#666' }}>{input.label}:</span>
                <span style={{ fontSize: '0.9em', fontWeight: 500, color: '#333' }}>{input.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

