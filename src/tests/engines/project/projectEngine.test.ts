import { describe, it, expect } from 'vitest';
import { runProjectEngine, calculateBreakevenOccupancy } from '@engines/project/projectEngine';
import type { ConsolidatedAnnualPnl, ProjectConfig } from '@domain/types';

describe('Project Engine', () => {
  describe('Constant UFCF Scenario', () => {
    it('should calculate UFCF, DCF, and KPIs correctly for constant cash flows', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 50000,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 12000, // Set to get UFCF = 10000 (noi - maintenanceCapex = 12000 - 2000)
          maintenanceCapex: 2000,
          cashFlow: 12000,
        },
        {
          yearIndex: 1,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 50000,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 12000,
          maintenanceCapex: 2000,
          cashFlow: 12000,
        },
        {
          yearIndex: 2,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 50000,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 12000,
          maintenanceCapex: 2000,
          cashFlow: 12000,
        },
        {
          yearIndex: 3,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 50000,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 12000,
          maintenanceCapex: 2000,
          cashFlow: 12000,
        },
        {
          yearIndex: 4,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 50000,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 12000,
          maintenanceCapex: 2000,
          cashFlow: 12000,
        },
      ];

      const config: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 30000,
        workingCapitalPercentage: 0,
      };

      const result = runProjectEngine(consolidatedPnl, config);

      // Verify UFCF length
      expect(result.unleveredFcf.length).toBe(5);

      // Verify constant UFCF (noi - maintenanceCapex - changeInWC)
      // Since workingCapitalPercentage = 0, changeInWC = 0
      // So UFCF = 12000 - 2000 - 0 = 10000
      for (let i = 0; i < 5; i++) {
        expect(result.unleveredFcf[i].yearIndex).toBe(i);
        expect(result.unleveredFcf[i].noi).toBe(12000);
        expect(result.unleveredFcf[i].maintenanceCapex).toBe(2000);
        expect(result.unleveredFcf[i].changeInWorkingCapital).toBe(0);
        expect(result.unleveredFcf[i].unleveredFreeCashFlow).toBe(10000);
      }

      // Verify DCF cash flows
      expect(result.dcfValuation.cashFlows[0]).toBe(-30000); // Initial investment
      expect(result.dcfValuation.cashFlows.length).toBe(6); // 0..5 (N+1)

      // Verify cash flows 1..4 are the UFCF values
      for (let i = 1; i < 5; i++) {
        expect(result.dcfValuation.cashFlows[i]).toBe(10000);
      }

      // Verify terminal value is included in last cash flow
      const lastUFCF = 10000;
      const terminalValue = (lastUFCF * 1.02) / (0.10 - 0.02); // (C * (1+g)) / (r-g)
      expect(result.dcfValuation.cashFlows[5]).toBeCloseTo(lastUFCF + terminalValue, 2);
      expect(result.dcfValuation.terminalValue).toBeCloseTo(terminalValue, 2);

      // Verify DCF valuation structure
      expect(result.dcfValuation.discountRate).toBe(0.10);
      expect(result.dcfValuation.terminalGrowthRate).toBe(0.02);
      expect(result.dcfValuation.enterpriseValue).toBe(result.dcfValuation.npv);
      expect(result.dcfValuation.equityValue).toBe(result.dcfValuation.enterpriseValue);

      // Verify NPV is reasonable (should be positive with these parameters)
      expect(result.dcfValuation.npv).toBeGreaterThan(0);

      // Verify KPIs
      expect(result.projectKpis.npv).toBe(result.dcfValuation.npv);
      expect(result.projectKpis.unleveredIrr).not.toBeNull();
      expect(result.projectKpis.equityMultiple).toBeGreaterThan(0);
      expect(result.projectKpis.paybackPeriod).not.toBeNull();
    });
  });

  describe('Zero NOI Scenario', () => {
    it('should handle zero NOI correctly', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 0,
          departmentalExpenses: 0,
          gop: 0,
          undistributedExpenses: 0,
          cogsTotal: 0,
          opexTotal: 0,
          ebitda: 0,
          noi: 0,
          maintenanceCapex: 0,
          cashFlow: 0,
        },
        {
          yearIndex: 1,
          revenueTotal: 0,
          departmentalExpenses: 0,
          gop: 0,
          undistributedExpenses: 0,
          cogsTotal: 0,
          opexTotal: 0,
          ebitda: 0,
          noi: 0,
          maintenanceCapex: 0,
          cashFlow: 0,
        },
        {
          yearIndex: 2,
          revenueTotal: 0,
          departmentalExpenses: 0,
          gop: 0,
          undistributedExpenses: 0,
          cogsTotal: 0,
          opexTotal: 0,
          ebitda: 0,
          noi: 0,
          maintenanceCapex: 0,
          cashFlow: 0,
        },
      ];

      const config: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000,
        workingCapitalPercentage: 0,
      };

      const result = runProjectEngine(consolidatedPnl, config);

      // Verify all UFCF are zero (or negative if working capital is used)
      for (const ufcf of result.unleveredFcf) {
        expect(ufcf.noi).toBe(0);
        expect(ufcf.maintenanceCapex).toBe(0);
        expect(ufcf.changeInWorkingCapital).toBe(0);
        expect(ufcf.unleveredFreeCashFlow).toBe(0);
      }

      // Verify cash flows
      expect(result.dcfValuation.cashFlows[0]).toBe(-50000);
      for (let i = 1; i < result.dcfValuation.cashFlows.length; i++) {
        expect(result.dcfValuation.cashFlows[i]).toBe(0);
      }

      // Verify IRR is null (all cash flows are zero except initial investment)
      expect(result.projectKpis.unleveredIrr).toBeNull();

      // Verify equity multiple is close to 0 (no positive flows)
      expect(result.projectKpis.equityMultiple).toBe(0);

      // Verify payback period is null (never paid back)
      expect(result.projectKpis.paybackPeriod).toBeNull();
    });
  });

  describe('Working Capital Scenario', () => {
    it('should calculate working capital changes correctly with increasing revenue', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 50000,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 28000,
          maintenanceCapex: 2000,
          cashFlow: 28000,
        },
        {
          yearIndex: 1,
          revenueTotal: 120000, // Increased revenue
          departmentalExpenses: 24000,
          gop: 96000,
          undistributedExpenses: 60000,
          cogsTotal: 24000,
          opexTotal: 60000,
          ebitda: 36000,
          noi: 34000,
          maintenanceCapex: 2000,
          cashFlow: 34000,
        },
        {
          yearIndex: 2,
          revenueTotal: 150000, // Increased revenue
          departmentalExpenses: 30000,
          gop: 120000,
          undistributedExpenses: 75000,
          cogsTotal: 30000,
          opexTotal: 75000,
          ebitda: 45000,
          noi: 43000,
          maintenanceCapex: 2000,
          cashFlow: 43000,
        },
      ];

      const config: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000,
        workingCapitalPercentage: 0.10, // 10% of revenue
      };

      const result = runProjectEngine(consolidatedPnl, config);

      // Verify working capital calculations
      // Year 0: wc_0 = 100000 * 0.10 = 10000, changeInWC_0 = 10000 - 0 = 10000
      expect(result.unleveredFcf[0].changeInWorkingCapital).toBe(10000);

      // Year 1: wc_1 = 120000 * 0.10 = 12000, changeInWC_1 = 12000 - 10000 = 2000
      expect(result.unleveredFcf[1].changeInWorkingCapital).toBe(2000);

      // Year 2: wc_2 = 150000 * 0.10 = 15000, changeInWC_2 = 15000 - 12000 = 3000
      expect(result.unleveredFcf[2].changeInWorkingCapital).toBe(3000);

      // Verify UFCF calculations
      // Year 0: UFCF = 28000 - 2000 - 10000 = 16000
      expect(result.unleveredFcf[0].unleveredFreeCashFlow).toBe(16000);

      // Year 1: UFCF = 34000 - 2000 - 2000 = 30000
      expect(result.unleveredFcf[1].unleveredFreeCashFlow).toBe(30000);

      // Year 2: UFCF = 43000 - 2000 - 3000 = 38000
      expect(result.unleveredFcf[2].unleveredFreeCashFlow).toBe(38000);

      // Verify cash flows include initial investment
      expect(result.dcfValuation.cashFlows[0]).toBe(-50000);
      expect(result.dcfValuation.cashFlows[1]).toBe(16000);
      expect(result.dcfValuation.cashFlows[2]).toBe(30000);
      expect(result.dcfValuation.cashFlows[3]).toBeCloseTo(38000 + result.dcfValuation.terminalValue, 2);
    });

    it('should handle workingCapitalPercent alias', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 50000,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 28000,
          maintenanceCapex: 2000,
          cashFlow: 28000,
        },
      ];

      const config: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000,
        workingCapitalPercent: 0.15, // Using alias
      };

      const result = runProjectEngine(consolidatedPnl, config);

      // Should use workingCapitalPercent
      expect(result.unleveredFcf[0].changeInWorkingCapital).toBe(15000); // 100000 * 0.15
    });
  });

  describe('Terminal Value Edge Cases', () => {
    it('should set terminal value to 0 when discount rate <= growth rate', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 50000,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 12000, // Set to get UFCF = 10000 (noi - maintenanceCapex = 12000 - 2000)
          maintenanceCapex: 2000,
          cashFlow: 12000,
        },
      ];

      const config: ProjectConfig = {
        discountRate: 0.02, // Same as growth rate
        terminalGrowthRate: 0.02,
        initialInvestment: 50000,
        workingCapitalPercentage: 0,
      };

      const result = runProjectEngine(consolidatedPnl, config);

      expect(result.dcfValuation.terminalValue).toBe(0);
      expect(result.dcfValuation.cashFlows[1]).toBe(10000); // Last UFCF only, no terminal value
    });
  });

  describe('Multi-Operation Scenario', () => {
    it('should produce stable and finite UFCF for HOTEL + VILLAS combined operations', () => {
      // Simulate consolidated P&L from HOTEL + VILLAS scenario
      // These values represent a realistic combined operation
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 15000000, // Combined revenue from hotel and villas
          departmentalExpenses: 3000000,
          gop: 12000000,
          undistributedExpenses: 7500000,
          cogsTotal: 3000000,
          opexTotal: 7500000,
          ebitda: 4500000,
          noi: 4200000, // Positive NOI
          maintenanceCapex: 300000,
          cashFlow: 4200000,
        },
        {
          yearIndex: 1,
          revenueTotal: 16000000, // Growing revenue
          departmentalExpenses: 3200000,
          gop: 12800000,
          undistributedExpenses: 8000000,
          cogsTotal: 3200000,
          opexTotal: 8000000,
          ebitda: 4800000,
          noi: 4480000,
          maintenanceCapex: 320000,
          cashFlow: 4480000,
        },
        {
          yearIndex: 2,
          revenueTotal: 17000000,
          departmentalExpenses: 3400000,
          gop: 13600000,
          undistributedExpenses: 8500000,
          cogsTotal: 3400000,
          opexTotal: 8500000,
          ebitda: 5100000,
          noi: 4760000,
          maintenanceCapex: 340000,
          cashFlow: 4760000,
        },
        {
          yearIndex: 3,
          revenueTotal: 18000000,
          departmentalExpenses: 3600000,
          gop: 14400000,
          undistributedExpenses: 9000000,
          cogsTotal: 3600000,
          opexTotal: 9000000,
          ebitda: 5400000,
          noi: 5040000,
          maintenanceCapex: 360000,
          cashFlow: 5040000,
        },
        {
          yearIndex: 4,
          revenueTotal: 19000000,
          departmentalExpenses: 3800000,
          gop: 15200000,
          undistributedExpenses: 9500000,
          cogsTotal: 3800000,
          opexTotal: 9500000,
          ebitda: 5700000,
          noi: 5320000,
          maintenanceCapex: 380000,
          cashFlow: 5320000,
        },
      ];

      const config: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 50000000, // $50M investment
        workingCapitalPercentage: 0.05, // 5% of revenue
      };

      const result = runProjectEngine(consolidatedPnl, config);

      // Verify UFCF length matches horizon
      expect(result.unleveredFcf.length).toBe(5);

      // Verify all UFCF values are finite (no NaN or Infinity)
      for (const ufcf of result.unleveredFcf) {
        expect(Number.isFinite(ufcf.unleveredFreeCashFlow)).toBe(true);
        expect(Number.isFinite(ufcf.noi)).toBe(true);
        expect(Number.isFinite(ufcf.maintenanceCapex)).toBe(true);
        expect(Number.isFinite(ufcf.changeInWorkingCapital)).toBe(true);
      }

      // Verify UFCF formula: UFCF = NOI - maintenanceCapex - changeInWC
      for (let i = 0; i < result.unleveredFcf.length; i++) {
        const ufcf = result.unleveredFcf[i];
        const expectedUFCF = ufcf.noi - ufcf.maintenanceCapex - ufcf.changeInWorkingCapital;
        expect(ufcf.unleveredFreeCashFlow).toBeCloseTo(expectedUFCF, 2);
      }

      // Verify UFCF values are reasonable (positive in this scenario)
      for (const ufcf of result.unleveredFcf) {
        expect(ufcf.unleveredFreeCashFlow).toBeGreaterThan(0);
      }

      // Verify DCF valuation is finite
      expect(Number.isFinite(result.dcfValuation.npv)).toBe(true);
      expect(Number.isFinite(result.dcfValuation.enterpriseValue)).toBe(true);
      expect(Number.isFinite(result.dcfValuation.equityValue)).toBe(true);
      expect(Number.isFinite(result.dcfValuation.terminalValue)).toBe(true);

      // Verify all cash flows are finite
      for (const cf of result.dcfValuation.cashFlows) {
        expect(Number.isFinite(cf)).toBe(true);
      }

      // Verify KPIs are finite
      expect(Number.isFinite(result.projectKpis.npv)).toBe(true);
      expect(Number.isFinite(result.projectKpis.equityMultiple)).toBe(true);
      // IRR can be null, but if it exists, it should be finite
      if (result.projectKpis.unleveredIrr !== null) {
        expect(Number.isFinite(result.projectKpis.unleveredIrr)).toBe(true);
      }
      // Payback period can be null, but if it exists, it should be finite
      if (result.projectKpis.paybackPeriod !== null) {
        expect(Number.isFinite(result.projectKpis.paybackPeriod)).toBe(true);
      }

      // Verify sensible UFCF path (should be increasing in this scenario)
      expect(result.unleveredFcf[1].unleveredFreeCashFlow).toBeGreaterThan(
        result.unleveredFcf[0].unleveredFreeCashFlow
      );
    });
  });

  describe('Multi-Operation Scenario (HOTEL + VILLAS + RESTAURANT)', () => {
    it('should produce finite UFCF, DCF, and KPIs for HOTEL + VILLAS + RESTAURANT scenario', () => {
      // Simulate consolidated P&L from HOTEL + VILLAS + RESTAURANT scenario
      // These values represent a realistic combined operation
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 20000000, // Combined revenue from hotel, villas, and restaurant
          departmentalExpenses: 4000000,
          gop: 16000000,
          undistributedExpenses: 10000000,
          cogsTotal: 4000000,
          opexTotal: 10000000,
          ebitda: 6000000,
          noi: 5600000, // Positive NOI
          maintenanceCapex: 400000,
          cashFlow: 5600000,
        },
        {
          yearIndex: 1,
          revenueTotal: 21000000, // Growing revenue
          departmentalExpenses: 4200000,
          gop: 16800000,
          undistributedExpenses: 10500000,
          cogsTotal: 4200000,
          opexTotal: 10500000,
          ebitda: 6300000,
          noi: 5880000,
          maintenanceCapex: 420000,
          cashFlow: 5880000,
        },
        {
          yearIndex: 2,
          revenueTotal: 22000000,
          departmentalExpenses: 4400000,
          gop: 17600000,
          undistributedExpenses: 11000000,
          cogsTotal: 4400000,
          opexTotal: 11000000,
          ebitda: 6600000,
          noi: 6160000,
          maintenanceCapex: 440000,
          cashFlow: 6160000,
        },
        {
          yearIndex: 3,
          revenueTotal: 23000000,
          departmentalExpenses: 4600000,
          gop: 18400000,
          undistributedExpenses: 11500000,
          cogsTotal: 4600000,
          opexTotal: 11500000,
          ebitda: 6900000,
          noi: 6440000,
          maintenanceCapex: 460000,
          cashFlow: 6440000,
        },
        {
          yearIndex: 4,
          revenueTotal: 24000000,
          departmentalExpenses: 4800000,
          gop: 19200000,
          undistributedExpenses: 12000000,
          cogsTotal: 4800000,
          opexTotal: 12000000,
          ebitda: 7200000,
          noi: 6720000,
          maintenanceCapex: 480000,
          cashFlow: 6720000,
        },
      ];

      const config: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 60000000, // $60M investment
        workingCapitalPercentage: 0.05, // 5% of revenue
      };

      const result = runProjectEngine(consolidatedPnl, config);

      // Verify UFCF length matches horizon
      expect(result.unleveredFcf.length).toBe(5);

      // Verify all UFCF values are finite (no NaN or Infinity)
      for (const ufcf of result.unleveredFcf) {
        expect(Number.isFinite(ufcf.unleveredFreeCashFlow)).toBe(true);
        expect(Number.isFinite(ufcf.noi)).toBe(true);
        expect(Number.isFinite(ufcf.maintenanceCapex)).toBe(true);
        expect(Number.isFinite(ufcf.changeInWorkingCapital)).toBe(true);
      }

      // Verify UFCF formula: UFCF = NOI - maintenanceCapex - changeInWC
      for (let i = 0; i < result.unleveredFcf.length; i++) {
        const ufcf = result.unleveredFcf[i];
        const expectedUFCF = ufcf.noi - ufcf.maintenanceCapex - ufcf.changeInWorkingCapital;
        expect(ufcf.unleveredFreeCashFlow).toBeCloseTo(expectedUFCF, 2);
      }

      // Verify UFCF values are reasonable (positive in this scenario)
      for (const ufcf of result.unleveredFcf) {
        expect(ufcf.unleveredFreeCashFlow).toBeGreaterThan(0);
      }

      // Verify DCF valuation is finite
      expect(Number.isFinite(result.dcfValuation.npv)).toBe(true);
      expect(Number.isFinite(result.dcfValuation.enterpriseValue)).toBe(true);
      expect(Number.isFinite(result.dcfValuation.equityValue)).toBe(true);
      expect(Number.isFinite(result.dcfValuation.terminalValue)).toBe(true);

      // Verify all cash flows are finite
      for (const cf of result.dcfValuation.cashFlows) {
        expect(Number.isFinite(cf)).toBe(true);
      }

      // Verify KPIs are finite and sane
      expect(Number.isFinite(result.projectKpis.npv)).toBe(true);
      expect(Number.isFinite(result.projectKpis.equityMultiple)).toBe(true);
      expect(result.projectKpis.equityMultiple).toBeGreaterThan(0);
      
      // IRR can be null, but if it exists, it should be finite
      if (result.projectKpis.unleveredIrr !== null) {
        expect(Number.isFinite(result.projectKpis.unleveredIrr)).toBe(true);
        // IRR should be reasonable (between -100% and 1000% for this scenario)
        expect(result.projectKpis.unleveredIrr).toBeGreaterThan(-1);
        expect(result.projectKpis.unleveredIrr).toBeLessThan(10);
      }
      
      // Payback period can be null, but if it exists, it should be finite
      if (result.projectKpis.paybackPeriod !== null) {
        expect(Number.isFinite(result.projectKpis.paybackPeriod)).toBe(true);
        expect(result.projectKpis.paybackPeriod).toBeGreaterThan(0);
        expect(result.projectKpis.paybackPeriod).toBeLessThan(100); // Should pay back within 100 years
      }

      // Verify sensible UFCF path (should be increasing in this scenario)
      expect(result.unleveredFcf[1].unleveredFreeCashFlow).toBeGreaterThan(
        result.unleveredFcf[0].unleveredFreeCashFlow
      );
    });
  });

  describe('All Operation Types Scenario', () => {
    it('should produce finite UFCF, DCF, and KPIs for scenario with ALL 9 operation types', () => {
      // Simulate consolidated P&L from all 9 operation types
      // These values represent a realistic combined operation
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 50000000, // Combined revenue from all 9 operations
          departmentalExpenses: 10000000,
          gop: 40000000,
          undistributedExpenses: 25000000,
          cogsTotal: 10000000,
          opexTotal: 25000000,
          ebitda: 15000000,
          noi: 14000000, // Positive NOI
          maintenanceCapex: 1000000,
          cashFlow: 14000000,
        },
        {
          yearIndex: 1,
          revenueTotal: 52000000, // Growing revenue
          departmentalExpenses: 10400000,
          gop: 41600000,
          undistributedExpenses: 26000000,
          cogsTotal: 10400000,
          opexTotal: 26000000,
          ebitda: 15600000,
          noi: 14560000,
          maintenanceCapex: 1040000,
          cashFlow: 14560000,
        },
        {
          yearIndex: 2,
          revenueTotal: 54000000,
          departmentalExpenses: 10800000,
          gop: 43200000,
          undistributedExpenses: 27000000,
          cogsTotal: 10800000,
          opexTotal: 27000000,
          ebitda: 16200000,
          noi: 15120000,
          maintenanceCapex: 1080000,
          cashFlow: 15120000,
        },
        {
          yearIndex: 3,
          revenueTotal: 56000000,
          departmentalExpenses: 11200000,
          gop: 44800000,
          undistributedExpenses: 28000000,
          cogsTotal: 11200000,
          opexTotal: 28000000,
          ebitda: 16800000,
          noi: 15680000,
          maintenanceCapex: 1120000,
          cashFlow: 15680000,
        },
        {
          yearIndex: 4,
          revenueTotal: 58000000,
          departmentalExpenses: 11600000,
          gop: 46400000,
          undistributedExpenses: 29000000,
          cogsTotal: 11600000,
          opexTotal: 29000000,
          ebitda: 17400000,
          noi: 16240000,
          maintenanceCapex: 1160000,
          cashFlow: 16240000,
        },
      ];

      const config: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 100000000, // $100M investment
        workingCapitalPercentage: 0.05, // 5% of revenue
      };

      const result = runProjectEngine(consolidatedPnl, config);

      // Verify UFCF length matches horizon
      expect(result.unleveredFcf.length).toBe(5);

      // Verify all UFCF values are finite (no NaN or Infinity)
      for (const ufcf of result.unleveredFcf) {
        expect(Number.isFinite(ufcf.unleveredFreeCashFlow)).toBe(true);
        expect(Number.isFinite(ufcf.noi)).toBe(true);
        expect(Number.isFinite(ufcf.maintenanceCapex)).toBe(true);
        expect(Number.isFinite(ufcf.changeInWorkingCapital)).toBe(true);
      }

      // Verify UFCF formula: UFCF = NOI - maintenanceCapex - changeInWC
      for (let i = 0; i < result.unleveredFcf.length; i++) {
        const ufcf = result.unleveredFcf[i];
        const expectedUFCF = ufcf.noi - ufcf.maintenanceCapex - ufcf.changeInWorkingCapital;
        expect(ufcf.unleveredFreeCashFlow).toBeCloseTo(expectedUFCF, 2);
      }

      // Verify UFCF values are reasonable (positive in this scenario)
      for (const ufcf of result.unleveredFcf) {
        expect(ufcf.unleveredFreeCashFlow).toBeGreaterThan(0);
      }

      // Verify DCF valuation is finite
      expect(Number.isFinite(result.dcfValuation.npv)).toBe(true);
      expect(Number.isFinite(result.dcfValuation.enterpriseValue)).toBe(true);
      expect(Number.isFinite(result.dcfValuation.equityValue)).toBe(true);
      expect(Number.isFinite(result.dcfValuation.terminalValue)).toBe(true);

      // Verify all cash flows are finite
      for (const cf of result.dcfValuation.cashFlows) {
        expect(Number.isFinite(cf)).toBe(true);
      }

      // Verify KPIs are finite and sane
      expect(Number.isFinite(result.projectKpis.npv)).toBe(true);
      expect(Number.isFinite(result.projectKpis.equityMultiple)).toBe(true);
      expect(result.projectKpis.equityMultiple).toBeGreaterThan(0);

      // IRR can be null, but if it exists, it should be finite
      if (result.projectKpis.unleveredIrr !== null) {
        expect(Number.isFinite(result.projectKpis.unleveredIrr)).toBe(true);
        expect(result.projectKpis.unleveredIrr).toBeGreaterThan(-1);
        expect(result.projectKpis.unleveredIrr).toBeLessThan(10);
      }

      // Payback period can be null, but if it exists, it should be finite
      if (result.projectKpis.paybackPeriod !== null) {
        expect(Number.isFinite(result.projectKpis.paybackPeriod)).toBe(true);
        expect(result.projectKpis.paybackPeriod).toBeGreaterThan(0);
        expect(result.projectKpis.paybackPeriod).toBeLessThan(100);
      }
    });
  });

  describe('Breakeven Analysis (v0.7)', () => {
    it('should calculate breakeven occupancy using DSCR method', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 50000,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 30000, // NOI at 100% occupancy
          maintenanceCapex: 0,
          cashFlow: 30000,
        },
      ];

      const totalDebtService = 15000; // Debt service requiring NOI of 15000 for DSCR = 1.0

      const breakeven = calculateBreakevenOccupancy(consolidatedPnl, totalDebtService);

      expect(breakeven.method).toBe('dscr_breakeven');
      expect(breakeven.noiRequiredForBreakeven).toBe(15000);
      // Breakeven occupancy = 15000 / 30000 = 0.5 (50%)
      expect(breakeven.breakevenOccupancy).toBeCloseTo(0.5, 4);
    });

    it('should return null for breakeven occupancy when debt service exceeds baseline NOI', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 100000,
          departmentalExpenses: 0,
          gop: 100000,
          undistributedExpenses: 0,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 30000,
          maintenanceCapex: 0,
          cashFlow: 30000,
        },
      ];

      const totalDebtService = 40000; // Debt service > baseline NOI

      const breakeven = calculateBreakevenOccupancy(consolidatedPnl, totalDebtService);

      expect(breakeven.noiRequiredForBreakeven).toBe(40000);
      expect(breakeven.breakevenOccupancy).toBeNull(); // Not achievable at 100% occupancy
    });

    it('should return 0 for breakeven occupancy when debt service is zero', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 100000,
          departmentalExpenses: 0,
          gop: 100000,
          undistributedExpenses: 0,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 30000,
          maintenanceCapex: 0,
          cashFlow: 30000,
        },
      ];

      const totalDebtService = 0;

      const breakeven = calculateBreakevenOccupancy(consolidatedPnl, totalDebtService);

      expect(breakeven.noiRequiredForBreakeven).toBe(0);
      expect(breakeven.breakevenOccupancy).toBe(0);
    });

    it('should return null for breakeven occupancy when baseline NOI is zero or negative', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 80000,
          cogsTotal: 20000,
          opexTotal: 80000,
          ebitda: 0,
          noi: 0, // Zero NOI
          maintenanceCapex: 0,
          cashFlow: 0,
        },
      ];

      const totalDebtService = 10000;

      const breakeven = calculateBreakevenOccupancy(consolidatedPnl, totalDebtService);

      expect(breakeven.noiRequiredForBreakeven).toBe(10000);
      expect(breakeven.breakevenOccupancy).toBeNull();
    });

    it('should return null for empty consolidated P&L', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [];
      const totalDebtService = 10000;

      const breakeven = calculateBreakevenOccupancy(consolidatedPnl, totalDebtService);

      expect(breakeven.breakevenOccupancy).toBeNull();
      expect(breakeven.noiRequiredForBreakeven).toBeNull();
    });

    it('should calculate WACC when capitalConfig is provided', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 50000,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 12000,
          maintenanceCapex: 2000,
          cashFlow: 12000,
        },
      ];

      const projectConfig: ProjectConfig = {
        discountRate: 0.12, // 12% cost of equity
        terminalGrowthRate: 0.02,
        initialInvestment: 100000,
        taxRate: 0.25,
      };

      const capitalConfig = {
        initialInvestment: 100000,
        debtTranches: [
          {
            id: 'senior-loan',
            initialPrincipal: 50000, // 50% debt
            interestRate: 0.08, // 8% cost of debt
            termYears: 5,
            amortizationYears: 5,
          },
        ],
      };

      const result = runProjectEngine(consolidatedPnl, projectConfig, capitalConfig);

      // Verify WACC is calculated
      expect(result.projectKpis.wacc).not.toBeNull();
      expect(result.projectKpis.wacc).toBeCloseTo(0.09, 4); // (0.5 × 0.12) + (0.5 × 0.08 × 0.75) = 0.09
    });

    it('should return null WACC when capitalConfig is not provided', () => {
      const consolidatedPnl: ConsolidatedAnnualPnl[] = [
        {
          yearIndex: 0,
          revenueTotal: 100000,
          departmentalExpenses: 20000,
          gop: 80000,
          undistributedExpenses: 50000,
          cogsTotal: 20000,
          opexTotal: 50000,
          ebitda: 30000,
          noi: 12000,
          maintenanceCapex: 2000,
          cashFlow: 12000,
        },
      ];

      const projectConfig: ProjectConfig = {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 30000,
        workingCapitalPercentage: 0,
      };

      const result = runProjectEngine(consolidatedPnl, projectConfig);

      // WACC should be null when capitalConfig is not provided
      expect(result.projectKpis.wacc).toBeNull();
    });
  });
});

