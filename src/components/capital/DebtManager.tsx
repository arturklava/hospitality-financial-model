import { Plus } from 'lucide-react';
import type { CapitalStructureConfig, DebtTrancheConfig } from '../../domain/types';
import { formatCurrency } from '../../utils/formatters';
import { TrancheCard } from './TrancheCard';
import { SortableList } from '../common/SortableList';

interface DebtManagerProps {
  capitalConfig: CapitalStructureConfig;
  onCapitalConfigChange: (config: CapitalStructureConfig) => void;
}

export function DebtManager({ capitalConfig, onCapitalConfigChange }: DebtManagerProps) {
  const handleAddTranche = () => {
    const newTranche: DebtTrancheConfig = {
      id: `tranche-${Date.now()}`,
      label: `Tranche ${capitalConfig.debtTranches.length + 1}`,
      type: 'SENIOR',
      initialPrincipal: 0,
      interestRate: 0.06,
      termYears: 5,
      amortizationType: 'mortgage',
    };

    onCapitalConfigChange({
      ...capitalConfig,
      debtTranches: [...capitalConfig.debtTranches, newTranche],
    });
  };

  const handleDeleteTranche = (trancheId: string) => {
    if (window.confirm('Are you sure you want to delete this debt tranche?')) {
      onCapitalConfigChange({
        ...capitalConfig,
        debtTranches: capitalConfig.debtTranches.filter(t => t.id !== trancheId),
      });
    }
  };

  const handleUpdateTranche = (trancheId: string, updates: Partial<DebtTrancheConfig>) => {
    onCapitalConfigChange({
      ...capitalConfig,
      debtTranches: capitalConfig.debtTranches.map(t =>
        t.id === trancheId ? { ...t, ...updates } : t
      ),
    });
  };

  const totalDebt = capitalConfig.debtTranches.reduce((sum, tranche) => {
    const principal = tranche.initialPrincipal ?? tranche.amount ?? 0;
    return sum + principal;
  }, 0);

  const totalEquity = capitalConfig.initialInvestment - totalDebt;
  const ltv = capitalConfig.initialInvestment > 0
    ? (totalDebt / capitalConfig.initialInvestment) * 100
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Tranche Cards */}
      {capitalConfig.debtTranches.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius)',
        }}>
          No debt tranches configured. Click "Add Tranche" to add one.
        </div>
      ) : (
        <SortableList
          items={capitalConfig.debtTranches}
          onReorder={(reorderedTranches) => {
            onCapitalConfigChange({
              ...capitalConfig,
              debtTranches: reorderedTranches,
            });
          }}
          getItemId={(tranche) => tranche.id}
        >
          {(tranche) => (
            <div style={{ marginBottom: '1.5rem' }}>
              <TrancheCard
                tranche={tranche}
                capitalConfig={capitalConfig}
                onUpdate={(updates) => handleUpdateTranche(tranche.id, updates)}
                onDelete={() => handleDeleteTranche(tranche.id)}
              />
            </div>
          )}
        </SortableList>
      )}

      {/* Summary Row */}
      {capitalConfig.debtTranches.length > 0 && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--surface-hover)',
          borderRadius: 'var(--radius)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem',
              }}>
                Total Debt
              </div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                {formatCurrency(totalDebt)}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem',
              }}>
                Total Equity
              </div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                {formatCurrency(totalEquity)}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem',
              }}>
                Loan-to-Value (LTV)
              </div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: ltv > 65 ? 'var(--warning)' : 'var(--success)',
              }}>
                {ltv.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Tranche Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button
          onClick={handleAddTranche}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: 500,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary)';
          }}
        >
          <Plus size={18} />
          Add Tranche
        </button>
      </div>
    </div>
  );
}

