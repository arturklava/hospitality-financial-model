/**
 * Scenario Comparison Engine (v2.6)
 * 
 * Implements the Scenario Triad: Base, Stress, and Upside scenarios.
 * Runs the financial model with base input, then creates stress and upside variants
 * by adjusting occupancy and ADR by a stress percentage.
 * 
 * Pure function: no side effects, no global state, fully deterministic.
 */

import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  FullModelInput,
  ProjectKpis,
  HotelConfig,
  VillasConfig,
} from '@domain/types';

/**
 * Result of running scenario triad comparison.
 */
export interface ScenarioTriadResult {
  base: ProjectKpis;
  stress: ProjectKpis;
  upside: ProjectKpis;
}

/**
 * Result structure for general scenario comparison.
 */
export interface ScenarioComparisonResult {
  id: string;
  name: string;
  kpis: ProjectKpis;
}

/**
 * Deep clone a FullModelInput for scenario comparison.
 * Creates a new object with all nested structures copied.
 */
export function cloneFullModelInput(baseInput: FullModelInput): FullModelInput {
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
        return op;
      }),
    },
    projectConfig: { ...baseInput.projectConfig },
    capitalConfig: {
      ...baseInput.capitalConfig,
      debt: baseInput.capitalConfig.debt.map(tranche => ({
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
 * Apply stress or upside adjustment to occupancy and ADR.
 * Modifies the input in place.
 */
function applyOccupancyAndAdrAdjustment(
  input: FullModelInput,
  multiplier: number
): void {
  // Apply occupancy adjustment to all operations
  input.scenario.operations.forEach(op => {
    if ('occupancyByMonth' in op && Array.isArray(op.occupancyByMonth)) {
      op.occupancyByMonth = op.occupancyByMonth.map(occ =>
        Math.max(0, Math.min(1, occ * multiplier))
      );
    } else if ('utilizationByMonth' in op && Array.isArray(op.utilizationByMonth)) {
      op.utilizationByMonth = op.utilizationByMonth.map(util =>
        Math.max(0, Math.min(1, util * multiplier))
      );
    } else if ('turnoverByMonth' in op && Array.isArray(op.turnoverByMonth)) {
      op.turnoverByMonth = op.turnoverByMonth.map(turn =>
        Math.max(0, turn * multiplier)
      );
    }
  });

  // Apply ADR adjustment to hotel/villa operations
  input.scenario.operations.forEach(op => {
    if (op.operationType === 'HOTEL') {
      (op as HotelConfig).avgDailyRate *= multiplier;
    } else if (op.operationType === 'VILLAS') {
      (op as VillasConfig).avgNightlyRate *= multiplier;
    }
  });
}

/**
 * Runs the Scenario Triad: Base, Stress, and Upside scenarios.
 * 
 * - Base: Runs model on baseInput as-is.
 * - Stress: Clones baseInput and multiplies all occupancy and ADR by (1 - stressPct).
 * - Upside: Clones baseInput and multiplies all occupancy and ADR by (1 + stressPct).
 * 
 * @param baseInput - Base input configuration for the financial model
 * @param stressPct - Stress percentage (e.g., 0.20 for 20% stress/upside)
 * @returns Object containing ProjectKpis for base, stress, and upside scenarios
 * @throws Error if model execution fails
 */
export function runScenarioTriad(
  baseInput: FullModelInput,
  stressPct: number
): ScenarioTriadResult {
  // Run base scenario
  const baseOutput = runFullModel(baseInput);
  const base = baseOutput.project.projectKpis;

  // Create and run stress scenario
  const stressInput = cloneFullModelInput(baseInput);
  applyOccupancyAndAdrAdjustment(stressInput, 1 - stressPct);
  const stressOutput = runFullModel(stressInput);
  const stress = stressOutput.project.projectKpis;

  // Create and run upside scenario
  const upsideInput = cloneFullModelInput(baseInput);
  applyOccupancyAndAdrAdjustment(upsideInput, 1 + stressPct);
  const upsideOutput = runFullModel(upsideInput);
  const upside = upsideOutput.project.projectKpis;

  return {
    base,
    stress,
    upside,
  };
}

/**
 * Compare multiple arbitrary scenarios.
 * 
 * WARNING: This is a stub. Implementation pending.
 */
export function compareScenarios(inputs: { id: string, name: string, config: FullModelInput }[]): ScenarioComparisonResult[] {
  return inputs.map(input => {
    // 1. Deep clone to ensure isolation
    const clonedConfig = cloneFullModelInput(input.config);

    // 2. Run fresh model instance
    const output = runFullModel(clonedConfig);

    // 3. Return structured result
    return {
      id: input.id,
      name: input.name,
      kpis: output.project.projectKpis,
    };
  });
}
