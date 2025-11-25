import { describe, it, expect } from 'vitest';
import { runHotelEngine } from '@engines/operations/hotelEngine';
import { runVillasEngine } from '@engines/operations/villasEngine';
import { runSeniorLivingEngine } from '@engines/operations/seniorLivingEngine';
import { runRestaurantEngine } from '@engines/operations/restaurantEngine';
import { runBeachClubEngine } from '@engines/operations/beachClubEngine';
import { runRetailEngine } from '@engines/operations/retailEngine';
import { runFlexEngine } from '@engines/operations/flexEngine';
import type {
    HotelConfig,
    VillasConfig,
    SeniorLivingConfig,
    RestaurantConfig,
    BeachClubConfig,
    RetailConfig,
    FlexConfig,
} from '@domain/types';

describe('Cross-Operation Consistency', () => {
    describe('Pattern 1: Lodging-like Operations (HOTEL, VILLAS, SENIOR_LIVING)', () => {
        it('should calculate GOP consistently across lodging-like operations', () => {
            // Hotel
            const hotelConfig: HotelConfig = {
                id: 'test-hotel',
                name: 'Test Hotel',
                operationType: 'HOTEL',
                startYear: 2026,
                horizonYears: 1,
                keys: 100,
                avgDailyRate: 200,
                occupancyByMonth: Array(12).fill(0.7),
                foodRevenuePctOfRooms: 0.3,
                beverageRevenuePctOfRooms: 0.15,
                otherRevenuePctOfRooms: 0.1,
                foodCogsPct: 0.35,
                beverageCogsPct: 0.25,
                payrollPct: 0.35,
                utilitiesPct: 0.05,
                marketingPct: 0.03,
                maintenanceOpexPct: 0.04,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.02,
            };
            const hotelResult = runHotelEngine(hotelConfig);

            // Villas
            const villasConfig: VillasConfig = {
                id: 'test-villas',
                name: 'Test Villas',
                operationType: 'VILLAS',
                startYear: 2026,
                horizonYears: 1,
                units: 100,
                avgNightlyRate: 200,
                occupancyByMonth: Array(12).fill(0.7),
                foodRevenuePctOfRental: 0.3,
                beverageRevenuePctOfRental: 0.15,
                otherRevenuePctOfRental: 0.1,
                foodCogsPct: 0.35,
                beverageCogsPct: 0.25,
                payrollPct: 0.35,
                utilitiesPct: 0.05,
                marketingPct: 0.03,
                maintenanceOpexPct: 0.04,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.02,
            };
            const villasResult = runVillasEngine(villasConfig);

            // Senior Living
            const seniorLivingConfig: SeniorLivingConfig = {
                id: 'test-senior-living',
                name: 'Test Senior Living',
                operationType: 'SENIOR_LIVING',
                startYear: 2026,
                horizonYears: 1,
                units: 100,
                avgMonthlyRate: 6000, // $6000/month = $200/day
                occupancyByMonth: Array(12).fill(0.7),
                careRevenuePctOfRental: 0.3,
                foodRevenuePctOfRental: 0.15,
                otherRevenuePctOfRental: 0.1,
                foodCogsPct: 0.35,
                careCogsPct: 0.25,
                payrollPct: 0.35,
                utilitiesPct: 0.05,
                marketingPct: 0.03,
                maintenanceOpexPct: 0.04,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.02,
            };
            const seniorLivingResult = runSeniorLivingEngine(seniorLivingConfig);

            // All three should have GOP <= totalRevenue
            for (const monthly of hotelResult.monthlyPnl) {
                const totalRevenue = monthly.roomRevenue + monthly.foodRevenue + monthly.beverageRevenue + monthly.otherRevenue;
                expect(monthly.grossOperatingProfit).toBeLessThanOrEqual(totalRevenue);
                expect(monthly.grossOperatingProfit).toBeGreaterThan(0);
            }

            for (const monthly of villasResult.monthlyPnl) {
                const totalRevenue = monthly.roomRevenue + monthly.foodRevenue + monthly.beverageRevenue + monthly.otherRevenue;
                expect(monthly.grossOperatingProfit).toBeLessThanOrEqual(totalRevenue);
                expect(monthly.grossOperatingProfit).toBeGreaterThan(0);
            }

            for (const monthly of seniorLivingResult.monthlyPnl) {
                const totalRevenue = monthly.roomRevenue + monthly.foodRevenue + monthly.beverageRevenue + monthly.otherRevenue;
                expect(monthly.grossOperatingProfit).toBeLessThanOrEqual(totalRevenue);
                expect(monthly.grossOperatingProfit).toBeGreaterThan(0);
            }
        });

        it('should have similar revenue patterns for lodging-like operations', () => {
            // Hotel and Villas with identical parameters should have similar revenue
            const hotelConfig: HotelConfig = {
                id: 'test-hotel',
                name: 'Test Hotel',
                operationType: 'HOTEL',
                startYear: 2026,
                horizonYears: 1,
                keys: 100,
                avgDailyRate: 200,
                occupancyByMonth: Array(12).fill(0.7),
                foodRevenuePctOfRooms: 0.3,
                beverageRevenuePctOfRooms: 0.15,
                otherRevenuePctOfRooms: 0.1,
                foodCogsPct: 0.35,
                beverageCogsPct: 0.25,
                payrollPct: 0.35,
                utilitiesPct: 0.05,
                marketingPct: 0.03,
                maintenanceOpexPct: 0.04,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.02,
            };
            const hotelResult = runHotelEngine(hotelConfig);

            const villasConfig: VillasConfig = {
                id: 'test-villas',
                name: 'Test Villas',
                operationType: 'VILLAS',
                startYear: 2026,
                horizonYears: 1,
                units: 100,
                avgNightlyRate: 200,
                occupancyByMonth: Array(12).fill(0.7),
                foodRevenuePctOfRental: 0.3,
                beverageRevenuePctOfRental: 0.15,
                otherRevenuePctOfRental: 0.1,
                foodCogsPct: 0.35,
                beverageCogsPct: 0.25,
                payrollPct: 0.35,
                utilitiesPct: 0.05,
                marketingPct: 0.03,
                maintenanceOpexPct: 0.04,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.02,
            };
            const villasResult = runVillasEngine(villasConfig);

            // Room revenue should be identical (same formula: units × occupancy × rate × 30)
            expect(hotelResult.monthlyPnl[0].roomRevenue).toBeCloseTo(villasResult.monthlyPnl[0].roomRevenue, 2);

            // Total revenue should be identical
            const hotelTotalRev = hotelResult.annualPnl[0].revenueTotal;
            const villasTotalRev = villasResult.annualPnl[0].revenueTotal;
            expect(hotelTotalRev).toBeCloseTo(villasTotalRev, 2);
        });
    });

    describe('Pattern 2: F&B/Volume Operations (RESTAURANT, BEACH_CLUB)', () => {
        it('should calculate GOP consistently across F&B operations', () => {
            // Restaurant
            const restaurantConfig: RestaurantConfig = {
                id: 'test-restaurant',
                name: 'Test Restaurant',
                operationType: 'RESTAURANT',
                startYear: 2026,
                horizonYears: 1,
                covers: 100,
                avgCheck: 50,
                turnoverByMonth: Array(12).fill(2.0),
                foodRevenuePctOfTotal: 0.60,
                beverageRevenuePctOfTotal: 0.30,
                otherRevenuePctOfTotal: 0.10,
                foodCogsPct: 0.35,
                beverageCogsPct: 0.25,
                payrollPct: 0.35,
                utilitiesPct: 0.05,
                marketingPct: 0.03,
                maintenanceOpexPct: 0.04,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.02,
            };
            const restaurantResult = runRestaurantEngine(restaurantConfig);

            // Beach Club
            const beachClubConfig: BeachClubConfig = {
                id: 'test-beach-club',
                name: 'Test Beach Club',
                operationType: 'BEACH_CLUB',
                startYear: 2026,
                horizonYears: 1,
                dailyPasses: 100,
                avgDailyPassPrice: 50,
                memberships: 50,
                avgMembershipFee: 1000,
                utilizationByMonth: Array(12).fill(0.7),
                foodRevenuePctOfTotal: 0.30,
                beverageRevenuePctOfTotal: 0.20,
                otherRevenuePctOfTotal: 0.10,
                foodCogsPct: 0.35,
                beverageCogsPct: 0.25,
                payrollPct: 0.35,
                utilitiesPct: 0.05,
                marketingPct: 0.03,
                maintenanceOpexPct: 0.04,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.02,
            };
            const beachClubResult = runBeachClubEngine(beachClubConfig);

            // Both should have GOP <= totalRevenue
            for (const monthly of restaurantResult.monthlyPnl) {
                const totalRevenue = monthly.roomRevenue + monthly.foodRevenue + monthly.beverageRevenue + monthly.otherRevenue;
                expect(monthly.grossOperatingProfit).toBeLessThanOrEqual(totalRevenue);
            }

            for (const monthly of beachClubResult.monthlyPnl) {
                const totalRevenue = monthly.roomRevenue + monthly.foodRevenue + monthly.beverageRevenue + monthly.otherRevenue;
                expect(monthly.grossOperatingProfit).toBeLessThanOrEqual(totalRevenue);
            }
        });
    });

    describe('Pattern 3: Lease-based Operations (RETAIL, FLEX)', () => {
        it('should calculate GOP consistently across lease-based operations', () => {
            // Retail
            const retailConfig: RetailConfig = {
                id: 'test-retail',
                name: 'Test Retail',
                operationType: 'RETAIL',
                startYear: 2026,
                horizonYears: 1,
                sqm: 1000,
                avgRentPerSqm: 50,
                occupancyByMonth: Array(12).fill(0.80),
                rentalRevenuePctOfTotal: 0.90,
                otherRevenuePctOfTotal: 0.10,
                payrollPct: 0.10,
                utilitiesPct: 0.05,
                marketingPct: 0.02,
                maintenanceOpexPct: 0.03,
                otherOpexPct: 0.02,
                maintenanceCapexPct: 0.01,
            };
            const retailResult = runRetailEngine(retailConfig);

            // Flex
            const flexConfig: FlexConfig = {
                id: 'test-flex',
                name: 'Test Flex',
                operationType: 'FLEX',
                startYear: 2026,
                horizonYears: 1,
                sqm: 1000,
                avgRentPerSqm: 50,
                occupancyByMonth: Array(12).fill(0.80),
                rentalRevenuePctOfTotal: 0.90,
                otherRevenuePctOfTotal: 0.10,
                payrollPct: 0.10,
                utilitiesPct: 0.05,
                marketingPct: 0.02,
                maintenanceOpexPct: 0.03,
                otherOpexPct: 0.02,
                maintenanceCapexPct: 0.01,
            };
            const flexResult = runFlexEngine(flexConfig);

            // For lease-based operations with no COGS, GOP should equal totalRevenue
            for (const monthly of retailResult.monthlyPnl) {
                const totalRevenue = monthly.roomRevenue + monthly.foodRevenue + monthly.beverageRevenue + monthly.otherRevenue;
                // GOP = totalRevenue - (foodCogs + beverageCogs) = totalRevenue - 0 = totalRevenue
                expect(monthly.grossOperatingProfit).toBeCloseTo(totalRevenue, 2);
            }

            for (const monthly of flexResult.monthlyPnl) {
                const totalRevenue = monthly.roomRevenue + monthly.foodRevenue + monthly.beverageRevenue + monthly.otherRevenue;
                expect(monthly.grossOperatingProfit).toBeCloseTo(totalRevenue, 2);
            }

            // With identical parameters, retail and flex should have identical revenue
            expect(retailResult.annualPnl[0].revenueTotal).toBeCloseTo(flexResult.annualPnl[0].revenueTotal, 2);
        });
    });

    describe('Invariant: All values must be finite', () => {
        it('should have finite values across all operation types', () => {
            const operations = [
                {
                    name: 'Hotel',
                    config: {
                        id: 'test-hotel',
                        name: 'Test Hotel',
                        operationType: 'HOTEL' as const,
                        startYear: 2026,
                        horizonYears: 1,
                        keys: 100,
                        avgDailyRate: 200,
                        occupancyByMonth: Array(12).fill(0.7),
                        foodRevenuePctOfRooms: 0.3,
                        beverageRevenuePctOfRooms: 0.15,
                        otherRevenuePctOfRooms: 0.1,
                        foodCogsPct: 0.35,
                        beverageCogsPct: 0.25,
                        payrollPct: 0.35,
                        utilitiesPct: 0.05,
                        marketingPct: 0.03,
                        maintenanceOpexPct: 0.04,
                        otherOpexPct: 0.03,
                        maintenanceCapexPct: 0.02,
                    },
                    engine: runHotelEngine,
                },
                {
                    name: 'Restaurant',
                    config: {
                        id: 'test-restaurant',
                        name: 'Test Restaurant',
                        operationType: 'RESTAURANT' as const,
                        startYear: 2026,
                        horizonYears: 1,
                        covers: 100,
                        avgCheck: 50,
                        turnoverByMonth: Array(12).fill(2.0),
                        foodRevenuePctOfTotal: 0.60,
                        beverageRevenuePctOfTotal: 0.30,
                        otherRevenuePctOfTotal: 0.10,
                        foodCogsPct: 0.35,
                        beverageCogsPct: 0.25,
                        payrollPct: 0.35,
                        utilitiesPct: 0.05,
                        marketingPct: 0.03,
                        maintenanceOpexPct: 0.04,
                        otherOpexPct: 0.03,
                        maintenanceCapexPct: 0.02,
                    },
                    engine: runRestaurantEngine,
                },
                {
                    name: 'Retail',
                    config: {
                        id: 'test-retail',
                        name: 'Test Retail',
                        operationType: 'RETAIL' as const,
                        startYear: 2026,
                        horizonYears: 1,
                        sqm: 1000,
                        avgRentPerSqm: 50,
                        occupancyByMonth: Array(12).fill(0.80),
                        rentalRevenuePctOfTotal: 0.90,
                        otherRevenuePctOfTotal: 0.10,
                        payrollPct: 0.10,
                        utilitiesPct: 0.05,
                        marketingPct: 0.02,
                        maintenanceOpexPct: 0.03,
                        otherOpexPct: 0.02,
                        maintenanceCapexPct: 0.01,
                    },
                    engine: runRetailEngine,
                },
            ];

            for (const op of operations) {
                const result = (op.engine as any)(op.config);

                for (const monthly of result.monthlyPnl) {
                    expect(Number.isFinite(monthly.grossOperatingProfit)).toBe(true);
                    expect(Number.isFinite(monthly.ebitda)).toBe(true);
                    expect(Number.isFinite(monthly.noi)).toBe(true);
                    expect(Number.isFinite(monthly.cashFlow)).toBe(true);
                }
            }
        });
    });
});
