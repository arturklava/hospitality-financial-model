/**
 * Worker Hooks Tests
 * 
 * Tests for useSimulationWorker and useSensitivityWorker hooks.
 * Mocks the Worker constructor to test hook behavior without actual workers.
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSimulationWorker } from '../../ui/hooks/useSimulationWorker';
import { useSensitivityWorker } from '../../ui/hooks/useSensitivityWorker';
import type {
  NamedScenario,
  SimulationConfig,
  SimulationResult,
  SensitivityConfig,
  SensitivityResult,
} from '@domain/types';
import type { WorkerRequest, WorkerResponse } from '@workers/types';

describe('Worker Hooks', () => {
  // Type for our mock worker instance
  type MockWorkerInstance = {
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: ErrorEvent) => void) | null;
    terminate: ReturnType<typeof vi.fn>;
    postMessage: (message: WorkerRequest) => void;
    simulateMessage: (response: WorkerResponse) => void;
    simulateError: (message: string) => void;
    getMessages: () => WorkerRequest[];
  };

  let mockWorkerInstances: MockWorkerInstance[] = [];

  beforeEach(() => {
    mockWorkerInstances = [];

    // Mock the Worker constructor
    globalThis.Worker = class {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      private messages: WorkerRequest[] = [];
      public terminate = vi.fn();
      public url: URL | string;
      public options?: WorkerOptions;

      constructor(url: URL | string, options?: WorkerOptions) {
        this.url = url;
        this.options = options;
        mockWorkerInstances.push(this as unknown as MockWorkerInstance);
      }

      postMessage(message: WorkerRequest): void {
        this.messages.push(message);
      }

      simulateMessage(response: WorkerResponse): void {
        if (this.onmessage) {
          this.onmessage({ data: response } as MessageEvent);
        }
      }

      simulateError(message: string): void {
        if (this.onerror) {
          this.onerror({ message } as ErrorEvent);
        }
      }

      getMessages(): WorkerRequest[] {
        return this.messages;
      }
    } as unknown as typeof globalThis.Worker;
  });

  afterEach(() => {
    mockWorkerInstances = [];
    vi.restoreAllMocks();
  });

  function getLatestWorker(): MockWorkerInstance | null {
    return mockWorkerInstances.length > 0
      ? mockWorkerInstances[mockWorkerInstances.length - 1]
      : null;
  }

  describe('useSimulationWorker', () => {
    const mockScenario: NamedScenario = {
      id: 'test-scenario',
      name: 'Test Scenario',
      modelConfig: {
        scenario: {
          id: 'test-scenario',
          name: 'Test Scenario',
          startYear: 2026,
          horizonYears: 5,
          operations: [],
        },
        projectConfig: {
          discountRate: 0.10,
          terminalGrowthRate: 0.02,
          initialInvestment: 1000000,
        },
        capitalConfig: {
          initialInvestment: 1000000,
          debtTranches: [],
        },
        waterfallConfig: {
          equityClasses: [],
        },
      },
    };

    const mockConfig: SimulationConfig = {
      iterations: 100,
    };

    const mockResult: SimulationResult = {
      config: mockConfig,
      baseCaseKpis: {
        npv: 1000000,
        unleveredIrr: 0.10,
        leveredIrr: 0.12,
        moic: 1.5,
        equityMultiple: 1.5,
        wacc: 0.08,
      },
      iterations: [],
      statistics: {
        npv: { mean: 1000000, p10: 800000, p50: 1000000, p90: 1200000 },
        unleveredIrr: { mean: 0.10, p10: 0.08, p50: 0.10, p90: 0.12 },
        leveredIrr: { mean: 0.12, p10: 0.10, p50: 0.12, p90: 0.14 },
        moic: { mean: 1.5, p10: 1.2, p50: 1.5, p90: 1.8 },
        equityMultiple: { mean: 1.5, p10: 1.2, p50: 1.5, p90: 1.8 },
        wacc: { mean: 0.08, p10: 0.06, p50: 0.08, p90: 0.10 },
      },
    };

    it('should create a Worker when runSimulation is called', async () => {
      const { result } = renderHook(() => useSimulationWorker());

      await act(async () => {
        const promise = result.current.runSimulation(mockScenario, mockConfig);

        // Wait a tick for worker creation
        await new Promise((resolve) => setTimeout(resolve, 0));

        const worker = getLatestWorker();
        expect(worker).not.toBeNull();

        // Verify Worker was created (check that postMessage was called)
        const messages = worker!.getMessages();
        expect(messages.length).toBe(1);
        const requestId = messages[0].id;

        worker!.simulateMessage({
          id: requestId,
          type: 'SUCCESS',
          payload: mockResult,
        });

        await promise;
      });
    });

    it('should update progress on PROGRESS message', async () => {
      const { result } = renderHook(() => useSimulationWorker());

      let promise: Promise<SimulationResult>;

      await act(async () => {
        promise = result.current.runSimulation(mockScenario, mockConfig);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const worker = getLatestWorker();
      expect(worker).not.toBeNull();

      const messages = worker!.getMessages();
      const requestId = messages[0].id;

      // Simulate progress update outside act
      await act(async () => {
        worker!.simulateMessage({
          id: requestId,
          type: 'PROGRESS',
          progress: 50,
        });
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(50);
      });

      // Simulate completion
      await act(async () => {
        worker!.simulateMessage({
          id: requestId,
          type: 'SUCCESS',
          payload: mockResult,
        });
        await promise!;
      });
    });

    it('should return data on SUCCESS message', async () => {
      const { result } = renderHook(() => useSimulationWorker());

      let simulationResult: SimulationResult | null = null;

      await act(async () => {
        const promise = result.current.runSimulation(mockScenario, mockConfig);

        await new Promise((resolve) => setTimeout(resolve, 0));

        const worker = getLatestWorker();
        expect(worker).not.toBeNull();

        const messages = worker!.getMessages();
        const requestId = messages[0].id;

        // Simulate success
        worker!.simulateMessage({
          id: requestId,
          type: 'SUCCESS',
          payload: mockResult,
        });

        simulationResult = await promise;
      });

      expect(simulationResult).toEqual(mockResult);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBe(100);
      expect(result.current.error).toBeNull();
    });

    it('should handle ERROR messages', async () => {
      const { result } = renderHook(() => useSimulationWorker());

      await act(async () => {
        const promise = result.current.runSimulation(mockScenario, mockConfig);

        await new Promise((resolve) => setTimeout(resolve, 0));

        const worker = getLatestWorker();
        expect(worker).not.toBeNull();

        const messages = worker!.getMessages();
        const requestId = messages[0].id;

        // Simulate error
        worker!.simulateMessage({
          id: requestId,
          type: 'ERROR',
          error: 'Test error message',
        });

        await expect(promise).rejects.toThrow('Test error message');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe('Test error message');
        expect(result.current.progress).toBe(0);
      });
    });

    it('should terminate worker on unmount', async () => {
      const { result, unmount } = renderHook(() => useSimulationWorker());

      // Trigger worker creation first
      await act(async () => {
        const promise = result.current.runSimulation(mockScenario, mockConfig);
        await new Promise((resolve) => setTimeout(resolve, 0));

        const worker = getLatestWorker();
        if (worker) {
          worker.simulateMessage({
            id: worker.getMessages()[0]?.id || 'test',
            type: 'SUCCESS',
            payload: mockResult,
          });
        }
        await promise.catch(() => { });
      });

      unmount();

      const worker = getLatestWorker();
      expect(worker).not.toBeNull();
      expect(worker!.terminate).toHaveBeenCalled();
    });

    it('should set isLoading to true when simulation starts', async () => {
      const { result } = renderHook(() => useSimulationWorker());

      let promise: Promise<SimulationResult>;

      // Check isLoading immediately after starting
      act(() => {
        promise = result.current.runSimulation(mockScenario, mockConfig);
      });

      // Should be loading immediately
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));

        const worker = getLatestWorker();
        expect(worker).not.toBeNull();

        const messages = worker!.getMessages();
        const requestId = messages[0].id;

        worker!.simulateMessage({
          id: requestId,
          type: 'SUCCESS',
          payload: mockResult,
        });

        await promise!;
      });
    });
  });

  describe('useSensitivityWorker', () => {
    const mockScenario: NamedScenario = {
      id: 'test-scenario',
      name: 'Test Scenario',
      modelConfig: {
        scenario: {
          id: 'test-scenario',
          name: 'Test Scenario',
          startYear: 2026,
          horizonYears: 5,
          operations: [],
        },
        projectConfig: {
          discountRate: 0.10,
          terminalGrowthRate: 0.02,
          initialInvestment: 1000000,
        },
        capitalConfig: {
          initialInvestment: 1000000,
          debtTranches: [],
        },
        waterfallConfig: {
          equityClasses: [],
        },
      },
    };

    const mockConfig: Omit<SensitivityConfig, 'baseScenario'> = {
      variableX: 'occupancy',
      rangeX: { min: 0.7, max: 1.3, steps: 5 },
    };

    const mockResult: SensitivityResult = {
      config: {
        baseScenario: mockScenario.modelConfig,
        ...mockConfig,
      },
      baseCaseOutput: {
        scenario: mockScenario.modelConfig.scenario,
        consolidatedAnnualPnl: [],
        project: {
          unleveredFcf: [],
          dcfValuation: {
            terminalValue: 0,
            presentValueOfFcf: 0,
            presentValueOfTerminal: 0,
            enterpriseValue: 0,
            equityValue: 0,
          },
          projectKpis: {
            npv: 1000000,
            unleveredIrr: 0.10,
            wacc: 0.08,
          },
        },
        capital: {
          debtSchedule: { entries: [] },
          trancheSchedules: [], // Mock
          leveredFcfByYear: [],
          ownerLeveredCashFlows: [],
          debtKpis: [],
        },
        waterfall: {
          ownerCashFlows: [],
          partners: [],
          annualRows: [],
        },
      },
      runs: [],
    } as unknown as SensitivityResult;

    it('should create a Worker when runSensitivity is called', async () => {
      const { result } = renderHook(() => useSensitivityWorker());

      await act(async () => {
        const promise = result.current.runSensitivity(mockScenario, mockConfig);

        await new Promise((resolve) => setTimeout(resolve, 0));

        const worker = getLatestWorker();
        expect(worker).not.toBeNull();

        const messages = worker!.getMessages();
        expect(messages.length).toBe(1);
        const requestId = messages[0].id;

        worker!.simulateMessage({
          id: requestId,
          type: 'SUCCESS',
          payload: mockResult,
        });

        await promise;
      });
    });

    it('should update progress on PROGRESS message', async () => {
      const { result } = renderHook(() => useSensitivityWorker());

      let promise: Promise<SensitivityResult>;

      await act(async () => {
        promise = result.current.runSensitivity(mockScenario, mockConfig);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const worker = getLatestWorker();
      expect(worker).not.toBeNull();

      const messages = worker!.getMessages();
      const requestId = messages[0].id;

      // Simulate progress update outside act
      await act(async () => {
        worker!.simulateMessage({
          id: requestId,
          type: 'PROGRESS',
          progress: 75,
        });
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(75);
      });

      // Simulate completion
      await act(async () => {
        worker!.simulateMessage({
          id: requestId,
          type: 'SUCCESS',
          payload: mockResult,
        });
        await promise!;
      });
    });

    it('should return data on SUCCESS message', async () => {
      const { result } = renderHook(() => useSensitivityWorker());

      let sensitivityResult: SensitivityResult | null = null;

      await act(async () => {
        const promise = result.current.runSensitivity(mockScenario, mockConfig);

        await new Promise((resolve) => setTimeout(resolve, 0));

        const worker = getLatestWorker();
        expect(worker).not.toBeNull();

        const messages = worker!.getMessages();
        const requestId = messages[0].id;

        worker!.simulateMessage({
          id: requestId,
          type: 'SUCCESS',
          payload: mockResult,
        });

        sensitivityResult = await promise;
      });

      expect(sensitivityResult).toEqual(mockResult);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBe(100);
      expect(result.current.error).toBeNull();
    });

    it('should handle ERROR messages', async () => {
      const { result } = renderHook(() => useSensitivityWorker());

      await act(async () => {
        const promise = result.current.runSensitivity(mockScenario, mockConfig);

        await new Promise((resolve) => setTimeout(resolve, 0));

        const worker = getLatestWorker();
        expect(worker).not.toBeNull();

        const messages = worker!.getMessages();
        const requestId = messages[0].id;

        worker!.simulateMessage({
          id: requestId,
          type: 'ERROR',
          error: 'Sensitivity analysis failed',
        });

        await expect(promise).rejects.toThrow('Sensitivity analysis failed');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe('Sensitivity analysis failed');
        expect(result.current.progress).toBe(0);
      });
    });

    it('should terminate worker on unmount', async () => {
      const { result, unmount } = renderHook(() => useSensitivityWorker());

      // Trigger worker creation first
      await act(async () => {
        const promise = result.current.runSensitivity(mockScenario, mockConfig);
        await new Promise((resolve) => setTimeout(resolve, 0));

        const worker = getLatestWorker();
        if (worker) {
          worker.simulateMessage({
            id: worker.getMessages()[0]?.id || 'test',
            type: 'SUCCESS',
            payload: mockResult,
          });
        }
        await promise.catch(() => { });
      });

      unmount();

      const worker = getLatestWorker();
      expect(worker).not.toBeNull();
      expect(worker!.terminate).toHaveBeenCalled();
    });

    it('should ignore messages with different request IDs', async () => {
      const { result } = renderHook(() => useSensitivityWorker());

      await act(async () => {
        const promise = result.current.runSensitivity(mockScenario, mockConfig);

        await new Promise((resolve) => setTimeout(resolve, 0));

        const worker = getLatestWorker();
        expect(worker).not.toBeNull();

        const messages = worker!.getMessages();
        const requestId = messages[0].id;

        // Send message with different ID (should be ignored)
        worker!.simulateMessage({
          id: 'different-id',
          type: 'PROGRESS',
          progress: 50,
        });

        // Progress should not update
        expect(result.current.progress).toBe(0);

        // Send correct message
        worker!.simulateMessage({
          id: requestId,
          type: 'SUCCESS',
          payload: mockResult,
        });

        await promise;
      });
    });
  });
});

