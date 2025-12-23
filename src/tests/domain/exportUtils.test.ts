import { describe, it, expect } from 'vitest';
import {
  flattenAssumptions,
  flattenCashFlow,
} from '@domain/exportUtils';
import type { NamedScenario, ConsolidatedAnnualPnl } from '@domain/types';
import { buildHotelConfig } from '../helpers/buildOperationConfig';
import { buildSingleTrancheCapitalConfig } from '../helpers/buildCapitalConfig';
import { buildBaselineWaterfallConfig } from '../helpers/buildWaterfallConfig';

/**
 * Builds a minimal valid NamedScenario for testing.
 */
function buildTestScenario(overrides?: Partial<NamedScenario>): NamedScenario {
  return {
    id: 'test-scenario-1',
    name: 'Test Scenario',
    description: 'A test scenario for export',
    modelConfig: {
      scenario: {
        id: 'scenario-1',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 5,
        operations: [buildHotelConfig()],
      },
      projectConfig: {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 10000000,
        workingCapitalPercentage: 0.05,
        taxRate: 0.25,
      },
      capitalConfig: buildSingleTrancheCapitalConfig(),
      waterfallConfig: buildBaselineWaterfallConfig(),
    },
    ...overrides,
  };
}

describe('Export Utils (v0.13)', () => {
  describe('flattenAssumptions', () => {
    it('should return an array of FlattenedAssumption objects', () => {
      const scenario = buildTestScenario();
      const result = flattenAssumptions(scenario);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(row => {
        expect(row).toHaveProperty('Category');
        expect(row).toHaveProperty('Item');
        expect(row).toHaveProperty('Value');
        expect(typeof row.Category).toBe('string');
        expect(typeof row.Item).toBe('string');
        expect(
          typeof row.Value === 'string' ||
            typeof row.Value === 'number' ||
            typeof row.Value === 'boolean'
        ).toBe(true);
      });
    });

    it('should include scenario metadata', () => {
      const scenario = buildTestScenario();
      const result = flattenAssumptions(scenario);

      const idRow = result.find(r => r.Item === 'ID' && r.Category === 'Scenario');
      expect(idRow).toBeDefined();
      expect(idRow?.Value).toBe('test-scenario-1');

      const nameRow = result.find(
        r => r.Item === 'Name' && r.Category === 'Scenario'
      );
      expect(nameRow).toBeDefined();
      expect(nameRow?.Value).toBe('Test Scenario');

      const descRow = result.find(
        r => r.Item === 'Description' && r.Category === 'Scenario'
      );
      expect(descRow).toBeDefined();
      expect(descRow?.Value).toBe('A test scenario for export');
    });

    it('should include project config fields', () => {
      const scenario = buildTestScenario();
      const result = flattenAssumptions(scenario);

      const discountRateRow = result.find(
        r => r.Item === 'Discount Rate' && r.Category === 'Project Config'
      );
      expect(discountRateRow).toBeDefined();
      expect(discountRateRow?.Value).toBe(0.10);

      const terminalGrowthRow = result.find(
        r =>
          r.Item === 'Terminal Growth Rate' && r.Category === 'Project Config'
      );
      expect(terminalGrowthRow).toBeDefined();
      expect(terminalGrowthRow?.Value).toBe(0.02);

      const initialInvestmentRow = result.find(
        r =>
          r.Item === 'Initial Investment' && r.Category === 'Project Config'
      );
      expect(initialInvestmentRow).toBeDefined();
      expect(initialInvestmentRow?.Value).toBe(10000000);

      const workingCapitalRow = result.find(
        r =>
          r.Item === 'Working Capital Percentage' &&
          r.Category === 'Project Config'
      );
      expect(workingCapitalRow).toBeDefined();
      expect(workingCapitalRow?.Value).toBe(0.05);

      const taxRateRow = result.find(
        r => r.Item === 'Tax Rate' && r.Category === 'Project Config'
      );
      expect(taxRateRow).toBeDefined();
      expect(taxRateRow?.Value).toBe(0.25);
    });

    it('should include scenario-level settings', () => {
      const scenario = buildTestScenario();
      const result = flattenAssumptions(scenario);

      const startYearRow = result.find(
        r => r.Item === 'Start Year' && r.Category === 'Scenario'
      );
      expect(startYearRow).toBeDefined();
      expect(startYearRow?.Value).toBe(2026);

      const horizonYearsRow = result.find(
        r => r.Item === 'Horizon Years' && r.Category === 'Scenario'
      );
      expect(horizonYearsRow).toBeDefined();
      expect(horizonYearsRow?.Value).toBe(5);
    });

    it('should include capital config fields', () => {
      const scenario = buildTestScenario();
      const result = flattenAssumptions(scenario);

      const capitalInvestmentRow = result.find(
        r =>
          r.Item === 'Initial Investment' && r.Category === 'Capital Config'
      );
      expect(capitalInvestmentRow).toBeDefined();
      expect(capitalInvestmentRow?.Value).toBe(50000000);
    });

    it('should include debt tranche fields', () => {
      const scenario = buildTestScenario();
      const result = flattenAssumptions(scenario);

      const trancheIdRow = result.find(
        r => r.Item === 'ID' && r.Category === 'Debt Tranche 1'
      );
      expect(trancheIdRow).toBeDefined();

      const interestRateRow = result.find(
        r => r.Item === 'Interest Rate' && r.Category === 'Debt Tranche 1'
      );
      expect(interestRateRow).toBeDefined();
      expect(interestRateRow?.Value).toBe(0.08);

      const termYearsRow = result.find(
        r => r.Item === 'Term Years' && r.Category === 'Debt Tranche 1'
      );
      expect(termYearsRow).toBeDefined();
      expect(termYearsRow?.Value).toBe(10);
    });

    it('should include equity class fields', () => {
      const scenario = buildTestScenario();
      const result = flattenAssumptions(scenario);

      const equityClass1IdRow = result.find(
        r => r.Item === 'ID' && r.Category === 'Equity Class 1'
      );
      expect(equityClass1IdRow).toBeDefined();

      const contributionPctRow = result.find(
        r => r.Item === 'Contribution %' && r.Category === 'Equity Class 1'
      );
      expect(contributionPctRow).toBeDefined();
      expect(contributionPctRow?.Value).toBe(0.9);
    });

    it('should include waterfall tier fields', () => {
      const scenario = buildTestScenario();
      const result = flattenAssumptions(scenario);

      const tier1IdRow = result.find(
        r => r.Item === 'ID' && r.Category === 'Waterfall Tier 1'
      );
      expect(tier1IdRow).toBeDefined();

      const tier1TypeRow = result.find(
        r => r.Item === 'Type' && r.Category === 'Waterfall Tier 1'
      );
      expect(tier1TypeRow).toBeDefined();
      expect(tier1TypeRow?.Value).toBe('return_of_capital');
    });

    it('should include operation fields', () => {
      const scenario = buildTestScenario();
      const result = flattenAssumptions(scenario);

      const operationIdRow = result.find(
        r => r.Item === 'ID' && r.Category === 'Operation 1'
      );
      expect(operationIdRow).toBeDefined();
      expect(operationIdRow?.Value).toBe('test-hotel');

      const operationTypeRow = result.find(
        r => r.Item === 'Type' && r.Category === 'Operation 1'
      );
      expect(operationTypeRow).toBeDefined();
      expect(operationTypeRow?.Value).toBe('HOTEL');

      const keysRow = result.find(
        r => r.Item === 'Keys' && r.Category === 'Operation 1'
      );
      expect(keysRow).toBeDefined();
      expect(keysRow?.Value).toBe(100);

      const adrRow = result.find(
        r => r.Item === 'Average Daily Rate' && r.Category === 'Operation 1'
      );
      expect(adrRow).toBeDefined();
      expect(adrRow?.Value).toBe(250);
    });

    it('should handle multiple operations', () => {
      const scenario = buildTestScenario({
        modelConfig: {
          ...buildTestScenario().modelConfig,
          scenario: {
            ...buildTestScenario().modelConfig.scenario,
            operations: [
              buildHotelConfig({ id: 'hotel-1', name: 'Hotel 1' }),
              buildHotelConfig({ id: 'hotel-2', name: 'Hotel 2' }),
            ],
          },
        },
      });
      const result = flattenAssumptions(scenario);

      const operation1IdRow = result.find(
        r => r.Item === 'ID' && r.Category === 'Operation 1'
      );
      expect(operation1IdRow).toBeDefined();
      expect(operation1IdRow?.Value).toBe('hotel-1');

      const operation2IdRow = result.find(
        r => r.Item === 'ID' && r.Category === 'Operation 2'
      );
      expect(operation2IdRow).toBeDefined();
      expect(operation2IdRow?.Value).toBe('hotel-2');
    });

    it('should handle optional fields gracefully', () => {
      const scenario = buildTestScenario({
        description: undefined,
        modelConfig: {
          ...buildTestScenario().modelConfig,
          projectConfig: {
            ...buildTestScenario().modelConfig.projectConfig,
            workingCapitalPercentage: undefined,
            taxRate: undefined,
          },
        },
      });
      const result = flattenAssumptions(scenario);

      // Description should not be present
      const descRow = result.find(
        r => r.Item === 'Description' && r.Category === 'Scenario'
      );
      expect(descRow).toBeUndefined();

      // Optional project config fields should not be present
      const workingCapitalRow = result.find(
        r =>
          r.Item === 'Working Capital Percentage' &&
          r.Category === 'Project Config'
      );
      expect(workingCapitalRow).toBeUndefined();
    });
  });

  describe('flattenCashFlow', () => {
    it('should return a 2D array with headers as first row', () => {
      const pnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 1000000,
          departmentalExpenses: 300000,
          gop: 700000,
          undistributedExpenses: 200000,
          noi: 500000,
          maintenanceCapex: 50000,
          cashFlow: 450000,
          // Legacy fields
          cogsTotal: 300000,
          opexTotal: 200000,
          ebitda: 700000,
        },
      ];

      const result = flattenCashFlow(pnl);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(Array.isArray(result[0])).toBe(true);

      // Check headers
      const headers = result[0];
      expect(headers).toContain('Year');
      expect(headers).toContain('Revenue Total');
      expect(headers).toContain('Departmental Expenses');
      expect(headers).toContain('GOP');
      expect(headers).toContain('NOI');
      expect(headers).toContain('Cash Flow');
    });

    it('should include correct values for each year', () => {
      const pnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 1000000,
          departmentalExpenses: 300000,
          gop: 700000,
          undistributedExpenses: 200000,
          noi: 500000,
          maintenanceCapex: 50000,
          cashFlow: 450000,
          // Legacy fields
          cogsTotal: 300000,
          opexTotal: 200000,
          ebitda: 700000,
        },
        {
          yearIndex: 1,
          revenueTotal: 1100000,
          departmentalExpenses: 330000,
          gop: 770000,
          undistributedExpenses: 220000,
          noi: 550000,
          maintenanceCapex: 55000,
          cashFlow: 495000,
          // Legacy fields
          cogsTotal: 330000,
          opexTotal: 220000,
          ebitda: 770000,
        },
      ];

      const result = flattenCashFlow(pnl, 2026);

      // Check first data row (Year 0)
      const year0Row = result[1];
      expect(year0Row[0]).toBe(2026); // Year
      expect(year0Row[1]).toBe(1000000); // Revenue Total
      expect(year0Row[2]).toBe(300000); // Departmental Expenses
      expect(year0Row[3]).toBe(700000); // GOP
      expect(year0Row[4]).toBe(200000); // Undistributed Expenses
      expect(year0Row[7]).toBe(500000); // NOI
      expect(year0Row[8]).toBe(50000); // Maintenance CAPEX
      expect(year0Row[9]).toBe(450000); // Cash Flow

      // Check second data row (Year 1)
      const year1Row = result[2];
      expect(year1Row[0]).toBe(2027); // Year
      expect(year1Row[1]).toBe(1100000); // Revenue Total
      expect(year1Row[2]).toBe(330000); // Departmental Expenses
      expect(year1Row[3]).toBe(770000); // GOP
      expect(year1Row[4]).toBe(220000); // Undistributed Expenses
      expect(year1Row[7]).toBe(550000); // NOI
      expect(year1Row[8]).toBe(55000); // Maintenance CAPEX
      expect(year1Row[9]).toBe(495000); // Cash Flow
    });

    it('should handle optional fields (managementFees, nonOperatingIncomeExpense)', () => {
      const pnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 1000000,
          departmentalExpenses: 300000,
          gop: 700000,
          undistributedExpenses: 200000,
          managementFees: 50000,
          nonOperatingIncomeExpense: -10000,
          noi: 440000,
          maintenanceCapex: 50000,
          cashFlow: 390000,
          // Legacy fields
          cogsTotal: 300000,
          opexTotal: 200000,
          ebitda: 700000,
        },
      ];

      const result = flattenCashFlow(pnl);

      const year0Row = result[1];
      expect(year0Row[5]).toBe(50000); // Management Fees
      expect(year0Row[6]).toBe(-10000); // Non-Operating Income/Expense
    });

    it('should use yearIndex when startYear is not provided', () => {
      const pnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 1000000,
          departmentalExpenses: 300000,
          gop: 700000,
          undistributedExpenses: 200000,
          noi: 500000,
          maintenanceCapex: 50000,
          cashFlow: 450000,
          // Legacy fields
          cogsTotal: 300000,
          opexTotal: 200000,
          ebitda: 700000,
        },
      ];

      const result = flattenCashFlow(pnl);

      const year0Row = result[1];
      expect(year0Row[0]).toBe(0); // Year should be yearIndex when startYear not provided
    });

    it('should handle empty P&L array', () => {
      const pnl: ConsolidatedAnnualPnl[] = [];
      const result = flattenCashFlow(pnl);

      expect(result.length).toBe(1); // Only headers
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0].length).toBeGreaterThan(0); // Headers present
    });

    it('should verify Year 1 Revenue matches source', () => {
      const pnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 1000000,
          departmentalExpenses: 300000,
          gop: 700000,
          undistributedExpenses: 200000,
          noi: 500000,
          maintenanceCapex: 50000,
          cashFlow: 450000,
          // Legacy fields
          cogsTotal: 300000,
          opexTotal: 200000,
          ebitda: 700000,
        },
        {
          yearIndex: 1,
          revenueTotal: 1200000,
          departmentalExpenses: 360000,
          gop: 840000,
          undistributedExpenses: 240000,
          noi: 600000,
          maintenanceCapex: 60000,
          cashFlow: 540000,
          // Legacy fields
          cogsTotal: 360000,
          opexTotal: 240000,
          ebitda: 840000,
        },
      ];

      const result = flattenCashFlow(pnl, 2026);

      // Year 1 is at index 2 (headers at 0, Year 0 at 1, Year 1 at 2)
      const year1Row = result[2];
      const year1Revenue = year1Row[1]; // Revenue Total is at index 1

      // Verify Year 1 Revenue matches the source
      expect(year1Revenue).toBe(1200000);
      expect(year1Revenue).toBe(pnl[1].revenueTotal);
    });
  });
});

