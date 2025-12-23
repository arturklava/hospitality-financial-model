/**
 * Health Panel Component (v1.5: Governance UI)
 * 
 * Displays health check results with visual indicators (green/yellow/red).
 */

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { runHealthChecks, type HealthCheckResult } from '../../engines/audit/healthEngine';
import type { FullModelOutput } from '../../domain/types';
import { motion } from 'framer-motion';

interface HealthPanelProps {
  modelOutput: FullModelOutput;
}

function getStatusIcon(status: HealthCheckResult['status']) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 size={20} color="#4CAF50" />;
    case 'warning':
      return <AlertTriangle size={20} color="#FF9800" />;
    case 'fail':
      return <XCircle size={20} color="#F44336" />;
  }
}

function getStatusColor(status: HealthCheckResult['status']): string {
  switch (status) {
    case 'pass':
      return '#4CAF50';
    case 'warning':
      return '#FF9800';
    case 'fail':
      return '#F44336';
  }
}

export function HealthPanel({ modelOutput }: HealthPanelProps) {
  const healthChecks = runHealthChecks(modelOutput);

  const overallStatus = healthChecks.some(check => check.status === 'fail')
    ? 'fail'
    : healthChecks.some(check => check.status === 'warning')
    ? 'warning'
    : 'pass';

  return (
    <div className="card">
      <motion.div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          marginBottom: '1rem',
          cursor: 'pointer',
        }}
        whileHover={{ opacity: 0.8 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
      >
        {getStatusIcon(overallStatus)}
        <h2 style={{ margin: 0 }}>Health Checks</h2>
      </motion.div>

      {healthChecks.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          No health checks available.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {healthChecks.map((check) => (
            <div
              key={check.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: 'var(--background-secondary, #f9f9f9)',
                borderRadius: '6px',
                border: `1px solid ${getStatusColor(check.status)}33`,
              }}
            >
              <div style={{ marginTop: '2px' }}>
                {getStatusIcon(check.status)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 600, 
                  marginBottom: '0.25rem',
                  color: 'var(--text-primary)'
                }}>
                  {check.label}
                </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4'
                }}>
                  {check.message}
                </div>
                {check.value !== null && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: getStatusColor(check.status),
                    marginTop: '0.25rem',
                    fontWeight: 500
                  }}>
                    Value: {typeof check.value === 'number' 
                      ? check.value.toFixed(2) 
                      : check.value}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

