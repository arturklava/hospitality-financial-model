/**
 * Capital Stack Integration Test (v1.3)
 * 
 * Tests the Capital Engine's reactivity to changes in debt structure.
 * Verifies that equity and WACC calculations update correctly when debt is added/removed.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { calculateWACC } from '../../engines/capital/capitalEngine';
import type {
  CapitalStructureConfig,
  ProjectConfig,
} from '../../domain/types';

describe('Capital Stack Integration Test (v1.3)', () => {
  const PROJECT_COST = 100_000_000; // $100M
  const COST_OF_EQUITY = 0.12; // 12%
  const COST_OF_DEBT = 0.08; // 8% (lower than cost of equity)

  /**
   * Helper to calculate equity from capital config
   */
  function calculateEquity(capitalConfig: CapitalStructureConfig): number {
    const totalDebt = capitalConfig.debtTranches.reduce((sum, tranche) => {
      const principal = tranche.initialPrincipal ?? tranche.amount ?? 0;
      return sum + principal;
    }, 0);
    return capitalConfig.initialInvestment - totalDebt;
  }

  describe('Capital Logic Verification', () => {
    it('should verify equity calculation with zero debt', () => {
      // Step 1: Zero Debt. Verify Equity = $100M
      const capitalConfigZeroDebt: CapitalStructureConfig = {
        initialInvestment: PROJECT_COST,
        debtTranches: [], // No debt
      };

      const equity = calculateEquity(capitalConfigZeroDebt);
      expect(equity).toBe(PROJECT_COST); // $100M
      expect(equity).toBe(100_000_000);
    });

    it('should verify equity drops when debt is added', () => {
      // Step 1: Zero Debt. Verify Equity = $100M
      const capitalConfigZeroDebt: CapitalStructureConfig = {
        initialInvestment: PROJECT_COST,
        debtTranches: [], // No debt
      };

      const equityZeroDebt = calculateEquity(capitalConfigZeroDebt);
      expect(equityZeroDebt).toBe(PROJECT_COST); // $100M

      // Step 2: Add $60M Debt. Verify Equity drops to $40M
      const DEBT_AMOUNT = 60_000_000; // $60M
      const capitalConfigWithDebt: CapitalStructureConfig = {
        initialInvestment: PROJECT_COST,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: DEBT_AMOUNT,
            interestRate: COST_OF_DEBT,
            termYears: 10,
            amortizationYears: 10,
            startYear: 0,
          },
        ],
      };

      const equityWithDebt = calculateEquity(capitalConfigWithDebt);
      expect(equityWithDebt).toBe(PROJECT_COST - DEBT_AMOUNT); // $40M
      expect(equityWithDebt).toBe(40_000_000);

      // Verify equity decreased
      expect(equityWithDebt).toBeLessThan(equityZeroDebt);
      expect(equityZeroDebt - equityWithDebt).toBe(DEBT_AMOUNT);
    });

    it('should verify WACC decreases when cost of debt < cost of equity', () => {
      const projectConfig: ProjectConfig = {
        discountRate: COST_OF_EQUITY, // 12% cost of equity
        terminalGrowthRate: 0.02,
        initialInvestment: PROJECT_COST,
        taxRate: 0, // No tax for simplicity
      };

      // Step 1: Zero Debt - WACC = Cost of Equity (100% equity)
      const capitalConfigZeroDebt: CapitalStructureConfig = {
        initialInvestment: PROJECT_COST,
        debtTranches: [], // No debt
      };

      const waccZeroDebt = calculateWACC(projectConfig, capitalConfigZeroDebt);
      expect(waccZeroDebt.equityPercentage).toBe(1.0); // 100% equity
      expect(waccZeroDebt.debtPercentage).toBe(0.0); // 0% debt
      expect(waccZeroDebt.costOfEquity).toBe(COST_OF_EQUITY);
      expect(waccZeroDebt.wacc).toBe(COST_OF_EQUITY); // WACC = 100% × 12% = 12%

      // Step 2: Add $60M Debt at 8% (lower than 12% cost of equity)
      const DEBT_AMOUNT = 60_000_000; // $60M
      const capitalConfigWithDebt: CapitalStructureConfig = {
        initialInvestment: PROJECT_COST,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: DEBT_AMOUNT,
            interestRate: COST_OF_DEBT, // 8%
            termYears: 10,
            amortizationYears: 10,
            startYear: 0,
          },
        ],
      };

      const waccWithDebt = calculateWACC(projectConfig, capitalConfigWithDebt);
      
      // Verify capital structure
      expect(waccWithDebt.equityPercentage).toBeCloseTo(0.4, 4); // 40% equity ($40M / $100M)
      expect(waccWithDebt.debtPercentage).toBeCloseTo(0.6, 4); // 60% debt ($60M / $100M)
      expect(waccWithDebt.costOfEquity).toBe(COST_OF_EQUITY); // 12%
      expect(waccWithDebt.costOfDebt).toBe(COST_OF_DEBT); // 8%

      // Step 3: Check WACC (Should decrease if Cost of Debt < Cost of Equity)
      // WACC = (40% × 12%) + (60% × 8% × (1 - 0)) = 4.8% + 4.8% = 9.6%
      const expectedWacc = (0.4 * COST_OF_EQUITY) + (0.6 * COST_OF_DEBT);
      expect(waccWithDebt.wacc).toBeCloseTo(expectedWacc, 4); // 9.6%
      
      // Verify WACC decreased (9.6% < 12%)
      expect(waccWithDebt.wacc).toBeLessThan(waccZeroDebt.wacc);
      expect(waccWithDebt.wacc).toBeLessThan(COST_OF_EQUITY);
    });

    it('should verify complete capital stack reactivity flow', () => {
      // Complete integration test: All steps in sequence
      const projectConfig: ProjectConfig = {
        discountRate: COST_OF_EQUITY, // 12%
        terminalGrowthRate: 0.02,
        initialInvestment: PROJECT_COST,
        taxRate: 0,
      };

      // Step 1: Zero Debt. Verify Equity = $100M
      const capitalConfigZeroDebt: CapitalStructureConfig = {
        initialInvestment: PROJECT_COST,
        debtTranches: [],
      };

      const equityZeroDebt = calculateEquity(capitalConfigZeroDebt);
      expect(equityZeroDebt).toBe(PROJECT_COST);

      const waccZeroDebt = calculateWACC(projectConfig, capitalConfigZeroDebt);
      expect(waccZeroDebt.wacc).toBe(COST_OF_EQUITY); // 12%

      // Step 2: Add $60M Debt. Verify Equity drops to $40M
      const DEBT_AMOUNT = 60_000_000;
      const capitalConfigWithDebt: CapitalStructureConfig = {
        initialInvestment: PROJECT_COST,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: DEBT_AMOUNT,
            interestRate: COST_OF_DEBT, // 8%
            termYears: 10,
            amortizationYears: 10,
            startYear: 0,
          },
        ],
      };

      const equityWithDebt = calculateEquity(capitalConfigWithDebt);
      expect(equityWithDebt).toBe(40_000_000);

      // Step 3: Check WACC (Should decrease if Cost of Debt < Cost of Equity)
      const waccWithDebt = calculateWACC(projectConfig, capitalConfigWithDebt);
      expect(waccWithDebt.wacc).toBeLessThan(waccZeroDebt.wacc);
      expect(waccWithDebt.wacc).toBeCloseTo(0.096, 4); // 9.6%

      // Verify all metrics are consistent
      expect(waccWithDebt.equityPercentage).toBeCloseTo(0.4, 4);
      expect(waccWithDebt.debtPercentage).toBeCloseTo(0.6, 4);
      expect(equityWithDebt).toBe(PROJECT_COST - DEBT_AMOUNT);
    });
  });
});

