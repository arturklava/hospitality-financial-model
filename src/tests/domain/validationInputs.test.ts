import { describe, it, expect } from 'vitest';
import { validateCapitalInputs, validateOperationDrivers } from '@domain/validation';
import type { CapitalStructureConfig, HotelConfig } from '@domain/types';

const baseHotel: HotelConfig = {
  id: 'hotel-driver-validation',
  name: 'Driver Validation Hotel',
  operationType: 'HOTEL',
  startYear: 2026,
  horizonYears: 1,
  keys: 120,
  avgDailyRate: 225,
  occupancyByMonth: Array(12).fill(0.72),
  foodRevenuePctOfRooms: 0.3,
  beverageRevenuePctOfRooms: 0.15,
  otherRevenuePctOfRooms: 0.1,
  foodCogsPct: 0.32,
  beverageCogsPct: 0.24,
  payrollPct: 0.33,
  utilitiesPct: 0.05,
  marketingPct: 0.03,
  maintenanceOpexPct: 0.04,
  otherOpexPct: 0.03,
  maintenanceCapexPct: 0.02,
};

describe('Domain validation inputs', () => {
  describe('validateOperationDrivers', () => {
    it('flags occupancy outside 0-1 and non-positive ADR with actionable messages', () => {
      const invalidHotel: HotelConfig = {
        ...baseHotel,
        occupancyByMonth: [0.8, 1.1, ...Array(10).fill(0.75)],
        avgDailyRate: 0,
      };

      const result = validateOperationDrivers(invalidHotel);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Occupancy month 2 must be between 0 and 1');
      expect(result.error).toContain('Average daily rate must be greater than 0');
    });

    it('accepts valid hotel drivers within expected bounds', () => {
      const result = validateOperationDrivers(baseHotel);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('validateCapitalInputs', () => {
    it('rejects capital stacks that imply LTV above 100%', () => {
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 10_000_000,
        debtTranches: [
          {
            id: 'overlevered',
            type: 'SENIOR',
            initialPrincipal: 11_000_000,
            interestRate: 0.06,
            amortizationType: 'mortgage',
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const result = validateCapitalInputs(capitalConfig);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Implied LTV (loan-to-value) must be between 0 and 1');
      expect(result.error).toContain('1.1');
    });

    it('rejects missing or non-positive initial investment values', () => {
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 0,
        debtTranches: [],
      };

      const result = validateCapitalInputs(capitalConfig);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Initial investment must be greater than 0');
    });

    it('accepts all-equity structures as valid scenarios', () => {
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 8_000_000,
        debtTranches: [],
      };

      const result = validateCapitalInputs(capitalConfig);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
