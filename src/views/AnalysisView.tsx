import { useState, useEffect } from 'react';
import type { FullModelInput } from '../domain/types';
import type { ScenarioTriadResult } from '../engines/analysis/scenarioComparison';
import { PercentageSlider } from '../components/inputs/PercentageSlider';
import { SectionCard } from '../components/ui/SectionCard';
import { ScenarioCard } from '../components/analysis/ScenarioCard';
import { SkeletonCard } from '../components/common/Skeleton';
import { VarianceBridge } from '../components/analysis/VarianceBridge';
import { useTranslation } from '../contexts/LanguageContext';
import { getLocaleConfig } from '../utils/formatters';
import { useSensitivityWorker } from '../ui/hooks/useSensitivityWorker';

interface AnalysisViewProps {
  input: FullModelInput;
}

/**
 * Formats a number as currency.
 */
function formatCurrency(value: number, language: 'pt' | 'en'): string {
  const { locale, currency } = getLocaleConfig(language);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function AnalysisView({ input }: AnalysisViewProps) {
  const [stressLevel, setStressLevel] = useState(0.10);
  const { t, language } = useTranslation();
  const { runScenarioTriad, isLoading, progress, error: workerError } = useSensitivityWorker();
  const [triadResult, setTriadResult] = useState<ScenarioTriadResult | null>(null);

  // Run scenario triad analysis when input or stressLevel changes
  useEffect(() => {
    let isMounted = true;
    const calculate = async () => {
      try {
        const result = await runScenarioTriad(input, stressLevel);
        if (isMounted) {
          setTriadResult(result);
        }
      } catch (error) {
        console.error('Error running scenario triad:', error);
      }
    };
    calculate();
    return () => { isMounted = false; };
  }, [input, stressLevel, runScenarioTriad]);

  return (
    <div className="analysis-view" style={{ position: 'relative' }}>
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'var(--primary-soft)',
          zIndex: 9999,
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--primary)',
            transition: 'width 0.3s ease-out',
          }} />
        </div>
      )}

      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('analysis.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          {t('analysis.subtitle')}
        </p>
      </div>

      {/* Section 1: Sensitivity Controls */}
      <SectionCard title={t('analysis.sensitivityControls')}>
        <PercentageSlider
          value={stressLevel}
          onChange={setStressLevel}
          min={0}
          max={0.5}
          step={0.01}
          label={t('analysis.stressLevel')}
          disabled={isLoading}
        />
        {workerError && (
          <div style={{
            color: '#f44336',
            marginTop: '1rem',
            fontSize: '0.875rem',
            padding: '0.75rem',
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(244, 67, 54, 0.2)'
          }}>
            {workerError}
          </div>
        )}
      </SectionCard>

      {/* Section 2: Scenario Outcomes */}
      <SectionCard title={t('analysis.scenarioOutcomes')}>
        <div style={{ opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          {triadResult ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}>
              <ScenarioCard
                variant="stress"
                title={t('analysis.stressScenario')}
                kpis={triadResult.stress}
                baseKpis={triadResult.base}
              />
              <ScenarioCard
                variant="base"
                title={t('analysis.baseScenario')}
                kpis={triadResult.base}
              />
              <ScenarioCard
                variant="upside"
                title={t('analysis.upsideScenario')}
                kpis={triadResult.upside}
                baseKpis={triadResult.base}
              />
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Section 3: Compare Scenarios */}
      <div style={{ opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        {triadResult && (
          <SectionCard title={t('analysis.compareScenarios')}>
            <div style={{ marginBottom: '1.5rem' }}>
              <VarianceBridge
                baseNpv={triadResult.base.npv}
                targetNpv={triadResult.upside.npv}
                deltas={[
                  {
                    label: t('analysis.stressDelta'),
                    value: triadResult.stress.npv - triadResult.base.npv,
                  },
                  {
                    label: t('analysis.upsideDelta'),
                    value: triadResult.upside.npv - triadResult.base.npv,
                  },
                ]}
                height={400}
              />
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginTop: '1.5rem',
            }}>
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--surface-hover)',
                borderRadius: 'var(--radius)',
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.25rem',
                }}>{t('analysis.baseNpv')}</div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  {formatCurrency(triadResult.base.npv, language)}
                </div>
              </div>
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--surface-hover)',
                borderRadius: 'var(--radius)',
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.25rem',
                }}>{t('analysis.stressNpv')}</div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: '#f44336',
                }}>
                  {formatCurrency(triadResult.stress.npv, language)}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#f44336',
                  marginTop: '0.25rem',
                }}>
                  ({formatCurrency(triadResult.stress.npv - triadResult.base.npv, language)})
                </div>
              </div>
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--surface-hover)',
                borderRadius: 'var(--radius)',
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.25rem',
                }}>{t('analysis.upsideNpv')}</div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: '#4CAF50',
                }}>
                  {formatCurrency(triadResult.upside.npv, language)}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#4CAF50',
                  marginTop: '0.25rem',
                }}>
                  (+{formatCurrency(triadResult.upside.npv - triadResult.base.npv, language)})
                </div>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
