/**
 * React hook for running the full financial model pipeline.
 * Manages input state and computes output using runFullModel.
 */

import { useMemo, useState } from 'react';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import type {
  FullModelInput,
  FullModelOutput,
} from '@domain/types';
import { createSampleModelConfig } from '../state/sampleData';

export function useFullModel() {
  const [input, setInput] = useState<FullModelInput>(() => {
    const sample = createSampleModelConfig();
    return {
      scenario: sample.scenario,
      projectConfig: sample.projectConfig,
      capitalConfig: sample.capitalConfig,
      waterfallConfig: sample.waterfallConfig,
    };
  });

  const output: FullModelOutput | null = useMemo(() => {
    try {
      return runFullModel(input);
    } catch (e) {
      // For now, fail silently and return null; later we can add proper error UI.
      console.error('Full model failed', e);
      return null;
    }
  }, [input]);

  return {
    input,
    setInput,
    output,
  };
}

