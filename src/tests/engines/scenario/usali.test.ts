/**
 * USALI (Uniform System of Accounts for the Lodging Industry) Tests (v0.9)
 * 
 * Verifies that GOP (Gross Operating Profit) is calculated correctly from the new P&L structure.
 * 
 * USALI Structure:
 * - Revenue: Total revenue from all departments
 * - Departmental Expenses: Direct expenses (COGS + direct labor) = cogsTotal
 * - GOP (Gross Operating Profit): Revenue - Departmental Expenses
 * - Undistributed Expenses: Expenses not directly attributable to departments = opexTotal
 * - NOI (Net Operating Income): GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense
 */

import { describe, it, expect } from 'vitest';
import { runScenarioEngine } from '@engines/scenario/scenarioEngine';
import type { ProjectScenario, HotelConfig } from '@domain/types';
import { buildHotelConfig } from '../../helpers/buildOperationConfig';

describe('USALI Logic (v0.9)', () => {
  describe('GOP Calculation', () => {
    it('should calculate GOP correctly: GOP = Revenue - Departmental Expenses', () => {
      const hotelConfig: HotelConfig = {
        ...buildHotelConfig({
          id: 'hotel-usali-test',
          name: 'USALI Test Hotel',
          keys: 100,
          avgDailyRate: 200,
          occupancyByMonth: Array(12).fill(0.70), // 70% occupancy
          foodRevenuePctOfRooms: 0.30,
          beverageRevenuePctOfRooms: 0.15,
          otherRevenuePctOfRooms: 0.10,
          foodCogsPct: 0.35,
          beverageCogsPct: 0.25,
          payrollPct: 0.35,
          utilitiesPct: 0.05,
          marketingPct: 0.03,
          maintenanceOpexPct: 0.04,
          otherOpexPct: 0.03,
        }),
      };

      const scenario: ProjectScenario = {
        id: 'usali-test-scenario',
        name: 'USALI Test Scenario',
        startYear: 2026,
        horizonYears: 1, // Single year for simplicity
        operations: [hotelConfig],
      };

      const result = runScenarioEngine(scenario);

      // Verify consolidated P&L has USALI fields
      expect(result.consolidatedAnnualPnl.length).toBe(1);
      const pnl = result.consolidatedAnnualPnl[0];

      // Verify USALI fields exist
      expect(pnl.gop).toBeDefined();
      expect(pnl.departmentalExpenses).toBeDefined();
      expect(pnl.undistributedExpenses).toBeDefined();
      expect(pnl.noi).toBeDefined();

      // Verify GOP calculation: GOP = Revenue - Departmental Expenses
      // Departmental Expenses = COGS (for now, COGS maps to departmental expenses)
      const expectedGop = pnl.revenueTotal - pnl.departmentalExpenses;
      expect(pnl.gop).toBeCloseTo(expectedGop, 2);

      // Verify Departmental Expenses = COGS
      expect(pnl.departmentalExpenses).toBeCloseTo(pnl.cogsTotal, 2);

      // Verify Undistributed Expenses = OPEX
      expect(pnl.undistributedExpenses).toBeCloseTo(pnl.opexTotal, 2);

      // Verify NOI calculation: NOI = GOP - Undistributed Expenses - Management Fees - Non-Operating - Maintenance Capex
      // Management Fees and Non-Operating default to 0
      // Note: Maintenance Capex is included for backward compatibility with operation-level NOI calculation
      const expectedNoi = pnl.gop - pnl.undistributedExpenses - (pnl.managementFees ?? 0) - (pnl.nonOperatingIncomeExpense ?? 0) - (pnl.maintenanceCapex ?? 0);
      expect(pnl.noi).toBeCloseTo(expectedNoi, 2);
    });

    it('should calculate GOP correctly for multiple operations', () => {
      const hotel1: HotelConfig = {
        ...buildHotelConfig({
          id: 'hotel-1',
          keys: 100,
          avgDailyRate: 200,
        }),
      };

      const hotel2: HotelConfig = {
        ...buildHotelConfig({
          id: 'hotel-2',
          keys: 50,
          avgDailyRate: 300,
        }),
      };

      const scenario: ProjectScenario = {
        id: 'multi-op-usali-test',
        name: 'Multi-Operation USALI Test',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotel1, hotel2],
      };

      const result = runScenarioEngine(scenario);

      expect(result.consolidatedAnnualPnl.length).toBe(1);
      const pnl = result.consolidatedAnnualPnl[0];

      // Verify GOP is calculated from consolidated revenue and expenses
      const expectedGop = pnl.revenueTotal - pnl.departmentalExpenses;
      expect(pnl.gop).toBeCloseTo(expectedGop, 2);

      // Verify GOP is positive (revenue should exceed COGS for a viable operation)
      expect(pnl.gop).toBeGreaterThan(0);
    });

    it('should maintain USALI structure across multiple years', () => {
      const scenario: ProjectScenario = {
        id: 'multi-year-usali-test',
        name: 'Multi-Year USALI Test',
        startYear: 2026,
        horizonYears: 5,
        operations: [buildHotelConfig()],
      };

      const result = runScenarioEngine(scenario);

      // Verify all years have USALI fields
      expect(result.consolidatedAnnualPnl.length).toBe(5);

      for (let yearIndex = 0; yearIndex < 5; yearIndex++) {
        const pnl = result.consolidatedAnnualPnl[yearIndex];
        
        // Verify USALI fields exist for each year
        expect(pnl.gop).toBeDefined();
        expect(pnl.departmentalExpenses).toBeDefined();
        expect(pnl.undistributedExpenses).toBeDefined();
        expect(pnl.noi).toBeDefined();

        // Verify GOP calculation for each year
        const expectedGop = pnl.revenueTotal - pnl.departmentalExpenses;
        expect(pnl.gop).toBeCloseTo(expectedGop, 2);

        // Verify NOI calculation for each year
        // Note: Maintenance Capex is included for backward compatibility with operation-level NOI calculation
        const expectedNoi = pnl.gop - pnl.undistributedExpenses - (pnl.managementFees ?? 0) - (pnl.nonOperatingIncomeExpense ?? 0) - (pnl.maintenanceCapex ?? 0);
        expect(pnl.noi).toBeCloseTo(expectedNoi, 2);
      }
    });

    it('should handle zero revenue scenario correctly', () => {
      const hotelConfig: HotelConfig = {
        ...buildHotelConfig({
          id: 'zero-revenue-hotel',
          keys: 100,
          avgDailyRate: 0, // Zero ADR
          occupancyByMonth: Array(12).fill(0), // Zero occupancy
        }),
      };

      const scenario: ProjectScenario = {
        id: 'zero-revenue-test',
        name: 'Zero Revenue Test',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotelConfig],
      };

      const result = runScenarioEngine(scenario);

      const pnl = result.consolidatedAnnualPnl[0];

      // With zero revenue, GOP should be negative (or zero if no expenses)
      expect(pnl.revenueTotal).toBe(0);
      expect(pnl.gop).toBeLessThanOrEqual(0);
      expect(pnl.departmentalExpenses).toBeGreaterThanOrEqual(0);

      // Verify GOP calculation still holds
      const expectedGop = pnl.revenueTotal - pnl.departmentalExpenses;
      expect(pnl.gop).toBeCloseTo(expectedGop, 2);
    });

    it('should verify legacy fields are maintained for backward compatibility', () => {
      const scenario: ProjectScenario = {
        id: 'legacy-fields-test',
        name: 'Legacy Fields Test',
        startYear: 2026,
        horizonYears: 1,
        operations: [buildHotelConfig()],
      };

      const result = runScenarioEngine(scenario);

      const pnl = result.consolidatedAnnualPnl[0];

      // Verify legacy fields exist (deprecated but maintained)
      expect(pnl.cogsTotal).toBeDefined();
      expect(pnl.opexTotal).toBeDefined();
      expect(pnl.ebitda).toBeDefined();

      // Verify legacy fields match USALI fields
      expect(pnl.departmentalExpenses).toBeCloseTo(pnl.cogsTotal, 2);
      expect(pnl.undistributedExpenses).toBeCloseTo(pnl.opexTotal, 2);
      
      // Note: ebitda may differ from GOP if there are non-operating items
      // For basic scenarios, they should be similar
      // GOP = Revenue - Departmental Expenses
      // EBITDA = Revenue - COGS - OPEX (legacy calculation)
      // In USALI: NOI = GOP - Undistributed Expenses
      // So: NOI ≈ EBITDA for basic scenarios
    });
  });

  describe('USALI NOI Calculation', () => {
    it('should calculate NOI correctly: NOI = GOP - Undistributed Expenses', () => {
      const scenario: ProjectScenario = {
        id: 'noi-calculation-test',
        name: 'NOI Calculation Test',
        startYear: 2026,
        horizonYears: 1,
        operations: [buildHotelConfig()],
      };

      const result = runScenarioEngine(scenario);

      const pnl = result.consolidatedAnnualPnl[0];

      // NOI = GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense - Maintenance Capex
      // Management Fees and Non-Operating default to 0
      // Note: Maintenance Capex is included for backward compatibility with operation-level NOI calculation
      const expectedNoi = pnl.gop - pnl.undistributedExpenses - (pnl.managementFees ?? 0) - (pnl.nonOperatingIncomeExpense ?? 0) - (pnl.maintenanceCapex ?? 0);
      expect(pnl.noi).toBeCloseTo(expectedNoi, 2);

      // Verify NOI is less than or equal to GOP (since we subtract expenses)
      expect(pnl.noi).toBeLessThanOrEqual(pnl.gop);
    });

    it('should handle negative NOI when expenses exceed GOP', () => {
      const hotelConfig: HotelConfig = {
        ...buildHotelConfig({
          id: 'high-expense-hotel',
          keys: 10, // Very small hotel
          avgDailyRate: 50, // Low ADR
          occupancyByMonth: Array(12).fill(0.30), // Low occupancy
          payrollPct: 0.60, // High payroll
          utilitiesPct: 0.20, // High utilities
        }),
      };

      const scenario: ProjectScenario = {
        id: 'negative-noi-test',
        name: 'Negative NOI Test',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotelConfig],
      };

      const result = runScenarioEngine(scenario);

      const pnl = result.consolidatedAnnualPnl[0];

      // With low revenue and high expenses, NOI may be negative
      // Verify calculation still holds
      // Note: Maintenance Capex is included for backward compatibility with operation-level NOI calculation
      const expectedNoi = pnl.gop - pnl.undistributedExpenses - (pnl.managementFees ?? 0) - (pnl.nonOperatingIncomeExpense ?? 0) - (pnl.maintenanceCapex ?? 0);
      expect(pnl.noi).toBeCloseTo(expectedNoi, 2);

      // If GOP is positive but undistributed expenses are very high, NOI can be negative
      if (pnl.undistributedExpenses > pnl.gop) {
        expect(pnl.noi).toBeLessThan(0);
      }
    });
  });
});

