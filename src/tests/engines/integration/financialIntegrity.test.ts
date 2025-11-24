/**
 * Financial Integrity Integration Tests (v2.10)
 * 
 * Tests for financial integrity and correctness of debt hierarchy and refinancing:
 * 1. Debt Hierarchy Test: Senior ($50M) + Mezz ($20M), assert Senior DSCR > Total DSCR
 * 2. Refi Test: Set Refi % to 50% at Year 5, assert Debt Balance at Year 6 is approx 50% of Year 4 (minus amortization)
 */

import { describe, it, expect } from 'vitest';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  FullModelInput,
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
  DebtTrancheConfig,
  HotelConfig,
} from '@domain/types';
// Note: buildHotelConfig is not used, but kept for potential future use

/**
 * Builds a minimal hotel configuration for testing.
 */
function buildMinimalHotelConfig(): HotelConfig {
  return {
    id: 'test-hotel-1',
    name: 'Test Hotel',
    operationType: 'HOTEL',
    startYear: 2026,
    horizonYears: 7, // Need 7 years for refi test (Year 5 refi, check Year 6)
    keys: 150, // 150 rooms
    avgDailyRate: 300, // $300 per room per night
    occupancyByMonth: Array(12).fill(0.75), // 75% occupancy year-round

    // Revenue mix as % of room revenue
    foodRevenuePctOfRooms: 0.30,
    beverageRevenuePctOfRooms: 0.15,
    otherRevenuePctOfRooms: 0.10,

    // COGS as % of respective revenue
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,

    // Opex as % of total revenue
    payrollPct: 0.35,
    utilitiesPct: 0.05,
    marketingPct: 0.03,
    maintenanceOpexPct: 0.04,
    otherOpexPct: 0.03,

    // Maintenance capex as % of total revenue
    maintenanceCapexPct: 0.02,
  };
}

/**
 * Builds a base input configuration for testing.
 */
function buildBaseInput(): FullModelInput {
  const scenario: ProjectScenario = {
    id: 'test-scenario',
    name: 'Test Scenario',
    startYear: 2026,
    horizonYears: 7,
    operations: [buildMinimalHotelConfig()],
  };

  const projectConfig: ProjectConfig = {
    discountRate: 0.10, // 10% discount rate
    terminalGrowthRate: 0.02, // 2% terminal growth
    initialInvestment: 100_000_000, // $100M initial investment
    workingCapitalPercentage: 0.05, // 5% of revenue
  };

  const waterfallConfig: WaterfallConfig = {
    equityClasses: [
      {
        id: 'lp',
        name: 'Limited Partner',
        contributionPct: 0.9,
      },
      {
        id: 'gp',
        name: 'General Partner',
        contributionPct: 0.1,
      },
    ],
  };

  return {
    scenario,
    projectConfig,
    capitalConfig: {
      initialInvestment: projectConfig.initialInvestment,
      debtTranches: [],
    },
    waterfallConfig,
  };
}

describe('Financial Integrity Integration Tests (v2.10)', () => {
  describe('Debt Hierarchy Test', () => {
    it('should have Senior DSCR > Total DSCR when Senior ($50M) and Mezz ($20M) are present', () => {
      const baseInput = buildBaseInput();

      // Create capital structure with Senior ($50M) and Mezz ($20M)
      const seniorTranche: DebtTrancheConfig = {
        id: 'senior-loan',
        label: 'Senior Loan',
        type: 'SENIOR',
        initialPrincipal: 50_000_000, // $50M
        interestRate: 0.06, // 6% interest rate
        amortizationType: 'mortgage',
        termYears: 10,
        amortizationYears: 10,
        seniority: 'senior',
      };

      const mezzTranche: DebtTrancheConfig = {
        id: 'mezz-loan',
        label: 'Mezzanine Debt',
        type: 'MEZZ',
        initialPrincipal: 20_000_000, // $20M
        interestRate: 0.12, // 12% interest rate (higher than senior)
        amortizationType: 'mortgage',
        termYears: 7,
        amortizationYears: 7,
        seniority: 'subordinate',
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: baseInput.projectConfig.initialInvestment,
        debtTranches: [seniorTranche, mezzTranche],
      };

      const input: FullModelInput = {
        ...baseInput,
        capitalConfig,
      };

      // Run the full model
      const output = runFullModel(input);

      // Verify model execution produces valid results
      expect(output).toBeDefined();
      expect(output.capital.debtKpis).toBeDefined();
      expect(output.capital.debtKpis.length).toBe(7); // 7 years horizon

      // Assert: Senior DSCR > Total DSCR for all years where both are defined
      for (let yearIndex = 0; yearIndex < 7; yearIndex++) {
        const kpi = output.capital.debtKpis[yearIndex];
        
        // Both should be defined and non-null
        expect(kpi.seniorDscr).toBeDefined();
        expect(kpi.dscr).toBeDefined();

        if (kpi.seniorDscr !== null && kpi.dscr !== null) {
          // Senior DSCR should be greater than Total DSCR
          // This is because Senior Debt Service < Total Debt Service (Senior + Mezz)
          // Since NOI is the same, NOI / SeniorDebtService > NOI / TotalDebtService
          expect(kpi.seniorDscr).toBeGreaterThan(kpi.dscr);
          
          // Verify the relationship: Senior Debt Service < Total Debt Service
          const totalDebtService = output.capital.leveredFcfByYear[yearIndex].debtService;
          expect(kpi.seniorDebtService).toBeDefined();
          if (kpi.seniorDebtService !== undefined) {
            expect(kpi.seniorDebtService).toBeLessThan(totalDebtService);
          }
        }
      }

      // Additional verification: Check that senior debt service is calculated correctly
      // Senior debt service should be from senior tranche only
      const year0Kpi = output.capital.debtKpis[0];
      expect(year0Kpi.seniorDebtService).toBeDefined();
      expect(year0Kpi.seniorDebtService!).toBeGreaterThan(0);
      
      // Total debt service should be greater (includes both senior and mezz)
      const year0TotalDebtService = output.capital.leveredFcfByYear[0].debtService;
      expect(year0TotalDebtService).toBeGreaterThan(year0Kpi.seniorDebtService!);
    });
  });

  describe('Refi Test', () => {
    it('should have Debt Balance at Year 6 approx 50% of Year 4 (minus amortization) when Refi % is 50% at Year 5', () => {
      const baseInput = buildBaseInput();

      // Create a single tranche with 50% refinancing at Year 5 (yearIndex 4, since 0-based)
      const tranche: DebtTrancheConfig = {
        id: 'loan-1',
        label: 'Test Loan',
        type: 'SENIOR',
        initialPrincipal: 50_000_000, // $50M
        interestRate: 0.06, // 6% interest rate
        amortizationType: 'mortgage',
        termYears: 10,
        amortizationYears: 10,
        refinanceAtYear: 4, // Year 5 (0-based: yearIndex 4 = Year 5)
        refinanceAmountPct: 0.5, // 50% refinancing
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: baseInput.projectConfig.initialInvestment,
        debtTranches: [tranche],
      };

      const input: FullModelInput = {
        ...baseInput,
        capitalConfig,
      };

      // Run the full model
      const output = runFullModel(input);

      // Verify model execution produces valid results
      expect(output).toBeDefined();
      expect(output.capital.debtSchedule).toBeDefined();
      expect(output.capital.debtSchedule.entries.length).toBe(7); // 7 years horizon

      // Get Year 4 ending balance (yearIndex 3, since 0-based)
      const year4Entry = output.capital.debtSchedule.entries[3];
      const year4EndingBalance = year4Entry.endingBalance;

      // Get Year 5 entry (refinancing year, yearIndex 4)
      const year5Entry = output.capital.debtSchedule.entries[4];
      
      // At Year 5, 50% of the beginning balance should be refinanced
      // Beginning balance at Year 5 = ending balance at Year 4
      const year5BeginningBalance = year5Entry.beginningBalance;
      expect(year5BeginningBalance).toBeCloseTo(year4EndingBalance, 0);
      
      // Principal payment at Year 5 should be 50% of beginning balance
      const expectedPrincipal = year5BeginningBalance * 0.5;
      expect(year5Entry.principal).toBeCloseTo(expectedPrincipal, 0);
      
      // Ending balance at Year 5 should be 50% of beginning balance (minus any amortization)
      // Since we're doing 50% refinancing, the ending balance should be approximately 50% of beginning
      const year5EndingBalance = year5Entry.endingBalance;
      expect(year5EndingBalance).toBeCloseTo(year5BeginningBalance * 0.5, 0);

      // Get Year 6 entry (yearIndex 5)
      const year6Entry = output.capital.debtSchedule.entries[5];
      const year6BeginningBalance = year6Entry.beginningBalance;
      
      // Year 6 beginning balance should equal Year 5 ending balance
      expect(year6BeginningBalance).toBeCloseTo(year5EndingBalance, 0);
      
      // Year 6 beginning balance should be approximately 50% of Year 4 ending balance
      // (minus any amortization that occurred in Year 5)
      // 
      // At Year 5 (refinancing year):
      // - Beginning balance = Year 4 ending balance
      // - Principal payment = 50% of beginning balance (refinancing)
      // - Ending balance = beginning balance - principal = 50% of beginning balance
      // 
      // However, there may be normal amortization in Year 5 on the remaining 50%,
      // so Year 6 beginning balance should be approximately 50% of Year 4, minus amortization
      const expectedYear6Balance = year4EndingBalance * 0.5;
      
      // The actual Year 6 balance will be Year 5 ending balance, which is:
      // Year 5 beginning * (1 - refinanceAmountPct) minus any normal amortization
      // Since refinancing replaces normal amortization in the refinancing year,
      // Year 6 should be approximately 50% of Year 4 ending balance
      // We allow a small tolerance for rounding/amortization effects
      const tolerance = year4EndingBalance * 0.01; // 1% tolerance for amortization effects
      expect(year6BeginningBalance).toBeGreaterThanOrEqual(expectedYear6Balance - tolerance);
      expect(year6BeginningBalance).toBeLessThanOrEqual(expectedYear6Balance + tolerance);
      
      // Verify the relationship: Year 6 should be approximately 50% of Year 4
      const ratio = year6BeginningBalance / year4EndingBalance;
      expect(ratio).toBeCloseTo(0.5, 2); // Within 2 decimal places (0.5%)
    });
  });
});

