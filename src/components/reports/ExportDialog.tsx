/**
 * Export Dialog Component (v3.4: Report Builder UI)
 * 
 * Modal dialog for customizing Excel export options before generating the investment memo.
 * Includes author info, export options, and preview graphic.
 */

import { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { generateExcel } from '../../ui/utils/excelExport';
import type { NamedScenario, FullModelOutput } from '../../domain/types';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: NamedScenario;
  output: FullModelOutput;
}

export function ExportDialog({
  isOpen,
  onClose,
  scenario,
  output,
}: ExportDialogProps) {
  const [preparedBy, setPreparedBy] = useState('');
  const [detailedMonthlyData, setDetailedMonthlyData] = useState(false);
  const [protectWorkbook, setProtectWorkbook] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // TODO: Pass export options to generateExcel once IO_AGENT implements the options
      // For now, call the existing generateExcel function
      await generateExcel(scenario, output);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate Excel file');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setPreparedBy('');
    setDetailedMonthlyData(false);
    setProtectWorkbook(false);
    setError(null);
    onClose();
  };

  return (
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
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: 'var(--surface, white)',
          borderRadius: 'var(--radius, 8px)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border, #e0e0e0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            Export Investment Memo
          </h2>
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm, 4px)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background-hover, #f0f0f0)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '1.5rem',
          overflow: 'auto',
        }}>
          {/* Preview Graphic */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            padding: '2rem',
            backgroundColor: 'var(--background, #f5f5f5)',
            borderRadius: 'var(--radius, 8px)',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              backgroundColor: 'var(--primary, #2196F3)',
              borderRadius: '8px',
              color: 'white',
            }}>
              <FileText size={48} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '0.25rem',
              }}>
                Investment Memo Workbook
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
              }}>
                Summary • Assumptions • Cash Flow • Waterfall
              </div>
            </div>
          </div>

          {/* Author Info */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}>
              Prepared For/By
            </label>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder="Enter name or organization"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border, #e0e0e0)',
                borderRadius: 'var(--radius-sm, 4px)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Options */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm, 4px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--background-hover, #f0f0f0)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={detailedMonthlyData}
                  onChange={(e) => setDetailedMonthlyData(e.target.checked)}
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}>
                    Detailed Monthly Data
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.25rem',
                  }}>
                    Include monthly breakdown sheets in the workbook
                  </div>
                </div>
              </label>
            </div>

            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm, 4px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--background-hover, #f0f0f0)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={protectWorkbook}
                  onChange={(e) => setProtectWorkbook(e.target.checked)}
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}>
                    Protect Workbook
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.25rem',
                  }}>
                    Password-protect the workbook structure
                  </div>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: 'var(--radius-sm, 4px)',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid var(--border, #e0e0e0)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
        }}>
          <button
            onClick={handleCancel}
            disabled={isGenerating}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border, #e0e0e0)',
              borderRadius: 'var(--radius-sm, 4px)',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              opacity: isGenerating ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isGenerating ? 'var(--text-secondary, #999)' : 'var(--primary, #2196F3)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm, 4px)',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {isGenerating ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Generating...
              </>
            ) : (
              <>
                <FileText size={18} />
                Generate .xlsx
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

