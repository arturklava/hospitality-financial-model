/**
 * Sparkline Component (v2.5)
 * 
 * Minimalist line chart component for showing trends.
 * No axes, no grid, no tooltip - just the line.
 */

import { useTranslation } from 'react-i18next';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  height?: number;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  noDataTitle?: string;
  noDataDescription?: string;
}

/**
 * Determines trend based on data series.
 * Compares first and last values.
 */
function determineTrend(data: number[]): 'up' | 'down' | 'neutral' {
  if (data.length < 2) return 'neutral';
  const first = data[0];
  const last = data[data.length - 1];
  const diff = last - first;
  
  // Use a small threshold to avoid floating point issues
  if (Math.abs(diff) < 0.001) return 'neutral';
  return diff > 0 ? 'up' : 'down';
}

/**
 * Gets color based on trend or provided color.
 */
function getLineColor(trend: 'up' | 'down' | 'neutral', customColor?: string): string {
  if (customColor) return customColor;
  
  // Use CSS custom properties for colors
  switch (trend) {
    case 'up':
      return 'var(--success)'; // Green for positive trend
    case 'down':
      return 'var(--danger)'; // Red for negative trend
    default:
      return 'var(--secondary)'; // Neutral gray
  }
}

export function Sparkline({
  data,
  height = 40,
  trend,
  color,
  noDataTitle,
  noDataDescription
}: SparklineProps) {
  const { t } = useTranslation();

  // Handle empty or invalid data
  if (!data || data.length === 0) {
    const fallbackTitle = noDataTitle ?? t('common.noData');
    const fallbackDescription = noDataDescription ?? t('common.noDataDescription');

    return (
      <div style={{
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        flexDirection: 'column',
        gap: '0.25rem',
        textAlign: 'center'
      }}>
        <span>{fallbackTitle}</span>
        {fallbackDescription && (
          <span style={{ fontSize: '0.7rem' }}>{fallbackDescription}</span>
        )}
      </div>
    );
  }

  // Determine trend if not provided
  const computedTrend = trend ?? determineTrend(data);

  // Transform data for recharts (needs object array)
  const chartData = data.map((value, index) => ({
    value,
    index
  }));

  const lineColor = getLineColor(computedTrend, color);

  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

