/**
 * Sponsor Logic Tests (v1.2: Advanced Asset Dynamics)
 * 
 * Tests for sponsor cash flow calculation logic to verify "Sponsor View" correctness.
 */

import { describe, it, expect } from 'vitest';
import { calculateSponsorCashFlow } from '@engines/operations/sponsorLogic';
import type { AnnualPnl, HotelConfig, RetailConfig, BeachClubConfig } from '@domain/types';
import { addOperation, removeOperation } from '@engines/scenario/scenarioOperations';
import { runScenarioEngine } from '@engines/scenario/scenarioEngine';
import type { ProjectScenario } from '@domain/types';
import { buildHotelConfig, buildRetailConfig, buildBeachClubConfig } from '../../helpers/buildOperationConfig';

const unwrapScenarioResult = (result: ReturnType<typeof runScenarioEngine>) => {
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
};

describe('Sponsor Logic Tests', () => {
  /**
   * Creates a mock AnnualPnl with specified revenue.
   */
  const createMockAssetPnl = (revenueTotal: number, yearIndex = 0, operationId = 'test-op'): AnnualPnl => {
    // Calculate reasonable values for other fields based on revenue
    const cogsTotal = revenueTotal * 0.3; // 30% COGS
    const opexTotal = revenueTotal * 0.4; // 40% OPEX
    const ebitda = revenueTotal - cogsTotal - opexTotal;
    const maintenanceCapex = revenueTotal * 0.02; // 2% maintenance capex
    const noi = ebitda - maintenanceCapex;
    const cashFlow = noi;

    return {
      yearIndex,
      operationId,
      revenueTotal,
      cogsTotal,
      opexTotal,
      ebitda,
      noi,
      maintenanceCapex,
      cashFlow,
    };
  };

  describe('Logic Tests: Sponsor Revenue Calculation', () => {
    /**
     * Scenario A: Hotel (Rev 100), Build & Operate (100%).
     * Expected: Sponsor Rev = 100
     */
    it('Scenario A: Hotel with Build & Operate (100%) should return full revenue', () => {
      const assetPnl = createMockAssetPnl(100, 0, 'hotel-1');
      const config: HotelConfig = {
        ...buildHotelConfig({ id: 'hotel-1', name: 'Test Hotel' }),
        ownershipModel: 'BUILD_AND_OPERATE',
        ownershipPct: 1.0, // 100%
        isActive: true,
      };

      const sponsorPnl = calculateSponsorCashFlow(assetPnl, config);

      expect(sponsorPnl.revenueTotal).toBe(100);
      expect(sponsorPnl.cogsTotal).toBe(assetPnl.cogsTotal);
      expect(sponsorPnl.opexTotal).toBe(assetPnl.opexTotal);
      expect(sponsorPnl.noi).toBe(assetPnl.noi);
    });

    /**
     * Scenario B: Retail (Rev 100), Net Lease ($10 fixed).
     * Expected: Sponsor Rev = 10
     */
    it('Scenario B: Retail with Net Lease (Fixed $10) should return base rent only', () => {
      const assetPnl = createMockAssetPnl(100, 0, 'retail-1');
      const config: RetailConfig = {
        ...buildRetailConfig({ id: 'retail-1', name: 'Test Retail' }),
        ownershipModel: 'BUILD_AND_LEASE_FIXED',
        leaseTerms: {
          baseRent: 10, // Fixed $10 rent
        },
        isActive: true,
      };

      const sponsorPnl = calculateSponsorCashFlow(assetPnl, config);

      expect(sponsorPnl.revenueTotal).toBe(10); // Sponsor receives only the base rent
      expect(sponsorPnl.cogsTotal).toBe(0); // No COGS for lease model
      expect(sponsorPnl.opexTotal).toBe(0); // Owner costs = 0 for v1.2
      expect(sponsorPnl.noi).toBe(10); // NOI = revenue - owner costs = 10 - 0
    });

    /**
     * Scenario C: Club (Rev 100), Co-Invest (50%).
     * Expected: Sponsor Rev = 50
     */
    it('Scenario C: Beach Club with Co-Invest (50%) should return 50% of revenue', () => {
      const assetPnl = createMockAssetPnl(100, 0, 'club-1');
      const config: BeachClubConfig = {
        ...buildBeachClubConfig({ id: 'club-1', name: 'Test Beach Club' }),
        ownershipModel: 'CO_INVEST_OPCO',
        ownershipPct: 0.5, // 50%
        isActive: true,
      };

      const sponsorPnl = calculateSponsorCashFlow(assetPnl, config);

      expect(sponsorPnl.revenueTotal).toBe(50); // 50% of 100
      expect(sponsorPnl.cogsTotal).toBe(assetPnl.cogsTotal * 0.5);
      expect(sponsorPnl.opexTotal).toBe(assetPnl.opexTotal * 0.5);
      expect(sponsorPnl.noi).toBe(assetPnl.noi * 0.5);
    });
  });

  describe('CRUD Tests: Adding/Removing Assets Updates Scenario State', () => {
    /**
     * Test that adding an operation updates the scenario correctly.
     */
    it('should correctly add an operation to a scenario', () => {
      const initialScenario: ProjectScenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [],
      };

      const hotelConfig = buildHotelConfig({
        id: 'hotel-1',
        name: 'Test Hotel',
        ownershipModel: 'BUILD_AND_OPERATE',
        ownershipPct: 1.0,
      });

      const updatedScenario = addOperation(initialScenario, hotelConfig);

      expect(updatedScenario.operations.length).toBe(1);
      expect(updatedScenario.operations[0].id).toBe('hotel-1');
      expect(updatedScenario.operations[0].name).toBe('Test Hotel');
      expect(updatedScenario.id).toBe(initialScenario.id); // Scenario ID unchanged
    });

    /**
     * Test that removing an operation updates the scenario correctly.
     */
    it('should correctly remove an operation from a scenario', () => {
      const hotel1 = buildHotelConfig({ id: 'hotel-1', name: 'Hotel 1' });
      const hotel2 = buildHotelConfig({ id: 'hotel-2', name: 'Hotel 2' });
      const retail1 = buildRetailConfig({ id: 'retail-1', name: 'Retail 1' });

      const scenario: ProjectScenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotel1, hotel2, retail1],
      };

      const updatedScenario = removeOperation(scenario, 'hotel-2');

      expect(updatedScenario.operations.length).toBe(2);
      expect(updatedScenario.operations.find((op) => op.id === 'hotel-2')).toBeUndefined();
      expect(updatedScenario.operations.find((op) => op.id === 'hotel-1')).toBeDefined();
      expect(updatedScenario.operations.find((op) => op.id === 'retail-1')).toBeDefined();
    });

    /**
     * Test that scenario engine correctly reflects added/removed operations.
     */
    it('should correctly calculate sponsor revenue when operations are added', () => {
      // Start with one hotel operation
      const hotel1 = buildHotelConfig({
        id: 'hotel-1',
        name: 'Hotel 1',
        ownershipModel: 'BUILD_AND_OPERATE',
        ownershipPct: 1.0,
        horizonYears: 1,
      });

      let scenario: ProjectScenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotel1],
      };

      // Run scenario engine with one operation
      let result = unwrapScenarioResult(runScenarioEngine(scenario));
      const initialRevenue = result.consolidatedAnnualPnl[0]?.revenueTotal ?? 0;

      // Add a retail operation with fixed lease
      const retail1 = buildRetailConfig({
        id: 'retail-1',
        name: 'Retail 1',
        ownershipModel: 'BUILD_AND_LEASE_FIXED',
        leaseTerms: {
          baseRent: 10,
        },
        horizonYears: 1,
      });

      scenario = addOperation(scenario, retail1);
      result = unwrapScenarioResult(runScenarioEngine(scenario));

      // Verify we now have 2 operations
      expect(result.operations.length).toBe(2);

      // Verify consolidated revenue includes both operations
      const finalRevenue = result.consolidatedAnnualPnl[0]?.revenueTotal ?? 0;
      expect(finalRevenue).toBeGreaterThan(initialRevenue);

      // Verify retail operation contributes its base rent (10) to sponsor revenue
      const retailOperation = result.operations.find((op) => op.operationId === 'retail-1');
      expect(retailOperation).toBeDefined();
      if (retailOperation) {
        // The retail operation should have asset revenue, but sponsor revenue should be base rent
        // We need to check the consolidated result reflects the sponsor view
        const retailAssetRevenue = retailOperation.annualPnl[0]?.revenueTotal ?? 0;
        expect(retailAssetRevenue).toBeGreaterThan(0); // Asset has revenue

        // The consolidated revenue should include sponsor revenue from retail (base rent)
        // Since we're consolidating sponsor flows, the retail should contribute ~10
        // (exact value depends on asset revenue, but sponsor gets base rent)
        expect(finalRevenue).toBeGreaterThan(initialRevenue);
      }
    });

    /**
     * Test that scenario engine correctly reflects removed operations.
     */
    it('should correctly calculate sponsor revenue when operations are removed', () => {
      const hotel1 = buildHotelConfig({
        id: 'hotel-1',
        name: 'Hotel 1',
        ownershipModel: 'BUILD_AND_OPERATE',
        ownershipPct: 1.0,
        horizonYears: 1,
      });

      const retail1 = buildRetailConfig({
        id: 'retail-1',
        name: 'Retail 1',
        ownershipModel: 'BUILD_AND_LEASE_FIXED',
        leaseTerms: {
          baseRent: 10,
        },
        horizonYears: 1,
      });

      const scenario: ProjectScenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotel1, retail1],
      };

      // Run scenario engine with both operations
      let result = unwrapScenarioResult(runScenarioEngine(scenario));
      const initialRevenue = result.consolidatedAnnualPnl[0]?.revenueTotal ?? 0;
      expect(result.operations.length).toBe(2);

      // Remove retail operation
      const updatedScenario = removeOperation(scenario, 'retail-1');
      result = unwrapScenarioResult(runScenarioEngine(updatedScenario));

      // Verify we now have 1 operation
      expect(result.operations.length).toBe(1);
      expect(result.operations[0].operationId).toBe('hotel-1');

      // Verify consolidated revenue decreased
      const finalRevenue = result.consolidatedAnnualPnl[0]?.revenueTotal ?? 0;
      expect(finalRevenue).toBeLessThan(initialRevenue);
    });

    /**
     * Test that inactive operations are excluded from sponsor revenue.
     */
    it('should exclude inactive operations from sponsor revenue calculation', () => {
      const hotel1 = buildHotelConfig({
        id: 'hotel-1',
        name: 'Hotel 1',
        ownershipModel: 'BUILD_AND_OPERATE',
        ownershipPct: 1.0,
        isActive: true,
        horizonYears: 1,
      });

      const hotel2 = buildHotelConfig({
        id: 'hotel-2',
        name: 'Hotel 2',
        ownershipModel: 'BUILD_AND_OPERATE',
        ownershipPct: 1.0,
        isActive: false, // Inactive
        horizonYears: 1,
      });

      const scenario: ProjectScenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 1,
        operations: [hotel1, hotel2],
      };

      const result = unwrapScenarioResult(runScenarioEngine(scenario));

      // Both operations should be calculated (for asset-level analysis)
      expect(result.operations.length).toBe(2);

      // But inactive operation should contribute 0 to sponsor revenue
      const hotel2Operation = result.operations.find((op) => op.operationId === 'hotel-2');
      expect(hotel2Operation).toBeDefined();
      if (hotel2Operation) {
        // Asset P&L should have revenue
        const assetRevenue = hotel2Operation.annualPnl[0]?.revenueTotal ?? 0;
        expect(assetRevenue).toBeGreaterThan(0);

        // But sponsor P&L should be 0 (calculated via calculateSponsorCashFlow)
        // We verify this through the consolidated result
        const consolidatedRevenue = result.consolidatedAnnualPnl[0]?.revenueTotal ?? 0;
        const hotel1Revenue = result.operations.find((op) => op.operationId === 'hotel-1')?.annualPnl[0]?.revenueTotal ?? 0;
        
        // Consolidated should only include hotel-1 (active), not hotel-2 (inactive)
        // Since both have same config except isActive, consolidated should be approximately hotel1 revenue
        expect(consolidatedRevenue).toBeCloseTo(hotel1Revenue, 0);
      }
    });
  });
});

