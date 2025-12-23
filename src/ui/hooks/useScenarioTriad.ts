/**
 * React hook for computing Scenario Triad (Base, Stress, Upside).
 * 
 * Uses the current model input to generate three scenario variants:
 * - Base: Current input as-is
 * - Stress: Occupancy and ADR reduced by 10%
 * - Upside: Occupancy and ADR increased by 10%
 * 
 * @param input - Current FullModelInput from useFullModel
 * @returns Memoized ScenarioTriadResult with all 3 KPI sets
 */

import { useMemo } from 'react';
import { runScenarioTriad, type ScenarioTriadResult } from '@engines/analysis/scenarioComparison';
import type { FullModelInput } from '@domain/types';

const DEFAULT_STRESS_PCT = 0.10; // 10% stress/upside

export interface UseScenarioTriadResult {
    triad: ScenarioTriadResult | null;
    error: Error | null;
}

export function useScenarioTriad(
    input: FullModelInput | undefined
): UseScenarioTriadResult {
    return useMemo(() => {
        if (!input) {
            return { triad: null, error: null };
        }

        try {
            const triad = runScenarioTriad(input, DEFAULT_STRESS_PCT);
            return { triad, error: null };
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            console.error('[useScenarioTriad] Error computing triad:', error);
            return { triad: null, error };
        }
    }, [input]);
}
