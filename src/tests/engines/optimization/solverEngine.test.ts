/**
 * Solver Engine Tests (v2.3)
 * 
 * Tests for the solver engine, including:
 * - Binary search convergence
 * - Break-even NPV calculation
 * - Error handling
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';
import { solveForTarget } from '@engines/optimization/solverEngine';
import { runFullModel } from '@engines/pipeline/modelPipeline';
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
    avgDailyRate: 200, // $200 per room per night (will be adjusted by solver)
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
 * Builds a minimal base scenario for solver testing.
 */
function buildBaseScenario(): NamedScenario {
  const scenario: ProjectScenario = {
    id: 'test-scenario-solver',
    name: 'Test Scenario for Solver',
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
    tiers: [],
  };

  return {
    id: 'test-named-scenario-solver',
    name: 'Test Named Scenario for Solver',
    modelConfig: {
      scenario,
      projectConfig,
      capitalConfig,
      waterfallConfig,
    },
  };
}

describe('Solver Engine', () => {
  describe('solveForTarget', () => {
    describe('Break-even NPV calculation (ADR)', () => {
      it('should find ADR required for NPV = 0', () => {
        const scenario = buildBaseScenario();

        // Find ADR that achieves NPV = 0 (break-even)
        const optimizedAdr = solveForTarget(scenario, {
          targetKpi: 'npv',
          targetValue: 0,
          inputVariable: 'adr',
          min: 0,
          max: 5000,
          tolerance: 0.01, // 1% tolerance for testing
          maxIterations: 50,
        });

        // Verify result is within reasonable range
        expect(optimizedAdr).toBeGreaterThan(0);
        expect(optimizedAdr).toBeLessThan(5000);

        // Verify that using this ADR actually achieves NPV close to 0
        // Deep clone scenario for verification
        const modifiedScenario = {
          ...scenario,
          modelConfig: {
            ...scenario.modelConfig,
            scenario: {
              ...scenario.modelConfig.scenario,
              operations: scenario.modelConfig.scenario.operations.map(op => {
                if (op.operationType === 'HOTEL') {
                  return { ...op, avgDailyRate: optimizedAdr } as HotelConfig;
                }
                return op;
              }),
            },
          },
        };

        const output = runFullModel(modifiedScenario.modelConfig);
        const actualNpv = output.project.projectKpis.npv;

        // Check that NPV is close to 0 (within tolerance)
        const tolerance = 0.01 * Math.abs(0); // 1% of target (0) = absolute tolerance
        expect(Math.abs(actualNpv)).toBeLessThan(Math.max(tolerance, 1000)); // Allow up to $1000 error for practical purposes
      });

      it('should converge within reasonable iterations', () => {
        const scenario = buildBaseScenario();

        // This should converge quickly (within 20 iterations typically)
        const optimizedAdr = solveForTarget(scenario, {
          targetKpi: 'npv',
          targetValue: 0,
          inputVariable: 'adr',
          min: 0,
          max: 5000,
          tolerance: 0.001, // 0.1% tolerance
          maxIterations: 50,
        });

        expect(optimizedAdr).toBeGreaterThan(0);
        expect(optimizedAdr).toBeLessThan(5000);
      });
    });

    describe('Target IRR calculation', () => {
      it('should find ADR required for target IRR', () => {
        const scenario = buildBaseScenario();

        // Find ADR that achieves 15% IRR
        const optimizedAdr = solveForTarget(scenario, {
          targetKpi: 'irr',
          targetValue: 0.15, // 15% IRR
          inputVariable: 'adr',
          min: 100,
          max: 1000,
          tolerance: 0.01, // 1% tolerance
          maxIterations: 50,
        });

        // Verify result
        expect(optimizedAdr).toBeGreaterThan(100);
        expect(optimizedAdr).toBeLessThan(1000);

        // Verify that using this ADR achieves target IRR
        // Deep clone scenario for verification
        const modifiedScenario = {
          ...scenario,
          modelConfig: {
            ...scenario.modelConfig,
            scenario: {
              ...scenario.modelConfig.scenario,
              operations: scenario.modelConfig.scenario.operations.map(op => {
                if (op.operationType === 'HOTEL') {
                  return { ...op, avgDailyRate: optimizedAdr } as HotelConfig;
                }
                return op;
              }),
            },
          },
        };

        const output = runFullModel(modifiedScenario.modelConfig);
        const actualIrr = output.project.projectKpis.unleveredIrr;

        if (actualIrr !== null) {
          const targetIrrValue: number = 0.15;
          const zero: number = 0;
          const error = Math.abs(actualIrr - targetIrrValue);
          const relativeError = targetIrrValue !== zero ? error / targetIrrValue : error;
          expect(relativeError).toBeLessThan(0.01); // Within 1% tolerance
        }
      });
    });

    describe('Solver Accuracy Verification (v2.3)', () => {
      /**
       * Solver Accuracy Test: Verifies that the solver works correctly.
       * 
       * This test:
       * 1. Defines a simple scenario
       * 2. Runs solver for Target IRR = 15%
       * 3. Takes the result, plugs it back into the model manually
       * 4. Asserts the resulting IRR is indeed ~15%
       * 
       * This provides proof that the solver works correctly.
       */
      it('should verify solver accuracy: Target IRR = 15% (v2.3)', () => {
        // Step 1: Define a simple scenario
        const baseScenario = buildBaseScenario();
        
        // Get baseline IRR to verify scenario is valid
        const baselineOutput = runFullModel(baseScenario.modelConfig);
        const baselineIrr = baselineOutput.project.projectKpis.unleveredIrr;
        
        // Verify baseline scenario has a valid IRR (not null)
        expect(baselineIrr).not.toBeNull();
        console.log(`Baseline IRR: ${baselineIrr ? (baselineIrr * 100).toFixed(2) + '%' : 'null'}`);
        
        // Step 2: Run solver for Target IRR = 15%
        const targetIrr = 0.15; // 15%
        const tolerance = 0.005; // 0.5% tolerance for solver
        
        const optimizedAdr = solveForTarget(baseScenario, {
          targetKpi: 'irr',
          targetValue: targetIrr,
          inputVariable: 'adr',
          min: 100,
          max: 1000,
          tolerance: tolerance,
          maxIterations: 50,
        });

        // Verify optimized ADR is within reasonable bounds
        expect(optimizedAdr).toBeGreaterThan(100);
        expect(optimizedAdr).toBeLessThan(1000);
        console.log(`Optimized ADR for ${(targetIrr * 100).toFixed(0)}% IRR: $${optimizedAdr.toFixed(2)}`);

        // Step 3: Take the result, plug it back into the model manually
        // Create a new scenario with the optimized ADR value
        const verificationScenario: NamedScenario = {
          ...baseScenario,
          modelConfig: {
            ...baseScenario.modelConfig,
            scenario: {
              ...baseScenario.modelConfig.scenario,
              operations: baseScenario.modelConfig.scenario.operations.map(op => {
                if (op.operationType === 'HOTEL') {
                  // Manually set the optimized ADR value
                  return { ...op, avgDailyRate: optimizedAdr } as HotelConfig;
                }
                return op;
              }),
            },
          },
        };

        // Run the full model with the optimized value
        const verificationOutput = runFullModel(verificationScenario.modelConfig);
        const actualIrr = verificationOutput.project.projectKpis.unleveredIrr;

        // Step 4: Assert the resulting IRR is indeed ~15%
        expect(actualIrr).not.toBeNull();
        
        if (actualIrr !== null) {
          const absoluteError = Math.abs(actualIrr - targetIrr);
          const zero: number = 0;
          const relativeError = targetIrr !== zero ? absoluteError / targetIrr : absoluteError;
          
          console.log(`Target IRR: ${(targetIrr * 100).toFixed(2)}%`);
          console.log(`Actual IRR: ${(actualIrr * 100).toFixed(2)}%`);
          console.log(`Absolute Error: ${(absoluteError * 100).toFixed(3)}%`);
          console.log(`Relative Error: ${(relativeError * 100).toFixed(2)}%`);
          
          // Assert: Actual IRR should be within 1% of target (allowing for solver tolerance + model precision)
          // Solver uses 0.5% tolerance, so we allow 1% for verification to account for rounding
          const verificationTolerance = 0.01; // 1%
          expect(relativeError).toBeLessThan(verificationTolerance);
          
          // Also assert absolute error is reasonable (within 0.01 = 1 percentage point)
          expect(absoluteError).toBeLessThan(0.01);
          
          // Final assertion: IRR should be approximately 15% (±1%)
          expect(actualIrr).toBeCloseTo(targetIrr, 2); // 2 decimal places = 0.01 precision
        } else {
          throw new Error('Could not extract IRR from model output - solver accuracy cannot be verified');
        }
      });
    });

    describe('Error handling', () => {
      it('should throw error for invalid search bounds', () => {
        const scenario = buildBaseScenario();

        expect(() => {
          solveForTarget(scenario, {
            targetKpi: 'npv',
            targetValue: 0,
            inputVariable: 'adr',
            min: 1000,
            max: 500, // max < min
            tolerance: 0.001,
            maxIterations: 50,
          });
        }).toThrow('Invalid search bounds');
      });

      it('should throw error if max iterations exceeded', () => {
        const scenario = buildBaseScenario();

        // Use very tight tolerance and few iterations to force failure
        expect(() => {
          solveForTarget(scenario, {
            targetKpi: 'npv',
            targetValue: 0,
            inputVariable: 'adr',
            min: 0,
            max: 5000,
            tolerance: 1e-10, // Extremely tight tolerance
            maxIterations: 5, // Very few iterations
          });
        }).toThrow('Solver did not converge');
      });

      it('should throw error for invalid operation ID', () => {
        const scenario = buildBaseScenario();

        expect(() => {
          solveForTarget(scenario, {
            targetKpi: 'npv',
            targetValue: 0,
            inputVariable: 'adr',
            operationId: 'nonexistent-operation-id',
            min: 0,
            max: 5000,
            tolerance: 0.01,
            maxIterations: 50,
          });
        }).toThrow('Operation not found');
      });
    });

    describe('Default bounds', () => {
      it('should use default bounds when not specified', () => {
        const scenario = buildBaseScenario();

        // Should work with default bounds
        const optimizedAdr = solveForTarget(scenario, {
          targetKpi: 'npv',
          targetValue: 0,
          inputVariable: 'adr',
          // min and max not specified - should use defaults (0, 5000)
          tolerance: 0.01,
          maxIterations: 50,
        });

        expect(optimizedAdr).toBeGreaterThanOrEqual(0);
        expect(optimizedAdr).toBeLessThanOrEqual(5000);
      });
    });

    describe('Different input variables', () => {
      it('should solve for occupancy variable', () => {
        const scenario = buildBaseScenario();

        // Find occupancy that achieves NPV = 0
        const optimizedOccupancy = solveForTarget(scenario, {
          targetKpi: 'npv',
          targetValue: 0,
          inputVariable: 'occupancy',
          min: 0.1,
          max: 0.9,
          tolerance: 0.01,
          maxIterations: 50,
        });

        expect(optimizedOccupancy).toBeGreaterThanOrEqual(0.1);
        expect(optimizedOccupancy).toBeLessThanOrEqual(0.9);
      });

      it('should solve for discount rate variable', () => {
        const scenario = buildBaseScenario();

        // Find discount rate that achieves a specific NPV
        // First, find current NPV
        const baseOutput = runFullModel(scenario.modelConfig);
        const targetNpv = baseOutput.project.projectKpis.npv * 0.5; // Half of current NPV

        const optimizedDiscountRate = solveForTarget(scenario, {
          targetKpi: 'npv',
          targetValue: targetNpv,
          inputVariable: 'discountRate',
          min: 0.05,
          max: 0.20,
          tolerance: 0.01,
          maxIterations: 50,
        });

        expect(optimizedDiscountRate).toBeGreaterThanOrEqual(0.05);
        expect(optimizedDiscountRate).toBeLessThanOrEqual(0.20);
      });
    });

    describe('Result verification logic', () => {
      it('should return a value that produces target KPI within tolerance', () => {
        const scenario = buildBaseScenario();

        const targetNpv = -5_000_000; // Target NPV of -$5M
        const tolerance = 0.01; // 1% tolerance

        const optimizedAdr = solveForTarget(scenario, {
          targetKpi: 'npv',
          targetValue: targetNpv,
          inputVariable: 'adr',
          min: 0,
          max: 5000,
          tolerance,
          maxIterations: 50,
        });

        // Verify by running model with optimized value
        // Deep clone scenario for verification
        const modifiedScenario = {
          ...scenario,
          modelConfig: {
            ...scenario.modelConfig,
            scenario: {
              ...scenario.modelConfig.scenario,
              operations: scenario.modelConfig.scenario.operations.map(op => {
                if (op.operationType === 'HOTEL') {
                  return { ...op, avgDailyRate: optimizedAdr } as HotelConfig;
                }
                return op;
              }),
            },
          },
        };

        const output = runFullModel(modifiedScenario.modelConfig);
        const actualNpv = output.project.projectKpis.npv;

        // Check relative error
        const zero = 0;
        const relativeError = Math.abs(targetNpv) > Math.abs(zero)
          ? Math.abs(actualNpv - targetNpv) / Math.abs(targetNpv)
          : Math.abs(actualNpv);

        expect(relativeError).toBeLessThan(tolerance * 2); // Allow some margin for test tolerance
      });
    });
  });
});

