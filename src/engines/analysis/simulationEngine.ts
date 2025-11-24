/**
 * Monte Carlo Simulation Engine (v0.11)
 * 
 * Runs the financial model multiple times with random variations to inputs
 * (Occupancy, ADR, Interest Rate) to generate probability distributions of outputs.
 * 
 * Pure function: no side effects, no global state, fully deterministic (except for randomness).
 */

import { runFullModel } from '@engines/pipeline/modelPipeline';
import { generateNormalRandom, calculatePercentiles, generateCorrelatedSamples, sampleLogNormal } from '@domain/statistics';
import type {
  NamedScenario,
  FullModelInput,
  FullModelOutput,
  HotelConfig,
  VillasConfig,
  SimulationConfig,
  SimulationResult,
  SimulationKpi,
  CorrelationMatrix,
  DistributionType,
} from '@domain/types';

/**
 * Default simulation configuration values.
 */
const DEFAULT_ITERATIONS = 1000;
const DEFAULT_OCCUPANCY_VARIATION = 0.05; // 5% standard deviation
const DEFAULT_ADR_VARIATION = 0.10; // 10% standard deviation
const DEFAULT_INTEREST_RATE_VARIATION = 0.01; // 1% standard deviation

/**
 * Deep clone a scenario configuration for Monte Carlo simulation.
 * Creates a new object with all nested structures copied.
 * 
 * Performance: This is called once per iteration, so we optimize for correctness
 * while avoiding unnecessary deep copies where possible.
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
        return { ...(op as unknown as Record<string, unknown>) } as typeof op;
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
 * Sample a multiplier based on distribution type and variation.
 * 
 * @param distributionType - Distribution type ('normal', 'lognormal', or 'pert')
 * @param variation - Variation parameter (stdDev for normal/lognormal)
 * @returns Multiplier value
 */
function sampleMultiplier(distributionType: DistributionType, variation: number): number {
  switch (distributionType) {
    case 'normal':
      // Normal: multiplier = 1 + N(0, variation)
      return 1 + generateNormalRandom(0, variation);
    case 'lognormal':
      // LogNormal: multiplier = exp(N(0, variation)) where variation is in log-space
      // This ensures multiplier is always > 0
      return sampleLogNormal(0, variation);
    case 'pert':
      // PERT requires min, likely, max - not supported for simple variations
      // Fall back to normal
      return 1 + generateNormalRandom(0, variation);
    default:
      // Default to normal
      return 1 + generateNormalRandom(0, variation);
  }
}

/**
 * Apply random variations to a cloned scenario.
 * Modifies the scenario in place based on the simulation configuration.
 * 
 * Variations are applied multiplicatively using the specified distribution types:
 * - Occupancy: base * multiplier (default: Normal distribution)
 * - ADR: base * multiplier (default: Normal, can use LogNormal for prices)
 * - Interest Rate: base * multiplier (default: Normal)
 * 
 * Distribution types:
 * - 'normal': multiplier = 1 + N(0, variation)
 * - 'lognormal': multiplier = exp(N(0, variation)) - ensures multiplier > 0
 * - 'pert': Not supported for simple variations (requires min/likely/max)
 * 
 * If correlationMatrix is provided, uses multivariate normal distribution
 * to generate correlated samples. Otherwise, uses independent sampling.
 * 
 * Note: Correlation matrix only works with normal distributions. If other
 * distribution types are specified, correlation is ignored for those variables.
 */
function applyRandomVariations(
  scenario: NamedScenario,
  config: Required<Omit<SimulationConfig, 'correlationMatrix'>> & { correlationMatrix?: CorrelationMatrix },
  correlationMatrix?: CorrelationMatrix
): void {
  const { modelConfig } = scenario;
  const { scenario: projectScenario, capitalConfig } = modelConfig;

  // Get distribution types (default to 'normal')
  const occupancyDistType: DistributionType = config.occupancyDistributionType ?? 'normal';
  const adrDistType: DistributionType = config.adrDistributionType ?? 'normal';
  const interestRateDistType: DistributionType = config.interestRateDistributionType ?? 'normal';

  let occupancyMultiplier: number;
  let adrMultiplier: number;
  let interestRateMultiplier: number;

  if (correlationMatrix) {
    // Use correlated sampling
    // Map variables to indices: ['occupancy', 'adr', 'interestRate']
    const variableOrder = ['occupancy', 'adr', 'interestRate'] as const;
    const variableIndices: { [key: string]: number } = {};
    
    // Find indices for each variable in the correlation matrix
    for (let i = 0; i < correlationMatrix.variables.length; i++) {
      const varName = correlationMatrix.variables[i];
      if (variableOrder.includes(varName as any)) {
        variableIndices[varName] = i;
      }
    }

    // Check if all required variables are present
    const hasOccupancy = 'occupancy' in variableIndices;
    const hasAdr = 'adr' in variableIndices;
    const hasInterestRate = 'interestRate' in variableIndices;

    if (!hasOccupancy || !hasAdr || !hasInterestRate) {
      // Fall back to independent sampling if variables don't match
      occupancyMultiplier = sampleMultiplier(occupancyDistType, config.occupancyVariation);
      adrMultiplier = sampleMultiplier(adrDistType, config.adrVariation);
      interestRateMultiplier = sampleMultiplier(interestRateDistType, config.interestRateVariation);
    } else {
      // Correlation matrix only works with normal distributions
      // If any variable uses a different distribution, we need to handle it separately
      const useCorrelation = 
        occupancyDistType === 'normal' && 
        adrDistType === 'normal' && 
        interestRateDistType === 'normal';
      
      if (useCorrelation) {
      // Generate correlated samples
      // Means are 0 (we're generating multipliers around 1)
      // Standard deviations are the variation parameters
      const means = [0, 0, 0];
      const stdDevs = [
        config.occupancyVariation,
        config.adrVariation,
        config.interestRateVariation,
      ];

      // Reorder matrix and vectors to match variable order
      const reorderedMatrix: number[][] = [];
      const reorderedMeans: number[] = [];
      const reorderedStdDevs: number[] = [];

      for (let i = 0; i < 3; i++) {
        const varName = variableOrder[i];
        const matrixIdx = variableIndices[varName];
        reorderedMeans.push(means[matrixIdx]);
        reorderedStdDevs.push(stdDevs[matrixIdx]);
        
        const row: number[] = [];
        for (let j = 0; j < 3; j++) {
          const varNameJ = variableOrder[j];
          const matrixIdxJ = variableIndices[varNameJ];
          row.push(correlationMatrix.matrix[matrixIdx][matrixIdxJ]);
        }
        reorderedMatrix.push(row);
      }

      try {
        const correlatedSamples = generateCorrelatedSamples(
          reorderedMeans,
          reorderedStdDevs,
          reorderedMatrix
        );

        occupancyMultiplier = 1 + correlatedSamples[0];
        adrMultiplier = 1 + correlatedSamples[1];
        interestRateMultiplier = 1 + correlatedSamples[2];
      } catch (error) {
        // Fall back to independent sampling if correlation matrix is invalid
        occupancyMultiplier = sampleMultiplier(occupancyDistType, config.occupancyVariation);
        adrMultiplier = sampleMultiplier(adrDistType, config.adrVariation);
        interestRateMultiplier = sampleMultiplier(interestRateDistType, config.interestRateVariation);
      }
      } else {
        // Cannot use correlation with non-normal distributions
        // Sample independently using specified distribution types
        occupancyMultiplier = sampleMultiplier(occupancyDistType, config.occupancyVariation);
        adrMultiplier = sampleMultiplier(adrDistType, config.adrVariation);
        interestRateMultiplier = sampleMultiplier(interestRateDistType, config.interestRateVariation);
      }
    }
  } else {
    // Use independent sampling with specified distribution types
    occupancyMultiplier = sampleMultiplier(occupancyDistType, config.occupancyVariation);
    adrMultiplier = sampleMultiplier(adrDistType, config.adrVariation);
    interestRateMultiplier = sampleMultiplier(interestRateDistType, config.interestRateVariation);
  }

  // Apply occupancy variation to all operations
  projectScenario.operations.forEach(op => {
    if ('occupancyByMonth' in op && Array.isArray(op.occupancyByMonth)) {
      // Generate a single random multiplier for all months (correlated variation)
      op.occupancyByMonth = op.occupancyByMonth.map(occ => 
        Math.max(0, Math.min(1, occ * occupancyMultiplier))
      );
    } else if ('utilizationByMonth' in op && Array.isArray(op.utilizationByMonth)) {
      op.utilizationByMonth = op.utilizationByMonth.map(util => 
        Math.max(0, Math.min(1, util * occupancyMultiplier))
      );
    } else if ('turnoverByMonth' in op && Array.isArray(op.turnoverByMonth)) {
      op.turnoverByMonth = op.turnoverByMonth.map(turn => 
        Math.max(0, turn * occupancyMultiplier)
      );
    }
  });

  // Apply ADR variation to hotel/villa operations
  projectScenario.operations.forEach(op => {
    if (op.operationType === 'HOTEL') {
      (op as HotelConfig).avgDailyRate *= adrMultiplier;
    } else if (op.operationType === 'VILLAS') {
      (op as VillasConfig).avgNightlyRate *= adrMultiplier;
    }
  });

  // Apply interest rate variation to all debt tranches
  capitalConfig.debtTranches.forEach(tranche => {
    tranche.interestRate = Math.max(0, tranche.interestRate * interestRateMultiplier);
  });
}

/**
 * Extract KPIs from a full model output.
 * Stores only the key metrics to save memory.
 */
function extractKpis(output: FullModelOutput): SimulationKpi {
  const projectKpis = output.project.projectKpis;
  const waterfallKpis = output.waterfall.partners.length > 0 
    ? output.waterfall.partners[0] 
    : null;

  return {
    npv: projectKpis.npv,
    unleveredIrr: projectKpis.unleveredIrr,
    leveredIrr: waterfallKpis?.irr ?? null,
    moic: waterfallKpis?.moic ?? null,
    equityMultiple: projectKpis.equityMultiple,
    wacc: projectKpis.wacc ?? null,
  };
}

/**
 * Calculate statistics (mean and percentiles) for a KPI across all iterations.
 */
function calculateKpiStatistics(
  values: (number | null)[],
  allowNull: boolean = false
): {
  mean: number | null;
  p10: number | null;
  p50: number | null;
  p90: number | null;
} {
  // Filter out null values if needed
  const numericValues = allowNull
    ? values.filter((v): v is number => v !== null && !isNaN(v))
    : values.filter((v): v is number => v !== null && !isNaN(v));

  if (numericValues.length === 0) {
    return {
      mean: null,
      p10: null,
      p50: null,
      p90: null,
    };
  }

  const mean = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
  const percentiles = calculatePercentiles(numericValues);

  return {
    mean,
    p10: percentiles.p10,
    p50: percentiles.p50,
    p90: percentiles.p90,
  };
}

/**
 * Run Monte Carlo simulation on a base scenario.
 * 
 * For each iteration:
 * 1. Clone the base scenario
 * 2. Apply random variations to inputs (Occupancy, ADR, Interest Rate)
 * 3. Run the full model
 * 4. Extract and store KPIs
 * 
 * After all iterations, calculates statistical summary (mean, P10, P50, P90).
 * 
 * Performance: Optimized to avoid unnecessary object creation inside the loop.
 * Only KPIs are stored, not full model outputs, to save memory.
 * 
 * **Note:** This is a synchronous function that blocks the main thread.
 * For UI usage, use `useSimulationWorker` hook instead.
 * This export is maintained for test compatibility.
 * 
 * @internal For testing and worker usage only. UI should use `useSimulationWorker` hook.
 * @param scenario - Base scenario to simulate
 * @param config - Simulation configuration (iterations, variation std devs)
 * @param onProgress - Optional callback for progress updates (0.0 to 1.0)
 * @returns Simulation results with all iterations and statistical summary
 * @throws Error if model execution fails
 */
export function runMonteCarlo(
  scenario: NamedScenario,
  config: SimulationConfig = {},
  onProgress?: (progress: number) => void
): SimulationResult {
  // Resolve configuration with defaults (correlationMatrix and distribution types remain optional)
  const resolvedConfig: Required<Omit<SimulationConfig, 'correlationMatrix' | 'occupancyDistributionType' | 'adrDistributionType' | 'interestRateDistributionType'>> & {
    correlationMatrix?: CorrelationMatrix;
    occupancyDistributionType?: DistributionType;
    adrDistributionType?: DistributionType;
    interestRateDistributionType?: DistributionType;
  } = {
    iterations: config.iterations ?? DEFAULT_ITERATIONS,
    occupancyVariation: config.occupancyVariation ?? DEFAULT_OCCUPANCY_VARIATION,
    adrVariation: config.adrVariation ?? DEFAULT_ADR_VARIATION,
    interestRateVariation: config.interestRateVariation ?? DEFAULT_INTEREST_RATE_VARIATION,
    correlationMatrix: config.correlationMatrix,
    occupancyDistributionType: config.occupancyDistributionType,
    adrDistributionType: config.adrDistributionType,
    interestRateDistributionType: config.interestRateDistributionType,
  };

  // Extract correlation matrix from config
  const correlationMatrix = resolvedConfig.correlationMatrix;

  // Run base case (no variations)
  const baseCaseOutput = runFullModel(scenario.modelConfig);
  const baseCaseKpis = extractKpis(baseCaseOutput);

  // Run Monte Carlo iterations
  const iterations: SimulationKpi[] = [];
  const progressInterval = 50; // Emit progress every 50 iterations
  
  for (let i = 0; i < resolvedConfig.iterations; i++) {
    // Clone scenario for this iteration
    const clonedScenario = cloneScenario(scenario);
    
    // Apply random variations (with optional correlation matrix)
    applyRandomVariations(clonedScenario, {
      ...resolvedConfig,
      occupancyDistributionType: resolvedConfig.occupancyDistributionType ?? 'normal',
      adrDistributionType: resolvedConfig.adrDistributionType ?? 'normal',
      interestRateDistributionType: resolvedConfig.interestRateDistributionType ?? 'normal',
    }, correlationMatrix);
    
    // Run full model
    const output = runFullModel(clonedScenario.modelConfig);
    
    // Extract and store KPIs only (save memory)
    const kpis = extractKpis(output);
    iterations.push(kpis);
    
    // Report progress every N iterations or on final iteration
    if (onProgress && (i % progressInterval === 0 || i === resolvedConfig.iterations - 1)) {
      const progress = (i + 1) / resolvedConfig.iterations;
      onProgress(progress);
    }
  }

  // Calculate statistics for each KPI
  const npvValues = iterations.map(k => k.npv);
  const unleveredIrrValues = iterations.map(k => k.unleveredIrr);
  const leveredIrrValues = iterations.map(k => k.leveredIrr);
  const moicValues = iterations.map(k => k.moic);
  const equityMultipleValues = iterations.map(k => k.equityMultiple);
  const waccValues = iterations.map(k => k.wacc);

  return {
    config: resolvedConfig as SimulationConfig,
    baseCaseKpis,
    iterations,
    statistics: {
      npv: calculateKpiStatistics(npvValues) as { mean: number; p10: number; p50: number; p90: number },
      unleveredIrr: calculateKpiStatistics(unleveredIrrValues, true),
      leveredIrr: calculateKpiStatistics(leveredIrrValues, true),
      moic: calculateKpiStatistics(moicValues, true),
      equityMultiple: calculateKpiStatistics(equityMultipleValues) as { mean: number; p10: number; p50: number; p90: number },
      wacc: calculateKpiStatistics(waccValues, true),
    },
  };
}

