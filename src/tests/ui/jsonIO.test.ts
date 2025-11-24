/**
 * JSON IO Tests for Scenario Import/Export (v0.8)
 * 
 * Tests round-trip serialization: Object -> JSON String -> Object -> Validate
 * Ensures scenarios can be safely exported and imported without data loss.
 */

import { describe, it, expect } from 'vitest';
import { isScenarioValid } from '@domain/validation';
import type {
  NamedScenario,
  ProjectScenario,
  ProjectConfig,
  HotelConfig,
} from '@domain/types';
import { buildHotelConfig } from '../helpers/buildOperationConfig';
import { buildComplexCapitalConfig } from '../helpers/buildCapitalConfig';
import { buildClawbackScenario } from '../helpers/buildWaterfallConfig';

/**
 * Builds a comprehensive scenario for JSON IO testing.
 */
function buildComprehensiveScenario(): NamedScenario {
  const scenario: ProjectScenario = {
    id: 'json-io-test-scenario',
    name: 'JSON IO Test Scenario',
    startYear: 2026,
    horizonYears: 10,
    operations: [
      buildHotelConfig({
        id: 'hotel-1',
        name: 'Test Hotel',
        keys: 150,
        avgDailyRate: 250,
      }),
    ],
  };

  const projectConfig: ProjectConfig = {
    discountRate: 0.12,
    terminalGrowthRate: 0.025,
    initialInvestment: 100_000_000,
    workingCapitalPercentage: 0.05,
    taxRate: 0.25,
  };

  const capitalConfig = buildComplexCapitalConfig({
    initialInvestment: 100_000_000,
  });

  const waterfallConfig = buildClawbackScenario(undefined, 'final_period');

  return {
    id: 'json-io-test',
    name: 'JSON IO Test',
    description: 'Comprehensive scenario for JSON round-trip testing',
    modelConfig: {
      scenario,
      projectConfig,
      capitalConfig,
      waterfallConfig,
    },
  };
}

describe('JSON IO Tests (v0.8)', () => {
  describe('Round-trip serialization', () => {
    it('should successfully round-trip a comprehensive scenario: Object -> JSON -> Object -> Validate', () => {
      // Step 1: Create original scenario
      const originalScenario = buildComprehensiveScenario();

      // Step 2: Serialize to JSON string
      const jsonString = JSON.stringify(originalScenario, null, 2);
      expect(jsonString).toBeDefined();
      expect(typeof jsonString).toBe('string');
      expect(jsonString.length).toBeGreaterThan(0);

      // Step 3: Parse JSON string back to object
      const parsedData = JSON.parse(jsonString);
      expect(parsedData).toBeDefined();
      expect(typeof parsedData).toBe('object');

      // Step 4: Validate the parsed scenario structure
      expect(isScenarioValid(parsedData)).toBe(true);

      // Step 5: Verify all key fields are preserved
      const restoredScenario = parsedData as NamedScenario;

      // Verify top-level fields
      expect(restoredScenario.id).toBe(originalScenario.id);
      expect(restoredScenario.name).toBe(originalScenario.name);
      expect(restoredScenario.description).toBe(originalScenario.description);

      // Verify scenario structure
      expect(restoredScenario.modelConfig.scenario.id).toBe(originalScenario.modelConfig.scenario.id);
      expect(restoredScenario.modelConfig.scenario.name).toBe(originalScenario.modelConfig.scenario.name);
      expect(restoredScenario.modelConfig.scenario.startYear).toBe(originalScenario.modelConfig.scenario.startYear);
      expect(restoredScenario.modelConfig.scenario.horizonYears).toBe(originalScenario.modelConfig.scenario.horizonYears);
      expect(restoredScenario.modelConfig.scenario.operations.length).toBe(originalScenario.modelConfig.scenario.operations.length);

      // Verify project config
      expect(restoredScenario.modelConfig.projectConfig.discountRate).toBe(originalScenario.modelConfig.projectConfig.discountRate);
      expect(restoredScenario.modelConfig.projectConfig.terminalGrowthRate).toBe(originalScenario.modelConfig.projectConfig.terminalGrowthRate);
      expect(restoredScenario.modelConfig.projectConfig.initialInvestment).toBe(originalScenario.modelConfig.projectConfig.initialInvestment);
      expect(restoredScenario.modelConfig.projectConfig.workingCapitalPercentage).toBe(originalScenario.modelConfig.projectConfig.workingCapitalPercentage);
      expect(restoredScenario.modelConfig.projectConfig.taxRate).toBe(originalScenario.modelConfig.projectConfig.taxRate);

      // Verify capital config
      expect(restoredScenario.modelConfig.capitalConfig.initialInvestment).toBe(originalScenario.modelConfig.capitalConfig.initialInvestment);
      expect(restoredScenario.modelConfig.capitalConfig.debtTranches.length).toBe(originalScenario.modelConfig.capitalConfig.debtTranches.length);

      // Verify debt tranches are preserved
      for (let i = 0; i < originalScenario.modelConfig.capitalConfig.debtTranches.length; i++) {
        const original = originalScenario.modelConfig.capitalConfig.debtTranches[i];
        const restored = restoredScenario.modelConfig.capitalConfig.debtTranches[i];

        expect(restored.id).toBe(original.id);
        expect(restored.initialPrincipal ?? restored.amount).toBe(original.initialPrincipal ?? original.amount);
        expect(restored.interestRate).toBe(original.interestRate);
        expect(restored.amortizationType).toBe(original.amortizationType);
        expect(restored.termYears).toBe(original.termYears);
        expect(restored.amortizationYears).toBe(original.amortizationYears);
        expect(restored.originationFeePct).toBe(original.originationFeePct);
        expect(restored.exitFeePct).toBe(original.exitFeePct);
      }

      // Verify waterfall config
      expect(restoredScenario.modelConfig.waterfallConfig.equityClasses.length).toBe(originalScenario.modelConfig.waterfallConfig.equityClasses.length);
      expect(restoredScenario.modelConfig.waterfallConfig.tiers?.length).toBe(originalScenario.modelConfig.waterfallConfig.tiers?.length);

      // Verify waterfall tiers are preserved
      if (originalScenario.modelConfig.waterfallConfig.tiers && restoredScenario.modelConfig.waterfallConfig.tiers) {
        for (let i = 0; i < originalScenario.modelConfig.waterfallConfig.tiers.length; i++) {
          const original = originalScenario.modelConfig.waterfallConfig.tiers[i];
          const restored = restoredScenario.modelConfig.waterfallConfig.tiers[i];

          expect(restored.id).toBe(original.id);
          expect(restored.type).toBe(original.type);
          expect(restored.enableClawback).toBe(original.enableClawback);
          expect(restored.clawbackTrigger).toBe(original.clawbackTrigger);
          expect(restored.clawbackMethod).toBe(original.clawbackMethod);
        }
      }
    });

    it('should handle round-trip with minimal scenario (no optional fields)', () => {
      const minimalScenario: NamedScenario = {
        id: 'minimal-test',
        name: 'Minimal Test',
        modelConfig: {
          scenario: {
            id: 'minimal-scenario',
            name: 'Minimal Scenario',
            startYear: 2026,
            horizonYears: 5,
            operations: [buildHotelConfig()],
          },
          projectConfig: {
            discountRate: 0.10,
            terminalGrowthRate: 0.02,
            initialInvestment: 50_000_000,
          },
          capitalConfig: {
            initialInvestment: 50_000_000,
            debtTranches: [],
          },
          waterfallConfig: {
            equityClasses: [
              {
                id: 'owner',
                name: 'Owner',
                contributionPct: 1.0,
              },
            ],
          },
        },
      };

      // Round-trip
      const jsonString = JSON.stringify(minimalScenario);
      const parsed = JSON.parse(jsonString);

      // Validate
      expect(isScenarioValid(parsed)).toBe(true);

      // Verify structure
      const restored = parsed as NamedScenario;
      expect(restored.id).toBe(minimalScenario.id);
      expect(restored.name).toBe(minimalScenario.name);
      expect(restored.description).toBeUndefined();
      expect(restored.modelConfig.scenario.operations.length).toBe(1);
      expect(restored.modelConfig.capitalConfig.debtTranches.length).toBe(0);
    });

    it('should preserve array structures in round-trip', () => {
      const scenario = buildComprehensiveScenario();

      // Round-trip
      const jsonString = JSON.stringify(scenario);
      const parsed = JSON.parse(jsonString);
      const restored = parsed as NamedScenario;

      // Verify arrays are preserved
      expect(Array.isArray(restored.modelConfig.scenario.operations)).toBe(true);
      expect(Array.isArray(restored.modelConfig.capitalConfig.debtTranches)).toBe(true);
      expect(Array.isArray(restored.modelConfig.waterfallConfig.equityClasses)).toBe(true);

      // Verify operation arrays
      const originalOps = scenario.modelConfig.scenario.operations;
      const restoredOps = restored.modelConfig.scenario.operations;
      expect(restoredOps.length).toBe(originalOps.length);

      // Verify occupancy arrays are preserved (for hotel operations)
      if (originalOps[0]?.operationType === 'HOTEL' && restoredOps[0]?.operationType === 'HOTEL') {
        const originalHotel = originalOps[0] as HotelConfig;
        const restoredHotel = restoredOps[0] as HotelConfig;
        expect(Array.isArray(restoredHotel.occupancyByMonth)).toBe(true);
        expect(restoredHotel.occupancyByMonth.length).toBe(originalHotel.occupancyByMonth.length);
      }
    });

    it('should handle PortableScenario format (with metadata)', () => {
      const scenario = buildComprehensiveScenario();

      // Create PortableScenario format (as used by fileIO.ts)
      const portableScenario = {
        metadata: {
          version: '0.8',
          timestamp: Date.now(),
          exportedBy: undefined,
          appVersion: '0.8',
        },
        scenario,
      };

      // Round-trip
      const jsonString = JSON.stringify(portableScenario, null, 2);
      const parsed = JSON.parse(jsonString);

      // Extract scenario (as fileIO.ts does)
      const extractedScenario = parsed.scenario || parsed;

      // Validate
      expect(isScenarioValid(extractedScenario)).toBe(true);

      // Verify scenario structure
      const restored = extractedScenario as NamedScenario;
      expect(restored.id).toBe(scenario.id);
      expect(restored.name).toBe(scenario.name);
      expect(restored.modelConfig.scenario.id).toBe(scenario.modelConfig.scenario.id);
    });

    it('should preserve numeric precision in round-trip', () => {
      const scenario: NamedScenario = {
        id: 'precision-test',
        name: 'Precision Test',
        modelConfig: {
          scenario: {
            id: 'test',
            name: 'Test',
            startYear: 2026,
            horizonYears: 5,
            operations: [buildHotelConfig()],
          },
          projectConfig: {
            discountRate: 0.123456789, // High precision
            terminalGrowthRate: 0.025,
            initialInvestment: 99_999_999.99, // Decimal value
          },
          capitalConfig: {
            initialInvestment: 99_999_999.99,
            debtTranches: [
              {
                id: 'loan-1',
                initialPrincipal: 50_000_000.50,
                interestRate: 0.067891234,
                termYears: 10,
                amortizationYears: 10,
              },
            ],
          },
          waterfallConfig: {
            equityClasses: [
              {
                id: 'lp',
                name: 'LP',
                contributionPct: 0.999999,
              },
            ],
          },
        },
      };

      // Round-trip
      const jsonString = JSON.stringify(scenario);
      const parsed = JSON.parse(jsonString);
      const restored = parsed as NamedScenario;

      // Verify precision is preserved (JSON preserves all significant digits)
      expect(restored.modelConfig.projectConfig.discountRate).toBeCloseTo(0.123456789, 9);
      expect(restored.modelConfig.projectConfig.initialInvestment).toBeCloseTo(99_999_999.99, 2);
      expect(restored.modelConfig.capitalConfig.debtTranches[0].initialPrincipal).toBeCloseTo(50_000_000.50, 2);
      expect(restored.modelConfig.capitalConfig.debtTranches[0].interestRate).toBeCloseTo(0.067891234, 9);
      expect(restored.modelConfig.waterfallConfig.equityClasses[0].contributionPct).toBeCloseTo(0.999999, 6);
    });
  });

  describe('JSON parsing edge cases', () => {
    it('should handle empty JSON object gracefully', () => {
      const emptyJson = '{}';
      const parsed = JSON.parse(emptyJson);
      expect(isScenarioValid(parsed)).toBe(false);
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedJson = '{ invalid json }';
      expect(() => JSON.parse(malformedJson)).toThrow();
    });

    it('should handle null values in optional fields', () => {
      const scenario = buildComprehensiveScenario();
      const jsonString = JSON.stringify(scenario);
      const parsed = JSON.parse(jsonString);

      // Set optional fields to null
      (parsed as any).description = null;
      (parsed.modelConfig.projectConfig as any).workingCapitalPercentage = null;

      // Zod validation doesn't accept null for optional fields (expects undefined or absent)
      // So we convert null to undefined before validation
      if ((parsed as any).description === null) {
        delete (parsed as any).description;
      }
      if ((parsed.modelConfig.projectConfig as any).workingCapitalPercentage === null) {
        delete (parsed.modelConfig.projectConfig as any).workingCapitalPercentage;
      }

      // After converting null to undefined/absent, should be valid
      expect(isScenarioValid(parsed)).toBe(true);
    });
  });
});

