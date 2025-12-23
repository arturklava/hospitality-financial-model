import { useState, useCallback } from 'react';
import { RefreshCw, ArrowRight, Target, Crosshair } from 'lucide-react';
import type { FullModelOutput } from '@domain/types';
import { useTranslation } from '../../contexts/LanguageContext';
import { formatCurrency, formatPercent, type SupportedLocale } from '../../utils/formatters';

interface GoalSeekPanelProps {
  currentOutput: FullModelOutput;
  onApplyScenario: (updates: any) => void;
}

interface GoalOption {
  value: string;
  label: string;
  format: (val: number, lang: SupportedLocale) => string;
  path: string; // approximate path
}

export function GoalSeekPanel({ currentOutput: _currentOutput, onApplyScenario }: GoalSeekPanelProps) {
  const { t, language } = useTranslation();
  const lang = language as SupportedLocale;

  const [targetMetric, setTargetMetric] = useState<string>('irr');
  const [targetValue, setTargetValue] = useState<number>(0.20);
  const [adjustVariable, setAdjustVariable] = useState<string>('adr');
  const [result, setResult] = useState<{ requiredValue: number; iterations: number } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const goalOptions: GoalOption[] = [
    { value: 'irr', label: t('financial.unleveredIrr'), format: (v, l) => formatPercent(v, l), path: 'projectKpis.unleveredIrr' },
    { value: 'npv', label: t('financial.npv'), format: (v, l) => formatCurrency(v, l), path: 'projectKpis.npv' },
    { value: 'equityMultiple', label: t('financial.equityMultiple'), format: (v) => `${v.toFixed(2)}x`, path: 'projectKpis.equityMultiple' },
    { value: 'debtServiceCoverage', label: t('financial.dscr'), format: (v) => v.toFixed(2), path: 'debtKpis.averageDscr' },
  ];

  const variableOptions = [
    { value: 'adr', label: t('operations.avgDailyRate'), path: 'assumptions.global.adrGrowth' }, // Simplified
    { value: 'occupancy', label: t('operations.occupancyRate'), path: 'assumptions.global.occupancyStability' },
    { value: 'constructionCost', label: t('construction.hardCosts'), path: 'construction.hardCosts' },
  ];

  const handleCalculate = useCallback(async () => {
    setIsCalculating(true);
    setResult(null);

    // Simple bisection search simulation for demo
    // In a real implementation, this would iterate on the actual model engine
    try {
      // Placeholder logic
      await new Promise(resolve => setTimeout(resolve, 800));

      // Fake result for demonstration
      const randomAdjustment = 1 + (Math.random() * 0.2 - 0.1);
      const fakeResult = adjustVariable === 'adr' ? 350 * randomAdjustment : 0.75 * randomAdjustment;

      setResult({
        requiredValue: fakeResult,
        iterations: 12,
      });
    } catch (err) {
      // Ignore error for mock
    } finally {
      setIsCalculating(false);
    }
  }, [targetMetric, targetValue, adjustVariable]);

  const handleApply = () => {
    if (!result) return;
    // Apply logic would go here
    onApplyScenario({}); // Placeholder
  };

  return (
    <div className="goal-seek-panel card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Target size={20} className="text-primary" />
        <h2 style={{ margin: 0 }}>{t('analysis.goalSeek.title')}</h2>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {t('analysis.goalSeek.desc')}
      </p>

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        {/* Metric Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            {t('analysis.goalSeek.selectMetric')}
          </label>
          <select
            value={targetMetric}
            onChange={(e) => setTargetMetric(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
            }}
          >
            {goalOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Target Value Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            {t('analysis.goalSeek.targetValue')}
          </label>
          <input
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(parseFloat(e.target.value))}
            step={targetMetric === 'irr' ? 0.01 : 1000}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
            }}
          />
        </div>

        {/* Variable Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            {t('analysis.goalSeek.selectVariable')}
          </label>
          <select
            value={adjustVariable}
            onChange={(e) => setAdjustVariable(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
            }}
          >
            {variableOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCalculate}
          disabled={isCalculating}
          className="btn btn-primary"
          style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
        >
          {isCalculating ? <RefreshCw className="spin" size={16} /> : <Crosshair size={16} />}
          {isCalculating ? t('analysis.sensitivity.calculating') : t('analysis.goalSeek.calculate')}
        </button>

        {result && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>{t('analysis.goalSeek.result')}</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('analysis.goalSeek.required')}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>
                  {adjustVariable === 'adr'
                    ? formatCurrency(result.requiredValue, lang)
                    : formatPercent(result.requiredValue, lang)
                  }
                </div>
              </div>
              <ArrowRight size={20} style={{ color: 'var(--text-tertiary)' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('analysis.goalSeek.current')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                  {adjustVariable === 'adr' ? formatCurrency(350, lang) : '75%'}
                </div>
              </div>
            </div>
            <button
              onClick={handleApply}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '0.5rem',
                fontSize: '0.875rem',
                backgroundColor: 'transparent',
                border: '1px dashed var(--primary)',
                color: 'var(--primary)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
              }}
            >
              {t('analysis.goalSeek.apply')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
