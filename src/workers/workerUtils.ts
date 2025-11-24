/**
 * Web Worker Utilities
 * 
 * Helper functions for creating type-safe worker handlers and managing
 * worker communication patterns.
 */

import type { WorkerRequest, WorkerResponse, WorkerHandler } from './types';

/**
 * Creates a type-safe worker message handler that wraps raw `self.onmessage` logic.
 * 
 * Handles:
 * - try/catch around the logic
 * - Posting back ERROR messages if the logic fails
 * - Posting back SUCCESS with the result
 * - Optional progress reporting
 * 
 * @param handler - Function that processes the request payload
 * @returns A function to set up the worker's message listener
 * 
 * @example
 * ```typescript
 * const handler = createWorkerHandler(async (payload: string) => {
 *   return `Echo: ${payload}`;
 * });
 * 
 * self.onmessage = handler;
 * ```
 */
export function createWorkerHandler<TRequest = unknown, TResponse = unknown>(
  handler: WorkerHandler<TRequest, TResponse>
): (event: MessageEvent<WorkerRequest<TRequest>>) => void {
  return async (event: MessageEvent<WorkerRequest<TRequest>>) => {
    const request = event.data;
    const { id, payload } = request;

    try {
      const result = await handler(payload);
      
      const response: WorkerResponse<TResponse> = {
        id,
        type: 'SUCCESS',
        payload: result,
      };
      
      self.postMessage(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const response: WorkerResponse = {
        id,
        type: 'ERROR',
        error: errorMessage,
      };
      
      self.postMessage(response);
    }
  };
}

/**
 * Helper function for posting progress updates from a worker.
 * 
 * @param requestId - The request ID from the original request
 * @param current - Current iteration/step
 * @param total - Total iterations/steps
 * 
 * @example
 * ```typescript
 * for (let i = 0; i < total; i++) {
 *   // ... do work ...
 *   postProgress(requestId, i + 1, total);
 * }
 * ```
 */
export function postProgress(
  requestId: string,
  current: number,
  total: number
): void {
  const percentage = Math.round((current / total) * 100);
  
  const response: WorkerResponse = {
    id: requestId,
    type: 'PROGRESS',
    progress: percentage,
  };
  
  self.postMessage(response);
}

