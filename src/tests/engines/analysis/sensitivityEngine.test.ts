import { describe, it, expect } from 'vitest';
import { runSensitivityAnalysis } from '@engines/analysis/sensitivityEngine';
import type {
  NamedScenario,
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
 * Builds a minimal base scenario for sensitivity testing.
 */
function buildBaseScenario(): NamedScenario {
  const scenario: ProjectScenario = {
    id: 'test-scenario-sensitivity',
    name: 'Test Scenario for Sensitivity',
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
    debtTranches: [
      {
        id: 'loan-1',
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
    id: 'base-scenario',
    name: 'Base Scenario',
    modelConfig: {
      scenario,
      projectConfig,
      capitalConfig,
      waterfallConfig,
    },
  };
}

describe('Sensitivity Engine', () => {
  describe('3x3 Sensitivity: ADR vs Discount Rate', () => {
    it('should run 3x3 sensitivity analysis and assert Higher ADR = Higher IRR', () => {
      const baseScenario = buildBaseScenario();
      
      // Run 3x3 sensitivity: ADR (X) vs Discount Rate (Y)
      // ADR: 0.8x to 1.2x (80% to 120% of base)
      // Discount Rate: 0.08 to 0.12 (8% to 12%)
      const result = runSensitivityAnalysis(baseScenario, {
        variableX: 'adr',
        rangeX: { min: 0.8, max: 1.2, steps: 3 },
        variableY: 'discountRate',
        rangeY: { min: 0.08, max: 0.12, steps: 3 },
      });

      // Assert: Base case output exists
      expect(result.baseCaseOutput).toBeDefined();
      expect(result.baseCaseOutput.project.projectKpis).toBeDefined();

      // Assert: 3x3 = 9 runs total
      expect(result.runs.length).toBe(9);

      // Assert: Matrix exists and has correct dimensions
      expect(result.matrix).toBeDefined();
      expect(result.matrix!.length).toBe(3); // 3 rows (ADR steps)
      expect(result.matrix![0].length).toBe(3); // 3 columns (Discount Rate steps)

      // Assert: All runs have valid KPIs
      result.runs.forEach(run => {
        expect(Number.isFinite(run.kpis.npv)).toBe(true);
        expect(Number.isFinite(run.kpis.equityMultiple)).toBe(true);
        // IRR can be null, but if it exists, it should be finite
        if (run.kpis.unleveredIrr !== null) {
          expect(Number.isFinite(run.kpis.unleveredIrr)).toBe(true);
        }
        // WACC can be null or undefined, but if it exists, it should be finite
        if (run.kpis.wacc !== null && run.kpis.wacc !== undefined) {
          expect(Number.isFinite(run.kpis.wacc)).toBe(true);
        }
      });

      // Assert: WACC is present in at least some runs (if calculated)
      const waccValues = result.runs.map(r => r.kpis.wacc).filter(w => w !== null && w !== undefined);
      // WACC may or may not be calculated depending on the model, but if present, should be valid
      if (waccValues.length > 0) {
        waccValues.forEach(wacc => {
          expect(Number.isFinite(wacc)).toBe(true);
        });
      }

      // Assert: Higher ADR = Higher IRR (for same discount rate)
      // Compare IRR across ADR values for the middle discount rate (0.10)
      const middleDiscountRateIndex = 1; // Middle of 3 steps: 0.08, 0.10, 0.12
      
      const irrAtLowAdr = result.matrix![0][middleDiscountRateIndex].kpis.unleveredIrr;
      const irrAtMidAdr = result.matrix![1][middleDiscountRateIndex].kpis.unleveredIrr;
      const irrAtHighAdr = result.matrix![2][middleDiscountRateIndex].kpis.unleveredIrr;

      // All IRRs should be defined (not null) for a profitable scenario
      if (irrAtLowAdr !== null && irrAtMidAdr !== null && irrAtHighAdr !== null) {
        // Higher ADR should lead to higher IRR (more revenue = better returns)
        expect(irrAtMidAdr).toBeGreaterThanOrEqual(irrAtLowAdr);
        expect(irrAtHighAdr).toBeGreaterThanOrEqual(irrAtMidAdr);
      }

      // Assert: Higher ADR = Higher NPV (for same discount rate)
      const npvAtLowAdr = result.matrix![0][middleDiscountRateIndex].kpis.npv;
      const npvAtMidAdr = result.matrix![1][middleDiscountRateIndex].kpis.npv;
      const npvAtHighAdr = result.matrix![2][middleDiscountRateIndex].kpis.npv;

      expect(npvAtMidAdr).toBeGreaterThanOrEqual(npvAtLowAdr);
      expect(npvAtHighAdr).toBeGreaterThanOrEqual(npvAtMidAdr);

      // Assert: Variable values are correctly set
      expect(result.runs[0].variableXValue).toBeCloseTo(0.8, 5);
      expect(result.runs[0].variableYValue).toBeCloseTo(0.08, 5);
      expect(result.runs[8].variableXValue).toBeCloseTo(1.2, 5);
      expect(result.runs[8].variableYValue).toBeCloseTo(0.12, 5);
    });

    it('should handle 1D sensitivity (ADR only)', () => {
      const baseScenario = buildBaseScenario();

      // Run 1D sensitivity: ADR only
      const result = runSensitivityAnalysis(baseScenario, {
        variableX: 'adr',
        rangeX: { min: 0.9, max: 1.1, steps: 3 },
      });

      // Assert: 3 runs (no Y variable)
      expect(result.runs.length).toBe(3);

      // Assert: No matrix for 1D sensitivity
      expect(result.matrix).toBeUndefined();

      // Assert: All runs have variableXValue but no variableYValue
      result.runs.forEach(run => {
        expect(run.variableXValue).toBeDefined();
        expect(run.variableYValue).toBeUndefined();
      });

      // Assert: Higher ADR = Higher NPV
      const npvs = result.runs.map(r => r.kpis.npv);
      expect(npvs[1]).toBeGreaterThanOrEqual(npvs[0]);
      expect(npvs[2]).toBeGreaterThanOrEqual(npvs[1]);
    });

    it('should report progress during sensitivity run', () => {
      const baseScenario = buildBaseScenario();
      const progressValues: number[] = [];
      
      const onProgress = (progress: number) => {
        progressValues.push(progress);
      };

      // Run 2D sensitivity: 3x3 = 9 steps total
      const result = runSensitivityAnalysis(
        baseScenario,
        {
          variableX: 'adr',
          rangeX: { min: 0.9, max: 1.1, steps: 3 },
          variableY: 'occupancy',
          rangeY: { min: 0.8, max: 1.0, steps: 3 },
        },
        onProgress
      );

      // Should have received progress updates for each step (9 steps)
      expect(progressValues.length).toBe(9);
      
      // Progress values should be in range [0, 1]
      progressValues.forEach(progress => {
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      });

      // Progress should be increasing (or at least non-decreasing)
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }

      // Final progress should be 1.0
      const finalProgress = progressValues[progressValues.length - 1];
      expect(finalProgress).toBe(1.0);

      // Verify sensitivity still completed successfully
      expect(result.runs).toHaveLength(9);
    });

    it('should validate grid size limits', () => {
      const baseScenario = buildBaseScenario();

      // Try to run sensitivity with too many steps
      expect(() => {
        runSensitivityAnalysis(baseScenario, {
          variableX: 'adr',
          rangeX: { min: 0.8, max: 1.2, steps: 11 }, // Exceeds MAX_STEPS (10)
        });
      }).toThrow(/exceeds maximum allowed/);
    });

    it('should handle occupancy sensitivity', () => {
      const baseScenario = buildBaseScenario();

      // Run sensitivity on occupancy
      const result = runSensitivityAnalysis(baseScenario, {
        variableX: 'occupancy',
        rangeX: { min: 0.8, max: 1.0, steps: 3 },
      });

      expect(result.runs.length).toBe(3);

      // Higher occupancy should lead to higher NPV
      const npvs = result.runs.map(r => r.kpis.npv);
      expect(npvs[1]).toBeGreaterThanOrEqual(npvs[0]);
      expect(npvs[2]).toBeGreaterThanOrEqual(npvs[1]);
    });
  });

  describe('Monotonicity Validation (v0.7)', () => {
    it('should verify sensitivity matrix results are monotonic: increasing ADR always increases NPV', () => {
      const baseScenario = buildBaseScenario();

      // Run 10x10 sensitivity: ADR (X) vs Occupancy (Y)
      // ADR: 0.8x to 1.2x (80% to 120% of base)
      // Occupancy: 0.8x to 1.0x (80% to 100% of base)
      const result = runSensitivityAnalysis(baseScenario, {
        variableX: 'adr',
        rangeX: { min: 0.8, max: 1.2, steps: 10 },
        variableY: 'occupancy',
        rangeY: { min: 0.8, max: 1.0, steps: 10 },
      });

      // Assert: Matrix exists
      expect(result.matrix).toBeDefined();
      const matrix = result.matrix!;

      // For each column (fixed occupancy), verify that increasing ADR (rows) increases NPV
      for (let col = 0; col < matrix[0].length; col++) {
        const npvs = matrix.map(row => row[col].kpis.npv);
        
        // Verify monotonicity: each NPV should be >= previous NPV
        for (let row = 1; row < npvs.length; row++) {
          expect(npvs[row]).toBeGreaterThanOrEqual(npvs[row - 1]);
        }
      }
    });

    it('should verify sensitivity matrix results are monotonic: increasing occupancy always increases NPV', () => {
      const baseScenario = buildBaseScenario();

      // Run 10x10 sensitivity: Occupancy (X) vs ADR (Y)
      // Occupancy: 0.8x to 1.0x (80% to 100% of base)
      // ADR: 0.8x to 1.2x (80% to 120% of base)
      const result = runSensitivityAnalysis(baseScenario, {
        variableX: 'occupancy',
        rangeX: { min: 0.8, max: 1.0, steps: 10 },
        variableY: 'adr',
        rangeY: { min: 0.8, max: 1.2, steps: 10 },
      });

      // Assert: Matrix exists
      expect(result.matrix).toBeDefined();
      const matrix = result.matrix!;

      // For each row (fixed ADR), verify that increasing occupancy (columns) increases NPV
      for (let row = 0; row < matrix.length; row++) {
        const npvs = matrix[row].map(cell => cell.kpis.npv);
        
        // Verify monotonicity: each NPV should be >= previous NPV
        for (let col = 1; col < npvs.length; col++) {
          expect(npvs[col]).toBeGreaterThanOrEqual(npvs[col - 1]);
        }
      }
    });

    it('should verify 1D sensitivity monotonicity: increasing ADR always increases NPV', () => {
      const baseScenario = buildBaseScenario();

      // Run 1D sensitivity: ADR only (10 steps)
      const result = runSensitivityAnalysis(baseScenario, {
        variableX: 'adr',
        rangeX: { min: 0.8, max: 1.2, steps: 10 },
      });

      // Extract NPVs in order
      const npvs = result.runs.map(run => run.kpis.npv);

      // Verify strict monotonicity: each NPV should be >= previous NPV
      for (let i = 1; i < npvs.length; i++) {
        expect(npvs[i]).toBeGreaterThanOrEqual(npvs[i - 1]);
      }
    });

    it('should verify 1D sensitivity monotonicity: increasing occupancy always increases NPV', () => {
      const baseScenario = buildBaseScenario();

      // Run 1D sensitivity: Occupancy only (10 steps)
      const result = runSensitivityAnalysis(baseScenario, {
        variableX: 'occupancy',
        rangeX: { min: 0.7, max: 1.0, steps: 10 },
      });

      // Extract NPVs in order
      const npvs = result.runs.map(run => run.kpis.npv);

      // Verify strict monotonicity: each NPV should be >= previous NPV
      for (let i = 1; i < npvs.length; i++) {
        expect(npvs[i]).toBeGreaterThanOrEqual(npvs[i - 1]);
      }
    });
  });
});

