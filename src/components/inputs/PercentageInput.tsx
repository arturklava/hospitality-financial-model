import { useState, useEffect, type InputHTMLAttributes } from 'react';

interface PercentageInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number; // Stored as decimal (e.g., 0.10 for 10%)
  onChange: (value: number) => void; // Returns decimal
  label?: string;
  /** Hard maximum - values will be clamped to this on blur (decimal, e.g., 1.0 for 100%) */
  hardMax?: number;
  /** Warning threshold - show yellow border above this (decimal, e.g., 0.8 for 80%) */
  warnThreshold?: number;
}

export function PercentageInput({
  value,
  onChange,
  label,
  hardMax,
  warnThreshold,
  ...inputProps
}: PercentageInputProps) {
  const [displayValue, setDisplayValue] = useState<string>((value * 100).toFixed(2));
  const [isFocused, setIsFocused] = useState(false);

  // Determine if showing warning
  const showWarning = warnThreshold !== undefined && value > warnThreshold;

  useEffect(() => {
    // Only update display value from external changes when NOT focused
    if (!isFocused) {
      setDisplayValue((value * 100).toFixed(2));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Allow empty input while typing
    if (inputValue === '') {
      return;
    }

    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      // Convert percentage to decimal
      let decimalValue = numValue / 100;
      // Optionally clamp to hardMax during typing (soft enforcement)
      if (hardMax !== undefined && decimalValue > hardMax) {
        decimalValue = hardMax;
      }
      onChange(decimalValue);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Ensure display value is valid on blur
    const numValue = parseFloat(displayValue);
    if (isNaN(numValue)) {
      setDisplayValue((value * 100).toFixed(2));
    } else {
      let decimalValue = numValue / 100;
      // Hard clamp on blur
      if (hardMax !== undefined && decimalValue > hardMax) {
        decimalValue = hardMax;
      }
      setDisplayValue((decimalValue * 100).toFixed(2));
      onChange(decimalValue);
    }
  };

  // Warning border style
  const warningStyle = showWarning
    ? { borderColor: 'var(--warning, #f59e0b)', boxShadow: '0 0 0 1px var(--warning, #f59e0b)' }
    : {};

  return (
    <div style={{ position: 'relative' }}>
      <input
        {...inputProps}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          paddingRight: '2rem',
          ...inputProps.style,
          ...warningStyle,
        }}
      />
      <span style={{
        position: 'absolute',
        right: '0.75rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: showWarning ? 'var(--warning, #f59e0b)' : 'var(--text-secondary)',
        pointerEvents: 'none',
      }}>
        %
      </span>
    </div>
  );
}

