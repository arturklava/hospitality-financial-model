interface PercentageSliderProps {
  value: number; // 0-1 range
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

/**
 * PercentageSlider component.
 * 
 * Displays a range slider and number input side-by-side for percentage values.
 * Value is stored as decimal (0-1), but displayed as percentage (0-100%).
 */
export function PercentageSlider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
}: PercentageSliderProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      return;
    }
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      // Convert percentage to decimal
      const decimalValue = numValue / 100;
      // Clamp to min/max
      const clampedValue = Math.max(min, Math.min(max, decimalValue));
      onChange(clampedValue);
    }
  };

  const handleNumberBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseFloat(e.target.value);
    if (isNaN(numValue)) {
      // Reset to current value if invalid
      e.target.value = (value * 100).toFixed(2);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {label && (
        <label style={{
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
        }}>
          {label}
        </label>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          style={{
            flex: 1,
            height: '6px',
            borderRadius: '3px',
            background: 'var(--border-soft)',
            outline: 'none',
            accentColor: 'var(--primary)',
          }}
        />
        <input
          type="number"
          min={min * 100}
          max={max * 100}
          step={step * 100}
          value={(value * 100).toFixed(2)}
          onChange={handleNumberChange}
          onBlur={handleNumberBlur}
          style={{
            width: '80px',
            padding: '0.5rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
        <span style={{
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          minWidth: '20px',
        }}>
          %
        </span>
      </div>
    </div>
  );
}

