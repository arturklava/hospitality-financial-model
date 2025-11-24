/**
 * Financial Bridge (Waterfall) Chart component (v4.5).
 * 
 * Displays a waterfall chart showing the flow from Revenue -> Expenses -> NOI.
 * Uses Red/Green colors for positive/negative steps.
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
import type { ConsolidatedAnnualPnl } from '@domain/types';

interface FinancialBridgeProps {
  consolidatedPnl: ConsolidatedAnnualPnl[];
  height?: number;
}

/**
 * Prepares data for waterfall chart.
 * Transforms data so each bar starts where the previous one ended.
 * For each year: Revenue (positive, green) -> Expenses (negative, red) -> NOI (final, green/red).
 */
function prepareWaterfallData(pnl: ConsolidatedAnnualPnl[]) {
  return pnl.map((entry) => {
    const revenue = entry.revenueTotal;
    const expenses = entry.departmentalExpenses ?? entry.cogsTotal;
    const noi = entry.noi;
    
    // Waterfall calculation: each bar starts where previous ended
    // Revenue bar: starts at 0, goes to revenue
    const revenueStart = 0;
    const revenueEnd = revenue;
    
    // Expenses bar: starts at revenue, goes down by expenses amount
    const expensesStart = revenueEnd;
    const expensesEnd = revenueEnd - expenses;
    
    // NOI is the final result (revenue - expenses)
    // We show it as a connecting point/bar
    const noiValue = noi;
    
    return {
      year: `Year ${entry.yearIndex}`,
      yearIndex: entry.yearIndex,
      // For stacked bars, we need to show:
      // 1. Revenue (positive, from 0 to revenue)
      revenue,
      // 2. Expenses (negative, from revenue to revenue-expenses)
      expenses: -expenses,
      // 3. NOI as final value (for display)
      noi: noiValue,
      // Waterfall positions for custom rendering
      revenueStart,
      revenueEnd,
      expensesStart,
      expensesEnd,
      noiFinal: noiValue,
    };
  });
}

export function FinancialBridge({ consolidatedPnl, height = 400 }: FinancialBridgeProps) {
  // Validate data
  const hasValidData = consolidatedPnl && consolidatedPnl.length > 0;
  
  if (!hasValidData) {
    return (
      <div style={{ width: '100%', height: `${height}px`, minHeight: `${height}px` }}>
        <div className="flex items-center justify-center h-full text-slate-400">
          No Data Available
        </div>
      </div>
    );
  }

  const chartData = prepareWaterfallData(consolidatedPnl);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry: any, index: number) => {
            const value = entry.value as number;
            const absValue = Math.abs(value);
            let formattedValue: string;
            if (absValue >= 1000000) {
              formattedValue = `$${(value / 1000000).toFixed(2)}M`;
            } else if (absValue >= 1000) {
              formattedValue = `$${(value / 1000).toFixed(2)}K`;
            } else {
              formattedValue = `$${value.toFixed(2)}`;
            }
            return (
              <div key={index} style={{ marginBottom: '4px' }}>
                <span style={{ color: entry.color }}>● </span>
                <span style={{ fontWeight: 500 }}>{entry.name}: </span>
                <span>{formattedValue}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: `${height}px`, minHeight: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
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
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              fontSize: '12px',
            }}
          />
          
          {/* Revenue - Green (positive, starts at 0) */}
          <Bar dataKey="revenue" name="Revenue" stackId="waterfall" fill="#4CAF50">
            {chartData.map((_entry, index) => (
              <Cell key={`revenue-${index}`} fill="#4CAF50" />
            ))}
          </Bar>
          
          {/* Expenses - Red (negative, stacked on top of revenue) */}
          <Bar dataKey="expenses" name="Expenses" stackId="waterfall" fill="#F44336">
            {chartData.map((_entry, index) => (
              <Cell key={`expenses-${index}`} fill="#F44336" />
            ))}
          </Bar>
          
          {/* NOI - Final value indicator (Green if positive, Red if negative) */}
          <Bar dataKey="noi" name="NOI (Final)">
            {chartData.map((entry, index) => {
              const color = entry.noi >= 0 ? '#4CAF50' : '#F44336';
              return (
                <Cell key={`noi-${index}`} fill={color} />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

