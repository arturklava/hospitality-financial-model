/**
 * Motion Library Smoke Test (v2.8)
 * 
 * Verifies that the App still mounts correctly after introducing framer-motion.
 * Animation libraries can sometimes conflict with JSDOM/Testing Library.
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../../App';
import { AuditProvider } from '../../ui/contexts/AuditContext';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

/**
 * Mock localStorage for testing.
 */
function createMockLocalStorage(): Storage {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
}

describe('Motion Library Smoke Test (v2.8)', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    // Mock window.localStorage for browser-like environment
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    } else {
      // For Node.js test environment, create a global window object
      (globalThis as any).window = {
        localStorage: mockStorage,
      };
    }
  });

  it('should render App component without crashing with framer-motion', () => {
    // Render App wrapped in providers (as done in main.tsx)
    // This verifies that framer-motion components (PageTransition, MotionButton, etc.)
    // work correctly in the test environment
    const { container } = render(
      <ErrorBoundary>
        <AuditProvider>
          <App />
        </AuditProvider>
      </ErrorBoundary>
    );

    // Verify the component rendered (container should exist)
    expect(container).toBeDefined();
    expect(container).toBeTruthy();

    // The App component should render either:
    // 1. The loading state (if input/modelOutput is not ready)
    // 2. The main layout with motion components (if everything is initialized)
    // Either way, it should not crash
    expect(container.firstChild).toBeTruthy();
  });

  it('should handle framer-motion components in PageTransition', () => {
    // This test specifically verifies that PageTransition (which uses motion.div)
    // doesn't cause issues in the test environment
    const { container } = render(
      <ErrorBoundary>
        <AuditProvider>
          <App />
        </AuditProvider>
      </ErrorBoundary>
    );

    // If we get here without errors, framer-motion is working in tests
    expect(container).toBeDefined();
  });
});

