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
  AnnualPnl, // Importante: Certifique-se de que AnnualPnl está sendo importado aqui
} from '@domain/types';

export type {
  FullModelInput,
  FullModelOutput,
  ConsolidatedAnnualPnl,
  ProjectEngineResult,
  CapitalEngineResult,
  WaterfallResult,
};
import { runScenarioEngine } from '@engines/scenario/scenarioEngine'; //
import { runProjectEngine } from '@engines/project/projectEngine'; //
import { runCapitalEngine } from '@engines/capital/capitalEngine'; //
import { applyEquityWaterfall } from '@engines/waterfall/waterfallEngine'; //

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
  const consolidated: ConsolidatedAnnualPnl[] = scenarioResult.consolidatedAnnualPnl;

  // --- CORREÇÃO: DECLARAÇÃO DA VARIÁVEL FALTANTE ---
  // Esta linha extrai os P&Ls individuais de cada operação para serem usados no exportador
  const allOperationsAnnualPnl: AnnualPnl[] = scenarioResult.operations.flatMap(op => op.annualPnl);

  // 2. Project engine: UFCF + DCF valuation + project KPIs
  // v0.7: Pass capitalConfig to enable WACC calculation
  const projectResult: ProjectEngineResult = runProjectEngine(
    consolidated,
    projectConfig,
    capitalConfig
  );

  // 3. Capital engine: debt schedule + levered FCF
  // v2.2: Pass monthly P&L for monthly debt schedule and cash flow calculation
  const capitalResult: CapitalEngineResult = runCapitalEngine(
    consolidated,
    projectResult.unleveredFcf,
    capitalConfig,
    scenarioResult.consolidatedMonthlyPnl
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
    project: projectResult,
    capital: capitalResult,
    waterfall: waterfallResult,
    
    // Agora a variável 'allOperationsAnnualPnl' declarada acima é usada aqui
    operationsResult: {
      annualPnl: allOperationsAnnualPnl
    }
  };
}