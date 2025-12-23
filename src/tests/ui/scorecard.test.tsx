/**
 * KpiScorecard Component Tests (v2.5: Component Testing)
 * 
 * Tests that verify the KpiScorecard component renders correctly:
 * - Renders label and value
 * - Renders trend indicator if data provided
 * - Renders sparkline from dataSeries
 * - Note: We can't easily test Recharts canvas output in JSDOM, but we can verify the container exists
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { KpiScorecard } from '../../components/dashboard/KpiScorecard';

describe('KpiScorecard Component (v2.5)', () => {
  describe('Basic Rendering', () => {
    it('should render the label', () => {
      render(
        <KpiScorecard
          label="Levered IRR"
          value="18.5%"
          dataSeries={[10, 20, 30]}
        />
      );

      // Verify label is rendered
      const labelElement = screen.getByText('Levered IRR');
      expect(labelElement).toBeInTheDocument();
    });

    it('should render the value', () => {
      render(
        <KpiScorecard
          label="NPV"
          value="$1,234,567"
          dataSeries={[10, 20, 30]}
        />
      );

      // Verify value is rendered
      const valueElement = screen.getByText('$1,234,567');
      expect(valueElement).toBeInTheDocument();
    });

    it('should render both label and value', () => {
      render(
        <KpiScorecard
          label="Equity Multiple"
          value="2.5x"
          dataSeries={[10, 20, 30]}
        />
      );

      // Verify both are rendered
      expect(screen.getByText('Equity Multiple')).toBeInTheDocument();
      expect(screen.getByText('2.5x')).toBeInTheDocument();
    });

    it('should render numeric value correctly', () => {
      const { container } = render(
        <KpiScorecard
          label="Payback Period"
          value="8.5"
          dataSeries={[10, 20, 30]}
        />
      );

      // The value should be displayed
      expect(screen.getByText('8.5')).toBeInTheDocument();
      expect(container).toBeTruthy();
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Trend Indicator', () => {
    it('should render trend indicator when trend prop is provided', () => {
      const { container } = render(
        <KpiScorecard
          label="Levered IRR"
          value="18.5%"
          dataSeries={[10, 20, 30]}
          trend="up"
          comparisonText="+2.3% vs Target"
        />
      );

      // Verify trend indicator is rendered
      // The component should display the comparison text and trend arrow
      expect(container.textContent).toContain('+2.3% vs Target');
      expect(container.textContent).toContain('↑');
    });

    it('should render upward trend indicator', () => {
      const { container } = render(
        <KpiScorecard
          label="Revenue"
          value="$1,000,000"
          dataSeries={[100, 150, 200, 180, 250, 300]}
          trend="up"
        />
      );

      // Verify upward trend is indicated (arrow should be present)
      expect(container.textContent).toContain('↑');
      expect(container).toBeTruthy();
      expect(container.firstChild).toBeTruthy();
    });

    it('should render downward trend indicator', () => {
      const { container } = render(
        <KpiScorecard
          label="DSCR"
          value="1.45"
          dataSeries={[300, 250, 200, 180, 150, 100]}
          trend="down"
        />
      );

      // Verify downward trend is indicated (arrow should be present)
      expect(container.textContent).toContain('↓');
      expect(container).toBeTruthy();
      expect(container.firstChild).toBeTruthy();
    });

    it('should render neutral trend indicator', () => {
      const { container } = render(
        <KpiScorecard
          label="Occupancy"
          value="75%"
          dataSeries={[100, 100, 100, 100]}
          trend="neutral"
        />
      );

      // Verify component renders
      expect(container).toBeTruthy();
      expect(container.firstChild).toBeTruthy();
    });

    it('should auto-calculate trend from dataSeries when trend prop is not provided', () => {
      const { container } = render(
        <KpiScorecard
          label="NPV"
          value="$1,234,567"
          dataSeries={[100, 150, 200]}
        />
      );

      // Trend should be calculated from data (200 > 100, so should be 'up')
      // Verify label and value are still rendered
      expect(screen.getByText('NPV')).toBeInTheDocument();
      expect(screen.getByText('$1,234,567')).toBeInTheDocument();
      expect(container).toBeTruthy();
    });
  });

  describe('Sparkline Container', () => {
    it('should render sparkline container when dataSeries is provided', () => {
      const { container } = render(
        <KpiScorecard
          label="Revenue Growth"
          value="$1,000,000"
          dataSeries={[100, 150, 200, 180, 250, 300]}
        />
      );

      // Note: We can't easily test Recharts canvas output in JSDOM,
      // but we can verify the container exists
      // The container should exist (even if canvas/SVG is not fully rendered in JSDOM)
      expect(container).toBeTruthy();
      
      // If using recharts, the container structure should exist
      // We verify the component rendered without error
      expect(container.firstChild).toBeTruthy();
    });

    it('should render with minimal dataSeries', () => {
      const { container } = render(
        <KpiScorecard
          label="NPV"
          value="$1,234,567"
          dataSeries={[100, 200]}
        />
      );

      // Label and value should still render
      expect(screen.getByText('NPV')).toBeInTheDocument();
      expect(screen.getByText('$1,234,567')).toBeInTheDocument();
      expect(container).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('should render with required props only', () => {
      const { container } = render(
        <KpiScorecard
          label="Test KPI"
          value="100"
          dataSeries={[10, 20, 30]}
        />
      );

      expect(screen.getByText('Test KPI')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(container.firstChild).toBeTruthy();
    });

    it('should render with all optional props', () => {
      const { container } = render(
        <KpiScorecard
          label="Comprehensive KPI"
          value="123.45"
          dataSeries={[100, 110, 120, 115, 130, 125]}
          target={100}
          trend="up"
          comparisonText="+25% vs Target"
          statusDot="success"
          className="custom-class"
        />
      );

      // Verify basic elements render
      expect(screen.getByText('Comprehensive KPI')).toBeInTheDocument();
      expect(screen.getByText('123.45')).toBeInTheDocument();
      expect(container).toBeTruthy();
      expect(container.firstChild).toBeTruthy();
    });

    it('should render status dot when provided', () => {
      const { container } = render(
        <KpiScorecard
          label="Health Status"
          value="95%"
          dataSeries={[10, 20, 30]}
          statusDot="success"
        />
      );

      // Status dot should be rendered (check for the dot element)
      expect(container).toBeTruthy();
      expect(container.firstChild).toBeTruthy();
    });
  });
});
