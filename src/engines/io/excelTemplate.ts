/**
 * Excel Template Generator (v2.9)
 * 
 * Generates a blank Excel template file that users can fill in with scenario assumptions.
 * The template includes an "Input_Data" sheet with key-value pairs (Column A: Key, Column B: Value).
 * 
 * Template Structure:
 * - Sheet Name: "Input_Data" (strict requirement per ARCHITECTURE.md)
 * - Format: Key-Value pairs
 * - Columns: "Key", "Value"
 * - Keys: Structured like "project.discountRate", "operations[0].keys", etc.
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generates and downloads a blank Excel template file for scenario input.
 * 
 * The template includes:
 * - An "Input_Data" sheet with pre-filled key names and empty value cells
 * - Example values in value column to guide users
 * - Instructions at the top
 * 
 * @param filename - Optional filename for the template (defaults to "ScenarioTemplate.xlsx")
 */
export async function generateExcelTemplate(filename?: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hospitality Financial Model';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create Input_Data sheet (strict requirement per ARCHITECTURE.md)
  const sheet = workbook.addWorksheet('Input_Data');

  // Title and instructions
  sheet.mergeCells('A1:B1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Scenario Input Data Template';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };
  sheet.getRow(1).height = 25;

  sheet.getCell('A2').value = 'Instructions:';
  sheet.getCell('A2').font = { bold: true };
  sheet.getCell('A3').value = 'Fill in the values in column B. Leave keys in column A unchanged.';
  sheet.mergeCells('A3:B3');

  // Header row
  const headerRow = sheet.getRow(5);
  headerRow.values = ['Key', 'Value'];
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }, // Blue background
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  let rowIndex = 6;

  // Section: Scenario Metadata
  addSectionHeader(sheet, rowIndex, 'Scenario Metadata');
  rowIndex++;

  const metadataRows: Array<[string, string | number]> = [
    ['scenario.id', 'imported-scenario'],
    ['scenario.name', 'My Scenario'],
    ['scenario.description', 'Optional description'],
    ['scenario.startYear', 2026],
    ['scenario.horizonYears', 5],
  ];

  rowIndex = addKeyValueRows(sheet, rowIndex, metadataRows);

  rowIndex += 2;

  // Section: Project Configuration
  addSectionHeader(sheet, rowIndex, 'Project Configuration');
  rowIndex++;

  const projectRows: Array<[string, string | number]> = [
    ['project.initialInvestment', 10_000_000],
    ['project.discountRate', 0.10],
    ['project.terminalGrowthRate', 0.02],
    ['project.workingCapitalPercentage', 0.05],
    ['project.taxRate', 0.25],
  ];

  rowIndex = addKeyValueRows(sheet, rowIndex, projectRows);

  rowIndex += 2;

  // Section: Operation Configuration (Hotel Example)
  addSectionHeader(sheet, rowIndex, 'Operation Configuration (Hotel Example)');
  rowIndex++;

  const operationRows: Array<[string, string | number]> = [
    ['operations[0].operationType', 'HOTEL'],
    ['operations[0].id', 'hotel-1'],
    ['operations[0].name', 'My Hotel'],
    ['operations[0].startYear', 2026],
    ['operations[0].horizonYears', 5],
    ['operations[0].keys', 100],
    ['operations[0].avgDailyRate', 250],
    ['operations[0].occupancyByMonth', '0.70,0.70,0.70,0.70,0.70,0.70,0.70,0.70,0.70,0.70,0.70,0.70'],
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

  rowIndex += 2;

  // Section: Capital Structure (Optional)
  addSectionHeader(sheet, rowIndex, 'Capital Structure (Optional)');
  rowIndex++;

  const capitalRows: Array<[string, string | number]> = [
    ['capitalStructure.tranches[0].initialPrincipal', 5_000_000],
    ['capitalStructure.tranches[0].interestRate', 0.08],
    ['capitalStructure.tranches[0].termYears', 10],
    ['capitalStructure.tranches[0].amortizationYears', 10],
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

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const downloadFilename = filename || 'ScenarioTemplate.xlsx';
  saveAs(blob, downloadFilename);
}

/**
 * Adds a section header row.
 */
function addSectionHeader(sheet: ExcelJS.Worksheet, rowIndex: number, text: string): void {
  const cell = sheet.getCell(`A${rowIndex}`);
  cell.value = text;
  cell.font = { bold: true, size: 12, color: { argb: 'FF4472C4' } }; // Blue text
  sheet.getRow(rowIndex).height = 18;
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

