import { describe, it, expect } from 'vitest';
import { runFullPipeline } from '@engines/pipeline/fullPipeline';
import {
  buildSampleScenario,
  buildSampleProjectConfig,
  buildSampleCapitalConfig,
  buildSampleWaterfallConfig,
} from '../../../sampleData';
import type {
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
} from '@domain/types';

describe('Full Pipeline', () => {
  describe('Happy path with sample data', () => {
    it('should run the full pipeline end-to-end correctly', () => {
      const scenario = buildSampleScenario();
      const projectConfig = buildSampleProjectConfig();
      const capitalConfig = buildSampleCapitalConfig();
      const waterfallConfig = buildSampleWaterfallConfig();

      const result = runFullPipeline({
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      });

      // Verify scenario result
      expect(result.scenarioResult.consolidatedAnnualPnl.length).toBe(scenario.horizonYears);
      expect(result.scenarioResult.operations.length).toBeGreaterThan(0);

      // Verify project result
      expect(result.projectResult.unleveredFcf.length).toBe(scenario.horizonYears);
      expect(result.projectResult.dcfValuation).toBeDefined();
      expect(result.projectResult.projectKpis).toBeDefined();

      // Verify capital result
      expect(result.capitalResult.ownerLeveredCashFlows.length).toBe(scenario.horizonYears + 1); // Year 0..N
      expect(result.capitalResult.debtSchedule.entries.length).toBe(scenario.horizonYears);
      expect(result.capitalResult.leveredFcfByYear.length).toBe(scenario.horizonYears);
      expect(result.capitalResult.debtKpis.length).toBe(scenario.horizonYears);

      // Verify waterfall result
      expect(result.waterfallResult.ownerCashFlows).toEqual(result.capitalResult.ownerLeveredCashFlows);
      expect(result.waterfallResult.partners.length).toBe(waterfallConfig.equityClasses.length);
      expect(result.waterfallResult.annualRows.length).toBe(result.capitalResult.ownerLeveredCashFlows.length);

      // Verify invariant: sum of partner CFs equals owner CF for each year
      for (let t = 0; t < result.waterfallResult.annualRows.length; t++) {
        const row = result.waterfallResult.annualRows[t];
        const ownerCF = row.ownerCashFlow;
        const partnerSum = Object.values(row.partnerDistributions).reduce((sum, cf) => sum + cf, 0);
        expect(partnerSum).toBeCloseTo(ownerCF, 2);
      }
    });
  });

  describe('No-debt scenario', () => {
    it('should handle zero debt correctly', () => {
      const scenario = buildSampleScenario();
      const projectConfig = buildSampleProjectConfig();
      const waterfallConfig = buildSampleWaterfallConfig();

      // Create capital config with zero debt
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [
          {
            id: 'zero-debt',
            amount: 0,
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const result = runFullPipeline({
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      });

      // Verify debt schedule is all zeros
      for (const entry of result.capitalResult.debtSchedule.entries) {
        expect(entry.beginningBalance).toBe(0);
        expect(entry.interest).toBe(0);
        expect(entry.principal).toBe(0);
        expect(entry.endingBalance).toBe(0);
      }

      // Verify owner levered FCF equals unlevered FCF (within epsilon)
      for (let t = 0; t < scenario.horizonYears; t++) {
        const unleveredFcf = result.projectResult.unleveredFcf[t].unleveredFreeCashFlow;
        const leveredFcf = result.capitalResult.leveredFcfByYear[t].leveredFreeCashFlow;
        expect(leveredFcf).toBeCloseTo(unleveredFcf, 2);
      }

      // Verify waterfall still splits CFs correctly
      for (const row of result.waterfallResult.annualRows) {
        const partnerSum = Object.values(row.partnerDistributions).reduce((sum, cf) => sum + cf, 0);
        expect(partnerSum).toBeCloseTo(row.ownerCashFlow, 2);
      }
    });
  });

  describe('Negative project scenario', () => {
    it('should handle negative UFCF correctly', () => {
      // Create a scenario with very low occupancy to generate negative NOI
      const scenario: ProjectScenario = {
        id: 'negative-scenario',
        name: 'Negative Project',
        startYear: 2026,
        horizonYears: 5,
        operations: [
          {
            id: 'low-occupancy-hotel',
            name: 'Low Occupancy Hotel',
            operationType: 'HOTEL',
            startYear: 2026,
            horizonYears: 5,
            keys: 50,
            avgDailyRate: 100, // Low ADR
            occupancyByMonth: Array(12).fill(0.20), // Very low occupancy (20%)
            foodRevenuePctOfRooms: 0.30,
            beverageRevenuePctOfRooms: 0.15,
            otherRevenuePctOfRooms: 0.10,
            foodCogsPct: 0.35,
            beverageCogsPct: 0.25,
            payrollPct: 0.50, // High payroll
            utilitiesPct: 0.10,
            marketingPct: 0.05,
            maintenanceOpexPct: 0.08,
            otherOpexPct: 0.05,
            maintenanceCapexPct: 0.05,
          },
        ],
      };

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 10000000, // $10M investment
        workingCapitalPercentage: 0.05,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: projectConfig.initialInvestment,
        debtTranches: [
          {
            id: 'loan',
            amount: 5000000, // $5M debt
            interestRate: 0.10,
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const waterfallConfig = buildSampleWaterfallConfig();

      const result = runFullPipeline({
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      });

      // Verify NPV is negative (or very low)
      expect(result.projectResult.projectKpis.npv).toBeLessThan(0);

      // Verify unlevered IRR is null or very low
      if (result.projectResult.projectKpis.unleveredIrr !== null) {
        expect(result.projectResult.projectKpis.unleveredIrr).toBeLessThan(0.05); // Very low or negative
      }

      // Verify waterfall still respects the invariant
      for (const row of result.waterfallResult.annualRows) {
        const ownerCF = row.ownerCashFlow;
        const partnerSum = Object.values(row.partnerDistributions).reduce((sum, cf) => sum + cf, 0);
        expect(partnerSum).toBeCloseTo(ownerCF, 2);
      }

      // Verify some years have negative levered FCF
      const hasNegativeYears = result.capitalResult.leveredFcfByYear.some(
        (lfcf) => lfcf.leveredFreeCashFlow < 0
      );
      expect(hasNegativeYears).toBe(true);
    });
  });

  describe('Pipeline consistency', () => {
    it('should maintain data consistency across all engines', () => {
      const scenario = buildSampleScenario();
      const projectConfig = buildSampleProjectConfig();
      const capitalConfig = buildSampleCapitalConfig();
      const waterfallConfig = buildSampleWaterfallConfig();

      const result = runFullPipeline({
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      });

      // Verify consolidated P&L year indices match
      for (let i = 0; i < result.scenarioResult.consolidatedAnnualPnl.length; i++) {
        expect(result.scenarioResult.consolidatedAnnualPnl[i].yearIndex).toBe(i);
      }

      // Verify unlevered FCF year indices match
      for (let i = 0; i < result.projectResult.unleveredFcf.length; i++) {
        expect(result.projectResult.unleveredFcf[i].yearIndex).toBe(i);
      }

      // Verify debt schedule year indices match
      for (let i = 0; i < result.capitalResult.debtSchedule.entries.length; i++) {
        expect(result.capitalResult.debtSchedule.entries[i].yearIndex).toBe(i);
      }

      // Verify levered FCF year indices match
      for (let i = 0; i < result.capitalResult.leveredFcfByYear.length; i++) {
        expect(result.capitalResult.leveredFcfByYear[i].yearIndex).toBe(i);
      }

      // Verify owner levered cash flows Year 0 is negative (equity investment)
      expect(result.capitalResult.ownerLeveredCashFlows[0]).toBeLessThan(0);

      // Verify waterfall owner cash flows match capital owner levered cash flows exactly
      expect(result.waterfallResult.ownerCashFlows).toEqual(result.capitalResult.ownerLeveredCashFlows);
    });
  });
});

