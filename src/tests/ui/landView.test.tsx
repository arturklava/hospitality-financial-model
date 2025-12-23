/**
 * LandView interactions
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LandView } from '../../views/LandView';
import { LanguageProvider } from '../../contexts/LanguageContext';
import type { FullModelInput, LandConfig } from '@domain/types';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');

  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  };
});

function buildInput(landConfigs: LandConfig[]): FullModelInput {
  return {
    scenario: {
      id: 'scenario-1',
      name: 'Scenario',
      startYear: 2024,
      horizonYears: 5,
      operations: [],
    },
    projectConfig: {
      discountRate: 0.1,
      terminalGrowthRate: 0.02,
      initialInvestment: 0,
      landConfigs,
    },
    capitalConfig: {
      initialInvestment: 0,
      debt: [],
    },
    waterfallConfig: {
      equityClasses: [],
    },
  };
}

function renderLandView(
  landConfigs: LandConfig[],
  onProjectConfigChange = vi.fn<(config: Partial<FullModelInput['projectConfig']>) => void>()
) {
  return render(
    <LanguageProvider>
      <LandView input={buildInput(landConfigs)} onProjectConfigChange={onProjectConfigChange} />
    </LanguageProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LandView master list interactions', () => {
  it('removes a land after confirmation and selects the next one', () => {
    const onProjectConfigChange = vi.fn<(config: Partial<FullModelInput['projectConfig']>) => void>();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const initialLandConfigs: LandConfig[] = [
      {
        id: 'land-1',
        name: 'Primary Plot',
        totalCost: 100000,
        acquisitionMonth: 0,
        downPayment: 50000,
        downPaymentMonth: 0,
        barterValue: 0,
      },
      {
        id: 'land-2',
        name: 'Secondary Plot',
        totalCost: 50000,
        acquisitionMonth: 1,
        downPayment: 25000,
        downPaymentMonth: 1,
        barterValue: 0,
      },
    ];

    const { rerender } = renderLandView(initialLandConfigs, onProjectConfigChange);

    const firstCard = screen.getByTestId('land-card-land-1');
    const deleteButton = within(firstCard).getByText('Excluir');
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    const updatedConfig = onProjectConfigChange.mock.calls.at(-1)?.[0].landConfigs ?? [];
    expect(updatedConfig).toHaveLength(1);
    expect(updatedConfig?.[0].id).toBe('land-2');

    rerender(
      <LanguageProvider>
        <LandView input={buildInput(updatedConfig)} onProjectConfigChange={onProjectConfigChange} />
      </LanguageProvider>
    );

    expect(screen.queryByTestId('land-card-land-1')).toBeNull();
    expect(screen.getByText('Secondary Plot')).toBeInTheDocument();
  });

  it('duplicates a land with a new id and focuses the copy', () => {
    const onProjectConfigChange = vi.fn<(config: Partial<FullModelInput['projectConfig']>) => void>();
    vi.spyOn(Date, 'now').mockReturnValue(123456);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const initialLandConfigs: LandConfig[] = [
      {
        id: 'land-1',
        name: 'Lakeside Parcel',
        totalCost: 75000,
        acquisitionMonth: 0,
        downPayment: 20000,
        downPaymentMonth: 0,
        barterValue: 0,
      },
    ];

    const { rerender } = renderLandView(initialLandConfigs, onProjectConfigChange);

    const card = screen.getByTestId('land-card-land-1');
    const duplicateButton = within(card).getByText('Duplicar');
    fireEvent.click(duplicateButton);

    const updatedConfigs = onProjectConfigChange.mock.calls.at(-1)?.[0].landConfigs ?? [];
    expect(updatedConfigs).toHaveLength(2);
    expect(updatedConfigs[1].id).toContain('land-123456-');
    expect(updatedConfigs[1].id).not.toBe(initialLandConfigs[0].id);

    rerender(
      <LanguageProvider>
        <LandView input={buildInput(updatedConfigs)} onProjectConfigChange={onProjectConfigChange} />
      </LanguageProvider>
    );

    expect(screen.getByText('Lakeside Parcel (cópia)')).toBeInTheDocument();
  });

  it('updates land name inline and saves via project config change', () => {
    const onProjectConfigChange = vi.fn<(config: Partial<FullModelInput['projectConfig']>) => void>();
    const initialLandConfigs: LandConfig[] = [
      {
        id: 'land-1',
        name: 'Editable Name',
        totalCost: 1000,
        acquisitionMonth: 0,
        downPayment: 0,
        downPaymentMonth: 0,
        barterValue: 0,
      },
    ];

    renderLandView(initialLandConfigs, onProjectConfigChange);

    const nameInput = screen.getByTestId('land-name-land-1') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Updated Parcel' } });

    const updatedConfig = onProjectConfigChange.mock.calls.at(-1)?.[0].landConfigs ?? [];
    expect(updatedConfig[0].name).toBe('Updated Parcel');
  });

  it('uses translation default for new land names', () => {
    const onProjectConfigChange = vi.fn<(config: Partial<FullModelInput['projectConfig']>) => void>();
    vi.spyOn(Date, 'now').mockReturnValue(777);

    renderLandView([], onProjectConfigChange);

    const addButton = screen.getByText('+ Adicionar Terreno');
    fireEvent.click(addButton);

    const newConfig = onProjectConfigChange.mock.calls.at(-1)?.[0].landConfigs ?? [];
    expect(newConfig[0].name).toBe('Nova aquisição de terreno');
    expect(newConfig[0].id).toBe('land-777');
  });
});
