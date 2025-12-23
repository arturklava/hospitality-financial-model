/**
 * Risk KPI Cards Component (v1.6: Risk UI)
 * 
 * Displays key risk metrics: VaR, Probability of Loss, Standard Deviation.
 */

interface RiskKpiCardsProps {
  var95?: number;        // Value at Risk (95% confidence)
  probOfLoss?: number;  // Probability of Loss (0-1)
  stdDev?: number;       // Standard Deviation
  selectedKpi?: 'npv' | 'irr' | 'equityMultiple';  // Which KPI these metrics are for
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function RiskKpiCards({ 
  var95, 
  probOfLoss, 
  stdDev,
  selectedKpi = 'npv'
}: RiskKpiCardsProps) {
  const getKpiLabel = () => {
    switch (selectedKpi) {
      case 'npv':
        return 'NPV';
      case 'irr':
        return 'IRR';
      case 'equityMultiple':
        return 'Equity Multiple';
    }
  };

  const formatValue = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    if (selectedKpi === 'npv') {
      return formatCurrency(value);
    }
    if (selectedKpi === 'irr') {
      return formatPercent(value);
    }
    return value.toFixed(2);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
      {/* VaR Card */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '0.875rem', 
          color: 'var(--text-secondary)', 
          marginBottom: '0.5rem',
          fontWeight: 500 
        }}>
          VaR (95%)
        </div>
        <div style={{ 
          fontSize: '1.75rem', 
          fontWeight: 600, 
          color: var95 !== undefined && var95 < 0 ? '#F44336' : '#4CAF50'
        }}>
          {formatValue(var95)}
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)', 
          marginTop: '0.25rem' 
        }}>
          {getKpiLabel()} at 95% confidence
        </div>
      </div>

      {/* Probability of Loss Card */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '0.875rem', 
          color: 'var(--text-secondary)', 
          marginBottom: '0.5rem',
          fontWeight: 500 
        }}>
          Probability of Loss
        </div>
        <div style={{ 
          fontSize: '1.75rem', 
          fontWeight: 600, 
          color: probOfLoss !== undefined && probOfLoss > 0.2 ? '#F44336' : probOfLoss !== undefined && probOfLoss > 0.1 ? '#FF9800' : '#4CAF50'
        }}>
          {probOfLoss !== undefined ? formatPercent(probOfLoss) : 'N/A'}
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)', 
          marginTop: '0.25rem' 
        }}>
          P({getKpiLabel()} &lt; 0)
        </div>
      </div>

      {/* Standard Deviation Card */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '0.875rem', 
          color: 'var(--text-secondary)', 
          marginBottom: '0.5rem',
          fontWeight: 500 
        }}>
          Standard Deviation
        </div>
        <div style={{ 
          fontSize: '1.75rem', 
          fontWeight: 600, 
          color: 'var(--text-primary)'
        }}>
          {formatValue(stdDev)}
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)', 
          marginTop: '0.25rem' 
        }}>
          {getKpiLabel()} volatility
        </div>
      </div>
    </div>
  );
}

