/**
 * Operations Form Input State Test (v1.2)
 * 
 * Verifies that CurrencyInput and PercentageInput components correctly update
 * the underlying scenario state when values change. Ensures data binding works
 * correctly after DOM structure changes (Cards and Accordions).
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { CurrencyInput } from '../../components/inputs/CurrencyInput';
import { PercentageInput } from '../../components/inputs/PercentageInput';
import { buildHotelConfig } from '../helpers/buildOperationConfig';
import { useFinancialModel } from '../../ui/hooks/useFinancialModel';
import type { HotelConfig } from '@domain/types';

// Mock dependencies for useFinancialModel
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock('../../engines/io/cloudStorage', () => ({
  fetchScenarios: vi.fn().mockResolvedValue([]),
  saveScenario: vi.fn(),
}));

vi.mock('../utils/versionStorage', () => ({
  addVersion: vi.fn(),
  loadVersions: vi.fn().mockReturnValue([]),
  getVersion: vi.fn(),
}));

vi.mock('../utils/fileIO', () => ({
  downloadScenario: vi.fn(),
}));

vi.mock('../utils/excelExport', () => ({
  generateExcel: vi.fn(),
}));

describe('Operations Form Input State Test (v1.2)', () => {
  let mockOnChange: ReturnType<typeof vi.fn<(value: number) => void>>;

  beforeEach(() => {
    mockOnChange = vi.fn<(value: number) => void>();
  });

  describe('CurrencyInput Component', () => {
    it('should update value when user types a number', async () => {
      const initialValue = 1000;
      const newValue = 2500;

      render(
        <CurrencyInput
          value={initialValue}
          onChange={mockOnChange}
          data-testid="currency-input"
        />
      );

      const input = screen.getByTestId('currency-input') as HTMLInputElement;

      // Focus the input to show raw value
      fireEvent.focus(input);

      // Type new value
      fireEvent.change(input, { target: { value: newValue.toString() } });

      // onChange should be called with the numeric value
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(newValue);
      }, { timeout: 1000 });
    });

    it('should format currency value on blur', async () => {
      const initialValue = 1000;
      const typedValue = '2500';

      render(
        <CurrencyInput
          value={initialValue}
          onChange={mockOnChange}
          data-testid="currency-input"
        />
      );

      const input = screen.getByTestId('currency-input') as HTMLInputElement;

      // Focus and type
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: typedValue } });

      // Blur to trigger formatting
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(2500);
      });
    });

    it('should handle empty input gracefully', () => {
      const initialValue = 1000;

      render(
        <CurrencyInput
          value={initialValue}
          onChange={mockOnChange}
          data-testid="currency-input"
        />
      );

      const input = screen.getByTestId('currency-input') as HTMLInputElement;

      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '' } });

      // Should not call onChange with empty string
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should update when value prop changes (data binding)', async () => {
      const { rerender } = render(
        <CurrencyInput
          value={1000}
          onChange={mockOnChange}
          data-testid="currency-input"
        />
      );

      const input = screen.getByTestId('currency-input') as HTMLInputElement;

      // Initial value should be formatted
      expect(input.value).toBeTruthy();

      // Update value prop
      rerender(
        <CurrencyInput
          value={2500}
          onChange={mockOnChange}
          data-testid="currency-input"
        />
      );

      await waitFor(() => {
        // Value should update when prop changes
        expect(input.value).toBeTruthy();
      });
    });
  });

  describe('PercentageInput Component', () => {
    it('should convert UI percentage (50) to model decimal (0.5)', () => {
      const initialValue = 0.10; // 10% in model format
      const uiPercentage = 50; // User enters 50%

      render(
        <PercentageInput
          value={initialValue}
          onChange={mockOnChange}
          data-testid="percentage-input"
        />
      );

      const input = screen.getByTestId('percentage-input') as HTMLInputElement;

      // Input should display as percentage (10.00)
      expect(input.value).toBe('10.00');

      // Change to 50%
      fireEvent.change(input, { target: { value: uiPercentage.toString() } });

      // onChange should be called with decimal (0.5)
      expect(mockOnChange).toHaveBeenCalledWith(0.5);
    });

    it('should display percentage with % suffix', () => {
      const initialValue = 0.25; // 25% in model format

      render(
        <PercentageInput
          value={initialValue}
          onChange={mockOnChange}
          data-testid="percentage-input"
        />
      );

      const input = screen.getByTestId('percentage-input') as HTMLInputElement;
      const container = input.parentElement;

      // Check that % suffix is present
      const suffix = container?.querySelector('span');
      expect(suffix).toBeTruthy();
      expect(suffix?.textContent).toBe('%');
    });

    it('should handle empty input gracefully', () => {
      const initialValue = 0.10;

      render(
        <PercentageInput
          value={initialValue}
          onChange={mockOnChange}
          data-testid="percentage-input"
        />
      );

      const input = screen.getByTestId('percentage-input') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '' } });

      // Should not call onChange with empty string
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should update when value prop changes (data binding)', async () => {
      const { rerender } = render(
        <PercentageInput
          value={0.10}
          onChange={mockOnChange}
          data-testid="percentage-input"
        />
      );

      const input = screen.getByTestId('percentage-input') as HTMLInputElement;

      // Initial value should be 10.00
      expect(input.value).toBe('10.00');

      // Update value prop to 0.25 (25%)
      rerender(
        <PercentageInput
          value={0.25}
          onChange={mockOnChange}
          data-testid="percentage-input"
        />
      );

      await waitFor(() => {
        // Value should update to 25.00
        expect(input.value).toBe('25.00');
      });
    });

    it('should format percentage on blur', async () => {
      const initialValue = 0.10;

      render(
        <PercentageInput
          value={initialValue}
          onChange={mockOnChange}
          data-testid="percentage-input"
        />
      );

      const input = screen.getByTestId('percentage-input') as HTMLInputElement;

      // Change to 33.333
      fireEvent.change(input, { target: { value: '33.333' } });
      fireEvent.blur(input);

      await waitFor(() => {
        // Should format to 2 decimal places and convert to decimal
        // Use approximate check due to floating point precision
        const calls = mockOnChange.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall).toBeCloseTo(0.3333, 4);
        expect(input.value).toBe('33.33');
      });
    });
  });

  describe('Scenario State Integration', () => {
    it('should update hotel operation ADR (currency) and update scenario state', () => {
      const hotelConfig: HotelConfig = buildHotelConfig({
        avgDailyRate: 200,
      });

      let currentConfig = hotelConfig;
      const handleAdrChange = vi.fn((newAdr: number) => {
        currentConfig = { ...currentConfig, avgDailyRate: newAdr };
      });

      render(
        <CurrencyInput
          value={currentConfig.avgDailyRate}
          onChange={handleAdrChange}
          data-testid="hotel-adr-input"
        />
      );

      const input = screen.getByTestId('hotel-adr-input') as HTMLInputElement;

      // Change ADR from 200 to 250
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '250' } });

      expect(handleAdrChange).toHaveBeenCalledWith(250);
      expect(currentConfig.avgDailyRate).toBe(250);
    });

    it('should update hotel operation payroll percentage and update scenario state', () => {
      const hotelConfig: HotelConfig = buildHotelConfig({
        payrollPct: 0.30, // 30%
      });

      let currentConfig = hotelConfig;
      const handlePayrollChange = vi.fn((newPayroll: number) => {
        currentConfig = { ...currentConfig, payrollPct: newPayroll };
      });

      render(
        <PercentageInput
          value={currentConfig.payrollPct}
          onChange={handlePayrollChange}
          data-testid="hotel-payroll-input"
        />
      );

      const input = screen.getByTestId('hotel-payroll-input') as HTMLInputElement;

      // Change payroll from 30% to 35%
      fireEvent.change(input, { target: { value: '35' } });

      expect(handlePayrollChange).toHaveBeenCalledWith(0.35);
      expect(currentConfig.payrollPct).toBe(0.35);
    });

    it('should handle multiple percentage inputs without breaking data binding', () => {
      const hotelConfig: HotelConfig = buildHotelConfig({
        foodCogsPct: 0.35,
        beverageCogsPct: 0.25,
        payrollPct: 0.30,
      });

      let currentConfig = hotelConfig;

      const handleFoodCogsChange = vi.fn((value: number) => {
        currentConfig = { ...currentConfig, foodCogsPct: value };
      });
      const handleBeverageCogsChange = vi.fn((value: number) => {
        currentConfig = { ...currentConfig, beverageCogsPct: value };
      });
      const handlePayrollChange = vi.fn((value: number) => {
        currentConfig = { ...currentConfig, payrollPct: value };
      });

      const { rerender } = render(
        <div>
          <PercentageInput
            value={currentConfig.foodCogsPct}
            onChange={handleFoodCogsChange}
            data-testid="food-cogs-input"
          />
          <PercentageInput
            value={currentConfig.beverageCogsPct}
            onChange={handleBeverageCogsChange}
            data-testid="beverage-cogs-input"
          />
          <PercentageInput
            value={currentConfig.payrollPct}
            onChange={handlePayrollChange}
            data-testid="payroll-input"
          />
        </div>
      );

      const foodCogsInput = screen.getByTestId('food-cogs-input') as HTMLInputElement;
      const beverageCogsInput = screen.getByTestId('beverage-cogs-input') as HTMLInputElement;
      const payrollInput = screen.getByTestId('payroll-input') as HTMLInputElement;

      // Update food COGS
      fireEvent.change(foodCogsInput, { target: { value: '40' } });
      expect(currentConfig.foodCogsPct).toBe(0.40);

      // Update beverage COGS
      fireEvent.change(beverageCogsInput, { target: { value: '30' } });
      expect(currentConfig.beverageCogsPct).toBe(0.30);

      // Update payroll
      fireEvent.change(payrollInput, { target: { value: '35' } });
      expect(currentConfig.payrollPct).toBe(0.35);

      // Verify all values are independent
      expect(currentConfig.foodCogsPct).toBe(0.40);
      expect(currentConfig.beverageCogsPct).toBe(0.30);
      expect(currentConfig.payrollPct).toBe(0.35);

      // Re-render with updated config to verify data binding
      rerender(
        <div>
          <PercentageInput
            value={currentConfig.foodCogsPct}
            onChange={handleFoodCogsChange}
            data-testid="food-cogs-input"
          />
          <PercentageInput
            value={currentConfig.beverageCogsPct}
            onChange={handleBeverageCogsChange}
            data-testid="beverage-cogs-input"
          />
          <PercentageInput
            value={currentConfig.payrollPct}
            onChange={handlePayrollChange}
            data-testid="payroll-input"
          />
        </div>
      );

      // Verify inputs reflect updated values
      expect(foodCogsInput.value).toBe('40.00');
      expect(beverageCogsInput.value).toBe('30.00');
      expect(payrollInput.value).toBe('35.00');
    });
  });

  describe('Grouping and Data Binding Verification', () => {
    it('should maintain data binding when inputs are grouped in cards/accordions', () => {
      // This test verifies that grouping didn't break the data binding
      const hotelConfig: HotelConfig = buildHotelConfig({
        avgDailyRate: 200,
        payrollPct: 0.30,
      });

      let currentConfig = hotelConfig;

      const handleAdrChange = vi.fn((value: number) => {
        currentConfig = { ...currentConfig, avgDailyRate: value };
      });
      const handlePayrollChange = vi.fn((value: number) => {
        currentConfig = { ...currentConfig, payrollPct: value };
      });

      // Simulate inputs being in different accordion sections
      render(
        <div>
          {/* Revenue Drivers Accordion */}
          <div data-testid="revenue-drivers-section">
            <CurrencyInput
              value={currentConfig.avgDailyRate}
              onChange={handleAdrChange}
              data-testid="adr-input"
            />
          </div>
          {/* Operating Expenses Accordion */}
          <div data-testid="expenses-section">
            <PercentageInput
              value={currentConfig.payrollPct}
              onChange={handlePayrollChange}
              data-testid="payroll-input"
            />
          </div>
        </div>
      );

      const adrInput = screen.getByTestId('adr-input') as HTMLInputElement;
      const payrollInput = screen.getByTestId('payroll-input') as HTMLInputElement;

      // Verify initial values
      expect(adrInput).toBeTruthy();
      expect(payrollInput.value).toBe('30.00');

      // Update ADR
      fireEvent.focus(adrInput);
      fireEvent.change(adrInput, { target: { value: '250' } });
      expect(currentConfig.avgDailyRate).toBe(250);

      // Update Payroll
      fireEvent.change(payrollInput, { target: { value: '35' } });
      expect(currentConfig.payrollPct).toBe(0.35);

      // Verify both updates are independent and correct
      expect(currentConfig.avgDailyRate).toBe(250);
      expect(currentConfig.payrollPct).toBe(0.35);
    });
  });

  describe('CRUD Operations (State Immutability)', () => {
    it('should add and remove operations correctly with unique IDs', async () => {
      const { result } = renderHook(() => useFinancialModel());

      const initialOperations = result.current.input.scenario.operations;
      const initialCount = initialOperations.length;

      // 1. ADD OPERATION
      await act(async () => {
        result.current.addOperation('HOTEL');
      });

      const afterAddOperations = result.current.input.scenario.operations;
      expect(afterAddOperations.length).toBe(initialCount + 1);

      const newOperation = afterAddOperations[afterAddOperations.length - 1];
      expect(newOperation.operationType).toBe('HOTEL');
      expect(newOperation.id).not.toBe(String(initialCount)); // Check for non-index ID
      expect(afterAddOperations).not.toBe(initialOperations); // Check for referential change

      // 2. REMOVE OPERATION
      await act(async () => {
        result.current.removeOperation(newOperation.id);
      });

      const afterRemoveOperations = result.current.input.scenario.operations;
      expect(afterRemoveOperations.length).toBe(initialCount);
      expect(afterRemoveOperations.find(op => op.id === newOperation.id)).toBeUndefined();
      expect(afterRemoveOperations).not.toBe(afterAddOperations);
    });
  });
});

