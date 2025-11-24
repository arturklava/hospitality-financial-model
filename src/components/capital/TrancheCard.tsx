import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { DebtTrancheConfig, CapitalStructureConfig } from '../../domain/types';
import { CurrencyInput } from '../inputs/CurrencyInput';
import { PercentageInput } from '../inputs/PercentageInput';
import { ToggleGroup } from '../inputs/ToggleGroup';

interface TrancheCardProps {
  tranche: DebtTrancheConfig;
  capitalConfig: CapitalStructureConfig;
  onUpdate: (updates: Partial<DebtTrancheConfig>) => void;
  onDelete: () => void;
}

export function TrancheCard({ tranche, capitalConfig, onUpdate, onDelete }: TrancheCardProps) {
  const [isFocused, setIsFocused] = useState(false);

  const principal = tranche.initialPrincipal ?? tranche.amount ?? 0;
  const trancheLtv = capitalConfig.initialInvestment > 0
    ? (principal / capitalConfig.initialInvestment) * 100
    : 0;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ label: e.target.value });
  };

  const handleAmountChange = (value: number) => {
    onUpdate({
      initialPrincipal: value,
      amount: value, // Backward compatibility
    });
  };

  const handleInterestRateChange = (value: number) => {
    onUpdate({ interestRate: value });
  };

  const handleTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const termYears = parseInt(e.target.value) || 0;
    onUpdate({ termYears });
  };

  const handleAmortizationChange = (value: string) => {
    onUpdate({
      amortizationType: value as 'interest_only' | 'mortgage' | 'bullet',
    });
  };

  const handleIoYearsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ioYears = parseInt(e.target.value) || 0;
    onUpdate({ ioYears });
  };

  const amortizationOptions = [
    { value: 'interest_only', label: 'Interest Only' },
    { value: 'mortgage', label: 'Mortgage' },
    { value: 'bullet', label: 'Bullet' },
  ];

  return (
    <div
      className="card"
      style={{
        padding: '1.5rem',
        border: `2px solid ${isFocused ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: isFocused ? '0 0 0 3px rgba(33, 150, 243, 0.1)' : 'none',
        backgroundColor: 'var(--surface)',
      }}
      onFocusCapture={(e) => {
        if (e.target === e.currentTarget || e.currentTarget.contains(e.target as Node)) {
          setIsFocused(true);
        }
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
    >
      {/* Header: Name + Delete */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}>
        <input
          type="text"
          value={tranche.label ?? tranche.id}
          onChange={handleNameChange}
          placeholder="Tranche name"
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            border: 'none',
            backgroundColor: 'transparent',
            padding: '0.25rem 0',
            flex: 1,
            outline: 'none',
          }}
        />
        <button
          onClick={onDelete}
          style={{
            padding: '0.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s, background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--danger)';
            e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Delete tranche"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Row 1: Amount Input + LTV Badge */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-end',
        marginBottom: '1.5rem',
      }}>
        <div style={{ flex: 1 }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
          }}>
            Amount
          </label>
          <CurrencyInput
            value={principal}
            onChange={handleAmountChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: '1rem',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div style={{
          padding: '0.5rem 1rem',
          backgroundColor: trancheLtv > 65 ? '#FFF3E0' : '#E8F5E9',
          border: `1px solid ${trancheLtv > 65 ? '#FF9800' : '#4CAF50'}`,
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: trancheLtv > 65 ? '#E65100' : '#2E7D32',
          whiteSpace: 'nowrap',
        }}>
          LTV: {trancheLtv.toFixed(1)}%
        </div>
      </div>

      {/* Row 2: Interest Rate (Slider + Input combo) */}
      <div style={{
        marginBottom: '1.5rem',
      }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem',
        }}>
          Interest Rate
        </label>
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
        }}>
          <input
            type="range"
            min="0"
            max="20"
            step="0.1"
            value={tranche.interestRate * 100}
            onChange={(e) => handleInterestRateChange(parseFloat(e.target.value) / 100)}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              backgroundColor: 'var(--border)',
              outline: 'none',
            }}
          />
          <div style={{ width: '120px' }}>
            <PercentageInput
              value={tranche.interestRate}
              onChange={handleInterestRateChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '1rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Row 3: Term & Amortization (Toggle Group) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginBottom: tranche.amortizationType === 'interest_only' ? '1rem' : '0',
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
          }}>
            Term (years)
          </label>
          <input
            type="number"
            value={tranche.termYears}
            onChange={handleTermChange}
            min="1"
            max="50"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: '1rem',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div>
          <ToggleGroup
            options={amortizationOptions}
            value={tranche.amortizationType ?? 'mortgage'}
            onChange={handleAmortizationChange}
            label="Amortization"
          />
        </div>
      </div>

      {/* IO Years (conditional) */}
      {tranche.amortizationType === 'interest_only' && (
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
          }}>
            IO Years
          </label>
          <input
            type="number"
            value={tranche.ioYears ?? tranche.termYears}
            onChange={handleIoYearsChange}
            min="0"
            max={tranche.termYears}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: '1rem',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      )}
    </div>
  );
}

