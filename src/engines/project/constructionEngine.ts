/**
 * Construction engine.
 * Generates construction drawdown curves and distributes funding between equity and debt sources.
 *
 * v3.6: Construction Logic
 * v5.1: S-Curve Logic - Added generateSCurve with sigmoid-based S-curve, linear, and early shapes
 */

import type { DetailedAuditTrace } from '@domain/audit';
import {
  engineFailure,
  engineSuccess,
  type EngineResult,
  type ValidationIssue,
} from '@engines/result';

const DRAW_TOLERANCE = 0.01;

function buildConstructionTrace(
  field: string,
  values: Record<string, number | string>,
  resultValue: number = 1
): DetailedAuditTrace {
  return {
    field,
    formula: 'Construction engine deterministic calculation',
    values,
    result: resultValue,
    source: 'constructionEngine',
    calculationStep: field,
  };
}

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

/**
 * Generates a monthly drawdown curve from total construction budget.
 */
export function generateDrawdownCurve(
  total: number,
  months: number,
  type: 's-curve' | 'linear' = 's-curve'
): EngineResult<number[]> {
  if (months <= 0) {
    return engineFailure(
      'CONSTRUCTION_INVALID_DURATION',
      'Construction duration must be greater than 0 months',
      {
        issues: [issue('construction.duration', 'Duration must be positive')],
        auditTrace: [buildConstructionTrace('generate_drawdown_curve', { total, months }, 0)],
      }
    );
  }

  if (total <= 0) {
    return engineFailure(
      'CONSTRUCTION_INVALID_TOTAL',
      'Total construction budget must be greater than 0',
      {
        issues: [issue('construction.total', 'Total budget must be positive')],
        auditTrace: [buildConstructionTrace('generate_drawdown_curve', { total, months }, 0)],
      }
    );
  }

  if (type === 'linear') {
    const monthlyAmount = total / months;
    const data = new Array(months).fill(monthlyAmount);
    return engineSuccess(
      data,
      [buildConstructionTrace('generate_drawdown_curve', { total, months, type: 'linear' })]
    );
  }

  const drawdowns: number[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < months; i++) {
    const progressStart = i / months;
    const progressEnd = (i + 1) / months;

    const cdfStart = sCurveCdf(progressStart);
    const cdfEnd = sCurveCdf(progressEnd);
    const monthlyDrawdown = total * (cdfEnd - cdfStart);
    drawdowns.push(monthlyDrawdown);
  }

  const sum = drawdowns.reduce((acc, val) => acc + val, 0);
  const difference = total - sum;
  if (Math.abs(difference) > DRAW_TOLERANCE) {
    drawdowns[months - 1] += difference;
  }

  const finalSum = drawdowns.reduce((acc, val) => acc + val, 0);
  if (Math.abs(finalSum - total) > DRAW_TOLERANCE) {
    warnings.push(
      `[Construction Engine] Drawdown sum (${finalSum}) does not equal total (${total}). Difference: ${Math.abs(
        finalSum - total
      )}`
    );
  }

  return engineSuccess(
    drawdowns,
    [buildConstructionTrace('generate_drawdown_curve', { total, months, type })],
    warnings
  );
}

/**
 * Distributes construction drawdowns between equity and debt sources.
 */
export function distributeFunding(
  drawdowns: number[],
  debtCap: number,
  equityCap: number,
  method: 'equity_first' = 'equity_first'
): EngineResult<{ equityDraws: number[]; debtDraws: number[] }> {
  if (drawdowns.length === 0) {
    return engineSuccess(
      { equityDraws: [], debtDraws: [] },
      [buildConstructionTrace('distribute_funding', { debtCap, equityCap, drawdowns: 0 })]
    );
  }

  if (method !== 'equity_first') {
    return engineFailure(
      'CONSTRUCTION_UNSUPPORTED_METHOD',
      `Funding distribution method '${method}' is not supported`,
      {
        issues: [issue('construction.method', 'Only equity_first method is implemented')],
        auditTrace: [buildConstructionTrace('distribute_funding', { debtCap, equityCap }, 0)],
      }
    );
  }

  const equityDraws: number[] = [];
  const debtDraws: number[] = [];
  const warnings: string[] = [];

  let remainingEquity = equityCap;
  let remainingDebt = debtCap;

  for (const drawdown of drawdowns) {
    if (drawdown < 0) {
      return engineFailure(
        'CONSTRUCTION_INVALID_DRAWDOWN',
        'Drawdown amounts must be non-negative',
        {
          issues: [issue('construction.drawdowns', 'Drawdown values cannot be negative')],
          auditTrace: [buildConstructionTrace('distribute_funding', { debtCap, equityCap }, 0)],
        }
      );
    }

    let equityDraw = 0;
    let debtDraw = 0;

    if (remainingEquity > 0) {
      equityDraw = Math.min(drawdown, remainingEquity);
      remainingEquity -= equityDraw;
    }

    const remainingDrawdown = drawdown - equityDraw;
    if (remainingDrawdown > 0) {
      if (remainingDebt <= 0) {
        return engineFailure(
          'CONSTRUCTION_INSUFFICIENT_CAPACITY',
          'Insufficient funding capacity for drawdown',
          {
            issues: [
              issue(
                'construction.capacity',
                `Drawdown of ${drawdown} exceeds remaining capacity ${remainingEquity + remainingDebt}`
              ),
            ],
            auditTrace: [buildConstructionTrace('distribute_funding', { debtCap, equityCap }, 0)],
          }
        );
      }

      debtDraw = Math.min(remainingDrawdown, remainingDebt);
      remainingDebt -= debtDraw;
    }

    const totalDraw = equityDraw + debtDraw;
    if (Math.abs(totalDraw - drawdown) > DRAW_TOLERANCE) {
      warnings.push(
        `[Construction Engine] Funding distribution mismatch: equityDraw (${equityDraw}) + debtDraw (${debtDraw}) != drawdown (${drawdown})`
      );

      const difference = drawdown - totalDraw;
      if (difference > 0 && remainingEquity > 0) {
        equityDraw += difference;
        remainingEquity -= difference;
      } else if (difference > 0 && remainingDebt > 0) {
        debtDraw += difference;
        remainingDebt -= difference;
      }
    }

    equityDraws.push(equityDraw);
    debtDraws.push(debtDraw);
  }

  return engineSuccess(
    { equityDraws, debtDraws },
    [buildConstructionTrace('distribute_funding', { debtCap, equityCap, drawdowns: drawdowns.length })],
    warnings
  );
}

/**
 * Generates an S-Curve (Sigmoid) construction spending pattern.
 */
export function generateSCurve(
  totalBudget: number,
  months: number,
  shape: 'linear' | 's-curve' | 'early' = 's-curve'
): EngineResult<number[]> {
  if (months <= 0) {
    return engineFailure(
      'CONSTRUCTION_INVALID_DURATION',
      'Construction duration must be greater than 0 months',
      {
        issues: [issue('construction.duration', 'Duration must be positive')],
        auditTrace: [buildConstructionTrace('generate_s_curve', { totalBudget, months }, 0)],
      }
    );
  }

  if (totalBudget <= 0) {
    return engineFailure(
      'CONSTRUCTION_INVALID_TOTAL',
      'Total construction budget must be greater than 0',
      {
        issues: [issue('construction.total', 'Total budget must be positive')],
        auditTrace: [buildConstructionTrace('generate_s_curve', { totalBudget, months }, 0)],
      }
    );
  }

  if (shape === 'linear') {
    const monthlyAmount = totalBudget / months;
    const data = new Array(months).fill(monthlyAmount);
    return engineSuccess(
      data,
      [buildConstructionTrace('generate_s_curve', { totalBudget, months, shape })]
    );
  }

  const spending: number[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < months; i++) {
    const progressStart = i / months;
    const progressEnd = (i + 1) / months;

    let cdfStart: number;
    let cdfEnd: number;

    if (shape === 'early') {
      const k = 5.0;
      cdfStart = 1 - Math.exp(-k * progressStart);
      cdfEnd = 1 - Math.exp(-k * progressEnd);
      if (progressStart <= 0) cdfStart = 0;
      if (progressEnd >= 1) cdfEnd = 1;
    } else {
      cdfStart = sigmoidCdf(progressStart);
      cdfEnd = sigmoidCdf(progressEnd);
    }

    const monthlySpending = totalBudget * (cdfEnd - cdfStart);
    spending.push(monthlySpending);
  }

  const sum = spending.reduce((acc, val) => acc + val, 0);
  const difference = totalBudget - sum;
  if (Math.abs(difference) > DRAW_TOLERANCE) {
    const nonZeroMonths = spending.filter((val) => val > 0).length || 1;
    const adjustment = difference / nonZeroMonths;
    for (let i = 0; i < months; i++) {
      if (spending[i] > 0) {
        spending[i] += adjustment;
      }
    }
  }

  const finalSum = spending.reduce((acc, val) => acc + val, 0);
  const finalDifference = totalBudget - finalSum;
  if (Math.abs(finalDifference) > DRAW_TOLERANCE) {
    warnings.push(
      `[Construction Engine] S-curve sum (${finalSum}) does not equal totalBudget (${totalBudget}). Difference: ${Math.abs(
        finalDifference
      )}`
    );
    spending[months - 1] += finalDifference;
  }

  return engineSuccess(
    spending,
    [buildConstructionTrace('generate_s_curve', { totalBudget, months, shape })],
    warnings
  );
}

/**
 * S-curve cumulative distribution function (CDF) using cosine approximation.
 */
function sCurveCdf(x: number): number {
  const clampedX = Math.max(0, Math.min(1, x));
  return 0.5 * (1 + Math.sin(Math.PI * (clampedX - 0.5)));
}

/**
 * Sigmoid cumulative distribution function (CDF).
 */
function sigmoidCdf(x: number, steepness: number = 6.0, midpoint: number = 0.5): number {
  const clampedX = Math.max(0, Math.min(1, x));
  if (clampedX <= 0) return 0;
  if (clampedX >= 1) return 1;

  const exponent = -steepness * (clampedX - midpoint);
  return 1 / (1 + Math.exp(exponent));
}
