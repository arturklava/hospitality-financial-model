/**
 * Comparison View component (v6.0).
 * 
 * Two modes:
 * 1. "Snapshot vs Live" - Compare saved Scenario A against current model output
 * 2. "Scenario Library" - Compare 2-3 saved scenarios side-by-side
 */

import { useState, useMemo } from 'react';
import { useScenarioLibrary } from '../ui/hooks/useScenarioLibrary';
import { useScenarioSnapshot } from '../ui/hooks/useScenarioSnapshot';
import { useScenarioTriad } from '../ui/hooks/useScenarioTriad';
import { useTranslation } from '../contexts/LanguageContext';

import { compareScenarios } from '../engines/analysis/scenarioComparison';
import { SectionCard } from '../components/ui/SectionCard';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { Camera, Layers, ArrowUp, ArrowDown, Minus, Trash2, AlertTriangle } from 'lucide-react';
import type { FullModelInput, ProjectKpis } from '../domain/types';

interface ComparisonViewProps {
  currentInput?: FullModelInput;
  currentOutput?: { project: { projectKpis: ProjectKpis } };
}

type ComparisonMode = 'snapshot' | 'library' | 'triad';

export function ComparisonView({ currentInput, currentOutput }: ComparisonViewProps) {
  const { t } = useTranslation();
  const { scenarios, loading } = useScenarioLibrary();
  const { snapshot, hasSnapshot, saveSnapshot, clearSnapshot } = useScenarioSnapshot();
  const { triad, error: triadError } = useScenarioTriad(currentInput);
  const [mode, setMode] = useState<ComparisonMode>('triad'); // Default to triad view
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);

  // Current live KPIs
  const liveKpis = currentOutput?.project?.projectKpis;

  // Calculate outputs for selected scenarios (library mode)
  const comparisonData = useMemo(() => {
    if (mode !== 'library' || selectedScenarioIds.length === 0) return [];

    // Prepare inputs for the comparison engine
    const inputs = selectedScenarioIds
      .map((id) => {
        const scenario = scenarios.find((s) => s.id === id);
        if (!scenario) return null;
        return {
          id: scenario.id,
          name: scenario.name,
          config: scenario.modelConfig,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (inputs.length === 0) return [];

    try {
      // Run comparison with strict isolation
      const results = compareScenarios(inputs);

      // Map back to view structure
      return results.map((result) => {
        const scenario = scenarios.find((s) => s.id === result.id)!;
        return {
          scenario,
          kpis: result.kpis,
        };
      });
    } catch (error) {
      console.error('Error running scenario comparison:', error);
      return [];
    }
  }, [selectedScenarioIds, scenarios, mode]);

  const handleScenarioToggle = (scenarioId: string) => {
    setSelectedScenarioIds((prev) => {
      if (prev.includes(scenarioId)) {
        return prev.filter((id) => id !== scenarioId);
      } else {
        if (prev.length >= 3) return prev;
        return [...prev, scenarioId];
      }
    });
  };

  const handleSaveSnapshot = () => {
    if (currentInput) {
      const name = `${t('comparison.snapshot.namePrefix')} ${new Date().toLocaleTimeString()}`;
      saveSnapshot(name, currentInput);
    }
  };

  const kpiLabels = useMemo(
    () => ({
      npv: t('financial.short.npv'),
      unleveredIrr: t('financial.short.unleveredIrr'),
      equityMultiple: t('financial.short.equityMultiple'),
      paybackPeriod: t('financial.short.paybackPeriod'),
      years: t('common.years'),
      yearsShort: t('common.yearsShort'),
      notAvailable: t('common.notAvailable'),
    }),
    [t]
  );

  const notAvailable = kpiLabels.notAvailable;

  const formatDelta = (current: number | null, baseline: number | null): { value: string; color: string; icon: 'up' | 'down' | 'same' } => {
    if (current === null || baseline === null) return { value: notAvailable, color: 'var(--text-secondary)', icon: 'same' };
    const delta = current - baseline;
    const pctChange = baseline !== 0 ? (delta / Math.abs(baseline)) * 100 : 0;

    if (Math.abs(pctChange) < 0.1) {
      return { value: '—', color: 'var(--text-secondary)', icon: 'same' };
    }

    const sign = delta > 0 ? '+' : '';
    const color = delta > 0 ? 'var(--success)' : 'var(--danger)';
    const icon = delta > 0 ? 'up' : 'down';

    // For large values, show currency
    if (Math.abs(baseline) >= 1000000) {
      return { value: `${sign}${formatCurrency(delta)}`, color, icon };
    }
    // For percentages
    if (Math.abs(baseline) < 1) {
      return { value: `${sign}${(delta * 100).toFixed(2)}pp`, color, icon };
    }
    return { value: `${sign}${pctChange.toFixed(1)}%`, color, icon };
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
            {t('comparison.header.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {t('comparison.header.subtitle')}
          </p>
        </div>

        {/* Save Snapshot Button */}
        {mode === 'snapshot' && currentInput && (
          <button
            onClick={handleSaveSnapshot}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Camera size={16} />
            {hasSnapshot ? t('comparison.snapshot.updateButton') : t('comparison.snapshot.saveAsButton')}
          </button>
        )}
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setMode('triad')}
          className={`tab-trigger ${mode === 'triad' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Layers size={16} />
          {t('comparison.tabs.triad')}
        </button>
        <button
          onClick={() => setMode('snapshot')}
          className={`tab-trigger ${mode === 'snapshot' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Camera size={16} />
          {t('comparison.tabs.snapshot')}
        </button>
        <button
          onClick={() => setMode('library')}
          className={`tab-trigger ${mode === 'library' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Layers size={16} />
          {t('comparison.tabs.library')}
        </button>
      </div>

      {/* TRIAD MODE - Base vs Stress vs Upside */}
      {mode === 'triad' && (
        <>
          {triadError ? (
            <SectionCard title={t('comparison.error.title')}>
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
                <AlertTriangle size={48} style={{ marginBottom: '1rem' }} />
                <p>
                  {t('comparison.error.failedTriad')}: {triadError.message}
                </p>
              </div>
            </SectionCard>
          ) : !triad ? (
            <SectionCard title={t('comparison.loading.title')}>
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {t('comparison.loading.message')}
              </div>
            </SectionCard>
          ) : (
            <SectionCard title={t('comparison.triad.title')}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                {t('comparison.triad.description')}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                {/* Stress Scenario */}
                <div className="card" style={{ padding: '1.5rem', border: '2px solid var(--danger)', opacity: 0.95 }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', color: 'var(--danger)' }}>
                    {t('comparison.triad.stressTitle')}
                  </h3>
                  <KpiDisplay kpis={triad.stress} labels={kpiLabels} />
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <DeltaIndicator
                      label={t('comparison.triad.npvVsBase')}
                      delta={formatDelta(triad.stress.npv, triad.base.npv)}
                      prefix={t('comparison.deltaPrefix')}
                    />
                  </div>
                </div>

                {/* Base Scenario */}
                <div className="card" style={{ padding: '1.5rem', border: '2px solid var(--primary)' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', color: 'var(--primary)' }}>
                    {t('comparison.triad.baseTitle')}
                  </h3>
                  <KpiDisplay kpis={triad.base} labels={kpiLabels} />
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {t('comparison.triad.referenceLabel')}
                    </span>
                  </div>
                </div>

                {/* Upside Scenario */}
                <div className="card" style={{ padding: '1.5rem', border: '2px solid var(--success)', opacity: 0.95 }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', color: 'var(--success)' }}>
                    {t('comparison.triad.upsideTitle')}
                  </h3>
                  <KpiDisplay kpis={triad.upside} labels={kpiLabels} />
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <DeltaIndicator
                      label={t('comparison.triad.npvVsBase')}
                      delta={formatDelta(triad.upside.npv, triad.base.npv)}
                      prefix={t('comparison.deltaPrefix')}
                    />
                  </div>
                </div>
              </div>

              {/* Delta Summary Table */}
              <div style={{ marginTop: '2rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>{t('comparison.table.metric')}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{t('comparison.table.stress')}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>{t('comparison.table.base')}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{t('comparison.table.upside')}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                        {t('comparison.table.deltaStress')}
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                        {t('comparison.table.deltaUpside')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem' }}>{t('financial.short.npv')}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatCurrency(triad.stress.npv)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(triad.base.npv)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatCurrency(triad.upside.npv)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--danger)' }}>{formatCurrency(triad.stress.npv - triad.base.npv)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success)' }}>+{formatCurrency(triad.upside.npv - triad.base.npv)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem' }}>{t('financial.short.unleveredIrr')}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{triad.stress.unleveredIrr !== null ? formatPercent(triad.stress.unleveredIrr) : kpiLabels.notAvailable}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{triad.base.unleveredIrr !== null ? formatPercent(triad.base.unleveredIrr) : kpiLabels.notAvailable}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{triad.upside.unleveredIrr !== null ? formatPercent(triad.upside.unleveredIrr) : kpiLabels.notAvailable}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--danger)' }}>
                        {triad.stress.unleveredIrr !== null && triad.base.unleveredIrr !== null
                          ? `${((triad.stress.unleveredIrr - triad.base.unleveredIrr) * 100).toFixed(2)}pp`
                          : kpiLabels.notAvailable}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success)' }}>
                        {triad.upside.unleveredIrr !== null && triad.base.unleveredIrr !== null
                          ? `+${((triad.upside.unleveredIrr - triad.base.unleveredIrr) * 100).toFixed(2)}pp`
                          : kpiLabels.notAvailable}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem' }}>{t('financial.short.equityMultiple')}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{triad.stress.equityMultiple.toFixed(2)}x</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{triad.base.equityMultiple.toFixed(2)}x</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{triad.upside.equityMultiple.toFixed(2)}x</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--danger)' }}>{(triad.stress.equityMultiple - triad.base.equityMultiple).toFixed(2)}x</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success)' }}>+{(triad.upside.equityMultiple - triad.base.equityMultiple).toFixed(2)}x</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.75rem' }}>{t('financial.short.paybackPeriod')}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{triad.stress.paybackPeriod !== null ? `${triad.stress.paybackPeriod.toFixed(1)}${kpiLabels.yearsShort}` : kpiLabels.notAvailable}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{triad.base.paybackPeriod !== null ? `${triad.base.paybackPeriod.toFixed(1)}${kpiLabels.yearsShort}` : kpiLabels.notAvailable}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{triad.upside.paybackPeriod !== null ? `${triad.upside.paybackPeriod.toFixed(1)}${kpiLabels.yearsShort}` : kpiLabels.notAvailable}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: triad.stress.paybackPeriod !== null && triad.base.paybackPeriod !== null ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        {triad.stress.paybackPeriod !== null && triad.base.paybackPeriod !== null
                          ? `+${(triad.stress.paybackPeriod - triad.base.paybackPeriod).toFixed(1)}${kpiLabels.yearsShort}`
                          : kpiLabels.notAvailable}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: triad.upside.paybackPeriod !== null && triad.base.paybackPeriod !== null ? 'var(--success)' : 'var(--text-secondary)' }}>
                        {triad.upside.paybackPeriod !== null && triad.base.paybackPeriod !== null
                          ? `${(triad.upside.paybackPeriod - triad.base.paybackPeriod).toFixed(1)}${kpiLabels.yearsShort}`
                          : kpiLabels.notAvailable}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* SNAPSHOT MODE */}
      {mode === 'snapshot' && (
        <>
          {!hasSnapshot ? (
            <SectionCard title={t('comparison.snapshot.ctaTitle')}>
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Camera size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'var(--font-display)' }}>{t('comparison.snapshot.emptyTitle')}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem 0' }}>{t('comparison.snapshot.emptyDescription')}</p>
                <button
                  onClick={handleSaveSnapshot}
                  className="btn btn-primary"
                  disabled={!currentInput}
                >
                  <Camera size={16} style={{ marginRight: '0.5rem' }} />
                  {t('comparison.snapshot.saveButton')}
                </button>
              </div>
            </SectionCard>
          ) : snapshot && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: '1.5rem' }}>
              {/* Scenario A (Snapshot) */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.125rem' }}>
                      {t('comparison.snapshot.savedTitle')}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(snapshot.savedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={clearSnapshot}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}
                    title={t('comparison.snapshot.clearTooltip')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <KpiDisplay kpis={snapshot.kpis} labels={kpiLabels} />
              </div>

              {/* Delta Column */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', paddingTop: '3rem' }}>
                <DeltaIndicator
                  label={t('financial.short.npv')}
                  delta={formatDelta(liveKpis?.npv ?? null, snapshot.kpis.npv)}
                  prefix={t('comparison.deltaPrefix')}
                />
                <DeltaIndicator
                  label={t('financial.short.unleveredIrr')}
                  delta={formatDelta(liveKpis?.unleveredIrr ?? null, snapshot.kpis.unleveredIrr)}
                  prefix={t('comparison.deltaPrefix')}
                />
                <DeltaIndicator
                  label={t('financial.short.equityMultiple')}
                  delta={formatDelta(liveKpis?.equityMultiple ?? null, snapshot.kpis.equityMultiple)}
                  prefix={t('comparison.deltaPrefix')}
                />
              </div>

              {/* Current (Live) */}
              <div className="card" style={{ padding: '1.5rem', border: '2px solid var(--primary)' }}>
                <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--primary)' }}>
                    {t('comparison.snapshot.currentTitle')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('comparison.snapshot.currentSubtitle')}</p>
                </div>
                {liveKpis ? (
                  <KpiDisplay kpis={liveKpis} labels={kpiLabels} />
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {t('comparison.snapshot.noLiveResults')}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* LIBRARY MODE */}
      {mode === 'library' && (
        <>
          <SectionCard title={t('comparison.library.selectionTitle')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {scenarios.map((scenario) => {
                const isSelected = selectedScenarioIds.includes(scenario.id);
                const isDisabled = !isSelected && selectedScenarioIds.length >= 3;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => !isDisabled && handleScenarioToggle(scenario.id)}
                    disabled={isDisabled}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: isSelected ? 'var(--primary)' : 'var(--surface)',
                      color: isSelected ? 'white' : 'var(--text-primary)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: isSelected ? 600 : 400,
                      opacity: isDisabled ? 0.5 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {scenario.name}
                  </button>
                );
              })}
              {scenarios.length === 0 && (
                <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                  {t('comparison.library.empty')}
                </div>
              )}
            </div>
          </SectionCard>

          {comparisonData.length > 0 && (
            <SectionCard title={t('comparison.library.kpiComparison')}>
              {/* Identical Scenarios Warning */}
              {comparisonData.length > 1 && comparisonData.some((d, i) =>
                comparisonData.some((other, j) => i !== j && d.kpis.npv === other.kpis.npv)
              ) && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    border: '1px solid var(--warning)',
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--warning)'
                  }}>
                    <AlertTriangle size={16} />
                    <span style={{ fontSize: '0.875rem' }}>{t('comparison.library.identicalWarning')}</span>
                  </div>
                )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${comparisonData.length}, 1fr)`,
                  gap: '1.5rem',
                }}
              >
                {comparisonData.map((data, index) => {
                  const isBase = index === 0;
                  return (
                    <div
                      key={data.scenario.id}
                      className="card"
                      style={{
                        padding: '1.5rem',
                        margin: 0,
                        border: isBase ? '2px solid var(--primary)' : 'none',
                      }}
                    >
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                        {data.scenario.name}
                        {isBase && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '0.5rem' }}>
                            ({t('common.base')})
                          </span>
                        )}
                      </h3>
                      <KpiDisplay kpis={data.kpis} labels={kpiLabels} />
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

// KPI Display Component
function KpiDisplay({
  kpis,
  labels,
}: {
  kpis: ProjectKpis;
  labels: {
    npv: string;
    unleveredIrr: string;
    equityMultiple: string;
    paybackPeriod: string;
    years: string;
    yearsShort: string;
    notAvailable: string;
  };
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <KpiRow label={labels.npv} value={formatCurrency(kpis.npv)} />
      <KpiRow label={labels.unleveredIrr} value={kpis.unleveredIrr !== null ? formatPercent(kpis.unleveredIrr) : labels.notAvailable} />
      <KpiRow label={labels.equityMultiple} value={`${kpis.equityMultiple.toFixed(2)}x`} />
      <KpiRow
        label={labels.paybackPeriod}
        value={kpis.paybackPeriod !== null ? `${kpis.paybackPeriod.toFixed(1)} ${labels.years}` : labels.notAvailable}
      />
    </div>
  );
}

function KpiRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}

// Delta Indicator Component
function DeltaIndicator({
  label,
  delta,
  prefix = 'Δ',
}: {
  label: string;
  delta: { value: string; color: string; icon: 'up' | 'down' | 'same' };
  prefix?: string;
}) {
  const Icon = delta.icon === 'up' ? ArrowUp : delta.icon === 'down' ? ArrowDown : Minus;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
        {prefix} {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: delta.color, fontWeight: 600, fontSize: '0.875rem' }}>
        <Icon size={14} />
        {delta.value}
      </div>
    </div>
  );
}


