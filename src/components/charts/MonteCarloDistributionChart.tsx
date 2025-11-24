/**
 * Monte Carlo Distribution Chart Component (v1.6: Risk UI)
 * 
 * Displays frequency distribution of Monte Carlo simulation results with reference lines
 * and color-coded loss/profit zones.
 */

import { HistogramChart } from './HistogramChart';

interface MonteCarloDistributionChartProps {
  values: number[];      // Array of numeric values from simulation iterations
  mean?: number;         // Mean value for reference line
  var95?: number;        // VaR (95%) for reference line
  zeroValue?: number;    // Zero NPV line (typically 0)
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  numBuckets?: number;   // Number of histogram buckets (default: 20)
}

/**
 * Creates histogram buckets from an array of numeric values.
 */
function createBuckets(values: number[], numBuckets: number = 20): Array<{
  bucket: string;
  frequency: number;
  bucketMin: number;
  bucketMax: number;
}> {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const bucketWidth = range / numBuckets;

  const buckets: Array<{ min: number; max: number; count: number }> = [];
  for (let i = 0; i < numBuckets; i++) {
    buckets.push({
      min: min + i * bucketWidth,
      max: min + (i + 1) * bucketWidth,
      count: 0,
    });
  }

  // Count values in each bucket
  for (const value of values) {
    const bucketIndex = Math.min(
      Math.floor((value - min) / bucketWidth),
      numBuckets - 1
    );
    buckets[bucketIndex].count++;
  }

  // Format buckets for display
  return buckets.map((bucket) => {
    const label = bucketWidth < 1
      ? `${bucket.min.toFixed(2)} - ${bucket.max.toFixed(2)}`
      : bucketWidth < 10
      ? `${bucket.min.toFixed(1)} - ${bucket.max.toFixed(1)}`
      : `${Math.round(bucket.min)} - ${Math.round(bucket.max)}`;
    
    return {
      bucket: label,
      frequency: bucket.count,
      bucketMin: bucket.min,
      bucketMax: bucket.max,
    };
  });
}

export function MonteCarloDistributionChart({
  values,
  mean,
  var95,
  zeroValue = 0,
  height = 400,
  xAxisLabel = 'Value',
  yAxisLabel = 'Frequency',
  numBuckets = 20,
}: MonteCarloDistributionChartProps) {
  const buckets = createBuckets(values, numBuckets);

  // Calculate loss threshold (use zeroValue or actual zero)
  const lossThreshold = zeroValue;

  return (
    <HistogramChart
      data={buckets}
      height={height}
      xAxisLabel={xAxisLabel}
      yAxisLabel={yAxisLabel}
      mean={mean}
      var95={var95}
      zeroValue={zeroValue}
      lossThreshold={lossThreshold}
    />
  );
}

