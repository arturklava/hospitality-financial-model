/**
 * Liquidity Chart Component (v2.2: Liquidity Dashboard)
 * 
 * Displays monthly cash flow as bars and cumulative cash position as a line.
 * Includes a reference line at zero to visualize cash deficits (the "Valley of Death").
 */

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { MonthlyCashFlow } from '../../domain/types';

interface LiquidityChartProps {
  monthlyCashFlow: MonthlyCashFlow[];
  height?: number;
}

/**
 * Format month label for display.
 */
function formatMonthLabel(yearIndex: number, monthIndex: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Y${yearIndex + 1} ${months[monthIndex]}`;
}

/**
 * Custom tooltip for liquidity chart.
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.5rem' }}>
          {data.monthLabel}
        </p>
        <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
          <span style={{ color: '#666' }}>Monthly Cash Flow: </span>
          <span style={{ fontWeight: 600, color: data.monthlyCashFlow < 0 ? '#f44336' : '#4caf50' }}>
            {new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(data.monthlyCashFlow)}
          </span>
        </p>
        <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
          <span style={{ color: '#666' }}>Cumulative Cash: </span>
          <span style={{ fontWeight: 600, color: data.cumulativeCashFlow < 0 ? '#f44336' : '#2196F3' }}>
            {new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(data.cumulativeCashFlow)}
          </span>
        </p>
        <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
          <span style={{ color: '#666' }}>NOI: </span>
          <span>{new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(data.noi)}</span>
        </p>
        <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
          <span style={{ color: '#666' }}>Debt Service: </span>
          <span>{new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(data.debtService)}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function LiquidityChart({ monthlyCashFlow }: LiquidityChartProps) {
  // Validate data
  const hasValidData = monthlyCashFlow && monthlyCashFlow.length > 0;
  
  if (!hasValidData) {
    return (
      <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
        <div className="flex items-center justify-center h-full text-slate-400">
          No Data Available
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = monthlyCashFlow.map((flow) => ({
    monthNumber: flow.monthNumber,
    monthLabel: formatMonthLabel(flow.yearIndex, flow.monthIndex),
    monthlyCashFlow: flow.monthlyCashFlow,
    cumulativeCashFlow: flow.cumulativeCashFlow,
    cashPosition: flow.cashPosition,
    noi: flow.noi,
    debtService: flow.debtService,
    maintenanceCapex: flow.maintenanceCapex,
  }));

  // Limit to first 60 months (5 years) for readability
  const displayData = chartData.slice(0, 60);

  // Determine color for cash flow bars (green for positive, red for negative) - Theme-aware
  const getBarColor = (value: number) => {
    return value >= 0 ? 'var(--color-chart-green)' : 'var(--color-chart-red)';
  };

  return (
    <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={displayData}
          margin={{ top: 20, right: 30, left: 100, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="monthLabel"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={2}
            tick={{ 
              fontSize: 12, 
              fill: 'var(--text-secondary)',
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}
          />
          <YAxis
            label={{ 
              value: 'Cash Flow ($)', 
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
          <ReferenceLine y={0} stroke="var(--text-tertiary)" strokeDasharray="3 3" label={{ value: "Zero Cash", position: "insideTopRight", fill: 'var(--text-secondary)' }} />
          
          {/* Monthly Cash Flow as Bars */}
          <Bar
            dataKey="monthlyCashFlow"
            name="Monthly Cash Flow"
            isAnimationActive={true}
            animationDuration={1000}
          >
            {displayData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.monthlyCashFlow)}
              />
            ))}
          </Bar>
          
          {/* Cumulative Cash Position as Line */}
          <Line
            type="monotone"
            dataKey="cumulativeCashFlow"
            name="Cumulative Cash Position"
            stroke="var(--color-chart-blue)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={true}
            animationDuration={1000}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      <p style={{
        marginTop: '0.5rem',
        fontSize: '0.875rem',
        color: 'var(--text-secondary, #666)',
        fontStyle: 'italic',
      }}>
        The "Valley of Death" - periods where cumulative cash position falls below zero.
        Showing {displayData.length} of {monthlyCashFlow.length} months.
      </p>
    </div>
  );
}

