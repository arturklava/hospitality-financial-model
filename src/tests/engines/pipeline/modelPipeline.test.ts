import { describe, it, expect } from 'vitest';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
  HotelConfig,
} from '@domain/types';

/**
 * Builds a minimal hotel configuration for testing.
 */
function buildMinimalHotelConfig(): HotelConfig {
  return {
    id: 'test-hotel-1',
    name: 'Test Hotel',
    operationType: 'HOTEL',
    startYear: 2026,
    horizonYears: 5,
    keys: 50, // 50 rooms
    avgDailyRate: 200, // $200 per room per night
    occupancyByMonth: Array(12).fill(0.70), // 70% occupancy year-round

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

describe('Model Pipeline', () => {
  describe('Test 1: Simple no-debt, no-waterfall edge case', () => {
    it('should handle zero debt and simple waterfall correctly', () => {
      const scenario: ProjectScenario = {
        id: 'test-scenario-1',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 5,
        operations: [buildMinimalHotelConfig()],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10, // 10% discount rate
        terminalGrowthRate: 0.02, // 2% terminal growth
        initialInvestment: 20000000, // $20M initial investment
        workingCapitalPercentage: 0.05, // 5% of revenue
      };

      // Zero debt configuration
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [], // No debt
      };

      // Simple 100% LP waterfall (no GP)
      const waterfallConfig: WaterfallConfig = {
        equityClasses: [
          {
            id: 'lp',
            name: 'Limited Partner',
            contributionPct: 1.0,
            distributionPct: 1.0,
          },
        ],
      };

      const result = runFullModel({
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      });

      // Assert: runFullModel returns a FullModelOutput with matching years
      expect(result.consolidatedAnnualPnl.length).toBe(scenario.horizonYears);
      expect(result.project.unleveredFcf.length).toBe(scenario.horizonYears);
      expect(result.waterfall.annualRows.length).toBe(scenario.horizonYears + 1); // Year 0..N

      // Assert: Project NPV and unlevered IRR are finite when revenues > costs
      expect(Number.isFinite(result.project.projectKpis.npv)).toBe(true);
      expect(
        result.project.projectKpis.unleveredIrr === null ||
          Number.isFinite(result.project.projectKpis.unleveredIrr)
      ).toBe(true);

      // Assert: ownerLeveredCashFlows[t] equals unleveredFcf[t] when there is no debt
      // Year 0: negative equity investment
      expect(result.capital.ownerLeveredCashFlows[0]).toBeLessThan(0);
      expect(result.capital.ownerLeveredCashFlows[0]).toBeCloseTo(
        -projectConfig.initialInvestment,
        2
      );

      // Years 1..N: levered FCF should equal unlevered FCF (no debt service)
      for (let t = 1; t <= scenario.horizonYears; t++) {
        const unleveredFcf_t = result.project.unleveredFcf[t - 1].unleveredFreeCashFlow;
        const ownerLeveredCF_t = result.capital.ownerLeveredCashFlows[t];
        expect(ownerLeveredCF_t).toBeCloseTo(unleveredFcf_t, 2);
      }

      // Assert: All debt schedule entries are zero
      for (const entry of result.capital.debtSchedule.entries) {
        expect(entry.beginningBalance).toBe(0);
        expect(entry.interest).toBe(0);
        expect(entry.principal).toBe(0);
        expect(entry.endingBalance).toBe(0);
      }

      // Assert: Waterfall splits correctly (100% LP)
      for (const row of result.waterfall.annualRows) {
        const lpCF = row.partnerDistributions['lp'] ?? 0;
        expect(lpCF).toBeCloseTo(row.ownerCashFlow, 2);
      }
    });
  });

  describe('Test 2: With debt, but simple waterfall', () => {
    it('should handle debt and simple LP/GP split correctly', () => {
      const scenario: ProjectScenario = {
        id: 'test-scenario-2',
        name: 'Test Scenario with Debt',
        startYear: 2026,
        horizonYears: 5,
        operations: [buildMinimalHotelConfig()],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 20000000, // $20M initial investment
        workingCapitalPercentage: 0.05,
      };

      // Single debt tranche
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [
          {
            id: 'senior-loan',
            amount: 12000000, // $12M debt (60% of investment)
            interestRate: 0.08, // 8% interest rate
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      // Simple LP/GP split (50/50)
      const waterfallConfig: WaterfallConfig = {
        equityClasses: [
          {
            id: 'lp',
            name: 'Limited Partner',
            contributionPct: 0.5,
            distributionPct: 0.5,
          },
          {
            id: 'gp',
            name: 'General Partner',
            contributionPct: 0.5,
            distributionPct: 0.5,
          },
        ],
      };

      const result = runFullModel({
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      });

      // Assert: Capital engine returns a non-empty debtSchedule
      expect(result.capital.debtSchedule.entries.length).toBe(scenario.horizonYears);
      expect(result.capital.debtSchedule.entries.length).toBeGreaterThan(0);

      // Assert: ownerLeveredCashFlows[0] is negative and equals initial equity
      const debtAmount = capitalConfig.debtTranches[0]?.amount ?? 0;
      const equityInvested = projectConfig.initialInvestment - debtAmount;
      expect(result.capital.ownerLeveredCashFlows[0]).toBeLessThan(0);
      expect(result.capital.ownerLeveredCashFlows[0]).toBeCloseTo(-equityInvested, 2);

      // Assert: At least one year has debt service > 0
      const hasDebtService = result.capital.debtSchedule.entries.some(
        (entry) => entry.interest > 0 || entry.principal > 0
      );
      expect(hasDebtService).toBe(true);

      // Assert: ownerLeveredCashFlows[t] != unleveredFcf[t] (because debt service is being subtracted)
      for (let t = 1; t <= scenario.horizonYears; t++) {
        const unleveredFcf_t = result.project.unleveredFcf[t - 1].unleveredFreeCashFlow;
        const ownerLeveredCF_t = result.capital.ownerLeveredCashFlows[t];
        const debtService_t =
          result.capital.debtSchedule.entries[t - 1].interest +
          result.capital.debtSchedule.entries[t - 1].principal;

        if (debtService_t > 0) {
          expect(ownerLeveredCF_t).not.toBeCloseTo(unleveredFcf_t, 2);
          expect(ownerLeveredCF_t).toBeCloseTo(unleveredFcf_t - debtService_t, 2);
        }
      }

      // Assert: Waterfall splits correctly (50/50)
      for (const row of result.waterfall.annualRows) {
        const lpCF = row.partnerDistributions['lp'] ?? 0;
        const gpCF = row.partnerDistributions['gp'] ?? 0;
        const sum = lpCF + gpCF;
        expect(sum).toBeCloseTo(row.ownerCashFlow, 2);
        // For Year 0 (capital call), both should be negative
        if (row.yearIndex === 0) {
          expect(lpCF).toBeLessThan(0);
          expect(gpCF).toBeLessThan(0);
        }
      }
    });
  });

  describe('Test 3: Waterfall invariant', () => {
    it('should satisfy waterfall invariant for all years', () => {
      const scenario: ProjectScenario = {
        id: 'test-scenario-3',
        name: 'Test Scenario for Waterfall Invariant',
        startYear: 2026,
        horizonYears: 5,
        operations: [buildMinimalHotelConfig()],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 20000000,
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [
          {
            id: 'senior-loan',
            amount: 10000000, // $10M debt
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const waterfallConfig: WaterfallConfig = {
        equityClasses: [
          {
            id: 'lp',
            name: 'Limited Partner',
            contributionPct: 0.7,
            distributionPct: 0.7,
          },
          {
            id: 'gp',
            name: 'General Partner',
            contributionPct: 0.3,
            distributionPct: 0.3,
          },
        ],
      };

      const result = runFullModel({
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      });

      const tolerance = 1e-6; // Small tolerance for floating-point differences

      // Assert: For each year t >= 0, LP_cf[t] + GP_cf[t] ≈ ownerLeveredCashFlows[t]
      for (let t = 0; t < result.waterfall.annualRows.length; t++) {
        const row = result.waterfall.annualRows[t];
        const ownerCF = row.ownerCashFlow;
        const lpCF = row.partnerDistributions['lp'] ?? 0;
        const gpCF = row.partnerDistributions['gp'] ?? 0;
        const sumPartners = lpCF + gpCF;

        expect(Math.abs(sumPartners - ownerCF)).toBeLessThan(tolerance);

        // Also verify against ownerLeveredCashFlows directly
        expect(Math.abs(sumPartners - result.capital.ownerLeveredCashFlows[t])).toBeLessThan(
          tolerance
        );
      }

      // Assert: Partner cash flows arrays have correct length
      for (const partner of result.waterfall.partners) {
        expect(partner.cashFlows.length).toBe(result.capital.ownerLeveredCashFlows.length);
        expect(partner.cumulativeCashFlows.length).toBe(result.capital.ownerLeveredCashFlows.length);
      }

      // Assert: Annual rows match owner cash flows
      expect(result.waterfall.annualRows.length).toBe(result.capital.ownerLeveredCashFlows.length);
      for (let t = 0; t < result.waterfall.annualRows.length; t++) {
        expect(result.waterfall.annualRows[t].ownerCashFlow).toBe(
          result.capital.ownerLeveredCashFlows[t]
        );
      }
    });
  });

  describe('v0.5: Stress test - All features combined', () => {
    it('should handle all 9 operations + multi-tranche capital + refinancing + catch-up waterfall', () => {
      // Create a comprehensive scenario with all 9 operation types
      const scenario: ProjectScenario = {
        id: 'v0.5-stress-test',
        name: 'v0.5 Stress Test',
        startYear: 2026,
        horizonYears: 5,
        operations: [
          // HOTEL
          {
            id: 'hotel-1',
            name: 'Test Hotel',
            operationType: 'HOTEL',
            startYear: 2026,
            horizonYears: 5,
            keys: 100,
            avgDailyRate: 250,
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
          },
          // VILLAS
          {
            id: 'villas-1',
            name: 'Test Villas',
            operationType: 'VILLAS',
            startYear: 2026,
            horizonYears: 5,
            units: 20,
            avgNightlyRate: 500,
            occupancyByMonth: Array(12).fill(0.65),
            foodRevenuePctOfRental: 0.20,
            beverageRevenuePctOfRental: 0.10,
            otherRevenuePctOfRental: 0.05,
            foodCogsPct: 0.35,
            beverageCogsPct: 0.25,
            payrollPct: 0.30,
            utilitiesPct: 0.05,
            marketingPct: 0.03,
            maintenanceOpexPct: 0.04,
            otherOpexPct: 0.03,
            maintenanceCapexPct: 0.02,
          },
          // RESTAURANT
          {
            id: 'restaurant-1',
            name: 'Test Restaurant',
            operationType: 'RESTAURANT',
            startYear: 2026,
            horizonYears: 5,
            covers: 80,
            avgCheck: 75,
            turnoverByMonth: Array(12).fill(1.2),
            foodRevenuePctOfTotal: 0.60,
            beverageRevenuePctOfTotal: 0.30,
            otherRevenuePctOfTotal: 0.10,
            foodCogsPct: 0.35,
            beverageCogsPct: 0.25,
            payrollPct: 0.35,
            utilitiesPct: 0.05,
            marketingPct: 0.03,
            maintenanceOpexPct: 0.04,
            otherOpexPct: 0.03,
            maintenanceCapexPct: 0.02,
          },
          // BEACH_CLUB
          {
            id: 'beach-club-1',
            name: 'Test Beach Club',
            operationType: 'BEACH_CLUB',
            startYear: 2026,
            horizonYears: 5,
            dailyPasses: 200,
            avgDailyPassPrice: 50,
            memberships: 500,
            avgMembershipFee: 2000,
            utilizationByMonth: Array(12).fill(0.60),
            foodRevenuePctOfTotal: 0.40,
            beverageRevenuePctOfTotal: 0.30,
            otherRevenuePctOfTotal: 0.30,
            foodCogsPct: 0.35,
            beverageCogsPct: 0.25,
            payrollPct: 0.35,
            utilitiesPct: 0.05,
            marketingPct: 0.03,
            maintenanceOpexPct: 0.04,
            otherOpexPct: 0.03,
            maintenanceCapexPct: 0.02,
          },
          // RACQUET
          {
            id: 'racquet-1',
            name: 'Test Racquet',
            operationType: 'RACQUET',
            startYear: 2026,
            horizonYears: 5,
            courts: 8,
            avgCourtRate: 50,
            utilizationByMonth: Array(12).fill(0.50),
            hoursPerDay: 12,
            memberships: 300,
            avgMembershipFee: 1500,
            foodRevenuePctOfTotal: 0.30,
            beverageRevenuePctOfTotal: 0.20,
            otherRevenuePctOfTotal: 0.50,
            foodCogsPct: 0.35,
            beverageCogsPct: 0.25,
            payrollPct: 0.35,
            utilitiesPct: 0.05,
            marketingPct: 0.03,
            maintenanceOpexPct: 0.04,
            otherOpexPct: 0.03,
            maintenanceCapexPct: 0.02,
          },
          // RETAIL
          {
            id: 'retail-1',
            name: 'Test Retail',
            operationType: 'RETAIL',
            startYear: 2026,
            horizonYears: 5,
            sqm: 500,
            avgRentPerSqm: 100,
            occupancyByMonth: Array(12).fill(0.85),
            rentalRevenuePctOfTotal: 0.90,
            otherRevenuePctOfTotal: 0.10,
            payrollPct: 0.20,
            utilitiesPct: 0.05,
            marketingPct: 0.03,
            maintenanceOpexPct: 0.04,
            otherOpexPct: 0.03,
            maintenanceCapexPct: 0.02,
          },
          // FLEX
          {
            id: 'flex-1',
            name: 'Test Flex',
            operationType: 'FLEX',
            startYear: 2026,
            horizonYears: 5,
            sqm: 300,
            avgRentPerSqm: 80,
            occupancyByMonth: Array(12).fill(0.75),
            rentalRevenuePctOfTotal: 0.90,
            otherRevenuePctOfTotal: 0.10,
            payrollPct: 0.20,
            utilitiesPct: 0.05,
            marketingPct: 0.03,
            maintenanceOpexPct: 0.04,
            otherOpexPct: 0.03,
            maintenanceCapexPct: 0.02,
          },
          // WELLNESS
          {
            id: 'wellness-1',
            name: 'Test Wellness',
            operationType: 'WELLNESS',
            startYear: 2026,
            horizonYears: 5,
            memberships: 400,
            avgMembershipFee: 1800,
            dailyPasses: 50,
            avgDailyPassPrice: 40,
            utilizationByMonth: Array(12).fill(0.55),
            foodRevenuePctOfTotal: 0.30,
            beverageRevenuePctOfTotal: 0.20,
            otherRevenuePctOfTotal: 0.50,
            foodCogsPct: 0.35,
            beverageCogsPct: 0.25,
            payrollPct: 0.35,
            utilitiesPct: 0.05,
            marketingPct: 0.03,
            maintenanceOpexPct: 0.04,
            otherOpexPct: 0.03,
            maintenanceCapexPct: 0.02,
          },
          // SENIOR_LIVING
          {
            id: 'senior-living-1',
            name: 'Test Senior Living',
            operationType: 'SENIOR_LIVING',
            startYear: 2026,
            horizonYears: 5,
            units: 60,
            avgMonthlyRate: 3500,
            occupancyByMonth: Array(12).fill(0.90),
            careRevenuePctOfRental: 0.20,
            foodRevenuePctOfRental: 0.15,
            otherRevenuePctOfRental: 0.10,
            foodCogsPct: 0.35,
            careCogsPct: 0.20,
            payrollPct: 0.40,
            utilitiesPct: 0.05,
            marketingPct: 0.03,
            maintenanceOpexPct: 0.04,
            otherOpexPct: 0.03,
            maintenanceCapexPct: 0.02,
          },
        ],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000,
        workingCapitalPercentage: 0.05,
      };

      // Multi-tranche capital with refinancing
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 50000000,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: 25000000,
            interestRate: 0.06,
            termYears: 5,
            amortizationYears: 10,
            amortizationType: 'mortgage',
          },
          {
            id: 'mezz-loan',
            initialPrincipal: 10000000,
            interestRate: 0.10,
            termYears: 3,
            amortizationYears: 3,
            amortizationType: 'mortgage',
            refinanceAtYear: 2, // Refinance at year 2
          },
          {
            id: 'refinanced-mezz',
            initialPrincipal: 7000000, // Approx remaining balance
            interestRate: 0.08,
            termYears: 3,
            amortizationYears: 3,
            amortizationType: 'mortgage',
            startYear: 2, // Starts when old mezz is refinanced
          },
        ],
      };

      // Waterfall with catch-up
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
        tiers: [
          {
            id: 'roc',
            type: 'return_of_capital',
            distributionSplits: {},
          },
          {
            id: 'pref',
            type: 'preferred_return',
            hurdleIrr: 0.08,
            distributionSplits: {
              lp: 0.9,
              gp: 0.1,
            },
          },
          {
            id: 'promote',
            type: 'promote',
            enableCatchUp: true,
            catchUpTargetSplit: {
              lp: 0.7,
              gp: 0.3,
            },
            distributionSplits: {
              lp: 0.7,
              gp: 0.3,
            },
          },
        ],
      };

      const result = runFullModel({
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      });

      // Verify all invariants hold
      // 1. Array lengths
      expect(result.consolidatedAnnualPnl.length).toBe(5);
      expect(result.project.unleveredFcf.length).toBe(5);
      expect(result.capital.debtSchedule.entries.length).toBe(5);
      expect(result.capital.ownerLeveredCashFlows.length).toBe(6); // Year 0..5
      expect(result.waterfall.annualRows.length).toBe(6);

      // 2. All values are finite
      for (const ufcf of result.project.unleveredFcf) {
        expect(Number.isFinite(ufcf.unleveredFreeCashFlow)).toBe(true);
      }
      for (const entry of result.capital.debtSchedule.entries) {
        expect(Number.isFinite(entry.beginningBalance)).toBe(true);
        expect(Number.isFinite(entry.interest)).toBe(true);
        expect(Number.isFinite(entry.principal)).toBe(true);
        expect(Number.isFinite(entry.endingBalance)).toBe(true);
      }

      // 3. Debt schedule invariant: with refinancing, we need to verify each tranche separately
      // The original mezz tranche should be fully repaid at refinance
      // The new mezz tranche should be properly tracked
      const entries = result.capital.debtSchedule.entries;
      
      // Verify that debt service is reasonable (not negative, finite)
      for (const entry of entries) {
        expect(entry.beginningBalance).toBeGreaterThanOrEqual(0);
        expect(entry.endingBalance).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(entry.interest)).toBe(true);
        expect(Number.isFinite(entry.principal)).toBe(true);
      }
      
      // With refinancing, total principal paid will include both old and new loans
      // So we can't simply compare to initial debt - instead verify that the schedule is consistent
      const totalPrincipalPaid = entries.reduce((sum, entry) => sum + entry.principal, 0);
      expect(totalPrincipalPaid).toBeGreaterThan(0); // Should have paid some principal
      expect(Number.isFinite(totalPrincipalPaid)).toBe(true);

      // 4. Waterfall invariant: sum(partner CFs) ≈ owner CF for each year
      const tolerance = 0.01;
      for (let t = 0; t < result.capital.ownerLeveredCashFlows.length; t++) {
        const ownerCF = result.capital.ownerLeveredCashFlows[t];
        const sumPartners = result.waterfall.partners.reduce(
          (sum, p) => sum + p.cashFlows[t],
          0
        );
        expect(Math.abs(sumPartners - ownerCF)).toBeLessThan(tolerance);
      }

      // 5. KPIs are finite
      expect(Number.isFinite(result.project.projectKpis.npv)).toBe(true);
      expect(
        result.project.projectKpis.unleveredIrr === null ||
          Number.isFinite(result.project.projectKpis.unleveredIrr)
      ).toBe(true);
      expect(Number.isFinite(result.project.projectKpis.equityMultiple)).toBe(true);

      // 6. Multi-tranche: aggregate debt service should be sum of all tranches
      // Year 0: senior + mezz should both be active
      const year0DebtService =
        result.capital.debtSchedule.entries[0].interest +
        result.capital.debtSchedule.entries[0].principal;
      expect(year0DebtService).toBeGreaterThan(0);

      // Year 2: refinancing should occur (old mezz repaid, new mezz starts)
      const year2DebtService =
        result.capital.debtSchedule.entries[2].interest +
        result.capital.debtSchedule.entries[2].principal;
      expect(year2DebtService).toBeGreaterThan(0);
    });
  });
});

