/**
 * Capital-related helpers for project engine (v0.6).
 * 
 * These helpers support transaction cost calculations without modifying the capital engine directly.
 */

import type { DebtExecution, CapitalStructureConfig } from '@domain/types';

/**
 * Gets the initial principal amount from a debt tranche config.
 * Handles both v0.4 (amount) and v0.5+ (initialPrincipal) formats.
 * 
 * @param tranche - Debt tranche configuration
 * @returns Initial principal amount (or 0 if neither amount nor initialPrincipal is provided)
 */
export function getInitialPrincipal(tranche: DebtExecution): number {
  return tranche.initialPrincipal ?? tranche.amount ?? 0;
}

/**
 * Calculates net loan proceeds for a debt tranche after origination fees (v0.6).
 * 
 * Net proceeds = initialPrincipal - originationFee
 * Origination fee = initialPrincipal × originationFeePct
 * 
 * @param tranche - Debt tranche configuration
 * @returns Net loan proceeds (initialPrincipal minus origination fee)
 */
export function calculateNetLoanProceeds(tranche: DebtExecution): number {
  const initialPrincipal = getInitialPrincipal(tranche);
  const originationFeePct = tranche.originationFeePct ?? 0;
  const originationFee = initialPrincipal * originationFeePct;
  return initialPrincipal - originationFee;
}

/**
 * Calculates total net loan proceeds across all debt tranches (v0.6).
 * 
 * This is used to determine the actual equity investment needed:
 * equityInvested = initialInvestment - sum(netLoanProceeds per tranche)
 * 
 * @param capitalConfig - Capital structure configuration
 * @returns Total net loan proceeds across all tranches
 */
export function calculateTotalNetLoanProceeds(
  capitalConfig: CapitalStructureConfig
): number {
  let totalNetProceeds = 0;
  for (const tranche of capitalConfig.debt) {
    totalNetProceeds += calculateNetLoanProceeds(tranche);
  }
  return totalNetProceeds;
}

/**
 * Calculates total origination fees across all debt tranches (v0.6).
 * 
 * @param capitalConfig - Capital structure configuration
 * @returns Total origination fees
 */
export function calculateTotalOriginationFees(
  capitalConfig: CapitalStructureConfig
): number {
  let totalFees = 0;
  for (const tranche of capitalConfig.debt) {
    const initialPrincipal = getInitialPrincipal(tranche);
    const originationFeePct = tranche.originationFeePct ?? 0;
    totalFees += initialPrincipal * originationFeePct;
  }
  return totalFees;
}

