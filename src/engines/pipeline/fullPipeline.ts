/**
 * Full pipeline orchestrator.
 * Runs the complete financial modeling pipeline end-to-end:
 * Operations → Scenario → Project → Capital → Waterfall
 */

import type {
  ProjectScenario,
  ProjectConfig,
  CapitalStructureConfig,
  WaterfallConfig,
  ProjectEngineResult,
  CapitalEngineResult,
  WaterfallResult,
} from '@domain/types';
import { runScenarioEngine, type ScenarioEngineResult } from '@engines/scenario/scenarioEngine';
import { runProjectEngine } from '@engines/project/projectEngine';
import { runCapitalEngine } from '@engines/capital/capitalEngine';
import { applyEquityWaterfall } from '@engines/waterfall/waterfallEngine';

export interface FullPipelineInput {
  scenario: ProjectScenario;
  projectConfig: ProjectConfig;
  capitalConfig: CapitalStructureConfig;
  waterfallConfig: WaterfallConfig;
}

export interface FullPipelineResult {
  scenarioResult: ScenarioEngineResult;
  projectResult: ProjectEngineResult;
  capitalResult: CapitalEngineResult;
  waterfallResult: WaterfallResult;
}

/**
 * Runs the full financial modeling pipeline end-to-end.
 *
 * This function orchestrates all engines in sequence:
 * 1. Scenario Engine: Consolidates operations into annual P&L
 * 2. Project Engine: Calculates unlevered FCF, DCF valuation, and project KPIs
 * 3. Capital Engine: Calculates debt schedule, levered FCF, and debt KPIs
 * 4. Waterfall Engine: Splits equity cash flows among partners
 *
 * @param input - Pipeline input configuration
 * @returns Complete pipeline results from all engines
 * @throws Error if any engine throws an error (errors are propagated, not swallowed)
 */
export function runFullPipeline(input: FullPipelineInput): FullPipelineResult {
  // 1) Run scenario engine: Operations → Consolidated Annual P&L
  const scenarioResult = runScenarioEngine(input.scenario);

  // 2) Run project engine: Consolidated P&L → Unlevered FCF + DCF + Project KPIs
  // v0.7: Pass capitalConfig to enable WACC calculation
  const projectResult = runProjectEngine(
    scenarioResult.consolidatedAnnualPnl,
    input.projectConfig,
    input.capitalConfig
  );

  // 3) Run capital engine: Consolidated P&L + Unlevered FCF → Debt Schedule + Levered FCF
  // v2.2: Pass monthly P&L for monthly debt schedule and cash flow calculation
  const capitalResult = runCapitalEngine(
    scenarioResult.consolidatedAnnualPnl,
    projectResult.unleveredFcf,
    input.capitalConfig,
    scenarioResult.consolidatedMonthlyPnl
  );

  // 4) Run waterfall engine: Owner Levered Cash Flows → Partner Distributions
  const waterfallResult = applyEquityWaterfall(
    capitalResult.ownerLeveredCashFlows,
    input.waterfallConfig
  );

  return {
    scenarioResult,
    projectResult,
    capitalResult,
    waterfallResult,
  };
}

