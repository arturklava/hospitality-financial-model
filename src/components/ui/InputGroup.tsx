import type { ReactNode } from 'react';
import { cloneElement, isValidElement, useId } from 'react';

interface InputGroupProps {
  label?: string | ReactNode;
  helperText?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  gridColumn?: string;
  id?: string;
}

export function InputGroup({
  label,
  helperText,
  error,
  required,
  children,
  className = '',
  gridColumn,
  id,
}: InputGroupProps) {
  const generatedId = useId();
  const inputId = id || (label ? generatedId : undefined);
  const helperId = helperText && !error ? `${inputId || generatedId}-helper` : undefined;
  const errorId = error ? `${inputId || generatedId}-error` : undefined;
  const describedBy = error ? errorId : helperId;

  // Clone child element to add id if it's a React element
  const childWithId = isValidElement(children)
    ? cloneElement(children, {
        ...(inputId ? { id: inputId } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(error ? { 'aria-invalid': true } : {}),
      } as any)
    : children;

  return (
    <div
      className={`form-group ${className}`}
      style={gridColumn ? { gridColumn } : undefined}
    >
      {label && (
        <label 
          className="form-label" 
          htmlFor={typeof label === 'string' ? inputId : undefined}
          style={{ 
            marginBottom: '0.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem',
            fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      {childWithId}
      {helperText && !error && (
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginTop: '0.25rem',
          fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
        }}
        id={helperId}
      >
        {helperText}
      </div>
      )}
      {error && (
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--danger)',
          marginTop: '0.25rem',
          fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
        }}
        role="alert"
        aria-live="assertive"
        id={errorId}
      >
        {error}
      </div>
      )}
    </div>
  );
}

