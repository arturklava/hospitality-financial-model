/**
 * React Hook for Running Sensitivity Analysis in a Web Worker
 * 
 * Manages worker lifecycle, message handling, and progress tracking.
 * Prevents UI blocking during heavy sensitivity calculations.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { NamedScenario, SensitivityConfig, SensitivityResult } from '@domain/types';
import type { WorkerRequest, WorkerResponse } from '@workers/types';

/**
 * Sensitivity worker payload interface
 */
interface SensitivityWorkerPayload {
  scenario: NamedScenario;
  config: Omit<SensitivityConfig, 'baseScenario'>;
}

/**
 * Hook return type
 */
interface UseSensitivityWorkerReturn {
  /** Run sensitivity analysis asynchronously */
  runSensitivity: (scenario: NamedScenario, config: Omit<SensitivityConfig, 'baseScenario'>) => Promise<SensitivityResult>;
  /** Whether a sensitivity analysis is currently running */
  isLoading: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Error message if analysis failed */
  error: string | null;
}

/**
 * React hook for running sensitivity analysis in a Web Worker.
 * 
 * Features:
 * - Lazy worker instantiation
 * - Progress tracking
 * - Error handling
 * - Automatic cleanup on unmount
 * 
 * @returns Hook state and runSensitivity function
 * 
 * @example
 * ```tsx
 * const { runSensitivity, isLoading, progress } = useSensitivityWorker();
 * 
 * const handleRun = async () => {
 *   try {
 *     const result = await runSensitivity(scenario, {
 *       variableX: 'occupancy',
 *       rangeX: { min: 0.7, max: 1.3, steps: 5 }
 *     });
 *     console.log('Analysis complete:', result);
 *   } catch (error) {
 *     console.error('Analysis failed:', error);
 *   }
 * };
 * ```
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
  const resolveRef = useRef<((result: SensitivityResult) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);

  /**
   * Initialize worker on first use (lazy loading)
   */
  const getWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      // Vite handles worker bundling automatically
      // Using new URL() pattern for ES module compatibility
      workerRef.current = new Worker(
        new URL('../../workers/sensitivity.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse<SensitivityResult>>) => {
        const response = event.data;
        const { id, type } = response;

        // Ignore messages for different requests
        if (id !== pendingRequestIdRef.current) {
          return;
        }

        switch (type) {
          case 'PROGRESS':
            // Update progress (0-100)
            if (response.progress !== undefined) {
              setProgress(response.progress);
            }
            break;

          case 'SUCCESS':
            // Analysis complete
            if (response.payload) {
              setProgress(100);
              setIsLoading(false);
              setError(null);
              
              if (resolveRef.current) {
                resolveRef.current(response.payload);
              }
              
              // Clean up refs
              pendingRequestIdRef.current = null;
              resolveRef.current = null;
              rejectRef.current = null;
            }
            break;

          case 'ERROR':
            // Analysis failed
            const errorMessage = response.error || 'Unknown error occurred';
            setError(errorMessage);
            setIsLoading(false);
            setProgress(0);
            
            if (rejectRef.current) {
              rejectRef.current(new Error(errorMessage));
            }
            
            // Clean up refs
            pendingRequestIdRef.current = null;
            resolveRef.current = null;
            rejectRef.current = null;
            break;
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (event) => {
        const errorMessage = event.message || 'Worker error occurred';
        setError(errorMessage);
        setIsLoading(false);
        setProgress(0);
        
        if (rejectRef.current) {
          rejectRef.current(new Error(errorMessage));
        }
        
        // Clean up refs
        pendingRequestIdRef.current = null;
        resolveRef.current = null;
        rejectRef.current = null;
      };
    }

    return workerRef.current;
  }, []);

  /**
   * Run sensitivity analysis in worker
   */
  const runSensitivity = useCallback(
    async (scenario: NamedScenario, config: Omit<SensitivityConfig, 'baseScenario'>): Promise<SensitivityResult> => {
      // Reset state
      setIsLoading(true);
      setProgress(0);
      setError(null);

      // Generate unique request ID
      const requestId = `sens-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      pendingRequestIdRef.current = requestId;

      // Create Promise for async result
      return new Promise<SensitivityResult>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;

        try {
          const worker = getWorker();
          
          // Prepare request payload
          const payload: SensitivityWorkerPayload = {
            scenario,
            config,
          };

          // Send request to worker
          const request: WorkerRequest<SensitivityWorkerPayload> = {
            id: requestId,
            type: 'RUN_SENSITIVITY',
            payload,
          };

          worker.postMessage(request);
        } catch (err) {
          // Handle synchronous errors (e.g., worker creation failed)
          const errorMessage = err instanceof Error ? err.message : 'Failed to start sensitivity analysis';
          setError(errorMessage);
          setIsLoading(false);
          setProgress(0);
          
          pendingRequestIdRef.current = null;
          resolveRef.current = null;
          rejectRef.current = null;
          
          reject(new Error(errorMessage));
        }
      });
    },
    [getWorker]
  );

  /**
   * Cleanup: terminate worker on unmount
   */
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return {
    runSensitivity,
    isLoading,
    progress,
    error,
  };
}

