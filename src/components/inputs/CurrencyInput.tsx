import { useState, useEffect, type InputHTMLAttributes } from 'react';
import { formatCurrency } from '../../utils/formatters';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

export function CurrencyInput({
  value,
  onChange,
  label,
  ...inputProps
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number when focused for easier editing
    setDisplayValue(value.toString());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/[^0-9.-]/g, ''); // Remove non-numeric except . and -
    setDisplayValue(inputValue);

    // Allow empty input while typing
    if (inputValue === '' || inputValue === '-') {
      return;
    }

    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numValue = parseFloat(displayValue);
    if (isNaN(numValue)) {
      // Empty field or invalid: default to 0 (allow zeroing out)
      setDisplayValue(formatCurrency(0));
      onChange(0);
    } else if (numValue < 0) {
      // Negative values not allowed: reset to previous
      setDisplayValue(formatCurrency(value));
      onChange(value);
    } else {
      setDisplayValue(formatCurrency(numValue));
      onChange(numValue);
    }
  };

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
          ...inputProps.style,
        }}
      />
    </div>
  );
}

