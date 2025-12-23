/**
 * Construction View component (v3.6: Construction & Variance UI).
 * 
 * Displays construction drawdown curves and funding source distribution.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { generateDrawdownCurve, distributeFunding } from '../engines/project/constructionEngine';
import { getLocaleConfig } from '../utils/formatters';
import { InputGroup } from '../components/ui/InputGroup';
import { CurrencyInput } from '../components/inputs/CurrencyInput';
import { ToggleGroup } from '../components/inputs/ToggleGroup';
import type { FullModelInput } from '../domain/types';
import { normalizeCapitalData } from '../domain/capitalHelpers';
import { useTranslation } from '../contexts/LanguageContext';

interface ConstructionViewProps {
  input: FullModelInput;
  onProjectConfigChange?: (config: Partial<FullModelInput['projectConfig']>) => void;
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

export function ConstructionView({ input, onProjectConfigChange }: ConstructionViewProps) {
  const projectConfig = input.projectConfig;
  const capitalConfig = input.capitalConfig;
  const { t, language } = useTranslation();

  // Local state for controls
  // Split budget into hard costs and soft costs (default: 70% hard, 30% soft)
  const totalBudget = projectConfig.initialInvestment;
  const [hardCosts, setHardCosts] = useState(Math.round(totalBudget * 0.7));
  const [softCosts, setSoftCosts] = useState(Math.round(totalBudget * 0.3));
  const [duration, setDuration] = useState(projectConfig.constructionDuration ?? 0);
  const [curveShape, setCurveShape] = useState<'s-curve' | 'linear'>(projectConfig.constructionCurve ?? 's-curve');

  // Sync local controls when the upstream project config changes (e.g., scenario switch)
  useEffect(() => {
    const newBudget = projectConfig.initialInvestment ?? 0;
    const currentTotal = hardCosts + softCosts;
    const hardCostRatio = currentTotal > 0 ? hardCosts / currentTotal : 0.7;
    const updatedHardCosts = Math.round(newBudget * hardCostRatio);
    const updatedSoftCosts = Math.max(0, Math.round(newBudget - updatedHardCosts));

    setHardCosts(updatedHardCosts);
    setSoftCosts(updatedSoftCosts);
    setDuration(projectConfig.constructionDuration ?? 0);
    setCurveShape(projectConfig.constructionCurve ?? 's-curve');
    // We intentionally exclude hard/soft costs to preserve the previous ratio when syncing
    // to a newly loaded project configuration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    projectConfig.initialInvestment,
    projectConfig.constructionDuration,
    projectConfig.constructionCurve,
  ]);

  // Calculate total budget from hard + soft costs
  const budget = hardCosts + softCosts;

  // Calculate drawdown curve
  const drawdownCurve = useMemo(() => {
    if (duration <= 0 || budget <= 0) {
      return [];
    }
    const result = generateDrawdownCurve(budget, duration, curveShape);
    if (!result.ok) {
      console.error('Error generating drawdown curve:', result.error);
      return [];
    }
    if (result.warnings.length > 0) {
      console.warn('Drawdown curve warnings:', result.warnings.join('; '));
    }
    return result.data;
  }, [budget, duration, curveShape]);

  // Calculate funding distribution (debt vs equity)
  const fundingData = useMemo(() => {
    if (drawdownCurve.length === 0) {
      return [];
    }

    // Get debt and equity capacity from capital structure
    const normalized = normalizeCapitalData(capitalConfig);
    const totalDebt = normalized.totalDebt;
    const totalEquity = normalized.totalEquity;

    const distributionResult = distributeFunding(
      drawdownCurve,
      totalDebt,
      totalEquity,
      'equity_first'
    );

    if (!distributionResult.ok) {
      console.error('Error distributing funding:', distributionResult.error);
      return drawdownCurve.map((drawdown, index) => ({
        month: index + 1,
        monthLabel: `${t('construction.month')} ${index + 1}`,
        drawdown,
        equity: 0,
        debt: 0,
      }));
    }

    if (distributionResult.warnings.length > 0) {
      console.warn('Funding distribution warnings:', distributionResult.warnings.join('; '));
    }

    const { equityDraws, debtDraws } = distributionResult.data;

    return drawdownCurve.map((drawdown, index) => ({
      month: index + 1,
      monthLabel: `${t('construction.month')} ${index + 1}`,
      drawdown,
      equity: equityDraws[index],
      debt: debtDraws[index],
    }));
  }, [drawdownCurve, capitalConfig, t]);

  // Prepare data for line chart (cumulative drawdown)
  const cumulativeData = useMemo(() => {
    let cumulative = 0;
    return drawdownCurve.map((drawdown, index) => {
      cumulative += drawdown;
      return {
        month: index + 1,
        monthLabel: `${t('construction.month')} ${index + 1}`,
        monthlyDrawdown: drawdown,
        cumulativeDrawdown: cumulative,
      };
    });
  }, [drawdownCurve, t]);

  // Handle control changes
  const handleHardCostsChange = (value: number) => {
    setHardCosts(value);
    const newTotal = value + softCosts;
    if (onProjectConfigChange) {
      onProjectConfigChange({ initialInvestment: newTotal });
    }
  };

  const handleSoftCostsChange = (value: number) => {
    setSoftCosts(value);
    const newTotal = hardCosts + value;
    if (onProjectConfigChange) {
      onProjectConfigChange({ initialInvestment: newTotal });
    }
  };

  const handleDurationChange = (value: number) => {
    setDuration(value);
    if (onProjectConfigChange) {
      onProjectConfigChange({ constructionDuration: value });
    }
  };

  const handleCurveShapeChange = (value: 's-curve' | 'linear') => {
    setCurveShape(value);
    if (onProjectConfigChange) {
      onProjectConfigChange({ constructionCurve: value });
    }
  };

  // Custom tooltip for bar chart
  const BarChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{data.monthLabel}</p>
          <p style={{ margin: '4px 0', color: '#4CAF50' }}>
            {t('construction.equityPercent')}: {formatCurrency(data.equity, language)}
          </p>
          <p style={{ margin: '4px 0', color: '#2196F3' }}>
            {t('construction.debtPercent')}: {formatCurrency(data.debt, language)}
          </p>
          <p style={{ margin: '4px 0', paddingTop: '4px', borderTop: '1px solid #eee' }}>
            {t('common.total')}: {formatCurrency(data.drawdown, language)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="construction-view" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '2rem',
      gap: '1.5rem',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div className="view-header" style={{ marginBottom: '0.5rem', flexShrink: 0 }}>
        <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>{t('construction.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {t('construction.subtitle')}
        </p>
      </div>

      {/* Grid Layout: Inputs on Left, Chart on Right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.5fr',
        gap: '1.5rem',
        alignItems: 'start',
      }}>
        {/* Left Card: Input Fields */}
        <div className="card" style={{
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text-strong)',
          }}>
            {t('construction.constructionParameters')}
          </h2>

          <InputGroup label={t('construction.hardCosts')} required>
            <CurrencyInput
              value={hardCosts}
              onChange={handleHardCostsChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius)',
                fontSize: '1rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            />
          </InputGroup>

          <InputGroup label={t('construction.softCosts')} required>
            <CurrencyInput
              value={softCosts}
              onChange={handleSoftCostsChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius)',
                fontSize: '1rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            />
          </InputGroup>

          <InputGroup label={t('construction.durationMonths')} required>
            <input
              type="number"
              value={duration}
              onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
              min="0"
              max="60"
              step="1"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius)',
                fontSize: '1rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            />
          </InputGroup>

          <div>
            <ToggleGroup
              label={t('construction.curveShape')}
              options={[
                { value: 'linear', label: t('construction.linear') },
                { value: 's-curve', label: t('construction.sCurve') },
              ]}
              value={curveShape}
              onChange={(value) => handleCurveShapeChange(value as 's-curve' | 'linear')}
            />
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-soft)',
          }}>
            <div style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
            }}>
              {t('construction.totalBudget')}
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--text-strong)',
            }}>
              {formatCurrency(budget, language)}
            </div>
          </div>
        </div>

        {/* Right Card: S-Curve Chart */}
        <div className="card" style={{
          padding: '1.5rem',
        }}>
          <h2 style={{
            margin: 0,
            marginBottom: '1rem',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text-strong)',
          }}>
            {t('construction.monthlyDrawdownCurve')}
          </h2>
          {cumulativeData.length > 0 ? (
            <div style={{ width: '100%', height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData} margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="monthly"
                    label={{ value: t('construction.monthlyDrawdown'), angle: -90, position: 'left', offset: 0 }}
                    tick={{ fill: 'var(--primary)', fontSize: 12 }}
                    tickFormatter={(value: number) => {
                      if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                      return `$${value.toFixed(0)}`;
                    }}
                  />
                  <YAxis
                    yAxisId="cumulative"
                    orientation="right"
                    label={{ value: t('construction.cumulativeDrawdown'), angle: -90, position: 'right', offset: 0 }}
                    tick={{ fill: '#82ca9d', fontSize: 12 }}
                    tickFormatter={(value: number) => {
                      if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                      return `$${value.toFixed(0)}`;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, language)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="monthly"
                    type="monotone"
                    dataKey="monthlyDrawdown"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDrawdown)"
                    name={t('construction.monthlyDrawdown')}
                  />
                  <Line
                    yAxisId="cumulative"
                    type="monotone"
                    dataKey="cumulativeDrawdown"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name={t('construction.cumulativeDrawdown')}
                    dot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
            }}>
              {t('construction.setDurationMessage')}
            </div>
          )}
        </div>
      </div>

      {/* Funding Source Chart */}
      {fundingData.length > 0 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{
            margin: 0,
            marginBottom: '1rem',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text-strong)',
            fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
          }}>
            {t('construction.monthlyFundingSource')}
          </h2>
          <div style={{ width: '100%', height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fundingData} margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" />
                <YAxis
                  label={{ value: t('common.value'), angle: -90, position: 'left', offset: 0 }}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  tickFormatter={(value: number) => {
                    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                    return `$${value.toFixed(0)}`;
                  }}
                />
                <Tooltip content={<BarChartTooltip />} />
                <Legend />
                <Bar dataKey="equity" stackId="funding" fill="#4CAF50" name={t('construction.equityPercent')} />
                <Bar dataKey="debt" stackId="funding" fill="#2196F3" name={t('construction.debtPercent')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Funding Source Table */}
      {fundingData.length > 0 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{
            margin: 0,
            marginBottom: '1rem',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text-strong)',
            fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
          }}>
            {t('construction.monthlyFundingTable')}
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}>
              <thead>
                <tr style={{
                  borderBottom: '2px solid var(--border-soft)',
                }}>
                  <th style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  }}>{t('construction.month')}</th>
                  <th style={{
                    padding: '0.75rem',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  }}>{t('construction.totalDrawdown')}</th>
                  <th style={{
                    padding: '0.75rem',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  }}>{t('construction.equityPercent')}</th>
                  <th style={{
                    padding: '0.75rem',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  }}>{t('construction.debtPercent')}</th>
                  <th style={{
                    padding: '0.75rem',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  }}>{t('construction.equityPercent')} %</th>
                  <th style={{
                    padding: '0.75rem',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  }}>{t('construction.debtPercent')} %</th>
                </tr>
              </thead>
              <tbody>
                {fundingData.map((row) => {
                  const equityPct = row.drawdown > 0 ? (row.equity / row.drawdown) * 100 : 0;
                  const debtPct = row.drawdown > 0 ? (row.debt / row.drawdown) * 100 : 0;
                  return (
                    <tr key={row.month} style={{
                      borderBottom: '1px solid var(--border-soft)',
                    }}>
                      <td style={{
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                      }}>{row.monthLabel}</td>
                      <td style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                      }}>{formatCurrency(row.drawdown, language)}</td>
                      <td style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        color: '#4CAF50',
                        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                      }}>{formatCurrency(row.equity, language)}</td>
                      <td style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        color: '#2196F3',
                        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                      }}>{formatCurrency(row.debt, language)}</td>
                      <td style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                      }}>{equityPct.toFixed(1)}%</td>
                      <td style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                      }}>{debtPct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
