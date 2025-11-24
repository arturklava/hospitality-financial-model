import { useState, useMemo } from 'react';
import { useSensitivityWorker } from '../../ui/hooks/useSensitivityWorker';
import type {
  SensitivityVariable,
  SensitivityConfig,
  NamedScenario,
  SensitivityResult,
} from '@domain/types';
import { SkeletonCard } from '../common/Skeleton';
import { MotionButton } from '../common/MotionButton';
import { ProgressBar } from '../common/ProgressBar';

interface SensitivityPanelProps {
  baseScenario: NamedScenario;
}

/**
 * Formats a number as a percentage.
 */
function formatPercent(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Formats a number with 2 decimal places.
 */
function formatNumber(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return value.toFixed(2);
}

/**
 * Formats a number as currency.
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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
    case 'discountRate':
      return 'Discount Rate';
    case 'exitCap':
      return 'Exit Cap Rate';
    case 'initialInvestment':
      return 'Initial Investment';
    case 'debtAmount':
      return 'Debt Amount';
    case 'interestRate':
      return 'Interest Rate';
    case 'terminalGrowthRate':
      return 'Terminal Growth Rate';
  }
}

/**
 * Get default range for a sensitivity variable.
 */
function getDefaultRange(variable: SensitivityVariable): { min: number; max: number } {
  switch (variable) {
    case 'occupancy':
      return { min: 0.7, max: 1.3 }; // 70% to 130% of base
    case 'adr':
      return { min: 0.8, max: 1.2 }; // 80% to 120% of base
    case 'discountRate':
      return { min: 0.08, max: 0.15 }; // 8% to 15%
    case 'exitCap':
      return { min: 0.05, max: 0.10 }; // 5% to 10%
    case 'initialInvestment':
      // Get base value from scenario
      return { min: 0, max: 0 }; // Will be set based on base scenario
    case 'debtAmount':
      return { min: 0.5, max: 1.5 }; // 50% to 150% of base
    case 'interestRate':
      return { min: 0.04, max: 0.10 }; // 4% to 10%
    case 'terminalGrowthRate':
      return { min: 0.01, max: 0.04 }; // 1% to 4%
  }
}

/**
 * Sensitivity Analysis Panel Component
 * 
 * Allows users to select variables, set ranges, and visualize sensitivity results
 * as a heatmap (2D) or table (1D).
 */
export function SensitivityPanel({ baseScenario }: SensitivityPanelProps) {
  const [variableX, setVariableX] = useState<SensitivityVariable>('occupancy');
  const [variableY, setVariableY] = useState<SensitivityVariable | undefined>(undefined);
  const [rangeXMin, setRangeXMin] = useState<string>('0.7');
  const [rangeXMax, setRangeXMax] = useState<string>('1.3');
  const [rangeXSteps, setRangeXSteps] = useState<string>('5');
  const [rangeYMin, setRangeYMin] = useState<string>('0.8');
  const [rangeYMax, setRangeYMax] = useState<string>('1.2');
  const [rangeYSteps, setRangeYSteps] = useState<string>('5');
  const [result, setResult] = useState<SensitivityResult | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<'npv' | 'unleveredIrr' | 'leveredIrr' | 'moic' | 'equityMultiple'>('npv');

  // Use sensitivity worker hook
  const { runSensitivity, isLoading, progress, error } = useSensitivityWorker();

  // Initialize default ranges based on selected variables
  useMemo(() => {
    const defaultX = getDefaultRange(variableX);
    setRangeXMin(defaultX.min.toString());
    setRangeXMax(defaultX.max.toString());

    if (variableY) {
      const defaultY = getDefaultRange(variableY);
      setRangeYMin(defaultY.min.toString());
      setRangeYMax(defaultY.max.toString());
    }
  }, [variableX, variableY]);

  const handleRunAnalysis = async () => {
    setResult(null); // Clear previous results

    try {
      const config: Omit<SensitivityConfig, 'baseScenario'> = {
        variableX,
        rangeX: {
          min: parseFloat(rangeXMin),
          max: parseFloat(rangeXMax),
          steps: parseInt(rangeXSteps, 10),
        },
        ...(variableY && {
          variableY,
          rangeY: {
            min: parseFloat(rangeYMin),
            max: parseFloat(rangeYMax),
            steps: parseInt(rangeYSteps, 10),
          },
        }),
      };

      // Use worker hook for non-blocking analysis
      const sensitivityResult = await runSensitivity(baseScenario, config);
      setResult(sensitivityResult);
    } catch (err) {
      console.error('Sensitivity analysis failed:', err);
      const errorMessage = err instanceof Error ? err.message : error || 'Unknown error';
      alert(`Sensitivity analysis failed: ${errorMessage}`);
    }
  };

  // Calculate color for a cell based on KPI value
  const getCellColor = (kpiValue: number | null | undefined): string => {
    if (kpiValue === null || kpiValue === undefined) {
      return '#f0f0f0';
    }

    // Get base case value for comparison
    const baseKpi = result?.baseCaseOutput?.project?.projectKpis;
    const baseValue = baseKpi
      ? selectedKpi === 'npv'
        ? baseKpi.npv
        : selectedKpi === 'unleveredIrr'
          ? baseKpi.unleveredIrr ?? 0
          : selectedKpi === 'equityMultiple'
            ? baseKpi.equityMultiple
            : 0
      : 0;

    if (baseValue === 0) {
      return '#f0f0f0';
    }

    // Calculate relative change
    const change = (kpiValue - baseValue) / Math.abs(baseValue);

    // Color scale: red (bad) to green (good)
    // For NPV, IRR, MOIC: higher is better
    if (selectedKpi === 'npv' || selectedKpi === 'unleveredIrr' || selectedKpi === 'leveredIrr' || selectedKpi === 'moic' || selectedKpi === 'equityMultiple') {
      if (change > 0.1) return '#4caf50'; // Green (good)
      if (change > 0.05) return '#8bc34a'; // Light green
      if (change > -0.05) return '#ffeb3b'; // Yellow (neutral)
      if (change > -0.1) return '#ff9800'; // Orange
      return '#f44336'; // Red (bad)
    }

    return '#f0f0f0';
  };

  // Get KPI value from a run
  const getKpiValue = (run: SensitivityResult['runs'][0]): number | null => {
    switch (selectedKpi) {
      case 'npv':
        return run.kpis.npv;
      case 'unleveredIrr':
        return run.kpis.unleveredIrr;
      case 'leveredIrr':
        return run.kpis.leveredIrr ?? null;
      case 'moic':
        return run.kpis.moic ?? null;
      case 'equityMultiple':
        return run.kpis.equityMultiple;
      default:
        return null;
    }
  };

  const variableOptions: SensitivityVariable[] = [
    'occupancy',
    'adr',
    'discountRate',
    'initialInvestment',
    'debtAmount',
    'interestRate',
    'terminalGrowthRate',
  ];

  return (
    <div className="sensitivity-panel card">
      <h2 style={{ marginTop: 0 }}>Sensitivity Analysis</h2>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Variable X:
          </label>
          <select
            value={variableX}
            onChange={(e) => setVariableX(e.target.value as SensitivityVariable)}
            disabled={isLoading}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            {variableOptions.map((v) => (
              <option key={v} value={v}>
                {getVariableLabel(v)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Variable Y (Optional):
          </label>
          <select
            value={variableY || ''}
            onChange={(e) => setVariableY(e.target.value ? (e.target.value as SensitivityVariable) : undefined)}
            disabled={isLoading}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">None (1D Analysis)</option>
            {variableOptions.map((v) => (
              <option key={v} value={v}>
                {getVariableLabel(v)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            X Range: Min
          </label>
          <input
            type="number"
            step="0.01"
            value={rangeXMin}
            onChange={(e) => setRangeXMin(e.target.value)}
            disabled={isLoading}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            X Range: Max
          </label>
          <input
            type="number"
            step="0.01"
            value={rangeXMax}
            onChange={(e) => setRangeXMax(e.target.value)}
            disabled={isLoading}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            X Steps
          </label>
          <input
            type="number"
            min="2"
            max="10"
            value={rangeXSteps}
            onChange={(e) => setRangeXSteps(e.target.value)}
            disabled={isLoading}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        {variableY && (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Y Range: Min
              </label>
              <input
                type="number"
                step="0.01"
                value={rangeYMin}
                onChange={(e) => setRangeYMin(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Y Range: Max
              </label>
              <input
                type="number"
                step="0.01"
                value={rangeYMax}
                onChange={(e) => setRangeYMax(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Y Steps
              </label>
              <input
                type="number"
                min="2"
                max="10"
                value={rangeYSteps}
                onChange={(e) => setRangeYSteps(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
            </div>
          </>
        )}
      </div>

      <MotionButton
        onClick={handleRunAnalysis}
        disabled={isLoading}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: isLoading ? '#ccc' : '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          fontWeight: 500,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {isLoading && (
          <span style={{
            display: 'inline-block',
            width: '18px',
            height: '18px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        )}
        {isLoading ? 'Calculating...' : 'Run Analysis'}
      </MotionButton>

      {/* Loading State with Progress Bar */}
      {isLoading && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <ProgressBar value={progress} aria-label="Sensitivity analysis progress" />
          </div>
          <p style={{ 
            textAlign: 'center', 
            color: 'var(--text-secondary, #666)',
            fontSize: '0.875rem',
            marginTop: '0.5rem',
          }}>
            Running sensitivity analysis... {progress}%
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <SkeletonCard />
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontWeight: 500 }}>Display KPI:</label>
            <select
              value={selectedKpi}
              onChange={(e) => setSelectedKpi(e.target.value as typeof selectedKpi)}
              style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="npv">NPV</option>
              <option value="unleveredIrr">Unlevered IRR</option>
              <option value="leveredIrr">Levered IRR</option>
              <option value="moic">MOIC</option>
              <option value="equityMultiple">Equity Multiple</option>
            </select>
          </div>

          {result.matrix ? (
            // 2D Heatmap
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  fontSize: '0.9em',
                }}
              >
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', backgroundColor: '#f5f5f5' }}>
                      {getVariableLabel(variableY!)} \ {getVariableLabel(variableX)}
                    </th>
                    {result.matrix[0]?.map((cell, idx) => (
                      <th
                        key={idx}
                        style={{ border: '1px solid #ddd', padding: '0.5rem', backgroundColor: '#f5f5f5', textAlign: 'center' }}
                      >
                        {formatNumber(cell.variableXValue)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.matrix.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td
                        style={{
                          border: '1px solid #ddd',
                          padding: '0.5rem',
                          backgroundColor: '#f5f5f5',
                          fontWeight: 500,
                        }}
                      >
                        {formatNumber(row[0]?.variableYValue)}
                      </td>
                      {row.map((cell, colIdx) => {
                        const kpiValue = getKpiValue(
                          result.runs.find(
                            (r) =>
                              r.variableXValue === cell.variableXValue &&
                              r.variableYValue === cell.variableYValue
                          )!
                        );
                        return (
                          <td
                            key={colIdx}
                            style={{
                              border: '1px solid #ddd',
                              padding: '0.5rem',
                              backgroundColor: getCellColor(kpiValue),
                              textAlign: 'center',
                              minWidth: '80px',
                            }}
                            title={`${getVariableLabel(variableX)}: ${formatNumber(cell.variableXValue)}, ${getVariableLabel(variableY!)}: ${formatNumber(cell.variableYValue)}, ${selectedKpi.toUpperCase()}: ${selectedKpi === 'npv' ? formatCurrency(kpiValue ?? 0) : selectedKpi.includes('Irr') ? formatPercent(kpiValue) : formatNumber(kpiValue)}`}
                          >
                            {selectedKpi === 'npv'
                              ? formatCurrency(kpiValue ?? 0)
                              : selectedKpi.includes('Irr')
                                ? formatPercent(kpiValue)
                                : formatNumber(kpiValue)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // 1D Table
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  fontSize: '0.9em',
                }}
              >
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', backgroundColor: '#f5f5f5' }}>
                      {getVariableLabel(variableX)}
                    </th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', backgroundColor: '#f5f5f5' }}>
                      NPV
                    </th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', backgroundColor: '#f5f5f5' }}>
                      Unlevered IRR
                    </th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', backgroundColor: '#f5f5f5' }}>
                      Levered IRR
                    </th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', backgroundColor: '#f5f5f5' }}>
                      MOIC
                    </th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', backgroundColor: '#f5f5f5' }}>
                      Equity Multiple
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.runs.map((run, idx) => {
                    return (
                      <tr key={idx}>
                        <td
                          style={{
                            border: '1px solid #ddd',
                            padding: '0.5rem',
                            fontWeight: 500,
                          }}
                        >
                          {formatNumber(run.variableXValue)}
                        </td>
                        <td
                          style={{
                            border: '1px solid #ddd',
                            padding: '0.5rem',
                            backgroundColor: getCellColor(run.kpis.npv),
                            textAlign: 'right',
                          }}
                        >
                          {formatCurrency(run.kpis.npv)}
                        </td>
                        <td
                          style={{
                            border: '1px solid #ddd',
                            padding: '0.5rem',
                            backgroundColor: getCellColor(run.kpis.unleveredIrr),
                            textAlign: 'right',
                          }}
                        >
                          {formatPercent(run.kpis.unleveredIrr)}
                        </td>
                        <td
                          style={{
                            border: '1px solid #ddd',
                            padding: '0.5rem',
                            backgroundColor: getCellColor(run.kpis.leveredIrr),
                            textAlign: 'right',
                          }}
                        >
                          {formatPercent(run.kpis.leveredIrr ?? null)}
                        </td>
                        <td
                          style={{
                            border: '1px solid #ddd',
                            padding: '0.5rem',
                            backgroundColor: getCellColor(run.kpis.moic),
                            textAlign: 'right',
                          }}
                        >
                          {formatNumber(run.kpis.moic ?? null)}
                        </td>
                        <td
                          style={{
                            border: '1px solid #ddd',
                            padding: '0.5rem',
                            backgroundColor: getCellColor(run.kpis.equityMultiple),
                            textAlign: 'right',
                          }}
                        >
                          {formatNumber(run.kpis.equityMultiple)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

