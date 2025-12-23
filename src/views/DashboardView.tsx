import { useState } from 'react';
import { CashFlowChart } from '../components/charts/CashFlowChart';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { CapitalStackChart } from '../components/charts/CapitalStackChart';
import { StatCard } from '../components/dashboard/StatCard';
import { BentoGrid } from '../components/layout/BentoGrid';
import { WaterfallSummary } from '../components/dashboard/WaterfallSummary';
import { ResultsSummary } from '../components/ResultsSummary';
import { formatCurrency } from '../utils/formatters';
import { useTranslation } from '../contexts/LanguageContext';
import type { ProjectKpis, DcfValuation, DebtKpi, DebtSchedule, ConsolidatedAnnualPnl, LeveredFcf, FullModelOutput, CapitalStructureConfig } from '../domain/types';
import { NoDataState } from '../components/charts/NoDataState';

interface DashboardViewProps {
  projectKpis: ProjectKpis;
  dcfValuation: DcfValuation;
  debtKpis: DebtKpi[];
  debtSchedule: DebtSchedule;
  consolidatedPnl: ConsolidatedAnnualPnl[];
  leveredFcf: LeveredFcf[];
  modelOutput?: FullModelOutput;
  capitalConfig?: CapitalStructureConfig;
  onNavigateToGlossary?: () => void;
  hasActiveOperations?: boolean;
}

export function DashboardView({
  projectKpis,
  dcfValuation,
  debtKpis,
  debtSchedule: _debtSchedule,
  consolidatedPnl,
  leveredFcf,
  modelOutput,
  capitalConfig,
  onNavigateToGlossary,
  hasActiveOperations,
}: DashboardViewProps) {
  const { t, language } = useTranslation();
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  if (hasActiveOperations === false) {
    return (
      <div className="dashboard-view" style={{ padding: '2rem' }}>
        <div className="view-header" style={{ marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text-primary, #1e293b)',
              margin: 0,
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
            }}
          >
            {t('dashboard.title')}
          </h1>
          <p
            style={{
              color: 'var(--text-secondary, #64748b)',
              fontSize: '0.9375rem',
              margin: 0,
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}
          >
            {language === 'pt'
              ? 'Nenhuma operação ativa. Ative ou adicione uma operação para visualizar o dashboard.'
              : 'No active operations. Activate or add an operation to view the dashboard.'}
          </p>
        </div>
        <NoDataState />
      </div>
    );
  }

  // Calculate Peak Equity (maximum cumulative equity invested)
  // This is the most negative cumulative cash flow from ownerLeveredCashFlows
  let peakEquity = 0;
  if (modelOutput?.capital.ownerLeveredCashFlows) {
    let cumulative = 0;
    for (const cf of modelOutput.capital.ownerLeveredCashFlows) {
      cumulative += cf;
      if (cumulative < peakEquity) {
        peakEquity = cumulative;
      }
    }
    peakEquity = Math.abs(peakEquity); // Convert to positive for display
  }

  // Format IRR
  const formatIRR = (irr: number | null): string => {
    if (irr === null || !Number.isFinite(irr)) return 'N/A';
    return `${(irr * 100).toFixed(1)}%`;
  };

  // Format Equity Multiple
  const formatEquityMultiple = (multiple: number): string => {
    return `${multiple.toFixed(2)}x`;
  };

  return (
    <>
      <div className="dashboard-view">
        <div className="view-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text-primary, #1e293b)',
              margin: 0,
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
            }}>
              {t('dashboard.title')}
            </h1>
            <p style={{
              color: 'var(--text-secondary, #64748b)',
              fontSize: '0.9375rem',
              margin: 0,
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}>
              {t('dashboard.description')}
            </p>
          </div>
          <button
            onClick={() => setShowDetailsModal(true)}
            className="btn btn-secondary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
            }}
          >
            {t('dashboard.viewAllKpis')}
          </button>
        </div>

        {/* Bento Grid Layout (v4.2) */}
        <BentoGrid gap="1.5rem">
          {/* Hero Cards: Key Financials (NPV/IRR) */}
          <BentoGrid.Item colSpan={2}>
            <ErrorBoundary variant="widget">
              <StatCard
                title={t('financial.npv')}
                value={projectKpis.npv}
                valueFormatter={formatCurrency}
                status={projectKpis.npv > 0 ? 'success' : 'danger'}
                metadata={t('dashboard.dcfValuation')}
                variant="hero"
              />
            </ErrorBoundary>
          </BentoGrid.Item>

          <BentoGrid.Item colSpan={2}>
            <ErrorBoundary variant="widget">
              <StatCard
                title={t('financial.irr')}
                value={formatIRR(projectKpis.unleveredIrr)}
                status={projectKpis.unleveredIrr && projectKpis.unleveredIrr > 0.1 ? 'success' : 'neutral'}
                metadata={t('dashboard.unleveredIrr')}
                variant="hero"
              />
            </ErrorBoundary>
          </BentoGrid.Item>

          {/* Secondary Metrics */}
          <BentoGrid.Item colSpan={1}>
            <ErrorBoundary variant="widget">
              <StatCard
                title={t('financial.equityMultiple')}
                value={formatEquityMultiple(projectKpis.equityMultiple)}
                status={projectKpis.equityMultiple > 1.5 ? 'success' : projectKpis.equityMultiple > 1.0 ? 'warning' : 'danger'}
                metadata={t('financial.equityMultiple')}
                variant="minimal"
              />
            </ErrorBoundary>
          </BentoGrid.Item>

          <BentoGrid.Item colSpan={1}>
            <ErrorBoundary variant="widget">
              <StatCard
                title={t('financial.peakEquity')}
                value={peakEquity}
                valueFormatter={formatCurrency}
                metadata={t('dashboard.maxEquityInvested')}
                variant="minimal"
              />
            </ErrorBoundary>
          </BentoGrid.Item>

          {/* Prominent Charts */}
          <BentoGrid.Item colSpan={3}>
            <ErrorBoundary variant="widget">
              <div className="card" style={{
                padding: '1.5rem',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <h2 style={{
                  margin: 0,
                  marginBottom: '1rem',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--text-primary, #1e293b)',
                }}>
                  {t('dashboard.cashFlowProfile')}
                </h2>
                <div style={{ flex: 1, minHeight: '400px' }}>
                  <CashFlowChart
                    consolidatedPnl={consolidatedPnl}
                    leveredFcf={leveredFcf}
                  />
                </div>
              </div>
            </ErrorBoundary>
          </BentoGrid.Item>

          <BentoGrid.Item colSpan={1}>
            <ErrorBoundary variant="widget">
              <div className="card" style={{
                padding: '1.5rem',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <h2 style={{
                  margin: 0,
                  marginBottom: '1rem',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--text-primary, #1e293b)',
                }}>
                  {t('dashboard.capitalStack')}
                </h2>
                <div style={{ flex: 1, minHeight: '400px' }}>
                  {capitalConfig ? (
                    <CapitalStackChart capitalConfig={capitalConfig} />
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: 'var(--text-secondary, #64748b)',
                    }}>
                      {t('dashboard.noCapitalData')}
                    </div>
                  )}
                </div>
              </div>
            </ErrorBoundary>
          </BentoGrid.Item>

          {/* Waterfall Summary */}
          {modelOutput?.waterfall && (
            <BentoGrid.Item colSpan={4}>
              <ErrorBoundary variant="widget">
                <WaterfallSummary waterfall={modelOutput.waterfall} />
              </ErrorBoundary>
            </BentoGrid.Item>
          )}
        </BentoGrid>
      </div>

      {/* Details Modal */}
      {showDetailsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem',
          }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{t('dashboard.projectSummaryKpis')}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                {t('common.close')}
              </button>
            </div>
            <ResultsSummary
              projectKpis={projectKpis}
              dcfValuation={dcfValuation}
              debtKpis={debtKpis}
              fullOutput={modelOutput}
              onNavigateToGlossary={onNavigateToGlossary}
            />
          </div>
        </div>
      )}
    </>
  );
}
