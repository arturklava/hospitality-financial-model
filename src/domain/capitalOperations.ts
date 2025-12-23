/**
 * Capital operations helpers (v1.3: Capital Logic Helpers).
 * 
 * Provides utility functions for managing debt tranches within a NamedScenario.
 */

import type { NamedScenario, DebtTrancheConfig } from './types';

/**
 * Adds a new debt tranche to a scenario.
 * 
 * Default Logic:
 * - If 'SENIOR' exists, add 'MEZZ'
 * - Default amount = 10% of remaining cost (initialInvestment - total existing debt)
 * 
 * @param scenario - The NamedScenario to add the tranche to
 * @param type - Tranche type ('SENIOR' or 'MEZZ')
 * @returns A new NamedScenario with the tranche added
 */
export function addDebtTranche(
  scenario: NamedScenario,
  type: 'SENIOR' | 'MEZZ'
): NamedScenario {
  const capitalConfig = scenario.modelConfig.capitalConfig;
  const existingTranches = capitalConfig.debt || capitalConfig.tranches || [];

  // Check if SENIOR already exists
  const hasSenior = existingTranches.some(t => t.type === 'SENIOR');

  // Default Logic: If 'SENIOR' exists, add 'MEZZ'
  // Otherwise, add the requested type (defaults to SENIOR if not specified)
  const finalType = hasSenior ? 'MEZZ' : type;

  // Calculate total existing debt
  const totalExistingDebt = existingTranches.reduce((sum, tranche) => {
    const principal = tranche.initialPrincipal ?? tranche.amount ?? 0;
    return sum + principal;
  }, 0);

  // Calculate remaining cost (equity portion)
  const remainingCost = capitalConfig.initialInvestment - totalExistingDebt;

  // Default amount = 10% of remaining cost
  const defaultAmount = remainingCost * 0.10;

  // Generate unique ID for the new tranche
  const trancheId = `tranche-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create new tranche with default values
  const newTranche: DebtTrancheConfig = {
    id: trancheId,
    type: finalType,
    label: finalType === 'SENIOR' ? 'Senior Loan' : 'Mezzanine Debt',
    initialPrincipal: defaultAmount,
    interestRate: finalType === 'SENIOR' ? 0.08 : 0.12, // Default rates: 8% for senior, 12% for mezz
    termYears: 10,
    amortizationType: 'mortgage',
    amortizationYears: 10,
  };

  // Create updated capital config
  const updatedCapitalConfig = {
    ...capitalConfig,
    debt: [...existingTranches, newTranche],
    tranches: [...existingTranches, newTranche], // Keep legacy for compatibility
  };

  // Return updated scenario
  return {
    ...scenario,
    modelConfig: {
      ...scenario.modelConfig,
      capitalConfig: updatedCapitalConfig,
    },
  };
}

/**
 * Removes a debt tranche from a scenario by ID.
 * 
 * @param scenario - The NamedScenario to remove the tranche from
 * @param trancheId - The ID of the tranche to remove
 * @returns A new NamedScenario with the tranche removed, or the original scenario if not found
 */
export function removeDebtTranche(
  scenario: NamedScenario,
  trancheId: string
): NamedScenario {
  const capitalConfig = scenario.modelConfig.capitalConfig;
  const existingTranches = capitalConfig.debt || capitalConfig.tranches || [];

  // Filter out the tranche with the specified ID
  const updatedTranches = existingTranches.filter(t => t.id !== trancheId);

  // If no tranche was removed, return original scenario
  if (updatedTranches.length === existingTranches.length) {
    return scenario;
  }

  // Create updated capital config
  const updatedCapitalConfig = {
    ...capitalConfig,
    debt: updatedTranches,
    tranches: updatedTranches, // Keep legacy for compatibility
  };

  // Return updated scenario
  return {
    ...scenario,
    modelConfig: {
      ...scenario.modelConfig,
      capitalConfig: updatedCapitalConfig,
    },
  };
}

/**
 * Updates an existing debt tranche in a scenario.
 * 
 * @param scenario - The NamedScenario containing the tranche
 * @param trancheId - The ID of the tranche to update
 * @param updates - Partial debt tranche configuration with fields to update
 * @returns A new NamedScenario with the tranche updated, or the original scenario if not found
 */
export function updateDebtTranche(
  scenario: NamedScenario,
  trancheId: string,
  updates: Partial<DebtTrancheConfig>
): NamedScenario {
  const capitalConfig = scenario.modelConfig.capitalConfig;
  const existingTranches = capitalConfig.debt || capitalConfig.tranches || [];

  // Find the tranche index
  const trancheIndex = existingTranches.findIndex(t => t.id === trancheId);

  if (trancheIndex === -1) {
    // Tranche not found, return original scenario
    return scenario;
  }

  // Create updated tranches array
  const updatedTranches: DebtTrancheConfig[] = [...existingTranches];
  updatedTranches[trancheIndex] = {
    ...updatedTranches[trancheIndex],
    ...updates,
  };

  // Create updated capital config
  const updatedCapitalConfig = {
    ...capitalConfig,
    debt: updatedTranches,
    tranches: updatedTranches, // Keep legacy for compatibility
  };

  // Return updated scenario
  return {
    ...scenario,
    modelConfig: {
      ...scenario.modelConfig,
      capitalConfig: updatedCapitalConfig,
    },
  };
}

