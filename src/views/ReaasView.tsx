/**
 * REaaS View component (v1.4).
 * 
 * Displays REaaS-specific metrics and analytics.
 * Focuses on showing the stability of cash flow from recurring revenue sources.
 */

import { ReaasBarChart } from '../components/charts/ReaasBarChart';
import { calculateReaasMetrics } from '../engines/analytics/portfolioEngine';
import { runScenarioEngine } from '../engines/scenario/scenarioEngine';
import { calculateSponsorCashFlow } from '../engines/operations/sponsorLogic';
import type { FullModelOutput, FullModelInput } from '../domain/types';
import { useTranslation } from '../contexts/LanguageContext';
import { getLocaleConfig } from '../utils/formatters';

interface ReaasViewProps {
  output: FullModelOutput;
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

/**
 * Formats a number as a percentage.
 */
function formatPercent(value: number, language: 'pt' | 'en'): string {
  const { locale } = getLocaleConfig(language);
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Calculates Annual Recurring Revenue (ARR) from REaaS operations.
 * ARR is the annual revenue from REaaS operations in the first projection year.
 */
function calculateARR(output: FullModelOutput, input: FullModelInput): number {
  const scenarioResult = runScenarioEngine(output.scenario);
  if (!scenarioResult.ok) return 0;

  const { operations } = scenarioResult.data;

  let arr = 0;

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    const config = input.scenario.operations[i];

    const isREaaS = config.isREaaS ?? false;

    if (isREaaS && operation.annualPnl.length > 0) {
      // Use first year's revenue as ARR
      const firstYearPnl = operation.annualPnl[0];
      const sponsorPnl = calculateSponsorCashFlow(firstYearPnl, config);
      arr += sponsorPnl.revenueTotal;
    }
  }

  return arr;
}

/**
 * Calculates % of Project Value from REaaS.
 * Based on NOI contribution to total NOI, multiplied by enterprise value.
 */
function calculateREaaSProjectValueShare(output: FullModelOutput, input: FullModelInput): number {
  const reaasMetrics = calculateReaasMetrics(output, input);

  // Calculate total NOI
  let totalNOI = 0;
  for (const pnl of output.consolidatedAnnualPnl) {
    totalNOI += pnl.noi;
  }

  if (totalNOI === 0) {
    return 0;
  }

  // Calculate NOI share
  const reaasNOIShare = totalNOI > 0 ? reaasMetrics.reaasNoi / totalNOI : 0;

  // Apply to enterprise value
  const enterpriseValue = output.project.dcfValuation.enterpriseValue;
  const reaasValue = enterpriseValue * reaasNOIShare;

  return enterpriseValue > 0 ? reaasValue / enterpriseValue : 0;
}

/**
 * Gets list of REaaS operations with their details.
 */
function getREaaSOperations(output: FullModelOutput, input: FullModelInput): Array<{
  name: string;
  type: string;
  revenue: number;
  noi: number;
  isREaaS: boolean;
}> {
  const scenarioResult = runScenarioEngine(output.scenario);
  if (!scenarioResult.ok) return [];

  const { operations } = scenarioResult.data;

  const reaasOps: Array<{
    name: string;
    type: string;
    revenue: number;
    noi: number;
    isREaaS: boolean;
  }> = [];

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    const config = input.scenario.operations[i];

    const isREaaS = config.isREaaS ?? false;

    if (isREaaS) {
      // Sum revenue and NOI across all years
      let totalRevenue = 0;
      let totalNOI = 0;

      for (const annualPnl of operation.annualPnl) {
        const sponsorPnl = calculateSponsorCashFlow(annualPnl, config);
        totalRevenue += sponsorPnl.revenueTotal;
        totalNOI += sponsorPnl.noi;
      }

      reaasOps.push({
        name: config.name,
        type: operation.operationType.replace(/_/g, ' '),
        revenue: totalRevenue,
        noi: totalNOI,
        isREaaS: true,
      });
    }
  }

  return reaasOps;
}

/**
 * Prepares data for REaaS vs Non-REaaS bar chart over time.
 */
function prepareReaasBarChartData(output: FullModelOutput, input: FullModelInput): Array<{
  year: string;
  yearIndex: number;
  recurring: number;
  oneOff: number;
}> {
  const scenarioResult = runScenarioEngine(output.scenario);
  if (!scenarioResult.ok) return [];

  const { operations } = scenarioResult.data;

  const chartData: Array<{
    year: string;
    yearIndex: number;
    recurring: number;
    oneOff: number;
  }> = [];

  // Get max horizon years
  const maxYears = Math.max(...operations.map(op => op.annualPnl.length), output.consolidatedAnnualPnl.length);

  for (let yearIndex = 0; yearIndex < maxYears; yearIndex++) {
    let recurring = 0;
    let oneOff = 0;

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const config = input.scenario.operations[i];

      if (operation.annualPnl.length > yearIndex) {
        const annualPnl = operation.annualPnl[yearIndex];
        const sponsorPnl = calculateSponsorCashFlow(annualPnl, config);

        const isREaaS = config.isREaaS ?? false;
        if (isREaaS) {
          recurring += sponsorPnl.revenueTotal;
        } else {
          oneOff += sponsorPnl.revenueTotal;
        }
      }
    }

    chartData.push({
      year: `Year ${yearIndex + 1}`,
      yearIndex,
      recurring,
      oneOff,
    });
  }

  return chartData;
}

export function ReaasView({ output, input }: ReaasViewProps) {
  const { t, language } = useTranslation();

  // Calculate REaaS metrics
  const reaasMetrics = calculateReaasMetrics(output, input);

  // Calculate ARR
  const arr = calculateARR(output, input);

  // Calculate % of Project Value from REaaS
  const reaasProjectValueShare = calculateREaaSProjectValueShare(output, input);

  // Get REaaS operations list
  const reaasOperations = getREaaSOperations(output, input);

  // Prepare chart data
  const chartData = prepareReaasBarChartData(output, input);

  // Calculate total revenue for percentage calculations
  let totalRevenue = 0;
  for (const pnl of output.consolidatedAnnualPnl) {
    totalRevenue += pnl.revenueTotal;
  }

  // Calculate total NOI
  let totalNOI = 0;
  for (const pnl of output.consolidatedAnnualPnl) {
    totalNOI += pnl.noi;
  }

  const reaasNOIYield = totalNOI > 0 ? reaasMetrics.reaasNoi / totalNOI : 0;
  const enterpriseValue = output.project.dcfValuation.enterpriseValue;
  const reaasValue = enterpriseValue * reaasProjectValueShare;

  return (
    <div className="dashboard-view">
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('reaas.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('reaas.subtitle')}</p>
      </div>

      {/* REaaS Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('reaas.arr')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {formatCurrency(arr, language)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {t('reaas.annualRecurringRevenue')}
          </div>
        </div>
        <div className="card">
          <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('reaas.recurringRevenuePct')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {formatPercent(reaasMetrics.reaasRevenueShare, language)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {t('reaas.ofTotalRevenue')}
          </div>
        </div>
        <div className="card">
          <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('reaas.reaasNoiYield')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {formatPercent(reaasNOIYield, language)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {t('reaas.ofTotalNoi')}
          </div>
        </div>
        <div className="card">
          <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('reaas.projectValueShare')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {formatPercent(reaasProjectValueShare, language)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {formatCurrency(reaasValue, language)} {t('common.of')} {formatCurrency(enterpriseValue, language)}
          </div>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('reaas.revenueOverTime')}</h2>
        <ReaasBarChart data={chartData} height={400} />
      </div>

      {/* REaaS Operations Table */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('reaas.operations')}</h2>
        {reaasOperations.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: '600', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('common.operationName')}</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: '600', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('common.type')}</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: '600', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('financial.totalRevenue')}</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: '600', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('financial.totalNoi')}</th>
                </tr>
              </thead>
              <tbody>
                {reaasOperations.map((op, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{op.name}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{op.type}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{formatCurrency(op.revenue, language)}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{formatCurrency(op.noi, language)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: '600' }}>
                  <td colSpan={2} style={{ padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('common.total')}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{formatCurrency(reaasMetrics.totalReaasRevenue, language)}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{formatCurrency(reaasMetrics.reaasNoi, language)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>{t('reaas.noOperationsFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
