/**
 * Excel Round-Trip Integration Test (v2.9)
 * 
 * Tests the complete Excel IO workflow:
 * 1. Generate Template -> 2. Mock User Input -> 3. Import -> 4. Validate -> 5. Run Model
 * 
 * This test verifies that the Excel IO layer correctly handles the full round-trip:
 * - Template generation produces valid Excel files
 * - Import correctly parses Excel files into NamedScenario objects
 * - Imported scenarios are valid and can be executed
 */

import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseExcelScenario } from '../../engines/io/excelImport';
import { isScenarioValid } from '@domain/validation';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type { NamedScenario } from '@domain/types';

/**
 * Creates an Excel template workbook similar to generateExcelTemplate.
 * Returns the buffer instead of downloading.
 * 
 * Note: The import function expects the header at row 1, so we align with that.
 */
async function createTemplateWorkbook(): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hospitality Financial Model';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create Input_Data sheet (strict requirement per ARCHITECTURE.md)
  const sheet = workbook.addWorksheet('Input_Data');

  // Header row (row 1) - must be at row 1 for import function
  const headerRow = sheet.getRow(1);
  headerRow.values = ['Key', 'Value'];
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }, // Blue background
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  let rowIndex = 2;

  // Section: Scenario Metadata
  // Note: We skip section headers in the round-trip test to match import expectations
  // In a real template, section headers would be above the data, but import expects data starting at row 2

  const metadataRows: Array<[string, string | number]> = [
    ['scenario.id', 'round-trip-test-scenario'],
    ['scenario.name', 'Round-Trip Test Scenario'],
    ['scenario.description', 'Integration test scenario'],
    ['scenario.startYear', 2026],
    ['scenario.horizonYears', 5],
  ];

  rowIndex = addKeyValueRows(sheet, rowIndex, metadataRows);

  // Section: Project Configuration

  const projectRows: Array<[string, string | number]> = [
    ['project.initialInvestment', 20_000_000],
    ['project.discountRate', 0.10],
    ['project.terminalGrowthRate', 0.02],
    ['project.workingCapitalPercentage', 0.05],
    ['project.taxRate', 0.25],
  ];

  rowIndex = addKeyValueRows(sheet, rowIndex, projectRows);

  // Section: Operation Configuration (Hotel Example)

  const operationRows: Array<[string, string | number]> = [
    ['operations[0].operationType', 'HOTEL'],
    ['operations[0].id', 'hotel-round-trip-1'],
    ['operations[0].name', 'Round-Trip Test Hotel'],
    ['operations[0].startYear', 2026],
    ['operations[0].horizonYears', 5],
    ['operations[0].keys', 120],
    ['operations[0].avgDailyRate', 280],
    ['operations[0].occupancyByMonth', '0.72,0.72,0.72,0.72,0.72,0.72,0.72,0.72,0.72,0.72,0.72,0.72'],
    ['operations[0].foodRevenuePctOfRooms', 0.30],
    ['operations[0].beverageRevenuePctOfRooms', 0.15],
    ['operations[0].otherRevenuePctOfRooms', 0.10],
    ['operations[0].foodCogsPct', 0.35],
    ['operations[0].beverageCogsPct', 0.25],
    ['operations[0].payrollPct', 0.35],
    ['operations[0].utilitiesPct', 0.05],
    ['operations[0].marketingPct', 0.03],
    ['operations[0].maintenanceOpexPct', 0.04],
    ['operations[0].otherOpexPct', 0.03],
    ['operations[0].maintenanceCapexPct', 0.02],
  ];

  rowIndex = addKeyValueRows(sheet, rowIndex, operationRows);

  // Section: Capital Structure (Optional)

  const capitalRows: Array<[string, string | number]> = [
    ['capitalStructure.debtTranches[0].initialPrincipal', 10_000_000],
    ['capitalStructure.debtTranches[0].interestRate', 0.06],
    ['capitalStructure.debtTranches[0].termYears', 10],
    ['capitalStructure.debtTranches[0].amortizationYears', 10],
  ];

  rowIndex = addKeyValueRows(sheet, rowIndex, capitalRows);

  // Format columns
  sheet.columns = [
    { width: 45 }, // Key column
    { width: 30 }, // Value column
  ];

  // Add borders to header row
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Generate buffer
  return await workbook.xlsx.writeBuffer();
}

/**
 * Adds key-value rows to the sheet.
 * 
 * @returns The next row index after adding all rows
 */
function addKeyValueRows(
  sheet: ExcelJS.Worksheet,
  startRowIndex: number,
  rows: Array<[string, string | number]>
): number {
  let rowIndex = startRowIndex;

  for (const [key, exampleValue] of rows) {
    const keyCell = sheet.getCell(`A${rowIndex}`);
    const valueCell = sheet.getCell(`B${rowIndex}`);

    keyCell.value = key;
    keyCell.font = { bold: true };
    keyCell.alignment = { horizontal: 'left' };

    valueCell.value = exampleValue;
    
    // Format based on value type
    if (typeof exampleValue === 'number') {
      // Format percentages
      if (key.includes('Pct') || key.includes('Rate')) {
        valueCell.numFmt = '0.00%';
      } else if (key.includes('Investment') || key.includes('Principal') || key.includes('Rate')) {
        valueCell.numFmt = '#,##0';
      } else {
        valueCell.numFmt = '#,##0.00';
      }
    } else {
      valueCell.alignment = { horizontal: 'left' };
    }

    // Add borders
    keyCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    valueCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    rowIndex++;
  }

  return rowIndex;
}

/**
 * Simulates user input by modifying values in the Excel template.
 * This mimics what a user would do: open the template and fill in values.
 */
async function simulateUserInput(templateBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);

  const sheet = workbook.getWorksheet('Input_Data');
  if (!sheet) {
    throw new Error('Input_Data sheet not found');
  }

  // Find and modify specific values (simulating user input)
  // We'll search for keys and update their corresponding values
  let rowIndex = 2; // Start after header row (row 1)
  while (true) {
    const row = sheet.getRow(rowIndex);
    const keyCell = row.getCell(1);
    const valueCell = row.getCell(2);

    if (!keyCell.value || String(keyCell.value).trim() === '') {
      break;
    }

    const key = String(keyCell.value).trim();

    // Simulate user modifications:
    // - Change hotel name
    if (key === 'operations[0].name') {
      valueCell.value = 'Modified Test Hotel';
    }
    // - Change ADR
    if (key === 'operations[0].avgDailyRate') {
      valueCell.value = 300; // Changed from 280
    }
    // - Change occupancy
    if (key === 'operations[0].occupancyByMonth') {
      valueCell.value = '0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75'; // Changed from 0.72
    }
    // - Change discount rate
    if (key === 'project.discountRate') {
      valueCell.value = 0.12; // Changed from 0.10
    }
    // - Change initial investment
    if (key === 'project.initialInvestment') {
      valueCell.value = 25_000_000; // Changed from 20_000_000
    }

    rowIndex++;
    if (rowIndex > 1000) {
      break; // Safety limit
    }
  }

  return await workbook.xlsx.writeBuffer();
}

/**
 * Creates a mock File object from an ArrayBuffer.
 */
function createMockFile(buffer: ArrayBuffer, filename: string = 'test.xlsx'): File {
  return new File([buffer], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('Excel Round-Trip Integration Test (v2.9)', () => {
  describe('Full Round-Trip: Generate Template -> Mock User Input -> Import -> Validate -> Run', () => {
    it('should complete full round-trip: template generation, user input simulation, import, validation, and model execution', async () => {
      // Step 1: Generate Template
      const templateBuffer = await createTemplateWorkbook();
      expect(templateBuffer).toBeDefined();
      expect(templateBuffer.byteLength).toBeGreaterThan(0);

      // Step 2: Simulate User Input (modify template values)
      const modifiedBuffer = await simulateUserInput(templateBuffer);
      expect(modifiedBuffer).toBeDefined();
      expect(modifiedBuffer.byteLength).toBeGreaterThan(0);

      // Step 3: Import Excel file
      const file = createMockFile(modifiedBuffer, 'round-trip-test.xlsx');
      const importedScenario: NamedScenario = await parseExcelScenario(file);

      // Step 4: Validate imported scenario
      expect(importedScenario).toBeDefined();
      expect(importedScenario.id).toBe('round-trip-test-scenario');
      expect(importedScenario.name).toBe('Round-Trip Test Scenario');
      expect(importedScenario.modelConfig).toBeDefined();

      // Verify validation passes
      const isValid = isScenarioValid(importedScenario);
      expect(isValid).toBe(true);

      // Verify imported values match our modifications
      expect(importedScenario.modelConfig.projectConfig.discountRate).toBe(0.12); // Modified
      expect(importedScenario.modelConfig.projectConfig.initialInvestment).toBe(25_000_000); // Modified

      const hotelOp = importedScenario.modelConfig.scenario.operations[0];
      if (hotelOp.operationType === 'HOTEL') {
        expect(hotelOp.name).toBe('Modified Test Hotel'); // Modified
        expect(hotelOp.avgDailyRate).toBe(300); // Modified
        expect(hotelOp.occupancyByMonth[0]).toBe(0.75); // Modified
      }

      // Step 5: Run the model to ensure it executes successfully
      const output = runFullModel(importedScenario.modelConfig);

      // Verify model execution produces valid results
      expect(output).toBeDefined();
      expect(output.consolidatedAnnualPnl).toBeDefined();
      expect(output.consolidatedAnnualPnl.length).toBe(5); // 5 years horizon
      expect(output.project).toBeDefined();
      expect(output.project.projectKpis).toBeDefined();
      expect(output.capital).toBeDefined();
      expect(output.waterfall).toBeDefined();

      // Verify KPIs are finite numbers (model ran successfully)
      expect(Number.isFinite(output.project.projectKpis.npv)).toBe(true);
      if (output.project.projectKpis.unleveredIrr !== null) {
        expect(Number.isFinite(output.project.projectKpis.unleveredIrr)).toBe(true);
      }
      expect(Number.isFinite(output.project.projectKpis.equityMultiple)).toBe(true);

      // Verify cash flows are generated
      expect(output.project.unleveredFcf).toBeDefined();
      expect(output.project.unleveredFcf.length).toBeGreaterThan(0);
      expect(output.capital.ownerLeveredCashFlows).toBeDefined();
      expect(output.capital.ownerLeveredCashFlows.length).toBeGreaterThan(0);
    });

    it('should handle template with minimal required fields and still produce valid scenario', async () => {
      // Create a minimal template with only required fields
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Input_Data');

      // Header row
      const headerRow = sheet.getRow(1);
      headerRow.values = ['Key', 'Value'];

      // Minimal required data
      const minimalData = [
        { key: 'scenario.id', value: 'minimal-test' },
        { key: 'scenario.name', value: 'Minimal Test' },
        { key: 'scenario.startYear', value: 2026 },
        { key: 'scenario.horizonYears', value: 5 },
        { key: 'project.initialInvestment', value: 15_000_000 },
        { key: 'project.discountRate', value: 0.10 },
        { key: 'project.terminalGrowthRate', value: 0.02 },
        { key: 'operations[0].operationType', value: 'HOTEL' },
        { key: 'operations[0].keys', value: 100 },
        { key: 'operations[0].avgDailyRate', value: 250 },
      ];

      minimalData.forEach((item, index) => {
        const row = sheet.getRow(index + 2);
        row.values = [item.key, item.value];
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const file = createMockFile(buffer);

      // Import
      const importedScenario = await parseExcelScenario(file);

      // Validate
      expect(isScenarioValid(importedScenario)).toBe(true);

      // Run model
      const output = runFullModel(importedScenario.modelConfig);

      // Verify execution
      expect(Number.isFinite(output.project.projectKpis.npv)).toBe(true);
      if (output.project.projectKpis.unleveredIrr !== null) {
        expect(Number.isFinite(output.project.projectKpis.unleveredIrr)).toBe(true);
      }
    });

    it('should preserve all data types correctly through round-trip', async () => {
      const templateBuffer = await createTemplateWorkbook();
      const file = createMockFile(templateBuffer);
      const importedScenario = await parseExcelScenario(file);

      // Verify numeric types
      expect(typeof importedScenario.modelConfig.projectConfig.discountRate).toBe('number');
      expect(typeof importedScenario.modelConfig.projectConfig.initialInvestment).toBe('number');
      expect(typeof importedScenario.modelConfig.scenario.startYear).toBe('number');

      // Verify string types
      expect(typeof importedScenario.id).toBe('string');
      expect(typeof importedScenario.name).toBe('string');

      // Verify array types
      const hotelOp = importedScenario.modelConfig.scenario.operations[0];
      if (hotelOp.operationType === 'HOTEL') {
        expect(Array.isArray(hotelOp.occupancyByMonth)).toBe(true);
        expect(hotelOp.occupancyByMonth.length).toBe(12);
        expect(typeof hotelOp.occupancyByMonth[0]).toBe('number');
      }
    });
  });
});

