/**
 * Capital engine (v0.6: Capital Stack 2.1).
 * 
 * Handles capital structure, debt, and equity calculations.
 * Supports multiple debt tranches with different amortization types, simple refinancing, and transaction costs.
 * 
 * Multi-tranche behavior:
 * - Builds separate amortization schedule for each tranche
 * - Aggregates debt service and balances across all active tranches
 * - Project-level KPIs (DSCR, LTV) computed from aggregate debt
 * 
 * Simple refinancing:
 * - At refinanceAtYear, tranche's remaining balance is fully repaid
 * - New tranche(s) may start in the same year with initialPrincipal ≈ repaid balance
 * 
 * Transaction costs (v0.6):
 * - Origination fees: paid at startYear, reduce net proceeds
 * - Exit fees: paid at maturity or refinanceAtYear
 * - Fees are included in debt service and affect owner levered cash flows
 */

import type {
  ConsolidatedAnnualPnl,
  ConsolidatedMonthlyPnl,
  UnleveredFcf,
  CapitalStructureConfig,
  DebtTrancheConfig,
  DebtScheduleEntry,
  DebtSchedule,
  LeveredFcf,
  DebtKpi,
  CapitalEngineResult,
  ProjectConfig,
  WaccMetrics,
  MonthlyDebtScheduleEntry,
  MonthlyDebtSchedule,
  MonthlyCashFlow,
  MonthlyDebtKpi,
} from '@domain/types';

/**
 * Per-tranche debt schedule (internal structure)
 */
interface TrancheSchedule {
  trancheId: string;
  entries: DebtScheduleEntry[];
  originationFee: number;  // v0.6: origination fee paid at startYear
  exitFeeByYear: number[];  // v0.6: exit fees by year (indexed by yearIndex)
}

/**
 * Gets the initial principal amount from a tranche config (handles v0.4 backward compatibility).
 */
function getInitialPrincipal(tranche: DebtTrancheConfig): number {
  // v0.5: prefer initialPrincipal
  if (tranche.initialPrincipal !== undefined && tranche.initialPrincipal > 0) {
    return tranche.initialPrincipal;
  }
  // v0.4 backward compatibility: fall back to amount
  if (tranche.amount !== undefined && tranche.amount > 0) {
    return tranche.amount;
  }
  return 0;
}

/**
 * Validates a tranche configuration and throws descriptive errors for invalid structures.
 */
function validateTrancheConfig(tranche: DebtTrancheConfig): void {
  const initialPrincipal = getInitialPrincipal(tranche);
  const amortizationType = tranche.amortizationType ?? 'mortgage';
  const amortizationYears = tranche.amortizationYears ?? tranche.termYears;

  if (initialPrincipal < 0) {
    throw new Error(`[Capital Engine] Invalid tranche ${tranche.id}: initial principal cannot be negative.`);
  }

  if (initialPrincipal > 0 && tranche.termYears <= 0) {
    throw new Error(`[Capital Engine] Invalid tranche ${tranche.id}: termYears must be > 0 when principal is funded.`);
  }

  if (initialPrincipal > 0 && amortizationType === 'mortgage' && amortizationYears <= 0) {
    throw new Error(`[Capital Engine] Invalid tranche ${tranche.id}: amortizationYears must be > 0 for mortgage amortization.`);
  }

  if ((tranche.ioYears ?? 0) < 0) {
    throw new Error(`[Capital Engine] Invalid tranche ${tranche.id}: ioYears cannot be negative.`);
  }
}

/**
 * Computes the debt schedule for a single tranche.
 * 
 * Supports three amortization types:
 * - 'mortgage': linear amortization (principal + interest)
 * - 'interest_only': only interest payments, principal repaid at maturity
 * - 'bullet': no payments until maturity, then full repayment
 * 
 * @param tranche - Debt tranche configuration
 * @param horizonYears - Number of years in the projection horizon
 * @returns Debt schedule entries for this tranche
 */
function computeTrancheSchedule(
  tranche: DebtTrancheConfig,
  horizonYears: number
): DebtScheduleEntry[] {
  const initialPrincipal = getInitialPrincipal(tranche);
  if (initialPrincipal <= 0 || tranche.termYears <= 0) {
    // Return zero schedule
    const entries: DebtScheduleEntry[] = [];
    for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
      entries.push({
        yearIndex,
        beginningBalance: 0,
        interest: 0,
        principal: 0,
        endingBalance: 0,
      });
    }
    return entries;
  }

  const rate = tranche.interestRate;
  const term = tranche.termYears;
  const startYear = tranche.startYear ?? 0;
  const amortizationType = tranche.amortizationType ?? 'mortgage';
  const amortizationYears = tranche.amortizationYears ?? term;
  const ioYears = tranche.ioYears ?? 0;
  const refinanceAtYear = tranche.refinanceAtYear;
  const refinanceAmountPct = tranche.refinanceAmountPct ?? 1.0; // v2.10: default to full repayment

  // v0.6: Transaction costs are calculated separately in calculateTransactionCosts function

  const entries: DebtScheduleEntry[] = [];
  let previousEndingBalance = initialPrincipal;

  for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
    // v0.9.1 FIX: Check refinancing FIRST, before ANY other calculations
    const isRefinancingYear = refinanceAtYear !== undefined && yearIndex === refinanceAtYear;

    // v2.10: Handle refinancing year - supports partial refinancing
    if (isRefinancingYear && previousEndingBalance > 0) {
      // The beginningBalance is the balance at the START of the refinancing year
      const beginningBalance = previousEndingBalance;

      // v2.10: Calculate principal payment based on refinanceAmountPct
      // Principal Payment = beginningBalance * refinanceAmountPct
      const principal = beginningBalance * refinanceAmountPct;

      // v2.10: Ending Balance = beginningBalance - Principal
      // If partial refinancing (< 100%), remainder stays as balance
      // FIX: Explicitly set to 0 if full refinance to avoid floating point artifacts
      const endingBalance = refinanceAmountPct >= 1.0 ? 0 : beginningBalance - principal;

      // Calculate interest on the beginning balance
      const interest = beginningBalance * rate;

      entries.push({
        yearIndex,
        beginningBalance: beginningBalance,
        interest: interest,
        principal: principal, // v2.10: Can be partial if refinanceAmountPct < 1.0
        endingBalance: endingBalance, // v2.10: Remaining balance if partial refinancing
      });

      previousEndingBalance = endingBalance;
      continue;
    }

    // Check if tranche is active in this year (after refinancing check)
    const isActive = yearIndex >= startYear && yearIndex < startYear + term;

    // Handle inactive tranche (not yet started or matured)
    if (!isActive) {
      // v0.6: Exit fee at maturity is calculated separately in calculateTransactionCosts
      entries.push({
        yearIndex,
        beginningBalance: 0,
        interest: 0,
        principal: 0,
        endingBalance: 0,
      });
      continue;
    }

    const beginningBalance = previousEndingBalance;
    let interest = 0;
    let principal = 0;

    // Calculate interest
    if (beginningBalance > 0) {
      interest = beginningBalance * rate;
    }

    // Calculate principal based on amortization type
    if (amortizationType === 'interest_only') {
      // Interest-only: no principal payments during IO period, full repayment at maturity
      if (yearIndex === startYear + term - 1) {
        // Last year: repay all principal
        principal = beginningBalance;
      } else if (yearIndex < startYear + ioYears) {
        // IO period: no principal
        principal = 0;
      } else {
        // After IO period but before maturity: still no principal (IO until maturity)
        principal = 0;
      }
    } else if (amortizationType === 'bullet') {
      // Bullet: no payments until maturity, then full repayment
      if (yearIndex === startYear + term - 1) {
        principal = beginningBalance;
      } else {
        principal = 0;
        // Note: For bullet loans, interest may or may not be paid during the term
        // For simplicity in v0.5, we assume interest is paid but principal is not
      }
    } else {
      // 'mortgage': linear amortization
      const standardPrincipal = initialPrincipal / amortizationYears;
      if (yearIndex === startYear + term - 1 && term < amortizationYears) {
        // Last year of term with balloon payment
        principal = beginningBalance;
      } else {
        // Standard amortization
        principal = Math.min(standardPrincipal, beginningBalance);
      }
    }

    const endingBalance = Math.max(0, beginningBalance - principal);

    // v0.6: Exit fee is calculated separately in calculateTransactionCosts function

    entries.push({
      yearIndex,
      beginningBalance,
      interest,
      principal,
      endingBalance,
    });

    previousEndingBalance = endingBalance;
  }

  return entries;
}

/**
 * Calculates transaction costs for a tranche.
 * 
 * v0.6: Returns origination fee and exit fees by year.
 * 
 * @param tranche - Debt tranche configuration
 * @param scheduleEntries - Debt schedule entries for this tranche
 * @param horizonYears - Number of years in the projection horizon
 * @returns Object with originationFee and exitFeeByYear array
 */
function calculateTransactionCosts(
  tranche: DebtTrancheConfig,
  scheduleEntries: DebtScheduleEntry[],
  horizonYears: number
): { originationFee: number; exitFeeByYear: number[] } {
  const initialPrincipal = getInitialPrincipal(tranche);
  const originationFeePct = tranche.originationFeePct ?? 0;
  const exitFeePct = tranche.exitFeePct ?? 0;
  const startYear = tranche.startYear ?? 0;
  const term = tranche.termYears;
  const refinanceAtYear = tranche.refinanceAtYear;

  const originationFee = initialPrincipal * originationFeePct;
  const exitFeeByYear: number[] = new Array(horizonYears).fill(0);

  // Calculate exit fee at maturity or refinance
  for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
    const isMaturityYear = yearIndex === startYear + term - 1;
    const isRefinancingYear = refinanceAtYear !== undefined && yearIndex === refinanceAtYear;

    if ((isMaturityYear || isRefinancingYear) && exitFeePct > 0) {
      const entry = scheduleEntries[yearIndex];
      if (entry) {
        // v0.9.1 FIX: Exit fee MUST be calculated on beginningBalance (pre-payment balance)
        // NOT endingBalance - exit fee is on the amount being repaid
        const balanceForExitFee = entry.beginningBalance; // v0.9.1 FIX: Use beginningBalance, NOT endingBalance
        if (balanceForExitFee > 0) {
          exitFeeByYear[yearIndex] = balanceForExitFee * exitFeePct;
        } else {
          // v0.9.1 FIX: If beginningBalance is 0 but we're at maturity/refinance, 
          // this might indicate a bug - log a warning
          console.warn(
            `[Capital Engine] Exit fee calculation: beginningBalance is 0 at ${isRefinancingYear ? 'refinance' : 'maturity'} year ${yearIndex} for tranche ${tranche.id}`
          );
        }
      }
    }
  }

  return { originationFee, exitFeeByYear };
}

/**
 * Aggregates debt schedules across all tranches to produce project-level debt schedule.
 * 
 * v0.6: Also aggregates transaction costs (exit fees) into debt service.
 * 
 * @param trancheSchedules - Array of per-tranche schedules with transaction costs
 * @param horizonYears - Number of years in the projection horizon
 * @returns Aggregated debt schedule and total exit fees by year
 */
function aggregateDebtSchedules(
  trancheSchedules: TrancheSchedule[],
  capitalConfig: CapitalStructureConfig,
  horizonYears: number
): { debtSchedule: DebtSchedule; totalExitFeesByYear: number[]; seniorDebtServiceByYear: number[] } {
  const entries: DebtScheduleEntry[] = [];
  const totalExitFeesByYear: number[] = new Array(horizonYears).fill(0);
  const seniorDebtServiceByYear: number[] = new Array(horizonYears).fill(0);

  // If there are no debt tranches, return empty schedule
  if (trancheSchedules.length === 0) {
    return { debtSchedule: { entries: [] }, totalExitFeesByYear, seniorDebtServiceByYear };
  }

  // v2.10: Create a map of tranche ID to seniority for quick lookup
  const trancheSeniorityMap: Record<string, 'senior' | 'mezzanine' | 'subordinate' | undefined> = {};
  for (const tranche of capitalConfig.debtTranches) {
    // Map seniority: use explicit seniority if provided, otherwise infer from type
    if (tranche.seniority) {
      trancheSeniorityMap[tranche.id] = tranche.seniority;
    } else if (tranche.type === 'SENIOR') {
      trancheSeniorityMap[tranche.id] = 'senior';
    } else if (tranche.type === 'MEZZ') {
      trancheSeniorityMap[tranche.id] = 'mezzanine';
    } else {
      trancheSeniorityMap[tranche.id] = 'senior'; // default to senior
    }
  }

  for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
    let aggregateBeginningBalance = 0;
    let aggregateInterest = 0;
    let aggregatePrincipal = 0;
    let aggregateEndingBalance = 0;
    let seniorDebtService = 0; // v2.10: Sum of debt service for senior tranches

    // v0.9.2 FIX: Sum across all tranches
    // When a tranche is refinanced, its endingBalance is 0, so it won't contribute to next year's beginningBalance
    // This ensures correct aggregation without double-counting
    for (const trancheSchedule of trancheSchedules) {
      const entry = trancheSchedule.entries[yearIndex];
      if (entry) {
        // v0.9.2 FIX: Aggregate all tranche entries (refinanced tranches will have endingBalance = 0)
        aggregateBeginningBalance += entry.beginningBalance;
        aggregateInterest += entry.interest;
        aggregatePrincipal += entry.principal;
        aggregateEndingBalance += entry.endingBalance;

        // v2.10: Calculate senior debt service (sum of tranches with seniority === 'senior')
        const seniority = trancheSeniorityMap[trancheSchedule.trancheId];
        if (seniority === 'senior') {
          seniorDebtService += entry.interest + entry.principal;
        }
      }
      // v0.6: Aggregate exit fees
      totalExitFeesByYear[yearIndex] += trancheSchedule.exitFeeByYear[yearIndex] ?? 0;
    }

    entries.push({
      yearIndex,
      beginningBalance: aggregateBeginningBalance,
      interest: aggregateInterest,
      principal: aggregatePrincipal,
      endingBalance: aggregateEndingBalance,
    });

    // v2.10: Store senior debt service for this year
    seniorDebtServiceByYear[yearIndex] = seniorDebtService;
  }

  return { debtSchedule: { entries }, totalExitFeesByYear, seniorDebtServiceByYear };
}

/**
 * Computes the monthly debt schedule for a single tranche.
 * 
 * v2.2: Monthly Engines & Covenants
 * 
 * @param tranche - Debt tranche configuration
 * @param horizonYears - Number of years in the projection horizon
 * @returns Monthly debt schedule entries for this tranche
 */
function computeMonthlyTrancheSchedule(
  tranche: DebtTrancheConfig,
  horizonYears: number
): MonthlyDebtScheduleEntry[] {
  const initialPrincipal = getInitialPrincipal(tranche);
  if (initialPrincipal <= 0 || tranche.termYears <= 0) {
    // Return zero schedule
    const entries: MonthlyDebtScheduleEntry[] = [];
    for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        entries.push({
          yearIndex,
          monthIndex,
          monthNumber: yearIndex * 12 + monthIndex,
          trancheId: tranche.id,
          beginningBalance: 0,
          interest: 0,
          principal: 0,
          endingBalance: 0,
        });
      }
    }
    return entries;
  }

  const annualRate = tranche.interestRate;
  const monthlyRate = annualRate / 12;
  const term = tranche.termYears;
  const totalMonths = term * 12;
  const startYear = tranche.startYear ?? 0;
  const startMonth = startYear * 12;
  const amortizationType = tranche.amortizationType ?? 'mortgage';
  const amortizationYears = tranche.amortizationYears ?? term;
  const amortizationMonths = amortizationYears * 12;
  const ioYears = tranche.ioYears ?? 0;
  const ioMonths = ioYears * 12;
  const refinanceAtYear = tranche.refinanceAtYear;
  const refinanceAtMonth = refinanceAtYear !== undefined ? refinanceAtYear * 12 : undefined;

  const entries: MonthlyDebtScheduleEntry[] = [];
  const totalMonthsInHorizon = horizonYears * 12;
  let previousEndingBalance = initialPrincipal;

  // Calculate monthly payment for mortgage amortization
  let monthlyPayment = 0;
  if (amortizationType === 'mortgage' && amortizationMonths > 0) {
    const rateIsZero = Math.abs(monthlyRate) < 1e-12;
    if (rateIsZero) {
      // Avoid zero-payment / negative amortization when rates are 0
      monthlyPayment = initialPrincipal / amortizationMonths;
    } else {
      // Monthly payment formula: P × [r(1+r)^n] / [(1+r)^n - 1]
      const numerator = monthlyRate * Math.pow(1 + monthlyRate, amortizationMonths);
      const denominator = Math.pow(1 + monthlyRate, amortizationMonths) - 1;
      if (denominator > 0) {
        monthlyPayment = initialPrincipal * (numerator / denominator);
      }
    }
  }

  for (let monthNumber = 0; monthNumber < totalMonthsInHorizon; monthNumber++) {
    const yearIndex = Math.floor(monthNumber / 12);
    const monthIndex = monthNumber % 12;

    // Check refinancing first
    const isRefinancingMonth = refinanceAtMonth !== undefined && monthNumber === refinanceAtMonth;

    if (isRefinancingMonth && previousEndingBalance > 0) {
      const beginningBalance = previousEndingBalance;
      const principal = beginningBalance;
      const endingBalance = 0;
      const interest = beginningBalance * monthlyRate;

      entries.push({
        yearIndex,
        monthIndex,
        monthNumber,
        trancheId: tranche.id,
        beginningBalance,
        interest,
        principal,
        endingBalance,
      });

      previousEndingBalance = 0;
      continue;
    }

    // Check if tranche is active in this month
    const isActive = monthNumber >= startMonth && monthNumber < startMonth + totalMonths;

    if (!isActive) {
      entries.push({
        yearIndex,
        monthIndex,
        monthNumber,
        trancheId: tranche.id,
        beginningBalance: 0,
        interest: 0,
        principal: 0,
        endingBalance: 0,
      });
      continue;
    }

    const beginningBalance = previousEndingBalance;
    let interest = 0;
    let principal = 0;

    // Calculate interest
    if (beginningBalance > 0) {
      interest = beginningBalance * monthlyRate;
    }

    // Calculate principal based on amortization type
    if (amortizationType === 'interest_only') {
      // Interest-only: no principal payments during IO period, full repayment at maturity
      const monthsIntoTerm = monthNumber - startMonth;
      if (monthsIntoTerm === totalMonths - 1) {
        // Last month: repay all principal
        principal = beginningBalance;
      } else {
        // IO period: no principal
        principal = 0;
      }
    } else if (amortizationType === 'bullet') {
      // Bullet: no payments until maturity, then full repayment
      const monthsIntoTerm = monthNumber - startMonth;
      if (monthsIntoTerm === totalMonths - 1) {
        principal = beginningBalance;
      } else {
        principal = 0;
      }
    } else {
      // 'mortgage': linear amortization
      const monthsIntoTerm = monthNumber - startMonth;
      if (monthsIntoTerm < ioMonths) {
        // IO period: no principal
        principal = 0;
      } else if (monthsIntoTerm === totalMonths - 1 && totalMonths < amortizationMonths) {
        // Last month with balloon payment
        principal = beginningBalance;
      } else {
        // Standard amortization: use monthly payment
        principal = Math.min(monthlyPayment - interest, beginningBalance);
        if (principal < 0) {
          principal = 0;
        }
      }
    }

    const endingBalance = Math.max(0, beginningBalance - principal);

    entries.push({
      yearIndex,
      monthIndex,
      monthNumber,
      trancheId: tranche.id,
      beginningBalance,
      interest,
      principal,
      endingBalance,
    });

    previousEndingBalance = endingBalance;
  }

  return entries;
}

/**
 * Aggregates monthly debt schedules across all tranches.
 * 
 * v2.2: Monthly Engines & Covenants
 */
function aggregateMonthlyDebtSchedules(
  trancheMonthlySchedules: MonthlyDebtScheduleEntry[][],
  horizonYears: number
): MonthlyDebtSchedule {
  const totalMonths = horizonYears * 12;
  const aggregatedByMonth: MonthlyDebtSchedule['aggregatedByMonth'] = [];

  for (let monthNumber = 0; monthNumber < totalMonths; monthNumber++) {
    let totalInterest = 0;
    let totalPrincipal = 0;
    let totalBeginningBalance = 0;
    let totalEndingBalance = 0;

    for (const trancheSchedule of trancheMonthlySchedules) {
      const entry = trancheSchedule.find(e => e.monthNumber === monthNumber);
      if (entry) {
        totalInterest += entry.interest;
        totalPrincipal += entry.principal;
        totalBeginningBalance += entry.beginningBalance;
        totalEndingBalance += entry.endingBalance;
      }
    }

    aggregatedByMonth.push({
      monthNumber,
      totalInterest,
      totalPrincipal,
      totalDebtService: totalInterest + totalPrincipal,
      totalBeginningBalance,
      totalEndingBalance,
    });
  }

  // Flatten all entries
  const allEntries: MonthlyDebtScheduleEntry[] = [];
  for (const trancheSchedule of trancheMonthlySchedules) {
    allEntries.push(...trancheSchedule);
  }

  return {
    entries: allEntries,
    aggregatedByMonth,
  };
}

/**
 * Calculates monthly cash flow from monthly P&L and debt schedule.
 * 
 * v2.2: Monthly Engines & Covenants
 */
function calculateMonthlyCashFlow(
  consolidatedMonthlyPnl: ConsolidatedMonthlyPnl[],
  monthlyDebtSchedule: MonthlyDebtSchedule
): MonthlyCashFlow[] {
  const monthlyCashFlow: MonthlyCashFlow[] = [];
  let cumulativeCashFlow = 0;

  for (const monthlyPnl of consolidatedMonthlyPnl) {
    const monthNumber = monthlyPnl.monthNumber;
    const debtServiceEntry = monthlyDebtSchedule.aggregatedByMonth.find(
      e => e.monthNumber === monthNumber
    );

    const noi = monthlyPnl.noi;
    const debtService = debtServiceEntry?.totalDebtService ?? 0;
    const maintenanceCapex = monthlyPnl.maintenanceCapex;
    const monthlyCashFlowValue = noi - debtService - maintenanceCapex;

    cumulativeCashFlow += monthlyCashFlowValue;

    monthlyCashFlow.push({
      yearIndex: monthlyPnl.yearIndex,
      monthIndex: monthlyPnl.monthIndex,
      monthNumber,
      noi,
      debtService,
      maintenanceCapex,
      monthlyCashFlow: monthlyCashFlowValue,
      cumulativeCashFlow,
      cashPosition: cumulativeCashFlow, // Assuming initial cash = 0
    });
  }

  return monthlyCashFlow;
}

/**
 * Calculates monthly debt KPIs (DSCR, LTV).
 * 
 * v2.2: Monthly Engines & Covenants
 */
function calculateMonthlyDebtKpis(
  consolidatedMonthlyPnl: ConsolidatedMonthlyPnl[],
  monthlyDebtSchedule: MonthlyDebtSchedule,
  initialInvestment: number
): MonthlyDebtKpi[] {
  const monthlyDebtKpis: MonthlyDebtKpi[] = [];

  for (const monthlyPnl of consolidatedMonthlyPnl) {
    const monthNumber = monthlyPnl.monthNumber;
    const debtServiceEntry = monthlyDebtSchedule.aggregatedByMonth.find(
      e => e.monthNumber === monthNumber
    );

    const noi = monthlyPnl.noi;
    const debtService = debtServiceEntry?.totalDebtService ?? 0;
    const debtBalance = debtServiceEntry?.totalBeginningBalance ?? 0;

    // Calculate DSCR
    let dscr: number | null = null;
    if (noi > 0 && debtService > 0) {
      dscr = noi / debtService;
    }

    // Calculate LTV
    let ltv: number | null = null;
    if (debtBalance > 0 && initialInvestment > 0) {
      ltv = debtBalance / initialInvestment;
    }

    monthlyDebtKpis.push({
      yearIndex: monthlyPnl.yearIndex,
      monthIndex: monthlyPnl.monthIndex,
      monthNumber,
      dscr,
      ltv,
    });
  }

  return monthlyDebtKpis;
}

/**
 * Runs the capital engine to calculate debt schedules, levered cash flows, and debt KPIs.
 * 
 * v0.5 enhancements:
 * - Supports multiple debt tranches
 * - Handles different amortization types (mortgage, interest_only, bullet)
 * - Supports tranches with different start years
 * - Implements simple refinancing (pay off old, start new in same year)
 * - Maintains backward compatibility with v0.4 single-tranche configs
 * 
 * v2.2 enhancements:
 * - Monthly debt schedule calculation
 * - Monthly cash flow calculation
 * - Monthly debt KPIs
 *
 * @param consolidatedPnl - Consolidated annual P&L from scenario engine
 * @param unleveredFcf - Unlevered free cash flow from project engine
 * @param capitalConfig - Capital structure configuration
 * @param consolidatedMonthlyPnl - Optional consolidated monthly P&L (v2.2)
 * @returns Debt schedule, levered FCF, owner cash flows, and debt KPIs
 */
export function runCapitalEngine(
  consolidatedPnl: ConsolidatedAnnualPnl[],
  unleveredFcf: UnleveredFcf[],
  capitalConfig: CapitalStructureConfig,
  consolidatedMonthlyPnl?: ConsolidatedMonthlyPnl[]
): CapitalEngineResult {
  const horizonYears = unleveredFcf.length;
  const initialInvestment = capitalConfig.initialInvestment;

  if (consolidatedPnl.length !== horizonYears) {
    throw new Error(
      `[Capital Engine] Consolidated P&L length (${consolidatedPnl.length}) must match unlevered FCF horizon (${horizonYears}).`
    );
  }

  // Build per-tranche schedules
  const trancheSchedules: TrancheSchedule[] = [];
  let totalNetProceeds = 0; // v0.6: Use net proceeds (after origination fees) instead of initial principal
  let totalOriginationFees = 0; // v0.6: Track total origination fees

  for (const tranche of capitalConfig.debtTranches) {
    validateTrancheConfig(tranche);

    const initialPrincipal = getInitialPrincipal(tranche);
    if (initialPrincipal > 0 && tranche.termYears > 0) {
      const entries = computeTrancheSchedule(tranche, horizonYears);
      const transactionCosts = calculateTransactionCosts(tranche, entries, horizonYears);

      // v0.6: Calculate net proceeds (initial principal minus origination fee)
      const netProceeds = initialPrincipal - transactionCosts.originationFee;
      totalNetProceeds += netProceeds;
      totalOriginationFees += transactionCosts.originationFee;

      trancheSchedules.push({
        trancheId: tranche.id,
        entries,
        originationFee: transactionCosts.originationFee,
        exitFeeByYear: transactionCosts.exitFeeByYear,
      });

      // Invariant check per tranche: sum of principal payments + final ending balance ≈ initial principal
      const totalPrincipalPaid = entries.reduce((sum, entry) => sum + entry.principal, 0);
      const finalEndingBalance = entries[entries.length - 1]?.endingBalance ?? 0;
      const totalRepaid = totalPrincipalPaid + finalEndingBalance;
      const tolerance = 0.01;
      const diff = Math.abs(totalRepaid - initialPrincipal);

      if (diff > tolerance) {
        const errorMsg = `[Capital Engine] Debt schedule invariant violation for tranche ${tranche.id}: ` +
          `sum(principal) + finalBalance = ${totalRepaid.toFixed(2)}, ` +
          `expected = ${initialPrincipal.toFixed(2)}, ` +
          `diff = ${diff.toFixed(2)}. ` +
          `Term: ${tranche.termYears}, AmortizationType: ${tranche.amortizationType ?? 'mortgage'}`;

        console.error(errorMsg);
        // Strict mode: throw error to ensure data integrity
        throw new Error(errorMsg);
      }
    }
  }

  // Aggregate debt schedules across all tranches
  const { debtSchedule, totalExitFeesByYear, seniorDebtServiceByYear } = trancheSchedules.length > 0
    ? aggregateDebtSchedules(trancheSchedules, capitalConfig, horizonYears)
    : {
      debtSchedule: (() => {
        // Zero debt schedule
        const entries: DebtScheduleEntry[] = [];
        for (let yearIndex = 0; yearIndex < horizonYears; yearIndex++) {
          entries.push({
            yearIndex,
            beginningBalance: 0,
            interest: 0,
            principal: 0,
            endingBalance: 0,
          });
        }
        return { entries };
      })(),
      totalExitFeesByYear: new Array(horizonYears).fill(0),
      seniorDebtServiceByYear: new Array(horizonYears).fill(0), // v2.10: Senior debt service
    };

  // Compute levered FCF (using aggregate debt service including exit fees)
  const leveredFcfByYear: LeveredFcf[] = [];
  for (let t = 0; t < horizonYears; t++) {
    const scheduleEntry = debtSchedule.entries[t];
    const interest_t = scheduleEntry?.interest ?? 0;
    const principal_t = scheduleEntry?.principal ?? 0;
    const exitFee_t = totalExitFeesByYear[t] ?? 0; // v0.6: Include exit fees in debt service
    const debtService_t = interest_t + principal_t + exitFee_t; // v0.6: Debt service includes exit fees
    const unleveredFcf_t = unleveredFcf[t].unleveredFreeCashFlow;
    const leveredFcf_t = unleveredFcf_t - debtService_t;

    leveredFcfByYear.push({
      yearIndex: t,
      unleveredFcf: unleveredFcf_t,
      debtService: debtService_t,
      interest: interest_t,
      principal: principal_t,
      leveredFreeCashFlow: leveredFcf_t,
      // v0.6: Transaction costs (exit fees) included in debt service
      transactionCosts: exitFee_t,
    });
  }

  // Compute owner levered cash flows (Year 0..N)
  // v0.6: Equity invested = initial investment - net proceeds (after origination fees)
  const equityInvested = initialInvestment - totalNetProceeds;
  const ownerLeveredCashFlows: number[] = [];

  // Year 0: equity investment (negative) + origination fees (negative, cash outflow)
  // v0.6: Origination fees are a cash outflow at Year 0 (or tranche start year)
  // For simplicity, we include all origination fees at Year 0
  // In a more sophisticated implementation, origination fees would be paid at each tranche's startYear
  ownerLeveredCashFlows.push(-equityInvested - totalOriginationFees);

  // Years 1..N: levered FCF from previous year
  for (let t = 1; t <= horizonYears; t++) {
    ownerLeveredCashFlows.push(leveredFcfByYear[t - 1].leveredFreeCashFlow);
  }

  // Compute debt KPIs (project-level, using aggregate debt)
  const debtKpis: DebtKpi[] = [];
  for (let t = 0; t < horizonYears; t++) {
    const noi_t = consolidatedPnl[t].noi;
    const debtService_t = leveredFcfByYear[t].debtService;
    const beginningBalance_t = debtSchedule.entries[t].beginningBalance;
    const seniorDebtService_t = seniorDebtServiceByYear[t]; // v2.10: Senior debt service

    // DSCR calculation: NOI / aggregate debt service
    let dscr: number | null = null;
    if (noi_t > 0 && debtService_t > 0) {
      dscr = noi_t / debtService_t;
    }

    // v2.10: Senior DSCR calculation: NOI / senior debt service
    let seniorDscr: number | null = null;
    if (noi_t > 0 && seniorDebtService_t > 0) {
      seniorDscr = noi_t / seniorDebtService_t;
    }

    // LTV calculation: aggregate beginning balance / initial investment
    let ltv: number | null = null;
    if (beginningBalance_t > 0 && initialInvestment > 0) {
      ltv = beginningBalance_t / initialInvestment;
    }

    debtKpis.push({
      yearIndex: t,
      dscr,
      ltv,
      seniorDebtService: seniorDebtService_t, // v2.10: Senior debt service
      seniorDscr, // v2.10: Senior DSCR
    });
  }

  // v2.2: Calculate monthly debt schedule, cash flow, and KPIs if monthly P&L is provided
  let monthlyDebtSchedule: MonthlyDebtSchedule | undefined;
  let monthlyCashFlow: MonthlyCashFlow[] | undefined;
  let monthlyDebtKpis: MonthlyDebtKpi[] | undefined;

  if (consolidatedMonthlyPnl && consolidatedMonthlyPnl.length > 0) {
    // Calculate monthly debt schedules for all tranches
    const trancheMonthlySchedules: MonthlyDebtScheduleEntry[][] = [];
    for (const tranche of capitalConfig.debtTranches) {
      const initialPrincipal = getInitialPrincipal(tranche);
      if (initialPrincipal > 0 && tranche.termYears > 0) {
        const monthlySchedule = computeMonthlyTrancheSchedule(tranche, horizonYears);
        trancheMonthlySchedules.push(monthlySchedule);
      }
    }

    // Aggregate monthly debt schedules
    if (trancheMonthlySchedules.length > 0) {
      monthlyDebtSchedule = aggregateMonthlyDebtSchedules(trancheMonthlySchedules, horizonYears);

      // Calculate monthly cash flow
      monthlyCashFlow = calculateMonthlyCashFlow(consolidatedMonthlyPnl, monthlyDebtSchedule);

      // Calculate monthly debt KPIs
      monthlyDebtKpis = calculateMonthlyDebtKpis(
        consolidatedMonthlyPnl,
        monthlyDebtSchedule,
        initialInvestment
      );
    }
  }

  return {
    debtSchedule,
    monthlyDebtSchedule,
    leveredFcfByYear,
    monthlyCashFlow,
    ownerLeveredCashFlows,
    debtKpis,
    monthlyDebtKpis,
  };
}

/**
 * Calculates WACC (Weighted Average Cost of Capital) (v0.7).
 * 
 * Formula: WACC = (Equity % × Cost of Equity) + (Debt % × Cost of Debt × (1 - TaxRate))
 * 
 * @param projectConfig - Project configuration (contains discountRate and optional taxRate)
 * @param capitalConfig - Capital structure configuration (contains initialInvestment and debtTranches)
 * @returns WACC metrics including all components and final WACC
 */
export function calculateWACC(
  projectConfig: ProjectConfig,
  capitalConfig: CapitalStructureConfig
): WaccMetrics {
  const initialInvestment = capitalConfig.initialInvestment;
  const costOfEquity = projectConfig.discountRate;
  const taxRate = projectConfig.taxRate ?? 0; // Default to 0 if not provided

  // Calculate total debt (sum of all tranches' initialPrincipal)
  let totalDebt = 0;
  let totalDebtWeightedInterest = 0; // Sum of (principal × interestRate) for weighted average

  for (const tranche of capitalConfig.debtTranches) {
    const initialPrincipal = getInitialPrincipal(tranche);
    if (initialPrincipal > 0) {
      totalDebt += initialPrincipal;
      totalDebtWeightedInterest += initialPrincipal * tranche.interestRate;
    }
  }

  // Calculate equity invested
  const equityInvested = initialInvestment - totalDebt;

  // Calculate percentages
  const equityPercentage = initialInvestment > 0 ? equityInvested / initialInvestment : 0;
  const debtPercentage = initialInvestment > 0 ? totalDebt / initialInvestment : 0;

  // Calculate weighted average cost of debt
  const costOfDebt = totalDebt > 0 ? totalDebtWeightedInterest / totalDebt : 0;

  // Calculate WACC
  const wacc = (equityPercentage * costOfEquity) + (debtPercentage * costOfDebt * (1 - taxRate));

  return {
    equityPercentage,
    debtPercentage,
    costOfEquity,
    costOfDebt,
    taxRate,
    wacc,
  };
}
