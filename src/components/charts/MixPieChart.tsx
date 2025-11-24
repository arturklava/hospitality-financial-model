/**
 * Mix Pie Chart component (v1.4).
 * 
 * Displays a pie chart with tooltip showing percentage values.
 * Used for portfolio revenue and NOI mix visualization.
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MixPieChartData {
  name: string;
  value: number;
}

interface MixPieChartProps {
  data: MixPieChartData[];
  height?: number;
  title?: string;
}

export function MixPieChart({ data, title }: MixPieChartProps) {
    // Validate data
    const hasValidData = data && data.length > 0 && data.some(item => item.value > 0);
    
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

    // Calculate total for percentage calculations
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Color palette for pie chart segments
    const COLORS = [
      '#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0',
      '#00BCD4', '#FFC107', '#795548', '#607D8B', '#E91E63'
    ];

    // Custom tooltip formatter to show percentage
    const customTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0];
        const value = data.value as number;
        const percentage = total > 0 ? (value / total * 100) : 0;
        return (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{data.name}</p>
            <p style={{ margin: '4px 0 0 0' }}>
              Value: ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>
              {percentage.toFixed(1)}%
            </p>
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
          <PieChart>
            <Pie
              data={data as any[]}
              cx="40%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              isAnimationActive={true}
              animationDuration={1000}
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ 
                paddingLeft: '20px',
                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
}

