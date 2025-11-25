/**
 * Full model pipeline orchestrator.
 * * This module orchestrates the complete financial modeling flow:
 * Operations → Scenario → Project (UFCF + DCF) → Capital (Debt + Levered FCF) → Waterfall (LP/GP)
 * * Pure function: no side effects, no global state, fully deterministic.
 */

import type {
  FullModelInput,
  FullModelOutput,
  ConsolidatedAnnualPnl,
  ProjectEngineResult,
  CapitalEngineResult,
  WaterfallResult,
  AnnualPnl,
} from '@domain/types';

export type {
  FullModelInput,
  FullModelOutput,
  ConsolidatedAnnualPnl,
  ProjectEngineResult,
  CapitalEngineResult,
  WaterfallResult,
};
import { runScenarioEngine } from '@engines/scenario/scenarioEngine';
import { runProjectEngine } from '@engines/project/projectEngine';
import { runCapitalEngine } from '@engines/capital/capitalEngine';
import { applyEquityWaterfall } from '@engines/waterfall/waterfallEngine';

/**
 * Full top-down financial pipeline:
 * Operations → Scenario → Project (UFCF + DCF) → Capital (Debt + Levered FCF) → Waterfall (LP/GP).
 * * Pure function: no side effects, no global state.
 * * @param input - Complete input configuration for the financial model
 * @returns Full model output with all engine results
 * @throws Error if any engine throws an error (errors are propagated, not swallowed)
 */
export function runFullModel(input: FullModelInput): FullModelOutput {
  const { scenario, projectConfig, capitalConfig, waterfallConfig } = input;

  // 1. Scenario engine: consolidate operations into annual P&L
  const scenarioResult = runScenarioEngine(scenario);
  if (!scenarioResult.ok) {
    throw new Error(`Scenario engine failed: ${scenarioResult.error.message}`);
  }

  const scenarioData = scenarioResult.data;
  const consolidated: ConsolidatedAnnualPnl[] = scenarioData.consolidatedAnnualPnl;
  const allOperationsAnnualPnl: AnnualPnl[] = scenarioData.operations.flatMap((op) => op.annualPnl);

  // 2. Project engine: UFCF + DCF valuation + project KPIs
  // v0.7: Pass capitalConfig to enable WACC calculation
  const projectResult = runProjectEngine(
    consolidated,
    projectConfig,
    capitalConfig
  );

  if (!projectResult.ok) {
    throw new Error(`Project engine failed: ${projectResult.error.message}`);
  }

  // 3. Capital engine: debt schedule + levered FCF
  // v2.2: Pass monthly P&L for monthly debt schedule and cash flow calculation
  const capitalResult: CapitalEngineResult = runCapitalEngine(
    consolidated,
    projectResult.data.unleveredFcf,
    capitalConfig,
    scenarioData.consolidatedMonthlyPnl
  );

  // 4. Waterfall engine: LP/GP equity waterfall using ownerLeveredCashFlows
  const waterfallResult: WaterfallResult = applyEquityWaterfall(
    capitalResult.ownerLeveredCashFlows,
    waterfallConfig
  );

  // 5. Return full pipeline result
  return {
    scenario,
    consolidatedAnnualPnl: consolidated,
    project: projectResult.data,
    capital: capitalResult,
    waterfall: waterfallResult,
    operationsResult: {
      annualPnl: allOperationsAnnualPnl
    }
  };
}