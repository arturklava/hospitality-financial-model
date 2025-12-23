/**
 * File I/O utilities for scenario import/export (v0.8).
 * 
 * Provides functions to download scenarios as JSON files and load scenarios
 * from JSON files with validation.
 */

import { validateScenario } from '@domain/validation';
import type { NamedScenario } from '@domain/types';

/**
 * Downloads a scenario as a JSON file.
 * 
 * @param scenario - The scenario to export
 * @param filename - Optional custom filename (defaults to scenario-{id}-{timestamp}.json)
 */
export function downloadScenario(scenario: NamedScenario, filename?: string): void {
  const data = {
    metadata: {
      version: '0.8',
      timestamp: Date.now(),
      exportedBy: undefined,
      appVersion: '0.8',
    },
    scenario,
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `scenario-${scenario.id}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Loads a scenario from a JSON file.
 * 
 * @param file - The File object to read
 * @returns Promise that resolves to the loaded scenario
 * @throws Error if the file is invalid or cannot be parsed
 */
export async function loadScenario(file: File): Promise<NamedScenario> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          reject(new Error('Failed to read file as text'));
          return;
        }

        const data = JSON.parse(text);

        // Check if it's a PortableScenario format (with metadata)
        const scenario = data.scenario || data;

        // Validate the scenario structure with detailed error messages
        const validationResult = validateScenario(scenario);
        if (!validationResult.isValid) {
          const errorMessage = validationResult.error 
            ? `Invalid scenario file: ${validationResult.error}`
            : 'Invalid scenario file: structure validation failed';
          reject(new Error(errorMessage));
          return;
        }

        // Type assertion is safe after validation
        resolve(scenario as NamedScenario);
      } catch (error) {
        if (error instanceof SyntaxError) {
          reject(new Error('Invalid JSON file'));
        } else {
          reject(error instanceof Error ? error : new Error('Unknown error loading scenario'));
        }
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Triggers a file input dialog to select a scenario file.
 * 
 * @param onLoad - Callback function that receives the loaded scenario
 * @param onError - Optional error callback
 */
export function triggerScenarioImport(
  onLoad: (scenario: NamedScenario) => void,
  onError?: (error: Error) => void
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.style.display = 'none';

  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }

    try {
      const scenario = await loadScenario(file);
      onLoad(scenario);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while loading scenario';
      
      // Show user-friendly error message
      const friendlyMessage = errorMessage.includes('Occupancy must be between')
        ? errorMessage
        : errorMessage.includes('Invalid scenario file')
        ? errorMessage.replace('Invalid scenario file: ', '')
        : `Failed to load scenario: ${errorMessage}`;
      
      if (onError) {
        onError(new Error(friendlyMessage));
      } else {
        console.error('Failed to load scenario:', error);
        alert(friendlyMessage);
      }
    } finally {
      // Clean up
      document.body.removeChild(input);
    }
  };

  document.body.appendChild(input);
  input.click();
}

