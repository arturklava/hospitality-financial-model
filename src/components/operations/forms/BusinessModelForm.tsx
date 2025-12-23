import type { OperationConfig, OwnershipModel } from '../../../domain/types';
import { InputGroup } from '../../ui/InputGroup';
import { CurrencyInput } from '../../inputs/CurrencyInput';
import { PercentageInput } from '../../inputs/PercentageInput';

interface BusinessModelFormProps {
  operation: OperationConfig;
  onChange: (updates: Partial<OperationConfig>) => void;
}

export function BusinessModelForm({ operation, onChange }: BusinessModelFormProps) {
  const ownershipModel = operation.ownershipModel || 'BUILD_AND_OPERATE';
  const ownershipPct = operation.ownershipPct ?? 1.0;
  const leaseTerms = operation.leaseTerms || { baseRent: 0 };
  const isREaaS = operation.isREaaS ?? false;

  const handleOwnershipModelChange = (model: OwnershipModel) => {
    const updates: Partial<OperationConfig> = {
      ownershipModel: model,
    };

    // Initialize lease terms if switching to lease model
    if (model === 'BUILD_AND_LEASE_FIXED' || model === 'BUILD_AND_LEASE_VARIABLE') {
      if (!operation.leaseTerms) {
        updates.leaseTerms = {
          baseRent: 0,
          ...(model === 'BUILD_AND_LEASE_VARIABLE'
            ? { variableRentPct: 0, variableRentBasis: 'revenue' }
            : {}),
        };
      }
    }

    onChange(updates);
  };

  const handleOwnershipPctChange = (value: number) => {
    onChange({ ownershipPct: Math.max(0, Math.min(1, value)) });
  };

  const handleBaseRentChange = (value: number) => {
    onChange({
      leaseTerms: {
        ...leaseTerms,
        baseRent: Math.max(0, value),
      },
    });
  };

  const handleVariableRentPctChange = (value: number) => {
    onChange({
      leaseTerms: {
        ...leaseTerms,
        variableRentPct: Math.max(0, Math.min(1, value)),
      },
    });
  };

  const handleVariableRentBasisChange = (basis: 'revenue' | 'noi') => {
    onChange({
      leaseTerms: {
        ...leaseTerms,
        variableRentBasis: basis,
      },
    });
  };

  const handleIsREaaSChange = (checked: boolean) => {
    onChange({ isREaaS: checked });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Business Model Section */}
      <div>
        <h3
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          Business Model
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Business Model Dropdown */}
          <InputGroup label="Business Model" required>
            <select
              value={ownershipModel}
              onChange={(e) => handleOwnershipModelChange(e.target.value as OwnershipModel)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <option value="BUILD_AND_OPERATE">Build & Operate</option>
              <option value="BUILD_AND_LEASE_FIXED">Build & Lease (Fixed)</option>
              <option value="BUILD_AND_LEASE_VARIABLE">Build & Lease (Variable)</option>
              <option value="CO_INVEST_OPCO">Co-Invest OpCo</option>
            </select>
          </InputGroup>

          {/* Ownership % - Shown for BUILD_AND_OPERATE and CO_INVEST_OPCO */}
          {(ownershipModel === 'BUILD_AND_OPERATE' || ownershipModel === 'CO_INVEST_OPCO') && (
            <InputGroup
              label="Ownership %"
              helperText="Equity stake in OpCo/PropCo (0-100%)"
              required
            >
              <PercentageInput
                value={ownershipPct}
                onChange={handleOwnershipPctChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.9375rem',
                }}
              />
            </InputGroup>
          )}

          {/* Base Rent - Shown for lease models */}
          {(ownershipModel === 'BUILD_AND_LEASE_FIXED' ||
            ownershipModel === 'BUILD_AND_LEASE_VARIABLE') && (
            <InputGroup
              label="Base Rent"
              helperText="Annual base rent amount"
              required
            >
              <CurrencyInput
                value={leaseTerms.baseRent}
                onChange={handleBaseRentChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.9375rem',
                }}
              />
            </InputGroup>
          )}

          {/* Variable Rent Fields - Shown only for BUILD_AND_LEASE_VARIABLE */}
          {ownershipModel === 'BUILD_AND_LEASE_VARIABLE' && (
            <>
              <InputGroup
                label="Variable Rent %"
                helperText="Percentage of revenue or NOI (0-100%)"
              >
                <PercentageInput
                  value={leaseTerms.variableRentPct ?? 0}
                  onChange={handleVariableRentPctChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.9375rem',
                  }}
                />
              </InputGroup>

              <InputGroup
                label="Variable Rent Basis"
                helperText="Basis for calculating variable rent"
              >
                <select
                  value={leaseTerms.variableRentBasis || 'revenue'}
                  onChange={(e) =>
                    handleVariableRentBasisChange(e.target.value as 'revenue' | 'noi')
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.9375rem',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="revenue">Revenue</option>
                  <option value="noi">NOI</option>
                </select>
              </InputGroup>
            </>
          )}

          {/* REaaS Toggle */}
          <InputGroup label="Real Estate as a Service">
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={isREaaS}
                onChange={(e) => handleIsREaaSChange(e.target.checked)}
                style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                Is REaaS?
              </span>
            </label>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginTop: '0.25rem',
              }}
            >
              Flag for future analytics and reporting
            </div>
          </InputGroup>
        </div>
      </div>
    </div>
  );
}
