import { PIPELINE_STAGE_SEQUENCE, type PipelineCacheSegment, type PipelineSegmentMap } from './types';

interface CacheEntry<T> {
  hash: string;
  value: T;
  timestamp: number;
}

type CacheStore = {
  [K in PipelineCacheSegment]?: CacheEntry<PipelineSegmentMap[K]>;
};

const DOWNSTREAM_DEPENDENCIES: Record<PipelineCacheSegment, PipelineCacheSegment[]> = {
  scenario: ['project', 'capital', 'waterfall'],
  project: ['capital', 'waterfall'],
  capital: ['waterfall'],
  waterfall: [],
};

export class PipelineCache {
  private readonly store: CacheStore = {};

  get<K extends PipelineCacheSegment>(segment: K, hash: string): PipelineSegmentMap[K] | undefined {
    const entry = this.store[segment];
    if (!entry || entry.hash !== hash) {
      return undefined;
    }
    return entry.value;
  }

  set<K extends PipelineCacheSegment>(segment: K, hash: string, value: PipelineSegmentMap[K]): void {
    const previous = this.store[segment];
    this.store[segment] = {
      hash,
      value,
      timestamp: Date.now(),
    };
    if (!previous || previous.hash !== hash) {
      this.invalidateDependents(segment);
    }
  }

  invalidate(segment?: PipelineCacheSegment): void {
    if (!segment) {
      for (const key of PIPELINE_STAGE_SEQUENCE) {
        delete this.store[key];
      }
      return;
    }
    delete this.store[segment];
    this.invalidateDependents(segment);
  }

  snapshot(): CacheStore {
    return { ...this.store };
  }

  private invalidateDependents(segment: PipelineCacheSegment): void {
    const dependents = DOWNSTREAM_DEPENDENCIES[segment];
    for (const dependent of dependents) {
      delete this.store[dependent];
      this.invalidateDependents(dependent);
    }
  }
}


