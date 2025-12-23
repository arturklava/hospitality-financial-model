/**
 * React hook for running the full financial model pipeline.
 * Manages input state and computes output using runFullModel.
 * Exposes error state for UI feedback on calculation failures.
 */

import { useState, useRef, useEffect } from 'react';
// import { runFullModel } from '@engines/pipeline/modelPipeline'; // Kept for types or fallback if needed, though mostly moved to worker
import type {
  FullModelInput,
  FullModelOutput,
} from '@domain/types';
import { createSampleModelConfig } from '../state/sampleData';
import { useModelStatus } from '../contexts/ModelStatusContext';
import type { WorkerRequest, WorkerResponse } from '../../workers/types';

export interface UseFullModelReturn {
  input: FullModelInput;
  setInput: React.Dispatch<React.SetStateAction<FullModelInput>>;
  output: FullModelOutput | null;
  error: Error | null;
}

export function useFullModel(): UseFullModelReturn {
  const [input, setInput] = useState<FullModelInput>(() => {
    const sample = createSampleModelConfig();
    return {
      scenario: sample.scenario,
      projectConfig: sample.projectConfig,
      capitalConfig: sample.capitalConfig,
      waterfallConfig: sample.waterfallConfig,
    };
  });

  const [output, setOutput] = useState<FullModelOutput | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Async State Management
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<number>(0);
  const { setStatus } = useModelStatus();

  // Initialize Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/simulation.worker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = (event: MessageEvent<WorkerResponse<FullModelOutput>>) => {
      const { requestId, type, payload, error } = event.data;

      // DISCARD STALE RESPONSES
      // If the response ID doesn't match the latest request ID, ignore it.
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (type === 'SUCCESS' && payload) {
        setOutput(payload);
        setError(null);
        setStatus('idle');
      } else if (type === 'ERROR') {
        setError(new Error(error || 'Unknown worker error'));
        setStatus('idle');
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [setStatus]);

  // Debounced Calculation Trigger
  useEffect(() => {
    // Increment Request ID immediately to invalidate any pending previous requests
    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;

    setStatus('syncing');

    const timeoutId = setTimeout(() => {
      if (!workerRef.current) return;

      setStatus('computing');

      const request: WorkerRequest<FullModelInput> = {
        id: crypto.randomUUID(),
        requestId: nextRequestId,
        type: 'RUN_FULL_MODEL',
        payload: input,
      };

      workerRef.current.postMessage(request);
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timeoutId);
    };
  }, [input, setStatus]);

  return {
    input,
    setInput,
    output,
    error,
  };
}

