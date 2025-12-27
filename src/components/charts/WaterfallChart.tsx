/**
 * Waterfall Chart component (v0.6).
 * 
 * Displays partner distributions per year as a stacked bar chart.
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
import type { WaterfallResult } from '@domain/types';
import { NoDataState } from './NoDataState';
import { useTranslation } from '../../contexts/LanguageContext';

interface WaterfallChartProps {
  waterfallResult: WaterfallResult;
  height?: number;
}

export function WaterfallChart({ waterfallResult }: WaterfallChartProps) {
  const { t } = useTranslation();

  // Validate data
  const hasValidData = waterfallResult?.annualRows && waterfallResult.annualRows.length > 0;

  if (!hasValidData) {
    return (
      <NoDataState
        height={400}
        message={t('charts.waterfall.noDataTitle')}
        description={t('charts.waterfall.noDataDescription')}
      />
    );
  }

  // Prepare data for the chart
  const chartData = waterfallResult.annualRows.map((row) => {
    const data: Record<string, number | string> = {
      year: `Year ${row.yearIndex}`,
      yearIndex: row.yearIndex,
    };

    // Add each partner's distribution
    waterfallResult.partners.forEach((partner) => {
      data[partner.partnerId] = row.partnerDistributions[partner.partnerId] ?? 0;
    });

    return data;
  });

  // Color palette for partners - using CSS variables for theme support
  const getPartnerColor = (partnerId: string): string => {
    const id = partnerId.toLowerCase();
    if (id.includes('lp')) {
      return 'var(--color-chart-blue)';
    } else if (id.includes('gp')) {
      return 'var(--color-chart-emerald)';
    }
    return 'var(--color-chart-indigo)';
  };

  return (
    <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="year"
            tick={{
              fill: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}
          />
          <YAxis
            label={{
              value: 'Distribution ($)',
              angle: -90,
              position: 'left',
              offset: 0,
              fill: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}
            tick={{
              fill: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}
            tickFormatter={(value: number) => {
              const absValue = Math.abs(value);
              if (absValue >= 1000000) {
                return `$${(value / 1000000).toFixed(1)}M`;
              }
              if (absValue >= 1000) {
                return `$${(value / 1000).toFixed(0)}K`;
              }
              return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
            }}
          />
          <Tooltip
            formatter={(value: number) => {
              const absValue = Math.abs(value);
              if (absValue >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
              if (absValue >= 1000) return `$${(value / 1000).toFixed(2)}K`;
              return `$${value.toFixed(2)}`;
            }}
          />
          <Legend
            wrapperStyle={{
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              fontSize: '12px',
            }}
          />
          {waterfallResult.partners.map((partner) => (
            <Bar
              key={partner.partnerId}
              dataKey={partner.partnerId}
              stackId="distributions"
              fill={getPartnerColor(partner.partnerId)}
              name={partner.partnerId.toUpperCase()}
              isAnimationActive={true}
              animationDuration={1000}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

