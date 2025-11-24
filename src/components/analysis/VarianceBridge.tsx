/**
 * Variance Bridge Component (v3.6: Construction & Variance UI).
 * 
 * Displays a waterfall/bridge chart showing Base NPV → Deltas → Target NPV.
 * Uses floating bars to show positive (green) and negative (red) deltas.
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
  Cell,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

export interface VarianceData {
  label: string;
  value: number;  // Delta value (can be positive or negative)
  isBase?: boolean;  // True for base NPV bar
  isTarget?: boolean;  // True for target NPV bar
}

interface VarianceBridgeProps {
  baseNpv: number;
  targetNpv: number;
  deltas: Array<{ label: string; value: number }>;  // Array of delta changes
  height?: number;
}

/**
 * Prepares data for waterfall chart.
 * Calculates cumulative positions for each bar.
 * Bridge format: Base NPV → Delta 1 → Delta 2 → ... → Target NPV
 */
function prepareWaterfallData(baseNpv: number, targetNpv: number, deltas: Array<{ label: string; value: number }>) {
  const data: Array<{
    label: string;
    value: number;
    start: number;
    end: number;
    isBase: boolean;
    isTarget: boolean;
    isDelta: boolean;
  }> = [];

  // Start with base NPV (bar from 0 to baseNpv)
  data.push({
    label: 'Base NPV',
    value: baseNpv,
    start: 0,
    end: baseNpv,
    isBase: true,
    isTarget: false,
    isDelta: false,
  });

  // Add deltas as floating bars (cumulative progression)
  let currentPosition = baseNpv;
  deltas.forEach((delta) => {
    const start = currentPosition;
    const end = currentPosition + delta.value;
    data.push({
      label: delta.label,
      value: delta.value,
      start,
      end,
      isBase: false,
      isTarget: false,
      isDelta: true,
    });
    currentPosition = end;
  });

  // End with target NPV (bar from 0 to targetNpv for comparison)
  // Note: In a true bridge, this would be the cumulative end, but we show it separately for clarity
  data.push({
    label: 'Target NPV',
    value: targetNpv,
    start: 0,
    end: targetNpv,
    isBase: false,
    isTarget: true,
    isDelta: false,
  });

  return data;
}

/**
 * Custom tooltip for variance bridge chart.
 */
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isBase = data.isBase;
    const isTarget = data.isTarget;

    return (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{data.label}</p>
        {isBase || isTarget ? (
          <p style={{ margin: '4px 0', color: '#2196F3' }}>
            NPV: {formatCurrency(data.value)}
          </p>
        ) : (
          <>
            <p style={{ margin: '4px 0', color: data.value >= 0 ? '#4CAF50' : '#f44336' }}>
              Delta: {formatCurrency(data.value)}
            </p>
            <p style={{ margin: '4px 0', fontSize: '0.875rem', color: '#666' }}>
              From: {formatCurrency(data.start)}
            </p>
            <p style={{ margin: '4px 0', fontSize: '0.875rem', color: '#666' }}>
              To: {formatCurrency(data.end)}
            </p>
          </>
        )}
      </div>
    );
  }
  return null;
}

export function VarianceBridge({ baseNpv, targetNpv, deltas, height = 400 }: VarianceBridgeProps) {
  const chartData = prepareWaterfallData(baseNpv, targetNpv, deltas);

  // Calculate bar positions for waterfall
  // For base and target bars, we show the full value from 0
  // For delta bars, we show floating bars
  const waterfallData = chartData.map((item) => {
    if (item.isBase || item.isTarget) {
      // Base and target bars start at 0 and go to their value
      return {
        ...item,
        barStart: 0,
        barValue: item.value,
      };
    } else {
      // Delta bars are floating - start at current position, value is the delta
      return {
        ...item,
        barStart: item.start,
        barValue: item.value,
      };
    }
  });

  // For waterfall chart, we need to use a custom approach
  // Recharts doesn't natively support floating bars, so we'll use stacked bars
  // with invisible base segments
  const waterfallChartData = waterfallData.map((item) => {
    if (item.isBase || item.isTarget) {
      return {
        label: item.label,
        base: 0,
        value: item.value,
        isBase: item.isBase,
        isTarget: item.isTarget,
        isDelta: false,
      };
    } else {
      // For deltas, we need invisible base + visible delta
      return {
        label: item.label,
        base: item.start,  // Invisible base to position the bar
        value: item.value,  // Visible delta bar
        isBase: false,
        isTarget: false,
        isDelta: true,
      };
    }
  });

  return (
    <div style={{ width: '100%', height: `${height}px`, minHeight: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={waterfallChartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{ value: 'NPV ($)', angle: -90, position: 'insideLeft' }}
            tickFormatter={(value: number) => {
              if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
              if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
              return `$${value.toFixed(0)}`;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Invisible base bars for positioning delta bars */}
          <Bar
            dataKey="base"
            stackId="waterfall"
            fill="transparent"
            stroke="none"
            hide
          />
          
          {/* Visible bars (base, deltas, target) */}
          <Bar
            dataKey="value"
            stackId="waterfall"
            name="Value"
          >
            {waterfallChartData.map((entry, index) => {
              let color = '#2196F3';
              if (entry.isDelta) {
                color = entry.value >= 0 ? '#4CAF50' : '#f44336';
              } else if (entry.isBase) {
                color = '#2196F3';
              } else if (entry.isTarget) {
                color = '#2196F3';
              }
              return (
                <Cell key={`cell-${index}`} fill={color} />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

