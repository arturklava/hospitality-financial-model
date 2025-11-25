import { describe, expect, it } from 'vitest';
import { validateOperationDrivers } from '@domain/validation';
import type { OperationConfig, OperationType } from '@domain/types';

function buildValidOperationConfig(type: OperationType): OperationConfig {
  switch (type) {
    case 'HOTEL':
      return {
        id: 'hotel-1',
        name: 'Hotel',
        operationType: 'HOTEL',
        startYear: 2026,
        horizonYears: 5,
        keys: 120,
        avgDailyRate: 250,
        occupancyByMonth: Array(12).fill(0.72),
        foodRevenuePctOfRooms: 0.25,
        beverageRevenuePctOfRooms: 0.12,
        otherRevenuePctOfRooms: 0.08,
        foodCogsPct: 0.32,
        beverageCogsPct: 0.22,
        payrollPct: 0.35,
        utilitiesPct: 0.06,
        marketingPct: 0.04,
        maintenanceOpexPct: 0.03,
        otherOpexPct: 0.02,
        maintenanceCapexPct: 0.02,
      } as OperationConfig;
    case 'VILLAS':
      return {
        id: 'villas-1',
        name: 'Villas',
        operationType: 'VILLAS',
        startYear: 2026,
        horizonYears: 5,
        units: 30,
        avgNightlyRate: 400,
        occupancyByMonth: Array(12).fill(0.68),
        foodRevenuePctOfRental: 0.18,
        beverageRevenuePctOfRental: 0.1,
        otherRevenuePctOfRental: 0.05,
        foodCogsPct: 0.30,
        beverageCogsPct: 0.20,
        payrollPct: 0.32,
        utilitiesPct: 0.07,
        marketingPct: 0.03,
        maintenanceOpexPct: 0.02,
        otherOpexPct: 0.03,
        maintenanceCapexPct: 0.02,
      } as OperationConfig;
    case 'RESTAURANT':
      return {
        id: 'restaurant-1',
        name: 'Restaurant',
        operationType: 'RESTAURANT',
        startYear: 2026,
        horizonYears: 5,
        covers: 120,
        avgCheck: 55,
        turnoverByMonth: Array(12).fill(1.4),
        foodRevenuePctOfTotal: 0.6,
        beverageRevenuePctOfTotal: 0.25,
        otherRevenuePctOfTotal: 0.05,
        foodCogsPct: 0.32,
        beverageCogsPct: 0.22,
        payrollPct: 0.28,
        utilitiesPct: 0.05,
        marketingPct: 0.04,
        maintenanceOpexPct: 0.03,
        otherOpexPct: 0.02,
        maintenanceCapexPct: 0.02,
      } as OperationConfig;
    case 'BEACH_CLUB':
      return {
        id: 'beach-1',
        name: 'Beach Club',
        operationType: 'BEACH_CLUB',
        startYear: 2026,
        horizonYears: 5,
        dailyPasses: 200,
        avgDailyPassPrice: 50,
        memberships: 300,
        avgMembershipFee: 1200,
        utilizationByMonth: Array(12).fill(0.65),
        foodRevenuePctOfTotal: 0.2,
        beverageRevenuePctOfTotal: 0.25,
        otherRevenuePctOfTotal: 0.15,
        foodCogsPct: 0.30,
        beverageCogsPct: 0.22,
        payrollPct: 0.32,
        utilitiesPct: 0.06,
        marketingPct: 0.04,
        maintenanceOpexPct: 0.03,
        otherOpexPct: 0.02,
        maintenanceCapexPct: 0.02,
      } as OperationConfig;
    case 'RACQUET':
      return {
        id: 'racquet-1',
        name: 'Racquet',
        operationType: 'RACQUET',
        startYear: 2026,
        horizonYears: 5,
        courts: 8,
        avgCourtRate: 70,
        utilizationByMonth: Array(12).fill(0.6),
        hoursPerDay: 12,
        memberships: 150,
        avgMembershipFee: 900,
        foodRevenuePctOfTotal: 0.18,
        beverageRevenuePctOfTotal: 0.24,
        otherRevenuePctOfTotal: 0.12,
        foodCogsPct: 0.3,
        beverageCogsPct: 0.22,
        payrollPct: 0.30,
        utilitiesPct: 0.06,
        marketingPct: 0.04,
        maintenanceOpexPct: 0.03,
        otherOpexPct: 0.03,
        maintenanceCapexPct: 0.02,
      } as OperationConfig;
    case 'RETAIL':
      return {
        id: 'retail-1',
        name: 'Retail',
        operationType: 'RETAIL',
        startYear: 2026,
        horizonYears: 5,
        sqm: 5000,
        avgRentPerSqm: 45,
        occupancyByMonth: Array(12).fill(0.9),
        rentalRevenuePctOfTotal: 0.9,
        otherRevenuePctOfTotal: 0.05,
        payrollPct: 0.2,
        utilitiesPct: 0.05,
        marketingPct: 0.04,
        maintenanceOpexPct: 0.03,
        otherOpexPct: 0.02,
        maintenanceCapexPct: 0.01,
      } as OperationConfig;
    case 'FLEX':
      return {
        id: 'flex-1',
        name: 'Flex',
        operationType: 'FLEX',
        startYear: 2026,
        horizonYears: 5,
        sqm: 3000,
        avgRentPerSqm: 35,
        occupancyByMonth: Array(12).fill(0.82),
        rentalRevenuePctOfTotal: 0.85,
        otherRevenuePctOfTotal: 0.07,
        payrollPct: 0.24,
        utilitiesPct: 0.06,
        marketingPct: 0.04,
        maintenanceOpexPct: 0.03,
        otherOpexPct: 0.02,
        maintenanceCapexPct: 0.02,
      } as OperationConfig;
    case 'WELLNESS':
      return {
        id: 'wellness-1',
        name: 'Wellness',
        operationType: 'WELLNESS',
        startYear: 2026,
        horizonYears: 5,
        memberships: 400,
        avgMembershipFee: 1000,
        dailyPasses: 120,
        avgDailyPassPrice: 60,
        utilizationByMonth: Array(12).fill(0.58),
        foodRevenuePctOfTotal: 0.15,
        beverageRevenuePctOfTotal: 0.2,
        otherRevenuePctOfTotal: 0.1,
        foodCogsPct: 0.3,
        beverageCogsPct: 0.22,
        payrollPct: 0.28,
        utilitiesPct: 0.06,
        marketingPct: 0.04,
        maintenanceOpexPct: 0.03,
        otherOpexPct: 0.02,
        maintenanceCapexPct: 0.02,
      } as OperationConfig;
    case 'SENIOR_LIVING':
      return {
        id: 'senior-1',
        name: 'Senior Living',
        operationType: 'SENIOR_LIVING',
        startYear: 2026,
        horizonYears: 5,
        units: 80,
        avgMonthlyRate: 3200,
        occupancyByMonth: Array(12).fill(0.86),
        careRevenuePctOfRental: 0.2,
        foodRevenuePctOfRental: 0.15,
        otherRevenuePctOfRental: 0.1,
        foodCogsPct: 0.28,
        careCogsPct: 0.25,
        payrollPct: 0.32,
        utilitiesPct: 0.06,
        marketingPct: 0.04,
        maintenanceOpexPct: 0.03,
        otherOpexPct: 0.02,
        maintenanceCapexPct: 0.02,
      } as OperationConfig;
  }
}

describe('validateOperationDrivers', () => {
  const monthlyArrayCases: Array<{ type: OperationType; field: string; label: string }> = [
    { type: 'HOTEL', field: 'occupancyByMonth', label: 'occupancyByMonth' },
    { type: 'VILLAS', field: 'occupancyByMonth', label: 'occupancyByMonth' },
    { type: 'RETAIL', field: 'occupancyByMonth', label: 'occupancyByMonth' },
    { type: 'FLEX', field: 'occupancyByMonth', label: 'occupancyByMonth' },
    { type: 'SENIOR_LIVING', field: 'occupancyByMonth', label: 'occupancyByMonth' },
    { type: 'BEACH_CLUB', field: 'utilizationByMonth', label: 'utilizationByMonth' },
    { type: 'RACQUET', field: 'utilizationByMonth', label: 'utilizationByMonth' },
    { type: 'WELLNESS', field: 'utilizationByMonth', label: 'utilizationByMonth' },
    { type: 'RESTAURANT', field: 'turnoverByMonth', label: 'turnoverByMonth' },
  ];

  monthlyArrayCases.forEach(({ type, field, label }) => {
    it(`rejects ${label} arrays that are not 12 months for ${type}`, () => {
      const config = buildValidOperationConfig(type);
      (config as any)[field] = Array(10).fill(0.5);

      const result = validateOperationDrivers(config);

      expect(result.isValid).toBe(false);
      expect(result.error?.toLowerCase()).toContain(label.toLowerCase());
      expect(result.error).toContain('12');
    });
  });

  const percentageCases: OperationType[] = [
    'HOTEL',
    'VILLAS',
    'RESTAURANT',
    'BEACH_CLUB',
    'RACQUET',
    'RETAIL',
    'FLEX',
    'WELLNESS',
    'SENIOR_LIVING',
  ];

  percentageCases.forEach((type) => {
    it(`rejects payroll percentage above 1 for ${type}`, () => {
      const config = buildValidOperationConfig(type);
      (config as any).payrollPct = 1.25;

      const result = validateOperationDrivers(config);

      expect(result.isValid).toBe(false);
      expect(result.error?.toLowerCase()).toContain('payroll');
    });
  });
});
