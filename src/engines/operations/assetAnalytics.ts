/**
 * Asset analytics engine (v3.2: Live Asset Metrics).
 * 
 * Provides fast, synchronous calculation of asset-level KPIs from model output.
 * Extracts operation-specific metrics for KPI card display.
 */

import type {
  OperationConfig,
  FullModelOutput,
  AssetKpis,
  HotelConfig,
} from '@domain/types';
import { runScenarioEngine } from '@engines/scenario/scenarioEngine';
import { calculateSponsorCashFlow } from './sponsorLogic';

/**
 * Calculates asset-level KPIs for a specific operation from model output.
 * 
 * Extracts operation-specific revenue, NOI, margin, and RevPAR (for hotels)
 * from the full model output to ensure consistency with the model run.
 * 
 * @param operation - Operation configuration to calculate metrics for
 * @param modelOutput - Full model output from runFullModel
 * @returns Asset KPIs (totalRevenue, totalNoi, marginPct, revPar for hotels)
 * @throws Error if operation is not found in the model output
 */
export function calculateAssetMetrics(
  operation: OperationConfig,
  modelOutput: FullModelOutput
): AssetKpis {
  // Re-run scenario engine to get individual operation results
  // This ensures we have access to operation-specific P&L data
  const scenarioResult = runScenarioEngine(modelOutput.scenario);
  if (!scenarioResult.ok) {
    throw new Error('Scenario engine failed while computing asset metrics');
  }

  const { operations } = scenarioResult.data;
  
  // Find the operation by matching ID
  const operationIndex = modelOutput.scenario.operations.findIndex(
    (op) => op.id === operation.id
  );
  
  if (operationIndex === -1) {
    throw new Error(`Operation with id "${operation.id}" not found in model output`);
  }
  
  const operationResult = operations[operationIndex];
  const operationConfig = modelOutput.scenario.operations[operationIndex];
  
  // Sum revenue and NOI across all years using Sponsor P&L
  let totalRevenue = 0;
  let totalNoi = 0;
  let totalRoomRevenue = 0; // For RevPAR calculation (hotels only)
  
  for (const annualPnl of operationResult.annualPnl) {
    // Calculate Sponsor P&L from Asset P&L (handles ownership models)
    const sponsorPnl = calculateSponsorCashFlow(annualPnl, operationConfig);
    totalRevenue += sponsorPnl.revenueTotal;
    totalNoi += sponsorPnl.noi;
  }
  
  // Calculate margin percentage (handle division by zero)
  const marginPct = totalRevenue > 0 ? (totalNoi / totalRevenue) * 100 : 0;
  
  // Calculate RevPAR for hotel operations
  // Note: RevPAR is an operational metric, so we use asset-level room revenue
  // (not sponsor P&L) to reflect actual hotel performance
  let revPar: number | undefined = undefined;
  if (operation.operationType === 'HOTEL') {
    // Sum room revenue from monthly P&L (asset-level, not sponsor)
    // This reflects the actual hotel's room revenue performance
    for (const monthlyPnl of operationResult.monthlyPnl) {
      totalRoomRevenue += monthlyPnl.roomRevenue;
    }
    
    // Calculate RevPAR: total room revenue / (keys * days in horizon)
    const hotelConfig = operationConfig as HotelConfig;
    const daysInHorizon = hotelConfig.horizonYears * 365;
    const availableRoomNights = hotelConfig.keys * daysInHorizon;
    
    if (availableRoomNights > 0) {
      revPar = totalRoomRevenue / availableRoomNights;
    } else {
      revPar = 0;
    }
  }
  
  return {
    totalRevenue,
    totalNoi,
    marginPct,
    revPar,
  };
}

