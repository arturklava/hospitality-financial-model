/**
 * React hook for Scenario Library (Scenario Builder v1).
 * 
 * Provides access to the scenario library with reactive state updates.
 * 
 * v4.0.2: Hybrid Storage - Cloud for authenticated users, Local for guests.
 * - If user is logged in: Uses Supabase cloud storage (async)
 * - If !user (guest or no auth): Uses localStorage (sync, v3.6 behavior)
 */

import { useState, useCallback, useEffect } from 'react';
import type { NamedScenario } from '@domain/types';
import { useAuth } from '../../contexts/AuthContext';
import * as scenarioLibrary from '../state/scenarioLibrary';
import * as cloudStorage from '../../engines/io/cloudStorage';
import { createDefaultLibrary } from '../../sampleData';

export function useScenarioLibrary() {
  const { user, loading: authLoading } = useAuth();
  const [scenarios, setScenarios] = useState<NamedScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load scenarios when user changes or on mount
  useEffect(() => {
    async function loadScenarios() {
      setLoading(true);
      setError(null);

      try {
        if (user) {
          // User is logged in: Load from cloud storage
          const cloudScenarios = await cloudStorage.fetchScenarios(user.id);
          // v5.6: If storage is empty, load default scenarios
          if (cloudScenarios.length === 0) {
            const defaults = createDefaultLibrary();
            // Save defaults to cloud storage
            for (const scenario of defaults) {
              await cloudStorage.saveScenario(scenario, user.id);
            }
            setScenarios(defaults);
          } else {
            setScenarios(cloudScenarios);
          }
        } else {
          // Guest or no user: Load from localStorage (v3.6 behavior)
          // v5.6: scenarioLibrary already initializes with defaults if empty
          const localScenarios = scenarioLibrary.listScenarios();
          setScenarios(localScenarios);
        }
      } catch (err) {
        console.error('[useScenarioLibrary] Error loading scenarios:', err);
        setError(err instanceof Error ? err : new Error('Failed to load scenarios'));
        // Fallback to local storage on error
        try {
          const localScenarios = scenarioLibrary.listScenarios();
          setScenarios(localScenarios);
        } catch (fallbackErr) {
          console.error('[useScenarioLibrary] Fallback to local storage also failed:', fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    }

    // Wait for auth to finish loading before checking user
    if (!authLoading) {
      loadScenarios();
    }
  }, [user, authLoading]);

  const listScenarios = useCallback(async (): Promise<NamedScenario[]> => {
    if (user) {
      // User is logged in: Fetch from cloud
      try {
        const cloudScenarios = await cloudStorage.fetchScenarios(user.id);
        setScenarios(cloudScenarios);
        return cloudScenarios;
      } catch (err) {
        console.error('[useScenarioLibrary] Error refreshing scenarios:', err);
        setError(err instanceof Error ? err : new Error('Failed to refresh scenarios'));
        return scenarios; // Return current state on error
      }
    } else {
      // Guest or no user: Use localStorage
      const updated = scenarioLibrary.listScenarios();
      setScenarios(updated);
      return updated;
    }
  }, [user, scenarios]);

  const getScenario = useCallback((id: string): NamedScenario | undefined => {
    return scenarios.find((s) => s.id === id);
  }, [scenarios]);

  const addScenario = useCallback(async (scenario: NamedScenario): Promise<void> => {
    if (user) {
      // User is logged in: Save to cloud
      try {
        await cloudStorage.saveScenario(scenario, user.id);
        // Refresh scenarios from cloud
        const updated = await cloudStorage.fetchScenarios(user.id);
        setScenarios(updated);
      } catch (err) {
        console.error('[useScenarioLibrary] Error adding scenario:', err);
        setError(err instanceof Error ? err : new Error('Failed to add scenario'));
        throw err; // Re-throw to allow caller to handle
      }
    } else {
      // Guest or no user: Save to localStorage
      scenarioLibrary.addScenario(scenario);
      setScenarios(scenarioLibrary.listScenarios());
    }
  }, [user]);

  const updateScenario = useCallback(async (id: string, updates: Partial<NamedScenario>): Promise<void> => {
    if (user) {
      // User is logged in: Update in cloud
      try {
        const existing = scenarios.find((s) => s.id === id);
        if (!existing) {
          throw new Error(`Scenario with id "${id}" not found`);
        }
        const updated = { ...existing, ...updates };
        await cloudStorage.saveScenario(updated, user.id);
        // Refresh scenarios from cloud
        const refreshed = await cloudStorage.fetchScenarios(user.id);
        setScenarios(refreshed);
      } catch (err) {
        console.error('[useScenarioLibrary] Error updating scenario:', err);
        setError(err instanceof Error ? err : new Error('Failed to update scenario'));
        throw err; // Re-throw to allow caller to handle
      }
    } else {
      // Guest or no user: Update in localStorage
      scenarioLibrary.updateScenario(id, updates);
      setScenarios(scenarioLibrary.listScenarios());
    }
  }, [user, scenarios]);

  const deleteScenario = useCallback(async (id: string): Promise<void> => {
    if (user) {
      // User is logged in: Delete from cloud
      try {
        await cloudStorage.deleteScenario(id);
        // Refresh scenarios from cloud
        const updated = await cloudStorage.fetchScenarios(user.id);
        setScenarios(updated);
      } catch (err) {
        console.error('[useScenarioLibrary] Error deleting scenario:', err);
        setError(err instanceof Error ? err : new Error('Failed to delete scenario'));
        throw err; // Re-throw to allow caller to handle
      }
    } else {
      // Guest or no user: Delete from localStorage
      scenarioLibrary.deleteScenario(id);
      setScenarios(scenarioLibrary.listScenarios());
    }
  }, [user]);

  const resetToDefaults = useCallback(async (): Promise<void> => {
    if (user) {
      // User is logged in: Clear cloud scenarios (delete all) and reset
      // For now, we'll just clear the scenarios array (user can recreate)
      // In the future, we might want to restore defaults in cloud too
      try {
        // Delete all scenarios
        const deletePromises = scenarios.map((s) => cloudStorage.deleteScenario(s.id));
        await Promise.all(deletePromises);
        setScenarios([]);
      } catch (err) {
        console.error('[useScenarioLibrary] Error resetting scenarios:', err);
        setError(err instanceof Error ? err : new Error('Failed to reset scenarios'));
      }
    } else {
      // Guest or no user: Reset localStorage
      scenarioLibrary.resetToDefaults();
      setScenarios(scenarioLibrary.listScenarios());
    }
  }, [user, scenarios]);

  return {
    scenarios,
    loading: loading || authLoading,
    error,
    listScenarios,
    getScenario,
    addScenario,
    updateScenario,
    deleteScenario,
    resetToDefaults,
  };
}

