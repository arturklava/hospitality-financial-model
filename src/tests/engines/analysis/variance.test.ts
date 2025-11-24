import { describe, it, expect } from 'vitest';
import { calculateVarianceBridge } from '@engines/analysis/varianceEngine';
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

describe('Variance Analysis Engine', () => {
  describe('calculateVarianceBridge', () => {
    it('should calculate variance bridge for ADR change (100 to 110)', () => {
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

      const bridge = calculateVarianceBridge(baseScenario, targetScenario);

      // Verify bridge structure
      expect(bridge).toBeDefined();
      expect(Array.isArray(bridge)).toBe(true);
      expect(bridge.length).toBeGreaterThanOrEqual(3); // At least 3 steps (Operational, Capital, Development)

      // Verify step labels
      const labels = bridge.map(step => step.label);
      expect(labels).toContain('Operational Impact');
      expect(labels).toContain('Capital Impact');
      expect(labels).toContain('Development Impact');

      // Verify Operational Impact is positive (higher ADR = higher revenue = higher NPV)
      const operationalStep = bridge.find(step => step.label === 'Operational Impact');
      expect(operationalStep).toBeDefined();
      expect(operationalStep!.value).toBeGreaterThan(0); // Positive revenue impact

      // Verify cumulative values are increasing (or at least non-decreasing)
      for (let i = 1; i < bridge.length; i++) {
        expect(bridge[i].cumulativeValue).toBeGreaterThanOrEqual(
          bridge[i - 1].cumulativeValue
        );
      }

      // Verify all values are finite
      bridge.forEach(step => {
        expect(Number.isFinite(step.value)).toBe(true);
        expect(Number.isFinite(step.cumulativeValue)).toBe(true);
      });
    });

    it('should handle scenarios with no changes (identical base and target)', () => {
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

      const bridge = calculateVarianceBridge(baseScenario, targetScenario);

      // Verify bridge structure
      expect(bridge).toBeDefined();
      expect(Array.isArray(bridge)).toBe(true);

      // All impacts should be close to zero (within rounding tolerance)
      bridge.forEach(step => {
        expect(Math.abs(step.value)).toBeLessThan(1000); // Within $1K tolerance
      });
    });

    it('should handle capital structure changes (interest rate change)', () => {
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

      const bridge = calculateVarianceBridge(baseScenario, targetScenario);

      // Verify bridge structure
      expect(bridge).toBeDefined();

      // Capital Impact: Note that project NPV is unlevered, so capital structure changes
      // (interest rates) primarily affect levered cash flows, not unlevered NPV.
      // The impact may be zero or very small due to WACC effects.
      const capitalStep = bridge.find(step => step.label === 'Capital Impact');
      expect(capitalStep).toBeDefined();
      // Capital impact may be zero or small (within tolerance)
      expect(Math.abs(capitalStep!.value)).toBeLessThan(100000); // Within $100K tolerance
    });

    it('should handle construction changes (initial investment change)', () => {
      const baseInput = buildBaseInput(100);
      const targetInput = buildBaseInput(100);

      // Change initial investment in target (lower investment = better NPV)
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

      const bridge = calculateVarianceBridge(baseScenario, targetScenario);

      // Verify bridge structure
      expect(bridge).toBeDefined();

      // Development Impact should be positive (lower investment = higher NPV)
      const developmentStep = bridge.find(step => step.label === 'Development Impact');
      expect(developmentStep).toBeDefined();
      expect(developmentStep!.value).toBeGreaterThan(0); // Positive development impact
    });

    it('should handle combined changes (ADR + interest rate + investment)', () => {
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

      const bridge = calculateVarianceBridge(baseScenario, targetScenario);

      // Verify bridge structure
      expect(bridge).toBeDefined();
      expect(bridge.length).toBeGreaterThanOrEqual(3);

      // Operational and Development impacts should be positive in this case
      const operationalStep = bridge.find(step => step.label === 'Operational Impact');
      expect(operationalStep).toBeDefined();
      expect(operationalStep!.value).toBeGreaterThan(0);

      // Capital Impact: Note that project NPV is unlevered, so capital structure changes
      // (interest rates) primarily affect levered cash flows, not unlevered NPV.
      // The impact may be zero or very small due to WACC effects.
      const capitalStep = bridge.find(step => step.label === 'Capital Impact');
      expect(capitalStep).toBeDefined();
      // Capital impact may be zero or small (within tolerance)
      expect(Math.abs(capitalStep!.value)).toBeLessThan(100000); // Within $100K tolerance

      const developmentStep = bridge.find(step => step.label === 'Development Impact');
      expect(developmentStep).toBeDefined();
      expect(developmentStep!.value).toBeGreaterThan(0);
    });

    it('should preserve immutability (base and target scenarios not modified)', () => {
      const baseInput = buildBaseInput(100);
      const targetInput = buildBaseInput(110);

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

      const originalBaseAdr = (baseInput.scenario.operations[0] as HotelConfig).avgDailyRate;
      const originalTargetAdr = (targetInput.scenario.operations[0] as HotelConfig).avgDailyRate;

      calculateVarianceBridge(baseScenario, targetScenario);

      // Verify inputs were not modified
      expect((baseInput.scenario.operations[0] as HotelConfig).avgDailyRate).toBe(originalBaseAdr);
      expect((targetInput.scenario.operations[0] as HotelConfig).avgDailyRate).toBe(originalTargetAdr);
    });
  });
});

