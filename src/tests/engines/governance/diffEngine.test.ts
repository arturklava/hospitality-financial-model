import { describe, it, expect } from 'vitest';
import { compareScenarios, formatDiff } from '@engines/governance/diffEngine';
import type { NamedScenario } from '@domain/types';
import { buildHotelConfig } from '../../helpers/buildOperationConfig';
import { buildSingleTrancheCapitalConfig } from '../../helpers/buildCapitalConfig';
import { buildBaselineWaterfallConfig } from '../../helpers/buildWaterfallConfig';

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
        initialInvestment: 10000000,
      },
      capitalConfig: buildSingleTrancheCapitalConfig(),
      waterfallConfig: buildBaselineWaterfallConfig(),
    },
    ...overrides,
  };
}

describe('Diff Engine (v0.12)', () => {
  describe('compareScenarios', () => {
    it('should return empty diff for identical scenarios', () => {
      const scenario1 = buildTestScenario();
      const scenario2 = buildTestScenario();

      const diff = compareScenarios(scenario1, scenario2);

      expect(diff.changes).toHaveLength(0);
    });

    it('should detect changes in projectConfig.discountRate', () => {
      const base = buildTestScenario();
      const target = buildTestScenario({
        modelConfig: {
          ...base.modelConfig,
          projectConfig: {
            ...base.modelConfig.projectConfig,
            discountRate: 0.12, // Changed from 0.10
          },
        },
      });

      const diff = compareScenarios(base, target);

      expect(diff.changes.length).toBeGreaterThan(0);
      const discountRateChange = diff.changes.find(
        c => c.path.includes('discountRate')
      );
      expect(discountRateChange).toBeDefined();
      expect(discountRateChange?.type).toBe('modified');
      expect(discountRateChange?.oldValue).toBe(0.10);
      expect(discountRateChange?.newValue).toBe(0.12);
    });

    it('should detect changes in hotel ADR', () => {
      const base = buildTestScenario();
      const target = buildTestScenario({
        modelConfig: {
          ...base.modelConfig,
          scenario: {
            ...base.modelConfig.scenario,
            operations: [
              {
                ...buildHotelConfig(),
                avgDailyRate: 220, // Changed from 250
              },
            ],
          },
        },
      });

      const diff = compareScenarios(base, target);

      expect(diff.changes.length).toBeGreaterThan(0);
      const adrChange = diff.changes.find(c => c.path.includes('avgDailyRate'));
      expect(adrChange).toBeDefined();
      expect(adrChange?.type).toBe('modified');
      expect(adrChange?.oldValue).toBe(250);
      expect(adrChange?.newValue).toBe(220);
    });

    it('should detect changes in initialInvestment', () => {
      const base = buildTestScenario();
      const target = buildTestScenario({
        modelConfig: {
          ...base.modelConfig,
          projectConfig: {
            ...base.modelConfig.projectConfig,
            initialInvestment: 12000000, // Changed from 10000000
          },
        },
      });

      const diff = compareScenarios(base, target);

      expect(diff.changes.length).toBeGreaterThan(0);
      const investmentChange = diff.changes.find(
        c => c.path.includes('initialInvestment') && !c.path.includes('capitalConfig')
      );
      expect(investmentChange).toBeDefined();
      expect(investmentChange?.type).toBe('modified');
      expect(investmentChange?.oldValue).toBe(10000000);
      expect(investmentChange?.newValue).toBe(12000000);
    });

    it('should detect changes in scenario name', () => {
      const base = buildTestScenario();
      const target = buildTestScenario({
        name: 'Updated Scenario Name',
      });

      const diff = compareScenarios(base, target);

      expect(diff.changes.length).toBeGreaterThan(0);
      const nameChange = diff.changes.find(c => c.path === 'name');
      expect(nameChange).toBeDefined();
      expect(nameChange?.type).toBe('modified');
      expect(nameChange?.oldValue).toBe('Test Scenario');
      expect(nameChange?.newValue).toBe('Updated Scenario Name');
    });

    it('should detect changes in debt tranche interest rate', () => {
      const base = buildTestScenario();
      const target = buildTestScenario({
        modelConfig: {
          ...base.modelConfig,
          capitalConfig: {
            ...base.modelConfig.capitalConfig,
            debtTranches: [
              {
                ...base.modelConfig.capitalConfig.debtTranches[0],
                interestRate: 0.10, // Changed from default 0.08
              },
            ],
          },
        },
      });

      const diff = compareScenarios(base, target);

      expect(diff.changes.length).toBeGreaterThan(0);
      const interestRateChange = diff.changes.find(
        c => c.path.includes('interestRate')
      );
      expect(interestRateChange).toBeDefined();
      expect(interestRateChange?.type).toBe('modified');
      expect(interestRateChange?.oldValue).toBe(0.08);
      expect(interestRateChange?.newValue).toBe(0.10);
    });

    it('should detect added operations', () => {
      const base = buildTestScenario();
      const target = buildTestScenario({
        modelConfig: {
          ...base.modelConfig,
          scenario: {
            ...base.modelConfig.scenario,
            operations: [
              ...base.modelConfig.scenario.operations,
              buildHotelConfig({ id: 'hotel-2', name: 'Second Hotel' }),
            ],
          },
        },
      });

      const diff = compareScenarios(base, target);

      expect(diff.changes.length).toBeGreaterThan(0);
      // When an operation is added, we'll see changes in the new operation's fields
      expect(diff.changes.some(c => c.path.includes('operations[1]'))).toBe(true);
    });

    it('should detect removed operations', () => {
      const base = buildTestScenario({
        modelConfig: {
          ...buildTestScenario().modelConfig,
          scenario: {
            ...buildTestScenario().modelConfig.scenario,
            operations: [
              buildHotelConfig({ id: 'hotel-1' }),
              buildHotelConfig({ id: 'hotel-2' }),
            ],
          },
        },
      });
      const target = buildTestScenario({
        modelConfig: {
          ...base.modelConfig,
          scenario: {
            ...base.modelConfig.scenario,
            operations: [base.modelConfig.scenario.operations[0]], // Remove second operation
          },
        },
      });

      const diff = compareScenarios(base, target);

      expect(diff.changes.length).toBeGreaterThan(0);
      // When an operation is removed, we'll see it marked as removed
      const removedOperation = diff.changes.find(
        c => c.path.includes('operations[1]') && c.type === 'removed'
      );
      expect(removedOperation).toBeDefined();
    });

    it('should ignore lastModified metadata fields', () => {
      const base = buildTestScenario();
      const target = buildTestScenario({
        modelConfig: {
          ...base.modelConfig,
          projectConfig: {
            ...base.modelConfig.projectConfig,
            // @ts-expect-error - lastModified is not in the type but we're testing it's ignored
            lastModified: Date.now(),
          },
        },
      });

      const diff = compareScenarios(base, target);

      // Should not have any changes since only lastModified was added
      expect(diff.changes.length).toBe(0);
    });

    it('should detect changes in occupancy array', () => {
      const base = buildTestScenario();
      const newOccupancy = Array(12).fill(0.75);
      const target = buildTestScenario({
        modelConfig: {
          ...base.modelConfig,
          scenario: {
            ...base.modelConfig.scenario,
            operations: [
              {
                ...buildHotelConfig(),
                occupancyByMonth: newOccupancy,
              },
            ],
          },
        },
      });

      const diff = compareScenarios(base, target);

      expect(diff.changes.length).toBeGreaterThan(0);
      const occupancyChange = diff.changes.find(c =>
        c.path.includes('occupancyByMonth')
      );
      expect(occupancyChange).toBeDefined();
    });
  });

  describe('formatDiff', () => {
    it('should format empty diff as empty array', () => {
      const diff = { changes: [] };
      const formatted = formatDiff(diff);

      expect(formatted).toEqual([]);
    });

    it('should format discount rate change', () => {
      const base = buildTestScenario();
      const target = buildTestScenario({
        modelConfig: {
          ...base.modelConfig,
          projectConfig: {
            ...base.modelConfig.projectConfig,
            discountRate: 0.12,
          },
        },
      });

      const diff = compareScenarios(base, target);
      const formatted = formatDiff(diff);

      expect(formatted.length).toBeGreaterThan(0);
      const discountRateMessage = formatted.find(m =>
        m.includes('Discount rate') && m.includes('changed from')
      );
      expect(discountRateMessage).toBeDefined();
      expect(discountRateMessage).toContain('0.1');
      expect(discountRateMessage).toContain('0.12');
    });

    it('should format ADR change with readable message', () => {
      const base = buildTestScenario();
      const target = buildTestScenario({
        modelConfig: {
          ...base.modelConfig,
          scenario: {
            ...base.modelConfig.scenario,
            operations: [
              {
                ...buildHotelConfig(),
                avgDailyRate: 220,
              },
            ],
          },
        },
      });

      const diff = compareScenarios(base, target);
      const formatted = formatDiff(diff);

      expect(formatted.length).toBeGreaterThan(0);
      const adrMessage = formatted.find(m =>
        m.includes('ADR') && m.includes('changed from')
      );
      expect(adrMessage).toBeDefined();
      expect(adrMessage).toContain('250');
      expect(adrMessage).toContain('220');
    });

    it('should format multiple changes', () => {
      const base = buildTestScenario();
      const target = buildTestScenario({
        modelConfig: {
          ...base.modelConfig,
          projectConfig: {
            ...base.modelConfig.projectConfig,
            discountRate: 0.12,
            initialInvestment: 12000000,
          },
          scenario: {
            ...base.modelConfig.scenario,
            operations: [
              {
                ...buildHotelConfig(),
                avgDailyRate: 220,
              },
            ],
          },
        },
      });

      const diff = compareScenarios(base, target);
      const formatted = formatDiff(diff);

      expect(formatted.length).toBeGreaterThanOrEqual(3);
      expect(formatted.some(m => m.includes('Discount rate'))).toBe(true);
      expect(formatted.some(m => m.includes('Initial investment'))).toBe(true);
      expect(formatted.some(m => m.includes('ADR'))).toBe(true);
    });
  });
});

