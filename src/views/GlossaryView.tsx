/**
 * Glossary View (v5.9: Knowledge Views)
 * 
 * Displays the financial glossary in a searchable table format.
 * Provides definitions, explanations, and calculation formulas for key financial terms.
 */

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { FINANCIAL_GLOSSARY, type FinancialTerm } from '../domain/glossary';

export function GlossaryView() {
  const [searchQuery, setSearchQuery] = useState('');

  // Convert glossary object to array and filter by search query
  const filteredTerms = useMemo(() => {
    const terms = Object.values(FINANCIAL_GLOSSARY);
    
    if (!searchQuery.trim()) {
      return terms;
    }

    const query = searchQuery.toLowerCase().trim();
    return terms.filter((term) => {
      const acronym = term.acronym?.toLowerCase() || '';
      const meaning = term.meaning?.toLowerCase() || '';
      const explanation = term.explanation?.toLowerCase() || '';
      const calculation = term.calculation?.toLowerCase() || '';
      
      return (
        acronym.includes(query) ||
        meaning.includes(query) ||
        explanation.includes(query) ||
        calculation.includes(query)
      );
    });
  }, [searchQuery]);

  return (
    <div className="glossary-view" style={{ padding: '2rem' }}>
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: 'var(--font-h1, 2.25rem)', 
          fontWeight: 700, 
          fontFamily: 'var(--font-heading, "Josefin Sans", sans-serif)',
          color: 'var(--text-primary, #1e293b)',
          margin: 0,
          marginBottom: '0.5rem',
        }}>
          Financial Glossary
        </h1>
        <p style={{ 
          fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
          color: 'var(--text-secondary, #64748b)',
          fontSize: 'var(--font-body-size, 1rem)',
          margin: 0,
        }}>
          Comprehensive definitions and calculations for key financial terms.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          position: 'relative',
          maxWidth: '500px',
        }}>
          <Search 
            size={20} 
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary, #64748b)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search terms, definitions, or calculations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              fontSize: 'var(--font-body-size, 1rem)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 'var(--radius, 8px)',
              backgroundColor: 'var(--surface, #ffffff)',
              color: 'var(--text-primary, #1e293b)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary, #2196F3)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <div style={{ 
          fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
          marginBottom: '1rem',
          color: 'var(--text-secondary, #64748b)',
          fontSize: 'var(--font-body-small, 0.875rem)',
        }}>
          Found {filteredTerms.length} {filteredTerms.length === 1 ? 'term' : 'terms'}
        </div>
      )}

      {/* Glossary Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <DataTable striped hover>
          <thead>
            <tr>
              <th style={{ 
                width: '120px',
                fontFamily: 'var(--font-heading, "Josefin Sans", sans-serif)',
                fontWeight: 600,
              }}>Acronym</th>
              <th style={{ 
                width: '200px',
                fontFamily: 'var(--font-heading, "Josefin Sans", sans-serif)',
                fontWeight: 600,
              }}>Name</th>
              <th style={{ 
                fontFamily: 'var(--font-heading, "Josefin Sans", sans-serif)',
                fontWeight: 600,
              }}>Meaning</th>
              <th style={{ 
                width: '300px',
                fontFamily: 'var(--font-heading, "Josefin Sans", sans-serif)',
                fontWeight: 600,
              }}>Calculation</th>
            </tr>
          </thead>
          <tbody>
            {filteredTerms.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ 
                  fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  textAlign: 'center', 
                  padding: '2rem',
                  color: 'var(--text-secondary, #64748b)',
                  fontStyle: 'italic',
                }}>
                  No terms found matching "{searchQuery}"
                </td>
              </tr>
            ) : (
              filteredTerms.map((term) => (
                <GlossaryRow key={term.acronym || term.term} term={term} />
              ))
            )}
          </tbody>
        </DataTable>
      </div>
    </div>
  );
}

interface GlossaryRowProps {
  term: FinancialTerm;
}

function GlossaryRow({ term }: GlossaryRowProps) {
  return (
    <tr>
      {/* Acronym (Bold) */}
      <td>
        <strong style={{ 
          fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
          fontWeight: 600,
          color: 'var(--text-primary, #1e293b)',
        }}>
          {term.acronym || term.term}
        </strong>
      </td>
      
      {/* Name */}
      <td style={{ 
        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
        color: 'var(--text-primary, #1e293b)',
      }}>
        {term.meaning || term.fullName || '—'}
      </td>
      
      {/* Meaning (Wide) */}
      <td style={{ 
        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
        color: 'var(--text-primary, #1e293b)',
        lineHeight: '1.5',
      }}>
        {term.explanation || term.definition || '—'}
      </td>
      
      {/* Calculation (Code style) */}
      <td>
        {term.calculation ? (
          <code style={{
            display: 'block',
            fontFamily: 'var(--font-mono, "Space Grotesk", monospace)',
            fontSize: 'var(--font-body-small, 0.875rem)',
            backgroundColor: 'var(--surface-hover, #f1f5f9)',
            padding: '0.5rem 0.75rem',
            borderRadius: '4px',
            color: 'var(--text-primary, #1e293b)',
            border: '1px solid var(--border, #e2e8f0)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {term.calculation}
          </code>
        ) : (
          <span style={{ 
            fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            color: 'var(--text-secondary, #64748b)',
            fontStyle: 'italic',
          }}>
            —
          </span>
        )}
      </td>
    </tr>
  );
}

