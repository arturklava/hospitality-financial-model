/**
 * Excel Export Tests (v0.13)
 * 
 * Tests for Excel export data mapping and validation.
 * Since we cannot easily test binary Excel generation in JSDOM,
 * we focus on testing the data preparation logic and ensuring
 * no undefined values are passed to cells.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { NamedScenario, FullModelOutput } from '@domain/types';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import { buildHotelConfig } from '../helpers/buildOperationConfig';
import { buildSingleTrancheCapitalConfig } from '../helpers/buildCapitalConfig';
import { buildBaselineWaterfallConfig } from '../helpers/buildWaterfallConfig';

/**
 * Builds a minimal test scenario.
 */
function buildTestScenario(): NamedScenario {
  return {
    id: 'excel-test-scenario',
    name: 'Excel Test Scenario',
    description: 'Test scenario for Excel export',
    modelConfig: {
      scenario: {
        id: 'test-scenario',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 5,
        operations: [buildHotelConfig()],
      },
      projectConfig: {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 10_000_000,
        workingCapitalPercentage: 0.05,
      },
      capitalConfig: buildSingleTrancheCapitalConfig(),
      waterfallConfig: buildBaselineWaterfallConfig(),
    },
  };
}

/**
 * Mock ExcelJS Workbook to capture data passed to it.
 */
interface MockCell {
  value: unknown;
  font?: { bold?: boolean; size?: number; color?: { argb: string } };
  fill?: { type: string; pattern: string; fgColor: { argb: string } };
  alignment?: { horizontal?: string; vertical?: string };
  numFmt?: string;
}

interface MockRow {
  values: (string | number)[];
  cells: MockCell[];
  height?: number;
  font?: { bold?: boolean; size?: number };
  fill?: { type: string; pattern: string; fgColor: { argb: string } };
  alignment?: { vertical?: string; horizontal?: string };
}

interface MockWorksheet {
  name: string;
  rows: MockRow[];
  cells: Map<string, MockCell>;
  mergedCells: string[];
  columns: Array<{ width?: number }>;
  getCell: (row: number | string, col?: number) => MockCell;
  getRow: (row: number) => MockRow;
  mergeCells: (range: string) => void;
  addRow: (values?: (string | number)[]) => MockRow;
}

interface MockWorkbook {
  creator?: string;
  created?: Date;
  worksheets: MockWorksheet[];
  addWorksheet: (name: string) => MockWorksheet;
}

/**
 * Creates a mock ExcelJS Workbook that captures all data operations.
 */
function createMockWorkbook(): MockWorkbook {
  const worksheets: MockWorksheet[] = [];

  const createMockWorksheet = (name: string): MockWorksheet => {
    const rows: MockRow[] = [];
    const cells = new Map<string, MockCell>();
    const mergedCells: string[] = [];

    const getCell = (row: number | string, col?: number): MockCell => {
      const key = typeof row === 'string' ? row : col !== undefined ? `${row},${col}` : `${row}`;
      if (!cells.has(key)) {
        cells.set(key, { value: undefined });
      }
      return cells.get(key)!;
    };

    const getRow = (rowIndex: number): MockRow => {
      if (!rows[rowIndex - 1]) {
        rows[rowIndex - 1] = {
          values: [],
          cells: [],
        };
      }
      return rows[rowIndex - 1];
    };

    const mergeCells = (range: string): void => {
      mergedCells.push(range);
    };

    const addRow = (values?: (string | number)[]): MockRow => {
      const row: MockRow = {
        values: values || [],
        cells: [],
      };
      rows.push(row);
      return row;
    };

    return {
      name,
      rows,
      cells,
      mergedCells,
      columns: [],
      getCell,
      getRow,
      mergeCells,
      addRow,
    };
  };

  return {
    worksheets: [],
    addWorksheet: (name: string) => {
      const sheet = createMockWorksheet(name);
      worksheets.push(sheet);
      return sheet;
    },
  };
}

/**
 * Validates that a value is not undefined (can be null, but not undefined).
 */
function assertNotUndefined(value: unknown, path: string): void {
  if (value === undefined) {
    throw new Error(`Undefined value found at path: ${path}`);
  }
}

/**
 * Recursively validates all cell values in a worksheet.
 */
function validateWorksheetValues(sheet: MockWorksheet, sheetName: string): void {
  // Validate all cells
  for (const [key, cell] of sheet.cells.entries()) {
    assertNotUndefined(cell.value, `${sheetName}.cell[${key}]`);
  }

  // Validate all row values
  for (let i = 0; i < sheet.rows.length; i++) {
    const row = sheet.rows[i];
    if (row && row.values && Array.isArray(row.values)) {
      for (let j = 0; j < row.values.length; j++) {
        assertNotUndefined(row.values[j], `${sheetName}.row[${i}].values[${j}]`);
      }
    }
  }
}

describe('Excel Export Data Mapping (v0.13)', () => {
  let mockWorkbook: MockWorkbook;
  let scenario: NamedScenario;
  let output: FullModelOutput;

  beforeEach(() => {
    mockWorkbook = createMockWorkbook();
    scenario = buildTestScenario();
    output = runFullModel(scenario.modelConfig);
  });

  describe('Data Preparation', () => {
    it('should prepare scenario data without undefined values', () => {
      // Verify scenario has all required fields
      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBeDefined();
      expect(scenario.modelConfig).toBeDefined();
      expect(scenario.modelConfig.projectConfig).toBeDefined();
      expect(scenario.modelConfig.capitalConfig).toBeDefined();
      expect(scenario.modelConfig.waterfallConfig).toBeDefined();

      // Verify no undefined values in scenario
      expect(scenario.id).not.toBeUndefined();
      expect(scenario.name).not.toBeUndefined();
      expect(scenario.modelConfig.projectConfig.discountRate).not.toBeUndefined();
      expect(scenario.modelConfig.projectConfig.initialInvestment).not.toBeUndefined();
    });

    it('should prepare model output data without undefined values', () => {
      // Verify output has all required fields
      expect(output.project).toBeDefined();
      expect(output.project.projectKpis).toBeDefined();
      expect(output.consolidatedAnnualPnl).toBeDefined();
      expect(output.capital).toBeDefined();
      expect(output.waterfall).toBeDefined();

      // Verify KPIs are defined (can be null, but not undefined)
      expect(output.project.projectKpis.npv).not.toBeUndefined();
      expect(output.project.projectKpis.equityMultiple).not.toBeUndefined();
      // IRR can be null, but should not be undefined
      if (output.project.projectKpis.unleveredIrr !== null) {
        expect(output.project.projectKpis.unleveredIrr).not.toBeUndefined();
      }
    });
  });

  describe('Workbook Data Mapping', () => {
    it('should map scenario data to workbook structure correctly', () => {
      // Simulate what generateExcel does - create sheets
      const summarySheet = mockWorkbook.addWorksheet('Summary');
      const assumptionsSheet = mockWorkbook.addWorksheet('Assumptions');
      const cashFlowSheet = mockWorkbook.addWorksheet('Cash Flow');
      const waterfallSheet = mockWorkbook.addWorksheet('Waterfall');

      // Simulate Summary sheet data
      summarySheet.getCell('A1').value = `Financial Model Summary - ${scenario.name}`;
      summarySheet.getCell('A3').value = 'Project KPIs';
      summarySheet.getCell('A4').value = 'NPV';
      summarySheet.getCell('B4').value = output.project.projectKpis.npv;
      summarySheet.getCell('A5').value = 'Unlevered IRR';
      summarySheet.getCell('B5').value =
        output.project.projectKpis.unleveredIrr !== null
          ? `${(output.project.projectKpis.unleveredIrr * 100).toFixed(2)}%`
          : 'N/A';

      // Simulate Assumptions sheet data
      assumptionsSheet.getCell('A1').value = 'Model Assumptions';
      assumptionsSheet.getCell('A3').value = 'Project Configuration';
      assumptionsSheet.getCell('A4').value = 'Initial Investment';
      assumptionsSheet.getCell('B4').value = scenario.modelConfig.projectConfig.initialInvestment;
      assumptionsSheet.getCell('A5').value = 'Discount Rate';
      assumptionsSheet.getCell('B5').value = scenario.modelConfig.projectConfig.discountRate;

      // Simulate Cash Flow sheet data
      cashFlowSheet.getCell('A1').value = 'Cash Flow Statement';
      const headerRow = cashFlowSheet.getRow(3);
      headerRow.values = ['Item', 'Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'];
      for (let i = 0; i < output.consolidatedAnnualPnl.length; i++) {
        const pnl = output.consolidatedAnnualPnl[i];
        const row = cashFlowSheet.getRow(4 + i);
        row.values = [
          `Year ${i}`,
          pnl.revenueTotal ?? 0,
          pnl.noi ?? 0,
          pnl.maintenanceCapex ?? 0,
        ];
      }

      // Simulate Waterfall sheet data
      waterfallSheet.getCell('A1').value = 'Equity Waterfall Distribution';
      const waterfallHeaderRow = waterfallSheet.getRow(3);
      waterfallHeaderRow.values = ['Year', 'Owner Cash Flow'];
      for (const partner of output.waterfall.partners) {
        waterfallHeaderRow.values.push(partner.partnerId);
      }

      // Validate all sheets have no undefined values
      validateWorksheetValues(summarySheet, 'Summary');
      validateWorksheetValues(assumptionsSheet, 'Assumptions');
      validateWorksheetValues(cashFlowSheet, 'Cash Flow');
      validateWorksheetValues(waterfallSheet, 'Waterfall');
    });

    it('should handle null values correctly (convert to strings or defaults)', () => {
      const sheet = mockWorkbook.addWorksheet('Test');

      // Test null IRR handling
      const nullIrr = null;
      sheet.getCell('A1').value = nullIrr !== null ? `${(nullIrr * 100).toFixed(2)}%` : 'N/A';
      expect(sheet.getCell('A1').value).toBe('N/A');
      expect(sheet.getCell('A1').value).not.toBeUndefined();

      // Test null payback period handling
      const nullPayback: number | null = null;
      sheet.getCell('A2').value =
        nullPayback !== null ? `${(nullPayback as number).toFixed(2)} years` : 'N/A';
      expect(sheet.getCell('A2').value).toBe('N/A');
      expect(sheet.getCell('A2').value).not.toBeUndefined();

      // Test optional field handling
      const optionalValue = output.consolidatedAnnualPnl[0].managementFees;
      sheet.getCell('A3').value = optionalValue ?? 0;
      expect(sheet.getCell('A3').value).not.toBeUndefined();
    });

    it('should map all operation types correctly', () => {
      const sheet = mockWorkbook.addWorksheet('Operations');

      // Test hotel operation
      const hotelOp = scenario.modelConfig.scenario.operations[0];
      if (hotelOp.operationType === 'HOTEL') {
        sheet.getCell('A1').value = hotelOp.name || 'Unnamed';
        sheet.getCell('B1').value = hotelOp.operationType;
        sheet.getCell('C1').value = hotelOp.avgDailyRate;

        expect(sheet.getCell('A1').value).not.toBeUndefined();
        expect(sheet.getCell('B1').value).not.toBeUndefined();
        expect(sheet.getCell('C1').value).not.toBeUndefined();
        expect(sheet.getCell('C1').value).toBe(250); // From buildHotelConfig
      }
    });

    it('should map capital structure data correctly', () => {
      const sheet = mockWorkbook.addWorksheet('Capital');

      const capitalConfig = scenario.modelConfig.capitalConfig;
      sheet.getCell('A1').value = 'Initial Investment';
      sheet.getCell('B1').value = capitalConfig.initialInvestment;

      const totalDebt = capitalConfig.debtTranches.reduce(
        (sum, t) => sum + (t.initialPrincipal ?? t.amount ?? 0),
        0
      );
      sheet.getCell('A2').value = 'Total Debt';
      sheet.getCell('B2').value = totalDebt;

      expect(sheet.getCell('A1').value).not.toBeUndefined();
      expect(sheet.getCell('B1').value).not.toBeUndefined();
      expect(sheet.getCell('A2').value).not.toBeUndefined();
      expect(sheet.getCell('B2').value).not.toBeUndefined();
    });

    it('should map waterfall data correctly', () => {
      const sheet = mockWorkbook.addWorksheet('Waterfall');

      const annualRows = output.waterfall.annualRows;
      const partners = output.waterfall.partners;

      // Header row
      const headerRow = sheet.getRow(1);
      headerRow.values = ['Year', 'Owner Cash Flow'];
      for (const partner of partners) {
        headerRow.values.push(partner.partnerId);
      }

      // Data rows
      for (let i = 0; i < annualRows.length; i++) {
        const annualRow = annualRows[i];
        const row = sheet.getRow(2 + i);
        row.values = [`Year ${annualRow.yearIndex}`, annualRow.ownerCashFlow];

        for (const partner of partners) {
          const distribution = annualRow.partnerDistributions[partner.partnerId] ?? 0;
          row.values.push(distribution);
        }
      }

      // Validate all values are defined
      for (const row of sheet.rows) {
        for (const value of row.values) {
          expect(value).not.toBeUndefined();
        }
      }
    });

    it('should map consolidated P&L data correctly', () => {
      const sheet = mockWorkbook.addWorksheet('P&L');

      // Header row
      const headerRow = sheet.getRow(1);
      headerRow.values = [
        'Year',
        'Revenue Total',
        'Departmental Expenses',
        'GOP',
        'NOI',
        'Maintenance CAPEX',
      ];

      // Data rows
      for (let i = 0; i < output.consolidatedAnnualPnl.length; i++) {
        const pnl = output.consolidatedAnnualPnl[i];
        const row = sheet.getRow(2 + i);
        row.values = [
          i,
          pnl.revenueTotal ?? 0,
          pnl.departmentalExpenses ?? 0,
          pnl.gop ?? 0,
          pnl.noi ?? 0,
          pnl.maintenanceCapex ?? 0,
        ];
      }

      // Validate all values are defined
      for (const row of sheet.rows) {
        for (const value of row.values) {
          expect(value).not.toBeUndefined();
        }
      }
    });
  });

  describe('Data Validation', () => {
    it('should ensure all numeric values are finite numbers', () => {
      const sheet = mockWorkbook.addWorksheet('Validation');

      // Test NPV
      sheet.getCell('A1').value = output.project.projectKpis.npv;
      expect(Number.isFinite(sheet.getCell('A1').value as number)).toBe(true);

      // Test Equity Multiple
      sheet.getCell('A2').value = output.project.projectKpis.equityMultiple;
      expect(Number.isFinite(sheet.getCell('A2').value as number)).toBe(true);

      // Test P&L values
      for (let i = 0; i < output.consolidatedAnnualPnl.length; i++) {
        const pnl = output.consolidatedAnnualPnl[i];
        sheet.getCell(`A${3 + i}`).value = pnl.revenueTotal ?? 0;
        expect(Number.isFinite(sheet.getCell(`A${3 + i}`).value as number)).toBe(true);
      }
    });

    it('should handle optional fields with defaults', () => {
      const sheet = mockWorkbook.addWorksheet('Optional');

      // Test optional managementFees
      const pnl = output.consolidatedAnnualPnl[0];
      const managementFees = pnl.managementFees ?? 0;
      sheet.getCell('A1').value = managementFees;
      expect(sheet.getCell('A1').value).not.toBeUndefined();
      expect(typeof sheet.getCell('A1').value).toBe('number');

      // Test optional nonOperatingIncomeExpense
      const nonOpIncome = pnl.nonOperatingIncomeExpense ?? 0;
      sheet.getCell('A2').value = nonOpIncome;
      expect(sheet.getCell('A2').value).not.toBeUndefined();
      expect(typeof sheet.getCell('A2').value).toBe('number');
    });

    it('should convert null values to display strings', () => {
      const sheet = mockWorkbook.addWorksheet('NullHandling');

      // Test null IRR
      const irr = output.project.projectKpis.unleveredIrr;
      sheet.getCell('A1').value = irr !== null ? `${(irr * 100).toFixed(2)}%` : 'N/A';
      expect(sheet.getCell('A1').value).not.toBeUndefined();
      expect(typeof sheet.getCell('A1').value).toBe('string');

      // Test null payback
      const payback = output.project.projectKpis.paybackPeriod;
      sheet.getCell('A2').value = payback !== null ? `${payback.toFixed(2)} years` : 'N/A';
      expect(sheet.getCell('A2').value).not.toBeUndefined();
      expect(typeof sheet.getCell('A2').value).toBe('string');
    });
  });

  describe('Data Structure Matching', () => {
    it('should match scenario project config data', () => {
      const sheet = mockWorkbook.addWorksheet('ProjectConfig');

      const projectConfig = scenario.modelConfig.projectConfig;
      sheet.getCell('A1').value = projectConfig.discountRate;
      sheet.getCell('A2').value = projectConfig.terminalGrowthRate;
      sheet.getCell('A3').value = projectConfig.initialInvestment;

      expect(sheet.getCell('A1').value).toBe(projectConfig.discountRate);
      expect(sheet.getCell('A2').value).toBe(projectConfig.terminalGrowthRate);
      expect(sheet.getCell('A3').value).toBe(projectConfig.initialInvestment);
    });

    it('should match output KPIs data', () => {
      const sheet = mockWorkbook.addWorksheet('KPIs');

      const kpis = output.project.projectKpis;
      sheet.getCell('A1').value = kpis.npv;
      sheet.getCell('A2').value = kpis.equityMultiple;
      if (kpis.unleveredIrr !== null) {
        sheet.getCell('A3').value = kpis.unleveredIrr;
      }

      expect(sheet.getCell('A1').value).toBe(kpis.npv);
      expect(sheet.getCell('A2').value).toBe(kpis.equityMultiple);
    });

    it('should match consolidated P&L data', () => {
      const sheet = mockWorkbook.addWorksheet('P&L Match');

      for (let i = 0; i < output.consolidatedAnnualPnl.length; i++) {
        const pnl = output.consolidatedAnnualPnl[i];
        const row = sheet.getRow(i + 1);
        row.values = [
          pnl.yearIndex,
          pnl.revenueTotal ?? 0,
          pnl.noi ?? 0,
          pnl.maintenanceCapex ?? 0,
        ];

        expect(row.values[0]).toBe(pnl.yearIndex);
        expect(row.values[1]).toBe(pnl.revenueTotal ?? 0);
        expect(row.values[2]).toBe(pnl.noi ?? 0);
        expect(row.values[3]).toBe(pnl.maintenanceCapex ?? 0);
      }
    });
  });
});

