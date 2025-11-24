import { useState } from 'react';
import { useAudit } from '../ui/contexts/AuditContext';
import { InspectorOverlay, type InspectorData } from './audit/InspectorOverlay';
import { getAuditTrace } from '../engines/audit/inspectorEngine';
import { Sparkline } from '../components/dashboard/Sparkline';
import type { ConsolidatedAnnualPnl, FullModelOutput } from '@domain/types';

interface ScenarioSummaryPanelProps {
  consolidatedAnnualPnl: ConsolidatedAnnualPnl[];
  fullOutput?: FullModelOutput; // Optional: for Inspector functionality
}

/**
 * Formats a number as currency.
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ScenarioSummaryPanel({ consolidatedAnnualPnl, fullOutput }: ScenarioSummaryPanelProps) {
  const { isAuditMode } = useAudit();
  const [inspectorData, setInspectorData] = useState<InspectorData | null>(null);
  const [inspectorPosition, setInspectorPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  // Show Year 1 (yearIndex 0) and optionally more years
  const displayYears = consolidatedAnnualPnl.slice(0, 3); // First 3 years

  // Prepare trend data for sparklines (Revenue and NOI trends up to each year)
  const getTrendData = (yearIndex: number, metric: 'revenue' | 'noi'): number[] => {
    const dataUpToYear = consolidatedAnnualPnl
      .filter((pnl) => pnl.yearIndex <= yearIndex)
      .map((pnl) => metric === 'revenue' ? pnl.revenueTotal : pnl.noi);
    return dataUpToYear;
  };

  const handleNoiClick = (event: React.MouseEvent, pnl: ConsolidatedAnnualPnl) => {
    if (!isAuditMode || !fullOutput) return;

    // Get audit trace for NOI with year index
    const auditTrace = getAuditTrace('noi', fullOutput, pnl.yearIndex);
    
    // Convert audit trace to InspectorData format
    // Use components if available, otherwise use values dictionary
    const inputs = auditTrace.components && auditTrace.components.length > 0
      ? auditTrace.components.map((comp) => ({
          label: comp.name,
          value: formatCurrency(comp.value),
        }))
      : Object.entries(auditTrace.values).map(([key, value]) => ({
          label: key.charAt(0).toUpperCase() + key.slice(1),
          value: formatCurrency(value),
        }));

    const inspectorData: InspectorData = {
      value: formatCurrency(pnl.noi),
      formula: auditTrace.formula,
      inputs,
    };

    setInspectorData(inspectorData);
    setInspectorPosition({ x: event.clientX, y: event.clientY });
  };

  const handleCloseInspector = () => {
    setInspectorData(null);
    setInspectorPosition(undefined);
  };

  const auditStyle = isAuditMode && fullOutput
    ? {
        textDecoration: 'underline',
        textDecorationStyle: 'dashed' as const,
        textDecorationColor: '#9C27B0',
        cursor: 'pointer',
      }
    : {};

  return (
    <>
      <div className="scenario-summary-panel card">
        <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Scenario Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Total Operating Revenue</th>
              <th title="Gross Operating Profit (Revenue - Departmental Expenses)">GOP (Gross Operating Profit)</th>
              <th title="Net Operating Income (GOP - Undistributed Expenses - Non-Operating Income/Expense)">NOI (Net Operating Income)</th>
              <th>Replacement Reserve</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {displayYears.map((pnl) => {
              const revenueTrend = getTrendData(pnl.yearIndex, 'revenue');
              const noiTrend = getTrendData(pnl.yearIndex, 'noi');
              return (
                <tr key={pnl.yearIndex}>
                  <td>{pnl.yearIndex}</td>
                  <td>{formatCurrency(pnl.revenueTotal)}</td>
                  <td>{formatCurrency(pnl.gop ?? (pnl.revenueTotal - (pnl.departmentalExpenses ?? pnl.cogsTotal)))}</td>
                  <td>
                    <span
                      style={auditStyle}
                      onClick={(e) => handleNoiClick(e, pnl)}
                      title={isAuditMode && fullOutput ? 'Click to inspect NOI calculation' : undefined}
                    >
                      {formatCurrency(pnl.noi)}
                    </span>
                  </td>
                  <td>{formatCurrency(pnl.maintenanceCapex)}</td>
                  <td style={{ padding: '0.5rem', width: '120px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Revenue</div>
                      <Sparkline data={revenueTrend} height={20} color="#4CAF50" />
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '2px' }}>NOI</div>
                      <Sparkline data={noiTrend} height={20} color={noiTrend[noiTrend.length - 1] >= (noiTrend[0] || 0) ? '#4CAF50' : '#F44336'} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {inspectorData && (
        <InspectorOverlay
          data={inspectorData}
          onClose={handleCloseInspector}
          position={inspectorPosition}
        />
      )}
    </>
  );
}

