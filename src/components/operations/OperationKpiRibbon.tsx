/**
 * Operation KPI Ribbon component (v5.8: Rich Data UI).
 * 
 * Displays operation-specific KPIs using kpiFactory logic.
 * Supports all operation types with appropriate metrics and icons.
 */

import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Utensils, 
  Maximize,
  type LucideIcon 
} from 'lucide-react';
import type { OperationConfig, FullModelOutput } from '../../domain/types';
import { kpiFactory } from '../../utils/kpiFactory';

interface OperationKpiRibbonProps {
  operation: OperationConfig;
  modelOutput?: FullModelOutput;
}

/**
 * Map icon name string to Lucide icon component
 */
function getIconComponent(iconName?: string): LucideIcon | null {
  switch (iconName) {
    case 'DollarSign':
      return DollarSign;
    case 'TrendingUp':
      return TrendingUp;
    case 'Percent':
      return Percent;
    case 'Utensils':
      return Utensils;
    case 'Maximize':
      return Maximize;
    default:
      return null;
  }
}

export function OperationKpiRibbon({ operation, modelOutput }: OperationKpiRibbonProps) {
  const { cards } = kpiFactory(operation, modelOutput);
  
  // If no cards, show a message
  if (cards.length === 0) {
    return (
      <div style={{
        padding: '1.5rem',
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}>
        <p style={{ margin: 0, fontSize: '0.9375rem' }}>
          No KPIs available for this operation type
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cards.length}, 1fr)`,
      gap: '1rem',
      padding: '1.5rem',
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
    }}>
      {cards.map((card) => {
        const IconComponent = getIconComponent(card.icon);
        
        return (
          <div 
            key={card.id}
            className="card" 
            style={{
              padding: '1rem',
              textAlign: 'center',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--background)',
            }}
          >
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
            }}>
              {IconComponent && <IconComponent size={14} />}
              <span>{card.label}</span>
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: card.id === 'noi-margin' && parseFloat(card.value.replace('%', '')) > 0 
                ? 'var(--success)' 
                : 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {card.value}
            </div>
            {card.isEstimated && (
              <div style={{
                fontSize: '0.6875rem',
                color: 'var(--text-secondary)',
                marginTop: '0.25rem',
                fontStyle: 'italic',
              }}>
                Estimated
              </div>
            )}
            {!card.hasLiveData && !card.isEstimated && (
              <div style={{
                fontSize: '0.6875rem',
                color: 'var(--text-secondary)',
                marginTop: '0.25rem',
                fontStyle: 'italic',
              }}>
                Run model
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

