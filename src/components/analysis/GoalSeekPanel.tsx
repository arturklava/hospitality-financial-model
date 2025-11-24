/**
 * Goal Seek Panel Component (v2.3: Optimization UI)
 * 
 * Interactive Goal Seek tool to find input values that achieve target KPIs.
 * Allows users to specify a target metric (IRR, NPV, etc.) and find the required input variable value.
 */

import { useState, useMemo } from 'react';
import { solveForTarget, type TargetKpi, type InputVariable, type SolverConfig } from '../../engines/optimization/solverEngine';
import type { NamedScenario, FullModelOutput } from '../../domain/types';
import { SkeletonCard } from '../common/Skeleton';
import { MotionButton } from '../common/MotionButton';

interface GoalSeekPanelProps {
  baseScenario: NamedScenario;
  currentModelOutput: FullModelOutput | null;
  onApplyResult: (optimizedValue: number, inputVariable: InputVariable) => void;
}

/**
 * Get display label for target KPI.
 */
function getKpiLabel(kpi: TargetKpi): string {
  switch (kpi) {
    case 'irr':
      return 'Unlevered IRR';
    case 'leveredIrr':
      return 'Levered IRR';
    case 'npv':
      return 'NPV';
    case 'equityMultiple':
      return 'Equity Multiple';
    case 'moic':
      return 'MOIC';
  }
}

/**
 * Get display label for input variable.
 */
function getVariableLabel(variable: InputVariable): string {
  switch (variable) {
    case 'adr':
      return 'ADR';
    case 'occupancy':
      return 'Occupancy';
    case 'discountRate':
      return 'Discount Rate';
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
 * Get unit for input variable.
 */
function getVariableUnit(variable: InputVariable): string {
  switch (variable) {
    case 'adr':
      return '$';
    case 'occupancy':
      return '%';
    case 'discountRate':
      return '%';
    case 'initialInvestment':
      return '$';
    case 'debtAmount':
      return '$';
    case 'interestRate':
      return '%';
    case 'terminalGrowthRate':
      return '%';
  }
}

/**
 * Get current value for input variable.
 */
function getCurrentValue(scenario: NamedScenario, variable: InputVariable): number {
  const { scenario: projectScenario, projectConfig, capitalConfig } = scenario.modelConfig;
  
  switch (variable) {
    case 'adr': {
      const hotelOp = projectScenario.operations.find(
        op => op.operationType === 'HOTEL' || op.operationType === 'VILLAS'
      );
      if (!hotelOp) return 0;
      if (hotelOp.operationType === 'HOTEL') {
        return (hotelOp as any).avgDailyRate ?? 0;
      }
      return (hotelOp as any).avgNightlyRate ?? 0;
    }
    case 'occupancy': {
      const firstOp = projectScenario.operations.find(op => 'occupancyByMonth' in op);
      if (!firstOp || !('occupancyByMonth' in firstOp)) return 0;
      const months = (firstOp as any).occupancyByMonth;
      if (!months || months.length === 0) return 0;
      // Return average occupancy
      const sum = months.reduce((acc: number, val: number) => acc + val, 0);
      return sum / months.length;
    }
    case 'discountRate':
      return projectConfig.discountRate ?? 0;
    case 'initialInvestment':
      return projectConfig.initialInvestment ?? 0;
    case 'debtAmount':
      const tranche = capitalConfig?.debtTranches?.[0];
      return tranche?.initialPrincipal ?? tranche?.amount ?? 0;
    case 'interestRate':
      return capitalConfig?.debtTranches?.[0]?.interestRate ?? 0;
    case 'terminalGrowthRate':
      return projectConfig.terminalGrowthRate ?? 0;
  }
}

/**
 * Format value with unit.
 */
function formatValue(value: number, variable: InputVariable): string {
  const unit = getVariableUnit(variable);
  
  switch (variable) {
    case 'adr':
    case 'initialInvestment':
    case 'debtAmount':
      return `${unit}${value.toFixed(0)}`;
    case 'occupancy':
      return `${(value * 100).toFixed(1)}%`;
    case 'discountRate':
    case 'interestRate':
      return `${(value * 100).toFixed(2)}%`;
    case 'terminalGrowthRate':
      return `${(value * 100).toFixed(2)}%`;
    default:
      return `${value.toFixed(2)}`;
  }
}

export function GoalSeekPanel({ baseScenario, currentModelOutput, onApplyResult }: GoalSeekPanelProps) {
  const [targetMetric, setTargetMetric] = useState<TargetKpi>('irr');
  const [inputVariable, setInputVariable] = useState<InputVariable>('adr');
  const [targetValue, setTargetValue] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ optimizedValue: number; currentValue: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get current value for selected variable
  const currentValue = useMemo(() => {
    return getCurrentValue(baseScenario, inputVariable);
  }, [baseScenario, inputVariable]);
  
  // Get current KPI value from model output
  const currentKpiValue = useMemo(() => {
    if (!currentModelOutput) return null;
    
    switch (targetMetric) {
      case 'irr':
        return currentModelOutput.project.projectKpis.unleveredIrr;
      case 'leveredIrr':
        return currentModelOutput.waterfall.partners?.[0]?.irr ?? null;
      case 'npv':
        return currentModelOutput.project.projectKpis.npv;
      case 'equityMultiple':
        return currentModelOutput.project.projectKpis.equityMultiple;
      case 'moic':
        return currentModelOutput.waterfall.partners?.[0]?.moic ?? null;
    }
  }, [currentModelOutput, targetMetric]);
  
  const handleCalculate = async () => {
    const targetNum = parseFloat(targetValue);
    
    if (isNaN(targetNum)) {
      setError('Please enter a valid target value');
      return;
    }
    
    setIsRunning(true);
    setError(null);
    setResult(null);
    
    try {
      // Fake async pattern with delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Convert target value format: IRR metrics expect decimal (0.25 for 25%), others expect raw value
      let convertedTargetValue = targetNum;
      if (targetMetric === 'irr' || targetMetric === 'leveredIrr') {
        // Convert percentage to decimal (25 -> 0.25)
        convertedTargetValue = targetNum / 100;
      }
      
      const config: SolverConfig = {
        targetKpi: targetMetric,
        targetValue: convertedTargetValue,
        inputVariable,
      };
      
      const optimizedValue = solveForTarget(baseScenario, config);
      
      setResult({
        optimizedValue,
        currentValue,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Goal seek failed. Please check your target value and try again.');
    } finally {
      setIsRunning(false);
    }
  };
  
  const handleApply = () => {
    if (result) {
      onApplyResult(result.optimizedValue, inputVariable);
      setResult(null);
      setTargetValue('');
    }
  };
  
  return (
    <div className="card">
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Goal Seek</h3>
      <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Find the input value required to achieve a target KPI. Select a metric, enter your target value, 
        and choose which variable to adjust.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Target Metric Selector */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Select Metric:
          </label>
          <select
            value={targetMetric}
            onChange={(e) => {
              setTargetMetric(e.target.value as TargetKpi);
              setResult(null);
              setError(null);
            }}
            disabled={isRunning}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border-color, #ccc)',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <option value="irr">Unlevered IRR</option>
            <option value="leveredIrr">Levered IRR</option>
            <option value="npv">NPV</option>
            <option value="equityMultiple">Equity Multiple</option>
            <option value="moic">MOIC</option>
          </select>
          {currentKpiValue !== null && (
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary, #666)' }}>
              Current: {targetMetric === 'irr' || targetMetric === 'leveredIrr' 
                ? `${(currentKpiValue * 100).toFixed(2)}%`
                : targetMetric === 'npv'
                ? `$${currentKpiValue.toLocaleString()}`
                : currentKpiValue.toFixed(2)}
            </p>
          )}
        </div>
        
        {/* Target Value Input */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Target Value:
          </label>
          <input
            type="number"
            step="any"
            value={targetValue}
            onChange={(e) => {
              setTargetValue(e.target.value);
              setResult(null);
              setError(null);
            }}
            disabled={isRunning}
            placeholder={`Enter target ${getKpiLabel(targetMetric).toLowerCase()}`}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border-color, #ccc)',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          />
        </div>
        
        {/* Input Variable Selector */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Select Variable:
          </label>
          <select
            value={inputVariable}
            onChange={(e) => {
              setInputVariable(e.target.value as InputVariable);
              setResult(null);
              setError(null);
            }}
            disabled={isRunning}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border-color, #ccc)',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <option value="adr">ADR</option>
            <option value="occupancy">Occupancy</option>
            <option value="initialInvestment">Initial Investment</option>
            <option value="discountRate">Discount Rate</option>
            <option value="debtAmount">Debt Amount</option>
            <option value="interestRate">Interest Rate</option>
            <option value="terminalGrowthRate">Terminal Growth Rate</option>
          </select>
          <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary, #666)' }}>
            Current: {formatValue(currentValue, inputVariable)}
          </p>
        </div>
        
        {/* Calculate Button */}
        <MotionButton
          onClick={handleCalculate}
          disabled={isRunning || !targetValue}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {isRunning && (
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
          {isRunning ? 'Calculating...' : 'Calculate'}
        </MotionButton>
        
        {/* Loading State */}
        {isRunning && (
          <div style={{ marginTop: '1rem' }}>
            <SkeletonCard />
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: '4px',
            color: '#c62828',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}
        
        {/* Result Display */}
        {result && !error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#e8f5e9',
            border: '1px solid #4CAF50',
            borderRadius: '4px',
          }}>
            <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: '#2e7d32' }}>
              Result:
            </div>
            <div style={{ fontSize: '1rem', marginBottom: '1rem' }}>
              <strong>Required {getVariableLabel(inputVariable)}: {formatValue(result.optimizedValue, inputVariable)}</strong>
              {' '}
              <span style={{ color: 'var(--text-secondary, #666)', fontSize: '0.875rem' }}>
                (Current: {formatValue(result.currentValue, inputVariable)})
              </span>
            </div>
            <MotionButton
              onClick={handleApply}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              Apply to Scenario
            </MotionButton>
          </div>
        )}
      </div>
    </div>
  );
}

