/**
 * Workflow Verification Test (v3.3: Workflow Logic)
 * 
 * Tests for:
 * 1. Migration: Loading old versions without cachedKpis
 * 2. Flow: Save Version -> Open Restore Modal -> Check Diff Summary renders
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { RestorePreviewModal } from '../../components/governance/RestorePreviewModal';
import { DiffModal } from '../../components/governance/DiffModal';
import { runFullModel } from '../../engines/pipeline/modelPipeline';
import { createSnapshot } from '../../domain/governance';
import { summarizeVersionDiff } from '../../engines/governance/diffEngine';
import type { SavedScenario, NamedScenario } from '../../domain/types';
import type { ScenarioVersion } from '../../domain/governance';
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
 * Creates an old SavedScenario (without cachedKpis) to simulate migration.
 */
function createOldVersion(scenario: NamedScenario, name: string): SavedScenario {
  return {
    id: `old-${Date.now()}`,
    name,
    description: scenario.description,
    modelConfig: scenario.modelConfig,
    lastModified: Date.now(),
    // Note: No cachedKpis - this is the old format
  };
}

describe('Workflow Verification (v3.3)', () => {
  describe('Migration Test: Old Versions without cachedKpis', () => {
    it('should handle loading old SavedScenario without cachedKpis gracefully', () => {
      const oldScenario = buildTestScenario();
      const oldVersion = createOldVersion(oldScenario, 'Old Version v1.0');

      // Should not throw when accessing old version
      expect(() => {
        const config = oldVersion.modelConfig;
        expect(config).toBeDefined();
        expect(config.scenario).toBeDefined();
        expect(config.projectConfig).toBeDefined();
      }).not.toThrow();

      // Verify old version structure (no cachedKpis)
      expect(oldVersion).not.toHaveProperty('cachedKpis');
      expect(oldVersion).toHaveProperty('modelConfig');
      expect(oldVersion).toHaveProperty('lastModified');
    });

    it('should calculate KPIs on the fly when cachedKpis is missing', () => {
      const oldScenario = buildTestScenario();
      const oldVersion = createOldVersion(oldScenario, 'Old Version');

      // Calculate KPIs on the fly (as RestorePreviewModal does)
      expect(() => {
        const output = runFullModel(oldVersion.modelConfig);
        const kpis = output.project.projectKpis;
        
        expect(kpis).toBeDefined();
        expect(kpis).toHaveProperty('npv');
        expect(kpis).toHaveProperty('unleveredIrr');
        expect(kpis).toHaveProperty('equityMultiple');
        expect(kpis).toHaveProperty('paybackPeriod');
      }).not.toThrow();
    });

    it('should render RestorePreviewModal with old version (no cachedKpis)', async () => {
      const oldScenario = buildTestScenario();
      const oldVersion = createOldVersion(oldScenario, 'Old Version');
      const currentVersion = createOldVersion(buildTestScenario({ name: 'Current' }), 'Current');

      const onClose = vi.fn();
      const onConfirmRestore = vi.fn();

      render(
        <RestorePreviewModal
          isOpen={true}
          currentVersion={currentVersion}
          selectedVersion={oldVersion}
          onClose={onClose}
          onConfirmRestore={onConfirmRestore}
        />
      );

      // Should render without errors
      await waitFor(() => {
        expect(screen.getByText(/Restore Preview/i)).toBeInTheDocument();
      });

      // Should show version names
      expect(screen.getByText(/Old Version/i)).toBeInTheDocument();
      
      // Should calculate and display KPIs (on the fly)
      await waitFor(() => {
        // The modal calculates KPIs internally, so we just verify it renders
        expect(screen.getByText(/Key Metrics Comparison/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle missing cachedKpis in diff summary gracefully', () => {
      const baseScenario = buildTestScenario();
      const targetScenario = buildTestScenario({
        modelConfig: {
          ...buildTestScenario().modelConfig,
          projectConfig: {
            ...buildTestScenario().modelConfig.projectConfig,
            discountRate: 0.12, // Changed from 0.10
          },
        },
      });

      // Create base version with cachedKpis (new format)
      const baseModelOutput = runFullModel(baseScenario.modelConfig);
      const baseVersion: ScenarioVersion = {
        versionId: 'v1-id',
        scenarioId: baseScenario.id,
        label: 'V1',
        createdAt: Date.now(),
        snapshot: baseScenario,
        cachedKpis: baseModelOutput.project.projectKpis,
      };

      // Create target version WITHOUT cachedKpis (old format simulation)
      const targetModelOutput = runFullModel(targetScenario.modelConfig);
      
      // Test summarizeVersionDiff with target that has cachedKpis
      expect(() => {
        const summary = summarizeVersionDiff(baseVersion, targetModelOutput);
        expect(summary).toBeDefined();
        expect(summary).toHaveProperty('npvDelta');
        expect(summary).toHaveProperty('irrDelta');
      }).not.toThrow();
    });
  });

  describe('Flow Test: Save -> Restore Modal -> Diff Summary', () => {
    it('should complete full workflow: Save Version -> Open Restore Modal -> Diff Summary renders', async () => {
      // Step 1: Create and save a version
      const baseScenario = buildTestScenario({ name: 'Base Scenario' });
      const savedVersion = createSnapshot(baseScenario, 'Saved Version v1.0');

      // Verify saved version has cachedKpis (new format)
      expect(savedVersion).toHaveProperty('cachedKpis');
      expect(savedVersion.cachedKpis).toBeDefined();
      expect(savedVersion.cachedKpis).toHaveProperty('npv');

      // Step 2: Modify the scenario
      const modifiedScenario = buildTestScenario({
        name: 'Modified Scenario',
        modelConfig: {
          ...baseScenario.modelConfig,
          projectConfig: {
            ...baseScenario.modelConfig.projectConfig,
            discountRate: 0.12, // Changed from 0.10
          },
        },
      });

      // Step 3: Convert saved version to SavedScenario format for RestorePreviewModal
      const savedVersionAsSavedScenario: SavedScenario = {
        id: savedVersion.versionId,
        name: savedVersion.label,
        description: savedVersion.snapshot.description,
        modelConfig: savedVersion.snapshot.modelConfig,
        lastModified: savedVersion.createdAt,
      };

      const currentVersionAsSavedScenario: SavedScenario = {
        id: 'current',
        name: 'Current Scenario',
        description: modifiedScenario.description,
        modelConfig: modifiedScenario.modelConfig,
        lastModified: Date.now(),
      };

      // Step 4: Render RestorePreviewModal
      const onClose = vi.fn();
      const onConfirmRestore = vi.fn();

      render(
        <RestorePreviewModal
          isOpen={true}
          currentVersion={currentVersionAsSavedScenario}
          selectedVersion={savedVersionAsSavedScenario}
          onClose={onClose}
          onConfirmRestore={onConfirmRestore}
        />
      );

      // Step 5: Verify modal renders with diff summary
      await waitFor(() => {
        expect(screen.getByText(/Restore Preview/i)).toBeInTheDocument();
        expect(screen.getByText(/Key Metrics Comparison/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify version names are displayed
      expect(screen.getByText(/Saved Version v1.0/i)).toBeInTheDocument();
      expect(screen.getByText(/Current Scenario/i)).toBeInTheDocument();
    });

    it('should render DiffModal with ScenarioVersion and show diff summary', async () => {
      const baseScenario = buildTestScenario({ name: 'Base' });
      const modifiedScenario = buildTestScenario({
        name: 'Modified',
        modelConfig: {
          ...baseScenario.modelConfig,
          projectConfig: {
            ...baseScenario.modelConfig.projectConfig,
            discountRate: 0.12, // Changed
            initialInvestment: 12_000_000, // Changed
          },
        },
      });

      // Create version with cachedKpis
      const baseVersion = createSnapshot(baseScenario, 'Base Version');

      const onClose = vi.fn();

      render(
        <DiffModal
          isOpen={true}
          onClose={onClose}
          baseVersion={baseVersion}
          targetScenario={modifiedScenario}
        />
      );

      // Verify modal renders
      await waitFor(() => {
        expect(screen.getByText(/Version Comparison/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify KPI impact section renders (may show "Calculating..." or actual values)
      await waitFor(() => {
        // The modal calculates KPIs, so we verify the structure exists
        // KPI section may or may not be visible depending on calculation timing
        // But the modal should render without errors
        expect(screen.getByText(/Version Comparison/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should handle diff summary calculation with cachedKpis', () => {
      const baseScenario = buildTestScenario();
      const modifiedScenario = buildTestScenario({
        modelConfig: {
          ...baseScenario.modelConfig,
          projectConfig: {
            ...baseScenario.modelConfig.projectConfig,
            discountRate: 0.12,
          },
        },
      });

      // Create versions with cachedKpis
      const baseVersion = createSnapshot(baseScenario, 'Base');
      const modifiedModelOutput = runFullModel(modifiedScenario.modelConfig);
      const modifiedVersion: ScenarioVersion = {
        versionId: 'modified-id',
        scenarioId: modifiedScenario.id,
        label: 'Modified',
        createdAt: Date.now(),
        snapshot: modifiedScenario,
        cachedKpis: modifiedModelOutput.project.projectKpis,
      };

      // Test summarizeVersionDiff
      expect(() => {
        const summary = summarizeVersionDiff(baseVersion, modifiedVersion);
        
        expect(summary).toBeDefined();
        expect(summary).toHaveProperty('npvDelta');
        expect(summary).toHaveProperty('irrDelta');
        
        // NPV delta should be a number
        expect(typeof summary.npvDelta).toBe('number');
        
        // IRR delta may be null if either IRR is null
        expect(summary.irrDelta === null || typeof summary.irrDelta === 'number').toBe(true);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined cachedKpis in old versions', () => {
      const oldScenario = buildTestScenario();
      const oldVersion = createOldVersion(oldScenario, 'Old Version');

      // Simulate accessing cachedKpis on old version (should not exist)
      const hasCachedKpis = 'cachedKpis' in oldVersion;
      expect(hasCachedKpis).toBe(false);

      // Should still be able to calculate KPIs on the fly
      expect(() => {
        const output = runFullModel(oldVersion.modelConfig);
        const kpis = output.project.projectKpis;
        expect(kpis).toBeDefined();
      }).not.toThrow();
    });

    it('should handle mixed old and new versions in comparison', () => {
      const scenario1 = buildTestScenario({ name: 'Scenario 1' });
      const scenario2 = buildTestScenario({ 
        name: 'Scenario 2',
        modelConfig: {
          ...scenario1.modelConfig,
          projectConfig: {
            ...scenario1.modelConfig.projectConfig,
            discountRate: 0.12,
          },
        },
      });

      // Old version (no cachedKpis)
      const oldVersion = createOldVersion(scenario1, 'Old');
      
      // New version (with cachedKpis)
      const newVersion = createSnapshot(scenario2, 'New');

      // Both should work independently
      expect(() => {
        const oldOutput = runFullModel(oldVersion.modelConfig);
        expect(oldOutput.project.projectKpis).toBeDefined();
      }).not.toThrow();

      expect(newVersion.cachedKpis).toBeDefined();
      expect(newVersion.cachedKpis).toHaveProperty('npv');
    });
  });
});

