import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Hook to get computed CSS variable values for chart colors.
 * This ensures charts get actual color values that update when theme changes.
 */
export function useThemeColors() {
  const { theme } = useTheme();

  return useMemo(() => {
    if (typeof window === 'undefined') {
      // SSR fallback
      return {
        emerald: '#10B981',
        blue: '#2563EB',
        violet: '#8B5CF6',
        amber: '#F59E0B',
        indigo: '#6366F1',
        teal: '#14B8A6',
        rose: '#F43F5E',
        green: '#4CAF50',
        red: '#F44336',
        orange: '#FF9800',
      };
    }

    const root = document.documentElement;
    const getColor = (varName: string) => {
      return getComputedStyle(root).getPropertyValue(varName).trim() || '';
    };

    return {
      emerald: getColor('--color-chart-emerald'),
      blue: getColor('--color-chart-blue'),
      violet: getColor('--color-chart-violet'),
      amber: getColor('--color-chart-amber'),
      indigo: getColor('--color-chart-indigo'),
      teal: getColor('--color-chart-teal'),
      rose: getColor('--color-chart-rose'),
      green: getColor('--color-chart-green'),
      red: getColor('--color-chart-red'),
      orange: getColor('--color-chart-orange'),
    };
  }, [theme]);
}

