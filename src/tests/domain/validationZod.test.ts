/**
 * Zod Validation Tests (v0.9)
 * 
 * Tests that validateScenario throws specific Zod errors for invalid data.
 * Verifies that validation provides detailed, actionable error messages.
 */

import { describe, it, expect } from 'vitest';
import { validateScenario } from '@domain/validation';
import type { NamedScenario, ProjectScenario, ProjectConfig, CapitalStructureConfig, WaterfallConfig, HotelConfig } from '@domain/types';

/**
 * Helper to build a valid scenario for testing.
 */
function buildValidScenarioForZod(): NamedScenario {
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

describe('Zod Validation (v0.9)', () => {
  describe('validateScenario with invalid data', () => {
    it('should return error when id is missing', () => {
      const invalid = buildValidScenarioForZod();
      delete (invalid as any).id;

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('id');
    });

    it('should return error when id is empty string', () => {
      const invalid = buildValidScenarioForZod();
      invalid.id = '';

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('id');
    });

    it('should return error when name is missing', () => {
      const invalid = buildValidScenarioForZod();
      delete (invalid as any).name;

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('name');
    });

    it('should return error when modelConfig is missing', () => {
      const invalid = buildValidScenarioForZod();
      delete (invalid as any).modelConfig;

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('modelConfig');
    });

    it('should return error when scenario.id is missing', () => {
      const invalid = buildValidScenarioForZod();
      delete (invalid.modelConfig.scenario as any).id;

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('scenario');
      expect(result.error).toContain('id');
    });

    it('should return error when scenario.startYear is out of range', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.scenario.startYear = 1999; // Below minimum (2000)

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('startYear');
    });

    it('should return error when scenario.horizonYears is out of range', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.scenario.horizonYears = 0; // Below minimum (1)

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('horizonYears');
    });

    it('should return error when scenario.horizonYears exceeds maximum', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.scenario.horizonYears = 51; // Above maximum (50)

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('horizonYears');
    });

    it('should return error when scenario.operations is empty', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.scenario.operations = [];

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('operations');
    });

    it('should return error when projectConfig.discountRate is out of range', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.projectConfig.discountRate = -0.1; // Below minimum (0)

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('discountRate');
    });

    it('should return error when projectConfig.discountRate exceeds maximum', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.projectConfig.discountRate = 1.5; // Above maximum (1)

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('discountRate');
    });

    it('should return error when projectConfig.terminalGrowthRate is out of range', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.projectConfig.terminalGrowthRate = 0.15; // Above maximum (0.1)

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('terminalGrowthRate');
    });

    it('should return error when projectConfig.initialInvestment is negative', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.projectConfig.initialInvestment = -1000;

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('initialInvestment');
    });

    it('should return error when capitalConfig.initialInvestment is missing', () => {
      const invalid = buildValidScenarioForZod();
      delete (invalid.modelConfig.capitalConfig as any).initialInvestment;

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('capitalConfig');
      expect(result.error).toContain('initialInvestment');
    });

    it('should return error when capitalConfig.debtTranches is not an array', () => {
      const invalid = buildValidScenarioForZod();
      (invalid.modelConfig.capitalConfig as any).debtTranches = 'not an array';

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('debtTranches');
    });

    it('should return error when waterfallConfig.equityClasses is empty', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.waterfallConfig.equityClasses = [];

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('equityClasses');
    });

    it('should return error when waterfallConfig.equityClasses[0].contributionPct is out of range', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.waterfallConfig.equityClasses[0].contributionPct = 1.5; // Above maximum (1)

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('contributionPct');
    });

    it('should return multiple errors for multiple validation failures', () => {
      const invalid = buildValidScenarioForZod();
      invalid.id = ''; // Empty id
      invalid.modelConfig.scenario.startYear = 1999; // Out of range
      invalid.modelConfig.projectConfig.discountRate = 2.0; // Out of range

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();

      // Should contain multiple error messages
      const errorCount = result.error!.split(';').length;
      expect(errorCount).toBeGreaterThan(1);
    });

    it('should return valid for a properly structured scenario', () => {
      const valid = buildValidScenarioForZod();

      const result = validateScenario(valid);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for scenario with optional fields', () => {
      const valid = buildValidScenarioForZod();
      (valid as any).description = 'Test description';
      (valid.modelConfig.projectConfig as any).workingCapitalPercentage = 0.05;
      (valid.modelConfig.projectConfig as any).taxRate = 0.25;

      const result = validateScenario(valid);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Zod error message format', () => {
    it('should provide path information in error messages', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.scenario.startYear = 1999;

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();

      // Error should contain path information (e.g., "modelConfig.scenario.startYear")
      expect(result.error).toMatch(/modelConfig|scenario|startYear/i);
    });

    it('should provide specific validation rule information', () => {
      const invalid = buildValidScenarioForZod();
      invalid.modelConfig.scenario.horizonYears = 0;

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();

      // Error should indicate the validation rule (e.g., minimum value)
      expect(result.error).toMatch(/horizonYears|minimum|min/i);
    });
  });
  describe('Mathematical Integrity Rules', () => {
    it('should return error when occupancy > 1.0 (100%)', () => {
      const invalid = buildValidScenarioForZod();
      // Set invalid occupancy
      (invalid.modelConfig.scenario.operations[0] as HotelConfig).occupancyByMonth = Array(12).fill(1.5);

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/occupancy|max|1/i);
    });

    it('should return error when OPEX sum > 1.0 (100%)', () => {
      const invalid = buildValidScenarioForZod();
      const op = invalid.modelConfig.scenario.operations[0] as HotelConfig;

      // Set OPEX to sum > 100%
      op.payrollPct = 0.50;
      op.utilitiesPct = 0.20;
      op.marketingPct = 0.20;
      op.maintenanceOpexPct = 0.10;
      op.otherOpexPct = 0.10;
      // Sum = 1.10 (110%)

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Mathematical Integrity Error');
      expect(result.error).toContain('exceeds 100%');
    });

    it('should return error for negative values in strict fields', () => {
      const invalid = buildValidScenarioForZod();
      const op = invalid.modelConfig.scenario.operations[0] as HotelConfig;

      op.foodCogsPct = -0.1;

      const result = validateScenario(invalid);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/min|0/i);
    });
  });
});

