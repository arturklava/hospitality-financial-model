/**
 * Operations engine exports and dispatcher.
 */

import type {
  OperationConfig,
  OperationType,
  AnnualPnl,
  MonthlyPnl,
} from '@domain/types';
import type { DetailedAuditTrace } from '@domain/audit';
import { operationConfigSchema } from '@domain/schemas';
import { validateOperationDrivers } from '@domain/validation';
import { runHotelEngine } from './hotelEngine';
import { runVillasEngine } from './villasEngine';
import { runRestaurantEngine } from './restaurantEngine';
import { runBeachClubEngine } from './beachClubEngine';
import { runRacquetEngine } from './racquetEngine';
import { runRetailEngine } from './retailEngine';
import { runFlexEngine } from './flexEngine';
import { runWellnessEngine } from './wellnessEngine';
import { runSeniorLivingEngine } from './seniorLivingEngine';
import {
  engineFailure,
  engineSuccess,
  mapZodIssues,
  type EngineResult,
  type ValidationIssue,
} from '@engines/result';

export * from './hotelEngine';
export * from './villasEngine';
export * from './restaurantEngine';
export * from './beachClubEngine';
export * from './racquetEngine';
export * from './retailEngine';
export * from './flexEngine';
export * from './wellnessEngine';
export * from './seniorLivingEngine';
export * from './assetAnalytics';

export interface OperationEngineResult {
  operationId: string;
  operationType: OperationType;
  monthlyPnl: MonthlyPnl[];
  annualPnl: AnnualPnl[];
}

function buildOperationTrace(field: string, config: OperationConfig): DetailedAuditTrace {
  return {
    field,
    formula: 'Operation inputs validated via Zod and driver rules',
    values: {
      operationId: config.id,
      operationType: config.operationType,
    },
    result: 1,
    source: 'operationsEngine',
    operationId: config.id,
  };
}

function driverIssuesToValidationIssues(message: string): ValidationIssue[] {
  return [
    {
      path: 'operation.drivers',
      message,
    },
  ];
}

/**
 * Dispatches to the appropriate operation engine based on operation type.
 *
 * @param config - Operation configuration
 * @returns EngineResult containing operation P&L or structured validation error
 */
export function runOperation(config: OperationConfig): EngineResult<OperationEngineResult> {
  const parsed = operationConfigSchema.safeParse(config);
  if (!parsed.success) {
    return engineFailure(
      'OPERATIONS_INVALID_CONFIG',
      'Operation configuration failed validation',
      {
        issues: mapZodIssues(parsed.error.issues),
        auditTrace: [
          {
            field: 'operation_validation',
            formula: 'Zod schema validation',
            values: { operationType: config.operationType },
            result: 0,
            source: 'operationsEngine',
            operationId: config.id,
          },
        ],
      }
    );
  }

  const driverValidation = validateOperationDrivers(parsed.data);
  if (!driverValidation.isValid) {
    return engineFailure(
      'OPERATIONS_DRIVER_VALIDATION_FAILED',
      'Operation driver inputs failed domain validation',
      {
        issues: driverValidation.error
          ? driverIssuesToValidationIssues(driverValidation.error)
          : undefined,
        auditTrace: [
          {
            field: 'operation_driver_validation',
            formula: 'Driver invariants (occupancy, rate, etc.)',
            values: { operationType: config.operationType },
            result: 0,
            source: 'operationsEngine',
            operationId: config.id,
          },
        ],
      }
    );
  }

  const safeConfig = parsed.data;
  let engineComputation: OperationEngineResult | null = null;

  switch (safeConfig.operationType) {
    case 'HOTEL': {
      const result = runHotelEngine(safeConfig);
      engineComputation = {
        operationId: safeConfig.id,
        operationType: safeConfig.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
      break;
    }
    case 'VILLAS': {
      const result = runVillasEngine(safeConfig);
      engineComputation = {
        operationId: safeConfig.id,
        operationType: safeConfig.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
      break;
    }
    case 'RESTAURANT': {
      const result = runRestaurantEngine(safeConfig);
      engineComputation = {
        operationId: safeConfig.id,
        operationType: safeConfig.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
      break;
    }
    case 'BEACH_CLUB': {
      const result = runBeachClubEngine(safeConfig);
      engineComputation = {
        operationId: safeConfig.id,
        operationType: safeConfig.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
      break;
    }
    case 'RACQUET': {
      const result = runRacquetEngine(safeConfig);
      engineComputation = {
        operationId: safeConfig.id,
        operationType: safeConfig.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
      break;
    }
    case 'RETAIL': {
      const result = runRetailEngine(safeConfig);
      engineComputation = {
        operationId: safeConfig.id,
        operationType: safeConfig.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
      break;
    }
    case 'FLEX': {
      const result = runFlexEngine(safeConfig);
      engineComputation = {
        operationId: safeConfig.id,
        operationType: safeConfig.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
      break;
    }
    case 'WELLNESS': {
      const result = runWellnessEngine(safeConfig);
      engineComputation = {
        operationId: safeConfig.id,
        operationType: safeConfig.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
      break;
    }
    case 'SENIOR_LIVING': {
      const result = runSeniorLivingEngine(safeConfig);
      engineComputation = {
        operationId: safeConfig.id,
        operationType: safeConfig.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
      break;
    }
    default: {
      return engineFailure(
        'OPERATIONS_UNSUPPORTED_TYPE',
        `Operation type ${String(safeConfig.operationType)} is not supported`,
        {
          auditTrace: [
            {
              field: 'operation_dispatch',
              formula: 'Operation type switch',
              values: { operationType: safeConfig.operationType },
              result: 0,
              source: 'operationsEngine',
              operationId: safeConfig.id,
            },
          ],
        }
      );
    }
  }

  return engineSuccess(engineComputation, [buildOperationTrace('operation_execution', safeConfig)]);
}
