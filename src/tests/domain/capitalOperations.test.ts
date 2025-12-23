/**
 * Tests for capital operations helpers (v1.3: Capital Logic Helpers).
 */

import { describe, it, expect } from 'vitest';
import {
  addDebtTranche,
  removeDebtTranche,
  updateDebtTranche,
} from '@domain/capitalOperations';
import type { NamedScenario, CapitalStructureConfig } from '@domain/types';
import { buildSingleTrancheCapitalConfig } from '../helpers/buildCapitalConfig';

/**
 * Builds a minimal valid NamedScenario for testing.
 */
function buildTestScenario(
  capitalConfig?: CapitalStructureConfig
): NamedScenario {
  const defaultCapitalConfig: CapitalStructureConfig = {
    initialInvestment: 100_000_000, // $100M
    debtTranches: [],
  };

  return {
    id: 'test-scenario',
    name: 'Test Scenario',
    modelConfig: {
      scenario: {
        id: 'scenario-1',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 5,
        operations: [],
      },
      projectConfig: {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 100_000_000,
      },
      capitalConfig: capitalConfig ?? defaultCapitalConfig,
      waterfallConfig: {
        equityClasses: [
          {
            id: 'lp',
            name: 'Limited Partner',
            contributionPct: 1.0,
          },
        ],
      },
    },
  };
}

describe('Capital Operations (v1.3)', () => {
  describe('addDebtTranche', () => {
    it('should add a SENIOR tranche when no tranches exist', () => {
      const scenario = buildTestScenario();
      
      const result = addDebtTranche(scenario, 'SENIOR');
      
      expect(result.modelConfig.capitalConfig.debtTranches).toHaveLength(1);
      const tranche = result.modelConfig.capitalConfig.debtTranches[0];
      expect(tranche.type).toBe('SENIOR');
      expect(tranche.label).toBe('Senior Loan');
      expect(tranche.initialPrincipal).toBe(10_000_000); // 10% of $100M
      expect(tranche.interestRate).toBe(0.08); // Default 8%
      expect(tranche.termYears).toBe(10);
    });

    it('should add a MEZZ tranche when SENIOR already exists', () => {
      const capitalConfig = buildSingleTrancheCapitalConfig({
        initialInvestment: 100_000_000,
        debtTranches: [
          {
            id: 'senior-1',
            type: 'SENIOR',
            label: 'Senior Loan',
            initialPrincipal: 50_000_000, // $50M
            interestRate: 0.08,
            termYears: 10,
            amortizationType: 'mortgage',
            amortizationYears: 10,
          },
        ],
      });
      const scenario = buildTestScenario(capitalConfig);
      
      const result = addDebtTranche(scenario, 'MEZZ');
      
      expect(result.modelConfig.capitalConfig.debtTranches).toHaveLength(2);
      
      // Verify SENIOR still exists
      const seniorTranche = result.modelConfig.capitalConfig.debtTranches.find(
        t => t.type === 'SENIOR'
      );
      expect(seniorTranche).toBeDefined();
      expect(seniorTranche?.initialPrincipal).toBe(50_000_000);
      
      // Verify MEZZ was added
      const mezzTranche = result.modelConfig.capitalConfig.debtTranches.find(
        t => t.type === 'MEZZ'
      );
      expect(mezzTranche).toBeDefined();
      expect(mezzTranche?.label).toBe('Mezzanine Debt');
      expect(mezzTranche?.interestRate).toBe(0.12); // Default 12% for mezz
      
      // Verify default amount = 10% of remaining cost ($100M - $50M = $50M, so 10% = $5M)
      expect(mezzTranche?.initialPrincipal).toBe(5_000_000);
    });

    it('should not modify the original scenario', () => {
      const scenario = buildTestScenario();
      const originalTranchesCount = scenario.modelConfig.capitalConfig.debtTranches.length;
      
      addDebtTranche(scenario, 'SENIOR');
      
      // Original scenario should be unchanged
      expect(scenario.modelConfig.capitalConfig.debtTranches).toHaveLength(originalTranchesCount);
    });

    it('should generate unique IDs for new tranches', () => {
      const scenario = buildTestScenario();
      
      const result1 = addDebtTranche(scenario, 'SENIOR');
      const result2 = addDebtTranche(result1, 'MEZZ');
      
      const ids = result2.modelConfig.capitalConfig.debtTranches.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length); // All IDs should be unique
    });
  });

  describe('removeDebtTranche', () => {
    it('should remove a tranche by ID', () => {
      const capitalConfig = buildSingleTrancheCapitalConfig({
        initialInvestment: 100_000_000,
        debtTranches: [
          {
            id: 'tranche-1',
            type: 'SENIOR',
            initialPrincipal: 50_000_000,
            interestRate: 0.08,
            termYears: 10,
          },
          {
            id: 'tranche-2',
            type: 'MEZZ',
            initialPrincipal: 20_000_000,
            interestRate: 0.12,
            termYears: 5,
          },
        ],
      });
      const scenario = buildTestScenario(capitalConfig);
      
      const result = removeDebtTranche(scenario, 'tranche-1');
      
      expect(result.modelConfig.capitalConfig.debtTranches).toHaveLength(1);
      expect(result.modelConfig.capitalConfig.debtTranches[0].id).toBe('tranche-2');
    });

    it('should return original scenario if tranche ID not found', () => {
      const capitalConfig = buildSingleTrancheCapitalConfig({
        initialInvestment: 100_000_000,
        debtTranches: [
          {
            id: 'tranche-1',
            type: 'SENIOR',
            initialPrincipal: 50_000_000,
            interestRate: 0.08,
            termYears: 10,
          },
        ],
      });
      const scenario = buildTestScenario(capitalConfig);
      
      const result = removeDebtTranche(scenario, 'non-existent-id');
      
      // Should return original scenario unchanged
      expect(result).toBe(scenario);
      expect(result.modelConfig.capitalConfig.debtTranches).toHaveLength(1);
    });

    it('should handle removing from empty tranches array', () => {
      const scenario = buildTestScenario();
      
      const result = removeDebtTranche(scenario, 'any-id');
      
      // Should return original scenario unchanged
      expect(result).toBe(scenario);
      expect(result.modelConfig.capitalConfig.debtTranches).toHaveLength(0);
    });

    it('should not modify the original scenario', () => {
      const capitalConfig = buildSingleTrancheCapitalConfig({
        initialInvestment: 100_000_000,
        debtTranches: [
          {
            id: 'tranche-1',
            type: 'SENIOR',
            initialPrincipal: 50_000_000,
            interestRate: 0.08,
            termYears: 10,
          },
        ],
      });
      const scenario = buildTestScenario(capitalConfig);
      const originalTranchesCount = scenario.modelConfig.capitalConfig.debtTranches.length;
      
      removeDebtTranche(scenario, 'tranche-1');
      
      // Original scenario should be unchanged
      expect(scenario.modelConfig.capitalConfig.debtTranches).toHaveLength(originalTranchesCount);
    });
  });

  describe('updateDebtTranche', () => {
    it('should update a tranche with partial updates', () => {
      const capitalConfig = buildSingleTrancheCapitalConfig({
        initialInvestment: 100_000_000,
        debtTranches: [
          {
            id: 'tranche-1',
            type: 'SENIOR',
            label: 'Senior Loan',
            initialPrincipal: 50_000_000,
            interestRate: 0.08,
            termYears: 10,
          },
        ],
      });
      const scenario = buildTestScenario(capitalConfig);
      
      const result = updateDebtTranche(scenario, 'tranche-1', {
        interestRate: 0.09,
        label: 'Updated Senior Loan',
      });
      
      const updatedTranche = result.modelConfig.capitalConfig.debtTranches[0];
      expect(updatedTranche.interestRate).toBe(0.09);
      expect(updatedTranche.label).toBe('Updated Senior Loan');
      // Other fields should remain unchanged
      expect(updatedTranche.initialPrincipal).toBe(50_000_000);
      expect(updatedTranche.type).toBe('SENIOR');
    });

    it('should return original scenario if tranche ID not found', () => {
      const capitalConfig = buildSingleTrancheCapitalConfig({
        initialInvestment: 100_000_000,
        debtTranches: [
          {
            id: 'tranche-1',
            type: 'SENIOR',
            initialPrincipal: 50_000_000,
            interestRate: 0.08,
            termYears: 10,
          },
        ],
      });
      const scenario = buildTestScenario(capitalConfig);
      
      const result = updateDebtTranche(scenario, 'non-existent-id', {
        interestRate: 0.09,
      });
      
      // Should return original scenario unchanged
      expect(result).toBe(scenario);
      expect(result.modelConfig.capitalConfig.debtTranches[0].interestRate).toBe(0.08);
    });

    it('should not modify the original scenario', () => {
      const capitalConfig = buildSingleTrancheCapitalConfig({
        initialInvestment: 100_000_000,
        debtTranches: [
          {
            id: 'tranche-1',
            type: 'SENIOR',
            initialPrincipal: 50_000_000,
            interestRate: 0.08,
            termYears: 10,
          },
        ],
      });
      const scenario = buildTestScenario(capitalConfig);
      const originalInterestRate = scenario.modelConfig.capitalConfig.debtTranches[0].interestRate;
      
      updateDebtTranche(scenario, 'tranche-1', {
        interestRate: 0.09,
      });
      
      // Original scenario should be unchanged
      expect(scenario.modelConfig.capitalConfig.debtTranches[0].interestRate).toBe(originalInterestRate);
    });
  });

  describe('Integration: Add -> Remove -> Verify', () => {
    it('should add tranche, then remove it, leaving scenario with original state', () => {
      const scenario = buildTestScenario();
      const originalTranchesCount = scenario.modelConfig.capitalConfig.debtTranches.length;
      
      // Add a tranche
      const withTranche = addDebtTranche(scenario, 'SENIOR');
      expect(withTranche.modelConfig.capitalConfig.debtTranches).toHaveLength(originalTranchesCount + 1);
      
      // Remove the tranche
      const trancheId = withTranche.modelConfig.capitalConfig.debtTranches[0].id;
      const withoutTranche = removeDebtTranche(withTranche, trancheId);
      expect(withoutTranche.modelConfig.capitalConfig.debtTranches).toHaveLength(originalTranchesCount);
    });

    it('should add multiple tranches and verify count', () => {
      const scenario = buildTestScenario();
      
      // Add SENIOR (first tranche)
      const withSenior = addDebtTranche(scenario, 'SENIOR');
      expect(withSenior.modelConfig.capitalConfig.debtTranches).toHaveLength(1);
      
      // Add MEZZ (second tranche)
      const withMezz = addDebtTranche(withSenior, 'MEZZ');
      expect(withMezz.modelConfig.capitalConfig.debtTranches).toHaveLength(2);
      
      // Verify both tranches exist
      const seniorExists = withMezz.modelConfig.capitalConfig.debtTranches.some(
        t => t.type === 'SENIOR'
      );
      const mezzExists = withMezz.modelConfig.capitalConfig.debtTranches.some(
        t => t.type === 'MEZZ'
      );
      expect(seniorExists).toBe(true);
      expect(mezzExists).toBe(true);
    });
  });
});

