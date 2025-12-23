/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { ConstructionView } from '../../views/ConstructionView';
import { LanguageProvider } from '../../contexts/LanguageContext';
import type { FullModelInput } from '../../domain/types';

function renderWithProviders(input: FullModelInput) {
  return render(
    <LanguageProvider>
      <ConstructionView input={input} />
    </LanguageProvider>
  );
}

describe('ConstructionView', () => {
  const baseInput: FullModelInput = {
    scenario: {
      id: 'scenario-1',
      name: 'Base Scenario',
      startYear: 2025,
      horizonYears: 5,
      operations: [],
    },
    projectConfig: {
      discountRate: 0.1,
      terminalGrowthRate: 0.02,
      initialInvestment: 1_000_000,
      constructionDuration: 12,
      constructionCurve: 's-curve',
    },
    capitalConfig: {
      initialInvestment: 1_000_000,
      debt: [
        {
          id: 'senior-loan',
          label: 'Senior Loan',
          type: 'SENIOR',
          initialPrincipal: 500_000,
          interestRate: 0.05,
          termYears: 5,
          amortizationType: 'mortgage',
        },
      ],
    },
    waterfallConfig: {
      equityClasses: [],
    },
  };

  beforeEach(() => {
    localStorage.setItem('hfm-language', 'en');
  });

  it('syncs construction controls when project config changes', async () => {
    const { rerender } = renderWithProviders(baseInput);

    const hardCostsInput = (await screen.findByLabelText(/Hard Costs/i)) as HTMLInputElement;
    const softCostsInput = screen.getByLabelText(/Soft Costs/i) as HTMLInputElement;
    const durationInput = screen.getByLabelText(/Duration \(Months\)/i) as HTMLInputElement;

    await waitFor(() => {
      expect(hardCostsInput.value.replace(/\D/g, '')).toBe('700000');
      expect(softCostsInput.value.replace(/\D/g, '')).toBe('300000');
      expect(durationInput.value).toBe('12');
    });

    const updatedInput: FullModelInput = {
      ...baseInput,
      projectConfig: {
        ...baseInput.projectConfig,
        initialInvestment: 2_000_000,
        constructionDuration: 18,
        constructionCurve: 'linear',
      },
      capitalConfig: {
        ...baseInput.capitalConfig,
        initialInvestment: 2_000_000,
        debt: baseInput.capitalConfig.debt?.map(tranche => ({
          ...tranche,
          initialPrincipal: 1_000_000,
        })),
      },
    };

    rerender(
      <LanguageProvider>
        <ConstructionView input={updatedInput} />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(hardCostsInput.value.replace(/\D/g, '')).toBe('1400000');
      expect(softCostsInput.value.replace(/\D/g, '')).toBe('600000');
      expect(durationInput.value).toBe('18');
    });

    const linearButton = screen.getByRole('button', { name: 'Linear' }) as HTMLButtonElement;
    expect(linearButton.style.backgroundColor).toBe('var(--primary)');

    const totalBudgetLabel = screen.getByText('Total Budget');
    const budgetValue = within(totalBudgetLabel.parentElement as HTMLElement).getByText(/2[.,]0{3}[.,]0{3}/);
    expect(budgetValue).toBeTruthy();

    const fundingTable = screen.getByRole('table');
    await waitFor(() => {
      expect(within(fundingTable).getAllByRole('row')).toHaveLength(19);
    });
  });
});

