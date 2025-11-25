import type {
  CapitalEngineResult,
  CapitalStructureConfig,
  ConsolidatedAnnualPnl,
  ConsolidatedMonthlyPnl,
  ProjectConfig,
  ProjectEngineResult,
  WaterfallConfig,
  WaterfallResult,
} from '@domain/types';
import type { ScenarioEngineResult } from '@engines/scenario/scenarioEngine';

/**
 * Ordered list of pipeline stages that compose the canonical flow.
 */
export const PIPELINE_STAGE_SEQUENCE = ['scenario', 'project', 'capital', 'waterfall'] as const;

export type PipelineStageId = (typeof PIPELINE_STAGE_SEQUENCE)[number];

export interface PipelineSegmentMap {
  scenario: ScenarioEngineResult;
  project: ProjectEngineResult;
  capital: CapitalEngineResult;
  waterfall: WaterfallResult;
}

export type PipelineCacheSegment = keyof PipelineSegmentMap;

export interface StageTelemetryEntry {
  fromCache: boolean;
  hash: string;
  durationMs: number;
  timestamp: number;
}

export type StageTelemetryMap = Partial<Record<PipelineStageId, StageTelemetryEntry>>;

export interface PipelineStageFailure {
  stage: PipelineStageId;
  code: string;
  message: string;
  hash: string;
  durationMs: number;
  details?: Record<string, unknown>;
}

export interface PipelineCacheInfo {
  hits: PipelineStageId[];
  misses: PipelineStageId[];
  lastHashes: Partial<Record<PipelineStageId, string>>;
}

export type StageRunner<T> = () => T;
export type AsyncStageRunner<T> = () => Promise<T> | T;

export interface ScenarioStageInput {
  scenario: ScenarioEngineResult;
}

export interface ProjectStageInput {
  consolidatedAnnualPnl: ConsolidatedAnnualPnl[];
  projectConfig: ProjectConfig;
  capitalConfig: CapitalStructureConfig;
}

export interface CapitalStageInput {
  consolidatedAnnualPnl: ConsolidatedAnnualPnl[];
  unleveredFcf: ProjectEngineResult['unleveredFcf'];
  capitalConfig: CapitalStructureConfig;
  consolidatedMonthlyPnl?: ConsolidatedMonthlyPnl[];
}

export interface WaterfallStageInput {
  ownerLeveredCashFlows: number[];
  waterfallConfig: WaterfallConfig;
}

export type PipelineRunStatus = 'success' | 'partial_failure';

/**
 * Deterministic, order-insensitive stringification for hashing inputs.
 * Produces a short hexadecimal hash along with payload length to reduce collisions.
 */
export function stableHash(value: unknown): string {
  const serialized = stableStringify(value);
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const normalized = (hash >>> 0).toString(16);
  return `${serialized.length.toString(16)}:${normalized}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stableStringify(item)).join(',');
    return `[${items}]`;
  }

  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
  return `{${entries.join(',')}}`;
}

export function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in (value as Record<string, unknown>) &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}


