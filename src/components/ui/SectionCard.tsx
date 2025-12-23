import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SectionCardProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export function SectionCard({
  title,
  children,
  defaultExpanded = true,
  className = '',
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`card ${className}`} style={{
      marginBottom: '1.5rem',
      padding: 0,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: isExpanded ? '1px solid var(--border-soft)' : 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <h2 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--text-strong)',
          fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
        }}>
          {title}
        </h2>
        {isExpanded ? (
          <ChevronUp size={20} style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />
        )}
      </button>
      {isExpanded && (
        <div style={{ padding: '1.5rem' }}>
          {children}
        </div>
      )}
    </div>
  );
}

