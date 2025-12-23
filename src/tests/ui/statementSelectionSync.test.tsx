/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { CashFlowView } from '../../views/CashFlowView';
import { PnLView } from '../../views/PnLView';
import { buildHotelConfig } from '../helpers/buildOperationConfig';
import type { FullModelInput, FullModelOutput } from '../../domain/types';

const generateCashFlowStatementRowsMock = vi.fn();
const filterAndAggregatePnlMock = vi.fn();

vi.mock('../../engines/analytics/statementGenerator', () => ({
  generateCashFlowStatementRows: (...args: any[]) => generateCashFlowStatementRowsMock(...args),
  filterAndAggregatePnl: (...args: any[]) => filterAndAggregatePnlMock(...args),
}));

function createStubModelOutput(): FullModelOutput {
  return {
    scenario: {
      id: 'scenario-1',
      name: 'Test',
      startYear: 2025,
      horizonYears: 1,
      operations: [],
    },
  } as unknown as FullModelOutput;
}

function createStubModelInput(): FullModelInput {
  return {
    projectConfig: {} as any,
    capitalConfig: {} as any,
  } as unknown as FullModelInput;
}

describe('Financial statement views keep selection in sync with operations', () => {
  const modelOutput = createStubModelOutput();
  const modelInput = createStubModelInput();

  beforeEach(() => {
    generateCashFlowStatementRowsMock.mockReset();
    filterAndAggregatePnlMock.mockReset();
  });

  it('reapplies selection defaults when operations are added or removed in CashFlowView', async () => {
    const operations = [
      buildHotelConfig({ id: 'op-1', name: 'Operation One' }),
      buildHotelConfig({ id: 'op-2', name: 'Operation Two' }),
    ];

    generateCashFlowStatementRowsMock.mockImplementation((_, selectedIds: string[]) => (
      selectedIds.length === 0
        ? []
        : [{ id: 'net', label: `rows:${selectedIds.sort().join(',')}`, level: 0, values: [selectedIds.length] }]
    ));

    const { rerender } = render(
      <LanguageProvider>
        <CashFlowView operations={operations} modelOutput={modelOutput} input={modelInput} />
      </LanguageProvider>
    );

    expect(await screen.findByText('rows:op-1,op-2')).toBeInTheDocument();

    const updatedOperations = [
      buildHotelConfig({ id: 'op-2', name: 'Operation Two' }),
      buildHotelConfig({ id: 'op-3', name: 'Operation Three' }),
    ];

    rerender(
      <LanguageProvider>
        <CashFlowView operations={updatedOperations} modelOutput={modelOutput} input={modelInput} />
      </LanguageProvider>
    );

    expect(await screen.findByText('rows:op-2,op-3')).toBeInTheDocument();
  });

  it('preserves user choices while auto including new active operations in PnLView', async () => {
    const operations = [
      buildHotelConfig({ id: 'op-1', name: 'Operation One' }),
      buildHotelConfig({ id: 'op-2', name: 'Operation Two' }),
    ];

    filterAndAggregatePnlMock.mockImplementation((_, selectedIds: string[]) => ([{
      yearIndex: 0,
      revenueTotal: selectedIds.length * 100,
      departmentalExpenses: 0,
      gop: selectedIds.length * 50,
      undistributedExpenses: 0,
      noi: selectedIds.length * 50,
      maintenanceCapex: 0,
      cashFlow: selectedIds.length * 50,
    }]));

    const { rerender } = render(
      <LanguageProvider>
        <PnLView operations={operations} modelOutput={modelOutput} />
      </LanguageProvider>
    );

    expect(await screen.findByText('R$ 200')).toBeInTheDocument();

    const [, secondCheckbox] = screen.getAllByRole('checkbox');
    fireEvent.click(secondCheckbox);

    expect(await screen.findByText('R$ 100')).toBeInTheDocument();

    const updatedOperations = [
      buildHotelConfig({ id: 'op-1', name: 'Operation One' }),
      buildHotelConfig({ id: 'op-3', name: 'Operation Three' }),
    ];

    rerender(
      <LanguageProvider>
        <PnLView operations={updatedOperations} modelOutput={modelOutput} />
      </LanguageProvider>
    );

    expect(await screen.findByText('R$ 200')).toBeInTheDocument();
  });

  it('shows a friendly empty state when no active operations are available', async () => {
    generateCashFlowStatementRowsMock.mockReturnValue([]);

    render(
      <LanguageProvider>
        <CashFlowView operations={[]} modelOutput={modelOutput} input={modelInput} />
      </LanguageProvider>
    );

    expect(await screen.findByText('Nenhuma operação ativa disponível')).toBeInTheDocument();
  });
});
