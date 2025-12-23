/**
 * Inspector Drawer Component (v5.9: Knowledge Views)
 * 
 * A sliding panel from the right side that displays audit information
 * when an audited number is clicked. Shows the calculation formula,
 * input values, and links to glossary definitions.
 */

import { X, BookOpen } from 'lucide-react';
import { useEffect } from 'react';
import { FINANCIAL_GLOSSARY } from '../../domain/glossary';
import { useTranslation } from '../../contexts/LanguageContext';
import type { InspectorData } from './InspectorOverlay';

export interface InspectorDrawerProps {
  data: InspectorData | null;
  onClose: () => void;
  onNavigateToGlossary?: () => void;
}

export function InspectorDrawer({
  data,
  onClose,
  onNavigateToGlossary,
}: InspectorDrawerProps) {
  const { t, language } = useTranslation();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && data) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [data, onClose]);

  if (!data) {
    return null;
  }

  // Extract metric name from formula or value
  const metricName = extractMetricName(data.formula) || 'Metric';

  // Get glossary entry for this metric
  const glossaryEntry = getGlossaryEntryForMetric(metricName);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
          transition: 'opacity 0.3s ease',
        }}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '90vw',
          zIndex: 9999,
          backgroundColor: 'white',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          transform: 'translateX(0)',
          transition: 'transform 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '1.5rem',
            borderBottom: '2px solid var(--border, #e2e8f0)',
            backgroundColor: 'var(--surface-hover, #f1f5f9)',
          }}
        >
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.25rem',
              color: 'var(--text-primary, #1e293b)',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}>
              {metricName}
            </h3>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--primary, #2196F3)',
                fontFamily: 'monospace',
              }}
            >
              {data.value}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-secondary, #64748b)',
              padding: '0.25rem',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
              marginLeft: '1rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-hover, #f1f5f9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
          }}
        >
          {/* The Math Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary, #64748b)',
              margin: 0,
              marginBottom: '1rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {t('glossary.calculation')}
            </h4>

            {/* Formula */}
            <div style={{
              backgroundColor: 'var(--surface-hover, #f1f5f9)',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border, #e2e8f0)',
              marginBottom: '1rem',
            }}>
              <div style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #64748b)',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}>
                Formula
              </div>
              <code style={{
                display: 'block',
                fontFamily: 'monospace',
                fontSize: '1rem',
                color: 'var(--text-primary, #1e293b)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {data.formula}
              </code>
            </div>

            {/* Input Values */}
            {data.inputs.length > 0 && (
              <div>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary, #64748b)',
                  marginBottom: '0.75rem',
                  fontWeight: 500,
                }}>
                  {t('analysis.variables')}
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}>
                  {data.inputs.map((input, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        backgroundColor: 'var(--surface, #ffffff)',
                        borderRadius: '6px',
                        border: '1px solid var(--border, #e2e8f0)',
                      }}
                    >
                      <span style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-primary, #1e293b)',
                        fontWeight: 500,
                      }}>
                        {input.label}:
                      </span>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: 'var(--text-primary, #1e293b)',
                        fontFamily: 'monospace',
                      }}>
                        {input.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description Section */}
          {glossaryEntry && (
            <div>
              <h4 style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #64748b)',
                margin: 0,
                marginBottom: '1rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {t('common.description')}
              </h4>
              <div style={{
                backgroundColor: 'var(--surface, #ffffff)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border, #e2e8f0)',
                lineHeight: '1.6',
                color: 'var(--text-primary, #1e293b)',
              }}>
                {glossaryEntry.explanation[language] || 'No description available.'}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1.5rem',
            borderTop: '2px solid var(--border, #e2e8f0)',
            backgroundColor: 'var(--surface-hover, #f1f5f9)',
          }}
        >
          {onNavigateToGlossary && (
            <button
              onClick={onNavigateToGlossary}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--primary, #2196F3)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius, 8px)',
                fontSize: '0.9375rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s, transform 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1976D2';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary, #2196F3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <BookOpen size={18} />
              {t('nav.glossary')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Extracts metric name from formula string.
 * Examples: "NOI = ..." -> "NOI", "DSCR = ..." -> "DSCR"
 */
function extractMetricName(formula: string): string | null {
  const match = formula.match(/^([A-Z_]+)\s*=/);
  return match ? match[1] : null;
}

/**
 * Gets glossary entry for a metric name.
 */
function getGlossaryEntryForMetric(metricName: string) {
  // Try exact match first
  let entry = FINANCIAL_GLOSSARY[metricName];

  if (entry) {
    return entry;
  }

  // Try case-insensitive match
  const normalized = metricName.toUpperCase();
  entry = FINANCIAL_GLOSSARY[normalized];

  if (entry) {
    return entry;
  }

  // Try finding by acronym
  for (const term of Object.values(FINANCIAL_GLOSSARY)) {
    if (term.acronym?.toUpperCase() === normalized) {
      return term;
    }
  }

  return null;
}

