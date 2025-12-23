/**
 * Persistence tests for Scenario Builder v2 (v0.6).
 * 
 * Tests localStorage persistence for scenarios, verifying that:
 * - Saving a scenario preserves all DebtTrancheConfig and WaterfallTier data
 * - Reloading the "app" (re-initializing the store) correctly restores scenarios
 * - All v0.6 features (fees, clawback) are preserved
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  NamedScenario,
  FullModelInput,
} from '@domain/types';
import {
  buildComplexCapitalConfig,
} from '../helpers/buildCapitalConfig';
import {
  buildClawbackScenario,
} from '../helpers/buildWaterfallConfig';
import { buildHotelConfig } from '../helpers/buildOperationConfig';

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

describe('Scenario Persistence (v0.6)', () => {
  let mockStorage: Storage;
  const STORAGE_KEY = 'hospitality_scenarios_v1';

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
  });

  describe('DebtTrancheConfig persistence', () => {
    it('should preserve all DebtTrancheConfig fields including fees', () => {
      const capitalConfig = buildComplexCapitalConfig();
      
      // Create a scenario with complex capital structure
      const scenario: NamedScenario = {
        id: 'test-fees-scenario',
        name: 'Test Fees Scenario',
        description: 'Scenario with fees',
        modelConfig: {
          scenario: {
            id: 'test-scenario',
            name: 'Test Scenario',
            startYear: 2026,
            horizonYears: 5,
            operations: [buildHotelConfig()],
          },
          projectConfig: {
            discountRate: 0.10,
            terminalGrowthRate: 0.02,
            initialInvestment: 100000000,
            workingCapitalPercentage: 0.05,
          },
          capitalConfig,
          waterfallConfig: {
            equityClasses: [
              { id: 'lp', name: 'LP', contributionPct: 0.9 },
              { id: 'gp', name: 'GP', contributionPct: 0.1 },
            ],
          },
        },
      };

      // Save to localStorage
      const scenarios: NamedScenario[] = [scenario];
      const json = JSON.stringify(scenarios);
      mockStorage.setItem(STORAGE_KEY, json);

      // Reload from localStorage
      const stored = mockStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      const loaded: NamedScenario[] = JSON.parse(stored!);

      // Verify scenario was loaded
      expect(loaded.length).toBe(1);
      const loadedScenario = loaded[0];
      expect(loadedScenario.id).toBe('test-fees-scenario');
      expect(loadedScenario.name).toBe('Test Fees Scenario');

      // Verify capital config was preserved
      const loadedCapitalConfig = loadedScenario.modelConfig.capitalConfig;
      expect(loadedCapitalConfig.initialInvestment).toBe(100000000);
      expect(loadedCapitalConfig.debtTranches.length).toBeGreaterThan(0);

      // Verify all DebtTrancheConfig fields are preserved
      for (let i = 0; i < capitalConfig.debtTranches.length; i++) {
        const original = capitalConfig.debtTranches[i];
        const loaded = loadedCapitalConfig.debtTranches[i];

        // Verify basic fields
        expect(loaded.id).toBe(original.id);
        expect(loaded.label).toBe(original.label);
        expect(loaded.type).toBe(original.type);
        expect(loaded.initialPrincipal ?? loaded.amount).toBe(original.initialPrincipal ?? original.amount);
        expect(loaded.interestRate).toBe(original.interestRate);
        expect(loaded.amortizationType).toBe(original.amortizationType);
        expect(loaded.termYears).toBe(original.termYears);
        expect(loaded.amortizationYears).toBe(original.amortizationYears);
        expect(loaded.ioYears).toBe(original.ioYears);
        expect(loaded.startYear).toBe(original.startYear);
        expect(loaded.refinanceAtYear).toBe(original.refinanceAtYear);

        // Verify v0.6 fee fields
        expect(loaded.originationFeePct).toBe(original.originationFeePct);
        expect(loaded.exitFeePct).toBe(original.exitFeePct);
      }
    });

    it('should preserve tranches with all amortization types', () => {
      const capitalConfig: FullModelInput['capitalConfig'] = {
        initialInvestment: 50000000,
        debtTranches: [
          {
            id: 'mortgage-loan',
            initialPrincipal: 30000000,
            interestRate: 0.08,
            amortizationType: 'mortgage',
            termYears: 10,
            amortizationYears: 10,
            originationFeePct: 0.01,
            exitFeePct: 0.005,
          },
          {
            id: 'io-loan',
            initialPrincipal: 10000000,
            interestRate: 0.10,
            amortizationType: 'interest_only',
            termYears: 5,
            ioYears: 3,
            originationFeePct: 0.015,
            exitFeePct: 0.01,
          },
          {
            id: 'bullet-loan',
            initialPrincipal: 10000000,
            interestRate: 0.12,
            amortizationType: 'bullet',
            termYears: 3,
            originationFeePct: 0.02,
            exitFeePct: 0.015,
          },
        ],
      };

      const scenario: NamedScenario = {
        id: 'test-amortization-types',
        name: 'Test Amortization Types',
        modelConfig: {
          scenario: {
            id: 'test-scenario',
            name: 'Test',
            startYear: 2026,
            horizonYears: 5,
            operations: [buildHotelConfig()],
          },
          projectConfig: {
            discountRate: 0.10,
            terminalGrowthRate: 0.02,
            initialInvestment: 50000000,
          },
          capitalConfig,
          waterfallConfig: {
            equityClasses: [{ id: 'owner', name: 'Owner', contributionPct: 1.0 }],
          },
        },
      };

      // Save and reload
      const json = JSON.stringify([scenario]);
      mockStorage.setItem(STORAGE_KEY, json);
      const loaded: NamedScenario[] = JSON.parse(mockStorage.getItem(STORAGE_KEY)!);

      // Verify all amortization types are preserved
      const loadedTranches = loaded[0].modelConfig.capitalConfig.debtTranches;
      expect(loadedTranches[0].amortizationType).toBe('mortgage');
      expect(loadedTranches[1].amortizationType).toBe('interest_only');
      expect(loadedTranches[1].ioYears).toBe(3);
      expect(loadedTranches[2].amortizationType).toBe('bullet');
    });
  });

  describe('WaterfallTier persistence', () => {
    it('should preserve all WaterfallTier fields including clawback', () => {
      const waterfallConfig = buildClawbackScenario(undefined, 'final_period');

      const scenario: NamedScenario = {
        id: 'test-clawback-scenario',
        name: 'Test Clawback Scenario',
        description: 'Scenario with clawback',
        modelConfig: {
          scenario: {
            id: 'test-scenario',
            name: 'Test Scenario',
            startYear: 2026,
            horizonYears: 5,
            operations: [buildHotelConfig()],
          },
          projectConfig: {
            discountRate: 0.10,
            terminalGrowthRate: 0.02,
            initialInvestment: 100000000,
          },
          capitalConfig: {
            initialInvestment: 100000000,
            debtTranches: [],
          },
          waterfallConfig,
        },
      };

      // Save to localStorage
      const scenarios: NamedScenario[] = [scenario];
      const json = JSON.stringify(scenarios);
      mockStorage.setItem(STORAGE_KEY, json);

      // Reload from localStorage
      const stored = mockStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      const loaded: NamedScenario[] = JSON.parse(stored!);

      // Verify scenario was loaded
      expect(loaded.length).toBe(1);
      const loadedScenario = loaded[0];
      expect(loadedScenario.id).toBe('test-clawback-scenario');

      // Verify waterfall config was preserved
      const loadedWaterfallConfig = loadedScenario.modelConfig.waterfallConfig;
      expect(loadedWaterfallConfig.equityClasses.length).toBe(2);
      expect(loadedWaterfallConfig.tiers).toBeDefined();
      expect(loadedWaterfallConfig.tiers!.length).toBeGreaterThan(0);

      // Verify all WaterfallTier fields are preserved
      const originalTiers = waterfallConfig.tiers!;
      const loadedTiers = loadedWaterfallConfig.tiers!;

      for (let i = 0; i < originalTiers.length; i++) {
        const original = originalTiers[i];
        const loaded = loadedTiers[i];

        // Verify basic fields
        expect(loaded.id).toBe(original.id);
        expect(loaded.type).toBe(original.type);
        expect(loaded.hurdleIrr).toBe(original.hurdleIrr);
        expect(JSON.stringify(loaded.distributionSplits)).toBe(JSON.stringify(original.distributionSplits));

        // Verify v0.5 catch-up fields
        expect(loaded.enableCatchUp).toBe(original.enableCatchUp);
        expect(JSON.stringify(loaded.catchUpTargetSplit)).toBe(JSON.stringify(original.catchUpTargetSplit));
        expect(loaded.catchUpRate).toBe(original.catchUpRate);

        // Verify v0.6 clawback fields
        expect(loaded.enableClawback).toBe(original.enableClawback);
        expect(loaded.clawbackTrigger).toBe(original.clawbackTrigger);
        expect(loaded.clawbackMethod).toBe(original.clawbackMethod);
      }

      // Verify promote tier has clawback enabled
      const promoteTier = loadedTiers.find((t) => t.type === 'promote');
      expect(promoteTier).toBeDefined();
      expect(promoteTier!.enableClawback).toBe(true);
      expect(promoteTier!.clawbackTrigger).toBe('final_period');
      expect(promoteTier!.clawbackMethod).toBe('hypothetical_liquidation');
    });

    it('should preserve waterfall config with annual clawback trigger', () => {
      const waterfallConfig = buildClawbackScenario(undefined, 'annual');

      const scenario: NamedScenario = {
        id: 'test-annual-clawback',
        name: 'Test Annual Clawback',
        modelConfig: {
          scenario: {
            id: 'test-scenario',
            name: 'Test',
            startYear: 2026,
            horizonYears: 5,
            operations: [buildHotelConfig()],
          },
          projectConfig: {
            discountRate: 0.10,
            terminalGrowthRate: 0.02,
            initialInvestment: 100000000,
          },
          capitalConfig: {
            initialInvestment: 100000000,
            debtTranches: [],
          },
          waterfallConfig,
        },
      };

      // Save and reload
      const json = JSON.stringify([scenario]);
      mockStorage.setItem(STORAGE_KEY, json);
      const loaded: NamedScenario[] = JSON.parse(mockStorage.getItem(STORAGE_KEY)!);

      // Verify annual clawback trigger is preserved
      const loadedTiers = loaded[0].modelConfig.waterfallConfig.tiers!;
      const promoteTier = loadedTiers.find((t) => t.type === 'promote');
      expect(promoteTier?.clawbackTrigger).toBe('annual');
      expect(promoteTier?.clawbackMethod).toBe('hypothetical_liquidation');
    });
  });

  describe('Full scenario persistence', () => {
    it('should preserve complete scenario with fees and clawback', () => {
      const capitalConfig = buildComplexCapitalConfig();
      const waterfallConfig = buildClawbackScenario(undefined, 'final_period');

      const scenario: NamedScenario = {
        id: 'test-complete-scenario',
        name: 'Complete Test Scenario',
        description: 'Full scenario with all v0.6 features',
        modelConfig: {
          scenario: {
            id: 'test-scenario',
            name: 'Test Scenario',
            startYear: 2026,
            horizonYears: 10,
            operations: [
              buildHotelConfig({
                id: 'hotel-1',
                name: 'Test Hotel',
              }),
            ],
          },
          projectConfig: {
            discountRate: 0.10,
            terminalGrowthRate: 0.02,
            initialInvestment: 100000000,
            workingCapitalPercentage: 0.05,
          },
          capitalConfig,
          waterfallConfig,
        },
      };

      // Save to localStorage
      const scenarios: NamedScenario[] = [scenario];
      const json = JSON.stringify(scenarios);
      mockStorage.setItem(STORAGE_KEY, json);

      // Reload from localStorage
      const stored = mockStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      const loaded: NamedScenario[] = JSON.parse(stored!);

      // Verify complete scenario structure
      expect(loaded.length).toBe(1);
      const loadedScenario = loaded[0];
      expect(loadedScenario.id).toBe('test-complete-scenario');
      expect(loadedScenario.name).toBe('Complete Test Scenario');
      expect(loadedScenario.description).toBe('Full scenario with all v0.6 features');

      // Verify all config sections
      expect(loadedScenario.modelConfig.scenario.id).toBe('test-scenario');
      expect(loadedScenario.modelConfig.projectConfig.initialInvestment).toBe(100000000);
      expect(loadedScenario.modelConfig.capitalConfig.debtTranches.length).toBeGreaterThan(0);
      expect(loadedScenario.modelConfig.waterfallConfig.tiers?.length).toBeGreaterThan(0);

      // Verify fees are preserved
      const tranchesWithFees = loadedScenario.modelConfig.capitalConfig.debtTranches.filter(
        (t) => (t.originationFeePct ?? 0) > 0 || (t.exitFeePct ?? 0) > 0
      );
      expect(tranchesWithFees.length).toBeGreaterThan(0);

      // Verify clawback is preserved
      const promoteTier = loadedScenario.modelConfig.waterfallConfig.tiers?.find(
        (t) => t.type === 'promote'
      );
      expect(promoteTier?.enableClawback).toBe(true);
      expect(promoteTier?.clawbackTrigger).toBe('final_period');
      expect(promoteTier?.clawbackMethod).toBe('hypothetical_liquidation');
    });

    it('should handle multiple scenarios in storage', () => {
      const scenario1: NamedScenario = {
        id: 'scenario-1',
        name: 'Scenario 1',
        modelConfig: {
          scenario: {
            id: 's1',
            name: 'S1',
            startYear: 2026,
            horizonYears: 5,
            operations: [buildHotelConfig({ id: 'h1' })],
          },
          projectConfig: {
            discountRate: 0.10,
            terminalGrowthRate: 0.02,
            initialInvestment: 50000000,
          },
          capitalConfig: buildComplexCapitalConfig({ initialInvestment: 50000000 }),
          waterfallConfig: buildClawbackScenario(),
        },
      };

      const scenario2: NamedScenario = {
        id: 'scenario-2',
        name: 'Scenario 2',
        modelConfig: {
          scenario: {
            id: 's2',
            name: 'S2',
            startYear: 2026,
            horizonYears: 5,
            operations: [buildHotelConfig({ id: 'h2' })],
          },
          projectConfig: {
            discountRate: 0.12,
            terminalGrowthRate: 0.03,
            initialInvestment: 75000000,
          },
          capitalConfig: {
            initialInvestment: 75000000,
            debtTranches: [
              {
                id: 'loan-1',
                initialPrincipal: 50000000,
                interestRate: 0.08,
                amortizationType: 'mortgage',
                termYears: 10,
                amortizationYears: 10,
                originationFeePct: 0.01,
                exitFeePct: 0.005,
              },
            ],
          },
          waterfallConfig: {
            equityClasses: [
              { id: 'lp', name: 'LP', contributionPct: 0.8 },
              { id: 'gp', name: 'GP', contributionPct: 0.2 },
            ],
            tiers: [
              {
                id: 'promote',
                type: 'promote',
                enableClawback: true,
                clawbackTrigger: 'annual',
                clawbackMethod: 'lookback',
                distributionSplits: { lp: 0.8, gp: 0.2 },
              },
            ],
          },
        },
      };

      // Save both scenarios
      const scenarios: NamedScenario[] = [scenario1, scenario2];
      const json = JSON.stringify(scenarios);
      mockStorage.setItem(STORAGE_KEY, json);

      // Reload
      const loaded: NamedScenario[] = JSON.parse(mockStorage.getItem(STORAGE_KEY)!);

      // Verify both scenarios are preserved
      expect(loaded.length).toBe(2);
      expect(loaded[0].id).toBe('scenario-1');
      expect(loaded[1].id).toBe('scenario-2');

      // Verify each scenario's configs are preserved
      expect(loaded[0].modelConfig.capitalConfig.debtTranches.length).toBeGreaterThan(0);
      expect(loaded[1].modelConfig.capitalConfig.debtTranches.length).toBe(1);
      expect(loaded[1].modelConfig.capitalConfig.debtTranches[0].originationFeePct).toBe(0.01);

      // Verify clawback configs are preserved
      expect(loaded[0].modelConfig.waterfallConfig.tiers?.find((t) => t.type === 'promote')?.enableClawback).toBe(true);
      expect(loaded[1].modelConfig.waterfallConfig.tiers?.find((t) => t.type === 'promote')?.clawbackTrigger).toBe('annual');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty localStorage gracefully', () => {
      const stored = mockStorage.getItem(STORAGE_KEY);
      expect(stored).toBeNull();
    });

    it('should handle invalid JSON gracefully', () => {
      mockStorage.setItem(STORAGE_KEY, 'invalid json');
      const stored = mockStorage.getItem(STORAGE_KEY);
      expect(() => JSON.parse(stored!)).toThrow();
    });

    it('should preserve optional fields as undefined when not present', () => {
      const scenario: NamedScenario = {
        id: 'test-optional-fields',
        name: 'Test Optional Fields',
        // description is optional
        modelConfig: {
          scenario: {
            id: 'test',
            name: 'Test',
            startYear: 2026,
            horizonYears: 5,
            operations: [buildHotelConfig()],
          },
          projectConfig: {
            discountRate: 0.10,
            terminalGrowthRate: 0.02,
            initialInvestment: 50000000,
          },
          capitalConfig: {
            initialInvestment: 50000000,
            debtTranches: [
              {
                id: 'loan',
                initialPrincipal: 30000000,
                interestRate: 0.08,
                termYears: 10,
                // No fees, no optional fields
              },
            ],
          },
          waterfallConfig: {
            equityClasses: [{ id: 'owner', name: 'Owner', contributionPct: 1.0 }],
            // No tiers
          },
        },
      };

      const json = JSON.stringify([scenario]);
      mockStorage.setItem(STORAGE_KEY, json);
      const loaded: NamedScenario[] = JSON.parse(mockStorage.getItem(STORAGE_KEY)!);

      // Verify optional fields are handled correctly
      expect(loaded[0].description).toBeUndefined();
      expect(loaded[0].modelConfig.capitalConfig.debtTranches[0].originationFeePct).toBeUndefined();
      expect(loaded[0].modelConfig.waterfallConfig.tiers).toBeUndefined();
    });
  });
});

