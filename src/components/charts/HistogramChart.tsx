/**
 * Histogram Chart component (v0.11, enhanced v1.6).
 * 
 * Displays frequency distribution of IRR values in buckets using recharts BarChart.
 * Enhanced with reference lines (Mean, VaR, Zero NPV) and color zones (Loss/Profit).
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from 'recharts';

interface HistogramChartProps {
  data: Array<{
    bucket: string;      // e.g., "10-12%", "12-14%"
    frequency: number;   // Count of values in this bucket
    percentile?: number; // Optional percentile info for tooltip
    bucketMin?: number;  // Optional: minimum value for this bucket (for reference lines)
    bucketMax?: number;  // Optional: maximum value for this bucket (for reference lines)
  }>;
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  // Reference lines (v1.6)
  mean?: number;        // Mean value - vertical reference line
  var95?: number;       // VaR (95%) - vertical reference line  
  zeroValue?: number;   // Zero NPV line - vertical reference line (typically 0)
  // Color zones (v1.6)
  lossThreshold?: number; // Value below which is considered "Loss" (red zone)
}

export function HistogramChart({
  data,
  xAxisLabel = 'IRR Buckets',
  yAxisLabel = 'Frequency',
  mean,
  var95,
  zeroValue,
  lossThreshold
}: HistogramChartProps) {
    
    // Custom tooltip to show percentile info
    interface TooltipProps {
      active?: boolean;
      payload?: Array<{
        payload?: {
          bucket: string;
          frequency: number;
          percentile?: number;
        };
      }>;
    }
    const CustomTooltip = ({ active, payload }: TooltipProps) => {
      if (active && payload && payload.length && payload[0]?.payload) {
        const data = payload[0].payload;
        return (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{`${data.bucket}`}</p>
            <p style={{ margin: '4px 0 0 0' }}>{`Frequency: ${data.frequency}`}</p>
            {data.percentile !== undefined && (
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: '#666' }}>
                {`Percentile: ${data.percentile.toFixed(1)}%`}
              </p>
            )}
          </div>
        );
      }
      return null;
    };

    // Helper function to find bucket index for a given value
    const findBucketForValue = (value: number): string | null => {
      for (const item of data) {
        if (item.bucketMin !== undefined && item.bucketMax !== undefined) {
          if (value >= item.bucketMin && value <= item.bucketMax) {
            return item.bucket;
          }
        }
      }
      // If no bucket found, try to parse the bucket string (e.g., "10-12%")
      for (const item of data) {
        const match = item.bucket.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
        if (match) {
          const min = parseFloat(match[1]);
          const max = parseFloat(match[2]);
          if (value >= min && value <= max) {
            return item.bucket;
          }
        }
      }
      return null;
    };

  // Calculate bucket positions for reference lines
    // For numeric reference lines, we need to map them to bucket positions
    // Since we're using bucket strings as dataKey, we'll use the bucket string itself
    const meanBucket = mean !== undefined ? findBucketForValue(mean) : null;
    const varBucket = var95 !== undefined ? findBucketForValue(var95) : null;
    const zeroBucket = zeroValue !== undefined ? findBucketForValue(zeroValue) : null;

  // Validate data
  const hasValidData = data && data.length > 0;
  
  if (!hasValidData) {
    return (
      <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
        <div className="flex items-center justify-center h-full text-slate-400">
          No Data Available
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="bucket" 
            label={{ 
              value: xAxisLabel, 
              position: 'insideBottom', 
              offset: -5,
              fill: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}
            tick={{ 
              fill: 'var(--text-secondary)', 
              fontSize: 12,
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}
          />
          <YAxis 
            label={{ 
              value: yAxisLabel, 
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
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Color zones: Red for Loss, Green for Profit */}
          {lossThreshold !== undefined && (
            <>
              {/* Loss zone (red) - below threshold */}
              <ReferenceArea
                x1={data[0]?.bucket}
                x2={zeroBucket || findBucketForValue(lossThreshold) || data[0]?.bucket}
                fill="#ffebee"
                fillOpacity={0.3}
                stroke="none"
              />
              {/* Profit zone (green) - above threshold */}
              <ReferenceArea
                x1={zeroBucket || findBucketForValue(lossThreshold) || data[0]?.bucket}
                x2={data[data.length - 1]?.bucket}
                fill="#e8f5e9"
                fillOpacity={0.3}
                stroke="none"
              />
            </>
          )}

          {/* Bars with conditional coloring */}
          <Bar 
            dataKey="frequency"
            isAnimationActive={true}
            animationDuration={1000}
          >
            {data.map((dataEntry, index) => {
              let fillColor = '#2196F3'; // Default blue
              // Color bars based on loss/profit if threshold is provided
              if (lossThreshold !== undefined) {
                if (dataEntry.bucketMin !== undefined && dataEntry.bucketMax !== undefined) {
                  // If bucket max is below threshold, it's loss (red)
                  if (dataEntry.bucketMax < lossThreshold) {
                    fillColor = '#f44336';
                  } else if (dataEntry.bucketMin > lossThreshold) {
                    // If bucket min is above threshold, it's profit (green)
                    fillColor = '#4CAF50';
                  } else {
                    // If bucket spans the threshold, use yellow/orange
                    fillColor = '#FF9800';
                  }
                } else {
                  // Fallback: try to parse bucket string
                  const match = dataEntry.bucket?.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
                  if (match) {
                    const min = parseFloat(match[1]);
                    const max = parseFloat(match[2]);
                    if (max < lossThreshold) {
                      fillColor = '#f44336';
                    } else if (min > lossThreshold) {
                      fillColor = '#4CAF50';
                    } else {
                      fillColor = '#FF9800';
                    }
                  }
                }
              }
              return <Cell key={`cell-${index}`} fill={fillColor} />;
            })}
          </Bar>

          {/* Reference lines */}
          {meanBucket && (
            <ReferenceLine
              x={meanBucket}
              stroke="#2196F3"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: 'Mean', position: 'top', fill: '#2196F3' }}
            />
          )}
          {varBucket && (
            <ReferenceLine
              x={varBucket}
              stroke="#FF9800"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: 'VaR (95%)', position: 'top', fill: '#FF9800' }}
            />
          )}
          {zeroBucket && (
            <ReferenceLine
              x={zeroBucket}
              stroke="#000"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{ value: 'Zero NPV', position: 'top', fill: '#000' }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

