import { useState, useCallback, useEffect } from 'react';
import { useFullModel } from './useFullModel';
import { useAuth } from '../../contexts/AuthContext';
import { downloadScenario } from '../utils/fileIO';
import { generateExcel } from '../utils/excelExport';
import { addVersion, loadVersions, getVersion } from '../utils/versionStorage';
import * as cloudStorage from '../../engines/io/cloudStorage';
import type { FullModelInput, FullModelOutput, SavedScenario, NamedScenario } from '@domain/types';
import type { ScenarioWithMetadata } from '../../engines/io/cloudStorage';

export function useFinancialModel() {
    const { input, setInput, output, errorMessage } = useFullModel();
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
                const message = error instanceof Error ? error.message : String(error);
                console.error('[useFinancialModel] Error loading scenarios:', message);
                // Fallback to localStorage on error
                try {
                    const localVersions = loadVersions();
                    setSavedVersions(localVersions);
                } catch (fallbackError) {
                    const message = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                    console.error('[useFinancialModel] Fallback to localStorage also failed:', message);
                    setSavedVersions([]);
                }
            }
        }

        loadScenarios();
    }, [user, authLoading]);

    const updateInput = useCallback((newInput: FullModelInput) => {
        setInput(newInput);
    }, [setInput]);

    const runModel = useCallback(() => output, [output]);

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
            const message = error instanceof Error ? error.message : String(error);
            console.error('[useFinancialModel] Error saving scenario:', message);
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
                const message = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                console.error('[useFinancialModel] Fallback to localStorage also failed:', message);
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
            const message = error instanceof Error ? error.message : String(error);
            console.error('[useFinancialModel] Error loading version:', message);
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
            const message = error instanceof Error ? error.message : String(error);
            console.error('Failed to import scenario:', message);
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
        errorMessage,
    };
}
