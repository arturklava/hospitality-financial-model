/**
 * Asset Waterfall Chart component (v3.2).
 *
 * Displays a simple waterfall chart showing Revenue → Expenses → NOI for a single asset.
 * Colors: Revenue (Blue), Expenses (Red), NOI (Green).
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { OperationConfig, FullModelOutput } from '../../domain/types';
import { formatCurrency } from '../../utils/formatters';
import { runScenarioEngine } from '../../engines/scenario/scenarioEngine';

interface AssetWaterfallChartProps {
  operation: OperationConfig;
  modelOutput?: FullModelOutput;
  height?: number;
}

/**
 * Get operation-level P&L from model output for Year 1.
 */
function getOperationYear1Pnl(
  operation: OperationConfig,
  modelOutput?: FullModelOutput
): { revenue: number; expenses: number; noi: number } | null {
  if (!modelOutput) return null;

  try {
    // Re-run scenario engine to get operation results
    // FullModelOutput.scenario is ProjectScenario (config), not ScenarioEngineResult
    const scenarioResult = runScenarioEngine(modelOutput.scenario);
    if (!scenarioResult.ok) return null;

    const operationResult = scenarioResult.data.operations.find(op => op.operationId === operation.id);
    if (!operationResult?.annualPnl || operationResult.annualPnl.length === 0) return null;

    // Use Year 1 (yearIndex 0)
    const year1Pnl = operationResult.annualPnl.find(pnl => pnl.yearIndex === 0);
    if (!year1Pnl) return null;

    // Calculate waterfall components
    const revenue = year1Pnl.revenueTotal ?? 0;
    // Expenses = COGS + OPEX (departmental + undistributed)
    const expenses = (year1Pnl.cogsTotal ?? 0) + (year1Pnl.opexTotal ?? 0);
    const noi = year1Pnl.noi ?? 0;

    return { revenue, expenses, noi };
  } catch (error) {
    console.error('[AssetWaterfallChart] Error getting operation P&L:', error);
    return null;
  }
}

export function AssetWaterfallChart({
  operation,
  modelOutput,
}: AssetWaterfallChartProps) {
  const waterfallData = getOperationYear1Pnl(operation, modelOutput);

  if (!waterfallData) {
    return (
      <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
        <div className="flex items-center justify-center h-full text-slate-400">
          No Data Available
        </div>
      </div>
    );
  }

  // Prepare chart data - waterfall: Revenue → Expenses → NOI
  const chartData = [
    {
      name: 'Year 1',
      Revenue: waterfallData.revenue,
      Expenses: -waterfallData.expenses, // Negative for visual flow
      NOI: waterfallData.noi,
    },
  ];

  // Color palette as specified: Revenue (Blue), Expenses (Red), NOI (Green)
  const colors = {
    Revenue: '#2196F3',   // Blue
    Expenses: '#F44336',  // Red
    NOI: '#4CAF50',       // Green
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '0.75rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          {payload.map((entry: any, index: number) => {
            const value = Math.abs(entry.value || 0);
            return (
              <div key={index} style={{ marginBottom: index < payload.length - 1 ? '0.5rem' : 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.25rem',
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: entry.color,
                    borderRadius: '2px',
                  }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {entry.name}:
                  </span>
                </div>
                <div style={{ paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {formatCurrency(value)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '1rem' }}
            iconType="square"
          />
          <Bar
            dataKey="Revenue"
            stackId="waterfall"
            fill={colors.Revenue}
            isAnimationActive={true}
            animationDuration={1000}
          />
          <Bar
            dataKey="Expenses"
            stackId="waterfall"
            fill={colors.Expenses}
            isAnimationActive={true}
            animationDuration={1000}
          />
          <Bar
            dataKey="NOI"
            stackId="waterfall"
            fill={colors.NOI}
            isAnimationActive={true}
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

