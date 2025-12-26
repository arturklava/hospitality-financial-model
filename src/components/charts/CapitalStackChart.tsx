/**
 * Capital Stack Chart component (v3.1).
 * 
 * Displays Sources of Cash (Equity, Debt Tranches) as a vertical stacked bar chart.
 * Enhanced with animations, glassmorphism tooltip, and semantic color palette.
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
import type { CapitalStructureConfig } from '../../domain/types';
import { NoDataState } from './NoDataState';
import { formatCurrency } from '../../utils/formatters';
import { normalizeCapitalData } from '../../domain/capitalHelpers';
import { useTranslation } from '../../contexts/LanguageContext';

interface CapitalStackChartProps {
  capitalConfig: CapitalStructureConfig;
  height?: number;
}

export function CapitalStackChart({ capitalConfig }: CapitalStackChartProps) {
  const { t } = useTranslation();

  // Normalize capital data to ensure safe handling of undefined/null/empty debtTranches
  const normalized = normalizeCapitalData(capitalConfig);

  // Use normalized data (guaranteed to be safe)
  const totalDebt = normalized.totalDebt || 0;
  const totalEquity = normalized.totalEquity || 0;
  const totalInvestment = normalized.initialInvestment || 0;
  const seniorDebt = normalized.seniorDebt || 0;
  const mezzDebt = normalized.mezzDebt || 0;
  const otherDebt = normalized.otherDebt || 0;

  // Prepare chart data - single vertical stacked bar for Sources
  const chartData = [
    {
      name: 'Capital Stack',
      'Equity': totalEquity,
      'Senior Debt': seniorDebt,
      'Mezzanine Debt': mezzDebt,
      'Other Debt': otherDebt,
    },
  ];

  // Handle empty or invalid data gracefully
  const totalCapital = totalDebt + totalEquity;
  const hasValidData = totalInvestment > 0 && totalCapital > 0 &&
    !Number.isNaN(totalCapital) &&
    Number.isFinite(totalCapital);

  if (!hasValidData) {
    return (
      <NoDataState
        height={300}
        message={t('charts.capital.noDataTitle')}
        description={t('charts.capital.noDataDescription')}
      />
    );
  }

  // Semantic color palette (v3.1)
  const colors = {
    'Equity': 'var(--color-chart-emerald)',      // Emerald-500
    'Senior Debt': 'var(--color-chart-blue)',    // Blue-600
    'Mezzanine Debt': 'var(--color-chart-violet)', // Violet-500
    'Other Debt': 'var(--color-chart-indigo)',    // Indigo (fallback)
  };

  // Glassmorphism tooltip (v3.1)
  const GlassmorphismTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // Filter out zero values for cleaner tooltip
      const nonZeroEntries = payload.filter((entry: any) => (entry.value || 0) > 0);
      if (nonZeroEntries.length === 0) return null;

      const total = nonZeroEntries.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
          minWidth: '200px',
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            marginBottom: '0.75rem',
          }}>
            Capital Stack Breakdown
          </div>
          {nonZeroEntries.map((entry: any, index: number) => {
            const value = entry.value || 0;
            const percentage = total > 0 ? (value / total) * 100 : 0;
            return (
              <div
                key={index}
                style={{
                  marginBottom: index < nonZeroEntries.length - 1 ? '0.75rem' : 0,
                  paddingBottom: index < nonZeroEntries.length - 1 ? '0.75rem' : 0,
                  borderBottom: index < nonZeroEntries.length - 1 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
                }}
              >
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
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}>
                    {entry.name}:
                  </span>
                </div>
                <div style={{ paddingLeft: '1.5rem' }}>
                  <div style={{
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontVariantNumeric: 'tabular-nums',
                    marginBottom: '0.125rem',
                  }}>
                    {formatCurrency(value)}
                  </div>
                  <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {percentage.toFixed(1)}% of Total
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '2px solid rgba(0, 0, 0, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
            }}>
              Total:
            </span>
            <span style={{
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            tick={{
              fill: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}
            tickFormatter={(value) => {
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
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{
              fill: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}
          />
          <Tooltip content={<GlassmorphismTooltip />} />
          <Legend
            wrapperStyle={{
              paddingTop: '1rem',
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              fontSize: '12px',
            }}
            iconType="square"
          />
          <Bar
            dataKey="Equity"
            stackId="capital"
            fill={colors['Equity']}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="Senior Debt"
            stackId="capital"
            fill={colors['Senior Debt']}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="Mezzanine Debt"
            stackId="capital"
            fill={colors['Mezzanine Debt']}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-out"
          />
          {otherDebt > 0 && (
            <Bar
              dataKey="Other Debt"
              stackId="capital"
              fill={colors['Other Debt']}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
