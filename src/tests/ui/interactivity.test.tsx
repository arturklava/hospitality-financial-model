/**
 * Interaction Testing (v1.2.3)
 * 
 * Tests that verify the model responds correctly to user input changes.
 * This includes:
 * 1. Live Math Test: Verifying that changes to operational drivers (e.g., commissionsPct)
 *    correctly recalculate financial metrics (e.g., GOP)
 * 2. Form Coverage Test: Verifying that OperationDriversForm renders the correct
 *    component for each operation type
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { runScenarioEngine } from '../../engines/scenario/scenarioEngine';
import { buildHotelConfig } from '../helpers/buildOperationConfig';
import { buildSeniorLivingConfig } from '../helpers/buildOperationConfig';
import type { ProjectScenario } from '../../domain/types';
import { OperationDriversForm } from '../../components/operations/forms/OperationDriversForm';

describe('Interaction Testing (v1.2.3)', () => {
  describe('Live Math Test', () => {
    it('should recalculate GOP when commissionsPct changes', () => {
      // Step 1: Create initial hotel scenario with GOP = $100
      // We'll set up a hotel where:
      // - Revenue = $1000
      // - COGS (without commissions) = $900
      // - GOP = $100
      
      // Calculate parameters to achieve GOP = $100
      // For simplicity, let's use a hotel with:
      // - 100 keys, 70% occupancy, $100 ADR
      // - Room revenue = 100 * 0.70 * 30 * 12 * $100 = $2,520,000 per year
      // But we want GOP = $100, so let's scale down
      
      // Actually, let's use a simpler approach: create a hotel config
      // and adjust parameters to get GOP ≈ $100
      // We'll use a small hotel for easier calculation
      
      const initialHotelConfig = buildHotelConfig({
        id: 'test-hotel-gop',
        name: 'Test Hotel GOP',
        keys: 10, // Small hotel for easier calculation
        avgDailyRate: 100,
        occupancyByMonth: Array(12).fill(0.70), // 70% occupancy
        foodRevenuePctOfRooms: 0.30,
        beverageRevenuePctOfRooms: 0.15,
        otherRevenuePctOfRooms: 0.10,
        foodCogsPct: 0.35,
        beverageCogsPct: 0.25,
        commissionsPct: 0, // Initially no commissions
        payrollPct: 0.35,
        utilitiesPct: 0.05,
        marketingPct: 0.03,
        maintenanceOpexPct: 0.04,
        otherOpexPct: 0.03,
        maintenanceCapexPct: 0.02,
        horizonYears: 1, // Single year for simplicity
      });

      const initialScenario: ProjectScenario = {
        id: 'test-scenario-initial',
        name: 'Initial Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [initialHotelConfig],
      };

      // Calculate initial GOP
      const initialResult = runScenarioEngine(initialScenario);
      const initialGop = initialResult.consolidatedAnnualPnl[0]?.gop ?? 0;

      // Verify initial GOP is approximately $100
      // Note: The exact value depends on the calculation, but we'll verify it's positive
      // and then verify that adding commissions reduces it
      expect(initialGop).toBeGreaterThan(0);

      // Step 2: Set commissionsPct = 10% (0.10)
      const updatedHotelConfig = {
        ...initialHotelConfig,
        commissionsPct: 0.10, // 10%
      };

      const updatedScenario: ProjectScenario = {
        ...initialScenario,
        id: 'test-scenario-updated',
        name: 'Updated Scenario',
        operations: [updatedHotelConfig],
      };

      // Step 3: Recalculate
      const updatedResult = runScenarioEngine(updatedScenario);
      const updatedGop = updatedResult.consolidatedAnnualPnl[0]?.gop ?? 0;

      // Step 4: Assert New GOP < Initial GOP
      // When commissions are added, COGS increases, which increases departmental expenses,
      // which decreases GOP
      expect(updatedGop).toBeLessThan(initialGop);

      // Verify the decrease is approximately correct
      // If room revenue is R, then commissions = R * 0.10
      // This increases COGS by R * 0.10, which decreases GOP by R * 0.10
      // So new GOP ≈ initial GOP - (room revenue * 0.10)
      
      // Calculate room revenue for the year
      const roomRevenue = 10 * 0.70 * 30 * 12 * 100; // keys * occupancy * days/month * months * ADR
      const expectedDecrease = roomRevenue * 0.10;
      const expectedGop = initialGop - expectedDecrease;

      // Allow for some rounding differences
      expect(updatedGop).toBeCloseTo(expectedGop, -2); // Within $100
      
      // Also verify that new GOP is approximately $90 if initial was $100
      // But since we don't control initial GOP exactly, we'll verify the relationship
      // If initial GOP was around $100, and we subtract ~$10 in commissions,
      // new GOP should be around $90
      // Actually, let's verify the decrease is proportional to room revenue
      const gopDecrease = initialGop - updatedGop;
      expect(gopDecrease).toBeCloseTo(expectedDecrease, -2);
    });

    it('should show GOP decreases proportionally with commissionsPct', () => {
      // More precise test: verify that GOP decreases by exactly roomRevenue * commissionsPct
      const hotelConfig = buildHotelConfig({
        id: 'test-hotel-commissions',
        name: 'Test Hotel Commissions',
        keys: 10,
        avgDailyRate: 100,
        occupancyByMonth: Array(12).fill(0.70),
        foodRevenuePctOfRooms: 0.30,
        beverageRevenuePctOfRooms: 0.15,
        otherRevenuePctOfRooms: 0.10,
        foodCogsPct: 0.35,
        beverageCogsPct: 0.25,
        commissionsPct: 0, // Start with no commissions
        payrollPct: 0.35,
        utilitiesPct: 0.05,
        marketingPct: 0.03,
        maintenanceOpexPct: 0.04,
        otherOpexPct: 0.03,
        maintenanceCapexPct: 0.02,
        horizonYears: 1,
      });

      const scenarioWithoutCommissions: ProjectScenario = {
        id: 'scenario-no-commissions',
        name: 'No Commissions',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotelConfig],
      };

      const resultWithout = runScenarioEngine(scenarioWithoutCommissions);
      const gopWithout = resultWithout.consolidatedAnnualPnl[0]?.gop ?? 0;

      // Add 10% commissions
      const hotelWithCommissions = {
        ...hotelConfig,
        commissionsPct: 0.10,
      };

      const scenarioWithCommissions: ProjectScenario = {
        id: 'scenario-with-commissions',
        name: 'With 10% Commissions',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotelWithCommissions],
      };

      const resultWith = runScenarioEngine(scenarioWithCommissions);
      const gopWith = resultWith.consolidatedAnnualPnl[0]?.gop ?? 0;

      // Calculate room revenue
      const roomRevenue = 10 * 0.70 * 30 * 12 * 100; // $2,520,000
      const expectedCommissions = roomRevenue * 0.10; // $252,000
      const expectedGopDecrease = expectedCommissions;
      const actualGopDecrease = gopWithout - gopWith;

      // Verify the decrease matches expected commissions
      expect(actualGopDecrease).toBeCloseTo(expectedGopDecrease, -3); // Within $1000
      expect(gopWith).toBeLessThan(gopWithout);
    });
  });

  describe('Form Coverage Test', () => {
    it('should render SeniorLivingForm for SENIOR_LIVING operation type', () => {
      const seniorLivingConfig = buildSeniorLivingConfig({
        id: 'test-senior-living',
        name: 'Test Senior Living',
      });

      const mockOnChange = () => {
        // Mock onChange handler
      };

      render(
        <OperationDriversForm
          operation={seniorLivingConfig}
          onChange={mockOnChange}
        />
      );

      // Verify that SeniorLivingForm-specific fields are rendered
      // SeniorLivingForm has "Units" and "Avg Monthly Rate" fields
      const unitsInput = screen.getByLabelText(/units/i);
      expect(unitsInput).toBeDefined();
      expect(unitsInput).toHaveValue(seniorLivingConfig.units);

      // Verify "Avg Monthly Rate" field (it's a CurrencyInput, so we check for the label)
      const monthlyRateLabel = screen.getByText(/avg monthly rate/i);
      expect(monthlyRateLabel).toBeDefined();

      // Verify SeniorLivingForm-specific fields that don't exist in other forms
      const careRevenueLabel = screen.getByText(/care revenue/i);
      expect(careRevenueLabel).toBeDefined();

      const careCogsLabel = screen.getByText(/care cogs/i);
      expect(careCogsLabel).toBeDefined();

      // Verify it's NOT rendering HotelForm fields
      const adrLabel = screen.queryByText(/adr|average daily rate/i);
      expect(adrLabel).toBeNull();

      // Verify it's NOT rendering other form fields
      const keysLabel = screen.queryByText(/keys/i);
      expect(keysLabel).toBeNull(); // SeniorLivingForm uses "Units", not "Keys"
    });

    it('should render correct form component for each operation type', () => {
      // Test that OperationDriversForm correctly routes to the right form
      const seniorLivingConfig = buildSeniorLivingConfig();

      const { rerender } = render(
        <OperationDriversForm
          operation={seniorLivingConfig}
          onChange={() => {}}
        />
      );

      // Verify SeniorLivingForm is rendered
      expect(screen.getByText(/care revenue/i)).toBeDefined();

      // Change to Hotel operation
      const hotelConfig = buildHotelConfig();
      rerender(
        <OperationDriversForm
          operation={hotelConfig}
          onChange={() => {}}
        />
      );

      // Verify HotelForm is now rendered (has ADR field)
      expect(screen.getByText(/adr|average daily rate/i)).toBeDefined();
      // SeniorLivingForm fields should be gone
      expect(screen.queryByText(/care revenue/i)).toBeNull();
    });
  });
});

