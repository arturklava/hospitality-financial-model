import type { VillasConfig } from '../../../domain/types';
import { InputGroup } from '../../ui/InputGroup';
import { CurrencyInput } from '../../inputs/CurrencyInput';
import { PercentageSlider } from '../../inputs/PercentageSlider';
import { SectionCard } from '../../ui/SectionCard';

interface VillasFormProps {
  operation: VillasConfig;
  onChange?: (updates: Partial<VillasConfig>) => void;
  readOnly?: boolean;
}

export function VillasForm({ operation, onChange, readOnly = false }: VillasFormProps) {
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
                label="Units" 
                required
                error={
                  operation.units < 0 
                    ? 'Number of units cannot be negative'
                    : operation.units === 0
                    ? 'Please enter a valid number of units'
                    : undefined
                }
              >
                <input
                  type="number"
                  value={operation.units}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    onChange({ units: Math.max(0, value) });
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
                label="Avg Nightly Rate" 
                required
                helperText="Typical range: $50 - $5,000 per night"
                error={
                  operation.avgNightlyRate <= 0 
                    ? 'Average nightly rate must be greater than $0'
                    : operation.avgNightlyRate > 50000
                    ? 'Average nightly rate seems unusually high. Please verify the value.'
                    : undefined
                }
              >
                <CurrencyInput
                  value={operation.avgNightlyRate}
                  onChange={(value) => {
                    const validatedValue = Math.max(0, value);
                    onChange({ avgNightlyRate: validatedValue });
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
              Revenue Mix (% of Rental)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PercentageSlider
                label="Food Revenue %"
                value={operation.foodRevenuePctOfRental}
                onChange={(value) => onChange({ foodRevenuePctOfRental: value })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Beverage Revenue %"
                value={operation.beverageRevenuePctOfRental}
                onChange={(value) => onChange({ beverageRevenuePctOfRental: value })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Other Revenue %"
                value={operation.otherRevenuePctOfRental}
                onChange={(value) => onChange({ otherRevenuePctOfRental: value })}
                min={0}
                max={1}
                step={0.01}
              />

              <PercentageSlider
                label="Commissions & Fees %"
                value={operation.commissionsPct ?? 0}
                onChange={(value) => onChange({ commissionsPct: value })}
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

