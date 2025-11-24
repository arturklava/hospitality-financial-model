import { CurrencyInput } from '../inputs/CurrencyInput';
import { InputGroup } from '../ui/InputGroup';

interface EquityInputProps {
  value: number;
  onChange: (value: number) => void;
  totalInvestment: number;
  disabled?: boolean;
}

export function EquityInput({
  value,
  onChange,
  totalInvestment,
  disabled = false,
}: EquityInputProps) {
  const equityPercentage = totalInvestment > 0
    ? (value / totalInvestment) * 100
    : 0;

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <h2 style={{
        margin: 0,
        marginBottom: '1rem',
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
      }}>
        Equity
      </h2>
      <InputGroup
        label="Equity Amount"
        helperText={`${equityPercentage.toFixed(1)}% of total investment`}
      >
        <CurrencyInput
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '1rem',
            backgroundColor: disabled ? 'var(--surface-hover)' : 'var(--surface)',
            color: 'var(--text-primary)',
          }}
        />
      </InputGroup>
    </div>
  );
}

