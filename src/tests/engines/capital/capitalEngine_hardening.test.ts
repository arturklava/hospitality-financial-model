import { describe, it, expect } from 'vitest';
import { runCapitalEngine } from '@engines/capital/capitalEngine';
import type {
  ConsolidatedAnnualPnl,
  UnleveredFcf,
  CapitalStructureConfig,
  ConsolidatedMonthlyPnl,
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

  const createConsolidatedMonthlyPnl = (
    horizonYears: number,
    noiPerMonth: number,
    maintenanceCapexPerMonth = 0
  ): ConsolidatedMonthlyPnl[] => {
    const result: ConsolidatedMonthlyPnl[] = [];
    const totalMonths = horizonYears * 12;

    for (let monthNumber = 0; monthNumber < totalMonths; monthNumber++) {
      const yearIndex = Math.floor(monthNumber / 12);
      const monthIndex = monthNumber % 12;

      result.push({
        yearIndex,
        monthIndex,
        monthNumber,
        revenueTotal: noiPerMonth,
        departmentalExpenses: 0,
        gop: noiPerMonth,
        undistributedExpenses: 0,
        noi: noiPerMonth,
        maintenanceCapex: maintenanceCapexPerMonth,
        cashFlow: noiPerMonth - maintenanceCapexPerMonth,
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

    it('should fully repay balloon balance when amortization exceeds term', () => {
      const horizonYears = 7;
      const consolidatedPnl = createConsolidatedPnl(horizonYears, 20000);
      const unleveredFcf = createUnleveredFcf(horizonYears, 18000);

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 200000,
        debtTranches: [
          {
            id: 'balloon-test',
            initialPrincipal: 100000,
            interestRate: 0.05,
            termYears: 5,
            amortizationYears: 20,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);
      const entries = result.debtSchedule.entries;
      const finalYear = entries[4];

      expect(finalYear.principal).toBeCloseTo(finalYear.beginningBalance, 2);
      const totalPrincipal = entries.reduce((sum, e) => sum + e.principal, 0);
      expect(Math.abs(totalPrincipal - 100000)).toBeLessThan(0.01);
    });

    it('should throw on invalid amortization years for mortgage tranches', () => {
      const horizonYears = 5;
      const consolidatedPnl = createConsolidatedPnl(horizonYears, 12000);
      const unleveredFcf = createUnleveredFcf(horizonYears, 10000);

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'invalid-amortization',
            initialPrincipal: 50000,
            interestRate: 0.05,
            termYears: 5,
            amortizationYears: 0,
          },
        ],
      };

      expect(() => runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig)).toThrow(
        /amortizationYears must be > 0/
      );
    });
  });

  describe('Zero-interest and alignment checks', () => {
    it('amortizes mortgage principal with zero interest in monthly schedule', () => {
      const horizonYears = 1;
      const consolidatedPnl = createConsolidatedPnl(horizonYears, 12000);
      const unleveredFcf = createUnleveredFcf(horizonYears, 10000);
      const consolidatedMonthlyPnl = createConsolidatedMonthlyPnl(horizonYears, 1000);

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 50000,
        debtTranches: [
          {
            id: 'zero-rate-mortgage',
            initialPrincipal: 12000,
            interestRate: 0,
            termYears: 1,
            amortizationYears: 1,
            amortizationType: 'mortgage',
          },
        ],
      };

      const result = runCapitalEngine(
        consolidatedPnl,
        unleveredFcf,
        capitalConfig,
        consolidatedMonthlyPnl
      );

      expect(result.monthlyDebtSchedule).toBeDefined();
      const aggregated = result.monthlyDebtSchedule!.aggregatedByMonth;

      aggregated.forEach(entry => {
        expect(entry.totalPrincipal).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(entry.totalPrincipal)).toBe(true);
      });

      const totalPrincipal = aggregated.reduce((sum, e) => sum + e.totalPrincipal, 0);
      expect(totalPrincipal).toBeCloseTo(12000, 2);
      expect(aggregated[aggregated.length - 1].totalEndingBalance).toBeCloseTo(0, 4);
    });

    it('keeps levered cash flow aligned with unlevered inputs and debt service', () => {
      const horizonYears = 3;
      const consolidatedPnl = createConsolidatedPnl(horizonYears, 15000);
      const unleveredFcf = createUnleveredFcf(horizonYears, 14000);

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 90000,
        debtTranches: [
          {
            id: 'alignment-check',
            initialPrincipal: 30000,
            interestRate: 0.04,
            termYears: 3,
            amortizationYears: 3,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      result.leveredFcfByYear.forEach(entry => {
        const debtService = entry.interest + entry.principal + (entry.transactionCosts ?? 0);
        expect(entry.debtService).toBeCloseTo(debtService, 6);
        expect(entry.leveredFreeCashFlow).toBeCloseTo(entry.unleveredFcf - entry.debtService, 6);
      });
    });
  });
});
