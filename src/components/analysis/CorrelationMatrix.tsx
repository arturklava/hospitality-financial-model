/**
 * Correlation Matrix Component (v2.1: Correlation UI)
 * 
 * Displays and allows editing of correlation matrix for Monte Carlo simulation.
 * Features:
 * - Grid table with variable names as headers
 * - Diagonal cells fixed at 1.0 (readonly)
 * - Mirror cells automatically update (A vs B updates B vs A)
 * - Color-coded cells (Blue for positive, Red for negative correlation)
 */

import { useState, useEffect } from 'react';
import type { SensitivityVariable } from '../../domain/types';

interface CorrelationMatrixProps {
  variables: SensitivityVariable[];
  matrix: number[][];
  onChange: (matrix: number[][]) => void;
}

/**
 * Get display label for a sensitivity variable.
 */
function getVariableLabel(variable: SensitivityVariable): string {
  switch (variable) {
    case 'occupancy':
      return 'Occupancy';
    case 'adr':
      return 'ADR';
    case 'interestRate':
      return 'Interest Rate';
    case 'discountRate':
      return 'Discount Rate';
    case 'exitCap':
      return 'Exit Cap Rate';
    case 'initialInvestment':
      return 'Initial Investment';
    case 'debtAmount':
      return 'Debt Amount';
    case 'terminalGrowthRate':
      return 'Terminal Growth Rate';
    default:
      return variable;
  }
}

/**
 * Get background color for a correlation value.
 * Blue for positive, Red for negative, with intensity based on absolute value.
 */
function getCellColor(value: number): string {
  const absValue = Math.abs(value);
  const intensity = Math.min(absValue, 1.0); // Clamp to [0, 1]
  
  if (value > 0) {
    // Blue gradient: light blue (0) to dark blue (1)
    const opacity = 0.2 + intensity * 0.5; // 0.2 to 0.7 opacity
    return `rgba(33, 150, 243, ${opacity})`; // Material Blue
  } else if (value < 0) {
    // Red gradient: light red (0) to dark red (1)
    const opacity = 0.2 + intensity * 0.5; // 0.2 to 0.7 opacity
    return `rgba(244, 67, 54, ${opacity})`; // Material Red
  } else {
    // Neutral gray for zero
    return 'rgba(0, 0, 0, 0.05)';
  }
}

/**
 * Clamp a value to the valid correlation range [-1, 1].
 */
function clampCorrelation(value: number): number {
  return Math.max(-1.0, Math.min(1.0, value));
}

export function CorrelationMatrix({ variables, matrix, onChange }: CorrelationMatrixProps) {
  const [localMatrix, setLocalMatrix] = useState<number[][]>(matrix);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  // Sync local matrix with prop changes
  useEffect(() => {
    setLocalMatrix(matrix);
  }, [matrix]);

  /**
   * Handle cell value change.
   * Updates both [i][j] and [j][i] to maintain symmetry.
   */
  const handleCellChange = (row: number, col: number, value: string) => {
    const numValue = parseFloat(value);
    
    // Validate input
    if (isNaN(numValue)) {
      // Allow empty input while typing
      if (value === '' || value === '-') {
        return;
      }
      setErrors(new Map(errors.set(`${row}-${col}`, 'Invalid number')));
      return;
    }

    const clampedValue = clampCorrelation(numValue);
    const newMatrix = localMatrix.map(row => [...row]);
    
    // Update both cells to maintain symmetry
    newMatrix[row][col] = clampedValue;
    if (row !== col) {
      newMatrix[col][row] = clampedValue;
    }
    
    // Clear error for this cell
    const newErrors = new Map(errors);
    newErrors.delete(`${row}-${col}`);
    setErrors(newErrors);
    
    setLocalMatrix(newMatrix);
    onChange(newMatrix);
  };

  /**
   * Handle cell blur - validate final value.
   */
  const handleCellBlur = (row: number, col: number) => {
    const value = localMatrix[row][col];
    const newErrors = new Map(errors);
    
    if (isNaN(value) || value < -1.0 || value > 1.0) {
      newErrors.set(`${row}-${col}`, 'Must be between -1.0 and 1.0');
    } else {
      newErrors.delete(`${row}-${col}`);
    }
    
    setErrors(newErrors);
  };

  return (
    <div className="correlation-matrix" style={{ marginTop: '1rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
        Correlation Matrix
      </h3>
      
      <div style={{ 
        overflowX: 'auto',
        border: '1px solid var(--border-color, #ddd)',
        borderRadius: '4px',
      }}>
        <table style={{ 
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'white',
        }}>
          <thead>
            <tr>
              <th style={{ 
                padding: '0.75rem',
                textAlign: 'left',
                fontWeight: 600,
                borderBottom: '2px solid var(--border-color, #ddd)',
                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
              }}></th>
              {variables.map((variable, idx) => (
                <th key={idx} style={{ 
                  padding: '0.75rem',
                  textAlign: 'center',
                  fontWeight: 600,
                  borderBottom: '2px solid var(--border-color, #ddd)',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  minWidth: '100px',
                }}>
                  {getVariableLabel(variable)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variables.map((variable, rowIdx) => (
              <tr key={rowIdx}>
                <td style={{ 
                  padding: '0.75rem',
                  fontWeight: 600,
                  borderRight: '2px solid var(--border-color, #ddd)',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                }}>
                  {getVariableLabel(variable)}
                </td>
                {variables.map((_, colIdx) => {
                  const isDiagonal = rowIdx === colIdx;
                  const cellValue = localMatrix[rowIdx]?.[colIdx] ?? 0;
                  const errorKey = `${rowIdx}-${colIdx}`;
                  const hasError = errors.has(errorKey);
                  
                  return (
                    <td
                      key={colIdx}
                      style={{
                        padding: '0.5rem',
                        textAlign: 'center',
                        border: hasError 
                          ? '2px solid #f44336' 
                          : '1px solid var(--border-color, #ddd)',
                        backgroundColor: isDiagonal 
                          ? 'var(--bg-secondary, #f5f5f5)' 
                          : getCellColor(cellValue),
                      }}
                    >
                      {isDiagonal ? (
                        <span style={{ 
                          color: 'var(--text-secondary, #666)',
                          fontWeight: 500,
                        }}>
                          1.0
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="-1.0"
                          max="1.0"
                          step="0.1"
                          value={cellValue}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          onBlur={() => handleCellBlur(rowIdx, colIdx)}
                          style={{
                            width: '100%',
                            padding: '0.25rem 0.5rem',
                            border: '1px solid var(--border-color, #ccc)',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '0.875rem',
                            backgroundColor: 'white',
                            maxWidth: '80px',
                          }}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {errors.size > 0 && (
        <div style={{ 
          marginTop: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '4px',
          fontSize: '0.875rem',
          color: '#c62828',
        }}>
          {Array.from(errors.values()).map((error, idx) => (
            <div key={idx}>{error}</div>
          ))}
        </div>
      )}
      
      <p style={{ 
        marginTop: '0.75rem',
        fontSize: '0.875rem',
        color: 'var(--text-secondary, #666)',
      }}>
        Diagonal cells are fixed at 1.0 (perfect self-correlation). 
        Off-diagonal values range from -1.0 (perfect negative correlation) to 1.0 (perfect positive correlation).
        Editing a cell automatically updates its mirror cell to maintain symmetry.
      </p>
    </div>
  );
}

