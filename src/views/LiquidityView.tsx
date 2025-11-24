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
  // Show message if no monthly data available
  if (!monthlyCashFlow || monthlyCashFlow.length === 0) {
    return (
      <div className="liquidity-view">
        <div className="view-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Liquidity & Covenants</h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
            Monthly liquidity analysis and covenant monitoring.
          </p>
        </div>
        
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>
            No Monthly Data Available
          </h3>
          <p style={{ color: 'var(--text-secondary, #666)', marginBottom: '1rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
            Monthly liquidity analysis requires monthly P&L data. 
            This feature is available in v2.2 with monthly granularity enabled.
          </p>
          <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.875rem', fontStyle: 'italic', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
            Ensure your scenario includes monthly operations data.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="liquidity-view">
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Liquidity & Covenants</h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          Monthly liquidity analysis and covenant monitoring. Track cash flow, identify the "Valley of Death", 
          and monitor covenant compliance at monthly granularity.
        </p>
      </div>
      
      {/* Section 1: Cash Position Chart - "Valley of Death" */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>
          Cash Position Analysis
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

