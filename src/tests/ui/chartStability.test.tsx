/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../../components/dashboard/StatCard';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import React from 'react';

// A "Bomb" component that throws an error when rendered
const Bomb = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('KABOOM!');
  }
  return <div>Safe Component</div>;
};

describe('UI Stability & Defensive Rendering', () => {

  describe('StatCard Stress Test', () => {
    it('renders gracefully when value is NaN', () => {
      render(
        <StatCard
          title="Test Stat"
          value={NaN}
        />
      );
      // Depending on implementation, it should show 'N/A' or '-'
      expect(screen.getByText(/N\/A|--|-/)).toBeDefined();
      expect(screen.queryByText('NaN')).toBeNull();
    });

    it('renders gracefully when value is Infinity', () => {
      render(
        <StatCard
          title="Test Stat"
          value={Infinity}
        />
      );
      expect(screen.getByText(/N\/A|--|-/)).toBeDefined();
      expect(screen.queryByText('Infinity')).toBeNull();
    });

    it('renders gracefully when value is null', () => {
      // @ts-ignore
      render(<StatCard title="Test Stat" value={null} />);
      expect(screen.getByText(/N\/A|--|-/)).toBeDefined();
    });
  });

  describe('ErrorBoundary Containment', () => {
    it('isolates failures and shows fallback without crashing the app', () => {
      // We need to suppress console.error for this test as React logs the caught error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      render(
        <div>
          <div data-testid="app-header">App Header</div>
          <ErrorBoundary fallback={<div data-testid="error-fallback">Something went wrong</div>}>
            <Bomb shouldThrow={true} />
          </ErrorBoundary>
          <div data-testid="app-footer">App Footer</div>
        </div>
      );

      // The fallback should be visible
      expect(screen.getByTestId('error-fallback')).toBeDefined();

      // The rest of the app should still be there
      expect(screen.getByTestId('app-header')).toBeDefined();
      expect(screen.getByTestId('app-footer')).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('supports widget variant for granular failures', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      render(
        <ErrorBoundary variant="widget">
          <Bomb shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show the widget error state (with emoji and "Error loading widget" text)
      expect(screen.getByText(/Error loading widget/i)).toBeDefined();
      expect(screen.getByText('⚠️')).toBeDefined();

      consoleSpy.mockRestore();
    });
  });
});
