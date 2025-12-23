/**
 * Progress Bar Component
 * 
 * Simple styled progress bar for displaying simulation progress.
 */

interface ProgressBarProps {
  /** Progress value (0-100) */
  value: number;
  /** Optional className for custom styling */
  className?: string;
  /** Optional aria-label for accessibility */
  'aria-label'?: string;
}

/**
 * Progress bar component displaying a blue progress indicator.
 * 
 * @param value - Progress percentage (0-100)
 * @param className - Optional CSS class name
 * @param aria-label - Optional accessibility label
 * 
 * @example
 * ```tsx
 * <ProgressBar value={75} aria-label="Simulation progress" />
 * ```
 */
export function ProgressBar({ value, className, 'aria-label': ariaLabel }: ProgressBarProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));
  
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '8px',
        backgroundColor: 'var(--border-color, #e0e0e0)',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative',
      }}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel || 'Progress'}
    >
      <div
        style={{
          width: `${clampedValue}%`,
          height: '100%',
          backgroundColor: '#007bff', // Blue color
          borderRadius: '4px',
          transition: 'width 0.2s ease-out',
        }}
      />
    </div>
  );
}

