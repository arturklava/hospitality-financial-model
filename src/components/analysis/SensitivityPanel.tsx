import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Settings2, PlayCircle, Loader2 } from 'lucide-react';
import type { FullModelOutput } from '@domain/types';
import { useTranslation } from '../../contexts/LanguageContext';
import { formatCurrency, formatPercent, type SupportedLocale } from '../../utils/formatters';

interface SensitivityPanelProps {
  currentOutput: FullModelOutput;
}

export function SensitivityPanel({ currentOutput }: SensitivityPanelProps) {
  const { t, language } = useTranslation();
  const lang = language as SupportedLocale;

  const [variableX, setVariableX] = useState<string>('occupancy');
  const [rangeX, setRangeX] = useState<number>(0.10); // +/- 10%
  const [kpi, setKpi] = useState<string>('irr');
  const [isRunning, setIsRunning] = useState(false);

  // Simplified mock data generator since we don't have the engine exposed here yet
  const data = useMemo(() => {
    const results = [];
    // Corrected path: currentOutput.project.projectKpis
    const centerVal = kpi === 'irr' ? currentOutput.project.projectKpis.unleveredIrr : currentOutput.project.projectKpis.npv;

    // Fallback if null (e.g. IRR not calculable)
    const baseVal = centerVal || 0;

    for (let i = -2; i <= 2; i++) {
      const factor = 1 + (i * rangeX / 2); // Simple linear steps
      const label = `${(factor * 100 - 100).toFixed(0)}%`;

      // Mock sensitivity result
      const impact = i * (kpi === 'irr' ? 0.02 : 1000000);

      results.push({
        name: label,
        value: baseVal + impact,
        base: baseVal,
      });
    }
    return results;
  }, [kpi, rangeX, currentOutput]);

  const kpiOptions = [
    { value: 'irr', label: t('financial.unleveredIrr') },
    { value: 'npv', label: t('financial.npv') },
    { value: 'equityMultiple', label: t('financial.equityMultiple') },
  ];

  const variableOptions = [
    { value: 'occupancy', label: t('operations.occupancyRate') },
    { value: 'adr', label: t('operations.avgDailyRate') },
    { value: 'construction', label: t('construction.hardCosts') },
    { value: 'opex', label: t('financial.operatingExpenses') },
  ];

  return (
    <div className="sensitivity-panel card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Settings2 size={24} className="text-primary" />
          <h2 style={{ margin: 0 }}>{t('analysis.sensitivity.title')}</h2>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsRunning(true)}
          disabled={isRunning}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isRunning ? <Loader2 className="spin" size={18} /> : <PlayCircle size={18} />}
          {isRunning ? t('analysis.sensitivity.calculating') : t('analysis.sensitivity.runAnalysis')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Variable X Configuration */}
        <div className="p-4 bg-surface-hover rounded-lg border border-border">
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {t('analysis.sensitivity.variableX')}
          </h4>
          <div className="space-y-4">
            <select
              value={variableX}
              onChange={(e) => setVariableX(e.target.value)}
              className="w-full p-2 rounded border border-border bg-surface"
            >
              {variableOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">Range:</span>
              <select
                value={rangeX}
                onChange={(e) => setRangeX(parseFloat(e.target.value))}
                className="flex-1 p-2 rounded border border-border bg-surface"
              >
                <option value={0.05}>+/- 5%</option>
                <option value={0.10}>+/- 10%</option>
                <option value={0.20}>+/- 20%</option>
              </select>
            </div>
          </div>
        </div>

        {/* KPI Selection */}
        <div className="p-4 bg-surface-hover rounded-lg border border-border">
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {t('analysis.sensitivity.displayKpi')}
          </h4>
          <select
            value={kpi}
            onChange={(e) => setKpi(e.target.value)}
            className="w-full p-2 rounded border border-border bg-surface"
          >
            {kpiOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

        </div>
      </div>

      <div style={{ height: '400px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
            <XAxis
              dataKey="name"
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)' }}
            />
            <YAxis
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)' }}
              tickFormatter={(val) => kpi === 'irr' ? `${(val * 100).toFixed(0)}%` : val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
              formatter={(value: number) => kpi === 'irr' ? formatPercent(value, lang) : formatCurrency(value, lang)}
              labelStyle={{ color: 'var(--text-primary)' }}
            />
            <Legend />
            <Bar dataKey="value" name={kpiOptions.find(o => o.value === kpi)?.label || 'Value'} fill="var(--primary)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="base" name={t('common.base')} fill="var(--text-tertiary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
