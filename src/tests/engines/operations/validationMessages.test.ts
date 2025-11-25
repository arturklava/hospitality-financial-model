import { describe, it, expect } from 'vitest';
import { validateOperationDrivers } from '@domain/validation';
import { buildHotelConfig } from '../../helpers/buildOperationConfig';

describe('Operation validation error messaging', () => {
  it('includes operation name and field range for invalid occupancy', () => {
    const invalidHotel = buildHotelConfig({ occupancyByMonth: Array(12).fill(1.2) });

    const result = validateOperationDrivers(invalidHotel);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Operation Test Hotel');
    expect(result.error).toContain('occupancy month 1 (0-1 scale)');
  });
});
