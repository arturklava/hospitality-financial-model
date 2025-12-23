/**
 * Advanced Debt Features Tests (v2.10)
 * 
 * Tests for advanced debt features including:
 * - Partial refinancing (refinanceAmountPct)
 * - Senior debt service and senior DSCR calculations
 */

import { describe, it, expect } from 'vitest';
import { runCapitalEngine } from '@engines/capital/capitalEngine';
import type {
  ConsolidatedAnnualPnl,
  UnleveredFcf,
  CapitalStructureConfig,
  DebtTrancheConfig,
} from '@domain/types';

/**
 * Builds a simple consolidated P&L for testing.
 */
function buildConsolidatedPnl(horizonYears: number, noi: number): ConsolidatedAnnualPnl[] {
  const pnl: ConsolidatedAnnualPnl[] = [];
  for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
    pnl.push({
      yearIndex,
      revenueTotal: noi * 1.5, // Revenue is higher than NOI
      cogsTotal: 0,
      opexTotal: noi * 0.5, // OPEX = Revenue - NOI
      ebitda: noi,
      departmentalExpenses: 0,
      gop: noi * 1.5,
      undistributedExpenses: noi * 0.5,
      maintenanceCapex: 0,
      cashFlow: noi,
      noi,
    });
  }
  return pnl;
}

/**
 * Builds a simple unlevered FCF for testing.
 */
function buildUnleveredFcf(horizonYears: number, fcf: number): UnleveredFcf[] {
  const unleveredFcf: UnleveredFcf[] = [];
  for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
    unleveredFcf.push({
      yearIndex,
      noi: fcf * 1.2, // NOI is higher than FCF
      maintenanceCapex: fcf * 0.1,
      changeInWorkingCapital: fcf * 0.1,
      unleveredFreeCashFlow: fcf,
    });
  }
  return unleveredFcf;
}

describe('Advanced Debt Features (v2.10)', () => {
  describe('Partial Refinancing', () => {
    it('should handle full refinancing (refinanceAmountPct = 1.0)', () => {
      const horizonYears = 5;
      const noi = 1_000_000;
      const consolidatedPnl = buildConsolidatedPnl(horizonYears, noi);
      const unleveredFcf = buildUnleveredFcf(horizonYears, noi);

      const tranche: DebtTrancheConfig = {
        id: 'loan-1',
        initialPrincipal: 5_000_000,
        interestRate: 0.06,
        termYears: 10,
        amortizationType: 'mortgage',
        refinanceAtYear: 3,
        refinanceAmountPct: 1.0, // Full refinancing
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 10_000_000,
        debtTranches: [tranche],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Check that at year 3, the loan is fully repaid
      const year3Entry = result.debtSchedule.entries[3];
      expect(year3Entry.endingBalance).toBe(0);
      expect(year3Entry.principal).toBeGreaterThan(0);

      // Check that after year 3, the loan has no balance
      for (let yearIndex = 4; yearIndex < horizonYears; yearIndex++) {
        const entry = result.debtSchedule.entries[yearIndex];
        expect(entry.beginningBalance).toBe(0);
        expect(entry.endingBalance).toBe(0);
        expect(entry.interest).toBe(0);
        expect(entry.principal).toBe(0);
      }
    });

    it('should handle partial refinancing (refinanceAmountPct = 0.5)', () => {
      const horizonYears = 5;
      const noi = 1_000_000;
      const consolidatedPnl = buildConsolidatedPnl(horizonYears, noi);
      const unleveredFcf = buildUnleveredFcf(horizonYears, noi);

      const tranche: DebtTrancheConfig = {
        id: 'loan-1',
        initialPrincipal: 5_000_000,
        interestRate: 0.06,
        termYears: 10,
        amortizationType: 'mortgage',
        refinanceAtYear: 3,
        refinanceAmountPct: 0.5, // 50% refinancing
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 10_000_000,
        debtTranches: [tranche],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Check that at year 3, only 50% of the balance is repaid
      const year2Entry = result.debtSchedule.entries[2];
      const year2EndingBalance = year2Entry.endingBalance;
      
      const year3Entry = result.debtSchedule.entries[3];
      const expectedPrincipal = year2EndingBalance * 0.5;
      expect(year3Entry.principal).toBeCloseTo(expectedPrincipal, 0);
      expect(year3Entry.endingBalance).toBeCloseTo(year2EndingBalance * 0.5, 0);

      // Check that after year 3, the loan continues with remaining balance
      const year4Entry = result.debtSchedule.entries[4];
      expect(year4Entry.beginningBalance).toBeGreaterThan(0);
      expect(year4Entry.endingBalance).toBeGreaterThan(0);
    });

    it('should default to full refinancing when refinanceAmountPct is not specified', () => {
      const horizonYears = 5;
      const noi = 1_000_000;
      const consolidatedPnl = buildConsolidatedPnl(horizonYears, noi);
      const unleveredFcf = buildUnleveredFcf(horizonYears, noi);

      const tranche: DebtTrancheConfig = {
        id: 'loan-1',
        initialPrincipal: 5_000_000,
        interestRate: 0.06,
        termYears: 10,
        amortizationType: 'mortgage',
        refinanceAtYear: 3,
        // refinanceAmountPct not specified - should default to 1.0
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 10_000_000,
        debtTranches: [tranche],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Check that at year 3, the loan is fully repaid (default behavior)
      const year3Entry = result.debtSchedule.entries[3];
      expect(year3Entry.endingBalance).toBe(0);
    });
  });

  describe('Senior Debt Service and Senior DSCR', () => {
    it('should calculate senior debt service for senior tranches only', () => {
      const horizonYears = 5;
      const noi = 2_000_000;
      const consolidatedPnl = buildConsolidatedPnl(horizonYears, noi);
      const unleveredFcf = buildUnleveredFcf(horizonYears, noi);

      const seniorTranche: DebtTrancheConfig = {
        id: 'senior-loan',
        initialPrincipal: 5_000_000,
        interestRate: 0.06,
        termYears: 10,
        amortizationType: 'mortgage',
        seniority: 'senior', // Senior tranche
      };

      const mezzTranche: DebtTrancheConfig = {
        id: 'mezz-loan',
        initialPrincipal: 2_000_000,
        interestRate: 0.10,
        termYears: 10,
        amortizationType: 'mortgage',
        seniority: 'subordinate', // Subordinate tranche
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 10_000_000,
        debtTranches: [seniorTranche, mezzTranche],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Check that senior debt service is calculated
      for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
        const kpi = result.debtKpis[yearIndex];
        expect(kpi.seniorDebtService).toBeDefined();
        expect(kpi.seniorDebtService!).toBeGreaterThan(0);
        
        // Senior debt service should be less than total debt service
        const totalDebtService = result.leveredFcfByYear[yearIndex].debtService;
        expect(kpi.seniorDebtService!).toBeLessThan(totalDebtService);
      }
    });

    it('should calculate senior DSCR correctly', () => {
      const horizonYears = 5;
      const noi = 2_000_000;
      const consolidatedPnl = buildConsolidatedPnl(horizonYears, noi);
      const unleveredFcf = buildUnleveredFcf(horizonYears, noi);

      const seniorTranche: DebtTrancheConfig = {
        id: 'senior-loan',
        initialPrincipal: 5_000_000,
        interestRate: 0.06,
        termYears: 10,
        amortizationType: 'mortgage',
        seniority: 'senior',
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 10_000_000,
        debtTranches: [seniorTranche],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Check that senior DSCR is calculated
      for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
        const kpi = result.debtKpis[yearIndex];
        expect(kpi.seniorDscr).toBeDefined();
        
        if (kpi.seniorDscr !== null) {
          // Senior DSCR should be NOI / Senior Debt Service
          const expectedSeniorDscr = noi / kpi.seniorDebtService!;
          expect(kpi.seniorDscr).toBeCloseTo(expectedSeniorDscr, 2);
          
          // Senior DSCR should be >= total DSCR (since senior debt service <= total debt service)
          if (kpi.dscr !== null) {
            expect(kpi.seniorDscr).toBeGreaterThanOrEqual(kpi.dscr);
          }
        }
      }
    });

    it('should have senior DSCR >= total DSCR when there are multiple tranches', () => {
      const horizonYears = 5;
      const noi = 2_000_000;
      const consolidatedPnl = buildConsolidatedPnl(horizonYears, noi);
      const unleveredFcf = buildUnleveredFcf(horizonYears, noi);

      const seniorTranche: DebtTrancheConfig = {
        id: 'senior-loan',
        initialPrincipal: 5_000_000,
        interestRate: 0.06,
        termYears: 10,
        amortizationType: 'mortgage',
        seniority: 'senior',
      };

      const mezzTranche: DebtTrancheConfig = {
        id: 'mezz-loan',
        initialPrincipal: 2_000_000,
        interestRate: 0.10,
        termYears: 10,
        amortizationType: 'mortgage',
        seniority: 'subordinate',
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 10_000_000,
        debtTranches: [seniorTranche, mezzTranche],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Check that senior DSCR >= total DSCR for all years
      for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
        const kpi = result.debtKpis[yearIndex];
        
        if (kpi.seniorDscr !== null && kpi.dscr !== null) {
          // Senior DSCR should be >= total DSCR
          // (since senior debt service <= total debt service, senior DSCR >= total DSCR)
          expect(kpi.seniorDscr).toBeGreaterThanOrEqual(kpi.dscr);
        }
      }
    });

    it('should handle tranches without seniority (default to senior)', () => {
      const horizonYears = 5;
      const noi = 1_000_000;
      const consolidatedPnl = buildConsolidatedPnl(horizonYears, noi);
      const unleveredFcf = buildUnleveredFcf(horizonYears, noi);

      const tranche: DebtTrancheConfig = {
        id: 'loan-1',
        initialPrincipal: 5_000_000,
        interestRate: 0.06,
        termYears: 10,
        amortizationType: 'mortgage',
        type: 'SENIOR', // Use type field instead of seniority
        // seniority not specified
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 10_000_000,
        debtTranches: [tranche],
      };

      const result = runCapitalEngine(consolidatedPnl, unleveredFcf, capitalConfig);

      // Check that senior debt service is calculated (tranche with type='SENIOR' should be treated as senior)
      for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
        const kpi = result.debtKpis[yearIndex];
        expect(kpi.seniorDebtService).toBeDefined();
        expect(kpi.seniorDebtService!).toBeGreaterThan(0);
      }
    });
  });
});

