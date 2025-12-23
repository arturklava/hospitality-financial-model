/**
 * Sponsor cash flow calculation logic (v1.2: Advanced Asset Dynamics).
 * 
 * Converts Asset P&L (OpCo) to Sponsor P&L (PropCo) based on ownership model.
 */

import type { AnnualPnl, OperationConfig, OwnershipModel } from '@domain/types';

/**
 * Calculates Sponsor P&L from Asset P&L based on ownership model.
 * 
 * @param assetPnl - Asset-level P&L (from operation engine)
 * @param config - Operation configuration with ownership model
 * @returns Sponsor P&L (what AG7 actually receives)
 */
export function calculateSponsorCashFlow(
  assetPnl: AnnualPnl,
  config: OperationConfig
): AnnualPnl {
  // Get ownership model with default
  const ownershipModel: OwnershipModel = config.ownershipModel ?? 'BUILD_AND_OPERATE';
  const ownershipPct: number = config.ownershipPct ?? 1.0;
  const isActive: boolean = config.isActive ?? true;

  // If inactive, return zero P&L
  if (!isActive) {
    return {
      yearIndex: assetPnl.yearIndex,
      operationId: assetPnl.operationId,
      revenueTotal: 0,
      cogsTotal: 0,
      opexTotal: 0,
      ebitda: 0,
      noi: 0,
      maintenanceCapex: 0,
      cashFlow: 0,
    };
  }

  switch (ownershipModel) {
    case 'BUILD_AND_OPERATE':
    case 'CO_INVEST_OPCO': {
      // Sponsor receives proportional share of asset P&L
      return {
        yearIndex: assetPnl.yearIndex,
        operationId: assetPnl.operationId,
        revenueTotal: assetPnl.revenueTotal * ownershipPct,
        cogsTotal: assetPnl.cogsTotal * ownershipPct,
        opexTotal: assetPnl.opexTotal * ownershipPct,
        ebitda: assetPnl.ebitda * ownershipPct,
        noi: assetPnl.noi * ownershipPct,
        maintenanceCapex: assetPnl.maintenanceCapex * ownershipPct,
        cashFlow: assetPnl.cashFlow * ownershipPct,
      };
    }

    case 'BUILD_AND_LEASE_FIXED': {
      // Sponsor receives fixed rent, no COGS/OPEX (simplified for v1.2)
      const baseRent = config.leaseTerms?.baseRent ?? 0;
      // Owner costs = 0 for v1.2 (placeholder for future implementation)
      const ownerCosts = 0;
      
      const sponsorRevenue = baseRent;
      const sponsorNoi = sponsorRevenue - ownerCosts;
      
      return {
        yearIndex: assetPnl.yearIndex,
        operationId: assetPnl.operationId,
        revenueTotal: sponsorRevenue,
        cogsTotal: 0,
        opexTotal: ownerCosts,
        ebitda: sponsorNoi,
        noi: sponsorNoi,
        maintenanceCapex: 0, // Owner handles maintenance capex separately (v1.2 simplification)
        cashFlow: sponsorNoi,
      };
    }

    case 'BUILD_AND_LEASE_VARIABLE': {
      // Sponsor receives base rent + variable rent based on asset performance
      const baseRent = config.leaseTerms?.baseRent ?? 0;
      const variableRentPct = config.leaseTerms?.variableRentPct ?? 0;
      const variableRentBasis = config.leaseTerms?.variableRentBasis ?? 'revenue';
      
      // Determine basis for variable rent calculation
      const basis = variableRentBasis === 'revenue' 
        ? assetPnl.revenueTotal 
        : assetPnl.noi;
      
      const variableRent = basis * variableRentPct;
      const totalRent = baseRent + variableRent;
      
      // Owner costs = 0 for v1.2 (placeholder for future implementation)
      const ownerCosts = 0;
      
      const sponsorRevenue = totalRent;
      const sponsorNoi = sponsorRevenue - ownerCosts;
      
      return {
        yearIndex: assetPnl.yearIndex,
        operationId: assetPnl.operationId,
        revenueTotal: sponsorRevenue,
        cogsTotal: 0,
        opexTotal: ownerCosts,
        ebitda: sponsorNoi,
        noi: sponsorNoi,
        maintenanceCapex: 0, // Owner handles maintenance capex separately (v1.2 simplification)
        cashFlow: sponsorNoi,
      };
    }

    default: {
      // Fallback: treat as BUILD_AND_OPERATE
      return {
        yearIndex: assetPnl.yearIndex,
        operationId: assetPnl.operationId,
        revenueTotal: assetPnl.revenueTotal * ownershipPct,
        cogsTotal: assetPnl.cogsTotal * ownershipPct,
        opexTotal: assetPnl.opexTotal * ownershipPct,
        ebitda: assetPnl.ebitda * ownershipPct,
        noi: assetPnl.noi * ownershipPct,
        maintenanceCapex: assetPnl.maintenanceCapex * ownershipPct,
        cashFlow: assetPnl.cashFlow * ownershipPct,
      };
    }
  }
}

