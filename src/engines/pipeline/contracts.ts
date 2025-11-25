import type {
  CapitalEngineResult,
  ConsolidatedAnnualPnl,
  ProjectEngineResult,
  ProjectScenario,
} from '@domain/types';
import type { ScenarioEngineResult } from '@engines/scenario/scenarioEngine';

function findMissingYearIndex(
  entries: { yearIndex: number }[],
  expectedYears: number
): number | null {
  for (let i = 0; i < expectedYears; i++) {
    if (!entries.some((entry) => entry.yearIndex === i)) {
      return i;
    }
  }
  return null;
}

function assertSequentialYearIndexes(
  label: string,
  entries: { yearIndex: number }[],
  expectedYears: number
): void {
  const missingYear = findMissingYearIndex(entries, expectedYears);
  if (missingYear !== null) {
    throw new Error(
      `${label} contract violation: missing yearIndex ${missingYear} in series of length ${expectedYears}.`
    );
  }
}

export function validateScenarioToProjectContract(
  scenario: ProjectScenario,
  scenarioResult: ScenarioEngineResult
): void {
  const expectedYears = scenario.horizonYears;
  const annualCount = scenarioResult.consolidatedAnnualPnl.length;
  if (annualCount !== expectedYears) {
    throw new Error(
      `Scenario engine contract violation: expected ${expectedYears} consolidated annual periods for scenario ${scenario.id} but received ${annualCount}.`
    );
  }

  assertSequentialYearIndexes(
    'Scenario engine',
    scenarioResult.consolidatedAnnualPnl,
    expectedYears
  );

  const monthlyCount = scenarioResult.consolidatedMonthlyPnl.length;
  const expectedMonths = expectedYears * 12;
  if (monthlyCount !== expectedMonths) {
    throw new Error(
      `Scenario engine contract violation: expected ${expectedMonths} consolidated monthly periods for scenario ${scenario.id} but received ${monthlyCount}.`
    );
  }
}

export function validateProjectToCapitalContract(
  consolidatedAnnualPnl: ConsolidatedAnnualPnl[],
  projectResult: ProjectEngineResult
): void {
  const expectedYears = consolidatedAnnualPnl.length;
  const ufcfYears = projectResult.unleveredFcf.length;
  if (ufcfYears !== expectedYears) {
    throw new Error(
      `Project engine contract violation: expected ${expectedYears} years of unlevered FCF to match consolidated P&L but received ${ufcfYears}.`
    );
  }

  assertSequentialYearIndexes('Project engine', projectResult.unleveredFcf, expectedYears);
}

export function validateCapitalToWaterfallContract(
  expectedYears: number,
  capitalResult: CapitalEngineResult
): void {
  const leveredYears = capitalResult.leveredFcfByYear.length;
  if (leveredYears !== expectedYears) {
    throw new Error(
      `Capital engine contract violation: expected ${expectedYears} years of levered FCF but received ${leveredYears}.`
    );
  }

  assertSequentialYearIndexes('Capital engine', capitalResult.leveredFcfByYear, expectedYears);

  const ownerFlowsCount = capitalResult.ownerLeveredCashFlows.length;
  const expectedOwnerFlowYears = expectedYears + 1; // Year 0 + projection horizon
  if (ownerFlowsCount !== expectedOwnerFlowYears) {
    throw new Error(
      `Capital engine contract violation: expected ${expectedOwnerFlowYears} owner levered cash flow entries (including Year 0) but received ${ownerFlowsCount}.`
    );
  }
}
