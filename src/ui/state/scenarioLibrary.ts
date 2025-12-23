/**
 * Scenario Library state module for Scenario Builder v2 (v0.6).
 * 
 * Manages an in-memory array of NamedScenario instances with simple CRUD operations.
 * v0.6: Adds localStorage persistence for scenarios.
 */

import type { NamedScenario } from '@domain/types';
import { createDefaultLibrary } from '../../sampleData';

/**
 * Storage key for localStorage persistence (versioned for future schema migrations).
 */
const STORAGE_KEY = 'hospitality_scenarios_v1';

/**
 * In-memory scenario library.
 * Seeded with default scenarios, loaded from localStorage if available.
 */
let scenarioLibrary: NamedScenario[] = [];

/**
 * Load scenarios from localStorage.
 * Returns empty array if localStorage is unavailable or data is invalid.
 * If parsing fails (corrupted data), clears the corrupted storage and returns empty array.
 */
function loadFromLocalStorage(): NamedScenario[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Validate that items have required structure
      const valid = parsed.every((item: unknown) => 
        item && 
        typeof item === 'object' && 
        'id' in item && 
        'name' in item && 
        'modelConfig' in item
      );
      if (valid) {
        return parsed as NamedScenario[];
      } else {
        // Invalid schema - clear corrupted data
        console.warn('Invalid scenario schema detected, clearing corrupted localStorage data');
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch (clearError) {
          console.warn('Failed to clear corrupted localStorage:', clearError);
        }
        return [];
      }
    }
    return [];
  } catch (e) {
    // JSON parse failed or other error - corrupted data
    console.warn('Failed to load scenarios from localStorage (corrupted data):', e);
    try {
      // Clear the corrupted storage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (clearError) {
      console.warn('Failed to clear corrupted localStorage:', clearError);
    }
    return [];
  }
}

/**
 * Save scenarios to localStorage.
 * Handles errors gracefully (quota exceeded, disabled, etc.).
 */
function saveToLocalStorage(scenarios: NamedScenario[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return;
    }
    const json = JSON.stringify(scenarios);
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, cannot save scenarios');
    } else {
      console.warn('Failed to save scenarios to localStorage:', e);
    }
  }
}

/**
 * Create default scenarios (used for initialization and reset).
 * v5.6: Uses createDefaultLibrary() from sampleData.ts which provides Base Case, Stress Case, and Upside Case.
 */
function createDefaultScenarios(): NamedScenario[] {
  return createDefaultLibrary();
}

/**
 * Initialize the scenario library with default scenarios or load from localStorage.
 * Called once when the module is first imported.
 * If localStorage data is corrupted, falls back to default scenarios.
 */
function initializeLibrary(): void {
  if (scenarioLibrary.length > 0) {
    return; // Already initialized
  }
  
  // Try to load from localStorage first
  const loaded = loadFromLocalStorage();
  if (loaded.length > 0) {
    scenarioLibrary = loaded;
    return;
  }
  
  // If no saved scenarios or data was corrupted, use defaults
  scenarioLibrary = createDefaultScenarios();
  // Save defaults to localStorage
  saveToLocalStorage(scenarioLibrary);
}

// Initialize on module load
initializeLibrary();

/**
 * List all scenarios in the library.
 */
export function listScenarios(): NamedScenario[] {
  return [...scenarioLibrary]; // Return a copy to prevent external mutation
}

/**
 * Get a scenario by ID.
 */
export function getScenario(id: string): NamedScenario | undefined {
  return scenarioLibrary.find((s) => s.id === id);
}

/**
 * Add a new scenario to the library.
 * v0.6: Automatically saves to localStorage.
 */
export function addScenario(scenario: NamedScenario): void {
  if (scenarioLibrary.some((s) => s.id === scenario.id)) {
    throw new Error(`Scenario with id "${scenario.id}" already exists`);
  }
  scenarioLibrary.push(scenario);
  saveToLocalStorage(scenarioLibrary);
}

/**
 * Update an existing scenario in the library.
 * v0.6: Automatically saves to localStorage.
 */
export function updateScenario(id: string, updates: Partial<NamedScenario>): void {
  const index = scenarioLibrary.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`Scenario with id "${id}" not found`);
  }
  scenarioLibrary[index] = { ...scenarioLibrary[index], ...updates };
  saveToLocalStorage(scenarioLibrary);
}

/**
 * Delete a scenario from the library.
 * v0.6: Automatically saves to localStorage.
 */
export function deleteScenario(id: string): void {
  const index = scenarioLibrary.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`Scenario with id "${id}" not found`);
  }
  scenarioLibrary.splice(index, 1);
  saveToLocalStorage(scenarioLibrary);
}

/**
 * Reset the scenario library to default scenarios.
 * v0.6: Clears localStorage and reloads defaults.
 */
export function resetToDefaults(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to clear localStorage:', e);
  }
  scenarioLibrary = createDefaultScenarios();
  saveToLocalStorage(scenarioLibrary);
}

