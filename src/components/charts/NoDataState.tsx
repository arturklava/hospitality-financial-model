/**
 * NoDataState component (v3.2).
 * 
 * Reusable fallback state for charts when data is empty or invalid.
 * Prevents layout collapse by maintaining explicit height.
 */

interface NoDataStateProps {
  height?: number;
  message?: string;
  description?: string;
}

export function NoDataState({ 
  height = 400, 
  message = 'No Data Available',
  description 
}: NoDataStateProps) {
  return (
    <div style={{
      width: '100%',
      height: `${height}px`,
      minHeight: `${height}px`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      color: 'var(--text-secondary)',
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius)',
      backgroundColor: 'var(--surface)',
    }}>
      <p style={{ 
        fontSize: '1rem', 
        fontWeight: 500, 
        marginBottom: description ? '0.5rem' : 0,
        color: 'var(--text-primary)',
      }}>
        {message}
      </p>
      {description && (
        <p style={{ 
          fontSize: '0.875rem', 
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}>
          {description}
        </p>
      )}
    </div>
  );
}

