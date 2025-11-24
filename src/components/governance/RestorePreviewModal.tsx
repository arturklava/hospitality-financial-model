/**
 * Restore Preview Modal Component (v3.3: Workflow UI Components)
 *
 * Shows comparison between current and selected version with visual indicators.
 * Displays changes like "IRR: 15% → 12% (Red Arrow)".
 */

import { useMemo } from 'react';
import { X, ArrowDown, ArrowUp, ArrowRight, AlertTriangle } from 'lucide-react';
import type { SavedScenario, ScenarioSummary } from '../../domain/types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import { buildScenarioSummary } from '@engines/scenario/scenarioEngine';

interface RestorePreviewModalProps {
  isOpen: boolean;
  currentVersion: SavedScenario | null;
  selectedVersion: SavedScenario;
  onClose: () => void;
  onConfirmRestore: () => void;
}

interface ComparisonRowProps {
  label: string;
  currentValue: number | null;
  selectedValue: number | null;
  formatter: (value: number) => string;
}

function ComparisonRow({ label, currentValue, selectedValue, formatter }: ComparisonRowProps) {
  if (currentValue === null && selectedValue === null) {
    return null;
  }

  const hasChange = currentValue !== null && selectedValue !== null && currentValue !== selectedValue;
  const isIncrease = hasChange && selectedValue! > currentValue!;
  const isDecrease = hasChange && selectedValue! < currentValue!;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem 0',
      borderBottom: '1px solid var(--border, #e0e0e0)',
    }}>
      <div style={{
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <div style={{
          fontSize: '0.875rem',
          color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {currentValue !== null ? formatter(currentValue) : 'N/A'}
        </div>
        {hasChange && (
          <>
            <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: isIncrease ? 'var(--success, #4CAF50)' : isDecrease ? 'var(--error, #F44336)' : 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}>
              {isIncrease && <ArrowUp size={14} />}
              {isDecrease && <ArrowDown size={14} />}
              {formatter(selectedValue!)}
            </div>
          </>
        )}
        {!hasChange && currentValue !== null && (
          <div style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}>
            (No change)
          </div>
        )}
      </div>
    </div>
  );
}

export function RestorePreviewModal({
  isOpen,
  currentVersion,
  selectedVersion,
  onClose,
  onConfirmRestore,
}: RestorePreviewModalProps) {
  // Compute summaries for comparison
  const currentSummary = useMemo<ScenarioSummary | null>(() => {
    if (!currentVersion) return null;
    try {
      const output = runFullModel(currentVersion.modelConfig);
      return buildScenarioSummary(output);
    } catch (error) {
      console.warn('Failed to compute current summary:', error);
      return null;
    }
  }, [currentVersion]);

  const selectedSummary = useMemo<ScenarioSummary>(() => {
    try {
      const output = runFullModel(selectedVersion.modelConfig);
      return buildScenarioSummary(output);
    } catch (error) {
      console.warn('Failed to compute selected summary:', error);
      throw error;
    }
  }, [selectedVersion]);

  if (!isOpen) return null;

  const currentNpv = currentSummary?.projectKpis.npv ?? null;
  const selectedNpv = selectedSummary?.projectKpis.npv ?? null;
  const currentIrr = currentSummary?.projectKpis.unleveredIrr ?? null;
  const selectedIrr = selectedSummary?.projectKpis.unleveredIrr ?? null;
  const currentEquityMultiple = currentSummary?.projectKpis.equityMultiple ?? null;
  const selectedEquityMultiple = selectedSummary?.projectKpis.equityMultiple ?? null;

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
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
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
            Restore Preview
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
        <div style={{ padding: '1.5rem' }}>
          {/* Warning */}
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--warning-light, rgba(255, 152, 0, 0.1))',
            border: '1px solid var(--warning, #FF9800)',
            borderRadius: 'var(--radius, 8px)',
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}>
            <AlertTriangle size={20} style={{ color: 'var(--warning, #FF9800)', flexShrink: 0 }} />
            <div style={{
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
            }}>
              <strong>Restoring this version will replace your current model configuration.</strong>
              <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                All unsaved changes will be lost. Make sure to save your current work before restoring.
              </div>
            </div>
          </div>

          {/* Version Names */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem',
              }}>
                Current Version
              </div>
              <div style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                {currentVersion?.name ?? 'None'}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem',
              }}>
                Selected Version
              </div>
              <div style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--primary, #2196F3)',
              }}>
                {selectedVersion.name}
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div style={{
            backgroundColor: 'var(--background, #f9f9f9)',
            borderRadius: 'var(--radius, 8px)',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              Key Metrics Comparison
            </h3>
            <ComparisonRow
              label="IRR"
              currentValue={currentIrr}
              selectedValue={selectedIrr}
              formatter={(v) => formatPercent(v)}
            />
            <ComparisonRow
              label="NPV"
              currentValue={currentNpv}
              selectedValue={selectedNpv}
              formatter={(v) => formatCurrency(v)}
            />
            <ComparisonRow
              label="Equity Multiple"
              currentValue={currentEquityMultiple}
              selectedValue={selectedEquityMultiple}
              formatter={(v) => v.toFixed(2) + 'x'}
            />
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--background-secondary, #f0f0f0)',
                border: '1px solid var(--border, #e0e0e0)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-hover, #e0e0e0)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-secondary, #f0f0f0)';
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirmRestore}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--primary, #2196F3)',
                border: 'none',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary-hover, #1976D2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary, #2196F3)';
              }}
            >
              Confirm Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
