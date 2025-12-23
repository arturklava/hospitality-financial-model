/**
 * React Hook for Running Monte Carlo Simulations in a Web Worker
 * 
 * Manages worker lifecycle, message handling, and progress tracking.
 * Prevents UI blocking during heavy simulation calculations.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { NamedScenario, SimulationConfig, SimulationResult } from '@domain/types';
import type { WorkerRequest, WorkerResponse } from '@workers/types';

/**
 * Simulation worker payload interface
 */
interface SimulationWorkerPayload {
  scenario: NamedScenario;
  config: SimulationConfig;
}

/**
 * Hook return type
 */
interface UseSimulationWorkerReturn {
  /** Run simulation asynchronously */
  runSimulation: (scenario: NamedScenario, config: SimulationConfig) => Promise<SimulationResult>;
  /** Whether a simulation is currently running */
  isLoading: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Error message if simulation failed */
  error: string | null;
}

/**
 * React hook for running Monte Carlo simulations in a Web Worker.
 * 
 * Features:
 * - Lazy worker instantiation
 * - Progress tracking
 * - Error handling
 * - Automatic cleanup on unmount
 * 
 * @returns Hook state and runSimulation function
 * 
 * @example
 * ```tsx
 * const { runSimulation, isLoading, progress } = useSimulationWorker();
 * 
 * const handleRun = async () => {
 *   try {
 *     const result = await runSimulation(scenario, { iterations: 1000 });
 *     console.log('Simulation complete:', result);
 *   } catch (error) {
 *     console.error('Simulation failed:', error);
 *   }
 * };
 * ```
 */
export function useSimulationWorker(): UseSimulationWorkerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Worker instance ref (lazy loaded)
  const workerRef = useRef<Worker | null>(null);
  // Pending request ID ref for tracking async responses
  const pendingRequestIdRef = useRef<string | null>(null);
  // Resolve/reject refs for Promise handling
  const resolveRef = useRef<((result: SimulationResult) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);

  /**
   * Initialize worker on first use (lazy loading)
   */
  const getWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      // Vite handles worker bundling automatically
      // Using new URL() pattern for ES module compatibility
      workerRef.current = new Worker(
        new URL('../../workers/simulation.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse<SimulationResult>>) => {
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
            // Simulation complete
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
            // Simulation failed
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
   * Run simulation in worker
   */
  const runSimulation = useCallback(
    async (scenario: NamedScenario, config: SimulationConfig): Promise<SimulationResult> => {
      // Reset state
      setIsLoading(true);
      setProgress(0);
      setError(null);

      // Generate unique request ID
      const requestId = `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      pendingRequestIdRef.current = requestId;

      // Create Promise for async result
      return new Promise<SimulationResult>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;

        try {
          const worker = getWorker();
          
          // Prepare request payload
          const payload: SimulationWorkerPayload = {
            scenario,
            config,
          };

          // Send request to worker
          const request: WorkerRequest<SimulationWorkerPayload> = {
            id: requestId,
            type: 'RUN_SIMULATION',
            payload,
          };

          worker.postMessage(request);
        } catch (err) {
          // Handle synchronous errors (e.g., worker creation failed)
          const errorMessage = err instanceof Error ? err.message : 'Failed to start simulation';
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
    runSimulation,
    isLoading,
    progress,
    error,
  };
}

