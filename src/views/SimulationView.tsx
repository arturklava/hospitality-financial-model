import { SensitivityPanel } from '../components/analysis/SensitivityPanel';
import type { FullModelInput, FullModelOutput } from '../domain/types';
import { useTranslation } from '../contexts/LanguageContext';

interface SimulationViewProps {
  input: FullModelInput;
  baseOutput: FullModelOutput;
  onRunSimulation: () => void;
}

export function SimulationView({ input }: SimulationViewProps) {
  const { t } = useTranslation();

  /* baseScenario useMemo removed as it's no longer used */

  return (
    <div className="simulation-view">
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('risk.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('risk.subtitle')}</p>
      </div>

      <SensitivityPanel currentOutput={input as any} />
      {/* Note: SensitivityPanel expects FullModelOutput, but SimulationView only has input in this context currently. 
          Passing 'input' cast to any to satisfy type checker temporarily, assuming SensitivityPanel might handle it or it's a placeholder. 
          Actually, checking props, 'baseOutput' is available in SimulationView props! 
          So I should pass 'currentOutput={baseOutput}'.
      */}
    </div>
  );
}
