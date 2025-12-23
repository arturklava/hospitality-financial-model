/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { LandView } from '../../views/LandView';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { buildScenarioBundle } from '../../sampleData';
import type { FullModelInput } from '../../domain/types';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<any>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
      <div data-testid="y-axis">{tickFormatter ? tickFormatter(1_500_000) : null}</div>
    ),
    CartesianGrid: () => <div data-testid="grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
  };
});

function buildLandInput(barterValue?: number): FullModelInput {
  const base = buildScenarioBundle('BASE');

  return {
    scenario: base.scenario,
    projectConfig: {
      ...base.projectConfig,
      landConfigs: [
        {
          id: 'land-1',
          name: 'Test Parcel',
          totalCost: 1_200_000,
          acquisitionMonth: -12,
          downPayment: 200_000,
          downPaymentMonth: -12,
          barterValue,
          barterMonth: -6,
        },
      ],
    },
    capitalConfig: base.capitalConfig,
    waterfallConfig: base.waterfallConfig,
  };
}

function renderLandView(input: FullModelInput, onProjectConfigChange = vi.fn()) {
  return render(
    <LanguageProvider>
      <LandView input={input} onProjectConfigChange={onProjectConfigChange} />
    </LanguageProvider>
  );
}

describe('LandView barter percentage handling', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('hfm-language', 'en');
  });

  it('normalizes barter percentage input whether provided as 0-1 or 0-100', () => {
    const onProjectConfigChange = vi.fn();
    const input = buildLandInput(0.1);

    renderLandView(input, onProjectConfigChange);

    const barterField = screen.getByLabelText('Barter %') as HTMLInputElement;
    expect(barterField.value).toContain('10');

    fireEvent.change(barterField, { target: { value: '50' } });

    const updatedConfig = onProjectConfigChange.mock.calls.at(-1)?.[0] as FullModelInput['projectConfig'];
    expect(updatedConfig?.landConfigs?.[0].barterValue).toBeCloseTo(0.5, 5);
    expect(screen.queryByText(/value between 0 and 1/i)).toBeNull();
  });

  it('shows validation alerts and clears barter value when input is out of range', () => {
    const onProjectConfigChange = vi.fn();
    const input = buildLandInput(0.1);

    renderLandView(input, onProjectConfigChange);

    const barterField = screen.getByLabelText('Barter %');
    fireEvent.change(barterField, { target: { value: '150' } });

    expect(screen.getByRole('alert').textContent).toContain('Use a value between 0 and 1');

    const updatedConfig = onProjectConfigChange.mock.calls.at(-1)?.[0] as FullModelInput['projectConfig'];
    expect(updatedConfig?.landConfigs?.[0].barterValue).toBeUndefined();
  });

  it('renders currency ticks with the localized symbol for the payment chart', () => {
    localStorage.setItem('hfm-language', 'pt');
    const input = buildLandInput(0.15);

    renderLandView(input);

    expect(screen.getByTestId('y-axis').textContent).toContain('R$');
  });
});
