import type { RestaurantConfig } from '../../../domain/types';
import { InputGroup } from '../../ui/InputGroup';
import { CurrencyInput } from '../../inputs/CurrencyInput';
import { PercentageSlider } from '../../inputs/PercentageSlider';
import { SectionCard } from '../../ui/SectionCard';

interface RestaurantFormProps {
  operation: RestaurantConfig;
  onChange?: (updates: Partial<RestaurantConfig>) => void;
  readOnly?: boolean;
}

export function RestaurantForm({ operation, onChange, readOnly = false }: RestaurantFormProps) {
  if (!onChange || readOnly) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Read-only mode - editing not available
      </div>
    );
  }

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
                label="Covers" 
                required
                helperText="Number of customers served per day"
                error={
                  operation.covers < 0 
                    ? 'Number of covers cannot be negative'
                    : operation.covers === 0
                    ? 'Please enter a valid number of covers'
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
                label="Avg Check" 
                required
                helperText="Typical range: $10 - $500 per customer"
                error={
                  operation.avgCheck <= 0 
                    ? 'Average check must be greater than $0'
                    : operation.avgCheck > 2000
                    ? 'Average check seems unusually high. Please verify the value.'
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
              Revenue Mix (% of Total)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label="Food Revenue %"
                value={operation.foodRevenuePctOfTotal}
                onChange={(value) => onChange({ foodRevenuePctOfTotal: value })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Beverage Revenue %"
                value={operation.beverageRevenuePctOfTotal}
                onChange={(value) => onChange({ beverageRevenuePctOfTotal: value })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Other Revenue %"
                value={operation.otherRevenuePctOfTotal}
                onChange={(value) => onChange({ otherRevenuePctOfTotal: value })}
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
                onChange={(value) => onChange({ foodCogsPct: value })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Beverage COGS %"
                value={operation.beverageCogsPct}
                onChange={(value) => onChange({ beverageCogsPct: value })}
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
                onChange={(value) => onChange({ payrollPct: value })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Utilities %"
                value={operation.utilitiesPct}
                onChange={(value) => onChange({ utilitiesPct: value })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Marketing %"
                value={operation.marketingPct}
                onChange={(value) => onChange({ marketingPct: value })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Maintenance Opex %"
                value={operation.maintenanceOpexPct}
                onChange={(value) => onChange({ maintenanceOpexPct: value })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Other Opex %"
                value={operation.otherOpexPct}
                onChange={(value) => onChange({ otherOpexPct: value })}
                min={0}
                max={1}
                step={0.01}
              />
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

