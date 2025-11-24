import { describe, it, expect } from 'vitest';
import {
  generateDrawdownCurve,
  distributeFunding,
  generateSCurve,
} from '@engines/project/constructionEngine';

describe('Construction Engine', () => {
  describe('generateDrawdownCurve', () => {
    describe('Linear distribution', () => {
      it('should generate equal monthly drawdowns for linear curve', () => {
        const total = 12_000_000;
        const months = 12;
        const drawdowns = generateDrawdownCurve(total, months, 'linear');

        expect(drawdowns.length).toBe(12);
        
        // Each month should be equal
        const expectedMonthly = total / months;
        drawdowns.forEach((drawdown) => {
          expect(drawdown).toBeCloseTo(expectedMonthly, 2);
        });

        // Sum should equal total
        const sum = drawdowns.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(total, 2);
      });

      it('should handle 6-month construction', () => {
        const total = 6_000_000;
        const months = 6;
        const drawdowns = generateDrawdownCurve(total, months, 'linear');

        expect(drawdowns.length).toBe(6);
        const sum = drawdowns.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(total, 2);
      });

      it('should handle single month construction', () => {
        const total = 1_000_000;
        const months = 1;
        const drawdowns = generateDrawdownCurve(total, months, 'linear');

        expect(drawdowns.length).toBe(1);
        expect(drawdowns[0]).toBeCloseTo(total, 2);
      });
    });

    describe('S-curve distribution', () => {
      it('should generate S-curve drawdowns that sum to total', () => {
        const total = 12_000_000;
        const months = 12;
        const drawdowns = generateDrawdownCurve(total, months, 's-curve');

        expect(drawdowns.length).toBe(12);
        
        // Sum should equal total (within floating-point precision)
        const sum = drawdowns.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(total, 2);
      });

      it('should show S-curve pattern: slow start, peak, slow finish', () => {
        const total = 12_000_000;
        const months = 12;
        const drawdowns = generateDrawdownCurve(total, months, 's-curve');

        // First few months should be smaller (slow start)
        const firstQuarter = drawdowns.slice(0, 3).reduce((acc, val) => acc + val, 0);
        const middleQuarter = drawdowns.slice(4, 7).reduce((acc, val) => acc + val, 0);
        const lastQuarter = drawdowns.slice(9, 12).reduce((acc, val) => acc + val, 0);

        // Middle should be larger than start and end
        expect(middleQuarter).toBeGreaterThan(firstQuarter);
        expect(middleQuarter).toBeGreaterThan(lastQuarter);

        // First month should be smaller than middle months
        expect(drawdowns[0]).toBeLessThan(drawdowns[5]);
        expect(drawdowns[0]).toBeLessThan(drawdowns[6]);

        // Last month should be smaller than middle months
        expect(drawdowns[11]).toBeLessThan(drawdowns[5]);
        expect(drawdowns[11]).toBeLessThan(drawdowns[6]);
      });

      it('should handle 18-month construction', () => {
        const total = 18_000_000;
        const months = 18;
        const drawdowns = generateDrawdownCurve(total, months, 's-curve');

        expect(drawdowns.length).toBe(18);
        const sum = drawdowns.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(total, 2);
      });

      it('should handle 24-month construction', () => {
        const total = 24_000_000;
        const months = 24;
        const drawdowns = generateDrawdownCurve(total, months, 's-curve');

        expect(drawdowns.length).toBe(24);
        const sum = drawdowns.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(total, 2);
      });
    });

    describe('Edge cases', () => {
      it('should throw error for zero months', () => {
        expect(() => {
          generateDrawdownCurve(1_000_000, 0, 'linear');
        }).toThrow('Construction duration must be greater than 0 months');
      });

      it('should throw error for negative months', () => {
        expect(() => {
          generateDrawdownCurve(1_000_000, -1, 'linear');
        }).toThrow('Construction duration must be greater than 0 months');
      });

      it('should throw error for zero total', () => {
        expect(() => {
          generateDrawdownCurve(0, 12, 'linear');
        }).toThrow('Total construction budget must be greater than 0');
      });

      it('should throw error for negative total', () => {
        expect(() => {
          generateDrawdownCurve(-1_000_000, 12, 'linear');
        }).toThrow('Total construction budget must be greater than 0');
      });
    });

    describe('Property-based invariants', () => {
      it('should always produce positive drawdowns', () => {
        const total = 10_000_000;
        const months = 12;
        
        const linearDrawdowns = generateDrawdownCurve(total, months, 'linear');
        const sCurveDrawdowns = generateDrawdownCurve(total, months, 's-curve');

        [...linearDrawdowns, ...sCurveDrawdowns].forEach((drawdown) => {
          expect(drawdown).toBeGreaterThan(0);
        });
      });

      it('should always sum to total (within precision)', () => {
        const testCases = [
          { total: 1_000_000, months: 1 },
          { total: 5_000_000, months: 6 },
          { total: 10_000_000, months: 12 },
          { total: 50_000_000, months: 18 },
          { total: 100_000_000, months: 24 },
        ];

        testCases.forEach(({ total, months }) => {
          const linearDrawdowns = generateDrawdownCurve(total, months, 'linear');
          const sCurveDrawdowns = generateDrawdownCurve(total, months, 's-curve');

          const linearSum = linearDrawdowns.reduce((acc, val) => acc + val, 0);
          const sCurveSum = sCurveDrawdowns.reduce((acc, val) => acc + val, 0);

          expect(linearSum).toBeCloseTo(total, 2);
          expect(sCurveSum).toBeCloseTo(total, 2);
        });
      });

      it('should produce same length as months', () => {
        const monthsArray = [1, 3, 6, 12, 18, 24];
        const total = 12_000_000;

        monthsArray.forEach((months) => {
          const linearDrawdowns = generateDrawdownCurve(total, months, 'linear');
          const sCurveDrawdowns = generateDrawdownCurve(total, months, 's-curve');

          expect(linearDrawdowns.length).toBe(months);
          expect(sCurveDrawdowns.length).toBe(months);
        });
      });
    });
  });

  describe('distributeFunding', () => {
    describe('Equity-first method', () => {
      it('should use equity until exhausted, then debt', () => {
        const drawdowns = [2_000_000, 3_000_000, 3_000_000, 2_000_000];
        const debtCap = 4_000_000;
        const equityCap = 6_000_000;

        const result = distributeFunding(drawdowns, debtCap, equityCap, 'equity_first');

        expect(result.equityDraws.length).toBe(4);
        expect(result.debtDraws.length).toBe(4);

        // First two months: equity should cover (2M + 3M = 5M < 6M equity)
        expect(result.equityDraws[0]).toBe(2_000_000);
        expect(result.debtDraws[0]).toBe(0);
        expect(result.equityDraws[1]).toBe(3_000_000);
        expect(result.debtDraws[1]).toBe(0);

        // Third month: equity has 1M remaining, so 1M equity + 2M debt
        expect(result.equityDraws[2]).toBe(1_000_000);
        expect(result.debtDraws[2]).toBe(2_000_000);

        // Fourth month: equity exhausted, all from debt
        expect(result.equityDraws[3]).toBe(0);
        expect(result.debtDraws[3]).toBe(2_000_000);

        // Invariant: equity + debt = drawdown for each month
        drawdowns.forEach((drawdown, i) => {
          const total = result.equityDraws[i] + result.debtDraws[i];
          expect(total).toBeCloseTo(drawdown, 2);
        });
      });

      it('should handle all equity funding', () => {
        const drawdowns = [2_000_000, 2_000_000, 2_000_000];
        const debtCap = 0;
        const equityCap = 10_000_000;

        const result = distributeFunding(drawdowns, debtCap, equityCap, 'equity_first');

        expect(result.equityDraws).toEqual([2_000_000, 2_000_000, 2_000_000]);
        expect(result.debtDraws).toEqual([0, 0, 0]);
      });

      it('should handle all debt funding', () => {
        const drawdowns = [2_000_000, 2_000_000, 2_000_000];
        const debtCap = 10_000_000;
        const equityCap = 0;

        const result = distributeFunding(drawdowns, debtCap, equityCap, 'equity_first');

        expect(result.equityDraws).toEqual([0, 0, 0]);
        expect(result.debtDraws).toEqual([2_000_000, 2_000_000, 2_000_000]);
      });

      it('should handle equal equity and debt capacity', () => {
        const drawdowns = [3_000_000, 3_000_000, 4_000_000];
        const debtCap = 5_000_000;
        const equityCap = 5_000_000;

        const result = distributeFunding(drawdowns, debtCap, equityCap, 'equity_first');

        // First month: 3M equity
        expect(result.equityDraws[0]).toBe(3_000_000);
        expect(result.debtDraws[0]).toBe(0);

        // Second month: 2M equity (remaining) + 1M debt
        expect(result.equityDraws[1]).toBe(2_000_000);
        expect(result.debtDraws[1]).toBe(1_000_000);

        // Third month: 1M debt (remaining) + 3M debt (exceeds capacity)
        // This should throw an error
      });

      it('should throw error when funding capacity is insufficient', () => {
        const drawdowns = [5_000_000, 5_000_000, 5_000_000];
        const debtCap = 3_000_000;
        const equityCap = 3_000_000;

        expect(() => {
          distributeFunding(drawdowns, debtCap, equityCap, 'equity_first');
        }).toThrow('Insufficient funding capacity');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty drawdowns array', () => {
        const result = distributeFunding([], 1_000_000, 1_000_000, 'equity_first');
        
        expect(result.equityDraws).toEqual([]);
        expect(result.debtDraws).toEqual([]);
      });

      it('should throw error for negative drawdown', () => {
        expect(() => {
          distributeFunding([-1_000_000], 1_000_000, 1_000_000, 'equity_first');
        }).toThrow('Drawdown amounts must be non-negative');
      });

      it('should throw error for unsupported method', () => {
        expect(() => {
          distributeFunding([1_000_000], 1_000_000, 1_000_000, 'pari_passu' as any);
        }).toThrow('is not yet implemented');
      });
    });

    describe('Property-based invariants', () => {
      it('should always satisfy equity + debt = drawdown', () => {
        const testCases = [
          {
            drawdowns: [1_000_000, 2_000_000, 3_000_000],
            debtCap: 10_000_000,
            equityCap: 10_000_000,
          },
          {
            drawdowns: [5_000_000, 5_000_000],
            debtCap: 8_000_000,
            equityCap: 2_000_000,
          },
          {
            drawdowns: [100_000, 200_000, 300_000, 400_000],
            debtCap: 500_000,
            equityCap: 500_000,
          },
        ];

        testCases.forEach(({ drawdowns, debtCap, equityCap }) => {
          const result = distributeFunding(drawdowns, debtCap, equityCap, 'equity_first');

          drawdowns.forEach((drawdown, i) => {
            const total = result.equityDraws[i] + result.debtDraws[i];
            expect(total).toBeCloseTo(drawdown, 2);
          });
        });
      });

      it('should always produce arrays of same length as drawdowns', () => {
        const drawdowns = [1_000_000, 2_000_000, 3_000_000, 4_000_000];
        const result = distributeFunding(drawdowns, 10_000_000, 10_000_000, 'equity_first');

        expect(result.equityDraws.length).toBe(drawdowns.length);
        expect(result.debtDraws.length).toBe(drawdowns.length);
      });

      it('should always produce non-negative values', () => {
        const drawdowns = [1_000_000, 2_000_000, 3_000_000];
        const result = distributeFunding(drawdowns, 10_000_000, 10_000_000, 'equity_first');

        [...result.equityDraws, ...result.debtDraws].forEach((value) => {
          expect(value).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  describe('generateSCurve', () => {
    describe('Linear shape', () => {
      it('should generate equal monthly spending for linear shape', () => {
        const totalBudget = 12_000_000;
        const months = 12;
        const spending = generateSCurve(totalBudget, months, 'linear');

        expect(spending.length).toBe(12);
        
        // Each month should be equal
        const expectedMonthly = totalBudget / months;
        spending.forEach((amount) => {
          expect(amount).toBeCloseTo(expectedMonthly, 2);
        });

        // Sum should equal totalBudget exactly
        const sum = spending.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(totalBudget, 2);
      });

      it('should handle 6-month construction with linear shape', () => {
        const totalBudget = 6_000_000;
        const months = 6;
        const spending = generateSCurve(totalBudget, months, 'linear');

        expect(spending.length).toBe(6);
        const sum = spending.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(totalBudget, 2);
      });

      it('should handle single month construction with linear shape', () => {
        const totalBudget = 1_000_000;
        const months = 1;
        const spending = generateSCurve(totalBudget, months, 'linear');

        expect(spending.length).toBe(1);
        expect(spending[0]).toBeCloseTo(totalBudget, 2);
      });
    });

    describe('S-curve shape', () => {
      it('should generate S-curve spending that sums to totalBudget exactly', () => {
        const totalBudget = 12_000_000;
        const months = 12;
        const spending = generateSCurve(totalBudget, months, 's-curve');

        expect(spending.length).toBe(12);
        
        // Sum should equal totalBudget exactly (within floating-point precision)
        const sum = spending.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(totalBudget, 2);
      });

      it('should show S-curve pattern: low spend at start/end, high spend in middle', () => {
        const totalBudget = 12_000_000;
        const months = 12;
        const spending = generateSCurve(totalBudget, months, 's-curve');

        // First month should be low (slow start)
        const firstMonth = spending[0];
        
        // Last month should be low (slow finish)
        const lastMonth = spending[months - 1];
        
        // Middle months should be higher (peak spending)
        const middleMonths = spending.slice(Math.floor(months / 2) - 1, Math.floor(months / 2) + 2);
        const avgMiddle = middleMonths.reduce((acc, val) => acc + val, 0) / middleMonths.length;

        // First month should be less than average middle spending
        expect(firstMonth).toBeLessThan(avgMiddle);
        
        // Last month should be less than average middle spending
        expect(lastMonth).toBeLessThan(avgMiddle);

        // First quarter should have lower total than middle quarter
        const firstQuarter = spending.slice(0, Math.floor(months / 4)).reduce((acc, val) => acc + val, 0);
        const middleQuarter = spending.slice(Math.floor(months / 2) - 1, Math.floor(months / 2) + Math.floor(months / 4)).reduce((acc, val) => acc + val, 0);
        const lastQuarter = spending.slice(months - Math.floor(months / 4)).reduce((acc, val) => acc + val, 0);

        // Middle quarter should be greater than first and last quarters
        expect(middleQuarter).toBeGreaterThan(firstQuarter);
        expect(middleQuarter).toBeGreaterThan(lastQuarter);
      });

      it('should verify S-curve has low spend at start and end', () => {
        const totalBudget = 24_000_000;
        const months = 24;
        const spending = generateSCurve(totalBudget, months, 's-curve');

        // First 25% of months should have lower average than middle 50%
        const firstQuarterEnd = Math.floor(months * 0.25);
        const middleStart = Math.floor(months * 0.25);
        const middleEnd = Math.floor(months * 0.75);
        const lastQuarterStart = Math.floor(months * 0.75);

        const firstQuarterAvg = spending.slice(0, firstQuarterEnd).reduce((acc, val) => acc + val, 0) / firstQuarterEnd;
        const middleAvg = spending.slice(middleStart, middleEnd).reduce((acc, val) => acc + val, 0) / (middleEnd - middleStart);
        const lastQuarterAvg = spending.slice(lastQuarterStart).reduce((acc, val) => acc + val, 0) / (months - lastQuarterStart);

        // Middle should be higher than start
        expect(middleAvg).toBeGreaterThan(firstQuarterAvg);
        
        // Middle should be higher than end
        expect(middleAvg).toBeGreaterThan(lastQuarterAvg);
      });

      it('should handle 18-month construction with S-curve', () => {
        const totalBudget = 18_000_000;
        const months = 18;
        const spending = generateSCurve(totalBudget, months, 's-curve');

        expect(spending.length).toBe(18);
        const sum = spending.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(totalBudget, 2);
      });

      it('should handle 24-month construction with S-curve', () => {
        const totalBudget = 24_000_000;
        const months = 24;
        const spending = generateSCurve(totalBudget, months, 's-curve');

        expect(spending.length).toBe(24);
        const sum = spending.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(totalBudget, 2);
      });
    });

    describe('Early shape', () => {
      it('should generate early/front-loaded spending that sums to totalBudget', () => {
        const totalBudget = 12_000_000;
        const months = 12;
        const spending = generateSCurve(totalBudget, months, 'early');

        expect(spending.length).toBe(12);
        const sum = spending.reduce((acc, val) => acc + val, 0);
        expect(sum).toBeCloseTo(totalBudget, 2);
      });

      it('should show early pattern: high spend at start, low spend at end', () => {
        const totalBudget = 12_000_000;
        const months = 12;
        const spending = generateSCurve(totalBudget, months, 'early');

        // First month should be high (front-loaded)
        const firstMonth = spending[0];
        
        // Last month should be low
        const lastMonth = spending[months - 1];
        
        // First month should be greater than last month
        expect(firstMonth).toBeGreaterThan(lastMonth);

        // First quarter should have higher total than last quarter
        const firstQuarter = spending.slice(0, Math.floor(months / 4)).reduce((acc, val) => acc + val, 0);
        const lastQuarter = spending.slice(months - Math.floor(months / 4)).reduce((acc, val) => acc + val, 0);

        expect(firstQuarter).toBeGreaterThan(lastQuarter);
      });
    });

    describe('Edge cases', () => {
      it('should throw error for zero months', () => {
        expect(() => {
          generateSCurve(1_000_000, 0, 'linear');
        }).toThrow('Construction duration must be greater than 0 months');
      });

      it('should throw error for negative months', () => {
        expect(() => {
          generateSCurve(1_000_000, -1, 'linear');
        }).toThrow('Construction duration must be greater than 0 months');
      });

      it('should throw error for zero totalBudget', () => {
        expect(() => {
          generateSCurve(0, 12, 'linear');
        }).toThrow('Total construction budget must be greater than 0');
      });

      it('should throw error for negative totalBudget', () => {
        expect(() => {
          generateSCurve(-1_000_000, 12, 'linear');
        }).toThrow('Total construction budget must be greater than 0');
      });
    });

    describe('Property-based invariants', () => {
      it('should always produce positive spending amounts', () => {
        const totalBudget = 10_000_000;
        const months = 12;
        
        const linearSpending = generateSCurve(totalBudget, months, 'linear');
        const sCurveSpending = generateSCurve(totalBudget, months, 's-curve');
        const earlySpending = generateSCurve(totalBudget, months, 'early');

        [...linearSpending, ...sCurveSpending, ...earlySpending].forEach((amount) => {
          expect(amount).toBeGreaterThan(0);
        });
      });

      it('should always sum to totalBudget exactly (within precision)', () => {
        const testCases = [
          { totalBudget: 1_000_000, months: 1 },
          { totalBudget: 5_000_000, months: 6 },
          { totalBudget: 10_000_000, months: 12 },
          { totalBudget: 50_000_000, months: 18 },
          { totalBudget: 100_000_000, months: 24 },
        ];

        testCases.forEach(({ totalBudget, months }) => {
          const linearSpending = generateSCurve(totalBudget, months, 'linear');
          const sCurveSpending = generateSCurve(totalBudget, months, 's-curve');
          const earlySpending = generateSCurve(totalBudget, months, 'early');

          const linearSum = linearSpending.reduce((acc, val) => acc + val, 0);
          const sCurveSum = sCurveSpending.reduce((acc, val) => acc + val, 0);
          const earlySum = earlySpending.reduce((acc, val) => acc + val, 0);

          expect(linearSum).toBeCloseTo(totalBudget, 2);
          expect(sCurveSum).toBeCloseTo(totalBudget, 2);
          expect(earlySum).toBeCloseTo(totalBudget, 2);
        });
      });

      it('should produce same length as months', () => {
        const monthsArray = [1, 3, 6, 12, 18, 24];
        const totalBudget = 12_000_000;

        monthsArray.forEach((months) => {
          const linearSpending = generateSCurve(totalBudget, months, 'linear');
          const sCurveSpending = generateSCurve(totalBudget, months, 's-curve');
          const earlySpending = generateSCurve(totalBudget, months, 'early');

          expect(linearSpending.length).toBe(months);
          expect(sCurveSpending.length).toBe(months);
          expect(earlySpending.length).toBe(months);
        });
      });
    });
  });
});

