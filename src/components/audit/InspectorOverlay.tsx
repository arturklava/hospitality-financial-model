/**
 * Inspector Overlay Component (v1.5: Governance UI)
 * 
 * A modal/tooltip that appears when inspecting a value.
 * Shows: "Formula", "Inputs" (Table), "Result".
 */

import { X } from 'lucide-react';
import { useRef, useEffect } from 'react';

export interface InspectorData {
  value: string;
  formula: string;
  inputs: Array<{ label: string; value: string }>;
}

interface InspectorOverlayProps {
  data: InspectorData;
  onClose: () => void;
  position?: { x: number; y: number };
}

export function InspectorOverlay({ data, onClose, position }: InspectorOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Position overlay near click position, but adjust if it goes off-screen
    if (overlayRef.current && position) {
      const overlay = overlayRef.current;
      const rect = overlay.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = position.x + 10;
      let top = position.y + 10;

      // Adjust if overlay goes off right edge
      if (left + rect.width > viewportWidth) {
        left = position.x - rect.width - 10;
      }

      // Adjust if overlay goes off bottom edge
      if (top + rect.height > viewportHeight) {
        top = position.y - rect.height - 10;
      }

      overlay.style.left = `${left}px`;
      overlay.style.top = `${top}px`;
    }
  }, [position]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
        }}
        onClick={onClose}
      />

      {/* Overlay Modal */}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed',
          zIndex: 9999,
          backgroundColor: 'white',
          border: '2px solid #2196F3',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          maxWidth: '500px',
          minWidth: '350px',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #e0e0e0',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2196F3', fontWeight: 600 }}>
            Inspector
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              padding: '0.25rem',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Result */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              fontSize: '0.875rem',
              color: '#666',
              marginBottom: '0.5rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Result
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1976D2',
              fontFamily: 'monospace',
            }}
          >
            {data.value}
          </div>
        </div>

        {/* Formula */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              fontSize: '0.875rem',
              color: '#666',
              marginBottom: '0.5rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Formula
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontFamily: 'monospace',
              backgroundColor: '#f5f5f5',
              padding: '1rem',
              borderRadius: '6px',
              color: '#333',
              border: '1px solid #e0e0e0',
            }}
          >
            {data.formula}
          </div>
        </div>

        {/* Inputs Table */}
        <div>
          <div
            style={{
              fontSize: '0.875rem',
              color: '#666',
              marginBottom: '0.75rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Inputs
          </div>
          {data.inputs.length === 0 ? (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f9f9f9',
                borderRadius: '6px',
                color: '#666',
                fontStyle: 'italic',
                textAlign: 'center',
              }}
            >
              No inputs available
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {data.inputs.map((input, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.9rem',
                      color: '#666',
                      fontWeight: 500,
                    }}
                  >
                    {input.label}:
                  </span>
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#333',
                      fontFamily: 'monospace',
                    }}
                  >
                    {input.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

