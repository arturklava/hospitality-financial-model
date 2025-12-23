import type { OperationConfig, OperationType } from '../../domain/types';
import { getOperationIcon } from '../operations/OperationList';

interface OperationMultiSelectProps {
  operations: OperationConfig[];
  selectedOperationIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

/**
 * Get color for operation type badge
 */
function getOperationTypeColor(operationType: OperationType): string {
  const colorMap: Record<OperationType, string> = {
    HOTEL: '#2563EB',           // Blue
    VILLAS: '#8B5CF6',          // Violet
    RESTAURANT: '#F59E0B',      // Amber
    BEACH_CLUB: '#14B8A6',      // Teal
    RACQUET: '#6366F1',         // Indigo
    RETAIL: '#10B981',          // Emerald
    FLEX: '#F43F5E',            // Rose
    WELLNESS: '#EC4899',        // Pink
    SENIOR_LIVING: '#0EA5E9',   // Sky
  };
  return colorMap[operationType] || '#64748B';
}

/**
 * Get label for operation type
 */
function getOperationTypeLabel(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function OperationMultiSelect({
  operations,
  selectedOperationIds,
  onSelectionChange,
}: OperationMultiSelectProps) {
  const handleToggle = (operationId: string) => {
    const newSelection = new Set(selectedOperationIds);
    if (newSelection.has(operationId)) {
      newSelection.delete(operationId);
    } else {
      newSelection.add(operationId);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const newSelection = new Set(operations.map(op => op.id));
    onSelectionChange(newSelection);
  };

  const handleDeselectAll = () => {
    onSelectionChange(new Set());
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          Filter Operations
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleSelectAll}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--primary)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'calc(var(--radius) * 0.75)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'calc(var(--radius) * 0.75)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Deselect All
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {operations.map((operation) => {
          const Icon = getOperationIcon(operation.operationType);
          const isSelected = selectedOperationIds.has(operation.id);
          const color = getOperationTypeColor(operation.operationType);

          return (
            <label
              key={operation.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: 'calc(var(--radius) * 0.75)',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                backgroundColor: isSelected ? 'var(--surface-hover)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(operation.id)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: 'var(--primary)',
                }}
              />
              <Icon
                size={20}
                style={{
                  color: isSelected ? color : 'var(--text-secondary)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: '0.9375rem',
                  color: 'var(--text-primary)',
                  fontWeight: isSelected ? 500 : 400,
                }}
              >
                {operation.name}
              </span>
              <span
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: color,
                  color: 'white',
                  borderRadius: '0.25rem',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.025em',
                }}
              >
                {getOperationTypeLabel(operation.operationType)}
              </span>
            </label>
          );
        })}
      </div>

      {operations.length === 0 && (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
          }}
        >
          No operations available
        </div>
      )}
    </div>
  );
}

