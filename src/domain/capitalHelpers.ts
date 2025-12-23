/**
 * Capital structure helpers for v0.5 Capital Stack 2.0.
 * 
 * Provides backwards compatibility utilities and type conversions.
 */

import type { DebtExecution, CapitalStructureConfig } from './types';

/**
 * Legacy v0.4 debt tranche config (for backwards compatibility).
 * 
 * @deprecated Use DebtTrancheConfig (v0.5) with initialPrincipal instead of amount.
 */
export interface LegacyDebtTrancheConfig {
  id: string;
  amount: number;          // old field name
  interestRate: number;
  termYears: number;
  amortizationYears: number;
}

/**
 * Converts a v0.4-style debt tranche config to v0.5 format.
 * 
 * This helper enables backwards compatibility by converting old configs that use `amount`
 * to new configs that use `initialPrincipal`, `label`, `type`, and `amortizationType`.
 * 
 * @param legacyTranche - v0.4-style tranche config with `amount` field
 * @returns v0.5-style tranche config with `initialPrincipal` and required v0.5 fields
 */
export function convertLegacyTrancheToV05(
  legacyTranche: LegacyDebtTrancheConfig
): DebtExecution {
  return {
    id: legacyTranche.id,
    label: legacyTranche.id, // Use id as label fallback
    type: 'SENIOR', // Default to SENIOR for legacy configs
    initialPrincipal: legacyTranche.amount,
    interestRate: legacyTranche.interestRate,
    amortizationType: 'mortgage', // Default to mortgage (linear amortization) for legacy configs
    termYears: legacyTranche.termYears,
    // amortizationYears is not in v0.5 - it's handled by amortizationType
    // For mortgage type, amortization is implicit in the termYears
    startYear: 0, // Default to Year 0
    // No refinancing by default
  };
}

/**
 * Converts a v0.4-style capital structure config to v0.5 format.
 * 
 * @param legacyConfig - v0.4-style config with legacy tranche format
 * @returns v0.5-style config with converted tranches
 */
export function convertLegacyCapitalConfigToV05(
  legacyConfig: {
    initialInvestment: number;
    debtTranches: LegacyDebtTrancheConfig[];
  }
): CapitalStructureConfig {
  return {
    initialInvestment: legacyConfig.initialInvestment,
    debt: legacyConfig.debtTranches.map(convertLegacyTrancheToV05),
    tranches: legacyConfig.debtTranches.map(convertLegacyTrancheToV05),
  };
}

/**
 * Normalized capital structure data for chart rendering (v1.3.1: Data Safety).
 * 
 * Ensures that capital structure data is always in a valid format for chart rendering,
 * even when debtTranches is undefined, null, or empty (All-Equity deals).
 * 
 * @param capitalConfig - Capital structure configuration (may have undefined/null/empty debtTranches)
 * @returns Normalized capital structure data with guaranteed valid structure
 */
export interface NormalizedCapitalData {
  initialInvestment: number;
  tranches: DebtExecution[];
  totalDebt: number;
  totalEquity: number;
  seniorDebt: number;
  mezzDebt: number;
  otherDebt: number;
  isAllEquity: boolean;
}

export function normalizeCapitalData(
  capitalConfig: CapitalStructureConfig
): NormalizedCapitalData {
  // Ensure tranches is always an array (handle undefined/null)
  const tranches = capitalConfig.debt || capitalConfig.tranches || [];

  // Calculate total debt safely
  const totalDebt = tranches.reduce((sum, tranche) => {
    const principal = tranche.initialPrincipal ?? 0;
    return sum + principal;
  }, 0);

  // Calculate total equity (always >= 0)
  const totalEquity = Math.max(0, capitalConfig.initialInvestment - totalDebt);

  // Group debt by type (safely handle empty arrays)
  const seniorDebt = tranches
    .filter(t => t.type === 'SENIOR' || !t.type)
    .reduce((sum, t) => sum + (t.initialPrincipal ?? 0), 0);

  const mezzDebt = tranches
    .filter(t => t.type === 'MEZZ')
    .reduce((sum, t) => sum + (t.initialPrincipal ?? 0), 0);

  const otherDebt = tranches
    .filter(t => t.type === 'BRIDGE' || t.type === 'OTHER')
    .reduce((sum, t) => sum + (t.initialPrincipal ?? 0), 0);

  // Determine if this is an All-Equity deal
  const isAllEquity = tranches.length === 0 || totalDebt === 0;

  return {
    initialInvestment: capitalConfig.initialInvestment,
    tranches, // Always an array (never undefined/null)
    totalDebt,
    totalEquity,
    seniorDebt,
    mezzDebt,
    otherDebt,
    isAllEquity,
  };
}

