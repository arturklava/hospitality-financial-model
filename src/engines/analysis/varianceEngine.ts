/**
 * Variance Analysis Engine (v3.6)
 * 
 * Implements variance bridge analysis to attribute NPV differences between scenarios
 * into operational, capital, and development impacts.
 * 
 * Pure function: no side effects, no global state, fully deterministic.
 */

import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  NamedScenario,
  FullModelInput,
  BridgeStep,
  HotelConfig,
  VillasConfig,
} from '@domain/types';

/**
 * Deep clone a FullModelInput for variance analysis.
 * Creates a new object with all nested structures copied.
 */
function cloneFullModelInput(baseInput: FullModelInput): FullModelInput {
  return {
    scenario: {
      ...baseInput.scenario,
      operations: baseInput.scenario.operations.map(op => {
        // Deep clone each operation config
        if (op.operationType === 'HOTEL') {
          return {
            ...op,
            occupancyByMonth: [...(op as HotelConfig).occupancyByMonth],
          } as HotelConfig;
        } else if (op.operationType === 'VILLAS') {
          return {
            ...op,
            occupancyByMonth: [...(op as VillasConfig).occupancyByMonth],
          } as VillasConfig;
        } else if (op.operationType === 'RESTAURANT') {
          return {
            ...op,
            turnoverByMonth: [...op.turnoverByMonth],
          };
        } else if (op.operationType === 'BEACH_CLUB' || op.operationType === 'RACQUET' || op.operationType === 'WELLNESS') {
          return {
            ...op,
            utilizationByMonth: [...op.utilizationByMonth],
          };
        } else if (op.operationType === 'RETAIL' || op.operationType === 'FLEX' || op.operationType === 'SENIOR_LIVING') {
          return {
            ...op,
            occupancyByMonth: [...op.occupancyByMonth],
          };
        }
        // Return the operation config as-is for other types
        return { ...(op as unknown as Record<string, unknown>) } as typeof op;
      }),
    },
    projectConfig: { ...baseInput.projectConfig },
    capitalConfig: {
      ...baseInput.capitalConfig,
      debtTranches: baseInput.capitalConfig.debtTranches.map(tranche => ({
        ...tranche,
      })),
    },
    waterfallConfig: {
      ...baseInput.waterfallConfig,
      equityClasses: baseInput.waterfallConfig.equityClasses.map(ec => ({
        ...ec,
      })),
      tiers: baseInput.waterfallConfig.tiers?.map(tier => ({
        ...tier,
        distributionSplits: { ...tier.distributionSplits },
        catchUpTargetSplit: tier.catchUpTargetSplit ? { ...tier.catchUpTargetSplit } : undefined,
      })),
    },
    netDebtOverride: baseInput.netDebtOverride ? { ...baseInput.netDebtOverride } : undefined,
  };
}

/**
 * Apply only operational changes from target to base.
 * Operational changes include: scenario.operations (revenue/cost parameters).
 */
function applyOperationalChanges(base: FullModelInput, target: FullModelInput): FullModelInput {
  const cloned = cloneFullModelInput(base);
  // Replace operations from target
  cloned.scenario.operations = target.scenario.operations.map(targetOp => {
    // Deep clone target operation
    if (targetOp.operationType === 'HOTEL') {
      return {
        ...targetOp,
        occupancyByMonth: [...(targetOp as HotelConfig).occupancyByMonth],
      } as HotelConfig;
    } else if (targetOp.operationType === 'VILLAS') {
      return {
        ...targetOp,
        occupancyByMonth: [...(targetOp as VillasConfig).occupancyByMonth],
      } as VillasConfig;
    } else if (targetOp.operationType === 'RESTAURANT') {
      return {
        ...targetOp,
        turnoverByMonth: [...targetOp.turnoverByMonth],
      };
    } else if (targetOp.operationType === 'BEACH_CLUB' || targetOp.operationType === 'RACQUET' || targetOp.operationType === 'WELLNESS') {
      return {
        ...targetOp,
        utilizationByMonth: [...targetOp.utilizationByMonth],
      };
    } else if (targetOp.operationType === 'RETAIL' || targetOp.operationType === 'FLEX' || targetOp.operationType === 'SENIOR_LIVING') {
      return {
        ...targetOp,
        occupancyByMonth: [...targetOp.occupancyByMonth],
      };
    }
    return { ...(targetOp as unknown as Record<string, unknown>) } as typeof targetOp;
  });
  return cloned;
}

/**
 * Apply only capital changes from target to base.
 * Capital changes include: capitalConfig (debt rates, LTV, debt amounts).
 */
function applyCapitalChanges(base: FullModelInput, target: FullModelInput): FullModelInput {
  const cloned = cloneFullModelInput(base);
  // Replace capital config from target
  cloned.capitalConfig = {
    ...target.capitalConfig,
    debtTranches: target.capitalConfig.debtTranches.map(tranche => ({
      ...tranche,
    })),
  };
  return cloned;
}

/**
 * Apply only construction/development changes from target to base.
 * Construction changes include: projectConfig.initialInvestment, scenario.startYear, scenario.horizonYears.
 */
function applyConstructionChanges(base: FullModelInput, target: FullModelInput): FullModelInput {
  const cloned = cloneFullModelInput(base);
  // Replace project config (initial investment)
  cloned.projectConfig = { ...target.projectConfig };
  // Replace scenario timing (startYear, horizonYears)
  cloned.scenario.startYear = target.scenario.startYear;
  cloned.scenario.horizonYears = target.scenario.horizonYears;
  return cloned;
}

/**
 * Calculate variance bridge between base and target scenarios.
 * 
 * Algorithm:
 * 1. Calculate Base NPV.
 * 2. Step 1: Change only Operations (Revenue/Cost). Run Model. Delta = Operational Impact.
 * 3. Step 2: Change only Capital (Rates/LTV). Run Model. Delta = Capital Impact.
 * 4. Step 3: Change only Construction (Budget/Time). Run Model. Delta = Development Impact.
 * 5. Residual = Remaining difference.
 * 
 * @param base - Base scenario
 * @param target - Target scenario to compare against
 * @returns Array of bridge steps suitable for a Waterfall Chart
 */
export function calculateVarianceBridge(
  base: NamedScenario,
  target: NamedScenario
): BridgeStep[] {
  // Step 0: Calculate Base NPV
  const baseOutput = runFullModel(base.modelConfig);
  const baseNpv = baseOutput.project.projectKpis.npv;
  
  const steps: BridgeStep[] = [];
  let cumulativeValue = baseNpv;
  
  // Step 1: Operational Impact (Revenue/Cost changes only)
  const operationalInput = applyOperationalChanges(base.modelConfig, target.modelConfig);
  const operationalOutput = runFullModel(operationalInput);
  const operationalNpv = operationalOutput.project.projectKpis.npv;
  const operationalImpact = operationalNpv - baseNpv;
  
  cumulativeValue += operationalImpact;
  steps.push({
    label: 'Operational Impact',
    value: operationalImpact,
    cumulativeValue,
  });
  
  // Step 2: Capital Impact (Rates/LTV changes only)
  // Start from operational input (base + operations from target)
  const capitalInput = applyCapitalChanges(operationalInput, target.modelConfig);
  const capitalOutput = runFullModel(capitalInput);
  const capitalNpv = capitalOutput.project.projectKpis.npv;
  const capitalImpact = capitalNpv - operationalNpv;
  
  cumulativeValue += capitalImpact;
  steps.push({
    label: 'Capital Impact',
    value: capitalImpact,
    cumulativeValue,
  });
  
  // Step 3: Development Impact (Budget/Time changes only)
  // Start from capital input (base + operations + capital from target)
  const constructionInput = applyConstructionChanges(capitalInput, target.modelConfig);
  const constructionOutput = runFullModel(constructionInput);
  const constructionNpv = constructionOutput.project.projectKpis.npv;
  const developmentImpact = constructionNpv - capitalNpv;
  
  cumulativeValue += developmentImpact;
  steps.push({
    label: 'Development Impact',
    value: developmentImpact,
    cumulativeValue,
  });
  
  // Step 4: Calculate final target NPV to get residual
  const targetOutput = runFullModel(target.modelConfig);
  const targetNpv = targetOutput.project.projectKpis.npv;
  const residual = targetNpv - constructionNpv;
  
  // Only add residual step if it's significant (non-zero)
  if (Math.abs(residual) > 0.01) {
    cumulativeValue += residual;
    steps.push({
      label: 'Residual',
      value: residual,
      cumulativeValue,
    });
  }
  
  return steps;
}

