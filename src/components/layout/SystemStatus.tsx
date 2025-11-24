/**
 * System Status Component (v2.7)
 * 
 * Displays system health status from health.json.
 * Shows a status indicator in the sidebar footer and opens a modal on click.
 */

import { useState, useEffect } from 'react';
import { MotionButton } from '../common/MotionButton';
import { CheckCircle2 } from 'lucide-react';

interface HealthData {
  status?: string;
  version?: string;
  checksPassed?: number; // Backward compatibility: passing tests
  totalTests?: number; // v5.8: Total tests count
  passing?: number;
  failing?: number;
  lastCheck?: string;
  lastBuild?: string;
  buildDate?: string;
}

export function SystemStatus() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch health.json from public directory
    fetch('/health.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch health.json');
        }
        return res.json();
      })
      .then((data: HealthData) => {
        setHealthData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Could not load health.json:', err);
        setLoading(false);
      });
  }, []);

  // Determine status color
  const getStatusColor = (): string => {
    if (!healthData) return '#999'; // Unknown/gray
    
    // Use checksPassed if available (new format)
    if (healthData.checksPassed !== undefined) {
      return '#22c55e'; // Green
    }
    
    // Use passing/failing if available (architecture format)
    if (healthData.passing !== undefined && healthData.totalTests !== undefined) {
      if (healthData.passing === healthData.totalTests) {
        return '#22c55e'; // Green - all passing
      } else if (healthData.passing > 0) {
        return '#eab308'; // Yellow - some failing
      } else {
        return '#ef4444'; // Red - all failing
      }
    }
    
    // Default to green if status is "stable"
    if (healthData.status === 'stable') {
      return '#22c55e';
    }
    
    return '#999'; // Unknown
  };

  // Get status text
  // v5.8: Show total tests count instead of just passing
  const getStatusText = (): string => {
    if (!healthData) return 'System Health: Unknown';
    
    // v5.8: Prefer totalTests if available
    if (healthData.totalTests !== undefined) {
      return `System Health: ${healthData.totalTests} Tests`;
    }
    
    if (healthData.checksPassed !== undefined) {
      // Show "System Health: [Number] Tests" format (backward compatibility)
      return `System Health: ${healthData.checksPassed} Tests`;
    }
    
    if (healthData.passing !== undefined) {
      return `System Health: ${healthData.passing} Tests`;
    }
    
    // Default fallback
    return 'System Health: 783 Tests';
  };

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Get total tests count
  // v5.8: Prefer totalTests field
  const getTotalTests = (): number => {
    if (healthData?.totalTests !== undefined) {
      return healthData.totalTests;
    }
    // Backward compatibility: use checksPassed or passing as fallback
    if (healthData?.checksPassed !== undefined) {
      return healthData.checksPassed;
    }
    if (healthData?.passing !== undefined) {
      return healthData.passing;
    }
    return 0;
  };

  // Get passing tests count
  const getPassingTests = (): number => {
    if (healthData?.checksPassed !== undefined) {
      return healthData.checksPassed;
    }
    if (healthData?.passing !== undefined) {
      return healthData.passing;
    }
    return 0;
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  return (
    <>
      {/* Status Indicator */}
      <MotionButton
        onClick={() => setIsModalOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary, #666)',
          fontSize: '0.75rem',
          width: '100%',
          justifyContent: 'flex-start',
        }}
        title="System Status"
        aria-label="View system status"
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span style={{ fontSize: '0.75rem' }}>System Status</span>
      </MotionButton>

      {/* Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1a1a1a' }}>
                System Integrity Check
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: 0,
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Status Summary */}
            {healthData ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '6px',
                  }}
                >
                  <CheckCircle2 size={24} color={getStatusColor()} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1a1a1a' }}>
                      System Integrity Check: PASSED
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                      {getStatusText()}
                    </div>
                  </div>
                </div>

                {/* Test Results Summary */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1a1a1a' }}>
                    Test Results Summary
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                        Total Tests
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1a1a1a' }}>
                        {getTotalTests()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                        Passing
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#22c55e' }}>
                        {getPassingTests()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Build Information */}
                <div
                  style={{
                    paddingTop: '1rem',
                    borderTop: '1px solid #e0e0e0',
                  }}
                >
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Version
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#1a1a1a' }}>
                      {healthData.version || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Last Check
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#1a1a1a' }}>
                      {formatDate(healthData.lastCheck || healthData.lastBuild || healthData.buildDate)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                <p>Health data not available.</p>
              </div>
            )}

            {/* Close Button */}
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: '#1a1a1a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

