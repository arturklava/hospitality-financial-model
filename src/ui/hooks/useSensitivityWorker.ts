import { useEffect, useRef, useState, useCallback } from 'react';
import type { NamedScenario, SensitivityConfig, SensitivityResult, FullModelInput } from '@domain/types';
import type { WorkerRequest, WorkerResponse } from '@workers/types';
import type { ScenarioTriadResult } from '@engines/analysis/scenarioComparison';

/**
 * Hook return type
 */
interface UseSensitivityWorkerReturn {
  /** Run sensitivity analysis asynchronously */
  runSensitivity: (scenario: NamedScenario, config: Omit<SensitivityConfig, 'baseScenario'>) => Promise<SensitivityResult>;
  /** Run scenario triad analysis asynchronously */
  runScenarioTriad: (input: FullModelInput, stressLevel: number) => Promise<ScenarioTriadResult>;
  /** Whether a calculation is currently running */
  isLoading: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Error message if calculation failed */
  error: string | null;
}

const WORKER_TIMEOUT_MS = 15000; // 15 seconds safety timeout

/**
 * React hook for running sensitivity and triad analysis in a Web Worker.
 */
export function useSensitivityWorker(): UseSensitivityWorkerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Worker instance ref (lazy loaded)
  const workerRef = useRef<Worker | null>(null);
  // Pending request ID ref for tracking async responses
  const pendingRequestIdRef = useRef<string | null>(null);
  // Resolve/reject refs for Promise handling
  const resolveRef = useRef<((result: any) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);
  // Timeout ref
  const timeoutRef = useRef<any>(null);

  /**
   * Cleanup worker and pending state
   */
  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingRequestIdRef.current = null;
    resolveRef.current = null;
    rejectRef.current = null;
  }, []);

  /**
   * Initialize worker on first use (lazy loading)
   */
  const getWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../../workers/sensitivity.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse<any>>) => {
        const response = event.data;
        const { id, type } = response;

        // Ignore messages for different requests
        if (id !== pendingRequestIdRef.current) {
          return;
        }

        switch (type) {
          case 'PROGRESS':
            if (response.progress !== undefined) {
              setProgress(response.progress);
            }
            break;

          case 'SUCCESS':
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setProgress(100);
            setIsLoading(false);
            setError(null);

            if (resolveRef.current) {
              resolveRef.current(response.payload);
            }
            pendingRequestIdRef.current = null;
            break;

          case 'ERROR':
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            const errorMessage = response.error || 'Cálculo falhou';
            setError(errorMessage);
            setIsLoading(false);
            setProgress(0);

            if (rejectRef.current) {
              rejectRef.current(new Error(errorMessage));
            }
            pendingRequestIdRef.current = null;
            break;
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (event) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const errorMessage = event.message || 'Worker error occurred';
        setError(errorMessage);
        setIsLoading(false);
        setProgress(0);

        if (rejectRef.current) {
          rejectRef.current(new Error(errorMessage));
        }
        cleanup();
      };
    }

    return workerRef.current;
  }, [cleanup]);

  /**
   * Internal executor for worker requests
   */
  const execute = useCallback(
    async (type: string, payload: any): Promise<any> => {
      // Stale-While-Revalidate: Terminate previous calculation if one is running
      if (isLoading) {
        cleanup();
      }

      setIsLoading(true);
      setProgress(0);
      setError(null);

      const requestId = `sens-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      pendingRequestIdRef.current = requestId;

      return new Promise<any>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;

        // Set safety timeout
        timeoutRef.current = setTimeout(() => {
          const timeoutError = 'Cálculo falhou por timeout (15s). Tente reduzir a complexidade.';
          setError(timeoutError);
          setIsLoading(false);
          cleanup();
          reject(new Error(timeoutError));
        }, WORKER_TIMEOUT_MS);

        try {
          const worker = getWorker();
          const request: WorkerRequest<any> = {
            id: requestId,
            type,
            payload,
          };
          worker.postMessage(request);
        } catch (err) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          const errorMessage = err instanceof Error ? err.message : 'Falha ao iniciar cálculo';
          setError(errorMessage);
          setIsLoading(false);
          reject(new Error(errorMessage));
        }
      });
    },
    [isLoading, getWorker, cleanup]
  );

  /**
   * Run sensitivity analysis in worker
   */
  const runSensitivity = useCallback(
    (scenario: NamedScenario, config: Omit<SensitivityConfig, 'baseScenario'>): Promise<SensitivityResult> => {
      return execute('RUN_SENSITIVITY', { scenario, config });
    },
    [execute]
  );

  /**
   * Run scenario triad analysis in worker
   */
  const runScenarioTriad = useCallback(
    (input: FullModelInput, stressLevel: number): Promise<ScenarioTriadResult> => {
      return execute('RUN_SCENARIO_TRIAD', { input, stressLevel });
    },
    [execute]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    runSensitivity,
    runScenarioTriad,
    isLoading,
    progress,
    error,
  };
}

