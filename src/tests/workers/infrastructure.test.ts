/**
 * Worker Infrastructure Tests
 * 
 * Tests for the worker type definitions and utility functions.
 * Since testing real Workers in JSDOM/Vitest is challenging, we focus on
 * validating the types and utils logic by mocking `self.postMessage`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorkerHandler, postProgress } from '../../workers/workerUtils';
import type { WorkerRequest, WorkerResponse } from '../../workers/types';

describe('Worker Infrastructure', () => {
  // Mock self.postMessage
  const mockPostMessage = vi.fn();
  
  beforeEach(() => {
    mockPostMessage.mockClear();
    // @ts-expect-error - Mocking global self for testing
    global.self = {
      postMessage: mockPostMessage,
    };
  });

  describe('createWorkerHandler', () => {
    it('should handle successful requests and post SUCCESS response', async () => {
      const handler = createWorkerHandler<string, string>(async (payload) => {
        return `Processed: ${payload}`;
      });

      const request: WorkerRequest<string> = {
        id: 'test-1',
        type: 'TEST',
        payload: 'hello',
      };

      const event = {
        data: request,
      } as MessageEvent<WorkerRequest<string>>;

      await handler(event);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const response = mockPostMessage.mock.calls[0][0] as WorkerResponse<string>;
      
      expect(response.id).toBe('test-1');
      expect(response.type).toBe('SUCCESS');
      expect(response.payload).toBe('Processed: hello');
      expect(response.error).toBeUndefined();
    });

    it('should handle errors and post ERROR response', async () => {
      const handler = createWorkerHandler(async () => {
        throw new Error('Test error');
      });

      const request: WorkerRequest = {
        id: 'test-2',
        type: 'TEST',
        payload: null,
      };

      const event = {
        data: request,
      } as MessageEvent<WorkerRequest>;

      await handler(event);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const response = mockPostMessage.mock.calls[0][0] as WorkerResponse;
      
      expect(response.id).toBe('test-2');
      expect(response.type).toBe('ERROR');
      expect(response.error).toBe('Test error');
      expect(response.payload).toBeUndefined();
    });

    it('should handle non-Error exceptions', async () => {
      const handler = createWorkerHandler(async () => {
        throw 'String error';
      });

      const request: WorkerRequest = {
        id: 'test-3',
        type: 'TEST',
        payload: null,
      };

      const event = {
        data: request,
      } as MessageEvent<WorkerRequest>;

      await handler(event);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const response = mockPostMessage.mock.calls[0][0] as WorkerResponse;
      
      expect(response.type).toBe('ERROR');
      expect(response.error).toBe('String error');
    });

    it('should preserve request ID in response', async () => {
      const handler = createWorkerHandler(async (payload: number) => {
        return payload * 2;
      });

      const request: WorkerRequest<number> = {
        id: 'unique-request-id-123',
        type: 'MULTIPLY',
        payload: 42,
      };

      const event = {
        data: request,
      } as MessageEvent<WorkerRequest<number>>;

      await handler(event);

      const response = mockPostMessage.mock.calls[0][0] as WorkerResponse<number>;
      expect(response.id).toBe('unique-request-id-123');
    });
  });

  describe('postProgress', () => {
    it('should post PROGRESS response with correct percentage', () => {
      postProgress('progress-1', 25, 100);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const response = mockPostMessage.mock.calls[0][0] as WorkerResponse;
      
      expect(response.id).toBe('progress-1');
      expect(response.type).toBe('PROGRESS');
      expect(response.progress).toBe(25);
    });

    it('should round percentage correctly', () => {
      postProgress('progress-2', 1, 3);

      const response = mockPostMessage.mock.calls[0][0] as WorkerResponse;
      expect(response.progress).toBe(33); // 1/3 = 33.33... rounded to 33
    });

    it('should handle 0% progress', () => {
      postProgress('progress-3', 0, 100);

      const response = mockPostMessage.mock.calls[0][0] as WorkerResponse;
      expect(response.progress).toBe(0);
    });

    it('should handle 100% progress', () => {
      postProgress('progress-4', 100, 100);

      const response = mockPostMessage.mock.calls[0][0] as WorkerResponse;
      expect(response.progress).toBe(100);
    });
  });

  describe('Type Safety', () => {
    it('should enforce type constraints on WorkerRequest', () => {
      const request: WorkerRequest<string> = {
        id: 'type-test',
        type: 'TEST',
        payload: 'string payload',
      };

      expect(request.payload).toBe('string payload');
    });

    it('should enforce type constraints on WorkerResponse', () => {
      const successResponse: WorkerResponse<number> = {
        id: 'type-test',
        type: 'SUCCESS',
        payload: 42,
      };

      expect(successResponse.payload).toBe(42);

      const errorResponse: WorkerResponse = {
        id: 'type-test',
        type: 'ERROR',
        error: 'Error message',
      };

      expect(errorResponse.error).toBe('Error message');
    });
  });
});

