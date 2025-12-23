import type { OperationConfig, RampUpConfig } from '../../domain/types';
import { SectionCard } from '../ui/SectionCard';
import { InputGroup } from '../ui/InputGroup';
import { OperationDriversForm } from './forms/OperationDriversForm';
import { BusinessModelForm } from './forms/BusinessModelForm';
import { SeasonalityChart } from './SeasonalityChart';
import { useTranslation } from '../../contexts/LanguageContext';

interface OperationEditorProps {
  operation: OperationConfig;
  onChange?: (updates: Partial<OperationConfig>) => void;
}

/**
 * OperationEditor component.
 * 
 * Combines OperationDriversForm and BusinessModelForm into a unified editor
 * with SectionCard organization (Revenue vs Expenses).
 */
export function OperationEditor({ operation, onChange }: OperationEditorProps) {
  const { t } = useTranslation();

  // Initialize seasonality curve if not present
  const seasonalityCurve = operation.seasonalityCurve || Array(12).fill(1.0);

  const handleSeasonalityChange = (values: number[]) => {
    onChange?.({ seasonalityCurve: values });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* General Section */}
      <SectionCard title="General" defaultExpanded={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InputGroup label="Name" required>
            <input
              type="text"
              value={operation.name}
              onChange={(e) => onChange?.({ name: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            />
          </InputGroup>

          <InputGroup label="Type">
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--surface-hover)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              {operation.operationType
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ')}
            </div>
          </InputGroup>
        </div>
      </SectionCard>

      {/* Revenue Drivers Section */}
      <SectionCard title={t('operations.sections.revenue')} defaultExpanded={true}>
        <OperationDriversForm
          operation={operation}
          onChange={onChange}
        />
      </SectionCard>

      {/* Seasonality Section */}
      <SectionCard title={t('operations.sections.seasonality')} defaultExpanded={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            margin: 0,
          }}>
            {t('operations.helpers.seasonality')}
          </p>
          <SeasonalityChart
            values={seasonalityCurve}
            onChange={handleSeasonalityChange}
          />
        </div>
      </SectionCard>

      {/* Expenses Section */}
      <SectionCard title={t('operations.sections.expenses')} defaultExpanded={true}>
        <BusinessModelForm
          operation={operation}
          onChange={onChange || (() => { })}
        />
      </SectionCard>

      {/* Ramp-up Section */}
      <SectionCard
        title={t('operations.sections.rampUp')}
        defaultExpanded={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            margin: 0,
          }}>
            {t('operations.helpers.rampUp')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <InputGroup
              label={t('operations.rampUp.stabilizationMonths')}
              helperText={t('operations.rampUp.stabilizationMonthsHelper')}
            >
              <input
                type="number"
                min="0"
                max="60"
                value={operation.rampUpConfig?.rampUpMonths || 0}
                onChange={(e) => {
                  const rampUpMonths = parseInt(e.target.value) || 0;
                  const rampUpConfig: RampUpConfig = {
                    id: operation.rampUpConfig?.id || `rampup-${Date.now()}`,
                    name: operation.rampUpConfig?.name || 'Standard Ramp-up',
                    rampUpMonths,
                    rampUpCurve: operation.rampUpConfig?.rampUpCurve || 's-curve',
                    startMonth: operation.rampUpConfig?.startMonth || 0,
                    applyToRevenue: operation.rampUpConfig?.applyToRevenue ?? true,
                    applyToOccupancy: operation.rampUpConfig?.applyToOccupancy ?? true,
                    applyToOperations: operation.rampUpConfig?.applyToOperations ?? true,
                  };
                  onChange?.({ rampUpConfig });
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.9375rem',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-primary)',
                }}
              />
            </InputGroup>

            <InputGroup
              label={t('operations.rampUp.startPct')}
              helperText={t('operations.rampUp.startPctHelper')}
            >
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={operation.rampUpConfig?.customFactors?.[0] || 0.1}
                onChange={(e) => {
                  const startPct = parseFloat(e.target.value) || 0.1;
                  const rampUpMonths = operation.rampUpConfig?.rampUpMonths || 12;
                  // Generate linear ramp-up factors from startPct to 1.0
                  const customFactors: number[] = [];
                  for (let i = 0; i < rampUpMonths; i++) {
                    const factor = startPct + (1 - startPct) * (i / (rampUpMonths - 1));
                    customFactors.push(Math.min(1, factor));
                  }
                  const rampUpConfig: RampUpConfig = {
                    id: operation.rampUpConfig?.id || `rampup-${Date.now()}`,
                    name: operation.rampUpConfig?.name || 'Standard Ramp-up',
                    rampUpMonths,
                    rampUpCurve: 'custom',
                    startMonth: operation.rampUpConfig?.startMonth || 0,
                    customFactors,
                    applyToRevenue: operation.rampUpConfig?.applyToRevenue ?? true,
                    applyToOccupancy: operation.rampUpConfig?.applyToOccupancy ?? true,
                    applyToOperations: operation.rampUpConfig?.applyToOperations ?? true,
                  };
                  onChange?.({ rampUpConfig });
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.9375rem',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-primary)',
                }}
              />
            </InputGroup>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
