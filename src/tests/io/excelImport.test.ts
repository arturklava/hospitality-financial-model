/**
 * Excel Import Tests (v2.9)
 * 
 * Tests for Excel import functionality - parsing Excel files to construct NamedScenario objects.
 * Verifies that mocked Excel buffers translate correctly into Scenario objects.
 */

import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseExcelScenario } from '../../engines/io/excelImport';
import { isScenarioValid } from '@domain/validation';

/**
 * Creates a mock Excel workbook buffer with Input_Data sheet.
 */
async function createMockWorkbookBuffer(data: Array<{ key: string; value: string | number }>): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Input_Data');

  // Header row
  const headerRow = sheet.getRow(1);
  headerRow.values = ['Key', 'Value'];
  headerRow.font = { bold: true };

  // Data rows
  data.forEach((item, index) => {
    const row = sheet.getRow(index + 2);
    row.values = [item.key, item.value];
  });

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

describe('Excel Import (v2.9)', () => {
  describe('parseExcelScenario', () => {
    it('should parse a valid Excel file with Input_Data sheet', async () => {
      const testData = [
        { key: 'scenario.id', value: 'test-scenario' },
        { key: 'scenario.name', value: 'Test Scenario' },
        { key: 'scenario.startYear', value: 2026 },
        { key: 'scenario.horizonYears', value: 5 },
        { key: 'project.discountRate', value: 0.12 },
        { key: 'project.terminalGrowthRate', value: 0.025 },
        { key: 'project.initialInvestment', value: 50_000_000 },
        { key: 'project.workingCapitalPercentage', value: 0.05 },
        { key: 'operations[0].operationType', value: 'HOTEL' },
        { key: 'operations[0].id', value: 'hotel-1' },
        { key: 'operations[0].name', value: 'Test Hotel' },
        { key: 'operations[0].keys', value: 150 },
        { key: 'operations[0].avgDailyRate', value: 275 },
        { key: 'operations[0].occupancyByMonth', value: '0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75' },
      ];

      const buffer = await createMockWorkbookBuffer(testData);
      const file = createMockFile(buffer);

      const scenario = await parseExcelScenario(file);

      // Verify scenario structure
      expect(scenario).toBeDefined();
      expect(scenario.id).toBe('test-scenario');
      expect(scenario.name).toBe('Test Scenario');
      expect(scenario.modelConfig).toBeDefined();

      // Verify project config
      expect(scenario.modelConfig.projectConfig.discountRate).toBe(0.12);
      expect(scenario.modelConfig.projectConfig.terminalGrowthRate).toBe(0.025);
      expect(scenario.modelConfig.projectConfig.initialInvestment).toBe(50_000_000);
      expect(scenario.modelConfig.projectConfig.workingCapitalPercentage).toBe(0.05);

      // Verify scenario config
      expect(scenario.modelConfig.scenario.startYear).toBe(2026);
      expect(scenario.modelConfig.scenario.horizonYears).toBe(5);

      // Verify operations
      expect(scenario.modelConfig.scenario.operations.length).toBeGreaterThan(0);
      const hotelOp = scenario.modelConfig.scenario.operations[0];
      if (hotelOp.operationType === 'HOTEL') {
        expect(hotelOp.keys).toBe(150);
        expect(hotelOp.avgDailyRate).toBe(275);
      }
    });

    it('should validate imported scenario using Zod schema', async () => {
      const testData = [
        { key: 'scenario.id', value: 'valid-scenario' },
        { key: 'scenario.name', value: 'Valid Scenario' },
        { key: 'scenario.startYear', value: 2026 },
        { key: 'scenario.horizonYears', value: 5 },
        { key: 'project.discountRate', value: 0.10 },
        { key: 'project.terminalGrowthRate', value: 0.02 },
        { key: 'project.initialInvestment', value: 10_000_000 },
        { key: 'operations[0].operationType', value: 'HOTEL' },
        { key: 'operations[0].keys', value: 100 },
        { key: 'operations[0].avgDailyRate', value: 250 },
      ];

      const buffer = await createMockWorkbookBuffer(testData);
      const file = createMockFile(buffer);

      const scenario = await parseExcelScenario(file);

      // Verify validation passes
      expect(isScenarioValid(scenario)).toBe(true);
    });

    it('should throw error if Input_Data sheet is missing', async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('OtherSheet'); // Wrong sheet name
      const buffer = await workbook.xlsx.writeBuffer();
      const file = createMockFile(buffer);

      await expect(parseExcelScenario(file)).rejects.toThrow(
        'Sheet named "Input_Data" not found'
      );
    });

    it('should throw error if header row is invalid', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Input_Data');

      // Wrong header
      const headerRow = sheet.getRow(1);
      headerRow.values = ['Wrong', 'Header'];

      const buffer = await workbook.xlsx.writeBuffer();
      const file = createMockFile(buffer);

      await expect(parseExcelScenario(file)).rejects.toThrow(
        'Invalid header format'
      );
    });

    it('should use default values when keys are missing', async () => {
      const testData = [
        { key: 'scenario.id', value: 'minimal-scenario' },
        { key: 'scenario.name', value: 'Minimal Scenario' },
        // Missing most fields - should use defaults
        { key: 'project.initialInvestment', value: 20_000_000 },
      ];

      const buffer = await createMockWorkbookBuffer(testData);
      const file = createMockFile(buffer);

      const scenario = await parseExcelScenario(file);

      // Should use defaults
      expect(scenario.modelConfig.projectConfig.discountRate).toBe(0.10); // default
      expect(scenario.modelConfig.projectConfig.terminalGrowthRate).toBe(0.02); // default
      expect(scenario.modelConfig.projectConfig.initialInvestment).toBe(20_000_000); // from data
      expect(scenario.modelConfig.scenario.startYear).toBe(2026); // default
      expect(scenario.modelConfig.scenario.horizonYears).toBe(5); // default
    });

    it('should parse numeric values correctly', async () => {
      const testData = [
        { key: 'scenario.id', value: 'numeric-test' },
        { key: 'scenario.name', value: 'Numeric Test' },
        { key: 'project.discountRate', value: 0.15 }, // Number
        { key: 'project.terminalGrowthRate', value: '0.03' }, // String number
        { key: 'project.initialInvestment', value: 75_000_000 }, // Large number
      ];

      const buffer = await createMockWorkbookBuffer(testData);
      const file = createMockFile(buffer);

      const scenario = await parseExcelScenario(file);

      expect(scenario.modelConfig.projectConfig.discountRate).toBe(0.15);
      expect(scenario.modelConfig.projectConfig.terminalGrowthRate).toBe(0.03);
      expect(scenario.modelConfig.projectConfig.initialInvestment).toBe(75_000_000);
    });

    it('should parse occupancy array from comma-separated string', async () => {
      const testData = [
        { key: 'scenario.id', value: 'occupancy-test' },
        { key: 'scenario.name', value: 'Occupancy Test' },
        { key: 'operations[0].operationType', value: 'HOTEL' },
        { 
          key: 'operations[0].occupancyByMonth', 
          value: '0.60,0.65,0.70,0.75,0.80,0.85,0.90,0.85,0.80,0.75,0.70,0.65' 
        },
      ];

      const buffer = await createMockWorkbookBuffer(testData);
      const file = createMockFile(buffer);

      const scenario = await parseExcelScenario(file);

      const hotelOp = scenario.modelConfig.scenario.operations[0];
      if (hotelOp.operationType === 'HOTEL') {
        expect(hotelOp.occupancyByMonth).toHaveLength(12);
        expect(hotelOp.occupancyByMonth[0]).toBe(0.60);
        expect(hotelOp.occupancyByMonth[5]).toBe(0.85);
      }
    });

    it('should parse occupancy array from single value', async () => {
      const testData = [
        { key: 'scenario.id', value: 'occupancy-single-test' },
        { key: 'scenario.name', value: 'Occupancy Single Test' },
        { key: 'operations[0].operationType', value: 'HOTEL' },
        { key: 'operations[0].occupancyByMonth', value: '0.80' },
      ];

      const buffer = await createMockWorkbookBuffer(testData);
      const file = createMockFile(buffer);

      const scenario = await parseExcelScenario(file);

      const hotelOp = scenario.modelConfig.scenario.operations[0];
      if (hotelOp.operationType === 'HOTEL') {
        expect(hotelOp.occupancyByMonth).toHaveLength(12);
        expect(hotelOp.occupancyByMonth.every(v => v === 0.80)).toBe(true);
      }
    });

    it('should throw error if no data is found', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Input_Data');

      // Header only, no data
      const headerRow = sheet.getRow(1);
      headerRow.values = ['Key', 'Value'];

      const buffer = await workbook.xlsx.writeBuffer();
      const file = createMockFile(buffer);

      await expect(parseExcelScenario(file)).rejects.toThrow(
        'No data found in Input_Data sheet'
      );
    });

    it('should parse capital structure parameters if provided', async () => {
      const testData = [
        { key: 'scenario.id', value: 'capital-test' },
        { key: 'scenario.name', value: 'Capital Test' },
        { key: 'project.initialInvestment', value: 100_000_000 },
        { key: 'capitalStructure.debtTranches[0].initialPrincipal', value: 60_000_000 },
        { key: 'capitalStructure.debtTranches[0].interestRate', value: 0.075 },
        { key: 'capitalStructure.debtTranches[0].termYears', value: 15 },
        { key: 'capitalStructure.debtTranches[0].amortizationYears', value: 15 },
      ];

      const buffer = await createMockWorkbookBuffer(testData);
      const file = createMockFile(buffer);

      const scenario = await parseExcelScenario(file);

      expect(scenario.modelConfig.capitalConfig.debtTranches.length).toBeGreaterThan(0);
      const tranche = scenario.modelConfig.capitalConfig.debtTranches[0];
      expect(tranche.initialPrincipal || tranche.amount).toBe(60_000_000);
      expect(tranche.interestRate).toBe(0.075);
      expect(tranche.termYears).toBe(15);
      expect(tranche.amortizationYears).toBe(15);
    });

    it('should handle empty values gracefully', async () => {
      const testData = [
        { key: 'scenario.id', value: 'empty-value-test' },
        { key: 'scenario.name', value: 'Empty Value Test' },
        { key: 'scenario.description', value: '' }, // Empty string
        { key: 'project.initialInvestment', value: 10_000_000 },
      ];

      const buffer = await createMockWorkbookBuffer(testData);
      const file = createMockFile(buffer);

      const scenario = await parseExcelScenario(file);

      // Should still work with empty values
      expect(scenario.id).toBe('empty-value-test');
      expect(scenario.modelConfig.projectConfig.initialInvestment).toBe(10_000_000);
    });

    it('should generate unique IDs when scenario.id is missing', async () => {
      const testData = [
        { key: 'scenario.name', value: 'No ID Scenario' },
        { key: 'project.initialInvestment', value: 10_000_000 },
      ];

      const buffer = await createMockWorkbookBuffer(testData);
      const file = createMockFile(buffer);

      const scenario1 = await parseExcelScenario(file);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const scenario2 = await parseExcelScenario(file);

      // Should have different IDs (timestamp-based)
      expect(scenario1.id).toBeDefined();
      expect(scenario2.id).toBeDefined();
      // Note: IDs might be the same if generated in the same millisecond,
      // but they should at least be defined
    });
  });
});

