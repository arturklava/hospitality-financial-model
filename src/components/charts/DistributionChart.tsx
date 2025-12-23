/**
 * Distribution Chart component (v1.3).
 * 
 * Displays LP vs GP distributions as a stacked bar chart using recharts.
 */

import { useState } from 'react';
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
import { Download } from 'lucide-react';
import type { WaterfallResult } from '../../domain/types';
import { formatCurrency } from '../../utils/formatters';
import { NoDataState } from './NoDataState';

interface DistributionChartProps {
  waterfallResult: WaterfallResult;
  height?: number;
}

export function DistributionChart({ waterfallResult }: DistributionChartProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Validate data
  const hasValidData = waterfallResult?.annualRows && waterfallResult.annualRows.length > 0;

  if (!hasValidData) {
    return <NoDataState height={400} message="No Distribution Data" description="Run the model to see LP/GP distributions" />;
  }

  // Export data to CSV
  const handleExport = () => {
    setIsExporting(true);
    try {
      const chartData = waterfallResult.annualRows.map((row) => {
        let lpTotal = 0;
        let gpTotal = 0;

        waterfallResult.partners.forEach((partner) => {
          const distribution = row.partnerDistributions[partner.partnerId] ?? 0;
          if (partner.partnerId.toLowerCase().includes('lp')) {
            lpTotal += distribution;
          } else {
            gpTotal += distribution;
          }
        });

        return {
          Year: `Year ${row.yearIndex}`,
          'Owner Cash Flow': formatCurrency(row.ownerCashFlow),
          'LP Distribution': formatCurrency(lpTotal),
          'GP Distribution': formatCurrency(gpTotal),
          'Total Distribution': formatCurrency(lpTotal + gpTotal),
        };
      });

      const headers = Object.keys(chartData[0]);
      const csvContent = [
        headers.join(','),
        ...chartData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `waterfall_distribution_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Prepare data for the chart - aggregate LP and GP distributions
  const chartData = waterfallResult.annualRows.map((row) => {
    let lpTotal = 0;
    let gpTotal = 0;

    // Sum distributions by partner type (LP vs GP)
    waterfallResult.partners.forEach((partner) => {
      const distribution = row.partnerDistributions[partner.partnerId] ?? 0;
      // Assume partnerId 'lp' or contains 'lp' is LP, otherwise GP
      if (partner.partnerId.toLowerCase().includes('lp')) {
        lpTotal += distribution;
      } else {
        gpTotal += distribution;
      }
    });

    return {
      year: `Year ${row.yearIndex}`,
      yearIndex: row.yearIndex,
      LP: lpTotal,
      GP: gpTotal,
    };
  });

  const colors = {
    LP: 'var(--color-chart-blue)',
    GP: 'var(--color-chart-emerald)',
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      return (
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '0.75rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          {payload.map((entry: any, index: number) => {
            const value = entry.value || 0;
            const percentage = total > 0 ? (value / total) * 100 : 0;
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
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    {percentage.toFixed(1)}% of Total
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
    <div style={{ width: '100%', height: '400px', minHeight: '400px', position: 'relative' }}>
      <button
        onClick={handleExport}
        disabled={isExporting}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          padding: '0.5rem 0.75rem',
          backgroundColor: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
          opacity: isExporting ? 0.6 : 1,
        }}
        title="Export data to CSV"
      >
        <Download size={16} />
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
        >
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
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="LP" stackId="distributions" fill={colors.LP} name="LP" isAnimationActive={true} animationDuration={1000} />
          <Bar dataKey="GP" stackId="distributions" fill={colors.GP} name="GP" isAnimationActive={true} animationDuration={1000} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

