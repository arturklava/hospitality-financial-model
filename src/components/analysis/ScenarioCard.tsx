import type { ProjectKpis } from '@domain/types';

interface ScenarioCardProps {
  variant: 'stress' | 'base' | 'upside';
  kpis: ProjectKpis;
  title: string;
  baseKpis?: ProjectKpis; // Optional: Base KPIs for delta calculation
}

/**
 * ScenarioCard component.
 * 
 * Displays a card with colored top border showing scenario KPIs (IRR, MOIC, NPV).
 * Optionally displays delta badge comparing to base scenario.
 */
export function ScenarioCard({ variant, kpis, title, baseKpis }: ScenarioCardProps) {
  // Determine border color based on variant
  const getBorderColor = () => {
    switch (variant) {
      case 'stress':
        return 'var(--danger)'; // Red for stress scenarios
      case 'base':
        return 'var(--primary)'; // Blue for base scenarios
      case 'upside':
        return 'var(--success)'; // Green for upside scenarios
      default:
        return 'var(--border)';
    }
  };

  /**
   * Formats a number as currency.
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  /**
   * Formats a number as a percentage.
   */
  const formatPercent = (value: number | null): string => {
    if (value === null) {
      return 'N/A';
    }
    return `${(value * 100).toFixed(2)}%`;
  };

  /**
   * Formats a number with 2 decimal places.
   */
  const formatNumber = (value: number | null): string => {
    if (value === null) {
      return 'N/A';
    }
    return value.toFixed(2);
  };

  /**
   * Calculates delta percentage vs base.
   */
  const calculateDelta = (value: number | null, baseValue: number | null): number | null => {
    if (value === null || baseValue === null || baseValue === 0) {
      return null;
    }
    return ((value - baseValue) / baseValue) * 100;
  };

  /**
   * Formats delta as a badge string (e.g., "NPV: $5M (-20%)").
   */
  const formatDeltaBadge = (): string | null => {
    if (!baseKpis || variant === 'base') {
      return null;
    }

    const npvDelta = calculateDelta(kpis.npv, baseKpis.npv);
    if (npvDelta === null) {
      return null;
    }

    const sign = npvDelta >= 0 ? '+' : '';
    const formattedNpv = formatCurrency(kpis.npv);
    return `NPV: ${formattedNpv} (${sign}${npvDelta.toFixed(1)}%)`;
  };

  const deltaBadge = formatDeltaBadge();
  const deltaColor = deltaBadge && variant === 'upside' 
    ? 'var(--success)' 
    : deltaBadge && variant === 'stress'
    ? 'var(--danger)'
    : 'var(--text-secondary)';

  return (
    <div
      className="card"
      style={{
        borderTop: `4px solid ${getBorderColor()}`,
        borderTopLeftRadius: 'var(--radius)',
        borderTopRightRadius: 'var(--radius)',
      }}
    >
      <h3 style={{
        marginTop: 0,
        marginBottom: '1.25rem',
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'var(--text-strong)',
      }}>
        {title}
      </h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
      }}>
        <div>
          <div style={{
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
            fontWeight: 600,
          }}>
            IRR
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatPercent(kpis.unleveredIrr)}
          </div>
        </div>

        <div>
          <div style={{
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
            fontWeight: 600,
          }}>
            MOIC
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatNumber(kpis.equityMultiple)}x
          </div>
        </div>

        <div>
          <div style={{
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
            fontWeight: 600,
          }}>
            NPV
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatCurrency(kpis.npv)}
          </div>
        </div>
      </div>

      {deltaBadge && (
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-soft)',
        }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: deltaColor,
            display: 'inline-block',
            padding: '0.375rem 0.75rem',
            backgroundColor: variant === 'upside' 
              ? 'rgba(34, 197, 94, 0.1)' 
              : variant === 'stress'
              ? 'rgba(239, 68, 68, 0.1)'
              : 'transparent',
            borderRadius: 'var(--radius)',
          }}>
            {deltaBadge}
          </div>
        </div>
      )}
    </div>
  );
}

