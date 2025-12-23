interface PercentageSliderProps {
  value: number; // 0-1 range
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Dynamic maximum based on other fields (overrides max if lower) */
  dynamicMax?: number;
  /** Threshold above which to show warning styling (decimal, e.g., 0.8) */
  warnThreshold?: number;
  /** External warning state (from useMixValidation) */
  isWarning?: boolean;
  step?: number;
  label?: string;
  disabled?: boolean;
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
  dynamicMax,
  warnThreshold,
  isWarning: externalWarning,
  step = 0.01,
  label,
  disabled,
}: PercentageSliderProps) {
  // Effective max is the minimum of max and dynamicMax
  const effectiveMax = dynamicMax !== undefined ? Math.min(max, dynamicMax) : max;

  // Determine if showing warning (external or threshold-based)
  const showWarning = externalWarning ||
    (warnThreshold !== undefined && value > warnThreshold);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      // Clamp to effective max
      const clampedValue = Math.min(newValue, effectiveMax);
      onChange(clampedValue);
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
      // Clamp to min/effectiveMax
      const clampedValue = Math.max(min, Math.min(effectiveMax, decimalValue));
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

  // Warning border style
  const warningBorderStyle = showWarning
    ? { borderColor: 'var(--warning, #f59e0b)', boxShadow: '0 0 0 1px var(--warning, #f59e0b)' }
    : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {label && (
        <label style={{
          fontSize: '0.875rem',
          fontWeight: 500,
          color: showWarning ? 'var(--warning, #f59e0b)' : 'var(--text-secondary)',
        }}>
          {label}
          {showWarning && <span style={{ marginLeft: '0.5rem' }}>⚠️</span>}
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
          max={effectiveMax}
          step={step}
          value={Math.min(value, effectiveMax)}
          onChange={handleSliderChange}
          disabled={disabled}
          style={{
            flex: 1,
            height: '6px',
            borderRadius: '3px',
            background: showWarning ? 'var(--warning, #f59e0b)' : 'var(--border-soft)',
            outline: 'none',
            accentColor: showWarning ? 'var(--warning, #f59e0b)' : 'var(--primary)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <input
          type="number"
          min={min * 100}
          max={effectiveMax * 100}
          step={step * 100}
          value={(value * 100).toFixed(2)}
          onChange={handleNumberChange}
          onBlur={handleNumberBlur}
          disabled={disabled}
          style={{
            width: '80px',
            padding: '0.5rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            cursor: disabled ? 'not-allowed' : 'text',
            opacity: disabled ? 0.5 : 1,
            ...warningBorderStyle,
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

