# Hospitality KPI Glossary

Concise, code-aligned definitions for the core metrics that appear across operations, project valuation, capital structuring, and the equity waterfall. Formulas mirror the implementations documented in `docs/ARCHITECTURE.md` and used in `src/domain/glossary.ts`.

## Operations (rooms, keys, and demand)

- **ADR (Average Daily Rate)**: Average room price per sold night.
  - Formula: `ADR = Total Room Revenue / Rooms Sold`.
- **Occupancy**: Share of available inventory that is sold.
  - Formula: `Occupancy = Rooms Sold / Rooms Available`.
- **RevPAR (Revenue per Available Room)**: Pricing × demand in one metric.
  - Formula: `RevPAR = ADR × Occupancy`.
  - Engine note: Operations multiply monthly revenue by a 30-day month; RevPAR normalizes over 365 days, so results are ≈ `ADR × Occupancy × (360/365)` and always ≤ ADR when occupancy ≤ 100%.
- **GOP (Gross Operating Profit)**: Profit after departmental costs, before undistributed expenses.
  - Formula: `GOP = Total Revenue – Departmental Expenses`.
- **NOI (Net Operating Income)**: Cash flow from operations before financing.
  - Formula: `NOI = GOP – Undistributed Expenses – Management Fees – Non-Operating Items – Maintenance CapEx`.

## Project valuation

- **UFCF (Unlevered Free Cash Flow)**: Cash available to all capital providers.
  - Formula: `UFCF = NOI – Maintenance CapEx – Change in Working Capital`.
- **DCF / NPV (Discounted Cash Flow / Net Present Value)**: Present value of UFCF minus initial investment.
  - Formula: `NPV = Σ(UFCF_t / (1 + discountRate)^t) – Initial Investment`.
- **IRR (Internal Rate of Return)**: Discount rate that makes NPV = 0.
- **Payback Period**: First year when cumulative UFCF turns positive (null if never recovered).

## Capital structure

- **LFCF (Levered Free Cash Flow)**: Cash available to equity after debt service.
  - Formula: `LFCF = UFCF – Debt Service`.
- **DSCR (Debt Service Coverage Ratio)**: Cushion between NOI and debt service.
  - Formula: `DSCR = NOI / Debt Service`.
- **LTV (Loan to Value)**: Share of project cost funded by debt.
  - Formula: `LTV = Beginning Debt Balance / Initial Investment`.

## Equity returns and waterfall

- **MOIC / Equity Multiple (Multiple on Invested Capital)**: Cash returned ÷ cash invested.
  - Formula: `MOIC = Total Distributions / Total Contributions`.
- **Preferred Return / Hurdle**: Target IRR that must be met before promote tiers.
- **Catch-up**: Temporary allocation that lets a partner reach a target split after hitting the hurdle; capped at the configured catch-up split.
- **Promote**: Distribution split that applies after return of capital and preferred return (and catch-up, if present).

## How to use this glossary

- Treat these formulas as invariants when reviewing outputs or adjusting logic.
- When adding a new KPI, define it here and in `docs/ARCHITECTURE.md` before coding.
