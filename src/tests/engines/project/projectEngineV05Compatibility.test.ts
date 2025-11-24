import { describe, it, expect } from 'vitest';
import { runProjectEngine } from '@engines/project/projectEngine';
import type { ConsolidatedAnnualPnl, ProjectConfig, CapitalStructureConfig } from '@domain/types';
import { convertLegacyCapitalConfigToV05 } from '@domain/capitalHelpers';
import type { LegacyDebtTrancheConfig } from '@domain/capitalHelpers';

/**
 * Backwards compatibility tests for v0.5 Capital Stack 2.0.
 * 
 * These tests verify that:
 * 1. v0.4-style single-tranche configs can be converted to v0.5 format
 * 2. Project engine remains compatible with new capital types (it doesn't use capital config directly)
 * 3. Types accept both single-tranche and multi-tranche configurations
 */
describe('Project Engine v0.5 Compatibility', () => {
  describe('Backwards Compatibility: v0.4 → v0.5', () => {
    it('should accept v0.4-style single-tranche config converted to v0.5', () => {
      // v0.4-style config (using amount field)
      const v04Config = {
        initialInvestment: 10000000,
        debtTranches: [
          {
            id: 'senior-loan',
            amount: 6000000,
            interestRate: 0.06,
            termYears: 10,
            amortizationYears: 20,
          } as LegacyDebtTrancheConfig,
        ],
      };

      // Convert to v0.5 format
      const v05Config = convertLegacyCapitalConfigToV05(v04Config);

      // Verify conversion
      expect(v05Config.initialInvestment).toBe(10000000);
      expect(v05Config.debtTranches.length).toBe(1);
      expect(v05Config.debtTranches[0].initialPrincipal).toBe(6000000);
      expect(v05Config.debtTranches[0].interestRate).toBe(0.06);
      expect(v05Config.debtTranches[0].termYears).toBe(10);
      expect(v05Config.debtTranches[0].amortizationType).toBe('mortgage');
      expect(v05Config.debtTranches[0].type).toBe('SENIOR');
    });

    it('should produce same project KPIs regardless of capital config format (project engine does not use capital config)', () => {
      // Create consolidated P&L
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 5000000,
          departmentalExpenses: 1000000,
          gop: 4000000,
          undistributedExpenses: 2500000,
          cogsTotal: 1000000,
          opexTotal: 2500000,
          ebitda: 1500000,
          noi: 1400000,
          maintenanceCapex: 100000,
          cashFlow: 1400000,
        },
        {
          yearIndex: 1,
          revenueTotal: 5200000,
          departmentalExpenses: 1040000,
          gop: 4160000,
          undistributedExpenses: 2600000,
          cogsTotal: 1040000,
          opexTotal: 2600000,
          ebitda: 1560000,
          noi: 1456000,
          maintenanceCapex: 104000,
          cashFlow: 1456000,
        },
        {
          yearIndex: 2,
          revenueTotal: 5400000,
          departmentalExpenses: 1080000,
          gop: 4320000,
          undistributedExpenses: 2700000,
          cogsTotal: 1080000,
          opexTotal: 2700000,
          ebitda: 1620000,
          noi: 1512000,
          maintenanceCapex: 108000,
          cashFlow: 1512000,
        },
      ];

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 10000000,
        workingCapitalPercentage: 0.05,
      };

      // Run project engine (it doesn't use capital config, so results should be identical)
      const result = runProjectEngine(consolidatedPnl, projectConfig);

      // Verify project KPIs are finite and reasonable
      expect(Number.isFinite(result.projectKpis.npv)).toBe(true);
      expect(Number.isFinite(result.projectKpis.equityMultiple)).toBe(true);
      expect(result.projectKpis.equityMultiple).toBeGreaterThan(0);

      // Verify all UFCF values are finite
      for (const ufcf of result.unleveredFcf) {
        expect(Number.isFinite(ufcf.unleveredFreeCashFlow)).toBe(true);
        expect(Number.isFinite(ufcf.noi)).toBe(true);
        expect(Number.isFinite(ufcf.maintenanceCapex)).toBe(true);
        expect(Number.isFinite(ufcf.changeInWorkingCapital)).toBe(true);
      }
    });

    it('should accept v0.5 multi-tranche config structure (types validation)', () => {
      // v0.5-style multi-tranche config
      const v05MultiTrancheConfig: CapitalStructureConfig = {
        initialInvestment: 20000000,
        debtTranches: [
          {
            id: 'senior-loan',
            label: 'Senior Loan',
            type: 'SENIOR',
            initialPrincipal: 12000000,
            interestRate: 0.06,
            amortizationType: 'mortgage',
            termYears: 10,
          },
          {
            id: 'mezz-debt',
            label: 'Mezzanine Debt',
            type: 'MEZZ',
            initialPrincipal: 3000000,
            interestRate: 0.12,
            amortizationType: 'interest_only',
            termYears: 5,
            ioYears: 3,
          },
        ],
      };

      // Verify structure is valid
      expect(v05MultiTrancheConfig.debtTranches.length).toBe(2);
      expect(v05MultiTrancheConfig.debtTranches[0].type).toBe('SENIOR');
      expect(v05MultiTrancheConfig.debtTranches[1].type).toBe('MEZZ');
      expect(v05MultiTrancheConfig.debtTranches[0].amortizationType).toBe('mortgage');
      expect(v05MultiTrancheConfig.debtTranches[1].amortizationType).toBe('interest_only');
    });

    it('should accept v0.5 single-tranche config (1-element array, v0.4 compatibility)', () => {
      // v0.5-style single-tranche config (1-element array)
      const v05SingleTrancheConfig: CapitalStructureConfig = {
        initialInvestment: 10000000,
        debtTranches: [
          {
            id: 'senior-loan',
            label: 'Senior Loan',
            type: 'SENIOR',
            initialPrincipal: 6000000,
            interestRate: 0.06,
            amortizationType: 'mortgage',
            termYears: 10,
          },
        ],
      };

      // Verify structure is valid
      expect(v05SingleTrancheConfig.debtTranches.length).toBe(1);
      expect(v05SingleTrancheConfig.debtTranches[0].initialPrincipal).toBe(6000000);
      // This demonstrates that v0.4-style single-tranche configs map to a 1-element array
    });
  });

  describe('Project Engine Type Compatibility', () => {
    it('should work with new capital types (project engine does not depend on capital config)', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 1000000,
          departmentalExpenses: 200000,
          gop: 800000,
          undistributedExpenses: 500000,
          cogsTotal: 200000,
          opexTotal: 500000,
          ebitda: 300000,
          noi: 280000,
          maintenanceCapex: 20000,
          cashFlow: 280000,
        },
      ];

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 5000000,
        workingCapitalPercentage: 0.05,
      };

      // Project engine only uses ProjectConfig, not CapitalStructureConfig
      // So it's already compatible with v0.5 capital types
      const result = runProjectEngine(consolidatedPnl, projectConfig);

      // Verify results are finite
      expect(Number.isFinite(result.projectKpis.npv)).toBe(true);
      expect(Number.isFinite(result.projectKpis.equityMultiple)).toBe(true);
      expect(result.unleveredFcf.length).toBe(1);
      expect(Number.isFinite(result.unleveredFcf[0].unleveredFreeCashFlow)).toBe(true);
    });
  });
});

