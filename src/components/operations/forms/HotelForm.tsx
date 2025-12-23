import type { HotelConfig } from '../../../domain/types';
import { InputGroup } from '../../ui/InputGroup';
import { CurrencyInput } from '../../inputs/CurrencyInput';
import { PercentageSlider } from '../../inputs/PercentageSlider';
import { SectionCard } from '../../ui/SectionCard';
import { useMixValidation } from '../../../ui/hooks/useMixValidation';

interface HotelFormProps {
  operation: HotelConfig;
  onChange?: (updates: Partial<HotelConfig>) => void;
  readOnly?: boolean;
}

export function HotelForm({ operation, onChange, readOnly = false }: HotelFormProps) {
  // OPEX validation - warn when total exceeds 80%, cap at 100%
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
    // Read-only fallback (for backward compatibility)
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
          {/* Basic Drivers */}
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
                label="Keys"
                required
                error={
                  operation.keys < 0
                    ? 'Number of keys cannot be negative'
                    : operation.keys === 0
                      ? 'Please enter a valid number of keys'
                      : undefined
                }
              >
                <input
                  type="number"
                  value={operation.keys}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    onChange({ keys: Math.max(0, value) });
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
                label="ADR (Average Daily Rate)"
                required
                helperText="Typical range: $50 - $2,000 per night"
                error={
                  operation.avgDailyRate <= 0
                    ? 'ADR must be greater than $0'
                    : operation.avgDailyRate > 10000
                      ? 'ADR seems unusually high. Please verify the value.'
                      : undefined
                }
              >
                <CurrencyInput
                  value={operation.avgDailyRate}
                  onChange={(value) => {
                    const validatedValue = Math.max(0, value);
                    onChange({ avgDailyRate: validatedValue });
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
              Revenue Mix (% of Rooms)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label="Food Revenue %"
                value={operation.foodRevenuePctOfRooms}
                onChange={(value) => onChange({ foodRevenuePctOfRooms: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Beverage Revenue %"
                value={operation.beverageRevenuePctOfRooms}
                onChange={(value) => onChange({ beverageRevenuePctOfRooms: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Other Revenue %"
                value={operation.otherRevenuePctOfRooms}
                onChange={(value) => onChange({ otherRevenuePctOfRooms: clampPct(value) })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Commissions & Fees %"
                value={operation.commissionsPct ?? 0}
                onChange={(value) => onChange({ commissionsPct: clampPct(value) })}
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
                warnThreshold={0.5}
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
                  backgroundColor: opexValidation.isOverLimit ? 'var(--danger-bg, #fef2f2)' : 'var(--warning-bg, #fffbeb)',
                  border: `1px solid ${opexValidation.isOverLimit ? 'var(--danger, #dc2626)' : 'var(--warning, #f59e0b)'}`,
                  color: opexValidation.isOverLimit ? 'var(--danger, #dc2626)' : 'var(--warning-text, #92400e)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                >
                  <span>{opexValidation.isOverLimit ? '🚫' : '⚠️'}</span>
                  <span>
                    Total OPEX: {(opexValidation.total * 100).toFixed(0)}%
                    {opexValidation.isOverLimit
                      ? ' — Exceeds 100%! Results will be incorrect.'
                      : ' — High operating costs may result in negative margins.'}
                  </span>
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
              Fixed Costs (Monthly)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <InputGroup
                label="Fixed Payroll"
                helperText="Monthly fixed payroll cost (not % of revenue)"
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
                label="Fixed Other Expenses"
                helperText="Monthly fixed other expenses (not % of revenue)"
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
              Fixed costs are added to variable costs (% of revenue). Total cost = Fixed + (Variable % × Revenue)
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
              Capital Expenditures
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label="Maintenance Capex %"
                value={operation.maintenanceCapexPct}
                onChange={(value) => onChange({ maintenanceCapexPct: value })}
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
