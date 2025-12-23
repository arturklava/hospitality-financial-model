import { describe, it, expect } from 'vitest';
import { runScenarioTriad, compareScenarios, cloneFullModelInput } from '@engines/analysis/scenarioComparison';
import type {
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
function buildMinimalHotelConfig(): HotelConfig {
  return {
    id: 'test-hotel-1',
    name: 'Test Hotel',
    operationType: 'HOTEL',
    startYear: 2026,
    horizonYears: 5,
    keys: 100, // 100 rooms
    avgDailyRate: 200, // $200 per room per night
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
 * Builds a minimal base input for scenario comparison testing.
 */
function buildBaseInput(): FullModelInput {
  const scenario: ProjectScenario = {
    id: 'test-scenario-triad',
    name: 'Test Scenario for Triad',
    startYear: 2026,
    horizonYears: 5,
    operations: [buildMinimalHotelConfig()],
  };

  const projectConfig: ProjectConfig = {
    discountRate: 0.10, // 10% discount rate
    terminalGrowthRate: 0.02, // 2% terminal growth
    initialInvestment: 20_000_000, // $20M initial investment
    workingCapitalPercentage: 0.05, // 5% of revenue
  };

  const capitalConfig: CapitalStructureConfig = {
    initialInvestment: projectConfig.initialInvestment,
    tranches: [
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

describe('Scenario Comparison Engine', () => {
  describe('runScenarioTriad', () => {
    it('should run base, stress, and upside scenarios', () => {
      const baseInput = buildBaseInput();
      const stressPct = 0.20; // 20% stress/upside

      const result = runScenarioTriad(baseInput, stressPct);

      // Verify all three scenarios have valid KPIs
      expect(result.base).toBeDefined();
      expect(result.stress).toBeDefined();
      expect(result.upside).toBeDefined();

      // Verify all KPIs are finite numbers
      expect(Number.isFinite(result.base.npv)).toBe(true);
      expect(Number.isFinite(result.base.equityMultiple)).toBe(true);
      expect(Number.isFinite(result.stress.npv)).toBe(true);
      expect(Number.isFinite(result.stress.equityMultiple)).toBe(true);
      expect(Number.isFinite(result.upside.npv)).toBe(true);
      expect(Number.isFinite(result.upside.equityMultiple)).toBe(true);
    });

    it('should verify Stress.npv < Base.npv < Upside.npv', () => {
      const baseInput = buildBaseInput();
      const stressPct = 0.20; // 20% stress/upside

      const result = runScenarioTriad(baseInput, stressPct);

      // Assert ordering: Stress < Base < Upside
      expect(result.stress.npv).toBeLessThan(result.base.npv);
      expect(result.base.npv).toBeLessThan(result.upside.npv);
    });

    it('should work with different stress percentages', () => {
      const baseInput = buildBaseInput();
      const stressPct = 0.10; // 10% stress/upside

      const result = runScenarioTriad(baseInput, stressPct);

      // Verify all three scenarios have valid KPIs
      expect(result.base).toBeDefined();
      expect(result.stress).toBeDefined();
      expect(result.upside).toBeDefined();

      // Assert ordering: Stress < Base < Upside
      expect(result.stress.npv).toBeLessThan(result.base.npv);
      expect(result.base.npv).toBeLessThan(result.upside.npv);
    });

    it('should preserve base input (immutability check)', () => {
      const baseInput = buildBaseInput();
      const firstOp = baseInput.scenario.operations[0] as HotelConfig;
      const originalOccupancy = [...firstOp.occupancyByMonth];
      const originalAdr = firstOp.avgDailyRate;

      runScenarioTriad(baseInput, 0.20);

      // Verify base input was not modified
      expect(firstOp.occupancyByMonth).toEqual(originalOccupancy);
      expect(firstOp.avgDailyRate).toBe(originalAdr);
    });

    it('should handle edge case with very small stress percentage', () => {
      const baseInput = buildBaseInput();
      const stressPct = 0.01; // 1% stress/upside

      const result = runScenarioTriad(baseInput, stressPct);

      // Verify all three scenarios have valid KPIs
      expect(result.base).toBeDefined();
      expect(result.stress).toBeDefined();
      expect(result.upside).toBeDefined();

      // With very small stress, differences should be small but still ordered
      expect(result.stress.npv).toBeLessThanOrEqual(result.base.npv);
      expect(result.base.npv).toBeLessThanOrEqual(result.upside.npv);
    });

    it('should handle scenarios with multiple operations', () => {
      const baseInput = buildBaseInput();
      // Add a second hotel operation
      const secondHotel: HotelConfig = {
        ...buildMinimalHotelConfig(),
        id: 'test-hotel-2',
        name: 'Test Hotel 2',
        avgDailyRate: 150,
        occupancyByMonth: Array(12).fill(0.65),
      };
      baseInput.scenario.operations.push(secondHotel);

      const stressPct = 0.15;
      const result = runScenarioTriad(baseInput, stressPct);

      // Verify all three scenarios have valid KPIs
      expect(result.base).toBeDefined();
      expect(result.stress).toBeDefined();
      expect(result.upside).toBeDefined();

      // Assert ordering: Stress < Base < Upside
      expect(result.stress.npv).toBeLessThan(result.base.npv);
      expect(result.base.npv).toBeLessThan(result.upside.npv);
    });
  });
});

describe('compareScenarios', () => {
  it('should produce different results for different inputs (Isolation Test)', () => {
    const baseInput = buildBaseInput();

    // Scenario A: Standard hotel
    const scenarioAConfig = cloneFullModelInput(baseInput);
    (scenarioAConfig.scenario.operations[0] as HotelConfig).avgDailyRate = 200;

    // Scenario B: Premium hotel (copy A, change ADR)
    const scenarioBConfig = cloneFullModelInput(baseInput);
    (scenarioBConfig.scenario.operations[0] as HotelConfig).avgDailyRate = 400;

    const inputs = [
      { id: 'scen-A', name: 'Scenario A', config: scenarioAConfig },
      { id: 'scen-B', name: 'Scenario B', config: scenarioBConfig },
    ];

    const results = compareScenarios(inputs);

    // Verify we got results
    // NOTE: This will fail until compareScenarios is implemented
    expect(results.length).toBe(2);

    const resultA = results.find(r => r.id === 'scen-A');
    const resultB = results.find(r => r.id === 'scen-B');

    expect(resultA).toBeDefined();
    expect(resultB).toBeDefined();

    if (resultA && resultB) {
      expect(resultA.kpis.npv).not.toBe(resultB.kpis.npv);
      // Higher ADR should lead to higher NPV
      expect(resultB.kpis.npv).toBeGreaterThan(resultA.kpis.npv);
    }
  });
});


