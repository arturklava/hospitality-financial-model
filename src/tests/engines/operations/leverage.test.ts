/**
 * Operating Leverage and Seasonality Tests (v3.5)
 * 
 * Tests for realistic operational behavior:
 * - Operating leverage: High fixed costs create variable margins
 * - Seasonality math: Monthly revenue sums to annual revenue
 */

import { describe, it, expect } from 'vitest';
import { runHotelEngine } from '@engines/operations/hotelEngine';
import type { HotelConfig } from '@domain/types';
import { buildHotelConfig } from '../../helpers/buildOperationConfig';

describe('Operating Leverage (v3.5)', () => {
  /**
   * Creates a hotel config with high fixed costs for operating leverage testing.
   */
  function createHighFixedCostHotel(overrides?: Partial<HotelConfig>): HotelConfig {
    return buildHotelConfig({
      keys: 100,
      avgDailyRate: 250,
      horizonYears: 1,
      // High fixed costs to demonstrate operating leverage
      fixedPayroll: 200_000, // $200K/month fixed payroll
      fixedOtherExpenses: 50_000, // $50K/month fixed other expenses
      // Low variable cost percentages (most costs are fixed)
      payrollPct: 0.10, // Only 10% variable payroll
      otherOpexPct: 0.02, // Only 2% variable other expenses
      // Standard variable costs
      utilitiesPct: 0.05,
      marketingPct: 0.03,
      maintenanceOpexPct: 0.04,
      // Revenue mix
      foodRevenuePctOfRooms: 0.30,
      beverageRevenuePctOfRooms: 0.15,
      otherRevenuePctOfRooms: 0.10,
      foodCogsPct: 0.35,
      beverageCogsPct: 0.25,
      maintenanceCapexPct: 0.02,
      ...overrides,
    });
  }

  describe('High Fixed Costs Scenario', () => {
    it('should have variable margins (not constant) due to fixed costs', () => {
      // Create hotel with high fixed costs and seasonality
      const config = createHighFixedCostHotel({
        // High season: months 0-2 (Jan-Mar) and 10-11 (Nov-Dec) with high occupancy
        occupancyByMonth: [
          0.90, // Jan - high season
          0.90, // Feb - high season
          0.90, // Mar - high season
          0.50, // Apr - low season
          0.50, // May - low season
          0.50, // Jun - low season
          0.50, // Jul - low season
          0.50, // Aug - low season
          0.50, // Sep - low season
          0.50, // Oct - low season
          0.90, // Nov - high season
          0.90, // Dec - high season
        ],
      });

      const result = runHotelEngine(config);
      const monthlyPnl = result.monthlyPnl;

      // Test A: High Season (January - month 0)
      const highSeasonMonth = monthlyPnl.find(m => m.monthIndex === 0)!;
      const highSeasonRevenue = highSeasonMonth.roomRevenue + 
                                highSeasonMonth.foodRevenue + 
                                highSeasonMonth.beverageRevenue + 
                                highSeasonMonth.otherRevenue;
      const highSeasonMargin = highSeasonMonth.noi / highSeasonRevenue;

      // Test B: Low Season (April - month 3)
      const lowSeasonMonth = monthlyPnl.find(m => m.monthIndex === 3)!;
      const lowSeasonRevenue = lowSeasonMonth.roomRevenue + 
                               lowSeasonMonth.foodRevenue + 
                               lowSeasonMonth.beverageRevenue + 
                               lowSeasonMonth.otherRevenue;
      const lowSeasonMargin = lowSeasonMonth.noi / lowSeasonRevenue;

      // Verify high season has higher revenue
      expect(highSeasonRevenue).toBeGreaterThan(lowSeasonRevenue);

      // Verify fixed costs are constant (payroll and otherOpex have fixed components)
      // Fixed costs should be similar (within small tolerance for variable component)
      const fixedPayroll = config.fixedPayroll ?? 0;
      const fixedOtherExpenses = config.fixedOtherExpenses ?? 0;
      const expectedFixedCosts = fixedPayroll + fixedOtherExpenses;

      // High season variable payroll = highSeasonRevenue * payrollPct
      const highSeasonVariablePayroll = highSeasonRevenue * config.payrollPct;
      const highSeasonVariableOther = highSeasonRevenue * config.otherOpexPct;
      const highSeasonExpectedPayroll = fixedPayroll + highSeasonVariablePayroll;
      const highSeasonExpectedOtherOpex = fixedOtherExpenses + highSeasonVariableOther;

      // Low season variable payroll = lowSeasonRevenue * payrollPct
      const lowSeasonVariablePayroll = lowSeasonRevenue * config.payrollPct;
      const lowSeasonVariableOther = lowSeasonRevenue * config.otherOpexPct;
      const lowSeasonExpectedPayroll = fixedPayroll + lowSeasonVariablePayroll;
      const lowSeasonExpectedOtherOpex = fixedOtherExpenses + lowSeasonVariableOther;

      // Verify fixed costs are present (payroll should be >= fixedPayroll)
      expect(highSeasonMonth.payroll).toBeGreaterThanOrEqual(fixedPayroll);
      expect(lowSeasonMonth.payroll).toBeGreaterThanOrEqual(fixedPayroll);
      expect(highSeasonMonth.otherOpex).toBeGreaterThanOrEqual(fixedOtherExpenses);
      expect(lowSeasonMonth.otherOpex).toBeGreaterThanOrEqual(fixedOtherExpenses);

      // Verify calculated payroll matches expected values (with tolerance for rounding)
      expect(highSeasonMonth.payroll).toBeCloseTo(highSeasonExpectedPayroll, 0);
      expect(highSeasonMonth.otherOpex).toBeCloseTo(highSeasonExpectedOtherOpex, 0);
      expect(lowSeasonMonth.payroll).toBeCloseTo(lowSeasonExpectedPayroll, 0);
      expect(lowSeasonMonth.otherOpex).toBeCloseTo(lowSeasonExpectedOtherOpex, 0);

      // CRITICAL TEST: Margins should NOT be constant
      // High season should have higher margins (fixed costs spread over more revenue)
      // Low season should have lower margins (fixed costs eat into profits)
      expect(highSeasonMargin).toBeGreaterThan(lowSeasonMargin);

      // Verify the margin difference is significant (not just rounding)
      const marginDifference = highSeasonMargin - lowSeasonMargin;
      expect(marginDifference).toBeGreaterThan(0.05); // At least 5 percentage points difference

      // Verify low season can have negative margins if revenue is too low
      // (This demonstrates operating leverage - fixed costs can cause losses in low season)
      if (lowSeasonRevenue < expectedFixedCosts * 2) {
        // If revenue is very low relative to fixed costs, margin should be negative or very low
        expect(lowSeasonMargin).toBeLessThan(highSeasonMargin);
      }
    });

    it('should demonstrate operating leverage: high season has high margins', () => {
      const config = createHighFixedCostHotel({
        occupancyByMonth: [
          0.95, // High season - Jan
          0.95, // High season - Feb
          0.95, // High season - Mar
          0.30, // Low season - Apr
          0.30, // Low season - May
          0.30, // Low season - Jun
          0.30, // Low season - Jul
          0.30, // Low season - Aug
          0.30, // Low season - Sep
          0.30, // Low season - Oct
          0.95, // High season - Nov
          0.95, // High season - Dec
        ],
      });

      const result = runHotelEngine(config);
      const monthlyPnl = result.monthlyPnl;

      // Find high season month (January)
      const highSeasonMonth = monthlyPnl.find(m => m.monthIndex === 0)!;
      const highSeasonRevenue = highSeasonMonth.roomRevenue + 
                                highSeasonMonth.foodRevenue + 
                                highSeasonMonth.beverageRevenue + 
                                highSeasonMonth.otherRevenue;
      const highSeasonMargin = highSeasonMonth.noi / highSeasonRevenue;

      // Find low season month (April)
      const lowSeasonMonth = monthlyPnl.find(m => m.monthIndex === 3)!;
      const lowSeasonRevenue = lowSeasonMonth.roomRevenue + 
                               lowSeasonMonth.foodRevenue + 
                               lowSeasonMonth.beverageRevenue + 
                               lowSeasonMonth.otherRevenue;
      const lowSeasonMargin = lowSeasonMonth.noi / lowSeasonRevenue;

      // High season should have positive, high margins
      expect(highSeasonMargin).toBeGreaterThan(0.10); // At least 10% margin

      // Low season should have lower margins (or negative)
      expect(lowSeasonMargin).toBeLessThan(highSeasonMargin);

      // Verify margins are NOT constant (this is the key test)
      expect(highSeasonMargin).not.toBeCloseTo(lowSeasonMargin, 1); // Not within 1% of each other
    });

    it('should demonstrate operating leverage: low season can have negative margins', () => {
      const config = createHighFixedCostHotel({
        // Very low occupancy in low season to push margins negative
        occupancyByMonth: [
          0.90, // High season
          0.90, // High season
          0.90, // High season
          0.20, // Very low season - should cause negative margins
          0.20, // Very low season
          0.20, // Very low season
          0.20, // Very low season
          0.20, // Very low season
          0.20, // Very low season
          0.20, // Very low season
          0.90, // High season
          0.90, // High season
        ],
      });

      const result = runHotelEngine(config);
      const monthlyPnl = result.monthlyPnl;

      // Find low season month (April)
      const lowSeasonMonth = monthlyPnl.find(m => m.monthIndex === 3)!;
      const lowSeasonRevenue = lowSeasonMonth.roomRevenue + 
                               lowSeasonMonth.foodRevenue + 
                               lowSeasonMonth.beverageRevenue + 
                               lowSeasonMonth.otherRevenue;
      const lowSeasonMargin = lowSeasonMonth.noi / lowSeasonRevenue;

      // With very low occupancy and high fixed costs, margin should be negative or very low
      expect(lowSeasonMargin).toBeLessThan(0.05); // Margin should be < 5% (likely negative)

      // Verify fixed costs are still present
      const fixedPayroll = config.fixedPayroll ?? 0;
      expect(lowSeasonMonth.payroll).toBeGreaterThanOrEqual(fixedPayroll);
    });
  });
});

describe('Seasonality Math (v3.5)', () => {
  /**
   * Creates a hotel config with seasonality for testing seasonality normalization.
   */
  function createSeasonalHotel(seasonalityCurve: number[], overrides?: Partial<HotelConfig>): HotelConfig {
    return buildHotelConfig({
      keys: 100,
      avgDailyRate: 250,
      horizonYears: 1,
      // Flat occupancy (seasonality will be applied via curve)
      occupancyByMonth: Array(12).fill(0.70),
      seasonalityCurve,
      // Standard cost structure
      payrollPct: 0.35,
      utilitiesPct: 0.05,
      marketingPct: 0.03,
      maintenanceOpexPct: 0.04,
      otherOpexPct: 0.03,
      foodRevenuePctOfRooms: 0.30,
      beverageRevenuePctOfRooms: 0.15,
      otherRevenuePctOfRooms: 0.10,
      foodCogsPct: 0.35,
      beverageCogsPct: 0.25,
      maintenanceCapexPct: 0.02,
      ...overrides,
    });
  }

  describe('Seasonality Normalization', () => {
    it('should verify sum of monthly revenue equals annual revenue', () => {
      // Create seasonality curve (peak in winter, low in summer)
      // Curve will be normalized to average 1.0
      const seasonalityCurve = [
        1.3, // Jan - peak
        1.3, // Feb - peak
        1.1, // Mar - high
        0.8, // Apr - low
        0.7, // May - low
        0.7, // Jun - low
        0.7, // Jul - low
        0.7, // Aug - low
        0.8, // Sep - low
        0.9, // Oct - medium
        1.1, // Nov - high
        1.3, // Dec - peak
      ];

      const config = createSeasonalHotel(seasonalityCurve);
      const result = runHotelEngine(config);

      // Calculate sum of monthly revenue
      const monthlyRevenueSum = result.monthlyPnl.reduce((sum, month) => {
        return sum + month.roomRevenue + month.foodRevenue + 
               month.beverageRevenue + month.otherRevenue;
      }, 0);

      // Get annual revenue
      const annualRevenue = result.annualPnl[0].revenueTotal;

      // Verify they match (within small tolerance for floating point)
      expect(monthlyRevenueSum).toBeCloseTo(annualRevenue, 2);
    });

    it('should verify seasonality normalization preserves annual revenue', () => {
      // Test with different seasonality curves
      const curves = [
        // Flat curve (no seasonality)
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        // Strong seasonality (summer peak)
        [0.5, 0.5, 0.8, 1.2, 1.5, 1.5, 1.5, 1.5, 1.2, 0.8, 0.5, 0.5],
        // Winter peak
        [1.5, 1.5, 1.2, 0.8, 0.5, 0.5, 0.5, 0.5, 0.8, 1.2, 1.5, 1.5],
      ];

      for (const curve of curves) {
        const config = createSeasonalHotel(curve);
        const result = runHotelEngine(config);

        // Calculate sum of monthly revenue
        const monthlyRevenueSum = result.monthlyPnl.reduce((sum, month) => {
          return sum + month.roomRevenue + month.foodRevenue + 
                 month.beverageRevenue + month.otherRevenue;
        }, 0);

        // Get annual revenue
        const annualRevenue = result.annualPnl[0].revenueTotal;

        // Verify they match (seasonality normalization should preserve total)
        expect(monthlyRevenueSum).toBeCloseTo(annualRevenue, 2);
      }
    });

    it('should verify seasonality distributes revenue across months correctly', () => {
      // Create a curve with clear peaks and valleys
      const seasonalityCurve = [
        1.5, // Jan - peak
        1.5, // Feb - peak
        1.0, // Mar - average
        0.5, // Apr - low
        0.5, // May - low
        0.5, // Jun - low
        0.5, // Jul - low
        0.5, // Aug - low
        0.5, // Sep - low
        1.0, // Oct - average
        1.5, // Nov - peak
        1.5, // Dec - peak
      ];

      const config = createSeasonalHotel(seasonalityCurve);
      const result = runHotelEngine(config);

      // Get monthly revenues
      const monthlyRevenues = result.monthlyPnl.map(month => 
        month.roomRevenue + month.foodRevenue + 
        month.beverageRevenue + month.otherRevenue
      );

      // Peak months (Jan, Feb, Nov, Dec) should have higher revenue
      const janRevenue = monthlyRevenues[0];
      const febRevenue = monthlyRevenues[1];
      const novRevenue = monthlyRevenues[10];
      const decRevenue = monthlyRevenues[11];
      
      // Low season months (Apr-Sep)
      const aprRevenue = monthlyRevenues[3];
      const mayRevenue = monthlyRevenues[4];
      const junRevenue = monthlyRevenues[5];

      // Average months
      const marRevenue = monthlyRevenues[2];
      const octRevenue = monthlyRevenues[9];

      // Peak months should be higher than low season months
      expect(janRevenue).toBeGreaterThan(aprRevenue);
      expect(febRevenue).toBeGreaterThan(mayRevenue);
      expect(novRevenue).toBeGreaterThan(junRevenue);
      expect(decRevenue).toBeGreaterThan(aprRevenue);

      // Peak months should be higher than average months
      expect(janRevenue).toBeGreaterThan(marRevenue);
      expect(decRevenue).toBeGreaterThan(octRevenue);

      // Low season months should be lower than average months
      expect(aprRevenue).toBeLessThan(marRevenue);
      expect(mayRevenue).toBeLessThan(octRevenue);

      // Verify revenue distribution reflects seasonality (peak > average > low)
      // The exact ratio depends on normalization, but relative ordering should be preserved
      const peakAvg = (janRevenue + febRevenue + novRevenue + decRevenue) / 4;
      const lowAvg = (aprRevenue + mayRevenue + junRevenue) / 3;
      
      expect(peakAvg).toBeGreaterThan(lowAvg * 1.5); // Peak should be at least 50% higher than low
    });

    it('should verify all revenue components sum correctly', () => {
      const seasonalityCurve = [1.2, 1.2, 1.0, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 1.0, 1.2, 1.2];
      const config = createSeasonalHotel(seasonalityCurve);
      const result = runHotelEngine(config);

      // Sum each revenue component separately
      const monthlyRoomRevenueSum = result.monthlyPnl.reduce((sum, m) => sum + m.roomRevenue, 0);
      const monthlyFoodRevenueSum = result.monthlyPnl.reduce((sum, m) => sum + m.foodRevenue, 0);
      const monthlyBeverageRevenueSum = result.monthlyPnl.reduce((sum, m) => sum + m.beverageRevenue, 0);
      const monthlyOtherRevenueSum = result.monthlyPnl.reduce((sum, m) => sum + m.otherRevenue, 0);

      // Annual P&L should sum all components
      const annualRevenue = result.annualPnl[0].revenueTotal;

      // Verify total matches
      const monthlyTotal = monthlyRoomRevenueSum + monthlyFoodRevenueSum + 
                          monthlyBeverageRevenueSum + monthlyOtherRevenueSum;
      expect(monthlyTotal).toBeCloseTo(annualRevenue, 2);
    });
  });
});

