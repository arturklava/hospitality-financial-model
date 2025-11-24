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
  const { id, type, payload } = request;

  // Only handle RUN_SIMULATION requests
  if (type !== 'RUN_SIMULATION') {
    const errorResponse: WorkerResponse = {
      id,
      type: 'ERROR',
      error: `Unknown request type: ${type}`,
    };
    self.postMessage(errorResponse);
    return;
  }

  try {
    const { scenario, config } = payload;
    const totalIterations = config.iterations ?? 1000;

    // Run simulation with progress callback
    const result = runMonteCarlo(scenario, config, (progress) => {
      // Convert progress (0.0-1.0) to current iteration for postProgress
      const current = Math.round(progress * totalIterations);
      postProgress(id, current, totalIterations);
    });

    // Send success response
    const response: WorkerResponse<SimulationResult> = {
      id,
      type: 'SUCCESS',
      payload: result,
    };

    self.postMessage(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const errorResponse: WorkerResponse = {
      id,
      type: 'ERROR',
      error: errorMessage,
    };

    self.postMessage(errorResponse);
  }
};

