/**
 * Version Storage Utility (v0.12)
 * 
 * Manages scenario versions in localStorage.
 * Provides CRUD operations for version snapshots.
 */

import type { SavedScenario } from '@domain/types';

const STORAGE_KEY = 'hospitality_scenario_versions_v1';

/**
 * Load all versions from localStorage.
 * Returns empty array if localStorage is unavailable or data is invalid.
 */
export function loadVersions(): SavedScenario[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed as SavedScenario[];
    }
    return [];
  } catch (e) {
    console.warn('Failed to load versions from localStorage:', e);
    return [];
  }
}

/**
 * Save versions to localStorage.
 * Handles errors gracefully (quota exceeded, disabled, etc.).
 */
export function saveVersions(versions: SavedScenario[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage not available');
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  } catch (e) {
    console.error('Failed to save versions to localStorage:', e);
    // Don't throw - gracefully handle quota exceeded, etc.
  }
}

/**
 * Get all versions.
 */
export function getVersionsForScenario(): SavedScenario[] {
  return loadVersions();
}

/**
 * Add a new version to storage.
 */
export function addVersion(version: SavedScenario): void {
  const versions = loadVersions();
  versions.push(version);
  saveVersions(versions);
}

/**
 * Delete a version by id.
 */
export function deleteVersion(id: string): void {
  const versions = loadVersions();
  const filtered = versions.filter(v => v.id !== id);
  saveVersions(filtered);
}

/**
 * Get a version by id.
 */
export function getVersion(id: string): SavedScenario | null {
  const versions = loadVersions();
  return versions.find(v => v.id === id) || null;
}
