import { useMemo } from 'react';
import { SensitivityPanel } from '../components/analysis/SensitivityPanel';
import type { FullModelInput, FullModelOutput, NamedScenario } from '../domain/types';
import { useTranslation } from '../contexts/LanguageContext';

interface SimulationViewProps {
  input: FullModelInput;
  baseOutput: FullModelOutput;
  onRunSimulation: () => void;
}

export function SimulationView({ input, baseOutput }: SimulationViewProps) {
  const { t } = useTranslation();

  const baseScenario: NamedScenario = useMemo(() => ({
    id: 'simulation-view',
    name: 'Simulation View Scenario',
    modelConfig: input,
  }), [input]);

  return (
    <div className="simulation-view">
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('risk.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('risk.subtitle')}</p>
      </div>

      <SensitivityPanel baseScenario={baseScenario} baseOutput={baseOutput} />
    </div>
  );
}
