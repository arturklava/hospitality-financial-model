/**
 * Land engine.
 * Generates monthly land acquisition cash flow.
 * 
 * v5.0: Land Bank (Pre-Construction)
 */

import type { LandConfig } from '@domain/types';

/**
 * Monthly land acquisition cash flow entry.
 * v5.0: Land Bank (Pre-Construction)
 */
export interface MonthlyLandFlow {
  monthIndex: number;                       // Month index relative to project start (can be negative)
  absoluteMonth: number;                    // Absolute month number (for timeline alignment)
  cashFlow: number;                         // Cash flow (negative = outflow, positive = inflow from barter)
  description: string;                       // Description of this cash flow event
  cumulativeCashFlow: number;              // Cumulative cash flow from first payment
}

/**
 * Generates monthly land acquisition cash flow.
 * v5.0: Land Bank (Pre-Construction)
 * 
 * @param landConfig - Land acquisition configuration
 * @param projectStartMonth - Absolute month when project starts (Year 0, Month 0), default: 0
 * @returns Array of monthly cash flows (negative = cash outflow, positive = inflow from barter)
 */
export function generateLandFlow(
  landConfig: LandConfig,
  projectStartMonth: number = 0
): MonthlyLandFlow[] {
  const flows: MonthlyLandFlow[] = [];
  let cumulativeCashFlow = 0;

  // 1. Down Payment: Applied at downPaymentMonth
  if (landConfig.downPayment > 0) {
    const monthIndex = landConfig.downPaymentMonth;
    const absoluteMonth = projectStartMonth + monthIndex;
    const cashFlow = -landConfig.downPayment; // Negative = outflow
    cumulativeCashFlow += cashFlow;

    flows.push({
      monthIndex,
      absoluteMonth,
      cashFlow,
      description: `Down payment for ${landConfig.name}`,
      cumulativeCashFlow,
    });
  }

  // 2. Installments
  const remainingBalance = landConfig.totalCost - landConfig.downPayment;
  
  if (remainingBalance > 0) {
    if (landConfig.installmentMethod === 'equal' && !landConfig.installments) {
      // Equal installments: Calculate equal monthly payments
      // For simplicity, we'll distribute over remaining months until Year 0
      // If no installments specified, assume equal payments over 12 months before Year 0
      const monthsUntilYear0 = Math.max(1, -landConfig.acquisitionMonth);
      const monthlyPayment = remainingBalance / monthsUntilYear0;
      
      for (let i = 0; i < monthsUntilYear0; i++) {
        const monthIndex = landConfig.acquisitionMonth + i + 1; // Start after down payment
        const absoluteMonth = projectStartMonth + monthIndex;
        const cashFlow = -monthlyPayment; // Negative = outflow
        cumulativeCashFlow += cashFlow;

        flows.push({
          monthIndex,
          absoluteMonth,
          cashFlow,
          description: `Equal installment ${i + 1} of ${monthsUntilYear0} for ${landConfig.name}`,
          cumulativeCashFlow,
        });
      }
    } else if (landConfig.installments && landConfig.installments.length > 0) {
      // Custom installments: Use provided schedule
      for (const installment of landConfig.installments) {
        const monthIndex = installment.month;
        const absoluteMonth = projectStartMonth + monthIndex;
        const cashFlow = -installment.amount; // Negative = outflow
        cumulativeCashFlow += cashFlow;

        flows.push({
          monthIndex,
          absoluteMonth,
          cashFlow,
          description: installment.description || `Installment payment for ${landConfig.name}`,
          cumulativeCashFlow,
        });
      }
    }
  }

  // 3. Barter/Permuta: If barterValue is provided, apply as positive cash flow at barterMonth
  // Note: barterValue is a percentage (0-1), so we multiply by totalCost to get the actual value
  if (landConfig.barterValue !== undefined && landConfig.barterValue > 0) {
    const barterMonth = landConfig.barterMonth ?? landConfig.acquisitionMonth;
    const monthIndex = barterMonth;
    const absoluteMonth = projectStartMonth + monthIndex;
    // Barter value is a percentage, so multiply by totalCost
    const barterAmount = landConfig.barterValue * landConfig.totalCost;
    const cashFlow = barterAmount; // Positive = inflow (reduction of future revenue)
    cumulativeCashFlow += cashFlow;

    flows.push({
      monthIndex,
      absoluteMonth,
      cashFlow,
      description: `Barter/permuta value for ${landConfig.name}`,
      cumulativeCashFlow,
    });
  }

  // Sort flows by monthIndex (chronological order)
  flows.sort((a, b) => a.monthIndex - b.monthIndex);

  // Recalculate cumulative cash flow after sorting
  let runningCumulative = 0;
  for (const flow of flows) {
    runningCumulative += flow.cashFlow;
    flow.cumulativeCashFlow = runningCumulative;
  }

  return flows;
}

/**
 * Generates land flows for multiple land configurations.
 * Aggregates all land flows into a single timeline.
 * 
 * @param landConfigs - Array of land acquisition configurations
 * @param projectStartMonth - Absolute month when project starts (Year 0, Month 0), default: 0
 * @returns Array of aggregated monthly land flows
 */
export function generateAllLandFlows(
  landConfigs: LandConfig[],
  projectStartMonth: number = 0
): MonthlyLandFlow[] {
  if (!landConfigs || landConfigs.length === 0) {
    return [];
  }

  // Generate flows for each land config
  const allFlows: MonthlyLandFlow[] = [];
  for (const landConfig of landConfigs) {
    const flows = generateLandFlow(landConfig, projectStartMonth);
    allFlows.push(...flows);
  }

  // Aggregate flows by month (sum cash flows for same month)
  const flowsByMonth = new Map<number, MonthlyLandFlow>();
  
  for (const flow of allFlows) {
    const existing = flowsByMonth.get(flow.monthIndex);
    if (existing) {
      // Aggregate: sum cash flows and combine descriptions
      existing.cashFlow += flow.cashFlow;
      existing.description = `${existing.description}; ${flow.description}`;
    } else {
      flowsByMonth.set(flow.monthIndex, { ...flow });
    }
  }

  // Convert back to array and sort
  const aggregatedFlows = Array.from(flowsByMonth.values());
  aggregatedFlows.sort((a, b) => a.monthIndex - b.monthIndex);

  // Recalculate cumulative cash flow
  let cumulativeCashFlow = 0;
  for (const flow of aggregatedFlows) {
    cumulativeCashFlow += flow.cashFlow;
    flow.cumulativeCashFlow = cumulativeCashFlow;
  }

  return aggregatedFlows;
}

