import { useState, useEffect, type InputHTMLAttributes } from 'react';

interface PercentageInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number; // Stored as decimal (e.g., 0.10 for 10%)
  onChange: (value: number) => void; // Returns decimal
  label?: string;
}

export function PercentageInput({
  value,
  onChange,
  label,
  ...inputProps
}: PercentageInputProps) {
  const [displayValue, setDisplayValue] = useState<string>((value * 100).toFixed(2));

  useEffect(() => {
    setDisplayValue((value * 100).toFixed(2));
  }, [value]);

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
      onChange(numValue / 100);
    }
  };

  const handleBlur = () => {
    // Ensure display value is valid on blur
    const numValue = parseFloat(displayValue);
    if (isNaN(numValue)) {
      setDisplayValue((value * 100).toFixed(2));
    } else {
      setDisplayValue(numValue.toFixed(2));
      onChange(numValue / 100);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        {...inputProps}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        style={{
          paddingRight: '2rem',
          ...inputProps.style,
        }}
      />
      <span style={{
        position: 'absolute',
        right: '0.75rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--text-secondary)',
        pointerEvents: 'none',
      }}>
        %
      </span>
    </div>
  );
}

