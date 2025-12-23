/**
 * Save Version Modal Component (v0.12)
 * 
 * Modal dialog for saving a scenario version with a label.
 */

import { useState } from 'react';

interface SaveVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string) => void;
  currentScenarioName?: string;
}

export function SaveVersionModal({
  isOpen,
  onClose,
  onSave,
  currentScenarioName,
}: SaveVersionModalProps) {
  const [label, setLabel] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (label.trim()) {
      onSave(label.trim());
      setLabel('');
      onClose();
    }
  };

  const handleCancel = () => {
    setLabel('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          minWidth: '400px',
          maxWidth: '600px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Save Version</h2>
        
        {currentScenarioName && (
          <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9em' }}>
            Scenario: <strong>{currentScenarioName}</strong>
          </p>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
            }}
          >
            Version Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Board Meeting V1, Before ADR Change"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              } else if (e.key === 'Escape') {
                handleCancel();
              }
            }}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!label.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: label.trim() ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: label.trim() ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            Save Version
          </button>
        </div>
      </div>
    </div>
  );
}

