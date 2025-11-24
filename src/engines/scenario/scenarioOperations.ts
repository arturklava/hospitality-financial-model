/**
 * CRUD helpers for scenario operations (v1.2: Advanced Asset Dynamics).
 * 
 * Provides utility functions for managing operations within a scenario.
 */

import type { ProjectScenario, OperationConfig } from '@domain/types';

/**
 * Adds a new operation to a scenario.
 * 
 * @param scenario - The scenario to add the operation to
 * @param operation - The operation configuration to add
 * @returns A new scenario with the operation added
 */
export function addOperation(
  scenario: ProjectScenario,
  operation: OperationConfig
): ProjectScenario {
  return {
    ...scenario,
    operations: [...scenario.operations, operation],
  };
}

/**
 * Removes an operation from a scenario by ID.
 * 
 * @param scenario - The scenario to remove the operation from
 * @param operationId - The ID of the operation to remove
 * @returns A new scenario with the operation removed, or the original scenario if not found
 */
export function removeOperation(
  scenario: ProjectScenario,
  operationId: string
): ProjectScenario {
  return {
    ...scenario,
    operations: scenario.operations.filter((op) => op.id !== operationId),
  };
}

/**
 * Updates an existing operation in a scenario.
 * 
 * @param scenario - The scenario containing the operation
 * @param operationId - The ID of the operation to update
 * @param updates - Partial operation configuration with fields to update
 * @returns A new scenario with the operation updated, or the original scenario if not found
 */
export function updateOperation(
  scenario: ProjectScenario,
  operationId: string,
  updates: Partial<OperationConfig>
): ProjectScenario {
  const operationIndex = scenario.operations.findIndex((op) => op.id === operationId);
  
  if (operationIndex === -1) {
    // Operation not found, return original scenario
    return scenario;
  }
  
  const updatedOperations: OperationConfig[] = [...scenario.operations];
  // Type assertion is safe because we're preserving the operation structure
  // and only updating fields that are compatible with the operation type
  const updatedOp = {
    ...updatedOperations[operationIndex],
    ...updates,
  } as OperationConfig;
  
  updatedOperations[operationIndex] = updatedOp;
  
  return {
    ...scenario,
    operations: updatedOperations,
  };
}

