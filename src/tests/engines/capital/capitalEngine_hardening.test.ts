import { describe, it, expect } from 'vitest';
import { runCapitalEngine } from '@engines/capital/capitalEngine';
import type {
  ConsolidatedAnnualPnl,
  UnleveredFcf,
  CapitalStructureConfig,
} from '@domain/types';

describe('Capital Engine Hardening', () => {
  const createConsolidatedPnl = (horizonYears: number, noiPerYear: number): ConsolidatedAnnualPnl[] => {
    const result: ConsolidatedAnnualPnl[] = [];
    for (let i = 0; i < horizonYears; i++) {
      result.push({
        yearIndex: i,
        revenueTotal: 100000,
        departmentalExpenses: 20000,
        gop: 80000,
        undistributedExpenses: 50000,
        cogsTotal: 20000,
        opexTotal: 50000,
        ebitda: 30000,
        noi: noiPerYear,
        maintenanceCapex: 2000,
        cashFlow: noiPerYear,
      });
    }
    return result;
  };

  const createUnleveredFcf = (horizonYears: number, ufcfPerYear: number): UnleveredFcf[] => {
    const result: UnleveredFcf[] = [];
    for (let i = 0; i < horizonYears; i++) {
      result.push({
        yearIndex: i,
        noi: 12000,
        maintenanceCapex: 2000,
        changeInWorkingCapital: 0,
        unleveredFreeCashFlow: ufcfPerYear,
      });
    }
    return result;
  };

  describe('Refinancing Edge Cases', () => {
    it('should handle refinancing in the final year of the projection horizon', () => {
      const horizonYears = 5;
      const consolidatedPnl = createConsolidatedPnl(horizonYears, 12000);
      const unleveredFcf = createUnleveredFcf(horizonYears, 10000);
      
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'refinance-final-year',
            initialPrincipal: 50000,
            interestRate: 0.05,
            termYears: 5,
            amortizationYears: 20, // Long amortization
            refinanceAtYear: 4, // Refinance in the last year (index 4)
            refinanceAmountPct: 1.0,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);
      const entries = result.debtSchedule.entries;

      // Check year 4 (index 4)
      const year4 = entries[4];
      
      // Should be fully repaid
      expect(year4.endingBalance).toBe(0);
      // Principal payment should equal the beginning balance (full repayment)
      expect(year4.principal).toBeCloseTo(year4.beginningBalance, 2);
    });

    it('should ensure old tranche balance is exactly 0 at refinance year', () => {
      const horizonYears = 10;
      const consolidatedPnl = createConsolidatedPnl(horizonYears, 12000);
      const unleveredFcf = createUnleveredFcf(horizonYears, 10000);
      
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'refinance-mid-term',
            initialPrincipal: 50000,
            interestRate: 0.05,
            termYears: 10,
            amortizationYears: 20,
            refinanceAtYear: 5, // Refinance at year 5
            refinanceAmountPct: 1.0,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);
      const entries = result.debtSchedule.entries;

      // Year 5 is the refinance year. 
      // In the current implementation, the "refinance" happens by paying down the principal in that year.
      // So ending balance of year 5 should be 0.
      expect(entries[5].endingBalance).toBe(0);
      expect(entries[5].principal).toBeCloseTo(entries[5].beginningBalance, 2);
    });
  });

  describe('Invariant Checks', () => {
    it('should satisfy principal + endingBalance ≈ initialPrincipal for complex amortization', () => {
      const horizonYears = 10;
      const consolidatedPnl = createConsolidatedPnl(horizonYears, 12000);
      const unleveredFcf = createUnleveredFcf(horizonYears, 10000);
      
      const initialPrincipal = 50000;
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'complex-amort',
            initialPrincipal: initialPrincipal,
            interestRate: 0.05,
            termYears: 10,
            amortizationYears: 15, // Partial amortization
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);
      const entries = result.debtSchedule.entries;

      const totalPrincipalPaid = entries.reduce((sum, e) => sum + e.principal, 0);
      const finalEndingBalance = entries[entries.length - 1].endingBalance;
      const totalAccounted = totalPrincipalPaid + finalEndingBalance;

      expect(Math.abs(totalAccounted - initialPrincipal)).toBeLessThan(0.01);
    });
  });
});
