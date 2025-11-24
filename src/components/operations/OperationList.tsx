import { useState } from 'react';
import type { OperationConfig, OwnershipModel } from '../../domain/types';
import { Building2, Hotel, Home, UtensilsCrossed, Waves, Trophy, ShoppingBag, Boxes, Heart, Users } from 'lucide-react';
import { SortableList } from '../common/SortableList';

interface OperationListProps {
  operations: OperationConfig[];
  selectedOperationId: string | null;
  onSelectOperation: (operationId: string) => void;
  onAddAsset?: (operationType?: string) => void;
  onReorder?: (operations: OperationConfig[]) => void;
}

export const getOperationIcon = (operationType: string) => {
  switch (operationType) {
    case 'HOTEL':
      return Hotel;
    case 'VILLAS':
      return Home;
    case 'RESTAURANT':
      return UtensilsCrossed;
    case 'BEACH_CLUB':
      return Waves;
    case 'RACQUET':
      return Trophy;
    case 'RETAIL':
      return ShoppingBag;
    case 'FLEX':
      return Boxes;
    case 'WELLNESS':
      return Heart;
    case 'SENIOR_LIVING':
      return Users;
    default:
      return Building2;
  }
};

const getOperationTypeLabel = (type: string): string => {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const getOwnershipModelLabel = (model?: OwnershipModel): string => {
  if (!model || model === 'BUILD_AND_OPERATE') return 'Operate';
  if (model === 'BUILD_AND_LEASE_FIXED') return 'Lease (Fixed)';
  if (model === 'BUILD_AND_LEASE_VARIABLE') return 'Lease (Variable)';
  if (model === 'CO_INVEST_OPCO') return 'Co-Invest';
  return 'Operate';
};

export function OperationList({
  operations,
  selectedOperationId,
  onSelectOperation,
  onAddAsset,
  onReorder,
}: OperationListProps) {
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const operationTypes: Array<{ value: string; label: string }> = [
    { value: 'HOTEL', label: 'Hotel' },
    { value: 'VILLAS', label: 'Villas' },
    { value: 'RESTAURANT', label: 'Restaurant' },
    { value: 'BEACH_CLUB', label: 'Beach Club' },
    { value: 'RACQUET', label: 'Racquet' },
    { value: 'RETAIL', label: 'Retail' },
    { value: 'FLEX', label: 'Flex' },
    { value: 'WELLNESS', label: 'Wellness' },
    { value: 'SENIOR_LIVING', label: 'Senior Living' },
  ];

  return (
    <div
      style={{
        width: '320px',
        borderRight: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '1rem',
          }}
        >
          Assets
        </h2>
        {onAddAsset && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <span>+</span>
              <span>Add Asset</span>
            </button>
            {showAddDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.5rem',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  zIndex: 100,
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}
              >
                {operationTypes.map((type) => {
                  const Icon = getOperationIcon(type.value);
                  return (
                    <button
                      key={type.value}
                      onClick={() => {
                        onAddAsset(type.value);
                        setShowAddDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Icon size={18} style={{ color: 'var(--text-secondary)' }} />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operations List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.5rem',
        }}
      >
        {operations.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            No assets configured
          </div>
        ) : onReorder ? (
          <SortableList
            items={operations}
            onReorder={onReorder}
            getItemId={(op) => op.id}
          >
            {(op, isDragging) => {
              const Icon = getOperationIcon(op.operationType);
              const isSelected = op.id === selectedOperationId;
              const isActive = op.isActive !== false; // Default to true if not set

              return (
                <div
                  onClick={() => onSelectOperation(op.id)}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    backgroundColor: isSelected ? 'var(--primary)' : 'var(--surface)',
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: isSelected ? 'white' : 'var(--text-primary)',
                    pointerEvents: isDragging ? 'none' : 'auto',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDragging) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isDragging) {
                      e.currentTarget.style.backgroundColor = 'var(--surface)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <Icon
                      size={24}
                      style={{
                        color: isSelected ? 'white' : 'var(--primary)',
                        flexShrink: 0,
                        marginTop: '0.125rem',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.25rem',
                        }}
                      >
                        {/* Active Status Dot */}
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isActive
                              ? isSelected
                                ? 'rgba(255, 255, 255, 0.9)'
                                : 'var(--success)'
                              : isSelected
                              ? 'rgba(255, 255, 255, 0.4)'
                              : 'var(--text-muted)',
                            flexShrink: 0,
                            boxShadow: isActive && !isSelected
                              ? '0 0 0 2px rgba(76, 175, 80, 0.2)'
                              : 'none',
                          }}
                          title={isActive ? 'Active' : 'Inactive'}
                        />
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9375rem',
                            color: isSelected ? 'white' : 'var(--text-primary)',
                          }}
                        >
                          {op.name}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        {getOperationTypeLabel(op.operationType)}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: isSelected
                              ? 'rgba(255, 255, 255, 0.2)'
                              : isActive
                              ? 'var(--success)'
                              : 'var(--text-secondary)',
                            color: isSelected ? 'white' : 'white',
                            borderRadius: '0.25rem',
                            fontSize: '0.6875rem',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                          }}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: isSelected
                              ? 'rgba(255, 255, 255, 0.2)'
                              : 'var(--surface-hover)',
                            color: isSelected ? 'white' : 'var(--text-primary)',
                            borderRadius: '0.25rem',
                            fontSize: '0.6875rem',
                            fontWeight: 500,
                          }}
                        >
                          {getOwnershipModelLabel(op.ownershipModel)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          </SortableList>
        ) : (
          operations.map((op) => {
            const Icon = getOperationIcon(op.operationType);
            const isSelected = op.id === selectedOperationId;
            const isActive = op.isActive !== false; // Default to true if not set

            return (
              <div
                key={op.id}
                onClick={() => onSelectOperation(op.id)}
                style={{
                  padding: '1rem',
                  marginBottom: '0.5rem',
                  backgroundColor: isSelected ? 'var(--primary)' : 'var(--surface)',
                  border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: isSelected ? 'white' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <Icon
                    size={24}
                    style={{
                      color: isSelected ? 'white' : 'var(--primary)',
                      flexShrink: 0,
                      marginTop: '0.125rem',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {/* Active Status Dot */}
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: isActive
                            ? isSelected
                              ? 'rgba(255, 255, 255, 0.9)'
                              : 'var(--success)'
                            : isSelected
                            ? 'rgba(255, 255, 255, 0.4)'
                            : 'var(--text-muted)',
                          flexShrink: 0,
                          boxShadow: isActive && !isSelected
                            ? '0 0 0 2px rgba(76, 175, 80, 0.2)'
                            : 'none',
                        }}
                        title={isActive ? 'Active' : 'Inactive'}
                      />
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.9375rem',
                          color: isSelected ? 'white' : 'var(--text-primary)',
                        }}
                      >
                        {op.name}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {getOperationTypeLabel(op.operationType)}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: isSelected
                            ? 'rgba(255, 255, 255, 0.2)'
                            : isActive
                            ? 'var(--success)'
                            : 'var(--text-secondary)',
                          color: isSelected ? 'white' : 'white',
                          borderRadius: '0.25rem',
                          fontSize: '0.6875rem',
                          fontWeight: 500,
                          textTransform: 'uppercase',
                        }}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: isSelected
                            ? 'rgba(255, 255, 255, 0.2)'
                            : 'var(--surface-hover)',
                          color: isSelected ? 'white' : 'var(--text-primary)',
                          borderRadius: '0.25rem',
                          fontSize: '0.6875rem',
                          fontWeight: 500,
                        }}
                      >
                        {getOwnershipModelLabel(op.ownershipModel)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

