/**
 * Sensitivity Analysis Engine (v0.7)
 * 
 * Runs the financial model multiple times with varying input parameters
 * to observe impacts on key output metrics (NPV, IRR, MOIC, etc.).
 * 
 * Pure function: no side effects, no global state, fully deterministic.
 */

import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  SensitivityConfig,
  SensitivityResult,
  SensitivityVariable,
  FullModelInput,
  FullModelOutput,
  NamedScenario,
  HotelConfig,
} from '@domain/types';

/**
 * Maximum grid size for sensitivity analysis to prevent performance issues.
 * Limits the total number of runs to maxStepsX * maxStepsY.
 */
const MAX_STEPS = 10;

/**
 * Deep clone a scenario configuration for sensitivity analysis.
 * Creates a new object with all nested structures copied.
 */
function cloneScenario(baseScenario: NamedScenario): NamedScenario {
  // Deep clone the model config
  const clonedModelConfig: FullModelInput = {
    scenario: {
      ...baseScenario.modelConfig.scenario,
      operations: baseScenario.modelConfig.scenario.operations.map(op => {
        // Deep clone each operation config
        if (op.operationType === 'HOTEL') {
          return {
            ...op,
            occupancyByMonth: [...op.occupancyByMonth],
          } as HotelConfig;
        } else if (op.operationType === 'VILLAS') {
          return {
            ...op,
            occupancyByMonth: [...op.occupancyByMonth],
          };
        } else if (op.operationType === 'RESTAURANT') {
          return {
            ...op,
            turnoverByMonth: [...op.turnoverByMonth],
          };
        } else if (op.operationType === 'BEACH_CLUB') {
          return {
            ...op,
            utilizationByMonth: [...op.utilizationByMonth],
          };
        } else if (op.operationType === 'RACQUET') {
          return {
            ...op,
            utilizationByMonth: [...op.utilizationByMonth],
          };
        } else if (op.operationType === 'RETAIL') {
          return {
            ...op,
            occupancyByMonth: [...op.occupancyByMonth],
          };
        } else if (op.operationType === 'FLEX') {
          return {
            ...op,
            occupancyByMonth: [...op.occupancyByMonth],
          };
        } else if (op.operationType === 'WELLNESS') {
          return {
            ...op,
            utilizationByMonth: [...op.utilizationByMonth],
          };
        } else if (op.operationType === 'SENIOR_LIVING') {
          return {
            ...op,
            occupancyByMonth: [...op.occupancyByMonth],
          };
        }
        // Return the operation config as-is for other types
        return op;
      }),
    },
    projectConfig: { ...baseScenario.modelConfig.projectConfig },
    capitalConfig: {
      ...baseScenario.modelConfig.capitalConfig,
      debtTranches: baseScenario.modelConfig.capitalConfig.debtTranches.map(tranche => ({
        ...tranche,
      })),
    },
    waterfallConfig: {
      ...baseScenario.modelConfig.waterfallConfig,
      equityClasses: baseScenario.modelConfig.waterfallConfig.equityClasses.map(ec => ({
        ...ec,
      })),
      tiers: baseScenario.modelConfig.waterfallConfig.tiers?.map(tier => ({
        ...tier,
        distributionSplits: { ...tier.distributionSplits },
        catchUpTargetSplit: tier.catchUpTargetSplit ? { ...tier.catchUpTargetSplit } : undefined,
      })),
    },
  };

  return {
    ...baseScenario,
    modelConfig: clonedModelConfig,
  };
}

/**
 * Apply a sensitivity variable adjustment to a cloned scenario.
 * Modifies the scenario in place based on the variable type and adjustment factor.
 */
function applyVariableAdjustment(
  scenario: NamedScenario,
  variable: SensitivityVariable,
  adjustmentFactor: number
): void {
  const { modelConfig } = scenario;
  const { scenario: projectScenario, projectConfig, capitalConfig } = modelConfig;

  switch (variable) {
    case 'occupancy': {
      // Multiplicative adjustment to all operations' occupancy
      projectScenario.operations.forEach(op => {
        if ('occupancyByMonth' in op && Array.isArray(op.occupancyByMonth)) {
          op.occupancyByMonth = op.occupancyByMonth.map(occ => Math.max(0, Math.min(1, occ * adjustmentFactor)));
        } else if ('utilizationByMonth' in op && Array.isArray(op.utilizationByMonth)) {
          op.utilizationByMonth = op.utilizationByMonth.map(util => Math.max(0, Math.min(1, util * adjustmentFactor)));
        } else if ('turnoverByMonth' in op && Array.isArray(op.turnoverByMonth)) {
          op.turnoverByMonth = op.turnoverByMonth.map(turn => Math.max(0, turn * adjustmentFactor));
        }
      });
      break;
    }

    case 'adr': {
      // Multiplicative adjustment to hotel ADR
      projectScenario.operations.forEach(op => {
        if (op.operationType === 'HOTEL') {
          (op as HotelConfig).avgDailyRate *= adjustmentFactor;
        } else if (op.operationType === 'VILLAS') {
          (op as any).avgNightlyRate *= adjustmentFactor;
        }
      });
      break;
    }

    case 'discountRate': {
      // Replace discount rate
      projectConfig.discountRate = adjustmentFactor;
      break;
    }

    case 'exitCap': {
      // Exit cap rate - not implemented in v0.7, but reserved for future
      // For now, this would affect terminal value calculation if implemented
      break;
    }

    case 'initialInvestment': {
      // Absolute adjustment to initial investment
      const newInvestment = adjustmentFactor;
      projectConfig.initialInvestment = newInvestment;
      capitalConfig.initialInvestment = newInvestment;
      break;
    }

    case 'debtAmount': {
      // Multiplicative adjustment to debt amount (first tranche or all tranches proportionally)
      if (capitalConfig.debtTranches.length > 0) {
        capitalConfig.debtTranches.forEach(tranche => {
          const currentAmount = tranche.initialPrincipal ?? tranche.amount ?? 0;
          const newAmount = currentAmount * adjustmentFactor;
          if (tranche.initialPrincipal !== undefined) {
            tranche.initialPrincipal = Math.max(0, newAmount);
          }
          if (tranche.amount !== undefined) {
            tranche.amount = Math.max(0, newAmount);
          }
        });
      }
      break;
    }

    case 'interestRate': {
      // Multiplicative adjustment to interest rate (first tranche or all tranches)
      capitalConfig.debtTranches.forEach(tranche => {
        tranche.interestRate = Math.max(0, tranche.interestRate * adjustmentFactor);
      });
      break;
    }

    case 'terminalGrowthRate': {
      // Replace terminal growth rate
      projectConfig.terminalGrowthRate = adjustmentFactor;
      break;
    }
  }
}

/**
 * Extract KPIs from a full model output.
 */
function extractKpis(output: FullModelOutput): SensitivityResult['runs'][0]['kpis'] {
  const projectKpis = output.project.projectKpis;
  const waterfallKpis = output.waterfall.partners.length > 0 
    ? output.waterfall.partners[0] 
    : null;

  return {
    npv: projectKpis.npv,
    unleveredIrr: projectKpis.unleveredIrr,
    leveredIrr: waterfallKpis?.irr ?? null,
    moic: waterfallKpis?.moic ?? undefined,
    equityMultiple: projectKpis.equityMultiple,
    wacc: projectKpis.wacc ?? null,  // v0.7: Extract WACC from project KPIs
  };
}

/**
 * Generate step values for a range.
 * Returns an array of values from min to max (inclusive) with the specified number of steps.
 */
function generateSteps(min: number, max: number, steps: number): number[] {
  if (steps <= 1) {
    return [min];
  }
  const stepSize = (max - min) / (steps - 1);
  return Array.from({ length: steps }, (_, i) => min + i * stepSize);
}

/**
 * Calculate the adjusted value for a sensitivity variable.
 * For multiplicative variables (occupancy, adr, debtAmount, interestRate), returns the factor.
 * For absolute variables (discountRate, initialInvestment, terminalGrowthRate), returns the value.
 */
function calculateAdjustedValue(
  variable: SensitivityVariable,
  _baseValue: number,
  stepValue: number
): number {
  // For multiplicative adjustments, stepValue is the multiplier (e.g., 0.9 for 90%)
  // For absolute adjustments, stepValue is the new value
  switch (variable) {
    case 'occupancy':
    case 'adr':
    case 'debtAmount':
    case 'interestRate':
      // Multiplicative: return the multiplier directly
      return stepValue;
    
    case 'discountRate':
    case 'initialInvestment':
    case 'terminalGrowthRate':
    case 'exitCap':
      // Absolute: return the step value directly
      return stepValue;
    
    default:
      return stepValue;
  }
}

/**
 * Get base value for a sensitivity variable from the base scenario.
 */
function getBaseValue(variable: SensitivityVariable, baseScenario: NamedScenario): number {
  const { modelConfig } = baseScenario;
  const { projectConfig, capitalConfig } = modelConfig;

  switch (variable) {
    case 'occupancy':
      // Return 1.0 as base (no adjustment)
      return 1.0;
    
    case 'adr':
      // Return 1.0 as base (no adjustment)
      return 1.0;
    
    case 'discountRate':
      return projectConfig.discountRate;
    
    case 'exitCap':
      // Not implemented, return 0
      return 0;
    
    case 'initialInvestment':
      return projectConfig.initialInvestment;
    
    case 'debtAmount':
      if (capitalConfig.debtTranches.length > 0) {
        const firstTranche = capitalConfig.debtTranches[0];
        return firstTranche.initialPrincipal ?? firstTranche.amount ?? 0;
      }
      return 0;
    
    case 'interestRate':
      if (capitalConfig.debtTranches.length > 0) {
        return capitalConfig.debtTranches[0].interestRate;
      }
      return 0;
    
    case 'terminalGrowthRate':
      return projectConfig.terminalGrowthRate;
  }
}

/**
 * Run sensitivity analysis on a base scenario.
 * 
 * **Note:** This is a synchronous function that blocks the main thread.
 * For UI usage, use `useSensitivityWorker` hook instead.
 * This export is maintained for test compatibility.
 * 
 * @internal For testing and worker usage only. UI should use `useSensitivityWorker` hook.
 * @param baseScenario - Base scenario to vary
 * @param config - Sensitivity configuration with variable ranges
 * @param onProgress - Optional callback for progress updates (0.0 to 1.0)
 * @returns Sensitivity analysis results with all runs and KPIs
 * @throws Error if grid size exceeds MAX_STEPS or if model execution fails
 */
export function runSensitivityAnalysis(
  baseScenario: NamedScenario,
  config: Omit<SensitivityConfig, 'baseScenario'>,
  onProgress?: (progress: number) => void
): SensitivityResult {
  // Validate grid size
  const stepsX = config.rangeX.steps;
  const stepsY = config.rangeY?.steps ?? 1;

  if (stepsX > MAX_STEPS || stepsY > MAX_STEPS) {
    throw new Error(
      `Sensitivity analysis grid size exceeds maximum allowed (${MAX_STEPS}x${MAX_STEPS}). ` +
      `Requested: ${stepsX}x${stepsY}`
    );
  }

  // Run base case
  const baseCaseOutput = runFullModel(baseScenario.modelConfig);

  // Generate step values
  const stepsXValues = generateSteps(config.rangeX.min, config.rangeX.max, stepsX);
  const stepsYValues = config.variableY && config.rangeY
    ? generateSteps(config.rangeY.min, config.rangeY.max, stepsY)
    : [undefined];

  const runs: SensitivityResult['runs'] = [];
  const matrix: SensitivityResult['matrix'] = config.variableY && config.rangeY
    ? []
    : undefined;

  // Calculate total steps for progress reporting
  const totalSteps = stepsX * stepsY;
  let currentStep = 0;

  // Iterate through all combinations
  for (let i = 0; i < stepsXValues.length; i++) {
    const stepX = stepsXValues[i];
    
    if (config.variableY && config.rangeY && matrix) {
      // 2D sensitivity: iterate through Y values
      const matrixRow: typeof matrix[0] = [];
      
      for (let j = 0; j < stepsYValues.length; j++) {
        const stepY = stepsYValues[j]!;
        
        // Clone scenario
        const clonedScenario = cloneScenario(baseScenario);
        
        // Apply X adjustment
        const adjustedValueX = calculateAdjustedValue(config.variableX, getBaseValue(config.variableX, baseScenario), stepX);
        applyVariableAdjustment(clonedScenario, config.variableX, adjustedValueX);
        
        // Apply Y adjustment
        const adjustedValueY = calculateAdjustedValue(config.variableY, getBaseValue(config.variableY, baseScenario), stepY);
        applyVariableAdjustment(clonedScenario, config.variableY, adjustedValueY);
        
        // Run model
        const output = runFullModel(clonedScenario.modelConfig);
        const kpis = extractKpis(output);
        
        // Store run
        runs.push({
          variableXValue: stepX,
          variableYValue: stepY,
          output,
          kpis,
        });
        
        // Store in matrix
        matrixRow.push({
          variableXValue: stepX,
          variableYValue: stepY,
          kpis,
        });

        // Report progress after each step
        currentStep++;
        if (onProgress) {
          const progress = currentStep / totalSteps;
          onProgress(progress);
        }
      }
      
      matrix.push(matrixRow);
    } else {
      // 1D sensitivity: only X variable
      const clonedScenario = cloneScenario(baseScenario);
      
      // Apply X adjustment
      const adjustedValueX = calculateAdjustedValue(config.variableX, getBaseValue(config.variableX, baseScenario), stepX);
      applyVariableAdjustment(clonedScenario, config.variableX, adjustedValueX);
      
      // Run model
      const output = runFullModel(clonedScenario.modelConfig);
      const kpis = extractKpis(output);
      
      // Store run
      runs.push({
        variableXValue: stepX,
        output,
        kpis,
      });

      // Report progress after each step
      currentStep++;
      if (onProgress) {
        const progress = currentStep / totalSteps;
        onProgress(progress);
      }
    }
  }

  return {
    config: {
      ...config,
      baseScenario,
    },
    baseCaseOutput,
    runs,
    matrix,
  };
}

