/**
 * Sensitivity Worker
 * 
 * Web Worker for running sensitivity analysis off the main thread.
 * Handles progress reporting and error propagation.
 */

import { runSensitivityAnalysis } from '@engines/analysis/sensitivityEngine';
import { postProgress } from './workerUtils';
import type { WorkerRequest, WorkerResponse } from './types';
import type { NamedScenario, SensitivityConfig, SensitivityResult } from '@domain/types';

/**
 * Request payload for sensitivity worker
 */
interface SensitivityWorkerPayload {
  scenario: NamedScenario;
  config: Omit<SensitivityConfig, 'baseScenario'>;
}

/**
 * Worker message handler for sensitivity requests
 */
self.onmessage = async (event: MessageEvent<WorkerRequest<SensitivityWorkerPayload>>) => {
  const request = event.data;
  const { id, type, payload } = request;

  // Only handle RUN_SENSITIVITY requests
  if (type !== 'RUN_SENSITIVITY') {
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
    
    // Calculate total steps for progress reporting
    const stepsX = config.rangeX.steps;
    const stepsY = config.rangeY?.steps ?? 1;
    const totalSteps = stepsX * stepsY;

    // Run sensitivity analysis with progress callback
    const result = runSensitivityAnalysis(scenario, config, (progress) => {
      // Convert progress (0.0-1.0) to current step for postProgress
      const current = Math.round(progress * totalSteps);
      postProgress(id, current, totalSteps);
    });

    // Send success response
    const response: WorkerResponse<SensitivityResult> = {
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

