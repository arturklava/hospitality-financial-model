/**
 * Excel Import Service (v2.9)
 * 
 * Parses Excel files to construct NamedScenario objects.
 * Uses exceljs to read "Input_Data" sheet with key-value pairs.
 * 
 * Template Structure:
 * - Sheet Name: "Input_Data" (strict requirement)
 * - Format: Key-Value pairs
 * - Columns: "Key", "Value"
 * - Keys: Structured like "project.discountRate", "operations[0].keys", etc.
 */

import ExcelJS from 'exceljs';
import type { NamedScenario, FullModelInput, ProjectConfig, ProjectScenario, OperationConfig, HotelConfig } from '@domain/types';
import { isScenarioValid } from '@domain/validation';
import { buildHotelConfig } from '../../tests/helpers/buildOperationConfig';
import { buildSingleTrancheCapitalConfig } from '../../tests/helpers/buildCapitalConfig';
import { buildBaselineWaterfallConfig } from '../../tests/helpers/buildWaterfallConfig';

/**
 * Parses an Excel file and constructs a NamedScenario.
 * 
 * @param file - The Excel file to parse
 * @returns Promise that resolves to a NamedScenario
 * @throws Error if the file cannot be parsed, required sheets are missing, or data is invalid
 */
export async function parseExcelScenario(file: File): Promise<NamedScenario> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  // Look for a sheet named "Input_Data" (strict requirement per ARCHITECTURE.md)
  const inputDataSheet = workbook.getWorksheet('Input_Data');
  if (!inputDataSheet) {
    throw new Error('Sheet named "Input_Data" not found in Excel file. Please ensure the template contains an "Input_Data" sheet.');
  }

  // Read key-value pairs from the Input_Data sheet
  // Format: Column A = Key, Column B = Value
  const keyValueMap = new Map<string, string | number>();

  // Check header row (row 1)
  const headerRow = inputDataSheet.getRow(1);
  const keyHeader = String(headerRow.getCell(1).value || '').trim();
  const valueHeader = String(headerRow.getCell(2).value || '').trim();

  if (keyHeader.toLowerCase() !== 'key' || valueHeader.toLowerCase() !== 'value') {
    throw new Error(
      `Invalid header format. Expected columns "Key" and "Value", but found "${keyHeader}" and "${valueHeader}".`
    );
  }

  // Read data rows starting from row 2
  let rowIndex = 2;
  while (true) {
    const row = inputDataSheet.getRow(rowIndex);
    const keyCell = row.getCell(1);
    const valueCell = row.getCell(2);

    // Stop if key cell is empty
    if (!keyCell.value || String(keyCell.value).trim() === '') {
      break;
    }

    const key = String(keyCell.value).trim();
    const value = valueCell.value;

    // Skip empty values but keep the key
    if (value !== null && value !== undefined) {
      // Convert numeric values
      if (typeof value === 'number') {
        keyValueMap.set(key, value);
      } else {
        const stringValue = String(value).trim();
        // Check if this looks like a comma-separated array (for occupancy, etc.)
        if (stringValue.includes(',') && stringValue.split(',').length > 1) {
          // Preserve as string for array parsing
          keyValueMap.set(key, stringValue);
        } else {
          // Try to parse as number if it's a string
          const numValue = parseFloat(stringValue);
          if (!isNaN(numValue) && isFinite(numValue) && stringValue === String(numValue)) {
            // Only convert if the entire string is a number (not partial like "0.60,0.65")
            keyValueMap.set(key, numValue);
          } else {
            keyValueMap.set(key, stringValue);
          }
        }
      }
    }

    rowIndex++;
    // Safety: limit to 1000 rows
    if (rowIndex > 1000) {
      break;
    }
  }

  if (keyValueMap.size === 0) {
    throw new Error('No data found in Input_Data sheet. Please fill in the template with scenario values.');
  }

  // Build FullModelInput from key-value map
  const modelConfig = buildFullModelInputFromKeyValueMap(keyValueMap);

  // Build NamedScenario
  const scenarioId = keyValueMap.get('scenario.id') ||
    keyValueMap.get('scenarioId') ||
    `imported-${Date.now()}`;
  const scenarioName = keyValueMap.get('scenario.name') ||
    keyValueMap.get('scenarioName') ||
    'Imported Scenario';
  const description = keyValueMap.get('scenario.description') ||
    keyValueMap.get('description');

  const namedScenario: NamedScenario = {
    id: String(scenarioId),
    name: String(scenarioName),
    description: description ? String(description) : undefined,
    modelConfig,
  };

  // Validate using Zod schema
  const validationResult = isScenarioValid(namedScenario);
  if (!validationResult) {
    throw new Error('Imported scenario failed validation. Please check that all required fields are provided and have valid values.');
  }

  return namedScenario;
}

/**
 * Builds a FullModelInput from a key-value map.
 * 
 * Supports keys like:
 * - project.discountRate
 * - project.terminalGrowthRate
 * - project.initialInvestment
 * - scenario.startYear
 * - scenario.horizonYears
 * - operations[0].operationType
 * - operations[0].keys (for HOTEL)
 * - operations[0].avgDailyRate (for HOTEL)
 * etc.
 */
function buildFullModelInputFromKeyValueMap(keyValueMap: Map<string, string | number>): FullModelInput {
  // Build ProjectConfig
  const projectConfig: ProjectConfig = {
    discountRate: getNumber(keyValueMap, 'project.discountRate', 0.10),
    terminalGrowthRate: getNumber(keyValueMap, 'project.terminalGrowthRate', 0.02),
    initialInvestment: getNumber(keyValueMap, 'project.initialInvestment', 10_000_000),
    workingCapitalPercentage: getNumberOptional(keyValueMap, 'project.workingCapitalPercentage'),
    workingCapitalPercent: getNumberOptional(keyValueMap, 'project.workingCapitalPercent'),
    taxRate: getNumberOptional(keyValueMap, 'project.taxRate'),
  };

  // Build ProjectScenario
  const scenario: ProjectScenario = {
    id: String(keyValueMap.get('scenario.id') || keyValueMap.get('scenarioId') || 'imported-scenario'),
    name: String(keyValueMap.get('scenario.name') || keyValueMap.get('scenarioName') || 'Imported Scenario'),
    startYear: getNumber(keyValueMap, 'scenario.startYear', 2026),
    horizonYears: getNumber(keyValueMap, 'scenario.horizonYears', 5),
    operations: buildOperationsFromKeyValueMap(keyValueMap),
  };

  // Build CapitalConfig (use helper with defaults)
  const capitalConfig = buildSingleTrancheCapitalConfig({
    initialInvestment: projectConfig.initialInvestment,
  });

  // Override if specific capital keys are provided
  const debtAmount = getNumberOptional(keyValueMap, 'capitalStructure.tranches[0].initialPrincipal') ||
    getNumberOptional(keyValueMap, 'capitalStructure.tranches[0].amount') ||
    getNumberOptional(keyValueMap, 'capitalStructure.debtTranches[0].initialPrincipal') || // Backward compatibility
    getNumberOptional(keyValueMap, 'capitalStructure.debtTranches[0].amount'); // Backward compatibility

  if (debtAmount !== undefined && capitalConfig.debt.length > 0) {
    capitalConfig.debt[0] = {
      ...capitalConfig.debt[0],
      initialPrincipal: debtAmount,
      interestRate: getNumber(keyValueMap, 'capitalStructure.tranches[0].interestRate',
        getNumber(keyValueMap, 'capitalStructure.debtTranches[0].interestRate', 0.08)), // Check old key if new not found
      termYears: getNumber(keyValueMap, 'capitalStructure.tranches[0].termYears',
        getNumber(keyValueMap, 'capitalStructure.debtTranches[0].termYears', 10)),
      amortizationYears: getNumber(keyValueMap, 'capitalStructure.tranches[0].amortizationYears',
        getNumber(keyValueMap, 'capitalStructure.debtTranches[0].amortizationYears', 10)),
    };
  }

  // Build WaterfallConfig (use helper with defaults)
  const waterfallConfig = buildBaselineWaterfallConfig();

  return {
    scenario,
    projectConfig,
    capitalConfig,
    waterfallConfig,
  };
}

/**
 * Builds operations array from key-value map.
 * 
 * For now, supports HOTEL operations only (can be extended later).
 * Looks for keys like:
 * - operations[0].operationType
 * - operations[0].keys
 * - operations[0].avgDailyRate
 * - operations[0].occupancyByMonth
 * etc.
 */
function buildOperationsFromKeyValueMap(keyValueMap: Map<string, string | number>): OperationConfig[] {
  const operations: OperationConfig[] = [];

  // Check for operations[0]
  const op0Type = String(keyValueMap.get('operations[0].operationType') || 'HOTEL').toUpperCase();

  if (op0Type === 'HOTEL') {
    const hotelConfig: HotelConfig = buildHotelConfig({
      id: String(keyValueMap.get('operations[0].id') || keyValueMap.get('operations[0].operationId') || 'hotel-1'),
      name: String(keyValueMap.get('operations[0].name') || keyValueMap.get('operations[0].operationName') || 'Imported Hotel'),
      keys: getNumber(keyValueMap, 'operations[0].keys', 100),
      avgDailyRate: getNumber(keyValueMap, 'operations[0].avgDailyRate', 250),
      occupancyByMonth: parseOccupancyArray(keyValueMap, 'operations[0].occupancyByMonth'),
      foodRevenuePctOfRooms: getNumber(keyValueMap, 'operations[0].foodRevenuePctOfRooms', 0.30),
      beverageRevenuePctOfRooms: getNumber(keyValueMap, 'operations[0].beverageRevenuePctOfRooms', 0.15),
      otherRevenuePctOfRooms: getNumber(keyValueMap, 'operations[0].otherRevenuePctOfRooms', 0.10),
      foodCogsPct: getNumber(keyValueMap, 'operations[0].foodCogsPct', 0.35),
      beverageCogsPct: getNumber(keyValueMap, 'operations[0].beverageCogsPct', 0.25),
      payrollPct: getNumber(keyValueMap, 'operations[0].payrollPct', 0.35),
      utilitiesPct: getNumber(keyValueMap, 'operations[0].utilitiesPct', 0.05),
      marketingPct: getNumber(keyValueMap, 'operations[0].marketingPct', 0.03),
      maintenanceOpexPct: getNumber(keyValueMap, 'operations[0].maintenanceOpexPct', 0.04),
      otherOpexPct: getNumber(keyValueMap, 'operations[0].otherOpexPct', 0.03),
      maintenanceCapexPct: getNumber(keyValueMap, 'operations[0].maintenanceCapexPct', 0.02),
      startYear: getNumber(keyValueMap, 'operations[0].startYear', 2026),
      horizonYears: getNumber(keyValueMap, 'operations[0].horizonYears', 5),
    });
    operations.push(hotelConfig);
  } else {
    // Default to hotel if operation type is not recognized
    operations.push(buildHotelConfig());
  }

  return operations;
}

/**
 * Helper to get a number from key-value map with a default value.
 */
function getNumber(keyValueMap: Map<string, string | number>, key: string, defaultValue: number): number {
  const value = keyValueMap.get(key);
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
  }
  return defaultValue;
}

/**
 * Helper to get an optional number from key-value map.
 */
function getNumberOptional(keyValueMap: Map<string, string | number>, key: string): number | undefined {
  const value = keyValueMap.get(key);
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
  }
  return undefined;
}

/**
 * Parses an occupancy array from key-value map.
 * Supports comma-separated values or a single value repeated 12 times.
 */
function parseOccupancyArray(keyValueMap: Map<string, string | number>, key: string): number[] {
  const value = keyValueMap.get(key);

  if (typeof value === 'string') {
    // Try to parse as comma-separated values
    const parts = value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v) && isFinite(v));
    if (parts.length === 12) {
      return parts;
    }
    // If single value, repeat 12 times
    if (parts.length === 1) {
      return Array(12).fill(parts[0]);
    }
  }

  if (typeof value === 'number') {
    return Array(12).fill(value);
  }

  // Default occupancy
  return Array(12).fill(0.70);
}

