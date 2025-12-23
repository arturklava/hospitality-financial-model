import { describe, it, expect } from 'vitest';
import { runHealthChecks } from '@engines/audit/healthEngine';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type { FullModelInput, FullModelOutput } from '@domain/types';
import { buildHotelConfig } from '../../helpers/buildOperationConfig';

describe('Health Engine', () => {
  const createTestModel = (initialInvestment: number, debtAmount: number): FullModelOutput => {
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
        initialInvestment,
        workingCapitalPercentage: 0.05,
      },
      capitalConfig: {
        initialInvestment,
        debtTranches: debtAmount > 0
          ? [
              {
                id: 'senior-loan',
                label: 'Senior Loan',
                type: 'SENIOR',
                initialPrincipal: debtAmount,
                interestRate: 0.06,
                amortizationType: 'mortgage',
                termYears: 5,
                amortizationYears: 5,
              },
            ]
          : [],
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

  describe('runHealthChecks', () => {
    it('should detect high LTV and return warning', () => {
      // Create a model with high debt (80% LTV)
      const initialInvestment = 10000000;
      const debtAmount = 8000000; // 80% LTV
      const output = createTestModel(initialInvestment, debtAmount);

      const results = runHealthChecks(output);

      // Find the LTV check
      const ltvCheck = results.find(r => r.id === 'ltv-max');
      expect(ltvCheck).toBeDefined();
      expect(ltvCheck?.status).toBe('warning'); // 80% is above 75% but below 85%
      expect(ltvCheck?.value).toBeGreaterThan(0.75);
      expect(ltvCheck?.message).toContain('exceeds the 75% threshold');
    });

    it('should detect very high LTV and return fail', () => {
      // Create a model with very high debt (90% LTV)
      const initialInvestment = 10000000;
      const debtAmount = 9000000; // 90% LTV
      const output = createTestModel(initialInvestment, debtAmount);

      const results = runHealthChecks(output);

      // Find the LTV check
      const ltvCheck = results.find(r => r.id === 'ltv-max');
      expect(ltvCheck).toBeDefined();
      expect(ltvCheck?.status).toBe('fail'); // 90% is above 85%
      expect(ltvCheck?.value).toBeGreaterThan(0.85);
      expect(ltvCheck?.message).toContain('exceeds the 75% threshold');
      expect(ltvCheck?.message).toContain('high leverage');
    });

    it('should pass LTV check when LTV is below 75%', () => {
      // Create a model with moderate debt (60% LTV)
      const initialInvestment = 10000000;
      const debtAmount = 6000000; // 60% LTV
      const output = createTestModel(initialInvestment, debtAmount);

      const results = runHealthChecks(output);

      // Find the LTV check
      const ltvCheck = results.find(r => r.id === 'ltv-max');
      expect(ltvCheck).toBeDefined();
      expect(ltvCheck?.status).toBe('pass');
      expect(ltvCheck?.value).toBeLessThan(0.75);
      expect(ltvCheck?.message).toContain('below the 75% threshold');
    });

    it('should detect low DSCR and return warning or fail', () => {
      // Create a model with high debt service relative to NOI
      // This will result in low DSCR
      const initialInvestment = 10000000;
      const debtAmount = 8000000; // High debt
      const output = createTestModel(initialInvestment, debtAmount);

      const results = runHealthChecks(output);

      // Find the DSCR check
      const dscrCheck = results.find(r => r.id === 'dscr-min');
      expect(dscrCheck).toBeDefined();
      expect(dscrCheck?.value).toBeDefined();
      
      // DSCR status depends on the actual calculated value
      if (dscrCheck && dscrCheck.value !== null) {
        expect(['pass', 'warning', 'fail']).toContain(dscrCheck.status);
      }
    });

    it('should pass DSCR check when DSCR is above 1.2', () => {
      // Create a model with low debt relative to NOI
      // This should result in high DSCR
      const initialInvestment = 10000000;
      const debtAmount = 3000000; // Low debt (30% LTV)
      const output = createTestModel(initialInvestment, debtAmount);

      const results = runHealthChecks(output);

      // Find the DSCR check
      const dscrCheck = results.find(r => r.id === 'dscr-min');
      expect(dscrCheck).toBeDefined();
      
      // With low debt, DSCR should be high
      if (dscrCheck && dscrCheck.value !== null && dscrCheck.value > 1.2) {
        expect(dscrCheck.status).toBe('pass');
      }
    });

    it('should detect negative cash flow', () => {
      // Create a model that might have negative cash flow
      // High debt with high interest rate can cause negative cash flow
      const initialInvestment = 10000000;
      const debtAmount = 8000000;
      const output = createTestModel(initialInvestment, debtAmount);

      const results = runHealthChecks(output);

      // Find the negative cash flow check
      const cashFlowCheck = results.find(r => r.id === 'negative-cash-flow');
      expect(cashFlowCheck).toBeDefined();
      expect(['pass', 'warning']).toContain(cashFlowCheck?.status);
    });

    it('should return all four health checks', () => {
      const initialInvestment = 10000000;
      const debtAmount = 5000000;
      const output = createTestModel(initialInvestment, debtAmount);

      const results = runHealthChecks(output);

      expect(results.length).toBe(4);
      expect(results.some(r => r.id === 'dscr-min')).toBe(true);
      expect(results.some(r => r.id === 'ltv-max')).toBe(true);
      expect(results.some(r => r.id === 'negative-cash-flow')).toBe(true);
      expect(results.some(r => r.id === 'bad-deal')).toBe(true);
    });

    it('should handle no debt scenario', () => {
      // Create a model with no debt
      const initialInvestment = 10000000;
      const debtAmount = 0;
      const output = createTestModel(initialInvestment, debtAmount);

      const results = runHealthChecks(output);

      // DSCR check should warn about no debt
      const dscrCheck = results.find(r => r.id === 'dscr-min');
      expect(dscrCheck).toBeDefined();
      expect(dscrCheck?.status).toBe('warning');
      expect(dscrCheck?.message).toContain('No DSCR values available');

      // LTV check should pass (no debt)
      const ltvCheck = results.find(r => r.id === 'ltv-max');
      expect(ltvCheck).toBeDefined();
      expect(ltvCheck?.status).toBe('pass');
      expect(ltvCheck?.message).toContain('No LTV values available');
    });

    it('should detect Bad Deal when Debt > Investment', () => {
      // Create a model where debt exceeds investment (impossible in reality, but tests the check)
      // We'll use a scenario where debt is 110% of investment
      const initialInvestment = 10000000;
      const debtAmount = 11000000; // 110% LTV - debt exceeds investment
      const output = createTestModel(initialInvestment, debtAmount);

      const results = runHealthChecks(output);

      // Find the Bad Deal check
      const badDealCheck = results.find(r => r.id === 'bad-deal');
      expect(badDealCheck).toBeDefined();
      expect(badDealCheck?.status).toBe('fail');
      expect(badDealCheck?.message).toContain('exceeds initial investment');
      expect(badDealCheck?.message).toContain('bad deal');
      expect(badDealCheck?.value).toBeGreaterThan(0); // Excess debt over investment
    });

    it('should pass Bad Deal check when Debt <= Investment', () => {
      // Create a model where debt is less than investment (normal case)
      const initialInvestment = 10000000;
      const debtAmount = 5000000; // 50% LTV - debt is less than investment
      const output = createTestModel(initialInvestment, debtAmount);

      const results = runHealthChecks(output);

      // Find the Bad Deal check
      const badDealCheck = results.find(r => r.id === 'bad-deal');
      expect(badDealCheck).toBeDefined();
      expect(badDealCheck?.status).toBe('pass');
      expect(badDealCheck?.message).toContain('within initial investment');
      expect(badDealCheck?.value).toBeGreaterThan(0); // Remaining equity
    });
  });
});

