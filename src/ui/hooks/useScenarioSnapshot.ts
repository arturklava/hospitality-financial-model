/**
 * useScenarioSnapshot Hook
 * 
 * Stores a "Scenario A" snapshot for comparison with current (live) model output.
 * Uses sessionStorage to persist across page refreshes during the session.
 */

import { useState, useEffect, useCallback } from 'react';
import type { FullModelInput, ProjectKpis } from '../../domain/types';
import { runFullModel } from '../../engines/pipeline/modelPipeline';

const STORAGE_KEY = 'hfm_scenario_snapshot';

interface ScenarioSnapshot {
    name: string;
    savedAt: string;
    input: FullModelInput;
    kpis: ProjectKpis;
}

interface UseScenarioSnapshotResult {
    snapshot: ScenarioSnapshot | null;
    hasSnapshot: boolean;
    saveSnapshot: (name: string, input: FullModelInput) => void;
    clearSnapshot: () => void;
}

export function useScenarioSnapshot(): UseScenarioSnapshotResult {
    const [snapshot, setSnapshot] = useState<ScenarioSnapshot | null>(() => {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load scenario snapshot:', e);
        }
        return null;
    });

    // Sync to sessionStorage when snapshot changes
    useEffect(() => {
        try {
            if (snapshot) {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
            } else {
                sessionStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.warn('Failed to save scenario snapshot:', e);
        }
    }, [snapshot]);

    const saveSnapshot = useCallback((name: string, input: FullModelInput) => {
        try {
            const output = runFullModel(input);
            const newSnapshot: ScenarioSnapshot = {
                name,
                savedAt: new Date().toISOString(),
                input,
                kpis: output.project.projectKpis,
            };
            setSnapshot(newSnapshot);
        } catch (e) {
            console.error('Failed to save scenario snapshot:', e);
        }
    }, []);

    const clearSnapshot = useCallback(() => {
        setSnapshot(null);
    }, []);

    return {
        snapshot,
        hasSnapshot: snapshot !== null,
        saveSnapshot,
        clearSnapshot,
    };
}
