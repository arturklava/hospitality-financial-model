import { describe, it, expect } from 'vitest';
import { getFormulaFor, explainValue } from '@domain/audit';
import type { ConsolidatedAnnualPnl } from '@domain/types';

describe('Audit Helpers (v0.10)', () => {
  describe('getFormulaFor', () => {
    it('should return correct formula for GOP', () => {
      const formula = getFormulaFor('gop');
      expect(formula).toBe('Total Revenue - Departmental Expenses');
    });

    it('should return correct formula for NOI', () => {
      const formula = getFormulaFor('noi');
      expect(formula).toBe('GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense - Maintenance Capex');
    });

    it('should return correct formula for EBITDA', () => {
      const formula = getFormulaFor('ebitda');
      expect(formula).toBe('Total Revenue - COGS - OPEX');
    });

    it('should return correct formula for UFCF', () => {
      const formula = getFormulaFor('ufcf');
      expect(formula).toBe('NOI - Maintenance Capex - Change in Working Capital');
    });

    it('should return correct formula for WACC', () => {
      const formula = getFormulaFor('wacc');
      expect(formula).toBe('(Equity % × Cost of Equity) + (Debt % × Cost of Debt × (1 - Tax Rate))');
    });

    it('should handle case-insensitive field names', () => {
      expect(getFormulaFor('GOP')).toBe('Total Revenue - Departmental Expenses');
      expect(getFormulaFor('NoI')).toBe('GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense - Maintenance Capex');
      expect(getFormulaFor('EBITDA')).toBe('Total Revenue - COGS - OPEX');
    });

    it('should return generic message for unknown fields', () => {
      const formula = getFormulaFor('unknownField');
      expect(formula).toContain('Formula for');
      expect(formula).toContain('unknownField');
    });
  });

  describe('explainValue', () => {
    describe('GOP calculation', () => {
      it('should explain GOP calculation correctly', () => {
        const context = {
          revenueTotal: 1_000_000,
          departmentalExpenses: 300_000,
        };

        const trace = explainValue('gop', context);

        expect(trace.field).toBe('gop');
        expect(trace.formula).toBe('Total Revenue - Departmental Expenses');
        expect(trace.value).toBe(700_000);
        expect(trace.components).toHaveLength(2);
        expect(trace.components[0]).toEqual({
          name: 'Total Revenue',
          value: 1_000_000,
          description: 'Total revenue from all departments',
        });
        expect(trace.components[1]).toEqual({
          name: 'Departmental Expenses',
          value: 300_000,
          description: 'Direct expenses (COGS + direct labor)',
        });
      });

      it('should handle missing values by defaulting to 0', () => {
        const context = {
          revenueTotal: 1_000_000,
          // departmentalExpenses is missing
        };

        const trace = explainValue('gop', context);

        expect(trace.value).toBe(1_000_000);
        expect(trace.components[1].value).toBe(0);
      });
    });

    describe('NOI calculation (USALI)', () => {
      it('should explain NOI calculation correctly', () => {
        const context: Partial<ConsolidatedAnnualPnl> = {
          gop: 700_000,
          undistributedExpenses: 200_000,
          managementFees: 10_000,
          nonOperatingIncomeExpense: 5_000,
          maintenanceCapex: 50_000,
        };

        const trace = explainValue('noi', context);

        expect(trace.field).toBe('noi');
        expect(trace.formula).toBe('GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense - Maintenance Capex');
        expect(trace.value).toBe(435_000); // 700_000 - 200_000 - 10_000 - 5_000 - 50_000
        expect(trace.components).toHaveLength(5);
        expect(trace.components[0]).toEqual({
          name: 'GOP',
          value: 700_000,
          description: 'Gross Operating Profit',
        });
        expect(trace.components[1]).toEqual({
          name: 'Undistributed Expenses',
          value: 200_000,
          description: 'OPEX not directly attributable to departments',
        });
        expect(trace.components[2]).toEqual({
          name: 'Management Fees',
          value: 10_000,
          description: 'Fees paid to management company',
        });
        expect(trace.components[3]).toEqual({
          name: 'Non-Operating Income/Expense',
          value: 5_000,
          description: 'Non-operating items',
        });
        expect(trace.components[4]).toEqual({
          name: 'Maintenance Capex',
          value: 50_000,
          description: 'Maintenance capital expenditures',
        });
      });

      it('should handle optional fields (managementFees, nonOperatingIncomeExpense) defaulting to 0', () => {
        const context = {
          gop: 700_000,
          undistributedExpenses: 200_000,
          maintenanceCapex: 50_000,
          // managementFees and nonOperatingIncomeExpense are missing
        };

        const trace = explainValue('noi', context);

        expect(trace.value).toBe(450_000); // 700_000 - 200_000 - 0 - 0 - 50_000
        expect(trace.components[2].value).toBe(0); // Management Fees
        expect(trace.components[3].value).toBe(0); // Non-Operating Income/Expense
      });
    });

    describe('EBITDA calculation', () => {
      it('should explain EBITDA calculation correctly', () => {
        const context = {
          revenueTotal: 1_000_000,
          cogsTotal: 300_000,
          opexTotal: 200_000,
        };

        const trace = explainValue('ebitda', context);

        expect(trace.field).toBe('ebitda');
        expect(trace.formula).toBe('Total Revenue - COGS - OPEX');
        expect(trace.value).toBe(500_000);
        expect(trace.components).toHaveLength(3);
        expect(trace.components[0].name).toBe('Total Revenue');
        expect(trace.components[1].name).toBe('COGS');
        expect(trace.components[2].name).toBe('OPEX');
      });
    });

    describe('UFCF calculation', () => {
      it('should explain UFCF calculation correctly', () => {
        const context = {
          noi: 435_000,
          maintenanceCapex: 50_000,
          changeInWorkingCapital: 25_000,
        };

        const trace = explainValue('ufcf', context);

        expect(trace.field).toBe('ufcf');
        expect(trace.formula).toBe('NOI - Maintenance Capex - Change in Working Capital');
        expect(trace.value).toBe(360_000); // 435_000 - 50_000 - 25_000
        expect(trace.components).toHaveLength(3);
      });
    });

    describe('WACC calculation', () => {
      it('should explain WACC calculation correctly', () => {
        const context = {
          equityPercentage: 0.6,
          costOfEquity: 0.12,
          debtPercentage: 0.4,
          costOfDebt: 0.06,
          taxRate: 0.25,
        };

        const trace = explainValue('wacc', context);

        expect(trace.field).toBe('wacc');
        expect(trace.formula).toBe('(Equity % × Cost of Equity) + (Debt % × Cost of Debt × (1 - Tax Rate))');
        // WACC = (0.6 × 0.12) + (0.4 × 0.06 × (1 - 0.25))
        //      = 0.072 + (0.4 × 0.06 × 0.75)
        //      = 0.072 + 0.018
        //      = 0.09
        expect(trace.value).toBeCloseTo(0.09, 5);
        expect(trace.components).toHaveLength(5);
      });
    });

    describe('DSCR calculation', () => {
      it('should explain DSCR calculation correctly', () => {
        const context = {
          noi: 500_000,
          debtService: 200_000,
        };

        const trace = explainValue('dscr', context);

        expect(trace.field).toBe('dscr');
        expect(trace.formula).toBe('NOI / Total Debt Service');
        expect(trace.value).toBe(2.5); // 500_000 / 200_000
        expect(trace.components).toHaveLength(2);
      });

      it('should handle zero debt service', () => {
        const context = {
          noi: 500_000,
          debtService: 0,
        };

        const trace = explainValue('dscr', context);

        expect(trace.value).toBe(0);
      });
    });

    describe('LTV calculation', () => {
      it('should explain LTV calculation correctly', () => {
        const context = {
          totalDebt: 4_000_000,
          initialInvestment: 10_000_000,
        };

        const trace = explainValue('ltv', context);

        expect(trace.field).toBe('ltv');
        expect(trace.formula).toBe('Total Debt / Initial Investment');
        expect(trace.value).toBe(0.4); // 4_000_000 / 10_000_000
        expect(trace.components).toHaveLength(2);
      });
    });

    describe('Case-insensitive field names', () => {
      it('should handle case-insensitive field names in explainValue', () => {
        const context = {
          revenueTotal: 1_000_000,
          departmentalExpenses: 300_000,
        };

        const trace1 = explainValue('GOP', context);
        const trace2 = explainValue('gop', context);
        const trace3 = explainValue('GrossOperatingProfit', context);

        expect(trace1.value).toBe(trace2.value);
        expect(trace1.value).toBe(trace3.value);
        expect(trace1.formula).toBe(trace2.formula);
      });
    });

    describe('Alternative field name formats', () => {
      it('should handle snake_case and camelCase field names', () => {
        const context1 = {
          revenueTotal: 1_000_000,
          departmentalExpenses: 300_000,
        };

        const context2 = {
          revenue: 1_000_000,
          departmental_expenses: 300_000,
        };

        const trace1 = explainValue('gop', context1);
        const trace2 = explainValue('gop', context2);

        expect(trace1.value).toBe(trace2.value);
      });
    });
  });
});

