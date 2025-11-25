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

function formatModelError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Model run failed due to an unexpected error.';
}

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

  const { output, errorMessage } = useMemo(() => {
    try {
      return {
        output: runFullModel(input),
        errorMessage: null,
      };
    } catch (error) {
      return {
        output: null,
        errorMessage: formatModelError(error),
      };
    }
  }, [input]);

  return {
    input,
    setInput,
    output,
    errorMessage,
  };
}

