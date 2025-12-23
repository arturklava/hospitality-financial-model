import { useState, useCallback, useEffect } from 'react';
import { useFullModel } from './useFullModel';
import { useAuth } from '../../contexts/AuthContext';
import { downloadScenario } from '../utils/fileIO';
import { generateExcel } from '../utils/excelExport';
import { addVersion, loadVersions, getVersion } from '../utils/versionStorage';
import * as cloudStorage from '../../engines/io/cloudStorage';
import type { FullModelInput, FullModelOutput, SavedScenario, NamedScenario, OperationConfig } from '@domain/types';
import type { ScenarioWithMetadata } from '../../engines/io/cloudStorage';


/**
 * Creates a default operation configuration based on operation type.
 * Generates unique IDs using crypto.randomUUID().
 */
function createDefaultOperation(operationType: string): OperationConfig {
    const id = crypto.randomUUID();
    const baseYear = new Date().getFullYear() + 1;

    switch (operationType) {
        case 'HOTEL':
            return {
                id,
                name: 'New Hotel',
                operationType: 'HOTEL',
                startYear: baseYear,
                horizonYears: 5,
                keys: 100,
                avgDailyRate: 200,
                occupancyByMonth: Array(12).fill(0.70),
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
            };
        case 'VILLAS':
            return {
                id,
                name: 'New Villas',
                operationType: 'VILLAS',
                startYear: baseYear,
                horizonYears: 5,
                units: 20,
                avgNightlyRate: 500,
                occupancyByMonth: Array(12).fill(0.65),
                foodRevenuePctOfRental: 0.20,
                beverageRevenuePctOfRental: 0.10,
                otherRevenuePctOfRental: 0.05,
                foodCogsPct: 0.35,
                beverageCogsPct: 0.25,
                payrollPct: 0.30,
                utilitiesPct: 0.06,
                marketingPct: 0.04,
                maintenanceOpexPct: 0.05,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.03,
            };
        case 'RESTAURANT':
            return {
                id,
                name: 'New Restaurant',
                operationType: 'RESTAURANT',
                startYear: baseYear,
                horizonYears: 5,
                covers: 80,
                avgCheck: 50,
                turnoverByMonth: Array(12).fill(1.5),
                foodRevenuePctOfTotal: 0.70,
                beverageRevenuePctOfTotal: 0.25,
                otherRevenuePctOfTotal: 0.05,
                foodCogsPct: 0.35,
                beverageCogsPct: 0.25,
                payrollPct: 0.30,
                utilitiesPct: 0.04,
                marketingPct: 0.03,
                maintenanceOpexPct: 0.02,
                otherOpexPct: 0.02,
                maintenanceCapexPct: 0.02,
            };
        case 'BEACH_CLUB':
            return {
                id,
                name: 'New Beach Club',
                operationType: 'BEACH_CLUB',
                startYear: baseYear,
                horizonYears: 5,
                dailyPasses: 200,
                avgDailyPassPrice: 50,
                memberships: 500,
                avgMembershipFee: 2000,
                utilizationByMonth: Array(12).fill(0.60),
                foodRevenuePctOfTotal: 0.25,
                beverageRevenuePctOfTotal: 0.20,
                otherRevenuePctOfTotal: 0.05,
                foodCogsPct: 0.35,
                beverageCogsPct: 0.25,
                payrollPct: 0.30,
                utilitiesPct: 0.05,
                marketingPct: 0.04,
                maintenanceOpexPct: 0.04,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.03,
            };
        case 'RACQUET':
            return {
                id,
                name: 'New Racquet Club',
                operationType: 'RACQUET',
                startYear: baseYear,
                horizonYears: 5,
                courts: 8,
                avgCourtRate: 40,
                utilizationByMonth: Array(12).fill(0.50),
                hoursPerDay: 12,
                memberships: 300,
                avgMembershipFee: 1500,
                foodRevenuePctOfTotal: 0.20,
                beverageRevenuePctOfTotal: 0.15,
                otherRevenuePctOfTotal: 0.05,
                foodCogsPct: 0.35,
                beverageCogsPct: 0.25,
                payrollPct: 0.28,
                utilitiesPct: 0.06,
                marketingPct: 0.03,
                maintenanceOpexPct: 0.05,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.03,
            };
        case 'RETAIL':
            return {
                id,
                name: 'New Retail',
                operationType: 'RETAIL',
                startYear: baseYear,
                horizonYears: 5,
                sqm: 500,
                avgRentPerSqm: 100,
                occupancyByMonth: Array(12).fill(0.85),
                rentalRevenuePctOfTotal: 0.90,
                otherRevenuePctOfTotal: 0.10,
                payrollPct: 0.15,
                utilitiesPct: 0.05,
                marketingPct: 0.02,
                maintenanceOpexPct: 0.03,
                otherOpexPct: 0.02,
                maintenanceCapexPct: 0.02,
            };
        case 'FLEX':
            return {
                id,
                name: 'New Flex Space',
                operationType: 'FLEX',
                startYear: baseYear,
                horizonYears: 5,
                sqm: 300,
                avgRentPerSqm: 80,
                occupancyByMonth: Array(12).fill(0.75),
                rentalRevenuePctOfTotal: 0.95,
                otherRevenuePctOfTotal: 0.05,
                payrollPct: 0.10,
                utilitiesPct: 0.04,
                marketingPct: 0.02,
                maintenanceOpexPct: 0.03,
                otherOpexPct: 0.02,
                maintenanceCapexPct: 0.02,
            };
        case 'WELLNESS':
            return {
                id,
                name: 'New Wellness Center',
                operationType: 'WELLNESS',
                startYear: baseYear,
                horizonYears: 5,
                memberships: 400,
                avgMembershipFee: 1800,
                dailyPasses: 50,
                avgDailyPassPrice: 30,
                utilizationByMonth: Array(12).fill(0.55),
                foodRevenuePctOfTotal: 0.15,
                beverageRevenuePctOfTotal: 0.10,
                otherRevenuePctOfTotal: 0.05,
                foodCogsPct: 0.35,
                beverageCogsPct: 0.25,
                payrollPct: 0.32,
                utilitiesPct: 0.06,
                marketingPct: 0.04,
                maintenanceOpexPct: 0.05,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.03,
            };
        case 'SENIOR_LIVING':
            return {
                id,
                name: 'New Senior Living',
                operationType: 'SENIOR_LIVING',
                startYear: baseYear,
                horizonYears: 5,
                units: 60,
                avgMonthlyRate: 3500,
                occupancyByMonth: Array(12).fill(0.90),
                careRevenuePctOfRental: 0.20,
                foodRevenuePctOfRental: 0.15,
                otherRevenuePctOfRental: 0.05,
                foodCogsPct: 0.35,
                careCogsPct: 0.25,
                payrollPct: 0.40,
                utilitiesPct: 0.06,
                marketingPct: 0.02,
                maintenanceOpexPct: 0.04,
                otherOpexPct: 0.03,
                maintenanceCapexPct: 0.03,
            };
        default:
            // Default to HOTEL config
            return {
                id,
                name: 'New Operation',
                operationType: 'HOTEL',
                startYear: baseYear,
                horizonYears: 5,
                keys: 100,
                avgDailyRate: 200,
                occupancyByMonth: Array(12).fill(0.70),
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
            } as OperationConfig;
    }
}

export function useFinancialModel() {
    const { input, setInput, output, error } = useFullModel();
    const { user, loading: authLoading } = useAuth();
    const [savedVersions, setSavedVersions] = useState<SavedScenario[]>([]);

    // Load scenarios when user changes or on mount
    useEffect(() => {
        async function loadScenarios() {
            if (authLoading) return;

            try {
                if (user) {
                    // User is authenticated: Load from cloud storage
                    const cloudScenarios = await cloudStorage.fetchScenarios(user.id);
                    // Convert ScenarioWithMetadata[] to SavedScenario[] by converting timestamps
                    const saved: SavedScenario[] = cloudScenarios.map((scenario: ScenarioWithMetadata) => {
                        // Convert ISO timestamp string to milliseconds since epoch
                        const lastModified = new Date(scenario.updatedAt || scenario.createdAt).getTime();
                        return {
                            id: scenario.id,
                            name: scenario.name,
                            description: scenario.description,
                            modelConfig: scenario.modelConfig,
                            lastModified,
                        };
                    });
                    setSavedVersions(saved);
                } else {
                    // User is not authenticated: Load from localStorage
                    const localVersions = loadVersions();
                    setSavedVersions(localVersions);
                }
            } catch (error) {
                console.error('[useFinancialModel] Error loading scenarios:', error);
                // Fallback to localStorage on error
                try {
                    const localVersions = loadVersions();
                    setSavedVersions(localVersions);
                } catch (fallbackError) {
                    console.error('[useFinancialModel] Fallback to localStorage also failed:', fallbackError);
                    setSavedVersions([]);
                }
            }
        }

        loadScenarios();
    }, [user, authLoading]);

    const updateInput = useCallback((newInput: FullModelInput) => {
        setInput(newInput);
    }, [setInput]);

    const runModel = useCallback(() => {
        // useFullModel already runs the model on input change
        // We just return the output or a default empty structure if null
        if (output) return output;

        // Return a minimal valid FullModelOutput to avoid crashes
        // This is a placeholder until the model runs successfully
        return {
            scenario: input.scenario,
            consolidatedAnnualPnl: [],
            project: {
                unleveredFcf: [],
                dcfValuation: {
                    discountRate: 0,
                    terminalGrowthRate: 0,
                    cashFlows: [],
                    npv: 0,
                    enterpriseValue: 0,
                    equityValue: 0,
                    terminalValue: 0
                },
                projectKpis: {
                    npv: 0,
                    unleveredIrr: 0,
                    equityMultiple: 0,
                    paybackPeriod: 0,
                    wacc: 0
                }
            },
            capital: {
                debtSchedule: { entries: [] },
                trancheSchedules: [],
                leveredFcfByYear: [],
                ownerLeveredCashFlows: [],
                debtKpis: []
            },
            waterfall: {
                ownerCashFlows: [],
                partners: [],
                annualRows: []
            },
        } as FullModelOutput;
    }, [output, input]);

    const saveVersion = useCallback(async (name: string): Promise<SavedScenario | null> => {
        if (!output) return null;

        const scenarioId = crypto.randomUUID();
        const now = Date.now();

        const scenario: NamedScenario = {
            id: scenarioId,
            name: name,
            description: '',
            modelConfig: input,
        };

        try {
            if (user) {
                // User is authenticated: Save to cloud storage
                await cloudStorage.saveScenario(scenario, user.id);
                // Refresh scenarios from cloud
                const cloudScenarios = await cloudStorage.fetchScenarios(user.id);
                const saved: SavedScenario[] = cloudScenarios.map((s: ScenarioWithMetadata) => {
                    const lastModified = new Date(s.updatedAt || s.createdAt).getTime();
                    return {
                        id: s.id,
                        name: s.name,
                        description: s.description,
                        modelConfig: s.modelConfig,
                        lastModified,
                    };
                });
                setSavedVersions(saved);
            } else {
                // User is not authenticated: Save to localStorage
                const newVersion: SavedScenario = {
                    ...scenario,
                    lastModified: now,
                };
                addVersion(newVersion);
                setSavedVersions(loadVersions());
            }

            const savedVersion: SavedScenario = {
                ...scenario,
                lastModified: now,
            };
            return savedVersion;
        } catch (error) {
            console.error('[useFinancialModel] Error saving scenario:', error);
            // Fallback to localStorage on error
            try {
                const newVersion: SavedScenario = {
                    ...scenario,
                    lastModified: now,
                };
                addVersion(newVersion);
                setSavedVersions(loadVersions());
                return newVersion;
            } catch (fallbackError) {
                console.error('[useFinancialModel] Fallback to localStorage also failed:', fallbackError);
                return null;
            }
        }
    }, [input, output, user]);

    const loadVersion = useCallback(async (versionId: string) => {
        try {
            if (user) {
                // User is authenticated: Load from cloud storage
                const cloudScenarios = await cloudStorage.fetchScenarios(user.id);
                const scenario = cloudScenarios.find((s: ScenarioWithMetadata) => s.id === versionId);
                if (scenario) {
                    setInput(scenario.modelConfig);
                    return;
                }
            }

            // Fallback to localStorage or if not authenticated
            const version = getVersion(versionId);
            if (version) {
                setInput(version.modelConfig);
            }
        } catch (error) {
            console.error('[useFinancialModel] Error loading version:', error);
            // Fallback to localStorage on error
            const version = getVersion(versionId);
            if (version) {
                setInput(version.modelConfig);
            }
        }
    }, [setInput, user]);

    const exportJson = useCallback(() => {
        downloadScenario({
            id: 'current',
            name: input.scenario.name,
            modelConfig: input
        });
    }, [input]);

    const importJson = useCallback(async (file: File) => {
        try {
            const content = await file.text();
            const importedInput = JSON.parse(content) as FullModelInput;
            // Basic validation could go here
            setInput(importedInput);
        } catch (error) {
            console.error('Failed to import scenario:', error);
        }
    }, [setInput]);

    const exportExcel = useCallback((modelOutput: FullModelOutput) => {
        const scenario = {
            id: 'current',
            name: input.scenario.name,
            modelConfig: input
        };
        generateExcel(scenario, modelOutput);
    }, [input]);

    const addOperation = useCallback((type: string) => {
        const newOp = createDefaultOperation(type);
        const updatedOperations = [...input.scenario.operations, newOp];
        updateInput({
            ...input,
            scenario: {
                ...input.scenario,
                operations: updatedOperations
            }
        });
        return newOp.id;
    }, [input, updateInput]);

    const removeOperation = useCallback((id: string) => {
        const updatedOperations = input.scenario.operations.filter(op => op.id !== id);
        updateInput({
            ...input,
            scenario: {
                ...input.scenario,
                operations: updatedOperations
            }
        });
    }, [input, updateInput]);

    return {
        input,
        updateInput,
        runModel,
        saveVersion,
        loadVersion,
        savedVersions,
        exportJson,
        importJson,
        exportExcel,
        // v1.2: CRUD Operations
        addOperation,
        removeOperation,
        error,
    };
}
