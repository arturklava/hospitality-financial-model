import type { FullModelInput, OperationConfig, OperationType } from '@domain/types';
import { useTranslation } from '../contexts/LanguageContext';
import { getLocaleConfig } from '../utils/formatters';

interface AssumptionsViewProps {
  input: FullModelInput;
  onDiscountRateChange: (value: number) => void;
  onTerminalGrowthChange: (value: number) => void;
}

/**
 * Formats a number as currency.
 */
function formatCurrency(value: number, language: 'pt' | 'en'): string {
  const { locale, currency } = getLocaleConfig(language);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a number as a percentage.
 */
function formatPercent(value: number | null, language: 'pt' | 'en'): string {
  if (value === null) {
    return 'N/A';
  }
  const { locale } = getLocaleConfig(language);
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type OperationFamily = 'lodging' | 'f&b' | 'leisure' | 'sports' | 'wellness' | 'commercial' | 'senior';

function getOperationFamily(opType: OperationType): OperationFamily {
  switch (opType) {
    case 'HOTEL':
    case 'VILLAS':
    case 'SENIOR_LIVING':
      return 'lodging';
    case 'RESTAURANT':
    case 'BEACH_CLUB':
      return 'f&b';
    case 'RACQUET':
      return 'sports';
    case 'WELLNESS':
      return 'wellness';
    case 'RETAIL':
    case 'FLEX':
      return 'commercial';
    default:
      return 'leisure';
  }
}

function getFamilyLabel(family: OperationFamily, t: (key: any) => string): string {
  switch (family) {
    case 'lodging':
      return t('assumptions.lodging');
    case 'f&b':
      return t('assumptions.foodBeverage');
    case 'leisure':
      return t('assumptions.leisure');
    case 'sports':
      return t('assumptions.sports');
    case 'wellness':
      return t('assumptions.wellness');
    case 'commercial':
      return t('assumptions.commercial');
    case 'senior':
      return t('assumptions.seniorLiving');
  }
}

function getOperationDisplayDetails(op: OperationConfig, t: (key: any) => string, language: 'pt' | 'en'): {
  family: OperationFamily;
  typeLabel: string;
  name: string;
  capacityLabel: string;
  capacityValue: string;
  priceLabel: string;
  priceValue: string;
} {
  const family = getOperationFamily(op.operationType);
  const typeLabel = t(`operationType.${op.operationType}`);
  let capacityLabel = t('assumptions.keys');
  let capacityValue = 'N/A';
  let priceLabel = t('assumptions.adr');
  let priceValue = 'N/A';

  switch (op.operationType) {
    case 'HOTEL':
      capacityLabel = t('assumptions.keys');
      capacityValue = op.keys.toString();
      priceLabel = t('assumptions.adr');
      priceValue = formatCurrency(op.avgDailyRate, language);
      break;
    case 'VILLAS':
      capacityLabel = t('assumptions.units');
      capacityValue = op.units.toString();
      priceLabel = t('assumptions.nightlyRate');
      priceValue = formatCurrency(op.avgNightlyRate, language);
      break;
    case 'RESTAURANT':
      capacityLabel = t('assumptions.covers');
      capacityValue = op.covers.toString();
      priceLabel = t('assumptions.avgCheck');
      priceValue = formatCurrency(op.avgCheck, language);
      break;
    case 'BEACH_CLUB':
      capacityLabel = t('assumptions.dailyPasses');
      capacityValue = op.dailyPasses.toString();
      priceLabel = t('assumptions.passPrice');
      priceValue = formatCurrency(op.avgDailyPassPrice, language);
      break;
    case 'RACQUET':
      capacityLabel = t('assumptions.courts');
      capacityValue = op.courts.toString();
      priceLabel = t('assumptions.courtRate');
      priceValue = formatCurrency(op.avgCourtRate, language);
      break;
    case 'RETAIL':
      capacityLabel = t('assumptions.sqm');
      capacityValue = op.sqm.toString();
      priceLabel = t('assumptions.rentPerSqm');
      priceValue = formatCurrency(op.avgRentPerSqm, language);
      break;
    case 'FLEX':
      capacityLabel = t('assumptions.sqm');
      capacityValue = op.sqm.toString();
      priceLabel = t('assumptions.rentPerSqm');
      priceValue = formatCurrency(op.avgRentPerSqm, language);
      break;
    case 'WELLNESS':
      capacityLabel = t('assumptions.dailyPasses');
      capacityValue = op.dailyPasses.toString();
      priceLabel = t('assumptions.passPrice');
      priceValue = formatCurrency(op.avgDailyPassPrice, language);
      break;
    case 'SENIOR_LIVING':
      capacityLabel = t('assumptions.units');
      capacityValue = op.units.toString();
      priceLabel = t('assumptions.monthlyRate');
      priceValue = formatCurrency(op.avgMonthlyRate, language);
      break;
  }

  return {
    family,
    typeLabel,
    name: op.name,
    capacityLabel,
    capacityValue,
    priceLabel,
    priceValue,
  };
}

export function AssumptionsView({ input, onDiscountRateChange, onTerminalGrowthChange }: AssumptionsViewProps) {
  const { t, language } = useTranslation();

  // Calculate total debt amount
  const totalDebtAmount = input.capitalConfig.debt.reduce((sum, tranche) => {
    const principal = tranche.initialPrincipal ?? 0;
    return sum + principal;
  }, 0);
  const ltv = input.capitalConfig.initialInvestment > 0
    ? (totalDebtAmount / input.capitalConfig.initialInvestment) * 100
    : 0;

  // Group operations by family
  const operationsByFamily = new Map<OperationFamily, OperationConfig[]>();
  input.scenario.operations.forEach((op) => {
    const family = getOperationFamily(op.operationType);
    if (!operationsByFamily.has(family)) {
      operationsByFamily.set(family, []);
    }
    operationsByFamily.get(family)!.push(op);
  });

  const familyOrder: OperationFamily[] = ['lodging', 'f&b', 'sports', 'wellness', 'commercial', 'leisure', 'senior'];
  const familiesToRender = familyOrder.filter((family) => operationsByFamily.has(family));

  return (
    <div className="assumptions-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Scenario Configuration */}
      <section className="controls-section card">
        <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('assumptions.scenarioConfiguration')}</h2>

        <div className="form-grid" style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <span className="form-label">{t('assumptions.scenarioName')}</span>
            <div className="config-value">{input.scenario.name}</div>
          </div>
          <div className="form-group">
            <span className="form-label">{t('assumptions.startYear')}</span>
            <div className="config-value">{input.scenario.startYear}</div>
          </div>
          <div className="form-group">
            <span className="form-label">{t('assumptions.horizonYears')}</span>
            <div className="config-value">{input.scenario.horizonYears}</div>
          </div>
          <div className="form-group">
            <span className="form-label">{t('assumptions.numberOfOperations')}</span>
            <div className="config-value">{input.scenario.operations.length}</div>
          </div>
        </div>

        <h3 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('assumptions.projectConfiguration')}</h3>
        <div className="form-grid" style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <span className="form-label">{t('assumptions.initialInvestment')}</span>
            <div className="config-value">{formatCurrency(input.projectConfig.initialInvestment, language)}</div>
          </div>
          <div className="form-group">
            <span className="form-label">{t('assumptions.workingCapitalPercent')}</span>
            <div className="config-value">
              {((input.projectConfig.workingCapitalPercentage ?? 0) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <h3 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('assumptions.editableParameters')}</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="discount-rate" className="form-label">
              {t('assumptions.discountRate')}: {formatPercent(input.projectConfig.discountRate, language)}
            </label>
            <input
              id="discount-rate"
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={input.projectConfig.discountRate * 100}
              onChange={(e) => onDiscountRateChange(parseFloat(e.target.value) / 100)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="terminal-growth" className="form-label">
              {t('assumptions.terminalGrowthRate')}: {formatPercent(input.projectConfig.terminalGrowthRate, language)}
            </label>
            <input
              id="terminal-growth"
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={input.projectConfig.terminalGrowthRate * 100}
              onChange={(e) => onTerminalGrowthChange(parseFloat(e.target.value) / 100)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="debt-amount" className="form-label">
              {t('assumptions.totalDebt')}: {formatCurrency(totalDebtAmount, language)} ({t('capital.ltvRatio')}: {ltv.toFixed(1)}%)
            </label>
            <p style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {input.capitalConfig.debt.length} {t('assumptions.tranchesConfigured')}
            </p>
          </div>
        </div>
      </section>

      {/* Operations List */}
      <section className="operations-section card">
        <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('assumptions.operations')}</h2>
        {input.scenario.operations.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t('assumptions.noOperationsConfigured')}</p>
        ) : (
          familiesToRender.map((family) => {
            const ops = operationsByFamily.get(family)!;
            return (
              <div key={family} className="operation-family" style={{ marginBottom: '1.5rem' }}>
                <h3 className="family-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>
                  {getFamilyLabel(family, t)}
                </h3>
                <div className="form-grid">
                  {ops.map((op) => {
                    const details = getOperationDisplayDetails(op, t, language);
                    return (
                      <div key={op.id} className="operation-item" style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--surface-hover)' }}>
                        <div className="operation-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span className="operation-type" style={{ fontWeight: 600, fontSize: '0.9em' }}>{details.typeLabel}</span>
                        </div>
                        <div className="operation-name" style={{ fontWeight: 500, marginBottom: '0.5rem' }}>{details.name}</div>
                        <div className="operation-details" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                          <span className="operation-capacity">
                            {details.capacityLabel}: <span style={{ color: 'var(--text-primary)' }}>{details.capacityValue}</span>
                          </span>
                          <span className="operation-price">
                            {details.priceLabel}: <span style={{ color: 'var(--text-primary)' }}>{details.priceValue}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Debt Table */}
      {input.capitalConfig.debt.length > 0 && (
        <section className="debt-section card">
          <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('assumptions.debtStructure')}</h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>{t('assumptions.label')}</th>
                  <th>{t('assumptions.type')}</th>
                  <th>{t('assumptions.initialPrincipal')}</th>
                  <th>{t('assumptions.interestRate')}</th>
                  <th>{t('assumptions.termYears')}</th>
                  <th>{t('assumptions.ioYears')}</th>
                </tr>
              </thead>
              <tbody>
                {input.capitalConfig.debt.map((tranche) => {
                  const principal = tranche.initialPrincipal ?? 0;
                  return (
                    <tr key={tranche.id}>
                      <td>{tranche.label ?? tranche.id}</td>
                      <td>{tranche.type ?? 'N/A'}</td>
                      <td>{formatCurrency(principal, language)}</td>
                      <td>{formatPercent(tranche.interestRate, language)}</td>
                      <td>{tranche.termYears}</td>
                      <td>{tranche.ioYears ?? 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
