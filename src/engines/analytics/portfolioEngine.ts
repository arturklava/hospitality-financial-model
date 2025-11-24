/**
 * Portfolio analytics engine.
 * 
 * Provides portfolio-level aggregations by operation type and REaaS metrics.
 * This engine performs on-the-fly aggregations from FullModelOutput.
 */

import type {
  FullModelOutput,
  FullModelInput,
  OperationType,
  PortfolioMetrics,
  ReaasMetrics,
} from '@domain/types';
import { runScenarioEngine } from '@engines/scenario/scenarioEngine';
import { calculateSponsorCashFlow } from '@engines/operations/sponsorLogic';

/**
 * Aggregates metrics by operation type from full model output.
 * 
 * Re-runs the scenario engine to get individual operation results,
 * then aggregates revenue, NOI, and valuation by operation type.
 * 
 * Valuation is calculated proportionally based on NOI contribution
 * to total NOI, multiplied by enterprise value.
 * 
 * @param output - Full model output from runFullModel
 * @returns Record mapping each operation type to aggregated metrics
 */
export function aggregateByOperationType(
  output: FullModelOutput
): Record<OperationType, PortfolioMetrics> {
  // Re-run scenario engine to get individual operation results
  const scenarioResult = runScenarioEngine(output.scenario);
  const { operations } = scenarioResult;
  
  // Get enterprise value from project engine
  const enterpriseValue = output.project.dcfValuation.enterpriseValue;
  
  // Initialize aggregation map for all operation types
  const aggregation: Record<OperationType, PortfolioMetrics> = {
    HOTEL: { revenue: 0, noi: 0, valuation: 0 },
    VILLAS: { revenue: 0, noi: 0, valuation: 0 },
    RESTAURANT: { revenue: 0, noi: 0, valuation: 0 },
    BEACH_CLUB: { revenue: 0, noi: 0, valuation: 0 },
    RACQUET: { revenue: 0, noi: 0, valuation: 0 },
    RETAIL: { revenue: 0, noi: 0, valuation: 0 },
    FLEX: { revenue: 0, noi: 0, valuation: 0 },
    WELLNESS: { revenue: 0, noi: 0, valuation: 0 },
    SENIOR_LIVING: { revenue: 0, noi: 0, valuation: 0 },
  };
  
  // Sum revenue and NOI across all years for each operation
  const operationTypeNoi: Record<OperationType, number> = {
    HOTEL: 0,
    VILLAS: 0,
    RESTAURANT: 0,
    BEACH_CLUB: 0,
    RACQUET: 0,
    RETAIL: 0,
    FLEX: 0,
    WELLNESS: 0,
    SENIOR_LIVING: 0,
  };
  
  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    const config = output.scenario.operations[i];
    const operationType = operation.operationType;
    
    // Sum revenue and NOI across all years (using Sponsor P&L)
    let totalRevenue = 0;
    let totalNoi = 0;
    
    for (const annualPnl of operation.annualPnl) {
      // Calculate Sponsor P&L from Asset P&L
      const sponsorPnl = calculateSponsorCashFlow(annualPnl, config);
      totalRevenue += sponsorPnl.revenueTotal;
      totalNoi += sponsorPnl.noi;
    }
    
    aggregation[operationType].revenue += totalRevenue;
    aggregation[operationType].noi += totalNoi;
    operationTypeNoi[operationType] += totalNoi;
  }
  
  // Calculate total NOI across all operation types
  const totalNoi = Object.values(operationTypeNoi).reduce((sum, noi) => sum + noi, 0);
  
  // Calculate valuation proportionally based on NOI contribution
  // Note: enterpriseValue (NPV) can be negative if initial investment exceeds cash flow returns
  // This is mathematically correct - a negative valuation indicates an unprofitable investment
  if (totalNoi > 0) {
    for (const operationType of Object.keys(aggregation) as OperationType[]) {
      const noiContribution = operationTypeNoi[operationType];
      // Only distribute valuation if this operation type has NOI contribution
      if (noiContribution !== 0) {
        const noiShare = noiContribution / totalNoi;
        // Distribute enterprise value proportionally based on NOI contribution
        aggregation[operationType].valuation = enterpriseValue * noiShare;
      }
      // If noiContribution === 0, valuation remains at 0 (already initialized)
    }
  } else if (totalNoi < 0) {
    // Handle negative total NOI (loss-making operations) - still distribute proportionally
    for (const operationType of Object.keys(aggregation) as OperationType[]) {
      const noiContribution = operationTypeNoi[operationType];
      // Only distribute valuation if this operation type has NOI contribution
      if (noiContribution !== 0) {
        const noiShare = noiContribution / totalNoi;
        aggregation[operationType].valuation = enterpriseValue * noiShare;
      }
      // If noiContribution === 0, valuation remains at 0 (already initialized)
    }
  }
  // If totalNoi === 0, valuations remain at 0 (already initialized)
  
  return aggregation;
}

/**
 * Calculates REaaS-specific metrics from full model output.
 * 
 * Filters operations where `isREaaS` is true and calculates:
 * - Total REaaS revenue
 * - REaaS revenue share (% of total revenue)
 * - REaaS NOI
 * 
 * @param output - Full model output from runFullModel
 * @param input - Full model input (used to access operation configs with isREaaS flag)
 * @returns REaaS metrics
 */
export function calculateReaasMetrics(
  output: FullModelOutput,
  input: FullModelInput
): ReaasMetrics {
  // Re-run scenario engine to get individual operation results
  const scenarioResult = runScenarioEngine(output.scenario);
  const { operations } = scenarioResult;
  
  let totalReaasRevenue = 0;
  let reaasNoi = 0;
  let totalRevenue = 0;
  
  // Calculate total revenue from consolidated P&L for revenue share calculation
  for (const pnl of output.consolidatedAnnualPnl) {
    totalRevenue += pnl.revenueTotal;
  }
  
  // Filter and aggregate REaaS operations
  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    const config = input.scenario.operations[i];
    
    // Check if operation is REaaS (default to false if not specified)
    const isREaaS = config.isREaaS ?? false;
    
    if (isREaaS) {
      // Sum revenue and NOI across all years (using Sponsor P&L)
      for (const annualPnl of operation.annualPnl) {
        // Calculate Sponsor P&L from Asset P&L
        const sponsorPnl = calculateSponsorCashFlow(annualPnl, config);
        totalReaasRevenue += sponsorPnl.revenueTotal;
        reaasNoi += sponsorPnl.noi;
      }
    }
  }
  
  // Calculate revenue share (percentage as decimal, 0..1)
  const reaasRevenueShare = totalRevenue > 0 ? totalReaasRevenue / totalRevenue : 0;
  
  return {
    totalReaasRevenue,
    reaasRevenueShare,
    reaasNoi,
  };
}

