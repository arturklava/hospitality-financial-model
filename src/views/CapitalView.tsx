import { formatPercent, formatCurrency, type SupportedLocale } from '../utils/formatters';
import { DebtTable } from '../components/DebtTable';
import { InputGroup } from '../components/ui/InputGroup';
import { CapitalStackChart } from '../components/charts/CapitalStackChart';
import { DebtManager } from '../components/capital/DebtManager';
import { EquityInput } from '../components/capital/EquityInput';
import { normalizeCapitalData } from '../domain/capitalHelpers';
import type { ProjectConfig, CapitalStructureConfig, DebtSchedule, DebtKpi } from '../domain/types';
import { useTranslation } from '../contexts/LanguageContext';

interface CapitalViewProps {
  projectConfig: ProjectConfig;
  capitalConfig: CapitalStructureConfig;
  debtSchedule: DebtSchedule;
  debtKpis: DebtKpi[];
  onDiscountRateChange: (rate: number) => void;
  onTerminalGrowthChange: (rate: number) => void;
  onCapitalConfigChange?: (config: CapitalStructureConfig) => void;
}

export function CapitalView({
  projectConfig,
  capitalConfig,
  debtSchedule,
  debtKpis,
  onDiscountRateChange,
  onTerminalGrowthChange,
  onCapitalConfigChange,
}: CapitalViewProps) {
  const { t, language } = useTranslation();
  const lang = language as SupportedLocale;

  // Normalize capital data to ensure safe handling of undefined/null/empty debtTranches (v1.3.1: Data Safety)
  const normalized = normalizeCapitalData(capitalConfig);

  const totalEquity = normalized.totalEquity;

  const handleEquityChange = (_value: number) => {
    if (!onCapitalConfigChange) return;

    // For now, we'll just update the initialInvestment to reflect the change
    // In a real scenario, you might want to adjust tranches proportionally
    // This is a simplified approach - equity is calculated, not directly set
    // So we'll leave this as read-only for now
  };

  return (
    <div className="capital-view" style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      gap: '1.5rem'
    }}>
      {/* Header */}
      <div className="view-header" style={{ marginBottom: '0.5rem', flexShrink: 0 }}>
        <h1 style={{ margin: 0, marginBottom: '0.5rem', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('nav.capitalStack')}</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('capital.title')}</p>
      </div>

      {/* Two Main Cards Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
      }}>
        {/* Card 1: Equity & Uses */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{
            margin: 0,
            marginBottom: '1.5rem',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
          }}>
            {t('capital.equityAndUses')}
          </h2>

          {/* Project costs Summary */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              margin: 0,
              marginBottom: '1rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
            }}>
              {t('capital.projectCosts')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <InputGroup label={t('assumptions.initialInvestment')}>
                <div style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  padding: '0.5rem',
                  backgroundColor: 'var(--surface-hover)',
                  borderRadius: 'var(--radius)',
                }}>
                  {formatCurrency(projectConfig.initialInvestment, lang)}
                </div>
              </InputGroup>
              <InputGroup label={t('assumptions.workingCapitalPercent')}>
                <div style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  padding: '0.5rem',
                  backgroundColor: 'var(--surface-hover)',
                  borderRadius: 'var(--radius)',
                }}>
                  {formatPercent(projectConfig.workingCapitalPercentage ?? 0, lang)}
                </div>
              </InputGroup>
            </div>
          </div>

          {/* Equity Input */}
          <EquityInput
            value={totalEquity}
            onChange={handleEquityChange}
            totalInvestment={capitalConfig.initialInvestment}
            disabled={true}
          />
        </div>

        {/* Card 2: Debt Structure */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{
            margin: 0,
            marginBottom: '1.5rem',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
          }}>
            {t('capital.debtStructure')}
          </h2>

          {/* Capital Stack Chart */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ width: '100%', height: '300px' }}>
              <CapitalStackChart capitalConfig={capitalConfig} height={300} />
            </div>
          </div>

          {/* Debt Manager Table */}
          <div>
            {onCapitalConfigChange ? (
              <DebtManager
                capitalConfig={capitalConfig}
                onCapitalConfigChange={onCapitalConfigChange}
              />
            ) : (
              <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
                {t('common.readOnly')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Valuation Parameters (Below main cards) */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{
          margin: 0,
          marginBottom: '1rem',
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
        }}>
          {t('capital.valuationParameters')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <InputGroup
            label={`${t('assumptions.discountRate')}: ${formatPercent(projectConfig.discountRate, lang)}`}
            helperText={t('financial.tooltips.npv')} // Approximate, or add specific key
          >
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={projectConfig.discountRate * 100}
              onChange={(e) => onDiscountRateChange(parseFloat(e.target.value) / 100)}
              style={{ width: '100%' }}
            />
          </InputGroup>

          <InputGroup
            label={`${t('assumptions.terminalGrowthRate')}: ${formatPercent(projectConfig.terminalGrowthRate, lang)}`}
            helperText={t('financial.tooltips.enterpriseValue')} // Approximate
          >
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={projectConfig.terminalGrowthRate * 100}
              onChange={(e) => onTerminalGrowthChange(parseFloat(e.target.value) / 100)}
              style={{ width: '100%' }}
            />
          </InputGroup>
        </div>
      </div>

      {/* Debt Schedule Table (Below main cards) */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{
          margin: 0,
          marginBottom: '1rem',
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
        }}>
          {t('capital.debtSchedule.title')}
        </h2>
        <DebtTable
          debtSchedule={debtSchedule}
          debtKpis={debtKpis}
          onAddTranche={() => {
            // Handled by DebtManager component above
          }}
        />
      </div>
    </div>
  );
}
