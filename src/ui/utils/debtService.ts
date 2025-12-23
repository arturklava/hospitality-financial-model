import { DebtSchedule } from '@domain/types';

/**
 * Calculates the total debt service (interest + principal) across the provided schedule.
 *
 * Falls back to 0 when the schedule is empty.
 */
export function calculateTotalDebtService(debtSchedule: DebtSchedule): number {
  return debtSchedule.entries.reduce((sum, entry) => sum + entry.interest + entry.principal, 0);
}
