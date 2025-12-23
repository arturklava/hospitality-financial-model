/**
 * Unit tests for defensive formatters.
 * Verifies edge case handling: null, undefined, NaN, Infinity
 */
import { describe, it, expect } from 'vitest';
import {
    formatCurrency,
    formatPercent,
    formatMultiplier,
    formatNumber,
} from '../../utils/formatters';

describe('formatCurrency', () => {
    it('returns "-" for null', () => {
        expect(formatCurrency(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
        expect(formatCurrency(undefined)).toBe('-');
    });

    it('returns "-" for NaN', () => {
        expect(formatCurrency(NaN)).toBe('-');
    });

    it('returns "∞" for Infinity', () => {
        expect(formatCurrency(Infinity)).toBe('∞');
    });

    it('returns "-∞" for -Infinity', () => {
        expect(formatCurrency(-Infinity)).toBe('-∞');
    });

    it('formats positive numbers as USD currency', () => {
        expect(formatCurrency(1000)).toBe('$1,000');
    });

    it('formats negative numbers as USD currency', () => {
        expect(formatCurrency(-1000)).toBe('-$1,000');
    });

    it('formats zero correctly', () => {
        expect(formatCurrency(0)).toBe('$0');
    });

    it('formats large numbers with commas', () => {
        expect(formatCurrency(1000000)).toBe('$1,000,000');
    });
});

describe('formatPercent', () => {
    it('returns "-" for null', () => {
        expect(formatPercent(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
        expect(formatPercent(undefined)).toBe('-');
    });

    it('returns "-" for NaN', () => {
        expect(formatPercent(NaN)).toBe('-');
    });

    it('returns "∞" for Infinity', () => {
        expect(formatPercent(Infinity)).toBe('∞');
    });

    it('returns "-∞" for -Infinity', () => {
        expect(formatPercent(-Infinity)).toBe('-∞');
    });

    it('formats decimal as percentage', () => {
        expect(formatPercent(0.25)).toBe('25.0%');
    });

    it('formats zero correctly', () => {
        expect(formatPercent(0)).toBe('0.0%');
    });

    it('formats 100% correctly', () => {
        expect(formatPercent(1)).toBe('100.0%');
    });

    it('formats negative percentages', () => {
        expect(formatPercent(-0.15)).toBe('-15.0%');
    });
});

describe('formatMultiplier', () => {
    it('returns "-" for null', () => {
        expect(formatMultiplier(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
        expect(formatMultiplier(undefined)).toBe('-');
    });

    it('returns "-" for NaN', () => {
        expect(formatMultiplier(NaN)).toBe('-');
    });

    it('returns "∞" for Infinity', () => {
        expect(formatMultiplier(Infinity)).toBe('∞');
    });

    it('returns "-∞" for -Infinity', () => {
        expect(formatMultiplier(-Infinity)).toBe('-∞');
    });

    it('formats typical MOIC values', () => {
        expect(formatMultiplier(1.5)).toBe('1.50x');
    });

    it('formats 1.0x correctly', () => {
        expect(formatMultiplier(1)).toBe('1.00x');
    });

    it('formats zero correctly', () => {
        expect(formatMultiplier(0)).toBe('0.00x');
    });
});

describe('formatNumber', () => {
    it('returns "-" for null', () => {
        expect(formatNumber(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
        expect(formatNumber(undefined)).toBe('-');
    });

    it('returns "-" for NaN', () => {
        expect(formatNumber(NaN)).toBe('-');
    });

    it('returns "∞" for Infinity', () => {
        expect(formatNumber(Infinity)).toBe('∞');
    });

    it('returns "-∞" for -Infinity', () => {
        expect(formatNumber(-Infinity)).toBe('-∞');
    });

    it('formats with default 2 decimals', () => {
        expect(formatNumber(123.456)).toBe('123.46');
    });

    it('respects custom decimal places', () => {
        expect(formatNumber(123.456, 1)).toBe('123.5');
        expect(formatNumber(123.456, 0)).toBe('123');
        expect(formatNumber(123.456, 4)).toBe('123.4560');
    });

    it('formats zero correctly', () => {
        expect(formatNumber(0)).toBe('0.00');
    });

    it('formats negative numbers', () => {
        expect(formatNumber(-42.5)).toBe('-42.50');
    });
});
