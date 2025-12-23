/**
 * Portfolio View component (v1.4).
 * 
 * Displays portfolio-level analytics aggregated by operation type.
 * Includes KPI cards, pie charts for revenue/NOI mix, and table breakdown.
 */

import { MixPieChart } from '../components/charts/MixPieChart';
import { aggregateByOperationType } from '../engines/analytics/portfolioEngine';
import type { FullModelOutput, FullModelInput, OperationType, OperationConfig } from '../domain/types';
import { useTranslation } from '../contexts/LanguageContext';
import { getLocaleConfig } from '../utils/formatters';

interface PortfolioViewProps {
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
 * Formats a number with thousand separators.
 */
function formatNumber(value: number, language: 'pt' | 'en'): string {
  const { locale } = getLocaleConfig(language);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Calculates total GLA (Gross Leasable Area) from operations.
 * Sums sqm from RETAIL and FLEX operations.
 */
function calculateTotalGLA(operations: OperationConfig[]): number {
  let totalGLA = 0;
  for (const op of operations) {
    if (op.operationType === 'RETAIL' || op.operationType === 'FLEX') {
      totalGLA += (op as any).sqm || 0;
    }
  }
  return totalGLA;
}

/**
 * Calculates total keys from operations.
 * Sums keys from HOTEL, VILLAS, and units from SENIOR_LIVING.
 */
function calculateTotalKeys(operations: OperationConfig[]): number {
  let totalKeys = 0;
  for (const op of operations) {
    if (op.operationType === 'HOTEL') {
      totalKeys += (op as any).keys || 0;
    } else if (op.operationType === 'VILLAS') {
      totalKeys += (op as any).keys || 0;
    } else if (op.operationType === 'SENIOR_LIVING') {
      totalKeys += (op as any).units || 0;
    }
  }
  return totalKeys;
}

/**
 * Calculates diversification score based on revenue distribution.
 * Uses Herfindahl-Hirschman Index (HHI) approach: lower concentration = higher diversification.
 * Score is normalized to 0-100 scale.
 */
function calculateDiversificationScore(aggregation: Record<OperationType, { revenue: number; noi: number; valuation: number }>): number {
  // Calculate total revenue
  const totalRevenue = Object.values(aggregation).reduce((sum, metrics) => sum + metrics.revenue, 0);

  if (totalRevenue === 0) {
    return 0;
  }

  // Calculate HHI (sum of squared market shares)
  let hhi = 0;
  for (const metrics of Object.values(aggregation)) {
    if (metrics.revenue > 0) {
      const share = metrics.revenue / totalRevenue;
      hhi += share * share;
    }
  }

  // Convert HHI to diversification score (0-100)
  // HHI ranges from 1/N (perfect diversification) to 1 (perfect concentration)
  // Score = (1 - HHI) * 100, normalized
  const numTypes = Object.keys(aggregation).length;
  const minHHI = 1 / numTypes; // Perfect diversification
  const maxHHI = 1; // Perfect concentration

  // Normalize: (HHI - minHHI) / (maxHHI - minHHI) gives concentration (0 to 1)
  // Diversification = 1 - concentration
  const normalizedHHI = (hhi - minHHI) / (maxHHI - minHHI);
  const diversificationScore = (1 - normalizedHHI) * 100;

  return Math.max(0, Math.min(100, diversificationScore));
}

export function PortfolioView({ output, input }: PortfolioViewProps) {
  const { t, language } = useTranslation();

  // Aggregate metrics by operation type
  const aggregation = aggregateByOperationType(output);

  // Calculate KPIs
  const totalGLA = calculateTotalGLA(input.scenario.operations);
  const totalKeys = calculateTotalKeys(input.scenario.operations);
  const diversificationScore = calculateDiversificationScore(aggregation);

  // Calculate totals for percentages
  const totalRevenue = Object.values(aggregation).reduce((sum, metrics) => sum + metrics.revenue, 0);
  const totalNOI = Object.values(aggregation).reduce((sum, metrics) => sum + metrics.noi, 0);

  // Prepare data for pie charts (only include operation types with non-zero values)
  const revenueData = Object.entries(aggregation)
    .filter(([_, metrics]) => metrics.revenue > 0)
    .map(([type, metrics]) => ({
      name: type.replace(/_/g, ' '),
      value: metrics.revenue,
    }));

  const noiData = Object.entries(aggregation)
    .filter(([_, metrics]) => metrics.noi > 0)
    .map(([type, metrics]) => ({
      name: type.replace(/_/g, ' '),
      value: metrics.noi,
    }));

  // Prepare table data
  const tableData = Object.entries(aggregation)
    .filter(([_, metrics]) => metrics.revenue > 0 || metrics.noi > 0)
    .map(([type, metrics]) => ({
      type: type.replace(/_/g, ' '),
      revenue: metrics.revenue,
      revenuePct: totalRevenue > 0 ? (metrics.revenue / totalRevenue * 100) : 0,
      noi: metrics.noi,
      noiPct: totalNOI > 0 ? (metrics.noi / totalNOI * 100) : 0,
      valuation: metrics.valuation,
    }))
    .sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending

  return (
    <div className="dashboard-view">
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('portfolio.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('portfolio.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('portfolio.totalGla')}</div>
          <div style={{ fontSize: '2rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {formatNumber(totalGLA, language)} <span style={{ fontSize: '1rem', fontWeight: '400' }}>m²</span>
          </div>
        </div>
        <div className="card">
          <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('portfolio.totalKeys')}</div>
          <div style={{ fontSize: '2rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {formatNumber(totalKeys, language)} <span style={{ fontSize: '1rem', fontWeight: '400' }}>keys</span>
          </div>
        </div>
        <div className="card">
          <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('portfolio.diversificationScore')}</div>
          <div style={{ fontSize: '2rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {diversificationScore.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: '400' }}>/ 100</span>
          </div>
        </div>
      </div>

      {/* Pie Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div className="card">
          <MixPieChart data={revenueData} title={t('portfolio.revenueMixByType')} height={350} />
        </div>
        <div className="card">
          <MixPieChart data={noiData} title={t('portfolio.noiMixByType')} height={350} />
        </div>
      </div>

      {/* Table Breakdown */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('portfolio.breakdownByType')}</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: '600', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('common.operationType')}</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: '600', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('financial.revenue')}</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: '600', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('financial.revenue')} %</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: '600', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('financial.noi')}</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: '600', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('financial.noi')} %</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: '600', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('financial.valuation')}</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.type} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{row.type}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{formatCurrency(row.revenue, language)}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
                    {row.revenuePct.toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{formatCurrency(row.noi, language)}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
                    {row.noiPct.toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{formatCurrency(row.valuation, language)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--border)', fontWeight: '600' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{t('common.total')}</td>
                <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{formatCurrency(totalRevenue, language)}</td>
                <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>100.0%</td>
                <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>{formatCurrency(totalNOI, language)}</td>
                <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>100.0%</td>
                <td style={{ textAlign: 'right', padding: '0.75rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
                  {formatCurrency(output.project.dcfValuation.enterpriseValue, language)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
