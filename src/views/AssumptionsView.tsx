import type { FullModelInput, OperationConfig, OperationType } from '@domain/types';

interface AssumptionsViewProps {
  input: FullModelInput;
  onDiscountRateChange: (value: number) => void;
  onTerminalGrowthChange: (value: number) => void;
}

/**
 * Formats a number as currency.
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a number as a percentage.
 */
function formatPercent(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(2)}%`;
}

type OperationFamily = 'lodging' | 'f&b' | 'leisure' | 'sports' | 'wellness' | 'commercial' | 'senior';

function getOperationFamily(opType: OperationType): OperationFamily {
  switch (opType) {
    case 'HOTEL':
    case 'VILLAS':
    case 'SENIOR_LIVING':
      return 'lodging';
    case 'RESTAURANT':
    case 'BEACH_CLUB':
      return 'f&b';
    case 'RACQUET':
      return 'sports';
    case 'WELLNESS':
      return 'wellness';
    case 'RETAIL':
    case 'FLEX':
      return 'commercial';
    default:
      return 'leisure';
  }
}

function getFamilyLabel(family: OperationFamily): string {
  switch (family) {
    case 'lodging':
      return 'Lodging';
    case 'f&b':
      return 'Food & Beverage';
    case 'leisure':
      return 'Leisure';
    case 'sports':
      return 'Sports';
    case 'wellness':
      return 'Wellness';
    case 'commercial':
      return 'Commercial';
    case 'senior':
      return 'Senior Living';
  }
}

function getOperationDisplayDetails(op: OperationConfig): {
  family: OperationFamily;
  typeLabel: string;
  name: string;
  capacityLabel: string;
  capacityValue: string;
  priceLabel: string;
  priceValue: string;
} {
  const family = getOperationFamily(op.operationType);
  let typeLabel = op.operationType;
  let capacityLabel = 'Capacity';
  let capacityValue = 'N/A';
  let priceLabel = 'Price';
  let priceValue = 'N/A';

  switch (op.operationType) {
    case 'HOTEL':
      typeLabel = 'HOTEL';
      capacityLabel = 'Keys';
      capacityValue = op.keys.toString();
      priceLabel = 'ADR';
      priceValue = formatCurrency(op.avgDailyRate);
      break;
    case 'VILLAS':
      typeLabel = 'VILLAS';
      capacityLabel = 'Units';
      capacityValue = op.units.toString();
      priceLabel = 'Nightly Rate';
      priceValue = formatCurrency(op.avgNightlyRate);
      break;
    case 'RESTAURANT':
      typeLabel = 'RESTAURANT';
      capacityLabel = 'Covers';
      capacityValue = op.covers.toString();
      priceLabel = 'Avg Check';
      priceValue = formatCurrency(op.avgCheck);
      break;
    case 'BEACH_CLUB':
      typeLabel = 'BEACH_CLUB';
      capacityLabel = 'Daily Passes';
      capacityValue = op.dailyPasses.toString();
      priceLabel = 'Pass Price';
      priceValue = formatCurrency(op.avgDailyPassPrice);
      break;
    case 'RACQUET':
      typeLabel = 'RACQUET';
      capacityLabel = 'Courts';
      capacityValue = op.courts.toString();
      priceLabel = 'Court Rate';
      priceValue = formatCurrency(op.avgCourtRate);
      break;
    case 'RETAIL':
      typeLabel = 'RETAIL';
      capacityLabel = 'SQM';
      capacityValue = op.sqm.toString();
      priceLabel = 'Rent/SQM';
      priceValue = formatCurrency(op.avgRentPerSqm);
      break;
    case 'FLEX':
      typeLabel = 'FLEX';
      capacityLabel = 'SQM';
      capacityValue = op.sqm.toString();
      priceLabel = 'Rent/SQM';
      priceValue = formatCurrency(op.avgRentPerSqm);
      break;
    case 'WELLNESS':
      typeLabel = 'WELLNESS';
      capacityLabel = 'Daily Passes';
      capacityValue = op.dailyPasses.toString();
      priceLabel = 'Pass Price';
      priceValue = formatCurrency(op.avgDailyPassPrice);
      break;
    case 'SENIOR_LIVING':
      typeLabel = 'SENIOR_LIVING';
      capacityLabel = 'Units';
      capacityValue = op.units.toString();
      priceLabel = 'Monthly Rate';
      priceValue = formatCurrency(op.avgMonthlyRate);
      break;
  }

  return {
    family,
    typeLabel,
    name: op.name,
    capacityLabel,
    capacityValue,
    priceLabel,
    priceValue,
  };
}

export function AssumptionsView({ input, onDiscountRateChange, onTerminalGrowthChange }: AssumptionsViewProps) {
  // Calculate total debt amount
  const totalDebtAmount = input.capitalConfig.debtTranches.reduce((sum, tranche) => {
    const principal = tranche.initialPrincipal ?? tranche.amount ?? 0;
    return sum + principal;
  }, 0);
  const ltv = input.capitalConfig.initialInvestment > 0
    ? (totalDebtAmount / input.capitalConfig.initialInvestment) * 100
    : 0;

  // Group operations by family
  const operationsByFamily = new Map<OperationFamily, OperationConfig[]>();
  input.scenario.operations.forEach((op) => {
    const family = getOperationFamily(op.operationType);
    if (!operationsByFamily.has(family)) {
      operationsByFamily.set(family, []);
    }
    operationsByFamily.get(family)!.push(op);
  });

  const familyOrder: OperationFamily[] = ['lodging', 'f&b', 'sports', 'wellness', 'commercial', 'leisure', 'senior'];
  const familiesToRender = familyOrder.filter((family) => operationsByFamily.has(family));

  return (
    <div className="assumptions-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Scenario Configuration */}
      <section className="controls-section card">
        <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Scenario Configuration</h2>

        <div className="form-grid" style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <span className="form-label">Scenario Name</span>
            <div className="config-value">{input.scenario.name}</div>
          </div>
          <div className="form-group">
            <span className="form-label">Start Year</span>
            <div className="config-value">{input.scenario.startYear}</div>
          </div>
          <div className="form-group">
            <span className="form-label">Horizon Years</span>
            <div className="config-value">{input.scenario.horizonYears}</div>
          </div>
          <div className="form-group">
            <span className="form-label">Number of Operations</span>
            <div className="config-value">{input.scenario.operations.length}</div>
          </div>
        </div>

        <h3 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Project Configuration</h3>
        <div className="form-grid" style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <span className="form-label">Initial Investment</span>
            <div className="config-value">{formatCurrency(input.projectConfig.initialInvestment)}</div>
          </div>
          <div className="form-group">
            <span className="form-label">Working Capital %</span>
            <div className="config-value">
              {((input.projectConfig.workingCapitalPercentage ?? 0) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <h3 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Editable Parameters</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="discount-rate" className="form-label">
              Discount Rate: {formatPercent(input.projectConfig.discountRate)}
            </label>
            <input
              id="discount-rate"
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={input.projectConfig.discountRate * 100}
              onChange={(e) => onDiscountRateChange(parseFloat(e.target.value) / 100)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="terminal-growth" className="form-label">
              Terminal Growth Rate: {formatPercent(input.projectConfig.terminalGrowthRate)}
            </label>
            <input
              id="terminal-growth"
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={input.projectConfig.terminalGrowthRate * 100}
              onChange={(e) => onTerminalGrowthChange(parseFloat(e.target.value) / 100)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="debt-amount" className="form-label">
              Total Debt: {formatCurrency(totalDebtAmount)} (LTV: {ltv.toFixed(1)}%)
            </label>
            <p style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {input.capitalConfig.debtTranches.length} tranche(s) configured
            </p>
          </div>
        </div>
      </section>

      {/* Operations List */}
      <section className="operations-section card">
        <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Operations</h2>
        {input.scenario.operations.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No operations configured</p>
        ) : (
          familiesToRender.map((family) => {
            const ops = operationsByFamily.get(family)!;
            return (
              <div key={family} className="operation-family" style={{ marginBottom: '1.5rem' }}>
                <h3 className="family-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>
                  {getFamilyLabel(family)}
                </h3>
                <div className="form-grid">
                  {ops.map((op) => {
                    const details = getOperationDisplayDetails(op);
                    return (
                      <div key={op.id} className="operation-item" style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--surface-hover)' }}>
                        <div className="operation-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span className="operation-type" style={{ fontWeight: 600, fontSize: '0.9em' }}>{details.typeLabel}</span>
                        </div>
                        <div className="operation-name" style={{ fontWeight: 500, marginBottom: '0.5rem' }}>{details.name}</div>
                        <div className="operation-details" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                          <span className="operation-capacity">
                            {details.capacityLabel}: <span style={{ color: 'var(--text-primary)' }}>{details.capacityValue}</span>
                          </span>
                          <span className="operation-price">
                            {details.priceLabel}: <span style={{ color: 'var(--text-primary)' }}>{details.priceValue}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Debt Table */}
      {input.capitalConfig.debtTranches.length > 0 && (
        <section className="debt-section card">
          <h2 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Debt Structure</h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Initial Principal</th>
                  <th>Interest Rate</th>
                  <th>Term (years)</th>
                  <th>IO Years</th>
                </tr>
              </thead>
              <tbody>
                {input.capitalConfig.debtTranches.map((tranche) => {
                  const principal = tranche.initialPrincipal ?? tranche.amount ?? 0;
                  return (
                    <tr key={tranche.id}>
                      <td>{tranche.label ?? tranche.id}</td>
                      <td>{tranche.type ?? 'N/A'}</td>
                      <td>{formatCurrency(principal)}</td>
                      <td>{formatPercent(tranche.interestRate)}</td>
                      <td>{tranche.termYears}</td>
                      <td>{tranche.ioYears ?? 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

