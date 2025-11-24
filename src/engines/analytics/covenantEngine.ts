/**
 * Covenant monitoring engine (v2.2: Monthly Engines & Covenants).
 * 
 * Monitors debt covenants at monthly granularity and detects breaches.
 */

import type {
  Covenant,
  CovenantStatus,
  BreachEvent,
  MonthlyCashFlow,
  MonthlyDebtKpi,
  MonthlyDebtSchedule,
} from '@domain/types';

/**
 * Checks covenants against monthly cash flows and debt KPIs.
 * 
 * Evaluates each covenant for each month and returns breach events.
 * 
 * @param monthlyFlows - Monthly cash flow data
 * @param monthlyDebtKpis - Monthly debt KPIs (DSCR, LTV)
 * @param monthlyDebtSchedule - Monthly debt schedule
 * @param covenants - Array of covenants to monitor
 * @returns Array of breach events (only months where covenants are breached)
 */
export function checkCovenants(
  monthlyFlows: MonthlyCashFlow[],
  monthlyDebtKpis: MonthlyDebtKpi[],
  _monthlyDebtSchedule: MonthlyDebtSchedule,
  covenants: Covenant[]
): BreachEvent[] {
  const breachEvents: BreachEvent[] = [];
  const consecutiveBreachMonthsMap = new Map<string, number>(); // Track consecutive breach months per covenant

  // Create lookup maps for efficient access
  const flowsByMonth = new Map<number, MonthlyCashFlow>();
  const kpisByMonth = new Map<number, MonthlyDebtKpi>();
  
  for (const flow of monthlyFlows) {
    flowsByMonth.set(flow.monthNumber, flow);
  }
  
  for (const kpi of monthlyDebtKpis) {
    kpisByMonth.set(kpi.monthNumber, kpi);
  }

  // Evaluate each covenant for each month
  for (const covenant of covenants) {
    let consecutiveBreachMonths = consecutiveBreachMonthsMap.get(covenant.id) ?? 0;

    for (const flow of monthlyFlows) {
      const monthNumber = flow.monthNumber;
      const kpi = kpisByMonth.get(monthNumber);

      let actualValue: number;
      let passed: boolean;

      // Evaluate covenant based on type
      switch (covenant.type) {
        case 'min_dscr': {
          // Minimum DSCR: actualValue >= threshold
          actualValue = kpi?.dscr ?? 0;
          passed = actualValue >= covenant.threshold;
          break;
        }

        case 'max_ltv': {
          // Maximum LTV: actualValue <= threshold
          actualValue = kpi?.ltv ?? 0;
          passed = actualValue <= covenant.threshold;
          break;
        }

        case 'min_cash': {
          // Minimum Cash: actualValue >= threshold
          actualValue = flow.cashPosition;
          passed = actualValue >= covenant.threshold;
          break;
        }

        default: {
          // Unknown covenant type - skip
          continue;
        }
      }

      // Track breach
      if (!passed) {
        consecutiveBreachMonths++;
        consecutiveBreachMonthsMap.set(covenant.id, consecutiveBreachMonths);
        const gracePeriodMonths = covenant.gracePeriodMonths ?? 0;
        
        // Determine severity
        let severity: 'warning' | 'critical';
        if (consecutiveBreachMonths <= gracePeriodMonths) {
          severity = 'warning';
        } else {
          severity = 'critical';
        }

        // Create breach event
        breachEvents.push({
          covenantId: covenant.id,
          covenantName: covenant.name,
          covenantType: covenant.type,
          yearIndex: flow.yearIndex,
          monthIndex: flow.monthIndex,
          monthNumber,
          actualValue,
          threshold: covenant.threshold,
          severity,
        });
      } else {
        // Reset consecutive breach counter when covenant passes
        consecutiveBreachMonths = 0;
        consecutiveBreachMonthsMap.set(covenant.id, 0);
      }
    }
  }

  return breachEvents;
}

/**
 * Evaluates all covenants and returns full status (pass/fail for each month).
 * 
 * This is a more comprehensive function that returns status for all months,
 * not just breaches. Useful for detailed reporting.
 * 
 * @param monthlyFlows - Monthly cash flow data
 * @param monthlyDebtKpis - Monthly debt KPIs (DSCR, LTV)
 * @param monthlyDebtSchedule - Monthly debt schedule
 * @param covenants - Array of covenants to monitor
 * @returns Array of covenant status entries (one per covenant per month)
 */
export function evaluateCovenants(
  monthlyFlows: MonthlyCashFlow[],
  monthlyDebtKpis: MonthlyDebtKpi[],
  _monthlyDebtSchedule: MonthlyDebtSchedule,
  covenants: Covenant[]
): CovenantStatus[] {
  const statuses: CovenantStatus[] = [];
  const consecutiveBreachMonthsMap = new Map<string, number>(); // Track consecutive breach months per covenant

  // Create lookup maps
  const flowsByMonth = new Map<number, MonthlyCashFlow>();
  const kpisByMonth = new Map<number, MonthlyDebtKpi>();
  
  for (const flow of monthlyFlows) {
    flowsByMonth.set(flow.monthNumber, flow);
  }
  
  for (const kpi of monthlyDebtKpis) {
    kpisByMonth.set(kpi.monthNumber, kpi);
  }

  // Evaluate each covenant for each month
  for (const covenant of covenants) {
    let consecutiveBreachMonths = consecutiveBreachMonthsMap.get(covenant.id) ?? 0;

    for (const flow of monthlyFlows) {
      const monthNumber = flow.monthNumber;
      const kpi = kpisByMonth.get(monthNumber);

      let actualValue: number;
      let passed: boolean;

      // Evaluate covenant based on type
      switch (covenant.type) {
        case 'min_dscr': {
          actualValue = kpi?.dscr ?? 0;
          passed = actualValue >= covenant.threshold;
          break;
        }

        case 'max_ltv': {
          actualValue = kpi?.ltv ?? 0;
          passed = actualValue <= covenant.threshold;
          break;
        }

        case 'min_cash': {
          actualValue = flow.cashPosition;
          passed = actualValue >= covenant.threshold;
          break;
        }

        default: {
          // Unknown covenant type - mark as passed
          actualValue = 0;
          passed = true;
          break;
        }
      }

      // Track breach
      if (!passed) {
        consecutiveBreachMonths++;
        consecutiveBreachMonthsMap.set(covenant.id, consecutiveBreachMonths);
        const gracePeriodMonths = covenant.gracePeriodMonths ?? 0;
        const severity: 'warning' | 'critical' = 
          consecutiveBreachMonths <= gracePeriodMonths ? 'warning' : 'critical';

        statuses.push({
          covenantId: covenant.id,
          yearIndex: flow.yearIndex,
          monthIndex: flow.monthIndex,
          monthNumber,
          covenantName: covenant.name,
          covenantType: covenant.type,
          threshold: covenant.threshold,
          actualValue,
          passed: false,
          breachSeverity: severity,
        });
      } else {
        // Reset consecutive breach counter
        consecutiveBreachMonths = 0;
        consecutiveBreachMonthsMap.set(covenant.id, 0);

        statuses.push({
          covenantId: covenant.id,
          yearIndex: flow.yearIndex,
          monthIndex: flow.monthIndex,
          monthNumber,
          covenantName: covenant.name,
          covenantType: covenant.type,
          threshold: covenant.threshold,
          actualValue,
          passed: true,
        });
      }
    }
  }

  return statuses;
}

