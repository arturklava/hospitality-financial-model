/**
 * Input conversion utilities for UI ↔ Model data transformation (v1.2).
 * 
 * Handles bidirectional conversion between UI percentage values (e.g., 50 for 50%)
 * and model decimal values (e.g., 0.5 for 50%).
 * 
 * Features:
 * - Rounding to avoid floating point errors
 * - Safe number parsing with empty string handling
 * - Pure functions with no side effects
 */

/**
 * Precision for percentage conversion (number of decimal places).
 * Used to avoid floating point errors when converting between UI and model formats.
 */
const PERCENTAGE_PRECISION = 8;

/**
 * Converts a UI percentage value (e.g., 50) to a model decimal value (e.g., 0.5).
 * 
 * Handles rounding to avoid floating point errors (e.g., 0.1 + 0.2 issues).
 * 
 * @param uiValue - UI percentage value (e.g., 50 for 50%)
 * @returns Model decimal value (e.g., 0.5 for 50%)
 * 
 * @example
 * ```typescript
 * toModelPercent(50); // returns 0.5
 * toModelPercent(33.33); // returns 0.3333
 * toModelPercent(100); // returns 1.0
 * ```
 */
export function toModelPercent(uiValue: number): number {
  // Convert to decimal and round to avoid floating point errors
  return Math.round((uiValue / 100) * Math.pow(10, PERCENTAGE_PRECISION)) / Math.pow(10, PERCENTAGE_PRECISION);
}

/**
 * Converts a model decimal value (e.g., 0.5) to a UI percentage value (e.g., 50).
 * 
 * @param modelValue - Model decimal value (e.g., 0.5 for 50%)
 * @returns UI percentage value (e.g., 50 for 50%)
 * 
 * @example
 * ```typescript
 * toUiPercent(0.5); // returns 50
 * toUiPercent(0.3333); // returns 33.33
 * toUiPercent(1.0); // returns 100
 * ```
 */
export function toUiPercent(modelValue: number): number {
  // Convert to percentage and round to avoid floating point errors
  return Math.round(modelValue * 100 * Math.pow(10, PERCENTAGE_PRECISION)) / Math.pow(10, PERCENTAGE_PRECISION);
}

/**
 * Safely parses a number from a string value.
 * Handles empty strings, whitespace, and invalid input.
 * 
 * @param value - String value to parse
 * @param defaultValue - Default value to return if parsing fails (default: 0)
 * @returns Parsed number or default value
 * 
 * @example
 * ```typescript
 * parseNumber('50'); // returns 50
 * parseNumber('50.5'); // returns 50.5
 * parseNumber(''); // returns 0 (or defaultValue)
 * parseNumber('   '); // returns 0 (or defaultValue)
 * parseNumber('invalid'); // returns 0 (or defaultValue)
 * parseNumber('', undefined); // returns undefined
 * ```
 */
export function parseNumber(value: string, defaultValue: number = 0): number {
  if (!value || typeof value !== 'string') {
    return defaultValue;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return defaultValue;
  }

  const parsed = parseFloat(trimmed);
  if (isNaN(parsed)) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Safely parses a number from a string value, returning undefined instead of a default.
 * Useful when you want to distinguish between 0 and missing/undefined values.
 * 
 * @param value - String value to parse
 * @returns Parsed number or undefined if parsing fails
 * 
 * @example
 * ```typescript
 * parseNumberOrUndefined('50'); // returns 50
 * parseNumberOrUndefined(''); // returns undefined
 * parseNumberOrUndefined('invalid'); // returns undefined
 * ```
 */
export function parseNumberOrUndefined(value: string): number | undefined {
  if (!value || typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }

  const parsed = parseFloat(trimmed);
  if (isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}

/**
 * Converts a UI percentage string (e.g., "50") to a model decimal value (e.g., 0.5).
 * Combines parsing and conversion in a single operation.
 * 
 * @param uiValue - UI percentage string (e.g., "50" for 50%)
 * @param defaultValue - Default value in model format if parsing fails (default: 0)
 * @returns Model decimal value (e.g., 0.5 for 50%)
 * 
 * @example
 * ```typescript
 * parseUiPercentToModel('50'); // returns 0.5
 * parseUiPercentToModel('33.33'); // returns 0.3333
 * parseUiPercentToModel(''); // returns 0
 * parseUiPercentToModel('', 0.5); // returns 0.5 (default in model format)
 * ```
 */
export function parseUiPercentToModel(uiValue: string, defaultValue: number = 0): number {
  const parsed = parseNumberOrUndefined(uiValue);
  if (parsed === undefined) {
    return defaultValue;
  }
  return toModelPercent(parsed);
}

/**
 * Converts a UI percentage string (e.g., "50") to a model decimal value, returning undefined if invalid.
 * 
 * @param uiValue - UI percentage string (e.g., "50" for 50%)
 * @returns Model decimal value or undefined if parsing fails
 * 
 * @example
 * ```typescript
 * parseUiPercentToModelOrUndefined('50'); // returns 0.5
 * parseUiPercentToModelOrUndefined(''); // returns undefined
 * ```
 */
export function parseUiPercentToModelOrUndefined(uiValue: string): number | undefined {
  const parsed = parseNumberOrUndefined(uiValue);
  if (parsed === undefined) {
    return undefined;
  }
  return toModelPercent(parsed);
}

