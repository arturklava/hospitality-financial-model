/**
 * Cash Flow Profile Chart component (v0.6).
 * 
 * Displays NOI, Debt Service, and Maintenance CapEx as stacked bars,
 * with Levered FCF as a line overlay.
 */

import {
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import type { ConsolidatedAnnualPnl, LeveredFcf } from '@domain/types';

interface CashFlowChartProps {
  consolidatedPnl: ConsolidatedAnnualPnl[];
  leveredFcf: LeveredFcf[];
  height?: number;
}

export function CashFlowChart({ consolidatedPnl, leveredFcf }: CashFlowChartProps) {
  // Prepare data for the chart using USALI terminology
  const chartData = consolidatedPnl.map((pnl) => {
    const levered = leveredFcf.find((lf) => lf.yearIndex === pnl.yearIndex);
    return {
      year: `Year ${pnl.yearIndex}`,
      yearIndex: pnl.yearIndex,
      gop: pnl.gop ?? (pnl.revenueTotal - (pnl.departmentalExpenses ?? pnl.cogsTotal)), // USALI: Gross Operating Profit
      noi: pnl.noi, // USALI: Net Operating Income
      debtService: -(levered?.debtService ?? 0), // Negative for visual clarity
      replacementReserve: -pnl.maintenanceCapex, // USALI: Replacement Reserve (negative for visual clarity)
      leveredFcf: levered?.leveredFreeCashFlow ?? 0,
    };
  });

  // Validate data
  const hasValidData = consolidatedPnl && consolidatedPnl.length > 0;
  
  if (!hasValidData) {
    return (
      <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
        <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
          No Data Available
        </div>
      </div>
    );
  }

  // Determine phases: Construction (first 2 years) vs Stabilization (rest)
  const constructionEndYear = Math.min(1, chartData.length - 1);
  const constructionStartLabel = chartData[0]?.year || 'Year 0';
  const constructionEndLabel = chartData[constructionEndYear]?.year || 'Year 1';
  const stabilizationStartLabel = chartData.length > 2 ? chartData[2]?.year : null;
  const stabilizationEndLabel = chartData.length > 0 ? chartData[chartData.length - 1]?.year : null;

  return (
    <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
          <defs>
            {/* Gradient for GOP - Teal fade */}
            <linearGradient id="gopGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity={1} />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.3} />
            </linearGradient>
            {/* Gradient for NOI - Emerald fade */}
            <linearGradient id="noiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
            </linearGradient>
            {/* Gradient for Debt Service - Red fade */}
            <linearGradient id="debtServiceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
            </linearGradient>
            {/* Gradient for Replacement Reserve - Orange fade */}
            <linearGradient id="replacementReserveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0.3} />
            </linearGradient>
          </defs>
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
              value: 'Amount ($)', 
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
            formatter={(value: unknown) => {
              const numValue = typeof value === 'number' ? value : 0;
              const absValue = Math.abs(numValue);
              if (absValue >= 1000000) return `$${(numValue / 1000000).toFixed(2)}M`;
              if (absValue >= 1000) return `$${(numValue / 1000).toFixed(2)}K`;
              return `$${numValue.toFixed(2)}`;
            }}
          />
          <Legend 
            wrapperStyle={{
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              fontSize: '12px',
            }}
          />
          
          {/* Reference Areas for phases */}
          {constructionEndYear >= 0 && (
            <ReferenceArea
              x1={constructionStartLabel}
              x2={constructionEndLabel}
              fill="#FFF3E0"
              fillOpacity={0.3}
              label={{ value: "Construction Period", position: "top", fill: "#FF9800", fontSize: 11 }}
            />
          )}
          {stabilizationStartLabel && stabilizationEndLabel && (
            <ReferenceArea
              x1={stabilizationStartLabel}
              x2={stabilizationEndLabel}
              fill="#E8F5E9"
              fillOpacity={0.3}
              label={{ value: "Stabilization", position: "top", fill: "#4CAF50", fontSize: 11 }}
            />
          )}
          
          {/* Bars with gradient fills */}
          <Bar dataKey="gop" stackId="cash" fill="url(#gopGradient)" name="GOP (Gross Operating Profit - Revenue - Departmental Expenses)" isAnimationActive={true} animationDuration={1000} />
          <Bar dataKey="noi" stackId="cash" fill="url(#noiGradient)" name="NOI (Net Operating Income - GOP - Undistributed - Non-Op)" isAnimationActive={true} animationDuration={1000} />
          <Bar dataKey="debtService" stackId="cash" fill="url(#debtServiceGradient)" name="Debt Service" isAnimationActive={true} animationDuration={1000} />
          <Bar dataKey="replacementReserve" stackId="cash" fill="url(#replacementReserveGradient)" name="Replacement Reserve" isAnimationActive={true} animationDuration={1000} />
          <Line 
            type="monotone" 
            dataKey="leveredFcf" 
            stroke="var(--color-chart-blue)" 
            strokeWidth={2}
            name="Levered FCF"
            dot={{ r: 4 }}
            isAnimationActive={true}
            animationDuration={1000}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

