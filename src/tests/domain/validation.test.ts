import { describe, it, expect } from 'vitest';
import { isScenarioValid } from '@domain/validation';
import type { NamedScenario, ProjectScenario, ProjectConfig, CapitalStructureConfig, WaterfallConfig, HotelConfig } from '@domain/types';

/**
 * Builds a minimal valid scenario for testing.
 */
function buildValidScenario(): NamedScenario {
  const scenario: ProjectScenario = {
    id: 'test-scenario',
    name: 'Test Scenario',
    startYear: 2026,
    horizonYears: 5,
    operations: [
      {
        id: 'hotel-1',
        name: 'Test Hotel',
        operationType: 'HOTEL',
        startYear: 2026,
        horizonYears: 5,
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.70),
        foodRevenuePctOfRooms: 0.30,
        beverageRevenuePctOfRooms: 0.15,
        otherRevenuePctOfRooms: 0.10,
        foodCogsPct: 0.35,
        beverageCogsPct: 0.25,
        payrollPct: 0.35,
        utilitiesPct: 0.05,
        marketingPct: 0.03,
        maintenanceOpexPct: 0.04,
        otherOpexPct: 0.03,
        maintenanceCapexPct: 0.02,
      } as HotelConfig,
    ],
  };

  const projectConfig: ProjectConfig = {
    discountRate: 0.10,
    terminalGrowthRate: 0.02,
    initialInvestment: 20_000_000,
  };

  const capitalConfig: CapitalStructureConfig = {
    initialInvestment: 20_000_000,
    debtTranches: [],
  };

  const waterfallConfig: WaterfallConfig = {
    equityClasses: [
      {
        id: 'lp',
        name: 'Limited Partner',
        contributionPct: 0.9,
      },
    ],
  };

  return {
    id: 'test-scenario',
    name: 'Test Scenario',
    modelConfig: {
      scenario,
      projectConfig,
      capitalConfig,
      waterfallConfig,
    },
  };
}

describe('Validation', () => {
  describe('isScenarioValid', () => {
    it('should return true for a valid scenario', () => {
      const validScenario = buildValidScenario();
      expect(isScenarioValid(validScenario)).toBe(true);
    });

    it('should return false for an empty object', () => {
      expect(isScenarioValid({})).toBe(false);
    });

    it('should return false for null', () => {
      expect(isScenarioValid(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isScenarioValid(undefined)).toBe(false);
    });

    it('should return false for an array', () => {
      expect(isScenarioValid([])).toBe(false);
      expect(isScenarioValid([{ id: 'test' }])).toBe(false);
    });

    it('should return false for a string', () => {
      expect(isScenarioValid('not a scenario')).toBe(false);
    });

    it('should return false for a number', () => {
      expect(isScenarioValid(123)).toBe(false);
    });

    it('should return false when modelConfig is missing', () => {
      expect(isScenarioValid({ id: 'test', name: 'Test' })).toBe(false);
    });

    it('should return false when scenario is missing', () => {
      expect(isScenarioValid({
        modelConfig: {
          projectConfig: {},
          capitalConfig: {},
          waterfallConfig: {},
        },
      })).toBe(false);
    });

    it('should return false when scenario.operations is missing', () => {
      const invalid = buildValidScenario();
      delete (invalid.modelConfig.scenario as any).operations;
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when scenario.operations is not an array', () => {
      const invalid = buildValidScenario();
      (invalid.modelConfig.scenario as any).operations = 'not an array';
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when projectConfig is missing', () => {
      const invalid = buildValidScenario();
      delete (invalid.modelConfig as any).projectConfig;
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when projectConfig.discountRate is missing', () => {
      const invalid = buildValidScenario();
      delete (invalid.modelConfig.projectConfig as any).discountRate;
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when projectConfig.discountRate is not a number', () => {
      const invalid = buildValidScenario();
      (invalid.modelConfig.projectConfig as any).discountRate = 'not a number';
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when capitalConfig is missing', () => {
      const invalid = buildValidScenario();
      delete (invalid.modelConfig as any).capitalConfig;
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when capitalConfig.debtTranches is missing', () => {
      const invalid = buildValidScenario();
      delete (invalid.modelConfig.capitalConfig as any).debtTranches;
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when capitalConfig.debtTranches is not an array', () => {
      const invalid = buildValidScenario();
      (invalid.modelConfig.capitalConfig as any).debtTranches = 'not an array';
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when waterfallConfig is missing', () => {
      const invalid = buildValidScenario();
      delete (invalid.modelConfig as any).waterfallConfig;
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when waterfallConfig.equityClasses is missing', () => {
      const invalid = buildValidScenario();
      delete (invalid.modelConfig.waterfallConfig as any).equityClasses;
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when waterfallConfig.equityClasses is not an array', () => {
      const invalid = buildValidScenario();
      (invalid.modelConfig.waterfallConfig as any).equityClasses = 'not an array';
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when scenario.id is missing (v0.8 smoke test)', () => {
      const invalid = buildValidScenario();
      delete (invalid.modelConfig.scenario as any).id;
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when scenario.id is not a string', () => {
      const invalid = buildValidScenario();
      (invalid.modelConfig.scenario as any).id = 123;
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return false when scenario.startYear is not a number', () => {
      const invalid = buildValidScenario();
      (invalid.modelConfig.scenario as any).startYear = '2026';
      expect(isScenarioValid(invalid)).toBe(false);
    });

    it('should return true for a scenario with optional fields', () => {
      const valid = buildValidScenario();
      // Add optional fields
      (valid as any).description = 'Test description';
      (valid.modelConfig.projectConfig as any).workingCapitalPercentage = 0.05;
      (valid.modelConfig.capitalConfig as any).debtTranches = [
        {
          id: 'loan-1',
          initialPrincipal: 10_000_000,
          interestRate: 0.06,
          termYears: 10,
        },
      ];
      expect(isScenarioValid(valid)).toBe(true);
    });
  });
});

