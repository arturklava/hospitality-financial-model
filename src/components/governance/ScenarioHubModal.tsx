/**
 * Scenario Hub Modal Component (v3.3: Workflow UI Components)
 *
 * Modal wrapper for ScenarioHub that displays scenarios in a grid.
 */

import { X } from 'lucide-react';
import type { NamedScenario } from '../../domain/types';
import { ScenarioHub } from './ScenarioHub';

interface ScenarioHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: NamedScenario[];
  activeScenarioId?: string;
  onSelectScenario?: (scenario: NamedScenario) => void;
}

export function ScenarioHubModal({
  isOpen,
  onClose,
  scenarios,
  activeScenarioId,
  onSelectScenario,
}: ScenarioHubModalProps) {
  if (!isOpen) return null;

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
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--surface, white)',
          borderRadius: 'var(--radius, 8px)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border, #e0e0e0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            Manage Scenarios
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm, 4px)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background-hover, #f0f0f0)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
        }}>
          <ScenarioHub
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            onSelectScenario={(scenario) => {
              if (onSelectScenario) {
                onSelectScenario(scenario);
              }
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
