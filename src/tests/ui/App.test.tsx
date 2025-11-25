/**
 * App Component Mount Test (v1.1.4)
 * 
 * Verifies that the App component renders without crashing when wrapped
 * in the required providers (AuditProvider).
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../ui/hooks/useFinancialModel', async () => {
  const actual = await import('../../ui/hooks/useFinancialModel');
  return {
    ...actual,
    useFinancialModel: vi.fn(),
  };
});

import App from '../../App';
import { AuditProvider } from '../../ui/contexts/AuditContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { useFinancialModel } from '../../ui/hooks/useFinancialModel';
import * as AuthContext from '../../contexts/AuthContext';

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

describe('App Component Mount Test (v1.1.4)', () => {
  let mockStorage: Storage;
  const mockedUseFinancialModel = useFinancialModel as unknown as ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const actual = await vi.importActual<typeof import('../../ui/hooks/useFinancialModel')>(
      '../../ui/hooks/useFinancialModel'
    );
    mockedUseFinancialModel.mockImplementation(actual.useFinancialModel);
  });

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

  it('should render App component without crashing when wrapped in AuditProvider', () => {
    // Render App wrapped in AuditProvider and AuthProvider (as done in main.tsx)
    const { container } = render(
      <AuthProvider>
        <AuditProvider>
          <App />
        </AuditProvider>
      </AuthProvider>
    );

    // Verify the component rendered (container should exist)
    expect(container).toBeDefined();
    expect(container).toBeTruthy();

    // The App component should render either:
    // 1. The loading state (if input/modelOutput is not ready)
    // 2. The main layout (if everything is initialized)
    // Either way, it should not crash
    expect(container.firstChild).toBeTruthy();
  });

  it('should render App component with ErrorBoundary wrapper', () => {
    // Test that App can be wrapped in ErrorBoundary as well
    // (This matches the structure in main.tsx)
    const { container } = render(
      <ErrorBoundary>
        <AuthProvider>
          <AuditProvider>
            <App />
          </AuditProvider>
        </AuthProvider>
      </ErrorBoundary>
    );

    expect(container).toBeDefined();
    expect(container.firstChild).toBeTruthy();
  });

  it('shows a friendly message when the model fails to run', () => {
    const authSpy = vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isGuest: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInAsGuest: vi.fn(),
      exitGuestMode: vi.fn(),
    } as any);

    mockedUseFinancialModel.mockReturnValue({
      input: {} as any,
      updateInput: vi.fn(),
      runModel: vi.fn(() => null),
      saveVersion: vi.fn(),
      exportJson: vi.fn(),
      savedVersions: [],
      loadVersion: vi.fn(),
      importJson: vi.fn(),
      exportExcel: vi.fn(),
      errorMessage: 'Operation Test Hotel occupancy month 1 (0-1 scale) must be between 0 and 1, got 1.2',
    });

    render(
      <AuthProvider>
        <AuditProvider>
          <App />
        </AuditProvider>
      </AuthProvider>
    );

    expect(screen.getByText('We couldn’t run your model')).toBeTruthy();
    expect(
      screen.getByText(/Operation Test Hotel occupancy month 1 \(0-1 scale\) must be between 0 and 1/)
    ).toBeTruthy();

    authSpy.mockRestore();
  });
});

