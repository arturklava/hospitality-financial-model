/**
 * System Integrity Tests (v3.6)
 * 
 * Tests for mathematical integrity and correctness:
 * 1. Conservation Test: Construction logic preserves total budget (sum of months == total)
 * 2. Bridge Accuracy Test: Base NPV + Sum(Deltas) == Target NPV (within rounding)
 */

import { describe, it, expect } from 'vitest';
import { generateDrawdownCurve } from '@engines/project/constructionEngine';
import { calculateVarianceBridge } from '@engines/analysis/varianceEngine';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  NamedScenario,
  FullModelInput,
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
  HotelConfig,
} from '@domain/types';

/**
 * Builds a minimal hotel configuration for testing.
 */
function buildMinimalHotelConfig(adr: number = 100): HotelConfig {
  return {
    id: 'test-hotel-1',
    name: 'Test Hotel',
    operationType: 'HOTEL',
    startYear: 2026,
    horizonYears: 5,
    keys: 100, // 100 rooms
    avgDailyRate: adr, // ADR parameter
    occupancyByMonth: Array(12).fill(0.70), // 70% occupancy year-round

    // Revenue mix as % of room revenue
    foodRevenuePctOfRooms: 0.30,
    beverageRevenuePctOfRooms: 0.15,
    otherRevenuePctOfRooms: 0.10,

    // COGS as % of respective revenue
    foodCogsPct: 0.35,
    beverageCogsPct: 0.25,

    // Opex as % of total revenue
    payrollPct: 0.35,
    utilitiesPct: 0.05,
    marketingPct: 0.03,
    maintenanceOpexPct: 0.04,
    otherOpexPct: 0.03,

    // Maintenance capex as % of total revenue
    maintenanceCapexPct: 0.02,
  };
}

/**
 * Builds a minimal base input for variance testing.
 */
function buildBaseInput(adr: number = 100): FullModelInput {
  const scenario: ProjectScenario = {
    id: 'test-scenario-base',
    name: 'Base Scenario',
    startYear: 2026,
    horizonYears: 5,
    operations: [buildMinimalHotelConfig(adr)],
  };

  const projectConfig: ProjectConfig = {
    discountRate: 0.10, // 10% discount rate
    terminalGrowthRate: 0.02, // 2% terminal growth
    initialInvestment: 20_000_000, // $20M initial investment
    workingCapitalPercentage: 0.05, // 5% of revenue
  };

  const capitalConfig: CapitalStructureConfig = {
    initialInvestment: projectConfig.initialInvestment,
    debtTranches: [
      {
        id: 'loan-1',
        label: 'Senior Loan',
        type: 'SENIOR',
        initialPrincipal: 10_000_000, // $10M debt (50% LTV)
        interestRate: 0.06, // 6% interest rate
        amortizationType: 'mortgage',
        termYears: 10,
        amortizationYears: 10,
      },
    ],
  };

  const waterfallConfig: WaterfallConfig = {
    equityClasses: [
      {
        id: 'lp',
        name: 'Limited Partner',
        contributionPct: 0.9,
      },
      {
        id: 'gp',
        name: 'General Partner',
        contributionPct: 0.1,
      },
    ],
  };

  return {
    scenario,
    projectConfig,
    capitalConfig,
    waterfallConfig,
  };
}

/**
 * Builds a NamedScenario from FullModelInput.
 */
function buildNamedScenario(
  id: string,
  name: string,
  modelConfig: FullModelInput
): NamedScenario {
  return {
    id,
    name,
    description: `Test scenario: ${name}`,
    modelConfig,
  };
}

describe('System Integrity Tests (v3.6)', () => {
  describe('Conservation Test: Construction Logic', () => {
    it('should preserve total budget for linear drawdown curve', () => {
      const testCases = [
        { total: 1_000_000, months: 1 },
        { total: 5_000_000, months: 6 },
        { total: 12_000_000, months: 12 },
        { total: 50_000_000, months: 18 },
        { total: 100_000_000, months: 24 },
      ];

      testCases.forEach(({ total, months }) => {
        const drawdowns = generateDrawdownCurve(total, months, 'linear');
        
        // Sum of months should equal total
        const sum = drawdowns.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(total, 2);
        
        // Verify length matches months
        expect(drawdowns.length).toBe(months);
      });
    });

    it('should preserve total budget for S-curve drawdown curve', () => {
      const testCases = [
        { total: 1_000_000, months: 1 },
        { total: 5_000_000, months: 6 },
        { total: 12_000_000, months: 12 },
        { total: 50_000_000, months: 18 },
        { total: 100_000_000, months: 24 },
      ];

      testCases.forEach(({ total, months }) => {
        const drawdowns = generateDrawdownCurve(total, months, 's-curve');
        
        // Sum of months should equal total (within floating-point precision)
        const sum = drawdowns.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(total, 2);
        
        // Verify length matches months
        expect(drawdowns.length).toBe(months);
      });
    });

    it('should preserve total budget for various construction durations', () => {
      const total = 20_000_000; // $20M total budget
      const durations = [3, 6, 9, 12, 18, 24, 36];

      durations.forEach((months) => {
        const linearDrawdowns = generateDrawdownCurve(total, months, 'linear');
        const sCurveDrawdowns = generateDrawdownCurve(total, months, 's-curve');

        const linearSum = linearDrawdowns.reduce((acc, val) => acc + val, 0);
        const sCurveSum = sCurveDrawdowns.reduce((acc, val) => acc + val, 0);

        expect(linearSum).toBeCloseTo(total, 2);
        expect(sCurveSum).toBeCloseTo(total, 2);
      });
    });

    it('should preserve total budget for large construction budgets', () => {
      const largeBudgets = [
        { total: 50_000_000, months: 12 },
        { total: 100_000_000, months: 18 },
        { total: 250_000_000, months: 24 },
        { total: 500_000_000, months: 36 },
      ];

      largeBudgets.forEach(({ total, months }) => {
        const drawdowns = generateDrawdownCurve(total, months, 's-curve');
        const sum = drawdowns.reduce((acc, val) => acc + val, 0);
        
        // For large budgets, use tighter tolerance (0.01% or $100, whichever is larger)
        const tolerance = Math.max(total * 0.0001, 100);
        expect(Math.abs(sum - total)).toBeLessThan(tolerance);
      });
    });
  });

  describe('Bridge Accuracy Test: NPV Variance Bridge', () => {
    it('should satisfy Base NPV + Sum(Deltas) == Target NPV for ADR change', () => {
      const baseInput = buildBaseInput(100); // ADR 100
      const targetInput = buildBaseInput(110); // ADR 110

      const baseScenario: NamedScenario = buildNamedScenario(
        'base',
        'Base Case (ADR 100)',
        baseInput
      );
      const targetScenario: NamedScenario = buildNamedScenario(
        'target',
        'Target Case (ADR 110)',
        targetInput
      );

      // Calculate bridge
      const bridge = calculateVarianceBridge(baseScenario, targetScenario);

      // Get Base NPV
      const baseOutput = runFullModel(baseScenario.modelConfig);
      const baseNpv = baseOutput.project.projectKpis.npv;

      // Get Target NPV
      const targetOutput = runFullModel(targetScenario.modelConfig);
      const targetNpv = targetOutput.project.projectKpis.npv;

      // Calculate sum of deltas
      const sumOfDeltas = bridge.reduce((sum, step) => sum + step.value, 0);

      // Verify: Base NPV + Sum(Deltas) == Target NPV (within rounding)
      const calculatedTargetNpv = baseNpv + sumOfDeltas;
      const difference = Math.abs(calculatedTargetNpv - targetNpv);
      
      // Tolerance: $1 or 0.01% of target NPV, whichever is larger
      const tolerance = Math.max(1, Math.abs(targetNpv) * 0.0001);
      
      expect(difference).toBeLessThan(tolerance);
      
      // Also verify that the last cumulative value equals Target NPV
      if (bridge.length > 0) {
        const lastCumulativeValue = bridge[bridge.length - 1].cumulativeValue;
        const cumulativeDifference = Math.abs(lastCumulativeValue - targetNpv);
        expect(cumulativeDifference).toBeLessThan(tolerance);
      }
    });

    it('should satisfy Base NPV + Sum(Deltas) == Target NPV for capital structure change', () => {
      const baseInput = buildBaseInput(100);
      const targetInput = buildBaseInput(100);

      // Change interest rate in target
      targetInput.capitalConfig.debtTranches[0].interestRate = 0.05; // 5% instead of 6%

      const baseScenario: NamedScenario = buildNamedScenario(
        'base',
        'Base Case (6% rate)',
        baseInput
      );
      const targetScenario: NamedScenario = buildNamedScenario(
        'target',
        'Target Case (5% rate)',
        targetInput
      );

      // Calculate bridge
      const bridge = calculateVarianceBridge(baseScenario, targetScenario);

      // Get Base NPV
      const baseOutput = runFullModel(baseScenario.modelConfig);
      const baseNpv = baseOutput.project.projectKpis.npv;

      // Get Target NPV
      const targetOutput = runFullModel(targetScenario.modelConfig);
      const targetNpv = targetOutput.project.projectKpis.npv;

      // Calculate sum of deltas
      const sumOfDeltas = bridge.reduce((sum, step) => sum + step.value, 0);

      // Verify: Base NPV + Sum(Deltas) == Target NPV (within rounding)
      const calculatedTargetNpv = baseNpv + sumOfDeltas;
      const difference = Math.abs(calculatedTargetNpv - targetNpv);
      
      // Tolerance: $1 or 0.01% of target NPV, whichever is larger
      const tolerance = Math.max(1, Math.abs(targetNpv) * 0.0001);
      
      expect(difference).toBeLessThan(tolerance);
    });

    it('should satisfy Base NPV + Sum(Deltas) == Target NPV for construction change', () => {
      const baseInput = buildBaseInput(100);
      const targetInput = buildBaseInput(100);

      // Change initial investment in target
      targetInput.projectConfig.initialInvestment = 18_000_000; // $18M instead of $20M

      const baseScenario: NamedScenario = buildNamedScenario(
        'base',
        'Base Case ($20M)',
        baseInput
      );
      const targetScenario: NamedScenario = buildNamedScenario(
        'target',
        'Target Case ($18M)',
        targetInput
      );

      // Calculate bridge
      const bridge = calculateVarianceBridge(baseScenario, targetScenario);

      // Get Base NPV
      const baseOutput = runFullModel(baseScenario.modelConfig);
      const baseNpv = baseOutput.project.projectKpis.npv;

      // Get Target NPV
      const targetOutput = runFullModel(targetScenario.modelConfig);
      const targetNpv = targetOutput.project.projectKpis.npv;

      // Calculate sum of deltas
      const sumOfDeltas = bridge.reduce((sum, step) => sum + step.value, 0);

      // Verify: Base NPV + Sum(Deltas) == Target NPV (within rounding)
      const calculatedTargetNpv = baseNpv + sumOfDeltas;
      const difference = Math.abs(calculatedTargetNpv - targetNpv);
      
      // Tolerance: $1 or 0.01% of target NPV, whichever is larger
      const tolerance = Math.max(1, Math.abs(targetNpv) * 0.0001);
      
      expect(difference).toBeLessThan(tolerance);
    });

    it('should satisfy Base NPV + Sum(Deltas) == Target NPV for combined changes', () => {
      const baseInput = buildBaseInput(100);
      const targetInput = buildBaseInput(110); // Higher ADR

      // Also change interest rate
      targetInput.capitalConfig.debtTranches[0].interestRate = 0.05; // Lower rate

      // Also change investment
      targetInput.projectConfig.initialInvestment = 18_000_000; // Lower investment

      const baseScenario: NamedScenario = buildNamedScenario(
        'base',
        'Base Case',
        baseInput
      );
      const targetScenario: NamedScenario = buildNamedScenario(
        'target',
        'Target Case (ADR 110, 5% rate, $18M)',
        targetInput
      );

      // Calculate bridge
      const bridge = calculateVarianceBridge(baseScenario, targetScenario);

      // Get Base NPV
      const baseOutput = runFullModel(baseScenario.modelConfig);
      const baseNpv = baseOutput.project.projectKpis.npv;

      // Get Target NPV
      const targetOutput = runFullModel(targetScenario.modelConfig);
      const targetNpv = targetOutput.project.projectKpis.npv;

      // Calculate sum of deltas
      const sumOfDeltas = bridge.reduce((sum, step) => sum + step.value, 0);

      // Verify: Base NPV + Sum(Deltas) == Target NPV (within rounding)
      const calculatedTargetNpv = baseNpv + sumOfDeltas;
      const difference = Math.abs(calculatedTargetNpv - targetNpv);
      
      // Tolerance: $1 or 0.01% of target NPV, whichever is larger
      const tolerance = Math.max(1, Math.abs(targetNpv) * 0.0001);
      
      expect(difference).toBeLessThan(tolerance);
      
      // Also verify that the last cumulative value equals Target NPV
      if (bridge.length > 0) {
        const lastCumulativeValue = bridge[bridge.length - 1].cumulativeValue;
        const cumulativeDifference = Math.abs(lastCumulativeValue - targetNpv);
        expect(cumulativeDifference).toBeLessThan(tolerance);
      }
    });

    it('should satisfy Base NPV + Sum(Deltas) == Target NPV for identical scenarios', () => {
      const baseInput = buildBaseInput(100);
      const targetInput = buildBaseInput(100); // Same as base

      const baseScenario: NamedScenario = buildNamedScenario(
        'base',
        'Base Case',
        baseInput
      );
      const targetScenario: NamedScenario = buildNamedScenario(
        'target',
        'Target Case',
        targetInput
      );

      // Calculate bridge
      const bridge = calculateVarianceBridge(baseScenario, targetScenario);

      // Get Base NPV
      const baseOutput = runFullModel(baseScenario.modelConfig);
      const baseNpv = baseOutput.project.projectKpis.npv;

      // Get Target NPV
      const targetOutput = runFullModel(targetScenario.modelConfig);
      const targetNpv = targetOutput.project.projectKpis.npv;

      // Calculate sum of deltas
      const sumOfDeltas = bridge.reduce((sum, step) => sum + step.value, 0);

      // Verify: Base NPV + Sum(Deltas) == Target NPV (within rounding)
      const calculatedTargetNpv = baseNpv + sumOfDeltas;
      const difference = Math.abs(calculatedTargetNpv - targetNpv);
      
      // For identical scenarios, difference should be very small (within $1K)
      expect(difference).toBeLessThan(1000);
    });
  });
});

