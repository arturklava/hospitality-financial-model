import { DollarSign, TrendingUp, Percent } from 'lucide-react';
import type { OperationConfig, FullModelOutput } from '../../domain/types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { runScenarioEngine } from '../../engines/scenario/scenarioEngine';

interface AssetKpiCardProps {
  operation: OperationConfig;
  modelOutput?: FullModelOutput;
  kpiType: 'revpar' | 'revenue' | 'noiMargin';
}

/**
 * AssetKpiCard component.
 * 
 * Displays a single KPI card for an operation asset.
 * Supports: RevPAR, Total Revenue, NOI Margin.
 */
export function AssetKpiCard({ operation, modelOutput, kpiType }: AssetKpiCardProps) {
  // Get operation-level P&L from model output
  const getOperationPnl = (): { revenue: number; noi: number } | null => {
    if (!modelOutput) return null;
    
    try {
      // Re-run scenario engine to get operation results
      // FullModelOutput.scenario is ProjectScenario (config), not ScenarioEngineResult
      const scenarioResult = runScenarioEngine(modelOutput.scenario);
      if (!scenarioResult.ok) return null;

      const operationResult = scenarioResult.data.operations.find(op => op.operationId === operation.id);
      if (!operationResult?.annualPnl || operationResult.annualPnl.length === 0) return null;
      
      const year1Pnl = operationResult.annualPnl.find(pnl => pnl.yearIndex === 0);
      if (year1Pnl) {
        return {
          revenue: year1Pnl.revenueTotal ?? 0,
          noi: year1Pnl.noi ?? 0,
        };
      }
    } catch (error) {
      console.error('[AssetKpiCard] Error getting operation P&L:', error);
    }
    
    return null;
  };

  // Calculate RevPAR from operation config (fallback)
  const calculateRevPARFromConfig = (): number | null => {
    if (operation.operationType === 'HOTEL') {
      const hotel = operation as any;
      const adr = hotel.avgDailyRate ?? 0;
      const avgOccupancy = hotel.occupancyByMonth 
        ? hotel.occupancyByMonth.reduce((sum: number, occ: number) => sum + occ, 0) / hotel.occupancyByMonth.length
        : 0;
      return adr * avgOccupancy;
    }
    if (operation.operationType === 'VILLAS') {
      const villas = operation as any;
      const adr = villas.avgNightlyRate ?? 0;
      const avgOccupancy = villas.occupancyByMonth 
        ? villas.occupancyByMonth.reduce((sum: number, occ: number) => sum + occ, 0) / villas.occupancyByMonth.length
        : 0;
      return adr * avgOccupancy;
    }
    return null;
  };

  // Calculate estimated annual revenue from operation config (fallback)
  const calculateEstimatedRevenueFromConfig = (): number => {
    if (operation.operationType === 'HOTEL') {
      const hotel = operation as any;
      const keys = hotel.keys ?? 0;
      const adr = hotel.avgDailyRate ?? 0;
      const avgOccupancy = hotel.occupancyByMonth 
        ? hotel.occupancyByMonth.reduce((sum: number, occ: number) => sum + occ, 0) / hotel.occupancyByMonth.length
        : 0;
      return keys * adr * avgOccupancy * 365;
    }
    if (operation.operationType === 'VILLAS') {
      const villas = operation as any;
      const units = villas.units ?? 0;
      const adr = villas.avgNightlyRate ?? 0;
      const avgOccupancy = villas.occupancyByMonth 
        ? villas.occupancyByMonth.reduce((sum: number, occ: number) => sum + occ, 0) / villas.occupancyByMonth.length
        : 0;
      return units * adr * avgOccupancy * 365;
    }
    return 0;
  };

  const operationPnl = getOperationPnl();
  const hasLiveData = operationPnl !== null;

  let label: string;
  let value: string;
  let isEstimated: boolean = false;
  let IconComponent: typeof DollarSign;

  switch (kpiType) {
    case 'revpar':
      label = 'RevPAR';
      IconComponent = TrendingUp;
      const revpar = operationPnl
        ? (operation.operationType === 'HOTEL' || operation.operationType === 'VILLAS')
          ? (operationPnl.revenue / 365) / ((operation as any).keys ?? (operation as any).units ?? 1)
          : null
        : calculateRevPARFromConfig();
      value = revpar !== null ? formatCurrency(revpar) : 'N/A';
      isEstimated = !hasLiveData && revpar !== null;
      break;

    case 'revenue':
      label = 'Total Revenue';
      IconComponent = DollarSign;
      const totalRevenue = operationPnl?.revenue ?? calculateEstimatedRevenueFromConfig();
      value = totalRevenue > 0 ? formatCurrency(totalRevenue) : 'N/A';
      isEstimated = !hasLiveData && totalRevenue > 0;
      break;

    case 'noiMargin':
      label = 'NOI Margin';
      IconComponent = Percent;
      const noiMargin = operationPnl && operationPnl.revenue > 0
        ? operationPnl.noi / operationPnl.revenue
        : null;
      value = noiMargin !== null ? formatPercent(noiMargin) : 'N/A';
      isEstimated = !hasLiveData;
      break;
  }

  return (
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
        {label}
      </div>
      <div style={{
        fontSize: '1.75rem',
        fontWeight: 600,
        color: kpiType === 'noiMargin' && value !== 'N/A' && parseFloat(value.replace('%', '')) > 0
          ? 'var(--success)'
          : 'var(--text-primary)',
        fontVariantNumeric: 'tabular-nums',
        marginBottom: isEstimated ? '0.5rem' : 0,
      }}>
        {value}
      </div>
      {isEstimated && (
        <div style={{
          fontSize: '0.6875rem',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
        }}>
          Estimated
        </div>
      )}
      {!hasLiveData && kpiType === 'noiMargin' && (
        <div style={{
          fontSize: '0.6875rem',
          color: 'var(--text-secondary)',
          marginTop: '0.5rem',
          fontStyle: 'italic',
        }}>
          Run model
        </div>
      )}
    </div>
  );
}

