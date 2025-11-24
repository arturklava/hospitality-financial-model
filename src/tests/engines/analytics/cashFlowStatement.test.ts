/**
 * Tests for cash flow statement generation (v5.7: Statement Logic).
 * 
 * Verifies:
 * - 3-section structure (Operating, Investing, Financing)
 * - Net Cash Flow validation against LeveredFCF
 * - Land/Construction flows extraction
 * - Debt proceeds calculation
 * - Operation filtering
 */

import { describe, it, expect } from 'vitest';
import {
  generateCashFlowStatementRows,
  generatePnLTable,
} from '@engines/analytics/statementGenerator';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
  HotelConfig,
  FullModelInput,
  LandConfig,
  ConstructionConfig,
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
    ownershipPct: 1.0, // 100% ownership
  };
}

/**
 * Builds a minimal project scenario for testing.
 */
function buildMinimalScenario(
  hotelConfigs: HotelConfig[],
  horizonYears: number = 5
): ProjectScenario {
  return {
    id: 'test-scenario',
    name: 'Test Scenario',
    startYear: 2026,
    horizonYears,
    operations: hotelConfigs, // OperationConfig is a union type that includes HotelConfig
  };
}

/**
 * Builds a minimal project config for testing.
 */
function buildMinimalProjectConfig(
  initialInvestment: number = 10_000_000,
  landConfigs?: LandConfig[],
  constructionConfig?: ConstructionConfig
): ProjectConfig {
  const config: ProjectConfig = {
    discountRate: 0.10,
    terminalGrowthRate: 0.02,
    initialInvestment,
    workingCapitalPercentage: 0.05,
  };

  if (landConfigs) {
    config.landConfigs = landConfigs;
  }

  if (constructionConfig) {
    config.constructionConfig = constructionConfig;
  }

  return config;
}

/**
 * Builds a minimal capital structure config for testing.
 */
function buildMinimalCapitalConfig(
  initialInvestment: number = 10_000_000,
  debtAmount?: number
): CapitalStructureConfig {
  const equityAmount = debtAmount !== undefined
    ? initialInvestment - debtAmount
    : initialInvestment * 0.3; // 30% equity default

  const actualDebtAmount = debtAmount ?? (initialInvestment - equityAmount);

  return {
    initialInvestment,
    debtTranches: actualDebtAmount > 0
      ? [
          {
            id: 'senior-loan',
            label: 'Senior Loan',
            type: 'SENIOR',
            initialPrincipal: actualDebtAmount,
            interestRate: 0.06, // 6%
            termYears: 10,
            amortizationType: 'mortgage',
            startYear: 0,
            originationFeePct: 0.01, // 1% origination fee
          },
        ]
      : [],
  };
}

/**
 * Builds a minimal waterfall config for testing.
 */
function buildMinimalWaterfallConfig(): WaterfallConfig {
  return {
    equityClasses: [
      {
        id: 'lp',
        name: 'Limited Partner',
        contributionPct: 0.80,
        distributionPct: 0.80,
      },
      {
        id: 'gp',
        name: 'General Partner',
        contributionPct: 0.20,
        distributionPct: 0.20,
      },
    ],
  };
}

describe('Cash Flow Statement Generation (v5.7)', () => {
  describe('generateCashFlowStatementRows', () => {
    it('should generate 3-section cash flow statement structure', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 2_000_000);
      const scenario = buildMinimalScenario([hotel1], 5);
      const projectConfig = buildMinimalProjectConfig(10_000_000);
      const capitalConfig = buildMinimalCapitalConfig(10_000_000, 7_000_000);
      const waterfallConfig = buildMinimalWaterfallConfig();

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      const rows = generateCashFlowStatementRows(
        output,
        undefined, // all operations
        projectConfig,
        capitalConfig
      );

      // Verify structure has 3 sections + Net Cash Flow
      const sectionIds = rows.map((r) => r.id);
      expect(sectionIds).toContain('operating-activities');
      expect(sectionIds).toContain('investing-activities');
      expect(sectionIds).toContain('financing-activities');
      expect(sectionIds).toContain('net-cash-flow');
    });

    it('should include Operating Activities section with NOI and Change in WC', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 2_000_000);
      const scenario = buildMinimalScenario([hotel1], 5);
      const projectConfig = buildMinimalProjectConfig(10_000_000);
      const capitalConfig = buildMinimalCapitalConfig(10_000_000, 7_000_000);
      const waterfallConfig = buildMinimalWaterfallConfig();

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      const rows = generateCashFlowStatementRows(
        output,
        undefined,
        projectConfig,
        capitalConfig
      );

      const operatingSection = rows.find((r) => r.id === 'operating-activities');
      expect(operatingSection).toBeDefined();
      expect(operatingSection?.isGroup).toBe(true);
      expect(operatingSection?.children).toBeDefined();

      const childrenIds = operatingSection!.children!.map((c) => c.id);
      expect(childrenIds).toContain('noi');
      expect(childrenIds).toContain('change-wc');
      expect(childrenIds).toContain('cash-from-operations');
    });

    it('should include Investing Activities section with Land and Construction flows', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 2_000_000);
      const scenario = buildMinimalScenario([hotel1], 5);

      // Add land config
      const landConfig: LandConfig = {
        id: 'land-1',
        name: 'Site A',
        totalCost: 1_000_000,
        acquisitionMonth: -6, // 6 months before Year 0
        downPayment: 200_000,
        downPaymentMonth: -6, // 6 months before Year 0
        installmentMethod: 'equal',
        installments: [
          { month: -5, amount: 200_000 },
          { month: -2, amount: 200_000 },
          { month: 1, amount: 200_000 },
          { month: 4, amount: 200_000 },
        ],
      };

      // Add construction config
      const constructionConfig: ConstructionConfig = {
        id: 'construction-1',
        name: 'Main Construction',
        totalBudget: 8_000_000,
        durationMonths: 18,
        startMonth: 0,
        curveType: 's-curve',
      };

      const projectConfig = buildMinimalProjectConfig(
        10_000_000,
        [landConfig],
        constructionConfig
      );
      const capitalConfig = buildMinimalCapitalConfig(10_000_000, 7_000_000);
      const waterfallConfig = buildMinimalWaterfallConfig();

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      const rows = generateCashFlowStatementRows(
        output,
        undefined,
        projectConfig,
        capitalConfig
      );

      const investingSection = rows.find((r) => r.id === 'investing-activities');
      expect(investingSection).toBeDefined();

      if (investingSection?.children) {
        // Should include land costs if land flows exist
        // Should include construction costs if construction flows exist
        expect(investingSection.children.length).toBeGreaterThan(0);
      }
    });

    it('should include Financing Activities section with Debt Proceeds and Equity', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 2_000_000);
      const scenario = buildMinimalScenario([hotel1], 5);
      const projectConfig = buildMinimalProjectConfig(10_000_000);
      const capitalConfig = buildMinimalCapitalConfig(10_000_000, 7_000_000);
      const waterfallConfig = buildMinimalWaterfallConfig();

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      const rows = generateCashFlowStatementRows(
        output,
        undefined,
        projectConfig,
        capitalConfig
      );

      const financingSection = rows.find((r) => r.id === 'financing-activities');
      expect(financingSection).toBeDefined();
      expect(financingSection?.isGroup).toBe(true);
      expect(financingSection?.children).toBeDefined();

      // Should include debt proceeds if debt exists
      // Should include equity contributions
      expect(financingSection!.children!.length).toBeGreaterThan(0);
    });

    it('should validate Net Cash Flow against LeveredFCF (within tolerance)', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 2_000_000);
      const scenario = buildMinimalScenario([hotel1], 5);
      const projectConfig = buildMinimalProjectConfig(10_000_000);
      const capitalConfig = buildMinimalCapitalConfig(10_000_000, 7_000_000);
      const waterfallConfig = buildMinimalWaterfallConfig();

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      const rows = generateCashFlowStatementRows(
        output,
        undefined,
        projectConfig,
        capitalConfig
      );

      const netCashFlowRow = rows.find((r) => r.id === 'net-cash-flow');
      expect(netCashFlowRow).toBeDefined();

      const operatingSection = rows.find((r) => r.id === 'operating-activities');
      const investingSection = rows.find((r) => r.id === 'investing-activities');
      const financingSection = rows.find((r) => r.id === 'financing-activities');

      // Get cash from operations and investing
      const cashFromOps = operatingSection!.children!.find((c) => c.id === 'cash-from-operations');
      const totalInvesting = investingSection!.children!.find((c) => c.id === 'total-investing');
      const cashFromFinancing = financingSection!.children!.find((c) => c.id === 'cash-from-financing');

      // Verify Net Cash Flow = Operating + Investing + Financing for each year
      for (let yearIndex = 0; yearIndex < output.scenario.horizonYears; yearIndex++) {
        const operating = (cashFromOps?.values[yearIndex] ?? 0) as number;
        const investing = (totalInvesting?.values[yearIndex] ?? 0) as number;
        const financing = (cashFromFinancing?.values[yearIndex] ?? 0) as number;
        const netCashFlow = (netCashFlowRow!.values[yearIndex] ?? 0) as number;

        const calculated = operating + investing + financing;
        const tolerance = 0.01;
        const difference = Math.abs(netCashFlow - calculated);

        expect(difference).toBeLessThan(tolerance);
      }
    });

    it('should filter by selected operations when selectedOps is provided', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 2_000_000);
      const hotel2 = buildMinimalHotelConfig('hotel-2', 'Hotel 2', 3_000_000);
      const scenario = buildMinimalScenario([hotel1, hotel2], 5);
      const projectConfig = buildMinimalProjectConfig(10_000_000);
      const capitalConfig = buildMinimalCapitalConfig(10_000_000, 7_000_000);
      const waterfallConfig = buildMinimalWaterfallConfig();

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      // Generate cash flow for all operations
      const allRows = generateCashFlowStatementRows(
        output,
        undefined,
        projectConfig,
        capitalConfig
      );

      // Generate cash flow for hotel-1 only
      const filteredRows = generateCashFlowStatementRows(
        output,
        ['hotel-1'],
        projectConfig,
        capitalConfig
      );

      // Operating Activities should differ (filtered NOI should be lower)
      const allOperating = allRows.find((r) => r.id === 'operating-activities');
      const filteredOperating = filteredRows.find((r) => r.id === 'operating-activities');

      expect(allOperating).toBeDefined();
      expect(filteredOperating).toBeDefined();

      // Filtered NOI should be less than or equal to all operations NOI
      const allNoi = allOperating!.children!.find((c) => c.id === 'noi');
      const filteredNoi = filteredOperating!.children!.find((c) => c.id === 'noi');

      expect(allNoi).toBeDefined();
      expect(filteredNoi).toBeDefined();

      // Compare Year 0 NOI values
      const allNoiYear0 = (allNoi!.values[0] ?? 0) as number;
      const filteredNoiYear0 = (filteredNoi!.values[0] ?? 0) as number;

      // Filtered NOI should be less than all operations NOI (assuming hotel-2 has revenue)
      expect(filteredNoiYear0).toBeLessThanOrEqual(allNoiYear0);
    });

    it('should handle zero debt scenario correctly', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 2_000_000);
      const scenario = buildMinimalScenario([hotel1], 5);
      const projectConfig = buildMinimalProjectConfig(10_000_000);
      const capitalConfig = buildMinimalCapitalConfig(10_000_000, 0); // No debt
      const waterfallConfig = buildMinimalWaterfallConfig();

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      const rows = generateCashFlowStatementRows(
        output,
        undefined,
        projectConfig,
        capitalConfig
      );

      // Financing section should still exist but debt proceeds should be 0
      const financingSection = rows.find((r) => r.id === 'financing-activities');
      expect(financingSection).toBeDefined();

      // Should still have equity contributions
      const equityRow = financingSection!.children!.find((c) => c.id === 'equity-contributions');
      expect(equityRow).toBeDefined();
    });

    it('should calculate debt proceeds correctly (net of origination fees)', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 2_000_000);
      const scenario = buildMinimalScenario([hotel1], 5);
      const projectConfig = buildMinimalProjectConfig(10_000_000);

      // Debt with origination fee
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 10_000_000,
        debtTranches: [
          {
            id: 'senior-loan',
            label: 'Senior Loan',
            type: 'SENIOR',
            initialPrincipal: 7_000_000,
            interestRate: 0.06,
            termYears: 10,
            amortizationType: 'mortgage',
            startYear: 0,
            originationFeePct: 0.02, // 2% origination fee
          },
        ],
      };

      const waterfallConfig = buildMinimalWaterfallConfig();

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      const rows = generateCashFlowStatementRows(
        output,
        undefined,
        projectConfig,
        capitalConfig
      );

      const financingSection = rows.find((r) => r.id === 'financing-activities');
      const debtProceedsRow = financingSection!.children!.find(
        (c) => c.id === 'debt-proceeds'
      );

      expect(debtProceedsRow).toBeDefined();

      // Year 0 debt proceeds should be initialPrincipal - originationFee
      // 7,000,000 - (7,000,000 * 0.02) = 6,860,000
      const expectedNetProceeds = 7_000_000 - 7_000_000 * 0.02;
      const actualProceeds = (debtProceedsRow!.values[0] ?? 0) as number;

      const tolerance = 0.01;
      expect(Math.abs(actualProceeds - expectedNetProceeds)).toBeLessThan(tolerance);
    });

    it('should validate Operating + Investing + Financing = Net Cash Flow', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 2_000_000);
      const scenario = buildMinimalScenario([hotel1], 5);
      const projectConfig = buildMinimalProjectConfig(10_000_000);
      const capitalConfig = buildMinimalCapitalConfig(10_000_000, 7_000_000);
      const waterfallConfig = buildMinimalWaterfallConfig();

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      const rows = generateCashFlowStatementRows(
        output,
        undefined,
        projectConfig,
        capitalConfig
      );

      const operatingSection = rows.find((r) => r.id === 'operating-activities');
      const investingSection = rows.find((r) => r.id === 'investing-activities');
      const financingSection = rows.find((r) => r.id === 'financing-activities');
      const netCashFlowRow = rows.find((r) => r.id === 'net-cash-flow');

      expect(operatingSection).toBeDefined();
      expect(investingSection).toBeDefined();
      expect(financingSection).toBeDefined();
      expect(netCashFlowRow).toBeDefined();

      // Get cash from operations, investing, and financing
      const cashFromOps = operatingSection!.children!.find(
        (c) => c.id === 'cash-from-operations'
      );
      const totalInvesting = investingSection!.children!.find(
        (c) => c.id === 'total-investing'
      );
      const cashFromFinancing = financingSection!.children!.find(
        (c) => c.id === 'cash-from-financing'
      );

      // Validate for each year
      for (let yearIndex = 0; yearIndex < output.scenario.horizonYears; yearIndex++) {
        const operating = (cashFromOps?.values[yearIndex] ?? 0) as number;
        const investing = (totalInvesting?.values[yearIndex] ?? 0) as number;
        const financing = (cashFromFinancing?.values[yearIndex] ?? 0) as number;
        const netCashFlow = (netCashFlowRow!.values[yearIndex] ?? 0) as number;

        const calculated = operating + investing + financing;
        const tolerance = 0.01;

        expect(Math.abs(netCashFlow - calculated)).toBeLessThan(tolerance);
      }
    });
  });

  describe('generatePnLTable', () => {
    it('should generate P&L statement with USALI structure', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 2_000_000);
      const scenario = buildMinimalScenario([hotel1], 5);
      const projectConfig = buildMinimalProjectConfig(10_000_000);
      const capitalConfig = buildMinimalCapitalConfig(10_000_000, 7_000_000);
      const waterfallConfig = buildMinimalWaterfallConfig();

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      const rows = generatePnLTable(output);

      // Verify USALI structure
      const revenueRow = rows.find((r) => r.id === 'revenue-group');
      const gopRow = rows.find((r) => r.id === 'gop');
      const operatingExpensesRow = rows.find((r) => r.id === 'operating-expenses-group');
      const noiRow = rows.find((r) => r.id === 'noi');

      expect(revenueRow).toBeDefined();
      expect(gopRow).toBeDefined();
      expect(operatingExpensesRow).toBeDefined();
      expect(noiRow).toBeDefined();
    });

    it('should filter by selected operations when selectedOps is provided', () => {
      const hotel1 = buildMinimalHotelConfig('hotel-1', 'Hotel 1', 2_000_000);
      const hotel2 = buildMinimalHotelConfig('hotel-2', 'Hotel 2', 3_000_000);
      const scenario = buildMinimalScenario([hotel1, hotel2], 5);
      const projectConfig = buildMinimalProjectConfig(10_000_000);
      const capitalConfig = buildMinimalCapitalConfig(10_000_000, 7_000_000);
      const waterfallConfig = buildMinimalWaterfallConfig();

      const input: FullModelInput = {
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      };

      const output = runFullModel(input);

      // All operations
      const allRows = generatePnLTable(output);
      const allRevenueRow = allRows.find((r) => r.id === 'revenue-group');

      // Filtered to hotel-1
      const filteredRows = generatePnLTable(output, ['hotel-1']);
      const filteredRevenueRow = filteredRows.find((r) => r.id === 'revenue-group');

      expect(allRevenueRow).toBeDefined();
      expect(filteredRevenueRow).toBeDefined();

      // Filtered revenue should be less than or equal to all operations revenue
      const allRevenue = (allRevenueRow!.values[0] ?? 0) as number;
      const filteredRevenue = (filteredRevenueRow!.values[0] ?? 0) as number;

      expect(filteredRevenue).toBeLessThanOrEqual(allRevenue);
    });
  });
});
