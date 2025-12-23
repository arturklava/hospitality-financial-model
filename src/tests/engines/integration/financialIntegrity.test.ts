import { describe, it, expect } from 'vitest';
import { runProjectEngine } from '@engines/project/projectEngine';
import { runScenarioEngine } from '@engines/scenario/scenarioEngine';
import { applyEquityWaterfall } from '@engines/waterfall/waterfallEngine';
import type {
  ProjectConfig,
  ConsolidatedAnnualPnl,
  ProjectScenario,
  HotelConfig,
  WaterfallConfig
} from '@domain/types';

describe('Financial Integrity (The Atom)', () => {

  describe('Scenario A: Zero Absoluto', () => {
    it('should handle all-zero inputs without crashing or returning NaN', () => {
      const zeroPnl: ConsolidatedAnnualPnl[] = Array(5).fill(0).map((_, i) => ({
        yearIndex: i,
        revenueTotal: 0,
        departmentalExpenses: 0,
        gop: 0,
        undistributedExpenses: 0,
        noi: 0,
        maintenanceCapex: 0,
        cashFlow: 0,
        // Legacy
        cogsTotal: 0,
        opexTotal: 0,
        ebitda: 0,
      }));

      const zeroConfig: ProjectConfig = {
        discountRate: 0.1,
        terminalGrowthRate: 0.02,
        initialInvestment: 0,
        constructionDuration: 0,
      };

      const result = runProjectEngine(zeroPnl, zeroConfig);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Essential invariants
        // expect(result.data.dscr).toBeUndefined(); // dscr is not in project engine result direct, it's in capital. Checked manually.
        expect(result.data.projectKpis.npv).toBe(0);

        // Ensure no NaN
        expect(result.data.projectKpis.unleveredIrr).not.toBeNaN();
        // IRR of all zeros is usually null or handled gracefully
        expect(result.data.projectKpis.unleveredIrr).toBeNull();

        // Cash flows should be 0
        result.data.unleveredFcf.forEach((fcf: any) => {
          expect(fcf.unleveredFreeCashFlow).toBe(0);
        });
      }
    });
  });

  describe('Scenario B: Consistência Temporal', () => {
    it('should match sum of monthly flows to annual flows', () => {
      // Create a scenario with 1 operation
      const operation: HotelConfig = {
        id: 'hotel-1',
        name: 'Test Hotel',
        operationType: 'HOTEL',
        startYear: 2024,
        horizonYears: 5,
        keys: 100,
        avgDailyRate: 200,
        occupancyByMonth: Array(12).fill(0.7), // 70% occupancy
        foodRevenuePctOfRooms: 0.2,
        beverageRevenuePctOfRooms: 0.1,
        otherRevenuePctOfRooms: 0.05,
        foodCogsPct: 0.3,
        beverageCogsPct: 0.2,
        payrollPct: 0.3,
        utilitiesPct: 0.05,
        marketingPct: 0.03,
        maintenanceOpexPct: 0.04,
        otherOpexPct: 0.02,
        maintenanceCapexPct: 0.04,
      };

      const scenario: ProjectScenario = {
        id: 'scenario-1',
        name: 'Consistency Test',
        startYear: 2024,
        horizonYears: 5,
        operations: [operation],
      };

      const result = runScenarioEngine(scenario);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { consolidatedAnnualPnl, consolidatedMonthlyPnl } = result.data;

      // Sum monthly cash flows
      const sumMonthlyCashFlow = consolidatedMonthlyPnl.reduce((sum: number, m: any) => sum + m.cashFlow, 0);
      // Sum annual cash flows
      const sumAnnualCashFlow = consolidatedAnnualPnl.reduce((sum: number, a: any) => sum + a.cashFlow, 0);

      // Check consistency
      expect(sumMonthlyCashFlow).toBeCloseTo(sumAnnualCashFlow, 2);

      // Also check Revenue
      const sumMonthlyRevenue = consolidatedMonthlyPnl.reduce((sum: number, m: any) => sum + m.revenueTotal, 0);
      const sumAnnualRevenue = consolidatedAnnualPnl.reduce((sum: number, a: any) => sum + a.revenueTotal, 0);
      expect(sumMonthlyRevenue).toBeCloseTo(sumAnnualRevenue, 2);
    });
  });

  describe('Scenario C: Estabilidade da Água (Waterfall)', () => {
    it('should conserve cash across partners', () => {
      // Volatile cash flows: investment, positive, negative (capital call), huge positive
      const volatileCashFlows = [-1000, 200, -500, 3000, 0];

      const waterfallConfig: WaterfallConfig = {
        tiers: [
          {
            id: 'tier1',
            name: 'Return of Capital',
            type: 'return_of_capital',
            distributionSplits: { 'lp': 0.9, 'gp': 0.1 }
          },
          {
            id: 'tier2',
            name: 'Promote',
            type: 'promote',
            distributionSplits: { 'lp': 0.7, 'gp': 0.3 }
          }
        ],
        equityClasses: [
          { id: 'lp', name: 'LP', contributionPct: 0.9 },
          { id: 'gp', name: 'GP', contributionPct: 0.1 }
        ]
      };

      const result = applyEquityWaterfall(volatileCashFlows, waterfallConfig);

      // For each year, sum of partner cash flows must equal owner cash flow
      result.ownerCashFlows.forEach((ownerCf: number, t: number) => {
        const partnerSum = result.partners.reduce((sum: number, p: any) => sum + (p.cashFlows[t] || 0), 0);

        // Critical Invariant: Conservation of Cash
        // Using a small epsilon for floating point math
        expect(partnerSum).toBeCloseTo(ownerCf, 9);
      });
    });
  });
});

