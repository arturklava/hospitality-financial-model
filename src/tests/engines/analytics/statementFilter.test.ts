import { describe, it, expect } from 'vitest';
import {
  filterAndAggregatePnl,
  generateCashFlowStatement,
} from '@engines/analytics/statementGenerator';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import { runScenarioEngine } from '@engines/scenario/scenarioEngine';
import type {
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
  HotelConfig,
  FullModelInput,
} from '@domain/types';

/**
 * Builds a minimal hotel configuration for testing.
 */
function buildMinimalHotelConfig(id: string, name: string, revenue: number): HotelConfig {
  return {
    id,
    name,
    operationType: 'HOTEL',
    startYear: 2026,
    horizonYears: 5,
    keys: 50, // 50 rooms
    avgDailyRate: revenue / (50 * 365 * 0.70), // Calculate ADR to achieve target revenue (70% occupancy)
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

    // Explicitly set isREaaS to false (Non-REaaS)
    isREaaS: false,
  };
}

describe('Statement Generator', () => {
  describe('filterAndAggregatePnl', () => {
    it('should filter and aggregate P&L for a single operation', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 5000000);
      const hotel2 = buildMinimalHotelConfig('hotel-2', 'Hotel 2', 3000000);

      const scenario: ProjectScenario = {
        id: 'test-scenario-statement',
        name: 'Test Statement Scenario',
        startYear: 2026,
        horizonYears: 5,
        operations: [hotel1, hotel2],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000,
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [],
      };

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

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      // Filter to only Hotel 1
      const filteredPnl = filterAndAggregatePnl(output, ['hotel-1']);

      // Verify filtered P&L has correct number of years
      expect(filteredPnl.length).toBe(5);

      // Verify Year 1 revenue matches Hotel 1 revenue (approximately)
      // We need to re-run scenario engine to get Hotel 1's individual P&L
      const scenarioResult = runScenarioEngine(output.scenario);
      const hotel1Result = scenarioResult.operations.find(
        (op: any) => op.operationId === 'hotel-1'
      );
      const hotel1Year1Pnl = hotel1Result?.annualPnl.find(
        (pnl: any) => pnl.yearIndex === 0
      );

      if (hotel1Year1Pnl) {
        // Filtered P&L should match Hotel 1's Year 1 revenue
        expect(filteredPnl[0].revenueTotal).toBeCloseTo(hotel1Year1Pnl.revenueTotal, 0);
        expect(filteredPnl[0].noi).toBeCloseTo(hotel1Year1Pnl.noi, 0);
      }

      // Verify filtered P&L is less than or equal to consolidated P&L (since we're filtering)
      expect(filteredPnl[0].revenueTotal).toBeLessThanOrEqual(
        output.consolidatedAnnualPnl[0].revenueTotal
      );
    });

    it('should filter and aggregate P&L for multiple operations', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 5000000);
      const hotel2 = buildMinimalHotelConfig('hotel-2', 'Hotel 2', 3000000);

      const scenario: ProjectScenario = {
        id: 'test-scenario-statement-multi',
        name: 'Test Statement Scenario Multi',
        startYear: 2026,
        horizonYears: 5,
        operations: [hotel1, hotel2],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000,
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [],
      };

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

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      // Filter to both hotels
      const filteredPnl = filterAndAggregatePnl(output, ['hotel-1', 'hotel-2']);

      // Verify filtered P&L matches consolidated P&L (since we selected all operations)
      expect(filteredPnl.length).toBe(5);
      for (let yearIndex = 0; yearIndex < 5; yearIndex++) {
        expect(filteredPnl[yearIndex].revenueTotal).toBeCloseTo(
          output.consolidatedAnnualPnl[yearIndex].revenueTotal,
          0
        );
        expect(filteredPnl[yearIndex].noi).toBeCloseTo(
          output.consolidatedAnnualPnl[yearIndex].noi,
          0
        );
      }
    });

    /**
     * v5.7 Data Integrity Test: Verify that "Select All" produces the exact same numbers
     * as the main Dashboard (Consolidated).
     * 
     * This test ensures that when all operations are selected, the filtered aggregation
     * matches the pre-calculated consolidatedAnnualPnl from the model pipeline.
     */
    it('should produce exact same numbers as Dashboard consolidated when Select All is used', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 5000000);
      const hotel2 = buildMinimalHotelConfig('hotel-2', 'Hotel 2', 3000000);
      const hotel3 = buildMinimalHotelConfig('hotel-3', 'Hotel 3', 2000000);

      const scenario: ProjectScenario = {
        id: 'test-scenario-select-all',
        name: 'Test Select All Data Integrity',
        startYear: 2026,
        horizonYears: 5,
        operations: [hotel1, hotel2, hotel3],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000,
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [],
      };

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

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      // Get all operation IDs (simulating "Select All")
      const allOperationIds = output.scenario.operations.map(op => op.id);
      expect(allOperationIds.length).toBe(3); // Verify we have all 3 operations

      // Filter with all operations selected (Select All)
      const filteredPnl = filterAndAggregatePnl(output, allOperationIds);

      // Verify filtered P&L matches consolidated P&L EXACTLY for all fields
      expect(filteredPnl.length).toBe(output.consolidatedAnnualPnl.length);
      
      for (let yearIndex = 0; yearIndex < filteredPnl.length; yearIndex++) {
        const filtered = filteredPnl[yearIndex];
        const consolidated = output.consolidatedAnnualPnl[yearIndex];

        // Verify all financial fields match exactly (within floating point precision)
        expect(filtered.revenueTotal).toBeCloseTo(consolidated.revenueTotal, 0);
        expect(filtered.departmentalExpenses).toBeCloseTo(consolidated.departmentalExpenses, 0);
        expect(filtered.gop).toBeCloseTo(consolidated.gop, 0);
        expect(filtered.undistributedExpenses).toBeCloseTo(consolidated.undistributedExpenses, 0);
        expect(filtered.managementFees ?? 0).toBeCloseTo(consolidated.managementFees ?? 0, 0);
        expect(filtered.nonOperatingIncomeExpense ?? 0).toBeCloseTo(consolidated.nonOperatingIncomeExpense ?? 0, 0);
        expect(filtered.noi).toBeCloseTo(consolidated.noi, 0);
        
        // Legacy fields (for backward compatibility)
        expect(filtered.cogsTotal).toBeCloseTo(consolidated.cogsTotal, 0);
        expect(filtered.opexTotal).toBeCloseTo(consolidated.opexTotal, 0);
        expect(filtered.ebitda).toBeCloseTo(consolidated.ebitda, 0);
        expect(filtered.maintenanceCapex).toBeCloseTo(consolidated.maintenanceCapex, 0);
        expect(filtered.cashFlow).toBeCloseTo(consolidated.cashFlow, 0);
        
        // Verify yearIndex matches
        expect(filtered.yearIndex).toBe(consolidated.yearIndex);
      }
    });

    /**
     * v5.7 Data Integrity Test: Verify that selecting NO operations results in 0 Revenue
     * and all financial fields are zero.
     * 
     * This test ensures that when no operations are selected, the filter correctly
     * returns zero values for all financial metrics.
     */
    it('should handle empty selection gracefully and return 0 Revenue', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 5000000);
      const hotel2 = buildMinimalHotelConfig('hotel-2', 'Hotel 2', 3000000);

      const scenario: ProjectScenario = {
        id: 'test-scenario-empty',
        name: 'Test Empty Selection',
        startYear: 2026,
        horizonYears: 5,
        operations: [hotel1, hotel2],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000,
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [],
      };

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

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      // Filter to no operations (empty selection - NO operations selected)
      const filteredPnl = filterAndAggregatePnl(output, []);

      // Verify filtered P&L has correct structure but all zeros
      expect(filteredPnl.length).toBe(5);
      for (let yearIndex = 0; yearIndex < 5; yearIndex++) {
        const filtered = filteredPnl[yearIndex];
        
        // Verify Revenue is 0 (primary requirement)
        expect(filtered.revenueTotal).toBe(0);
        
        // Verify all financial fields are zero
        expect(filtered.departmentalExpenses).toBe(0);
        expect(filtered.gop).toBe(0);
        expect(filtered.undistributedExpenses).toBe(0);
        expect(filtered.managementFees).toBe(0);
        expect(filtered.nonOperatingIncomeExpense).toBe(0);
        expect(filtered.noi).toBe(0);
        
        // Legacy fields
        expect(filtered.cogsTotal).toBe(0);
        expect(filtered.opexTotal).toBe(0);
        expect(filtered.ebitda).toBe(0);
        expect(filtered.maintenanceCapex).toBe(0);
        expect(filtered.cashFlow).toBe(0);
        
        // Verify yearIndex is correct
        expect(filtered.yearIndex).toBe(yearIndex);
      }
    });

    it('should correctly aggregate undistributed expenses per operation', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 5000000);
      const hotel2 = buildMinimalHotelConfig('hotel-2', 'Hotel 2', 3000000);

      const scenario: ProjectScenario = {
        id: 'test-scenario-undistributed',
        name: 'Test Undistributed Expenses',
        startYear: 2026,
        horizonYears: 5,
        operations: [hotel1, hotel2],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000,
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [],
      };

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

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      // Get individual operation P&L
      const scenarioResult = runScenarioEngine(output.scenario);
      const hotel1Result = scenarioResult.operations.find(
        (op: any) => op.operationId === 'hotel-1'
      );
      const hotel2Result = scenarioResult.operations.find(
        (op: any) => op.operationId === 'hotel-2'
      );

      const hotel1Year1Pnl = hotel1Result?.annualPnl.find(
        (pnl: any) => pnl.yearIndex === 0
      );
      const hotel2Year1Pnl = hotel2Result?.annualPnl.find(
        (pnl: any) => pnl.yearIndex === 0
      );

      if (hotel1Year1Pnl && hotel2Year1Pnl) {
        // Filter to both hotels
        const filteredPnl = filterAndAggregatePnl(output, ['hotel-1', 'hotel-2']);

        // Undistributed expenses should equal sum of individual operations' opexTotal
        const expectedUndistributed =
          hotel1Year1Pnl.opexTotal + hotel2Year1Pnl.opexTotal;

        expect(filteredPnl[0].undistributedExpenses).toBeCloseTo(
          expectedUndistributed,
          0
        );
      }
    });
  });

  describe('generateCashFlowStatement', () => {
    it('should generate cash flow statement from P&L and capital structure', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 5000000);

      const scenario: ProjectScenario = {
        id: 'test-scenario-cashflow',
        name: 'Test Cash Flow Statement',
        startYear: 2026,
        horizonYears: 5,
        operations: [hotel1],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000,
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [
          {
            id: 'senior-debt',
            label: 'Senior Debt',
            initialPrincipal: 20000000, // $20M
            interestRate: 0.05, // 5%
            termYears: 10,
            startYear: 2026,
            amortizationType: 'mortgage',
          },
        ],
      };

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

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      // Filter to Hotel 1
      const filteredPnl = filterAndAggregatePnl(output, ['hotel-1']);

      // Generate cash flow statement
      const cashFlowStatement = generateCashFlowStatement(filteredPnl, output.capital);

      // Verify cash flow statement structure
      expect(cashFlowStatement.length).toBe(5);

      // Verify Year 1 cash flow
      const year1CashFlow = cashFlowStatement.find((cf) => cf.yearIndex === 0);
      expect(year1CashFlow).toBeDefined();
      if (year1CashFlow) {
        // NOI should come from filtered P&L
        expect(year1CashFlow.noi).toBeCloseTo(filteredPnl[0].noi, 0);

        // Maintenance Capex should come from filtered P&L
        expect(year1CashFlow.maintenanceCapex).toBeCloseTo(
          filteredPnl[0].maintenanceCapex,
          0
        );

        // Debt Service should come from capital engine result
        const year1DebtService = output.capital.debtSchedule.entries.find(
          (entry) => entry.yearIndex === 0
        );
        if (year1DebtService) {
          expect(year1CashFlow.debtService).toBeCloseTo(
            year1DebtService.interest + year1DebtService.principal,
            0
          );
          expect(year1CashFlow.interest).toBeCloseTo(year1DebtService.interest, 0);
          expect(year1CashFlow.principal).toBeCloseTo(year1DebtService.principal, 0);
        }

        // Net Cash Flow = NOI - Maintenance Capex - Debt Service
        const expectedNetCashFlow =
          year1CashFlow.noi - year1CashFlow.maintenanceCapex - year1CashFlow.debtService;
        expect(year1CashFlow.netCashFlow).toBeCloseTo(expectedNetCashFlow, 0);
      }
    });

    it('should handle zero debt service correctly', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 5000000);

      const scenario: ProjectScenario = {
        id: 'test-scenario-cashflow-no-debt',
        name: 'Test Cash Flow No Debt',
        startYear: 2026,
        horizonYears: 5,
        operations: [hotel1],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000,
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [], // No debt
      };

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

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      // Filter to Hotel 1
      const filteredPnl = filterAndAggregatePnl(output, ['hotel-1']);

      // Generate cash flow statement
      const cashFlowStatement = generateCashFlowStatement(filteredPnl, output.capital);

      // Verify debt service is zero
      const year1CashFlow = cashFlowStatement.find((cf) => cf.yearIndex === 0);
      expect(year1CashFlow).toBeDefined();
      if (year1CashFlow) {
        expect(year1CashFlow.debtService).toBe(0);
        expect(year1CashFlow.interest).toBe(0);
        expect(year1CashFlow.principal).toBe(0);

        // Net Cash Flow = NOI - Maintenance Capex (no debt service)
        const expectedNetCashFlow =
          year1CashFlow.noi - year1CashFlow.maintenanceCapex;
        expect(year1CashFlow.netCashFlow).toBeCloseTo(expectedNetCashFlow, 0);
      }
    });
  });
});

