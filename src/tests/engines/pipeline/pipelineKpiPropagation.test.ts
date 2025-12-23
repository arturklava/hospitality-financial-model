import { describe, it, expect } from 'vitest';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import {
    buildSampleScenario,
    buildSampleProjectConfig,
    buildSampleCapitalConfig,
    buildSampleWaterfallConfig,
} from '../../../sampleData';

/**
 * Pipeline KPI Propagation Tests
 * 
 * Verifies that KPIs and financial data flow correctly through all pipeline stages:
 * Operations → Scenario → Project → Capital → Waterfall
 * 
 * These tests ensure data consistency and correct formula application at stage boundaries.
 */
describe('Pipeline KPI Propagation', () => {
    describe('Scenario → Project Flow', () => {
        it('should correctly propagate consolidated P&L into unlevered FCF calculation', () => {
            const scenario = buildSampleScenario();
            const projectConfig = buildSampleProjectConfig();
            const capitalConfig = buildSampleCapitalConfig();
            const waterfallConfig = buildSampleWaterfallConfig();

            const result = runFullModel({
                scenario,
                projectConfig,
                capitalConfig,
                waterfallConfig,
            });

            // Verify each year's UFCF calculation uses correct consolidated P&L values
            for (let t = 0; t < scenario.horizonYears; t++) {
                const pnl = result.consolidatedAnnualPnl[t];
                const ufcf = result.project.unleveredFcf[t];

                // Verify year indices match
                expect(pnl.yearIndex).toBe(t);
                expect(ufcf.yearIndex).toBe(t);

                // Verify NOI from consolidated P&L flows into UFCF
                expect(ufcf.noi).toBe(pnl.noi);

                // Verify maintenance capex from consolidated P&L flows into UFCF
                expect(ufcf.maintenanceCapex).toBe(pnl.maintenanceCapex);

                // Verify UFCF formula: UFCF = NOI - maintenanceCapex - changeInWC
                const expectedUFCF = ufcf.noi - ufcf.maintenanceCapex - ufcf.changeInWorkingCapital;
                expect(ufcf.unleveredFreeCashFlow).toBeCloseTo(expectedUFCF, 2);

                // Verify all values are finite
                expect(Number.isFinite(ufcf.unleveredFreeCashFlow)).toBe(true);
                expect(Number.isFinite(ufcf.noi)).toBe(true);
                expect(Number.isFinite(ufcf.maintenanceCapex)).toBe(true);
                expect(Number.isFinite(ufcf.changeInWorkingCapital)).toBe(true);
            }
        });

        it('should correctly calculate working capital changes based on revenue', () => {
            const scenario = buildSampleScenario();
            const projectConfig = buildSampleProjectConfig();
            const capitalConfig = buildSampleCapitalConfig();
            const waterfallConfig = buildSampleWaterfallConfig();

            const result = runFullModel({
                scenario,
                projectConfig,
                capitalConfig,
                waterfallConfig,
            });

            const wcPct = projectConfig.workingCapitalPercentage ?? 0;

            for (let t = 0; t < scenario.horizonYears; t++) {
                const pnl = result.consolidatedAnnualPnl[t];
                const ufcf = result.project.unleveredFcf[t];

                // Calculate expected working capital for this year
                const expectedWC = pnl.revenueTotal * wcPct;

                // Calculate expected change in WC
                let expectedChangeInWC: number;
                if (t === 0) {
                    // Year 0: change = current WC - 0
                    expectedChangeInWC = expectedWC;
                } else {
                    // Year t: change = current WC - previous WC
                    const prevPnl = result.consolidatedAnnualPnl[t - 1];
                    const prevWC = prevPnl.revenueTotal * wcPct;
                    expectedChangeInWC = expectedWC - prevWC;
                }

                // Verify change in WC is calculated correctly
                expect(ufcf.changeInWorkingCapital).toBeCloseTo(expectedChangeInWC, 2);
            }
        });
    });

    describe('Project → Capital Flow', () => {
        it('should correctly propagate unlevered FCF into levered FCF calculation', () => {
            const scenario = buildSampleScenario();
            const projectConfig = buildSampleProjectConfig();
            const capitalConfig = buildSampleCapitalConfig();
            const waterfallConfig = buildSampleWaterfallConfig();

            const result = runFullModel({
                scenario,
                projectConfig,
                capitalConfig,
                waterfallConfig,
            });

            // Verify each year's levered FCF calculation uses correct unlevered FCF
            for (let t = 0; t < scenario.horizonYears; t++) {
                const ufcf = result.project.unleveredFcf[t];
                const lfcf = result.capital.leveredFcfByYear[t];
                const debtEntry = result.capital.debtSchedule.entries[t];

                // Verify year indices match
                expect(ufcf.yearIndex).toBe(t);
                expect(lfcf.yearIndex).toBe(t);
                expect(debtEntry.yearIndex).toBe(t);

                // Verify unlevered FCF from project engine flows into capital engine
                expect(lfcf.unleveredFcf).toBeCloseTo(ufcf.unleveredFreeCashFlow, 2);

                // Verify debt service calculation
                const expectedDebtService = debtEntry.interest + debtEntry.principal;
                expect(lfcf.debtService).toBeCloseTo(expectedDebtService, 2);

                // Verify levered FCF formula: LeveredFCF = UnleveredFCF - DebtService
                const expectedLeveredFCF = lfcf.unleveredFcf - lfcf.debtService;
                expect(lfcf.leveredFreeCashFlow).toBeCloseTo(expectedLeveredFCF, 2);

                // Verify all values are finite
                expect(Number.isFinite(lfcf.leveredFreeCashFlow)).toBe(true);
                expect(Number.isFinite(lfcf.unleveredFcf)).toBe(true);
                expect(Number.isFinite(lfcf.debtService)).toBe(true);
            }
        });

        it('should correctly calculate owner levered cash flows including Year 0 equity investment', () => {
            const scenario = buildSampleScenario();
            const projectConfig = buildSampleProjectConfig();
            const capitalConfig = buildSampleCapitalConfig();
            const waterfallConfig = buildSampleWaterfallConfig();

            const result = runFullModel({
                scenario,
                projectConfig,
                capitalConfig,
                waterfallConfig,
            });

            // Verify owner levered cash flows array length
            expect(result.capital.ownerLeveredCashFlows.length).toBe(scenario.horizonYears + 1);

            // Verify Year 0: negative equity investment
            const year0CF = result.capital.ownerLeveredCashFlows[0];
            expect(year0CF).toBeLessThan(0); // Should be negative (equity investment)

            // Calculate expected equity investment
            const totalDebt = capitalConfig.debtTranches.reduce(
                (sum, tranche) => sum + (tranche.amount ?? tranche.initialPrincipal ?? 0),
                0
            );
            const expectedEquityInvestment = projectConfig.initialInvestment - totalDebt;
            expect(year0CF).toBeCloseTo(-expectedEquityInvestment, 2);

            // Verify Years 1..N: levered FCF
            for (let t = 0; t < scenario.horizonYears; t++) {
                const lfcf = result.capital.leveredFcfByYear[t];
                const ownerCF = result.capital.ownerLeveredCashFlows[t + 1]; // Year t+1 in array

                // Owner cash flow should equal levered FCF for operating years
                expect(ownerCF).toBeCloseTo(lfcf.leveredFreeCashFlow, 2);
            }
        });
    });

    describe('Capital → Waterfall Flow', () => {
        it('should correctly propagate owner levered cash flows into partner distributions', () => {
            const scenario = buildSampleScenario();
            const projectConfig = buildSampleProjectConfig();
            const capitalConfig = buildSampleCapitalConfig();
            const waterfallConfig = buildSampleWaterfallConfig();

            const result = runFullModel({
                scenario,
                projectConfig,
                capitalConfig,
                waterfallConfig,
            });

            // Verify owner cash flows from capital match waterfall input exactly
            expect(result.waterfall.ownerCashFlows).toEqual(
                result.capital.ownerLeveredCashFlows
            );

            // Verify waterfall annual rows match owner cash flows
            expect(result.waterfall.annualRows.length).toBe(
                result.capital.ownerLeveredCashFlows.length
            );

            for (let t = 0; t < result.waterfall.annualRows.length; t++) {
                const row = result.waterfall.annualRows[t];
                const ownerCF = result.capital.ownerLeveredCashFlows[t];

                // Verify owner cash flow matches
                expect(row.ownerCashFlow).toBe(ownerCF);

                // Verify waterfall invariant: sum of partner distributions equals owner CF
                const partnerSum = Object.values(row.partnerDistributions).reduce(
                    (sum, cf) => sum + cf,
                    0
                );
                expect(partnerSum).toBeCloseTo(ownerCF, 2);
            }
        });

        it('should correctly calculate partner cumulative cash flows from annual distributions', () => {
            const scenario = buildSampleScenario();
            const projectConfig = buildSampleProjectConfig();
            const capitalConfig = buildSampleCapitalConfig();
            const waterfallConfig = buildSampleWaterfallConfig();

            const result = runFullModel({
                scenario,
                projectConfig,
                capitalConfig,
                waterfallConfig,
            });

            // Verify each partner's cumulative cash flows
            for (const partner of result.waterfall.partners) {
                expect(partner.cashFlows.length).toBe(scenario.horizonYears + 1);
                expect(partner.cumulativeCashFlows.length).toBe(scenario.horizonYears + 1);

                // Verify cumulative calculation
                let runningSum = 0;
                for (let t = 0; t < partner.cashFlows.length; t++) {
                    runningSum += partner.cashFlows[t];
                    expect(partner.cumulativeCashFlows[t]).toBeCloseTo(runningSum, 2);
                }

                // Verify all values are finite
                for (const cf of partner.cashFlows) {
                    expect(Number.isFinite(cf)).toBe(true);
                }
                for (const cumCf of partner.cumulativeCashFlows) {
                    expect(Number.isFinite(cumCf)).toBe(true);
                }
            }
        });
    });

    describe('End-to-End KPI Consistency', () => {
        it('should maintain consistent NPV calculation from cash flows', () => {
            const scenario = buildSampleScenario();
            const projectConfig = buildSampleProjectConfig();
            const capitalConfig = buildSampleCapitalConfig();
            const waterfallConfig = buildSampleWaterfallConfig();

            const result = runFullModel({
                scenario,
                projectConfig,
                capitalConfig,
                waterfallConfig,
            });

            // Verify DCF valuation uses correct cash flows
            const dcf = result.project.dcfValuation;
            expect(dcf.cashFlows.length).toBe(scenario.horizonYears + 1);

            // Verify Year 0 cash flow is negative initial investment
            expect(dcf.cashFlows[0]).toBe(-projectConfig.initialInvestment);

            // Verify Years 1..N-1 cash flows are UFCF
            for (let t = 0; t < scenario.horizonYears - 1; t++) {
                const ufcf = result.project.unleveredFcf[t];
                expect(dcf.cashFlows[t + 1]).toBeCloseTo(ufcf.unleveredFreeCashFlow, 2);
            }

            // Verify Year N cash flow includes terminal value
            const lastUFCF = result.project.unleveredFcf[scenario.horizonYears - 1];
            const expectedLastCF = lastUFCF.unleveredFreeCashFlow + dcf.terminalValue;
            expect(dcf.cashFlows[scenario.horizonYears]).toBeCloseTo(expectedLastCF, 2);

            // Verify NPV is finite
            expect(Number.isFinite(dcf.npv)).toBe(true);
            expect(Number.isFinite(dcf.terminalValue)).toBe(true);
        });

        it('should calculate partner IRR and MOIC from correct cash flow series', () => {
            const scenario = buildSampleScenario();
            const projectConfig = buildSampleProjectConfig();
            const capitalConfig = buildSampleCapitalConfig();
            const waterfallConfig = buildSampleWaterfallConfig();

            const result = runFullModel({
                scenario,
                projectConfig,
                capitalConfig,
                waterfallConfig,
            });

            // Verify each partner's IRR and MOIC are calculated from their cash flows
            for (const partner of result.waterfall.partners) {
                // IRR should be null or finite
                if (partner.irr !== null) {
                    expect(Number.isFinite(partner.irr)).toBe(true);
                }

                // MOIC should be finite and >= 0
                expect(Number.isFinite(partner.moic)).toBe(true);
                expect(partner.moic).toBeGreaterThanOrEqual(0);

                // Verify MOIC calculation: total distributions / total contributions
                const totalContributions = partner.cashFlows
                    .filter(cf => cf < 0)
                    .reduce((sum, cf) => sum + Math.abs(cf), 0);
                const totalDistributions = partner.cashFlows
                    .filter(cf => cf > 0)
                    .reduce((sum, cf) => sum + cf, 0);

                if (totalContributions > 0) {
                    const expectedMOIC = totalDistributions / totalContributions;
                    expect(partner.moic).toBeCloseTo(expectedMOIC, 2);
                } else {
                    // If no contributions, MOIC should be 0
                    expect(partner.moic).toBe(0);
                }
            }
        });

        it('should maintain data consistency across all stages for multi-year scenario', () => {
            const scenario = buildSampleScenario();
            const projectConfig = buildSampleProjectConfig();
            const capitalConfig = buildSampleCapitalConfig();
            const waterfallConfig = buildSampleWaterfallConfig();

            const result = runFullModel({
                scenario,
                projectConfig,
                capitalConfig,
                waterfallConfig,
            });

            // Verify array lengths are consistent
            expect(result.consolidatedAnnualPnl.length).toBe(scenario.horizonYears);
            expect(result.project.unleveredFcf.length).toBe(scenario.horizonYears);
            expect(result.capital.leveredFcfByYear.length).toBe(scenario.horizonYears);
            expect(result.capital.debtSchedule.entries.length).toBe(scenario.horizonYears);
            expect(result.capital.ownerLeveredCashFlows.length).toBe(scenario.horizonYears + 1);
            expect(result.waterfall.annualRows.length).toBe(scenario.horizonYears + 1);

            // Verify year indices are sequential and correct
            for (let t = 0; t < scenario.horizonYears; t++) {
                expect(result.consolidatedAnnualPnl[t].yearIndex).toBe(t);
                expect(result.project.unleveredFcf[t].yearIndex).toBe(t);
                expect(result.capital.leveredFcfByYear[t].yearIndex).toBe(t);
                expect(result.capital.debtSchedule.entries[t].yearIndex).toBe(t);
            }

            // Verify all financial values are finite (no NaN or Infinity)
            for (const pnl of result.consolidatedAnnualPnl) {
                expect(Number.isFinite(pnl.revenueTotal)).toBe(true);
                expect(Number.isFinite(pnl.noi)).toBe(true);
            }

            for (const ufcf of result.project.unleveredFcf) {
                expect(Number.isFinite(ufcf.unleveredFreeCashFlow)).toBe(true);
            }

            for (const lfcf of result.capital.leveredFcfByYear) {
                expect(Number.isFinite(lfcf.leveredFreeCashFlow)).toBe(true);
            }

            for (const cf of result.capital.ownerLeveredCashFlows) {
                expect(Number.isFinite(cf)).toBe(true);
            }
        });
    });
});
