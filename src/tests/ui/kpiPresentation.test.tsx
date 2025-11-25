/**
 * KPI Presentation Tests (UI clarity)
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ResultsSummary } from '../../components/ResultsSummary';
import { WaterfallTable } from '../../components/WaterfallTable';
import { AuditProvider } from '../../ui/contexts/AuditContext';
import type { DcfValuation, DebtKpi, ProjectKpis, WaterfallResult } from '../../domain/types';
import type { ReactNode } from 'react';

function renderWithAudit(ui: ReactNode) {
  return render(<AuditProvider>{ui}</AuditProvider>);
}

describe('KPI presentation', () => {
  it('renders project KPIs with units and provided values', () => {
    const projectKpis: ProjectKpis = {
      npv: 123456,
      unleveredIrr: 0.12,
      equityMultiple: 2.1,
      paybackPeriod: 5,
    };

    const dcfValuation: DcfValuation = {
      discountRate: 0.1,
      terminalGrowthRate: 0.02,
      cashFlows: [-1000000, 200000, 300000, 500000],
      npv: 123456,
      enterpriseValue: 950000,
      equityValue: 950000,
      terminalValue: 400000,
    };

    const debtKpis: DebtKpi[] = [
      { yearIndex: 0, dscr: 1.1, ltv: 0.65 },
      { yearIndex: 1, dscr: 1.3, ltv: 0.6 },
    ];

    renderWithAudit(
      <ResultsSummary
        projectKpis={projectKpis}
        dcfValuation={dcfValuation}
        debtKpis={debtKpis}
      />
    );

    expect(screen.getByText('NPV (unlevered, USD)')).toBeInTheDocument();
    expect(screen.getByText('$123,456')).toBeInTheDocument();
    expect(screen.getByText('Unlevered IRR (%)')).toBeInTheDocument();
    expect(screen.getByText('12.00%')).toBeInTheDocument();
    expect(screen.getByText('Equity Multiple (unlevered)')).toBeInTheDocument();
    expect(screen.getByText('2.10x')).toBeInTheDocument();
    expect(screen.getByText('Average DSCR (levered)')).toBeInTheDocument();
    expect(screen.getByText('1.20')).toBeInTheDocument();
    expect(screen.getByText('Max LTV (levered)')).toBeInTheDocument();
    expect(screen.getByText('65.00%')).toBeInTheDocument();
  });

  it('renders levered waterfall labels and partner KPIs with units', () => {
    const waterfall: WaterfallResult = {
      ownerCashFlows: [-500000, 200000, 300000],
      partners: [
        {
          partnerId: 'lp',
          cashFlows: [-400000, 150000, 220000],
          cumulativeCashFlows: [-400000, -250000, -30000],
          irr: 0.15,
          moic: 1.5,
        },
        {
          partnerId: 'gp',
          cashFlows: [-100000, 50000, 80000],
          cumulativeCashFlows: [-100000, -50000, 30000],
          irr: 0.18,
          moic: 1.6,
        },
      ],
      annualRows: [
        {
          yearIndex: 0,
          ownerCashFlow: -500000,
          partnerDistributions: { lp: -400000, gp: -100000 },
        },
        {
          yearIndex: 1,
          ownerCashFlow: 200000,
          partnerDistributions: { lp: 150000, gp: 50000 },
        },
      ],
    };

    renderWithAudit(<WaterfallTable waterfall={waterfall} />);

    expect(screen.getByRole('columnheader', { name: /Owner CF \(levered, USD\)/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /LP Distribution \(USD\)/i })).toBeInTheDocument();
    expect(screen.getByText('$200,000')).toBeInTheDocument();
    expect(screen.getAllByText('15.00%')[0]).toBeInTheDocument();
    expect(screen.getAllByText('1.50x')[0]).toBeInTheDocument();
  });
});
