/**
 * Comparison View component (v5.3).
 * 
 * Displays side-by-side comparison of 2-3 selected scenarios with highlighted differences.
 */

import { useState, useMemo } from 'react';
import { useScenarioLibrary } from '../ui/hooks/useScenarioLibrary';
import { runFullModel } from '../engines/pipeline/modelPipeline';
import { SectionCard } from '../components/ui/SectionCard';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface ComparisonViewProps {
  // Optional: Can receive current input for comparison
  currentInput?: any;
}

export function ComparisonView({}: ComparisonViewProps) {
  const { scenarios, loading } = useScenarioLibrary();
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);

  // Calculate outputs for selected scenarios
  const comparisonData = useMemo(() => {
    if (selectedScenarioIds.length === 0) return [];

    return selectedScenarioIds
      .map((id) => {
        const scenario = scenarios.find((s) => s.id === id);
        if (!scenario) return null;

        try {
          const output = runFullModel(scenario.modelConfig);
          return {
            scenario,
            kpis: output.project.projectKpis,
            output,
          };
        } catch (error) {
          console.error(`Error running model for scenario ${scenario.name}:`, error);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [selectedScenarioIds, scenarios]);

  const handleScenarioToggle = (scenarioId: string) => {
    setSelectedScenarioIds((prev) => {
      if (prev.includes(scenarioId)) {
        return prev.filter((id) => id !== scenarioId);
      } else {
        // Limit to 3 scenarios
        if (prev.length >= 3) {
          return prev;
        }
        return [...prev, scenarioId];
      }
    });
  };

  const getDifferenceColor = (value1: number | null, value2: number | null): string => {
    if (value1 === null || value2 === null) return 'var(--text-primary)';
    if (value1 > value2) return 'var(--color-success, #10b981)'; // Green for higher
    if (value1 < value2) return 'var(--color-error, #ef4444)'; // Red for lower
    return 'var(--text-primary)';
  };

  const formatKpiValue = (value: number | null): string => {
    if (value === null) return 'N/A';
    if (Math.abs(value) >= 1000000) return formatCurrency(value);
    if (Math.abs(value) >= 1) return value.toFixed(2);
    return formatPercent(value);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading scenarios...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>
          Scenario Comparison
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          Select up to 3 scenarios to compare side-by-side.
        </p>
      </div>

      {/* Scenario Selection */}
      <SectionCard title="Select Scenarios">
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
              No scenarios available. Create scenarios in the Scenario Library.
            </div>
          )}
        </div>
      </SectionCard>

      {/* Comparison Grid */}
      {comparisonData.length > 0 && (
        <SectionCard title="KPI Comparison">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${comparisonData.length}, 1fr)`,
              gap: '1.5rem',
              overflowX: 'auto',
            }}
          >
            {comparisonData.map((data, index) => {
              const baseKpis = comparisonData[0]?.kpis;
              const isBase = index === 0;

              return (
                <div
                  key={data.scenario.id}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'var(--surface)',
                    border: `2px solid ${isBase ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <h3
                    style={{
                      margin: '0 0 1rem 0',
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: '0.75rem',
                    }}
                  >
                    {data.scenario.name}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* NPV */}
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-secondary)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        NPV
                      </div>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 600,
                          color: !isBase
                            ? getDifferenceColor(data.kpis.npv, baseKpis?.npv ?? 0)
                            : 'var(--text-primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatKpiValue(data.kpis.npv)}
                      </div>
                    </div>

                    {/* IRR */}
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-secondary)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Unlevered IRR
                      </div>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 600,
                          color: !isBase
                            ? getDifferenceColor(data.kpis.unleveredIrr, baseKpis?.unleveredIrr ?? null)
                            : 'var(--text-primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {data.kpis.unleveredIrr !== null ? formatPercent(data.kpis.unleveredIrr) : 'N/A'}
                      </div>
                    </div>

                    {/* Equity Multiple */}
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-secondary)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Equity Multiple
                      </div>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 600,
                          color: !isBase
                            ? getDifferenceColor(data.kpis.equityMultiple, baseKpis?.equityMultiple ?? 0)
                            : 'var(--text-primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {data.kpis.equityMultiple.toFixed(2)}x
                      </div>
                    </div>

                    {/* Payback Period */}
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-secondary)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Payback Period
                      </div>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 600,
                          color: !isBase
                            ? getDifferenceColor(
                                data.kpis.paybackPeriod,
                                baseKpis?.paybackPeriod ?? null
                              )
                            : 'var(--text-primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {data.kpis.paybackPeriod !== null
                          ? `${data.kpis.paybackPeriod.toFixed(1)} years`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {selectedScenarioIds.length === 0 && (
        <SectionCard title="Comparison">
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Select scenarios above to see side-by-side comparison.
          </div>
        </SectionCard>
      )}
    </div>
  );
}

