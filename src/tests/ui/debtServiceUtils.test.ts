import { describe, expect, it } from 'vitest';

import { DebtSchedule } from '@domain/types';
import { calculateTotalDebtService } from '../../ui/utils/debtService';

describe('calculateTotalDebtService', () => {
  it('sums interest and principal across all schedule entries', () => {
    const schedule: DebtSchedule = {
      entries: [
        { yearIndex: 0, beginningBalance: 100000, interest: 6000, principal: 10000, endingBalance: 90000 },
        { yearIndex: 1, beginningBalance: 90000, interest: 5400, principal: 10000, endingBalance: 80000 },
        { yearIndex: 2, beginningBalance: 80000, interest: 4800, principal: 10000, endingBalance: 70000 },
      ],
    };

    const totalDebtService = calculateTotalDebtService(schedule);

    expect(totalDebtService).toBe(6000 + 10000 + 5400 + 10000 + 4800 + 10000);
  });

  it('returns zero for an empty schedule', () => {
    const schedule: DebtSchedule = { entries: [] };

    const totalDebtService = calculateTotalDebtService(schedule);

    expect(totalDebtService).toBe(0);
  });
});
