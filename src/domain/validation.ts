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
  const opLabel = op.name ? `${op.name} (${op.operationType})` : op.operationType;
  const prefix = `Operation ${opLabel}`;
  const errors: string[] = [];

  // Check operation type and validate accordingly
  switch (op.operationType) {
    case 'HOTEL': {
      // Validate occupancy (0-1)
      if (op.occupancyByMonth && Array.isArray(op.occupancyByMonth)) {
        for (let i = 0; i < op.occupancyByMonth.length; i++) {
          const occupancy = op.occupancyByMonth[i];
          if (typeof occupancy !== 'number' || occupancy < 0 || occupancy > 1) {
            errors.push(
              `${prefix} occupancy month ${i + 1} (0-1 scale) must be between 0 and 1, got ${occupancy}`
            );
          }
        }
      }

      // Validate average daily rate (> 0)
      if (typeof op.avgDailyRate !== 'number' || op.avgDailyRate <= 0) {
        errors.push(`${prefix} avgDailyRate must be greater than 0, got ${op.avgDailyRate}`);
      }
      break;
    }

    case 'VILLAS': {
      // Validate occupancy (0-1)
      if (op.occupancyByMonth && Array.isArray(op.occupancyByMonth)) {
        for (let i = 0; i < op.occupancyByMonth.length; i++) {
          const occupancy = op.occupancyByMonth[i];
          if (typeof occupancy !== 'number' || occupancy < 0 || occupancy > 1) {
            errors.push(
              `${prefix} occupancy month ${i + 1} (0-1 scale) must be between 0 and 1, got ${occupancy}`
            );
          }
        }
      }

      // Validate average nightly rate (> 0)
      if (typeof op.avgNightlyRate !== 'number' || op.avgNightlyRate <= 0) {
        errors.push(`${prefix} avgNightlyRate must be greater than 0, got ${op.avgNightlyRate}`);
      }
      break;
    }

    case 'RESTAURANT': {
      // Validate turnover (can be > 1 for restaurants)
      // No specific validation needed beyond type check

      // Validate average check (> 0)
      if (typeof op.avgCheck !== 'number' || op.avgCheck <= 0) {
        errors.push(`${prefix} avgCheck must be greater than 0, got ${op.avgCheck}`);
      }
      break;
    }

    case 'RETAIL':
    case 'FLEX': {
      // Validate occupancy (0-1)
      if (op.occupancyByMonth && Array.isArray(op.occupancyByMonth)) {
        for (let i = 0; i < op.occupancyByMonth.length; i++) {
          const occupancy = op.occupancyByMonth[i];
          if (typeof occupancy !== 'number' || occupancy < 0 || occupancy > 1) {
            errors.push(
              `${prefix} occupancy month ${i + 1} (0-1 scale) must be between 0 and 1, got ${occupancy}`
            );
          }
        }
      }

      // Validate average rent per sqm (> 0)
      if (typeof op.avgRentPerSqm !== 'number' || op.avgRentPerSqm <= 0) {
        errors.push(`${prefix} avgRentPerSqm must be greater than 0, got ${op.avgRentPerSqm}`);
      }
      break;
    }

    case 'BEACH_CLUB':
    case 'WELLNESS': {
      // Validate utilization (0-1) for daily passes
      if (op.utilizationByMonth && Array.isArray(op.utilizationByMonth)) {
        for (let i = 0; i < op.utilizationByMonth.length; i++) {
          const utilization = op.utilizationByMonth[i];
          if (typeof utilization !== 'number' || utilization < 0 || utilization > 1) {
            errors.push(
              `${prefix} utilization month ${i + 1} (0-1 scale) must be between 0 and 1, got ${utilization}`
            );
          }
        }
      }

      // Validate average daily pass price (> 0)
      if (typeof op.avgDailyPassPrice !== 'number' || op.avgDailyPassPrice <= 0) {
        errors.push(`${prefix} avgDailyPassPrice must be greater than 0, got ${op.avgDailyPassPrice}`);
      }
      break;
    }

    case 'RACQUET': {
      // Validate utilization (0-1)
      if (op.utilizationByMonth && Array.isArray(op.utilizationByMonth)) {
        for (let i = 0; i < op.utilizationByMonth.length; i++) {
          const utilization = op.utilizationByMonth[i];
          if (typeof utilization !== 'number' || utilization < 0 || utilization > 1) {
            errors.push(
              `${prefix} utilization month ${i + 1} (0-1 scale) must be between 0 and 1, got ${utilization}`
            );
          }
        }
      }

      // Validate average court rate (> 0)
      if (typeof op.avgCourtRate !== 'number' || op.avgCourtRate <= 0) {
        errors.push(`${prefix} avgCourtRate must be greater than 0, got ${op.avgCourtRate}`);
      }
      break;
    }

    case 'SENIOR_LIVING': {
      // Validate occupancy (0-1)
      if (op.occupancyByMonth && Array.isArray(op.occupancyByMonth)) {
        for (let i = 0; i < op.occupancyByMonth.length; i++) {
          const occupancy = op.occupancyByMonth[i];
          if (typeof occupancy !== 'number' || occupancy < 0 || occupancy > 1) {
            errors.push(
              `${prefix} occupancy month ${i + 1} (0-1 scale) must be between 0 and 1, got ${occupancy}`
            );
          }
        }
      }

      // Validate average monthly rate (> 0)
      if (typeof op.avgMonthlyRate !== 'number' || op.avgMonthlyRate <= 0) {
        errors.push(`${prefix} avgMonthlyRate must be greater than 0, got ${op.avgMonthlyRate}`);
      }
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

