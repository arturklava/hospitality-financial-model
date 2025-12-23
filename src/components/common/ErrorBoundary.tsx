/**
 * Error Boundary Component (v1.0)
 * 
 * Catches React errors and displays a friendly error UI instead of crashing the app.
 */

import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  variant?: 'default' | 'widget';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearDataAndReload = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Widget Variant (Minimal)
      if (this.props.variant === 'widget') {
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '80px',
            padding: '1rem',
            backgroundColor: '#fef2f2', // Soft red/pink
            border: '1px solid #fee2e2',
            borderRadius: '8px',
            color: '#b91c1c', // Darker red for text
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Error loading widget</span>
              <button
                onClick={this.handleReset}
                style={{
                  marginTop: '0.25rem',
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  border: '1px solid #f87171',
                  background: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#b91c1c'
                }}
              >
                Retry
              </button>
            </div>
          </div>
        );
      }

      // Default Variant (Full Page/Section)
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '600px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e0e0e0',
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
            }}>
              ⚠️
            </div>
            <h2 style={{
              marginTop: 0,
              marginBottom: '1rem',
              color: '#d32f2f',
              fontSize: '1.5rem',
            }}>
              Something went wrong
            </h2>
            <p style={{
              marginBottom: '1.5rem',
              color: '#666',
              fontSize: '1rem',
              lineHeight: '1.5',
            }}>
              An unexpected error occurred. Don't worry, your data is safe. You can try resetting this view or reloading the page.
            </p>

            {this.state.error && import.meta.env.DEV && (
              <details style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                textAlign: 'left',
                fontSize: '0.85em',
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#d32f2f',
                }}>
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              alignItems: 'center',
            }}>
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
              }}>
                <button
                  onClick={this.handleReset}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500,
                  }}
                >
                  Reset View
                </button>
                <button
                  onClick={this.handleReload}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500,
                  }}
                >
                  Reload Page
                </button>
              </div>
              <button
                onClick={this.handleClearDataAndReload}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              >
                Clear Data & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

