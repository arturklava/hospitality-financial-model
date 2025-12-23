/**
 * Covenant Engine Tests (v2.2)
 * 
 * Tests for covenant monitoring and breach detection.
 */

import { describe, it, expect } from 'vitest';
import { checkCovenants, evaluateCovenants } from '@engines/analytics/covenantEngine';
import type {
  Covenant,
  MonthlyCashFlow,
  MonthlyDebtKpi,
  MonthlyDebtSchedule,
} from '@domain/types';

/**
 * Helper function to create monthly cash flow data.
 */
function createMonthlyCashFlow(
  yearIndex: number,
  monthIndex: number,
  noi: number,
  debtService: number,
  maintenanceCapex: number,
  cumulativeCashFlow: number
): MonthlyCashFlow {
  const monthNumber = yearIndex * 12 + monthIndex;
  return {
    yearIndex,
    monthIndex,
    monthNumber,
    noi,
    debtService,
    maintenanceCapex,
    monthlyCashFlow: noi - debtService - maintenanceCapex,
    cumulativeCashFlow,
    cashPosition: cumulativeCashFlow,
  };
}

/**
 * Helper function to create monthly debt KPI data.
 */
function createMonthlyDebtKpi(
  yearIndex: number,
  monthIndex: number,
  dscr: number | null,
  ltv: number | null
): MonthlyDebtKpi {
  const monthNumber = yearIndex * 12 + monthIndex;
  return {
    yearIndex,
    monthIndex,
    monthNumber,
    dscr,
    ltv,
  };
}

/**
 * Helper function to create monthly debt schedule.
 */
function createMonthlyDebtSchedule(
  totalMonths: number,
  debtServicePerMonth: number,
  balancePerMonth: number
): MonthlyDebtSchedule {
  const entries: MonthlyDebtSchedule['entries'] = [];
  const aggregatedByMonth: MonthlyDebtSchedule['aggregatedByMonth'] = [];

  for (let monthNumber = 0; monthNumber < totalMonths; monthNumber++) {
    aggregatedByMonth.push({
      monthNumber,
      totalInterest: debtServicePerMonth * 0.5, // Assume 50% interest, 50% principal
      totalPrincipal: debtServicePerMonth * 0.5,
      totalDebtService: debtServicePerMonth,
      totalBeginningBalance: balancePerMonth,
      totalEndingBalance: balancePerMonth,
    });
  }

  return {
    entries,
    aggregatedByMonth,
  };
}

describe('checkCovenants', () => {
  it('should detect DSCR breach when NOI drops below threshold', () => {
    // Create monthly data: NOI drops in Month 4 (index 3) -> DSCR < 1.1
    const monthlyFlows: MonthlyCashFlow[] = [];
    const monthlyDebtKpis: MonthlyDebtKpi[] = [];
    const debtService = 100000; // $100k per month
    const initialNoi = 150000; // $150k per month (DSCR = 1.5)
    const lowNoi = 100000; // $100k per month (DSCR = 1.0)

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const noi = monthIndex === 3 ? lowNoi : initialNoi; // Month 4 (index 3) has low NOI
      const dscr = noi / debtService;
      
      monthlyFlows.push(createMonthlyCashFlow(0, monthIndex, noi, debtService, 0, 0));
      monthlyDebtKpis.push(createMonthlyDebtKpi(0, monthIndex, dscr, 0.5));
    }

    const monthlyDebtSchedule = createMonthlyDebtSchedule(12, debtService, 1000000);

    const covenants: Covenant[] = [
      {
        id: 'dscr-1',
        name: 'Minimum DSCR',
        type: 'min_dscr',
        threshold: 1.1,
      },
    ];

    const breaches = checkCovenants(monthlyFlows, monthlyDebtKpis, monthlyDebtSchedule, covenants);

    // Should detect breach in Month 4 (monthIndex = 3, monthNumber = 3)
    expect(breaches.length).toBeGreaterThan(0);
    const month4Breach = breaches.find(b => b.monthIndex === 3);
    expect(month4Breach).toBeDefined();
    expect(month4Breach?.covenantType).toBe('min_dscr');
    expect(month4Breach?.actualValue).toBeCloseTo(1.0, 2); // DSCR = 1.0
    expect(month4Breach?.threshold).toBe(1.1);
    expect(month4Breach?.severity).toBe('critical'); // No grace period
  });

  it('should respect grace period for DSCR breach', () => {
    const monthlyFlows: MonthlyCashFlow[] = [];
    const monthlyDebtKpis: MonthlyDebtKpi[] = [];
    const debtService = 100000;
    const lowNoi = 100000; // DSCR = 1.0

    // Create 6 months of data, with breach in months 3, 4, 5
    for (let monthIndex = 0; monthIndex < 6; monthIndex++) {
      const noi = monthIndex >= 3 && monthIndex <= 5 ? lowNoi : 150000;
      const dscr = noi / debtService;
      
      monthlyFlows.push(createMonthlyCashFlow(0, monthIndex, noi, debtService, 0, 0));
      monthlyDebtKpis.push(createMonthlyDebtKpi(0, monthIndex, dscr, 0.5));
    }

    const monthlyDebtSchedule = createMonthlyDebtSchedule(6, debtService, 1000000);

    const covenants: Covenant[] = [
      {
        id: 'dscr-1',
        name: 'Minimum DSCR',
        type: 'min_dscr',
        threshold: 1.1,
        gracePeriodMonths: 2, // 2 months grace period
      },
    ];

    const breaches = checkCovenants(monthlyFlows, monthlyDebtKpis, monthlyDebtSchedule, covenants);

    // Month 3: warning (within grace period)
    const month3Breach = breaches.find(b => b.monthIndex === 3);
    expect(month3Breach?.severity).toBe('warning');

    // Month 4: warning (still within grace period)
    const month4Breach = breaches.find(b => b.monthIndex === 4);
    expect(month4Breach?.severity).toBe('warning');

    // Month 5: critical (beyond grace period)
    const month5Breach = breaches.find(b => b.monthIndex === 5);
    expect(month5Breach?.severity).toBe('critical');
  });

  it('should detect LTV breach when LTV exceeds threshold', () => {
    const monthlyFlows: MonthlyCashFlow[] = [];
    const monthlyDebtKpis: MonthlyDebtKpi[] = [];
    const lowLtv = 0.70; // 70% LTV
    const highLtv = 0.80; // 80% LTV (breach)

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const ltv = monthIndex === 5 ? highLtv : lowLtv; // Month 6 (index 5) has high LTV
      
      monthlyFlows.push(createMonthlyCashFlow(0, monthIndex, 150000, 100000, 0, 0));
      monthlyDebtKpis.push(createMonthlyDebtKpi(0, monthIndex, 1.5, ltv));
    }

    const monthlyDebtSchedule = createMonthlyDebtSchedule(12, 100000, 8000000);

    const covenants: Covenant[] = [
      {
        id: 'ltv-1',
        name: 'Maximum LTV',
        type: 'max_ltv',
        threshold: 0.75, // 75% max LTV
      },
    ];

    const breaches = checkCovenants(monthlyFlows, monthlyDebtKpis, monthlyDebtSchedule, covenants);

    // Should detect breach in Month 6
    const month6Breach = breaches.find(b => b.monthIndex === 5);
    expect(month6Breach).toBeDefined();
    expect(month6Breach?.covenantType).toBe('max_ltv');
    expect(month6Breach?.actualValue).toBeCloseTo(0.80, 2);
    expect(month6Breach?.threshold).toBe(0.75);
  });

  it('should detect minimum cash breach when cash position falls below threshold', () => {
    const monthlyFlows: MonthlyCashFlow[] = [];
    const monthlyDebtKpis: MonthlyDebtKpi[] = [];
    const threshold = 1000000; // $1M minimum cash

    // Create 12 months: cash starts high, drops below threshold in month 4
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      let cumulativeCashFlow: number;
      if (monthIndex < 4) {
        cumulativeCashFlow = 2000000; // $2M (above threshold)
      } else {
        cumulativeCashFlow = 500000; // $500k (below threshold)
      }
      
      monthlyFlows.push(createMonthlyCashFlow(0, monthIndex, 150000, 100000, 0, cumulativeCashFlow));
      monthlyDebtKpis.push(createMonthlyDebtKpi(0, monthIndex, 1.5, 0.5));
    }

    const monthlyDebtSchedule = createMonthlyDebtSchedule(12, 100000, 1000000);

    const covenants: Covenant[] = [
      {
        id: 'cash-1',
        name: 'Minimum Cash',
        type: 'min_cash',
        threshold: threshold,
      },
    ];

    const breaches = checkCovenants(monthlyFlows, monthlyDebtKpis, monthlyDebtSchedule, covenants);

    // Should detect breaches starting from month 4
    expect(breaches.length).toBeGreaterThan(0);
    const month4Breach = breaches.find(b => b.monthIndex === 4);
    expect(month4Breach).toBeDefined();
    expect(month4Breach?.covenantType).toBe('min_cash');
    expect(month4Breach?.actualValue).toBe(500000);
    expect(month4Breach?.threshold).toBe(1000000);
  });

  it('should handle multiple covenants', () => {
    const monthlyFlows: MonthlyCashFlow[] = [];
    const monthlyDebtKpis: MonthlyDebtKpi[] = [];
    const debtService = 100000;
    const lowNoi = 100000; // DSCR = 1.0

    for (let monthIndex = 0; monthIndex < 6; monthIndex++) {
      const noi = monthIndex === 3 ? lowNoi : 150000;
      const dscr = noi / debtService;
      
      monthlyFlows.push(createMonthlyCashFlow(0, monthIndex, noi, debtService, 0, 0));
      monthlyDebtKpis.push(createMonthlyDebtKpi(0, monthIndex, dscr, 0.5));
    }

    const monthlyDebtSchedule = createMonthlyDebtSchedule(6, debtService, 1000000);

    const covenants: Covenant[] = [
      {
        id: 'dscr-1',
        name: 'Minimum DSCR',
        type: 'min_dscr',
        threshold: 1.1,
      },
      {
        id: 'ltv-1',
        name: 'Maximum LTV',
        type: 'max_ltv',
        threshold: 0.75,
      },
    ];

    const breaches = checkCovenants(monthlyFlows, monthlyDebtKpis, monthlyDebtSchedule, covenants);

    // Should detect DSCR breach in month 4
    const dscrBreaches = breaches.filter(b => b.covenantId === 'dscr-1');
    expect(dscrBreaches.length).toBeGreaterThan(0);
  });

  it('should return empty array when no breaches occur', () => {
    const monthlyFlows: MonthlyCashFlow[] = [];
    const monthlyDebtKpis: MonthlyDebtKpi[] = [];
    const debtService = 100000;
    const noi = 150000; // DSCR = 1.5 (above threshold)

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const dscr = noi / debtService;
      
      monthlyFlows.push(createMonthlyCashFlow(0, monthIndex, noi, debtService, 0, 0));
      monthlyDebtKpis.push(createMonthlyDebtKpi(0, monthIndex, dscr, 0.5));
    }

    const monthlyDebtSchedule = createMonthlyDebtSchedule(12, debtService, 1000000);

    const covenants: Covenant[] = [
      {
        id: 'dscr-1',
        name: 'Minimum DSCR',
        type: 'min_dscr',
        threshold: 1.1,
      },
    ];

    const breaches = checkCovenants(monthlyFlows, monthlyDebtKpis, monthlyDebtSchedule, covenants);

    // No breaches should be detected
    expect(breaches.length).toBe(0);
  });

  it('should flag DSCR breach correctly with high debt service scenario (v2.2)', () => {
    // Scenario: High debt service relative to NOI causes DSCR breach
    const monthlyFlows: MonthlyCashFlow[] = [];
    const monthlyDebtKpis: MonthlyDebtKpi[] = [];
    
    // High debt service: $200k per month
    const highDebtService = 200000;
    
    // NOI varies: $180k in most months, but drops to $150k in some months
    // This creates DSCR = 0.75 and 0.90, both below threshold of 1.25
    const normalNoi = 180000; // DSCR = 0.90 (below threshold)
    const lowNoi = 150000;    // DSCR = 0.75 (below threshold)
    
    // Create 12 months: low NOI in months 3, 4, 5 (causing breach)
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const noi = (monthIndex >= 3 && monthIndex <= 5) ? lowNoi : normalNoi;
      const dscr = noi / highDebtService; // Both < 1.25 threshold
      
      // Calculate cumulative cash flow (starts at 0, decreases each month)
      const monthlyCashFlow = noi - highDebtService; // Negative cash flow
      const cumulativeCashFlow = monthIndex === 0 
        ? monthlyCashFlow 
        : monthlyFlows[monthIndex - 1].cumulativeCashFlow + monthlyCashFlow;
      
      monthlyFlows.push(createMonthlyCashFlow(0, monthIndex, noi, highDebtService, 0, cumulativeCashFlow));
      monthlyDebtKpis.push(createMonthlyDebtKpi(0, monthIndex, dscr, 0.5));
    }

    const monthlyDebtSchedule = createMonthlyDebtSchedule(12, highDebtService, 2000000);

    // Covenant: Minimum DSCR of 1.25
    const covenants: Covenant[] = [
      {
        id: 'dscr-high-debt',
        name: 'Minimum DSCR - High Debt Service',
        type: 'min_dscr',
        threshold: 1.25, // Requires DSCR >= 1.25
      },
    ];

    const breaches = checkCovenants(monthlyFlows, monthlyDebtKpis, monthlyDebtSchedule, covenants);

    // Should detect breaches in ALL months (since all DSCR < 1.25)
    // But let's verify at least the low NOI months are flagged
    expect(breaches.length).toBeGreaterThan(0);

    // Verify months 3, 4, 5 (low NOI) are flagged as breaches
    const month3Breach = breaches.find(b => b.monthIndex === 3);
    expect(month3Breach).toBeDefined();
    expect(month3Breach?.covenantType).toBe('min_dscr');
    expect(month3Breach?.actualValue).toBeCloseTo(0.75, 2); // DSCR = 150k / 200k = 0.75
    expect(month3Breach?.threshold).toBe(1.25);
    expect(month3Breach?.severity).toBe('critical'); // No grace period

    // Verify month 4 breach
    const month4Breach = breaches.find(b => b.monthIndex === 4);
    expect(month4Breach).toBeDefined();
    expect(month4Breach?.actualValue).toBeCloseTo(0.75, 2);

    // Verify month 5 breach
    const month5Breach = breaches.find(b => b.monthIndex === 5);
    expect(month5Breach).toBeDefined();
    expect(month5Breach?.actualValue).toBeCloseTo(0.75, 2);

    // Verify normal months (but still below threshold) are also flagged
    const month0Breach = breaches.find(b => b.monthIndex === 0);
    expect(month0Breach).toBeDefined();
    expect(month0Breach?.actualValue).toBeCloseTo(0.90, 2); // DSCR = 180k / 200k = 0.90
    expect(month0Breach?.threshold).toBe(1.25);

    console.log(`High debt service scenario: Detected ${breaches.length} covenant breaches`);
    console.log(`All months have DSCR < 1.25 threshold (actual: 0.75-0.90)`);
  });
});

describe('evaluateCovenants', () => {
  it('should return status for all months, not just breaches', () => {
    const monthlyFlows: MonthlyCashFlow[] = [];
    const monthlyDebtKpis: MonthlyDebtKpi[] = [];
    const debtService = 100000;
    const lowNoi = 100000; // DSCR = 1.0

    for (let monthIndex = 0; monthIndex < 6; monthIndex++) {
      const noi = monthIndex === 3 ? lowNoi : 150000;
      const dscr = noi / debtService;
      
      monthlyFlows.push(createMonthlyCashFlow(0, monthIndex, noi, debtService, 0, 0));
      monthlyDebtKpis.push(createMonthlyDebtKpi(0, monthIndex, dscr, 0.5));
    }

    const monthlyDebtSchedule = createMonthlyDebtSchedule(6, debtService, 1000000);

    const covenants: Covenant[] = [
      {
        id: 'dscr-1',
        name: 'Minimum DSCR',
        type: 'min_dscr',
        threshold: 1.1,
      },
    ];

    const statuses = evaluateCovenants(monthlyFlows, monthlyDebtKpis, monthlyDebtSchedule, covenants);

    // Should return status for all 6 months
    expect(statuses.length).toBe(6);
    
    // Month 3 should be failed
    const month3Status = statuses.find(s => s.monthIndex === 3);
    expect(month3Status?.passed).toBe(false);
    
    // Other months should be passed
    const otherMonths = statuses.filter(s => s.monthIndex !== 3);
    for (const status of otherMonths) {
      expect(status.passed).toBe(true);
    }
  });
});

