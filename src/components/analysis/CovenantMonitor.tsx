import { useState, useMemo } from 'react';
import type { CovenantStatus, Covenant, BreachEvent } from '../../domain/types';
import { useTranslation } from '../../contexts/LanguageContext';

interface CovenantMonitorProps {
  covenantStatus?: CovenantStatus[];
  covenants?: Covenant[];
}

/**
 * Get covenant status summary for a specific covenant.
 */
function getCovenantSummary(covenantId: string, statuses: CovenantStatus[]) {
  const covenantStatuses = statuses.filter(s => s.covenantId === covenantId);
  const passed = covenantStatuses.filter(s => s.passed).length;
  const breached = covenantStatuses.filter(s => !s.passed).length;
  const critical = covenantStatuses.filter(s => s.breachSeverity === 'critical').length;
  const warning = covenantStatuses.filter(s => s.breachSeverity === 'warning').length;

  // Get breach events (sorted by month number)
  const breaches: BreachEvent[] = covenantStatuses
    .filter(s => !s.passed)
    .map(s => ({
      covenantId: s.covenantId,
      covenantName: s.covenantName,
      covenantType: s.covenantType,
      yearIndex: s.yearIndex,
      monthIndex: s.monthIndex,
      monthNumber: s.monthNumber,
      actualValue: s.actualValue,
      threshold: s.threshold,
      severity: s.breachSeverity || 'critical',
    }))
    .sort((a, b) => a.monthNumber - b.monthNumber);

  // Determine overall status
  let overallStatus: 'safe' | 'warning' | 'breach' = 'safe';
  if (critical > 0) {
    overallStatus = 'breach';
  } else if (warning > 0 || breached > 0) {
    overallStatus = 'warning';
  }

  return {
    passed,
    breached,
    critical,
    warning,
    overallStatus,
    breaches,
    totalMonths: covenantStatuses.length,
  };
}

/**
 * Format month label.
 */
function formatMonthLabel(yearIndex: number, monthIndex: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Y${yearIndex + 1} ${months[monthIndex]}`;
}

/**
 * Get status color.
 */
function getStatusColor(status: 'safe' | 'warning' | 'breach'): string {
  switch (status) {
    case 'safe':
      return '#4CAF50'; // Green
    case 'warning':
      return '#FFC107'; // Yellow/Amber
    case 'breach':
      return '#f44336'; // Red
  }
}

interface CovenantCardProps {
  covenant: Covenant;
  summary: ReturnType<typeof getCovenantSummary>;
  onViewTimeline: () => void;
}

function CovenantCard({ covenant, summary, onViewTimeline }: CovenantCardProps) {
  const { t } = useTranslation();
  const statusColor = getStatusColor(summary.overallStatus);
  const statusLabel = t(`liquidity.status.${summary.overallStatus}`);

  const thresholdLabel = covenant.type === 'min_dscr'
    ? `≥ ${covenant.threshold.toFixed(2)}`
    : covenant.type === 'max_ltv'
      ? `≤ ${(covenant.threshold * 100).toFixed(0)}%`
      : `≥ $${covenant.threshold.toLocaleString()}`;

  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid ${statusColor}`,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onClick={onViewTimeline}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
            {covenant.name}
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>
            {covenant.type === 'min_dscr' ? 'Minimum DSCR' : covenant.type === 'max_ltv' ? 'Maximum LTV' : 'Minimum Cash'}
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>
            Threshold: {thresholdLabel}
          </p>
        </div>
        <div style={{
          padding: '0.5rem 1rem',
          backgroundColor: `${statusColor}20`,
          borderRadius: '4px',
          border: `1px solid ${statusColor}`,
        }}>
          <div style={{
            color: statusColor,
            fontWeight: 600,
            fontSize: '0.875rem',
            marginBottom: '0.25rem',
          }}>
            {statusLabel}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #666)' }}>
            {summary.breached > 0 ? `${summary.breached} ${t('liquidity.status.breach').toLowerCase()}` : t('liquidity.status.safe')}
          </div>
        </div>
      </div>

      {summary.breached > 0 && (
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color, #ddd)',
          fontSize: '0.875rem',
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ color: 'var(--text-secondary, #666)' }}>
              {t('liquidity.breach.passed')}: <strong>{summary.passed}</strong> {t('common.months') || 'months'}
            </span>
            <span style={{ color: '#f44336' }}>
              {t('liquidity.breach.breached')}: <strong>{summary.breached}</strong> {t('common.months') || 'months'}
            </span>
            {summary.critical > 0 && (
              <span style={{ color: '#d32f2f', fontWeight: 600 }}>
                {t('liquidity.status.critical')}: <strong>{summary.critical}</strong>
              </span>
            )}
          </div>
          <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary, #666)', fontStyle: 'italic' }}>
            {t('liquidity.breach.viewTimeline')}
          </div>
        </div>
      )}
    </div>
  );
}

interface BreachTimelineModalProps {
  covenant: Covenant;
  breaches: BreachEvent[];
  onClose: () => void;
}

function BreachTimelineModal({ covenant, breaches, onClose }: BreachTimelineModalProps) {
  const { t } = useTranslation();
  if (breaches.length === 0) {
    return null;
  }

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
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '800px',
          maxHeight: '80vh',
          overflow: 'auto',
          margin: '1rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>{t('liquidity.breach.timeline')}: {covenant.name}</h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: 'var(--text-secondary, #666)',
            }}
          >
            ×
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color, #ddd)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t('common.month') || 'Month'}</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actual Value</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Threshold</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {breaches.map((breach, index) => (
              <tr
                key={index}
                style={{
                  borderBottom: '1px solid var(--border-color, #ddd)',
                  backgroundColor: breach.severity === 'critical' ? '#ffebee' : '#fff8e1',
                }}
              >
                <td style={{ padding: '0.75rem' }}>
                  {formatMonthLabel(breach.yearIndex, breach.monthIndex)}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                  {covenant.type === 'min_dscr'
                    ? breach.actualValue.toFixed(2)
                    : covenant.type === 'max_ltv'
                      ? `${(breach.actualValue * 100).toFixed(1)}%`
                      : `$${breach.actualValue.toLocaleString()}`}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  {covenant.type === 'min_dscr'
                    ? breach.threshold.toFixed(2)
                    : covenant.type === 'max_ltv'
                      ? `${(breach.threshold * 100).toFixed(0)}%`
                      : `$${breach.threshold.toLocaleString()}`}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    backgroundColor: breach.severity === 'critical' ? '#f44336' : '#FFC107',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}>
                    {breach.severity === 'critical' ? t('liquidity.status.critical') : t('liquidity.status.warning')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CovenantMonitor({ covenantStatus = [], covenants = [] }: CovenantMonitorProps) {
  const { t } = useTranslation();
  const [selectedCovenantId, setSelectedCovenantId] = useState<string | null>(null);

  // Group covenant statuses by covenant ID
  const covenantSummaries = useMemo(() => {
    if (!covenants.length || !covenantStatus.length) {
      return [];
    }

    return covenants.map(covenant => {
      const summary = getCovenantSummary(covenant.id, covenantStatus);
      return {
        covenant,
        summary,
      };
    });
  }, [covenants, covenantStatus]);

  const selectedCovenant = selectedCovenantId
    ? covenantSummaries.find(cs => cs.covenant.id === selectedCovenantId)
    : null;

  if (covenants.length === 0) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t('liquidity.covenantMonitor')}</h3>
        <p style={{ color: 'var(--text-secondary, #666)', fontStyle: 'italic' }}>
          {t('capital.noCovenants') || 'No covenants defined.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        <h3 style={{ marginBottom: '1rem' }}>{t('liquidity.covenantMonitor')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {covenantSummaries.map(({ covenant, summary }) => (
            <CovenantCard
              key={covenant.id}
              covenant={covenant}
              summary={summary}
              onViewTimeline={() => setSelectedCovenantId(covenant.id)}
            />
          ))}
        </div>
      </div>

      {selectedCovenant && (
        <BreachTimelineModal
          covenant={selectedCovenant.covenant}
          breaches={selectedCovenant.summary.breaches}
          onClose={() => setSelectedCovenantId(null)}
        />
      )}
    </>
  );
}
