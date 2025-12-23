import { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Header } from './components/layout/Header';
import { PageTransition } from './components/layout/PageTransition';

import { DashboardView } from './views/DashboardView';
import { OperationsView } from './views/OperationsView';
import { CapitalView } from './views/CapitalView';
import { WaterfallView } from './views/WaterfallView';
import { RiskView } from './views/RiskView';
import { LiquidityView } from './views/LiquidityView';
import { GovernanceView } from './views/GovernanceView';
import { PortfolioView } from './views/PortfolioView';
import { ReaasView } from './views/ReaasView';
import { AuthView } from './views/AuthView';
import { LandView } from './views/LandView';
import { ConstructionView } from './views/ConstructionView';
import { ComparisonView } from './views/ComparisonView';
import { PnLView } from './views/PnLView';
import { CashFlowView } from './views/CashFlowView';
import { GlossaryView } from './views/GlossaryView';
import { useFinancialModel } from './ui/hooks/useFinancialModel';
import { useAuth } from './contexts/AuthContext';
import { useScenarioLibrary } from './ui/hooks/useScenarioLibrary';
import type { ViewId } from './components/layout/Sidebar';
import type { NamedScenario } from './domain/types';

function App() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const {
    input,
    updateInput,
    runModel,
    saveVersion,
    exportJson,
    savedVersions,
    loadVersion,
    addOperation,
    removeOperation,
    error: modelError,
  } = useFinancialModel();

  // v5.8: Get scenarios from scenario library to include default scenarios (base, upside, stress)
  const { scenarios: libraryScenarios } = useScenarioLibrary();

  const [activeView, setActiveView] = useState<ViewId>('dashboard');

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg-primary, #f8fafc)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid var(--border-soft, #e2e8f0)',
              borderTopColor: 'var(--primary, #2196F3)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div style={{
            fontSize: '1rem',
            color: 'var(--text-secondary, #64748b)',
          }}>
            Loading...
          </div>
        </div>
        <style>
          {`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    );
  }

  // Show auth view if not authenticated and not in guest mode
  // v4.0.2: Allow access if user is authenticated OR guest mode is enabled
  if (!user && !isGuest) {
    return <AuthView />;
  }

  // Run the model whenever input changes
  const modelOutput = runModel();

  // Error banner for model calculation failures
  const ErrorBanner = modelError ? (
    <div
      className="error-banner"
      style={{
        padding: '1rem 1.5rem',
        backgroundColor: 'var(--danger-bg, #fef2f2)',
        color: 'var(--danger, #dc2626)',
        borderRadius: 'var(--radius, 8px)',
        border: '1px solid var(--danger-border, #fecaca)',
        margin: '0 2rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>⚠️</span>
      <div>
        <strong>Calculation Error:</strong> {modelError.message}
      </div>
    </div>
  ) : null;

  // Initialization guard: prevent crashes during startup
  if (!input || !modelOutput) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100%',
      }}>
        <div style={{
          fontSize: '1.25rem',
          color: '#64748b',
        }}>
          Loading Financial Model...
        </div>
      </div>
    );
  }

  const hasActiveOperations = input.scenario.operations.some(op => op.isActive !== false);

  const handleScenarioNameChange = (name: string) => {
    updateInput({
      ...input,
      scenario: {
        ...input.scenario,
        name,
      },
    });
  };

  const handleDiscountRateChange = (rate: number) => {
    updateInput({
      ...input,
      projectConfig: {
        ...input.projectConfig,
        discountRate: rate,
      },
    });
  };

  const handleTerminalGrowthChange = (rate: number) => {
    updateInput({
      ...input,
      projectConfig: {
        ...input.projectConfig,
        terminalGrowthRate: rate,
      },
    });
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <PageTransition key="dashboard">
            <DashboardView
              projectKpis={modelOutput.project.projectKpis}
              dcfValuation={modelOutput.project.dcfValuation}
              debtKpis={modelOutput.capital.debtKpis}
              debtSchedule={modelOutput.capital.debtSchedule}
              consolidatedPnl={modelOutput.consolidatedAnnualPnl}
              leveredFcf={modelOutput.capital.leveredFcfByYear}
              modelOutput={modelOutput}
              capitalConfig={input.capitalConfig}
              onNavigateToGlossary={() => setActiveView('glossary')}
              hasActiveOperations={hasActiveOperations}
              onNavigateToOperations={() => setActiveView('operations')}
            />
          </PageTransition>
        );
      case 'operations':
        return (
          <PageTransition key="operations">
            <OperationsView
              operations={input.scenario.operations}
              onOperationsChange={(operations) => {
                updateInput({
                  ...input,
                  scenario: {
                    ...input.scenario,
                    operations,
                  },
                });
              }}
              onAddOperation={addOperation}
              onRemoveOperation={removeOperation}
              modelOutput={modelOutput}
            />
          </PageTransition>
        );
      case 'capital':
        return (
          <PageTransition key="capital">
            <CapitalView
              projectConfig={input.projectConfig}
              capitalConfig={input.capitalConfig}
              debtSchedule={modelOutput.capital.debtSchedule}
              debtKpis={modelOutput.capital.debtKpis}
              onDiscountRateChange={handleDiscountRateChange}
              onTerminalGrowthChange={handleTerminalGrowthChange}
              onCapitalConfigChange={(capitalConfig) => {
                updateInput({
                  ...input,
                  capitalConfig,
                });
              }}
            />
          </PageTransition>
        );
      case 'waterfall':
        return (
          <PageTransition key="waterfall">
            <WaterfallView
              waterfall={modelOutput.waterfall}
              hasClawback={input.waterfallConfig.tiers?.some(t => t.enableCatchUp) ?? false}
              waterfallConfig={input.waterfallConfig}
              hasActiveOperations={hasActiveOperations}
              onWaterfallConfigChange={(config) => {
                updateInput({
                  ...input,
                  waterfallConfig: config,
                });
              }}
            />
          </PageTransition>
        );
      case 'pnl':
        return (
          <PageTransition key="pnl">
            <PnLView
              operations={input.scenario.operations}
              modelOutput={modelOutput}
            />
          </PageTransition>
        );
      case 'cashflow':
        return (
          <PageTransition key="cashflow">
            <CashFlowView
              operations={input.scenario.operations}
              modelOutput={modelOutput}
              input={input}
            />
          </PageTransition>
        );
      case 'risk':
        return (
          <PageTransition key="risk">
            <RiskView
              input={input}
              baseOutput={modelOutput}
              onUpdateInput={updateInput}
            />
          </PageTransition>
        );
      case 'liquidity':
        return (
          <PageTransition key="liquidity">
            <LiquidityView
              monthlyCashFlow={modelOutput.capital.monthlyCashFlow}
              monthlyDebtKpis={modelOutput.capital.monthlyDebtKpis}
              covenantStatus={modelOutput.capital.covenantStatus}
              covenants={input.capitalConfig.covenants}
            />
          </PageTransition>
        );
      case 'land':
        return (
          <PageTransition key="land">
            <LandView
              input={input}
              onProjectConfigChange={(config) => {
                updateInput({
                  ...input,
                  projectConfig: {
                    ...input.projectConfig,
                    ...config,
                  },
                });
              }}
            />
          </PageTransition>
        );
      case 'construction':
        return (
          <PageTransition key="construction">
            <ConstructionView
              input={input}
              onProjectConfigChange={(config) => {
                updateInput({
                  ...input,
                  projectConfig: {
                    ...input.projectConfig,
                    ...config,
                  },
                });
              }}
            />
          </PageTransition>
        );
      case 'comparison':
        return (
          <PageTransition key="comparison">
            <ComparisonView currentInput={input} currentOutput={modelOutput} />
          </PageTransition>
        );
      case 'governance':
        return (
          <PageTransition key="governance">
            <GovernanceView
              versions={savedVersions}
              onLoadVersion={(version) => loadVersion(version.id)}
            />
          </PageTransition>
        );
      case 'portfolio':
        return (
          <PageTransition key="portfolio">
            <PortfolioView
              output={modelOutput}
              input={input}
            />
          </PageTransition>
        );
      case 'reaas':
        return (
          <PageTransition key="reaas">
            <ReaasView
              output={modelOutput}
              input={input}
            />
          </PageTransition>
        );
      case 'glossary':
        return (
          <PageTransition key="glossary">
            <GlossaryView />
          </PageTransition>
        );
      default:
        return (
          <PageTransition key="not-found">
            <div>View not found</div>
          </PageTransition>
        );
    }
  };

  // Construct NamedScenario from input for Excel export
  const scenario: NamedScenario = {
    id: input.scenario.id || `scenario-${Date.now()}`,
    name: input.scenario.name,
    modelConfig: input,
  };

  // v5.8: Merge savedVersions with scenario library scenarios to show all available scenarios
  // Create a map to deduplicate by ID (savedVersions take precedence)
  const scenarioMap = new Map<string, NamedScenario>();

  // First, add library scenarios (base, upside, stress) - filter out "All Operation Types (v0.4)"
  libraryScenarios
    .filter(s => s.name !== 'All Operation Types (v0.4)')
    .forEach(s => {
      scenarioMap.set(s.id, s);
    });

  // Then, add saved versions (these will override library scenarios with same ID)
  savedVersions.forEach(v => {
    scenarioMap.set(v.id, {
      id: v.id,
      name: v.name,
      description: v.description,
      modelConfig: v.modelConfig,
    });
  });

  // Convert to array for Header
  const scenariosForHeader: NamedScenario[] = Array.from(scenarioMap.values());

  // Get current scenario ID
  const currentScenarioId = input.scenario.id || scenario.id;

  // Handle scenario loading from both library and saved versions
  const handleLoadScenario = (scenarioId: string) => {
    // First, try to find in library scenarios
    const libraryScenario = libraryScenarios.find(s => s.id === scenarioId);
    if (libraryScenario) {
      updateInput(libraryScenario.modelConfig);
      return;
    }

    // Then, try to load from saved versions
    loadVersion(scenarioId);
  };

  return (
    <MainLayout
      header={
        <Header
          scenarioName={input.scenario.name}
          onScenarioNameChange={handleScenarioNameChange}
          onSave={() => saveVersion(input.scenario.name)}
          onExport={exportJson}
          scenarios={scenariosForHeader}
          activeScenarioId={currentScenarioId}
          onLoadScenario={handleLoadScenario}
          scenario={scenario}
          output={modelOutput}
        />
      }
      activeView={activeView}
      onViewChange={setActiveView}
    >
      {ErrorBanner}
      {renderView()}
    </MainLayout>
  );
}

export default App;
