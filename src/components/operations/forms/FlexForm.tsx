import type { FlexConfig } from '../../../domain/types';
import { InputGroup } from '../../ui/InputGroup';
import { CurrencyInput } from '../../inputs/CurrencyInput';
import { PercentageSlider } from '../../inputs/PercentageSlider';
import { SectionCard } from '../../ui/SectionCard';
import { useMixValidation } from '../../../ui/hooks/useMixValidation';

interface FlexFormProps {
  operation: FlexConfig;
  onChange?: (updates: Partial<FlexConfig>) => void;
  readOnly?: boolean;
}

export function FlexForm({ operation, onChange, readOnly = false }: FlexFormProps) {
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
        Read-only mode - editing not available
      </div>
    );
  }

  // Helper: Clamp percentage between 0 and 1
  const clampPct = (val: number) => Math.min(1, Math.max(0, val));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Revenue Section */}
      <SectionCard title="Revenue" defaultExpanded={true}>
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
              Basic Drivers
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <InputGroup
                label="GLA (Gross Leasable Area - SQM)"
                required
                error={
                  operation.sqm < 0
                    ? 'Area cannot be negative'
                    : operation.sqm === 0
                      ? 'Please enter a valid area'
                      : undefined
                }
              >
                <input
                  type="number"
                  value={operation.sqm}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    onChange({ sqm: Math.max(0, value) });
                  }}
                  min="0"
                  step="0.01"
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
                label="Rent per SQM (Monthly)"
                required
                helperText="Typical range: $10 - $500 per sqm/month"
                error={
                  operation.avgRentPerSqm <= 0
                    ? 'Rent per sqm must be greater than $0'
                    : operation.avgRentPerSqm > 5000
                      ? 'Rent per sqm seems unusually high. Please verify the value.'
                      : undefined
                }
              >
                <CurrencyInput
                  value={operation.avgRentPerSqm}
                  onChange={(value) => {
                    const validatedValue = Math.max(0, value);
                    onChange({ avgRentPerSqm: validatedValue });
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
              Revenue Mix (% of Total)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label="Rental Revenue %"
                value={operation.rentalRevenuePctOfTotal}
                onChange={(value) => onChange({ rentalRevenuePctOfTotal: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Other Revenue %"
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
      <SectionCard title="Expenses" defaultExpanded={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
              Operating Expenses (OPEX)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label="Payroll %"
                value={operation.payrollPct}
                onChange={(value) => onChange({ payrollPct: clampPct(value) })}
                min={0}
                max={1}
                dynamicMax={opexValidation.getMaxFor('payroll')}
                isWarning={opexValidation.isWarning}
                step={0.01}
              />

              <PercentageSlider
                label="Utilities %"
                value={operation.utilitiesPct}
                onChange={(value) => onChange({ utilitiesPct: clampPct(value) })}
                min={0}
                max={1}
                dynamicMax={opexValidation.getMaxFor('utilities')}
                isWarning={opexValidation.isWarning}
                step={0.01}
              />

              <PercentageSlider
                label="Marketing %"
                value={operation.marketingPct}
                onChange={(value) => onChange({ marketingPct: clampPct(value) })}
                min={0}
                max={1}
                dynamicMax={opexValidation.getMaxFor('marketing')}
                isWarning={opexValidation.isWarning}
                step={0.01}
              />

              <PercentageSlider
                label="Maintenance Opex %"
                value={operation.maintenanceOpexPct}
                onChange={(value) => onChange({ maintenanceOpexPct: clampPct(value) })}
                min={0}
                max={1}
                dynamicMax={opexValidation.getMaxFor('maintenanceOpex')}
                isWarning={opexValidation.isWarning}
                step={0.01}
              />

              <PercentageSlider
                label="Other Opex %"
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
                    ? `⚠️ Total OPEX exceeds 100% (${(opexValidation.total * 100).toFixed(1)}%)`
                    : `⚡ Total OPEX is ${(opexValidation.total * 100).toFixed(1)}% — approaching limit`}
                </div>
              )}
            </div>
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
              Capital Expenditures
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label="Maintenance Capex %"
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
