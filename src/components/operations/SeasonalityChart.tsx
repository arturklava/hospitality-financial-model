/**
 * Seasonality Chart Component (v3.5: Seasonality UI)
 * 
 * Displays a Recharts BarChart for 12 months with inputs below each bar to adjust factors.
 * Shows average feedback: Green if average = 1.0, Red if average != 1.0 (warning).
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface SeasonalityChartProps {
  values: number[]; // Array of 12 monthly factors
  onChange: (values: number[]) => void;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function SeasonalityChart({ values, onChange }: SeasonalityChartProps) {
  // Ensure we have exactly 12 values
  const normalizedValues = useMemo(() => {
    if (!values || values.length !== 12) {
      return Array(12).fill(1.0);
    }
    return [...values];
  }, [values]);

  // Calculate average
  const average = useMemo(() => {
    const sum = normalizedValues.reduce((acc, val) => acc + val, 0);
    return sum / 12;
  }, [normalizedValues]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return MONTH_NAMES.map((month, index) => ({
      month,
      index,
      value: normalizedValues[index],
    }));
  }, [normalizedValues]);

  // Handle factor change for a specific month
  const handleFactorChange = (monthIndex: number, newValue: string) => {
    const numValue = parseFloat(newValue);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }

    const updatedValues = [...normalizedValues];
    updatedValues[monthIndex] = numValue;
    onChange(updatedValues);
  };

  // Custom tooltip
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{data.month}</p>
          <p style={{ margin: 0 }}>
            Factor: <strong>{data.value.toFixed(2)}x</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Determine average color (green if 1.0, red if not)
  const averageColor = average === 1.0 ? '#4CAF50' : '#c62828';
  const averageText = average === 1.0 
    ? 'Average: 1.0 (Balanced)'
    : `Average: ${average.toFixed(2)} (Warning: ${average > 1.0 ? 'inflates' : 'deflates'} revenue)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Chart */}
      <div style={{ width: '100%', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 60, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis 
              label={{ value: 'Factor', angle: -90, position: 'left', offset: 0 }}
              domain={[0, 'dataMax + 0.5']}
              tickFormatter={(value: number) => value.toFixed(1)}
            />
            <Tooltip content={customTooltip} />
            <ReferenceLine y={1.0} stroke="#999" strokeDasharray="2 2" label={{ value: '1.0', position: 'right' }} />
            <Bar dataKey="value" fill="#2196F3" name="Seasonality Factor" isAnimationActive={true} animationDuration={1000} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Average Feedback */}
      <div style={{
        padding: '0.75rem',
        backgroundColor: average === 1.0 ? '#e8f5e9' : '#ffebee',
        border: `1px solid ${averageColor}`,
        borderRadius: '4px',
        textAlign: 'center',
      }}>
        <span style={{
          fontSize: '0.875rem',
          fontWeight: 500,
          color: averageColor,
        }}>
          {averageText}
        </span>
      </div>

      {/* Input Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '0.75rem',
      }}>
        {MONTH_NAMES.map((month, index) => (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}>
              {month}
            </label>
            <input
              type="number"
              value={normalizedValues[index].toFixed(2)}
              onChange={(e) => handleFactorChange(index, e.target.value)}
              min="0"
              step="0.1"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm, 4px)',
                fontSize: '0.875rem',
                textAlign: 'center',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

