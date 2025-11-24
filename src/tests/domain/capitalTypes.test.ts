import { describe, it, expect } from 'vitest';
import type { DebtTrancheConfig, CapitalStructureConfig, FullModelInput, SavedScenario } from '@domain/types';
import { convertLegacyTrancheToV05, convertLegacyCapitalConfigToV05 } from '@domain/capitalHelpers';
import type { LegacyDebtTrancheConfig } from '@domain/capitalHelpers';
import {
  calculateNetLoanProceeds,
  calculateTotalNetLoanProceeds,
} from '@engines/project/capitalHelpers';

describe('Capital Stack 2.0 Types (v0.5)', () => {
  describe('DebtTrancheConfig', () => {
    it('should accept v0.5 multi-tranche configuration', () => {
      const tranche1: DebtTrancheConfig = {
        id: 'senior-loan',
        label: 'Senior Loan',
        type: 'SENIOR',
        initialPrincipal: 10000000,
        interestRate: 0.06,
        amortizationType: 'mortgage',
        termYears: 10,
      };

      const tranche2: DebtTrancheConfig = {
        id: 'mezz-debt',
        label: 'Mezzanine Debt',
        type: 'MEZZ',
        initialPrincipal: 2000000,
        interestRate: 0.12,
        amortizationType: 'interest_only',
        termYears: 5,
        ioYears: 3,
        startYear: 0,
      };

      const tranche3: DebtTrancheConfig = {
        id: 'bridge-loan',
        label: 'Bridge Loan',
        type: 'BRIDGE',
        initialPrincipal: 5000000,
        interestRate: 0.08,
        amortizationType: 'bullet',
        termYears: 3,
        refinanceAtYear: 3,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 20000000,
        debtTranches: [tranche1, tranche2, tranche3],
      };

      expect(capitalConfig.debtTranches.length).toBe(3);
      expect(capitalConfig.debtTranches[0].type).toBe('SENIOR');
      expect(capitalConfig.debtTranches[1].type).toBe('MEZZ');
      expect(capitalConfig.debtTranches[2].type).toBe('BRIDGE');
    });

    it('should accept single-tranche configuration (v0.5 style)', () => {
      const singleTranche: DebtTrancheConfig = {
        id: 'senior-loan',
        label: 'Senior Loan',
        type: 'SENIOR',
        initialPrincipal: 6000000,
        interestRate: 0.06,
        amortizationType: 'mortgage',
        termYears: 10,
      };

      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 10000000,
        debtTranches: [singleTranche],
      };

      expect(capitalConfig.debtTranches.length).toBe(1);
      expect(capitalConfig.debtTranches[0].initialPrincipal).toBe(6000000);
      expect(capitalConfig.debtTranches[0].amortizationType).toBe('mortgage');
    });

    it('should accept optional fields (ioYears, startYear, refinanceAtYear)', () => {
      const trancheWithOptional: DebtTrancheConfig = {
        id: 'io-loan',
        label: 'Interest-Only Loan',
        type: 'SENIOR',
        initialPrincipal: 5000000,
        interestRate: 0.05,
        amortizationType: 'interest_only',
        termYears: 7,
        ioYears: 5, // Optional
        startYear: 1, // Optional
        refinanceAtYear: 7, // Optional
      };

      expect(trancheWithOptional.ioYears).toBe(5);
      expect(trancheWithOptional.startYear).toBe(1);
      expect(trancheWithOptional.refinanceAtYear).toBe(7);
    });

    it('should accept v0.6 transaction cost fields (originationFeePct, exitFeePct)', () => {
      const trancheWithFees: DebtTrancheConfig = {
        id: 'senior-loan',
        label: 'Senior Loan',
        type: 'SENIOR',
        initialPrincipal: 10000000,
        interestRate: 0.06,
        amortizationType: 'mortgage',
        termYears: 10,
        originationFeePct: 0.01, // 1% origination fee
        exitFeePct: 0.005,        // 0.5% exit fee
      };

      expect(trancheWithFees.originationFeePct).toBe(0.01);
      expect(trancheWithFees.exitFeePct).toBe(0.005);
    });

    it('should default transaction costs to 0 when not specified', () => {
      const trancheWithoutFees: DebtTrancheConfig = {
        id: 'senior-loan',
        initialPrincipal: 10000000,
        interestRate: 0.06,
        termYears: 10,
      };

      expect(trancheWithoutFees.originationFeePct).toBeUndefined();
      expect(trancheWithoutFees.exitFeePct).toBeUndefined();
    });
  });

  describe('Backwards Compatibility Helpers', () => {
    it('should convert v0.4-style tranche to v0.5 format', () => {
      const legacyTranche: LegacyDebtTrancheConfig = {
        id: 'senior-loan',
        amount: 6000000,
        interestRate: 0.06,
        termYears: 10,
        amortizationYears: 20,
      };

      const v05Tranche = convertLegacyTrancheToV05(legacyTranche);

      expect(v05Tranche.id).toBe('senior-loan');
      expect(v05Tranche.initialPrincipal).toBe(6000000);
      expect(v05Tranche.interestRate).toBe(0.06);
      expect(v05Tranche.termYears).toBe(10);
      expect(v05Tranche.label).toBe('senior-loan'); // Uses id as label fallback
      expect(v05Tranche.type).toBe('SENIOR'); // Defaults to SENIOR
      expect(v05Tranche.amortizationType).toBe('mortgage'); // Defaults to mortgage
      expect(v05Tranche.startYear).toBe(0); // Defaults to 0
    });

    it('should convert v0.4-style capital config to v0.5 format', () => {
      const legacyConfig = {
        initialInvestment: 10000000,
        debtTranches: [
          {
            id: 'senior-loan',
            amount: 6000000,
            interestRate: 0.06,
            termYears: 10,
            amortizationYears: 20,
          },
          {
            id: 'mezz-debt',
            amount: 2000000,
            interestRate: 0.12,
            termYears: 5,
            amortizationYears: 5,
          },
        ] as LegacyDebtTrancheConfig[],
      };

      const v05Config = convertLegacyCapitalConfigToV05(legacyConfig);

      expect(v05Config.initialInvestment).toBe(10000000);
      expect(v05Config.debtTranches.length).toBe(2);
      expect(v05Config.debtTranches[0].initialPrincipal).toBe(6000000);
      expect(v05Config.debtTranches[1].initialPrincipal).toBe(2000000);
      expect(v05Config.debtTranches[0].amortizationType).toBe('mortgage');
      expect(v05Config.debtTranches[1].amortizationType).toBe('mortgage');
    });

    it('should handle empty debtTranches array', () => {
      const legacyConfig = {
        initialInvestment: 10000000,
        debtTranches: [] as LegacyDebtTrancheConfig[],
      };

      const v05Config = convertLegacyCapitalConfigToV05(legacyConfig);

      expect(v05Config.initialInvestment).toBe(10000000);
      expect(v05Config.debtTranches.length).toBe(0);
    });
  });

  describe('CapitalStructureConfig', () => {
    it('should accept empty debtTranches array (no-debt scenario)', () => {
      const noDebtConfig: CapitalStructureConfig = {
        initialInvestment: 10000000,
        debtTranches: [],
      };

      expect(noDebtConfig.debtTranches.length).toBe(0);
    });

    it('should accept single-tranche config (v0.4 compatibility)', () => {
      const singleTrancheConfig: CapitalStructureConfig = {
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

      expect(singleTrancheConfig.debtTranches.length).toBe(1);
      // This demonstrates that v0.4-style single-tranche configs map to a 1-element array
    });

    it('should accept multi-tranche config (v0.5)', () => {
      const multiTrancheConfig: CapitalStructureConfig = {
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

      expect(multiTrancheConfig.debtTranches.length).toBe(2);
      expect(multiTrancheConfig.debtTranches[0].type).toBe('SENIOR');
      expect(multiTrancheConfig.debtTranches[1].type).toBe('MEZZ');
    });
  });

  describe('v0.6: Transaction Costs', () => {
    it('should calculate net loan proceeds correctly with origination fees', () => {
      const tranche: DebtTrancheConfig = {
        id: 'senior-loan',
        initialPrincipal: 10000000,
        interestRate: 0.06,
        termYears: 10,
        originationFeePct: 0.01, // 1% fee
      };

      const netProceeds = calculateNetLoanProceeds(tranche);
      
      expect(netProceeds).toBe(9900000);
    });

    it('should handle zero origination fees', () => {
      const tranche: DebtTrancheConfig = {
        id: 'senior-loan',
        initialPrincipal: 10000000,
        interestRate: 0.06,
        termYears: 10,
        // originationFeePct not specified (defaults to 0)
      };

      const netProceeds = calculateNetLoanProceeds(tranche);
      expect(netProceeds).toBe(10000000);
    });

    it('should calculate total net loan proceeds across multiple tranches', () => {
      const capitalConfig: CapitalStructureConfig = {
        initialInvestment: 20000000,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: 10000000,
            interestRate: 0.06,
            termYears: 10,
            originationFeePct: 0.01, // 1% fee = 100K
          },
          {
            id: 'mezz-debt',
            initialPrincipal: 5000000,
            interestRate: 0.12,
            termYears: 5,
            originationFeePct: 0.02, // 2% fee = 100K
          },
        ],
      };

      const totalNetProceeds = calculateTotalNetLoanProceeds(capitalConfig);
      // Senior: 10M - 100K = 9.9M
      // Mezz: 5M - 100K = 4.9M
      // Total: 14.8M
      expect(totalNetProceeds).toBe(14800000);
    });
  });

  describe('v0.6: Persistence', () => {
    it('should serialize FullModelInput to JSON', () => {
      const sampleInput: FullModelInput = {
        scenario: {
          id: 'test-scenario',
          name: 'Test Scenario',
          startYear: 2026,
          horizonYears: 5,
          operations: [],
        },
        projectConfig: {
          discountRate: 0.10,
          terminalGrowthRate: 0.02,
          initialInvestment: 10000000,
        },
        capitalConfig: {
          initialInvestment: 10000000,
          debtTranches: [
            {
              id: 'senior-loan',
              initialPrincipal: 6000000,
              interestRate: 0.06,
              termYears: 10,
              originationFeePct: 0.01,
            },
          ],
        },
        waterfallConfig: {
          equityClasses: [
            {
              id: 'lp',
              name: 'Limited Partner',
              contributionPct: 0.7,
            },
          ],
        },
      };

      // Should serialize without errors
      const json = JSON.stringify(sampleInput);
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      // Should deserialize correctly
      const parsed = JSON.parse(json);
      expect(parsed.scenario.id).toBe('test-scenario');
      expect(parsed.capitalConfig.debtTranches[0].originationFeePct).toBe(0.01);
    });

    it('should serialize SavedScenario to JSON', () => {
      const savedScenario: SavedScenario = {
        id: 'saved-1',
        name: 'Saved Scenario',
        description: 'A saved scenario',
        lastModified: Date.now(),
        modelConfig: {
          scenario: {
            id: 'scenario-1',
            name: 'Test Scenario',
            startYear: 2026,
            horizonYears: 5,
            operations: [],
          },
          projectConfig: {
            discountRate: 0.10,
            terminalGrowthRate: 0.02,
            initialInvestment: 10000000,
          },
          capitalConfig: {
            initialInvestment: 10000000,
            debtTranches: [],
          },
          waterfallConfig: {
            equityClasses: [],
          },
        },
      };

      const json = JSON.stringify(savedScenario);
      expect(json).toBeDefined();
      
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe('saved-1');
      expect(parsed.lastModified).toBeGreaterThan(0);
    });
  });
});

