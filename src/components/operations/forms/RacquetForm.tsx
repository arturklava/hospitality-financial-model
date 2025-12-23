import type { RacquetConfig } from '../../../domain/types';
import { InputGroup } from '../../ui/InputGroup';
import { CurrencyInput } from '../../inputs/CurrencyInput';
import { PercentageSlider } from '../../inputs/PercentageSlider';
import { SectionCard } from '../../ui/SectionCard';
import { useMixValidation } from '../../../ui/hooks/useMixValidation';

interface RacquetFormProps {
  operation: RacquetConfig;
  onChange?: (updates: Partial<RacquetConfig>) => void;
  readOnly?: boolean;
}

export function RacquetForm({ operation, onChange, readOnly = false }: RacquetFormProps) {
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
                label="Courts"
                required
                error={
                  operation.courts < 0
                    ? 'Number of courts cannot be negative'
                    : operation.courts === 0
                      ? 'Please enter a valid number of courts'
                      : undefined
                }
              >
                <input
                  type="number"
                  value={operation.courts}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    onChange({ courts: Math.max(0, value) });
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
                label="Avg Court Rate (Hourly)"
                required
                helperText="Typical range: $20 - $200 per hour"
                error={
                  operation.avgCourtRate <= 0
                    ? 'Court rate must be greater than $0'
                    : operation.avgCourtRate > 2000
                      ? 'Court rate seems unusually high. Please verify the value.'
                      : undefined
                }
              >
                <CurrencyInput
                  value={operation.avgCourtRate}
                  onChange={(value) => {
                    const validatedValue = Math.max(0, value);
                    onChange({ avgCourtRate: validatedValue });
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

              <InputGroup
                label="Hours Per Day"
                required
                helperText="Typical range: 8 - 16 hours"
                error={
                  operation.hoursPerDay < 0
                    ? 'Hours per day cannot be negative'
                    : operation.hoursPerDay > 24
                      ? 'Hours per day cannot exceed 24'
                      : undefined
                }
              >
                <input
                  type="number"
                  value={operation.hoursPerDay}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    onChange({ hoursPerDay: Math.max(0, Math.min(24, value)) });
                  }}
                  min="0"
                  max="24"
                  step="0.5"
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
                label="Memberships"
                required
                error={
                  operation.memberships < 0
                    ? 'Number of memberships cannot be negative'
                    : undefined
                }
              >
                <input
                  type="number"
                  value={operation.memberships}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    onChange({ memberships: Math.max(0, value) });
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
                label="Avg Membership Fee"
                required
                helperText="Typical range: $100 - $10,000 annually"
                error={
                  operation.avgMembershipFee <= 0
                    ? 'Membership fee must be greater than $0'
                    : operation.avgMembershipFee > 100000
                      ? 'Membership fee seems unusually high. Please verify the value.'
                      : undefined
                }
              >
                <CurrencyInput
                  value={operation.avgMembershipFee}
                  onChange={(value) => {
                    const validatedValue = Math.max(0, value);
                    onChange({ avgMembershipFee: validatedValue });
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
                label="Food Revenue %"
                value={operation.foodRevenuePctOfTotal}
                onChange={(value) => onChange({ foodRevenuePctOfTotal: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Beverage Revenue %"
                value={operation.beverageRevenuePctOfTotal}
                onChange={(value) => onChange({ beverageRevenuePctOfTotal: clampPct(value) })}
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
              Departmental Expenses (COGS)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label="Food COGS %"
                value={operation.foodCogsPct}
                onChange={(value) => onChange({ foodCogsPct: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Beverage COGS %"
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
