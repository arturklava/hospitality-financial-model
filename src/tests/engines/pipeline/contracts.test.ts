import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  buildSampleCapitalConfig,
  buildSampleProjectConfig,
  buildSampleScenario,
  buildSampleWaterfallConfig,
} from '../../../sampleData';
import type {
  ConsolidatedAnnualPnl,
  ConsolidatedMonthlyPnl,
  ProjectEngineResult,
} from '@domain/types';

const registry = vi.hoisted(() => ({
  scenarioReturn: { value: undefined as any },
  projectReturn: { value: undefined as any },
  capitalReturn: { value: undefined as any },
  waterfallReturn: { value: undefined as any },
  scenarioSpy: vi.fn(),
  projectSpy: vi.fn(),
  capitalSpy: vi.fn(),
  waterfallSpy: vi.fn(),
}));

vi.mock('@engines/scenario/scenarioEngine', async () => {
  const actual = await vi.importActual<typeof import('@engines/scenario/scenarioEngine')>(
    '@engines/scenario/scenarioEngine'
  );

  registry.scenarioSpy.mockImplementation((...args) =>
    registry.scenarioReturn.value ?? actual.runScenarioEngine(...args)
  );

  return {
    ...actual,
    runScenarioEngine: registry.scenarioSpy,
  };
});

vi.mock('@engines/project/projectEngine', async () => {
  const actual = await vi.importActual<typeof import('@engines/project/projectEngine')>(
    '@engines/project/projectEngine'
  );

  registry.projectSpy.mockImplementation((...args) =>
    registry.projectReturn.value ?? actual.runProjectEngine(...args)
  );

  return {
    ...actual,
    runProjectEngine: registry.projectSpy,
  };
});

vi.mock('@engines/capital/capitalEngine', async () => {
  const actual = await vi.importActual<typeof import('@engines/capital/capitalEngine')>(
    '@engines/capital/capitalEngine'
  );

  registry.capitalSpy.mockImplementation((...args) =>
    registry.capitalReturn.value ?? actual.runCapitalEngine(...args)
  );

  return {
    ...actual,
    runCapitalEngine: registry.capitalSpy,
  };
});

vi.mock('@engines/waterfall/waterfallEngine', async () => {
  const actual = await vi.importActual<typeof import('@engines/waterfall/waterfallEngine')>(
    '@engines/waterfall/waterfallEngine'
  );

  registry.waterfallSpy.mockImplementation((...args) =>
    registry.waterfallReturn.value ?? actual.applyEquityWaterfall(...args)
  );

  return {
    ...actual,
    applyEquityWaterfall: registry.waterfallSpy,
  };
});

function buildAnnualPnl(yearIndex: number): ConsolidatedAnnualPnl {
  return {
    yearIndex,
    revenueTotal: 0,
    departmentalExpenses: 0,
    gop: 0,
    undistributedExpenses: 0,
    noi: 0,
    cogsTotal: 0,
    opexTotal: 0,
    ebitda: 0,
    maintenanceCapex: 0,
    cashFlow: 0,
  };
}

function buildMonthlyPnl(yearIndex: number, monthIndex: number): ConsolidatedMonthlyPnl {
  return {
    yearIndex,
    monthIndex,
    monthNumber: yearIndex * 12 + monthIndex,
    revenueTotal: 0,
    departmentalExpenses: 0,
    gop: 0,
    undistributedExpenses: 0,
    noi: 0,
    maintenanceCapex: 0,
    cashFlow: 0,
  };
}

afterEach(() => {
  registry.scenarioReturn.value = undefined;
  registry.projectReturn.value = undefined;
  registry.capitalReturn.value = undefined;
  registry.waterfallReturn.value = undefined;
  vi.clearAllMocks();
  vi.resetModules();
});

describe('Pipeline contract validation', () => {
  it('throws when scenario engine returns fewer years than horizon', async () => {
    const scenario = buildSampleScenario();

    registry.scenarioReturn.value = {
      ok: true,
      data: {
        operations: [],
        consolidatedAnnualPnl: [buildAnnualPnl(0)],
        consolidatedMonthlyPnl: Array.from({ length: scenario.horizonYears * 12 }, (_, idx) =>
          buildMonthlyPnl(Math.floor(idx / 12), idx % 12)
        ),
      },
    };

    const { runFullPipeline } = await import('@engines/pipeline/fullPipeline');

    expect(() =>
      runFullPipeline({
        scenario,
        projectConfig: buildSampleProjectConfig(),
        capitalConfig: buildSampleCapitalConfig(),
        waterfallConfig: buildSampleWaterfallConfig(),
      })
    ).toThrow(/Scenario engine contract violation/);
    expect(registry.projectSpy).not.toHaveBeenCalled();
  });

  it('throws when project engine returns mismatched unlevered FCF years', async () => {
    const scenario = buildSampleScenario();
    const annualPnl = Array.from({ length: scenario.horizonYears }, (_, yearIndex) => buildAnnualPnl(yearIndex));
    const monthlyPnl = Array.from({ length: scenario.horizonYears * 12 }, (_, idx) =>
      buildMonthlyPnl(Math.floor(idx / 12), idx % 12)
    );

    registry.scenarioReturn.value = {
      ok: true,
      data: {
        operations: [],
        consolidatedAnnualPnl: annualPnl,
        consolidatedMonthlyPnl: monthlyPnl,
      },
    };

    registry.projectReturn.value = {
      ok: true,
      data: {
        unleveredFcf: [buildAnnualPnl(0), buildAnnualPnl(1)] as unknown as ProjectEngineResult['unleveredFcf'],
        dcfValuation: {
          discountRate: 0.1,
          terminalGrowthRate: 0.02,
          cashFlows: [],
          npv: 0,
          enterpriseValue: 0,
          equityValue: 0,
          terminalValue: 0,
        },
        projectKpis: {
          npv: 0,
          unleveredIrr: null,
          equityMultiple: 0,
          paybackPeriod: null,
          wacc: null,
        },
      },
    };

    const { runFullPipeline } = await import('@engines/pipeline/fullPipeline');

    expect(() =>
      runFullPipeline({
        scenario,
        projectConfig: buildSampleProjectConfig(),
        capitalConfig: buildSampleCapitalConfig(),
        waterfallConfig: buildSampleWaterfallConfig(),
      })
    ).toThrow(/Project engine contract violation/);
    expect(registry.capitalSpy).not.toHaveBeenCalled();
  });

  it('keeps the happy path unchanged with real engines', async () => {
    const scenario = buildSampleScenario();
    const projectConfig = buildSampleProjectConfig();
    const capitalConfig = buildSampleCapitalConfig();
    const waterfallConfig = buildSampleWaterfallConfig();

    const { runFullPipeline } = await import('@engines/pipeline/fullPipeline');
    const result = runFullPipeline({
      scenario,
      projectConfig,
      capitalConfig,
      waterfallConfig,
    });

    expect(result.waterfallResult.ownerCashFlows.length).toBeGreaterThan(0);
    expect(result.capitalResult.leveredFcfByYear.length).toBe(scenario.horizonYears);
  });
});
