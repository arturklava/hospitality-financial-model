/**
 * Diff Modal Component (v0.12)
 * 
 * Visual diff comparison between two scenario versions.
 * Shows side-by-side comparison with highlighted changes.
 */

import { useMemo } from 'react';
import { compareScenarios } from '@engines/governance/diffEngine';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type { NamedScenario } from '@domain/types';
import type { ScenarioVersion } from '@domain/governance';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseVersion: ScenarioVersion;
  targetScenario: NamedScenario;
}

/**
 * Format a value for display.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  if (typeof value === 'number') {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    if (value < 1 && value > 0) {
      return `${(value * 100).toFixed(2)}%`;
    }
    return value.toFixed(2);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  return String(value);
}

/**
 * Get a human-readable field name from a path.
 */
function getFieldLabel(path: string): string {
  // Extract the last part of the path
  const parts = path.split('.');
  const lastPart = parts[parts.length - 1];
  
  // Format camelCase to Title Case
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function DiffModal({
  isOpen,
  onClose,
  baseVersion,
  targetScenario,
}: DiffModalProps) {
  const diffResult = useMemo(() => {
    if (!isOpen) return null;
    return compareScenarios(baseVersion.snapshot, targetScenario);
  }, [isOpen, baseVersion, targetScenario]);

  // Calculate KPIs for both versions
  const baseKpis = useMemo(() => {
    if (!isOpen) return null;
    try {
      const output = runFullModel(baseVersion.snapshot.modelConfig);
      return output.project.projectKpis;
    } catch (e) {
      console.error('Failed to calculate base KPIs:', e);
      return null;
    }
  }, [isOpen, baseVersion]);

  const targetKpis = useMemo(() => {
    if (!isOpen) return null;
    try {
      const output = runFullModel(targetScenario.modelConfig);
      return output.project.projectKpis;
    } catch (e) {
      console.error('Failed to calculate target KPIs:', e);
      return null;
    }
  }, [isOpen, targetScenario]);

  if (!isOpen) return null;

  const changes = diffResult?.changes || [];

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
        padding: '2rem',
        overflow: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Version Comparison</h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Close
          </button>
        </div>

        {/* KPI Comparison */}
        {(baseKpis || targetKpis) && (
          <div style={{
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#f9f9f9',
            borderRadius: '4px',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>KPI Impact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {baseKpis && targetKpis && (
                <>
                  <div>
                    <strong>NPV:</strong> {formatValue(baseKpis.npv)} → {formatValue(targetKpis.npv)}
                  </div>
                  <div>
                    <strong>IRR:</strong> {baseKpis.unleveredIrr ? `${(baseKpis.unleveredIrr * 100).toFixed(2)}%` : 'N/A'} → {targetKpis.unleveredIrr ? `${(targetKpis.unleveredIrr * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                  <div>
                    <strong>Equity Multiple:</strong> {formatValue(baseKpis.equityMultiple)} → {formatValue(targetKpis.equityMultiple)}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Changes List */}
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
            Changes ({changes.length})
          </h3>
          
          {changes.length === 0 ? (
            <p style={{ color: '#666' }}>No changes detected.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Version A Column */}
              <div>
                <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#666' }}>
                  Version A: {baseVersion.label}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {changes.map((change, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: change.type === 'removed' ? '#ffebee' : change.type === 'modified' ? '#fff3e0' : 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.9em',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        {getFieldLabel(change.path)}
                      </div>
                      <div style={{ color: '#666' }}>
                        {formatValue(change.oldValue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Version B Column */}
              <div>
                <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#666' }}>
                  Version B: Current
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {changes.map((change, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: change.type === 'added' ? '#e8f5e9' : change.type === 'modified' ? '#fff3e0' : 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.9em',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        {getFieldLabel(change.path)}
                      </div>
                      <div style={{ color: '#666' }}>
                        {formatValue(change.newValue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

