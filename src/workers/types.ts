/**
 * Web Worker Communication Types
 * 
 * Type-safe interfaces for Worker communication to ensure type safety
 * across the main thread and worker threads.
 */

/**
 * Generic request sent from main thread to worker
 */
export interface WorkerRequest<T = unknown> {
  /** Unique identifier for tracking async responses */
  id: string;
  /** Request ID for debounce/cancellation logic */
  requestId?: number;
  /** Type of request (e.g., 'SIMULATION', 'SENSITIVITY', 'ECHO') */
  type: string;
  /** Request payload (must be serializable) */
  payload: T;
}

/**
 * Generic response sent from worker to main thread
 */
export interface WorkerResponse<T = unknown> {
  /** Unique identifier matching the request ID */
  id: string;
  /** Request ID echoed back for matching */
  requestId?: number;
  /** Response type indicating success, error, or progress update */
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
  /** Response payload (only present for SUCCESS) */
  payload?: T;
  /** Error message (only present for ERROR) */
  error?: string;
  /** Progress percentage 0-100 (only present for PROGRESS) */
  progress?: number;
}

/**
 * Progress update payload
 */
export interface ProgressUpdate {
  /** Current iteration/step */
  current: number;
  /** Total iterations/steps */
  total: number;
  /** Percentage complete (0-100) */
  percentage: number;
}

/**
 * Function type for processing worker requests
 * 
 * @param payload - The request payload
 * @returns Promise resolving to the result
 */
export type WorkerHandler<TRequest = unknown, TResponse = unknown> = (
  payload: TRequest
) => Promise<TResponse>;

