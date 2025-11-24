/**
 * Governance View Component (v1.5: Governance UI)
 * 
 * Displays version history with restore functionality.
 */

import type { SavedScenario } from '../domain/types';

interface GovernanceViewProps {
  versions: SavedScenario[];
  onLoadVersion: (version: SavedScenario) => void;
  onRestoreVersion?: (version: SavedScenario) => void;
}

export function GovernanceView({
  versions,
  onLoadVersion,
  onRestoreVersion,
}: GovernanceViewProps) {
  // Use onRestoreVersion if provided, otherwise fall back to onLoadVersion
  const handleRestore = onRestoreVersion || onLoadVersion;

  return (
    <div className="governance-view">
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Governance</h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          Manage version history and restore previous model configurations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {/* Version History Table */}
        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Version History</h2>
          
          {versions.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}>
              <p style={{ fontStyle: 'italic', margin: 0 }}>
                No saved versions yet. Use "Save" in the header to create a snapshot.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}>
                <thead>
                  <tr style={{
                    borderBottom: '2px solid var(--border-color, #e0e0e0)',
                  }}>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Date
                    </th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Name
                    </th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {versions
                    .sort((a, b) => b.lastModified - a.lastModified)
                    .map((version) => (
                      <tr
                        key={version.id}
                        style={{
                          borderBottom: '1px solid var(--border-color, #e0e0e0)',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--background-secondary, #f9f9f9)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{
                          padding: '1rem',
                          color: 'var(--text-secondary)',
                          fontSize: '0.875rem',
                        }}>
                          {new Date(version.lastModified).toLocaleString()}
                        </td>
                        <td style={{
                          padding: '1rem',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                        }}>
                          {version.name}
                        </td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'right',
                        }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleRestore(version)}
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                            }}
                            title="Restore this version"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alternative: Use VersionHistory component if preferred */}
        {/* <VersionHistory
          scenarioId={versions[0]?.scenarioId || 'current'}
          onLoad={onLoadVersion}
          onCompare={(version) => {
            // Compare functionality can be implemented later
            console.log('Compare version:', version);
          }}
        /> */}
      </div>
    </div>
  );
}

