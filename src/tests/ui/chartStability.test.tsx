/**
 * Chart Stability Test (v3.2: UX Verification).
 * 
 * Verifies that chart components gracefully handle empty data without throwing errors.
 * Tests:
 * 1. CapitalStackChart with empty data
 * 2. AssetWaterfallChart with empty data
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CapitalStackChart } from '../../components/charts/CapitalStackChart';
import { AssetWaterfallChart } from '../../components/operations/AssetWaterfallChart';
import type { CapitalStructureConfig, OperationConfig } from '../../domain/types';
import { buildHotelConfig } from '../helpers/buildOperationConfig';

describe('Chart Stability Test (v3.2)', () => {
  describe('CapitalStackChart', () => {
    it('should render "No Data Available" with empty capital config (zero investment, no debt)', () => {
      const emptyCapitalConfig: CapitalStructureConfig = {
        initialInvestment: 0,
        debtTranches: [],
      };

      // Should not throw
      expect(() => {
        render(<CapitalStackChart capitalConfig={emptyCapitalConfig} />);
      }).not.toThrow();

      // Should render "No Data Available"
      const noDataText = screen.getByText(/No Data Available/i);
      expect(noDataText).toBeInTheDocument();
    });

    it('should render "No Data Available" with zero investment and zero debt', () => {
      const zeroCapitalConfig: CapitalStructureConfig = {
        initialInvestment: 0,
        debtTranches: [],
      };

      render(<CapitalStackChart capitalConfig={zeroCapitalConfig} />);

      const noDataText = screen.getByText(/No Data Available/i);
      expect(noDataText).toBeInTheDocument();
    });

    it('should not throw with undefined debtTranches', () => {
      const configWithUndefinedTranches: CapitalStructureConfig = {
        initialInvestment: 0,
        debtTranches: undefined as any, // Testing edge case
      };

      // Should not throw - normalizeCapitalData handles undefined
      expect(() => {
        render(<CapitalStackChart capitalConfig={configWithUndefinedTranches} />);
      }).not.toThrow();

      // Should render "No Data Available" for zero investment
      const noDataText = screen.getByText(/No Data Available/i);
      expect(noDataText).toBeInTheDocument();
    });
  });

  describe('AssetWaterfallChart', () => {
    it('should render "No Data Available" with empty modelOutput', () => {
      const operation: OperationConfig = buildHotelConfig({
        id: 'test-hotel-empty',
        name: 'Test Hotel',
      });

      // Should not throw
      expect(() => {
        render(
          <AssetWaterfallChart
            operation={operation}
            modelOutput={undefined}
          />
        );
      }).not.toThrow();

      // Should render "No Data Available"
      const noDataText = screen.getByText(/No Data Available/i);
      expect(noDataText).toBeInTheDocument();
    });

    it('should render "No Data Available" with null modelOutput', () => {
      const operation: OperationConfig = buildHotelConfig({
        id: 'test-hotel-null',
        name: 'Test Hotel',
      });

      render(
        <AssetWaterfallChart
          operation={operation}
          modelOutput={null as any}
        />
      );

      const noDataText = screen.getByText(/No Data Available/i);
      expect(noDataText).toBeInTheDocument();
    });

    it('should not throw when operation exists but modelOutput has no scenario results', () => {
      const operation: OperationConfig = buildHotelConfig({
        id: 'test-hotel-no-scenario',
        name: 'Test Hotel',
      });

      const emptyModelOutput = {
        scenario: null,
      } as any;

      // Should not throw
      expect(() => {
        render(
          <AssetWaterfallChart
            operation={operation}
            modelOutput={emptyModelOutput}
          />
        );
      }).not.toThrow();

      // Should render "No Data Available"
      const noDataText = screen.getByText(/No Data Available/i);
      expect(noDataText).toBeInTheDocument();
    });
  });
});

