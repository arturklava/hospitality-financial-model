/**
 * Liquidity View Component (v2.2: Liquidity Dashboard)
 * 
 * Professional Treasury/Liquidity dashboard showing:
 * - Top: Cash Position Chart ("Valley of Death" visualization)
 * - Middle: Covenant Monitor (covenant compliance status)
 * - Bottom: Monthly Flow Table (detailed monthly data)
 */

import { LiquidityChart } from '../components/charts/LiquidityChart';
import { CovenantMonitor } from '../components/analysis/CovenantMonitor';
import { MonthlyFlowTable } from '../components/analysis/MonthlyFlowTable';
import type { MonthlyCashFlow, MonthlyDebtKpi, CovenantStatus, Covenant } from '../domain/types';
import { useTranslation } from '../contexts/LanguageContext';

interface LiquidityViewProps {
  monthlyCashFlow?: MonthlyCashFlow[];
  monthlyDebtKpis?: MonthlyDebtKpi[];
  covenantStatus?: CovenantStatus[];
  covenants?: Covenant[];
}

export function LiquidityView({
  monthlyCashFlow = [],
  monthlyDebtKpis = [],
  covenantStatus = [],
  covenants = [],
}: LiquidityViewProps) {
  const { t } = useTranslation();

  // Show message if no monthly data available
  if (!monthlyCashFlow || monthlyCashFlow.length === 0) {
    return (
      <div className="liquidity-view">
        <div className="view-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('liquidity.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
            {t('liquidity.subtitle')}
          </p>
        </div>

        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>
            {t('liquidity.noData')}
          </h3>
          <p style={{ color: 'var(--text-secondary, #666)', marginBottom: '1rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
            {t('liquidity.noDataDesc')}
          </p>
          <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.875rem', fontStyle: 'italic', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
            {t('liquidity.ensureMonthlyData')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="liquidity-view">
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>{t('liquidity.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          {t('liquidity.subtitleLong')}
        </p>
      </div>

      {/* Section 1: Cash Position Chart - "Valley of Death" */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>
          {t('liquidity.cashPosition')}
        </h2>
        <LiquidityChart
          monthlyCashFlow={monthlyCashFlow}
          height={450}
        />
      </div>

      {/* Section 2: Covenant Monitor */}
      <div style={{ marginBottom: '2rem' }}>
        <CovenantMonitor
          covenantStatus={covenantStatus}
          covenants={covenants}
        />
      </div>

      {/* Section 3: Monthly Flow Table */}
      <div className="card">
        <MonthlyFlowTable
          monthlyCashFlow={monthlyCashFlow}
          monthlyDebtKpis={monthlyDebtKpis}
          covenantStatus={covenantStatus}
        />
      </div>
    </div>
  );
}
