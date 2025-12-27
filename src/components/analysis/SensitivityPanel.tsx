import { useMemo, useState } from 'react';
import { PlayCircle, Settings2 } from 'lucide-react';
import type { FullModelOutput, NamedScenario, SensitivityConfig, SensitivityResult, SensitivityVariable } from '@domain/types';
import { useTranslation } from '../../contexts/LanguageContext';
import { formatCurrency, formatPercent, type SupportedLocale } from '../../utils/formatters';
import { useSensitivityWorker } from '../../ui/hooks/useSensitivityWorker';
import { ProgressBar } from '../common/ProgressBar';

interface SensitivityPanelProps {
  baseScenario: NamedScenario;
  baseOutput?: FullModelOutput;
}

type KpiKey = 'npv' | 'irr' | 'equityMultiple';

const VARIABLE_OPTIONS: SensitivityVariable[] = [
  'occupancy',
  'adr',
  'discountRate',
  'exitCap',
  'initialInvestment',
  'debtAmount',
  'interestRate',
  'terminalGrowthRate'
];

export function SensitivityPanel({ baseScenario, baseOutput }: SensitivityPanelProps) {
  const { t, language } = useTranslation();
  const lang = language as SupportedLocale;
  const isPortuguese = language === 'pt';

  const { runSensitivity, isLoading, progress, error: workerError } = useSensitivityWorker();

  const [variableX, setVariableX] = useState<SensitivityVariable>('adr');
  const [variableY, setVariableY] = useState<SensitivityVariable | ''>('occupancy');
  const [rangeX, setRangeX] = useState<{ min: number; max: number; steps: number }>({ min: 0.8, max: 1.2, steps: 5 });
  const [rangeY, setRangeY] = useState<{ min: number; max: number; steps: number }>({ min: 0.8, max: 1.2, steps: 5 });
  const [kpi, setKpi] = useState<KpiKey>('npv');
  const [result, setResult] = useState<SensitivityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    setError(null);
    setResult(null);
    try {
      const config: Omit<SensitivityConfig, 'baseScenario'> = {
        variableX,
        rangeX,
        ...(variableY ? { variableY, rangeY } : {})
      };

      const sensitivityResult = await runSensitivity(baseScenario, config);
      setResult(sensitivityResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : workerError || 'Unknown error';
      setError(message);
    }
  };

  const variableOptions = useMemo(() => VARIABLE_OPTIONS.map(value => ({
    value,
    label: formatVariableLabel(value),
  })), []);

  const kpiOptions = [
    { value: 'npv', label: t('financial.npv') },
    { value: 'irr', label: t('financial.unleveredIrr') },
    { value: 'equityMultiple', label: t('financial.equityMultiple') },
  ];

  const matrix = result?.matrix;

  const xValues = useMemo(() => {
    if (!matrix || matrix.length === 0) return [];
    return matrix[0].map(cell => cell.variableXValue);
  }, [matrix]);

  const yValues = useMemo(() => {
    if (!matrix || matrix.length === 0) return [];
    return matrix.map(row => row[0]?.variableYValue);
  }, [matrix]);

  const formattedBaseKpi = baseOutput ? formatKpiValue(kpi, baseOutput.project.projectKpis, lang) : null;

  return (
    <div className="sensitivity-panel card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Settings2 size={24} className="text-primary" />
          <h2 style={{ margin: 0 }}>{t('analysis.sensitivity.title')}</h2>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleRunAnalysis}
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <PlayCircle size={18} />
          {t('analysis.sensitivity.runAnalysis')}
        </button>
      </div>

      <div className="mb-4 rounded-md border border-border bg-surface-hover p-4 text-sm text-secondary">
        <ul className="list-disc space-y-1 pl-5">
          <li>{isPortuguese ? 'Escolha as variáveis X e Y' : 'Choose X and Y variables'}</li>
          <li>{isPortuguese ? 'Clique em Executar para gerar a tabela de sensibilidade' : 'Click Run to generate the sensitivity table'}</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-4 bg-surface-hover rounded-lg border border-border">
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {t('analysis.sensitivity.variableX')}
          </h4>
          <div className="space-y-4">
            <select
              value={variableX}
              onChange={(e) => setVariableX(e.target.value as SensitivityVariable)}
              className="w-full p-2 rounded border border-border bg-surface"
              disabled={isLoading}
            >
              {variableOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-secondary">Min</label>
                <input
                  type="number"
                  value={rangeX.min}
                  step={0.01}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setRangeX({ ...rangeX, min: isNaN(value) ? rangeX.min : value });
                  }}
                  className="p-2 rounded border border-border bg-surface"
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-secondary">Max</label>
                <input
                  type="number"
                  value={rangeX.max}
                  step={0.01}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setRangeX({ ...rangeX, max: isNaN(value) ? rangeX.max : value });
                  }}
                  className="p-2 rounded border border-border bg-surface"
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-secondary">Steps</label>
                <input
                  type="number"
                  value={rangeX.steps}
                  min={1}
                  max={10}
                  onChange={(e) => setRangeX({ ...rangeX, steps: parseInt(e.target.value, 10) || 1 })}
                  className="p-2 rounded border border-border bg-surface"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-surface-hover rounded-lg border border-border">
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {t('analysis.sensitivity.variableY')}
          </h4>
          <div className="space-y-4">
            <select
              value={variableY}
              onChange={(e) => setVariableY(e.target.value as SensitivityVariable | '')}
              className="w-full p-2 rounded border border-border bg-surface"
              disabled={isLoading}
            >
              <option value="">{t('common.none')}</option>
              {variableOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {variableY && (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-secondary">Min</label>
                  <input
                    type="number"
                    value={rangeY.min}
                    step={0.01}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setRangeY({ ...rangeY, min: isNaN(value) ? rangeY.min : value });
                    }}
                    className="p-2 rounded border border-border bg-surface"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-secondary">Max</label>
                  <input
                    type="number"
                    value={rangeY.max}
                    step={0.01}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setRangeY({ ...rangeY, max: isNaN(value) ? rangeY.max : value });
                    }}
                    className="p-2 rounded border border-border bg-surface"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-secondary">Steps</label>
                  <input
                    type="number"
                    value={rangeY.steps}
                    min={1}
                    max={10}
                    onChange={(e) => setRangeY({ ...rangeY, steps: parseInt(e.target.value, 10) || 1 })}
                    className="p-2 rounded border border-border bg-surface"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-surface-hover rounded-lg border border-border">
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {t('analysis.sensitivity.displayKpi')}
          </h4>
          <select
            value={kpi}
            onChange={(e) => setKpi(e.target.value as KpiKey)}
            className="w-full p-2 rounded border border-border bg-surface"
            disabled={isLoading}
          >
            {kpiOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {formattedBaseKpi && (
            <div className="mt-4 text-sm text-secondary">
              <span className="font-medium text-primary">{t('common.base')}:</span> {formattedBaseKpi}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="mb-4">
          <ProgressBar value={progress} />
        </div>
      )}

      {(error || workerError) && (
        <div className="mb-4 text-sm text-error">{error || workerError}</div>
      )}

      <div style={{ minHeight: '420px' }}>
        {matrix && matrix.length > 0 ? (
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 text-secondary">{t('analysis.sensitivity.variableY')}</th>
                  {xValues.map((value, idx) => (
                    <th key={`x-${idx}`} className="text-right p-2 text-secondary">{formatVariableValue(value, variableX, lang)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, rowIdx) => (
                  <tr key={`row-${rowIdx}`} className="border-t border-border">
                    <th className="text-left p-2 text-secondary font-normal">
                      {formatVariableValue(yValues[rowIdx], variableY || 'occupancy', lang)}
                    </th>
                    {row.map((cell, colIdx) => (
                      <td key={`cell-${rowIdx}-${colIdx}`} className="p-2 text-right">
                        {formatKpiValue(kpi, cell.kpis, lang)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : result ? (
          <div className="grid grid-cols-1 gap-2">
            {result.runs.map((run, index) => (
              <div key={`run-${index}`} className="flex items-center justify-between p-2 rounded bg-surface-hover border border-border">
                <div className="text-sm text-secondary">
                  {formatVariableValue(run.variableXValue, variableX, lang)}
                  {run.variableYValue !== undefined && ` / ${formatVariableValue(run.variableYValue, variableY || 'occupancy', lang)}`}
                </div>
                <div className="font-medium">{formatKpiValue(kpi, run.kpis, lang)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-secondary" style={{ minHeight: '200px' }}>
            {t('risk.runSimulationToView')}
          </div>
        )}
      </div>
    </div>
  );
}

function formatVariableLabel(variable: SensitivityVariable): string {
  switch (variable) {
    case 'occupancy':
      return 'Occupancy';
    case 'adr':
      return 'ADR';
    case 'discountRate':
      return 'Discount Rate';
    case 'exitCap':
      return 'Exit Cap';
    case 'initialInvestment':
      return 'Initial Investment';
    case 'debtAmount':
      return 'Debt Amount';
    case 'interestRate':
      return 'Interest Rate';
    case 'terminalGrowthRate':
      return 'Terminal Growth Rate';
    default:
      return variable;
  }
}

function formatVariableValue(value: number | undefined, variable: SensitivityVariable, lang: SupportedLocale): string {
  if (value === undefined || value === null) return '-';

  switch (variable) {
    case 'occupancy':
    case 'adr':
    case 'debtAmount':
    case 'interestRate':
      return formatPercent(value - 1, lang, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    case 'discountRate':
    case 'terminalGrowthRate':
    case 'exitCap':
      return formatPercent(value, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    case 'initialInvestment':
      return formatCurrency(value, lang);
    default:
      return String(value);
  }
}

function formatKpiValue(kpi: KpiKey, kpis: FullModelOutput['project']['projectKpis'] | SensitivityResult['runs'][0]['kpis'], lang: SupportedLocale): string {
  switch (kpi) {
    case 'npv':
      return formatCurrency((kpis as any).npv, lang);
    case 'irr': {
      const value = (kpis as any).unleveredIrr;
      return value !== null ? formatPercent(value, lang) : '-';
    }
    case 'equityMultiple':
      return ((kpis as any).equityMultiple ?? 0).toFixed(2) + 'x';
    default:
      return '-';
  }
}
