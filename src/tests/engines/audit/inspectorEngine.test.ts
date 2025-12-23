import { describe, it, expect } from 'vitest';
import { getAuditTrace } from '@engines/audit/inspectorEngine';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type { FullModelInput } from '@domain/types';
import { buildHotelConfig } from '../../helpers/buildOperationConfig';

describe('Inspector Engine', () => {
  const createTestModel = () => {
    const hotelConfig = buildHotelConfig({
      id: 'test-hotel',
      name: 'Test Hotel',
      keys: 100,
      avgDailyRate: 200,
      occupancyByMonth: Array(12).fill(0.70),
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
      maintenanceCapexPct: 0.04,
    });

    const input: FullModelInput = {
      scenario: {
        id: 'test-scenario',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 5,
        operations: [hotelConfig],
      },
      projectConfig: {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 10000000,
        workingCapitalPercentage: 0.05,
      },
      capitalConfig: {
        initialInvestment: 10000000,
        debtTranches: [
          {
            id: 'senior-loan',
            label: 'Senior Loan',
            type: 'SENIOR',
            initialPrincipal: 5000000,
            interestRate: 0.06,
            amortizationType: 'mortgage',
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      },
      waterfallConfig: {
        equityClasses: [
          {
            id: 'lp',
            name: 'Limited Partner',
            contributionPct: 0.7,
          },
          {
            id: 'gp',
            name: 'General Partner',
            contributionPct: 0.3,
          },
        ],
      },
    };

    return runFullModel(input);
  };

  describe('getAuditTrace', () => {
    it('should return NOI audit trace with GOP and Undistributed Expenses', () => {
      const output = createTestModel();
      const trace = getAuditTrace('noi', output, 0);

      expect(trace.field).toBe('noi');
      expect(trace.formula).toContain('NOI');
      expect(trace.source).toBe('scenarioEngine');
      expect(trace.yearIndex).toBe(0);

      // Verify components exist and have expected structure
      if (trace.components && trace.components.length > 0) {
        expect(trace.components.length).toBeGreaterThan(0);
        expect(trace.components[0].name).toBe('GOP');
      }

      // Verify values dictionary contains expected keys
      expect(trace.values).toBeDefined();
      expect('gop' in trace.values || 'noi' in trace.values).toBe(true);

      // Verify the result matches the P&L NOI
      const firstYearPnl = output.consolidatedAnnualPnl[0];
      expect(trace.result).toBeCloseTo(firstYearPnl.noi, 2);

      // Verify values dictionary contains component values
      if (trace.values.gop !== undefined) {
        expect(trace.values.gop).toBe(firstYearPnl.gop);
      }
    });

    it('should return DSCR audit trace with NOI and Debt Service', () => {
      const output = createTestModel();
      const trace = getAuditTrace('dscr', output, 0);

      expect(trace.field).toBe('dscr');
      expect(trace.formula).toContain('DSCR');
      expect(trace.source).toBe('capitalEngine');
      expect(trace.yearIndex).toBe(0);

      // Verify values dictionary contains expected keys
      expect(trace.values).toBeDefined();
      expect(trace.values.noi).toBeDefined();
      expect(trace.values.debtService).toBeDefined();

      // Verify the result matches the calculation
      const firstYearPnl = output.consolidatedAnnualPnl[0];
      const firstYearLeveredFcf = output.capital.leveredFcfByYear[0];
      const firstYearDebtKpi = output.capital.debtKpis[0];
      const expectedValue = firstYearDebtKpi.dscr ?? (firstYearLeveredFcf.debtService > 0
        ? firstYearPnl.noi / firstYearLeveredFcf.debtService
        : 0);
      expect(trace.result).toBeCloseTo(expectedValue, 2);

      // Verify values dictionary matches expected values
      expect(trace.values.noi).toBe(firstYearPnl.noi);
      expect(trace.values.debtService).toBe(firstYearLeveredFcf.debtService);

      // Verify components if present
      if (trace.components && trace.components.length > 0) {
        expect(trace.components[0].name).toBe('NOI');
        expect(trace.components[1].name).toBe('Debt Service');
      }
    });

    it('should handle unknown field gracefully', () => {
      const output = createTestModel();
      const trace = getAuditTrace('unknown-field', output, 0);

      expect(trace.field).toBe('unknown-field');
      expect(trace.formula).toContain('not defined');
      expect(trace.result).toBe(0);
      expect(trace.values).toEqual({});
      expect(trace.source).toBe('unknown');
    });

    it('should handle case-insensitive field names', () => {
      const output = createTestModel();
      const trace1 = getAuditTrace('NOI', output, 0);
      const trace2 = getAuditTrace('noi', output, 0);
      const trace3 = getAuditTrace('NetOperatingIncome', output, 0);

      expect(trace1.field).toBe('noi');
      expect(trace2.field).toBe('noi');
      expect(trace3.field).toBe('noi');
      expect(trace1.result).toBe(trace2.result);
      expect(trace2.result).toBe(trace3.result);
    });

    it('should handle empty model output gracefully', () => {
      const emptyOutput = {
        scenario: {
          id: 'empty',
          name: 'Empty',
          startYear: 2026,
          horizonYears: 0,
          operations: [],
        },
        consolidatedAnnualPnl: [],
        project: {
          unleveredFcf: [],
          dcfValuation: {
            discountRate: 0,
            terminalGrowthRate: 0,
            cashFlows: [],
            npv: 0,
            enterpriseValue: 0,
            equityValue: 0,
            terminalValue: 0,
          },
          projectKpis: {
            npv: 0,
            unleveredIrr: 0,
            equityMultiple: 0,
            paybackPeriod: 0,
            wacc: 0,
          },
        },
        capital: {
          debtSchedule: { entries: [] },
          trancheSchedules: [],
          leveredFcfByYear: [],
          ownerLeveredCashFlows: [],
          debtKpis: [],
        },
        waterfall: {
          ownerCashFlows: [],
          partners: [],
          annualRows: [],
        },
      };

      const trace = getAuditTrace('noi', emptyOutput as any, 0);
      expect(trace.result).toBe(0);
      expect(trace.values).toEqual({});
    });
  });
});

