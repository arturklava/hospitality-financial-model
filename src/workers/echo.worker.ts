/**
 * Echo Worker - Smoke Test
 * 
 * A simple worker that echoes back the payload with a prefix.
 * Used for testing the worker infrastructure.
 */

import { createWorkerHandler } from './workerUtils';

/**
 * Echo handler that prepends "Echo: " to the payload
 */
const echoHandler = createWorkerHandler<string, string>(async (payload) => {
  return `Echo: ${payload}`;
});

// Set up the worker message listener
self.onmessage = echoHandler;

