/**
 * Version History Panel Component (v0.12)
 * 
 * Lists saved versions for the current scenario with actions to load or compare.
 */

import { useMemo } from 'react';
import type { SavedScenario } from '@domain/types';
import { getVersionsForScenario } from '../../ui/utils/versionStorage';

interface VersionHistoryProps {
  scenarioId: string;
  onLoad: (version: SavedScenario) => void;
  onCompare: (version: SavedScenario) => void;
}

export function VersionHistory({
  scenarioId,
  onLoad,
  onCompare,
}: VersionHistoryProps) {
  const versions = useMemo(() => {
    return getVersionsForScenario().sort(
      (a, b) => b.lastModified - a.lastModified
    );
  }, [scenarioId]);

  if (versions.length === 0) {
    return (
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Version History</h3>
        <p style={{ color: '#666', fontSize: '0.9em', margin: 0 }}>
          No saved versions yet. Use "Save Version" to create a snapshot.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Version History</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {versions.map((version) => (
          <div
            key={version.id}
            style={{
              backgroundColor: 'white',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                {version.name}
              </div>
              <div style={{ fontSize: '0.85em', color: '#666' }}>
                {new Date(version.lastModified).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => onLoad(version)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Load
              </button>
              <button
                onClick={() => onCompare(version)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Compare
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

