import { SensitivityPanel } from '../components/analysis/SensitivityPanel';
import type { FullModelInput, FullModelOutput, NamedScenario } from '../domain/types';
import { useMemo } from 'react';

interface SimulationViewProps {
  input: FullModelInput;
  baseOutput: FullModelOutput;
  onRunSimulation: () => void;
}

export function SimulationView({ input }: SimulationViewProps) {
  // Construct a temporary NamedScenario for the SensitivityPanel
  const baseScenario: NamedScenario = useMemo(() => ({
    id: 'current-scenario',
    name: 'Current Scenario',
    modelConfig: input
  }), [input]);

  return (
    <div className="simulation-view">
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Risk & Analysis</h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>Sensitivity analysis and Monte Carlo simulations.</p>
      </div>

      <SensitivityPanel
        baseScenario={baseScenario}
      />
    </div>
  );
}
