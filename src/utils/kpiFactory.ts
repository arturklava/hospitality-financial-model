/**
 * KPI Factory (v5.8: Rich Data UI)
 * 
 * Generates operation-specific KPI cards based on operation type.
 * Provides consistent KPI calculation and display logic across the application.
 */

import type { OperationConfig, FullModelOutput } from '../domain/types';
import { runScenarioEngine } from '../engines/scenario/scenarioEngine';
import { formatCurrency, formatPercent } from './formatters';

export interface KpiCard {
  id: string;
  label: string;
  value: string;
  icon?: string; // Lucide icon name
  isEstimated?: boolean;
  hasLiveData?: boolean;
}

export interface KpiFactoryResult {
  cards: KpiCard[];
  hasLiveData: boolean;
}

/**
 * Get operation-level P&L from model output
 */
function getOperationPnl(
  operation: OperationConfig,
  modelOutput?: FullModelOutput
): { revenue: number; noi: number; foodRevenue?: number; beverageRevenue?: number; foodCogs?: number } | null {
  if (!modelOutput) return null;
  
  try {
    const scenarioResult = runScenarioEngine(modelOutput.scenario);
    if (!scenarioResult?.operations) return null;
    
    const operationResult = scenarioResult.operations.find(op => op.operationId === operation.id);
    if (!operationResult?.annualPnl || operationResult.annualPnl.length === 0) return null;
    
    // Use Year 1 (yearIndex 0) for KPI display
    const year1Pnl = operationResult.annualPnl.find(pnl => pnl.yearIndex === 0);
    if (year1Pnl) {
      // Sum monthly P&L for granular data
      let foodRevenue = 0;
      let beverageRevenue = 0;
      let foodCogs = 0;
      
      for (const monthlyPnl of operationResult.monthlyPnl) {
        if (monthlyPnl.yearIndex === 0) {
          foodRevenue += monthlyPnl.foodRevenue ?? 0;
          beverageRevenue += monthlyPnl.beverageRevenue ?? 0;
          foodCogs += monthlyPnl.foodCogs ?? 0;
        }
      }
      
      return {
        revenue: year1Pnl.revenueTotal ?? 0,
        noi: year1Pnl.noi ?? 0,
        foodRevenue,
        beverageRevenue,
        foodCogs,
      };
    }
  } catch (error) {
    console.error('[kpiFactory] Error getting operation P&L:', error);
  }
  
  return null;
}

/**
 * Calculate RevPAR from operation config (fallback)
 */
function calculateRevPARFromConfig(operation: OperationConfig): number | null {
  if (operation.operationType === 'HOTEL') {
    const hotel = operation as any;
    const adr = hotel.avgDailyRate ?? 0;
    const avgOccupancy = hotel.occupancyByMonth 
      ? hotel.occupancyByMonth.reduce((sum: number, occ: number) => sum + occ, 0) / hotel.occupancyByMonth.length
      : 0;
    return adr * avgOccupancy;
  }
  if (operation.operationType === 'VILLAS') {
    const villas = operation as any;
    const adr = villas.avgNightlyRate ?? 0;
    const avgOccupancy = villas.occupancyByMonth 
      ? villas.occupancyByMonth.reduce((sum: number, occ: number) => sum + occ, 0) / villas.occupancyByMonth.length
      : 0;
    return adr * avgOccupancy;
  }
  return null;
}

/**
 * Calculate ADR from operation config or model output
 */
function calculateADR(operation: OperationConfig, _operationPnl: { revenue: number } | null): number | null {
  if (operation.operationType === 'HOTEL') {
    const hotel = operation as any;
    return hotel.avgDailyRate ?? null;
  }
  if (operation.operationType === 'VILLAS') {
    const villas = operation as any;
    return villas.avgNightlyRate ?? null;
  }
  return null;
}

/**
 * Calculate Keys/Units from operation config
 */
function calculateKeys(operation: OperationConfig): number | null {
  if (operation.operationType === 'HOTEL') {
    const hotel = operation as any;
    return hotel.keys ?? null;
  }
  if (operation.operationType === 'VILLAS') {
    const villas = operation as any;
    return villas.units ?? null;
  }
  return null;
}

/**
 * Calculate Covers from operation config
 */
function calculateCovers(operation: OperationConfig): number | null {
  if (operation.operationType === 'RESTAURANT') {
    const restaurant = operation as any;
    return restaurant.covers ?? null;
  }
  return null;
}

/**
 * Calculate Average Check from operation config
 */
function calculateAvgCheck(operation: OperationConfig): number | null {
  if (operation.operationType === 'RESTAURANT') {
    const restaurant = operation as any;
    return restaurant.avgCheck ?? null;
  }
  return null;
}

/**
 * Calculate Food Cost % from operation P&L or config
 */
function calculateFoodCostPercent(
  operation: OperationConfig,
  operationPnl: { foodRevenue?: number; foodCogs?: number } | null
): number | null {
  if (operation.operationType === 'RESTAURANT') {
    if (operationPnl?.foodRevenue && operationPnl.foodRevenue > 0 && operationPnl.foodCogs !== undefined) {
      return operationPnl.foodCogs / operationPnl.foodRevenue;
    }
    // Fallback to config
    const restaurant = operation as any;
    return restaurant.foodCogsPct ?? null;
  }
  return null;
}

/**
 * Generate KPI cards for Hotel operations
 */
function generateHotelKpis(operation: OperationConfig, operationPnl: ReturnType<typeof getOperationPnl>): KpiCard[] {
  const hasLiveData = operationPnl !== null;
  
  const keys = calculateKeys(operation);
  const adr = calculateADR(operation, operationPnl);
  const revpar = operationPnl
    ? (operationPnl.revenue / 365) / (keys ?? 1)
    : calculateRevPARFromConfig(operation);
  
  const cards: KpiCard[] = [];
  
  if (keys !== null) {
    cards.push({
      id: 'keys',
      label: 'Keys',
      value: keys.toString(),
      icon: 'Maximize',
      hasLiveData,
    });
  }
  
  if (adr !== null) {
    cards.push({
      id: 'adr',
      label: 'ADR',
      value: formatCurrency(adr),
      icon: 'DollarSign',
      isEstimated: !hasLiveData,
      hasLiveData,
    });
  }
  
  if (revpar !== null) {
    cards.push({
      id: 'revpar',
      label: 'RevPAR',
      value: formatCurrency(revpar),
      icon: 'TrendingUp',
      isEstimated: !hasLiveData,
      hasLiveData,
    });
  }
  
  return cards;
}

/**
 * Generate KPI cards for Restaurant operations
 */
function generateRestaurantKpis(operation: OperationConfig, operationPnl: ReturnType<typeof getOperationPnl>): KpiCard[] {
  const hasLiveData = operationPnl !== null;
  
  const covers = calculateCovers(operation);
  const avgCheck = calculateAvgCheck(operation);
  const foodCostPercent = calculateFoodCostPercent(operation, operationPnl);
  
  const cards: KpiCard[] = [];
  
  if (covers !== null) {
    cards.push({
      id: 'covers',
      label: 'Covers',
      value: covers.toString(),
      icon: 'Utensils',
      hasLiveData,
    });
  }
  
  if (avgCheck !== null) {
    cards.push({
      id: 'avg-check',
      label: 'Avg Check',
      value: formatCurrency(avgCheck),
      icon: 'DollarSign',
      isEstimated: !hasLiveData,
      hasLiveData,
    });
  }
  
  if (foodCostPercent !== null) {
    cards.push({
      id: 'food-cost',
      label: 'Food Cost %',
      value: formatPercent(foodCostPercent),
      icon: 'Percent',
      isEstimated: !hasLiveData,
      hasLiveData,
    });
  }
  
  return cards;
}

/**
 * Generate KPI cards for other operation types (fallback to generic metrics)
 */
function generateGenericKpis(_operation: OperationConfig, operationPnl: ReturnType<typeof getOperationPnl>): KpiCard[] {
  const hasLiveData = operationPnl !== null;
  const cards: KpiCard[] = [];
  
  if (operationPnl) {
    cards.push({
      id: 'revenue',
      label: 'Total Revenue',
      value: formatCurrency(operationPnl.revenue),
      icon: 'DollarSign',
      hasLiveData,
    });
    
    if (operationPnl.revenue > 0) {
      const noiMargin = operationPnl.noi / operationPnl.revenue;
      cards.push({
        id: 'noi-margin',
        label: 'NOI Margin',
        value: formatPercent(noiMargin),
        icon: 'Percent',
        hasLiveData,
      });
    }
  }
  
  return cards;
}

/**
 * Main KPI factory function
 * Generates operation-specific KPI cards based on operation type
 */
export function kpiFactory(operation: OperationConfig, modelOutput?: FullModelOutput): KpiFactoryResult {
  const operationPnl = getOperationPnl(operation, modelOutput);
  const hasLiveData = operationPnl !== null;
  
  let cards: KpiCard[] = [];
  
  switch (operation.operationType) {
    case 'HOTEL':
    case 'VILLAS':
      cards = generateHotelKpis(operation, operationPnl);
      break;
    
    case 'RESTAURANT':
      cards = generateRestaurantKpis(operation, operationPnl);
      break;
    
    default:
      cards = generateGenericKpis(operation, operationPnl);
      break;
  }
  
  return {
    cards,
    hasLiveData,
  };
}

