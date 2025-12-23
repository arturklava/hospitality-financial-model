/**
 * Simulation Worker
 * 
 * Web Worker for running Monte Carlo simulations off the main thread.
 * Handles progress reporting and error propagation.
 */

import { runMonteCarlo } from '@engines/analysis/simulationEngine';
import { postProgress } from './workerUtils';
import type { WorkerRequest, WorkerResponse } from './types';
import type { NamedScenario, SimulationConfig, SimulationResult } from '@domain/types';

/**
 * Request payload for simulation worker
 */
interface SimulationWorkerPayload {
  scenario: NamedScenario;
  config: SimulationConfig;
}

/**
 * Worker message handler for simulation requests
 */
self.onmessage = async (event: MessageEvent<WorkerRequest<SimulationWorkerPayload>>) => {
  const request = event.data;
  const { id, type, payload, requestId } = request;

  try {
    if (type === 'RUN_SIMULATION') {
      const { scenario, config } = payload as any; // Cast for now, will fix types properly
      const totalIterations = config.iterations ?? 1000;

      const result = runMonteCarlo(scenario, config, (progress) => {
        const current = Math.round(progress * totalIterations);
        postProgress(id, current, totalIterations);
      });

      const response: WorkerResponse<SimulationResult> = {
        id,
        requestId, // Echo back
        type: 'SUCCESS',
        payload: result,
      };
      self.postMessage(response);
    }
    else if (type === 'RUN_FULL_MODEL') {
      // Dynamic import to avoid circular dep issues if any, though likely fine here as worker is bundled separately usually
      // But we imported runFullModel at top level.
      const { runFullModel } = await import('@engines/pipeline/modelPipeline');
      const input = payload as any;

      const result = runFullModel(input);

      const response: WorkerResponse<any> = {
        id,
        requestId,
        type: 'SUCCESS',
        payload: result,
      };
      self.postMessage(response);
    }
    else {
      throw new Error(`Unknown request type: ${type}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResponse: WorkerResponse = {
      id,
      requestId,
      type: 'ERROR',
      error: errorMessage,
    };
    self.postMessage(errorResponse);
  }
};

