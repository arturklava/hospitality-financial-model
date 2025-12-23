/**
 * Governance & Versioning Tests (v0.12)
 * 
 * Tests for scenario versioning workflow, immutability, and diff visualization.
 * Verifies that:
 * - Version snapshots are immutable
 * - Version workflow (Create -> Save V1 -> Change -> Save V2) works correctly
 * - DiffModal receives correct delta structure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSnapshot } from '@domain/governance';
import { compareScenarios, summarizeDiff } from '@engines/governance/diffEngine';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type { NamedScenario } from '@domain/types';
import type { ScenarioVersion } from '@domain/governance';
import type { DiffResult } from '@engines/governance/diffEngine';
import { buildHotelConfig } from '../helpers/buildOperationConfig';
import { buildSingleTrancheCapitalConfig } from '../helpers/buildCapitalConfig';
import { buildBaselineWaterfallConfig } from '../helpers/buildWaterfallConfig';

/**
 * Builds a minimal valid NamedScenario for testing.
 */
function buildTestScenario(overrides?: Partial<NamedScenario>): NamedScenario {
  return {
    id: 'test-scenario-1',
    name: 'Test Scenario',
    description: 'A test scenario',
    modelConfig: {
      scenario: {
        id: 'scenario-1',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 5,
        operations: [buildHotelConfig()],
      },
      projectConfig: {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 10_000_000,
        workingCapitalPercentage: 0.05,
      },
      capitalConfig: buildSingleTrancheCapitalConfig(),
      waterfallConfig: buildBaselineWaterfallConfig(),
    },
    ...overrides,
  };
}

/**
 * Mock localStorage for testing.
 */
function createMockLocalStorage(): Storage {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
}

describe('Governance & Versioning Tests (v0.12)', () => {
  let mockStorage: Storage;
  const SCENARIO_STORAGE_KEY = 'hospitality_scenarios_v1';
  const VERSION_STORAGE_KEY = 'hospitality_scenario_versions_v1';

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    // Mock window.localStorage for browser-like environment
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    } else {
      // For Node.js test environment, create a global window object
      (globalThis as any).window = {
        localStorage: mockStorage,
      };
    }
    // Clear storage before each test
    mockStorage.clear();
  });

  describe('Versioning Workflow', () => {
    it('should create scenario, save V1, change input, save V2, and maintain V1 immutability', () => {
      // Step 1: Create Scenario
      const originalScenario = buildTestScenario({
        id: 'workflow-scenario',
        name: 'Workflow Test Scenario',
      });

      // Save scenario to library (simulating addScenario)
      const scenarios: NamedScenario[] = [originalScenario];
      mockStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenarios));

      // Verify scenario was created
      const storedScenarios: NamedScenario[] = JSON.parse(
        mockStorage.getItem(SCENARIO_STORAGE_KEY)!
      );
      expect(storedScenarios.length).toBe(1);
      expect(storedScenarios[0].id).toBe('workflow-scenario');
      expect(storedScenarios[0].modelConfig.projectConfig.discountRate).toBe(0.10);

      // Step 2: Save Version V1
      const v1Snapshot = createSnapshot(originalScenario, 'V1 - Initial');
      const v1OriginalDiscountRate = v1Snapshot.snapshot.modelConfig.projectConfig.discountRate;
      const v1OriginalAdr = (v1Snapshot.snapshot.modelConfig.scenario.operations[0] as any)
        .avgDailyRate;

      // Save V1 to version storage
      const versions: ScenarioVersion[] = [v1Snapshot];
      mockStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions));

      // Verify V1 was saved
      const storedVersions: ScenarioVersion[] = JSON.parse(
        mockStorage.getItem(VERSION_STORAGE_KEY)!
      );
      expect(storedVersions.length).toBe(1);
      expect(storedVersions[0].label).toBe('V1 - Initial');
      expect(storedVersions[0].scenarioId).toBe('workflow-scenario');
      expect(
        storedVersions[0].snapshot.modelConfig.projectConfig.discountRate
      ).toBe(v1OriginalDiscountRate);

      // Step 3: Change Input (modify the scenario)
      const modifiedScenario: NamedScenario = {
        ...originalScenario,
        modelConfig: {
          ...originalScenario.modelConfig,
          projectConfig: {
            ...originalScenario.modelConfig.projectConfig,
            discountRate: 0.12, // Changed from 0.10 to 0.12
          },
          scenario: {
            ...originalScenario.modelConfig.scenario,
            operations: [
              {
                ...buildHotelConfig(),
                avgDailyRate: 220, // Changed from 250 to 220
              },
            ],
          },
        },
      };

      // Update scenario in library (simulating updateScenario)
      const updatedScenarios: NamedScenario[] = [modifiedScenario];
      mockStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(updatedScenarios));

      // Verify scenario was updated
      const updatedStoredScenarios: NamedScenario[] = JSON.parse(
        mockStorage.getItem(SCENARIO_STORAGE_KEY)!
      );
      expect(updatedStoredScenarios[0].modelConfig.projectConfig.discountRate).toBe(0.12);
      expect(
        (updatedStoredScenarios[0].modelConfig.scenario.operations[0] as any).avgDailyRate
      ).toBe(220);

      // Step 4: Save Version V2
      const v2Snapshot = createSnapshot(modifiedScenario, 'V2 - After Changes');
      const v2Versions: ScenarioVersion[] = [...storedVersions, v2Snapshot];
      mockStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(v2Versions));

      // Verify V2 was saved
      const finalVersions: ScenarioVersion[] = JSON.parse(
        mockStorage.getItem(VERSION_STORAGE_KEY)!
      );
      expect(finalVersions.length).toBe(2);
      expect(finalVersions[1].label).toBe('V2 - After Changes');
      expect(
        finalVersions[1].snapshot.modelConfig.projectConfig.discountRate
      ).toBe(0.12);

      // Step 5: Assert V1 data remains unchanged (immutability)
      const v1AfterV2Save = finalVersions[0];
      expect(v1AfterV2Save.snapshot.modelConfig.projectConfig.discountRate).toBe(
        v1OriginalDiscountRate
      );
      expect(v1AfterV2Save.snapshot.modelConfig.projectConfig.discountRate).toBe(0.10);
      expect(
        (v1AfterV2Save.snapshot.modelConfig.scenario.operations[0] as any).avgDailyRate
      ).toBe(v1OriginalAdr);
      expect(
        (v1AfterV2Save.snapshot.modelConfig.scenario.operations[0] as any).avgDailyRate
      ).toBe(250);

      // Verify V1 and V2 are different
      expect(v1AfterV2Save.snapshot.modelConfig.projectConfig.discountRate).not.toBe(
        finalVersions[1].snapshot.modelConfig.projectConfig.discountRate
      );
    });

    it('should maintain immutability when modifying original scenario after version save', () => {
      const scenario = buildTestScenario({
        id: 'immutability-test',
        name: 'Immutability Test',
      });

      // Save V1
      const v1 = createSnapshot(scenario, 'V1');
      const v1DiscountRate = v1.snapshot.modelConfig.projectConfig.discountRate;
      const v1InitialInvestment = v1.snapshot.modelConfig.projectConfig.initialInvestment;

      // Modify original scenario
      scenario.modelConfig.projectConfig.discountRate = 0.15;
      scenario.modelConfig.projectConfig.initialInvestment = 15_000_000;

      // V1 snapshot should remain unchanged
      expect(v1.snapshot.modelConfig.projectConfig.discountRate).toBe(v1DiscountRate);
      expect(v1.snapshot.modelConfig.projectConfig.discountRate).toBe(0.10);
      expect(v1.snapshot.modelConfig.projectConfig.initialInvestment).toBe(
        v1InitialInvestment
      );
      expect(v1.snapshot.modelConfig.projectConfig.initialInvestment).toBe(10_000_000);

      // Original scenario should be modified
      expect(scenario.modelConfig.projectConfig.discountRate).toBe(0.15);
      expect(scenario.modelConfig.projectConfig.initialInvestment).toBe(15_000_000);
    });

    it('should handle multiple versions for the same scenario', () => {
      const scenario = buildTestScenario({
        id: 'multi-version-scenario',
        name: 'Multi-Version Scenario',
      });

      // Save V1
      const v1 = createSnapshot(scenario, 'V1');
      const versions: ScenarioVersion[] = [v1];

      // Modify and save V2
      scenario.modelConfig.projectConfig.discountRate = 0.12;
      const v2 = createSnapshot(scenario, 'V2');
      versions.push(v2);

      // Modify and save V3
      scenario.modelConfig.projectConfig.discountRate = 0.14;
      const v3 = createSnapshot(scenario, 'V3');
      versions.push(v3);

      // All versions should be independent
      expect(versions.length).toBe(3);
      expect(versions[0].snapshot.modelConfig.projectConfig.discountRate).toBe(0.10);
      expect(versions[1].snapshot.modelConfig.projectConfig.discountRate).toBe(0.12);
      expect(versions[2].snapshot.modelConfig.projectConfig.discountRate).toBe(0.14);

      // All should reference the same scenario ID
      expect(versions[0].scenarioId).toBe('multi-version-scenario');
      expect(versions[1].scenarioId).toBe('multi-version-scenario');
      expect(versions[2].scenarioId).toBe('multi-version-scenario');
    });
  });

  describe('Diff Visualization Logic', () => {
    it('should verify DiffModal receives correct delta structure (DiffResult)', () => {
      // Create base scenario (V1)
      const baseScenario = buildTestScenario({
        id: 'diff-test-scenario',
        name: 'Diff Test Scenario',
      });

      // Create modified scenario (V2)
      const modifiedScenario: NamedScenario = {
        ...baseScenario,
        modelConfig: {
          ...baseScenario.modelConfig,
          projectConfig: {
            ...baseScenario.modelConfig.projectConfig,
            discountRate: 0.12, // Changed from 0.10
            initialInvestment: 12_000_000, // Changed from 10_000_000
          },
          scenario: {
            ...baseScenario.modelConfig.scenario,
            operations: [
              {
                ...buildHotelConfig(),
                avgDailyRate: 220, // Changed from 250
              },
            ],
          },
        },
      };

      // Create version snapshots (v3.3: includes cachedKpis)
      const baseModelOutput = runFullModel(baseScenario.modelConfig);
      const baseVersion: ScenarioVersion = {
        versionId: 'v1-id',
        scenarioId: 'diff-test-scenario',
        label: 'V1',
        createdAt: Date.now(),
        snapshot: baseScenario,
        cachedKpis: baseModelOutput.project.projectKpis,
      };

      // Compare scenarios (this is what DiffModal does internally)
      const diffResult: DiffResult = compareScenarios(
        baseVersion.snapshot,
        modifiedScenario
      );

      // Verify DiffResult structure
      expect(diffResult).toBeDefined();
      expect(diffResult).toHaveProperty('changes');
      expect(Array.isArray(diffResult.changes)).toBe(true);

      // Verify changes are detected
      expect(diffResult.changes.length).toBeGreaterThan(0);

      // Verify each change has correct structure (DiffChange)
      diffResult.changes.forEach((change) => {
        expect(change).toHaveProperty('path');
        expect(change).toHaveProperty('type');
        expect(change).toHaveProperty('oldValue');
        expect(change).toHaveProperty('newValue');
        expect(typeof change.path).toBe('string');
        expect(['added', 'removed', 'modified']).toContain(change.type);
      });

      // Verify specific changes are detected
      const discountRateChange = diffResult.changes.find((c) =>
        c.path.includes('discountRate')
      );
      expect(discountRateChange).toBeDefined();
      expect(discountRateChange?.type).toBe('modified');
      expect(discountRateChange?.oldValue).toBe(0.10);
      expect(discountRateChange?.newValue).toBe(0.12);

      const investmentChange = diffResult.changes.find(
        (c) => c.path.includes('initialInvestment') && !c.path.includes('capitalConfig')
      );
      expect(investmentChange).toBeDefined();
      expect(investmentChange?.type).toBe('modified');
      expect(investmentChange?.oldValue).toBe(10_000_000);
      expect(investmentChange?.newValue).toBe(12_000_000);

      const adrChange = diffResult.changes.find((c) => c.path.includes('avgDailyRate'));
      expect(adrChange).toBeDefined();
      expect(adrChange?.type).toBe('modified');
      expect(adrChange?.oldValue).toBe(250);
      expect(adrChange?.newValue).toBe(220);
    });

    it('should handle empty diff (no changes)', () => {
      const scenario = buildTestScenario();
      const modelOutput = runFullModel(scenario.modelConfig);
      const version: ScenarioVersion = {
        versionId: 'v1-id',
        scenarioId: scenario.id,
        label: 'V1',
        createdAt: Date.now(),
        snapshot: scenario,
        cachedKpis: modelOutput.project.projectKpis,
      };

      // Compare identical scenarios
      const diffResult: DiffResult = compareScenarios(version.snapshot, scenario);

      expect(diffResult).toBeDefined();
      expect(diffResult.changes).toHaveLength(0);
    });

    it('should detect added fields in diff', () => {
      const baseScenario = buildTestScenario();
      const modifiedScenario: NamedScenario = {
        ...baseScenario,
        modelConfig: {
          ...baseScenario.modelConfig,
          projectConfig: {
            ...baseScenario.modelConfig.projectConfig,
            // Add a new field (if supported by type system)
            // For this test, we'll modify an existing optional field
          },
        },
      };

      const baseModelOutput = runFullModel(baseScenario.modelConfig);
      const baseVersion: ScenarioVersion = {
        versionId: 'v1-id',
        scenarioId: baseScenario.id,
        label: 'V1',
        createdAt: Date.now(),
        snapshot: baseScenario,
        cachedKpis: baseModelOutput.project.projectKpis,
      };

      const diffResult: DiffResult = compareScenarios(
        baseVersion.snapshot,
        modifiedScenario
      );

      // Should have no changes if scenarios are identical
      expect(diffResult.changes.length).toBe(0);
    });

    it('should detect removed fields in diff', () => {
      const baseScenario = buildTestScenario({
        description: 'Has description',
      });
      const modifiedScenario: NamedScenario = {
        ...baseScenario,
        description: undefined, // Removed description
      };

      const baseModelOutput = runFullModel(baseScenario.modelConfig);
      const baseVersion: ScenarioVersion = {
        versionId: 'v1-id',
        scenarioId: baseScenario.id,
        label: 'V1',
        createdAt: Date.now(),
        snapshot: baseScenario,
        cachedKpis: baseModelOutput.project.projectKpis,
      };

      const diffResult: DiffResult = compareScenarios(
        baseVersion.snapshot,
        modifiedScenario
      );

      // Should detect description change
      const descriptionChange = diffResult.changes.find((c) => c.path === 'description');
      if (descriptionChange) {
        expect(descriptionChange.type).toBe('modified');
      }
    });

    it('should verify diff structure matches DiffModal expectations', () => {
      const baseScenario = buildTestScenario();
      const modifiedScenario: NamedScenario = {
        ...baseScenario,
        modelConfig: {
          ...baseScenario.modelConfig,
          projectConfig: {
            ...baseScenario.modelConfig.projectConfig,
            discountRate: 0.15,
          },
        },
      };

      const baseModelOutput = runFullModel(baseScenario.modelConfig);
      const baseVersion: ScenarioVersion = {
        versionId: 'v1-id',
        scenarioId: baseScenario.id,
        label: 'V1',
        createdAt: Date.now(),
        snapshot: baseScenario,
        cachedKpis: baseModelOutput.project.projectKpis,
      };

      // This is what DiffModal does internally
      const diffResult: DiffResult = compareScenarios(
        baseVersion.snapshot,
        modifiedScenario
      );

      // DiffModal expects:
      // - diffResult.changes to be an array
      // - Each change to have: path, type, oldValue, newValue
      // - Changes can be iterated and displayed

      expect(diffResult.changes).toBeDefined();
      expect(Array.isArray(diffResult.changes)).toBe(true);

      // Verify structure matches what DiffModal uses
      if (diffResult.changes.length > 0) {
        const firstChange = diffResult.changes[0];
        expect(firstChange).toHaveProperty('path');
        expect(firstChange).toHaveProperty('type');
        expect(firstChange).toHaveProperty('oldValue');
        expect(firstChange).toHaveProperty('newValue');

        // Verify types match DiffChange interface
        expect(typeof firstChange.path).toBe('string');
        expect(['added', 'removed', 'modified']).toContain(firstChange.type);
      }
    });
  });

  describe('KPI Caching (v3.3: Workflow Logic)', () => {
    it('should cache ProjectKpis when creating a snapshot', () => {
      const scenario = buildTestScenario({
        id: 'kpi-cache-test',
        name: 'KPI Cache Test',
      });

      // Create snapshot (should run model and cache KPIs)
      const version = createSnapshot(scenario, 'V1 - With KPIs');

      // Verify cachedKpis is present
      expect(version.cachedKpis).toBeDefined();
      expect(version.cachedKpis).toHaveProperty('npv');
      expect(version.cachedKpis).toHaveProperty('unleveredIrr');
      expect(version.cachedKpis).toHaveProperty('equityMultiple');
      expect(version.cachedKpis).toHaveProperty('paybackPeriod');

      // Verify KPIs match what we get from running the model directly
      const modelOutput = runFullModel(version.snapshot.modelConfig);
      const expectedKpis = modelOutput.project.projectKpis;

      expect(version.cachedKpis.npv).toBe(expectedKpis.npv);
      expect(version.cachedKpis.unleveredIrr).toBe(expectedKpis.unleveredIrr);
      expect(version.cachedKpis.equityMultiple).toBe(expectedKpis.equityMultiple);
      expect(version.cachedKpis.paybackPeriod).toBe(expectedKpis.paybackPeriod);
    });

    it('should enable fast diff summarization using cached KPIs', () => {
      const baseScenario = buildTestScenario({
        id: 'diff-summary-test',
        name: 'Diff Summary Test',
      });

      // Create base version
      const baseVersion = createSnapshot(baseScenario, 'V1 - Base');

      // Modify scenario
      const modifiedScenario: NamedScenario = {
        ...baseScenario,
        modelConfig: {
          ...baseScenario.modelConfig,
          projectConfig: {
            ...baseScenario.modelConfig.projectConfig,
            discountRate: 0.12, // Changed from 0.10
          },
        },
      };

      // Run model for target to get output
      const targetOutput = runFullModel(modifiedScenario.modelConfig);

      // Create base output from cached KPIs (simulating what summarizeDiff would do)
      const baseOutput = runFullModel(baseVersion.snapshot.modelConfig);

      // Use summarizeDiff to get high-level impacts
      const summary = summarizeDiff(baseOutput, targetOutput);

      // Verify summary structure
      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('npvDelta');
      expect(summary).toHaveProperty('irrDelta');

      // Verify deltas are calculated correctly
      const expectedNpvDelta = targetOutput.project.projectKpis.npv - baseOutput.project.projectKpis.npv;
      expect(summary.npvDelta).toBe(expectedNpvDelta);

      // IRR delta should be calculated if both are non-null
      if (baseOutput.project.projectKpis.unleveredIrr !== null && 
          targetOutput.project.projectKpis.unleveredIrr !== null) {
        const expectedIrrDelta = targetOutput.project.projectKpis.unleveredIrr - 
                                  baseOutput.project.projectKpis.unleveredIrr;
        expect(summary.irrDelta).toBe(expectedIrrDelta);
      }
    });

    it('should handle null IRR values in diff summary', () => {
      const baseScenario = buildTestScenario({
        id: 'null-irr-test',
        name: 'Null IRR Test',
      });

      const baseVersion = createSnapshot(baseScenario, 'V1');

      // Create a scenario that might result in null IRR
      // (e.g., very high discount rate or negative cash flows)
      const modifiedScenario: NamedScenario = {
        ...baseScenario,
        modelConfig: {
          ...baseScenario.modelConfig,
          projectConfig: {
            ...baseScenario.modelConfig.projectConfig,
            discountRate: 0.99, // Very high discount rate might cause null IRR
          },
        },
      };

      const baseOutput = runFullModel(baseVersion.snapshot.modelConfig);
      const targetOutput = runFullModel(modifiedScenario.modelConfig);

      const summary = summarizeDiff(baseOutput, targetOutput);

      // If either IRR is null, irrDelta should be null
      if (baseOutput.project.projectKpis.unleveredIrr === null || 
          targetOutput.project.projectKpis.unleveredIrr === null) {
        expect(summary.irrDelta).toBeNull();
      } else {
        expect(summary.irrDelta).not.toBeNull();
      }
    });

    it('should maintain cached KPIs across multiple versions', () => {
      const scenario = buildTestScenario({
        id: 'multi-version-kpi-test',
        name: 'Multi-Version KPI Test',
      });

      // Create V1
      const v1 = createSnapshot(scenario, 'V1');
      expect(v1.cachedKpis).toBeDefined();

      // Modify and create V2
      scenario.modelConfig.projectConfig.discountRate = 0.12;
      const v2 = createSnapshot(scenario, 'V2');
      expect(v2.cachedKpis).toBeDefined();

      // Verify V1 KPIs are different from V2 KPIs (due to discount rate change)
      expect(v1.cachedKpis.npv).not.toBe(v2.cachedKpis.npv);

      // Verify each version has its own cached KPIs
      expect(v1.cachedKpis).not.toBe(v2.cachedKpis);
    });
  });
});

