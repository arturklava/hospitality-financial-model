/**
 * Validation primitives for domain objects (v0.8, updated v0.9 with Zod, v1.2 with granular validators).
 * 
 * Provides structural validation functions to protect against invalid data
 * from imports, localStorage, or other external sources.
 * 
 * v0.9: Updated to use Zod schemas for strict validation with business rules.
 * v1.2: Added granular validators for Operation and Capital configs.
 */

import { validateScenarioWithZod } from './schemas';
import type { OperationConfig, CapitalStructureConfig } from './types';

/**
 * Validates if a data object has the structure of a valid scenario.
 * 
 * v0.9: Uses Zod schema validation for strict type checking and business rule validation.
 * Falls back to structural checks if Zod is not available.
 * 
 * This validates:
 * - Required fields exist and have correct types
 * - Numeric values are within valid ranges (e.g., occupancy 0-1, discount rate 0-1)
 * - Arrays are properly structured
 * - Business logic constraints (e.g., horizonYears between 1-50)
 * 
 * @param data - Any data object to validate
 * @returns true if the data is a valid scenario structure, false otherwise
 * 
 * @example
 * ```typescript
 * const imported = JSON.parse(fileContents);
 * if (isScenarioValid(imported)) {
 *   // Safe to use as NamedScenario
 * } else {
 *   // Handle invalid data
 * }
 * ```
 */
/**
 * Validates if a data object has the structure of a valid scenario.
 * 
 * v0.9: Returns validation result with error message if invalid.
 * 
 * @param data - Any data object to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateScenario(data: any): { isValid: boolean; error?: string } {
  // Try Zod validation first (v0.9)
  try {
    const zodResult = validateScenarioWithZod(data);
    if (zodResult.isValid) {
      return { isValid: true };
    }
    return { isValid: false, error: zodResult.error };
  } catch (error) {
    // Zod not available or error - fall back to structural checks
    // Continue with legacy validation below
  }

  // Legacy structural validation (fallback if Zod is not available)
  const legacyResult = isScenarioValidLegacy(data);
  return legacyResult 
    ? { isValid: true }
    : { isValid: false, error: 'Invalid scenario structure: missing required fields or incorrect types' };
}

/**
 * Legacy structural validation (v0.8).
 * @deprecated Use validateScenario instead for better error messages
 */
export function isScenarioValid(data: any): boolean {
  const result = validateScenario(data);
  return result.isValid;
}

/**
 * Legacy structural validation implementation.
 */
function isScenarioValidLegacy(data: any): boolean {

  // Legacy structural validation (fallback if Zod is not available)
  // Must be an object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  // Check for modelConfig (required)
  if (!data.modelConfig || typeof data.modelConfig !== 'object') {
    return false;
  }

  const { modelConfig } = data;

  // Check scenario structure
  if (!modelConfig.scenario || typeof modelConfig.scenario !== 'object') {
    return false;
  }

  const { scenario } = modelConfig;
  if (
    typeof scenario.id !== 'string' ||
    typeof scenario.name !== 'string' ||
    typeof scenario.startYear !== 'number' ||
    typeof scenario.horizonYears !== 'number' ||
    !Array.isArray(scenario.operations)
  ) {
    return false;
  }

  // Check projectConfig structure
  if (!modelConfig.projectConfig || typeof modelConfig.projectConfig !== 'object') {
    return false;
  }

  const { projectConfig } = modelConfig;
  if (
    typeof projectConfig.discountRate !== 'number' ||
    typeof projectConfig.terminalGrowthRate !== 'number' ||
    typeof projectConfig.initialInvestment !== 'number'
  ) {
    return false;
  }

  // Check capitalConfig structure
  if (!modelConfig.capitalConfig || typeof modelConfig.capitalConfig !== 'object') {
    return false;
  }

  const { capitalConfig } = modelConfig;
  if (
    typeof capitalConfig.initialInvestment !== 'number' ||
    !Array.isArray(capitalConfig.debtTranches)
  ) {
    return false;
  }

  // Check waterfallConfig structure
  if (!modelConfig.waterfallConfig || typeof modelConfig.waterfallConfig !== 'object') {
    return false;
  }

  const { waterfallConfig } = modelConfig;
  if (!Array.isArray(waterfallConfig.equityClasses)) {
    return false;
  }

  // Basic validation passed
  return true;
}

/**
 * Validation result type for granular validators.
 * Returns detailed validation information with error messages.
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates operation driver fields for an OperationConfig.
 * 
 * Validates:
 * - occupancy: Must be between 0 and 1 (for operations with occupancy fields)
 * - averageRate: Must be greater than 0 (e.g., avgDailyRate, avgNightlyRate)
 * 
 * @param op - Operation configuration to validate
 * @returns Validation result with isValid boolean and optional error message
 * 
 * @example
 * ```typescript
 * const result = validateOperationDrivers(hotelConfig);
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateOperationDrivers(op: OperationConfig): ValidationResult {
  const errors: string[] = [];

  const validatePercentageFields = (fields: Array<{ name: string; value: number | undefined }>) => {
    fields.forEach(({ name, value }) => {
      if (value === undefined) return;
      if (typeof value !== 'number' || value < 0 || value > 1) {
        errors.push(`${name} must be between 0 and 1, got ${String(value)}`);
      }
    });
  };

  const validateMonthlyArray = (values: number[] | undefined, label: string, bounds?: { min: number; max: number }) => {
    if (!Array.isArray(values)) {
      errors.push(`${label} must be an array of 12 monthly values`);
      return;
    }

    if (values.length !== 12) {
      errors.push(`${label} must contain 12 monthly values, got ${values.length}`);
    }

    values.forEach((value, index) => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push(`${label} month ${index + 1} must be a number, got ${String(value)}`);
        return;
      }

      if (bounds) {
        if (value < bounds.min || value > bounds.max) {
          errors.push(`${label} month ${index + 1} must be between ${bounds.min} and ${bounds.max}, got ${value}`);
        }
      }
    });
  };

  const validatePositiveNumber = (value: number | undefined, label: string) => {
    if (typeof value !== 'number' || value <= 0) {
      errors.push(`${label} must be greater than 0, got ${String(value)}`);
    }
  };

  // Check operation type and validate accordingly
  switch (op.operationType) {
    case 'HOTEL': {
      validateMonthlyArray(op.occupancyByMonth, 'occupancyByMonth', { min: 0, max: 1 });
      validatePositiveNumber(op.avgDailyRate, 'Average daily rate');
      validatePercentageFields([
        { name: 'foodRevenuePctOfRooms', value: op.foodRevenuePctOfRooms },
        { name: 'beverageRevenuePctOfRooms', value: op.beverageRevenuePctOfRooms },
        { name: 'otherRevenuePctOfRooms', value: op.otherRevenuePctOfRooms },
        { name: 'foodCogsPct', value: op.foodCogsPct },
        { name: 'beverageCogsPct', value: op.beverageCogsPct },
        { name: 'commissionsPct', value: op.commissionsPct },
        { name: 'payrollPct', value: op.payrollPct },
        { name: 'utilitiesPct', value: op.utilitiesPct },
        { name: 'marketingPct', value: op.marketingPct },
        { name: 'maintenanceOpexPct', value: op.maintenanceOpexPct },
        { name: 'otherOpexPct', value: op.otherOpexPct },
        { name: 'maintenanceCapexPct', value: op.maintenanceCapexPct },
      ]);
      break;
    }

    case 'VILLAS': {
      validateMonthlyArray(op.occupancyByMonth, 'occupancyByMonth', { min: 0, max: 1 });
      validatePositiveNumber(op.avgNightlyRate, 'Average nightly rate');
      validatePercentageFields([
        { name: 'foodRevenuePctOfRental', value: op.foodRevenuePctOfRental },
        { name: 'beverageRevenuePctOfRental', value: op.beverageRevenuePctOfRental },
        { name: 'otherRevenuePctOfRental', value: op.otherRevenuePctOfRental },
        { name: 'foodCogsPct', value: op.foodCogsPct },
        { name: 'beverageCogsPct', value: op.beverageCogsPct },
        { name: 'commissionsPct', value: op.commissionsPct },
        { name: 'payrollPct', value: op.payrollPct },
        { name: 'utilitiesPct', value: op.utilitiesPct },
        { name: 'marketingPct', value: op.marketingPct },
        { name: 'maintenanceOpexPct', value: op.maintenanceOpexPct },
        { name: 'otherOpexPct', value: op.otherOpexPct },
        { name: 'maintenanceCapexPct', value: op.maintenanceCapexPct },
      ]);
      break;
    }

    case 'RESTAURANT': {
      validateMonthlyArray(op.turnoverByMonth, 'turnoverByMonth');
      validatePositiveNumber(op.avgCheck, 'Average check');
      validatePercentageFields([
        { name: 'foodRevenuePctOfTotal', value: op.foodRevenuePctOfTotal },
        { name: 'beverageRevenuePctOfTotal', value: op.beverageRevenuePctOfTotal },
        { name: 'otherRevenuePctOfTotal', value: op.otherRevenuePctOfTotal },
        { name: 'foodCogsPct', value: op.foodCogsPct },
        { name: 'beverageCogsPct', value: op.beverageCogsPct },
        { name: 'payrollPct', value: op.payrollPct },
        { name: 'utilitiesPct', value: op.utilitiesPct },
        { name: 'marketingPct', value: op.marketingPct },
        { name: 'maintenanceOpexPct', value: op.maintenanceOpexPct },
        { name: 'otherOpexPct', value: op.otherOpexPct },
        { name: 'maintenanceCapexPct', value: op.maintenanceCapexPct },
      ]);
      break;
    }

    case 'RETAIL':
    case 'FLEX': {
      validateMonthlyArray(op.occupancyByMonth, 'occupancyByMonth', { min: 0, max: 1 });
      validatePositiveNumber(op.avgRentPerSqm, 'Average rent per sqm');
      validatePercentageFields([
        { name: 'rentalRevenuePctOfTotal', value: op.rentalRevenuePctOfTotal },
        { name: 'otherRevenuePctOfTotal', value: op.otherRevenuePctOfTotal },
        { name: 'payrollPct', value: op.payrollPct },
        { name: 'utilitiesPct', value: op.utilitiesPct },
        { name: 'marketingPct', value: op.marketingPct },
        { name: 'maintenanceOpexPct', value: op.maintenanceOpexPct },
        { name: 'otherOpexPct', value: op.otherOpexPct },
        { name: 'maintenanceCapexPct', value: op.maintenanceCapexPct },
      ]);
      break;
    }

    case 'BEACH_CLUB':
    case 'WELLNESS': {
      validateMonthlyArray(op.utilizationByMonth, 'utilizationByMonth', { min: 0, max: 1 });
      validatePositiveNumber(op.avgDailyPassPrice, 'Average daily pass price');
      validatePercentageFields([
        { name: 'foodRevenuePctOfTotal', value: op.foodRevenuePctOfTotal },
        { name: 'beverageRevenuePctOfTotal', value: op.beverageRevenuePctOfTotal },
        { name: 'otherRevenuePctOfTotal', value: op.otherRevenuePctOfTotal },
        { name: 'foodCogsPct', value: op.foodCogsPct },
        { name: 'beverageCogsPct', value: op.beverageCogsPct },
        { name: 'payrollPct', value: op.payrollPct },
        { name: 'utilitiesPct', value: op.utilitiesPct },
        { name: 'marketingPct', value: op.marketingPct },
        { name: 'maintenanceOpexPct', value: op.maintenanceOpexPct },
        { name: 'otherOpexPct', value: op.otherOpexPct },
        { name: 'maintenanceCapexPct', value: op.maintenanceCapexPct },
      ]);
      break;
    }

    case 'RACQUET': {
      validateMonthlyArray(op.utilizationByMonth, 'utilizationByMonth', { min: 0, max: 1 });
      validatePositiveNumber(op.avgCourtRate, 'Average court rate');
      validatePercentageFields([
        { name: 'foodRevenuePctOfTotal', value: op.foodRevenuePctOfTotal },
        { name: 'beverageRevenuePctOfTotal', value: op.beverageRevenuePctOfTotal },
        { name: 'otherRevenuePctOfTotal', value: op.otherRevenuePctOfTotal },
        { name: 'foodCogsPct', value: op.foodCogsPct },
        { name: 'beverageCogsPct', value: op.beverageCogsPct },
        { name: 'payrollPct', value: op.payrollPct },
        { name: 'utilitiesPct', value: op.utilitiesPct },
        { name: 'marketingPct', value: op.marketingPct },
        { name: 'maintenanceOpexPct', value: op.maintenanceOpexPct },
        { name: 'otherOpexPct', value: op.otherOpexPct },
        { name: 'maintenanceCapexPct', value: op.maintenanceCapexPct },
      ]);
      break;
    }

    case 'SENIOR_LIVING': {
      validateMonthlyArray(op.occupancyByMonth, 'occupancyByMonth', { min: 0, max: 1 });
      validatePositiveNumber(op.avgMonthlyRate, 'Average monthly rate');
      validatePercentageFields([
        { name: 'careRevenuePctOfRental', value: op.careRevenuePctOfRental },
        { name: 'foodRevenuePctOfRental', value: op.foodRevenuePctOfRental },
        { name: 'otherRevenuePctOfRental', value: op.otherRevenuePctOfRental },
        { name: 'foodCogsPct', value: op.foodCogsPct },
        { name: 'careCogsPct', value: op.careCogsPct },
        { name: 'payrollPct', value: op.payrollPct },
        { name: 'utilitiesPct', value: op.utilitiesPct },
        { name: 'marketingPct', value: op.marketingPct },
        { name: 'maintenanceOpexPct', value: op.maintenanceOpexPct },
        { name: 'otherOpexPct', value: op.otherOpexPct },
        { name: 'maintenanceCapexPct', value: op.maintenanceCapexPct },
      ]);
      break;
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join('; '),
    };
  }

  return { isValid: true };
}

/**
 * Validates capital input fields for a CapitalStructureConfig.
 * 
 * Validates:
 * - ltv: Implied loan-to-value ratio (total debt / initialInvestment) must be between 0 and 1
 * - initialInvestment: Must be greater than 0
 * 
 * Note: Empty debtTranches array is allowed (All-Equity deals) (v1.3: Capital Logic Helpers).
 * 
 * @param config - Capital structure configuration to validate
 * @returns Validation result with isValid boolean and optional error message
 * 
 * @example
 * ```typescript
 * const result = validateCapitalInputs(capitalConfig);
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateCapitalInputs(config: CapitalStructureConfig): ValidationResult {
  const errors: string[] = [];

  // Validate initialInvestment > 0
  if (typeof config.initialInvestment !== 'number' || config.initialInvestment <= 0) {
    errors.push(`Initial investment must be greater than 0, got ${config.initialInvestment}`);
  }

  // Validate debt tranches and calculate implied LTV
  // Empty array is allowed (All-Equity deals) - validation only runs if tranches exist
  if (config.debtTranches && Array.isArray(config.debtTranches) && config.debtTranches.length > 0) {
    let totalDebt = 0;

    for (const tranche of config.debtTranches) {
      // Use initialPrincipal if available, fall back to amount for backward compatibility
      const principal = tranche.initialPrincipal ?? tranche.amount;
      
      if (principal !== undefined && typeof principal === 'number') {
        if (principal <= 0) {
          errors.push(`Debt tranche ${tranche.id || 'unnamed'} principal must be greater than 0, got ${principal}`);
        } else {
          totalDebt += principal;
        }
      }
    }

    // Validate implied LTV (0-1)
    if (config.initialInvestment > 0 && totalDebt > 0) {
      const ltv = totalDebt / config.initialInvestment;
      if (ltv < 0 || ltv > 1) {
        errors.push(`Implied LTV (loan-to-value) must be between 0 and 1, got ${ltv.toFixed(4)} (debt: ${totalDebt}, investment: ${config.initialInvestment})`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join('; '),
    };
  }

  return { isValid: true };
}

