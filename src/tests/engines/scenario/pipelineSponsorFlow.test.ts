import { describe, it, expect } from 'vitest';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
    ProjectScenario,
    ProjectConfig,
    CapitalStructureConfig,
    WaterfallConfig,
    HotelConfig,
} from '@domain/types';

/**
 * Pipeline Sponsor Flow Tests
 * 
 * Verifies sponsor P&L vs asset P&L separation (v1.2: Advanced Asset Dynamics).
 * 
 * Tests different ownership models:
 * - BUILD_AND_OPERATE: Sponsor receives ownershipPct of asset P&L
 * - BUILD_AND_LEASE_FIXED: Sponsor receives fixed rent
 * - BUILD_AND_LEASE_VARIABLE: Sponsor receives base + variable rent
 * - Inactive operations: Sponsor flow = 0
 */
describe('Pipeline Sponsor Flow', () => {
    /**
     * Helper to build a minimal hotel config for testing
     */
    function buildTestHotelConfig(overrides?: Partial<HotelConfig>): HotelConfig {
        return {
            id: 'test-hotel',
            name: 'Test Hotel',
            operationType: 'HOTEL',
            startYear: 2026,
            horizonYears: 3,
            keys: 100,
            avgDailyRate: 200,
            occupancyByMonth: Array(12).fill(0.75),
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
            maintenanceCapexPct: 0.02,
            ...overrides,
        };
    }

    /**
     * Helper to build base model input
     */
    function buildBaseModelInput(hotelConfig: HotelConfig): {
        scenario: ProjectScenario;
        projectConfig: ProjectConfig;
        capitalConfig: CapitalStructureConfig;
        waterfallConfig: WaterfallConfig;
    } {
        const scenario: ProjectScenario = {
            id: 'test-scenario',
            name: 'Test Scenario',
            startYear: 2026,
            horizonYears: 3,
            operations: [hotelConfig],
        };

        const projectConfig: ProjectConfig = {
            discountRate: 0.10,
            terminalGrowthRate: 0.02,
            initialInvestment: 10000000,
            workingCapitalPercentage: 0.05,
        };

        const capitalConfig: CapitalStructureConfig = {
            initialInvestment: 10000000,
            debtTranches: [],
        };

        const waterfallConfig: WaterfallConfig = {
            equityClasses: [
                {
                    id: 'owner',
                    name: 'Owner',
                    contributionPct: 1.0,
                },
            ],
        };

        return { scenario, projectConfig, capitalConfig, waterfallConfig };
    }

    describe('BUILD_AND_OPERATE Ownership Model', () => {
        it('should use sponsor P&L (100% ownership) in consolidated P&L', () => {
            const hotelConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_OPERATE',
                ownershipPct: 1.0,
            });

            const input = buildBaseModelInput(hotelConfig);
            const result = runFullModel(input);

            // With 100% ownership, sponsor P&L should equal asset P&L
            // Verify consolidated P&L uses sponsor flow
            for (let t = 0; t < input.scenario.horizonYears; t++) {
                const consolidatedPnl = result.consolidatedAnnualPnl[t];

                // Verify all values are finite
                expect(Number.isFinite(consolidatedPnl.revenueTotal)).toBe(true);
                expect(Number.isFinite(consolidatedPnl.noi)).toBe(true);

                // With 100% ownership, consolidated should match asset performance
                expect(consolidatedPnl.revenueTotal).toBeGreaterThan(0);
                expect(consolidatedPnl.noi).toBeDefined();
            }
        });

        it('should apply ownershipPct to asset P&L for partial ownership', () => {
            const ownershipPct = 0.60; // 60% ownership
            const hotelConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_OPERATE',
                ownershipPct,
            });

            const input = buildBaseModelInput(hotelConfig);
            const result = runFullModel(input);

            // Run a 100% ownership scenario for comparison
            const fullOwnershipConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_OPERATE',
                ownershipPct: 1.0,
            });
            const fullOwnershipInput = buildBaseModelInput(fullOwnershipConfig);
            const fullOwnershipResult = runFullModel(fullOwnershipInput);

            // Verify sponsor receives ownershipPct of asset P&L
            for (let t = 0; t < input.scenario.horizonYears; t++) {
                const sponsorPnl = result.consolidatedAnnualPnl[t];
                const assetPnl = fullOwnershipResult.consolidatedAnnualPnl[t];

                // Sponsor revenue should be ownershipPct * asset revenue
                expect(sponsorPnl.revenueTotal).toBeCloseTo(assetPnl.revenueTotal * ownershipPct, 2);

                // Sponsor NOI should be ownershipPct * asset NOI
                expect(sponsorPnl.noi).toBeCloseTo(assetPnl.noi * ownershipPct, 2);

                // Sponsor COGS should be ownershipPct * asset COGS
                expect(sponsorPnl.cogsTotal).toBeCloseTo(assetPnl.cogsTotal * ownershipPct, 2);

                // Sponsor OPEX should be ownershipPct * asset OPEX
                expect(sponsorPnl.opexTotal).toBeCloseTo(assetPnl.opexTotal * ownershipPct, 2);
            }
        });
    });

    describe('BUILD_AND_LEASE_FIXED Ownership Model', () => {
        it('should use fixed rent as sponsor revenue, with no COGS/OPEX', () => {
            const baseRent = 500000; // $500k annual rent
            const hotelConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_LEASE_FIXED',
                leaseTerms: {
                    baseRent,
                },
            });

            const input = buildBaseModelInput(hotelConfig);
            const result = runFullModel(input);

            // Verify sponsor P&L uses fixed rent
            for (let t = 0; t < input.scenario.horizonYears; t++) {
                const sponsorPnl = result.consolidatedAnnualPnl[t];

                // Sponsor revenue should equal base rent
                expect(sponsorPnl.revenueTotal).toBeCloseTo(baseRent, 2);

                // Sponsor should have no COGS (lease model)
                expect(sponsorPnl.cogsTotal).toBe(0);

                // Sponsor NOI should equal base rent (no COGS, no OPEX in v1.2)
                expect(sponsorPnl.noi).toBeCloseTo(baseRent, 2);
            }
        });

        it('should not be affected by asset performance fluctuations', () => {
            const baseRent = 500000;

            // Create two scenarios with different occupancy (asset performance)
            const lowOccupancyConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_LEASE_FIXED',
                leaseTerms: { baseRent },
                occupancyByMonth: Array(12).fill(0.50), // Low occupancy
            });

            const highOccupancyConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_LEASE_FIXED',
                leaseTerms: { baseRent },
                occupancyByMonth: Array(12).fill(0.90), // High occupancy
            });

            const lowOccupancyInput = buildBaseModelInput(lowOccupancyConfig);
            const highOccupancyInput = buildBaseModelInput(highOccupancyConfig);

            const lowOccupancyResult = runFullModel(lowOccupancyInput);
            const highOccupancyResult = runFullModel(highOccupancyInput);

            // Sponsor revenue should be identical regardless of asset performance
            for (let t = 0; t < lowOccupancyInput.scenario.horizonYears; t++) {
                const lowSponsorPnl = lowOccupancyResult.consolidatedAnnualPnl[t];
                const highSponsorPnl = highOccupancyResult.consolidatedAnnualPnl[t];

                // Fixed rent: sponsor revenue should be the same
                expect(lowSponsorPnl.revenueTotal).toBeCloseTo(highSponsorPnl.revenueTotal, 2);
                expect(lowSponsorPnl.noi).toBeCloseTo(highSponsorPnl.noi, 2);
            }
        });
    });

    describe('BUILD_AND_LEASE_VARIABLE Ownership Model', () => {
        it('should use base rent + variable rent based on asset revenue', () => {
            const baseRent = 300000; // $300k annual base rent
            const variableRentPct = 0.10; // 10% of revenue

            const hotelConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_LEASE_VARIABLE',
                leaseTerms: {
                    baseRent,
                    variableRentPct,
                    variableRentBasis: 'revenue',
                },
            });

            const input = buildBaseModelInput(hotelConfig);
            const result = runFullModel(input);

            // Run a 100% ownership scenario to get asset revenue
            const assetConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_OPERATE',
                ownershipPct: 1.0,
            });
            const assetInput = buildBaseModelInput(assetConfig);
            const assetResult = runFullModel(assetInput);

            // Verify sponsor receives base + variable rent
            for (let t = 0; t < input.scenario.horizonYears; t++) {
                const sponsorPnl = result.consolidatedAnnualPnl[t];
                const assetPnl = assetResult.consolidatedAnnualPnl[t];

                // Calculate expected sponsor revenue
                const variableRent = assetPnl.revenueTotal * variableRentPct;
                const expectedSponsorRevenue = baseRent + variableRent;

                // Sponsor revenue should equal base + variable rent
                expect(sponsorPnl.revenueTotal).toBeCloseTo(expectedSponsorRevenue, 2);

                // Sponsor should have no COGS (lease model)
                expect(sponsorPnl.cogsTotal).toBe(0);

                // Sponsor NOI should equal total rent
                expect(sponsorPnl.noi).toBeCloseTo(expectedSponsorRevenue, 2);
            }
        });

        it('should use base rent + variable rent based on asset NOI when basis is NOI', () => {
            const baseRent = 300000;
            const variableRentPct = 0.15; // 15% of NOI

            const hotelConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_LEASE_VARIABLE',
                leaseTerms: {
                    baseRent,
                    variableRentPct,
                    variableRentBasis: 'noi',
                },
            });

            const input = buildBaseModelInput(hotelConfig);
            const result = runFullModel(input);

            // Run a 100% ownership scenario to get asset NOI
            const assetConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_OPERATE',
                ownershipPct: 1.0,
            });
            const assetInput = buildBaseModelInput(assetConfig);
            const assetResult = runFullModel(assetInput);

            // Verify sponsor receives base + variable rent based on NOI
            for (let t = 0; t < input.scenario.horizonYears; t++) {
                const sponsorPnl = result.consolidatedAnnualPnl[t];
                const assetPnl = assetResult.consolidatedAnnualPnl[t];

                // Calculate expected sponsor revenue
                const variableRent = assetPnl.noi * variableRentPct;
                const expectedSponsorRevenue = baseRent + variableRent;

                // Sponsor revenue should equal base + variable rent (based on NOI)
                expect(sponsorPnl.revenueTotal).toBeCloseTo(expectedSponsorRevenue, 2);
            }
        });
    });

    describe('Inactive Operations', () => {
        it('should exclude inactive operations from consolidated P&L', () => {
            const hotelConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_OPERATE',
                ownershipPct: 1.0,
                isActive: false, // Inactive operation
            });

            const input = buildBaseModelInput(hotelConfig);
            const result = runFullModel(input);

            // Verify inactive operation contributes zero to consolidated P&L
            for (let t = 0; t < input.scenario.horizonYears; t++) {
                const consolidatedPnl = result.consolidatedAnnualPnl[t];

                // All values should be zero for inactive operation
                expect(consolidatedPnl.revenueTotal).toBe(0);
                expect(consolidatedPnl.cogsTotal).toBe(0);
                expect(consolidatedPnl.opexTotal).toBe(0);
                expect(consolidatedPnl.noi).toBe(0);
                expect(consolidatedPnl.maintenanceCapex).toBe(0);
            }
        });

        it('should only include active operations in multi-operation scenario', () => {
            const activeHotel = buildTestHotelConfig({
                id: 'active-hotel',
                name: 'Active Hotel',
                ownershipModel: 'BUILD_AND_OPERATE',
                ownershipPct: 1.0,
                isActive: true,
            });

            const inactiveHotel = buildTestHotelConfig({
                id: 'inactive-hotel',
                name: 'Inactive Hotel',
                ownershipModel: 'BUILD_AND_OPERATE',
                ownershipPct: 1.0,
                isActive: false,
            });

            const scenario: ProjectScenario = {
                id: 'multi-op-scenario',
                name: 'Multi-Operation Scenario',
                startYear: 2026,
                horizonYears: 3,
                operations: [activeHotel, inactiveHotel],
            };

            const projectConfig: ProjectConfig = {
                discountRate: 0.10,
                terminalGrowthRate: 0.02,
                initialInvestment: 20000000,
                workingCapitalPercentage: 0.05,
            };

            const capitalConfig: CapitalStructureConfig = {
                initialInvestment: 20000000,
                debtTranches: [],
            };

            const waterfallConfig: WaterfallConfig = {
                equityClasses: [{ id: 'owner', name: 'Owner', contributionPct: 1.0 }],
            };

            const result = runFullModel({
                scenario,
                projectConfig,
                capitalConfig,
                waterfallConfig,
            });

            // Run single active operation for comparison
            const singleActiveInput = buildBaseModelInput(activeHotel);
            const singleActiveResult = runFullModel(singleActiveInput);

            // Verify consolidated P&L equals only the active operation
            for (let t = 0; t < scenario.horizonYears; t++) {
                const multiOpPnl = result.consolidatedAnnualPnl[t];
                const singleActivePnl = singleActiveResult.consolidatedAnnualPnl[t];

                // Consolidated should match single active operation (inactive contributes 0)
                expect(multiOpPnl.revenueTotal).toBeCloseTo(singleActivePnl.revenueTotal, 2);
                expect(multiOpPnl.noi).toBeCloseTo(singleActivePnl.noi, 2);
            }
        });
    });

    describe('CO_INVEST_OPCO Ownership Model', () => {
        it('should behave identically to BUILD_AND_OPERATE', () => {
            const ownershipPct = 0.70;

            const buildAndOperateConfig = buildTestHotelConfig({
                ownershipModel: 'BUILD_AND_OPERATE',
                ownershipPct,
            });

            const coInvestConfig = buildTestHotelConfig({
                ownershipModel: 'CO_INVEST_OPCO',
                ownershipPct,
            });

            const buildAndOperateInput = buildBaseModelInput(buildAndOperateConfig);
            const coInvestInput = buildBaseModelInput(coInvestConfig);

            const buildAndOperateResult = runFullModel(buildAndOperateInput);
            const coInvestResult = runFullModel(coInvestInput);

            // Verify both models produce identical sponsor P&L
            for (let t = 0; t < buildAndOperateInput.scenario.horizonYears; t++) {
                const buildAndOperatePnl = buildAndOperateResult.consolidatedAnnualPnl[t];
                const coInvestPnl = coInvestResult.consolidatedAnnualPnl[t];

                expect(coInvestPnl.revenueTotal).toBeCloseTo(buildAndOperatePnl.revenueTotal, 2);
                expect(coInvestPnl.noi).toBeCloseTo(buildAndOperatePnl.noi, 2);
                expect(coInvestPnl.cogsTotal).toBeCloseTo(buildAndOperatePnl.cogsTotal, 2);
                expect(coInvestPnl.opexTotal).toBeCloseTo(buildAndOperatePnl.opexTotal, 2);
            }
        });
    });
});
