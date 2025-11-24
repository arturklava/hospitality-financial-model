/**
 * REaaS Bar Chart component (v1.4).
 * 
 * Displays a stacked bar chart comparing "Recurring" (REaaS) vs "One-Off" (Non-REaaS) revenue over time.
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

interface ReaasBarChartData {
  year: string;
  yearIndex: number;
  recurring: number;  // REaaS revenue
  oneOff: number;      // Non-REaaS revenue
}

interface ReaasBarChartProps {
  data: ReaasBarChartData[];
  height?: number;
  title?: string;
}

export function ReaasBarChart({ data, title }: ReaasBarChartProps) {
    // Validate data
    const hasValidData = data && data.length > 0;
    
    if (!hasValidData) {
      return (
        <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
          {title && (
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>{title}</h3>
          )}
          <div className="flex items-center justify-center h-full text-slate-400">
            No Data Available
          </div>
        </div>
      );
    }

    // Custom tooltip formatter
    const customTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const recurring = payload.find((p: any) => p.dataKey === 'recurring')?.value || 0;
        const oneOff = payload.find((p: any) => p.dataKey === 'oneOff')?.value || 0;
        const total = recurring + oneOff;
        const recurringPct = total > 0 ? (recurring / total * 100) : 0;
        const oneOffPct = total > 0 ? (oneOff / total * 100) : 0;

        return (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{payload[0].payload.year}</p>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#4CAF50' }}>● </span>
              <span style={{ fontWeight: 500 }}>Recurring (REaaS): </span>
              <span>${recurring.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              <span style={{ color: '#666', marginLeft: '8px' }}>({recurringPct.toFixed(1)}%)</span>
            </div>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#FF9800' }}>● </span>
              <span style={{ fontWeight: 500 }}>One-Off (Non-REaaS): </span>
              <span>${oneOff.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              <span style={{ color: '#666', marginLeft: '8px' }}>({oneOffPct.toFixed(1)}%)</span>
            </div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
              <span style={{ fontWeight: 600 }}>Total: </span>
              <span>${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        );
      }
      return null;
    };

    return (
      <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
        {title && (
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>{title}</h3>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
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
                value: 'Revenue ($)', 
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
            <Tooltip content={customTooltip} />
            <Legend 
              wrapperStyle={{
                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="recurring" stackId="revenue" fill="#4CAF50" name="Recurring (REaaS)" isAnimationActive={true} animationDuration={1000} />
            <Bar dataKey="oneOff" stackId="revenue" fill="#FF9800" name="One-Off (Non-REaaS)" isAnimationActive={true} animationDuration={1000} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
}

