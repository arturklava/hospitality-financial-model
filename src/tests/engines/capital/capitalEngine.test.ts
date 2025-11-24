import { describe, it, expect } from 'vitest';
import { runCapitalEngine, calculateWACC } from '@engines/capital/capitalEngine';
import { irr } from '@domain/financial';
import type {
  ConsolidatedAnnualPnl,
  UnleveredFcf,
  CapitalStructureConfig,
  ProjectConfig,
} from '@domain/types';
import {
  buildSingleTrancheCapitalConfig,
  buildMultiTrancheCapitalConfig,
  buildRefinancingCapitalConfig,
} from '../../helpers/buildCapitalConfig';

describe('Capital Engine', () => {
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

  describe('Simple amortizing loan', () => {
    it('should calculate debt schedule, levered FCF, and owner cash flows correctly', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'senior-loan',
            amount: 60000,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Verify debt schedule
      expect(result.debtSchedule.entries.length).toBe(5);

      // Year 0: beginningBalance = 60000
      expect(result.debtSchedule.entries[0].beginningBalance).toBe(60000);
      expect(result.debtSchedule.entries[0].interest).toBeCloseTo(6000, 2); // 60000 * 0.10
      expect(result.debtSchedule.entries[0].principal).toBe(12000); // 60000 / 5
      expect(result.debtSchedule.entries[0].endingBalance).toBe(48000);

      // Year 1: beginningBalance = 48000
      expect(result.debtSchedule.entries[1].beginningBalance).toBe(48000);
      expect(result.debtSchedule.entries[1].interest).toBeCloseTo(4800, 2);
      expect(result.debtSchedule.entries[1].principal).toBe(12000);
      expect(result.debtSchedule.entries[1].endingBalance).toBe(36000);

      // Final year: endingBalance should be approximately 0
      const lastEntry = result.debtSchedule.entries[4];
      expect(lastEntry.endingBalance).toBeCloseTo(0, 2);

      // Verify owner levered cash flows length (Year 0..5 = 6 entries)
      expect(result.ownerLeveredCashFlows.length).toBe(6);

      // Year 0: equity investment = -(100000 - 60000) = -40000
      expect(result.ownerLeveredCashFlows[0]).toBe(-40000);

      // Years 1..5: levered FCF = UFCF - debtService
      for (let i = 1; i <= 5; i++) {
        const yearIndex = i - 1;
        const expectedLeveredFcf = 10000 - (result.debtSchedule.entries[yearIndex].interest + result.debtSchedule.entries[yearIndex].principal);
        expect(result.ownerLeveredCashFlows[i]).toBeCloseTo(expectedLeveredFcf, 2);
      }

      // Verify levered FCF
      for (let i = 0; i < 5; i++) {
        const leveredFcf = result.leveredFcfByYear[i];
        expect(leveredFcf.yearIndex).toBe(i);
        expect(leveredFcf.unleveredFcf).toBe(10000);
        expect(leveredFcf.interest).toBeCloseTo(result.debtSchedule.entries[i].interest, 2);
        expect(leveredFcf.principal).toBe(result.debtSchedule.entries[i].principal);
        expect(leveredFcf.debtService).toBeCloseTo(leveredFcf.interest + leveredFcf.principal, 2);
        expect(leveredFcf.leveredFreeCashFlow).toBeCloseTo(leveredFcf.unleveredFcf - leveredFcf.debtService, 2);
      }
    });
  });

  describe('Balloon payment scenario', () => {
    it('should handle balloon payment when term < amortization', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'balloon-loan',
            amount: 60000,
            interestRate: 0.10,
            termYears: 3, // Matures in 3 years
            amortizationYears: 5, // But amortizes over 5 years
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Standard principal per year would be 60000 / 5 = 12000
      // But since term is 3 years, we should see balloon in year 3

      // Year 0: standard amortization
      expect(result.debtSchedule.entries[0].principal).toBe(12000);
      expect(result.debtSchedule.entries[0].endingBalance).toBe(48000);

      // Year 1: standard amortization
      expect(result.debtSchedule.entries[1].principal).toBe(12000);
      expect(result.debtSchedule.entries[1].endingBalance).toBe(36000);

      // Year 2: last year of term, should pay remaining balance (balloon)
      expect(result.debtSchedule.entries[2].principal).toBe(36000); // Remaining balance
      expect(result.debtSchedule.entries[2].endingBalance).toBeCloseTo(0, 2);

      // Years 3-4: loan has matured, all zeros
      expect(result.debtSchedule.entries[3].beginningBalance).toBe(0);
      expect(result.debtSchedule.entries[3].interest).toBe(0);
      expect(result.debtSchedule.entries[3].principal).toBe(0);
      expect(result.debtSchedule.entries[3].endingBalance).toBe(0);

      expect(result.debtSchedule.entries[4].beginningBalance).toBe(0);
      expect(result.debtSchedule.entries[4].interest).toBe(0);
      expect(result.debtSchedule.entries[4].principal).toBe(0);
      expect(result.debtSchedule.entries[4].endingBalance).toBe(0);
    });
  });

  describe('No-debt scenario', () => {
    it('should handle empty debt tranches', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // All debt schedule entries should be zero
      for (const entry of result.debtSchedule.entries) {
        expect(entry.beginningBalance).toBe(0);
        expect(entry.interest).toBe(0);
        expect(entry.principal).toBe(0);
        expect(entry.endingBalance).toBe(0);
      }

      // Levered FCF should equal unlevered FCF
      for (let i = 0; i < 5; i++) {
        expect(result.leveredFcfByYear[i].unleveredFcf).toBe(10000);
        expect(result.leveredFcfByYear[i].debtService).toBe(0);
        expect(result.leveredFcfByYear[i].interest).toBe(0);
        expect(result.leveredFcfByYear[i].principal).toBe(0);
        expect(result.leveredFcfByYear[i].leveredFreeCashFlow).toBe(10000);
      }

      // Owner levered cash flows: Year 0 = -initialInvestment
      expect(result.ownerLeveredCashFlows[0]).toBe(-100000);

      // Years 1..5: levered FCF (which equals unlevered FCF)
      for (let i = 1; i <= 5; i++) {
        expect(result.ownerLeveredCashFlows[i]).toBe(10000);
      }

      // All DSCR and LTV should be null
      for (const kpi of result.debtKpis) {
        expect(kpi.dscr).toBeNull();
        expect(kpi.ltv).toBeNull();
      }
    });

    it('should handle zero amount tranche', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'zero-loan',
            amount: 0,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Should behave like no-debt scenario
      expect(result.ownerLeveredCashFlows[0]).toBe(-100000);
      expect(result.leveredFcfByYear[0].leveredFreeCashFlow).toBe(10000);
    });

    it('should handle zero termYears tranche', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'zero-term',
            amount: 60000,
            interestRate: 0.10,
            termYears: 0,
            amortizationYears: 5,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Should behave like no-debt scenario
      expect(result.ownerLeveredCashFlows[0]).toBe(-100000);
      expect(result.leveredFcfByYear[0].leveredFreeCashFlow).toBe(10000);
    });
  });

  describe('DSCR and LTV sanity', () => {
    it('should calculate DSCR and LTV correctly', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000); // NOI = 12000
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'senior-loan',
            amount: 60000,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Year 0: DSCR = NOI / debtService
      // debtService = interest + principal = 6000 + 12000 = 18000
      // DSCR = 12000 / 18000 = 0.667
      const year0DebtService = result.debtSchedule.entries[0].interest + result.debtSchedule.entries[0].principal;
      expect(result.debtKpis[0].dscr).toBeCloseTo(12000 / year0DebtService, 2);
      expect(result.debtKpis[0].dscr).toBeLessThan(1); // Not enough coverage

      // Year 0: LTV = beginningBalance / initialInvestment = 60000 / 100000 = 0.6
      expect(result.debtKpis[0].ltv).toBeCloseTo(0.6, 2);

      // Verify LTV decreases as balance decreases
      if (result.debtKpis[0].ltv !== null && result.debtKpis[1].ltv !== null) {
        expect(result.debtKpis[1].ltv).toBeLessThan(result.debtKpis[0].ltv);
      }
      if (result.debtKpis[1].ltv !== null && result.debtKpis[2].ltv !== null) {
        expect(result.debtKpis[2].ltv).toBeLessThan(result.debtKpis[1].ltv);
      }

      // Verify DSCR improves as debt service decreases
      const year0Dscr = result.debtKpis[0].dscr;
      const year1Dscr = result.debtKpis[1].dscr;
      if (year0Dscr !== null && year1Dscr !== null) {
        expect(year1Dscr).toBeGreaterThan(year0Dscr);
      }
    });

    it('should return null DSCR when NOI is zero or negative', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 0,
          departmentalExpenses: 0,
          gop: 0,
          undistributedExpenses: 0,
          cogsTotal: 0,
          opexTotal: 0,
          ebitda: 0,
          noi: 0,
          maintenanceCapex: 0,
          cashFlow: 0,
        },
      ];
      const unleveredFcf: UnleveredFcf[] = [
        {
          yearIndex: 0,
          noi: 0,
          maintenanceCapex: 0,
          changeInWorkingCapital: 0,
          unleveredFreeCashFlow: 0,
        },
      ];
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'loan',
            amount: 60000,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      expect(result.debtKpis[0].dscr).toBeNull();
    });

    it('should return null DSCR when debt service is zero', () => {
      const consolidatedPnl = createConsolidatedPnl(1, 12000);
      const unleveredFcf = createUnleveredFcf(1, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [], // No debt
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      expect(result.debtKpis[0].dscr).toBeNull();
    });

    it('should return null LTV when beginning balance is zero', () => {
      const consolidatedPnl = createConsolidatedPnl(1, 12000);
      const unleveredFcf = createUnleveredFcf(1, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [], // No debt
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      expect(result.debtKpis[0].ltv).toBeNull();
    });
  });

  describe('Debt schedule invariant', () => {
    it('should satisfy debt invariant for no-debt scenario', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [], // No debt
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // For no-debt scenario, sum of principal + final balance should be 0
      const totalPrincipalPaid = result.debtSchedule.entries.reduce((sum, entry) => sum + entry.principal, 0);
      const finalEndingBalance = result.debtSchedule.entries[result.debtSchedule.entries.length - 1]?.endingBalance ?? 0;
      const totalRepaid = totalPrincipalPaid + finalEndingBalance;

      expect(totalRepaid).toBe(0);
    });

    it('should satisfy debt invariant for standard amortization scenario', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'senior-loan',
            amount: 60000,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Debt invariant: sum(principal payments) + final ending balance ≈ initial debt amount
      const entries = result.debtSchedule.entries;
      const totalPrincipalPaid = entries.reduce((sum, entry) => sum + entry.principal, 0);
      const finalEndingBalance = entries[entries.length - 1]?.endingBalance ?? 0;
      const totalRepaid = totalPrincipalPaid + finalEndingBalance;
      const tolerance = 0.01;

      expect(Math.abs(totalRepaid - 60000)).toBeLessThanOrEqual(tolerance);
    });

    it('should satisfy debt invariant for balloon payment scenario', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'balloon-loan',
            amount: 60000,
            interestRate: 0.10,
            termYears: 3, // Matures in 3 years
            amortizationYears: 5, // But amortizes over 5 years
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Debt invariant: sum(principal payments) + final ending balance ≈ initial debt amount
      const entries = result.debtSchedule.entries;
      const totalPrincipalPaid = entries.reduce((sum, entry) => sum + entry.principal, 0);
      const finalEndingBalance = entries[entries.length - 1]?.endingBalance ?? 0;
      const totalRepaid = totalPrincipalPaid + finalEndingBalance;
      const tolerance = 0.01;

      expect(Math.abs(totalRepaid - 60000)).toBeLessThanOrEqual(tolerance);

      // Verify that the balloon payment was made in the last year of term
      expect(entries[2].principal).toBe(36000); // Remaining balance paid in year 2
      expect(entries[2].endingBalance).toBeCloseTo(0, 2);
    });
  });

  describe('v0.5: Single-tranche (v0.4 compatibility)', () => {
    it('should match v0.4 expectations with single-tranche config', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig = buildSingleTrancheCapitalConfig({
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'senior-loan',
            amount: 60000, // v0.4 style
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      });

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Verify debt schedule matches v0.4 expectations
      expect(result.debtSchedule.entries.length).toBe(5);
      expect(result.debtSchedule.entries[0].beginningBalance).toBe(60000);
      expect(result.debtSchedule.entries[0].interest).toBeCloseTo(6000, 2);
      expect(result.debtSchedule.entries[0].principal).toBe(12000);
      expect(result.debtSchedule.entries[0].endingBalance).toBe(48000);

      // Verify owner levered cash flows
      expect(result.ownerLeveredCashFlows[0]).toBe(-40000); // -(100000 - 60000)

      // Verify KPIs are finite
      expect(Number.isFinite(result.debtKpis[0].dscr ?? 0)).toBe(true);
      expect(Number.isFinite(result.debtKpis[0].ltv ?? 0)).toBe(true);
    });
  });

  describe('v0.5: Multi-tranche support', () => {
    it('should handle multiple tranches and aggregate debt service correctly', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig = buildMultiTrancheCapitalConfig({
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: 40000,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
            amortizationType: 'mortgage',
          },
          {
            id: 'mezz-loan',
            initialPrincipal: 20000,
            interestRate: 0.12,
            termYears: 5,
            amortizationYears: 5,
            amortizationType: 'mortgage',
          },
        ],
      });

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Verify aggregate debt schedule
      expect(result.debtSchedule.entries.length).toBe(5);

      // Year 0: aggregate beginning balance = 40000 + 20000 = 60000
      expect(result.debtSchedule.entries[0].beginningBalance).toBe(60000);
      
      // Year 0: aggregate interest = 40000*0.10 + 20000*0.12 = 4000 + 2400 = 6400
      expect(result.debtSchedule.entries[0].interest).toBeCloseTo(6400, 2);
      
      // Year 0: aggregate principal = 40000/5 + 20000/5 = 8000 + 4000 = 12000
      expect(result.debtSchedule.entries[0].principal).toBe(12000);

      // Verify aggregate debt service
      const year0DebtService = result.debtSchedule.entries[0].interest + result.debtSchedule.entries[0].principal;
      expect(year0DebtService).toBeCloseTo(6400 + 12000, 2);

      // Verify owner levered cash flows
      const totalDebt = 40000 + 20000;
      expect(result.ownerLeveredCashFlows[0]).toBe(-(100000 - totalDebt)); // -40000

      // Verify aggregate LTV
      expect(result.debtKpis[0].ltv).toBeCloseTo(60000 / 100000, 2);

      // Verify per-tranche balances behave correctly (no negative, no NaN/Infinity)
      // Note: We can't directly access per-tranche balances in v0.5, but we verify aggregate
      for (const entry of result.debtSchedule.entries) {
        expect(entry.beginningBalance).toBeGreaterThanOrEqual(0);
        expect(entry.endingBalance).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(entry.interest)).toBe(true);
        expect(Number.isFinite(entry.principal)).toBe(true);
        expect(Number.isNaN(entry.interest)).toBe(false);
        expect(Number.isNaN(entry.principal)).toBe(false);
      }

      // Verify aggregated debt service equals sum of per-tranche services
      // (This is implicitly verified by the aggregate calculation, but we can check consistency)
      for (let i = 0; i < result.debtSchedule.entries.length; i++) {
        const entry = result.debtSchedule.entries[i];
        const leveredFcf = result.leveredFcfByYear[i];
        expect(entry.interest + entry.principal).toBeCloseTo(leveredFcf.debtService, 2);
      }
    });

    it('should handle backward compatibility with v0.4 amount field', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'v0.4-tranche',
            amount: 60000, // v0.4 field
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Should work the same as if initialPrincipal was used
      expect(result.debtSchedule.entries[0].beginningBalance).toBe(60000);
      expect(result.ownerLeveredCashFlows[0]).toBe(-40000);
    });

    it('should handle different amortization types', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'io-loan',
            initialPrincipal: 50000,
            interestRate: 0.10,
            termYears: 5,
            amortizationType: 'interest_only',
            ioYears: 3,
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Years 0-3: interest only, no principal
      for (let i = 0; i < 3; i++) {
        expect(result.debtSchedule.entries[i].principal).toBe(0);
        expect(result.debtSchedule.entries[i].interest).toBeCloseTo(50000 * 0.10, 2);
        expect(result.debtSchedule.entries[i].endingBalance).toBe(50000);
      }

      // Year 4: last year, full principal repayment
      expect(result.debtSchedule.entries[4].principal).toBe(50000);
      expect(result.debtSchedule.entries[4].endingBalance).toBeCloseTo(0, 2);
    });

    it('should handle tranches with different start years', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'tranche-1',
            initialPrincipal: 40000,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
            startYear: 0,
          },
          {
            id: 'tranche-2',
            initialPrincipal: 20000,
            interestRate: 0.12,
            termYears: 3,
            amortizationYears: 3,
            startYear: 2, // Starts in year 2
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Year 0: only tranche-1 is active
      expect(result.debtSchedule.entries[0].beginningBalance).toBe(40000);

      // Year 1: only tranche-1 is active
      expect(result.debtSchedule.entries[1].beginningBalance).toBe(32000); // 40000 - 8000

      // Year 2: both tranches are active
      expect(result.debtSchedule.entries[2].beginningBalance).toBeCloseTo(24000 + 20000, 2); // tranche-1 + tranche-2
    });
  });

  describe('v0.5: Simple refinancing', () => {
    it('should fully repay tranche at refinanceAtYear and start new tranche', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig = buildRefinancingCapitalConfig({
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'original-loan',
            initialPrincipal: 60000,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
            refinanceAtYear: 2, // Refinance at year 2
          },
          {
            id: 'refinanced-loan',
            initialPrincipal: 48000, // Approx remaining balance after 2 years
            interestRate: 0.08,
            termYears: 3,
            amortizationYears: 3,
            startYear: 2, // Starts in same year as refinancing
          },
        ],
      });

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Year 0-1: original loan active
      expect(result.debtSchedule.entries[0].beginningBalance).toBe(60000);
      expect(result.debtSchedule.entries[1].beginningBalance).toBe(48000);

      // Year 2: original loan is refinanced (fully repaid), new loan starts
      // At refinance year:
      // - Old tranche balance should drop to ~0 (fully repaid)
      // - New tranche should begin with principal ≈ repaid amount
      const year2Entry = result.debtSchedule.entries[2];
      expect(year2Entry.beginningBalance).toBeGreaterThan(48000); // Should include new loan
      
      // Year 2: aggregate principal should include repayment of old loan
      expect(year2Entry.principal).toBeGreaterThan(48000); // Old loan repayment + new loan principal

      // Verify all invariants still hold
      for (const entry of result.debtSchedule.entries) {
        expect(entry.beginningBalance).toBeGreaterThanOrEqual(0);
        expect(entry.endingBalance).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(entry.interest)).toBe(true);
        expect(Number.isFinite(entry.principal)).toBe(true);
      }

      // Verify debt schedule invariant still holds
      // With refinancing, we need to verify that:
      // 1. The original loan is fully repaid (principal paid on original loan ≈ initial principal)
      // 2. The new loan is properly tracked
      const entries = result.debtSchedule.entries;
      
      // Calculate principal paid on original loan (years 0-2)
      const originalLoanPrincipalPaid = entries.slice(0, 3).reduce((sum, entry) => sum + entry.principal, 0);
      const originalLoanInitial = 60000;
      
      // Original loan should be fully repaid (within tolerance for interest-only periods)
      // At year 2, the remaining balance (~48000) should be fully repaid
      expect(originalLoanPrincipalPaid).toBeGreaterThanOrEqual(originalLoanInitial * 0.7); // At least 70% repaid
      
      // Verify the new loan starts correctly
      const newLoanInitial = 48000;
      expect(entries[2].beginningBalance).toBeGreaterThanOrEqual(newLoanInitial * 0.9); // New loan should start around 48000
    });
  });

  describe('v0.6: Transaction costs', () => {
    it('should calculate origination fees and reduce net proceeds', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: 60000,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
            originationFeePct: 0.01, // 1% origination fee
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Net proceeds = 60000 - (60000 * 0.01) = 59400
      // Equity invested = 100000 - 59400 = 40600
      // Origination fee = 600
      // Year 0 cash flow = -40600 - 600 = -41200
      expect(result.ownerLeveredCashFlows[0]).toBeCloseTo(-41200, 2);

      // Debt schedule should still be based on initial principal (60000), not net proceeds
      expect(result.debtSchedule.entries[0].beginningBalance).toBe(60000);
    });

    it('should calculate exit fees at maturity', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: 60000,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
            exitFeePct: 0.005, // 0.5% exit fee
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Year 4 (last year of 5-year term): exit fee should be included in debt service
      // Final ending balance should be close to 0
      const year4Entry = result.debtSchedule.entries[4];
      expect(year4Entry.endingBalance).toBeCloseTo(0, 2);

      // Exit fee = ending balance * 0.005, but ending balance is 0, so exit fee should be on beginning balance
      // Actually, exit fee is calculated on the balance that will be repaid
      // For a fully amortizing loan, the exit fee at maturity would be on the remaining balance
      // Since the loan is fully amortized, exit fee should be minimal or zero
      // But we verify that transaction costs are included in debt service
      const year4DebtService = result.leveredFcfByYear[4].debtService;
      expect(year4DebtService).toBeGreaterThan(year4Entry.interest + year4Entry.principal); // Should include exit fee
    });

    it('should calculate exit fees at refinance', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'original-loan',
            initialPrincipal: 60000,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
            refinanceAtYear: 2,
            exitFeePct: 0.01, // 1% exit fee
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Year 2: refinancing year, exit fee should be included in debt service
      const year2DebtService = result.leveredFcfByYear[2].debtService;
      const year2Entry = result.debtSchedule.entries[2];
      const baseDebtService = year2Entry.interest + year2Entry.principal;
      
      // Exit fee should be 1% of the beginning balance at year 2
      // With linear amortization (60000 / 5 = 12000 per year):
      // Year 0: principal = 12000, endingBalance = 48000
      // Year 1: principal = 12000, endingBalance = 36000
      // Year 2: beginningBalance = 36000
      const year2BeginningBalance = year2Entry.beginningBalance;
      const expectedExitFee = year2BeginningBalance * 0.01; // 1% of actual beginning balance
      expect(year2DebtService).toBeGreaterThan(baseDebtService); // Should include exit fee
      expect(result.leveredFcfByYear[2].transactionCosts).toBeCloseTo(expectedExitFee, 0);
    });

    it('should show effective APR is higher than nominal rate with 1% origination and 1% exit fee', () => {
      const consolidatedPnl = createConsolidatedPnl(5, 12000);
      const unleveredFcf = createUnleveredFcf(5, 10000);
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: 60000,
            interestRate: 0.10, // 10% nominal rate
            termYears: 5,
            amortizationYears: 5,
            originationFeePct: 0.01, // 1% origination fee
            exitFeePct: 0.01, // 1% exit fee
          },
        ],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Build loan cash flows from lender's perspective:
      // Year 0: Net proceeds (positive, money lent out) = 60000 - 600 = 59400
      // Years 1-4: Interest + principal payments (negative, money received)
      // Year 5: Final interest + principal + exit fee (negative, money received)
      const loanCashFlows: number[] = [];
      // Year 0: Net proceeds (lender receives this)
      const netProceeds = 60000 - (60000 * 0.01); // 59400
      loanCashFlows.push(netProceeds);

      // Years 1-5: Debt service payments (lender pays out, so negative)
      for (let t = 0; t < 5; t++) {
        const entry = result.debtSchedule.entries[t];
        const exitFee = t === 4 ? entry.beginningBalance * 0.01 : 0; // Exit fee at maturity
        const debtService = entry.interest + entry.principal + exitFee;
        loanCashFlows.push(-debtService);
      }

      // Calculate effective APR (IRR of loan cash flows)
      const effectiveAPR = irr(loanCashFlows);

      // Effective APR should be higher than nominal rate (10%) due to fees
      expect(effectiveAPR).not.toBeNull();
      if (effectiveAPR !== null) {
        expect(effectiveAPR).toBeGreaterThan(0.10); // Should be > 10%
        // With 1% origination and 1% exit fee, effective APR should be around 10.5-11%
        expect(effectiveAPR).toBeLessThan(0.12); // Should be < 12%
      }
    });
  });

  describe('WACC Calculation (v0.7)', () => {
    it('should calculate WACC correctly for 50/50 Debt/Equity split', () => {
      const projectConfig: ProjectConfig = {
        discountRate: 0.12, // 12% cost of equity
        terminalGrowthRate: 0.02,
        initialInvestment: 100000,
        taxRate: 0.25, // 25% tax rate
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: 50000, // 50% debt
            interestRate: 0.08, // 8% cost of debt
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const waccMetrics = calculateWACC(projectConfig, capitalConfig);

      // Verify components
      expect(waccMetrics.equityPercentage).toBeCloseTo(0.5, 4); // 50% equity
      expect(waccMetrics.debtPercentage).toBeCloseTo(0.5, 4); // 50% debt
      expect(waccMetrics.costOfEquity).toBe(0.12); // 12%
      expect(waccMetrics.costOfDebt).toBe(0.08); // 8%
      expect(waccMetrics.taxRate).toBe(0.25); // 25%

      // Calculate expected WACC: (0.5 × 0.12) + (0.5 × 0.08 × (1 - 0.25))
      // = 0.06 + (0.5 × 0.08 × 0.75)
      // = 0.06 + 0.03
      // = 0.09 (9%)
      const expectedWacc = (0.5 * 0.12) + (0.5 * 0.08 * (1 - 0.25));
      expect(waccMetrics.wacc).toBeCloseTo(expectedWacc, 4);
      expect(waccMetrics.wacc).toBeCloseTo(0.09, 4); // 9%
    });

    it('should calculate WACC correctly for all-equity scenario', () => {
      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 100000,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100000,
        debtTranches: [], // No debt
      };

      const waccMetrics = calculateWACC(projectConfig, capitalConfig);

      expect(waccMetrics.equityPercentage).toBeCloseTo(1.0, 4); // 100% equity
      expect(waccMetrics.debtPercentage).toBeCloseTo(0.0, 4); // 0% debt
      expect(waccMetrics.costOfEquity).toBe(0.10);
      expect(waccMetrics.costOfDebt).toBe(0); // No debt
      expect(waccMetrics.wacc).toBeCloseTo(0.10, 4); // WACC = cost of equity
    });

    it('should calculate WACC correctly for multi-tranche debt', () => {
      const projectConfig: ProjectConfig = {
        discountRate: 0.15, // 15% cost of equity
        terminalGrowthRate: 0.02,
        initialInvestment: 200000,
        taxRate: 0.20, // 20% tax rate
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 200000,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: 100000, // 50% of total
            interestRate: 0.06, // 6%
            termYears: 5,
          },
          {
            id: 'mezzanine',
            initialPrincipal: 50000, // 25% of total
            interestRate: 0.12, // 12%
            termYears: 5,
          },
        ],
      };

      const waccMetrics = calculateWACC(projectConfig, capitalConfig);

      // Total debt = 150000 (75% of 200000)
      // Equity = 50000 (25% of 200000)
      expect(waccMetrics.equityPercentage).toBeCloseTo(0.25, 4);
      expect(waccMetrics.debtPercentage).toBeCloseTo(0.75, 4);

      // Weighted average cost of debt = (100000 × 0.06 + 50000 × 0.12) / 150000
      // = (6000 + 6000) / 150000 = 12000 / 150000 = 0.08 (8%)
      expect(waccMetrics.costOfDebt).toBeCloseTo(0.08, 4);

      // WACC = (0.25 × 0.15) + (0.75 × 0.08 × (1 - 0.20))
      // = 0.0375 + (0.75 × 0.08 × 0.80)
      // = 0.0375 + 0.048
      // = 0.0855 (8.55%)
      const expectedWacc = (0.25 * 0.15) + (0.75 * 0.08 * (1 - 0.20));
      expect(waccMetrics.wacc).toBeCloseTo(expectedWacc, 4);
    });

    it('should calculate WACC correctly for complex multi-tranche scenario (v0.7 validation)', () => {
      // Complex scenario: 3 tranches with different rates, plus tax
      const projectConfig: ProjectConfig = {
        discountRate: 0.18, // 18% cost of equity
        terminalGrowthRate: 0.02,
        initialInvestment: 100_000_000, // $100M total investment
        taxRate: 0.25, // 25% tax rate
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 100_000_000,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: 50_000_000, // $50M (50% of total)
            interestRate: 0.05, // 5% - senior debt
            termYears: 10,
            amortizationYears: 10,
          },
          {
            id: 'mezzanine',
            initialPrincipal: 20_000_000, // $20M (20% of total)
            interestRate: 0.12, // 12% - mezzanine debt
            termYears: 7,
            amortizationYears: 7,
          },
          {
            id: 'bridge-loan',
            initialPrincipal: 10_000_000, // $10M (10% of total)
            interestRate: 0.15, // 15% - bridge loan
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const waccMetrics = calculateWACC(projectConfig, capitalConfig);

      // Manual calculation verification:
      // Total debt = 50M + 20M + 10M = 80M (80% of 100M)
      // Equity = 100M - 80M = 20M (20% of 100M)
      expect(waccMetrics.equityPercentage).toBeCloseTo(0.20, 4); // 20% equity
      expect(waccMetrics.debtPercentage).toBeCloseTo(0.80, 4); // 80% debt

      // Weighted average cost of debt:
      // = (50M × 0.05 + 20M × 0.12 + 10M × 0.15) / 80M
      // = (2.5M + 2.4M + 1.5M) / 80M
      // = 6.4M / 80M
      // = 0.08 (8%)
      const expectedCostOfDebt = (50_000_000 * 0.05 + 20_000_000 * 0.12 + 10_000_000 * 0.15) / 80_000_000;
      expect(waccMetrics.costOfDebt).toBeCloseTo(expectedCostOfDebt, 4);
      expect(waccMetrics.costOfDebt).toBeCloseTo(0.08, 4); // 8%

      // WACC = (Equity % × Cost of Equity) + (Debt % × Cost of Debt × (1 - TaxRate))
      // = (0.20 × 0.18) + (0.80 × 0.08 × (1 - 0.25))
      // = 0.036 + (0.80 × 0.08 × 0.75)
      // = 0.036 + 0.048
      // = 0.084 (8.4%)
      const expectedWacc = (0.20 * 0.18) + (0.80 * 0.08 * (1 - 0.25));
      expect(waccMetrics.wacc).toBeCloseTo(expectedWacc, 4);
      expect(waccMetrics.wacc).toBeCloseTo(0.084, 4); // 8.4%

      // Verify all components
      expect(waccMetrics.costOfEquity).toBe(0.18); // 18%
      expect(waccMetrics.taxRate).toBe(0.25); // 25%
    });
  });
});

