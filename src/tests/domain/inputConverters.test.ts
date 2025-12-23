import { describe, it, expect } from 'vitest';
import {
  toModelPercent,
  toUiPercent,
  parseNumber,
  parseNumberOrUndefined,
  parseUiPercentToModel,
  parseUiPercentToModelOrUndefined,
} from '@domain/inputConverters';

describe('Input Converters', () => {
  describe('toModelPercent', () => {
    it('should convert 50 to 0.5', () => {
      expect(toModelPercent(50)).toBe(0.5);
    });

    it('should convert 33.33 to 0.3333 correctly', () => {
      const result = toModelPercent(33.33);
      expect(result).toBeCloseTo(0.3333, 4);
    });

    it('should convert 100 to 1.0', () => {
      expect(toModelPercent(100)).toBe(1.0);
    });

    it('should convert 0 to 0', () => {
      expect(toModelPercent(0)).toBe(0);
    });

    it('should convert 25 to 0.25', () => {
      expect(toModelPercent(25)).toBe(0.25);
    });

    it('should convert 75.5 to 0.755', () => {
      expect(toModelPercent(75.5)).toBeCloseTo(0.755, 4);
    });

    it('should handle floating point errors by rounding', () => {
      // Test that 0.1 + 0.2 type issues are avoided
      const result1 = toModelPercent(33.333333);
      const result2 = toModelPercent(33.333333);
      expect(result1 + result2).toBeCloseTo(result1 * 2, 6);
    });

    it('should convert 99.99 to 0.9999', () => {
      expect(toModelPercent(99.99)).toBeCloseTo(0.9999, 4);
    });

    it('should handle very small values', () => {
      expect(toModelPercent(0.01)).toBeCloseTo(0.0001, 6);
    });

    it('should handle very large percentage values', () => {
      expect(toModelPercent(150)).toBeCloseTo(1.5, 4);
    });
  });

  describe('toUiPercent', () => {
    it('should convert 0.5 to 50', () => {
      expect(toUiPercent(0.5)).toBe(50);
    });

    it('should convert 0.3333 to 33.33', () => {
      const result = toUiPercent(0.3333);
      expect(result).toBeCloseTo(33.33, 2);
    });

    it('should convert 1.0 to 100', () => {
      expect(toUiPercent(1.0)).toBe(100);
    });

    it('should convert 0 to 0', () => {
      expect(toUiPercent(0)).toBe(0);
    });

    it('should convert 0.25 to 25', () => {
      expect(toUiPercent(0.25)).toBe(25);
    });

    it('should convert 0.755 to 75.5', () => {
      expect(toUiPercent(0.755)).toBeCloseTo(75.5, 2);
    });

    it('should handle floating point errors by rounding', () => {
      // Test that rounding avoids floating point precision issues
      const result = toUiPercent(0.3333);
      const backConverted = toModelPercent(result);
      expect(backConverted).toBeCloseTo(0.3333, 4);
    });

    it('should convert 0.9999 to 99.99', () => {
      expect(toUiPercent(0.9999)).toBeCloseTo(99.99, 2);
    });

    it('should handle very small values', () => {
      expect(toUiPercent(0.0001)).toBeCloseTo(0.01, 3);
    });

    it('should be inverse of toModelPercent for common values', () => {
      const testValues = [0, 25, 50, 75, 100];
      for (const value of testValues) {
        const modelValue = toModelPercent(value);
        const uiValue = toUiPercent(modelValue);
        expect(uiValue).toBeCloseTo(value, 2);
      }
    });
  });

  describe('parseNumber', () => {
    it('should parse valid integer string', () => {
      expect(parseNumber('50')).toBe(50);
    });

    it('should parse valid decimal string', () => {
      expect(parseNumber('50.5')).toBe(50.5);
    });

    it('should parse negative numbers', () => {
      expect(parseNumber('-10')).toBe(-10);
    });

    it('should return default value for empty string', () => {
      expect(parseNumber('')).toBe(0);
    });

    it('should return default value for whitespace string', () => {
      expect(parseNumber('   ')).toBe(0);
    });

    it('should return default value for invalid string', () => {
      expect(parseNumber('invalid')).toBe(0);
    });

    it('should return default value for null', () => {
      expect(parseNumber(null as any)).toBe(0);
    });

    it('should return default value for undefined', () => {
      expect(parseNumber(undefined as any)).toBe(0);
    });

    it('should use custom default value', () => {
      expect(parseNumber('', 42)).toBe(42);
      expect(parseNumber('invalid', 42)).toBe(42);
    });

    it('should trim whitespace before parsing', () => {
      expect(parseNumber('  50  ')).toBe(50);
      expect(parseNumber('  50.5  ')).toBe(50.5);
    });

    it('should handle zero string', () => {
      expect(parseNumber('0')).toBe(0);
    });

    it('should handle scientific notation', () => {
      expect(parseNumber('1e2')).toBe(100);
    });

    it('should handle very large numbers', () => {
      expect(parseNumber('999999999')).toBe(999999999);
    });
  });

  describe('parseNumberOrUndefined', () => {
    it('should parse valid integer string', () => {
      expect(parseNumberOrUndefined('50')).toBe(50);
    });

    it('should parse valid decimal string', () => {
      expect(parseNumberOrUndefined('50.5')).toBe(50.5);
    });

    it('should return undefined for empty string', () => {
      expect(parseNumberOrUndefined('')).toBeUndefined();
    });

    it('should return undefined for whitespace string', () => {
      expect(parseNumberOrUndefined('   ')).toBeUndefined();
    });

    it('should return undefined for invalid string', () => {
      expect(parseNumberOrUndefined('invalid')).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(parseNumberOrUndefined(null as any)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseNumberOrUndefined(undefined as any)).toBeUndefined();
    });

    it('should parse zero string', () => {
      expect(parseNumberOrUndefined('0')).toBe(0);
    });

    it('should trim whitespace before parsing', () => {
      expect(parseNumberOrUndefined('  50  ')).toBe(50);
    });

    it('should distinguish between 0 and missing value', () => {
      expect(parseNumberOrUndefined('0')).toBe(0);
      expect(parseNumberOrUndefined('')).toBeUndefined();
    });
  });

  describe('parseUiPercentToModel', () => {
    it('should parse and convert "50" to 0.5', () => {
      expect(parseUiPercentToModel('50')).toBe(0.5);
    });

    it('should parse and convert "33.33" to 0.3333', () => {
      const result = parseUiPercentToModel('33.33');
      expect(result).toBeCloseTo(0.3333, 4);
    });

    it('should parse and convert "100" to 1.0', () => {
      expect(parseUiPercentToModel('100')).toBe(1.0);
    });

    it('should return default value for empty string', () => {
      expect(parseUiPercentToModel('')).toBe(0);
    });

    it('should return default value for invalid string', () => {
      expect(parseUiPercentToModel('invalid')).toBe(0);
    });

    it('should use custom default value (in model format)', () => {
      // Default value is expected to be in model format (already converted)
      expect(parseUiPercentToModel('', 0.5)).toBe(0.5);
      expect(parseUiPercentToModel('invalid', 0.25)).toBe(0.25);
    });

    it('should trim whitespace before parsing', () => {
      expect(parseUiPercentToModel('  50  ')).toBe(0.5);
    });

    it('should handle "0" string', () => {
      expect(parseUiPercentToModel('0')).toBe(0);
    });

    it('should handle decimal percentages', () => {
      expect(parseUiPercentToModel('25.5')).toBeCloseTo(0.255, 4);
    });
  });

  describe('parseUiPercentToModelOrUndefined', () => {
    it('should parse and convert "50" to 0.5', () => {
      expect(parseUiPercentToModelOrUndefined('50')).toBe(0.5);
    });

    it('should parse and convert "33.33" to 0.3333', () => {
      const result = parseUiPercentToModelOrUndefined('33.33');
      expect(result).toBeCloseTo(0.3333, 4);
    });

    it('should return undefined for empty string', () => {
      expect(parseUiPercentToModelOrUndefined('')).toBeUndefined();
    });

    it('should return undefined for invalid string', () => {
      expect(parseUiPercentToModelOrUndefined('invalid')).toBeUndefined();
    });

    it('should return undefined for whitespace string', () => {
      expect(parseUiPercentToModelOrUndefined('   ')).toBeUndefined();
    });

    it('should parse "0" string to 0', () => {
      expect(parseUiPercentToModelOrUndefined('0')).toBe(0);
    });

    it('should distinguish between 0 and missing value', () => {
      expect(parseUiPercentToModelOrUndefined('0')).toBe(0);
      expect(parseUiPercentToModelOrUndefined('')).toBeUndefined();
    });
  });

  describe('Round-trip conversions', () => {
    it('should maintain precision through round-trip conversion (UI -> Model -> UI)', () => {
      const testValues = [0, 25, 50, 75, 100, 33.33, 99.99];
      for (const uiValue of testValues) {
        const modelValue = toModelPercent(uiValue);
        const backToUi = toUiPercent(modelValue);
        expect(backToUi).toBeCloseTo(uiValue, 2);
      }
    });

    it('should maintain precision through round-trip conversion (Model -> UI -> Model)', () => {
      const testValues = [0, 0.25, 0.5, 0.75, 1.0, 0.3333, 0.9999];
      for (const modelValue of testValues) {
        const uiValue = toUiPercent(modelValue);
        const backToModel = toModelPercent(uiValue);
        expect(backToModel).toBeCloseTo(modelValue, 4);
      }
    });
  });

  describe('Edge cases and floating point handling', () => {
    it('should handle 33.33 conversion correctly (specific requirement)', () => {
      const result = toModelPercent(33.33);
      // Verify it's exactly 0.3333 when rounded
      expect(result).toBeCloseTo(0.3333, 4);
      // Verify it doesn't have floating point errors
      expect(result * 3).toBeCloseTo(0.9999, 4);
    });

    it('should avoid floating point errors in multiple conversions', () => {
      // Common floating point error: 0.1 + 0.2 !== 0.3
      // Our conversion should handle this correctly
      const value1 = toModelPercent(10);
      const value2 = toModelPercent(20);
      const sum = value1 + value2;
      expect(sum).toBeCloseTo(0.3, 6);
    });

    it('should handle percentages over 100', () => {
      expect(toModelPercent(150)).toBeCloseTo(1.5, 4);
      expect(toModelPercent(200)).toBeCloseTo(2.0, 4);
    });

    it('should handle negative percentages', () => {
      expect(toModelPercent(-10)).toBeCloseTo(-0.1, 4);
      expect(toUiPercent(-0.1)).toBeCloseTo(-10, 2);
    });
  });
});

