/**
 * Correlation Scatter Plot Component (v2.1: Correlation UI)
 * 
 * Visualizes correlation between two variables using a scatter plot.
 * Shows sampled data points from Monte Carlo simulation to demonstrate correlation visually.
 */

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SensitivityVariable } from '../../domain/types';

interface CorrelationScatterPlotProps {
  variable1: SensitivityVariable;
  variable2: SensitivityVariable;
  correlation: number; // Correlation coefficient
  samples: Array<{ x: number; y: number }>; // Sample pairs from simulation (limit to first 1000 for performance)
}

/**
 * Get display label for a sensitivity variable.
 */
function getVariableLabel(variable: SensitivityVariable): string {
  switch (variable) {
    case 'occupancy':
      return 'Occupancy';
    case 'adr':
      return 'ADR';
    case 'interestRate':
      return 'Interest Rate';
    case 'discountRate':
      return 'Discount Rate';
    case 'exitCap':
      return 'Exit Cap Rate';
    case 'initialInvestment':
      return 'Initial Investment';
    case 'debtAmount':
      return 'Debt Amount';
    case 'terminalGrowthRate':
      return 'Terminal Growth Rate';
    default:
      return variable;
  }
}

/**
 * Custom tooltip for scatter plot.
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '0.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <p style={{ margin: 0, fontWeight: 600 }}>
          {`X: ${data.x.toFixed(4)}`}
        </p>
        <p style={{ margin: 0, fontWeight: 600 }}>
          {`Y: ${data.y.toFixed(4)}`}
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Correlation Scatter Plot Component
 * 
 * Only displays if correlation is high (|correlation| > 0.5) to avoid cluttering UI with low-correlation plots.
 */
export function CorrelationScatterPlot({
  variable1,
  variable2,
  correlation,
  samples,
}: CorrelationScatterPlotProps) {
  // Only show if correlation is significant
  if (Math.abs(correlation) <= 0.5) {
    return null;
  }

  // Limit samples to first 1000 for performance
  const displaySamples = samples.slice(0, 1000);

  // Prepare data for recharts (expects array of objects with x and y)
  const chartData = displaySamples.map(sample => ({
    x: sample.x,
    y: sample.y,
  }));

  // Determine color based on correlation
  const color = correlation > 0 
    ? 'rgba(33, 150, 243, 0.6)' // Blue for positive
    : 'rgba(244, 67, 54, 0.6)'; // Red for negative

  return (
    <div style={{ 
      width: '100%', 
      marginTop: '1rem',
      padding: '1rem',
      border: '1px solid var(--border-color, #ddd)',
      borderRadius: '4px',
      backgroundColor: 'white',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '1rem', 
          fontWeight: 600,
        }}>
          {getVariableLabel(variable1)} vs {getVariableLabel(variable2)}
        </h4>
        <span style={{
          padding: '0.25rem 0.75rem',
          backgroundColor: correlation > 0 ? 'rgba(33, 150, 243, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          borderRadius: '4px',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: correlation > 0 ? '#1976D2' : '#C62828',
        }}>
          ρ = {correlation.toFixed(2)}
        </span>
      </div>
      
      <div style={{ width: '100%', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={getVariableLabel(variable1)}
              label={{ 
                value: getVariableLabel(variable1), 
                position: 'insideBottom', 
                offset: -5 
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={getVariableLabel(variable2)}
              label={{ 
                value: getVariableLabel(variable2), 
                angle: -90, 
                position: 'insideLeft' 
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              name="Samples"
              data={chartData}
              fill={color}
            >
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <p style={{
        marginTop: '0.5rem',
        fontSize: '0.75rem',
        color: 'var(--text-secondary, #666)',
        fontStyle: 'italic',
      }}>
        Showing {displaySamples.length} of {samples.length} samples. 
        {correlation > 0 
          ? ' Positive correlation: variables tend to move together.' 
          : ' Negative correlation: variables tend to move in opposite directions.'}
      </p>
    </div>
  );
}

