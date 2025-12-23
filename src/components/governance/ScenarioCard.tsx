/**
 * Scenario Card Component (v3.3: Workflow UI Components)
 *
 * Individual scenario card for use in ScenarioHub.
 * Extracted for potential reuse.
 */

import type { NamedScenario, ScenarioSummary } from '../../domain/types';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface ScenarioCardProps {
  scenario: NamedScenario;
  summary?: ScenarioSummary;
  isActive: boolean;
  onSelect?: () => void;
}

export function ScenarioCard({ scenario, summary, isActive, onSelect }: ScenarioCardProps) {
  const lastEdited = (scenario as any).lastModified
    ? new Date((scenario as any).lastModified).toLocaleDateString()
    : null;

  const npv = summary?.projectKpis.npv ?? null;
  const irr = summary?.projectKpis.unleveredIrr ?? null;

  return (
    <div
      onClick={onSelect}
      style={{
        padding: '1.5rem',
        border: `2px solid ${isActive ? 'var(--primary, #2196F3)' : 'var(--border, #e0e0e0)'}`,
        borderRadius: 'var(--radius, 8px)',
        backgroundColor: isActive ? 'var(--surface-active, rgba(33, 150, 243, 0.05))' : 'var(--surface, white)',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
      onMouseEnter={(e) => {
        if (!isActive && onSelect) {
          e.currentTarget.style.borderColor = 'var(--primary, #2196F3)';
          e.currentTarget.style.backgroundColor = 'var(--background-hover, #f5f5f5)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive && onSelect) {
          e.currentTarget.style.borderColor = 'var(--border, #e0e0e0)';
          e.currentTarget.style.backgroundColor = 'var(--surface, white)';
        }
      }}
    >
      {/* Title */}
      <div>
        <h3 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '0.25rem',
        }}>
          {scenario.name}
        </h3>
        {lastEdited && (
          <p style={{
            margin: 0,
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
          }}>
            Last Edited: {lastEdited}
          </p>
        )}
      </div>

      {/* KPI Badges */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}>
        {irr !== null && (
          <div style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: 'var(--background-secondary, #f0f0f0)',
            borderRadius: 'var(--radius-sm, 4px)',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}>
            <span style={{ color: 'var(--text-secondary)', marginRight: '0.25rem' }}>IRR:</span>
            <span style={{ fontWeight: 600 }}>{formatPercent(irr)}</span>
          </div>
        )}
        {npv !== null && (
          <div style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: 'var(--background-secondary, #f0f0f0)',
            borderRadius: 'var(--radius-sm, 4px)',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}>
            <span style={{ color: 'var(--text-secondary)', marginRight: '0.25rem' }}>NPV:</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(npv)}</span>
          </div>
        )}
        {!summary && (
          <div style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: 'var(--background-secondary, #f0f0f0)',
            borderRadius: 'var(--radius-sm, 4px)',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}>
            Run model to see KPIs
          </div>
        )}
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div style={{
          padding: '0.5rem',
          backgroundColor: 'var(--primary, #2196F3)',
          color: 'white',
          borderRadius: 'var(--radius-sm, 4px)',
          fontSize: '0.75rem',
          fontWeight: 600,
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Active
        </div>
      )}
    </div>
  );
}
