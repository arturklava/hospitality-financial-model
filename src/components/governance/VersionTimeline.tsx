/**
 * Version Timeline Component (v3.3: Workflow UI Components)
 *
 * Displays a vertical timeline of versions with dates on left, cards on right.
 * Includes preview/restore buttons for each version.
 */

import { ArrowRight, Clock } from 'lucide-react';
import type { SavedScenario } from '../../domain/types';

interface VersionTimelineProps {
  versions: SavedScenario[];
  currentVersionId?: string;
  onPreview?: (version: SavedScenario) => void;
  onRestore?: (version: SavedScenario) => void;
}

interface TimelineNodeProps {
  version: SavedScenario;
  isCurrent: boolean;
  isLast: boolean;
  onPreview?: () => void;
  onRestore?: () => void;
}

function TimelineNode({ version, isCurrent, isLast, onPreview, onRestore }: TimelineNodeProps) {
  const date = new Date(version.lastModified);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{
      display: 'flex',
      position: 'relative',
      marginBottom: isLast ? 0 : '2rem',
    }}>
      {/* Left: Date */}
      <div style={{
        width: '120px',
        paddingRight: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '0.25rem',
        }}>
          {formattedDate}
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}>
          <Clock size={12} />
          {formattedTime}
        </div>
      </div>

      {/* Center: Vertical Line & Node */}
      <div style={{
        width: '2px',
        backgroundColor: 'var(--border, #e0e0e0)',
        position: 'relative',
        marginRight: '1.5rem',
        marginTop: '0.5rem',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          left: '-6px',
          top: 0,
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: isCurrent ? 'var(--primary, #2196F3)' : 'var(--border, #e0e0e0)',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }} />
      </div>

      {/* Right: Card */}
      <div style={{
        flex: 1,
        padding: '1.25rem',
        backgroundColor: isCurrent ? 'var(--surface-active, rgba(33, 150, 243, 0.05))' : 'var(--surface, white)',
        border: `1px solid ${isCurrent ? 'var(--primary, #2196F3)' : 'var(--border, #e0e0e0)'}`,
        borderRadius: 'var(--radius, 8px)',
        boxShadow: isCurrent ? '0 2px 8px rgba(33, 150, 243, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        {/* Label */}
        <div style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
        }}>
          {version.name}
        </div>

        {/* Description */}
        {version.description && (
          <div style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            marginBottom: '1rem',
          }}>
            {version.description}
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginTop: '1rem',
        }}>
          {onPreview && (
            <button
              onClick={onPreview}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--background-secondary, #f0f0f0)',
                border: '1px solid var(--border, #e0e0e0)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-hover, #e0e0e0)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-secondary, #f0f0f0)';
              }}
            >
              Preview
            </button>
          )}
          {onRestore && !isCurrent && (
            <button
              onClick={onRestore}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--primary, #2196F3)',
                border: 'none',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary-hover, #1976D2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary, #2196F3)';
              }}
            >
              <ArrowRight size={16} />
              Restore
            </button>
          )}
          {isCurrent && (
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--success-light, rgba(76, 175, 80, 0.1))',
              borderRadius: 'var(--radius-sm, 4px)',
              color: 'var(--success, #4CAF50)',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              Current Version
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function VersionTimeline({
  versions,
  currentVersionId,
  onPreview,
  onRestore,
}: VersionTimelineProps) {
  // Sort versions by date (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.lastModified - a.lastModified);

  if (sortedVersions.length === 0) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}>
        <p style={{ fontStyle: 'italic', margin: 0 }}>
          No saved versions yet. Use "Save" to create a version snapshot.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      position: 'relative',
    }}>
      {sortedVersions.map((version, index) => (
        <TimelineNode
          key={version.id}
          version={version}
          isCurrent={version.id === currentVersionId}
          isLast={index === sortedVersions.length - 1}
          onPreview={onPreview ? () => onPreview(version) : undefined}
          onRestore={onRestore ? () => onRestore(version) : undefined}
        />
      ))}
    </div>
  );
}
