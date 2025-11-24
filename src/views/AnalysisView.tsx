import { useState, useMemo } from 'react';
import type { FullModelInput } from '../domain/types';
import { runScenarioTriad } from '../engines/analysis/scenarioComparison';
import { PercentageSlider } from '../components/inputs/PercentageSlider';
import { SectionCard } from '../components/ui/SectionCard';
import { ScenarioCard } from '../components/analysis/ScenarioCard';
import { SkeletonCard } from '../components/common/Skeleton';
import { VarianceBridge } from '../components/analysis/VarianceBridge';

interface AnalysisViewProps {
  input: FullModelInput;
}

export function AnalysisView({ input }: AnalysisViewProps) {
  const [stressLevel, setStressLevel] = useState(0.10);

  // Run scenario triad analysis when input or stressLevel changes
  const triadResult = useMemo(() => {
    try {
      return runScenarioTriad(input, stressLevel);
    } catch (error) {
      console.error('Error running scenario triad:', error);
      return null;
    }
  }, [input, stressLevel]);

  return (
    <div className="analysis-view">
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Interactive Scenarios & Stress Testing</h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          Drag sliders to stress-test your model and compare scenarios side-by-side
        </p>
      </div>

      {/* Section 1: Sensitivity Controls */}
      <SectionCard title="Sensitivity Controls">
        <PercentageSlider
          value={stressLevel}
          onChange={setStressLevel}
          min={0}
          max={0.5}
          step={0.01}
          label="Stress Level"
        />
      </SectionCard>

      {/* Section 2: Scenario Outcomes */}
      <SectionCard title="Scenario Outcomes">
        {triadResult ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}>
            <ScenarioCard
              variant="stress"
              title="Stress Scenario"
              kpis={triadResult.stress}
              baseKpis={triadResult.base}
            />
            <ScenarioCard
              variant="base"
              title="Base Scenario"
              kpis={triadResult.base}
            />
            <ScenarioCard
              variant="upside"
              title="Upside Scenario"
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
      </SectionCard>

      {/* Section 3: Compare Scenarios */}
      {triadResult && (
        <SectionCard title="Compare Scenarios">
          <div style={{ marginBottom: '1.5rem' }}>
            <VarianceBridge
              baseNpv={triadResult.base.npv}
              targetNpv={triadResult.upside.npv}
              deltas={[
                {
                  label: 'Stress Delta',
                  value: triadResult.stress.npv - triadResult.base.npv,
                },
                {
                  label: 'Upside Delta',
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
              }}>Base NPV</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                ${(triadResult.base.npv / 1000000).toFixed(2)}M
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
              }}>Stress NPV</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: '#f44336',
              }}>
                ${(triadResult.stress.npv / 1000000).toFixed(2)}M
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#f44336',
                marginTop: '0.25rem',
              }}>
                (${((triadResult.stress.npv - triadResult.base.npv) / 1000000).toFixed(2)}M)
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
              }}>Upside NPV</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: '#4CAF50',
              }}>
                ${(triadResult.upside.npv / 1000000).toFixed(2)}M
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#4CAF50',
                marginTop: '0.25rem',
              }}>
                (+${((triadResult.upside.npv - triadResult.base.npv) / 1000000).toFixed(2)}M)
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
