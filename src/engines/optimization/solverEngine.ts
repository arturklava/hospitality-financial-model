/**
 * Solver Engine (v2.3)
 * 
 * Implements binary search algorithm to find input values that achieve target KPIs.
 * Uses iterative solver to run the financial model and converge to target values.
 * 
 * Pure function: no side effects, no global state, fully deterministic.
 */

import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  NamedScenario,
  FullModelOutput,
  HotelConfig,
  VillasConfig,
} from '@domain/types';

/**
 * Target KPI metric for goal seek optimization.
 */
export type TargetKpi = 'npv' | 'irr' | 'leveredIrr' | 'equityMultiple' | 'moic';

/**
 * Input variable that can be adjusted by the solver.
 */
export type InputVariable = 'adr' | 'occupancy' | 'discountRate' | 'initialInvestment' | 'debtAmount' | 'interestRate' | 'terminalGrowthRate';

/**
 * Solver configuration for goal seek optimization.
 */
export interface SolverConfig {
  /** Target KPI to achieve */
  targetKpi: TargetKpi;
  /** Target value for the KPI (e.g., 0 for break-even NPV) */
  targetValue: number;
  /** Input variable to adjust (e.g., 'adr') */
  inputVariable: InputVariable;
  /** Minimum bound for search range (default: 0 for ADR) */
  min?: number;
  /** Maximum bound for search range (default: 5000 for ADR) */
  max?: number;
  /** Convergence tolerance as fraction (default: 0.0001 = 0.01%) */
  tolerance?: number;
  /** Maximum iterations before giving up (default: 50) */
  maxIterations?: number;
  /** Optional: operation ID for operation-specific variables (e.g., ADR for specific hotel) */
  operationId?: string;
}

/**
 * Deep clone a scenario configuration for solver iteration.
 * Creates a new object with all nested structures copied.
 */
function cloneScenario(baseScenario: NamedScenario): NamedScenario {
  const clonedModelConfig = {
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
        return { ...(op as unknown as Record<string, unknown>) } as typeof op;
      }),
    },
    projectConfig: { ...baseScenario.modelConfig.projectConfig },
    capitalConfig: {
      ...baseScenario.modelConfig.capitalConfig,
      debt: baseScenario.modelConfig.capitalConfig.debt.map(tranche => ({
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
 * Sets an input variable value in a scenario.
 * Modifies the scenario in place.
 */
function setInputValue(
  scenario: NamedScenario,
  inputVariable: InputVariable,
  value: number,
  operationId?: string
): void {
  const { modelConfig } = scenario;
  const { scenario: projectScenario, projectConfig, capitalConfig } = modelConfig;

  switch (inputVariable) {
    case 'adr': {
      // Find the operation to modify
      const operation = operationId
        ? projectScenario.operations.find(op => op.id === operationId)
        : projectScenario.operations.find(
          op => op.operationType === 'HOTEL' || op.operationType === 'VILLAS'
        );

      if (!operation) {
        throw new Error(`Operation not found for ADR setting: ${operationId ?? 'first hotel/villa'}`);
      }

      if (operation.operationType === 'HOTEL') {
        (operation as HotelConfig).avgDailyRate = value;
      } else if (operation.operationType === 'VILLAS') {
        (operation as VillasConfig).avgNightlyRate = value;
      }
      break;
    }

    case 'occupancy': {
      // Set occupancy for all operations or specific operation
      const operations = operationId
        ? projectScenario.operations.filter(op => op.id === operationId)
        : projectScenario.operations.filter(
          op =>
            op.operationType === 'HOTEL' ||
            op.operationType === 'VILLAS' ||
            op.operationType === 'RETAIL' ||
            op.operationType === 'FLEX' ||
            op.operationType === 'SENIOR_LIVING'
        );

      for (const op of operations) {
        if ('occupancyByMonth' in op) {
          // Set all months to the same occupancy value
          op.occupancyByMonth = op.occupancyByMonth.map(() => value);
        }
      }
      break;
    }

    case 'discountRate': {
      projectConfig.discountRate = value;
      break;
    }

    case 'initialInvestment': {
      projectConfig.initialInvestment = value;
      break;
    }

    case 'debtAmount': {
      if (capitalConfig.debt.length === 0) {
        throw new Error('No debt tranches available to modify');
      }
      // Modify the first debt tranche amount
      const tranche = capitalConfig.debt[0];
      if (tranche.initialPrincipal !== undefined) {
        tranche.initialPrincipal = value;
      } else {
        // Fallback for backward compatibility (deprecated 'amount' field)
        tranche.amount = value;
      }
      break;
    }

    case 'interestRate': {
      if (capitalConfig.debt.length === 0) {
        throw new Error('No debt tranches available to modify');
      }
      // Modify the first debt tranche interest rate
      capitalConfig.debt[0].interestRate = value;
      break;
    }

    case 'terminalGrowthRate': {
      projectConfig.terminalGrowthRate = value;
      break;
    }

    default: {
      throw new Error(`Unsupported input variable: ${inputVariable}`);
    }
  }
}

/**
 * Extracts the target KPI value from full model output.
 */
function extractKpiValue(output: FullModelOutput, targetKpi: TargetKpi): number | null {
  switch (targetKpi) {
    case 'npv': {
      return output.project.projectKpis.npv;
    }

    case 'irr': {
      return output.project.projectKpis.unleveredIrr ?? null;
    }

    case 'leveredIrr': {
      return output.waterfall.partners.length > 0
        ? output.waterfall.partners[0].irr ?? null
        : null;
    }

    case 'equityMultiple': {
      return output.project.projectKpis.equityMultiple;
    }

    case 'moic': {
      return output.waterfall.partners.length > 0
        ? output.waterfall.partners[0].moic ?? null
        : null;
    }

    default: {
      return null;
    }
  }
}

/**
 * Gets default search bounds for an input variable.
 */
function getDefaultBounds(inputVariable: InputVariable): { min: number; max: number } {
  switch (inputVariable) {
    case 'adr':
      return { min: 0, max: 5000 };
    case 'occupancy':
      return { min: 0, max: 1 };
    case 'discountRate':
      return { min: 0, max: 0.5 }; // 0% to 50%
    case 'initialInvestment':
      return { min: 0, max: 100000000 }; // $0 to $100M
    case 'debtAmount':
      return { min: 0, max: 100000000 }; // $0 to $100M
    case 'interestRate':
      return { min: 0, max: 0.2 }; // 0% to 20%
    case 'terminalGrowthRate':
      return { min: 0, max: 0.1 }; // 0% to 10%
    default:
      return { min: 0, max: 1000 };
  }
}

/**
 * Solves for target KPI using binary search algorithm.
 * 
 * Implements binary search to find the input value that achieves the target KPI.
 * Algorithm:
 * 1. Define min/max bounds (from config or defaults)
 * 2. Loop (max iterations):
 *    a. Pick mid-point
 *    b. Run full model with mid-point value
 *    c. Check KPI
 *    d. If > Target, lower max. If < Target, raise min.
 * 3. Stop when within tolerance
 * 
 * @param scenario - Base scenario to modify
 * @param config - Solver configuration
 * @returns Optimized input value that achieves target KPI
 * @throws Error if solver fails to converge or encounters errors
 */
export function solveForTarget(
  scenario: NamedScenario,
  config: SolverConfig
): number {
  // Resolve configuration with defaults
  const tolerance = config.tolerance ?? 0.0001; // 0.01%
  const maxIterations = config.maxIterations ?? 50;

  // Get search bounds
  const defaultBounds = getDefaultBounds(config.inputVariable);
  const min = config.min ?? defaultBounds.min;
  const max = config.max ?? defaultBounds.max;

  // Validate bounds
  if (min >= max) {
    throw new Error(`Invalid search bounds: min (${min}) must be less than max (${max})`);
  }

  // Initialize binary search
  let lowerBound = min;
  let upperBound = max;
  let iterations = 0;

  // Binary search loop
  while (iterations < maxIterations) {
    const mid = (lowerBound + upperBound) / 2;

    // Clone scenario and set input value
    const modifiedScenario = cloneScenario(scenario);
    try {
      setInputValue(modifiedScenario, config.inputVariable, mid, config.operationId);
    } catch (error) {
      throw new Error(`Failed to set input value: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Run full model
    let output: FullModelOutput;
    try {
      output = runFullModel(modifiedScenario.modelConfig);
    } catch (error) {
      throw new Error(`Failed to run full model: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Extract KPI value
    const actualValue = extractKpiValue(output, config.targetKpi);
    if (actualValue === null) {
      throw new Error(`Could not extract ${config.targetKpi} from model output`);
    }

    // Check convergence
    const error = Math.abs(actualValue - config.targetValue);
    const relativeError = config.targetValue !== 0
      ? error / Math.abs(config.targetValue)
      : error;

    if (relativeError < tolerance) {
      // Converged - return mid value
      return mid;
    }

    // Update search bounds based on comparison
    // Assumes monotonic relationship: higher input -> higher KPI (for most cases)
    // If actualValue < target, we need higher input (raise lower bound)
    // If actualValue > target, we need lower input (lower upper bound)
    if (actualValue < config.targetValue) {
      lowerBound = mid;
    } else {
      upperBound = mid;
    }

    // Check if bounds are too close (numerical precision limit)
    if (upperBound - lowerBound < 1e-10) {
      // Return mid point if bounds collapsed
      return (lowerBound + upperBound) / 2;
    }

    iterations++;
  }

  // Did not converge within max iterations
  throw new Error(
    `Solver did not converge after ${iterations} iterations. ` +
    `Final range: [${lowerBound.toFixed(4)}, ${upperBound.toFixed(4)}]`
  );
}

