import { Plus } from 'lucide-react';
import type { CapitalStructureConfig, DebtExecution } from '../../domain/types';
import { formatCurrency } from '../../utils/formatters';
import { TrancheCard } from './TrancheCard';
import { SortableList } from '../common/SortableList';
import { useTranslation } from '../../contexts/LanguageContext';

interface DebtManagerProps {
  capitalConfig: CapitalStructureConfig;
  onCapitalConfigChange: (config: CapitalStructureConfig) => void;
}

export function DebtManager({ capitalConfig, onCapitalConfigChange }: DebtManagerProps) {
  const { t, language } = useTranslation();

  const handleAddTranche = () => {
    const newTranche: DebtExecution = {
      id: `tranche-${Date.now()}`,
      label: `Tranche ${capitalConfig.debt.length + 1}`,
      type: 'SENIOR',
      initialPrincipal: 0,
      interestRate: 0.06,
      termYears: 5,
      amortizationType: 'mortgage',
    };

    onCapitalConfigChange({
      ...capitalConfig,
      debt: [...capitalConfig.debt, newTranche],
    });
  };

  const handleDeleteTranche = (trancheId: string) => {
    if (window.confirm(t('capital.deleteTrancheConfirm'))) {
      onCapitalConfigChange({
        ...capitalConfig,
        debt: capitalConfig.debt.filter(t => t.id !== trancheId),
      });
    }
  };

  const handleUpdateTranche = (trancheId: string, updates: Partial<DebtExecution>) => {
    onCapitalConfigChange({
      ...capitalConfig,
      debt: capitalConfig.debt.map(t =>
        t.id === trancheId ? { ...t, ...updates } : t
      ),
    });
  };

  const totalDebt = capitalConfig.debt.reduce((sum, tranche) => {
    const principal = tranche.initialPrincipal ?? 0;
    return sum + principal;
  }, 0);

  const totalEquity = capitalConfig.initialInvestment - totalDebt;
  const ltv = capitalConfig.initialInvestment > 0
    ? (totalDebt / capitalConfig.initialInvestment) * 100
    : 0;

  const isUnlevered = !!capitalConfig.isUnleveredScenario;

  return (
    <div className="debt-manager">
      {/* Unlevered Toggle */}
      <div className="toggle-container">
        <div className="toggle-content">
          <div className={`toggle-icon ${isUnlevered ? 'active' : 'inactive'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <div className="toggle-text">
            <div className="toggle-title">{t('capital.simulateUnlevered')}</div>
            <div className="toggle-description">
              {t('capital.simulateUnleveredDesc')}
            </div>
          </div>
        </div>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isUnlevered}
            onChange={(e) => onCapitalConfigChange({
              ...capitalConfig,
              isUnleveredScenario: e.target.checked
            })}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {/* Main Content Wrapper - Disabled when Unlevered */}
      <div className={`debt-manager-content ${isUnlevered ? 'disabled' : ''}`}>

        {/* Tranche Cards */}
        {capitalConfig.debt.length === 0 ? (
          <div className="empty-state">
            {t('capital.noTranches')}
          </div>
        ) : (
          <SortableList
            items={capitalConfig.debt}
            onReorder={(reorderedTranches) => {
              onCapitalConfigChange({
                ...capitalConfig,
                debt: reorderedTranches,
              });
            }}
            getItemId={(tranche) => tranche.id}
          >
            {(tranche) => (
              <div className="tranche-list">
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
        {capitalConfig.debt.length > 0 && (
          <div className="debt-summary">
            <div className="debt-summary-metrics">
              <div className="debt-metric">
                <div className="debt-metric-label">
                  {t('capital.totalDebt')}
                </div>
                <div className="debt-metric-value">
                  {formatCurrency(totalDebt, language)}
                </div>
              </div>
              <div className="debt-metric">
                <div className="debt-metric-label">
                  {t('capital.totalEquity')}
                </div>
                <div className="debt-metric-value">
                  {formatCurrency(totalEquity, language)}
                </div>
              </div>
              <div className="debt-metric">
                <div className="debt-metric-label">
                  {t('capital.ltvRatio')}
                </div>
                <div className={`debt-metric-value ${ltv > 65 ? 'warning' : 'success'}`}>
                  {ltv.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Tranche Button */}
        <div className="add-button-container">
          <button
            onClick={handleAddTranche}
            className="btn btn-primary"
          >
            <Plus size={18} />
            {t('capital.addTranche')}
          </button>
        </div>

      </div>
    </div>
  );
}


