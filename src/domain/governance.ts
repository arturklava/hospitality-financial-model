/**
 * Governance & Versioning (v0.12)
 * 
 * Provides versioning and snapshot capabilities for scenarios.
 * Ensures immutability through deep cloning.
 */

import type { NamedScenario, FullModelInput, HotelConfig, ProjectKpis } from './types';
import { runFullModel } from '@engines/pipeline/modelPipeline';

/**
 * Scenario version snapshot.
 * 
 * Represents an immutable snapshot of a scenario at a specific point in time.
 * 
 * @property versionId - Unique identifier for this version
 * @property scenarioId - Reference to the original scenario
 * @property label - Human-readable label for this version (e.g., "v1.0", "Before ADR change")
 * @property createdAt - Timestamp (milliseconds since epoch) when snapshot was created
 * @property snapshot - Deep-cloned copy of the scenario data
 * @property cachedKpis - Cached project KPIs from the model run (v3.3: Workflow Logic)
 */
export interface ScenarioVersion {
  versionId: string;
  scenarioId: string;
  label: string;
  createdAt: number;
  snapshot: NamedScenario;
  cachedKpis: ProjectKpis; // v3.3: Cached KPIs for fast diff summarization
}

/**
 * Deep clone a scenario configuration to ensure immutability.
 * Creates a new object with all nested structures copied.
 * 
 * This function is used internally by createSnapshot to ensure
 * that version snapshots are truly immutable.
 */
function deepCloneScenario(scenario: NamedScenario): NamedScenario {
  // Deep clone the model config
  const clonedModelConfig: FullModelInput = {
    scenario: {
      ...scenario.modelConfig.scenario,
      operations: scenario.modelConfig.scenario.operations.map(op => {
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
    projectConfig: { ...scenario.modelConfig.projectConfig },
    capitalConfig: {
      ...scenario.modelConfig.capitalConfig,
      debt: (scenario.modelConfig.capitalConfig.debt || scenario.modelConfig.capitalConfig.tranches || []).map(tranche => ({
        ...tranche,
      })),
    },
    waterfallConfig: {
      ...scenario.modelConfig.waterfallConfig,
      equityClasses: scenario.modelConfig.waterfallConfig.equityClasses.map(ec => ({
        ...ec,
      })),
      tiers: scenario.modelConfig.waterfallConfig.tiers?.map(tier => ({
        ...tier,
        distributionSplits: { ...tier.distributionSplits },
        catchUpTargetSplit: tier.catchUpTargetSplit ? { ...tier.catchUpTargetSplit } : undefined,
      })),
    },
    netDebtOverride: scenario.modelConfig.netDebtOverride
      ? { ...scenario.modelConfig.netDebtOverride }
      : undefined,
  };

  return {
    ...scenario,
    modelConfig: clonedModelConfig,
  };
}

/**
 * Create an immutable snapshot of a scenario.
 * 
 * Deep-clones the scenario data to ensure the snapshot remains unchanged
 * even if the original scenario is modified.
 * 
 * v3.3: Also runs the model to cache ProjectKpis for fast diff summarization.
 * This enables "Smart Restore" functionality without requiring model re-runs.
 * 
 * @param scenario - The scenario to snapshot
 * @param label - Human-readable label for this version (e.g., "v1.0", "Before ADR change")
 * @returns A ScenarioVersion with a deep-cloned snapshot and cached KPIs
 */
export function createSnapshot(scenario: NamedScenario, label: string): ScenarioVersion {
  const versionId = `${scenario.id}-${Date.now()}`;
  const snapshot = deepCloneScenario(scenario);

  // v3.3: Run the model to cache KPIs for fast diff summarization
  // This ensures we can quickly compare versions without re-running the model
  const modelOutput = runFullModel(snapshot.modelConfig);
  const cachedKpis = modelOutput.project.projectKpis;

  return {
    versionId,
    scenarioId: scenario.id,
    label,
    createdAt: Date.now(),
    snapshot,
    cachedKpis,
  };
}

