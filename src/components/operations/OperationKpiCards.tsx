/**
 * Operation KPI Cards component.
 * 
 * Displays operation-specific KPI cards based on operation type.
 * Uses the KPI factory from engines/analytics/kpiFactory.ts.
 */

import { useMemo } from 'react';
import { DollarSign, TrendingUp, Percent, Users, Utensils, Building2, Activity } from 'lucide-react';
import type { OperationConfig, FullModelOutput } from '../../domain/types';
import { runScenarioEngine } from '../../engines/scenario/scenarioEngine';
import { getOperationKpis } from '../../engines/analytics/kpiFactory';

interface OperationKpiCardsProps {
  operation: OperationConfig;
  modelOutput?: FullModelOutput;
}

/**
 * Get icon component for KPI label.
 */
function getKpiIcon(label: string) {
  const labelLower = label.toLowerCase();
  if (labelLower.includes('revpar') || labelLower.includes('adr')) {
    return TrendingUp;
  }
  if (labelLower.includes('revenue') || labelLower.includes('rent')) {
    return DollarSign;
  }
  if (labelLower.includes('margin') || labelLower.includes('occupancy') || labelLower.includes('cogs') || labelLower.includes('%')) {
    return Percent;
  }
  if (labelLower.includes('check') || labelLower.includes('covers') || labelLower.includes('turnover')) {
    return Utensils;
  }
  if (labelLower.includes('member')) {
    return Users;
  }
  if (labelLower.includes('sqm') || labelLower.includes('gla')) {
    return Building2;
  }
  return Activity;
}

/**
 * OperationKpiCards component.
 * 
 * Displays operation-specific KPI cards based on operation type.
 */
export function OperationKpiCards({ operation, modelOutput }: OperationKpiCardsProps) {
  // Get annual P&L results for the operation
  const annualPnlResults = useMemo(() => {
    if (!modelOutput) return [];

    try {
      const scenarioResult = runScenarioEngine(modelOutput.scenario);
      if (!scenarioResult?.operations) return [];

      const operationResult = scenarioResult.operations.find(op => op.operationId === operation.id);
      if (!operationResult?.annualPnl || operationResult.annualPnl.length === 0) return [];

      return operationResult.annualPnl;
    } catch (error) {
      console.error('[OperationKpiCards] Error getting operation P&L:', error);
      return [];
    }
  }, [operation, modelOutput]);

  // Get operation-specific KPIs
  const kpis = useMemo(() => {
    if (annualPnlResults.length === 0) {
      // Return empty array if no data - will show generic KPIs
      return [];
    }
    return getOperationKpis(operation, annualPnlResults);
  }, [operation, annualPnlResults]);

  // If no operation-specific KPIs, show generic ones (Revenue, NOI Margin)
  if (kpis.length === 0) {
    const operationPnl = annualPnlResults.length > 0 ? annualPnlResults[0] : null;
    const revenue = operationPnl?.revenueTotal ?? 0;
    const noi = operationPnl?.noi ?? 0;
    const noiMargin = revenue > 0 ? noi / revenue : 0;

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
        }}
      >
        <div className="card" style={{
          padding: '1.25rem',
          textAlign: 'center',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          backgroundColor: 'var(--background)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '120px',
        }}>
          <DollarSign 
            size={20} 
            style={{ 
              color: 'var(--primary)', 
              marginBottom: '0.5rem' 
            }} 
          />
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Total Revenue
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {revenue > 0 
              ? new Intl.NumberFormat('en-US', { 
                  style: 'currency', 
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(revenue)
              : 'N/A'}
          </div>
        </div>
        <div className="card" style={{
          padding: '1.25rem',
          textAlign: 'center',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          backgroundColor: 'var(--background)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '120px',
        }}>
          <Percent 
            size={20} 
            style={{ 
              color: 'var(--primary)', 
              marginBottom: '0.5rem' 
            }} 
          />
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            NOI Margin
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 600,
            color: noiMargin > 0 ? 'var(--success)' : 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {noiMargin > 0 
              ? new Intl.NumberFormat('en-US', { 
                  style: 'percent',
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }).format(noiMargin)
              : 'N/A'}
          </div>
        </div>
      </div>
    );
  }

  // Display operation-specific KPIs
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(kpis.length, 3)}, 1fr)`,
        gap: '1rem',
      }}
    >
      {kpis.map((kpi, index) => {
        const IconComponent = getKpiIcon(kpi.label);
        return (
          <div
            key={index}
            className="card"
            style={{
              padding: '1.25rem',
              textAlign: 'center',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--background)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '120px',
            }}
          >
            <IconComponent 
              size={20} 
              style={{ 
                color: 'var(--primary)', 
                marginBottom: '0.5rem' 
              }} 
            />
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {kpi.label}
            </div>
            <div style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
              marginBottom: kpi.subtext ? '0.5rem' : 0,
            }}>
              {kpi.value}
            </div>
            {kpi.subtext && (
              <div style={{
                fontSize: '0.6875rem',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
              }}>
                {kpi.subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

