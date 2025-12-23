/**
 * Import Modal Component (v2.9)
 * 
 * Modal dialog for importing scenarios from Excel files.
 * Shows parsing loader during import process.
 */

import { useState, useRef } from 'react';
import { parseExcelScenario } from '../../engines/io/excelImport';
import { generateExcelTemplate } from '../../engines/io/excelTemplate';
import type { NamedScenario } from '../../domain/types';
import { SkeletonCard } from '../common/Skeleton';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (scenario: NamedScenario) => void;
}

export function ImportModal({
  isOpen,
  onClose,
  onImport,
}: ImportModalProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const scenario = await parseExcelScenario(file);
      onImport(scenario);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await generateExcelTemplate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate template');
    }
  };

  const handleCancel = () => {
    setError(null);
    setIsParsing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          minWidth: '400px',
          maxWidth: '600px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Import from Excel</h2>
        
        {isParsing ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '3px solid rgba(33, 150, 243, 0.3)',
                borderTopColor: '#2196F3',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontWeight: 500 }}>Parsing Excel...</span>
            </div>
            <SkeletonCard />
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9em' }}>
              Select an Excel file to import scenario data. The file must contain an "Input_Data" sheet with Key-Value pairs.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="excel-file-input"
              />
              <label
                htmlFor="excel-file-input"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '1rem',
                }}
              >
                Choose Excel File
              </label>
            </div>

            <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.9em', color: '#666' }}>
                Don't have a template? Download one to get started:
              </p>
              <button
                onClick={handleDownloadTemplate}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: '#2196F3',
                  border: '1px solid #2196F3',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
              >
                Download Template
              </button>
            </div>

            {error && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#ffebee',
                color: '#c62828',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

