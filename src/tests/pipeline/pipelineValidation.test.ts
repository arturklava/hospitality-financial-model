import { describe, it, expect } from 'vitest';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import {
  buildSampleCapitalConfig,
  buildSampleProjectConfig,
  buildSampleWaterfallConfig,
  buildSampleHotelConfig,
} from '../../sampleData';
import type { HotelConfig, ProjectScenario } from '@domain/types';

describe('Pipeline validation propagation', () => {
  it('throws when upstream operation driver validation fails', () => {
    const brokenHotel: HotelConfig = {
      ...buildSampleHotelConfig(),
      id: 'broken-hotel',
      name: 'Broken Hotel',
      occupancyByMonth: [1.15, ...Array(11).fill(0.85)],
      avgDailyRate: 0,
    };

    const scenario: ProjectScenario = {
      id: 'validation-propagation',
      name: 'Validation Propagation Scenario',
      startYear: 2026,
      horizonYears: 1,
      operations: [brokenHotel],
    };

    const projectConfig = buildSampleProjectConfig();
    const capitalConfig = buildSampleCapitalConfig();
    const waterfallConfig = buildSampleWaterfallConfig();

    expect(() =>
      runFullModel({
        scenario,
        projectConfig,
        capitalConfig,
        waterfallConfig,
      })
    ).toThrow(/Scenario engine failed: .*validation/);
  });
});
