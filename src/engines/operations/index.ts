/**
 * Operations engine exports and dispatcher.
 */

import type {
  OperationConfig,
  OperationType,
  AnnualPnl,
  MonthlyPnl,
} from '@domain/types';
import { runHotelEngine } from './hotelEngine';
import { runVillasEngine } from './villasEngine';
import { runRestaurantEngine } from './restaurantEngine';
import { runBeachClubEngine } from './beachClubEngine';
import { runRacquetEngine } from './racquetEngine';
import { runRetailEngine } from './retailEngine';
import { runFlexEngine } from './flexEngine';
import { runWellnessEngine } from './wellnessEngine';
import { runSeniorLivingEngine } from './seniorLivingEngine';

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

/**
 * Dispatches to the appropriate operation engine based on operation type.
 *
 * @param config - Operation configuration
 * @returns Operation engine result with monthly and annual P&L
 * @throws Error if operation type is not supported
 */
export function runOperation(config: OperationConfig): OperationEngineResult {
  switch (config.operationType) {
    case 'HOTEL': {
      const result = runHotelEngine(config);
      return {
        operationId: config.id,
        operationType: config.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
    }
    case 'VILLAS': {
      const result = runVillasEngine(config);
      return {
        operationId: config.id,
        operationType: config.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
    }
    case 'RESTAURANT': {
      const result = runRestaurantEngine(config);
      return {
        operationId: config.id,
        operationType: config.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
    }
    case 'BEACH_CLUB': {
      const result = runBeachClubEngine(config);
      return {
        operationId: config.id,
        operationType: config.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
    }
    case 'RACQUET': {
      const result = runRacquetEngine(config);
      return {
        operationId: config.id,
        operationType: config.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
    }
    case 'RETAIL': {
      const result = runRetailEngine(config);
      return {
        operationId: config.id,
        operationType: config.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
    }
    case 'FLEX': {
      const result = runFlexEngine(config);
      return {
        operationId: config.id,
        operationType: config.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
    }
    case 'WELLNESS': {
      const result = runWellnessEngine(config);
      return {
        operationId: config.id,
        operationType: config.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
    }
    case 'SENIOR_LIVING': {
      const result = runSeniorLivingEngine(config);
      return {
        operationId: config.id,
        operationType: config.operationType,
        monthlyPnl: result.monthlyPnl,
        annualPnl: result.annualPnl,
      };
    }
  }
}
