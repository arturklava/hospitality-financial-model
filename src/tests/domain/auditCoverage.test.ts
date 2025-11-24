/**
 * Audit Coverage Tests (v0.10)
 * 
 * Verifies that getFormulaFor returns proper formulas for all major KPIs
 * displayed in the dashboard, ensuring no "Undefined Formula" errors appear.
 */

import { describe, it, expect } from 'vitest';
import { getFormulaFor } from '@domain/audit';

/**
 * All major KPIs displayed in the dashboard components.
 * This list should be kept in sync with:
 * - src/components/ResultsSummary.tsx
 * - src/components/ProjectKpiPanel.tsx
 */
const DASHBOARD_KPIS = [
  // Core Project KPIs
  'npv',
  'irr',
  'equityMultiple',
  'payback',
  'paybackPeriod',
  'wacc',
  
  // Valuation KPIs
  'enterpriseValue',
  'equityValue',
  
  // Debt KPIs
  'dscr',
  'ltv',
  
  // Additional metrics (may be displayed conditionally)
  'breakevenOccupancy',
] as const;

/**
 * Additional financial metrics that may appear in tables or detailed views.
 */
const ADDITIONAL_METRICS = [
  'gop',
  'noi',
  'ebitda',
  'ufcf',
  'unleveredFcf',
  'departmentalExpenses',
  'undistributedExpenses',
] as const;

describe('Audit Coverage (v0.10)', () => {
  describe('Dashboard KPI Formula Coverage', () => {
    /**
     * Verifies that all dashboard KPIs have defined formulas.
     * This ensures no "Formula for X is not defined" errors appear in the UI.
     */
    it('should return defined formulas for all dashboard KPIs', () => {
      const undefinedFormulas: string[] = [];

      for (const kpi of DASHBOARD_KPIS) {
        const formula = getFormulaFor(kpi);
        
        // Check if formula is the generic "not defined" message
        if (formula.includes('Formula for') && formula.includes('is not defined')) {
          undefinedFormulas.push(kpi);
        }
        
        // Verify formula is a non-empty string
        expect(formula).toBeTruthy();
        expect(typeof formula).toBe('string');
        expect(formula.length).toBeGreaterThan(0);
      }

      // Fail if any KPIs have undefined formulas
      if (undefinedFormulas.length > 0) {
        throw new Error(
          `The following dashboard KPIs have undefined formulas: ${undefinedFormulas.join(', ')}\n` +
          `These will cause "Undefined Formula" errors in the UI.`
        );
      }
    });

    /**
     * Verifies that formulas are meaningful (not just generic messages).
     */
    it('should return meaningful formulas (not generic "not defined" messages)', () => {
      for (const kpi of DASHBOARD_KPIS) {
        const formula = getFormulaFor(kpi);
        
        // Formula should not be the generic "not defined" message
        expect(formula).not.toContain('Formula for');
        expect(formula).not.toContain('is not defined');
        
        // Formula should contain meaningful content (at least 10 characters)
        expect(formula.length).toBeGreaterThanOrEqual(10);
      }
    });

    /**
     * Verifies case-insensitive handling for all dashboard KPIs.
     */
    it('should handle case-insensitive field names for all dashboard KPIs', () => {
      for (const kpi of DASHBOARD_KPIS) {
        const lowerFormula = getFormulaFor(kpi.toLowerCase());
        const upperFormula = getFormulaFor(kpi.toUpperCase());
        const mixedFormula = getFormulaFor(kpi);
        
        // All case variations should return the same formula
        expect(lowerFormula).toBe(mixedFormula);
        expect(upperFormula).toBe(mixedFormula);
        
        // Formulas should not be undefined
        expect(lowerFormula).not.toContain('is not defined');
      }
    });
  });

  describe('Additional Metrics Formula Coverage', () => {
    /**
     * Verifies that additional financial metrics have defined formulas.
     */
    it('should return defined formulas for additional financial metrics', () => {
      for (const metric of ADDITIONAL_METRICS) {
        const formula = getFormulaFor(metric);
        
        // Verify formula is defined (not generic "not defined" message)
        expect(formula).not.toContain('Formula for');
        expect(formula).not.toContain('is not defined');
        expect(formula).toBeTruthy();
        expect(typeof formula).toBe('string');
        expect(formula.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Core Metrics - No Undefined Formula Errors', () => {
    /**
     * Verifies that core metrics never return "Undefined Formula" errors.
     * This is critical for UI stability.
     */
    const CORE_METRICS = [
      'npv',
      'irr',
      'equityMultiple',
      'moic',
      'wacc',
      'dscr',
      'ltv',
      'gop',
      'noi',
      'ebitda',
      'ufcf',
    ] as const;

    it('should never return undefined formula errors for core metrics', () => {
      for (const metric of CORE_METRICS) {
        const formula = getFormulaFor(metric);
        
        // Core metrics must have defined formulas
        expect(formula).not.toContain('Formula for');
        expect(formula).not.toContain('is not defined');
        expect(formula.length).toBeGreaterThan(10); // Meaningful formula
      }
    });
  });

  describe('Formula Consistency', () => {
    /**
     * Verifies that alternative field name formats return the same formula.
     */
    it('should return consistent formulas for alternative field name formats', () => {
      const testCases = [
        { variants: ['npv', 'netpresentvalue'], expectedContains: 'Discounted' },
        { variants: ['irr', 'internalrateofreturn'], expectedContains: 'Discount Rate' },
        { variants: ['equityMultiple', 'moic', 'multipleoninvestedcapital'], expectedContains: 'Distributions' },
        { variants: ['dscr', 'debtservicecoverageratio'], expectedContains: 'NOI' },
        { variants: ['ltv', 'loantovalue'], expectedContains: 'Debt' },
        { variants: ['wacc', 'weightedaveragecostofcapital'], expectedContains: 'Equity' },
        { variants: ['gop', 'grossoperatingprofit'], expectedContains: 'Revenue' },
        { variants: ['noi', 'netoperatingincome'], expectedContains: 'GOP' },
        { variants: ['ufcf', 'unleveredfcf', 'unlevered_free_cash_flow'], expectedContains: 'NOI' },
      ];

      for (const testCase of testCases) {
        const formulas = testCase.variants.map(variant => getFormulaFor(variant));
        
        // All variants should return the same formula
        const firstFormula = formulas[0];
        for (let i = 1; i < formulas.length; i++) {
          expect(formulas[i]).toBe(firstFormula);
        }
        
        // Formula should contain expected keywords
        expect(firstFormula).toContain(testCase.expectedContains);
      }
    });
  });

  describe('New Dashboard KPIs', () => {
    /**
     * Verifies formulas for newly added dashboard KPIs.
     */
    it('should have formulas for payback period', () => {
      expect(getFormulaFor('payback')).not.toContain('is not defined');
      expect(getFormulaFor('paybackPeriod')).not.toContain('is not defined');
      expect(getFormulaFor('payback')).toContain('cumulative');
    });

    it('should have formulas for enterprise value', () => {
      expect(getFormulaFor('enterpriseValue')).not.toContain('is not defined');
      expect(getFormulaFor('enterprise_value')).not.toContain('is not defined');
      expect(getFormulaFor('enterpriseValue')).toContain('NPV');
    });

    it('should have formulas for equity value', () => {
      expect(getFormulaFor('equityValue')).not.toContain('is not defined');
      expect(getFormulaFor('equity_value')).not.toContain('is not defined');
      expect(getFormulaFor('equityValue')).toContain('Enterprise');
    });

    it('should have formulas for breakeven occupancy', () => {
      expect(getFormulaFor('breakevenOccupancy')).not.toContain('is not defined');
      expect(getFormulaFor('breakeven_occupancy')).not.toContain('is not defined');
      expect(getFormulaFor('breakevenOccupancy')).toContain('Occupancy');
    });
  });

  describe('Complete Dashboard Coverage', () => {
    /**
     * Comprehensive test that verifies all dashboard KPIs are covered.
     * This is the main audit test that should pass for v0.10.
     */
    it('should provide formulas for all major KPIs displayed in the dashboard', () => {
      const allDashboardMetrics = [...DASHBOARD_KPIS, ...ADDITIONAL_METRICS];
      const missingFormulas: string[] = [];
      const undefinedFormulas: string[] = [];

      for (const metric of allDashboardMetrics) {
        const formula = getFormulaFor(metric);
        
        if (!formula || formula.length === 0) {
          missingFormulas.push(metric);
        } else if (formula.includes('Formula for') && formula.includes('is not defined')) {
          undefinedFormulas.push(metric);
        }
      }

      // Report any issues
      const issues: string[] = [];
      if (missingFormulas.length > 0) {
        issues.push(`Missing formulas: ${missingFormulas.join(', ')}`);
      }
      if (undefinedFormulas.length > 0) {
        issues.push(`Undefined formulas: ${undefinedFormulas.join(', ')}`);
      }

      if (issues.length > 0) {
        throw new Error(
          `Audit coverage failure:\n${issues.join('\n')}\n\n` +
          `These KPIs will show "Undefined Formula" errors in the dashboard.`
        );
      }

      // All metrics should have valid formulas
      expect(missingFormulas).toHaveLength(0);
      expect(undefinedFormulas).toHaveLength(0);
    });
  });
});

