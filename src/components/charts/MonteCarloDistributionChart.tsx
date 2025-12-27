/**
 * Monte Carlo Distribution Chart Component (v1.6: Risk UI)
 * 
 * Displays frequency distribution of Monte Carlo simulation results with reference lines
 * and color-coded loss/profit zones.
 */

import { useTranslation } from '../../contexts/LanguageContext';
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
  const { language } = useTranslation();
  const isPortuguese = language === 'pt';
  const buckets = createBuckets(values, numBuckets);

  // Calculate loss threshold (use zeroValue or actual zero)
  const lossThreshold = zeroValue;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-secondary">
        {isPortuguese
          ? 'Este gráfico mostra a distribuição de resultados nas simulações.'
          : 'This chart shows the distribution of outcomes across simulations.'}
      </p>

      <div className="rounded-lg border border-border bg-surface p-4">
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

        <div className="mt-4 flex flex-col gap-3 text-sm text-secondary">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1"
              style={{ backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#b71c1c' }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#f44336' }} />
              {isPortuguese ? 'Zona de perda' : 'Loss zone'}
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1"
              style={{ backgroundColor: 'rgba(255, 152, 0, 0.12)', color: '#e65100' }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#FF9800' }} />
              {isPortuguese ? 'Ponto de equilíbrio' : 'Break-even'}
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1"
              style={{ backgroundColor: 'rgba(76, 175, 80, 0.12)', color: '#1b5e20' }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#4CAF50' }} />
              {isPortuguese ? 'Zona de lucro' : 'Profit zone'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-6" style={{ backgroundColor: '#2196F3' }} />
              <span>{isPortuguese ? 'Média' : 'Mean'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-6" style={{ backgroundColor: '#FF9800' }} />
              <span>VaR (95%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-6" style={{ backgroundColor: '#000' }} />
              <span>{isPortuguese ? 'Zero' : 'Zero'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

