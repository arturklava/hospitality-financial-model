import type { RestaurantConfig } from '../../../domain/types';
import { InputGroup } from '../../ui/InputGroup';
import { CurrencyInput } from '../../inputs/CurrencyInput';
import { PercentageSlider } from '../../inputs/PercentageSlider';
import { SectionCard } from '../../ui/SectionCard';
import { useMixValidation } from '../../../ui/hooks/useMixValidation';
import { useTranslation } from '../../../contexts/LanguageContext';

interface RestaurantFormProps {
  operation: RestaurantConfig;
  onChange?: (updates: Partial<RestaurantConfig>) => void;
  readOnly?: boolean;
}

export function RestaurantForm({ operation, onChange, readOnly = false }: RestaurantFormProps) {
  const { t } = useTranslation();

  const opexValidation = useMixValidation({
    values: {
      payroll: operation.payrollPct,
      utilities: operation.utilitiesPct,
      marketing: operation.marketingPct,
      maintenanceOpex: operation.maintenanceOpexPct,
      otherOpex: operation.otherOpexPct,
    },
    limit: 1.0,
    warnThreshold: 0.8,
  });

  if (!onChange || readOnly) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        {t('common.readOnly') || 'Read-only mode - editing not available'}
      </div>
    );
  }

  // Helper: Clamp percentage between 0 and 1
  const clampPct = (val: number) => Math.min(1, Math.max(0, val));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Revenue Section */}
      <SectionCard title={t('operations.sections.revenue')} defaultExpanded={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Basic Revenue Drivers */}
          <div>
            <h4
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              {t('operations.form.basicDrivers')}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <InputGroup
                label={t('operations.input.covers')}
                required
                helperText={t('operations.helpers.covers')}
                error={
                  operation.covers < 0
                    ? t('operations.validation.negativeCovers')
                    : operation.covers === 0
                      ? t('operations.validation.invalidCovers')
                      : undefined
                }
              >
                <input
                  type="number"
                  value={operation.covers}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    onChange({ covers: Math.max(0, value) });
                  }}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.9375rem',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  }}
                />
              </InputGroup>

              <InputGroup
                label={t('operations.input.avgCheck')}
                required
                helperText={t('operations.helpers.avgCheck')}
                error={
                  operation.avgCheck <= 0
                    ? t('operations.validation.avgCheckPositive')
                    : operation.avgCheck > 2000
                      ? t('operations.validation.avgCheckHigh')
                      : undefined
                }
              >
                <CurrencyInput
                  value={operation.avgCheck}
                  onChange={(value) => {
                    const validatedValue = Math.max(0, value);
                    onChange({ avgCheck: validatedValue });
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.9375rem',
                  }}
                />
              </InputGroup>
            </div>
          </div>

          {/* Revenue Mix (Margins) */}
          <div>
            <h4
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              {t('operations.form.revenueMix')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label={`${t('financial.foodRevenue')} %`}
                value={operation.foodRevenuePctOfTotal}
                onChange={(value) => onChange({ foodRevenuePctOfTotal: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label={`${t('financial.beverageRevenue')} %`}
                value={operation.beverageRevenuePctOfTotal}
                onChange={(value) => onChange({ beverageRevenuePctOfTotal: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label={`${t('financial.otherRevenue')} %`}
                value={operation.otherRevenuePctOfTotal}
                onChange={(value) => onChange({ otherRevenuePctOfTotal: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Expenses Section */}
      <SectionCard title={t('operations.sections.expenses')} defaultExpanded={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Departmental Expenses (COGS) */}
          <div>
            <h4
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              {t('operations.form.departmentalExpenses')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label={`${t('pnl.foodCogs')} %`}
                value={operation.foodCogsPct}
                onChange={(value) => onChange({ foodCogsPct: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label={`${t('pnl.beverageCogs')} %`}
                value={operation.beverageCogsPct}
                onChange={(value) => onChange({ beverageCogsPct: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
          </div>

          {/* Operating Expenses (OPEX) */}
          <div>
            <h4
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              {t('operations.form.operatingExpenses')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label={`${t('financial.payroll')} %`}
                value={operation.payrollPct}
                onChange={(value) => onChange({ payrollPct: clampPct(value) })}
                min={0}
                max={1}
                dynamicMax={opexValidation.getMaxFor('payroll')}
                isWarning={opexValidation.isWarning}
                step={0.01}
              />

              <PercentageSlider
                label={`${t('financial.utilities')} %`}
                value={operation.utilitiesPct}
                onChange={(value) => onChange({ utilitiesPct: clampPct(value) })}
                min={0}
                max={1}
                dynamicMax={opexValidation.getMaxFor('utilities')}
                isWarning={opexValidation.isWarning}
                step={0.01}
              />

              <PercentageSlider
                label={`${t('financial.marketing')} %`}
                value={operation.marketingPct}
                onChange={(value) => onChange({ marketingPct: clampPct(value) })}
                min={0}
                max={1}
                dynamicMax={opexValidation.getMaxFor('marketing')}
                isWarning={opexValidation.isWarning}
                step={0.01}
              />

              <PercentageSlider
                label={`${t('pnl.maintenanceOpex')} %`}
                value={operation.maintenanceOpexPct}
                onChange={(value) => onChange({ maintenanceOpexPct: clampPct(value) })}
                min={0}
                max={1}
                dynamicMax={opexValidation.getMaxFor('maintenanceOpex')}
                isWarning={opexValidation.isWarning}
                step={0.01}
              />

              <PercentageSlider
                label={`${t('pnl.otherOpex')} %`}
                value={operation.otherOpexPct}
                onChange={(value) => onChange({ otherOpexPct: clampPct(value) })}
                min={0}
                max={1}
                dynamicMax={opexValidation.getMaxFor('otherOpex')}
                isWarning={opexValidation.isWarning}
                step={0.01}
              />

              {/* OPEX Warning Banner */}
              {(opexValidation.isWarning || opexValidation.isOverLimit) && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius)',
                  backgroundColor: opexValidation.isOverLimit ? '#fef2f2' : '#fffbeb',
                  border: `1px solid ${opexValidation.isOverLimit ? '#dc2626' : '#f59e0b'}`,
                  color: opexValidation.isOverLimit ? '#dc2626' : '#92400e',
                  fontSize: '0.875rem',
                }}>
                  {opexValidation.isOverLimit
                    ? `⚠️ ${t('financial.operatingExpenses')} exceeds 100% (${(opexValidation.total * 100).toFixed(1)}%)`
                    : `⚡ ${t('financial.operatingExpenses')} is ${(opexValidation.total * 100).toFixed(1)}% — approaching limit`}
                </div>
              )}
            </div>
          </div>

          {/* Fixed Costs */}
          <div>
            <h4
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              {t('operations.form.fixedCosts')}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <InputGroup
                label={t('financial.payroll')}
                helperText={t('operations.helpers.fixedPayroll')}
              >
                <CurrencyInput
                  value={operation.fixedPayroll ?? 0}
                  onChange={(value) => onChange({ fixedPayroll: Math.max(0, value) })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.9375rem',
                  }}
                />
              </InputGroup>

              <InputGroup
                label={t('financial.other')}
                helperText={t('operations.helpers.fixedOther')}
              >
                <CurrencyInput
                  value={operation.fixedOtherExpenses ?? 0}
                  onChange={(value) => onChange({ fixedOtherExpenses: Math.max(0, value) })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.9375rem',
                  }}
                />
              </InputGroup>
            </div>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginTop: '0.5rem',
              fontStyle: 'italic',
            }}>
              {t('operations.helpers.fixedCosts')}
            </p>
          </div>

          {/* Capital Expenditures */}
          <div>
            <h4
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              {t('operations.form.capex')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label={`${t('pnl.maintenanceCapex')} %`}
                value={operation.maintenanceCapexPct}
                onChange={(value) => onChange({ maintenanceCapexPct: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
