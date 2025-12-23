/**
 * Risk View Component (v1.6: Risk UI)
 * 
 * Unified risk analysis interface combining Monte Carlo simulation and Sensitivity analysis.
 */

import { useState, useMemo } from 'react';
import { SensitivityPanel } from '../components/analysis/SensitivityPanel';
import { RiskKpiCards } from '../components/risk/RiskKpiCards';
import { MonteCarloDistributionChart } from '../components/charts/MonteCarloDistributionChart';
import { CorrelationMatrix } from '../components/analysis/CorrelationMatrix';
import { GoalSeekPanel } from '../components/analysis/GoalSeekPanel';
import { SectionCard } from '../components/ui/SectionCard';
import { SkeletonCard } from '../components/common/Skeleton';
import { ProgressBar } from '../components/common/ProgressBar';
import { useSimulationWorker } from '../ui/hooks/useSimulationWorker';
import type { FullModelInput, FullModelOutput, NamedScenario, SimulationResult, SimulationConfig, CorrelationMatrix as CorrelationMatrixType, SensitivityVariable, DistributionType } from '../domain/types';
import { useTranslation } from '../contexts/LanguageContext';

interface RiskViewProps {
  input: FullModelInput;
  baseOutput: FullModelOutput;
  onRunSimulation?: (config: SimulationConfig) => Promise<SimulationResult>;
  onUpdateInput?: (input: FullModelInput) => void;
}

// Default correlation matrix: Occupancy-ADR = 0.7, others independent
const DEFAULT_CORRELATION_VARIABLES: SensitivityVariable[] = ['occupancy', 'adr', 'interestRate'];
const DEFAULT_CORRELATION_MATRIX: number[][] = [
  [1.0, 0.7, 0.0],  // occupancy row
  [0.7, 1.0, 0.0],  // adr row
  [0.0, 0.0, 1.0],  // interestRate row
];

export function RiskView({ input, baseOutput, onRunSimulation, onUpdateInput }: RiskViewProps) {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<'npv' | 'irr' | 'equityMultiple'>('npv');
  const [iterations, setIterations] = useState(1000);
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrixType | undefined>(undefined);
  const [occupancyDistributionType, setOccupancyDistributionType] = useState<DistributionType>('normal');
  const [adrDistributionType, setAdrDistributionType] = useState<DistributionType>('normal');
  const [interestRateDistributionType, setInterestRateDistributionType] = useState<DistributionType>('normal');
  const { t } = useTranslation();

  // Use simulation worker hook
  const { runSimulation, isLoading, progress, error } = useSimulationWorker();

  // Construct a temporary NamedScenario for the SensitivityPanel and Monte Carlo
  const baseScenario: NamedScenario = useMemo(() => ({
    id: 'current-scenario',
    name: 'Current Scenario',
    modelConfig: input
  }), [input]);

  const handleRunSimulation = async () => {
    setSimulationResult(null);

    try {
      const config: SimulationConfig = {
        iterations,
        correlationMatrix, // Pass correlation matrix to simulation
        occupancyDistributionType,
        adrDistributionType,
        interestRateDistributionType,
      };

      let result: SimulationResult;

      if (onRunSimulation) {
        // Use custom simulation handler if provided
        result = await onRunSimulation(config);
      } else {
        // Use worker hook for non-blocking simulation
        result = await runSimulation(baseScenario, config);
      }

      setSimulationResult(result);
    } catch (err) {
      console.error('Simulation failed:', err);
      const errorMessage = err instanceof Error ? err.message : error || 'Unknown error';
      alert(`Simulation failed: ${errorMessage}`);
    }
  };

  // Initialize correlation matrix with default values
  const initializeCorrelationMatrix = () => {
    if (!correlationMatrix) {
      setCorrelationMatrix({
        variables: DEFAULT_CORRELATION_VARIABLES,
        matrix: DEFAULT_CORRELATION_MATRIX.map(row => [...row]),
      });
    }
  };

  // Handle correlation matrix change
  const handleCorrelationMatrixChange = (matrix: number[][]) => {
    if (correlationMatrix) {
      setCorrelationMatrix({
        ...correlationMatrix,
        matrix,
      });
    }
  };

  // Handle goal seek result application
  const handleApplyGoalSeekResult = (optimizedValue: number, inputVariable: string) => {
    if (!onUpdateInput) {
      console.warn('onUpdateInput not provided - cannot apply goal seek result');
      return;
    }

    // Update input based on the optimized variable
    const updatedInput = { ...input };

    switch (inputVariable) {
      case 'adr': {
        // Update ADR for first hotel/villa operation
        const operations = updatedInput.scenario.operations.map(op => {
          if (op.operationType === 'HOTEL') {
            return { ...op, avgDailyRate: optimizedValue };
          } else if (op.operationType === 'VILLAS') {
            return { ...op, avgNightlyRate: optimizedValue };
          }
          return op;
        });
        updatedInput.scenario = { ...updatedInput.scenario, operations };
        break;
      }
      case 'occupancy': {
        // Update occupancy for all lodging operations
        const operations = updatedInput.scenario.operations.map(op => {
          if ('occupancyByMonth' in op) {
            return {
              ...op,
              occupancyByMonth: op.occupancyByMonth.map(() => optimizedValue),
            };
          }
          return op;
        });
        updatedInput.scenario = { ...updatedInput.scenario, operations };
        break;
      }
      case 'discountRate':
        updatedInput.projectConfig = { ...updatedInput.projectConfig, discountRate: optimizedValue };
        break;
      case 'initialInvestment':
        updatedInput.projectConfig = { ...updatedInput.projectConfig, initialInvestment: optimizedValue };
        updatedInput.capitalConfig = { ...updatedInput.capitalConfig, initialInvestment: optimizedValue };
        break;
      case 'debtAmount': {
        if (updatedInput.capitalConfig.debt.length > 0) {
          const tranches = updatedInput.capitalConfig.debt.map((tranche, index) => {
            if (index === 0) {
              return { ...tranche, initialPrincipal: optimizedValue };
            }
            return tranche;
          });
          updatedInput.capitalConfig = { ...updatedInput.capitalConfig, debt: tranches };
        }
        break;
      }
      case 'interestRate': {
        if (updatedInput.capitalConfig.debt.length > 0) {
          const tranches = updatedInput.capitalConfig.debt.map((tranche, index) => {
            if (index === 0) {
              return { ...tranche, interestRate: optimizedValue };
            }
            return tranche;
          });
          updatedInput.capitalConfig = { ...updatedInput.capitalConfig, debt: tranches };
        }
        break;
      }
      case 'terminalGrowthRate':
        updatedInput.projectConfig = { ...updatedInput.projectConfig, terminalGrowthRate: optimizedValue };
        break;
      default:
        console.warn(`Unknown input variable: ${inputVariable}`);
        return;
    }

    // Apply the updated input
    onUpdateInput(updatedInput);
  };

  // Extract KPI values for the selected metric
  const getKpiValues = (): number[] => {
    if (!simulationResult) return [];

    switch (selectedKpi) {
      case 'npv':
        return simulationResult.iterations.map(k => k.npv).filter((v): v is number => typeof v === 'number');
      case 'irr':
        return simulationResult.iterations.map(k => k.unleveredIrr).filter((v): v is number => v !== null && typeof v === 'number');
      case 'equityMultiple':
        return simulationResult.iterations.map(k => k.equityMultiple).filter((v): v is number => typeof v === 'number');
    }
  };

  // Calculate risk metrics
  const calculateVar95 = (): number | undefined => {
    if (!simulationResult) return undefined;
    const values = getKpiValues();
    if (values.length === 0) return undefined;

    // VaR (95%) is the 5th percentile
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.05);
    return sorted[index];
  };

  const calculateProbOfLoss = (): number | undefined => {
    if (!simulationResult) return undefined;
    const values = getKpiValues();
    if (values.length === 0) return undefined;

    const lossCount = values.filter(v => v < 0).length;
    return lossCount / values.length;
  };

  const calculateStdDev = (): number | undefined => {
    if (!simulationResult) return undefined;
    const values = getKpiValues();
    if (values.length === 0) return undefined;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  };

  const getMean = (): number | undefined => {
    if (!simulationResult) return undefined;
    const values = getKpiValues();
    if (values.length === 0) return undefined;

    return values.reduce((sum, v) => sum + v, 0) / values.length;
  };

  const kpiValues = getKpiValues();
  const var95 = calculateVar95();
  const probOfLoss = calculateProbOfLoss();
  const stdDev = calculateStdDev();
  const mean = getMean();

  return (
    <div className="risk-view">
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('risk.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          {t('risk.subtitle')}
        </p>
      </div>

      {/* KPI Selection and Run Simulation Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontWeight: 500, fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('risk.analyzeKpi')}</label>
          <select
            value={selectedKpi}
            onChange={(e) => setSelectedKpi(e.target.value as typeof selectedKpi)}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border-color, #ccc)',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <option value="npv">{t('financial.npv')}</option>
            <option value="irr">{t('financial.irr')}</option>
            <option value="equityMultiple">{t('financial.equityMultiple')}</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontWeight: 500, fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('risk.iterations')}</label>
          <input
            type="number"
            min="100"
            max="10000"
            step="100"
            value={iterations}
            onChange={(e) => setIterations(parseInt(e.target.value, 10))}
            disabled={isLoading}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--border-color, #ccc)',
              borderRadius: '4px',
              width: '100px',
            }}
          />
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={isLoading}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          {isLoading && (
            <span style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {isLoading ? t('risk.runningSimulation') : t('risk.runSimulation')}
        </button>
      </div>

      {/* Risk KPI Cards */}
      {simulationResult && (
        <div style={{ marginBottom: '2rem' }}>
          <RiskKpiCards
            var95={var95}
            probOfLoss={probOfLoss}
            stdDev={stdDev}
            selectedKpi={selectedKpi}
          />
        </div>
      )}

      {/* Loading State with Progress Bar */}
      {isLoading && !simulationResult && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <ProgressBar value={progress} aria-label="Simulation progress" />
          </div>
          <p style={{
            textAlign: 'center',
            color: 'var(--text-secondary, #666)',
            fontSize: '0.875rem',
            marginTop: '0.5rem',
          }}>
            {t('risk.runningProgress').replace('{progress}', progress.toString())}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      )}

      {/* Simulation Settings */}
      {!isLoading && (
        <SectionCard
          title={t('risk.simulationSettings')}
          defaultExpanded={true}
          className="simulation-settings"
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
              {t('risk.distributionTypes')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {/* Occupancy Distribution */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    {t('risk.occupancyDistribution')}
                  </span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DistributionIcon type={occupancyDistributionType} />
                  <select
                    value={occupancyDistributionType}
                    onChange={(e) => setOccupancyDistributionType(e.target.value as DistributionType)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid var(--border-color, #ccc)',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="normal">{t('risk.normal')}</option>
                    <option value="lognormal">{t('risk.lognormal')}</option>
                    <option value="pert">{t('risk.pert')}</option>
                  </select>
                </div>
              </div>

              {/* ADR Distribution */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    {t('risk.adrDistribution')}
                  </span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DistributionIcon type={adrDistributionType} />
                  <select
                    value={adrDistributionType}
                    onChange={(e) => setAdrDistributionType(e.target.value as DistributionType)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid var(--border-color, #ccc)',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="normal">{t('risk.normal')}</option>
                    <option value="lognormal">{t('risk.lognormal')}</option>
                    <option value="pert">{t('risk.pert')}</option>
                  </select>
                </div>
              </div>

              {/* Interest Rate Distribution */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    {t('risk.interestRateDistribution')}
                  </span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DistributionIcon type={interestRateDistributionType} />
                  <select
                    value={interestRateDistributionType}
                    onChange={(e) => setInterestRateDistributionType(e.target.value as DistributionType)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid var(--border-color, #ccc)',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="normal">{t('risk.normal')}</option>
                    <option value="lognormal">{t('risk.lognormal')}</option>
                    <option value="pert">{t('risk.pert')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color, #e0e0e0)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
              {t('risk.correlationMatrix')}
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={initializeCorrelationMatrix}
                disabled={!!correlationMatrix}
                className="btn"
                style={{
                  marginRight: '0.5rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                }}
              >
                {t('risk.enableCorrelationMatrix')}
              </button>
              {correlationMatrix && (
                <button
                  onClick={() => setCorrelationMatrix(undefined)}
                  className="btn"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {t('risk.disableCorrelationMatrix')}
                </button>
              )}
            </div>

            {correlationMatrix && (
              <CorrelationMatrix
                variables={correlationMatrix.variables}
                matrix={correlationMatrix.matrix}
                onChange={handleCorrelationMatrixChange}
              />
            )}

            {!correlationMatrix && (
              <p style={{
                color: 'var(--text-secondary, #666)',
                fontSize: '0.875rem',
                fontStyle: 'italic',
              }}>
                {t('risk.correlationDisabledMessage')}
              </p>
            )}
          </div>
        </SectionCard>
      )}

      {/* Goal Seek Panel */}
      {!isLoading && (
        <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
          <GoalSeekPanel
            currentOutput={baseOutput}
            onApplyScenario={(updates) => handleApplyGoalSeekResult(updates.value, updates.variable)}
          />
        </div>
      )}

      {/* Main Content Row: Distribution Chart (Left) and Sensitivity Panel (Right) */}
      {!isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          {/* Left: Monte Carlo Distribution Chart */}
          <div className="card">
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>{t('risk.monteCarloDistribution')}</h2>
            {simulationResult && kpiValues.length > 0 ? (
              <MonteCarloDistributionChart
                values={kpiValues}
                mean={mean}
                var95={var95}
                zeroValue={0}
                height={400}
                xAxisLabel={selectedKpi.toUpperCase()}
                yAxisLabel="Frequency"
                numBuckets={30}
              />
            ) : (
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}>
                <p>{t('risk.runSimulationToView')}</p>
              </div>
            )}
          </div>

          {/* Right: Sensitivity Panel */}
          <div>
            <SensitivityPanel currentOutput={baseOutput} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Visual icon component representing the curve shape of a distribution type.
 */
function DistributionIcon({ type }: { type: DistributionType }) {
  const iconSize = 20;

  switch (type) {
    case 'normal':
      // Bell curve (normal distribution) - symmetric bell shape
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 20 Q6 12, 12 12 T21 20" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'lognormal':
      // Right-skewed curve (log-normal distribution) - skewed to the right
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 20 Q5 15, 8 12 Q12 8, 18 6 Q20 5, 21 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'pert':
      // Triangular/bounded curve (PERT distribution) - triangular shape with bounds
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 20 L12 4 L21 20" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 20 L21 20" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
