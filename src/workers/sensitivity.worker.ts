import { runSensitivityAnalysis } from '@engines/analysis/sensitivityEngine';
import { runScenarioTriad } from '@engines/analysis/scenarioComparison';
import { postProgress } from './workerUtils';
import type { WorkerRequest, WorkerResponse } from './types';
import type { NamedScenario, SensitivityConfig, SensitivityResult, FullModelInput } from '@domain/types';
import type { ScenarioTriadResult } from '@engines/analysis/scenarioComparison';

/**
 * Worker message handler for sensitivity and triad requests
 */
self.onmessage = async (event: MessageEvent<WorkerRequest<any>>) => {
  const request = event.data;
  const { id, type, payload } = request;

  try {
    if (type === 'RUN_SENSITIVITY') {
      const { scenario, config } = payload as { scenario: NamedScenario; config: Omit<SensitivityConfig, 'baseScenario'> };

      // Calculate total steps for progress reporting
      const stepsX = config.rangeX.steps;
      const stepsY = config.rangeY?.steps ?? 1;
      const totalSteps = stepsX * stepsY;

      // Run sensitivity analysis with progress callback
      const result = runSensitivityAnalysis(scenario, config, (progress) => {
        const current = Math.round(progress * totalSteps);
        postProgress(id, current, totalSteps);
      });

      const response: WorkerResponse<SensitivityResult> = {
        id,
        type: 'SUCCESS',
        payload: result,
      };
      self.postMessage(response);
      return;
    }

    if (type === 'RUN_SCENARIO_TRIAD') {
      const { input, stressLevel } = payload as { input: FullModelInput; stressLevel: number };

      // Triad is 3 runs, can report progress manually
      postProgress(id, 1, 3);

      const result = runScenarioTriad(input, stressLevel);

      postProgress(id, 3, 3);

      const response: WorkerResponse<ScenarioTriadResult> = {
        id,
        type: 'SUCCESS',
        payload: result,
      };
      self.postMessage(response);
      return;
    }

    // Default: unknown request type
    const errorResponse: WorkerResponse = {
      id,
      type: 'ERROR',
      error: `Unknown request type: ${type}`,
    };
    self.postMessage(errorResponse);

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

