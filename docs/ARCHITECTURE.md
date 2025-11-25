# Hospitality Financial Modeling Engine - Architecture

**This document is the single source of truth for the project architecture. Before making any significant changes, update this document first.**

## Overview

Hospitality multi-operation financial modeling engine that calculates cash flows, DCF valuations, debt schedules, and equity waterfall distributions.

**Tech Stack**: TypeScript (strict mode), Vite, React, Vitest

---

## Pipeline Flow

The complete data flow is a **numbered sequence**:

```
1. Operations → 2. Scenario → 3. Project → 4. Capital → 5. Waterfall → 6. UI
```

### Step-by-Step Pipeline

1. **Operations Engine** (`runHotelEngine`, `runOperation`)
   - Input: `HotelConfig` (or other `OperationConfig`)
   - Output: `MonthlyPnl[]`, `AnnualPnl[]`
   - Generates monthly/annual P&L for each operation

2. **Scenario Engine** (`runScenarioEngine`)
   - Input: `ProjectScenario` (contains array of `OperationConfig`)
   - Output: `ScenarioEngineResult` with `ConsolidatedAnnualPnl[]`
   - Consolidates all operations into project-level annual P&L

3. **Project Engine** (`runProjectEngine`)
   - Input: `ConsolidatedAnnualPnl[]`, `ProjectConfig`
   - Output: `UnleveredFcf[]`, `DcfValuation`, `ProjectKpis`
   - Calculates unlevered FCF, DCF valuation, project KPIs

4. **Capital Engine** (`runCapitalEngine`)
   - Input: `ConsolidatedAnnualPnl[]`, `UnleveredFcf[]`, `CapitalStructureConfig`
   - Output: `DebtSchedule`, `LeveredFcf[]`, `ownerLeveredCashFlows[]`, `DebtKpi[]`
   - Applies debt structure, calculates levered cash flows

5. **Waterfall Engine** (`applyEquityWaterfall`)
   - Input: `ownerLeveredCashFlows[]`, `WaterfallConfig`
   - Output: `WaterfallResult` with partner distributions, IRR, MOIC
   - Splits equity cash flows among partners

6. **UI** (`App.tsx`)
   - Input: Uses `useFullModel` hook with sample model configuration
   - Output: Renders KPI cards and tables (Unlevered FCF, Equity Waterfall)
   - Calls `runFullModel` (from `modelPipeline.ts`) with model input configuration

### Pipeline contracts (sanity checklist)

To prevent cross-engine drift, the pipeline enforces these light-weight contracts:

- Scenario → Project: `consolidatedAnnualPnl.length` must equal `scenario.horizonYears`, with `yearIndex` values 0..N-1. `consolidatedMonthlyPnl` must include `horizonYears * 12` entries.
- Project → Capital: `unleveredFcf.length` must match the consolidated P&L year count and cover the same year indexes.
- Capital → Waterfall: `leveredFcfByYear.length` must equal the P&L/FCF year count; `ownerLeveredCashFlows.length` must be year count + 1 (Year 0 + projection years).

---

## Domain Types

All types defined in `src/domain/types.ts`.

### Operation Types

- **`OperationType`**: Union of operation types (`'HOTEL'`, `'VILLAS'`, `'RESTAURANT'`, `'BEACH_CLUB'`, `'RACQUET'`, `'RETAIL'`, `'FLEX'`, `'WELLNESS'`, `'SENIOR_LIVING'`)
- **`OperationConfig`**: Union type
  - ✅ **Implemented (v0.4)**: All 9 operation types are fully functional, integrated, tested, and included in sample data:
    - `HotelConfig`, `VillasConfig`, `RestaurantConfig`, `BeachClubConfig`, `RacquetConfig`, `RetailConfig`, `FlexConfig`, `WellnessConfig`, `SeniorLivingConfig`
- **`HotelConfig`** (✅ Implemented):
  - `keys`: number of rooms
  - `avgDailyRate`: ADR in project currency
  - `occupancyByMonth`: array of 12 values (0..1)
  - Revenue mix: `foodRevenuePctOfRooms`, `beverageRevenuePctOfRooms`, `otherRevenuePctOfRooms`
  - COGS: `foodCogsPct`, `beverageCogsPct` (as % of respective revenue)
  - OPEX: `payrollPct`, `utilitiesPct`, `marketingPct`, `maintenanceOpexPct`, `otherOpexPct` (as % of total revenue)
  - `maintenanceCapexPct`: as % of total revenue

- **`VillasConfig`** (✅ Implemented):
  - `units`: number of villa units
  - `avgNightlyRate`: average nightly rate in project currency
  - `occupancyByMonth`: array of 12 values (0..1)
  - Revenue mix: `foodRevenuePctOfRental`, `beverageRevenuePctOfRental`, `otherRevenuePctOfRental` (as % of rental revenue)
  - COGS: `foodCogsPct`, `beverageCogsPct` (as % of respective revenue)
  - OPEX: `payrollPct`, `utilitiesPct`, `marketingPct`, `maintenanceOpexPct`, `otherOpexPct` (as % of total revenue)
  - `maintenanceCapexPct`: as % of total revenue

- **`RestaurantConfig`** (✅ Implemented):
  - `covers`: number of covers/seats
  - `avgCheck`: average check per cover in project currency
  - `turnoverByMonth`: array of 12 values (daily turnover rate, e.g., 1.2 = 1.2 turns per day)
  - Revenue mix: `foodRevenuePctOfTotal`, `beverageRevenuePctOfTotal`, `otherRevenuePctOfTotal` (as % of total revenue)
  - COGS: `foodCogsPct`, `beverageCogsPct` (as % of respective revenue)
  - OPEX: `payrollPct`, `utilitiesPct`, `marketingPct`, `maintenanceOpexPct`, `otherOpexPct` (as % of total revenue)
  - `maintenanceCapexPct`: as % of total revenue

- **`BeachClubConfig`** (✅ Implemented):
  - **Pattern**: Volume × Ticket (similar to RESTAURANT)
  - `dailyPasses`: number of daily passes available per day
  - `avgDailyPassPrice`: average price per daily pass in project currency
  - `memberships`: number of annual memberships
  - `avgMembershipFee`: average annual membership fee in project currency
  - `utilizationByMonth`: array of 12 values (0..1) for daily pass utilization
  - Revenue mix: `foodRevenuePctOfTotal`, `beverageRevenuePctOfTotal`, `otherRevenuePctOfTotal` (as % of total revenue)
  - COGS: `foodCogsPct`, `beverageCogsPct` (as % of respective revenue)
  - OPEX: `payrollPct`, `utilitiesPct`, `marketingPct`, `maintenanceOpexPct`, `otherOpexPct` (as % of total revenue)
  - `maintenanceCapexPct`: as % of total revenue
  - **Note**: Membership revenue allocated evenly across 12 months; no seasonal membership variations

- **`RacquetConfig`** (✅ Implemented):
  - **Pattern**: Volume × Ticket (similar to RESTAURANT)
  - `courts`: number of courts
  - `avgCourtRate`: average hourly rate per court in project currency
  - `utilizationByMonth`: array of 12 values (0..1) for court utilization
  - `hoursPerDay`: average operating hours per day (e.g., 12 hours)
  - `memberships`: number of annual memberships
  - `avgMembershipFee`: average annual membership fee in project currency
  - Revenue mix: `foodRevenuePctOfTotal`, `beverageRevenuePctOfTotal`, `otherRevenuePctOfTotal` (as % of total revenue)
  - COGS: `foodCogsPct`, `beverageCogsPct` (as % of respective revenue)
  - OPEX: `payrollPct`, `utilitiesPct`, `marketingPct`, `maintenanceOpexPct`, `otherOpexPct` (as % of total revenue)
  - `maintenanceCapexPct`: as % of total revenue
  - **Note**: Membership revenue allocated evenly across 12 months; court revenue = courts × utilization × hoursPerDay × avgCourtRate × 30 days

- **`RetailConfig`** (✅ Implemented):
  - **Pattern**: Volume × Rate (lease-based)
  - `sqm`: total square meters of retail space
  - `avgRentPerSqm`: average monthly rent per square meter in project currency
  - `occupancyByMonth`: array of 12 values (0..1) for space occupancy
  - Revenue mix: `rentalRevenuePctOfTotal`, `otherRevenuePctOfTotal` (as % of total revenue)
  - COGS: none (retail is typically lease-based, no direct COGS)
  - OPEX: `payrollPct`, `utilitiesPct`, `marketingPct`, `maintenanceOpexPct`, `otherOpexPct` (as % of total revenue)
  - `maintenanceCapexPct`: as % of total revenue
  - **Note**: No tenant-specific revenue mix; all retail space treated uniformly

- **`FlexConfig`** (✅ Implemented):
  - **Pattern**: Volume × Rate (lease-based, similar to RETAIL)
  - `sqm`: total square meters of flexible space
  - `avgRentPerSqm`: average monthly rent per square meter in project currency
  - `occupancyByMonth`: array of 12 values (0..1) for space occupancy
  - Revenue mix: `rentalRevenuePctOfTotal`, `otherRevenuePctOfTotal` (as % of total revenue)
  - COGS: none (flexible space is lease-based, no direct COGS)
  - OPEX: `payrollPct`, `utilitiesPct`, `marketingPct`, `maintenanceOpexPct`, `otherOpexPct` (as % of total revenue)
  - `maintenanceCapexPct`: as % of total revenue
  - **Note**: No distinction between different flex space types (co-working, event space, etc.); all treated uniformly

- **`WellnessConfig`** (✅ Implemented):
  - **Pattern**: Volume × Ticket (similar to RESTAURANT)
  - `memberships`: number of annual memberships
  - `avgMembershipFee`: average annual membership fee in project currency
  - `dailyPasses`: number of daily passes available per day
  - `avgDailyPassPrice`: average price per daily pass in project currency
  - `utilizationByMonth`: array of 12 values (0..1) for daily pass utilization
  - Revenue mix: `foodRevenuePctOfTotal`, `beverageRevenuePctOfTotal`, `otherRevenuePctOfTotal` (as % of total revenue)
  - COGS: `foodCogsPct`, `beverageCogsPct` (as % of respective revenue)
  - OPEX: `payrollPct`, `utilitiesPct`, `marketingPct`, `maintenanceOpexPct`, `otherOpexPct` (as % of total revenue)
  - `maintenanceCapexPct`: as % of total revenue
  - **Note**: Membership revenue allocated evenly across 12 months; no class-based membership tiers

- **`SeniorLivingConfig`** (✅ Implemented):
  - **Pattern**: Keys/Units × Occupancy × Rate (similar to HOTEL/VILLAS)
  - `units`: number of senior living units
  - `avgMonthlyRate`: average monthly rate per unit in project currency
  - `occupancyByMonth`: array of 12 values (0..1) for unit occupancy
  - Revenue mix: `careRevenuePctOfRental`, `foodRevenuePctOfRental`, `otherRevenuePctOfRental` (as % of rental revenue)
  - COGS: `foodCogsPct`, `careCogsPct` (as % of respective revenue)
  - OPEX: `payrollPct`, `utilitiesPct`, `marketingPct`, `maintenanceOpexPct`, `otherOpexPct` (as % of total revenue)
  - `maintenanceCapexPct`: as % of total revenue
  - **Note**: No distinction between independent living, assisted living, memory care; all units treated uniformly

### Operation input validation

- **Monthly driver arrays**: `occupancyByMonth`, `utilizationByMonth`, and `turnoverByMonth` must contain exactly 12 monthly values. Occupancy/utilization arrays must stay within the 0–1 interval.
- **Percentages**: All percentage fields across operations (revenue mix, COGS, OPEX, capex, commissions) must remain within 0–1. Domain validation enforces these bounds in addition to Zod schemas.

### Financial Statements

- **`MonthlyPnl`**: Per operation, per month
  - `yearIndex`: 0-based relative to scenario start
  - `monthIndex`: 0-based (0..11)
  - Revenue: `roomRevenue`, `foodRevenue`, `beverageRevenue`, `otherRevenue`
  - COGS: `foodCogs`, `beverageCogs`
  - OPEX: `payroll`, `utilities`, `marketing`, `maintenanceOpex`, `otherOpex`
  - Profitability: `grossOperatingProfit`, `ebitda`, `noi`, `maintenanceCapex`, `cashFlow`

- **`AnnualPnl`**: Per operation, per year
  - `yearIndex`: 0-based
  - Aggregated: `revenueTotal`, `cogsTotal`, `opexTotal`, `ebitda`, `noi`, `maintenanceCapex`, `cashFlow`

- **`ConsolidatedAnnualPnl`**: Project-level, per year
  - `yearIndex`: 0-based
  - Same fields as `AnnualPnl` but aggregated across all operations

### Project Configuration & Results

- **`ProjectScenario`**:
  - `id`, `name`, `startYear`, `horizonYears`
  - `operations`: array of `OperationConfig`

- **`ProjectConfig`**:
  - `discountRate`: decimal (e.g., 0.10 for 10%)
  - `terminalGrowthRate`: decimal (e.g., 0.02 for 2%)
  - `initialInvestment`: total project cost in project currency
  - `workingCapitalPercentage` or `workingCapitalPercent`: optional, % of revenue (decimal)

- **`UnleveredFcf`**: Per year
  - `yearIndex`: 0-based
  - `noi`, `maintenanceCapex`, `changeInWorkingCapital`
  - `unleveredFreeCashFlow`: NOI - maintenance capex - change in WC

- **`DcfValuation`**:
  - `discountRate`, `terminalGrowthRate`
  - `cashFlows`: array (Year 0 = -initialInvestment, Years 1..N-1 = UFCF, Year N = UFCF + terminal value)
  - `npv`, `enterpriseValue`, `equityValue`, `terminalValue`

- **`ProjectKpis`**:
  - `npv`: Net Present Value
  - `unleveredIrr`: Internal Rate of Return (null if not found)
  - `equityMultiple`: Multiple on invested capital
  - `paybackPeriod`: Payback period in years (null if never paid back)

### Capital Structure

- **`CapitalStructureConfig`**:
  - `initialInvestment`: total project cost
  - `debtTranches`: array of `DebtTrancheConfig` (currently uses first tranche only)

- **`DebtTrancheConfig`**:
  - `id`, `amount`: initial loan amount
  - `interestRate`: annual nominal rate (decimal)
  - `termYears`: years until maturity
  - `amortizationYears`: amortization horizon (can be >= termYears)

- **`DebtSchedule`**: `entries: DebtScheduleEntry[]`
  - `DebtScheduleEntry`: per year
    - `yearIndex`: 0-based
    - `beginningBalance`, `interest`, `principal`, `endingBalance`

- **`LeveredFcf`**: Per year
  - `yearIndex`: 0-based
  - `unleveredFcf`, `debtService`, `interest`, `principal`
  - `leveredFreeCashFlow`: unlevered FCF - debt service

- **`DebtKpi`**: Per year
  - `yearIndex`: 0-based
  - `dscr`: Debt Service Coverage Ratio (NOI / debt service, null if either <= 0)
  - `ltv`: Loan-to-Value (beginning balance / initial investment, null if either <= 0)

- **`CapitalEngineResult`**:
  - `debtSchedule`: `DebtSchedule`
  - `leveredFcfByYear`: `LeveredFcf[]`
  - `ownerLeveredCashFlows`: `number[]` (length = horizonYears + 1, Year 0..N)
    - Year 0: `-equityInvested` (where equityInvested = initialInvestment - debtAmount)
    - Years 1..N: `leveredFcfByYear[t-1].leveredFreeCashFlow`
  - `debtKpis`: `DebtKpi[]`

#### Capital Stack 2.0 (v0.5)

**Status**: ✅ Implemented in v0.5

**Overview**: Extends the capital structure to support multiple debt tranches with simple refinancing capabilities.

**Enhanced `DebtTrancheConfig` (v0.5)**:
- `id`: unique identifier for the tranche
- `label`: optional human-readable name (e.g., "Senior Loan", "Mezzanine Debt")
- `type`: optional `'SENIOR' | 'MEZZ' | 'BRIDGE' | 'OTHER'` - tranche type classification
- `initialPrincipal`: initial loan amount at Year 0 (preferred in v0.5; `amount` still supported for backward compatibility)
- `amount`: deprecated but still supported for v0.4 backward compatibility (use `initialPrincipal` instead)
- `interestRate`: annual nominal interest rate (decimal, e.g., 0.06 for 6%)
- `amortizationType`: optional `'interest_only' | 'mortgage' | 'bullet'` (defaults to `'mortgage'`)
  - `'interest_only'`: only interest payments, principal repaid at maturity
  - `'mortgage'`: standard linear amortization (principal + interest)
  - `'bullet'`: no payments until maturity, then full repayment
- `termYears`: number of years until maturity
- `amortizationYears`: optional, amortization horizon (can be >= termYears) - only used for `'mortgage'` type
- `ioYears`: optional, number of interest-only years (only used when `amortizationType === 'interest_only'`)
- `startYear`: optional, year index (0-based) when tranche begins (defaults to 0)
- `refinanceAtYear`: optional, year index (0-based) when tranche is fully repaid and refinanced (if not provided, no refinancing)

**Multi-Tranche Behavior**:
- The capital engine builds a separate amortization schedule for each tranche.
- Aggregate debt service per year = sum of all active tranches' (interest + principal) for that year.
- Aggregate debt balances per year = sum of all active tranches' ending balances.
- Project-level KPIs (DSCR, LTV) are computed using aggregate debt service and balances:
  - `DSCR_t = NOI_t / aggregateDebtService_t`
  - `LTV_t = aggregateDebtBalance_t / initialInvestment`
- Per-tranche KPIs are **not** computed in v0.5 (may be added in future versions).

**Simple Refinancing Model (v0.5, Fixed in v0.8.1, Validated in v0.9)**:
- ✅ **CRITICAL REQUIREMENT (v0.8.1+)**: At `refinanceAtYear`, the old tranche's `endingBalance` MUST be exactly `0`, and principal payment MUST equal `beginningBalance` of that year
- ✅ **VALIDATION (v0.9)**: Refinancing logic is strictly enforced and validated to prevent regressions
- ✅ **STRICT ENFORCEMENT (v2.10)**: Invariant violations throw errors; simple refinancing explicitly sets ending balance to 0 to avoid floating point artifacts
- **Refinancing Logic**:
  - At `refinanceAtYear`, the tranche's remaining balance is fully repaid (principal payment = beginning balance of refinance year)
  - The old tranche's schedule MUST end at `refinanceAtYear` (no entries after refinance)
  - Aggregate debt calculations MUST exclude the old tranche after `refinanceAtYear`
  - New tranche(s) may start in the same year (`startYear = refinanceAtYear`) with `initialPrincipal` approximately equal to the repaid balance
- **Constraints**: No refinancing fees, no partial refinances, no overlapping complex rules in v0.5
- **Transaction Type**: Refinancing is a simple "pay off old, start new" transaction within the same year

**Implementation Notes**:
- The capital engine builds separate amortization schedules for each tranche using `computeTrancheSchedule()`.
- Tranches are processed in order of appearance in the `debtTranches` array.
- For each year, only tranches with `startYear <= yearIndex` and `yearIndex < startYear + termYears` are active.
- Refinancing is handled by marking the old tranche as fully repaid at `refinanceAtYear` (principal payment = ending balance from previous year).
- New tranche(s) may start in the same year (`startYear = refinanceAtYear`) with `initialPrincipal` approximately equal to the repaid balance.
- Aggregate debt schedules are computed by summing all active tranches' interest, principal, and balances per year.
- Backward compatibility: v0.4 configs using `amount` field are automatically converted via `getInitialPrincipal()` helper.

#### Transaction Costs (v0.6)

**Status**: ✅ Implemented in v0.6

**Overview**: Adds origination fees and exit/refinance fees to debt tranches, affecting net proceeds and cash flows.

**Enhanced `DebtTrancheConfig` (v0.6)**:
- All existing fields from v0.5 remain unchanged.
- New optional fields for transaction costs:
  - `originationFeePct`: `number` - optional, percentage of `initialPrincipal` paid upfront as origination fee (decimal, e.g., 0.01 for 1%)
  - `exitFeePct`: `number` - optional, percentage of ending balance paid upon repayment/refinance (decimal, e.g., 0.005 for 0.5%)

**Transaction Cost Behavior (v0.6)**:
- **Origination Fee**:
  - Calculated as: `originationFee = initialPrincipal × originationFeePct`
  - Paid at `startYear` (Year 0 or the tranche's `startYear` if specified)
  - Reduces net proceeds: `netProceeds = initialPrincipal - originationFee`
  - Origination fee is a cash outflow in the capital engine, affecting `ownerLeveredCashFlows` at Year 0 (or tranche start year)
  - For equity calculation: `equityInvested = initialInvestment - sum(netProceeds per tranche)`

- **Exit Fee**:
  - ⚠️ **BUG (v0.6-v0.8)**: Currently calculated as `exitFee = endingBalance × exitFeePct` (INCORRECT)
  - ✅ **FIX (v0.8.1)**: Must be calculated as `exitFee = beginningBalance × exitFeePct` (where `beginningBalance` is the balance at the START of the exit year)
  - Exit year is: `startYear + termYears` (maturity) or `refinanceAtYear` (refinance), whichever comes first
  - Paid at maturity (`startYear + termYears`) or at `refinanceAtYear` (whichever comes first)
  - Exit fee is a cash outflow in the year of repayment/refinance, affecting `ownerLeveredCashFlows` in that year
  - If a tranche is refinanced, the exit fee is paid on the old tranche, and the new tranche may have its own origination fee

**Implementation Notes**:
- Transaction costs are additive: a tranche may have both origination and exit fees.
- Origination fees reduce the effective loan amount (net proceeds) but do not affect the amortization schedule (interest and principal are calculated on `initialPrincipal`, not `netProceeds`).
- Exit fees are separate from principal repayment and are added to the debt service in the year of exit.
- Aggregate debt service includes exit fees in the year they are paid.
- Backward compatibility: if `originationFeePct` and `exitFeePct` are not specified, behavior matches v0.5 (no fees).

### Equity Waterfall

**v0.2 Implementation**: Single-tier, percentage-based distribution (still supported as fallback).

**v0.3 Implementation (Current)**: Multi-tier waterfall with Return of Capital → Preferred Return → Promote.

- **`WaterfallConfig`**:
  - `equityClasses`: array of `EquityClass` (required: defines partners and their contribution percentages)
  - `tiers`: array of `WaterfallTier` (optional: if provided, enables multi-tier waterfall; if omitted, uses single-tier v0.2 logic)
    - Each tier defines: `type` ('return_of_capital' | 'preferred_return' | 'promote'), `hurdleIrr` (for preferred return, e.g., 0.08-0.12), `distributionSplits` (Record<partnerId, percentage>)

- **`EquityClass`**:
  - `id`, `name`
  - `contributionPct`: fraction of equity contributed (0..1)
  - `distributionPct`: optional, fraction of distributions (defaults to `contributionPct`) - used in v0.2 single-tier mode when `tiers` is not provided

- **`WaterfallTier`**:
  - `id`: unique identifier for the tier
  - `type`: 'return_of_capital' | 'preferred_return' | 'promote'
  - `hurdleIrr`: optional, for preferred_return tier (e.g., 0.08-0.12)
  - `distributionSplits`: Record<partnerId, percentage> (0..1) - defines how distributions are split in this tier

- **`WaterfallResult`**:
  - `ownerCashFlows`: `number[]` (identical to `ownerLeveredCashFlows` from capital engine)
  - `partners`: `PartnerDistributionSeries[]`
    - `partnerId`, `cashFlows[]`, `cumulativeCashFlows[]`, `irr` (null if not found), `moic`
  - `annualRows`: `AnnualWaterfallRow[]`
    - `yearIndex`, `ownerCashFlow`, `partnerDistributions`: Record<string, number>

#### Waterfall v2 (v0.5)

**Status**: ✅ Implemented in v0.5 (catch-up); ⏳ Clawback deferred to v0.6+

**Overview**: Extends the multi-tier waterfall (v0.3) with catch-up provisions and a placeholder for clawback mechanisms.

**Enhanced `WaterfallTier` (v0.5)**:
- All existing fields from v0.3 remain unchanged.
- New optional fields for catch-up:
  - `enableCatchUp`: `boolean` - if `true`, enables catch-up logic for this tier (defaults to `false`)
  - `catchUpTargetSplit`: `Record<partnerId, percentage>` - target distribution split after catch-up is complete (e.g., `{ lp: 0.70, gp: 0.30 }`)
  - `catchUpRate`: `number` - optional, rate at which catch-up occurs (if not provided, uses a default catch-up mechanism)

**Catch-Up Behavior (v0.5)**:
- Catch-up is a mechanism that allows a partner (typically the GP) to "catch up" to a target distribution split after preferred return is satisfied.
- ⚠️ **BUG (v0.5-v0.8)**: Catch-up logic may not strictly enforce the `catchUpTargetSplit` cap, allowing distributions to exceed target ratios
- ✅ **FIX (v0.8.1)**: Distributions MUST NOT exceed `catchUpTargetSplit` ratios, and catch-up completion must be strictly validated (within 0.1% tolerance)
- **Implementation (v0.5)**: Catch-up logic is fully implemented in `applyMultiTierWaterfall()`:
  - When `enableCatchUp: true` on a tier (typically the "promote" tier):
    - The engine tracks cumulative distributions per partner (`cumulativeDistributions`).
    - After preferred return tier is satisfied, distributions are allocated according to `catchUpTargetSplit` until catch-up is complete.
    - Catch-up is considered complete when the cumulative distribution ratio matches `catchUpTargetSplit` (within 0.1% tolerance for floating-point comparison).
    - After catch-up, distributions follow the standard tier splits (`distributionSplits`).
  - If `enableCatchUp: false` or not specified, the tier behaves as in v0.3 (no catch-up).
  - Catch-up degenerates to v0.3 behavior when disabled, ensuring backward compatibility.
  - **Algorithm**: The catch-up check compares current cumulative distribution percentages to `catchUpTargetSplit`; if not matching, allocations use `catchUpTargetSplit` splits; once matching, allocations revert to standard `distributionSplits`.

**Clawback Placeholder (v0.5)**:
- Clawback configuration fields are defined in `WaterfallTier` type but **not implemented** in v0.5:
  - `enableClawback`: `boolean` - placeholder flag (not used in v0.5)
  - `clawbackTrigger`: optional configuration for when clawback is triggered (not implemented in v0.5)
  - `clawbackMethod`: optional method specification (not implemented in v0.5)
- Full clawback implementation is marked as **v0.6+**, not required in v0.5.
- Clawback is a mechanism that allows LPs to "claw back" excess distributions from GPs if the final returns do not meet certain thresholds.
- **Current Status**: Configuration fields present; full logic deferred to v0.6+.

#### Waterfall v3 (v0.6) - Full Clawback Implementation

**Status**: ✅ Implemented in v0.6

**Overview**: Implements full clawback logic using "Hypothetical Liquidation" or "Annual Lookback" methodology to ensure GP does not receive excess distributions.

**Enhanced `WaterfallTier` (v0.6)**:
- All existing fields from v0.5 remain unchanged.
- Clawback configuration fields (now implemented):
  - `enableClawback`: `boolean` - if `true`, enables clawback logic for this tier (defaults to `false`)
  - `clawbackTrigger`: `'final_period' | 'annual'` - when clawback is evaluated:
    - `'final_period'`: clawback is evaluated only at the end of the horizon (Year N)
    - `'annual'`: clawback is evaluated at the end of each year (Year 1..N)
  - `clawbackMethod`: `'hypothetical_liquidation' | 'lookback'` - methodology for calculating clawback:
    - `'hypothetical_liquidation'`: recalculates the entire waterfall as if the project were liquidated at the evaluation point
    - `'lookback'`: compares actual cumulative distributions with what should have been distributed based on current returns

**Clawback Behavior (v0.6)**:
- **Hypothetical Liquidation Method** (recommended for v0.6):
  - At the evaluation point (final period or annually), the engine recalculates the entire waterfall from Year 0 to the current year using the actual `ownerLeveredCashFlows`.
  - This "hypothetical" recalculation determines what distributions **should have been** made according to the tier logic.
  - The engine compares:
    - **Required distributions**: cumulative distributions that should have been made (from hypothetical recalculation)
    - **Actual distributions**: cumulative distributions that were actually made (from the original waterfall run)
  - If GP received more than required: `clawbackAmount = actualGP - requiredGP`
  - Clawback adjustment: negative cash flow for GP, positive cash flow for LP (equal to `clawbackAmount`)
  - Clawback is applied in the evaluation period (final period or the current year for annual evaluation)

- **Lookback Method** (alternative for v0.6):
  - At the evaluation point, the engine calculates what the distribution split should be based on current partner IRRs and the tier logic.
  - Compares actual cumulative distribution percentages with required percentages.
  - If GP percentage exceeds required: calculates clawback adjustment to bring GP percentage down to required level.
  - Clawback adjustment applied in the evaluation period.

**Implementation Notes**:
- Clawback logic must be integrated into the multi-tier waterfall engine without breaking v0.5 behavior.
- The waterfall engine must track cumulative distributions per partner throughout the horizon.
- Clawback calculations must respect the waterfall invariant: `sum(partner CFs) ≈ owner CF` for each year (including clawback adjustments).
- For `clawbackTrigger: 'annual'`, clawback adjustments may occur in multiple years.
- For `clawbackTrigger: 'final_period'`, clawback adjustment occurs only in the final year (Year N).
- Clawback is typically applied to the "promote" tier, but may be configured for any tier.
- Backward compatibility: if `enableClawback: false` or not specified, behavior matches v0.5 (no clawback).

**Implementation Notes**:
- Catch-up logic must be integrated into the multi-tier waterfall engine without breaking v0.3 behavior.
- The waterfall engine must track cumulative distributions per partner to determine catch-up completion.
- Catch-up calculations must respect the waterfall invariant: `sum(partner CFs) ≈ owner CF` for each year.

---

## Engines

All engines are **pure, deterministic functions** with no side effects.

### Operations Engines (`src/engines/operations/`)

#### Engine Patterns

To keep code maintainable and predictable, v0.4 engines for new operations SHOULD reuse established patterns and helper functions. Two primary patterns are identified:

1. **"Keys/Units × Occupancy × Rate" Pattern** (Lodging-like):
   - Used by: HOTEL, VILLAS, SENIOR_LIVING
   - Core logic: `occupiedUnits = units × occupancyByMonth[monthIndex] × 30`
   - Primary revenue: `primaryRevenue = occupiedUnits × avgRate`
   - Secondary revenue: calculated as % of primary revenue
   - Example: HOTEL uses `keys × occupancy × ADR`, VILLAS uses `units × occupancy × avgNightlyRate`

2. **"Volume × Ticket" Pattern** (F&B / Retail-like):
   - Used by: RESTAURANT, BEACH_CLUB, RACQUET, WELLNESS, RETAIL, FLEX
   - Core logic: `volume = capacity × utilization × daysInMonth` or `volume = capacity × turnover × daysInMonth`
   - Primary revenue: `primaryRevenue = volume × avgTicket` or `primaryRevenue = sqm × occupancy × avgRentPerSqm`
   - Secondary revenue: calculated as % of total revenue (for F&B) or separate revenue streams (for retail/flex)
   - Example: RESTAURANT uses `covers × turnover × avgCheck`, RETAIL uses `sqm × occupancy × avgRentPerSqm`

**Aggregation conventions (seasonality + periodization):**
- All operation engines use a shared helper `aggregateAnnualPnl` (`src/engines/operations/utils.ts`) to roll 12 monthly P&Ls into annual statements with consistent rounding and expense grouping.
- Day-count assumption: **30-day months × 12 months/year** for all operational revenue/volume math (e.g., occupied rooms = keys × occupancy × 30).
- Membership and other annualized fees are **smoothed evenly across 12 months** using the same `MONTHS_PER_YEAR` constant to keep monthly and annual totals in sync.
- When calculating department-level adjustments (e.g., hotel/villa commissions), pass adjustments into the aggregation helper so annual COGS matches the monthly logic.

**Implementation Guidance for FINANCE_ENGINE_AGENT**:
- Identify which pattern the new operation follows (lodging-like or volume/ticket-like)
- Reuse the monthly loop structure from existing engines
- Follow the same COGS/OPEX calculation pattern: COGS as % of respective revenue, OPEX as % of total revenue
- Aggregate monthly P&L into annual P&L using the same summation logic
- Ensure all values are finite (no NaN/Infinity) - this is a core invariant

#### Operational KPIs

**Status**: ✅ Validated in v1.0 (Hardening Phase)

The operations engines calculate several key performance indicators (KPIs) that are essential for hospitality financial analysis. These KPIs are either **inputs** to the model or **calculated outputs** from the P&L.

##### Input KPIs (Configuration Parameters)

**ADR (Average Daily Rate)**:
- **Definition**: Average revenue per occupied room/unit per night
- **Field names**: 
  - `avgDailyRate` (HOTEL)
  - `avgNightlyRate` (VILLAS)
  - `avgMonthlyRate` (SENIOR_LIVING, converted to daily equivalent)
- **Type**: Input parameter (not calculated)
- **Units**: Project currency per night
- **Example**: $200/night for a mid-scale hotel

**Occupancy**:
- **Definition**: Percentage of available keys/units that are occupied
- **Field name**: `occupancyByMonth` (array of 12 monthly values)
- **Type**: Input parameter (not calculated)
- **Units**: Decimal (0..1), where 0.70 = 70% occupancy
- **Pattern**: Lodging-like operations only (HOTEL, VILLAS, SENIOR_LIVING)
- **Example**: `[0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65]` (seasonal pattern)

##### Calculated KPIs (Derived from P&L)

**RevPAR (Revenue per Available Room)**:
- **Definition**: Total room revenue divided by total available room nights, regardless of occupancy
- **Formula**: `RevPAR = totalRoomRevenue / (keys × daysInHorizon)`
- **Calculated in**: `assetAnalytics.ts` (for HOTEL operations)
- **Units**: Project currency per available room night
- **Industry standard formula**: `RevPAR = ADR × Occupancy`
- ⚠️ **Known Discrepancy (360 vs 365 days)**:
  - **Engines**: Use 30 days/month = **360 days/year** for revenue calculation
  - **RevPAR denominator**: Uses **365 days/year** for available room nights
  - **Impact**: RevPAR is systematically understated by ~1.4% compared to ADR × Occupancy
  - **Actual formula**: `RevPAR = (ADR × occupancy × 360) / 365` ≈ `ADR × occupancy × 0.986`
  - **Rationale**: Engines use simplified 30-day months for consistency; RevPAR uses calendar days for industry standard comparison
- **Invariant**: `RevPAR ≤ ADR` (always true when occupancy ≤ 100%)
- **Example**: If ADR = $200 and occupancy = 70%, then RevPAR ≈ $138 (not $140 due to 360/365 adjustment)

**GOP (Gross Operating Profit)**:
- **Definition**: Total operating revenue minus departmental expenses (USALI-compliant)
- **Formula**: `GOP = totalRevenue - departmentalExpenses`
- **Calculated in**: All operation engines (monthly P&L)
- **Field name**: `grossOperatingProfit` (in `MonthlyPnl` type)
- **Departmental expenses** (varies by operation type):
  - **Lodging-like** (HOTEL, VILLAS, SENIOR_LIVING): `departmentalExpenses = foodCogs + beverageCogs + commissions`
  - **F&B/Volume** (RESTAURANT, BEACH_CLUB, RACQUET, WELLNESS): `departmentalExpenses = foodCogs + beverageCogs`
  - **Lease-based** (RETAIL, FLEX): `departmentalExpenses = 0` (no COGS)
- **USALI Terminology**: GOP is equivalent to "Gross Operating Profit" in USALI (Uniform System of Accounts for the Lodging Industry)
- **Invariant**: `GOP ≤ totalRevenue` (always true when departmental expenses ≥ 0)
- **Example**: If totalRevenue = $1,000,000 and departmentalExpenses = $300,000, then GOP = $700,000

**GOP Margin %**:
- **Definition**: Gross Operating Profit as a percentage of total revenue
- **Formula**: `GOP Margin % = (GOP / totalRevenue) × 100`
- **Calculated in**: UI/analytics layer (not stored in P&L)
- **Units**: Percentage (0..100)
- **Typical range**: 40-70% for hotels, 60-80% for lease-based operations
- **Invariant**: `GOP Margin % ∈ [0, 100]` for profitable operations with positive revenue
- **Example**: If GOP = $700,000 and totalRevenue = $1,000,000, then GOP Margin % = 70%

##### KPI Calculation Patterns by Operation Type

**Lodging-like Operations** (HOTEL, VILLAS, SENIOR_LIVING):
- **Primary KPIs**: ADR, Occupancy, RevPAR, GOP, GOP Margin %
- **Revenue formula**: `roomRevenue = keys × occupancy × ADR × 30 days`
- **GOP formula**: `GOP = totalRevenue - (foodCogs + beverageCogs + commissions)`
- **RevPAR applicability**: HOTEL only (as of v1.0); VILLAS and SENIOR_LIVING could support RevPAR-like metrics in future versions

**F&B/Volume Operations** (RESTAURANT, BEACH_CLUB, RACQUET, WELLNESS):
- **Primary KPIs**: Avg Check, Seat Turnover (or Utilization), COGS %, GOP, GOP Margin %
- **Revenue formula**: `totalRevenue = volume × avgTicket` (varies by operation)
- **GOP formula**: `GOP = totalRevenue - (foodCogs + beverageCogs)`
- **RevPAR applicability**: Not applicable (no room/unit-based revenue)

**Lease-based Operations** (RETAIL, FLEX):
- **Primary KPIs**: Rent per sqm, GLA Occupancy, GOP, GOP Margin %
- **Revenue formula**: `rentalRevenue = sqm × occupancy × avgRentPerSqm`
- **GOP formula**: `GOP = totalRevenue` (no COGS)
- **RevPAR applicability**: Not applicable (lease-based, not room-based)

##### Invariants and Validation

All operational KPIs must satisfy the following invariants (enforced in tests):

1. **Finiteness**: All KPI values must be finite (no NaN or Infinity)
2. **RevPAR ≤ ADR**: For lodging operations with occupancy ≤ 100%
3. **GOP ≤ Total Revenue**: For all operations with non-negative departmental expenses
4. **GOP Margin % ∈ [0, 100]**: For profitable operations with positive revenue
5. **Consistency across patterns**: Operations following the same pattern (e.g., lodging-like) must use identical formulas

**Test Coverage** (v1.0 Hardening):
- `hotelEngine.test.ts`: GOP validation, RevPAR validation, extreme ADR tests, zero cost edge cases
- `operationConsistency.test.ts`: Cross-operation GOP consistency, pattern validation, invariant checks


**`runHotelEngine(config: HotelConfig): HotelEngineResult`**
- **Input**: `HotelConfig`
- **Output**: `{ monthlyPnl: MonthlyPnl[], annualPnl: AnnualPnl[] }`
- **Logic**:
  - For each year (0..horizonYears-1) and month (0..11):
    - `occupiedRooms = keys × occupancyByMonth[monthIndex] × 30` (assumes 30 days/month)
    - `roomRevenue = occupiedRooms × avgDailyRate`
    - `foodRevenue = roomRevenue × foodRevenuePctOfRooms`
    - `beverageRevenue = roomRevenue × beverageRevenuePctOfRooms`
    - `otherRevenue = roomRevenue × otherRevenuePctOfRooms`
    - `totalRevenue = roomRevenue + foodRevenue + beverageRevenue + otherRevenue`
    - `foodCogs = foodRevenue × foodCogsPct`
    - `beverageCogs = beverageRevenue × beverageCogsPct`
    - OPEX = `totalRevenue × respectivePct` for each category
    - `grossOperatingProfit = totalRevenue - (foodCogs + beverageCogs)`
    - `ebitda = grossOperatingProfit - totalOpex`
    - `maintenanceCapex = totalRevenue × maintenanceCapexPct`
    - `noi = ebitda - maintenanceCapex`
    - `cashFlow = noi`
  - Aggregate monthly P&L into annual P&L by summing 12 months

**`runVillasEngine(config: VillasConfig): VillasEngineResult`**
- **Input**: `VillasConfig`
- **Output**: `{ monthlyPnl: MonthlyPnl[], annualPnl: AnnualPnl[] }`
- **Logic**:
  - For each year (0..horizonYears-1) and month (0..11):
    - `occupiedNights = units × occupancyByMonth[monthIndex] × 30` (assumes 30 days/month)
    - `rentalRevenue = occupiedNights × avgNightlyRate`
    - `foodRevenue = rentalRevenue × foodRevenuePctOfRental`
    - `beverageRevenue = rentalRevenue × beverageRevenuePctOfRental`
    - `otherRevenue = rentalRevenue × otherRevenuePctOfRental`
    - `totalRevenue = rentalRevenue + foodRevenue + beverageRevenue + otherRevenue`
    - `foodCogs = foodRevenue × foodCogsPct`
    - `beverageCogs = beverageRevenue × beverageCogsPct`
    - OPEX = `totalRevenue × respectivePct` for each category
    - `grossOperatingProfit = totalRevenue - (foodCogs + beverageCogs)`
    - `ebitda = grossOperatingProfit - totalOpex`
    - `maintenanceCapex = totalRevenue × maintenanceCapexPct`
    - `noi = ebitda - maintenanceCapex`
    - `cashFlow = noi`
    - Note: `rentalRevenue` is stored in `MonthlyPnl.roomRevenue` field for consistency
  - Aggregate monthly P&L into annual P&L by summing 12 months

**`runRestaurantEngine(config: RestaurantConfig): RestaurantEngineResult`**
- **Input**: `RestaurantConfig`
- **Output**: `{ monthlyPnl: MonthlyPnl[], annualPnl: AnnualPnl[] }`
- **Logic**:
  - For each year (0..horizonYears-1) and month (0..11):
    - `totalCovers = covers × turnoverByMonth[monthIndex] × 30` (assumes 30 days/month)
    - `totalRevenue = totalCovers × avgCheck`
    - `foodRevenue = totalRevenue × foodRevenuePctOfTotal`
    - `beverageRevenue = totalRevenue × beverageRevenuePctOfTotal`
    - `otherRevenue = totalRevenue × otherRevenuePctOfTotal`
    - `foodCogs = foodRevenue × foodCogsPct`
    - `beverageCogs = beverageRevenue × beverageCogsPct`
    - OPEX = `totalRevenue × respectivePct` for each category
    - `grossOperatingProfit = totalRevenue - (foodCogs + beverageCogs)`
    - `ebitda = grossOperatingProfit - totalOpex`
    - `maintenanceCapex = totalRevenue × maintenanceCapexPct`
    - `noi = ebitda - maintenanceCapex`
    - `cashFlow = noi`
    - Note: `roomRevenue` field stores remaining revenue after food/beverage/other for consistency with `MonthlyPnl` structure
  - Aggregate monthly P&L into annual P&L by summing 12 months

**`runOperation(config: OperationConfig): OperationEngineResult`**
- **Input**: `OperationConfig` (union type)
- **Output**: `{ operationId, operationType, monthlyPnl, annualPnl }`
- **Logic**: Dispatcher that calls appropriate engine based on `operationType`
  - ✅ **Implemented (v0.4)**: All 9 operation types are fully implemented:
    - `'HOTEL'` → calls `runHotelEngine`
    - `'VILLAS'` → calls `runVillasEngine`
    - `'RESTAURANT'` → calls `runRestaurantEngine`
    - `'BEACH_CLUB'` → calls `runBeachClubEngine`
    - `'RACQUET'` → calls `runRacquetEngine`
    - `'RETAIL'` → calls `runRetailEngine`
    - `'FLEX'` → calls `runFlexEngine`
    - `'WELLNESS'` → calls `runWellnessEngine`
    - `'SENIOR_LIVING'` → calls `runSeniorLivingEngine`
  - All engines follow the same pattern: generate monthly P&L, aggregate to annual P&L
  - Throws error for unsupported types (exhaustiveness check ensures all types are handled)

### Scenario Engine (`src/engines/scenario/scenarioEngine.ts`)

**`runScenarioEngine(scenario: ProjectScenario): ScenarioEngineResult`**
- **Input**: `ProjectScenario` with array of `OperationConfig`
- **Output**: `{ operations: OperationEngineResult[], consolidatedAnnualPnl: ConsolidatedAnnualPnl[] }`
- **Logic**:
  - For each operation config, call `runOperation(config)`
  - For each year (0..horizonYears-1):
    - Sum `revenueTotal`, `cogsTotal`, `opexTotal`, `ebitda`, `noi`, `maintenanceCapex`, `cashFlow` across all operations
    - **USALI Calculations (v0.9, Fixed in v0.9.1, Finalized in v0.9.2)**: Calculate USALI-compliant fields:
      - `totalOperatingRevenue = revenueTotal` (total operating revenue)
      - `departmentalExpenses = cogsTotal` (direct expenses attributable to revenue-generating departments)
      - `grossOperatingProfit = totalOperatingRevenue - departmentalExpenses` (GOP, USALI-compliant)
      - `undistributedOperatingExpenses = opexTotal` (expenses not directly attributable to departments)
      - ✅ **Correct USALI Formula (v0.9.1, Verified in v0.9.2)**: `netOperatingIncome = grossOperatingProfit - undistributedOperatingExpenses`
      - ⚠️ **Note**: Replacement Reserve (maintenance capex) is NOT subtracted in NOI calculation per USALI - it's a separate line item
      - `replacementReserve = maintenanceCapex` (separate line item, not in NOI)
      - ⚠️ **v0.9.2 Fix**: Ensure NOI calculation uses new USALI field names (`grossOperatingProfit`, `undistributedOperatingExpenses`), not legacy field names
    - Create `ConsolidatedAnnualPnl` entry with both USALI fields and legacy fields (for backward compatibility)

#### Asset P&L vs Sponsor P&L Separation (v1.2: Advanced Asset Dynamics)

**Key Concept**: The system distinguishes between **Asset P&L (OpCo)** and **Sponsor P&L (PropCo)** to accurately model different real estate ownership structures.

**Asset P&L (OpCo)**:
- Represents the operating company's financial performance
- Standard P&L calculation: `Revenue - COGS - OPEX - MaintenanceCapex = NOI`
- Calculated by individual operation engines (unchanged from previous versions)
- Used for asset-level analysis and represents the true operational performance of the asset
- Always calculated regardless of ownership model or active status

**Sponsor P&L (PropCo)**:
- Represents the actual cash flow to the sponsor based on ownership model
- Calculated in scenario engine during consolidation via `calculateSponsorFlow()` function
- **This is what gets aggregated** in consolidated P&L for project-level analysis
- Used for sponsor-level financial analysis, DCF valuation, and waterfall distributions
- Conversion logic varies by ownership model:
  - **BUILD_AND_OPERATE**: `Sponsor Flow = Asset Flow × ownershipPct`
  - **BUILD_AND_LEASE_FIXED**: `Sponsor Flow = baseRent - Owner Costs` (Owner Costs = 0 in v1.2)
  - **BUILD_AND_LEASE_VARIABLE**: `Sponsor Flow = baseRent + (variableRentPct × Basis) - Owner Costs`
  - **CO_INVEST_OPCO**: `Sponsor Flow = Asset Flow × ownershipPct`
- **Inactive Operations**: If `isActive === false`, Sponsor Flow = 0 (excluded from consolidation)

**Consolidation Logic**:
- Two-pass approach: First calculate asset-level metrics for all operations, then convert to Sponsor Flow based on ownership model
- For lease models: Sponsor revenue = rent (no COGS/OPEX in sponsor P&L)
- For operate models: Sponsor receives proportional share of asset metrics
- Filter inactive operations (`isActive === false`) from sponsor-level consolidation
- The consolidated P&L represents the sponsor's actual cash flow position, not the sum of asset-level performance

**Use Cases**:
- **Asset P&L**: Used for operational analysis, benchmarking, and understanding true asset performance
- **Sponsor P&L**: Used for investment analysis, DCF valuation, debt capacity, and equity waterfall distributions

### Project Engine (`src/engines/project/projectEngine.ts`)

**`runProjectEngine(consolidatedPnl: ConsolidatedAnnualPnl[], config: ProjectConfig): ProjectEngineResult`**
- **Input**: `ConsolidatedAnnualPnl[]`, `ProjectConfig`
- **Output**: `{ unleveredFcf: UnleveredFcf[], dcfValuation: DcfValuation, projectKpis: ProjectKpis }`
- **Logic**:
  - Working capital: `wc_t = revenueTotal_t × workingCapitalPercentage` (defaults to 0)
  - Change in WC: `changeInWC_0 = wc_0 - 0`, `changeInWC_t = wc_t - wc_(t-1)` for t >= 1
  - **UFCF (single source of truth)**: `ufcf_t = noi_t - maintenanceCapex_t - changeInWC_t`
  - **USALI Terminology (v0.9)**: Uses USALI-compliant field names from `ConsolidatedAnnualPnl`:
    - `noi` field represents Net Operating Income (USALI-compliant, calculated as GOP - Undistributed Expenses)
    - `maintenanceCapex` represents Replacement Reserve (USALI term, though field name maintained for backward compatibility)
  - **Invariant check**: Verifies all UFCF values are finite (warns if NaN or Infinity detected)
  - Cash flow series: `[-initialInvestment, UFCF[0], ..., UFCF[N-2], UFCF[N-1] + terminalValue]`
  - Terminal value: `(UFCF[N-1] × (1 + g)) / (r - g)` if r > g, else 0
  - NPV: `npv(discountRate, cashFlows)`
  - IRR: `irr(cashFlows)`
  - Equity multiple: `equityMultiple(cashFlows)`
  - Payback period: `paybackPeriod(cashFlows)`
  - Enterprise value = NPV, Equity value = Enterprise value (no debt adjustment yet)

### Capital Engine (`src/engines/capital/capitalEngine.ts`)

**`runCapitalEngine(consolidatedPnl: ConsolidatedAnnualPnl[], unleveredFcf: UnleveredFcf[], config: CapitalStructureConfig): CapitalEngineResult`**
- **Input**: `ConsolidatedAnnualPnl[]`, `UnleveredFcf[]`, `CapitalStructureConfig`
- **Output**: `{ debtSchedule, leveredFcfByYear, ownerLeveredCashFlows, debtKpis }`
- **Logic (v0.5: Capital Stack 2.0)**:
  - **Multi-tranche support**: Processes all tranches in `config.debtTranches` array
  - For each tranche:
    - Gets initial principal via `getInitialPrincipal()` (handles v0.4 `amount` field for backward compatibility)
    - Builds per-tranche schedule using `computeTrancheSchedule()`:
      - Supports three amortization types: `'mortgage'` (linear), `'interest_only'` (IO until maturity), `'bullet'` (no payments until maturity)
      - Handles `startYear` (tranche begins at specified year) and `refinanceAtYear` (tranche fully repaid at specified year)
      - For `'mortgage'`: linear amortization with optional balloon payment if term < amortization
      - For `'interest_only'`: interest payments only, principal repaid at maturity
      - For `'bullet'`: interest paid during term, principal repaid at maturity
      - **Invariant check per tranche**: Verifies `sum(principal payments) + final ending balance ≈ initial principal` (tolerance 0.01, **throws Error** if violated)
  - **Aggregate debt schedule**: Sums all active tranches' interest, principal, and balances per year using `aggregateDebtSchedules()`
  - Levered FCF: `leveredFcf_t = unleveredFcf_t - aggregateDebtService_t` (where aggregateDebtService = sum of all active tranches' debt service)
  - Owner levered cash flows: `[-equityInvested, leveredFcf[0], ..., leveredFcf[N-1]]` where `equityInvested = initialInvestment - totalDebtAmount`
  - Debt KPIs (project-level, using aggregate debt): `dscr = noi / aggregateDebtService` (null if either <= 0), `ltv = aggregateBeginningBalance / initialInvestment` (null if either <= 0)

### Waterfall Engine (`src/engines/waterfall/waterfallEngine.ts`)

**`applyEquityWaterfall(ownerCashFlows: number[], config: WaterfallConfig): WaterfallResult`**

**v0.2 Implementation (Single-tier, still supported)**:
- **Input**: `ownerCashFlows[]` (from capital engine), `WaterfallConfig` (without `tiers` array)
- **Output**: `{ ownerCashFlows, partners, annualRows }`
- **Logic**:
  - If no equity classes: default to single "Owner" class with 100%
  - Normalize contribution/distribution percentages to sum to 1.0
  - For each year:
    - If `ownerCashFlow < 0` (capital call): use `contributionPct` for split
    - If `ownerCashFlow >= 0` (distribution): use `distributionPct` (or `contributionPct` if not specified)
    - Allocate to all partners except last: `share = ownerCF × pct`
    - Last partner gets remainder: `share = ownerCF - sum(previousShares)` (ensures exact sum)
  - For each partner: calculate `cumulativeCashFlows`, `irr(cashFlows)`, `moic = equityMultiple(cashFlows)`
  - **Invariant check**: Verifies `|sum(partner CFs) - owner CF| ≤ 0.01` for each year (warns if violated)

**v0.3 Implementation (Multi-tier, current default)**:
- **Input**: `ownerCashFlows[]` (from capital engine), `WaterfallConfig` (with `tiers` array)
- **Output**: `{ ownerCashFlows, partners, annualRows }`
- **Logic** (multi-tier waterfall):
  - **Tier 1: Return of Capital**
    - All positive owner CFs first go to returning contributed equity to partners pro rata (based on `contributionPct`)
    - Track unreturned capital per partner: `unreturnedCapital[partnerId] = initialContribution - sum(returns)`
    - Continue until all partners have received their full contributed capital back
  - **Tier 2: Preferred Return**
    - After return of capital is complete, allocate distributions according to configured splits until LP IRR reaches configured hurdle (e.g., 8-12%)
    - Compute IRR per partner using cash flow series: `irr(partnerCashFlows)` from existing utility
    - Track IRR progress: continue allocating until LP IRR >= hurdle
  - **Tier 3: Promote**
    - Remaining distributions split according to "promote" splits (e.g., 70% LP / 30% GP)
    - All remaining positive cash flows after preferred return tier is satisfied
  - For each year, apply tiers in order (1 → 2 → 3)
  - Capital calls (negative cash flows) are always split using `contributionPct` regardless of tier configuration
  - For each partner: calculate `cumulativeCashFlows`, `irr(cashFlows)`, `moic = equityMultiple(cashFlows)`
  - **Invariant check**: Verifies `|sum(partner CFs) - owner CF| ≤ 0.01` for each year (warns if violated)

### Full Pipeline (`src/engines/pipeline/fullPipeline.ts`)

**`runFullPipeline(input: FullPipelineInput): FullPipelineResult`**
- **Input**: `{ scenario, projectConfig, capitalConfig, waterfallConfig }`
- **Output**: `{ scenarioResult, projectResult, capitalResult, waterfallResult }`
- **Logic**: Runs engines in sequence (1→2→3→4→5), propagates errors (no error swallowing)
- **Note**: Legacy pipeline orchestrator. For new code, prefer `runFullModel` from `modelPipeline.ts`.

### Model Pipeline (`src/engines/pipeline/modelPipeline.ts`)

**`runFullModel(input: FullModelInput): FullModelOutput`**
- **Input**: `{ scenario, projectConfig, capitalConfig, waterfallConfig, netDebtOverride? }`
- **Output**: `{ scenario, consolidatedAnnualPnl, project, capital, waterfall }`
- **Logic**: 
  - Pure function orchestrating the complete financial modeling flow
  - Runs engines in sequence: Operations → Scenario → Project → Capital → Waterfall
  - No side effects, fully deterministic, fully typed
  - Propagates errors (no error swallowing)
- **Pipeline Flow**:
  ```
  Operations Engine(s)
       ↓
  Scenario Engine (consolidates operations → ConsolidatedAnnualPnl[])
       ↓
  Project Engine (ConsolidatedAnnualPnl[] → UnleveredFcf[] + DcfValuation + ProjectKpis)
       ↓
  Capital Engine (ConsolidatedAnnualPnl[] + UnleveredFcf[] → DebtSchedule + LeveredFcf[] + ownerLeveredCashFlows[])
       ↓
  Waterfall Engine (ownerLeveredCashFlows[] → WaterfallResult with partner distributions)
       ↓
  FullModelOutput
  ```
- **Invariants**: 
  - Debt schedule invariant checked in capital engine (sum of principal + final balance ≈ initial debt)
  - Waterfall invariant checked in waterfall engine (sum of partner CFs ≈ owner CF for each year)
  - UFCF finiteness checked in project engine (all values must be finite)

---

## UI Structure

### UI Layer (✅ Implemented for v0.3, ⏳ Restructured for v1.1)

The UI is a React application that wires to the full financial pipeline via `runFullModel`.

**Strategic Pivot: The "Enterprise Platform" Evolution**

We are moving away from the simple "Calculator" layout to a scalable "SaaS Platform" architecture. This evolution merges superior UX patterns from legacy builds (Sidebar, View-based navigation, Dedicated Audit screens) with our robust v1.0 engine.

**Current Structure (v1.1)**: Enterprise Shell with Sidebar Navigation.

#### UI Foundation: Global CSS Strategy

**CRITICAL**: The application requires explicit height constraints on root containers to support an App-like full-viewport interface. Without these, the Flexbox layout collapses to 0px height, resulting in a blank screen.

**Root Container Requirements** (`src/index.css`):

```css
/* Root Containers - MUST have explicit height for App-like interface */
html, body, #root {
  height: 100%;           /* Full height, not min-height */
  overflow: hidden;      /* Prevent body-level scrolling */
  margin: 0;
  padding: 0;
}
```

**Rationale**:
- `height: 100%` (not `min-height: 100vh`) ensures containers take full viewport height
- `overflow: hidden` prevents body-level scrolling (app-container handles scrolling internally)
- Without these, Flexbox children collapse to 0px height

**Body Element**:
- **MUST NOT** use `display: flex; place-items: center;` (conflicts with full-height layout)
- **MUST** use `height: 100%` and `overflow: hidden`

#### Layout Pattern: The Enterprise Shell

**Entry Point**: `src/App.tsx`
- Uses `useFinancialModel` hook (or `useFullModel`) to manage model input/output state
- Implements state-based routing via `activeView` state

**Layout Components** (`src/components/layout/*`):
- **`MainLayout`**: Root container orchestrating the three-panel layout
- **`Sidebar`**: Fixed left navigation panel (~240px width)
- **`Header`**: Sticky top bar for global context and actions

**Layout Composition**:

The layout follows a hierarchical Flexbox structure:

1. **`.app-container`** (Root Layout Container):
   - **Type**: Flex Row (`display: flex; flex-direction: row`)
   - **Dimensions**: `height: 100vh; width: 100vw`
   - **Purpose**: Contains Sidebar + Main Content Wrapper side-by-side
   - **Overflow**: `overflow: hidden` (container doesn't scroll)

2. **`.sidebar`** (Fixed Navigation Panel):
   - **Type**: Fixed positioning (`position: fixed`)
   - **Dimensions**: `width: 240px; height: 100vh`
   - **Flex**: `flex-shrink: 0` (fixed width, won't shrink)
   - **Position**: `left: 0; top: 0`
   - **Purpose**: Persistent navigation, always visible

3. **`.main-content-wrapper`** (Content Container):
   - **Type**: Flex Column (`display: flex; flex-direction: column`)
   - **Flex**: `flex: 1` (grows to fill remaining space)
   - **Offset**: `margin-left: 240px` (offset for fixed sidebar)
   - **Overflow**: `overflow: hidden` (wrapper doesn't scroll)
   - **Purpose**: Contains Header + Scrollable View
   - **Children**:
     - `.sticky-header`: Fixed height header
     - `.app-main`: Scrollable content area (`flex: 1; overflow-y: auto`)

**Three-Panel Architecture**:

1. **Sidebar Navigation** (`src/components/layout/Sidebar.tsx`):
   - Fixed left panel (~240px width)
   - Contains primary navigation items with icons
   - Replaces the old top tab navigation
   - Always visible, provides persistent navigation context
   - Includes app branding/logo in header
   - User profile section in footer (optional)

2. **Global Header** (`src/components/layout/Header.tsx`):
   - Sticky top bar (remains visible on scroll)
   - Context display: Scenario Name (editable)
   - Global actions: Save, Export (JSON/Excel), Import
   - Breadcrumb or view title (optional)
   - Audit mode toggle (v0.10+)

3. **Main Content Area**:
   - Scrollable container for the active View
   - Responsive width (fills remaining space after sidebar)
   - **Long Scroll Layout (v4.1)**: Views flow naturally with page-level scrolling
   - Views receive model input/output as props

#### Layout Pattern: Long Scroll Layout (v4.1)

**Strategic Pivot**: Removed compressed/independent scroll layouts in favor of traditional web layout: **Fixed Sidebar + Scrollable Main Page**.

**Core Principles**:

1. **Global Layout Strategy**:
   - **Sidebar**: Fixed on the left (`position: fixed` in CSS, already implemented)
   - **Main Content**: Scrolls vertically as a single unit (via `.app-main` with `overflow-y: auto`)
   - **Views**: **MUST NOT** use `height: 100%` or `overflow: hidden` constraints
   - Views should grow naturally (`height: auto`) and flow with page scroll

2. **View-Specific Patterns**:

   - **Capital View** (`src/views/CapitalView.tsx`):
     - Chart on top, Debt Manager below
     - No internal scrollbars - content flows naturally
     - Removed: `height: '100%'`, `overflow: 'hidden'` from root container
     - Removed: Internal scroll constraints on panes

   - **Operations View** (`src/views/OperationsView.tsx`):
     - Maintains "Master-Detail" layout via `MasterDetailLayout`
     - **Master Panel** (Asset List): Sticky on the left while scrolling the form
     - **Detail Panel** (Form): Grows naturally - if form is long, page scrolls
     - Removed: `height: '100%'` from detail panel
     - Removed: Internal scroll constraints - form grows with content

   - **Waterfall View** (`src/views/WaterfallView.tsx`):
     - Content flows vertically: Header → Tier Config → KPIs → Chart → Table
     - Removed: `height: '100%'`, `overflow: 'hidden'` from root
     - Removed: Internal scroll containers - table flows with page

   - **Liquidity View** (`src/views/LiquidityView.tsx`):
     - 60-month table needs **horizontal** scroll (via `DataTable` with `minWidth`)
     - **Vertical** scroll is handled by page itself
     - Table wrapper already has `overflowX: 'auto'` in `DataTable` component

3. **MasterDetailLayout** (`src/components/layout/MasterDetailLayout.tsx`):
   - **Master Panel**: Sticky positioning (`position: sticky, top: 0`)
   - **Detail Panel**: Grows naturally with content
   - Removed: `height: '100%'` constraints
   - Allows natural page-level scrolling

4. **Chart Components**:
   - **Deprecated**: Manual dependency checks (try/catch for recharts)
   - **Standard**: Direct imports from `recharts` - let bundler handle dependencies
   - Updated: `WaterfallChart.tsx`, `CashFlowChart.tsx`, `HistogramChart.tsx`

**Migration Checklist** (v4.1):

- ✅ Removed `height: '100%'` from `CapitalView`, `WaterfallView`, `OperationsView`
- ✅ Removed `overflow: 'hidden'` constraints from view root containers
- ✅ Updated `MasterDetailLayout` to use sticky master panel
- ✅ Removed internal scroll containers - rely on page-level scroll
- ✅ Fixed chart components to use direct imports (no manual dependency checks)
- ✅ Sidebar remains fixed (already implemented in CSS)

**Anti-Patterns (DO NOT USE)**:

- ❌ `height: '100%'` on view root containers
- ❌ `overflow: 'hidden'` on view containers (prevents natural flow)
- ❌ Internal scroll containers (`overflowY: 'auto'`) within views
- ❌ Manual dependency checks in chart components (try/catch for recharts)
- ❌ Compressed/independent scroll layouts

**Rationale**:

- **User Experience**: Traditional web scrolling is more intuitive than app-like compressed layouts
- **Accessibility**: Page-level scrolling works better with screen readers and keyboard navigation
- **Performance**: Simpler layout reduces CSS complexity and potential layout thrashing
- **Maintainability**: Natural flow is easier to reason about than constrained containers

#### Design Pattern: Visual Hierarchy & Grid Layout (v4.2)

**Status**: 🚧 **In Progress**

**Strategic Pivot**: Transform layout from "Standard Admin" to "Modern Financial Product" with enhanced visual hierarchy and modular grid layouts.

**Core Principles**:

1. **Layout Philosophy**:
   - **Bento Grid**: Adopt modular grid layout for Dashboard (blocks of different sizes)
   - **Card Anatomy**: Every card must have distinct Header (Title + Action), Body (Content), and Footer (Trend/Context)
   - **Typography**: Increase font size contrast. Headings should be bold and dark; metadata small and muted

2. **Component Architecture**:

   - **`StatCard`** (`src/components/dashboard/StatCard.tsx`):
     - New, cleaner KPI card with integrated Sparkline support
     - **Header**: Title + optional Action button/icon
     - **Body**: Large value with optional subtitle
     - **Footer**: Sparkline + Trend label + Metadata
     - Size variants: `default` (180px min-height) and `large` (220px min-height)
     - Status indicators: `success`, `warning`, `danger`, `neutral`
     - Typography: Bold headings (0.75-0.8125rem), large values (1.875-2.25rem), muted metadata (0.75rem)

   - **`GridContainer`** (`src/components/dashboard/GridContainer.tsx`):
     - Responsive CSS Grid wrapper handling 12-column layouts
     - **`GridContainer`**: Main wrapper with 12-column grid system
     - **`GridItem`**: Individual grid cell with column span control (1-12)
     - Supports responsive column spans via object syntax: `{ mobile?: number; tablet?: number; desktop?: number }`
     - Configurable gap spacing

3. **Dashboard Layout (Bento Grid)**:

   - **Row 1**: Three large cards (4 columns each)
     - NPV (large size, spans 4 columns)
     - Unlevered FCF (spans 4 columns)
     - Stabilized NOI (spans 4 columns)
   
   - **Row 2**: Mixed layout
     - DSCR card (spans 3 columns)
     - Senior DSCR card (spans 3 columns, conditional)
     - Results Summary (spans 6-9 columns, depending on Senior DSCR visibility)
   
   - **Row 3**: Full-width panels
     - Debt Summary (spans 12 columns)
   
   - **Row 4**: Split layout (if modelOutput exists)
     - Health Panel (spans 6 columns)
     - Scenario Summary (spans 6 columns)
   
   - **Row 5**: Full-width chart
     - Cash Flow Profile (spans 12 columns)

**Typography Scale** (v4.2):

- **Headings**: 
  - H1: `2rem` (32px), `font-weight: 700`, `color: var(--text-primary)`
  - H2: `1.25rem` (20px), `font-weight: 600`, `color: var(--text-primary)`
  - Card Title: `0.75-0.8125rem` (12-13px), `font-weight: 600`, `color: var(--text-secondary)`, `text-transform: uppercase`, `letter-spacing: 0.05em`

- **Values**:
  - Large Value: `1.875-2.25rem` (30-36px), `font-weight: 700`, `font-variant-numeric: tabular-nums`
  - Subtitle: `0.875rem` (14px), `font-weight: 500`, `color: var(--text-secondary)`

- **Metadata**:
  - Trend Label: `0.875rem` (14px), `font-weight: 500`, colored by trend direction
  - Metadata: `0.75rem` (12px), `color: var(--text-muted)`

**Migration Checklist** (v4.2):

- ✅ Created `StatCard` component with Header/Body/Footer anatomy
- ✅ Created `GridContainer` and `GridItem` components for 12-column layouts
- ✅ Updated `DashboardView` to use Bento Grid layout
- ✅ Replaced `KpiScorecard` with `StatCard` in Dashboard
- ✅ Enhanced typography contrast (larger headings, muted metadata)
- 🚧 Apply Bento Grid to other views (v4.3+)

**Design Tokens** (v4.2):

- Card padding: `1.25rem 1.5rem` (default), `1.5rem` (large)
- Card min-height: `180px` (default), `220px` (large)
- Grid gap: `1.5rem` (default, configurable)
- Hover effect: `translateY(-2px)` with enhanced shadow
- Status colors: `var(--success)`, `var(--warning)`, `var(--danger)`

**Anti-Patterns (DO NOT USE)**:

- ❌ Uniform card sizes (use varied sizes for visual interest)
- ❌ Weak typography contrast (headings must be bold and dark)
- ❌ Missing card anatomy (always include Header/Body/Footer)
- ❌ Fixed-width layouts (use responsive grid spans)

#### View Structure (`src/views/*`)

The application is organized into distinct Views, each representing a major functional area. Views are mapped from the old "Tabs" to the new "Views" architecture:

**View Mapping** (Old Tabs → New Views):

1. **`DashboardView`** (`src/views/DashboardView.tsx`):
   - **Purpose**: High-level KPIs and visualizations
   - **Content**: 
     - Key performance indicators (NPV, IRR, MoIC, Payback)
     - DCF Valuation summary
     - Debt metrics (DSCR, LTV)
     - Charts: Cash flow trends, valuation breakdown
   - **Replaces**: Old "Dashboard" tab
   - **Status**: ✅ Implemented

2. **`OperationsView`** (`src/views/OperationsView.tsx`):
   - **Purpose**: Input forms for all 9 operation types ("The Operations Command Center")
   - **Layout**: Master-Detail (Sidebar List | Main Panel) - v3.2
     - **Left Panel (Sidebar)**: `OperationList` - Fixed width (320px), scrollable asset list
     - **Right Panel (Main)**:
       - **Header**: Asset Name, Type Icon, "Active" Toggle
       - **KPI Ribbon**: Live metrics (RevPAR, Total Revenue, NOI Margin) - `OperationKpiRibbon`
       - **Input Section**: Grouped Cards (Revenue Drivers, Expenses) - Scrollable
       - **Mini Waterfall Chart**: Revenue breakdown (Revenue → Dept Exp → Undistributed → NOI) - Fixed height (~300px)
   - **Content**:
     - Operation configuration forms (refactored from old Assumptions tab)
     - Grouped by operation family (Lodging, F&B, Sports, Wellness, Commercial, Senior, Leisure)
     - KPI Ribbon with live metrics (requires model output) or estimated values (from config)
     - Mini Waterfall Chart showing revenue breakdown
   - **Replaces**: Old "Assumptions" tab (operations section)
   - **Status**: ✅ Implemented (v3.2: Operations Command Center)

3. **`CapitalView`** (`src/views/CapitalView.tsx`):
   - **Purpose**: Debt & Equity configuration ("Luxury Deal Structuring Room")
   - **Layout**: "The Deal Room" Layout (v3.1)
     - **Desktop**: CSS Grid (2 Columns)
       - **Left Pane (Capital Visualizer)**: Large "Sources & Uses" Stacked Chart (Animated) + Key Metrics Cards (WACC, LTV, DSCR)
       - **Right Pane (Structurer Console)**: Interactive Debt Tranche Cards + Global Equity Inputs
     - **Mobile**: Stacked (Single Column)
   - **Content**:
     - Debt tranche configuration (Interactive Cards, not table rows)
     - Equity structure
     - Debt schedule visualization
     - Capital stack summary
     - Live tuning: Sliders for Interest Rate and LTV with instant feedback
     - Constraint feedback: Visual "Gap" warning if Total Sources ≠ Total Uses
   - **Replaces**: Old "Assumptions" tab (capital section)
   - **Status**: 🚧 In Progress (v3.1: Capital Experience Upgrade)

4. **`WaterfallView`** (`src/views/WaterfallView.tsx`):
   - **Purpose**: Distribution tables & charts
   - **Layout**: Strict Dashboard Layout (v1.3)
     - **Top**: Summary KPIs (Cards) - Partner-level IRR and MOIC
     - **Middle**: `DistributionChart` (Stacked Bar: LP vs GP) - Fixed height (~400px)
     - **Bottom**: Detailed `WaterfallTable` - Scrollable container
   - **Content**:
     - Waterfall distribution by year
     - Partner-level returns (IRR, MoIC)
     - Distribution chart visualization (LP vs GP)
     - Tier summary (Return of Capital, Preferred Return, Promote)
   - **Replaces**: Old "Financials" tab (waterfall section)
   - **Status**: ✅ Implemented (v1.3: Strict Layout)

5. **`SimulationView`** / **`AnalysisView`** (`src/views/SimulationView.tsx`, `src/views/AnalysisView.tsx`):
   - **Purpose**: Risk analysis (Sensitivity & Monte Carlo)
   - **Content**:
     - Sensitivity analysis controls and results
     - Monte Carlo simulation interface
     - Risk metrics (VaR, CVaR, percentiles)
     - Distribution charts (histograms)
   - **Replaces**: Old "Analysis" tab
   - **Status**: ✅ Implemented (promoted to top-level view in v1.1)
   - **Note**: May be split into `RiskView` in v1.4

6. **`DataVersionsView`** (`src/views/DataVersionsView.tsx`):
   - **Purpose**: Version history & comparison
   - **Content**:
     - List of saved scenario versions
     - Version metadata (timestamp, label, description)
     - Version comparison (side-by-side diff)
     - Load/restore version functionality
   - **Replaces**: New dedicated view (was embedded in old UI)
   - **Status**: ✅ Implemented

**New Views (Planned)**:

7. **`PortfolioView`** (New, v1.4):
   - **Purpose**: Portfolio-level analytics aggregated by operation type
   - **Layout**: Strict Dashboard Layout (v1.4)
     - **Top**: Summary KPIs (Total Revenue, Total NOI, Operation Count)
     - **Middle**: Charts (Pie Chart: NOI Contribution, Bar Chart: Revenue Mix)
     - **Bottom**: Detailed table with per-type breakdown
   - **Content**:
     - Revenue by operation type
     - NOI by operation type
     - Valuation contribution by operation type
     - Operation count by type
   - **Status**: ⏳ Planned for v1.4

8. **`REaaSView`** (New, v1.4):
   - **Purpose**: REaaS-specific metrics and analytics
   - **Layout**: Strict Dashboard Layout (v1.4)
     - **Top**: REaaS Summary KPIs (Cards)
     - **Middle**: Comparison charts (REaaS vs Non-REaaS)
     - **Bottom**: Detailed REaaS operations table
   - **Content**:
     - Recurring Revenue % (REaaS revenue / total revenue)
     - REaaS NOI Yield (REaaS NOI / total NOI)
     - REaaS vs Non-REaaS comparison
     - REaaS operations breakdown
   - **Status**: ⏳ Planned for v1.4

9. **`GovernanceView`** (New, v1.5+):
   - **Purpose**: Advanced version management and governance
   - **Content**:
     - Version history with detailed metadata
     - Change tracking and diff visualization
     - Version tagging and labeling
     - Audit trail for scenario evolution
   - **Status**: ✅ Implemented (v1.5)

8. **`ReportsView`** (New, v1.1+):
   - **Purpose**: Print/Export tools and report generation
   - **Content**:
     - Report template selection
     - Print preview
     - Export options (PDF, Excel, CSV)
     - Customizable report sections
   - **Status**: ⏳ Planned for v1.1+

**Routing Strategy**:
- State-based routing (`activeView` state in `App.tsx`) to avoid complex router setup
- `ViewId` type defined in `src/components/layout/Sidebar.tsx`
- Views are rendered conditionally in `App.tsx` based on `activeView`
- Each View receives necessary props (model input/output, handlers)

**Model Controls & Results**:
- Controls and Results are distributed across relevant views:
  - Operations inputs → `OperationsView`
  - Capital configuration → `CapitalView`
  - Results/KPIs → `DashboardView`
  - Waterfall results → `WaterfallView`
  - Risk analysis → `SimulationView`/`AnalysisView`

**State Management**: `src/ui/state/sampleData.ts`
- `createSampleModelConfig()`: Creates a deterministic sample configuration (v0.4)
  - **Comprehensive multi-operation scenario**: All 9 operation types included:
    - HOTEL (100 keys, 70% occupancy, $250 ADR)
    - VILLAS (20 units, 65% occupancy, $500 rate)
    - RESTAURANT (80 covers, 1.2 turnover, $75 avg check)
    - BEACH_CLUB (200 daily passes, 500 memberships, 60% utilization)
    - RACQUET (8 courts, 300 memberships, 50% utilization)
    - RETAIL (500 sqm, 85% occupancy, $100/sqm rent)
    - FLEX (300 sqm, 75% occupancy, $80/sqm rent)
    - WELLNESS (400 memberships, 50 daily passes, 55% utilization)
    - SENIOR_LIVING (60 units, 90% occupancy, $3,500/month rate)
  - Project: $50M investment, 10% discount rate, 2% terminal growth, 5% working capital
  - Capital: 60% LTV debt, 6% rate, 10-year term, 20-year amortization
  - Waterfall: Multi-tier (Return of Capital → Preferred Return @ 8% hurdle → Promote 70/30 split), LP 90% / GP 10% equity contributions

**React Hook**: `src/ui/hooks/useFullModel.ts`
- `useFullModel()`: Manages `FullModelInput` state and computes `FullModelOutput` via `runFullModel`
- Uses `useMemo` to recompute output when input changes
- Returns `{ input, setInput, output }` where `output` is `null` on error

**Pipeline Integration**:
- `runFullModel` is the **only entry point** used by the UI to execute the pipeline
- UI is read-only-ish for now, with a few editable fields (discount rate, terminal growth, debt amount)
- All other configuration is read-only and comes from `createSampleModelConfig()`

#### Scenario Builder v1 (v0.5)

**Status**: ✅ Implemented in v0.5

**Overview**: Enables comparison of multiple scenarios side-by-side without modifying the core pipeline signature.

**Type Definitions**:
- **`NamedScenario`**:
  - `id`: unique identifier for the scenario
  - `name`: human-readable name (e.g., "Base Case", "Upside", "Downside")
  - `description`: optional text description of the scenario
  - `modelConfig`: `FullModelInput` - complete model configuration (scenario, projectConfig, capitalConfig, waterfallConfig)

- **`ScenarioSummary`**:
  - `scenarioId`: string - reference to the scenario
  - `scenarioName`: string - human-readable name
  - `projectKpis`: `ProjectKpis` - project-level KPIs (NPV, IRR, equity multiple, payback)
  - `capitalKpis`: aggregated debt KPIs:
    - `avgDscr`: average DSCR across all years (null if no debt or all DSCRs are null)
    - `finalLtv`: final LTV (last year's LTV, null if no debt or LTV is null)
    - `totalDebtService`: total debt service across all years
    - `totalDebtPrincipal`: total principal payments across all years
  - `waterfallKpis`: array of partner-level KPIs:
    - `partnerId`: string
    - `partnerName`: string
    - `irr`: number | null
    - `moic`: number

**Scenario Library (v0.5)**:
- In-memory "Scenario Library" that stores multiple `NamedScenario` instances.
- Implemented in `src/ui/state/scenarioLibrary.ts` with CRUD operations:
  - `listScenarios()`: returns all scenarios
  - `getScenario(id)`: retrieves a scenario by ID
  - `addScenario(scenario)`: adds a new scenario
  - `updateScenario(id, updates)`: updates an existing scenario
  - `deleteScenario(id)`: removes a scenario
- Library is initialized with default scenarios on module load (Base Case, Levered Multi-Tranche, Aggressive Promote).
- No persistence in v0.5 (scenarios are defined in code or sample data).
- React hook `useScenarioLibrary()` provides reactive access to the library.

### UI Design System (v1.0.2)

**Design Philosophy**: Professional "Investment Dashboard" aesthetic. Clean, data-dense, and readable.

**1. Layout Strategy**
- **Centered Container**: Max-width `1200px`, centered horizontally. Prevents tables from stretching infinitely on ultra-wide screens.
- **Card Metaphor**:
  - Background: White (`#ffffff`)
  - Shadow: Subtle (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`)
  - Border Radius: `8px`
  - Spacing: Distinct sections (Summary, Inputs, Charts) are separated by cards.
- **Grid System**:
  - Dashboard uses CSS Grid.
  - 2-column layout for high-level metrics vs charts.
  - Responsive: Stacks to 1 column on mobile/tablet.

**2. Typography & Color**
- **Font**: System Sans-Serif (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`).
- **Headers**: Dark Slate (`#1e293b`) for section titles.
- **Text**: Slate (`#475569`) for body text.
- **Data**:
  - Font: Monospace or `font-variant-numeric: tabular-nums` for alignment.
  - Alignment: **Right-Align** all numeric columns in tables.
- **Accents**:
  - Positive Cash Flow: Emerald Green (`#10b981`)
  - Negative Cash Flow: Red (`#ef4444`)
  - Primary Action: Blue (`#2563eb`)

**3. Component Specifics**
- **Tables**:
  - Padding: `12px` cell padding.
  - Borders: Subtle border-bottom (`#e2e8f0`) for rows.
  - Headers: Uppercase, small, tracking-wide, muted text.
- **Inputs**:
  - Grouped by category (e.g., "Revenue Assumptions", "Cost Assumptions").
  - Style: Bordered (`#cbd5e1`), rounded (`4px`), padding (`8px`).
  - Focus state: Ring/Border highlight (`#3b82f6`).

**Comparison Workflow**:
1. User selects scenario A and scenario B from the Scenario Library (via UI buttons).
2. UI calls `runFullModel(scenarioA.modelConfig)` and `runFullModel(scenarioB.modelConfig)` using `useMemo` for performance.
3. UI extracts key metrics from both outputs into `ScenarioSummary` objects using `buildScenarioSummary()` function.
4. UI displays side-by-side comparison:
   - KPI cards showing A vs B (Project KPIs, Capital KPIs, Waterfall KPIs)
   - Tables showing A vs B (e.g., annual FCF, debt schedule, waterfall)
   - Side-by-side columns with color-coded borders (blue for Scenario A, orange for Scenario B)

**Implementation Notes**:
- `buildScenarioSummary()` function in `src/engines/scenario/scenarioEngine.ts` extracts KPIs from `FullModelOutput`.
- v0.5 does **not** change the signature of `runFullModel` - it remains a pure function taking `FullModelInput` and returning `FullModelOutput`.
- v0.5 does **not** add complex scenario editing UI - scenarios may be defined in code (e.g., `scenarioLibrary.ts`) or hardcoded in the UI state.
- The Scenario Library is a simple in-memory array, not a database or file system.
- Comparison logic is UI-only - no new engine functions are required (only the helper `buildScenarioSummary()`).
- UI implementation in `App.tsx` includes Scenario Library panel and Scenario Comparison panel.

#### Scenario Builder v2 (v0.6) - Persistence & Export

**Status**: ✅ Implemented in v0.6

**Overview**: Adds persistence via `localStorage` and export functionality for scenarios and comparison results.

**Persistence Strategy (v0.6)**:
- **Storage Key**: `hospitality_scenarios_v1` (versioned to allow future schema migrations)
- **Storage Format**: JSON string containing an array of `NamedScenario` objects
- **Serialization Requirements**:
  - All `FullModelInput` fields must be JSON-serializable (no functions, no circular references)
  - Dates are stored as ISO strings or numbers (year indices)
  - Arrays and objects are serialized as-is (JSON-compatible)

**JSON Schema for Saved Scenarios**:
```typescript
interface SavedScenario {
  id: string;
  name: string;
  description?: string;
  modelConfig: {
    scenario: {
      id: string;
      name: string;
      startYear: number;
      horizonYears: number;
      operations: OperationConfig[]; // Must be JSON-serializable
    };
    projectConfig: {
      discountRate: number;
      terminalGrowthRate: number;
      initialInvestment: number;
      workingCapitalPercentage?: number;
    };
    capitalConfig: {
      initialInvestment: number;
      debtTranches: DebtTrancheConfig[]; // Must be JSON-serializable
    };
    waterfallConfig: {
      equityClasses: EquityClass[];
      tiers?: WaterfallTier[];
    };
  };
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}
```

**Persistence Operations (v0.6)**:
- `saveScenarioToStorage(scenario: NamedScenario)`: saves a scenario to `localStorage`
- `loadScenariosFromStorage()`: loads all scenarios from `localStorage`, returns `NamedScenario[]`
- `deleteScenarioFromStorage(id: string)`: removes a scenario from `localStorage`
- `clearAllScenariosFromStorage()`: clears all scenarios (for testing/reset)
- Scenarios are automatically saved when added/updated via the Scenario Library UI
- Scenarios are automatically loaded on app initialization (merged with default scenarios)

**Export Functionality (v0.6)**:
- **CSV Export**: "Download CSV" button that exports `ScenarioSummary` data
- **Export Format**: CSV file with columns:
  - Scenario ID, Scenario Name
  - Project KPIs: NPV, Unlevered IRR, Equity Multiple, Payback Period
  - Capital KPIs: Avg DSCR, Final LTV, Total Debt Service, Total Debt Principal
  - Waterfall KPIs: Partner ID, Partner Name, IRR, MOIC (one row per partner per scenario)
- **Export Implementation**:
  - Function: `exportScenarioSummaryToCSV(summaries: ScenarioSummary[])`
  - Uses browser `Blob` API to create CSV file
  - Triggers browser download via `URL.createObjectURL()` and `<a>` element click
- **JSON Export** (optional for v0.6):
  - "Download JSON" button that exports full `FullModelOutput` for selected scenarios
  - Useful for debugging and external analysis

**Implementation Notes**:
- Persistence is UI-only - engines remain pure and stateless.
- `localStorage` has size limits (~5-10MB) - warn users if approaching limit.
- Handle `localStorage` errors gracefully (quota exceeded, disabled, etc.).
- Export functions are pure utilities - no side effects except file download.
- Backward compatibility: v0.5 in-memory scenarios continue to work; persistence is additive.

#### Visualizations (v0.6)

**Status**: ✅ Implemented in v0.6

**Overview**: Adds rich chart visualizations to the UI for better data comprehension and scenario comparison.

**Chart Library Recommendation**:
- **Library**: `recharts` (React-based, compatible with React 19/Vite)
  - Alternative: `chart.js` with `react-chartjs-2` (also compatible)
  - Rationale: `recharts` is React-native, declarative, and well-maintained
- **Installation**: `npm install recharts`
- **Bundle Size**: ~200KB (acceptable for v0.6)

**Key Charts (v0.6)**:

1. **Sources & Uses / Capital Stack Chart**:
   - **Type**: Horizontal stacked bar chart
   - **Data Structure**:
     ```typescript
     interface CapitalStackData {
       category: 'Equity' | 'Debt Tranche 1' | 'Debt Tranche 2' | ...;
       amount: number;
       color: string; // Predefined colors per category
     }
     ```
   - **X-Axis**: Amount (currency)
   - **Y-Axis**: Capital source (Equity, Debt Tranches)
   - **Purpose**: Visualize initial capital structure (sources) and how it's used (uses = initial investment)
   - **Location**: Model Controls panel or Capital Structure section

2. **Cash Flow Profile Chart**:
   - **Type**: Combined bar/line chart
   - **Data Structure**:
     ```typescript
     interface CashFlowProfileData {
       yearIndex: number;
       noi: number;
       debtService: number;
       leveredFcf: number;
     }
     ```
   - **X-Axis**: Year (0..N)
   - **Y-Axis**: Amount (currency)
   - **Bars**: NOI (green), Debt Service (red, negative)
   - **Line**: Levered FCF (blue)
   - **Purpose**: Show cash flow dynamics over time
   - **Location**: Model Results panel, alongside Annual Unlevered FCF table

3. **Scenario Comparison Charts** (optional for v0.6):
   - **Type**: Side-by-side bar charts or grouped bar charts
   - **Data**: `ScenarioSummary` KPIs (NPV, IRR, MOIC) for Scenario A vs B
   - **Purpose**: Visual comparison of key metrics between scenarios
   - **Location**: Scenario Comparison panel

**Chart Component Structure**:
- **Location**: `src/components/charts/`
- **Components**:
  - `CapitalStackChart.tsx`: Sources & Uses visualization
  - `CashFlowProfileChart.tsx`: NOI, Debt Service, Levered FCF over time
  - `ScenarioComparisonChart.tsx`: Optional A vs B comparison charts
- **Props**: Chart components receive data arrays and configuration objects
- **Styling**: Use consistent color palette (defined in `src/ui/styles/chartColors.ts`)

**Implementation Notes**:
- Charts are pure presentational components - no business logic.
- Data transformation (from `FullModelOutput` to chart data) is done in parent components or utility functions.
- Charts are optional - UI should gracefully degrade if chart library fails to load.
- Responsive design: charts should adapt to container width (use `ResponsiveContainer` from recharts).
- Accessibility: Include ARIA labels and keyboard navigation where possible.

### UI/UX Guidelines (v2.4) - "Visual Foundation & Readability"

**Status**: ⏳ **In Progress** (Milestone v2.4)

**Strategic Pivot: UX-First Approach**

Based on user feedback that the application is "uncomfortable to look at" and "hard to understand", we are freezing new financial features to focus 100% on **UI/UX Overhaul**. This milestone establishes the visual foundation and readability standards that all components must adhere to.

**Design Philosophy Evolution**:
- **From**: Data-dense, functional dashboard
- **To**: Clean, comfortable, professional financial application with visual hierarchy that guides understanding

**1. Semantic Color Palette**

Move from generic color names to semantic color tokens that communicate purpose:

**Surface Colors**:
- `--color-surface-primary`: Pure White (`#FFFFFF`) - Main content backgrounds, cards
- `--color-surface-secondary`: Off-White (`#F8FAFC`) - Page backgrounds, subtle contrast
- `--color-surface-elevated`: White (`#FFFFFF`) with stronger shadow - Elevated cards, modals
- `--color-surface-hover`: Light Gray (`#F1F5F9`) - Interactive element hover states

**Primary Colors** (Trust & Professionalism):
- `--color-primary`: Deep Blue (`#1E40AF` or `#1D4ED8`) - Primary actions, links, emphasis
- `--color-primary-hover`: Darker Blue (`#1E3A8A` or `#1D4ED8`) - Primary button hover
- `--color-primary-light`: Light Blue (`#DBEAFE`) - Subtle highlights, backgrounds

**Text Colors** (Contrast & Readability):
- `--color-text-primary`: Dark Slate (`#0F172A`) - Main headings, critical values
- `--color-text-secondary`: Muted Slate (`#64748B`) - Labels, helper text, less important information
- `--color-text-tertiary`: Light Gray (`#94A3B8`) - Disabled text, placeholders

**Data Visualization Palette** (Chart Colors):
Avoid harsh reds unless indicating critical issues. Use professional, accessible colors:
- `--color-chart-emerald`: Emerald (`#10B981`) - Positive values, growth
- `--color-chart-indigo`: Indigo (`#6366F1`) - Primary data series
- `--color-chart-amber`: Amber (`#F59E0B`) - Warnings, attention
- `--color-chart-purple`: Purple (`#8B5CF6`) - Secondary data series
- `--color-chart-teal`: Teal (`#14B8A6`) - Tertiary data series
- `--color-chart-rose`: Rose (`#F43F5E`) - Only for critical alerts, negative values that require immediate attention

**State Colors**:
- `--color-success`: Emerald (`#10B981`) - Success states, positive outcomes
- `--color-warning`: Amber (`#F59E0B`) - Warnings, caution
- `--color-error`: Rose (`#F43F5E`) - Errors, critical issues (use sparingly)
- `--color-info`: Indigo (`#6366F1`) - Informational states

**Implementation**:
- All colors must be defined as CSS custom properties in `src/index.css`
- Components reference semantic tokens, never hardcoded hex values
- Chart components use `--color-chart-*` tokens exclusively

**2. Typography Scale**

Establish a clear type scale that supports both large KPI displays and dense table data:

**Font Family**:
- **Primary**: `Inter`, system-ui, -apple-system, sans-serif
- **Numbers**: `'Inter'` with `font-variant-numeric: tabular-nums` - **REQUIRED for all financial data**

**Type Scale**:
- **Display** (48px / 3rem): Large hero numbers, major KPIs
- **H1** (36px / 2.25rem): Page titles, section headers
- **H2** (30px / 1.875rem): Major subsection headers
- **H3** (24px / 1.5rem): Minor subsection headers
- **H4** (20px / 1.25rem): Card titles, panel headers
- **Body Large** (18px / 1.125rem): Important body text
- **Body** (16px / 1rem): Standard body text
- **Body Small** (14px / 0.875rem): Secondary text, captions
- **Label** (12px / 0.75rem): Form labels, table headers, metadata

**Font Weights**:
- **Regular** (400): Body text, labels
- **Medium** (500): Emphasized text, buttons
- **Semibold** (600): Headings, important values
- **Bold** (700): KPIs, critical numbers

**Financial Data Typography Rules**:
1. **All numeric values** (currency, percentages, counts) MUST use `font-variant-numeric: tabular-nums`
2. **All table numeric columns** MUST be right-aligned
3. **KPI values** use larger sizes (Display, H1, H2) with semibold/bold weight
4. **Table values** use Body or Body Small with regular weight
5. **Labels** use Label or Body Small with medium weight

**Implementation**:
- Define type scale as CSS custom properties in `src/index.css`
- Create utility classes for common patterns: `.kpi-value`, `.table-numeric`, `.label-text`

**3. Spacing System (4px Grid)**

Standardize all spacing using a 4px base grid for visual consistency:

**Spacing Scale** (4px increments):
- `4px` (0.25rem): Tight spacing, icon padding
- `8px` (0.5rem): Compact spacing, input padding
- `12px` (0.75rem): Default spacing, small gaps
- `16px` (1rem): Standard spacing, card padding
- `20px` (1.25rem): Comfortable spacing
- `24px` (1.5rem): Section spacing, larger gaps
- `32px` (2rem): Major section spacing
- `40px` (2.5rem): Large gaps between major sections
- `48px` (3rem): Maximum spacing, page-level sections

**Application Rules**:
- **Padding**: Cards use 16px (1rem) or 24px (1.5rem)
- **Margins**: Elements use 16px (1rem), sections use 24px (1.5rem) or 32px (2rem)
- **Gaps**: Grid/flex containers use 16px (1rem) or 24px (1.5rem)
- **Table Cell Padding**: 12px (0.75rem) vertical, 16px (1rem) horizontal

**Implementation**:
- Define spacing scale as CSS custom properties: `--spacing-1` through `--spacing-12`
- Use spacing tokens in all components (no arbitrary values like `padding: 13px`)

**4. Component Standardization: DataCard Pattern**

Define a standard `DataCard` component pattern for consistent content presentation:

**Structure**:
```
┌─────────────────────────────────┐
│ Header                          │ ← Optional title, actions
├─────────────────────────────────┤
│                                 │
│ Body                            │ ← Main content (required)
│                                 │
│                                 │
├─────────────────────────────────┤
│ Footer                          │ ← Optional metadata, actions
└─────────────────────────────────┘
```

**DataCard API**:
```typescript
interface DataCardProps {
  title?: string;              // Optional header title
  headerActions?: ReactNode;   // Optional header actions (buttons, icons)
  children: ReactNode;         // Required body content
  footer?: ReactNode;          // Optional footer content
  variant?: 'default' | 'elevated' | 'outlined';  // Visual variant
  className?: string;          // Additional CSS classes
}
```

**Visual Specifications**:
- **Background**: `--color-surface-primary` (white)
- **Border**: `1px solid var(--border)` (subtle, only if `outlined` variant)
- **Border Radius**: `8px` (0.5rem)
- **Shadow**: 
  - Default: `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)`
  - Elevated: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`
- **Padding**: 
  - Header: `20px 24px` (1.25rem 1.5rem)
  - Body: `24px` (1.5rem)
  - Footer: `16px 24px` (1rem 1.5rem)
- **Spacing**: Margin bottom `24px` (1.5rem) between cards

**Header Specifications**:
- Title uses H4 (20px / 1.25rem, semibold, `--color-text-primary`)
- Header actions aligned right
- Border-bottom separator (if body content present): `1px solid var(--border)`

**Footer Specifications**:
- Border-top separator: `1px solid var(--border)`
- Text uses Body Small (14px / 0.875rem, `--color-text-secondary`)

**Implementation**:
- Component location: `src/components/ui/DataCard.tsx`
- Must be reusable across all views
- Support responsive behavior (padding reduces on mobile)

**5. Component Standardization: DataTable Pattern**

Define a standard `DataTable` component pattern for consistent tabular data presentation:

**Structure**:
```
┌─────────────────────────────────────────────────┐
│ [Sticky Header Row]                             │ ← Always visible when scrolling
├─────────────────────────────────────────────────┤
│ Row 1                                           │ ← Hover effect
│ Row 2                                           │ ← Hover effect
│ Row 3                                           │
└─────────────────────────────────────────────────┘
```

**DataTable API**:
```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[];     // Column definitions
  data: T[];                   // Row data
  stickyHeader?: boolean;      // Make header sticky (default: true)
  rowHover?: boolean;          // Enable row hover effect (default: true)
  striped?: boolean;           // Alternate row colors (default: false)
  className?: string;          // Additional CSS classes
  onRowClick?: (row: T) => void;  // Optional row click handler
}
```

**Column Definition**:
```typescript
interface ColumnDef<T> {
  key: string;                 // Unique column key
  header: string;              // Header label
  accessor: (row: T) => ReactNode | number | string;  // Value accessor
  align?: 'left' | 'right' | 'center';  // Alignment (default: 'left')
  width?: string;              // Optional column width
  numeric?: boolean;           // If true, applies numeric styling
}
```

**Visual Specifications**:
- **Table Width**: 100% of container
- **Border Collapse**: `separate` with `border-spacing: 0`
- **Font**: Body Small (14px / 0.875rem) for data, Label (12px / 0.75rem) for headers

**Header Row**:
- **Background**: `--color-surface-secondary` (`#F8FAFC`)
- **Text**: Label size (12px / 0.75rem), uppercase, tracking-wide, `--color-text-secondary`
- **Padding**: `12px 16px` (0.75rem 1rem)
- **Border Bottom**: `2px solid var(--border)`
- **Sticky Position**: `position: sticky; top: 0; z-index: 10;` (when enabled)

**Data Rows**:
- **Background**: `--color-surface-primary` (white)
- **Text**: Body Small (14px / 0.875rem), `--color-text-primary`
- **Padding**: `12px 16px` (0.75rem 1rem)
- **Border Bottom**: `1px solid var(--border)` (subtle row separator)
- **Hover Effect**: Background changes to `--color-surface-hover` (`#F1F5F9`)
- **Numeric Columns**: 
  - Right-aligned
  - `font-variant-numeric: tabular-nums`
  - Monospace font weight

**Striped Variant**:
- Alternate rows: `--color-surface-secondary` (`#F8FAFC`)
- Improves scanability for large datasets

**Implementation**:
- Component location: `src/components/ui/DataTable.tsx`
- Must support TypeScript generics for type-safe column definitions
- Responsive: Horizontal scroll on mobile if needed (with visual indicator)

**6. Breathing Room & Visual Hierarchy**

**Increased Padding**:
- All cards increase internal padding by 25-50%
- Tables increase cell padding to improve readability
- Form inputs increase padding for comfortable interaction

**Visual Hierarchy Principles**:
1. **KPI Values**: Large, bold, high contrast - draw attention immediately
2. **Section Headers**: Clear typographic hierarchy (H1 → H2 → H3)
3. **Data Tables**: Subtle styling, don't compete with KPIs
4. **Actions**: Clearly differentiated (buttons vs links vs icons)

**White Space Strategy**:
- **Group related items** closely (8px-12px gap)
- **Separate major sections** significantly (24px-32px gap)
- **Use cards** to create visual boundaries between content areas
- **Avoid visual clutter** - if it's not essential, remove it or reduce prominence

**7. Migration Strategy**

**Phase 1: Foundation** (v2.4):
1. Update `src/index.css` with semantic color palette
2. Update `src/index.css` with typography scale
3. Update `src/index.css` with spacing system
4. Create `DataCard` component
5. Create `DataTable` component

**Phase 2: Component Migration** (v2.4.1):
1. Migrate all existing card components to use `DataCard`
2. Migrate all existing tables to use `DataTable`
3. Update all components to use semantic color tokens
4. Update all components to use typography scale
5. Update all components to use spacing system

**Phase 3: Refinement** (v2.4.2):
1. Review all views for visual consistency
2. Ensure all financial data uses tabular-nums
3. Verify all spacing follows 4px grid
4. Audit color usage (no hardcoded colors)
5. User testing and feedback integration

**8. Design Tokens Reference**

**CSS Custom Properties** (to be added to `src/index.css`):

```css
:root {
  /* Surface Colors */
  --color-surface-primary: #FFFFFF;
  --color-surface-secondary: #F8FAFC;
  --color-surface-elevated: #FFFFFF;
  --color-surface-hover: #F1F5F9;

  /* Primary Colors */
  --color-primary: #1D4ED8;
  --color-primary-hover: #1E3A8A;
  --color-primary-light: #DBEAFE;

  /* Text Colors */
  --color-text-primary: #0F172A;
  --color-text-secondary: #64748B;
  --color-text-tertiary: #94A3B8;

  /* Chart Colors */
  --color-chart-emerald: #10B981;
  --color-chart-indigo: #6366F1;
  --color-chart-amber: #F59E0B;
  --color-chart-purple: #8B5CF6;
  --color-chart-teal: #14B8A6;
  --color-chart-rose: #F43F5E;

  /* State Colors */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #F43F5E;
  --color-info: #6366F1;

  /* Typography Scale */
  --font-display: 3rem;    /* 48px */
  --font-h1: 2.25rem;      /* 36px */
  --font-h2: 1.875rem;     /* 30px */
  --font-h3: 1.5rem;       /* 24px */
  --font-h4: 1.25rem;      /* 20px */
  --font-body-large: 1.125rem;  /* 18px */
  --font-body: 1rem;       /* 16px */
  --font-body-small: 0.875rem;  /* 14px */
  --font-label: 0.75rem;   /* 12px */

  /* Spacing Scale (4px grid) */
  --spacing-1: 0.25rem;    /* 4px */
  --spacing-2: 0.5rem;     /* 8px */
  --spacing-3: 0.75rem;    /* 12px */
  --spacing-4: 1rem;       /* 16px */
  --spacing-5: 1.25rem;    /* 20px */
  --spacing-6: 1.5rem;     /* 24px */
  --spacing-8: 2rem;       /* 32px */
  --spacing-10: 2.5rem;    /* 40px */
  --spacing-12: 3rem;      /* 48px */
}
```

**Implementation Notes**:
- All new components MUST follow these guidelines
- Existing components should be migrated incrementally
- No hardcoded colors, font sizes, or spacing values allowed
- All financial data MUST use `font-variant-numeric: tabular-nums`
- Focus on user comfort and readability over information density

---

## Design Tokens v4.2: "Atmosphere & Typography" - Luxury Fintech Aesthetic

**Status**: ✅ **Defined** (Strategic Pivot v4.2)

**Context**:
The current UI is functional but generic. We need a distinctive "Luxury Fintech" aesthetic that fits the Hospitality domain, applying "Anti-AI-Slop" principles: no generic Inter/Roboto fonts, no flat grey backgrounds.

**Design Philosophy**:
Create an atmosphere that evokes luxury hotels and high-end financial services. The design should feel premium, sophisticated, and trustworthy—not generic SaaS.

### 1. Typography Strategy

**Font Families** (Google Fonts):

- **Headings**: `'Playfair Display'` (serif)
  - Elegant, high-contrast serif font
  - Evokes luxury hotels and premium hospitality
  - Used for: H1, H2, H3, H4, page titles, section headers, card titles
  - Font weights: 400 (regular), 600 (semibold), 700 (bold)

- **UI/Body**: `'Manrope'` (sans-serif)
  - Clean, geometric sans-serif for readability
  - Modern and professional
  - Used for: Body text, buttons, labels, form inputs, navigation
  - Font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

- **Data/Numbers**: `'JetBrains Mono'` or `'Space Grotesk'` (monospace/technical)
  - Technical, precise font for financial data
  - Ensures numeric alignment and readability
  - Used for: KPI values, table numbers, currency displays, percentages
  - Always with `font-variant-numeric: tabular-nums`

**Typography Hierarchy**:
- **Display** (48px / 3rem): Large hero numbers, major KPIs - `Playfair Display`, bold
- **H1** (36px / 2.25rem): Page titles - `Playfair Display`, semibold
- **H2** (30px / 1.875rem): Major subsection headers - `Playfair Display`, semibold
- **H3** (24px / 1.5rem): Minor subsection headers - `Playfair Display`, regular
- **H4** (20px / 1.25rem): Card titles, panel headers - `Playfair Display`, regular
- **Body Large** (18px / 1.125rem): Important body text - `Manrope`, regular
- **Body** (16px / 1rem): Standard body text - `Manrope`, regular
- **Body Small** (14px / 0.875rem): Secondary text, captions - `Manrope`, regular
- **Label** (12px / 0.75rem): Form labels, table headers, metadata - `Manrope`, medium
- **Data/Numeric**: All financial values - `JetBrains Mono` or `Space Grotesk`, with `font-variant-numeric: tabular-nums`

### 2. Atmosphere & Depth

**Background Strategy**:
- **NOT** solid color backgrounds
- Use a subtle CSS `radial-gradient`:
  - Deep Forest Green (`#0a1f1f`) fading to Black (`#000000`)
  - Creates depth and atmosphere
  - Alternative: "Noise Texture" overlay for paper-like feel (optional enhancement)

**Glassmorphism**:
- Use `backdrop-filter: blur(12px)` for panels
- **Dark tint** (Obsidian Glass) instead of white:
  - Background: `rgba(15, 46, 46, 0.85)` (Deep Jungle Green with transparency)
  - Border: `1px solid rgba(212, 175, 55, 0.2)` (subtle gold accent)
  - Shadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`
- Applied to: Cards, panels, modals, sidebar (optional)

### 3. Color Palette ("The Reserve")

**Primary Colors**:
- **Primary**: `#0f2e2e` (Deep Jungle Green)
  - Replaces standard Blue
  - Used for: Primary actions, links, active states, brand elements
  - Hover: `#0a1f1f` (darker shade)

- **Accent**: `#d4af37` (Metallic Gold)
  - For primary actions and key KPIs
  - Used for: CTA buttons, important highlights, key metrics, borders
  - Hover: `#b8941f` (darker gold)

**Surface Colors**:
- **Surface Primary**: `#ffffff` (Crisp White)
  - For data cards, panels, modals
  - Soft, diffused shadows: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)`
  
- **Surface Secondary**: `rgba(255, 255, 255, 0.95)` (Semi-transparent white)
  - For glassmorphic panels

- **Surface Hover**: `rgba(15, 46, 46, 0.05)` (Subtle green tint)
  - For interactive elements

**Text Colors**:
- **Text Primary**: `#0f172a` (Near Black)
  - For headings, primary content
- **Text Secondary**: `#475569` (Slate)
  - For secondary text, labels
- **Text Tertiary**: `#94a3b8` (Light Slate)
  - For muted text, placeholders

**State Colors** (Maintained for consistency):
- **Success**: `#10b981` (Emerald)
- **Warning**: `#f59e0b` (Amber)
- **Error**: `#f43f5e` (Rose)
- **Info**: `#6366f1` (Indigo)

**Chart Colors** (Adjusted for new palette):
- Maintain semantic chart colors but ensure they work with Deep Jungle Green background
- Consider gold accents for key data series

### 4. Design Tokens Implementation

**CSS Custom Properties** (v4.2):

```css
:root {
  /* Typography Families */
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Space Grotesk', monospace;

  /* Color Palette: The Reserve */
  --color-primary: #0f2e2e;              /* Deep Jungle Green */
  --color-primary-hover: #0a1f1f;        /* Darker Green */
  --color-accent: #d4af37;               /* Metallic Gold */
  --color-accent-hover: #b8941f;         /* Darker Gold */
  
  /* Surface Colors */
  --color-surface-primary: #ffffff;       /* Crisp White */
  --color-surface-secondary: rgba(255, 255, 255, 0.95);  /* Semi-transparent */
  --color-surface-hover: rgba(15, 46, 46, 0.05);        /* Subtle green tint */
  
  /* Background Gradient */
  --bg-gradient: radial-gradient(ellipse at center, #0a1f1f 0%, #000000 100%);
  
  /* Glassmorphism */
  --glass-bg: rgba(15, 46, 46, 0.85);
  --glass-border: rgba(212, 175, 55, 0.2);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  --glass-blur: blur(12px);
  
  /* Text Colors */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  
  /* Shadows (Soft, diffused) */
  --shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06);
  --shadow-medium: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-large: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

**Implementation Requirements**:
1. **Google Fonts**: Import Playfair Display, Manrope, and JetBrains Mono in `index.html`
2. **Background**: Apply `--bg-gradient` to `html, body` or main container
3. **Glassmorphism**: Apply to cards, panels using `--glass-*` tokens
4. **Typography**: Use `--font-heading` for all headings, `--font-body` for UI text, `--font-mono` for numeric data
5. **Colors**: Replace all blue primary colors with Deep Jungle Green (`--color-primary`)
6. **Accents**: Use Metallic Gold (`--color-accent`) for CTAs and key highlights

**Migration Strategy**:
- Phase 1: Update `src/index.css` with new design tokens
- Phase 2: Update `index.html` with Google Fonts imports
- Phase 3: Apply background gradient to main container
- Phase 4: Migrate components to use new typography families
- Phase 5: Update color usage (primary → Deep Jungle Green, accents → Gold)
- Phase 6: Apply glassmorphism to cards and panels

**Anti-AI-Slop Compliance**:
- ✅ No generic Inter/Roboto fonts
- ✅ No flat grey backgrounds
- ✅ Distinctive typography hierarchy
- ✅ Atmospheric depth with gradients
- ✅ Premium aesthetic appropriate for luxury hospitality

### Dashboard Storytelling (v2.5) - "Context-Rich KPIs"

**Status**: ✅ **Implemented** (Milestone v2.5)

**Context**:
The current Dashboard displays static numbers without context. Users need "Storytelling" elements that provide understanding at a glance: Trends (Sparklines), Health Status (Traffic Lights), and comparisons (vs Target, vs Year 1).

**Design Philosophy**:
Transform static KPI displays into rich, contextual scorecards that tell a story. Each KPI should communicate:
1. **Current Value**: What it is now
2. **Trend**: Is it improving or declining?
3. **Trajectory**: How has it changed over time (sparkline)?
4. **Health**: Is this value healthy or concerning?

**1. Component Architecture: KpiScorecard**

**Location**: `src/components/dashboard/KpiScorecard.tsx`

**Component Structure**:
```
┌─────────────────────────────────────┐
│ Label: "Levered IRR"               │
│ Primary Value: "18.5%"             │
│                                     │
│ [↑ +2.3% vs Target]  [🟢 Healthy]  │ ← Trend + Status
│                                     │
│ [══════════════════]               │ ← Sparkline
│        Year 0 → N                  │
└─────────────────────────────────────┘
```

**KpiScorecard API**:
```typescript
interface KpiScorecardProps {
  // Core Display
  label: string;                    // KPI name (e.g., "Levered IRR")
  value: number | string;           // Primary value to display
  format?: 'currency' | 'percent' | 'number' | 'years' | 'custom';  // Formatting type
  unit?: string;                    // Optional unit suffix (e.g., "%", "$", "years")
  
  // Trend Indicator
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: number;                  // Change amount (e.g., 2.3 for +2.3%)
    comparison?: 'target' | 'year1' | 'baseline';  // What is being compared
    label?: string;                 // Optional custom label
  };
  
  // Sparkline Data
  sparkline?: {
    data: number[];                 // Time series values (Year 0 to N)
    xAxis?: number[];               // Optional x-axis labels (default: year indices)
    color?: string;                 // Line color (default: primary color)
  };
  
  // Health Status
  health?: {
    status: 'success' | 'warning' | 'danger' | 'neutral';
    thresholds?: {                  // Thresholds that define health levels
      warning?: number;             // Value below/above which shows warning
      danger?: number;              // Value below/above which shows danger
    };
    label?: string;                 // Optional status label (e.g., "Healthy", "At Risk")
  };
  
  // Optional Metadata
  description?: string;             // Tooltip or help text
  target?: number;                  // Target value (for comparison)
  className?: string;               // Additional CSS classes
}
```

**Visual Specifications**:

**Card Layout**:
- **Container**: Uses `DataCard` component pattern (from v2.4)
- **Padding**: `20px 24px` (1.25rem 1.5rem)
- **Min Height**: `180px` (accommodates sparkline)
- **Max Width**: Responsive, fits grid columns

**Label**:
- **Font**: Label (12px / 0.75rem), semibold (600), `--color-text-secondary`
- **Margin Bottom**: `8px` (0.5rem)

**Primary Value**:
- **Font**: Display or H2 (30px / 1.875rem or 36px / 2.25rem), bold (700)
- **Color**: `--color-text-primary`
- **Font Variant**: `tabular-nums` (if numeric)
- **Margin Bottom**: `12px` (0.75rem)

**Trend Indicator**:
- **Layout**: Horizontal flex container
- **Direction Icon**: Up arrow (↑) for positive, down arrow (↓) for negative, horizontal (→) for neutral
- **Icon Color**: 
  - Up: `--color-success` (emerald)
  - Down: `--color-error` (rose)
  - Neutral: `--color-text-tertiary` (light gray)
- **Text**: Body Small (14px / 0.875rem), `--color-text-secondary`
- **Format**: "+X%" or "-X%" or "No change"
- **Comparison Label**: "vs Target" or "vs Year 1" or custom

**Status Badge**:
- **Visual**: Small circular indicator or pill-shaped badge
- **Colors**:
  - Success: `--color-success` background with white icon
  - Warning: `--color-warning` background with white icon
  - Danger: `--color-error` background with white icon
  - Neutral: `--color-surface-hover` background with gray icon
- **Position**: Top-right corner or inline with trend
- **Icon**: Checkmark (✓) for success, Warning (⚠) for warning, Alert (!) for danger

**Sparkline**:
- **Height**: `60px` (3.75rem)
- **Width**: 100% of card width (minus padding)
- **Line Color**: `--color-chart-indigo` (default) or custom
- **Line Width**: 2px
- **Area Fill**: Optional subtle fill below line (10% opacity)
- **X-Axis**: Minimal labels (Year 0, N) or hidden if space-constrained
- **Y-Axis**: Hidden (sparkline shows relative trend, not absolute scale)
- **Tooltip**: On hover, show exact value and year

**Implementation Notes**:
- Sparkline uses a lightweight charting solution (e.g., `recharts` Sparkline component or custom SVG)
- All numeric values use `font-variant-numeric: tabular-nums`
- Component is responsive and adapts to grid column widths
- Accessible: Include ARIA labels and keyboard navigation

**2. Logic Architecture: Trend Helpers**

**Location**: `src/domain/trendHelpers.ts`

**Functions**:

**calculateTrend**:
```typescript
/**
 * Calculates trend between two values.
 * 
 * @param current - Current value
 * @param previous - Previous value (for comparison)
 * @param format - Format type ('percent' | 'number' | 'currency')
 * @returns Trend object with direction and value
 */
export function calculateTrend(
  current: number,
  previous: number,
  format: 'percent' | 'number' | 'currency' = 'percent'
): {
  direction: 'up' | 'down' | 'neutral';
  value: number;
  formatted: string;
}
```

**Implementation**:
- **Percentage Change**: `((current - previous) / previous) * 100`
- **Absolute Change**: `current - previous`
- **Direction**:
  - Up: change > 0.01% (tolerance for floating point)
  - Down: change < -0.01%
  - Neutral: otherwise
- **Formatting**: Format based on `format` parameter

**calculateCAGR**:
```typescript
/**
 * Calculates Compound Annual Growth Rate (CAGR).
 * 
 * @param startValue - Starting value
 * @param endValue - Ending value
 * @param periods - Number of periods (years)
 * @returns CAGR as decimal (e.g., 0.15 for 15%)
 */
export function calculateCAGR(
  startValue: number,
  endValue: number,
  periods: number
): number | null
```

**Formula**: `CAGR = (endValue / startValue) ^ (1 / periods) - 1`

**Edge Cases**:
- Returns `null` if `periods <= 0` or `startValue <= 0`
- Handles negative values (returns negative CAGR)

**calculateSimpleGrowth**:
```typescript
/**
 * Calculates simple growth (difference between first and last).
 * Useful for metrics that don't require compounding.
 * 
 * @param values - Time series array
 * @returns Growth percentage
 */
export function calculateSimpleGrowth(values: number[]): number | null
```

**Implementation**:
- Returns `null` if array length < 2
- Formula: `((last - first) / first) * 100`

**extractTimeSeries**:
```typescript
/**
 * Extracts time series from model output for a specific metric.
 * 
 * @param modelOutput - Full model output
 * @param metric - Metric identifier (e.g., 'noi', 'dscr', 'irr')
 * @returns Array of values over time (Year 0 to N)
 */
export function extractTimeSeries(
  modelOutput: FullModelOutput,
  metric: string
): number[]
```

**Supported Metrics**:
- `'noi'`: Net Operating Income from `ConsolidatedAnnualPnl[]`
- `'revenue'`: Total Revenue from `ConsolidatedAnnualPnl[]`
- `'dscr'`: Debt Service Coverage Ratio from `DebtKpi[]`
- `'ltv'`: Loan-to-Value from `DebtKpi[]`
- `'leveredFcf'`: Levered Free Cash Flow from `LeveredFcf[]`
- `'unleveredFcf'`: Unlevered Free Cash Flow from `UnleveredFcf[]`

**3. Logic Architecture: Health Evaluator**

**Location**: `src/domain/healthEvaluator.ts`

**Health Thresholds**:
Define standard thresholds for common KPIs:

```typescript
interface HealthThresholds {
  warning?: number;    // Value that triggers warning status
  danger?: number;     // Value that triggers danger status
  direction?: 'higher' | 'lower';  // Is higher or lower better?
}
```

**Standard Thresholds** (configurable):
```typescript
const DEFAULT_THRESHOLDS: Record<string, HealthThresholds> = {
  dscr: {
    warning: 1.3,      // DSCR < 1.3 is concerning
    danger: 1.2,       // DSCR < 1.2 is critical
    direction: 'higher'
  },
  ltv: {
    warning: 0.70,     // LTV > 70% is concerning
    danger: 0.80,      // LTV > 80% is critical
    direction: 'lower'
  },
  irr: {
    warning: 0.10,     // IRR < 10% is concerning
    danger: 0.08,      // IRR < 8% is critical
    direction: 'higher'
  },
  paybackPeriod: {
    warning: 10,       // Payback > 10 years is concerning
    danger: 15,        // Payback > 15 years is critical
    direction: 'lower'
  },
  // Add more as needed
};
```

**evaluateHealth**:
```typescript
/**
 * Evaluates health status of a KPI value based on thresholds.
 * 
 * @param value - Current KPI value
 * @param thresholds - Health thresholds configuration
 * @returns Health status object
 */
export function evaluateHealth(
  value: number | null,
  thresholds: HealthThresholds
): {
  status: 'success' | 'warning' | 'danger' | 'neutral';
  label: string;
}
```

**Logic**:
1. If `value === null`, return `{ status: 'neutral', label: 'N/A' }`
2. If `direction === 'higher'` (higher is better):
   - Danger: `value < danger`
   - Warning: `value < warning && value >= danger`
   - Success: `value >= warning`
3. If `direction === 'lower'` (lower is better):
   - Danger: `value > danger`
   - Warning: `value > warning && value <= danger`
   - Success: `value <= warning`
4. If no thresholds defined, return `{ status: 'neutral', label: 'No threshold' }`

**4. Dashboard Layout: Migration from ProjectKpiPanel**

**Current State**:
- `DashboardView` uses `ProjectKpiPanel` which displays static KPIs in a simple grid
- No trend indicators, sparklines, or health status

**Target State**:
- Replace `ProjectKpiPanel` with a grid of `KpiScorecard` components
- Each KPI gets its own rich scorecard with trend, sparkline, and health

**Dashboard Grid Layout**:
```typescript
// DashboardView.tsx
<div className="kpi-scorecard-grid" style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '24px',  // 1.5rem
  marginBottom: '32px'  // 2rem
}}>
  <KpiScorecard
    label="NPV"
    value={projectKpis.npv}
    format="currency"
    trend={calculateTrend(projectKpis.npv, targetNpv, 'currency')}
    sparkline={{ data: extractTimeSeries(modelOutput, 'npv') }}
    health={evaluateHealth(projectKpis.npv, { direction: 'higher' })}
  />
  <KpiScorecard
    label="Unlevered IRR"
    value={projectKpis.unleveredIrr}
    format="percent"
    trend={calculateTrend(projectKpis.unleveredIrr, year1Irr, 'percent')}
    sparkline={{ data: extractTimeSeries(modelOutput, 'unleveredIrr') }}
    health={evaluateHealth(projectKpis.unleveredIrr, DEFAULT_THRESHOLDS.irr)}
  />
  <KpiScorecard
    label="Equity Multiple"
    value={projectKpis.equityMultiple}
    format="number"
    trend={calculateTrend(projectKpis.equityMultiple, targetMultiple, 'number')}
    health={evaluateHealth(projectKpis.equityMultiple, { direction: 'higher' })}
  />
  {/* ... more KPIs ... */}
</div>
```

**KPI Mapping**:

**Project KPIs** (from `ProjectKpis`):
- NPV → Currency format, compare vs target
- Unlevered IRR → Percent format, compare vs Year 1, health thresholds
- Equity Multiple → Number format, compare vs target
- Payback Period → Years format, health thresholds (lower is better)
- WACC → Percent format, compare vs discount rate

**Capital KPIs** (from `DebtKpi[]`):
- Average DSCR → Number format, health thresholds (higher is better)
- Final LTV → Percent format, health thresholds (lower is better)
- Aggregate Debt Service → Currency format, trend from Year 1

**Waterfall KPIs** (from `WaterfallResult`):
- Partner IRR → Percent format, compare vs target
- Partner MOIC → Number format, compare vs target

**5. Data Flow Architecture**

**Data Transformation Pipeline**:
```
FullModelOutput
  ↓
extractTimeSeries() → number[] (for sparklines)
  ↓
calculateTrend() → Trend object (for trend indicators)
  ↓
evaluateHealth() → Health object (for status badges)
  ↓
KpiScorecard → Rendered component
```

**Integration Points**:
1. **DashboardView** (`src/views/DashboardView.tsx`):
   - Receives `FullModelOutput` as prop
   - Extracts KPIs and time series data
   - Constructs `KpiScorecard` props
   - Renders grid of scorecards

2. **Trend Helpers** (`src/domain/trendHelpers.ts`):
   - Pure functions, no side effects
   - Testable independently
   - Used by UI components

3. **Health Evaluator** (`src/domain/healthEvaluator.ts`):
   - Pure functions, no side effects
   - Configurable thresholds
   - Used by UI components

**6. Migration Strategy**

**Phase 1: Foundation** (v2.5.0):
1. Implement `trendHelpers.ts` with all trend calculation functions
2. Implement `healthEvaluator.ts` with health evaluation logic
3. Create `KpiScorecard` component
4. Add tests for trend helpers and health evaluator

**Phase 2: Integration** (v2.5.1):
1. Create `extractTimeSeries` function
2. Integrate `KpiScorecard` into `DashboardView`
3. Replace `ProjectKpiPanel` with scorecard grid
4. Add time series extraction tests

**Phase 3: Enhancement** (v2.5.2):
1. Add target comparison capabilities
2. Add custom threshold configuration
3. Add tooltips and help text
4. User testing and refinement

**7. Component Dependencies**

**External Libraries**:
- **Sparkline**: Use `recharts` SparkLine component or lightweight alternative
- **Icons**: Use existing icon library (e.g., `lucide-react` for arrows, status icons)

**Internal Dependencies**:
- `DataCard` component (from v2.4) as base for scorecard
- Design tokens from v2.4 (colors, typography, spacing)
- Type definitions from `src/domain/types.ts`

**Implementation Notes**:
- All trend calculations must handle edge cases (null values, zero values, negative values)
- Health evaluator must be configurable per KPI (some thresholds may differ by property type)
- Sparkline data must be normalized appropriately (some KPIs may have very different scales)
- Performance: Consider memoization for expensive calculations (trend, health evaluation)

**8. Testing Requirements**

**Unit Tests**:
- `trendHelpers.test.ts`: Test all trend calculation functions
- `healthEvaluator.test.ts`: Test health evaluation logic
- `KpiScorecard.test.tsx`: Test component rendering and props

**Integration Tests**:
- `DashboardView.test.tsx`: Test scorecard grid rendering with real data
- Test time series extraction from `FullModelOutput`
- Test trend calculations with various data patterns

**Visual Regression**:
- Test scorecard rendering with different states (success, warning, danger)
- Test sparkline rendering with various data shapes (upward trend, downward trend, flat)
- Test responsive behavior (grid adapts to screen size)

### Legacy Components (Still Available)

The following components exist but are not used by the current playground UI:
- `ProjectKpiPanel`, `DebtSummaryPanel`, `WaterfallPanel`, `ScenarioSummaryPanel`
- These can be reused in future UI iterations

### Components

- **`ProjectKpiPanel`** (`src/components/ProjectKpiPanel.tsx`):
  - **Props**: `projectKpis: ProjectKpis`, `dcfValuation?: DcfValuation`
  - **Displays**: NPV, unlevered IRR, equity multiple, payback period, enterprise value, equity value
  - **Format**: Currency for values, percentage for rates, formatted numbers

- **`DebtSummaryPanel`** (`src/components/DebtSummaryPanel.tsx`):
  - **Props**: `debtSchedule: DebtSchedule`, `debtKpis?: DebtKpi[]`
  - **Displays**: Debt schedule table (first 5 years: Year, Beginning Balance, Interest, Principal, Ending Balance)
  - **Also shows**: Debt KPIs table (DSCR, LTV per year)
  - **Handles**: No-debt scenario (shows message if no debt exists)

- **`WaterfallPanel`** (`src/components/WaterfallPanel.tsx`):
  - **Props**: `waterfallResult: WaterfallResult`
  - **Displays**: 
    - Partner KPIs table (Partner, IRR, MOIC)
    - Annual cash flows table (Year, Owner CF, one column per partner)
  - **Invariant check**: Visual indicator (✓ or ⚠️) showing if waterfall invariant is satisfied

- **`ScenarioSummaryPanel`** (`src/components/ScenarioSummaryPanel.tsx`):
  - **Props**: `consolidatedAnnualPnl: ConsolidatedAnnualPnl[]`
  - **Displays**: First 3 years of consolidated P&L (Year, Total Revenue, EBITDA, NOI, Maintenance Capex)
  - **Purpose**: High-level sanity check of operational results

### Sample Data

- **`src/domain/sampleScenario.ts`**: Hardcoded sample scenario configuration
  - `sampleScenario: ProjectScenario` - Single hotel operation (100 rooms, 70% occupancy, $250 ADR)
  - `sampleProjectConfig: ProjectConfig` - 10% discount rate, 2% terminal growth, $50M investment
  - `sampleCapitalConfig: CapitalStructureConfig` - 65% debt, 10% interest, 5-year term
  - `sampleWaterfallConfig: WaterfallConfig` - LP (70%) and GP (30%) equity split

- **`src/sampleData.ts`**: Legacy sample data with multiple scenarios (BASE, DOWNSIDE, UPSIDE)
  - Used by `runFullPipeline` and older UI implementations
  - Still available for testing and future enhancements

---

## Important Conventions

### Indexing
- **All indices are 0-based**: `yearIndex` (0..N-1), `monthIndex` (0..11)
- **Year 0** = initial investment year (negative cash flow)
- **Years 1..N** = operating years

### Units
- **Monetary values**: `number` in project currency (no formatting in domain layer)
- **Percentages**: stored as decimals (0.10 = 10%, 0.70 = 70%)
- **Rates**: decimals (discount rate 0.10 = 10%, interest rate 0.10 = 10%)

### Time Assumptions
- **Days per month**: 30 (simple approximation)
- **Months per year**: 12

### Financial Calculations
- **Sign convention**: Year 0 typically negative (investment), subsequent years positive (returns)
- **IRR**: Returns `null` if no valid root found or all cash flows are zero
- **Equity multiple**: `(sum of positive flows) / (absolute sum of negative flows)`
- **Payback period**: Measured in years, returns `null` if payback never occurs

### Data Flow Invariants

**Enforced invariants** (with dev-only warnings if violated):

1. **Debt Schedule Invariant** (Capital Engine):
   - `sum(principal payments) + final ending balance ≈ initial debt amount`
   - Tolerance: 0.01 (allows floating-point differences)
   - Validates that all principal is accounted for

2. **Waterfall Invariant** (Waterfall Engine):
   - For every year t: `|sum(partner CFs) - owner CF| ≤ 0.01`
   - Guaranteed by last-partner-gets-remainder strategy
   - Warns if difference exceeds tolerance

3. **UFCF Finiteness** (Project Engine):
   - All UFCF values must be finite (no NaN or Infinity)
   - Warns if non-finite value detected with yearIndex and inputs

**Structural Invariants**:
- **Sum of partner CFs = owner CF**: Waterfall engine guarantees this (last partner gets remainder)
- **Owner levered cash flows length**: `horizonYears + 1` (Year 0..N)
- **Consolidated P&L length**: `horizonYears` (Year 0..N-1)
- **UFCF formula**: `UFCF_t = NOI_t - MaintenanceCapex_t - ChangeInWorkingCapital_t` (single source of truth)
- **Levered FCF formula**: `LeveredFCF_t = UnleveredFCF_t - DebtService_t`

---

## How to Extend

### Adding a New Operation Type

**Note**: As of v0.4, all 9 operation types are implemented. This section describes the pattern for reference, but future work (v0.5+) focuses on refinement of existing types rather than creating new ones.

1. Define new config type in `src/domain/types.ts` (e.g., `VillasConfig`)
2. Add to `OperationConfig` union type: `export type OperationConfig = HotelConfig | VillasConfig | ...`
3. Create engine: `src/engines/operations/villasEngine.ts` with `runVillasEngine(config: VillasConfig): VillasEngineResult`
4. Update dispatcher: Add case in `runOperation()` in `src/engines/operations/index.ts`
5. Add tests: `src/tests/engines/operations/villasEngine.test.ts`
6. **Update this document** with new operation type

### Adding New KPIs

1. Add KPI field to appropriate result type in `src/domain/types.ts`
2. Calculate KPI in relevant engine
3. Update UI component to display new KPI
4. Add tests verifying KPI calculation
5. **Update this document** with new KPI

### Enhancing Waterfall

- Current: Single-tier, percentage-based split
- Future: Multi-tier with IRR promotes, preferred returns, catch-up
- Location: `src/engines/waterfall/waterfallEngine.ts`
- Extend `WaterfallConfig` to include tier definitions
- **Update this document** before implementing

### UI Enhancements

- Add input forms for custom scenarios (currently uses sample data)
- Add scenario comparison view
- Add charts/visualizations
- Add export functionality
- **Update this document** with new UI features

---

## File Structure

```
src/
├── domain/
│   ├── types.ts          # All domain types
│   └── financial.ts      # Financial utilities (NPV, IRR, equityMultiple, paybackPeriod)
├── engines/
│   ├── operations/
│   │   ├── hotelEngine.ts
│   │   ├── villasEngine.ts
│   │   ├── restaurantEngine.ts
│   │   ├── beachClubEngine.ts
│   │   ├── racquetEngine.ts
│   │   ├── retailEngine.ts
│   │   ├── flexEngine.ts
│   │   ├── wellnessEngine.ts
│   │   ├── seniorLivingEngine.ts
│   │   └── index.ts       # runOperation dispatcher
│   ├── scenario/
│   │   └── scenarioEngine.ts
│   ├── project/
│   │   └── projectEngine.ts
│   ├── capital/
│   │   └── capitalEngine.ts
│   ├── waterfall/
│   │   └── waterfallEngine.ts
│   └── pipeline/
│       ├── fullPipeline.ts      # Legacy pipeline orchestrator
│       └── modelPipeline.ts      # Full model pipeline (runFullModel)
├── components/
│   ├── ProjectKpiPanel.tsx      # Project-level KPIs (NPV, IRR, Multiple, etc.)
│   ├── DebtSummaryPanel.tsx     # Debt schedule and leverage KPIs
│   ├── WaterfallPanel.tsx        # Equity waterfall results
│   ├── ScenarioSummaryPanel.tsx   # Consolidated P&L summary
│   ├── ResultsSummary.tsx        # Legacy component (still exists)
│   ├── DebtTable.tsx             # Legacy component (still exists)
│   └── WaterfallTable.tsx        # Legacy component (still exists)
├── tests/
│   ├── financial.test.ts
│   └── engines/
│       ├── operations/
│       ├── scenario/
│       ├── project/
│       ├── capital/
│       ├── waterfall/
│       └── pipeline/
├── ui/
│   ├── state/
│   │   └── sampleData.ts      # createSampleModelConfig() for playground
│   └── hooks/
│       └── useFullModel.ts     # React hook for running full model
├── domain/
│   └── sampleScenario.ts  # Legacy hardcoded sample scenario
├── sampleData.ts         # Legacy scenario builders (BASE, DOWNSIDE, UPSIDE)
└── App.tsx               # Main UI component (playground)
```

### Path Aliases

- `@domain/*` → `src/domain/*`
- `@engines/*` → `src/engines/*`

Configured in `tsconfig.app.json` and `vite.config.ts`.

---

## Testing

- **Location**: `src/tests/`
- **Framework**: Vitest
- **Coverage**: All engines have comprehensive tests
- **Philosophy**: Pure functions enable easy testing, no mocking required
- **Key test files**:
  - `financial.test.ts`: NPV, IRR, equity multiple, payback period
  - `engines/operations/hotelEngine.test.ts`: Hotel engine logic
  - `engines/operations/villasEngine.test.ts`: Villas engine logic
  - `engines/operations/restaurantEngine.test.ts`: Restaurant engine logic
  - `engines/operations/beachClubEngine.test.ts`: Beach club engine logic
  - `engines/operations/racquetEngine.test.ts`: Racquet engine logic
  - `engines/operations/retailEngine.test.ts`: Retail engine logic
  - `engines/operations/flexEngine.test.ts`: Flex engine logic
  - `engines/operations/wellnessEngine.test.ts`: Wellness engine logic
  - `engines/operations/seniorLivingEngine.test.ts`: Senior living engine logic
  - `engines/scenario/scenarioEngine.test.ts`: Consolidation logic (including multi-operation scenarios)
  - `engines/project/projectEngine.test.ts`: UFCF, DCF, KPIs
  - `engines/capital/capitalEngine.test.ts`: Debt schedule, levered FCF
  - `engines/waterfall/waterfallEngine.test.ts`: Partner distributions
  - `engines/pipeline/fullPipeline.test.ts`: End-to-end pipeline (legacy)
  - `engines/pipeline/modelPipeline.test.ts`: Full model pipeline tests (no-debt, with-debt, waterfall invariant)
  - `pipeline/pipelineInvariants.test.ts`: Pipeline-wide invariant checks (array lengths, NaN/Infinity, formula consistency, debt schedule, waterfall sum)

---

## v0.4 Status

**Current Version**: v0.4

### What is Implemented and Tested (v0.4)

1. **Full Pipeline**: ✅ Complete end-to-end flow from operations to waterfall
   - **Operations Engine**: ✅ All 9 operation types fully implemented, integrated, tested, and included in sample data:
     - HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING
   - **Multi-Operation Support**: ✅ All operation types can be combined in scenarios (tested with comprehensive multi-operation scenarios)
   - **Scenario Engine**: ✅ Consolidates any combination of operations into project-level P&L (tested with all operation types)
   - **Project Engine**: ✅ Calculates UFCF, DCF valuation, and project KPIs (NPV, IRR, equity multiple, payback) - tested
   - **Capital Engine**: ✅ Debt schedule, levered FCF, owner levered cash flows, debt KPIs (DSCR, LTV) - tested
   - **Waterfall Engine**: ✅ Multi-tier waterfall (Return of Capital → Preferred Return → Promote) with partner KPIs (IRR, MOIC) - tested
   - **Waterfall Engine**: ✅ Single-tier waterfall (v0.2) still supported as fallback when `tiers` is not provided
   - **Pipeline Orchestrator**: ✅ `runFullModel` is the single entry point (tested)

2. **Core Invariants**: ✅ All enforced with dev-only warnings
   - UFCF finiteness: All values must be finite (no NaN/Infinity) - tested
   - Debt schedule invariant: `sum(principal payments) + final ending balance ≈ initial debt amount` (tolerance 0.01) - tested
   - Waterfall invariant: `|sum(partner CFs) - owner CF| ≤ 0.01` for each year - tested (both single-tier and multi-tier)

3. **UI Playground**: ✅ React UI (`App.tsx`) with v0.4 capabilities
   - Uses `useFullModel` hook with `createSampleModelConfig()` for sample data (all 9 operation types included)
   - Calls `runFullModel` entry point
   - **Operations Display**: Shows all operations with type, name, driver (keys/units/covers/courts/sqm/memberships), and rate (ADR/avgNightlyRate/avgCheck/etc.)
   - **Waterfall Tiers Display**: Shows configured waterfall tiers when multi-tier waterfall is enabled
   - Displays key KPIs: Project NPV, Unlevered IRR, Equity Multiple, Payback Period, LP Levered IRR, LP MoIC
   - Shows tables: Annual Unlevered FCF, Partner KPIs (IRR, MoIC per partner), Equity Waterfall by Year (Owner/LP/GP cash flows)
   - Editable parameters: discount rate (slider), terminal growth rate (slider), debt amount (input)

4. **Testing**: ✅ Comprehensive test coverage
   - All operation engines have unit tests (all 9 operation types tested)
   - Pipeline integration tests (`modelPipeline.test.ts`, `fullPipeline.test.ts`)
   - Multi-operation tests (scenarios with various operation type combinations tested)
   - Multi-tier waterfall tests (tested in `waterfallEngine.test.ts` with Return of Capital, Preferred Return, and Promote tiers)
   - Invariant validation tests (`pipelineInvariants.test.ts` with multi-operation + tiered waterfall)
   - Financial utility tests (`financial.test.ts`)

### Implementation Snapshot (v0.4)

**Operations Engine** (`src/engines/operations/`)
- Supports all 9 operation types: HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING
- Generates monthly and annual P&L for each operation
- `runOperation()` dispatcher routes to appropriate engine based on operation type
- All engines follow established patterns: "Keys/Units × Occupancy × Rate" or "Volume × Ticket/Rate"

**Scenario Engine** (`src/engines/scenario/scenarioEngine.ts`)
- Consolidates any combination of operations into project-level annual P&L
- Handles scenarios with mixed operation types (all 9 types can be combined)

**Project Engine** (`src/engines/project/projectEngine.ts`)
- Calculates unlevered free cash flow (UFCF) from consolidated P&L
- Performs DCF valuation with terminal value
- Computes project KPIs: NPV, unlevered IRR, equity multiple, payback period

**Capital Engine** (`src/engines/capital/capitalEngine.ts`)
- **v0.4**: Builds debt schedule from first debt tranche
- **v0.5**: Capital Stack 2.0 - supports multiple debt tranches with different amortization types, start years, and simple refinancing
- Calculates levered free cash flow (levered FCF = unlevered FCF - aggregate debt service)
- Generates owner levered cash flows (Year 0: -equity invested, Years 1..N: levered FCF)
- Computes debt KPIs: DSCR, LTV (project-level, using aggregate debt)

**Waterfall Engine** (`src/engines/waterfall/waterfallEngine.ts`)
- Splits owner levered cash flows among equity partners (LP/GP)
- **Multi-tier waterfall (v0.3)**: Return of Capital → Preferred Return (with hurdle IRR) → Promote
- **Waterfall v2 (v0.5)**: Catch-up provisions implemented; clawback placeholder (deferred to v0.6+)
- **Single-tier waterfall (v0.2)**: Still supported as fallback when `tiers` is not provided
- Calculates partner-level KPIs: IRR, MOIC

**Pipeline Orchestrator** (`src/engines/pipeline/modelPipeline.ts`)
- `runFullModel()`: Single entry point for complete financial model
- Orchestrates: Operations → Scenario → Project → Capital → Waterfall
- Pure function, fully deterministic, no side effects

**UI** (`src/App.tsx` + `src/ui/hooks/useFullModel.ts`)
- React playground using `useFullModel` hook
- **Multi-operation display**: Shows all operations (all 9 types) with details
- **Waterfall tiers display**: Shows configured waterfall tiers when multi-tier is enabled (including catch-up status)
- **Capital Stack display**: Shows multi-tranche debt information (tranche details, aggregate totals)
- **Scenario Builder v1 (v0.5)**: Scenario Library panel and Scenario Comparison panel (side-by-side A vs B)
- Displays key KPIs and tables (Unlevered FCF, Partner KPIs, Equity Waterfall)
- Editable parameters: discount rate (slider), terminal growth (slider), debt amount (input)
- Uses `createSampleModelConfig()` for sample data (comprehensive scenario with all 9 operation types and tiered waterfall)

## v0.5 Status

**Current Version**: v0.5

### What is Implemented and Tested (v0.5)

1. **Capital Stack 2.0**: ✅ Fully implemented and tested
   - **Multi-tranche support**: Capital engine processes all tranches in `debtTranches` array
   - **Amortization types**: Supports `'mortgage'` (linear), `'interest_only'` (IO until maturity), `'bullet'` (no payments until maturity)
   - **Simple refinancing**: Tranches can be fully repaid at `refinanceAtYear`; new tranches can start in the same year
   - **Different start years**: Tranches can begin at different years via `startYear` field
   - **Aggregate debt**: Project-level debt service and balances computed by summing all active tranches
   - **Project-level KPIs**: DSCR and LTV computed using aggregate debt (per-tranche KPIs not computed in v0.5)
   - **Backward compatibility**: v0.4 configs using `amount` field are automatically converted via `getInitialPrincipal()` helper
   - **Tests**: Comprehensive tests in `capitalEngine.test.ts` covering multi-tranche scenarios, refinancing, and different amortization types

2. **Waterfall v2**: ✅ Catch-up implemented; ⏳ Clawback deferred to v0.6+
   - **Catch-up provisions**: Fully implemented in `applyMultiTierWaterfall()`
     - Tracks cumulative distributions per partner
     - Allocates according to `catchUpTargetSplit` until cumulative distribution ratio matches target (within 0.1% tolerance)
     - After catch-up, reverts to standard `distributionSplits`
     - Backward compatible: degenerates to v0.3 behavior when `enableCatchUp: false`
   - **Clawback placeholder**: Configuration fields (`enableClawback`, `clawbackTrigger`, `clawbackMethod`) present in types but not implemented
   - **Tests**: Catch-up logic tested in `waterfallEngine.test.ts`

3. **Scenario Builder v1**: ✅ Fully implemented and tested
   - **In-memory Scenario Library**: Implemented in `src/ui/state/scenarioLibrary.ts` with CRUD operations
   - **Default scenarios**: Library initialized with 3 default scenarios (Base Case, Levered Multi-Tranche, Aggressive Promote)
   - **Scenario comparison**: UI supports selecting two scenarios (A and B) for side-by-side comparison
   - **ScenarioSummary extraction**: `buildScenarioSummary()` function extracts key KPIs from `FullModelOutput`
   - **UI components**: Scenario Library panel and Scenario Comparison panel in `App.tsx`
   - **Tests**: Scenario comparison workflow tested in `scenarioSummary.test.ts`

4. **Testing**: ✅ Comprehensive test coverage for v0.5 features
   - Multi-tranche capital engine tests (multiple tranches, different start years, refinancing, different amortization types)
   - Waterfall v2 catch-up tests
   - Scenario comparison tests
   - All existing v0.4 tests continue to pass (backward compatibility verified)

## v0.6 Status

**Current Version**: v0.6

### What is Implemented and Tested (v0.6)

1. **Capital Stack 2.1**: ✅ Fully implemented and tested
   - **Transaction Costs**: Origination fees and exit/refinance fees fully implemented
   - **Origination fees**: Reduce net proceeds at tranche start year, affect equity calculations
   - **Exit fees**: Paid at maturity or refinance, affect owner levered cash flows
   - **Backward compatibility**: v0.5 configs without fees continue to work

2. **Waterfall v3**: ✅ Fully implemented and tested
   - **Full Clawback Implementation**: Hypothetical Liquidation and Lookback methods implemented
   - **Clawback triggers**: Supports `'final_period'` and `'annual'` evaluation
   - **Clawback methods**: Both `'hypothetical_liquidation'` and `'lookback'` implemented
   - **Backward compatibility**: v0.5 configs without clawback continue to work

3. **Scenario Builder v2**: ✅ Fully implemented and tested
   - **localStorage Persistence**: Scenarios saved to browser localStorage with key `hospitality_scenarios_v1`
   - **Automatic save/load**: Scenarios automatically saved when added/updated, loaded on app initialization
   - **Export functionality**: CSV export for ScenarioSummary data, JSON export for FullModelOutput
   - **Error handling**: Graceful handling of localStorage quota exceeded, disabled, etc.

4. **Rich UI Components**: ✅ Fully implemented and tested
   - **Chart Library**: `recharts` integrated for React-based charting
   - **Capital Stack Chart**: Horizontal stacked bar chart showing sources & uses
   - **Cash Flow Profile Chart**: Combined bar/line chart showing NOI, Debt Service, Levered FCF over time
   - **Scenario Comparison Charts**: Optional side-by-side bar charts for A vs B KPIs
   - **Responsive design**: Charts adapt to container width using ResponsiveContainer

5. **Testing**: ✅ Comprehensive test coverage for v0.6 features
   - Transaction costs tests (origination fees, exit fees, refinancing with fees)
   - Clawback logic tests (hypothetical liquidation, lookback, final period vs annual triggers)
   - Scenario persistence tests (save, load, delete from localStorage)
   - Export functionality tests (CSV export format, JSON export)
   - Chart component tests
   - All existing v0.5 tests continue to pass (backward compatibility verified)

### Known Limitations (v0.6)

1. **Capital Stack 2.1**:
   - **Refinancing**: Simple "pay off old, start new" model only (no partial refinances, no overlapping complex rules)
   - **Per-tranche KPIs**: Not computed in v0.6 (only aggregate project-level DSCR/LTV)
   - **Amortization**: Simplified patterns (linear for mortgage, IO-only for interest_only, bullet for bullet)

2. **Waterfall v3**:
   - **Catch-up**: Basic implementation (tracks cumulative distributions, allocates to target split until match)

3. **Scenario Builder v2**:
   - **Scenario editing**: No UI forms for creating/editing scenarios (scenarios defined in code or loaded from localStorage)
   - **Persistence**: localStorage only (no database or file system integration)
   - **Export**: CSV and JSON export implemented (no Excel/PDF export)

4. **UI Features**:
   - **Advanced charts**: Basic bar/line charts implemented (no waterfall charts, sensitivity analysis charts)
   - **Advanced analytics**: Not implemented (no sensitivity analysis tools, no Monte Carlo simulation)

5. **Operation Type Simplifications** (carried forward from v0.4):
   - Some operation types use simplified assumptions (e.g., membership revenue allocated evenly across months, no seasonal variations for memberships, no distinction between operation subtypes)
   - These simplifications are documented in each operation config's "Note" field
   - Future refinements (v0.7+) may add more sophisticated modeling for specific operation types

### What is Planned for Later Versions (v0.7+)

1. **Advanced Capital Features**
   - Partial refinances
   - Subordinated debt structures
   - Per-tranche KPIs

2. **Advanced Waterfall Features**
   - Compounding preferred returns
   - More sophisticated catch-up mechanisms

3. **Advanced UI Features**
   - Advanced charts/visualizations (waterfall charts, sensitivity analysis charts)
   - Excel/PDF export (beyond CSV/JSON)
   - Scenario editing forms
   - Scenario persistence (database/file system beyond localStorage)
   - Sensitivity analysis tools
   - Monte Carlo simulation interface

4. **Operation Type Refinements**
   - More sophisticated modeling for specific operation types (seasonal membership variations, operation subtypes, etc.)
   - Enhanced revenue drivers and cost structures where needed

## Milestones

### v0.4 (Current - Implemented)

**Status**: ✅ Fully implemented and tested

See "v0.4 Status" section above for complete details.

**Focus**: All operation types implemented - complete operations universe

#### Operation Families

Operations are grouped into families based on their revenue model and operational characteristics:

- **Lodging-like**: HOTEL, VILLAS
  - Revenue driver: keys/units × occupancy × rate
  - Primary revenue: room/rental revenue
  - Secondary revenue: food, beverage, other (as % of primary)

- **F&B / Leisure**: RESTAURANT, BEACH_CLUB
  - Revenue driver: volume × ticket (covers × check, passes × price)
  - Primary revenue: food, beverage, admission/passes
  - Secondary revenue: other (as % of total)

- **Sports / Wellness**: RACQUET, WELLNESS
  - Revenue driver: volume × ticket (courts × rate, memberships × fee, passes × price)
  - Primary revenue: court fees, memberships, passes
  - Secondary revenue: food, beverage, other (as % of total)

- **Commercial / Flexible**: RETAIL, FLEX, SENIOR_LIVING
  - Revenue driver: space × occupancy × rent (sqm × occupancy × rent, units × occupancy × rate)
  - Primary revenue: rental revenue
  - Secondary revenue: other services (as % of rental or total)

#### What v0.4 MUST Deliver

1. **Config and Engine for Each Remaining Operation Type**:
   - ✅ BEACH_CLUB: Config and engine implemented
   - ✅ RACQUET: Config and engine implemented
   - ✅ RETAIL: Config and engine implemented
   - ✅ FLEX: Config and engine implemented
   - ✅ WELLNESS: Config and engine implemented
   - ✅ SENIOR_LIVING: Config and engine implemented
   - All follow the same `MonthlyPnl` / `AnnualPnl` structure and conventions as HOTEL/VILLAS/RESTAURANT
   - All wired into `runOperation` dispatcher in `src/engines/operations/index.ts`
   - All integrated into scenario engine (automatic via dispatcher)

2. **Sample Scenario with All Operation Types**:
   - At least one sample scenario where **all operation types** coexist (HOTEL + VILLAS + RESTAURANT + BEACH_CLUB + RACQUET + RETAIL + FLEX + WELLNESS + SENIOR_LIVING)
   - Scenario demonstrates correct aggregation across all operation types
   - Included in `createSampleModelConfig()` or a separate comprehensive sample

3. **Tests Guaranteeing Correctness**:
   - Unit tests for each new operation engine (`beachClubEngine.test.ts`, `racquetEngine.test.ts`, etc.)
   - Multi-operation scenario tests with all operation types combined
   - Tests guaranteeing no NaN/Infinity in any operation's P&L
   - Tests verifying correct aggregation in scenario engine (sum of all operations = consolidated P&L)
   - Pipeline invariant tests extended to cover all operation types

#### What v0.4 Explicitly Does NOT Do

1. **No New Debt Features**:
   - Multiple debt tranches remain planned for v0.5+
   - Refinancing logic remains planned for v0.5+
   - Subordinated debt structures remain planned for v0.5+

2. **No New Waterfall Features**:
   - Catch-up provisions remain planned for v0.5+
   - Clawback mechanisms remain planned for v0.5+
   - More sophisticated preferred return calculations remain planned for v0.5+

3. **No Scenario Builder**:
   - Custom scenario input forms remain planned for v0.5+
   - Scenario comparison view remains planned for v0.5+
   - Charts/visualizations remain planned for v0.5+
   - Export functionality remains planned for v0.5+

#### Implementation Summary

**v0.4 delivers**:
- All operation types implemented (BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING)
- Operations grouped by families (lodging, F&B/leisure, sports/wellness, commercial/flexible)
- Engine patterns documented for reuse (Keys/Units × Occupancy × Rate, Volume × Ticket)
- Comprehensive multi-operation scenarios with all types
- Full test coverage for all operation types

**v0.5+ remains for**:
- Capital / waterfall / UI heavy features (multiple debt tranches, enhanced waterfall features, scenario builder, charts, exports)

### v0.5 – Capital Stack 2.0 + Waterfall v2 + Scenario Builder v1

**Status**: ✅ Fully implemented and tested

**Focus**: Multi-tranche capital, enhanced waterfall, scenario comparison

#### v0.5 Scope Summary

**MUST HAVE (v0.5)**:
1. **Capital Stack 2.0**: Multi-tranche debt support with simple refinancing
   - Enhanced `DebtTrancheConfig` with explicit fields (id, label, type, initialPrincipal, interestRate, amortizationType, termYears, ioYears, startYear, refinanceAtYear)
   - Capital engine builds amortization schedule per tranche
   - Aggregate debt service and balances at project level
   - Simple refinancing model (pay off old, start new in same year)
   - Project-level KPIs (DSCR, LTV) computed from aggregate debt

2. **Waterfall v2**: Catch-up provisions + clawback placeholder
   - Enhanced `WaterfallTier` with catch-up fields (enableCatchUp, catchUpTargetSplit, catchUpRate)
   - Minimal catch-up implementation that degenerates to v0.3 when disabled
   - Clawback configuration fields defined but not implemented (marked as v0.6+)

3. **Scenario Builder v1**: In-memory scenario library with side-by-side comparison
   - `NamedScenario` and `ScenarioSummary` type definitions
   - In-memory Scenario Library (no persistence)
   - UI can select two scenarios (A and B) for comparison
   - `runFullModel` called once per scenario
   - Comparison done in UI by juxtaposing summaries

**NICE TO HAVE (v0.5)**:
- Simple charts for scenario comparison (bar charts, line charts)
- CSV/JSON export functionality
- Extra sample scenarios (BASE, DOWNSIDE, UPSIDE) in Scenario Library

#### v0.5 Agent Responsibilities

**FINANCE_ENGINE_AGENT**:
- Review and validate that no operation engine changes are required (all operations stable in v0.4)
- Ensure project engine continues to work correctly with multi-tranche capital (no changes expected)
- Verify scenario engine compatibility with new capital/waterfall features (no changes expected)

**CAPITAL_WATERFALL_AGENT**:
- Implement Capital Stack 2.0: extend `DebtTrancheConfig` type, update capital engine to handle multiple tranches, implement simple refinancing logic
- Implement Waterfall v2: extend `WaterfallTier` type, add catch-up logic to waterfall engine, add clawback placeholder fields
- Update `src/domain/types.ts` with new capital and waterfall type definitions
- Ensure backward compatibility: v0.4 single-tranche configs must still work
- Add tests for multi-tranche scenarios, refinancing, and catch-up behavior

**UI_AGENT**:
- Implement Scenario Builder v1: create Scenario Library component, implement scenario selection UI, build side-by-side comparison view
- Update UI to display multi-tranche debt information (aggregate KPIs, optional per-tranche details)
- Update UI to display catch-up status in waterfall tiers summary
- Create `ScenarioSummary` extraction logic from `FullModelOutput`
- Add sample scenarios to Scenario Library (may coordinate with PIPELINE_AGENT)

**INFRA_TEST_AGENT**:
- Add tests for multi-tranche capital engine (multiple tranches, different start years, refinancing)
- Add tests for waterfall v2 catch-up logic
- Add tests for scenario comparison workflow
- Ensure all existing tests continue to pass (backward compatibility)
- Update test utilities if needed for new type definitions

**DOCS_AGENT**:
- Update ARCHITECTURE.md with v0.5 implementation details as features are completed
- Update AGENTS.md to reflect v0.5 as current baseline
- Document any breaking changes (if any) or migration path from v0.4 to v0.5

**INTEGRATOR_QA_AGENT**:
- Validate end-to-end flow: multi-tranche capital → waterfall v2 → scenario comparison
- Verify backward compatibility: v0.4 configs produce same results in v0.5
- Test scenario comparison with various scenario combinations
- Validate invariants hold with multi-tranche capital and catch-up waterfall
- Produce integration summary for v0.5 completion

#### What v0.5 Explicitly Does NOT Do

1. **No Operation Engine Changes**:
   - All operation types (HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING) remain unchanged
   - No new operation types
   - No refinements to existing operation engines

2. **No Complex Refinancing**:
   - No refinancing fees
   - No partial refinances
   - No overlapping complex rules
   - Simple "pay off old, start new" model only

3. **No Full Clawback Implementation**:
   - Clawback fields are placeholders only
   - Full clawback implementation deferred to v0.6+

4. **No Scenario Persistence**:
   - Scenarios are in-memory only
   - No database or file system integration
   - No scenario editing UI (scenarios defined in code)

5. **No Complex Scenario Editing**:
   - No UI forms for creating new scenarios
   - Scenarios are defined in code or sample data
   - Comparison is read-only (no editing during comparison)

### v0.6 – Deep Financials (Clawback + Fees) & Rich UI (Charts + Persistence)

**Status**: ✅ Fully implemented and tested

**Focus**: Transaction costs, full clawback, scenario persistence, rich visualizations

#### v0.6 Scope Summary

**MUST HAVE (v0.6)**:
1. **Capital Stack 2.1**: Transaction Costs (Origination Fees, Exit/Refinance Fees)
   - Enhanced `DebtTrancheConfig` with `originationFeePct` and `exitFeePct` fields
   - Origination fees reduce net proceeds at `startYear`
   - Exit fees paid at maturity or `refinanceAtYear`
   - Transaction costs affect `ownerLeveredCashFlows` and equity calculations

2. **Waterfall v3**: Full Clawback Implementation
   - Enhanced `WaterfallTier` with implemented clawback fields (`enableClawback`, `clawbackTrigger`, `clawbackMethod`)
   - Hypothetical Liquidation method: recalculates waterfall at evaluation point to determine required vs actual distributions
   - Lookback method: compares actual cumulative distributions with required based on current returns
   - Clawback adjustments applied in final period or annually (depending on `clawbackTrigger`)

3. **Scenario Builder v2**: Persistence & Export
   - `localStorage` persistence with key `hospitality_scenarios_v1`
   - JSON schema for saved scenarios (fully serializable)
   - CSV export functionality for `ScenarioSummary` data
   - Optional JSON export for full `FullModelOutput`

4. **Rich UI Components**: Charts & Visualizations
   - Chart library: `recharts` (React-based, compatible with React 19/Vite)
   - Sources & Uses / Capital Stack chart (horizontal stacked bar)
   - Cash Flow Profile chart (combined bar/line: NOI, Debt Service, Levered FCF)
   - Optional Scenario Comparison charts (A vs B KPIs)

**NICE TO HAVE (v0.6)**:
- Additional chart types (waterfall charts, sensitivity analysis charts)
- Excel export (beyond CSV)
- Scenario editing UI forms (beyond persistence)

#### v0.6 Agent Responsibilities

**CAPITAL_WATERFALL_AGENT**:
- Implement Capital Stack 2.1: add `originationFeePct` and `exitFeePct` to `DebtTrancheConfig`, update capital engine to calculate and apply transaction costs
- Implement Waterfall v3: implement full clawback logic using Hypothetical Liquidation or Lookback method
- Update `src/domain/types.ts` with transaction cost and clawback type definitions
- Ensure backward compatibility: v0.5 configs without fees/clawback must still work
- Add tests for transaction costs (origination fees, exit fees, refinancing with fees) and clawback behavior

**UI_AGENT**:
- Implement Scenario Builder v2: add `localStorage` persistence functions, implement CSV/JSON export utilities
- Implement Rich UI Components: install `recharts`, create chart components (CapitalStackChart, CashFlowProfileChart, optional ScenarioComparisonChart)
- Update UI to display transaction costs in capital structure summary
- Update UI to display clawback adjustments in waterfall results
- Integrate charts into Model Results panel and Scenario Comparison panel
- Handle `localStorage` errors gracefully (quota exceeded, disabled, etc.)

**INFRA_TEST_AGENT**:
- Add tests for transaction costs (origination fees, exit fees, refinancing scenarios)
- Add tests for clawback logic (hypothetical liquidation, lookback, final period vs annual triggers)
- Add tests for scenario persistence (save, load, delete from `localStorage`)
- Add tests for export functionality (CSV export format, JSON export)
- Ensure all existing tests continue to pass (backward compatibility)
- Test chart components render correctly with various data inputs

**DOCS_AGENT**:
- Update ARCHITECTURE.md with v0.6 implementation details as features are completed
- Update AGENTS.md to reflect v0.6 as current milestone
- Document any breaking changes (if any) or migration path from v0.5 to v0.6
- Document chart library usage and component structure

**INTEGRATOR_QA_AGENT**:
- Validate end-to-end flow: transaction costs → clawback → scenario persistence → charts
- Verify backward compatibility: v0.5 configs produce same results in v0.6 (when fees/clawback disabled)
- Test scenario persistence across browser sessions
- Test export functionality with various scenario combinations
- Validate invariants hold with transaction costs and clawback adjustments
- Test chart rendering with edge cases (empty data, negative values, etc.)
- Produce integration summary for v0.6 completion

#### What v0.6 Explicitly Does NOT Do

1. **No Operation Engine Changes**:
   - All operation types remain unchanged
   - No new operation types
   - No refinements to existing operation engines

2. **No Partial Refinancing**:
   - Refinancing remains "pay off old, start new" model
   - No partial refinances (only full repayment)
   - Exit fees apply only at full repayment/refinance

3. **No Advanced Capital Features**:
   - No subordinated debt structures
   - No per-tranche KPIs (only aggregate project-level KPIs)
   - No complex fee structures beyond origination and exit fees

4. **No Scenario Editing UI**:
   - Scenarios are still defined in code or loaded from `localStorage`
   - No UI forms for creating/editing scenarios (persistence only, not editing)
   - Comparison remains read-only

5. **No Advanced Analytics**:
   - No sensitivity analysis tools
   - No Monte Carlo simulation
   - No advanced chart types beyond basic bar/line charts

## Risk Analysis (v0.7)

**Status**: ✅ Implemented in v0.7

**Overview**: Adds sensitivity analysis capabilities, advanced financial metrics (WACC, Breakeven), and professional reporting features to enable risk assessment and professional presentation of model results.

### Sensitivity Analysis Engine

**Purpose**: Run the financial model multiple times with varying input parameters to observe impacts on key output metrics (NPV, IRR, MOIC, etc.).

**Type Definitions** (to be added to `src/domain/types.ts`):

- **`SensitivityVariable`**: Enum of specific inputs that can be varied:
  ```typescript
  export type SensitivityVariable =
    | 'occupancyAdjustment'      // Multiplicative adjustment to all operations' occupancy (e.g., 0.9 = 90% of base)
    | 'adrAdjustment'             // Multiplicative adjustment to hotel ADR
    | 'initialInvestment'        // Absolute adjustment to initial investment
    | 'exitCapRate'               // Exit cap rate for terminal value (if implemented)
    | 'discountRate'              // Discount rate adjustment
    | 'debtAmount'                // Debt amount adjustment (first tranche or aggregate)
    | 'interestRate'              // Interest rate adjustment (first tranche or aggregate)
    | 'terminalGrowthRate';       // Terminal growth rate adjustment
  ```

- **`SensitivityRunConfig`**: Configuration for a sensitivity analysis run:
  ```typescript
  export interface SensitivityRunConfig {
    variableX: SensitivityVariable;  // Primary variable to vary
    rangeX: { min: number; max: number; steps: number }; // Range for variable X (e.g., -20% to +20% in 10 steps)
    variableY?: SensitivityVariable; // Optional: secondary variable for 2D sensitivity (tornado chart)
    rangeY?: { min: number; max: number; steps: number }; // Range for variable Y (if variableY is provided)
    baseModelInput: FullModelInput;  // Base case model configuration
  }
  ```

- **`SensitivityResult`**: Results from a sensitivity analysis run:
  ```typescript
  export interface SensitivityResult {
    config: SensitivityRunConfig;
    baseCaseOutput: FullModelOutput;  // Base case results (no adjustments)
    runs: Array<{
      variableXValue: number;          // Actual value of variable X for this run
      variableYValue?: number;         // Actual value of variable Y (if 2D)
      output: FullModelOutput;         // Full model output for this run
      kpis: {
        npv: number;
        unleveredIrr: number | null;
        leveredIrr?: number | null;    // LP levered IRR (from waterfall)
        moic?: number;                  // LP MOIC (from waterfall)
        equityMultiple: number;
      };
    }>;
    // Matrix representation for 2D sensitivity (if variableY is provided)
    matrix?: Array<Array<{
      variableXValue: number;
      variableYValue: number;
      kpis: SensitivityResult['runs'][0]['kpis'];
    }>>;
  }
  ```

**Sensitivity Engine Function** (`src/engines/sensitivity/sensitivityEngine.ts`):

- **`runSensitivityAnalysis(config: SensitivityRunConfig): SensitivityResult`**
  - **Input**: `SensitivityRunConfig` with base model input and variable ranges
  - **Output**: `SensitivityResult` with all runs and KPIs
  - **Logic**:
    1. Run base case: `runFullModel(config.baseModelInput)` → `baseCaseOutput`
    2. For each step in `rangeX`:
       - Calculate adjusted value: `adjustedValue = baseValue × (1 + stepValue)` or `baseValue + stepValue` (depending on variable type)
       - Create modified `FullModelInput` by applying adjustment to the appropriate field:
         - `occupancyAdjustment`: Multiply all operations' `occupancyByMonth` arrays
         - `adrAdjustment`: Multiply hotel operations' `avgDailyRate`
         - `initialInvestment`: Replace `projectConfig.initialInvestment` and `capitalConfig.initialInvestment`
         - `discountRate`: Replace `projectConfig.discountRate`
         - `debtAmount`: Adjust first tranche's `initialPrincipal` (or aggregate if multiple tranches)
         - `interestRate`: Adjust first tranche's `interestRate` (or aggregate if multiple tranches)
         - `terminalGrowthRate`: Replace `projectConfig.terminalGrowthRate`
       - Run model: `runFullModel(modifiedInput)` → `output`
       - Extract KPIs from `output` (NPV, IRR, MOIC, etc.)
    3. If `variableY` is provided, repeat for each combination of `rangeX` and `rangeY` (2D sensitivity)
    4. Build result matrix if 2D sensitivity
    5. Return `SensitivityResult` with all runs and base case

**Implementation Notes**:
- The sensitivity engine wraps `runFullModel` - it does not modify the core pipeline logic
- Variable adjustments must be applied consistently (e.g., occupancy adjustment affects all operations)
- For 2D sensitivity, the number of runs = `rangeX.steps × rangeY.steps` (can be computationally expensive)
- Results should be cached or memoized if the same base case is analyzed multiple times
- The engine must handle edge cases (e.g., negative occupancy, zero debt amount)

### Advanced Metrics

**Purpose**: Add sophisticated financial metrics for deeper analysis and risk assessment.

#### WACC (Weighted Average Cost of Capital)

**Definition**: `WACC = (Equity % × Cost of Equity) + (Debt % × Cost of Debt × (1 - TaxRate))`

**Type Definition** (to be added to `src/domain/types.ts`):
```typescript
export interface WaccMetrics {
  equityPercentage: number;      // Equity / (Equity + Debt)
  debtPercentage: number;         // Debt / (Equity + Debt)
  costOfEquity: number;           // From ProjectConfig.discountRate
  costOfDebt: number;             // Weighted average interest rate from debt tranches
  taxRate: number;                 // Tax rate (decimal, e.g., 0.25 for 25%) - from ProjectConfig or defaults to 0
  wacc: number;                   // Calculated WACC
}
```

**Calculation Logic**:
- **Equity %**: `equityInvested / initialInvestment` where `equityInvested = initialInvestment - sum(debtTranches.initialPrincipal)`
- **Debt %**: `sum(debtTranches.initialPrincipal) / initialInvestment`
- **Cost of Equity**: `ProjectConfig.discountRate` (assumed to be the required return on equity)
- **Cost of Debt**: Weighted average of all debt tranches' `interestRate`, weighted by `initialPrincipal`
- **Tax Rate**: For v0.7, simplify to `0` (no tax) or add `taxRate?: number` to `ProjectConfig` (optional, defaults to 0)
- **WACC**: `(equityPercentage × costOfEquity) + (debtPercentage × costOfDebt × (1 - taxRate))`

**Function** (`src/engines/project/projectEngine.ts` or new `src/engines/metrics/advancedMetrics.ts`):
- **`calculateWacc(projectConfig: ProjectConfig, capitalConfig: CapitalStructureConfig, taxRate?: number): WaccMetrics`**
  - Calculates WACC from project and capital configuration
  - Returns `WaccMetrics` with all components and final WACC

#### Breakeven Occupancy

**Definition**: The occupancy rate where NOI = Debt Service (DSCR = 1.0).

**Type Definition** (to be added to `src/domain/types.ts`):
```typescript
export interface BreakevenMetrics {
  breakevenOccupancy: number | null;  // Occupancy rate (0..1) where DSCR = 1.0, null if not achievable
  method: 'interpolation' | 'binary_search'; // Method used to find breakeven
  iterations?: number;                  // Number of iterations (for binary search)
}
```

**Calculation Logic**:
- **Goal**: Find occupancy rate `occ` such that `NOI(occ) / DebtService = 1.0`
- **Method**: Binary search or interpolation:
  1. Start with occupancy range [0, 1]
  2. For each test occupancy:
     - Scale all operations' `occupancyByMonth` arrays by test occupancy
     - Run operations engine → scenario engine → project engine (to get NOI)
     - Run capital engine (to get debt service)
     - Calculate DSCR = NOI / DebtService
     - If DSCR ≈ 1.0 (within tolerance, e.g., 0.001), return test occupancy
     - If DSCR < 1.0, occupancy too low; if DSCR > 1.0, occupancy too high
  3. Binary search until convergence or max iterations
- **Edge Cases**:
  - If DSCR < 1.0 even at 100% occupancy, return `null` (breakeven not achievable)
  - If DSCR > 1.0 at 0% occupancy (unlikely), return `0` or handle appropriately

**Function** (`src/engines/metrics/advancedMetrics.ts`):
- **`calculateBreakevenOccupancy(baseModelInput: FullModelInput, tolerance?: number, maxIterations?: number): BreakevenMetrics`**
  - Uses binary search to find breakeven occupancy
  - Returns `BreakevenMetrics` with breakeven occupancy and method used

**Implementation Notes**:
- Breakeven calculation requires running the model multiple times (similar to sensitivity analysis)
- For efficiency, only run operations → scenario → project → capital engines (skip waterfall)
- Tolerance should be configurable (default: 0.001 for DSCR = 1.0 ± 0.001)
- Max iterations should prevent infinite loops (default: 50)

### Reporting Module (v0.7)

**Purpose**: Enable professional print/PDF-ready reports of model results.

**Approach**: Two complementary strategies:

1. **Print-Friendly View (CSS Media Queries)**:
   - Use `@media print` CSS rules to hide navigation, buttons, and interactive elements
   - Format charts and tables for A4/Letter paper size
   - Ensure proper page breaks and margins
   - Location: `src/ui/styles/print.css` or inline styles in components

2. **Dedicated Report Page Route**:
   - New route: `/report` or `/report/:scenarioId`
   - Hides navigation/buttons by default
   - Formats all content for print/PDF export
   - Can be accessed directly or via "Print Report" button from main UI

**Report Layout Structure**:
```typescript
interface ReportLayout {
  header: {
    projectName: string;
    scenarioName: string;
    date: string;  // Report generation date
    preparedBy?: string;  // Optional user name
  };
  sections: Array<{
    title: string;
    type: 'kpis' | 'table' | 'chart' | 'text';
    content: KPICard[] | TableData | ChartConfig | string;
  }>;
  footer: {
    pageNumber: number;
    totalPages: number;
    disclaimer?: string;
  };
}
```

**Report Sections** (in order):
1. **Executive Summary**: Key KPIs (NPV, IRR, MOIC, Payback) in large cards
2. **Capital Structure**: Sources & Uses chart, debt schedule summary
3. **Cash Flow Profile**: NOI, Debt Service, Levered FCF over time (chart + table)
4. **Waterfall Summary**: Partner distributions, IRRs, MOICs
5. **Sensitivity Analysis** (if available): Tornado chart or 2D heatmap
6. **Advanced Metrics**: WACC, Breakeven Occupancy
7. **Detailed Tables**: Annual P&L, Debt Schedule, Waterfall by Year
8. **Appendix**: Full model configuration (optional, can be collapsed)

**Implementation Notes**:
- Report page should be a new React component: `src/components/ReportPage.tsx`
- Use CSS print media queries: `@media print { ... }` to hide non-essential elements
- Charts should be rendered as static images or SVG for PDF export (if using PDF library)
- Page breaks: Use `page-break-after: always` or `break-after: page` for section separators
- PDF Export: Consider using `react-to-pdf` or `jspdf` library for client-side PDF generation (optional for v0.7, can be v0.8+)
- For v0.7, focus on print-friendly CSS; PDF export can be deferred to v0.8+

### v0.7 – Risk Analysis (Sensitivity) & Professional Reporting

**Status**: ✅ Implemented in v0.7

**Focus**: Sensitivity analysis, advanced metrics (WACC, Breakeven), and professional reporting

#### v0.7 Scope Summary

**MUST HAVE (v0.7)**:
1. **Sensitivity Analysis Engine**: 1D and 2D sensitivity runs
   - Type definitions: `SensitivityVariable`, `SensitivityRunConfig`, `SensitivityResult`
   - Engine function: `runSensitivityAnalysis()` that wraps `runFullModel`
   - Support for varying: occupancy, ADR, initial investment, discount rate, debt amount, interest rate, terminal growth rate
   - 1D sensitivity: single variable varied across a range
   - 2D sensitivity: two variables varied (tornado chart / heatmap)

2. **Advanced Metrics**: WACC and Breakeven Analysis
   - **WACC Calculation**: `calculateWacc()` function computing weighted average cost of capital
     - Formula: `(Equity % × Cost of Equity) + (Debt % × Cost of Debt × (1 - TaxRate))`
     - Cost of Equity = `ProjectConfig.discountRate`
     - Cost of Debt = weighted average of debt tranches' interest rates
     - Tax Rate: optional in `ProjectConfig` (defaults to 0 for v0.7)
   - **Breakeven Occupancy**: `calculateBreakevenOccupancy()` function finding occupancy where DSCR = 1.0
     - Binary search algorithm to find breakeven point
     - Returns `null` if breakeven not achievable

3. **Reporting Module**: Print-friendly view and dedicated report page
   - Print-friendly CSS using `@media print` queries
   - Dedicated report page route (`/report` or `/report/:scenarioId`)
   - Report layout with sections: Executive Summary, Capital Structure, Cash Flow Profile, Waterfall Summary, Sensitivity Analysis, Advanced Metrics, Detailed Tables, Appendix
   - Hide navigation/buttons in print view
   - Format charts and tables for A4/Letter paper size

**NICE TO HAVE (v0.7)**:
- PDF export functionality (can be deferred to v0.8+)
- Sensitivity analysis visualization charts (tornado chart, 2D heatmap)
- Advanced sensitivity variables (exit cap rate, etc.)

#### v0.7 Agent Responsibilities

**FINANCE_ENGINE_AGENT**:
- Implement Advanced Metrics: `calculateWacc()` and `calculateBreakevenOccupancy()` functions
- Add `WaccMetrics` and `BreakevenMetrics` type definitions to `src/domain/types.ts`
- Optionally add `taxRate?: number` to `ProjectConfig` (defaults to 0)
- Create `src/engines/metrics/advancedMetrics.ts` for WACC and Breakeven calculations
- Ensure WACC calculation handles multi-tranche debt correctly (weighted average interest rate)
- Ensure Breakeven calculation is efficient (only runs necessary engines, not full waterfall)

**SENSITIVITY_AGENT** (new agent or FINANCE_ENGINE_AGENT):
- Implement Sensitivity Analysis Engine: `runSensitivityAnalysis()` function
- Add `SensitivityVariable`, `SensitivityRunConfig`, `SensitivityResult` type definitions to `src/domain/types.ts`
- Create `src/engines/sensitivity/sensitivityEngine.ts`
- Implement variable adjustment logic for each `SensitivityVariable` type
- Handle 1D and 2D sensitivity runs
- Optimize performance (memoization, caching if applicable)
- Add tests for sensitivity engine (1D runs, 2D runs, edge cases)

**UI_AGENT**:
- Implement Reporting Module: print-friendly CSS and dedicated report page
- Create `src/components/ReportPage.tsx` component
- Add print media queries to hide navigation/buttons
- Format report sections: Executive Summary, Capital Structure, Cash Flow Profile, Waterfall Summary, Sensitivity Analysis, Advanced Metrics, Detailed Tables, Appendix
- Add "Print Report" button to main UI
- Integrate WACC and Breakeven metrics display in UI
- Add sensitivity analysis results visualization (tables, charts) - optional for v0.7

**INFRA_TEST_AGENT**:
- Add tests for WACC calculation (single-tranche, multi-tranche, no-debt scenarios)
- Add tests for Breakeven Occupancy calculation (achievable, not achievable, edge cases)
- Add tests for sensitivity engine (1D sensitivity, 2D sensitivity, variable adjustment logic)
- Ensure all existing tests continue to pass (backward compatibility)
- Test report page rendering and print CSS

**DOCS_AGENT**:
- Update ARCHITECTURE.md with v0.7 implementation details as features are completed
- Update AGENTS.md to reflect v0.7 as current milestone
- Document sensitivity analysis usage and variable types
- Document WACC and Breakeven calculation formulas
- Document reporting module structure and print CSS approach

**INTEGRATOR_QA_AGENT**:
- Validate end-to-end flow: sensitivity analysis → advanced metrics → reporting
- Verify sensitivity engine correctly wraps `runFullModel` without modifying core pipeline
- Test WACC calculation with various capital structures (no debt, single-tranche, multi-tranche)
- Test Breakeven Occupancy with various scenarios (achievable, not achievable)
- Validate report page renders correctly and print CSS works across browsers
- Test sensitivity analysis with edge cases (negative values, zero debt, etc.)
- Produce integration summary for v0.7 completion

#### What v0.7 Explicitly Does NOT Do

1. **No Operation Engine Changes**:
   - All operation types remain unchanged
   - No new operation types
   - No refinements to existing operation engines

2. **No PDF Export**:
   - PDF export functionality deferred to v0.8+
   - Focus on print-friendly CSS only

3. **No Monte Carlo Simulation**:
   - Monte Carlo simulation deferred to v0.8+
   - Sensitivity analysis is deterministic (not probabilistic)

4. **No Advanced Sensitivity Visualizations**:
   - Basic sensitivity tables implemented
   - Tornado charts and 2D heatmaps are nice-to-have (can be deferred)

5. **No Tax Modeling**:
   - Tax rate defaults to 0 (no tax) for v0.7
   - Optional `taxRate` field in `ProjectConfig` for future use
   - No tax impact on cash flows (only used in WACC calculation)

## Tabbed Navigation & Data Portability (v0.8)

**Status**: ✅ Implemented in v0.8

**Overview**: Adopts a "CFO-Ready" interface structure with professional tabbed navigation, data portability (JSON import/export), and critical fixes for WACC visibility and print functionality.

### UI Architecture (The "Shell")

**Purpose**: Restructure the UI into a professional tabbed interface that organizes content logically and provides a clean, executive-ready experience.

**MainLayout Component** (`src/components/MainLayout.tsx`):
- **Structure**: Global header + tabbed content area
- **Global Header** (always visible):
  - App Title: "Hospitality Financial Model" (or configurable)
  - Scenario Selector: Dropdown to select from Scenario Library (v0.6 persistence)
  - Import Button: Load scenario from JSON file
  - Export Button: Save current scenario to JSON file
  - Print Button: Opens print-friendly report view (works from any tab)
- **Tab Navigation**: Horizontal tab bar below header
- **Tab Content Area**: Renders active tab content

**Tab Structure** (mapping to legacy concepts where appropriate):

1. **Dashboard Tab** (`src/components/tabs/DashboardTab.tsx`):
   - **Purpose**: High-level executive summary
   - **Content**:
     - KPI Cards: Project NPV, Unlevered IRR, Levered IRR (LP), MOIC, Payback Period, WACC, Breakeven Occupancy
     - Capital Stack Chart: Sources & Uses visualization (horizontal stacked bar)
     - Cash Flow Profile Chart: NOI, Debt Service, Levered FCF over time (combined bar/line)
     - Quick Summary Table: Key metrics at a glance (revenue, NOI, debt service, equity multiple)
   - **Layout**: 2-column grid with KPIs on left, charts on right (responsive)

2. **Assumptions Tab** (`src/components/tabs/AssumptionsTab.tsx`):
   - **Purpose**: Consolidated view of all model inputs
   - **Content**:
     - **Project Configuration Section**:
       - Initial Investment, Discount Rate, Terminal Growth Rate, Working Capital %
       - Tax Rate (if configured for WACC)
     - **Operations Section**:
       - List of all operations with expandable details:
         - Operation type, name, driver values (keys/units/covers/etc.), rates (ADR/avgNightlyRate/etc.)
         - Occupancy/utilization by month (collapsible)
         - Revenue mix percentages, COGS percentages, OPEX percentages
     - **Capital Structure Section**:
       - Debt tranches summary (amount, interest rate, term, amortization type)
       - Equity classes summary (contribution percentages)
     - **Waterfall Configuration Section**:
       - Waterfall tiers (if multi-tier enabled)
       - Distribution splits per tier
   - **Layout**: Accordion-style sections, read-only display (editing deferred to v0.9+)

3. **Financials Tab** (`src/components/tabs/FinancialsTab.tsx`):
   - **Purpose**: Detailed financial tables and waterfall breakdown
   - **Content**:
     - **Consolidated P&L Table**: Annual revenue, COGS, OPEX, EBITDA, NOI, Maintenance Capex
     - **Unlevered FCF Table**: Year, NOI, Maintenance Capex, Change in WC, Unlevered FCF
     - **Debt Schedule Table**: Year, Beginning Balance, Interest, Principal, Ending Balance, DSCR, LTV
     - **Levered FCF Table**: Year, Unlevered FCF, Debt Service, Levered FCF
     - **Waterfall Table**: Year, Owner Levered CF, Partner distributions (one column per partner)
     - **Partner KPIs Table**: Partner, IRR, MOIC, Cumulative Distributions
   - **Layout**: Scrollable tables with sticky headers, optional column filtering/sorting (v0.9+)

4. **Analysis Tab** (`src/components/tabs/AnalysisTab.tsx`):
   - **Purpose**: Sensitivity analysis and risk metrics
   - **Content**:
     - **Sensitivity Analysis Controls**:
       - Variable X selector (occupancy, ADR, discount rate, etc.)
       - Range X configuration (min, max, steps)
       - Variable Y selector (optional, for 2D sensitivity)
       - Range Y configuration (if Variable Y selected)
       - "Run Analysis" button
     - **Sensitivity Results**:
       - 1D Sensitivity: Table showing variable value vs. KPIs (NPV, IRR, MOIC, WACC)
       - 2D Sensitivity: Heatmap visualization (if Variable Y provided)
       - Tornado Chart: Bar chart showing impact range (optional, v0.9+)
     - **Advanced Metrics Display**:
       - WACC breakdown (Equity %, Debt %, Cost of Equity, Cost of Debt, Tax Rate, WACC)
       - Breakeven Occupancy (with method and iterations)
   - **Layout**: Controls on left, results on right (responsive)

**Implementation Notes**:
- Tab state managed via React state or URL routing (e.g., `/dashboard`, `/assumptions`, `/financials`, `/analysis`)
- All tabs share the same `FullModelOutput` from `useFullModel` hook
- Tab switching does not re-run the model (uses cached output)
- Print functionality works from any tab (renders a unified "Report View" - see Reporting Module v0.7)
- Responsive design: tabs stack vertically on mobile, horizontal on desktop

### Data Portability

**Purpose**: Enable executives to save their work locally and share scenarios via JSON files (email, file sharing, etc.).

**JSON Schema** (`src/domain/portability.ts`):
```typescript
export interface PortableScenario {
  metadata: {
    version: string;        // e.g., "0.8"
    timestamp: number;      // milliseconds since epoch
    exportedBy?: string;    // optional user name
    appVersion?: string;    // optional app version
  };
  scenario: NamedScenario; // Full scenario with modelConfig (from v0.5)
}
```

**Import/Export Functions** (`src/ui/utils/portability.ts`):
- **`exportScenarioToJson(scenario: NamedScenario): string`**
  - Serializes `PortableScenario` to JSON string
  - Triggers browser download via `Blob` API and `<a>` element
  - File name: `scenario-{scenarioId}-{timestamp}.json`

- **`importScenarioFromJson(jsonString: string): PortableScenario`**
  - Parses JSON string into `PortableScenario`
  - Validates schema (version compatibility, required fields)
  - Returns parsed scenario or throws error

- **`importScenarioFromFile(file: File): Promise<NamedScenario>`**
  - Reads file content, calls `importScenarioFromJson`
  - Handles file reading errors gracefully
  - Returns `NamedScenario` for adding to Scenario Library

**UI Integration**:
- **Export Button** (Global Header):
  - Exports current scenario (from Scenario Selector) to JSON
  - Shows success toast/notification
  - Handles errors gracefully (file system errors, etc.)

- **Import Button** (Global Header):
  - Opens file picker dialog
  - Reads selected JSON file
  - Validates and imports scenario
  - Adds to Scenario Library (or replaces if ID matches)
  - Shows success/error toast/notification

**Version Compatibility**:
- v0.8 exports include `metadata.version: "0.8"`
- Import function checks version and handles backward compatibility:
  - v0.6/v0.7 scenarios: Migrate to v0.8 format (if needed)
  - Future versions: Warn if version mismatch, attempt import if schema compatible
- Schema validation ensures required fields are present

**Implementation Notes**:
- JSON files are fully self-contained (include all scenario data)
- No external dependencies (scenarios are portable across environments)
- File size considerations: Large scenarios may be 100KB-1MB (acceptable for JSON)
- Error handling: Clear error messages for invalid JSON, missing fields, version mismatches

### Critical Fixes (v0.8)

**Purpose**: Address critical gaps in v0.7 implementation.

#### WACC Visibility in Sensitivity Analysis

**Issue**: WACC is calculated but not included in sensitivity analysis results.

**Fix**:
- Update `SensitivityResult` type to include WACC in KPIs:
  ```typescript
  kpis: {
    npv: number;
    unleveredIrr: number | null;
    leveredIrr?: number | null;
    moic?: number;
    equityMultiple: number;
    wacc: number;  // ADD: WACC from calculateWacc()
  };
  ```
- Update `runSensitivityAnalysis()` to calculate WACC for each run:
  - Call `calculateWacc()` with adjusted `projectConfig` and `capitalConfig`
  - Include WACC in extracted KPIs
- Update Analysis Tab to display WACC in sensitivity results table/chart

#### Print Functionality Across All Tabs

**Issue**: Print functionality (v0.7) may not work correctly when accessed from different tabs.

**Fix**:
- **Unified Report View**: Create a dedicated report rendering function that:
  - Takes `FullModelOutput` and current scenario metadata
  - Renders all report sections regardless of active tab
  - Uses print CSS (`@media print`) to format for A4/Letter
- **Print Button Behavior**:
  - Always renders the unified report view (not current tab content)
  - Works from any tab (Dashboard, Assumptions, Financials, Analysis)
  - Opens browser print dialog with formatted report
- **Report Content** (from v0.7):
  - Executive Summary (KPIs)
  - Capital Structure
  - Cash Flow Profile
  - Waterfall Summary
  - Sensitivity Analysis (if available)
  - Advanced Metrics (WACC, Breakeven)
  - Detailed Tables
  - Appendix (model configuration)

**Implementation Notes**:
- Print view is a separate component: `src/components/ReportView.tsx`
- Report view can be accessed via:
  1. Print button in Global Header (from any tab)
  2. Direct route: `/report` or `/report/:scenarioId`
- Print CSS hides all non-essential elements (header, tabs, buttons except print button)
- Page breaks ensure proper section separation

### v0.8 – Tabbed Navigation, Portability & Fixes

**Status**: ✅ Implemented in v0.8

**Focus**: Professional tabbed interface, data portability (JSON import/export), and critical fixes

#### v0.8 Scope Summary

**MUST HAVE (v0.8)**:
1. **UI Architecture (The "Shell")**: Tabbed navigation structure
   - `MainLayout` component with Global Header and tab navigation
   - Global Header: App Title, Scenario Selector, Import/Export Buttons, Print Button
   - Four tabs: Dashboard, Assumptions, Financials, Analysis
   - Tab state management (React state or URL routing)
   - Responsive design (tabs stack on mobile)

2. **Data Portability**: JSON import/export
   - `PortableScenario` type with metadata (version, timestamp) and scenario
   - Export function: `exportScenarioToJson()` - saves scenario to JSON file
   - Import function: `importScenarioFromFile()` - loads scenario from JSON file
   - Version compatibility handling (v0.6/v0.7 → v0.8 migration)
   - UI integration: Import/Export buttons in Global Header

3. **Critical Fixes**:
   - **WACC in Sensitivity**: Update `SensitivityResult` to include WACC in KPIs, update `runSensitivityAnalysis()` to calculate WACC per run
   - **Print Across Tabs**: Unified `ReportView` component that works from any tab, print button always renders report view

**NICE TO HAVE (v0.8)**:
- URL routing for tabs (e.g., `/dashboard`, `/assumptions`)
- Advanced sensitivity visualizations (tornado chart, 2D heatmap)
- Column filtering/sorting in Financials tab tables

#### v0.8 Agent Responsibilities

**UI_AGENT**:
- Implement MainLayout component with Global Header and tab navigation
- Create four tab components: `DashboardTab`, `AssumptionsTab`, `FinancialsTab`, `AnalysisTab`
- Implement tab state management (React state or URL routing)
- Integrate Import/Export buttons in Global Header
- Implement `ReportView` component for unified print functionality
- Ensure print button works from any tab
- Add responsive design (tabs stack on mobile)
- Update existing components to fit tabbed structure

**DATA_PORTABILITY_AGENT** (new agent or UI_AGENT):
- Implement `PortableScenario` type in `src/domain/portability.ts`
- Implement export function: `exportScenarioToJson()` in `src/ui/utils/portability.ts`
- Implement import function: `importScenarioFromFile()` in `src/ui/utils/portability.ts`
- Add version compatibility handling (v0.6/v0.7 → v0.8 migration)
- Integrate Import/Export buttons with file system (browser File API)
- Add error handling and user notifications (toasts)

**SENSITIVITY_AGENT** (or FINANCE_ENGINE_AGENT):
- Fix WACC visibility: Update `SensitivityResult` type to include `wacc: number` in KPIs
- Update `runSensitivityAnalysis()` to calculate WACC for each sensitivity run
- Update Analysis Tab to display WACC in sensitivity results

**INFRA_TEST_AGENT**:
- Add tests for tab navigation (tab switching, state persistence)
- Add tests for data portability (export/import JSON, version compatibility)
- Add tests for WACC in sensitivity analysis results
- Add tests for print functionality from different tabs
- Ensure all existing tests continue to pass (backward compatibility)

**DOCS_AGENT**:
- Update ARCHITECTURE.md with v0.8 implementation details as features are completed
- Update AGENTS.md to reflect v0.8 as current milestone
- Document tab structure and navigation patterns
- Document data portability JSON schema and version compatibility
- Document print functionality across tabs

**INTEGRATOR_QA_AGENT**:
- Validate end-to-end flow: tab navigation → data portability → print functionality
- Verify tab switching does not re-run model (uses cached output)
- Test import/export with various scenarios (v0.6, v0.7, v0.8 formats)
- Test WACC calculation in sensitivity analysis
- Test print functionality from all tabs
- Validate responsive design (mobile, tablet, desktop)
- Produce integration summary for v0.8 completion

#### What v0.8 Explicitly Does NOT Do

1. **No Scenario Editing UI**:
   - Assumptions Tab is read-only (displays inputs, no editing)
   - Scenario editing forms deferred to v0.9+

2. **No Advanced Sensitivity Visualizations**:
   - Basic sensitivity tables implemented
   - Tornado charts and 2D heatmaps are nice-to-have (can be deferred)

3. **No URL Routing**:
   - Tab state managed via React state (URL routing is nice-to-have)
   - Direct links to tabs deferred to v0.9+

4. **No Web Workers**:
   - All calculations run on main thread (risk avoidance)
   - Performance optimization deferred to v0.9+ if needed

5. **No PDF Export**:
   - Print functionality uses browser print dialog (PDF via browser)
   - Programmatic PDF export deferred to v0.9+

## v0.8.1 - Logic Hardening & Bug Fixes

**Status**: ✅ Implemented in v0.8.1

**Overview**: Critical mathematical bug fixes in financial engines discovered during CI/CD validation. This is a patch release that fixes calculation errors without changing UI or types to preserve v0.8 stability.

**Scope**: Engine logic fixes only - NO UI changes, NO type changes, NO new features.

### Critical Fixes

#### 1. Refinancing: Strict Zero-Out of Old Tranche Balance

**Issue**: When a tranche is refinanced at `refinanceAtYear`, the old tranche's ending balance may not be strictly zeroed out, leading to incorrect aggregate debt calculations.

**Required Fix**:
- At `refinanceAtYear`, the old tranche's `endingBalance` MUST be exactly `0`
- Principal payment in the refinance year MUST equal the `beginningBalance` of that year (full repayment)
- The old tranche's schedule MUST end at `refinanceAtYear` (no entries after refinance)
- Aggregate debt calculations must exclude the old tranche after `refinanceAtYear`

**Implementation Location**: `src/engines/capital/capitalEngine.ts` - `computeTrancheSchedule()` function

**Validation**:
- After refinance: `oldTranche.endingBalance[refinanceAtYear] === 0` (strict equality)
- Principal payment: `oldTranche.principal[refinanceAtYear] === oldTranche.beginningBalance[refinanceAtYear]`
- Old tranche schedule length: `refinanceAtYear + 1` entries (Year 0 through refinance year)

#### 2. Exit Fees: Calculate on Beginning Balance of Exit Year

**Issue**: Exit fees are currently calculated on `endingBalance` at maturity/refinance, but should be calculated on `beginningBalance` of the exit year.

**Current (Incorrect) Behavior** (v0.6-v0.8):
- `exitFee = endingBalance × exitFeePct` (where `endingBalance` is the balance at maturity or refinance)

**Required Fix**:
- `exitFee = beginningBalance × exitFeePct` (where `beginningBalance` is the balance at the START of the exit year)
- Exit year is: `startYear + termYears` (maturity) or `refinanceAtYear` (refinance), whichever comes first
- Exit fee is paid in the exit year, separate from principal repayment

**Implementation Location**: `src/engines/capital/capitalEngine.ts` - transaction cost calculation in `computeTrancheSchedule()` or aggregate debt service calculation

**Validation**:
- Exit fee calculation: `exitFee = debtScheduleEntry.beginningBalance × exitFeePct` (not `endingBalance`)
- Exit fee is included in `transactionCosts` field of `LeveredFcf` for the exit year
- Exit fee does not affect principal repayment (principal still repays the full `beginningBalance`)

#### 3. Waterfall Catch-up: Strict Respect of Target Split Cap

**Issue**: Catch-up logic may not strictly enforce the `catchUpTargetSplit` cap, allowing distributions to exceed the target split ratio.

**Required Fix**:
- When `enableCatchUp: true` on a tier, distributions MUST NOT exceed `catchUpTargetSplit` ratios
- Once cumulative distribution percentages match `catchUpTargetSplit` (within tolerance), catch-up is complete
- After catch-up completion, distributions MUST follow standard `distributionSplits` (not continue using `catchUpTargetSplit`)
- The catch-up check MUST compare cumulative distribution percentages, not absolute amounts
- Tolerance for catch-up completion: `0.001` (0.1%) - cumulative percentages must match within this tolerance

**Implementation Location**: `src/engines/waterfall/waterfallEngine.ts` - `applyMultiTierWaterfall()` function, catch-up logic

**Validation**:
- During catch-up: `cumulativeDistributionPct[partnerId] <= catchUpTargetSplit[partnerId] + tolerance`
- After catch-up: distributions use `distributionSplits`, not `catchUpTargetSplit`
- Catch-up completion check: `|cumulativeDistributionPct[partnerId] - catchUpTargetSplit[partnerId]| <= 0.001` for all partners
- Waterfall invariant must still hold: `sum(partner CFs) ≈ owner CF` for each year

### v0.8.1 Agent Responsibilities

**CAPITAL_WATERFALL_AGENT**:
- Fix Refinancing: Ensure old tranche balance is strictly zeroed at `refinanceAtYear`
- Fix Exit Fees: Change calculation from `endingBalance` to `beginningBalance` of exit year
- Fix Catch-up: Enforce strict `catchUpTargetSplit` cap in waterfall catch-up logic
- Add validation tests for all three fixes
- Ensure backward compatibility: existing scenarios produce same results (except for corrected calculations)

**INFRA_TEST_AGENT**:
- Add regression tests for refinancing (old tranche balance = 0 at refinance)
- Add regression tests for exit fees (calculated on beginning balance)
- Add regression tests for catch-up (strict target split cap enforcement)
- Verify all existing tests continue to pass
- Add edge case tests (multiple refinances, catch-up with various scenarios)

**DOCS_AGENT**:
- Update ARCHITECTURE.md with corrected behavior descriptions
- Document the fixes in this v0.8.1 section
- Update relevant sections (Transaction Costs, Waterfall v2) to reflect corrected calculations

**INTEGRATOR_QA_AGENT**:
- Validate all three fixes work correctly
- Verify backward compatibility (no breaking changes to types or UI)
- Test edge cases (multiple refinances, catch-up completion, exit fees at maturity vs refinance)
- Produce integration summary for v0.8.1 completion

### What v0.8.1 Explicitly Does NOT Do

1. **No UI Changes**:
   - UI remains unchanged from v0.8
   - No new components, no layout changes

2. **No Type Changes**:
   - All domain types remain unchanged
   - No new fields, no breaking changes

3. **No New Features**:
   - This is a bug fix release only
   - No new functionality added

4. **No Performance Optimizations**:
   - Focus is on correctness, not performance
   - Performance improvements deferred to v0.9+

## v0.9 - Math Integrity, USALI Standards & Validation

**Status**: ✅ Implemented in v0.9

**Overview**: Completes v0.8.1 math fixes, implements USALI (Uniform System of Accounts for the Lodging Industry) accounting standards for professional presentation, and adds comprehensive input validation using Zod schemas.

**Context**: 
- 9 failing tests in v0.8.1 (Refinancing logic, Exit Fees, Waterfall Catch-up/Clawback)
- Need USALI compliance for professional hospitality financial reporting
- Need input validation to secure the system against invalid data

### Math Fixes (Completing v0.8.1)

**Purpose**: Complete the critical mathematical bug fixes identified in v0.8.1, ensuring all financial calculations are correct.

#### 1. Capital Engine Fixes

**Refinancing: Strict Zero-Out of Old Tranche Balance** (from v0.8.1):
- ✅ **Requirement**: At `refinanceAtYear`, old tranche's `endingBalance` MUST be exactly `0`
- ✅ **Requirement**: Principal payment MUST equal `beginningBalance` of refinance year
- ✅ **Requirement**: Old tranche schedule MUST end at `refinanceAtYear` (no entries after)
- **Implementation**: `src/engines/capital/capitalEngine.ts` - `computeTrancheSchedule()`
- **Validation**: All refinancing tests must pass

**Exit Fees: Calculate on Beginning Balance** (from v0.8.1):
- ✅ **Requirement**: `exitFee = beginningBalance × exitFeePct` (not `endingBalance`)
- ✅ **Requirement**: Exit year is `startYear + termYears` (maturity) or `refinanceAtYear` (refinance)
- **Implementation**: `src/engines/capital/capitalEngine.ts` - transaction cost calculation
- **Validation**: All exit fee tests must pass

#### 2. Waterfall Engine Fixes

**Catch-up: Strict Respect of Target Split Cap** (from v0.8.1):
- ✅ **Requirement**: Distributions MUST NOT exceed `catchUpTargetSplit` ratios
- ✅ **Requirement**: Catch-up completion validation within 0.1% tolerance
- ✅ **Requirement**: After catch-up, distributions use `distributionSplits` (not `catchUpTargetSplit`)
- **Implementation**: `src/engines/waterfall/waterfallEngine.ts` - `applyMultiTierWaterfall()`
- **Validation**: All catch-up tests must pass

**Clawback: Hypothetical Liquidation Fix**:
- **Issue**: Clawback hypothetical liquidation method may have calculation errors
- **Requirement**: Recalculation of waterfall from Year 0 to evaluation point must be mathematically correct
- **Requirement**: Comparison of required vs actual distributions must be accurate
- **Requirement**: Clawback adjustments must respect waterfall invariant
- **Implementation**: `src/engines/waterfall/waterfallEngine.ts` - clawback logic
- **Validation**: All clawback tests must pass

**Test Coverage**:
- All 9 failing tests from v0.8.1 must pass
- Additional edge case tests for refinancing, exit fees, catch-up, and clawback
- Integration tests verifying fixes work together

### USALI Standards (Uniform System of Accounts for the Lodging Industry)

**Purpose**: Align financial statement presentation with USALI standards for professional hospitality financial reporting.

**P&L Line Renaming/Mapping**:

The following fields in `ConsolidatedAnnualPnl` (and related types) will be renamed/mapped to USALI terminology:

| Current Field Name | USALI Standard Name | Notes |
|-------------------|---------------------|-------|
| `revenueTotal` | `totalOperatingRevenue` | Total operating revenue (rooms, food, beverage, other) |
| `cogsTotal` | `departmentalExpenses` | Cost of goods sold (food COGS, beverage COGS) |
| `opexTotal` | `undistributedOperatingExpenses` | Operating expenses (payroll, utilities, marketing, maintenance, other) |
| `grossOperatingProfit` | `grossOperatingProfit` | GOP (stays the same, already USALI-compliant) |
| `ebitda` | `ebitda` | EBITDA (stays the same) |
| `maintenanceCapex` | `replacementReserve` | Maintenance capex → Replacement Reserve (USALI term) |
| `noi` | `netOperatingIncome` | NOI after Replacement Reserve (USALI-compliant) |

**Enhanced `ConsolidatedAnnualPnl` Interface** (v0.9):

```typescript
export interface ConsolidatedAnnualPnl {
  yearIndex: number;

  // USALI-compliant field names
  totalOperatingRevenue: number;        // was: revenueTotal
  departmentalExpenses: number;          // was: cogsTotal
  undistributedOperatingExpenses: number; // was: opexTotal
  
  grossOperatingProfit: number;         // GOP (unchanged)
  ebitda: number;                       // EBITDA (unchanged)
  replacementReserve: number;            // was: maintenanceCapex
  netOperatingIncome: number;           // was: noi (after Replacement Reserve)
  cashFlow: number;                     // unchanged

  // Backward compatibility (deprecated, will be removed in v1.0)
  revenueTotal?: number;                // deprecated: use totalOperatingRevenue
  cogsTotal?: number;                   // deprecated: use departmentalExpenses
  opexTotal?: number;                   // deprecated: use undistributedOperatingExpenses
  maintenanceCapex?: number;            // deprecated: use replacementReserve
  noi?: number;                         // deprecated: use netOperatingIncome
}
```

**Implementation Strategy**:
- **Phase 1**: Add new USALI field names alongside existing fields (backward compatibility)
- **Phase 2**: Update all engines to populate both old and new fields
- **Phase 3**: Update UI to use new field names (with fallback to old names)
- **Phase 4**: Remove deprecated fields in v1.0 (breaking change)

**File Locations**:
- Type definitions: `src/domain/types.ts`
- Engine updates: All engines that create/use `ConsolidatedAnnualPnl`
- UI updates: All components displaying P&L data

**USALI Compliance Notes** (v0.9, Fixed in v0.9.1):
- **Gross Operating Profit (GOP)**: `totalOperatingRevenue - departmentalExpenses`
- ✅ **Net Operating Income (NOI)**: `GOP - undistributedOperatingExpenses` (NOT `GOP - undistributedOperatingExpenses - replacementReserve`)
- **Replacement Reserve**: Previously called "maintenance capex", now uses USALI terminology. Separate line item, NOT included in NOI calculation per USALI.
- **Departmental Expenses**: Food COGS + Beverage COGS (direct costs)
- **Undistributed Operating Expenses**: Payroll, utilities, marketing, maintenance OPEX, other OPEX (indirect costs)

### Input Validation (Zod Schemas)

**Purpose**: Secure the system against invalid input data by validating all scenario configurations before processing.

**Zod Schema Definitions** (`src/domain/validation.ts`):

```typescript
import { z } from 'zod';

// Base schemas for common types
const YearIndexSchema = z.number().int().min(0).max(100);
const PercentageSchema = z.number().min(0).max(1); // 0..1 decimal
const PositiveNumberSchema = z.number().positive();
const NonNegativeNumberSchema = z.number().nonnegative();
const OccupancyArraySchema = z.array(z.number().min(0).max(1)).length(12);

// Operation config schemas
const HotelConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  operationType: z.literal('HOTEL'),
  startYear: z.number().int().min(2000).max(2100),
  horizonYears: z.number().int().min(1).max(50),
  keys: PositiveNumberSchema,
  avgDailyRate: PositiveNumberSchema,
  occupancyByMonth: OccupancyArraySchema,
  foodRevenuePctOfRooms: PercentageSchema,
  beverageRevenuePctOfRooms: PercentageSchema,
  otherRevenuePctOfRooms: PercentageSchema,
  foodCogsPct: PercentageSchema,
  beverageCogsPct: PercentageSchema,
  payrollPct: PercentageSchema,
  utilitiesPct: PercentageSchema,
  marketingPct: PercentageSchema,
  maintenanceOpexPct: PercentageSchema,
  otherOpexPct: PercentageSchema,
  maintenanceCapexPct: PercentageSchema,
});

// Similar schemas for other operation types (VillasConfigSchema, RestaurantConfigSchema, etc.)

// Project config schema
const ProjectConfigSchema = z.object({
  discountRate: PercentageSchema,
  terminalGrowthRate: z.number().min(-0.1).max(0.1), // -10% to +10%
  initialInvestment: PositiveNumberSchema,
  workingCapitalPercentage: PercentageSchema.optional(),
  workingCapitalPercent: PercentageSchema.optional(), // backward compatibility
  taxRate: PercentageSchema.optional(), // for WACC calculation
});

// Capital structure schema
const DebtTrancheConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  type: z.enum(['SENIOR', 'MEZZ', 'BRIDGE', 'OTHER']).optional(),
  amount: PositiveNumberSchema.optional(), // deprecated
  initialPrincipal: PositiveNumberSchema.optional(),
  interestRate: PercentageSchema,
  amortizationType: z.enum(['interest_only', 'mortgage', 'bullet']).optional(),
  termYears: z.number().int().positive().max(50),
  amortizationYears: z.number().int().positive().max(50).optional(),
  ioYears: z.number().int().nonnegative().max(50).optional(),
  startYear: z.number().int().nonnegative().max(50).optional(),
  refinanceAtYear: z.number().int().nonnegative().max(50).optional(),
  originationFeePct: PercentageSchema.optional(),
  exitFeePct: PercentageSchema.optional(),
}).refine(
  (data) => data.initialPrincipal !== undefined || data.amount !== undefined,
  { message: "Either initialPrincipal or amount must be provided" }
);

const CapitalStructureConfigSchema = z.object({
  initialInvestment: PositiveNumberSchema,
  debtTranches: z.array(DebtTrancheConfigSchema).min(0),
});

// Waterfall config schema
const EquityClassSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  contributionPct: PercentageSchema,
  distributionPct: PercentageSchema.optional(),
});

const WaterfallTierSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['return_of_capital', 'preferred_return', 'promote']),
  hurdleIrr: PercentageSchema.optional(),
  distributionSplits: z.record(z.string(), PercentageSchema),
  enableCatchUp: z.boolean().optional(),
  catchUpTargetSplit: z.record(z.string(), PercentageSchema).optional(),
  catchUpRate: PercentageSchema.optional(),
  enableClawback: z.boolean().optional(),
  clawbackTrigger: z.enum(['final_period', 'annual']).optional(),
  clawbackMethod: z.enum(['hypothetical_liquidation', 'lookback']).optional(),
});

const WaterfallConfigSchema = z.object({
  equityClasses: z.array(EquityClassSchema).min(1),
  tiers: z.array(WaterfallTierSchema).optional(),
}).refine(
  (data) => {
    const totalContribution = data.equityClasses.reduce((sum, ec) => sum + ec.contributionPct, 0);
    return Math.abs(totalContribution - 1.0) < 0.01; // within 1% tolerance
  },
  { message: "Equity class contribution percentages must sum to approximately 1.0" }
);

// Scenario schema
const OperationConfigSchema = z.union([
  HotelConfigSchema,
  // VillasConfigSchema, RestaurantConfigSchema, etc.
]);

const ProjectScenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startYear: z.number().int().min(2000).max(2100),
  horizonYears: z.number().int().min(1).max(50),
  operations: z.array(OperationConfigSchema).min(1),
});

// Full model input schema
const FullModelInputSchema = z.object({
  scenario: ProjectScenarioSchema,
  projectConfig: ProjectConfigSchema,
  capitalConfig: CapitalStructureConfigSchema,
  waterfallConfig: WaterfallConfigSchema,
  netDebtOverride: z.object({
    grossDebt: PositiveNumberSchema.optional(),
    cash: NonNegativeNumberSchema.optional(),
  }).optional(),
});
```

**Validation Functions** (`src/domain/validation.ts`):

```typescript
/**
 * Validates a full model input configuration.
 * Throws ZodError with detailed error messages if validation fails.
 * 
 * @param input - Full model input to validate
 * @returns Validated input (same object, but type-safe)
 * @throws ZodError if validation fails
 */
export function validateFullModelInput(input: unknown): FullModelInput {
  return FullModelInputSchema.parse(input);
}

/**
 * Validates a project scenario.
 * 
 * @param scenario - Scenario to validate
 * @returns Validated scenario
 * @throws ZodError if validation fails
 */
export function validateScenario(scenario: unknown): ProjectScenario {
  return ProjectScenarioSchema.parse(scenario);
}

/**
 * Validates a project configuration.
 * 
 * @param config - Project config to validate
 * @returns Validated config
 * @throws ZodError if validation fails
 */
export function validateProjectConfig(config: unknown): ProjectConfig {
  return ProjectConfigSchema.parse(config);
}

/**
 * Validates a capital structure configuration.
 * 
 * @param config - Capital config to validate
 * @returns Validated config
 * @throws ZodError if validation fails
 */
export function validateCapitalConfig(config: unknown): CapitalStructureConfig {
  return CapitalStructureConfigSchema.parse(config);
}

/**
 * Validates a waterfall configuration.
 * 
 * @param config - Waterfall config to validate
 * @returns Validated config
 * @throws ZodError if validation fails
 */
export function validateWaterfallConfig(config: unknown): WaterfallConfig {
  return WaterfallConfigSchema.parse(config);
}
```

**Integration Points**:
- **UI Import**: Validate imported JSON scenarios before adding to Scenario Library
- **API Entry Points**: Validate all inputs to `runFullModel()` and other engine functions
- **Type Safety**: Use validated inputs to ensure type safety throughout the pipeline

**Error Handling**:
- Zod errors provide detailed messages (field name, expected type, actual value)
- UI should display user-friendly error messages based on Zod errors
- Validation errors should be caught early (before model execution)

### v0.9 Agent Responsibilities

**CAPITAL_WATERFALL_AGENT**:
- Complete v0.8.1 math fixes: Refinancing zero-out, Exit fees calculation, Catch-up target split cap
- Fix Clawback hypothetical liquidation calculation errors
- Ensure all 9 failing tests pass
- Add edge case tests for all fixes

**FINANCE_ENGINE_AGENT**:
- Implement USALI standards: Update `ConsolidatedAnnualPnl` interface with new field names
- Update all engines to populate both old and new USALI fields (backward compatibility)
- Ensure GOP and NOI calculations align with USALI definitions
- Update `MonthlyPnl` and `AnnualPnl` types if needed for USALI compliance

**VALIDATION_AGENT** (new agent or FINANCE_ENGINE_AGENT):
- Implement Zod schemas for all input types (`ScenarioSchema`, `ProjectConfigSchema`, etc.)
- Create validation functions (`validateScenario`, `validateFullModelInput`, etc.)
- Integrate validation into UI import/export flows
- Add validation to `runFullModel()` entry point
- Provide user-friendly error messages for validation failures

**INFRA_TEST_AGENT**:
- Add tests for all math fixes (refinancing, exit fees, catch-up, clawback)
- Add tests for USALI field mapping and calculations
- Add tests for Zod validation (valid inputs, invalid inputs, edge cases)
- Ensure all existing tests continue to pass
- Add integration tests for validated inputs through full pipeline

**DOCS_AGENT**:
- Update ARCHITECTURE.md with USALI field mappings and validation schemas
- Update AGENTS.md to reflect v0.9 as current milestone
- Document USALI compliance and field name changes
- Document validation error handling and user messaging

**INTEGRATOR_QA_AGENT**:
- Validate all math fixes work correctly (all 9 tests pass)
- Validate USALI field mapping works end-to-end
- Validate Zod validation catches invalid inputs
- Test backward compatibility (old field names still work)
- Test validation error messages are user-friendly
- Produce integration summary for v0.9 completion

### What v0.9 Explicitly Does NOT Do

1. **No Breaking Changes to Types (Yet)**:
   - Old field names remain available (deprecated)
   - Breaking changes deferred to v1.0

2. **No UI Redesign**:
   - UI updates limited to using new USALI field names (with fallback)
   - No major UI restructuring

3. **No New Financial Features**:
   - Focus is on correctness (math fixes), standards (USALI), and security (validation)
   - New features deferred to v1.0+

4. **No Performance Optimizations**:
   - Validation adds overhead but is necessary for security
   - Performance improvements deferred to v1.0+

## v0.9.1 - Regression Fixes & Math Hardening

**Status**: ⏳ Planned for v0.9.1 implementation (Hotfix)

**Overview**: Critical regression fixes addressing 33 failing tests introduced in v0.9. This is a patch release that fixes calculation errors and validation issues without changing UI or types to preserve v0.9 stability.

**Context**: 
- 33 failing tests in v0.9 (regressions from v0.9 implementation)
- Math logic errors: Refinancing, Exit Fees, Waterfall Catch-up
- USALI logic error: NOI calculation incorrect in scenario engine
- Validation error: Zod error handling causing test failures

**Scope**: Regression fixes only - NO new features, NO UI changes, NO type changes.

### Critical Regression Fixes

#### 1. Math Logic Fixes

**Refinancing: Old Debt Not Zeroing**:
- **Issue**: Old tranche balance is not being strictly zeroed at `refinanceAtYear` (regression from v0.9)
- **Required Fix**: 
  - At `refinanceAtYear`, old tranche's `endingBalance` MUST be exactly `0`
  - Principal payment MUST equal `beginningBalance` of refinance year
  - Old tranche schedule MUST end at `refinanceAtYear` (no entries after)
- **Implementation**: `src/engines/capital/capitalEngine.ts` - `computeTrancheSchedule()`
- **Validation**: All refinancing tests must pass

**Exit Fees: Wrong Base Calculation**:
- **Issue**: Exit fees are being calculated on wrong base (regression from v0.9)
- **Required Fix**: 
  - `exitFee = beginningBalance × exitFeePct` (where `beginningBalance` is the balance at the START of the exit year)
  - Exit year is `startYear + termYears` (maturity) or `refinanceAtYear` (refinance), whichever comes first
  - Exit fee is paid in the exit year, separate from principal repayment
- **Implementation**: `src/engines/capital/capitalEngine.ts` - transaction cost calculation
- **Validation**: All exit fee tests must pass

**Waterfall Catch-up: Overshoot**:
- **Issue**: Catch-up logic is overshooting the target split cap (regression from v0.9)
- **Required Fix**: 
  - Distributions MUST NOT exceed `catchUpTargetSplit` ratios
  - Catch-up completion validation within 0.1% tolerance
  - After catch-up, distributions use `distributionSplits` (not `catchUpTargetSplit`)
  - The catch-up check MUST compare cumulative distribution percentages, not absolute amounts
- **Implementation**: `src/engines/waterfall/waterfallEngine.ts` - `applyMultiTierWaterfall()`
- **Validation**: All catch-up tests must pass

#### 2. USALI Logic Fix

**NOI Calculation in Scenario Engine**:
- **Issue**: NOI calculation in `scenarioEngine` is incorrect - it's not properly subtracting undistributed expenses from GOP
- **Current (Incorrect) Behavior**: NOI calculation may be using wrong formula or missing undistributed expenses
- **Required Fix**: 
  - **Correct USALI Formula**: `NOI = GOP - Undistributed Operating Expenses`
  - Where:
    - `GOP = Total Operating Revenue - Departmental Expenses`
    - `Undistributed Operating Expenses = opexTotal` (payroll, utilities, marketing, maintenance OPEX, other OPEX)
  - **Implementation**: `src/engines/scenario/scenarioEngine.ts` - consolidated P&L calculation
  - The scenario engine must calculate:
    - `grossOperatingProfit = totalOperatingRevenue - departmentalExpenses`
    - `netOperatingIncome = grossOperatingProfit - undistributedOperatingExpenses`
  - Note: Replacement Reserve (maintenance capex) is NOT subtracted in NOI calculation per USALI - it's a separate line item
- **Validation**: All scenario engine tests must pass, NOI values must match USALI standard

**USALI Compliance Notes**:
- **Gross Operating Profit (GOP)**: `totalOperatingRevenue - departmentalExpenses`
- **Net Operating Income (NOI)**: `GOP - undistributedOperatingExpenses` (NOT `GOP - undistributedOperatingExpenses - replacementReserve`)
- **Replacement Reserve**: Separate line item, not included in NOI calculation per USALI
- **Departmental Expenses**: Food COGS + Beverage COGS (direct costs)
- **Undistributed Operating Expenses**: Payroll, utilities, marketing, maintenance OPEX, other OPEX (indirect costs)

#### 3. Validation Fix

**Zod Error Handling**:
- **Issue**: Zod validation error messages are causing test failures due to error message mismatch
- **Required Fix**: 
  - Ensure Zod error messages are consistent and match test expectations
  - Error messages should be deterministic and stable
  - If tests expect specific error message formats, ensure Zod schemas produce those formats
  - Consider using custom error messages in Zod schemas if needed
- **Implementation**: `src/domain/validation.ts` - Zod schema definitions
- **Validation**: All validation tests must pass

### v0.9.1 Agent Responsibilities

**CAPITAL_WATERFALL_AGENT**:
- Fix Refinancing: Ensure old tranche balance is strictly zeroed at `refinanceAtYear`
- Fix Exit Fees: Ensure calculation uses `beginningBalance` of exit year
- Fix Catch-up: Ensure distributions do not overshoot `catchUpTargetSplit` cap
- Add regression tests for all three fixes
- Ensure all 33 failing tests pass

**FINANCE_ENGINE_AGENT**:
- Fix USALI NOI calculation: Ensure `NOI = GOP - Undistributed Operating Expenses` in scenario engine
- Verify GOP calculation: `GOP = Total Operating Revenue - Departmental Expenses`
- Ensure Replacement Reserve is NOT subtracted in NOI calculation (per USALI)
- Update scenario engine to correctly calculate USALI-compliant NOI
- Add regression tests for NOI calculation

**VALIDATION_AGENT** (or FINANCE_ENGINE_AGENT):
- Fix Zod error handling: Ensure error messages match test expectations
- Review Zod schema error messages for consistency
- Update error messages if needed to match test expectations
- Add regression tests for validation error messages

**INFRA_TEST_AGENT**:
- Identify all 33 failing tests and categorize by fix area
- Add regression tests for refinancing, exit fees, catch-up, NOI calculation, and validation
- Ensure all existing tests continue to pass
- Verify fixes resolve all 33 failing tests

**DOCS_AGENT**:
- Update ARCHITECTURE.md with corrected USALI NOI formula
- Document the regression fixes in this v0.9.1 section
- Update relevant sections (USALI Standards, Scenario Engine) to reflect corrected calculations

**INTEGRATOR_QA_AGENT**:
- Validate all regression fixes work correctly
- Verify all 33 failing tests now pass
- Test backward compatibility (no breaking changes to types or UI)
- Test edge cases for all fixes
- Produce integration summary for v0.9.1 completion

### What v0.9.1 Explicitly Does NOT Do

1. **NO New Features**:
   - This is a regression fix release only
   - No new functionality added
   - No new calculations or formulas

2. **NO UI Changes**:
   - UI remains unchanged from v0.9
   - No new components, no layout changes

3. **NO Type Changes**:
   - All domain types remain unchanged
   - No new fields, no breaking changes

4. **NO Performance Optimizations**:
   - Focus is on correctness, not performance
   - Performance improvements deferred to v1.0+

## v0.9.2 - Final Polish of Math & USALI

**Status**: ⏳ Planned for v0.9.2 implementation (Hotfix)

**Overview**: Final polish to achieve zero failing tests. Addresses remaining 14 failing tests related to USALI NOI calculation and waterfall catch-up edge cases.

**Context**: 
- 14 failing tests remaining after v0.9.1
- USALI NOI calculation may not be correctly using new USALI fields in scenario engine
- Waterfall catch-up logic stable but failing edge cases (likely rounding issues or off-by-one errors)

**Scope**: Final bug fixes only - NO new features, NO UI changes, NO type changes.

**Goal**: 0 Failing Tests

### Critical Fixes

#### 1. USALI Fix: Scenario Engine NOI Calculation

**Issue**: `scenarioEngine` may not be correctly computing `NOI` using the new USALI fields (`grossOperatingProfit`, `undistributedOperatingExpenses`).

**Required Fix**: 
- Ensure scenario engine uses USALI-compliant field names for NOI calculation:
  - `grossOperatingProfit = totalOperatingRevenue - departmentalExpenses`
  - `netOperatingIncome = grossOperatingProfit - undistributedOperatingExpenses`
- The calculation MUST use the new USALI field names, not the legacy field names
- Both USALI fields and legacy fields must be populated correctly
- **Implementation**: `src/engines/scenario/scenarioEngine.ts` - consolidated P&L calculation
- **Validation**: All scenario engine tests must pass, NOI values must match USALI standard exactly

**USALI Field Mapping Verification**:
- Verify `totalOperatingRevenue` is correctly set from `revenueTotal`
- Verify `departmentalExpenses` is correctly set from `cogsTotal`
- Verify `undistributedOperatingExpenses` is correctly set from `opexTotal`
- Verify `grossOperatingProfit` is calculated as `totalOperatingRevenue - departmentalExpenses`
- Verify `netOperatingIncome` is calculated as `grossOperatingProfit - undistributedOperatingExpenses`
- Verify `replacementReserve` is set from `maintenanceCapex` (separate line item, not in NOI)

#### 2. Waterfall Fix: Catch-up Edge Cases

**Issue**: Catch-up logic is stable but fails edge cases, likely due to:
- Rounding issues in cumulative distribution percentage calculations
- Off-by-one errors in catch-up completion detection
- Floating-point precision issues when comparing percentages

**Required Fix**: 
- **Rounding Precision**: Ensure cumulative distribution percentages are calculated with sufficient precision (at least 6 decimal places)
- **Catch-up Completion Check**: Use strict comparison with tolerance (0.1% = 0.001):
  - `|cumulativeDistributionPct[partnerId] - catchUpTargetSplit[partnerId]| <= 0.001` for all partners
- **Off-by-One Prevention**: Ensure catch-up check happens at the right time (after distribution allocation, before next tier)
- **Floating-Point Safety**: Use epsilon comparisons for percentage equality checks
- **Edge Cases to Handle**:
  - Very small distributions that cause rounding issues
  - Distributions that exactly match target split (should complete catch-up)
  - Distributions that slightly exceed target split (should cap at target)
  - Multiple partners with different target splits
- **Implementation**: `src/engines/waterfall/waterfallEngine.ts` - `applyMultiTierWaterfall()`, catch-up logic
- **Validation**: All catch-up edge case tests must pass

**Catch-up Algorithm Hardening**:
- Calculate cumulative distribution percentages with high precision
- Compare percentages using epsilon-based equality (tolerance: 0.001)
- Ensure catch-up completion is detected immediately when target is reached
- Ensure distributions never exceed `catchUpTargetSplit` ratios (strict cap)
- After catch-up completion, immediately switch to `distributionSplits` (not `catchUpTargetSplit`)

### v0.9.2 Agent Responsibilities

**FINANCE_ENGINE_AGENT**:
- Fix USALI NOI calculation: Ensure scenario engine correctly uses new USALI fields (`grossOperatingProfit`, `undistributedOperatingExpenses`)
- Verify all USALI field mappings are correct in scenario engine
- Ensure NOI calculation uses USALI formula: `netOperatingIncome = grossOperatingProfit - undistributedOperatingExpenses`
- Add regression tests for USALI NOI calculation with various scenarios
- Ensure all 14 failing tests pass

**CAPITAL_WATERFALL_AGENT**:
- Fix Catch-up edge cases: Address rounding issues and off-by-one errors
- Harden catch-up algorithm with high-precision percentage calculations
- Implement epsilon-based equality checks for catch-up completion
- Add edge case tests for catch-up (small distributions, exact matches, slight exceeds)
- Ensure all 14 failing tests pass

**INFRA_TEST_AGENT**:
- Identify all 14 failing tests and categorize by fix area (USALI NOI, Catch-up edge cases)
- Add regression tests for USALI NOI calculation with new fields
- Add edge case tests for catch-up (rounding, off-by-one, floating-point precision)
- Ensure all existing tests continue to pass
- Verify fixes resolve all 14 failing tests (goal: 0 failing tests)

**DOCS_AGENT**:
- Update ARCHITECTURE.md with v0.9.2 fixes
- Document USALI field usage in scenario engine
- Document catch-up algorithm hardening (precision, epsilon checks)
- Update relevant sections to reflect final fixes

**INTEGRATOR_QA_AGENT**:
- Validate all fixes work correctly (all 14 tests pass, goal: 0 failing tests)
- Verify USALI NOI calculation uses new fields correctly
- Verify catch-up handles all edge cases correctly
- Test backward compatibility (no breaking changes to types or UI)
- Test edge cases for both fixes
- Produce integration summary for v0.9.2 completion (confirming 0 failing tests)

### What v0.9.2 Explicitly Does NOT Do

1. **NO New Features**:
   - This is a final polish release only
   - No new functionality added
   - No new calculations or formulas

2. **NO UI Changes**:
   - UI remains unchanged from v0.9.1
   - No new components, no layout changes

3. **NO Type Changes**:
   - All domain types remain unchanged
   - No new fields, no breaking changes

4. **NO Performance Optimizations**:
   - Focus is on correctness, not performance
   - Performance improvements deferred to v1.0+

### v1.0+ (Future)

1. **Breaking Changes**:
   - Remove deprecated field names (old P&L field names)
   - Full USALI compliance (no backward compatibility)

2. **Advanced Capital Features**:
   - Partial refinances
   - Subordinated debt structures
   - Per-tranche KPIs

3. **Advanced Waterfall Features**:
   - Compounding preferred returns
   - More sophisticated catch-up mechanisms

4. **Advanced UI Features**:
   - Scenario editing forms
   - Advanced charts/visualizations (waterfall charts, sensitivity charts)
   - Excel/PDF export
   - Sensitivity analysis tools
   - Monte Carlo simulation interface

5. **Operation Type Refinements**:
   - More sophisticated modeling for specific operation types
   - Seasonal variations, operation subtypes

---

## Roadmap / Next Steps

### v0.6 (Current Milestone)

**Focus**: Deep Financials (Clawback + Fees) & Rich UI (Charts + Persistence)

See "v0.6 – Deep Financials (Clawback + Fees) & Rich UI (Charts + Persistence)" section above for complete details and agent responsibilities.

**Key Deliverables**:
- Capital Stack 2.1 with transaction costs (origination fees, exit fees)
- Waterfall v3 with full clawback implementation
- Scenario Builder v2 with persistence and export
- Rich UI with charts and visualizations

### v0.7 – Risk Analysis (Sensitivity) & Professional Reporting

**Status**: ✅ Implemented in v0.7

**Focus**: Sensitivity analysis, advanced metrics (WACC, Breakeven), and professional reporting

See "Risk Analysis (v0.7)" section above for complete specifications.

**Key Deliverables**:
- Sensitivity Analysis Engine (1D and 2D sensitivity runs)
- Advanced Metrics (WACC calculation, Breakeven Occupancy analysis)
- Reporting Module (print-friendly view, dedicated report page route)

### v0.8 – Tabbed Navigation, Portability & Fixes

**Status**: ✅ Implemented in v0.8

**Focus**: Professional tabbed interface, data portability (JSON import/export), and critical fixes

See "Tabbed Navigation & Data Portability (v0.8)" section above for complete specifications.

**Key Deliverables**:
- UI Architecture (MainLayout with tabbed navigation: Dashboard, Assumptions, Financials, Analysis)
- Data Portability (JSON import/export with version compatibility)
- Critical Fixes (WACC in sensitivity analysis, print functionality across all tabs)

### v0.8.1 – Logic Hardening & Bug Fixes

**Status**: ⏳ Planned for v0.8.1 implementation (Hotfix)

**Focus**: Critical mathematical bug fixes in financial engines

See "v0.8.1 - Logic Hardening & Bug Fixes" section above for complete specifications.

**Key Deliverables**:
- Refinancing fix: Strict zero-out of old tranche balance
- Exit Fees fix: Calculate on beginning balance of exit year
- Catch-up fix: Strict respect of target split cap

### v0.9 – Math Integrity, USALI Standards & Validation

**Status**: ⏳ Implemented in v0.9 (regressions fixed in v0.9.1)

**Focus**: Complete math fixes, implement USALI standards, add input validation

See "v0.9 - Math Integrity, USALI Standards & Validation" section above for complete specifications.

**Key Deliverables**:
- Math Fixes: Complete v0.8.1 fixes (all 9 tests pass), fix Clawback hypothetical liquidation
- USALI Standards: Rename P&L fields to USALI terminology (backward compatible)
- Input Validation: Zod schemas for all inputs, validation functions, error handling

### v0.9.1 – Regression Fixes & Math Hardening

**Status**: ⏳ Planned for v0.9.1 implementation (Hotfix)

**Focus**: Fix 33 failing tests from v0.9 regressions

See "v0.9.1 - Regression Fixes & Math Hardening" section above for complete specifications.

**Key Deliverables**:
- Math Logic Fixes: Refinancing (old debt zeroing), Exit Fees (correct base), Catch-up (no overshoot)
- USALI Logic Fix: NOI calculation (`NOI = GOP - Undistributed Operating Expenses`)
- Validation Fix: Zod error handling (error message consistency)

### v0.9.2 – Final Polish of Math & USALI

**Status**: ✅ Achieved 100% test pass rate in v0.9.2

**Focus**: Fix remaining 14 failing tests to achieve zero failing tests

See "v0.9.2 - Final Polish of Math & USALI" section above for complete specifications.

**Key Deliverables**:
- USALI Fix: Ensure scenario engine correctly uses new USALI fields for NOI calculation
- Waterfall Fix: Catch-up edge cases (rounding issues, off-by-one errors)
- Goal: 0 Failing Tests ✅ **ACHIEVED**

### v0.10 – The Glass Box (Auditability)

**Status**: ✅ Implemented in v0.10

**Focus**: Expose calculation logic in the UI without cluttering it. Investors trust models they can audit.

See "v0.10 – The Glass Box (Auditability)" section above for complete specifications.

**Key Deliverables**:
- AuditTrace data structure for calculation metadata
- Audit Overlay UI mode with traceability cards
- Just-in-Time AuditEngine helper
- Traceability for major financial outputs (NPV, IRR, NOI, DSCR, partner distributions)

### v0.11 – Simulation (Monte Carlo)

**Status**: ✅ Implemented

**Focus**: Monte Carlo simulation for risk analysis and probabilistic modeling

See "v0.11 – Simulation (Monte Carlo)" section above for complete specifications.

**Key Deliverables**:
- Monte Carlo simulation engine (500-1000 iterations, batch processing)
- Probabilistic input distributions (normal, uniform, triangular)
- Simulation results visualization (Distribution Histogram)
- Risk metrics (VaR, CVaR, P10, P50, P90 percentiles)
- Integration with existing sensitivity analysis framework

### v0.12 – Governance & Versioning

**Status**: ✅ Implemented

**Focus**: Manage the evolution of scenarios with versioning, diff tracking, and comparison capabilities

See "v0.12 – Governance & Versioning" section above for complete specifications.

**Key Deliverables**:
- Versioning data structure (`ScenarioVersion`, `VersionedScenarioLibrary`)
- Diff engine for comparing scenarios (`compareScenarios()`, `DiffResult`)
- UI workflow (Save Version button, Version History panel, Compare action)
- Side-by-side diff visualization

### v0.13 – Excel Bridge

**Status**: ✅ Implemented

**Focus**: Export model results to professional `.xlsx` files with high-quality formatting and multi-sheet structure

See "v0.13 – Excel Bridge" section above for complete specifications.

**Key Deliverables**:
- Excel export using `exceljs` library
- Multi-sheet workbook (Executive Summary, Assumptions, Annual Cash Flow, Waterfall)
- Professional formatting (financial values, percentages, headers, styles)
- Export button in Global Header
- Values only (hardcoded), no dynamic Excel formulas

### v1.0 – Gold Master (Production Release)

**Status**: ⏳ In Progress

**Focus**: Polish for production release - resilience, UX polish, deployment readiness, cleanup

**Overview**: All core features (Capital, Waterfall, Simulation, Versioning, Excel) are implemented and stable. v1.0 focuses on production readiness, error handling, user experience polish, and deployment configuration.

**Note**: v1.0 passed all runtime tests but failed production build. See v1.0.1 for build fixes.

#### Resilience

**React Error Boundaries**:
- Implement `ErrorBoundary` components to prevent white-screen crashes
- Wrap major sections (Dashboard, Financials, Analysis) with error boundaries
- Display user-friendly error messages with recovery options
- Log errors to console for debugging (production: consider error reporting service)

**Error Handling Strategy**:
- **UI Layer**: Error boundaries catch React rendering errors
- **Engine Layer**: Validate inputs, return error objects instead of throwing (where possible)
- **Pipeline Layer**: Handle engine errors gracefully, show meaningful messages
- **Data Layer**: Validate localStorage access, handle quota exceeded errors

**Implementation**:
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  // Catch errors in child components
  // Display fallback UI
  // Log error details
}
```

#### UX Polish

**Tooltips for USALI Terms**:
- Add tooltips to Financials tab for USALI terminology
- Terms to explain: GOP (Gross Operating Profit), NOI (Net Operating Income), Departmental Expenses, Undistributed Expenses
- Tooltip content: Brief definition + USALI context
- Implementation: Use existing tooltip library or native HTML `title` attributes

**Additional UX Improvements**:
- Loading states for all async operations (Excel export, simulation runs)
- Success/error notifications for user actions (save version, export, etc.)
- Keyboard shortcuts for common actions (if applicable)
- Accessibility improvements (ARIA labels, keyboard navigation)

#### Deploy Ready

**Build Configuration**:
- Ensure `npm run build` produces production-ready artifacts
- Optimize bundle size (code splitting, tree shaking)
- Environment variables for different deployment targets
- Source maps for production debugging (optional, can be disabled)

**Vercel Configuration**:
- `vercel.json` configuration file
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables setup
- Routing configuration (SPA fallback to index.html)

**Netlify Configuration**:
- `netlify.toml` configuration file
- Build command: `npm run build`
- Publish directory: `dist`
- Redirect rules for SPA routing
- Environment variables setup

**Deployment Artifacts**:
- Production build: `dist/` directory
- Static assets: HTML, CSS, JS bundles
- Source maps (optional): For debugging production issues
- Environment config: Runtime configuration if needed

#### Cleanup

**Remove Mock/TODO Logic**:
- Search codebase for `TODO`, `FIXME`, `HACK`, `XXX` comments
- Remove any mock data or placeholder logic
- Remove development-only code (console.logs, debug flags)
- Clean up unused imports, dead code
- Remove deprecated field references (if safe to do so)

**Code Quality**:
- Ensure all TypeScript strict mode compliance
- Fix any remaining linter warnings
- Ensure consistent code formatting
- Update inline documentation where needed

#### Production Deployment

**Build Artifacts**:
- **Location**: `dist/` directory (Vite output)
- **Contents**:
  - `index.html`: Entry point
  - `assets/`: JavaScript bundles, CSS files, images
  - Static assets (if any)
- **Size**: Optimized, minified, tree-shaken bundles
- **Source Maps**: Optional (can be disabled for smaller bundle)

**Deployment Platforms**:

**Vercel**:
- Configuration file: `vercel.json`
- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite
- Environment variables: Set in Vercel dashboard
- Custom domain: Configure in Vercel dashboard

**Netlify**:
- Configuration file: `netlify.toml`
- Build command: `npm run build`
- Publish directory: `dist`
- Framework: Vite (auto-detected)
- Environment variables: Set in Netlify dashboard
- Custom domain: Configure in Netlify dashboard

**Environment Variables**:
- Production API endpoints (if any)
- Feature flags (if any)
- Analytics keys (if any)
- Error reporting service keys (if any)

**Post-Deployment Checklist**:
- ✅ Verify build succeeds locally
- ✅ Test production build locally (`npm run preview`)
- ✅ Verify all routes work (SPA routing)
- ✅ Test error boundaries
- ✅ Verify Excel export works
- ✅ Test scenario save/load
- ✅ Verify all charts render
- ✅ Check console for errors
- ✅ Test on multiple browsers
- ✅ Verify mobile responsiveness

#### What v1.0 Explicitly Does NOT Do

1. **No New Features**:
   - v1.0 is a polish release only
   - No new functionality added
   - Focus is on stability and production readiness

2. **No Breaking Changes**:
   - Maintain backward compatibility with existing scenarios
   - No API changes
   - No data format changes

3. **No Performance Optimizations**:
   - Performance improvements deferred to v1.1+
   - Focus is on correctness and stability

#### v1.0 Agent Responsibilities

**UI Agent**:
- Implement React Error Boundaries
- Add tooltips for USALI terms in Financials tab
- Add loading states and notifications
- Create deployment configuration files (vercel.json, netlify.toml)
- Test production build locally
- Remove mock/TODO code from UI components

**Core Logic Agent**:
- Ensure error handling in engines returns error objects (not throws)
- Validate all inputs properly
- Remove mock/TODO code from engines
- Clean up deprecated field references (if safe)

**Quant Agent**:
- Ensure simulation engine handles errors gracefully
- Remove any mock/TODO code from quant engines

**QA Agent**:
- Test error boundaries with various error scenarios
- Test production build thoroughly
- Test deployment on staging environment
- Verify all features work in production build
- Test error recovery flows

**Infra Agent**:
- Optimize build configuration
- Ensure bundle size is reasonable
- Configure environment variables
- Set up deployment pipelines (if applicable)

**Documentation Agent**:
- Update ARCHITECTURE.md with v1.0 completion
- Create deployment guide
- Update user guide with production features
- Document error handling and recovery

**Integrator Agent**:
- Final integration check before v1.0 release
- Verify all features work together
- Test end-to-end workflows
- Produce v1.0 release summary

### v1.0.1 – Build Stabilization (Hotfix)

**Status**: ⏳ In Progress

**Focus**: Fix production build failures - resolve TypeScript errors, enforce strict build policies

**Overview**: v1.0 passed all runtime tests but **FAILED the production build** with 89 TypeScript errors. v1.0.1 is a hotfix release to achieve a clean `npm run build` execution.

#### Build Issues Identified

**Error Categories**:
1. **Unused Variables**: Variables declared but never used
2. **Type Mismatches**: Null vs undefined inconsistencies, type assertion issues
3. **Missing Globals**: Frontend code using Node.js globals (`require()`, `process`)

**Impact**: Production build fails, preventing deployment

#### Strict Build Policies

**1. Unused Variables**:
- **Policy**: All unused variables MUST be removed or prefixed with `_`
- **Examples**:
  ```typescript
  // ❌ BAD: Unused variable
  const unusedVar = someValue;
  
  // ✅ GOOD: Remove if truly unused
  // (variable removed)
  
  // ✅ GOOD: Prefix with _ if intentionally unused (e.g., function parameter)
  function handler(_event: Event) {
    // _event is intentionally unused
  }
  ```
- **Enforcement**: TypeScript compiler with `noUnusedLocals` and `noUnusedParameters` enabled

**2. Null vs Undefined**:
- **Policy**: Use optional chaining (`?.`) or explicit type guards. Be consistent with null vs undefined handling.
- **Examples**:
  ```typescript
  // ❌ BAD: Potential null/undefined access
  const value = obj.property.nested;
  
  // ✅ GOOD: Optional chaining
  const value = obj.property?.nested;
  
  // ✅ GOOD: Explicit type guard
  if (obj.property !== undefined && obj.property !== null) {
    const value = obj.property.nested;
  }
  ```
- **Enforcement**: TypeScript strict null checks (`strictNullChecks: true`)

**3. Globals (Node.js vs Browser)**:
- **Policy**: Frontend code MUST NOT use Node.js globals. Use Vite environment variables instead.
- **Examples**:
  ```typescript
  // ❌ BAD: Node.js require()
  const module = require('some-module');
  
  // ✅ GOOD: ES6 import
  import module from 'some-module';
  
  // ❌ BAD: Node.js process
  const env = process.env.NODE_ENV;
  
  // ✅ GOOD: Vite import.meta.env
  const env = import.meta.env.MODE;
  const apiUrl = import.meta.env.VITE_API_URL;
  ```
- **Enforcement**: TypeScript compiler with proper `lib` configuration (browser, not node)

#### TypeScript Configuration

**Strictness Enforcement**:
- `tsconfig.json` must have strict mode enabled:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "strictNullChecks": true,
      "lib": ["ES2020", "DOM", "DOM.Iterable"]
    }
  }
  ```
- **No exceptions**: All code must pass strict TypeScript checks
- **Build must succeed**: `npm run build` must complete without errors

#### Implementation Strategy

**Phase 1: Error Analysis** (v1.0.1.0)
- Run `npm run build` and collect all TypeScript errors
- Categorize errors by type (unused vars, type mismatches, globals)
- Create task list for fixes

**Phase 2: Fix Unused Variables** (v1.0.1.1)
- Remove truly unused variables
- Prefix intentionally unused variables with `_`
- Verify no unused variable errors remain

**Phase 3: Fix Type Mismatches** (v1.0.1.2)
- Add optional chaining where needed
- Add explicit type guards for null/undefined
- Fix type assertions and type mismatches
- Verify strict null checks pass

**Phase 4: Fix Global Usage** (v1.0.1.3)
- Replace `require()` with ES6 imports
- Replace `process.env` with `import.meta.env`
- Remove any Node.js-specific globals
- Verify browser-only code

**Phase 5: Verification** (v1.0.1.4)
- Run `npm run build` and verify zero errors
- Run `npm test` to ensure no regressions
- Test production build locally (`npm run preview`)
- Verify all features still work

#### What v1.0.1 Explicitly Does NOT Do

1. **No Feature Changes**:
   - This is a build fix only
   - No new functionality added
   - No behavior changes

2. **No Runtime Changes**:
   - All runtime behavior remains identical
   - Only build-time fixes

3. **No Type System Changes**:
   - No changes to domain types
   - No changes to type definitions
   - Only fixes to type usage

#### v1.0.1 Agent Responsibilities

**Infra Agent**:
- Ensure `tsconfig.json` has strict settings enabled
- Verify build configuration is correct
- Test `npm run build` after fixes
- Document any build configuration changes

**Core Logic Agent**:
- Fix unused variables in domain/engine code
- Fix type mismatches in domain/engine code
- Fix global usage in domain/engine code
- Ensure all fixes maintain runtime behavior

**UI Agent**:
- Fix unused variables in UI components
- Fix type mismatches in UI components
- Fix global usage in UI components (replace `process.env` with `import.meta.env`)
- Ensure all fixes maintain UI behavior

**Quant Agent**:
- Fix unused variables in quant engines
- Fix type mismatches in quant engines
- Fix global usage in quant engines
- Ensure all fixes maintain calculation accuracy

**QA Agent**:
- Verify `npm run build` succeeds with zero errors
- Run full test suite to ensure no regressions
- Test production build locally
- Verify all features work in production build

**Documentation Agent**:
- Update ARCHITECTURE.md with v1.0.1 completion
- Document build policies for future reference
- Update developer guide with build requirements

### v1.1 – The Enterprise Shell

**Status**: ✅ **Completed (Broken UI)** - Code migration successful, but visual collapse requires v1.1.2 hotfix

**Overview**: Implements the "Enterprise Platform" architecture, moving from a simple "Calculator" layout to a scalable "SaaS Platform" with sidebar navigation and view-based routing.

**Known Issue**: The migration succeeded in code structure but failed visually - the app renders a blank/grey screen due to missing root container height constraints. This is addressed in v1.1.2 hotfix.

**Key Deliverables**:

1. **Enterprise Shell & Navigation**:
   - ✅ Sidebar Layout: Fixed left sidebar (~240px) with navigation items
   - ✅ Global Header: Sticky top bar with scenario name, save, export actions
   - ✅ Main Content Area: Scrollable container for active view
   - ✅ View-based routing: State-based routing (`activeView`) mapping to `src/views/*`
   - ✅ Layout Components: `MainLayout`, `Sidebar`, `Header` in `src/components/layout/*`

2. **View Structure**:
   - ✅ `DashboardView`: High-level KPIs + Charts
   - ✅ `OperationsView`: Input forms for all 9 operation types (read-only)
   - ✅ `CapitalView`: Debt & Equity configuration
   - ✅ `WaterfallView`: Distribution tables & charts
   - ✅ `SimulationView`/`AnalysisView`: Sensitivity & Monte Carlo (promoted to top-level)
   - ✅ `DataVersionsView`: Version history & comparison

3. **Migration from Tabs**:
   - ✅ Replace top tab navigation with sidebar navigation
   - ✅ Refactor tab content into dedicated views
   - ✅ Maintain backward compatibility with existing functionality

**Agent Responsibilities**:

**UI Agent**:
- Implement sidebar navigation component
- Refactor existing tab content into view components
- Update `App.tsx` to use view-based routing
- Ensure responsive layout works across screen sizes
- Test navigation and view switching

**Architecture Agent**:
- Update ARCHITECTURE.md with new UI architecture (this document)
- Define view structure and responsibilities
- Update roadmap for v1.1-v1.4

**QA Agent**:
- Test all views render correctly
- Verify navigation works smoothly
- Test responsive behavior
- Ensure no regressions in existing functionality

### v1.1.2 – Layout Restoration (Hotfix)

**Status**: ✅ **Implemented**

**Overview**: The migration to "Sidebar Layout" (v1.1) caused a **Visual Collapse** - the app compiles but renders a blank/grey screen. This hotfix restores visibility by fixing missing height constraints and Flexbox nesting in the root layout structure.

**Root Cause**:
- **Primary Issue**: Root containers (`html`, `body`, `#root`) lack explicit `height: 100%`, causing Flexbox layout to collapse to 0px height
- Missing `overflow: hidden` on root containers allows body-level scrolling (conflicts with app-container scrolling)
- Body element using `display: flex; place-items: center;` which conflicts with full-height layout
- Without root height constraints, `.app-container` with `height: 100vh` has no reference point and collapses

**Required CSS Structure**:

The following CSS rules **MUST** be present in `src/index.css` (or equivalent global stylesheet) to ensure proper layout rendering. This is the **UI Foundation** that enables the App-like interface:

```css
/* Root Containers - CRITICAL */
html, body, #root {
  height: 100%;
  overflow: hidden; /* Prevent body scroll, app-container handles scrolling */
  margin: 0;
  padding: 0;
}

/* App Container - Flex Row taking full viewport */
.app-container {
  display: flex;
  flex-direction: row;
  height: 100vh; /* Full viewport height */
  width: 100vw;  /* Full viewport width */
  overflow: hidden; /* Prevent container scroll */
  background-color: var(--background);
}

/* Sidebar - Fixed width, non-shrinking */
.sidebar {
  width: 240px;
  height: 100vh;
  flex-shrink: 0; /* Prevent sidebar from shrinking */
  position: fixed; /* Fixed positioning */
  left: 0;
  top: 0;
  z-index: 20;
  background-color: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* Allow sidebar to scroll if content exceeds height */
}

/* Main Content Wrapper - Flex Column, growing to fill space */
.main-content-wrapper {
  flex: 1; /* Grow to fill remaining space */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent wrapper scroll */
  min-width: 0; /* Allow flex item to shrink below content size */
  margin-left: 240px; /* Offset for fixed sidebar */
  height: 100vh;
}

/* Sticky Header */
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  flex-shrink: 0; /* Prevent header from shrinking */
}

/* Main Content Area - Scrollable */
.app-main {
  flex: 1; /* Grow to fill remaining space after header */
  overflow-y: auto; /* Allow main content to scroll */
  padding: 2rem;
  min-height: 0; /* Allow flex item to shrink */
}
```

**Critical Rules**:

1. **Root Containers** (`html`, `body`, `#root`):
   - ✅ **MUST** have `height: 100%` (not `min-height: 100vh`)
   - ✅ **MUST** have `overflow: hidden` to prevent body-level scrolling
   - ✅ **MUST** have `margin: 0; padding: 0` to remove default spacing

2. **App Container** (`.app-container`):
   - ✅ **MUST** be `display: flex; flex-direction: row`
   - ✅ **MUST** have `height: 100vh` (full viewport height)
   - ✅ **MUST** have `overflow: hidden` (container handles scrolling internally)

3. **Sidebar** (`.sidebar`):
   - ✅ **MUST** have `flex-shrink: 0` (fixed width, won't shrink)
   - ✅ **MUST** have `position: fixed` with explicit `left: 0; top: 0`
   - ✅ **MUST** have `height: 100vh` (full viewport height)

4. **Main Content Wrapper** (`.main-content-wrapper`):
   - ✅ **MUST** be `display: flex; flex-direction: column`
   - ✅ **MUST** have `flex: 1` (grow to fill space)
   - ✅ **MUST** have `margin-left: 240px` (offset for fixed sidebar)
   - ✅ **MUST** have `overflow: hidden` (wrapper doesn't scroll)
   - ✅ **MUST** have `min-width: 0` (allows flex item to shrink)

5. **Main Content Area** (`.app-main`):
   - ✅ **MUST** have `flex: 1` (grow to fill space after header)
   - ✅ **MUST** have `overflow-y: auto` (scrollable content area)
   - ✅ **MUST** have `min-height: 0` (allows flex item to shrink)

**Body Element Fix**:

The body element **MUST NOT** use `display: flex; place-items: center;` as this conflicts with the full-height layout. Instead:

```css
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  background-color: var(--background);
  color: var(--text-primary);
  /* Remove: display: flex; place-items: center; */
}
```

**Agent Responsibilities**:

**UI Agent** (URGENT):
- ✅ Fix `src/index.css` with required CSS structure above
- ✅ Remove conflicting body styles (`display: flex; place-items: center;`)
- ✅ Ensure `#root` element has proper height constraints
- ✅ Test layout renders correctly (no blank screen)
- ✅ Verify sidebar and main content are visible
- ✅ Test scrolling works in main content area

**QA Agent**:
- ✅ Verify app renders (no blank/grey screen)
- ✅ Test sidebar navigation is visible and functional
- ✅ Test main content area scrolls correctly
- ✅ Verify responsive behavior (if applicable)
- ✅ Test on multiple browsers (Chrome, Firefox, Safari)

**Architecture Agent**:
- ✅ Document required CSS structure (this section)
- ✅ Update version history with v1.1.2 hotfix

**What v1.1.2 Explicitly Does NOT Do**:
- No new features
- No changes to component logic
- No changes to view structure
- **Only CSS fixes to restore visibility**

### v1.0 – Enterprise Shell Polish (Verification)

**Status**: ✅ **Verified (2025-11-25)**

**Overview**: Comprehensive verification of the enterprise shell and navigation system to ensure layout integrity, navigation state management, and visual consistency across all standard viewports.

**Verification Scope**:
- Root container height constraints
- Sidebar fixed positioning
- Header sticky behavior
- Navigation active state management
- Main content area scrolling
- Layout integrity across views

**Verification Results**:

✅ **Layout Constraints Verified**:
- Root containers (`html`, `body`, `#root`) have explicit `height: 100%` and `overflow: hidden` (lines 86-95 in `src/index.css`)
- `.app-container` has `height: 100vh` and `overflow: hidden` (lines 437-443)
- `.sidebar` is fixed positioned with `width: 240px` and `height: 100vh` (lines 461-473)
- `.main-content-wrapper` has `margin-left: 240px` to offset fixed sidebar (lines 445-452)
- `.app-main` has `flex: 1` and `overflow-y: auto` for scrolling (lines 454-459)
- `.sticky-header` has proper sticky positioning (lines 605-618, 620-633)

✅ **Navigation State Management Verified**:
- Active view state correctly passed from `App.tsx` to `Sidebar` component
- Active styling applied correctly with green background tint (`rgba(15, 46, 46, 0.1)` at line 552)
- Framer Motion animation for active background works smoothly (lines 68-89 in `Sidebar.tsx`)
- All 15 navigation items defined in `Sidebar.tsx` (lines 36-52)
- View routing correctly implemented in `App.tsx` (lines 156-347)

✅ **Visual Behavior Verified** (Browser Testing):
- **Tested Views**: Dashboard, Operations, Land, Construction, Capital, Waterfall
- **Sidebar**: Remains fixed during main content scroll ✓
- **Header**: Remains sticky at top during scroll ✓
- **Main Content**: Scrolls independently of sidebar and header ✓
- **Active State**: Correctly highlights current view with visual feedback ✓
- **Layout Stability**: No layout collapse or flickering observed ✓

⚠️ **Known Issue Discovered**:
- **P&L Statement View**: Runtime error (`TypeError: Cannot read properties of undefined (reading 'length')` in `filterAndAggregatePnl`)
- **Impact**: View-specific bug, does not affect layout or navigation system
- **Action Required**: Core Logic Agent to investigate and fix

**Component Architecture Verified**:

1. **`MainLayout.tsx`** (lines 1-35):
   - Correctly renders `.app-container` wrapper
   - Passes `activeView` and `onViewChange` to Sidebar
   - Renders header in `.main-content-wrapper`
   - Renders children in `.app-main`

2. **`Sidebar.tsx`** (lines 1-157):
   - Receives and uses `activeView` prop correctly
   - Applies `active` class to current view (line 91)
   - Uses Framer Motion for smooth active state animation
   - Includes all 15 navigation items with icons

3. **`Header.tsx`** (lines 1-210):
   - Uses `.sticky-header` class for sticky positioning
   - Renders scenario selector and action buttons
   - Shows guest mode indicator when applicable

4. **`App.tsx`** (lines 1-423):
   - Uses `useState` for `activeView` state management
   - Passes state correctly to MainLayout
   - Implements complete view routing with all 15 views

**Navigation Items (15 total)**:
1. Dashboard
2. Operations
3. Land
4. Construction
5. Capital
6. Waterfall
7. P&L Statement (⚠️ has runtime error)
8. Cash Flow
9. Risk
10. Liquidity
11. Comparison
12. Governance
13. Portfolio
14. REaaS
15. Glossary

**Recordings**:
- `navigation_flow_test_1764078118359.webp`: Initial navigation test through 6 views
- `remaining_views_test_1764078428985.webp`: Attempted remaining views test (blocked by P&L error)

**Acceptance Criteria**:
- ✅ Sidebar navigation works flawlessly on tested views
- ✅ Root containers have explicit height to prevent layout collapse
- ✅ Active state correctly reflects current view
- ✅ Sidebar remains fixed during scroll
- ✅ Header remains sticky during scroll
- ✅ Main content scrolls independently
- ⚠️ P&L Statement view requires bug fix (separate ticket)

**UI Agent**:
- ✅ Verified layout constraints in `src/index.css`
- ✅ Verified component structure in `src/components/layout/*`
- ✅ Tested navigation flow via browser automation
- ✅ Documented verification results in ARCHITECTURE.md

**Next Steps**:
- Core Logic Agent: Fix P&L Statement view error
- QA Agent: Complete full navigation test after P&L fix
- UI Agent: Test remaining 9 views after P&L fix

### v1.1.4 – Context Provider Restoration (Hotfix)

**Status**: ⚠️ **URGENT** - Application crash fix

**Overview**: The application crashes with `Error: useAudit must be used within an AuditProvider`. This indicates the React Context tree is broken - Context Providers were likely removed during the v1.1 layout refactor.

**Root Cause**:
- `AuditProvider` is missing from the React Context tree in `main.tsx` or `App.tsx`
- Components using `useAudit()` hook (`ResultsSummary`, `WaterfallTable`) cannot access the context
- Context Providers must wrap the entire application at the highest level
- During layout refactors (v1.1), Context Providers may have been accidentally removed or misplaced

**Required Context Provider Structure**:

The following Context Providers **MUST** wrap the application at the highest level in `src/main.tsx`:

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { AuditProvider } from './ui/contexts/AuditContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuditProvider>
        <App />
      </AuditProvider>
    </ErrorBoundary>
  </StrictMode>,
)
```

**Context Provider Hierarchy** (from outermost to innermost):

1. **`<StrictMode>`** (React development mode checks)
2. **`<ErrorBoundary>`** (Catches and handles React errors)
3. **`<AuditProvider>`** (Provides audit mode context for traceability features)
4. **`<App />`** (Main application component)

**Critical Rules**:

1. **Context Providers MUST be at the root level**:
   - ✅ Wrap `App` component in `main.tsx` (not inside `App.tsx`)
   - ✅ Providers must be outside `App` to ensure all components can access context
   - ✅ Order matters: ErrorBoundary should wrap providers to catch provider errors

2. **Never remove Context Providers during refactors**:
   - ✅ When refactoring layout components, ensure Context Providers remain in `main.tsx`
   - ✅ When moving code between files, verify Context Providers are not lost
   - ✅ Test that hooks (`useAudit`, etc.) work after any layout changes

3. **Context Provider Checklist**:
   - ✅ `ErrorBoundary`: Required for error handling (v1.0+)
   - ✅ `AuditProvider`: Required for audit mode functionality (v0.10+)
   - ⏳ Future providers (e.g., `ThemeProvider`, `AuthProvider`) should follow the same pattern

**Components Using Context**:

The following components use `useAudit()` and **require** `AuditProvider`:
- `src/components/ResultsSummary.tsx` (line 149)
- `src/components/WaterfallTable.tsx` (line 43)

**Agent Responsibilities**:

**UI Agent** (URGENT):
- ✅ Add `AuditProvider` to `src/main.tsx` wrapping `App` component
- ✅ Verify Context Provider hierarchy is correct (ErrorBoundary → AuditProvider → App)
- ✅ Test that `useAudit()` hooks work without errors
- ✅ Ensure no Context Providers are removed during future refactors
- ✅ Document any new Context Providers in ARCHITECTURE.md

**QA Agent**:
- ✅ Verify application does not crash on load
- ✅ Test that audit mode toggle works (if implemented)
- ✅ Verify all components using `useAudit()` render correctly
- ✅ Test error boundary catches errors correctly

**Architecture Agent**:
- ✅ Document Context Provider requirements (this section)
- ✅ Update version history with v1.1.4 hotfix
- ✅ Ensure AGENTS.md reminds UI_AGENT about Context Provider maintenance

**What v1.1.4 Explicitly Does NOT Do**:
- No new features
- No changes to component logic (only Context Provider restoration)
- No changes to view structure
- **Only Context Provider fixes to restore application functionality**

### v1.2 – Advanced Operations & Input UX

**Status**: ✅ **Implemented**

**Overview**: The app works (v1.1.4), but the Input Screens (`OperationsView`, `CapitalView`) are too basic for an enterprise tool. This milestone adopts the **"Grouped Input Pattern"** from legacy designs to create a professional, organized input experience that scales across all 9 operation types.

**Strategic Goal**: Transform basic read-only displays into comprehensive, editable input forms with logical grouping, progressive disclosure, and enterprise-grade UX patterns.

#### Input Organization Strategy

**Operations Input Structure** (`OperationsView`):

Operations inputs are organized into **logical groups** that mirror the financial model structure. Each operation type (Hotel, Villas, Restaurant, etc.) follows the same grouping pattern:

1. **Drivers** (Capacity, Volume, Price):
   - **Capacity**: Keys/Units/Covers/Courts/SQM (operation-specific)
   - **Volume**: Occupancy/Turnover/Utilization (monthly array or annual average)
   - **Price**: ADR/Nightly Rate/Avg Check/Court Rate/Rent per SQM (operation-specific)
   - **Purpose**: Core revenue drivers that determine top-line performance

2. **Revenue Mix** (Percentage breakdowns):
   - **Primary Revenue**: Room/Rental revenue (for lodging operations)
   - **F&B Revenue**: Food & Beverage as % of primary revenue
   - **Other Revenue**: Additional revenue streams as % of primary revenue
   - **Purpose**: Allocate total revenue across revenue streams

3. **Departmental Expenses** (COGS & Direct Costs):
   - **Food COGS**: % of food revenue
   - **Beverage COGS**: % of beverage revenue
   - **Care COGS**: % of care revenue (Senior Living only)
   - **Purpose**: Direct costs tied to revenue streams

4. **Operating Expenses** (OPEX):
   - **Payroll**: % of total revenue
   - **Utilities**: % of total revenue
   - **Marketing**: % of total revenue
   - **Maintenance OPEX**: % of total revenue
   - **Other OPEX**: % of total revenue
   - **Purpose**: Operating expenses that scale with revenue

5. **Capital Expenditures**:
   - **Maintenance Capex**: % of total revenue
   - **Purpose**: Required capital spending for asset maintenance

**Capital Input Structure** (`CapitalView`):

Capital inputs are split into two logical groups:

1. **Uses of Cash** (Investment):
   - **Initial Investment**: Total project cost
   - **Working Capital**: % of revenue or fixed amount
   - **Purpose**: Where capital is deployed

2. **Sources of Cash** (Financing):
   - **Debt Tranches**: 
     - Principal amount
     - Interest rate
     - Amortization type (Interest-only, Straight-line, Balloon)
     - Term and amortization period
     - Transaction costs (origination fees, exit fees)
   - **Equity Structure**:
     - Partner contributions (LP/GP split)
     - Equity percentages
   - **Purpose**: How capital is raised

#### UX Patterns: Grouped Input Design

**Progressive Disclosure with Accordions/Tabs**:

The input interface uses **progressive disclosure** to hide complexity and improve usability:

1. **Operation-Level Organization**:
   - Each operation (e.g., "Hotel - Main Building") is displayed as a **Card** or **Tab**
   - Multiple operations of the same type are grouped in a **Tab Group** or **Accordion Section**
   - Operation families (Lodging, F&B, Sports, etc.) are top-level **Accordion Sections**

2. **Input Group Organization**:
   - Within each operation card, inputs are organized into **Accordion Sections**:
     - "Revenue Drivers" (Drivers group)
     - "Revenue Mix" (Revenue Mix group)
     - "Departmental Expenses" (COGS group)
     - "Operating Expenses" (OPEX group)
     - "Capital Expenditures" (Capex group)
   - Each accordion can be expanded/collapsed independently
   - Default state: "Revenue Drivers" expanded, others collapsed

3. **Visual Hierarchy**:
   - **Level 1**: Operation Family Accordion (e.g., "Lodging & Accommodation")
   - **Level 2**: Operation Card/Tab (e.g., "Hotel - Main Building")
   - **Level 3**: Input Group Accordion (e.g., "Revenue Drivers")
   - **Level 4**: Individual Input Fields

**Input Enhancement Patterns**:

1. **Number Input Alignment**:
   - All numeric inputs (currency, percentages, counts) **align right**
   - Text labels align left
   - Creates visual scanning pattern: Label → Value

2. **Percentage Display**:
   - Percentage inputs show `%` suffix in the input field
   - Example: `75%` not `0.75` or `75`
   - User enters percentage value (0-100), stored as decimal (0-1) internally

3. **Currency Formatting**:
   - Currency inputs show currency symbol prefix (e.g., `$` or project currency)
   - Thousands separators (e.g., `$1,250.00`)
   - Format on blur, allow raw input during editing

4. **Month-by-Month Editors**:
   - Occupancy/utilization arrays use **12-month grid** or **monthly slider array**
   - Visual representation: 12 input fields labeled Jan-Dec
   - Optional: Annual average with "Apply to all months" button
   - Optional: Seasonal pattern selector (High/Low/Shoulder seasons)

5. **Input Validation**:
   - **Real-time validation**: Show errors as user types
   - **Field-level errors**: Red border + error message below field
   - **Group-level errors**: Summary at top of accordion section
   - **Operation-level errors**: Summary at top of operation card

6. **Input States**:
   - **Default**: White background, black text
   - **Focus**: Blue border, subtle shadow
   - **Error**: Red border, red error text
   - **Disabled**: Gray background, gray text
   - **Read-only**: Gray background, no border (if needed)

**Layout Structure Example**:

```
OperationsView
├── Accordion: "Lodging & Accommodation"
│   ├── Tab/Card: "Hotel - Main Building"
│   │   ├── Accordion: "Revenue Drivers" [Expanded by default]
│   │   │   ├── Input: Keys (number, right-aligned)
│   │   │   ├── Input: ADR (currency, right-aligned)
│   │   │   └── Input: Occupancy by Month (12-month grid)
│   │   ├── Accordion: "Revenue Mix" [Collapsed]
│   │   │   ├── Input: Food Revenue % (percentage with %)
│   │   │   ├── Input: Beverage Revenue % (percentage with %)
│   │   │   └── Input: Other Revenue % (percentage with %)
│   │   ├── Accordion: "Departmental Expenses" [Collapsed]
│   │   │   ├── Input: Food COGS % (percentage with %)
│   │   │   └── Input: Beverage COGS % (percentage with %)
│   │   ├── Accordion: "Operating Expenses" [Collapsed]
│   │   │   ├── Input: Payroll % (percentage with %)
│   │   │   ├── Input: Utilities % (percentage with %)
│   │   │   ├── Input: Marketing % (percentage with %)
│   │   │   ├── Input: Maintenance OPEX % (percentage with %)
│   │   │   └── Input: Other OPEX % (percentage with %)
│   │   └── Accordion: "Capital Expenditures" [Collapsed]
│   │       └── Input: Maintenance Capex % (percentage with %)
│   └── Tab/Card: "Villas - Luxury Units"
│       └── [Same structure as Hotel]
├── Accordion: "Food & Beverage"
│   └── Tab/Card: "Restaurant - Main Dining"
│       └── [Same structure, operation-specific fields]
└── [Additional operation families...]
```

**Key Deliverables**:

1. **OperationsView Refactoring**:
   - ✅ Accordion/tabbed interface for operation families
   - ✅ Individual operation cards with grouped inputs
   - ✅ Input groups organized as accordions (Drivers, Revenue Mix, Expenses, Capex)
   - ✅ Inline editing with real-time model updates
   - ✅ Operation grouping by family (Lodging, F&B, Sports, Wellness, Commercial, Senior, Leisure)

2. **Input Controls & Enhancements**:
   - ✅ Number inputs with right alignment
   - ✅ Percentage inputs with `%` suffix
   - ✅ Currency inputs with symbol prefix and formatting
   - ✅ Month-by-month occupancy/utilization editors (12-month grid)
   - ✅ Form validation with field-level and group-level error messages
   - ✅ Input state management (default, focus, error, disabled)

3. **CapitalView Refactoring**:
   - ✅ Split into "Uses of Cash" and "Sources of Cash" sections
   - ✅ Debt tranche configuration with accordion for each tranche
   - ✅ Equity structure inputs with partner breakdown
   - ✅ Transaction costs (origination fees, exit fees) inputs

4. **User Experience**:
   - ✅ Save/cancel buttons for operation edits (optional - can auto-save)
   - ✅ Visual indicators for unsaved changes (optional)
   - ✅ Operation-level validation feedback
   - ✅ Progressive disclosure (accordions collapsed by default except Drivers)
   - ✅ Responsive layout (mobile-friendly accordion stacking)

**Agent Responsibilities**:

**UI Agent**:
- Refactor `OperationsView` with accordion/tabbed interface following grouped input pattern
- Implement input groups (Drivers, Revenue Mix, Expenses, Capex) as accordions
- Add input enhancements (right alignment, percentage suffix, currency formatting)
- Implement month-by-month editors (12-month grid)
- Refactor `CapitalView` with "Uses of Cash" / "Sources of Cash" split
- Add form validation with field-level and group-level error messages
- Integrate with model input state management
- Ensure responsive design (mobile-friendly)

**Core Logic Agent**:
- Ensure operation config types support all required fields
- Validate operation inputs match domain schemas
- Update validation functions to support grouped input structure
- Ensure percentage inputs convert between display (0-100) and storage (0-1) formats

**QA Agent**:
- Test all operation types can be edited with grouped inputs
- Verify validation works correctly (field-level and group-level)
- Test form submission and model updates
- Test percentage conversion (display ↔ storage)
- Test currency formatting and parsing
- Test month-by-month editors (all 12 months)
- Test responsive layout on mobile devices

**What v1.2 Explicitly Does NOT Do**:
- No new operation types (all 9 types already exist)
- No changes to financial calculation logic
- No changes to data structures (only UI presentation)
- No undo/redo functionality (deferred to v1.3+)
- No bulk editing across operations (deferred to v1.3+)

### v1.3 – Dynamic Capital Structure

**Status**: ✅ **Implemented**

**Overview**: Transform the static Capital View into a professional **Deal Structuring Module** where users can layer multiple debt tranches (Senior, Mezzanine) to optimize WACC and Equity Multiple.

**Strategic Goal**: Enable dynamic capital structure management with real-time visualization and optimization tools for deal structuring.

**Key Deliverables**:

1. **Dynamic Debt Management**:
   - Full CRUD operations for debt tranches (Add, Remove, Update)
   - Interactive table with inline editing for all tranche fields
   - Real-time validation and constraint checking
   - Support for multiple debt tranches with different terms

2. **Live Sources & Uses Visualization**:
   - Real-time visual representation of capital composition
   - Horizontal stacked bar chart showing debt vs equity breakdown
   - Individual tranche segments with labels and percentages
   - Immediate updates as capital structure changes

3. **Real-Time WACC Calculation**:
   - Automatic WACC recalculation when interest rates or debt amounts change
   - Formula: `WACC = (Equity % × Cost of Equity) + (Debt % × Cost of Debt × (1 - TaxRate))`
   - Display in capital stack summary with live updates

4. **Constraint Validation**:
   - Debt constraint validation (warnings if debt exceeds project cost)
   - Individual tranche field validation (principal, interest rate, term)
   - Visual feedback for validation errors and warnings

5. **Professional UI with Strict Dashboard Layout**:
   - Enterprise-grade deal structuring interface
   - **Strict Dashboard Layout Pattern**: CSS Grid `grid-template-rows: auto 1fr; height: 100%; overflow: hidden;`
   - **Top Pane (Visuals)**: Fixed height container (~400px). Contains `CapitalStackChart`. **NO collapsible cards here.**
   - **Bottom Pane (Controls)**: Scrollable container. Contains `DebtManager` (Table) and `ProjectCosts`.
   - Summary row showing totals, percentages, and WACC

**Capital Stack Balance**:
```
Equity Required = Total Project Cost - Sum(Debt Tranches)
```

**Real-Time Updates**:
- Changing any tranche field triggers immediate model recalculation
- WACC recalculates automatically based on new capital structure
- Equity Multiple recalculates based on new levered cash flows
- Sources & Uses chart updates immediately

**Optimization Impact**:
- Users can layer multiple tranches (Senior + Mezzanine) to optimize capital structure
- Lower WACC = Higher project NPV
- Optimal debt level balances tax benefits vs. risk

**Component Architecture**:
- `CapitalStackChart.tsx`: Visual representation of capital stack (Uses of Cash vs Sources of Cash)
- `DebtManager.tsx`: Interactive table for managing debt tranches (CRUD operations)
- `CapitalView.tsx`: Updated with strict dashboard layout (fixed chart area + scrollable table area)

**Layout Architecture - CapitalView** (`src/views/CapitalView.tsx`):
- **Layout Strategy**: CSS Grid `grid-template-rows: auto 1fr; height: 100%; overflow: hidden;`
- **Top Pane (Visuals)**: Fixed height container (~400px). Contains `CapitalStackChart`. **NO collapsible cards here.**
- **Bottom Pane (Controls)**: Scrollable container. Contains `DebtManager` (Table) and `ProjectCosts`.
- **Dependency**: Explicitly requires `recharts` for visualization

**Layout Architecture - WaterfallView** (`src/views/WaterfallView.tsx`):
- **Layout Strategy**: CSS Grid `grid-template-rows: auto auto 1fr; height: 100%; overflow: hidden;`
- **Top**: Summary KPIs (Cards) - Partner-level IRR and MOIC metrics
- **Middle**: `DistributionChart` (Stacked Bar: LP vs GP) - Fixed height (~400px)
- **Bottom**: Detailed `WaterfallTable` - Scrollable container
- **Dependency**: Explicitly requires `recharts` for visualization

**Agent Responsibilities**:

**UI Agent**:
- Implement `SourcesAndUsesChart` component with horizontal stacked bar
- Create `DebtTrancheManager` component with CRUD operations
- Update `CapitalView` with chart and manager integration
- Add real-time WACC display and validation feedback

**Core Logic Agent**:
- Implement CRUD helper functions (add, remove, update tranches)
- Add validation functions for debt constraints
- Ensure model recalculation on capital config changes

**QA Agent**:
- Test CRUD operations for debt tranches
- Verify real-time WACC updates
- Test validation and constraint checking
- Test chart updates on tranche changes

### v1.4 – Business Intelligence (REaaS & Portfolio)

**Status**: ⏳ Planned

**Overview**: Transform the model into a strategic dashboard with portfolio-level analytics and REaaS (Real Estate as a Service) metrics. This enables business intelligence insights by aggregating metrics across operation types and filtering for REaaS operations.

**Strategic Goal**: Enable portfolio-level decision making and REaaS business model analysis through aggregated metrics and visualizations.

**Key Deliverables**:

1. **Portfolio View** (`src/views/PortfolioView.tsx`):
   - **Purpose**: Portfolio-level analytics aggregated by `operationType`
   - **Metrics Aggregation**:
     - Revenue by operation type (sum across all operations of same type)
     - NOI by operation type (sum across all operations of same type)
     - Valuation contribution by operation type
     - Operation count by type
   - **Visualizations**:
     - **Pie Chart**: NOI Contribution by operation type (percentage breakdown)
     - **Bar Chart**: Revenue Mix by operation type (absolute values)
     - **Summary Table**: Key metrics per operation type (Revenue, NOI, % of Total)
   - **Data Source**: Aggregates from `FullModelOutput.scenario.operations` and `FullModelOutput.consolidatedAnnualPnl`
   - **Layout**: Strict Dashboard Layout (similar to v1.3)
     - Top: Summary KPIs (Total Revenue, Total NOI, Operation Count)
     - Middle: Charts (Pie + Bar side-by-side or stacked)
     - Bottom: Detailed table with per-type breakdown

2. **REaaS View** (`src/views/REaaSView.tsx`):
   - **Purpose**: REaaS-specific metrics and analytics
   - **Filter**: Operations where `isREaaS === true` (v1.2: Advanced Asset Dynamics)
   - **Metrics**:
     - **Recurring Revenue %**: Percentage of total revenue from REaaS operations
     - **REaaS NOI Yield**: NOI from REaaS operations as % of total NOI
     - **REaaS Revenue**: Absolute revenue from REaaS operations
     - **REaaS NOI**: Absolute NOI from REaaS operations
     - **REaaS Operation Count**: Number of operations flagged as REaaS
   - **Visualizations**:
     - **Stacked Bar Chart**: REaaS vs Non-REaaS revenue/NOI comparison
     - **Time Series Chart**: REaaS metrics over projection horizon
     - **Summary Cards**: Key REaaS metrics (Recurring Revenue %, NOI Yield)
   - **Data Source**: Filters `FullModelOutput.scenario.operations` by `isREaaS === true`
   - **Layout**: Strict Dashboard Layout
     - Top: REaaS Summary KPIs (Cards)
     - Middle: Comparison charts (REaaS vs Non-REaaS)
     - Bottom: Detailed REaaS operations table

3. **Portfolio Engine** (`src/engines/portfolio/portfolioEngine.ts`):
   - **Purpose**: Pure function engine to perform portfolio aggregations
   - **Functions**:
     - `aggregateByOperationType(output: FullModelOutput)`: Aggregates metrics by operation type
     - `filterREaaSOperations(output: FullModelOutput)`: Filters operations where `isREaaS === true`
     - `calculateREaaSMetrics(output: FullModelOutput)`: Calculates REaaS-specific metrics
   - **Return Types**:
     ```typescript
     interface PortfolioAggregation {
       byOperationType: Record<OperationType, {
         revenue: number;
         noi: number;
         operationCount: number;
         revenuePercentage: number;
         noiPercentage: number;
       }>;
       totalRevenue: number;
       totalNoi: number;
       totalOperations: number;
     }
     
     interface REaaSMetrics {
       reaaSRevenue: number;
       reaaSNoi: number;
       reaaSOperationCount: number;
       recurringRevenuePercentage: number;  // REaaS revenue / total revenue
       reaaSNoiYield: number;               // REaaS NOI / total NOI
       nonREaaSRevenue: number;
       nonREaaSNoi: number;
     }
     ```
   - **Data Strategy**: Performs aggregations on-the-fly from `FullModelOutput` (no pre-computation)
   - **Pure Functions**: All functions are pure, deterministic, side-effect free

**Data Strategy**:

- **On-the-Fly Aggregation**: Portfolio engine performs aggregations dynamically from `FullModelOutput`
- **No Pre-computation**: Metrics are calculated when views are rendered, not stored in model output
- **Source Data**:
  - `FullModelOutput.scenario.operations`: Operation configurations (includes `operationType`, `isREaaS`)
  - `FullModelOutput.consolidatedAnnualPnl`: Annual consolidated P&L (aggregated across all operations)
  - **Challenge**: Consolidated P&L is already aggregated, so we need individual operation results to aggregate by type
  - **Solution**: Portfolio engine re-runs `runScenarioEngine(FullModelOutput.scenario)` to get individual `OperationEngineResult[]`, then aggregates by `operationType` and filters by `isREaaS`
  - **Performance**: Re-running scenario engine is acceptable since it's a pure, deterministic function with minimal overhead

**Component Architecture**:

- `portfolioEngine.ts`: Pure function engine for portfolio aggregations
- `PortfolioView.tsx`: Portfolio-level analytics view
- `REaaSView.tsx`: REaaS-specific metrics view
- `PortfolioPieChart.tsx`: Pie chart component for NOI contribution
- `PortfolioBarChart.tsx`: Bar chart component for revenue mix
- `REaaSComparisonChart.tsx`: Stacked bar chart for REaaS vs Non-REaaS

**Agent Responsibilities**:

**UI Agent**:
- Implement `PortfolioView` component with strict dashboard layout
- Implement `REaaSView` component with strict dashboard layout
- Create portfolio visualization components (Pie Chart, Bar Chart)
- Create REaaS comparison charts
- Add navigation items to Sidebar for Portfolio and REaaS views

**Core Logic Agent**:
- Implement `portfolioEngine.ts` with aggregation functions
- Add portfolio aggregation types to `src/domain/types.ts`
- Ensure aggregations work correctly with individual operation results
- Handle edge cases (empty operations, missing isREaaS flags)

**QA Agent**:
- Test portfolio aggregations by operation type
- Test REaaS filtering and metrics calculation
- Verify aggregation accuracy (sums match consolidated totals)
- Test edge cases (no REaaS operations, single operation type, etc.)

**What v1.4 Explicitly Does NOT Do**:
- No changes to financial calculation logic (uses existing FullModelOutput)
- No new operation types (all 9 types already exist)
- No changes to data structures (only new aggregation types)
- No persistence of portfolio metrics (calculated on-the-fly)

### v1.5 – Governance & Audit Suite

**Status**: ✅ Implemented

**Focus**: Build the "Trust Layer" of the application. Users need to audit the math (trace back inputs), validate deal viability (Health Checks), and manage scenario versions.

**Overview**: This milestone establishes comprehensive governance capabilities through three integrated architectures: Audit Architecture ("The Glass Box"), Model Health Architecture, and Versioning Architecture. Together, these provide transparency, validation, and control over financial models.

---

#### 1. Audit Architecture ("The Glass Box")

**Purpose**: Enable users to trace back any key number to its source inputs and calculation formula.

##### Inspector Mode

**Concept**: A global UI toggle that activates "Inspector Mode". When active, key numbers become clickable and reveal their audit trace.

**Implementation**:
- **Global Toggle**: UI toggle in the application header (e.g., "Inspector Mode" or "Audit Mode")
- **Visual Indicators**: When Inspector Mode is active:
  - Key numbers display with visual indicators (subtle border, icon on hover)
  - Tooltip: "Click to view calculation"
  - Cursor changes to pointer on hover
- **Click Behavior**: Clicking a number opens an Audit Trace panel/modal

**Location**: Extends existing `AuditContext` (v0.10) with Inspector Mode state.

##### Audit Trace Data Structure

**Type Definition**:
```typescript
/**
 * Audit trace for a given KPI or financial metric.
 * Returns the formula, input values, and source information.
 */
export interface AuditTrace {
  formula: string;                    // Human-readable formula (e.g., "NOI = GOP - Undistributed Expenses")
  values: Record<string, any>;        // Input values used in calculation (e.g., { gop: 5000000, undistributedExpenses: 1200000 })
  source: string;                     // Source module/engine (e.g., "scenarioEngine", "capitalEngine", "projectEngine")
  calculationStep?: string;           // Optional: specific step within the module (e.g., "calculateNOI", "applyPreferredReturn")
  yearIndex?: number;                 // Optional: year index if this is a time-series value
  operationId?: string;               // Optional: operation ID if this is operation-specific
}
```

**Usage Pattern**:
- Audit traces are computed on-demand when user clicks a field (Just-in-Time)
- Not stored in engine results by default (keeps engines pure and performant)
- Traces are generated by `AuditEngine` helper functions

##### Scope: Implement Traces for Key KPIs

**Priority KPIs for v1.5**:
1. **NOI (Net Operating Income)**
   - Formula: `NOI = GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense - Maintenance Capex`
   - Source: `scenarioEngine`
   - Inputs: GOP, Undistributed Expenses, Management Fees, Non-Operating Income/Expense, Maintenance Capex
   - Year-specific: Yes (per year in `ConsolidatedAnnualPnl[]`)

2. **UFCF (Unlevered Free Cash Flow)**
   - Formula: `UFCF = NOI - Maintenance Capex - Change in Working Capital`
   - Source: `projectEngine`
   - Inputs: NOI, Maintenance Capex, Change in Working Capital
   - Year-specific: Yes (per year in `UnleveredFcf[]`)

3. **DSCR (Debt Service Coverage Ratio)**
   - Formula: `DSCR = NOI / Total Debt Service`
   - Source: `capitalEngine`
   - Inputs: NOI, Total Debt Service (Interest + Principal)
   - Year-specific: Yes (per year in `DebtKpi[]`)

4. **Equity Multiple (MOIC)**
   - Formula: `Equity Multiple = Total Distributions / Total Contributions`
   - Source: `waterfallEngine` or `projectEngine`
   - Inputs: Total Distributions, Total Contributions
   - Time-series: Cumulative across all years

**Implementation Location**: `src/engines/audit/auditEngine.ts` (extends existing v0.10 audit helpers)

**Key Functions**:
```typescript
/**
 * Get audit trace for a specific KPI from FullModelOutput.
 * 
 * @param kpiName - KPI identifier ('noi', 'ufcf', 'dscr', 'equityMultiple')
 * @param modelOutput - Full model output from pipeline
 * @param yearIndex - Optional year index for time-series KPIs
 * @returns AuditTrace with formula, values, and source
 */
export function getAuditTrace(
  kpiName: string,
  modelOutput: FullModelOutput,
  yearIndex?: number
): AuditTrace | null;
```

---

#### 2. Model Health Architecture

**Purpose**: Validate deal viability through automated health checks that run against `FullModelOutput`.

##### Health Rules Engine

**Concept**: A set of rules that evaluate the financial model output and flag issues.

**Location**: `src/engines/health/healthEngine.ts` (new module)

**Type Definition**:
```typescript
/**
 * Health check rule result.
 */
export interface HealthRuleResult {
  ruleId: string;                     // Unique identifier for the rule
  ruleName: string;                    // Human-readable rule name
  severity: 'warning' | 'critical';   // Severity level
  passed: boolean;                     // Whether the rule passed
  message: string;                     // Human-readable message
  value?: number;                      // Optional: actual value that triggered the rule
  threshold?: number;                  // Optional: threshold value for the rule
}

/**
 * Complete health check result.
 */
export interface HealthCheckResult {
  overallStatus: 'pass' | 'warning' | 'fail';
  rules: HealthRuleResult[];
  timestamp: number;                   // When the health check was run
}
```

**Health Rules (v1.5)**:

1. **DSCR Warning Rule**
   - **Rule ID**: `dscr_minimum`
   - **Severity**: `warning`
   - **Logic**: `DSCR < 1.1` (any year)
   - **Message**: "DSCR below 1.1 indicates tight debt coverage. Consider reducing leverage or improving NOI."
   - **Evaluation**: Check all years in `DebtKpi[]`, flag if any year has `dscr < 1.1`

2. **LTV Critical Rule**
   - **Rule ID**: `ltv_maximum`
   - **Severity**: `critical`
   - **Logic**: `LTV > 80%` (any year)
   - **Message**: "LTV exceeds 80%. High leverage increases default risk."
   - **Evaluation**: Check all years in `DebtKpi[]`, flag if any year has `ltv > 0.80`

3. **Cash Flow Negative Rule**
   - **Rule ID**: `cashflow_negative_after_stabilization`
   - **Severity**: `critical`
   - **Logic**: `CashFlow < 0` after stabilization period (typically year 2+)
   - **Message**: "Negative cash flow after stabilization indicates operational issues."
   - **Evaluation**: Check `ownerLeveredCashFlows[]` from year 2 onwards, flag if any year has negative cash flow

**Key Function**:
```typescript
/**
 * Run health checks against FullModelOutput.
 * 
 * @param modelOutput - Full model output from pipeline
 * @returns HealthCheckResult with overall status and rule results
 */
export function runHealthChecks(modelOutput: FullModelOutput): HealthCheckResult;
```

##### Health Panel UI

**Concept**: A "Health Panel" in the Dashboard showing "Pass/Fail" status for all health rules.

**Location**: `src/components/health/HealthPanel.tsx` (new component)

**UI Design**:
- **Status Indicator**: Large visual indicator (green/yellow/red) showing overall status
- **Rules List**: List of all health rules with:
  - Rule name
  - Status icon (✓ pass, ⚠ warning, ✗ fail)
  - Message
  - Actual value vs threshold (if applicable)
- **Integration**: Displayed in `DashboardView` as a prominent card/panel

**Component Structure**:
```typescript
interface HealthPanelProps {
  healthResult: HealthCheckResult;
  onRuleClick?: (ruleId: string) => void;  // Optional: drill-down to rule details
}
```

**Visual Design**:
- Green background: All rules pass
- Yellow background: Warnings present
- Red background: Critical failures present
- Expandable sections for rule details

---

#### 3. Versioning Architecture

**Purpose**: Reaffirm and fully integrate `ScenarioVersion` and `ScenarioLibrary` into a unified `GovernanceView`.

##### ScenarioVersion & ScenarioLibrary

**Status**: ✅ Already defined in v0.12 (`src/domain/governance.ts`)

**Existing Types**:
- `ScenarioVersion`: Immutable snapshot of a scenario
- `ScenarioLibrary`: Collection of scenarios with version history

**v1.5 Enhancement**: Full integration into `GovernanceView` for comprehensive version management.

##### GovernanceView Integration

**Purpose**: Centralized view for all governance activities: version management, audit traces, and health checks.

**Location**: `src/views/GovernanceView.tsx` (new or enhanced)

**Content Structure**:

1. **Version Management Section**:
   - List of scenario versions with metadata
   - Create new version snapshot
   - Compare versions (using existing diff engine from v0.12)
   - Restore/load version
   - Version tagging and labeling

2. **Audit Trail Section**:
   - History of audit trace views (what KPIs were inspected)
   - Export audit traces
   - Audit log (optional: track who viewed what)

3. **Health Check History**:
   - Historical health check results
   - Trend visualization (health over time)
   - Health check export

**Layout**: Dashboard Layout (v1.1+)
- **Top**: Summary cards (Current Version, Health Status, Audit Activity)
- **Middle**: Tabs or sections for Version Management, Audit Trail, Health History
- **Bottom**: Detailed tables/lists for each section

**Integration Points**:
- Uses existing `ScenarioVersion` and `ScenarioLibrary` from v0.12
- Uses `AuditEngine` for audit traces (v1.5)
- Uses `HealthEngine` for health checks (v1.5)
- Uses existing diff engine for version comparison (v0.12)

---

#### Implementation Strategy

**Phase 1: Audit Architecture** (v1.5.0)
- Extend `AuditEngine` with `getAuditTrace()` for NOI, UFCF, DSCR, Equity Multiple
- Enhance `AuditContext` with Inspector Mode toggle
- Update UI components to support clickable numbers in Inspector Mode
- Implement Audit Trace panel/modal component

**Phase 2: Health Architecture** (v1.5.1)
- Implement `HealthEngine` with three core rules (DSCR, LTV, Cash Flow)
- Create `HealthPanel` component
- Integrate health checks into `DashboardView`
- Add health check execution to model pipeline (optional: auto-run on model update)

**Phase 3: GovernanceView Integration** (v1.5.2)
- Create or enhance `GovernanceView` component
- Integrate version management UI
- Add audit trail section
- Add health check history section
- Wire up all governance features into unified view

---

#### Agent Responsibilities

**Architecture Agent** (this agent):
- ✅ Define Audit Architecture specifications (Inspector Mode, Audit Trace)
- ✅ Define Model Health Architecture (rules engine, health panel)
- ✅ Define Versioning Architecture integration into GovernanceView
- ✅ Update ARCHITECTURE.md with v1.5 specifications

**Core Logic Agent**:
- Implement `AuditEngine` extensions for NOI, UFCF, DSCR, Equity Multiple traces
- Implement `HealthEngine` with health rules
- Ensure health checks work with `FullModelOutput` structure
- Add tests for audit traces and health checks

**UI Agent**:
- Implement Inspector Mode toggle in header
- Make key numbers clickable in Inspector Mode
- Implement Audit Trace panel/modal
- Implement `HealthPanel` component
- Create or enhance `GovernanceView` with all governance features
- Integrate health panel into `DashboardView`

**QA Agent**:
- Test audit trace accuracy (formulas match actual calculations)
- Test health rules (verify rules trigger correctly)
- Test Inspector Mode interactions
- Test GovernanceView functionality
- Test version management integration

**Documentation Agent**:
- Update ARCHITECTURE.md with v1.5 implementation details (as work progresses)
- Document audit trace format and usage
- Document health rules and thresholds
- Update user guide with governance features

---

#### What v1.5 Explicitly Does NOT Do

1. **No Engine Rewrites**:
   - Engines remain pure and do not return audit traces by default
   - Audit logic is separate from calculation logic (extends v0.10 approach)

2. **No Real-Time Health Monitoring**:
   - Health checks run on-demand or after model calculation
   - No continuous monitoring or alerting system

3. **No Advanced Versioning Features**:
   - Version branching/merging deferred to future milestones
   - Version approval workflows deferred to future milestones

4. **No User Permissions**:
   - All users have full access to all governance features
   - Role-based access control deferred to future milestones

### v1.6 – Risk Intelligence Dashboard

**Status**: ✅ Implemented

**Focus**: Combine existing risk analysis tools (v0.7 Sensitivity, v0.11 Monte Carlo) into a cohesive strategic dashboard.

**Overview**: We have the math (Sensitivity Analysis and Monte Carlo Simulation), but no cohesive UI. This milestone creates a dedicated **RiskView** that combines these tools into a strategic dashboard for comprehensive risk assessment.

---

#### UI Architecture (`RiskView`)

**Purpose**: Unified risk analysis interface that combines probabilistic (Monte Carlo) and deterministic (Sensitivity) risk assessment tools.

**Location**: `src/views/RiskView.tsx` (enhance existing basic implementation)

**Layout**: Dashboard Grid (similar to `DashboardView` but focused on Risk)

**Component Structure**:
```typescript
interface RiskViewProps {
  input: FullModelInput;                    // Current model input
  baseOutput: FullModelOutput;             // Base case model output
  onRunSimulation: (config: SimulationConfig) => Promise<SimulationResult>;  // Simulation trigger
}
```

##### Section 1: Probabilistic Risk (Monte Carlo)

**Purpose**: Visualize probability distributions of outcomes from Monte Carlo simulation.

**Components**:

1. **Distribution Histogram Chart**:
   - **Metric**: Frequency of IRR outcomes (or selectable KPI: NPV, IRR, Equity Multiple)
   - **Data Source**: `SimulationResult.iterations` array
   - **Visualization**: Histogram showing distribution of outcomes
   - **X-Axis**: KPI value (e.g., IRR %)
   - **Y-Axis**: Frequency/Count of iterations
   - **Chart Library**: Recharts (consistent with existing charts)
   - **Interactivity**: 
     - Tooltip showing exact count and percentage
     - Optional: Overlay showing percentiles (P10, P50, P90) as vertical lines

2. **Risk Metrics Cards**:
   - **VaR (95%)**: Value at Risk at 95% confidence level
     - Calculation: 5th percentile of NPV distribution (or selected KPI)
     - Display: "VaR (95%): -$2.5M" (negative indicates potential loss)
   - **Probability of Loss**: P(NPV < 0)
     - Calculation: Count iterations where `NPV < 0` / total iterations
     - Display: "Probability of Loss: 15.3%"
   - **Median IRR**: P50 (50th percentile) of IRR distribution
     - Display: "Median IRR: 12.5%"
   - **Additional Metrics** (optional):
     - Mean NPV
     - P10/P90 range
     - CVaR (Conditional VaR)

3. **Simulation Controls**:
   - **"Run Simulation" Button**: Triggers Monte Carlo simulation
   - **Configuration Panel** (collapsible):
     - Iterations: Number of simulation runs (default: 1000)
     - Variable Variations:
       - Occupancy Variation (std dev %)
       - ADR Variation (std dev %)
       - Interest Rate Variation (std dev %)
   - **Loading State**: Show progress indicator while simulation runs
   - **Results State**: Display results after simulation completes

**Data Flow**:
```typescript
// User clicks "Run Simulation"
onRunSimulation(config) 
  → runMonteCarlo(baseScenario, config) 
  → SimulationResult
  → Update RiskView state
  → Render histogram and metrics
```

##### Section 2: Deterministic Stress (Sensitivity)

**Purpose**: Analyze how specific input changes affect outputs (deterministic, not probabilistic).

**Implementation**: Reuse existing `SensitivityPanel` component (v0.7)

**Integration**:
- Embed `SensitivityPanel` directly in RiskView
- Pass `baseScenario` constructed from `input`
- Maintain existing functionality (1D/2D sensitivity, heatmap visualization)

**Layout**: 
- Positioned below Monte Carlo section
- Full-width or side-by-side layout (responsive)

---

#### Data Strategy

##### Using `SimulationResult` from Quant Agent

**Data Structure**: `SimulationResult` (defined in `src/domain/types.ts`)

**Key Fields**:
- `iterations: SimulationKpi[]`: Array of KPI results from each iteration
- `statistics`: Statistical summary (mean, P10, P50, P90) for each KPI
- `baseCaseKpis`: KPIs from base case (no variations)

**Usage in RiskView**:
1. **Histogram Data**: Extract KPI values from `iterations` array
   ```typescript
   const irrValues = simulationResult.iterations
     .map(iter => iter.unleveredIrr)
     .filter(irr => irr !== null) as number[];
   ```

2. **Risk Metrics**:
   - **VaR (95%)**: Use `statistics.npv.p10` (or calculate 5th percentile directly)
   - **Median IRR**: Use `statistics.unleveredIrr.p50`
   - **Probability of Loss**: Calculate from `iterations` array

##### Probability of Loss Calculation

**Formula**: `P(NPV < 0) = Count(iterations where NPV < 0) / Total Iterations`

**Implementation**:
```typescript
function calculateProbabilityOfLoss(simulationResult: SimulationResult): number {
  const negativeNpvCount = simulationResult.iterations.filter(
    iter => iter.npv < 0
  ).length;
  return negativeNpvCount / simulationResult.iterations.length;
}
```

**Display**: Format as percentage (e.g., "15.3%")

---

#### Implementation Strategy

**Phase 1: Monte Carlo Section** (v1.6.0)
- Enhance `RiskView` with Monte Carlo section
- Implement distribution histogram chart component
- Implement risk metrics cards (VaR, Probability of Loss, Median IRR)
- Add simulation controls and configuration panel
- Wire up `onRunSimulation` to trigger `runMonteCarlo` engine
- Calculate Probability of Loss from `SimulationResult`

**Phase 2: Integration** (v1.6.1)
- Integrate `SensitivityPanel` into RiskView Section 2
- Ensure responsive layout (dashboard grid)
- Test end-to-end flow: Run simulation → View results → Run sensitivity

**Phase 3: Polish** (v1.6.2)
- Add loading states and progress indicators
- Enhance chart interactivity (tooltips, percentile overlays)
- Add export functionality (export simulation results)
- Performance optimization for large iteration counts

---

#### Agent Responsibilities

**Architecture Agent** (this agent):
- ✅ Define RiskView UI Architecture (Dashboard Grid, two sections)
- ✅ Define Data Strategy (SimulationResult usage, Probability of Loss)
- ✅ Update ARCHITECTURE.md with v1.6 specifications
- ✅ Update roadmap (mark v1.6 In Progress, define v2.0 Future)

**UI Agent**:
- Enhance `RiskView` component with Monte Carlo section
- Implement distribution histogram chart component
- Implement risk metrics cards (VaR, Probability of Loss, Median IRR)
- Add simulation controls and configuration panel
- Integrate `SensitivityPanel` into Section 2
- Ensure responsive dashboard grid layout
- Add loading states and progress indicators

**Quant Agent**:
- Ensure `SimulationResult` structure supports histogram data extraction
- Verify `runMonteCarlo` engine returns complete iteration data
- Optimize simulation performance if needed (for large iteration counts)
- Add helper functions for risk metric calculations (VaR, Probability of Loss)

**QA Agent**:
- Test Monte Carlo simulation integration
- Verify histogram data accuracy (matches simulation results)
- Test risk metrics calculations (VaR, Probability of Loss, Median)
- Test sensitivity panel integration
- Test responsive layout across screen sizes
- Performance testing (large iteration counts)

**Documentation Agent**:
- Update ARCHITECTURE.md with v1.6 implementation details (as work progresses)
- Document RiskView usage and features
- Update user guide with risk analysis instructions

---

#### What v1.6 Explicitly Does NOT Do

1. **No New Risk Engines**:
   - Uses existing Monte Carlo engine (v0.11) and Sensitivity engine (v0.7)
   - No new calculation logic, only UI integration

2. **No Advanced Risk Metrics**:
   - CVaR, correlation analysis, stress testing deferred to future milestones
   - Focus is on core metrics: VaR, Probability of Loss, Median

3. **No Real-Time Monitoring**:
   - Simulations run on-demand (user clicks "Run Simulation")
   - No continuous monitoring or alerting

4. **No Scenario Comparison in Risk Context**:
   - Risk analysis is per-scenario
   - Multi-scenario risk comparison deferred to future milestones

---

### v2.0+ (Future Roadmap)

**Status**: ⏳ Planned

**Key Areas**:
- **Performance Optimizations**:
  - Parallel simulation execution
  - Caching and memoization strategies
  - Large dataset handling

- **Advanced Risk Features**:
  - Correlation analysis between variables
  - Stress testing scenarios
  - Scenario probability weighting
  - Risk-adjusted return metrics
  - Advanced risk visualizations (tornado diagrams, risk-return scatter plots)

- **Enhanced Collaboration**:
  - Real-time collaboration (multi-user editing)
  - Shared scenario libraries
  - Comment and annotation system

- **Integration & Export**:
  - Excel import/export enhancements
  - API integration and webhooks
  - Report generation and templating

- **Additional Operation Types**:
  - New operation type refinements
  - Custom operation type support

- **Enterprise Features**:
  - Role-based access control
  - Audit logging and compliance
  - Advanced versioning (branching, merging)
  - Approval workflows

---

## v2.1 – Deep Simulation (Correlation)

**Status**: ✅ Implemented

**Focus**: Financial Depth - Implement correlated random sampling using Cholesky Decomposition

**Context**: We are entering the v2.x era focused on "Financial Depth". The current Monte Carlo engine (v0.11) assumes variables are independent (Correlation = 0). In reality, variables like ADR and Occupancy are correlated. This milestone implements **Cholesky Decomposition** to generate correlated random samples.

### Overview

**Problem Statement**:
- Current simulation engine (`simulationEngine.ts`) generates independent random samples for each variable (Occupancy, ADR, Interest Rate)
- Real-world variables are correlated (e.g., high ADR often correlates with high Occupancy in luxury hotels)
- Independent sampling underestimates tail risks and produces unrealistic scenarios

**Solution**:
- Implement multivariate normal distribution generator using Cholesky Decomposition
- Allow users to configure correlation matrix (N x N) for sensitivity variables
- Generate correlated random samples that respect the specified correlation structure
- Add visual validation (scatter plots) to verify correlation implementation

### Math Architecture

#### Correlation Matrix

**Definition**: A symmetric, positive semi-definite N x N matrix where:
- Diagonal elements = 1.0 (each variable is perfectly correlated with itself)
- Off-diagonal elements = correlation coefficient (-1.0 to 1.0)
- Matrix must be positive semi-definite (all eigenvalues ≥ 0)

**Variable Set** (Sensitivity Variables):
1. `occupancy` - Occupancy/utilization rate
2. `adr` - Average Daily Rate (ADR)
3. `interestRate` - Interest rate on debt

**Default Correlation Matrix** (3x3):
```
         occupancy  adr  interestRate
occupancy    1.0    0.7     0.0
adr          0.7    1.0     0.0
interestRate 0.0    0.0     1.0
```

**Rationale**:
- Occupancy ↔ ADR: Positive correlation (0.7) - luxury properties maintain high rates with high occupancy
- Interest Rate: Independent (0.0) - market-driven, not operationally correlated

**Type Definition**:
```typescript
/**
 * Correlation matrix for sensitivity variables in Monte Carlo simulation.
 * 
 * Matrix is symmetric: correlation[i][j] === correlation[j][i]
 * Diagonal elements must be 1.0 (perfect self-correlation)
 * Off-diagonal elements must be in range [-1.0, 1.0]
 * Matrix must be positive semi-definite (all eigenvalues ≥ 0)
 * 
 * @property variables - Ordered list of variable names (defines matrix dimension)
 * @property matrix - N x N correlation matrix (array of arrays)
 */
export interface CorrelationMatrix {
  variables: SensitivityVariable[];
  matrix: number[][]; // matrix[i][j] = correlation between variables[i] and variables[j]
}
```

**Validation Rules**:
1. Matrix must be square (N x N where N = variables.length)
2. Diagonal elements must equal 1.0
3. Matrix must be symmetric (matrix[i][j] === matrix[j][i])
4. All values must be in range [-1.0, 1.0]
5. Matrix must be positive semi-definite (Cholesky decomposition must succeed)

#### Cholesky Decomposition

**Algorithm**: Cholesky Decomposition of correlation matrix Σ
- Input: Correlation matrix Σ (N x N, positive semi-definite)
- Output: Lower triangular matrix L such that L × L^T = Σ

**Implementation**:
```typescript
/**
 * Performs Cholesky decomposition of a positive semi-definite matrix.
 * 
 * Returns lower triangular matrix L such that L × L^T = Σ
 * 
 * @param matrix - Positive semi-definite correlation matrix (N x N)
 * @returns Lower triangular matrix L (N x N)
 * @throws Error if matrix is not positive semi-definite
 */
function choleskyDecomposition(matrix: number[][]): number[][]
```

**Mathematical Details**:
- For matrix Σ, compute L where:
  - L[i][j] = 0 for i < j (upper triangle is zero)
  - L[i][i] = sqrt(Σ[i][i] - Σ(L[i][k]^2 for k < i))
  - L[i][j] = (Σ[i][j] - Σ(L[i][k] * L[j][k] for k < j)) / L[j][j] for i > j

**Error Handling**:
- If matrix is not positive semi-definite, throw descriptive error
- Suggest nearest valid correlation matrix (if possible)
- Fall back to identity matrix (independent sampling) if decomposition fails

#### Multivariate Normal Distribution Generator

**Algorithm**: Generate correlated random samples
1. Generate N independent standard normal random variables: Z ~ N(0, 1)
2. Apply Cholesky transformation: X = L × Z
3. Result: X ~ N(0, Σ) where Σ is the correlation matrix

**Implementation**:
```typescript
/**
 * Generates correlated random samples from multivariate normal distribution.
 * 
 * @param correlationMatrix - Correlation matrix (N x N)
 * @param means - Mean values for each variable (array of N values)
 * @param stdDevs - Standard deviations for each variable (array of N values)
 * @returns Array of N correlated random samples
 */
function generateCorrelatedNormal(
  correlationMatrix: CorrelationMatrix,
  means: number[],
  stdDevs: number[]
): number[]
```

**Integration with Simulation Engine**:
- Replace independent `generateNormalRandom()` calls with `generateCorrelatedNormal()`
- Map sensitivity variables to correlation matrix indices
- Apply correlated samples to scenario variations

### Engine Logic Updates

#### SimulationEngine Changes

**File**: `src/engines/analysis/simulationEngine.ts`

**Current Implementation** (v0.11):
- `applyRandomVariations()` generates independent random samples:
  - `occupancyMultiplier = 1 + generateNormalRandom(0, occupancyVariation)`
  - `adrMultiplier = 1 + generateNormalRandom(0, adrVariation)`
  - `interestRateMultiplier = 1 + generateNormalRandom(0, interestRateVariation)`

**New Implementation** (v2.1):
- `applyRandomVariations()` generates correlated random samples:
  - Compute Cholesky decomposition of correlation matrix (once per simulation)
  - For each iteration:
    - Generate correlated samples: `[occSample, adrSample, irSample] = generateCorrelatedNormal(correlationMatrix, [0, 0, 0], [occVar, adrVar, irVar])`
    - Apply as multipliers: `occupancyMultiplier = 1 + occSample`, etc.

**Function Signature Update**:
```typescript
function applyRandomVariations(
  scenario: NamedScenario,
  config: Required<SimulationConfig>,
  correlationMatrix?: CorrelationMatrix  // NEW: Optional correlation matrix
): void
```

**Backward Compatibility**:
- If `correlationMatrix` is not provided, use independent sampling (current behavior)
- Default to identity matrix (no correlation) if correlation matrix is invalid

#### Statistics Module Updates

**File**: `src/domain/statistics.ts`

**New Functions**:
1. `choleskyDecomposition(matrix: number[][]): number[][]`
2. `generateCorrelatedNormal(correlationMatrix: CorrelationMatrix, means: number[], stdDevs: number[]): number[]`
3. `validateCorrelationMatrix(matrix: CorrelationMatrix): { valid: boolean; errors: string[] }`
4. `nearestValidCorrelationMatrix(matrix: number[][]): number[][]` (optional, for error recovery)

**Testing Requirements**:
- Test Cholesky decomposition with known matrices
- Test correlation preservation (generated samples should have expected correlation)
- Test edge cases (identity matrix, perfect correlation, negative correlation)

### UI Architecture

#### Correlation Matrix Panel

**Location**: `SimulationView` → Advanced Settings (collapsible section)

**Component**: `CorrelationMatrixPanel`

**Layout**:
- Grid input (N x N) where N = number of sensitivity variables
- Row/column headers: Variable names (Occupancy, ADR, Interest Rate)
- Diagonal cells: Disabled (always 1.0)
- Off-diagonal cells: Editable input fields (range: -1.0 to 1.0)
- Symmetry enforcement: When user edits [i][j], automatically update [j][i]

**Validation**:
- Real-time validation: Highlight invalid cells (red border)
- Error messages:
  - "Correlation must be between -1.0 and 1.0"
  - "Matrix must be positive semi-definite"
  - "Diagonal must equal 1.0"
- Disable "Run Simulation" button if matrix is invalid

**Default Values**:
- Pre-populate with default correlation matrix (Occupancy-ADR = 0.7)
- "Reset to Defaults" button
- "Clear Correlations" button (sets to identity matrix)

**UI Mockup**:
```
┌─────────────────────────────────────────┐
│ Correlation Matrix (Advanced Settings) │
├─────────────────────────────────────────┤
│              Occupancy  ADR  Interest    │
│ Occupancy       1.0    0.7     0.0     │
│ ADR             0.7    1.0     0.0     │
│ Interest        0.0    0.0     1.0     │
│                                         │
│ [Reset to Defaults] [Clear Correlations]│
└─────────────────────────────────────────┘
```

#### Visual Validation: Scatter Plots

**Purpose**: Verify correlation implementation visually

**Component**: `CorrelationScatterPlot`

**Display Logic**:
- Show scatter plot when correlation is high (e.g., |correlation| > 0.5)
- X-axis: Variable 1 (e.g., Occupancy)
- Y-axis: Variable 2 (e.g., ADR)
- Data points: Sample pairs from last simulation run (first 1000 iterations)
- Overlay: Correlation coefficient label (e.g., "ρ = 0.7")

**Integration**:
- Display below simulation results
- Toggle: "Show Correlation Visualization"
- Multiple plots: One for each high-correlation pair

**Chart Library**: Use existing `recharts` (already in project)

**Example**:
- If Occupancy-ADR correlation = 0.9, show scatter plot
- Points should form an elliptical cloud (positive correlation)
- If correlation = -0.9, points should form negative slope

### Type Definitions

#### Updated SimulationConfig

**File**: `src/domain/types.ts`

**Current**:
```typescript
export interface SimulationConfig {
  iterations?: number;
  occupancyVariation?: number;
  adrVariation?: number;
  interestRateVariation?: number;
}
```

**Updated** (v2.1):
```typescript
export interface SimulationConfig {
  iterations?: number;
  occupancyVariation?: number;
  adrVariation?: number;
  interestRateVariation?: number;
  correlationMatrix?: CorrelationMatrix;  // NEW: Optional correlation matrix
}
```

**New Types**:
```typescript
/**
 * Sensitivity variable names for correlation matrix.
 */
export type SensitivityVariable = 
  | 'occupancy'
  | 'adr'
  | 'interestRate';

/**
 * Correlation matrix for sensitivity variables.
 */
export interface CorrelationMatrix {
  variables: SensitivityVariable[];
  matrix: number[][]; // matrix[i][j] = correlation between variables[i] and variables[j]
}
```

### Update Roadmap

**v2.1**: Correlation (✅ Implemented)
- ✅ Architecture defined
- ✅ Implementation completed
- ✅ Testing completed

**v2.2**: Liquidity & Covenants (✅ Implemented)
- ✅ Debt covenant modeling
- ✅ Monthly liquidity analysis
- ✅ Cash flow coverage ratios

**v2.3**: Goal Seek (✅ Implemented)
- ✅ Reverse engineering: "What inputs achieve target IRR?"
- ✅ Binary search optimization algorithms
- ✅ Scenario optimization with automated solver

### v2.1 Agent Responsibilities

#### Quant Agent

**Primary Files**:
- `src/domain/statistics.ts` - Cholesky decomposition, correlated sampling
- `src/engines/analysis/simulationEngine.ts` - Integration with correlation matrix

**Tasks**:
1. Implement `choleskyDecomposition(matrix: number[][]): number[][]`
   - Handle positive semi-definite requirement
   - Error handling for invalid matrices
   - Unit tests with known matrices

2. Implement `generateCorrelatedNormal(correlationMatrix, means, stdDevs)`
   - Generate independent standard normal samples
   - Apply Cholesky transformation
   - Verify correlation preservation in tests

3. Update `applyRandomVariations()` in `simulationEngine.ts`
   - Accept optional `correlationMatrix` parameter
   - Use correlated sampling when matrix provided
   - Fall back to independent sampling if matrix invalid/absent

4. Add validation function `validateCorrelationMatrix()`
   - Check symmetry, diagonal = 1.0, range [-1, 1]
   - Attempt Cholesky decomposition to verify positive semi-definiteness

5. Write comprehensive tests:
   - Cholesky decomposition accuracy
   - Correlation preservation (generated samples match expected correlation)
   - Edge cases (identity matrix, perfect correlation, negative correlation)
   - Backward compatibility (no correlation matrix = independent sampling)

#### Core Logic Agent

**Primary Files**:
- `src/domain/types.ts` - Type definitions

**Tasks**:
1. Add `CorrelationMatrix` interface to `types.ts`
2. Add `SensitivityVariable` type (if not already defined)
3. Update `SimulationConfig` interface to include optional `correlationMatrix`
4. Ensure type safety across simulation engine

#### UI Agent

**Primary Files**:
- `src/views/SimulationView.tsx` - Main simulation view
- `src/components/analysis/CorrelationMatrixPanel.tsx` - NEW: Correlation matrix input
- `src/components/analysis/CorrelationScatterPlot.tsx` - NEW: Scatter plot visualization

**Tasks**:
1. Create `CorrelationMatrixPanel` component:
   - Grid input (N x N) for correlation matrix
   - Variable name headers (Occupancy, ADR, Interest Rate)
   - Diagonal cells disabled (always 1.0)
   - Symmetry enforcement (edit [i][j] → auto-update [j][i])
   - Real-time validation with error messages
   - Default values button
   - Clear correlations button (identity matrix)

2. Integrate `CorrelationMatrixPanel` into `SimulationView`:
   - Add "Advanced Settings" collapsible section
   - Place below basic simulation controls
   - Pass correlation matrix to simulation engine

3. Create `CorrelationScatterPlot` component:
   - Use `recharts` ScatterChart
   - Display sample pairs from simulation iterations
   - Show correlation coefficient overlay
   - Toggle visibility (show when |correlation| > 0.5)

4. Integrate scatter plot into simulation results:
   - Display below statistical summary
   - One plot per high-correlation pair
   - Responsive layout

5. Update `SimulationView` to handle correlation matrix:
   - Pass correlation matrix from UI to `runMonteCarlo()`
   - Store correlation matrix in simulation config
   - Display correlation matrix in results summary

#### QA Agent

**Primary Files**:
- `src/tests/domain/statistics.test.ts` - Statistics tests
- `src/tests/engines/analysis/simulationEngine.test.ts` - Simulation engine tests

**Tasks**:
1. Test Cholesky decomposition:
   - Known matrices (identity, perfect correlation, etc.)
   - Verify L × L^T = Σ
   - Error cases (non-positive semi-definite matrices)

2. Test correlated sampling:
   - Generate samples with known correlation matrix
   - Verify sample correlation matches expected correlation (within tolerance)
   - Test with different correlation values (-0.9, 0, 0.5, 0.9)

3. Test simulation engine integration:
   - Run simulation with correlation matrix
   - Verify correlated samples are applied correctly
   - Test backward compatibility (no correlation matrix)

4. Test edge cases:
   - Identity matrix (independent sampling)
   - Perfect correlation (1.0)
   - Perfect negative correlation (-1.0)
   - Invalid matrices (error handling)

5. Test UI components:
   - Correlation matrix input validation
   - Symmetry enforcement
   - Default values

#### Education Agent

**Primary Files**:
- `docs/ARCHITECTURE.md` - This document (already updated)

**Tasks**:
1. ✅ Update ARCHITECTURE.md with v2.1 specifications (this section)
2. Update user guide with correlation matrix instructions
3. Document correlation matrix best practices
4. Add examples of correlation values for different property types

### What v2.1 Explicitly Does NOT Do

1. **No Advanced Distributions**:
   - Only normal distribution supported for correlated sampling
   - Lognormal, beta, etc. deferred to v2.2+

2. **No Dynamic Correlation**:
   - Correlation matrix is static (same for all iterations)
   - Time-varying correlation deferred to v2.2+

3. **No Correlation Estimation**:
   - Users must manually input correlation values
   - Automatic correlation estimation from historical data deferred to v2.2+

4. **No Multi-Operation Correlation**:
   - Correlation only applies to sensitivity variables (Occupancy, ADR, Interest Rate)
   - Cross-operation correlation deferred to v2.2+

### Testing Strategy

**Unit Tests**:
- Cholesky decomposition accuracy
- Correlated sampling correlation preservation
- Matrix validation logic

**Integration Tests**:
- Full simulation run with correlation matrix
- Verify correlated samples affect results correctly
- Backward compatibility (no correlation matrix)

**Visual Tests**:
- Scatter plots show expected correlation patterns
- UI validation works correctly
- Error messages are clear

### Performance Considerations

**Cholesky Decomposition**:
- Compute once per simulation (not per iteration)
- Cache decomposition result
- For 3x3 matrix, computation is negligible (< 1ms)

**Correlated Sampling**:
- Matrix multiplication (L × Z) is O(N²) per iteration
- For N=3, overhead is minimal
- No performance impact expected for typical simulations (1000 iterations)

### Migration Path

**Backward Compatibility**:
- `SimulationConfig.correlationMatrix` is optional
- If not provided, use independent sampling (v0.11 behavior)
- Existing simulations continue to work without changes

**Default Behavior**:
- New simulations default to identity matrix (independent sampling)
- Users must explicitly configure correlation matrix
- UI provides sensible defaults (Occupancy-ADR = 0.7)

---

## v2.2 – Liquidity & Covenants

**Status**: ✅ Implemented

**Focus**: Monthly Solvency - Detect cash flow gaps ("Valley of Death") and Covenant breaches

**Context**: We are shifting focus from "Annual Profitability" to "Monthly Solvency". The goal is to detect cash flow gaps and covenant breaches at monthly granularity, not just annual. This enables early warning systems for liquidity crises and covenant violations.

### Overview

**Problem Statement**:
- Current system operates at annual granularity (annual P&L, annual debt service)
- Seasonal variations and monthly cash flow mismatches are invisible
- Covenant breaches (DSCR, LTV, minimum cash) can occur mid-year but are only detected annually
- "Valley of Death" scenarios (temporary cash shortfalls) are not visible

**Solution**:
- Add monthly granularity to scenario and capital engines
- Calculate monthly debt service (exact interest/principal per month)
- Track cumulative cash position month-by-month
- Monitor covenants at monthly frequency
- Visualize liquidity position and covenant compliance in dedicated `LiquidityView`

### Data Structure Updates

#### ConsolidatedMonthlyPnl

**Definition**: Aggregate `MonthlyPnl` from all operations into project-level monthly P&L.

**Type Definition**:
```typescript
/**
 * Consolidated Monthly P&L - aggregates MonthlyPnl from all operations.
 * 
 * Similar structure to ConsolidatedAnnualPnl but at monthly granularity.
 * Used for monthly liquidity analysis and covenant monitoring.
 */
export interface ConsolidatedMonthlyPnl {
  yearIndex: number;        // 0-based relative to scenario start
  monthIndex: number;        // 0-based 0..11 (January = 0, December = 11)
  monthNumber: number;       // Absolute month number (0..N*12-1) for easy sorting

  // Revenue
  revenueTotal: number;

  // USALI Fields (consistent with ConsolidatedAnnualPnl)
  departmentalExpenses: number;      // Direct expenses (COGS + direct departmental labor)
  gop: number;                       // Gross Operating Profit = Revenue - Departmental Expenses
  undistributedExpenses: number;    // Expenses not directly attributable to departments
  managementFees?: number;           // Optional: Management fees
  nonOperatingIncomeExpense?: number; // Optional: Non-operating items
  noi: number;                       // Net Operating Income (USALI)

  // Other fields
  maintenanceCapex: number;
  cashFlow: number;                  // Monthly cash flow (NOI - maintenanceCapex)
}
```

**Calculation**:
- Aggregate `MonthlyPnl` from all operations for each month
- Sum revenue, COGS, OPEX across all operations
- Apply USALI structure (GOP, Undistributed Expenses, NOI)
- Calculate monthly cash flow = NOI - maintenanceCapex

**Location**: `src/domain/types.ts`

#### MonthlyCashFlow

**Definition**: Project-level monthly cash flow after debt service and capex.

**Type Definition**:
```typescript
/**
 * Monthly Cash Flow - project-level monthly flow after debt service.
 * 
 * Formula: MonthlyCashFlow = NOI - MonthlyDebtService - MonthlyCapex
 * 
 * Used for liquidity analysis and cumulative cash position tracking.
 */
export interface MonthlyCashFlow {
  yearIndex: number;        // 0-based relative to scenario start
  monthIndex: number;       // 0-based 0..11
  monthNumber: number;      // Absolute month number (0..N*12-1)

  // Components
  noi: number;              // Net Operating Income (from ConsolidatedMonthlyPnl)
  monthlyDebtService: number; // Interest + Principal for this month
  monthlyInterest: number;   // Interest portion of debt service
  monthlyPrincipal: number;  // Principal portion of debt service
  monthlyCapex: number;      // Maintenance capex for this month
  monthlyCashFlow: number;   // NOI - DebtService - Capex

  // Cumulative tracking
  cumulativeCashFlow: number; // Running sum of monthlyCashFlow from month 0
  cashPosition: number;       // Starting cash + cumulativeCashFlow (assumes initial cash = 0 for now)
}
```

**Calculation**:
- Extract NOI from `ConsolidatedMonthlyPnl`
- Extract monthly debt service from `MonthlyDebtSchedule`
- Extract monthly capex from `ConsolidatedMonthlyPnl`
- Calculate: `monthlyCashFlow = noi - monthlyDebtService - monthlyCapex`
- Track cumulative: `cumulativeCashFlow[month] = cumulativeCashFlow[month-1] + monthlyCashFlow[month]`

**Location**: `src/domain/types.ts`

#### MonthlyDebtScheduleEntry

**Definition**: Monthly debt schedule entry (interest and principal per month).

**Type Definition**:
```typescript
/**
 * Monthly debt schedule entry.
 * 
 * Calculates exact monthly interest and principal payments based on amortization type.
 * For mortgage-style amortization, uses standard amortization formula.
 * For interest-only, principal = 0.
 * For bullet, principal = 0 until maturity, then full principal payment.
 */
export interface MonthlyDebtScheduleEntry {
  yearIndex: number;        // 0-based relative to scenario start
  monthIndex: number;       // 0-based 0..11
  monthNumber: number;      // Absolute month number (0..N*12-1)
  trancheId: string;         // Debt tranche identifier

  beginningBalance: number; // Beginning balance for this month
  interest: number;         // Interest payment for this month
  principal: number;        // Principal payment for this month
  endingBalance: number;    // Ending balance after principal payment
}
```

**Calculation Logic**:
- **Mortgage Amortization**: Use standard amortization formula:
  - Monthly payment = P × [r(1+r)^n] / [(1+r)^n - 1]
  - Where P = principal, r = monthly interest rate, n = remaining months
  - Interest = beginningBalance × monthlyInterestRate
  - Principal = monthlyPayment - interest
- **Interest-Only**: Principal = 0, interest = beginningBalance × monthlyInterestRate
- **Bullet**: Principal = 0 until maturity month, then principal = full balance

**Location**: `src/domain/types.ts`

#### MonthlyDebtSchedule

**Definition**: Complete monthly debt schedule (aggregated across all tranches).

**Type Definition**:
```typescript
/**
 * Monthly debt schedule - aggregated across all debt tranches.
 * 
 * Contains monthly entries for all months in the projection horizon.
 * Aggregates interest and principal across all active tranches per month.
 */
export interface MonthlyDebtSchedule {
  entries: MonthlyDebtScheduleEntry[];  // All monthly entries (one per tranche per month)
  aggregatedByMonth: {                    // Aggregated by month (sum across tranches)
    monthNumber: number;
    totalInterest: number;
    totalPrincipal: number;
    totalDebtService: number;             // Interest + Principal
    totalBeginningBalance: number;
    totalEndingBalance: number;
  }[];
}
```

**Location**: `src/domain/types.ts`

#### Covenant

**Definition**: Debt covenant with threshold and type.

**Type Definition**:
```typescript
/**
 * Debt covenant definition.
 * 
 * Covenants are constraints that must be maintained throughout the loan term.
 * Breaches can trigger default, acceleration, or other penalties.
 */
export interface Covenant {
  id: string;                              // Unique identifier
  name: string;                            // Human-readable name (e.g., "Minimum DSCR")
  type: 'min_dscr' | 'max_ltv' | 'min_cash'; // Covenant type
  threshold: number;                       // Threshold value (e.g., 1.25 for DSCR, 0.75 for LTV)
  trancheId?: string;                      // Optional: specific tranche (if null, applies to aggregate)
  
  // Optional: grace period or cure period (in months)
  gracePeriodMonths?: number;             // Number of months before breach triggers default
}
```

**Covenant Types**:
1. **`min_dscr`**: Minimum Debt Service Coverage Ratio
   - Formula: `DSCR = NOI / DebtService`
   - Breach: `DSCR < threshold`
   - Example: `threshold = 1.25` means DSCR must be ≥ 1.25

2. **`max_ltv`**: Maximum Loan-to-Value Ratio
   - Formula: `LTV = DebtBalance / PropertyValue`
   - Breach: `LTV > threshold`
   - Example: `threshold = 0.75` means LTV must be ≤ 0.75

3. **`min_cash`**: Minimum Cash Balance
   - Formula: `CashPosition >= threshold`
   - Breach: `CashPosition < threshold`
   - Example: `threshold = 1000000` means cash must be ≥ $1M

**Location**: `src/domain/types.ts`

#### CovenantStatus

**Definition**: Monthly covenant compliance status.

**Type Definition**:
```typescript
/**
 * Monthly covenant compliance status.
 * 
 * Tracks whether each covenant is passed or failed for each month.
 */
export interface CovenantStatus {
  covenantId: string;
  yearIndex: number;
  monthIndex: number;
  monthNumber: number;
  
  // Covenant details
  covenantName: string;
  covenantType: 'min_dscr' | 'max_ltv' | 'min_cash';
  threshold: number;
  
  // Actual values
  actualValue: number;                     // Actual DSCR, LTV, or cash position
  passed: boolean;                         // true if covenant is satisfied
  breachSeverity?: 'warning' | 'critical'; // Optional: severity if breached
}
```

**Location**: `src/domain/types.ts`

### Engine Logic Updates

#### Scenario Engine Updates

**File**: `src/engines/scenario/scenarioEngine.ts`

**Current Implementation**:
- Exports `consolidatedAnnualPnl: ConsolidatedAnnualPnl[]`
- Aggregates annual P&L from all operations

**New Implementation** (v2.2):
- Export `consolidatedMonthlyPnl: ConsolidatedMonthlyPnl[]`
- Aggregate monthly P&L from all operations

**Function Signature Update**:
```typescript
export interface ScenarioEngineResult {
  operations: OperationEngineResult[];
  consolidatedAnnualPnl: ConsolidatedAnnualPnl[];
  consolidatedMonthlyPnl: ConsolidatedMonthlyPnl[];  // NEW: Monthly granularity
}
```

**Implementation Logic**:
1. Collect `MonthlyPnl[]` from all operations
2. For each month (yearIndex, monthIndex):
   - Sum revenue, COGS, OPEX across all operations
   - Calculate USALI structure (GOP, Undistributed Expenses, NOI)
   - Calculate monthly cash flow = NOI - maintenanceCapex
3. Return `ConsolidatedMonthlyPnl[]` sorted by monthNumber

**Backward Compatibility**:
- `consolidatedAnnualPnl` remains unchanged (still exported)
- Monthly P&L is additive (does not break existing annual logic)

#### Capital Engine Updates

**File**: `src/engines/capital/capitalEngine.ts`

**Current Implementation**:
- Generates annual `DebtSchedule` (one entry per year)
- Calculates annual interest and principal

**New Implementation** (v2.2):
- Generate `MonthlyDebtSchedule` (exact monthly interest/principal)
- Calculate monthly debt service per tranche
- Aggregate monthly debt service across all tranches

**Function Signature Update**:
```typescript
export interface CapitalEngineResult {
  debtSchedule: DebtSchedule;                    // Annual (existing)
  monthlyDebtSchedule: MonthlyDebtSchedule;     // NEW: Monthly granularity
  leveredFcfByYear: LeveredFcf[];
  monthlyCashFlow: MonthlyCashFlow[];            // NEW: Monthly cash flow
  ownerLeveredCashFlows: number[];
  debtKpis: DebtKpi[];
  monthlyDebtKpis?: MonthlyDebtKpi[];            // NEW: Monthly DSCR/LTV
  covenantStatus?: CovenantStatus[];              // NEW: Covenant compliance
}
```

**Monthly Debt Schedule Calculation**:

1. **For Each Tranche**:
   - Calculate monthly interest rate: `monthlyRate = annualRate / 12`
   - For mortgage amortization:
     - Calculate monthly payment using amortization formula
     - For each month: `interest = beginningBalance × monthlyRate`
     - `principal = monthlyPayment - interest`
   - For interest-only: `principal = 0`, `interest = beginningBalance × monthlyRate`
   - For bullet: `principal = 0` until maturity, then `principal = fullBalance`

2. **Aggregation**:
   - Sum interest and principal across all active tranches per month
   - Track beginning/ending balances per month

**Monthly Cash Flow Calculation**:
1. Extract monthly NOI from `ConsolidatedMonthlyPnl`
2. Extract monthly debt service from `MonthlyDebtSchedule`
3. Extract monthly capex from `ConsolidatedMonthlyPnl`
4. Calculate: `monthlyCashFlow = noi - monthlyDebtService - monthlyCapex`
5. Track cumulative: `cumulativeCashFlow[month] = cumulativeCashFlow[month-1] + monthlyCashFlow[month]`

**Monthly Debt KPIs**:
```typescript
export interface MonthlyDebtKpi {
  yearIndex: number;
  monthIndex: number;
  monthNumber: number;
  dscr: number | null;  // Monthly DSCR = Monthly NOI / Monthly Debt Service
  ltv: number | null;   // Monthly LTV = Monthly Debt Balance / Initial Investment
}
```

**Covenant Monitoring**:
```typescript
/**
 * Monitors covenant compliance at monthly granularity.
 * 
 * @param monthlyCashFlow - Monthly cash flow data
 * @param monthlyDebtSchedule - Monthly debt schedule
 * @param monthlyDebtKpis - Monthly debt KPIs
 * @param covenants - Covenant definitions
 * @returns Array of covenant status entries (one per covenant per month)
 */
function monitorCovenants(
  monthlyCashFlow: MonthlyCashFlow[],
  monthlyDebtSchedule: MonthlyDebtSchedule,
  monthlyDebtKpis: MonthlyDebtKpi[],
  covenants: Covenant[]
): CovenantStatus[]
```

**Covenant Evaluation Logic**:
- For each covenant and each month:
  - Calculate actual value (DSCR, LTV, or cash position)
  - Compare to threshold
  - Mark as passed/failed
  - Apply grace period if configured

### UI Architecture

#### LiquidityView

**File**: `src/views/LiquidityView.tsx` (NEW)

**Purpose**: Dedicated view for monthly liquidity analysis and covenant monitoring.

**Layout**:
```
LiquidityView
├── View Header
│   ├── Title: "Liquidity & Covenants"
│   └── Description: "Monthly cash flow analysis and covenant monitoring"
├── Cash Position Chart (Section 1)
│   ├── Line Chart: Cumulative Cash Flow over time
│   └── Highlight: Negative cash position (red zone)
├── Covenant Monitor (Section 2)
│   ├── Covenant Status Table
│   │   ├── Columns: Covenant Name | Type | Threshold | Status (Pass/Fail) | Months in Breach
│   │   └── Rows: One per covenant
│   └── Covenant Timeline Chart
│       └── Gantt-style chart showing pass/fail status over time
└── Monthly Table (Section 3)
    ├── Scrollable 60-month view
    ├── Columns: Month | NOI | Debt Service | Capex | Cash Flow | Cumulative | Cash Position | DSCR | LTV
    └── Highlight: Breach months (red background)
```

**Components**:

1. **CashPositionChart** (`src/components/liquidity/CashPositionChart.tsx`):
   - Line chart using `recharts`
   - X-axis: Month (monthNumber or date)
   - Y-axis: Cumulative Cash Flow
   - Highlight negative values (red area)
   - Tooltip: Show monthly cash flow, cumulative, cash position

2. **CovenantMonitor** (`src/components/liquidity/CovenantMonitor.tsx`):
   - Table showing covenant status
   - Color coding: Green (pass), Red (fail), Yellow (warning)
   - Filter: Show all / Show breaches only
   - Sort: By severity, by covenant name

3. **CovenantTimelineChart** (`src/components/liquidity/CovenantTimelineChart.tsx`):
   - Gantt-style chart
   - X-axis: Time (months)
   - Y-axis: Covenants (one row per covenant)
   - Color coding: Green (pass), Red (fail)
   - Tooltip: Show actual value vs threshold

4. **MonthlyLiquidityTable** (`src/components/liquidity/MonthlyLiquidityTable.tsx`):
   - Scrollable table (60 months = 5 years)
   - Columns:
     - Month (e.g., "Year 1, Jan")
     - NOI
     - Debt Service (Interest + Principal)
     - Capex
     - Cash Flow (NOI - Debt Service - Capex)
     - Cumulative Cash Flow
     - Cash Position
     - DSCR
     - LTV
   - Highlight breach months (red background)
   - Sortable columns
   - Export to CSV

**Integration**:
- Add `LiquidityView` to routing in `App.tsx`
- Add navigation item in sidebar: "Liquidity & Covenants"
- Pass `monthlyCashFlow`, `covenantStatus`, `monthlyDebtKpis` as props

**Data Flow**:
```typescript
// In App.tsx or parent component
const fullModelOutput = runFullModel(modelInput);

// Extract monthly data
const monthlyCashFlow = fullModelOutput.capital.monthlyCashFlow;
const covenantStatus = fullModelOutput.capital.covenantStatus;
const monthlyDebtKpis = fullModelOutput.capital.monthlyDebtKpis;

// Pass to LiquidityView
<LiquidityView
  monthlyCashFlow={monthlyCashFlow}
  covenantStatus={covenantStatus}
  monthlyDebtKpis={monthlyDebtKpis}
  covenants={modelInput.capitalConfig.covenants}
/>
```

### Type Definitions Summary

**New Types** (in `src/domain/types.ts`):
1. `ConsolidatedMonthlyPnl` - Monthly aggregated P&L
2. `MonthlyCashFlow` - Monthly cash flow after debt service
3. `MonthlyDebtScheduleEntry` - Monthly debt schedule entry
4. `MonthlyDebtSchedule` - Complete monthly debt schedule
5. `MonthlyDebtKpi` - Monthly DSCR/LTV
6. `Covenant` - Covenant definition
7. `CovenantStatus` - Monthly covenant compliance status

**Updated Types**:
1. `ScenarioEngineResult` - Add `consolidatedMonthlyPnl`
2. `CapitalEngineResult` - Add `monthlyDebtSchedule`, `monthlyCashFlow`, `monthlyDebtKpis`, `covenantStatus`
3. `CapitalStructureConfig` - Add optional `covenants: Covenant[]`

### v2.2 Agent Responsibilities

#### Core Logic Agent

**Primary Files**:
- `src/domain/types.ts` - Type definitions
- `src/engines/scenario/scenarioEngine.ts` - Monthly P&L aggregation

**Tasks**:
1. Add `ConsolidatedMonthlyPnl` interface to `types.ts`
2. Update `ScenarioEngineResult` to include `consolidatedMonthlyPnl`
3. Implement monthly P&L aggregation in `runScenarioEngine()`:
   - Collect `MonthlyPnl[]` from all operations
   - Aggregate by month (yearIndex, monthIndex)
   - Calculate USALI structure (GOP, NOI)
   - Return `ConsolidatedMonthlyPnl[]`
4. Add tests for monthly aggregation:
   - Test aggregation across multiple operations
   - Test month ordering (monthNumber)
   - Test USALI calculations match annual structure

#### Quant Agent

**Primary Files**:
- `src/engines/capital/capitalEngine.ts` - Monthly debt schedule and cash flow
- `src/domain/types.ts` - Debt and covenant types

**Tasks**:
1. Add monthly debt schedule types:
   - `MonthlyDebtScheduleEntry`
   - `MonthlyDebtSchedule`
   - `MonthlyDebtKpi`
2. Implement monthly debt schedule calculation:
   - Calculate monthly interest/principal per tranche
   - Handle different amortization types (mortgage, interest-only, bullet)
   - Aggregate across tranches
3. Implement monthly cash flow calculation:
   - Extract monthly NOI from `ConsolidatedMonthlyPnl`
   - Extract monthly debt service from `MonthlyDebtSchedule`
   - Calculate monthly cash flow and cumulative
4. Add covenant types:
   - `Covenant` interface
   - `CovenantStatus` interface
5. Implement covenant monitoring:
   - Evaluate DSCR, LTV, minimum cash covenants
   - Track breach status per month
6. Update `CapitalEngineResult` to include monthly data
7. Add tests:
   - Monthly debt schedule accuracy (compare to annual)
   - Monthly cash flow calculations
   - Covenant evaluation logic

#### UI Agent

**Primary Files**:
- `src/views/LiquidityView.tsx` - Main liquidity view
- `src/components/liquidity/*` - Liquidity components

**Tasks**:
1. Create `LiquidityView` component:
   - Layout with three sections (Chart, Monitor, Table)
   - Integrate with routing
2. Create `CashPositionChart` component:
   - Line chart of cumulative cash flow
   - Highlight negative values
3. Create `CovenantMonitor` component:
   - Table of covenant status
   - Filter and sort functionality
4. Create `CovenantTimelineChart` component:
   - Gantt-style chart
   - Color coding for pass/fail
5. Create `MonthlyLiquidityTable` component:
   - Scrollable 60-month table
   - Highlight breach months
   - Export functionality
6. Add navigation item in sidebar
7. Integrate with `runFullModel` output

#### QA Agent

**Primary Files**:
- `src/tests/engines/scenario/*` - Scenario engine tests
- `src/tests/engines/capital/*` - Capital engine tests

**Tasks**:
1. Test monthly P&L aggregation:
   - Multiple operations aggregation
   - Month ordering
   - USALI structure consistency
2. Test monthly debt schedule:
   - Mortgage amortization accuracy
   - Interest-only accuracy
   - Bullet payment accuracy
   - Multi-tranche aggregation
3. Test monthly cash flow:
   - Calculation accuracy
   - Cumulative tracking
   - Edge cases (negative cash flow)
4. Test covenant monitoring:
   - DSCR covenant evaluation
   - LTV covenant evaluation
   - Minimum cash covenant evaluation
   - Grace period logic

#### Education Agent

**Primary Files**:
- `docs/ARCHITECTURE.md` - This document (already updated)

**Tasks**:
1. ✅ Update ARCHITECTURE.md with v2.2 specifications (this section)
2. Update user guide with liquidity analysis instructions
3. Document covenant configuration best practices

### What v2.2 Explicitly Does NOT Do

1. **No Working Capital Modeling**:
   - Cash position assumes no working capital changes
   - Accounts receivable/payable deferred to v2.3+

2. **No Cash Reserves or Revolvers**:
   - No credit facilities or cash reserves
   - Deferred to v2.3+

3. **No Covenant Cure Mechanisms**:
   - Grace periods are tracked but no automatic cure logic
   - Deferred to v2.3+

4. **No Multi-Currency**:
   - All calculations in single currency
   - Deferred to future versions

### Testing Strategy

**Unit Tests**:
- Monthly debt schedule calculation accuracy
- Monthly cash flow calculations
- Covenant evaluation logic

**Integration Tests**:
- End-to-end monthly pipeline (operations → scenario → capital)
- Monthly data consistency (monthly sums = annual totals)
- Covenant monitoring across full horizon

**Visual Tests**:
- Charts render correctly
- Table scrolling and highlighting work
- Covenant status colors are correct

### Performance Considerations

**Monthly Data Volume**:
- 5-year horizon = 60 months
- Multiple operations × 60 months = manageable data size
- Charts and tables should handle 60-120 months efficiently

**Calculation Performance**:
- Monthly debt schedule: O(tranches × months) - acceptable
- Monthly P&L aggregation: O(operations × months) - acceptable
- Covenant monitoring: O(covenants × months) - acceptable

### Migration Path

**Backward Compatibility**:
- Annual data structures remain unchanged
- Monthly data is additive (does not break existing logic)
- Existing views continue to work with annual data

**Default Behavior**:
- If no covenants defined, covenant monitoring is skipped
- Monthly calculations are always performed (required for liquidity view)

---

## v2.3 – Goal Seek (Optimization)

**Status**: ✅ Implemented

**Focus**: Inverse Solver - Find input values that achieve target KPIs

**Context**: We are completing the v2.x "Financial Depth" series with an inverse solver. Users want to target specific KPIs (e.g., IRR = 20%) and find the required input values (e.g., ADR). This requires an iterative solver algorithm running on the client side.

### Overview

**Problem Statement**:
- Users want to achieve specific target KPIs (e.g., IRR = 20%, NPV = $10M)
- Current system requires manual trial-and-error to find required input values
- No systematic way to determine what input changes are needed to hit targets
- Time-consuming and error-prone manual process

**Solution**:
- Implement Binary Search algorithm for monotonic functions (IRR vs ADR, NPV vs Occupancy)
- Allow users to specify target metric (IRR, NPV) and input variable (ADR, Occupancy, CapEx)
- Automatically solve for the required input value that achieves the target
- Provide UI to configure goal seek and apply results back to scenario

### Solver Architecture

#### Binary Search Algorithm

**Algorithm**: Binary Search for finding root of monotonic functions

**Use Case**: For most financial relationships (IRR vs ADR, NPV vs Occupancy), the relationship is monotonic (increasing or decreasing). Binary search is robust, simple, and efficient.

**Mathematical Foundation**:
- Given function f(x) where x is input variable and f(x) is target metric
- Find x* such that f(x*) = targetValue
- For monotonic f(x), binary search efficiently narrows search range

**Implementation**:
```typescript
/**
 * Binary search solver for goal seek optimization.
 * 
 * Finds input value that achieves target metric value.
 * Assumes monotonic relationship between input and metric.
 * 
 * @param config - Goal seek configuration
 * @param baseScenario - Base scenario to modify
 * @returns Optimized value and convergence information
 */
function goalSeekBinarySearch(
  config: GoalSeekConfig,
  baseScenario: NamedScenario
): GoalSeekResult
```

**Algorithm Steps**:
1. Define search range [minValue, maxValue] for input variable
2. For each iteration:
   - Calculate midpoint: `mid = (minValue + maxValue) / 2`
   - Modify scenario with `mid` as input value
   - Run full model pipeline
   - Extract target metric value
   - Compare to targetValue
   - Update search range based on comparison
3. Continue until convergence or max iterations

**Convergence Criteria**:
- Absolute error: `|f(x) - targetValue| < tolerance`
- Relative error: `|f(x) - targetValue| / |targetValue| < tolerance`
- Maximum iterations: Prevent infinite loops

**Search Range**:
- Default range: Based on input variable type
  - ADR: [currentValue × 0.5, currentValue × 2.0]
  - Occupancy: [0.3, 1.0] (30% to 100%)
  - CapEx: [currentValue × 0.1, currentValue × 3.0]
- User-configurable: Allow override of default range

### Type Definitions

#### TargetMetric

**Definition**: Target metric to optimize for (IRR, NPV, etc.)

**Type Definition**:
```typescript
/**
 * Target metric for goal seek optimization.
 * 
 * Specifies which KPI should be optimized to hit target value.
 */
export type TargetMetric =
  | 'irr'                  // Internal Rate of Return (unlevered)
  | 'leveredIrr'          // Levered IRR (partner IRR)
  | 'npv'                 // Net Present Value
  | 'equityMultiple'      // Equity Multiple (MOIC)
  | 'moic';               // Multiple on Invested Capital (partner MOIC)

/**
 * Human-readable labels for target metrics.
 */
export const TARGET_METRIC_LABELS: Record<TargetMetric, string> = {
  irr: 'Unlevered IRR',
  leveredIrr: 'Levered IRR',
  npv: 'NPV',
  equityMultiple: 'Equity Multiple',
  moic: 'MOIC',
};
```

**Location**: `src/domain/types.ts`

#### InputVariable

**Definition**: Input variable to modify (ADR, Occupancy, CapEx, etc.)

**Type Definition**:
```typescript
/**
 * Input variable for goal seek optimization.
 * 
 * Specifies which input should be adjusted to achieve target metric.
 */
export type InputVariable =
  | 'adr'                 // Average Daily Rate (for hotel/villa operations)
  | 'occupancy'           // Occupancy rate (for lodging operations)
  | 'discountRate'        // Discount rate (project config)
  | 'initialInvestment'   // Initial investment (project config)
  | 'debtAmount'          // Debt amount (capital config)
  | 'interestRate'        // Interest rate (capital config)
  | 'terminalGrowthRate'; // Terminal growth rate (project config)

/**
 * Human-readable labels for input variables.
 */
export const INPUT_VARIABLE_LABELS: Record<InputVariable, string> = {
  adr: 'ADR',
  occupancy: 'Occupancy',
  discountRate: 'Discount Rate',
  initialInvestment: 'Initial Investment',
  debtAmount: 'Debt Amount',
  interestRate: 'Interest Rate',
  terminalGrowthRate: 'Terminal Growth Rate',
};

/**
 * Metadata for input variables (default ranges, units, etc.)
 */
export interface InputVariableMetadata {
  variable: InputVariable;
  label: string;
  unit: string;            // e.g., "$", "%", "number"
  defaultMin: number;      // Default minimum for search range
  defaultMax: number;      // Default maximum for search range
  getCurrentValue: (scenario: NamedScenario) => number;  // Extract current value from scenario
  setValue: (scenario: NamedScenario, value: number) => void;  // Set value in scenario
}
```

**Location**: `src/domain/types.ts`

#### GoalSeekConfig

**Definition**: Goal seek configuration (target metric, input variable, target value)

**Type Definition**:
```typescript
/**
 * Goal seek configuration.
 * 
 * Specifies what to optimize and how.
 */
export interface GoalSeekConfig {
  targetMetric: TargetMetric;        // What KPI to target
  inputVariable: InputVariable;      // What input to adjust
  targetValue: number;               // Target value for metric
  searchRange?: {                     // Optional: override default search range
    min: number;
    max: number;
  };
  tolerance?: number;                // Optional: convergence tolerance (default: 1e-4)
  maxIterations?: number;            // Optional: max iterations (default: 50)
  operationId?: string;              // Optional: specific operation (for ADR, occupancy)
}
```

**Location**: `src/domain/types.ts`

#### GoalSeekResult

**Definition**: Goal seek result (optimized value, convergence info)

**Type Definition**:
```typescript
/**
 * Goal seek result.
 * 
 * Contains optimized input value and convergence information.
 */
export interface GoalSeekResult {
  success: boolean;                  // Whether goal seek converged
  optimizedValue: number | null;     // Required input value (null if failed)
  targetMetric: TargetMetric;
  inputVariable: InputVariable;
  targetValue: number;
  actualValue: number | null;        // Actual metric value at optimized input (null if failed)
  error: number | null;              // Difference between target and actual (null if failed)
  iterations: number;                // Number of iterations performed
  convergenceMessage: string;        // Human-readable message
  searchRange: {                     // Search range used
    min: number;
    max: number;
  };
  finalModelOutput?: FullModelOutput; // Optional: full model output at optimized value
}
```

**Location**: `src/domain/types.ts`

### Engine Logic

#### Goal Seek Engine

**File**: `src/engines/analysis/goalSeekEngine.ts` (NEW)

**Function**: `runGoalSeek()`

**Signature**:
```typescript
/**
 * Runs goal seek optimization to find input value that achieves target metric.
 * 
 * @param config - Goal seek configuration
 * @param baseScenario - Base scenario to modify
 * @returns Goal seek result with optimized value
 */
export function runGoalSeek(
  config: GoalSeekConfig,
  baseScenario: NamedScenario
): GoalSeekResult
```

**Algorithm**:
1. **Initialize Search Range**:
   - Use config.searchRange if provided
   - Otherwise use default range from `InputVariableMetadata`
   - Validate range (min < max, reasonable bounds)

2. **Binary Search Loop**:
   ```typescript
   let min = searchRange.min;
   let max = searchRange.max;
   let iterations = 0;
   
   while (iterations < maxIterations) {
     const mid = (min + max) / 2;
     
     // Modify scenario with mid value
     const modifiedScenario = cloneScenario(baseScenario);
     setInputValue(modifiedScenario, config.inputVariable, mid);
     
     // Run full model
     const output = runFullModel(modifiedScenario.modelConfig);
     
     // Extract target metric value
     const actualValue = extractMetricValue(output, config.targetMetric);
     
     // Check convergence
     const error = Math.abs(actualValue - config.targetValue);
     if (error < tolerance) {
       return successResult(mid, actualValue, error, iterations);
     }
     
     // Update search range
     if (actualValue < config.targetValue) {
       // Need higher input value
       min = mid;
     } else {
       // Need lower input value
       max = mid;
     }
     
     iterations++;
   }
   
   // Did not converge
   return failureResult(iterations, searchRange);
   ```

3. **Extract Metric Value**:
   - Map `targetMetric` to output field:
     - `irr` → `projectKpis.unleveredIrr`
     - `leveredIrr` → `waterfall.partners[0].irr`
     - `npv` → `projectKpis.npv`
     - `equityMultiple` → `projectKpis.equityMultiple`
     - `moic` → `waterfall.partners[0].moic`

4. **Set Input Value**:
   - Map `inputVariable` to scenario field:
     - `adr` → `scenario.operations[operationIndex].avgDailyRate`
     - `occupancy` → `scenario.operations[operationIndex].occupancyByMonth` (apply to all months)
     - `discountRate` → `projectConfig.discountRate`
     - `initialInvestment` → `projectConfig.initialInvestment`
     - `debtAmount` → `capitalConfig.debtTranches[0].initialPrincipal`
     - `interestRate` → `capitalConfig.debtTranches[0].interestRate`
     - `terminalGrowthRate` → `projectConfig.terminalGrowthRate`

**Error Handling**:
- Invalid search range (min >= max)
- Metric value not found (null/undefined)
- Non-monotonic relationship detected (same sign at both ends)
- Convergence failure (max iterations reached)

**Performance Considerations**:
- Each iteration runs full model pipeline (expensive)
- Binary search typically requires 10-20 iterations (acceptable)
- Consider caching base scenario calculations where possible
- Progress reporting for long-running solves

### UI Architecture

#### GoalSeekPanel

**File**: `src/components/analysis/GoalSeekPanel.tsx` (NEW)

**Location**: `AnalysisView` or dedicated Modal

**Layout**:
```
GoalSeekPanel
├── Header
│   ├── Title: "Goal Seek"
│   └── Description: "Find input value to achieve target KPI"
├── Configuration Form
│   ├── Target Metric Dropdown
│   │   └── Options: IRR, Levered IRR, NPV, Equity Multiple, MOIC
│   ├── Target Value Input
│   │   └── Number input with unit label
│   ├── Input Variable Dropdown
│   │   └── Options: ADR, Occupancy, Discount Rate, Initial Investment, etc.
│   ├── Operation Selector (if applicable)
│   │   └── Dropdown for ADR/Occupancy (select which operation)
│   └── Search Range (Advanced, collapsible)
│       ├── Min Value Input
│       └── Max Value Input
├── Actions
│   ├── "Run Goal Seek" Button
│   └── "Cancel" Button
└── Results Section (shown after solve)
    ├── Success Message
    │   ├── "Required [Input Variable]: [Optimized Value]"
    │   └── "Actual [Target Metric]: [Actual Value]"
    ├── Convergence Info
    │   ├── Iterations: [count]
    │   └── Error: [difference]
    └── Actions
        ├── "Apply to Scenario" Button
        └── "Run Again" Button
```

**Props**:
```typescript
interface GoalSeekPanelProps {
  baseScenario: NamedScenario;
  currentModelOutput: FullModelOutput | null;
  onApplyResult: (optimizedValue: number, inputVariable: InputVariable) => void;
}
```

**State Management**:
```typescript
const [targetMetric, setTargetMetric] = useState<TargetMetric>('irr');
const [inputVariable, setInputVariable] = useState<InputVariable>('adr');
const [targetValue, setTargetValue] = useState<string>('');
const [operationId, setOperationId] = useState<string | undefined>(undefined);
const [searchRange, setSearchRange] = useState<{ min: number; max: number } | undefined>(undefined);
const [isRunning, setIsRunning] = useState(false);
const [result, setResult] = useState<GoalSeekResult | null>(null);
```

**Features**:
1. **Target Metric Selection**:
   - Dropdown with all available metrics
   - Show current value next to each option (e.g., "IRR (Current: 18.5%)")
   - Update target value input unit based on metric

2. **Input Variable Selection**:
   - Dropdown with all available variables
   - Show current value next to each option
   - Show operation selector if variable is operation-specific (ADR, Occupancy)

3. **Target Value Input**:
   - Number input with validation
   - Show unit label (%, $, etc.)
   - Validate against reasonable bounds

4. **Search Range (Advanced)**:
   - Collapsible section
   - Default range pre-populated based on input variable
   - Allow override for custom range

5. **Run Goal Seek**:
   - Validate inputs (target value, range)
   - Show loading state during solve
   - Display progress (iteration count, current error)
   - Handle errors gracefully

6. **Results Display**:
   - Show success/failure message
   - Display optimized value with unit
   - Show convergence info (iterations, error)
   - "Apply to Scenario" button (modifies scenario with optimized value)

**Styling**:
- Use existing card styling from project
- Clear form layout with labels
- Highlight results section
- Loading spinner during solve

### Integration with AnalysisView

**File**: `src/views/AnalysisView.tsx`

**Updates**:
- Add `GoalSeekPanel` component
- Pass base scenario and current model output as props
- Handle "Apply to Scenario" action (update scenario state)

**Layout**:
```
AnalysisView
├── View Header
├── GoalSeekPanel (Section 1)
├── SensitivityPanel (Section 2, existing)
└── SimulationPanel (Section 3, existing or future)
```

### v2.3 Agent Responsibilities

#### Quant Agent

**Primary Files**:
- `src/engines/analysis/goalSeekEngine.ts` - Goal seek solver
- `src/domain/types.ts` - Type definitions

**Tasks**:
1. Implement `runGoalSeek()` function:
   - Binary search algorithm
   - Scenario modification logic
   - Metric extraction logic
   - Convergence checking
   - Error handling

2. Implement helper functions:
   - `extractMetricValue()` - Extract metric from model output
   - `setInputValue()` - Modify scenario with input value
   - `getSearchRange()` - Get default search range for variable
   - `cloneScenario()` - Deep clone scenario for modification

3. Add type definitions:
   - `TargetMetric` type
   - `InputVariable` type
   - `GoalSeekConfig` interface
   - `GoalSeekResult` interface
   - `InputVariableMetadata` interface

4. Add tests:
   - Binary search accuracy
   - Convergence detection
   - Error handling (invalid range, non-monotonic)
   - Performance (iteration count)

#### Core Logic Agent

**Primary Files**:
- `src/domain/types.ts` - Type definitions
- `src/domain/helpers/goalSeekHelpers.ts` - Helper functions (if needed)

**Tasks**:
1. Ensure type definitions align with domain types
2. Support scenario modification functions
3. Validate input variable metadata

#### UI Agent

**Primary Files**:
- `src/components/analysis/GoalSeekPanel.tsx` - Goal seek panel component
- `src/views/AnalysisView.tsx` - Integration with analysis view

**Tasks**:
1. Create `GoalSeekPanel` component:
   - Configuration form
   - Results display
   - Loading states
   - Error handling

2. Integrate into `AnalysisView`:
   - Add panel to view
   - Pass props correctly
   - Handle "Apply to Scenario" action

3. Add helper components:
   - `TargetMetricSelector` - Dropdown for metric selection
   - `InputVariableSelector` - Dropdown for variable selection
   - `OperationSelector` - Dropdown for operation selection (if needed)
   - `GoalSeekResults` - Results display component

#### QA Agent

**Primary Files**:
- `src/tests/engines/analysis/goalSeekEngine.test.ts` - Goal seek tests

**Tasks**:
1. Test binary search algorithm:
   - Convergence accuracy
   - Iteration count
   - Edge cases (exact match, boundary values)

2. Test metric extraction:
   - All metric types (IRR, NPV, etc.)
   - Null/undefined handling
   - Waterfall metrics (levered IRR, MOIC)

3. Test input variable setting:
   - All variable types
   - Operation-specific variables
   - Validation (bounds checking)

4. Test error handling:
   - Invalid search range
   - Non-monotonic relationship
   - Convergence failure

#### Education Agent

**Primary Files**:
- `docs/ARCHITECTURE.md` - This document (already updated)

**Tasks**:
1. ✅ Update ARCHITECTURE.md with v2.3 specifications (this section)
2. Update user guide with goal seek instructions
3. Document best practices for search ranges

### What v2.3 Explicitly Does NOT Do

1. **No Multi-Variable Optimization**:
   - Only optimizes single input variable
   - Multi-variable optimization deferred to v3.0+

2. **No Advanced Solvers**:
   - Only Binary Search for monotonic functions
   - Newton-Raphson, gradient descent deferred to v3.0+

3. **No Constraint Handling**:
   - No constraints on input variables
   - Constraint optimization deferred to v3.0+

4. **No Multi-Objective Optimization**:
   - Only single target metric
   - Pareto frontier analysis deferred to v3.0+

### Testing Strategy

**Unit Tests**:
- Binary search algorithm accuracy
- Metric extraction correctness
- Input variable setting correctness
- Convergence detection

**Integration Tests**:
- End-to-end goal seek (scenario → solve → result)
- Scenario modification and re-run
- Multiple target metrics
- Multiple input variables

**Performance Tests**:
- Iteration count (should be < 20 for most cases)
- Solve time (should be < 5 seconds for typical scenarios)

### Performance Considerations

**Binary Search Efficiency**:
- O(log n) complexity where n is search range precision
- Typically converges in 10-20 iterations
- Each iteration runs full model pipeline (most expensive part)

**Optimization Opportunities**:
- Cache base scenario calculations where possible
- Skip unnecessary calculations in modified scenario
- Progress reporting for user feedback

**Limitations**:
- Client-side only (runs in browser)
- May be slow for complex scenarios (> 5 years, many operations)
- Consider Web Workers for very complex solves (future enhancement)

### Migration Path

**Backward Compatibility**:
- Goal seek is additive feature (does not modify existing logic)
- Existing views continue to work without changes
- Optional feature (users can choose to use it)

**Default Behavior**:
- Goal seek panel is opt-in (users must explicitly use it)
- Default search ranges are conservative (reasonable bounds)
- Users can override ranges if needed

## v2.6 – Interactive Scenarios & Inputs

**Status**: ⏳ **In Progress** (Planning Phase)

**Focus**: Merge "Interactive Inputs" with "Scenario Analysis" to create a visual "Control Center" where users drag sliders to stress-test the model and see Base vs Stress vs Upside outcomes side-by-side.

**Overview**: This milestone combines interactive input controls (sliders) with scenario analysis capabilities. Users can dynamically adjust stress factors using percentage sliders and immediately see the impact across three scenarios: Base (current), Stress (downside), and Upside (optimistic). This creates an intuitive, real-time stress-testing interface.

### Core Concept: Scenario Triad Architecture

**Principle**: Provide a unified interface where users can visually adjust stress factors and immediately compare Base, Stress, and Upside scenarios side-by-side.

**Design Philosophy**:
- **Real-Time Feedback**: Scenario calculations update immediately as sliders move
- **Visual Control Center**: Top section with controls (sliders, toggles), bottom section with results (scenario cards)
- **Simple Multipliers**: Stress factors are straightforward percentage multipliers (e.g., `revenueAdjustment: 0.9` for 10% stress)
- **Side-by-Side Comparison**: Three scenario cards displayed simultaneously for easy comparison

### Type Definitions

**Location**: `src/domain/types.ts`

**New Types**:
```typescript
/**
 * Stress factors that apply multipliers to base scenario inputs.
 * Simple percentage-based adjustments for scenario stress testing.
 * 
 * @property revenueAdjustment - Multiplier for revenue (0.9 = 10% stress, 1.1 = 10% upside)
 * @property occupancyAdjustment - Multiplier for occupancy rates (0-1 range)
 * @property adrAdjustment - Multiplier for average daily rates
 * @property opexAdjustment - Multiplier for operating expenses
 * @property interestRateAdjustment - Multiplier for interest rates
 */
export interface StressFactors {
  revenueAdjustment?: number;        // Default: 1.0 (no adjustment)
  occupancyAdjustment?: number;      // Default: 1.0
  adrAdjustment?: number;            // Default: 1.0
  opexAdjustment?: number;           // Default: 1.0
  interestRateAdjustment?: number;   // Default: 1.0
}

/**
 * Result of running scenario triad analysis.
 * Contains three scenarios: Base (unchanged), Stress (downside), and Upside (optimistic).
 * 
 * @property base - Base scenario output (unchanged from input)
 * @property stress - Stress scenario output (applied stress factors)
 * @property upside - Upside scenario output (inverse of stress factors, or user-defined)
 */
export interface ScenarioTriadResult {
  base: FullModelOutput;
  stress: FullModelOutput;
  upside: FullModelOutput;
  stressFactors: StressFactors;
  kpis: {
    base: ProjectKpis;
    stress: ProjectKpis;
    upside: ProjectKpis;
  };
}

/**
 * Configuration for scenario triad analysis.
 * 
 * @property baseInput - Base scenario input configuration
 * @property stressFactors - Stress factors to apply (multipliers)
 * @property generateUpside - If true, generate upside automatically (inverse of stress). If false, use custom upside factors.
 * @property upsideFactors - Optional custom upside factors (if generateUpside is false)
 */
export interface ScenarioTriadConfig {
  baseInput: FullModelInput;
  stressFactors: StressFactors;
  generateUpside?: boolean;          // Default: true (automatic inverse of stress)
  upsideFactors?: StressFactors;     // Required if generateUpside is false
}

/**
 * Business model type for scenario analysis.
 * Determines which operations or parameters are adjusted when stress factors change.
 */
export type BusinessModelType =
  | 'ALL_OPERATIONS'      // Apply factors to all operations equally
  | 'LODGING_ONLY'        // Apply only to HOTEL and VILLAS
  | 'F&B_ONLY'            // Apply only to RESTAURANT and BEACH_CLUB
  | 'REVENUE_DRIVEN'      // Focus on revenue adjustments (revenue, occupancy, ADR)
  | 'COST_DRIVEN';        // Focus on cost adjustments (OPEX, interest rates)
```

**Update Existing Types**:
- No changes to `FullModelInput` or `FullModelOutput` (scenario triad uses existing types)
- `StressFactors` is a new standalone type for scenario adjustments

### Logic Architecture: Scenario Engine Helper

**Location**: `src/engines/scenario/scenarioTriadEngine.ts` (NEW)

**Purpose**: Central helper function that runs scenario triad analysis (Base, Stress, Upside).

**Key Function**:
```typescript
/**
 * Runs scenario triad analysis: generates Base, Stress, and Upside scenarios.
 * 
 * Algorithm:
 * 1. Base: Use baseInput as-is (no modifications)
 * 2. Stress: Apply stressFactors as multipliers to baseInput
 * 3. Upside: Apply inverse of stressFactors (or custom upsideFactors)
 * 
 * For each scenario:
 * - Clone baseInput (deep clone)
 * - Apply multipliers to relevant fields
 * - Run full model pipeline
 * - Return FullModelOutput
 * 
 * @param baseInput - Base scenario input configuration
 * @param stressFactors - Stress factors (multipliers) to apply
 * @param config - Optional configuration for upside generation
 * @returns ScenarioTriadResult with Base, Stress, and Upside outputs and KPIs
 */
export function runScenarioTriad(
  baseInput: FullModelInput,
  stressFactors: StressFactors,
  config?: {
    generateUpside?: boolean;
    upsideFactors?: StressFactors;
    businessModelType?: BusinessModelType;
  }
): ScenarioTriadResult
```

**Implementation Details**:

1. **Base Scenario**:
   - Use `baseInput` directly (no modifications)
   - Run `runFullModel(baseInput)` to get base output

2. **Stress Scenario**:
   - Deep clone `baseInput` → `stressInput`
   - Apply multipliers to relevant fields:
     - `revenueAdjustment`: Multiply all operation revenue drivers (occupancy, ADR, rates)
     - `occupancyAdjustment`: Multiply occupancy arrays for all operations
     - `adrAdjustment`: Multiply ADR/rates for all operations
     - `opexAdjustment`: Multiply OPEX percentages for all operations
     - `interestRateAdjustment`: Multiply interest rates in capitalConfig.debtTranches
   - Run `runFullModel(stressInput)` to get stress output

3. **Upside Scenario**:
   - If `generateUpside === true` (default):
     - Generate inverse multipliers: `upsideFactors.revenueAdjustment = 2.0 - stressFactors.revenueAdjustment`
     - Example: If stress is 0.9 (10% down), upside is 1.1 (10% up)
   - If `generateUpside === false`:
     - Use custom `upsideFactors` from config
   - Deep clone `baseInput` → `upsideInput`
   - Apply upside multipliers (same logic as stress)
   - Run `runFullModel(upsideInput)` to get upside output

4. **KPI Extraction**:
   - Extract `ProjectKpis` from each scenario output
   - Return KPIs in structured format for easy comparison

**Helper Functions**:
```typescript
/**
 * Applies stress factors to a model input (mutates input).
 * 
 * @param input - Model input to modify (will be mutated)
 * @param stressFactors - Stress factors to apply
 * @param businessModelType - Business model type (determines which operations to adjust)
 */
function applyStressFactors(
  input: FullModelInput,
  stressFactors: StressFactors,
  businessModelType: BusinessModelType = 'ALL_OPERATIONS'
): void

/**
 * Deep clones a FullModelInput.
 * 
 * @param input - Input to clone
 * @returns Deep-cloned copy of input
 */
function cloneModelInput(input: FullModelInput): FullModelInput

/**
 * Extracts Project KPIs from a FullModelOutput.
 * 
 * @param output - Model output
 * @returns ProjectKpis from output
 */
function extractProjectKpis(output: FullModelOutput): ProjectKpis
```

**Business Model Type Logic**:
- **ALL_OPERATIONS**: Apply factors to all operations equally
- **LODGING_ONLY**: Apply only to operations with `operationType === 'HOTEL' | 'VILLAS'`
- **F&B_ONLY**: Apply only to operations with `operationType === 'RESTAURANT' | 'BEACH_CLUB'`
- **REVENUE_DRIVEN**: Apply `revenueAdjustment`, `occupancyAdjustment`, `adrAdjustment` only
- **COST_DRIVEN**: Apply `opexAdjustment`, `interestRateAdjustment` only

**Performance Considerations**:
- Scenario triad runs three full model pipelines (base, stress, upside)
- Use memoization if sliders update frequently (cache base scenario results)
- Consider debouncing slider updates (don't recalculate on every pixel movement)
- Run calculations asynchronously if UI blocking becomes an issue

### UI Architecture: AnalysisView

**Location**: `src/views/AnalysisView.tsx` (UPDATE EXISTING)

**Current State**: Placeholder view with minimal content.

**Target State**: Two-section layout with interactive controls and scenario comparison cards.

**Layout Structure**:
```
AnalysisView
├── View Header
│   ├── Title: "Interactive Scenarios & Stress Testing"
│   └── Description: "Drag sliders to stress-test your model and compare scenarios side-by-side"
├── Section 1: Assumptions Control (Top)
│   ├── SectionCard: "Assumptions Control"
│   │   ├── Business Model ToggleGroup
│   │   │   └── Options: All Operations | Lodging Only | F&B Only | Revenue Driven | Cost Driven
│   │   ├── PercentageSlider: "Stress Level"
│   │   │   ├── Range: -50% to +50% (default: ±10%)
│   │   │   ├── Dual Control: Range slider + Number input
│   │   │   └── Label: "Stress Level: ±X%"
│   │   └── (Future: Individual factor sliders for advanced users)
│   └── Quick Actions
│       ├── "Reset to Base" Button
│       └── "Apply to Scenario" Button (saves stress as new scenario)
└── Section 2: Scenario Triad (Bottom)
    ├── ScenarioCard: "Stress Scenario" (Red header)
    │   ├── Header: "🔴 Stress Scenario" (red background)
    │   ├── KPI Grid
    │   │   ├── NPV: $X.XM (red if negative)
    │   │   ├── IRR: X.X% (red if below threshold)
    │   │   ├── Equity Multiple: X.Xx
    │   │   └── MOIC: X.Xx
    │   └── Delta vs Base (e.g., "-15.2% vs Base")
    ├── ScenarioCard: "Base Scenario" (Gray header)
    │   ├── Header: "⚪ Base Scenario" (gray background)
    │   ├── KPI Grid (same as above)
    │   └── (No delta, this is the reference)
    └── ScenarioCard: "Upside Scenario" (Green header)
        ├── Header: "🟢 Upside Scenario" (green background)
        ├── KPI Grid (same as above)
        └── Delta vs Base (e.g., "+18.7% vs Base")
```

**State Management**:
```typescript
// State for stress level slider (-0.5 to +0.5, representing -50% to +50%)
const [stressLevel, setStressLevel] = useState<number>(0.10); // Default: 10% stress

// State for business model type
const [businessModelType, setBusinessModelType] = useState<BusinessModelType>('ALL_OPERATIONS');

// Computed stress factors from stress level
const stressFactors = useMemo<StressFactors>(() => {
  const multiplier = 1.0 - stressLevel; // 10% stress = 0.9 multiplier
  return {
    revenueAdjustment: multiplier,
    occupancyAdjustment: multiplier,
    adrAdjustment: multiplier,
    opexAdjustment: 1.0 + stressLevel, // OPEX increases in stress (1.1 for 10% stress)
    interestRateAdjustment: 1.0 + (stressLevel * 0.5), // Interest rate increases less (1.05 for 10% stress)
  };
}, [stressLevel]);

// State for scenario triad results
const [triadResult, setTriadResult] = useState<ScenarioTriadResult | null>(null);
const [isLoading, setIsLoading] = useState(false);

// Run scenario triad when stress factors change (debounced)
useEffect(() => {
  const timer = setTimeout(() => {
    setIsLoading(true);
    try {
      const result = runScenarioTriad(baseInput, stressFactors, {
        businessModelType,
        generateUpside: true,
      });
      setTriadResult(result);
    } catch (error) {
      console.error('Error running scenario triad:', error);
      // Handle error (show error message to user)
    } finally {
      setIsLoading(false);
    }
  }, 300); // 300ms debounce

  return () => clearTimeout(timer);
}, [baseInput, stressFactors, businessModelType]);
```

**Props**:
```typescript
interface AnalysisViewProps {
  input: FullModelInput;              // Base input (current scenario)
  baseOutput: FullModelOutput | null; // Pre-computed base output (optional, for performance)
  onUpdateInput?: (input: FullModelInput) => void; // Callback when user wants to save stress as new scenario
}
```

**Integration Points**:
- Uses `runScenarioTriad()` from `scenarioTriadEngine.ts`
- Uses `PercentageSlider`, `ToggleGroup`, `ScenarioCard` components
- Uses `SectionCard` for layout (existing component)
- Passes `input` from parent (App.tsx or ScenarioView)

### Component Specifications

#### 1. PercentageSlider Component

**Location**: `src/components/ui/PercentageSlider.tsx` (NEW)

**Purpose**: Dual control slider with range slider and number input for percentage values.

**Props**:
```typescript
interface PercentageSliderProps {
  value: number;                      // Current value (-0.5 to +0.5, representing -50% to +50%)
  onChange: (value: number) => void;  // Callback when value changes
  min?: number;                       // Minimum value (default: -0.5 for -50%)
  max?: number;                       // Maximum value (default: +0.5 for +50%)
  step?: number;                      // Step size (default: 0.01 for 1%)
  label?: string;                     // Label text (default: "Stress Level")
  showValue?: boolean;                // Show value display (default: true)
  disabled?: boolean;                 // Disable interaction (default: false)
}
```

**Features**:
1. **Range Slider**:
   - HTML5 `<input type="range">` element
   - Visual track with active range
   - Thumb position indicates current value
   - Smooth dragging interaction

2. **Number Input**:
   - Text input for precise value entry
   - Accepts percentage input (e.g., "10" for 10%, "-5" for -5%)
   - Validates range (min/max)
   - Auto-formats display (shows "%" suffix)

3. **Value Display**:
   - Shows current value as "±X%" (e.g., "±10%")
   - Updates in real-time as slider moves
   - Formatted with appropriate precision

4. **Synchronization**:
   - Slider and input stay in sync
   - Changes to either control update both
   - Input validation prevents invalid values

**Styling**:
- Use existing UI theme colors (var(--primary), var(--text-primary), etc.)
- Slider track: Light gray background
- Slider active range: Primary color
- Slider thumb: Primary color with hover effect
- Input: Standard text input styling (matches existing InputGroup)
- Label: Bold, above controls
- Value display: Medium weight, next to controls

**Layout**:
```
PercentageSlider
├── Label (top): "Stress Level"
├── Controls Row (horizontal)
│   ├── Range Slider (flex: 1, takes most space)
│   └── Number Input (fixed width: 80px)
└── Value Display (below): "±10%"
```

**Implementation Notes**:
- Convert between internal value (-0.5 to +0.5) and display value (-50% to +50%)
- Use controlled component pattern (value + onChange)
- Debounce onChange if needed (parent handles this)
- Accessible: Proper labels, ARIA attributes

#### 2. ToggleGroup Component

**Location**: `src/components/ui/ToggleGroup.tsx` (NEW)

**Purpose**: Segmented button group for selecting business model type.

**Props**:
```typescript
interface ToggleGroupProps<T extends string> {
  value: T;                           // Currently selected value
  onChange: (value: T) => void;       // Callback when selection changes
  options: Array<{
    value: T;
    label: string;
    description?: string;              // Optional tooltip/description
  }>;
  disabled?: boolean;                 // Disable all options (default: false)
  size?: 'small' | 'medium' | 'large'; // Size variant (default: 'medium')
}
```

**Features**:
1. **Segmented Button Layout**:
   - Horizontal row of connected buttons
   - Active button has highlighted background
   - Hover effects on inactive buttons
   - First/last buttons have rounded corners

2. **Selection State**:
   - Only one option can be selected at a time
   - Active button has distinct visual styling
   - Click to select different option

3. **Accessibility**:
   - Keyboard navigation (Arrow keys to move, Enter to select)
   - ARIA roles and attributes
   - Focus indicators

**Styling**:
- Button group: Connected segments (no gaps)
- Active button: Primary background, white text
- Inactive buttons: Light gray background, dark text
- Hover state: Slightly darker background
- Border: 1px border between segments, rounded corners on ends

**Layout**:
```
ToggleGroup
└── Button Row (horizontal)
    ├── [All Operations] (active)
    ├── [Lodging Only]
    ├── [F&B Only]
    ├── [Revenue Driven]
    └── [Cost Driven]
```

**Implementation Notes**:
- Generic type parameter `<T>` for flexibility
- Use button elements (not radio buttons) for better control over styling
- Handle keyboard events (ArrowLeft, ArrowRight, Enter)
- Responsive: Stack vertically on mobile if needed

#### 3. ScenarioCard Component

**Location**: `src/components/analysis/ScenarioCard.tsx` (NEW)

**Purpose**: Rich card component displaying scenario KPIs with color-coded header.

**Props**:
```typescript
interface ScenarioCardProps {
  scenarioType: 'base' | 'stress' | 'upside';
  title: string;                      // Card title (e.g., "Base Scenario")
  kpis: ProjectKpis;                  // KPIs to display
  baseKpis?: ProjectKpis;             // Optional: Base KPIs for delta calculation
  isLoading?: boolean;                // Show loading state (default: false)
  className?: string;                 // Additional CSS classes
}
```

**Features**:
1. **Color-Coded Header**:
   - **Stress**: Red background (`#dc3545` or `var(--error)`), white text
   - **Base**: Gray background (`#6c757d` or `var(--text-secondary)`), white text
   - **Upside**: Green background (`#28a745` or `var(--success)`), white text
   - Icon: Emoji or icon (🔴 Stress, ⚪ Base, 🟢 Upside)

2. **KPI Grid**:
   - Display key metrics:
     - NPV (formatted as currency)
     - IRR (formatted as percentage)
     - Equity Multiple (formatted as decimal with "x" suffix)
     - MOIC (formatted as decimal with "x" suffix)
   - Large, readable font sizes
   - Color coding: Red for negative NPV, red for low IRR (< threshold)

3. **Delta Display**:
   - If `baseKpis` provided, calculate and show delta vs base
   - Format: "+15.2% vs Base" or "-8.5% vs Base"
   - Green text for positive delta (upside), red for negative (stress)
   - Hide delta for base scenario (no comparison needed)

4. **Loading State**:
   - Show skeleton loader or spinner when `isLoading === true`
   - Gray placeholders for KPI values

**Styling**:
- Card: White background, shadow, rounded corners
- Header: Full-width colored bar, padding, bold text
- KPI Grid: Grid layout (2 columns), large numbers, small labels
- Delta: Small text below KPIs, colored (green/red)
- Responsive: Stack KPIs vertically on mobile

**Layout**:
```
ScenarioCard
├── Header (colored bar)
│   └── "🔴 Stress Scenario"
├── KPI Grid
│   ├── NPV: $2.5M
│   ├── IRR: 18.5%
│   ├── Equity Multiple: 2.3x
│   └── MOIC: 1.8x
└── Delta (if baseKpis provided)
    └── "-15.2% vs Base"
```

**Implementation Notes**:
- Use `formatCurrency()` and `formatPercentage()` helpers for formatting
- Calculate delta: `((value - baseValue) / baseValue) * 100`
- Handle null/undefined KPIs gracefully (show "N/A" or dash)
- Accessible: Proper heading hierarchy, ARIA labels

### Integration with Existing Views

**AnalysisView Integration**:
- `AnalysisView` is the primary view for v2.6
- Replaces placeholder content with full interactive scenario triad interface
- Uses existing `SectionCard` component for layout sections

**RiskView Compatibility**:
- `RiskView` remains separate (Monte Carlo simulation)
- `AnalysisView` focuses on deterministic scenario comparison
- Both can coexist (different use cases)

**ScenarioView Integration**:
- `AnalysisView` can receive base input from `ScenarioView`
- "Apply to Scenario" button in `AnalysisView` calls `onUpdateInput()` to save stress as new scenario

### v2.6 Agent Responsibilities

#### Architecture Agent (This Agent)

**Primary Files**:
- `docs/ARCHITECTURE.md` - Architecture specifications (this document)

**Tasks**:
1. ✅ Define scenario triad architecture (this section)
2. ✅ Specify component interfaces and behaviors
3. ✅ Document integration points with existing views
4. ✅ Define type structures for stress factors and scenario triad results

#### Quant Agent

**Primary Files**:
- `src/engines/scenario/scenarioTriadEngine.ts` - Scenario triad engine (NEW)
- `src/domain/types.ts` - Type definitions

**Tasks**:
1. Implement `runScenarioTriad()` function:
   - Base scenario (unchanged)
   - Stress scenario (apply multipliers)
   - Upside scenario (inverse or custom multipliers)
   - KPI extraction and comparison

2. Implement helper functions:
   - `applyStressFactors()` - Apply multipliers to model input
   - `cloneModelInput()` - Deep clone model input
   - `extractProjectKpis()` - Extract KPIs from output
   - Business model type logic (filter operations)

3. Add type definitions:
   - `StressFactors` interface
   - `ScenarioTriadResult` interface
   - `ScenarioTriadConfig` interface
   - `BusinessModelType` type

4. Add tests:
   - Scenario triad calculation correctness
   - Multiplier application (revenue, occupancy, ADR, OPEX, interest)
   - Business model type filtering
   - Edge cases (zero multipliers, negative values)

#### Core Logic Agent

**Primary Files**:
- `src/domain/types.ts` - Type definitions
- `src/domain/helpers/scenarioHelpers.ts` - Helper functions (if needed)

**Tasks**:
1. Ensure type definitions align with domain types
2. Support model input cloning (deep clone)
3. Validate stress factors (range validation)
4. Support business model type logic

#### UI Agent

**Primary Files**:
- `src/components/ui/PercentageSlider.tsx` - Percentage slider component (NEW)
- `src/components/ui/ToggleGroup.tsx` - Toggle group component (NEW)
- `src/components/analysis/ScenarioCard.tsx` - Scenario card component (NEW)
- `src/views/AnalysisView.tsx` - Analysis view integration (UPDATE)

**Tasks**:
1. Create `PercentageSlider` component:
   - Range slider + number input
   - Value display
   - Synchronization logic
   - Accessibility

2. Create `ToggleGroup` component:
   - Segmented button layout
   - Selection state management
   - Keyboard navigation
   - Responsive design

3. Create `ScenarioCard` component:
   - Color-coded header (red/gray/green)
   - KPI grid display
   - Delta calculation and display
   - Loading states

4. Update `AnalysisView`:
   - Two-section layout (Controls + Results)
   - State management (stress level, business model type)
   - Debounced scenario triad calculation
   - Integration with new components

5. Add helper components:
   - `KpiGrid` - Reusable KPI grid layout (if needed)
   - `DeltaDisplay` - Delta calculation and formatting (if needed)

#### QA Agent

**Primary Files**:
- `src/tests/engines/scenario/scenarioTriadEngine.test.ts` - Engine tests (NEW)
- `src/tests/components/ui/PercentageSlider.test.tsx` - Component tests (NEW)
- `src/tests/components/ui/ToggleGroup.test.tsx` - Component tests (NEW)
- `src/tests/components/analysis/ScenarioCard.test.tsx` - Component tests (NEW)

**Tasks**:
1. Test scenario triad engine:
   - Base scenario unchanged
   - Stress factors applied correctly
   - Upside scenario generated correctly (inverse)
   - KPI extraction accuracy
   - Business model type filtering

2. Test component interactions:
   - Slider updates input, input updates slider
   - Toggle group selection state
   - Scenario cards display correct KPIs
   - Delta calculations

3. Test edge cases:
   - Zero stress factors
   - Negative stress factors
   - Extreme stress factors (±50%)
   - Missing KPIs (null/undefined)
   - Empty operations array

4. Test performance:
   - Debouncing prevents excessive recalculations
   - Scenario triad completes in reasonable time (< 1 second for typical scenarios)
   - UI remains responsive during calculations

#### Education Agent

**Primary Files**:
- `docs/ARCHITECTURE.md` - This document (already updated)
- User guide or README.md (if exists)

**Tasks**:
1. ✅ Update ARCHITECTURE.md with v2.6 specifications (this section)
2. Update user guide with interactive scenarios instructions
3. Document stress factor meanings and recommended ranges
4. Document business model type selection guidance

### What v2.6 Explicitly Does NOT Do

1. **No Advanced Stress Modeling**:
   - Only simple multipliers (no correlation, no time-varying factors)
   - No probabilistic stress factors (deterministic only)
   - Advanced stress modeling deferred to v2.7+

2. **No Custom Stress Factor Inputs**:
   - Only "Stress Level" slider in v2.6 (unified control)
   - Individual factor sliders (revenue, occupancy, etc.) deferred to v2.7+
   - Advanced users can still use existing scenario builder

3. **No Scenario Persistence**:
   - Stress scenarios are computed on-the-fly (not saved by default)
   - "Apply to Scenario" button saves stress as new scenario (uses existing scenario library)
   - No automatic saving of stress scenarios

4. **No Multi-Scenario Comparison Beyond Triad**:
   - Only Base/Stress/Upside triad (3 scenarios)
   - Multi-scenario comparison (4+ scenarios) deferred to v2.7+
   - Users can manually create multiple scenarios and compare separately

5. **No Real-Time Chart Updates**:
   - KPI cards update in real-time, but no charts
   - Chart visualization for scenario comparison deferred to v2.7+
   - Existing charts (CashFlowChart, etc.) work with individual scenarios

### Testing Strategy

**Unit Tests**:
- Scenario triad calculation correctness
- Multiplier application logic
- Business model type filtering
- Component rendering and interactions

**Integration Tests**:
- End-to-end scenario triad (input → calculation → display)
- Slider interaction → scenario update → KPI refresh
- Business model type change → scenario recalculation
- "Apply to Scenario" → scenario library update

**Performance Tests**:
- Scenario triad calculation time (< 1 second for typical scenarios)
- UI responsiveness during calculations (debouncing effective)
- Memory usage (no leaks from multiple recalculations)

**User Acceptance Tests**:
- Slider is intuitive and responsive
- Scenario cards are visually clear and easy to compare
- Business model type toggle works as expected
- Overall UX is smooth and professional

### Performance Considerations

**Debouncing**:
- Slider updates trigger scenario triad recalculation
- Use 300ms debounce to prevent excessive recalculations
- Show loading state during calculation

**Memoization**:
- Cache base scenario results if `baseOutput` prop provided
- Cache stress factors calculation (useMemo)
- Avoid unnecessary re-renders with React.memo for cards

**Optimization Opportunities**:
- Parallel calculation of stress and upside scenarios (both independent of base)
- Consider Web Workers for very complex scenarios (if UI blocking occurs)
- Incremental updates (show base immediately, then stress/upside as they complete)

**Limitations**:
- Client-side only (runs in browser)
- May be slow for very complex scenarios (> 10 years, > 20 operations)
- Consider progress indicators for long-running calculations

### Migration Path

**Backward Compatibility**:
- Scenario triad is additive feature (does not modify existing logic)
- Existing views continue to work without changes
- `AnalysisView` is optional (users can use existing `RiskView` or `ScenarioView`)

**Default Behavior**:
- Stress level defaults to ±10% (moderate stress test)
- Business model type defaults to "ALL_OPERATIONS"
- Upside is auto-generated (inverse of stress)

**Future Enhancements** (v2.8+):
- Individual stress factor sliders (advanced mode)
- Custom upside factors (non-inverse)
- Chart visualization for scenario comparison
- Multi-scenario comparison (4+ scenarios)
- Scenario persistence (auto-save stress scenarios)

### v2.7 – The Glass Context

**Status**: ⏳ Planning

**Focus**: Build user trust through transparency and education. Users need to understand financial terms, see system health, and access contextual help throughout the application.

**Overview**: This milestone establishes three integrated layers that enhance user trust and understanding: the Education Layer (Glossary), the Trust Layer (System Health), and Contextual UI (Tooltips). Together, these provide transparency, validation, and educational support for financial modeling.

**Strategic Goal**: Before v2.7, we are refining agent roles to focus on User Trust:
1. **Rename `DOCS_AGENT` to `EDUCATION_AGENT`**: Owns user-facing content (Glossary, Tooltips) in addition to technical docs.
2. **Expand `INFRA_TEST_AGENT` to `RELIABILITY_AGENT`**: Owns the logic to *expose* test results to the runtime app.

---

#### 1. Education Layer (`src/domain/glossary.ts`)

**Purpose**: Provide a central dictionary of financial terms that users can reference throughout the application.

**Implementation**:

**Type Definition**:
```typescript
export interface GlossaryEntry {
  key: string;                    // Unique identifier (e.g., "DSCR", "NOI", "IRR")
  label: string;                  // Display name (e.g., "Debt Service Coverage Ratio")
  description: string;            // Full explanation of the term
  formulaDisplay?: string;        // Optional: Formula in human-readable format (e.g., "NOI / Debt Service")
  category?: string;              // Optional: Category grouping (e.g., "Capital", "Operations", "Metrics")
}

export type Glossary = Record<string, GlossaryEntry>;
```

**Structure**:
- Central dictionary in `src/domain/glossary.ts`
- Export function: `getGlossaryEntry(key: string): GlossaryEntry | undefined`
- Export function: `getAllGlossaryEntries(): GlossaryEntry[]`
- Export function: `getGlossaryEntriesByCategory(category: string): GlossaryEntry[]`

**Initial Terms** (comprehensive list):
- **Capital Metrics**: DSCR, LTV, Debt Service, Principal, Interest, Amortization
- **Operations Metrics**: NOI, GOP, EBITDA, Revenue, COGS, OPEX
- **Project Metrics**: NPV, IRR, Equity Multiple (MOIC), Payback Period, WACC
- **Waterfall Terms**: Preferred Return, Promote, Catch-up, Clawback, Return of Capital
- **Scenario Terms**: Base Case, Stress Test, Upside, Sensitivity Analysis

**Responsibilities**:
- **Education Agent**: Maintains glossary entries, ensures accuracy and completeness
- **UI Agent**: Integrates glossary into tooltips and contextual help components

---

#### 2. Trust Layer (System Health)

**Purpose**: Expose system health and test results to users, building confidence in the application's reliability.

**Implementation**:

**Build Pipeline**:
- Generate `public/health.json` during build process
- File structure:
```json
{
  "lastBuild": "2024-01-15T10:30:00Z",
  "totalTests": 245,
  "passing": 245,
  "failing": 0,
  "version": "2.7.0",
  "buildDate": "2024-01-15T10:30:00Z"
}
```

**Build Script Integration**:
- Add build step to `vite.config.ts` or separate build script
- Run tests during build: `npm test -- --reporter=json`
- Parse test results and generate `public/health.json`
- Ensure health.json is included in build output

**UI Components**:

**System Status Badge**:
- Location: Sidebar footer
- Visual indicator:
  - Green: All tests passing (`passing === totalTests`)
  - Yellow: Some tests failing (`failing > 0 && failing < totalTests`)
  - Red: All tests failing (`passing === 0`)
- Display: "System Status" or icon with tooltip
- Click behavior: Opens Certificates modal

**Certificates Modal**:
- Modal/dialog component showing:
  - **Header**: System Status (passing/total tests)
  - **Test Results Summary**:
    - Total tests: 245
    - Passing: 245
    - Failing: 0
    - Last build: "2024-01-15 10:30 AM"
    - Version: "2.7.0"
  - **Details Section** (optional, expandable):
    - Test suite breakdown
    - Coverage metrics (if available)
    - Build information
- Design: Clean, professional, trust-building aesthetic

**Runtime Integration**:
- Load `public/health.json` at app startup
- Store in React context or state
- Update UI badge based on health status
- Handle missing health.json gracefully (show "Unknown" status)

**Responsibilities**:
- **Reliability Agent**: Build pipeline generation of health.json, test result exposure logic
- **UI Agent**: System Status badge, Certificates modal implementation

---

#### 3. Contextual UI (`ContextTooltip`)

**Purpose**: Provide contextual help for financial terms throughout the application without cluttering the UI.

**Implementation**:

**Component**: `ContextTooltip`
- Generic wrapper component for labels with glossary integration
- Props:
```typescript
interface ContextTooltipProps {
  term: string;                    // Glossary key (e.g., "DSCR", "NOI")
  children: React.ReactNode;        // Label text to wrap
  placement?: 'top' | 'bottom' | 'left' | 'right';
  variant?: 'info' | 'help';        // Visual style
}
```

**Behavior**:
- Hover: Shows glossary definition in tooltip
- Click (optional): Opens full glossary entry in modal or side panel
- Visual indicator: Info icon (ⓘ) next to label
- Accessible: Keyboard navigation, ARIA labels

**Usage Pattern**:
```tsx
<ContextTooltip term="DSCR">
  <span>Levered DSCR ⓘ</span>
</ContextTooltip>
```

**Integration Points**:
- KPI cards (NPV, IRR, MOIC, DSCR, LTV)
- Table headers (NOI, GOP, EBITDA)
- Form labels (Preferred Return, Promote)
- Dashboard metrics
- Analysis view terms

**Glossary Lookup**:
- Component calls `getGlossaryEntry(term)` from `src/domain/glossary.ts`
- Falls back gracefully if term not found (shows generic help message)
- Caches glossary entries for performance

**Responsibilities**:
- **UI Agent**: Component implementation, integration throughout application
- **Education Agent**: Ensures glossary entries are comprehensive and accurate

---

#### v2.7 Agent Responsibilities

**Architecture Agent (This Agent)**:
- ✅ Define v2.7 architecture (this section)
- ✅ Specify component interfaces and data structures
- ✅ Document integration points

**Education Agent**:
- **Primary Files**:
  - `src/domain/glossary.ts` - Glossary dictionary (NEW)
  - `docs/ARCHITECTURE.md` - Update with glossary structure
- **Tasks**:
  1. Create `src/domain/glossary.ts` with comprehensive financial terms
  2. Implement glossary lookup functions (`getGlossaryEntry`, `getAllGlossaryEntries`, etc.)
  3. Define initial glossary entries (DSCR, NOI, IRR, NPV, MOIC, etc.)
  4. Ensure glossary entries are accurate and well-documented
  5. Coordinate with UI Agent for tooltip integration

**Reliability Agent**:
- **Primary Files**:
  - `vite.config.ts` - Build configuration (UPDATE)
  - Build scripts for generating `public/health.json` (NEW)
  - `package.json` - Build scripts (UPDATE)
- **Tasks**:
  1. Implement build pipeline to generate `public/health.json`:
     - Run tests during build
     - Parse test results (total, passing, failing)
     - Generate health.json with build metadata
     - Include version from package.json
  2. Ensure health.json is included in build output
  3. Handle build failures gracefully (still generate health.json with failure status)
  4. Coordinate with UI Agent for health.json consumption

**UI Agent**:
- **Primary Files**:
  - `src/components/ui/ContextTooltip.tsx` - Context tooltip component (NEW)
  - `src/components/ui/SystemStatusBadge.tsx` - System status badge (NEW)
  - `src/components/ui/CertificatesModal.tsx` - Certificates modal (NEW)
  - `src/components/layout/Sidebar.tsx` - Sidebar footer integration (UPDATE)
  - All views/components - ContextTooltip integration (UPDATE)
- **Tasks**:
  1. Create `ContextTooltip` component:
     - Wrapper for labels with glossary integration
     - Hover tooltip with glossary definition
     - Info icon indicator
     - Accessible (keyboard, ARIA)
  2. Create `SystemStatusBadge` component:
     - Visual indicator (green/yellow/red)
     - Click to open Certificates modal
     - Tooltip with status summary
  3. Create `CertificatesModal` component:
     - Display test results from health.json
     - Professional, trust-building design
     - Expandable details section
  4. Integrate `ContextTooltip` throughout application:
     - KPI cards
     - Table headers
     - Form labels
     - Dashboard metrics
  5. Integrate `SystemStatusBadge` in Sidebar footer
  6. Load and consume `public/health.json` at runtime
  7. Handle missing health.json gracefully

**QA Agent**:
- **Primary Files**:
  - `src/tests/components/ui/ContextTooltip.test.tsx` - Component tests (NEW)
  - `src/tests/components/ui/SystemStatusBadge.test.tsx` - Component tests (NEW)
  - `src/tests/components/ui/CertificatesModal.test.tsx` - Component tests (NEW)
  - `src/tests/domain/glossary.test.ts` - Glossary tests (NEW)
- **Tasks**:
  1. Test glossary lookup functions:
     - `getGlossaryEntry` returns correct entry
     - `getAllGlossaryEntries` returns all entries
     - `getGlossaryEntriesByCategory` filters correctly
     - Handles missing keys gracefully
  2. Test ContextTooltip component:
     - Renders correctly with term
     - Shows tooltip on hover
     - Handles missing glossary entries
     - Keyboard navigation works
     - ARIA labels correct
  3. Test SystemStatusBadge component:
     - Displays correct status (green/yellow/red)
     - Opens modal on click
     - Handles missing health.json
  4. Test CertificatesModal component:
     - Displays health.json data correctly
     - Handles missing fields gracefully
     - Expandable details work
  5. Test build pipeline:
     - health.json generated correctly
     - Test results parsed accurately
     - Version included correctly

---

#### What v2.7 Explicitly Does NOT Do

1. **No Advanced Glossary Features**:
   - No glossary search/filter UI (deferred to v2.8+)
   - No user-editable glossary entries
   - No glossary versioning or history
   - Basic glossary lookup only

2. **No Advanced Health Monitoring**:
   - No real-time test execution
   - No test coverage metrics (deferred to v2.8+)
   - No performance monitoring
   - Static health.json from build only

3. **No Advanced Tooltip Features**:
   - No rich formatting in tooltips (plain text only)
   - No interactive tooltip content
   - No tooltip analytics/tracking
   - Basic hover tooltip only

---

#### Testing Strategy

**Unit Tests**:
- Glossary lookup functions
- ContextTooltip rendering and interactions
- SystemStatusBadge status display
- CertificatesModal data display
- Build pipeline health.json generation

**Integration Tests**:
- ContextTooltip integrated in KPI cards
- SystemStatusBadge in Sidebar footer
- Health.json loaded and consumed at runtime
- Glossary entries accessible throughout app

**User Acceptance Tests**:
- Tooltips are helpful and non-intrusive
- System Status badge is visible and informative
- Certificates modal builds user trust
- Glossary terms are comprehensive and accurate

---

#### Migration Path

**Backward Compatibility**:
- Glossary is additive (no breaking changes)
- System Status badge is optional (graceful degradation if health.json missing)
- ContextTooltip is opt-in (components can use it or not)
- Existing UI continues to work without changes

**Default Behavior**:
- Glossary entries available for all major financial terms
- System Status badge shows "Unknown" if health.json missing
- ContextTooltip shows generic help if glossary entry not found

---

### v2.8 – Motion & Feedback

**Status**: ✅ **Implemented**

**Context**: We are at v2.7. The app is trusted and robust. Now we need to make it feel "Premium".

**Focus**: Implement smooth transitions and Skeleton loading states to replace "janky" updates. Add professional polish through subtle animations and improved loading states without compromising performance.

**Overview**: This milestone introduces a motion system using industry-standard animation library (`framer-motion`) and replaces text spinners with skeleton UI components that mimic the layout of actual content. All animations are subtle and performance-optimized to maintain the application's responsiveness.

**Strategic Goal**: Transform the application from functional to "Premium" through professional motion design and polished loading states, while maintaining zero performance degradation.

---

#### 1. Motion Architecture

**Purpose**: Add subtle, professional animations to enhance user experience and provide visual feedback, making the app feel "Premium".

**Library**: `framer-motion`
- Standard for React animations
- Excellent performance characteristics
- Declarative API that integrates seamlessly with React
- Built-in support for layout animations and gesture handling

**Installation**:
```bash
npm install framer-motion
```

**Page Transitions**:
- **Effect**: Fade In/Out when switching Views
- **Duration**: 0.2s (200ms)
- **Easing**: `ease-out` (smooth, natural feel)
- **Implementation**: Wrap Views in a motion component (`motion.div`) with fade animation
- **Scope**: All view components in `src/views/*` (DashboardView, OperationsView, CapitalView, WaterfallView, etc.)
- **Pattern**: Use `AnimatePresence` for exit animations when views unmount

**Micro-interactions**:
- **Button Press Feedback**: Buttons should scale down slightly (0.98) on press
- **Duration**: 0.1s (100ms) for press, 0.15s for release
- **Easing**: `ease-in-out`
- **Implementation**: Use `motion.button` or `whileTap` prop
- **Scope**: All interactive buttons throughout the application

**Animation Specifications**:
```typescript
// Page transition (Fade In/Out)
const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: "easeOut" }
};

// Usage with AnimatePresence for exit animations
<AnimatePresence mode="wait">
  <motion.div
    key={viewKey}
    initial="initial"
    animate="animate"
    exit="exit"
    variants={pageTransition}
  >
    {viewContent}
  </motion.div>
</AnimatePresence>

// Micro-interaction (button press feedback)
const buttonPress = {
  whileTap: { scale: 0.98 },
  transition: { duration: 0.1, ease: "easeInOut" }
};
```

**Performance Considerations**:
- Use `will-change` CSS property for animated elements
- Prefer `transform` and `opacity` properties (GPU-accelerated)
- Avoid animating `width`, `height`, or `top/left` (causes layout reflow)
- Use `layout` prop for layout animations (framer-motion handles optimization)
- Debounce rapid view switches to prevent animation conflicts

**Responsibilities**:
- **UI Agent**: Implement motion system, integrate framer-motion, apply transitions to views and buttons
- **Reliability Agent**: Ensure animations don't impact build size or runtime performance

---

#### 2. Loading Architecture

**Purpose**: Replace text spinners with professional skeleton UI placeholders that mimic the layout of the actual content while data is calculating, eliminating "janky" updates.

**Implementation**:

**Skeleton Components**:
- **SkeletonCard**: Placeholder that mimics KPI card layout (title, value, trend indicator)
- **SkeletonChart**: Placeholder that mimics chart container (placeholder for chart area)
- **SkeletonTable**: Placeholder that mimics table structure (header row, data rows with appropriate column widths)
- **SkeletonForm**: Placeholder that mimics form input layout (labels, inputs, buttons)

**Design Specifications**:
- **Base Color**: Light gray background (`#f3f4f6` or theme equivalent)
- **Animation**: Pulsing effect (opacity animation from 0.5 to 1.0)
- **Duration**: 1.5s infinite loop
- **Shape Matching**: Skeletons must match the exact dimensions and layout of actual content

**Component Structure**:
```typescript
// Example: SkeletonCard
interface SkeletonCardProps {
  showTrend?: boolean;    // Whether to show trend indicator skeleton
  showSubtitle?: boolean; // Whether to show subtitle skeleton
}

// Example: SkeletonChart
interface SkeletonChartProps {
  height?: number;       // Chart height
  width?: number;        // Chart width
}

// Example: SkeletonTable
interface SkeletonTableProps {
  rows?: number;         // Number of skeleton rows
  columns?: number;      // Number of skeleton columns
}
```

**Integration Points**:
- **KPI Cards**: Use `SkeletonCard` when model is calculating
- **Charts**: Use `SkeletonChart` when chart data is loading
- **Data Tables**: Use `SkeletonTable` when loading table data
- **Forms**: Use `SkeletonForm` when form data is loading

**Replacement Strategy**:
- Identify all current text spinner/loading states
- Replace with appropriate skeleton component (`SkeletonCard`, `SkeletonChart`, etc.)
- Ensure skeleton matches content dimensions exactly
- Maintain loading state management (use existing hooks/context)
- Skeletons should appear instantly to prevent "janky" updates

**Performance Considerations**:
- Skeletons are lightweight (CSS animations, no JavaScript)
- Use CSS `@keyframes` for pulsing animation (GPU-accelerated)
- Avoid complex skeleton shapes (keep it simple and fast)
- Ensure skeletons don't block content rendering

**Responsibilities**:
- **UI Agent**: Create skeleton components, replace text spinners, integrate throughout application
- **QA Agent**: Test skeleton rendering and animation performance

---

#### v2.8 Agent Responsibilities

**Architecture Agent (This Agent)**:
- ✅ Define v2.8 architecture (this section)
- ✅ Specify animation and skeleton UI requirements
- ✅ Document performance considerations

**UI Agent**:
- **Primary Files**:
  - `src/components/ui/Skeleton.tsx` - Base skeleton component (NEW)
  - `src/components/ui/SkeletonCard.tsx` - Card skeleton (NEW)
  - `src/components/ui/SkeletonChart.tsx` - Chart skeleton (NEW)
  - `src/components/ui/SkeletonTable.tsx` - Table skeleton (NEW)
  - `src/components/ui/SkeletonForm.tsx` - Form skeleton (NEW)
  - `src/views/*` - Add motion transitions to all views (UPDATE)
  - `src/components/**/*` - Add button press feedback (UPDATE)
  - `package.json` - Add framer-motion dependency (UPDATE)
- **Tasks**:
  1. Install and configure `framer-motion`
  2. Create skeleton UI components:
     - Base `Skeleton` component with pulsing animation
     - `SkeletonCard` matching KPI card layout
     - `SkeletonChart` matching chart container
     - `SkeletonTable` matching table structure
     - `SkeletonForm` matching form layout
  3. Implement page transitions:
     - Wrap Views in motion components (`motion.div`)
     - Apply Fade In/Out animation (0.2s, ease-out)
     - Use `AnimatePresence` for exit animations
     - Ensure smooth transitions between views
  4. Implement micro-interactions:
     - Add `whileTap` prop to all buttons
     - Apply scale-down effect (0.98) on press
     - Ensure consistent timing (0.1s press, 0.15s release)
  5. Replace text spinners:
     - Identify all loading states
     - Replace with appropriate skeleton component (`SkeletonCard`, `SkeletonChart`, etc.)
     - Ensure skeleton matches content dimensions exactly
     - Prevent "janky" updates by showing skeletons instantly
  6. Test performance:
     - Verify animations don't impact frame rate
     - Ensure skeleton animations are smooth
     - Check bundle size impact

**Reliability Agent**:
- **Primary Files**:
  - `package.json` - Verify framer-motion dependency (UPDATE)
  - Build configuration - Ensure animations don't impact build
- **Tasks**:
  1. Verify framer-motion installation
  2. Monitor bundle size impact
  3. Ensure build process handles motion components correctly
  4. Verify no performance regressions in build output

**QA Agent**:
- **Primary Files**:
  - `src/tests/components/ui/Skeleton.test.tsx` - Component tests (NEW)
  - `src/tests/components/ui/SkeletonCard.test.tsx` - Component tests (NEW)
  - `src/tests/components/ui/SkeletonChart.test.tsx` - Component tests (NEW)
  - `src/tests/components/ui/SkeletonTable.test.tsx` - Component tests (NEW)
  - `src/tests/views/*` - Test view transitions (UPDATE)
- **Tasks**:
  1. Test skeleton components:
     - Render correctly (`SkeletonCard`, `SkeletonChart`, etc.)
     - Animation works smoothly
     - Matches content dimensions exactly
  2. Test page transitions:
     - Fade In/Out works on view switch
     - No animation conflicts
     - Performance is acceptable
  3. Test micro-interactions:
     - Scale-down (0.98) works on button press
     - Timing is consistent
     - No visual glitches
  4. Test loading states:
     - Skeletons appear instantly (no "janky" updates)
     - Content appears after loading
     - No layout shifts
  5. Performance testing:
     - Frame rate remains stable (60fps)
     - No jank during animations
     - Bundle size impact is acceptable

---

#### What v2.8 Explicitly Does NOT Do

1. **No Complex Animations**:
   - No page transitions or route animations (deferred to v3.0+)
   - No gesture-based interactions (swipe, drag)
   - No staggered animations or choreographed sequences
   - Simple fade and scale only

2. **No Advanced Skeleton Features**:
   - No skeleton customization per content type
   - No skeleton theming or color variations
   - No skeleton loading progress indicators
   - Basic pulsing skeleton only

3. **No Animation Preferences**:
   - No user preference to disable animations
   - No reduced motion support (deferred to v2.9+)
   - Animations are always enabled
   - Basic motion system only

---

#### Testing Strategy

**Unit Tests**:
- Skeleton components render correctly
- Animation props work as expected
- Button press feedback triggers correctly
- View transitions apply correctly

**Integration Tests**:
- View transitions work when switching views
- Skeletons appear during loading states
- Content replaces skeletons after loading
- Button feedback works across all buttons

**Performance Tests**:
- Frame rate remains stable during animations
- Skeleton animations are smooth (60fps)
- Bundle size increase is acceptable (< 50KB for framer-motion)
- No memory leaks from animations

**User Acceptance Tests**:
- Animations feel professional and polished
- Skeletons provide better loading feedback than spinners
- Button feedback is satisfying and responsive
- Overall app feels more dynamic and engaging

---

#### Migration Path

**Backward Compatibility**:
- Animations are additive (no breaking changes)
- Existing components work without modifications
- Skeletons are opt-in (components can still use spinners if needed)
- No changes to data structures or APIs

**Default Behavior**:
- All views have fade-in transition (0.2s)
- All buttons have press feedback (scale 0.98)
- Loading states use skeleton UI by default
- Animations are always enabled

**Rollout Strategy**:
1. Install framer-motion and create skeleton components
2. Add view transitions to one view as proof of concept
3. Add button feedback to one component as proof of concept
4. Roll out to all views and components
5. Replace all text spinners with skeletons
6. Performance testing and optimization

---

### v2.9 – Advanced Analytics & Excel Bridge

**Status**: ⏳ Planning

**Context**: We are executing the "Powerstation" roadmap.

1. **Excel Integration**: Full bi-directional support. Users fill a template in Excel and import it.
2. **Advanced Simulation**: Monte Carlo needs realistic distributions (LogNormal, PERT) to model real estate risks accurately.

**Focus**: Enable full bi-directional Excel integration (template-based import) and enhance Monte Carlo simulation with realistic probability distributions (LogNormal for prices > 0, PERT for optimistic/pessimistic/likely estimates).

**Overview**: This milestone extends the existing Excel export (v0.13) with template-based import capabilities and native chart data export, while enhancing the simulation engine with advanced statistical distributions for accurate real estate risk modeling.

**Strategic Goal**: Provide seamless Excel Bridge (bidirectional) and professional-grade Monte Carlo simulation with industry-standard probability distributions for real estate risk analysis.

---

#### 1. IO Architecture

**Purpose**: Enable full bi-directional Excel integration. Users fill a template in Excel and import it to populate the model.

**Agent**: Introduce `IO_AGENT` to handle file parsing complexity.

**Current State** (v0.13):
- Excel export is implemented using `exceljs`
- Exports data tables to multiple sheets (Summary, Assumptions, Cash Flow, Waterfall)
- Values only (no formulas, no charts)

**Enhancements** (v2.9):

**A. Excel Import (Template-Based)**:

**Template Structure**:
- **Sheet Name**: "Input_Data" (strict requirement)
- **Format**: Key-Value pairs
- **Columns**: "Key", "Value"
- **Validation**: Strict template validation with clear error messages

**Template Schema**:
```typescript
interface ExcelTemplate {
  sheetName: 'Input_Data';
  format: 'key-value';  // Two-column format: Key | Value
  columns: ['Key', 'Value'];
  rows: Array<{
    key: string;    // e.g., "project.discountRate", "operations[0].keys"
    value: string | number;  // Parsed value
  }>;
}
```

**Example Template Structure**:
```
Sheet: "Input_Data"
| Key                          | Value        |
|------------------------------|--------------|
| project.discountRate          | 0.10        |
| project.terminalGrowthRate    | 0.02        |
| project.initialInvestment    | 50000000    |
| operations[0].type           | HOTEL       |
| operations[0].keys            | 100         |
| operations[0].avgDailyRate   | 250         |
| capitalStructure.tranches[0].name | Senior Debt |
| capitalStructure.tranches[0].amount | 30000000 |
| ...                          | ...         |
```

**Import Logic**:
- **File Upload**: Accept `.xlsx` files via file input
- **Parsing**: Use `exceljs` to read workbook and extract "Input_Data" sheet
- **Mapping**: Parse Key-Value pairs → `FullModelInput` structure
- **Validation**: Validate imported data against Zod schemas
- **Error Handling**: Provide clear error messages for:
  - Missing "Input_Data" sheet
  - Invalid column headers (must be "Key", "Value")
  - Type mismatches
  - Missing required fields
  - Out-of-range values
  - Invalid key paths

**Implementation**:
```typescript
/**
 * Parse Excel file and convert to FullModelInput.
 * @param file - Excel file (.xlsx)
 * @returns FullModelInput or error
 */
async function importFromExcel(
  file: File
): Promise<{ success: true; data: FullModelInput } | { success: false; error: string }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  
  // Validate template structure
  const inputDataSheet = workbook.getWorksheet('Input_Data');
  if (!inputDataSheet) {
    return { success: false, error: 'Sheet "Input_Data" not found' };
  }
  
  // Validate columns
  const firstRow = inputDataSheet.getRow(1);
  if (firstRow.getCell(1).value !== 'Key' || firstRow.getCell(2).value !== 'Value') {
    return { success: false, error: 'Invalid column headers. Expected "Key" and "Value"' };
  }
  
  // Parse Key-Value pairs
  const keyValuePairs: Record<string, any> = {};
  inputDataSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const key = row.getCell(1).value?.toString();
    const value = row.getCell(2).value;
    
    if (key) {
      keyValuePairs[key] = value;
    }
  });
  
  // Map Key-Value pairs to FullModelInput structure
  const mappedData = mapKeyValueToFullModelInput(keyValuePairs);
  
  // Validate using Zod schemas
  const validationResult = FullModelInputSchema.safeParse(mappedData);
  if (!validationResult.success) {
    return { success: false, error: validationResult.error.message };
  }
  
  return { success: true, data: validationResult.data };
}
```

**B. Chart Export**:

**Approach**: Export clean data tables optimized for Excel native charting.

**Chart Data Export**:
- Export data in Excel-friendly format (properly structured tables)
- Include chart data in dedicated "Charts" sheet
- Users can create charts in Excel using the provided data
- Format: Named ranges, table structures, clear headers
- Clean, well-formatted data tables ready for Excel chart creation

**Chart Data Structure**:
```typescript
interface ChartDataSheet {
  name: 'Charts';
  tables: {
    cashFlow: {
      headers: ['Year', 'Unlevered FCF', 'Levered FCF'];
      rows: Array<[number, number, number]>;
    };
    waterfall: {
      headers: ['Year', 'Partner 1', 'Partner 2', ...];
      rows: Array<[number, ...number[]]>;
    };
    // ... other chart data tables
  };
}
```

**Agent Responsibilities**:
- **IO_AGENT**: Owns `src/engines/io/*` - Excel import/export logic, template validation, chart data export, file parsing
- **UI Agent**: File upload UI, import/export buttons, error display

---

#### 2. Statistical Architecture

**Purpose**: Enhance Monte Carlo simulation with realistic probability distributions to model real estate risks accurately.

**Agent**: `QUANT_AGENT` owns `src/domain/statistics.ts`.

**Current State** (v0.11, v2.1):
- Supports: `normal`, `uniform`, `triangular` distributions
- Basic correlation support (v2.1)
- Simple variation-based simulation

**Enhancements** (v2.9):

**A. Advanced Distributions**:

**Supported Distributions**:
- **Normal**: Standard normal distribution (existing)
- **LogNormal**: For prices > 0 (NEW)
- **PERT**: For optimistic/pessimistic/likely estimates (NEW)

**LogNormal Distribution**:
- **Use Case**: Prices, rates, and values that must be > 0
- **Examples**: ADR, occupancy rates, interest rates
- **Parameters**: `mean` (log-space), `stdDev` (log-space)
- **Implementation**: Use standard LogNormal sampling algorithm
- **Validation**: Ensure sampled values are always > 0

**PERT Distribution**:
- **Use Case**: Project duration, construction costs, bounded estimates
- **Examples**: Construction timeline, renovation costs, development duration
- **Parameters**: `optimistic` (min), `mostLikely` (mode), `pessimistic` (max)
- **Implementation**: PERT is a special case of Beta distribution
- **Formula**: PERT uses Beta(α, β) with specific parameter mapping

**Distribution Type Definitions**:
```typescript
type DistributionType = 
  | 'normal'      // Existing: Standard normal distribution
  | 'lognormal'   // NEW: For prices > 0
  | 'pert';       // NEW: For optimistic/pessimistic/likely estimates

interface DistributionConfig {
  type: DistributionType;
  
  // Normal distribution
  mean?: number;
  stdDev?: number;
  
  // LogNormal distribution (NEW)
  logMean?: number;      // Mean in log-space
  logStdDev?: number;     // Standard deviation in log-space
  
  // PERT distribution (NEW)
  optimistic?: number;   // Min value (optimistic estimate)
  mostLikely?: number;   // Mode value (most likely estimate)
  pessimistic?: number;  // Max value (pessimistic estimate)
}
```

**B. Updated SimulationConfig**:

**Enhanced Configuration**: Update `SimulationConfig` to allow selecting distribution type per variable.

```typescript
interface SimulationConfig {
  iterations?: number;
  
  // Legacy: Simple variation-based (backward compatible)
  occupancyVariation?: number;
  adrVariation?: number;
  interestRateVariation?: number;
  
  // NEW: Distribution-based per variable
  variables?: Array<{
    variable: SensitivityVariable;  // Which variable to make probabilistic
    distribution: DistributionType;  // 'normal' | 'lognormal' | 'pert'
    config: DistributionConfig;      // Distribution-specific parameters
  }>;
  
  correlationMatrix?: CorrelationMatrix; // Existing correlation support
}
```

**C. Distribution Sampling Functions**:

**Implementation** (in `src/domain/statistics.ts`):
```typescript
/**
 * Sample a value from a probability distribution.
 */
function sampleFromDistribution(
  distribution: DistributionType,
  config: DistributionConfig
): number {
  switch (distribution) {
    case 'normal':
      return sampleNormal(config.mean!, config.stdDev!);
    case 'lognormal':
      return sampleLogNormal(config.logMean!, config.logStdDev!);
    case 'pert':
      return samplePERT(config.optimistic!, config.mostLikely!, config.pessimistic!);
    default:
      throw new Error(`Unsupported distribution: ${distribution}`);
  }
}

/**
 * Sample from LogNormal distribution.
 * Ensures value is always > 0.
 */
function sampleLogNormal(logMean: number, logStdDev: number): number {
  // Box-Muller transform in log-space
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.exp(logMean + logStdDev * z);
}

/**
 * Sample from PERT distribution (special case of Beta).
 */
function samplePERT(optimistic: number, mostLikely: number, pessimistic: number): number {
  // PERT parameters
  const mean = (optimistic + 4 * mostLikely + pessimistic) / 6;
  const variance = Math.pow((pessimistic - optimistic) / 6, 2);
  
  // Convert to Beta parameters
  const alpha = ((mean - optimistic) / (pessimistic - optimistic)) * 
                (((mean - optimistic) * (pessimistic - mean)) / variance - 1);
  const beta = alpha * (pessimistic - mean) / (mean - optimistic);
  
  // Sample from Beta and scale to [optimistic, pessimistic]
  const betaSample = sampleBeta(alpha, beta, 0, 1);
  return optimistic + betaSample * (pessimistic - optimistic);
}
```

**Responsibilities**:
- **Quant Agent**: Distribution sampling functions, updated simulation engine
- **Core Logic Agent**: Updated SimulationConfig types, validation schemas

---

#### v2.9 Agent Responsibilities

**Architecture Agent (This Agent)**:
- ✅ Define v2.9 architecture (this section)
- ✅ Specify Excel IO and statistical architecture requirements
- ✅ Document new IO_AGENT role

**IO Agent**:
- **Primary Files**:
  - `src/engines/io/*` - All IO-related logic (NEW - IO_AGENT owns this directory)
  - `src/engines/io/excelImport.ts` - Excel import logic (NEW)
  - `src/engines/io/excelTemplate.ts` - Template structure and validation (NEW)
  - `src/engines/io/excelChartExport.ts` - Chart data export (NEW)
  - `src/utils/excelExport.ts` - Enhanced Excel export (UPDATE)
  - `src/tests/engines/io/*` - IO tests (NEW)
- **Tasks**:
  1. Define Excel template structure ("Input_Data" sheet with "Key", "Value" columns)
  2. Implement Excel import parser:
     - Read `.xlsx` files using `exceljs`
     - Parse "Input_Data" sheet
     - Map Key-Value pairs to `FullModelInput`
     - Validate using Zod schemas
  3. Implement template validation:
     - Check for required sheet ("Input_Data")
     - Validate column headers ("Key", "Value")
     - Type checking and range validation
     - Clear error messages
  4. Enhance Excel export:
     - Add "Charts" sheet with chart data tables
     - Export clean data tables optimized for Excel native charting
  5. Create import/export utilities:
     - File parsing helpers
     - Key-Value to FullModelInput mapping functions
     - Error handling utilities

**Quant Agent**:
- **Primary Files**:
  - `src/domain/statistics.ts` - Distribution sampling functions (UPDATE - QUANT_AGENT owns this file)
  - `src/engines/analysis/simulationEngine.ts` - Simulation engine (UPDATE)
  - `src/domain/types.ts` - Updated SimulationConfig (UPDATE)
- **Tasks**:
  1. Implement LogNormal distribution sampling in `src/domain/statistics.ts`
  2. Implement PERT distribution sampling in `src/domain/statistics.ts`
  3. Update `SimulationConfig` to support per-variable distribution selection
  4. Update simulation engine to use new distribution types
  5. Maintain backward compatibility with existing variation-based config
  6. Add tests for new distributions

**Core Logic Agent**:
- **Primary Files**:
  - `src/domain/types.ts` - Updated type definitions (UPDATE)
  - `src/domain/validation.ts` - Updated Zod schemas (UPDATE)
- **Tasks**:
  1. Update `SimulationConfig` type with new distribution options
  2. Add `DistributionConfig` type definitions
  3. Update validation schemas for new distribution parameters
  4. Ensure type safety for Excel import mapping

**UI Agent**:
- **Primary Files**:
  - `src/components/io/ExcelImportButton.tsx` - Import UI (NEW)
  - `src/components/io/ExcelExportButton.tsx` - Enhanced export UI (UPDATE)
  - `src/views/*` - Import/export integration (UPDATE)
- **Tasks**:
  1. Create Excel import UI:
     - File upload button
     - Progress indicator
     - Error display
     - Success confirmation
  2. Enhance Excel export UI:
     - Add chart export option
     - Export button with chart toggle
  3. Integrate import/export into views:
     - Add import button to appropriate views
     - Update export buttons with chart options

**QA Agent**:
- **Primary Files**:
  - `src/tests/engines/io/excelImport.test.ts` - Import tests (NEW)
  - `src/tests/engines/io/excelTemplate.test.ts` - Template tests (NEW)
  - `src/tests/domain/statistics.test.ts` - Distribution tests (UPDATE)
  - `src/tests/engines/analysis/simulationEngine.test.ts` - Simulation tests (UPDATE)
- **Tasks**:
  1. Test Excel import:
     - Valid template parsing
     - Invalid template error handling
     - Type validation
     - Range validation
  2. Test distribution sampling:
     - LogNormal always > 0
     - PERT within bounds [optimistic, pessimistic]
     - Beta distribution correctness
     - Statistical properties (mean, variance)
  3. Test simulation with new distributions:
     - Simulation runs successfully
     - Results are statistically sound
     - Backward compatibility maintained

---

#### What v2.9 Explicitly Does NOT Do

1. **No Excel Formula Support**:
   - Imported Excel files are parsed as data only
   - No evaluation of Excel formulas
   - No dynamic Excel formulas in export (values only)

2. **No Advanced Chart Features**:
   - No interactive Excel charts (deferred to v3.0+)
   - No custom chart styling in Excel
   - Basic chart data export only

3. **No Additional Distributions**:
   - Only LogNormal, Beta, and PERT added
   - No other distributions (gamma, exponential, etc.) in v2.9
   - Future distributions deferred to v3.0+

4. **No Excel Template Editor**:
   - Users must use provided template structure
   - No UI for creating/editing templates
   - Template structure is fixed

---

#### Testing Strategy

**Unit Tests**:
- Excel import parsing logic
- Template validation
- Distribution sampling functions
- Data mapping (Excel → FullModelInput)

**Integration Tests**:
- End-to-end Excel import workflow
- Excel export with chart data
- Simulation with new distributions
- Backward compatibility with existing simulation configs

**Performance Tests**:
- Excel import performance (large files)
- Distribution sampling performance
- Simulation performance with new distributions

**User Acceptance Tests**:
- Excel import is intuitive and error messages are clear
- Exported Excel files open correctly and charts can be created
- Simulation results are realistic with new distributions

---

#### Migration Path

**Backward Compatibility**:
- Excel import is additive (no breaking changes)
- Existing Excel export continues to work
- Simulation config supports both old (variation-based) and new (distribution-based) formats
- Legacy simulation configs remain valid

**Default Behavior**:
- Excel import requires "Inputs" sheet with strict structure
- Excel export includes "Charts" sheet by default
- Simulation defaults to existing distributions if new ones not specified

**Rollout Strategy**:
1. Implement distribution sampling functions
2. Update simulation engine with new distributions
3. Implement Excel template structure and validation
4. Implement Excel import parser
5. Enhance Excel export with chart data
6. Add UI for import/export
7. Testing and validation

---

### v2.10 – Enhanced Financials

**Status**: ⏳ In Progress

**Context**: We are deepening the financial engine capabilities to match institutional requirements.

1. **Debt**: Support "Partial Refinancing" and "Seniority" levels.
2. **Waterfall**: Support "Compound Accrual" preferred returns (European style) vs "IRR Hurdle" (American style).

**Focus**: Enhance capital structure with partial refinancing and seniority levels, and extend waterfall with compound accrual preferred returns for institutional-grade financial modeling.

**Overview**: This milestone adds sophisticated debt management capabilities (partial refinancing, seniority) and European-style preferred return calculations (compound interest accrual) to match institutional investment requirements.

**Strategic Goal**: Provide institutional-grade financial modeling with advanced debt structures and flexible preferred return mechanisms.

---

#### 1. Capital Architecture

**Purpose**: Support partial refinancing and debt seniority levels for sophisticated capital structures.

**Current State** (v0.6, Capital Stack 2.1):
- Full refinancing support (pay off old, start new)
- Multi-tranche debt support
- Aggregate DSCR calculation
- No partial refinancing
- No seniority levels

**Enhancements** (v2.10):

**A. Updated `DebtTrancheConfig`**:

**New Fields**:
```typescript
export interface DebtTrancheConfig {
  // ... existing fields ...
  
  // v2.10: Partial Refinancing
  refinanceAmountPct?: number;  // NEW: Percentage of principal to refinance (0-1). Default 1.0 (Full Repayment)
  
  // v2.10: Seniority Levels
  seniority?: 'senior' | 'subordinated';  // NEW: Debt seniority level. Default 'senior'
}
```

**Partial Refinancing Logic**:
- **`refinanceAmountPct`**: Decimal (0-1) specifying what portion of outstanding principal to refinance
  - `1.0` (default): Full repayment (existing behavior)
  - `0.5`: Refinance 50% of outstanding principal
  - `0.0`: No refinancing
- **Behavior**: When `refinanceAtYear` is reached:
  - Calculate outstanding principal at that year
  - Refinance `refinanceAmountPct * outstandingPrincipal`
  - Remaining principal continues with original terms
  - New tranche created for refinanced amount (if applicable)

**Seniority Levels**:
- **`seniority`**: Determines payment priority in debt service waterfall
  - `'senior'` (default): Highest priority, paid first
  - `'subordinated'`: Lower priority, paid after senior debt
- **Payment Order**: Senior debt service is paid before subordinated debt service
- **Impact**: Affects DSCR calculations (see New Metrics below)

**B. New Metrics**:

**Senior DSCR**:
- **Formula**: `SeniorDSCR_t = NOI_t / SeniorDebtService_t`
- **Definition**: DSCR calculated using only senior debt service
- **Use Case**: Lenders often require minimum Senior DSCR covenants
- **Calculation**: Sum debt service from all tranches where `seniority === 'senior'`

**Total DSCR**:
- **Formula**: `TotalDSCR_t = NOI_t / TotalDebtService_t`
- **Definition**: DSCR calculated using all debt service (senior + subordinated)
- **Use Case**: Overall debt service coverage metric
- **Calculation**: Sum debt service from all tranches regardless of seniority

**Metrics Structure**:
```typescript
export interface DebtKpi {
  yearIndex: number;
  dscr: number;              // Existing: Aggregate DSCR (all debt)
  seniorDscr?: number;       // NEW: Senior DSCR (senior debt only)
  totalDscr?: number;        // NEW: Total DSCR (all debt, explicit)
  ltv: number;               // Existing: Loan-to-Value
  // ... other existing fields
}
```

**Responsibilities**:
- **Quant Agent**: Implement partial refinancing logic, seniority-based debt service ordering, new DSCR metrics
- **Core Logic Agent**: Update `DebtTrancheConfig` type, validation schemas

---

#### 2. Waterfall Architecture

**Purpose**: Support compound accrual preferred returns (European style) in addition to IRR hurdle (American style).

**Current State** (v0.6, Waterfall v3):
- IRR hurdle preferred returns (American style)
- Multi-tier waterfall with catch-up and clawback
- No compound interest accrual

**Enhancements** (v2.10):

**A. Updated `WaterfallTier`**:

**New Field**:
```typescript
export interface WaterfallTier {
  // ... existing fields ...
  
  // v2.10: Preferred Return Accumulation Method
  accumulationMethod?: 'irr_hurdle' | 'compound_interest';  // NEW: Default 'irr_hurdle'
}
```

**Accumulation Methods**:

**IRR Hurdle (American Style)** - Default:
- **Behavior**: Existing behavior (unchanged)
- **Logic**: Preferred return is calculated based on IRR threshold
- **Use Case**: Standard American-style preferred returns
- **Implementation**: When `accumulationMethod === 'irr_hurdle'` or undefined, use existing logic

**Compound Interest (European Style)** - NEW:
- **Behavior**: Preferred return tier behaves like a "Virtual Loan" that accrues interest on unreturned capital
- **Logic**:
  - Track unreturned capital for each partner
  - Accrue interest at `hurdleIrr` rate on unreturned capital each period
  - Preferred return = accrued interest until capital is returned
  - Once capital is returned, preferred return stops accruing
- **Use Case**: European-style preferred returns with compound accrual
- **Formula**: 
  - `UnreturnedCapital_t = InitialCapital - CumulativeReturnOfCapital_t`
  - `AccruedPreferredReturn_t = UnreturnedCapital_t * hurdleIrr`
  - `PreferredReturnDue_t = CumulativeAccruedPreferredReturn_t - CumulativePaidPreferredReturn_t`

**Implementation**:
```typescript
/**
 * Calculate preferred return for a tier using compound interest method.
 */
function calculateCompoundInterestPreferredReturn(
  tier: WaterfallTier,
  ownerCashFlow: number,
  unreturnedCapital: number,
  cumulativeAccrued: number,
  cumulativePaid: number
): {
  preferredReturnDue: number;
  newAccrued: number;
  newPaid: number;
} {
  if (tier.accumulationMethod !== 'compound_interest') {
    // Use existing IRR hurdle logic
    return calculateIrrHurdlePreferredReturn(tier, ownerCashFlow, ...);
  }
  
  // Compound interest logic
  const interestAccrued = unreturnedCapital * (tier.hurdleIrr || 0);
  const newAccrued = cumulativeAccrued + interestAccrued;
  const preferredReturnDue = newAccrued - cumulativePaid;
  
  // Pay preferred return from available cash flow
  const paid = Math.min(preferredReturnDue, ownerCashFlow);
  const newPaid = cumulativePaid + paid;
  
  return {
    preferredReturnDue,
    newAccrued,
    newPaid
  };
}
```

**Responsibilities**:
- **Quant Agent**: Implement compound interest preferred return logic, update waterfall engine
- **Core Logic Agent**: Update `WaterfallTier` type, validation schemas

---

#### v2.10 Agent Responsibilities

**Architecture Agent (This Agent)**:
- ✅ Define v2.10 architecture (this section)
- ✅ Specify capital and waterfall enhancements
- ✅ Document new metrics and accumulation methods

**Quant Agent**:
- **Primary Files**:
  - `src/engines/capital/capitalEngine.ts` - Partial refinancing logic (UPDATE)
  - `src/engines/capital/capitalEngine.ts` - Seniority-based debt service (UPDATE)
  - `src/engines/waterfall/waterfallEngine.ts` - Compound interest preferred returns (UPDATE)
  - `src/domain/types.ts` - Updated types (UPDATE)
- **Tasks**:
  1. Implement partial refinancing:
     - Add `refinanceAmountPct` logic to capital engine
     - Handle partial principal repayment
     - Create new tranche for refinanced amount (if applicable)
  2. Implement seniority levels:
     - Order debt service by seniority (senior first, subordinated second)
     - Calculate Senior DSCR (senior debt only)
     - Calculate Total DSCR (all debt)
  3. Implement compound interest preferred returns:
     - Add `accumulationMethod` logic to waterfall engine
     - Track unreturned capital per partner
     - Accrue interest on unreturned capital
     - Calculate preferred return due based on accrual
  4. Update metrics:
     - Add `seniorDscr` and `totalDscr` to `DebtKpi`
     - Ensure backward compatibility

**Core Logic Agent**:
- **Primary Files**:
  - `src/domain/types.ts` - Updated type definitions (UPDATE)
  - `src/domain/schemas.ts` - Updated Zod schemas (UPDATE)
- **Tasks**:
  1. Update `DebtTrancheConfig`:
     - Add `refinanceAmountPct?: number` (0-1, default 1.0)
     - Add `seniority?: 'senior' | 'subordinated'` (default 'senior')
  2. Update `WaterfallTier`:
     - Add `accumulationMethod?: 'irr_hurdle' | 'compound_interest'` (default 'irr_hurdle')
  3. Update `DebtKpi`:
     - Add `seniorDscr?: number`
     - Add `totalDscr?: number`
  4. Update validation schemas:
     - Add validation for new fields
     - Ensure backward compatibility

**UI Agent**:
- **Primary Files**:
  - `src/views/CapitalView.tsx` - Display new metrics (UPDATE)
  - `src/components/capital/*` - Capital structure UI (UPDATE)
  - `src/components/waterfall/*` - Waterfall UI (UPDATE)
- **Tasks**:
  1. Display new DSCR metrics:
     - Show Senior DSCR in capital view
     - Show Total DSCR in capital view
     - Update DSCR charts/tables
  2. Add UI for new fields:
     - `refinanceAmountPct` input in capital structure form
     - `seniority` selector in capital structure form
     - `accumulationMethod` selector in waterfall tier form
  3. Update waterfall display:
     - Show compound interest accrual (if applicable)
     - Display unreturned capital tracking

**QA Agent**:
- **Primary Files**:
  - `src/tests/engines/capital/capitalEngine.test.ts` - Partial refinancing tests (UPDATE)
  - `src/tests/engines/capital/capitalEngine.test.ts` - Seniority tests (UPDATE)
  - `src/tests/engines/waterfall/waterfallEngine.test.ts` - Compound interest tests (UPDATE)
- **Tasks**:
  1. Test partial refinancing:
     - 50% refinancing
     - 100% refinancing (existing behavior)
     - 0% refinancing (no refinancing)
  2. Test seniority levels:
     - Senior DSCR calculation
     - Total DSCR calculation
     - Payment order (senior before subordinated)
  3. Test compound interest preferred returns:
     - Accrual on unreturned capital
     - Payment of accrued preferred return
     - Capital return stops accrual
  4. Test backward compatibility:
     - Existing configs work without new fields
     - Default values applied correctly

---

#### What v2.10 Explicitly Does NOT Do

1. **No Multiple Refinancings**:
   - Only single refinancing event per tranche
   - No multiple refinancing rounds
   - No refinancing of refinanced debt

2. **No Per-Tranche DSCR**:
   - Only aggregate DSCR metrics (Senior, Total)
   - Per-tranche DSCR deferred to v3.0+

3. **No Hybrid Accumulation Methods**:
   - Tier uses either IRR hurdle OR compound interest
   - No mixing of methods within a tier
   - No custom accumulation formulas

---

#### Testing Strategy

**Unit Tests**:
- Partial refinancing logic (0%, 50%, 100%)
- Seniority-based debt service ordering
- Senior DSCR and Total DSCR calculations
- Compound interest preferred return accrual
- Capital return tracking

**Integration Tests**:
- End-to-end partial refinancing workflow
- Seniority levels with multiple tranches
- Compound interest preferred returns in multi-tier waterfall
- Backward compatibility with existing configs

**Performance Tests**:
- No performance degradation from new calculations
- Efficient debt service ordering
- Compound interest calculations are fast

**User Acceptance Tests**:
- Partial refinancing works as expected
- Senior DSCR provides useful insights
- Compound interest preferred returns match institutional expectations

---

#### Migration Path

**Backward Compatibility**:
- All new fields are optional with sensible defaults
- Existing configs work without modification
- `refinanceAmountPct` defaults to 1.0 (full repayment)
- `seniority` defaults to 'senior'
- `accumulationMethod` defaults to 'irr_hurdle'

**Default Behavior**:
- Partial refinancing: `refinanceAmountPct = 1.0` (full repayment, existing behavior)
- Seniority: All debt is 'senior' by default
- Accumulation method: IRR hurdle (existing behavior)

**Rollout Strategy**:
1. Update type definitions and schemas
2. Implement partial refinancing logic
3. Implement seniority levels and new DSCR metrics
4. Implement compound interest preferred returns
5. Update UI to display new fields and metrics
6. Testing and validation

---

### Roadmap Update

**v2.3**: Goal Seek (Optimization) - In Progress
- ✅ Architecture defined
- ⏳ Implementation in progress

**v2.6**: Interactive Scenarios & Inputs - Planning
- ✅ Architecture defined
- ⏳ Implementation pending

**v2.7**: The Glass Context - Planning
- ✅ Architecture defined
- ⏳ Implementation pending

**v2.8**: Motion & Feedback - ✅ **Implemented**
- ✅ Architecture defined
- ✅ Implementation complete
- **Note**: This completes the v2.x cycle

**v2.9**: Advanced Analytics & Excel Bridge - Planning
- ✅ Architecture defined
- ⏳ Implementation pending

**v2.10**: Enhanced Financials - In Progress
- ✅ Architecture defined
- ⏳ Implementation in progress
- **Next**: v2.11 (Operational Fidelity)

**v2.x Series**: ✅ **Complete** (v2.1 through v2.8)
**v2.9+ Series**: Future roadmap execution

**v3.x Strategic Milestones**:
- **v3.1**: The Capital Experience Upgrade - ✅ **Complete**
- **v3.2**: The Operations Command Center - ✅ **Complete**
- **v3.3**: Workflow & Governance Experience - ✅ **Complete**
- **v3.4**: Enterprise Reporting (Excel 2.0) - ✅ **Complete**
- **v3.5**: Operational Fidelity - ✅ **Complete**
- **v3.6**: Development & Variance Intelligence - ✅ **Complete**

**v4.x UI/UX Transformation Series**:
- **v4.0**: The Cloud Foundation - ✅ **Complete**
- **v4.1**: Long Scroll Layout - ✅ **Complete**
- **v4.2**: Visual Hierarchy & Bento Grid - 🚧 **In Progress** (Design Tokens: ✅ Complete, Bento Grid: 🚧 In Progress)
- **v4.3**: Interaction Design - 📋 **Planned** (Drag-and-Drop, Micro-interactions, Tactile Feedback)
- **v4.4**: Theming System - 📋 **Planned** (Light/Dark/Midnight themes, Theme Engine)
- **v4.5**: Data Viz 2.0 - 📋 **Planned**

**v5.x "The Real Estate Developer Suite" Series**:
- **v5.0**: Land Bank (Pre-Construction) - 📋 **Planned**
- **v5.1**: Construction Dynamics (S-Curve) - 📋 **Planned**
- **v5.2**: Operational Ramp-up - 📋 **Planned**
- **v5.3**: Scenario War Room - 📋 **Planned**
- **v5.7**: Dynamic Financial Statements - ✅ **Implemented**

**v2.x "Financial Depth" Series**:
- v2.1: Deep Simulation (Correlation) ✅
- v2.2: Liquidity & Covenants ✅
- v2.3: Goal Seek (Optimization) ✅

**v2.x "UX Enhancement" Series**:
- v2.4: Visual Foundation & Readability ✅
- v2.5: Dashboard Storytelling ✅
- v2.6: Interactive Scenarios & Inputs ✅
- v2.7: The Glass Context (Trust & Education) ✅
- v2.8: Motion & Feedback ✅

---

## Performance Architecture (v3.0)

**Status**: ✅ **Implemented**

The v3.0 performance architecture ensures non-blocking UI during heavy computational workloads by migrating blocking calculations to Web Workers.

### Performance Rule

**Any loop > 100 iterations runs in a Web Worker.**

This rule prevents UI freezes and ensures responsive user experience during high-frequency calculations.

### Worker Flow Architecture

The worker architecture follows a clear separation of concerns:

```
UI Hook → Worker Bridge → Engine → UI
```

**Detailed Flow:**

1. **UI Hook** (`useSimulationWorker`, `useSensitivityWorker`)
   - React hooks that manage worker lifecycle
   - Handle worker initialization, message passing, and cleanup
   - Provide loading state and progress updates to UI components

2. **Worker Bridge** (`src/workers/simulation.worker.ts`, `src/workers/sensitivity.worker.ts`)
   - Web Worker entry points that receive requests from main thread
   - Execute blocking calculations in isolated thread
   - Send progress updates and results back to main thread

3. **Engine** (`simulationEngine.ts`, `sensitivityEngine.ts`)
   - Pure calculation logic (unchanged from v2.10)
   - Called from within workers
   - Synchronous exports maintained for test compatibility

4. **UI** (`RiskView.tsx`, `SensitivityPanel.tsx`)
   - Consumes worker hooks
   - Displays loading states and progress indicators
   - Remains responsive during calculations

### Implementation Details

**Web Workers:**
- **Location**: `src/workers/`
- **Bundling**: Vite automatically bundles workers with `?worker` suffix
- **Communication**: Native `postMessage` API with structured types
- **Progress Reporting**: Emits progress updates every N iterations (configurable)

**Worker Hooks:**
- **Location**: `src/ui/hooks/`
- **Pattern**: Custom React hooks that abstract worker complexity
- **Features**: 
  - Automatic worker initialization and cleanup
  - Progress state management
  - Error handling and propagation
  - Loading state management

**Backward Compatibility:**
- Synchronous engine exports (`runMonteCarlo`, `runSensitivityAnalysis`) remain available for tests
- Marked as `@internal` or documented as "For testing only"
- No breaking changes to engine APIs

### Performance Metrics

**Bundle Size:**
- `simulation.worker.js`: ~40KB (gzipped)
- `sensitivity.worker.js`: ~38KB (gzipped)
- Both well under 50KB threshold

**Performance Impact:**
- UI remains responsive during 1000+ iteration Monte Carlo simulations
- No UI freezes during sensitivity analysis (up to 100 runs)
- Progress indicators provide user feedback during long-running operations

### Migration Status

**✅ Completed:**
- Simulation Worker (`src/workers/simulation.worker.ts`)
- Sensitivity Worker (`src/workers/sensitivity.worker.ts`)
- Worker Hooks (`useSimulationWorker`, `useSensitivityWorker`)
- UI Integration (`RiskView`, `SensitivityPanel`)

**Future Enhancements:**
- Parallel worker processing for multiple scenarios
- Worker pool management for optimal resource usage
- Cancellation support for long-running operations

---

## Strategic Milestone v3.1: "The Capital Experience Upgrade"

**Status**: ✅ **Complete**

## Strategic Milestone v3.2: "The Operations Command Center"

**Status**: ✅ **Complete**

## Strategic Milestone v3.3: "Workflow & Governance Experience"

**Status**: 🚧 **In Progress**

**Goal**: Transform the Meta-Layer (Scenario and Version Management) into a polished "Project Timeline" experience with Scenario Hub, Version Timeline, and Smart Restore.

### GovernanceView v3.3 Layout

**Two-Panel Structure**:
- **Top Section (Scenario Hub)**: Grid view of scenario cards
  - Each card shows: Name, Date, Key Metrics (NPV/IRR badges)
  - Actions: "Activate", "Clone", "Delete"
  - Visual: Card with hover effect, active state indicator
  
- **Bottom Section (Version Timeline)**: Vertical timeline component
  - Dots on a line (most recent at top)
  - Content: "User saved 'v2'", "Auto-save", timestamps
  - Click to open Diff Preview

### Scenario Hub Component

**Location**: `src/components/governance/ScenarioHub.tsx`

**Features**:
- Grid layout (responsive: 3 columns desktop, 2 tablet, 1 mobile)
- Scenario cards with preview metrics (NPV, IRR)
- Actions: Activate (load scenario), Clone (duplicate), Delete (remove)
- Active state indicator (highlights current scenario)

### Version Timeline Component

**Location**: `src/components/governance/VersionTimeline.tsx`

**Visual Design**:
- Vertical line (left side)
- Dots on line (one per version)
- Most recent at top
- Content on right: Action description, timestamp
- Click dot to open Diff Preview modal

### Smart Restore with Diff Preview

**Location**: `src/components/governance/DiffPreviewModal.tsx`

**Features**:
- Shows diff summary before confirming restore
- Key deltas: NPV change, IRR change, Equity Multiple change
- Human-readable summary (e.g., "IRR: -2%", "NPV: +$500K")
- Actions: "Cancel", "Confirm Restore"

### Scenario Summarizer Helper

**Location**: `src/engines/governance/scenarioSummarizer.ts`

**Function**: `summarizeScenario(scenario: SavedScenario): ScenarioPreview`
- Extracts preview metrics (NPV, IRR) from saved scenario
- Runs quick model calculation if needed
- Returns: `{ npv, irr, equityMultiple, paybackPeriod }`

**Strategy**: 
- Option 1: Run `runFullModel` quickly (acceptable for preview)
- Option 2: Cache metrics in `SavedScenario` when saving (future enhancement)
- For v3.3: Use Option 1 with memoization

### Diff Calculator Helper

**Location**: `src/engines/governance/diffCalculator.ts`

**Function**: `calculateDiffImpact(current: FullModelInput, target: SavedScenario): DiffImpact`
- Compares current scenario with target version
- Runs both models (or uses cached results)
- Returns key deltas: `{ npvDelta, irrDelta, equityMultipleDelta, summary }`

---

## Strategic Milestone v3.4: "Enterprise Reporting (Excel 2.0)"

**Status**: ✅ **Implemented**

**Goal**: Transform the Excel export from a "raw" data dump (v0.13) into a **"Board-Ready" Export Engine"**. The output must be formatted, grouped, and printable out-of-the-box for executive presentations and investor meetings.

**Context**: The previous Excel export (v0.13) was functional but "raw" - it exported data without professional formatting, grouping, or presentation-ready structure. v3.4 elevates Excel export to enterprise-grade reporting standards.

### Excel Architecture ("The Golden File")

**Sheet Structure** (in order):

1. **COVER** (Optional, configurable):
   - Project Title (large, centered)
   - Scenario Name
   - Export Date
   - Disclaimer text (configurable)
   - Logo placeholder (for future branding)
   - Professional layout with borders and spacing

2. **EXECUTIVE SUMMARY**:
   - High-level KPIs in card layout (using merged cells and borders)
   - Key Metrics: NPV, IRR, Equity Multiple, Payback Period
   - DCF Valuation summary
   - Visual hierarchy with color-coded sections
   - Print-ready formatting

3. **CASH FLOW (Annual)**:
   - USALI format (Uniform System of Accounts for the Lodging Industry)
   - Annual consolidated P&L
   - Revenue, COGS, OPEX, NOI, Debt Service, Levered FCF
   - Professional number formatting (currency, thousands separators)
   - Subtotals and totals with bold formatting

4. **CASH FLOW (Monthly)** (Optional, configurable):
   - **Crucial Feature**: Use Excel Grouping (Outline Level 1) to collapse months by default
   - Initially shows only Years (collapsed view)
   - Users can expand to see monthly detail
   - Structure: Year header row → 12 monthly rows (grouped)
   - USALI format for monthly data
   - Same line items as Annual sheet

5. **CAPITAL & WATERFALL**:
   - Detailed debt schedule by tranche
   - Equity waterfall distributions by partner
   - Partner KPIs (IRR, MOIC) summary table
   - Debt service schedule
   - Professional formatting with alternating row colors

### UX Features

**Freeze Panes**:
- All data sheets: `state: 'frozen'`, `xSplit: 1`, `ySplit: 1`
- Freeze first row (headers) and first column (line items)
- Ensures headers remain visible when scrolling

**Page Setup**:
- `orientation: 'landscape'` for all sheets (except COVER, which is portrait)
- `fitToPage: true` (auto-scale to fit one page width)
- `margins`: Professional margins (0.5" top/bottom, 0.75" left/right)
- `printTitles`: Repeat header rows on each printed page

**Formatting Standards**:
- Headers: Bold, blue background (#4472C4), white text, centered
- Currency cells: Number format `#,##0.00` with $ prefix
- Percentage cells: Number format `0.00%`
- Subtotals: Bold, with top border
- Totals: Bold, double top border, larger font
- Alternating row colors for data tables (light gray/white)

### Report Builder UI

**Configuration Modal** (before export):

**Location**: `src/components/export/ExcelExportConfigModal.tsx`

**Features**:
- Toggle: "Include Cover Page" (default: true)
- Toggle: "Include Monthly Data" (default: true)
- Input: "Prepared By" (text field, optional)
- Input: "Confidentiality Note" (textarea, optional)
- Button: "Export" (triggers export with selected options)
- Button: "Cancel" (closes modal)

**Integration**:
- Replace direct export button click with modal trigger
- Modal appears when user clicks "Export to Excel" in Header
- Export only proceeds after user confirms configuration

### Technical Implementation

**Component Structure**:
```
ExcelExportConfigModal (Modal Dialog)
├── Toggle: Include Cover Page
├── Toggle: Include Monthly Data
├── Input: Prepared By
├── Input: Confidentiality Note
└── Actions: Export, Cancel
```

**Engine Location**: `src/engines/export/enterpriseExcelExport.ts` (NEW)

**Function Signature**:
```typescript
export interface ExcelExportConfig {
  includeCoverPage: boolean;
  includeMonthlyData: boolean;
  preparedBy?: string;
  confidentialityNote?: string;
}

export async function generateEnterpriseExcel(
  scenario: NamedScenario,
  output: FullModelOutput,
  config: ExcelExportConfig
): Promise<void>
```

**Sheet Creation Functions**:
- `createCoverSheet(workbook, scenario, config)`: Creates COVER sheet
- `createExecutiveSummarySheet(workbook, scenario, output)`: Creates EXECUTIVE SUMMARY sheet
- `createCashFlowAnnualSheet(workbook, scenario, output)`: Creates CASH FLOW (Annual) sheet
- `createCashFlowMonthlySheet(workbook, scenario, output)`: Creates CASH FLOW (Monthly) with grouping
- `createCapitalWaterfallSheet(workbook, scenario, output)`: Creates CAPITAL & WATERFALL sheet

**Excel Grouping Implementation** (Monthly Sheet):
```typescript
// Group monthly rows under year header
for (let year = 0; year < maxYears; year++) {
  const yearRowIndex = startRow + (year * 13); // Year header row
  const monthStartRow = yearRowIndex + 1;
  const monthEndRow = monthStartRow + 11; // 12 months
  
  // Set outline level for months (collapsed by default)
  for (let row = monthStartRow; row <= monthEndRow; row++) {
    worksheet.getRow(row).outlineLevel = 1;
  }
  
  // Collapse group by default
  worksheet.getRow(monthStartRow).collapsed = true;
}
```

**Freeze Panes Implementation**:
```typescript
// Freeze first row and first column
worksheet.views = [{
  state: 'frozen',
  xSplit: 1,  // Freeze first column
  ySplit: 1,  // Freeze first row
  topLeftCell: 'B2',
  activeCell: 'B2'
}];
```

**Page Setup Implementation**:
```typescript
worksheet.pageSetup = {
  orientation: 'landscape',
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0, // Auto height
  margins: {
    left: 0.75,
    right: 0.75,
    top: 0.5,
    bottom: 0.5,
    header: 0.3,
    footer: 0.3
  }
};
```

### Migration Path

**Phase 1: Core Engine** (v3.4.0):
- Create `enterpriseExcelExport.ts` engine
- Implement sheet creation functions (Cover, Executive Summary, Annual, Monthly, Capital)
- Implement freeze panes and page setup
- Implement Excel grouping for monthly data

**Phase 2: Configuration UI** (v3.4.1):
- Create `ExcelExportConfigModal` component
- Integrate modal into Header export button
- Wire up configuration to export engine

**Phase 3: Formatting & Polish** (v3.4.2):
- Apply professional formatting (colors, borders, fonts)
- Implement USALI format for cash flow sheets
- Add print titles and page breaks
- Test print preview and output quality

**Phase 4: Testing & Validation** (v3.4.3):
- Test with various scenario configurations
- Validate Excel grouping works correctly
- Test freeze panes on all sheets
- Verify print layout and formatting
- User acceptance testing with sample exports

### Success Criteria

1. ✅ Excel export includes all 5 sheets (Cover optional, others required)
2. ✅ Monthly Cash Flow sheet uses Excel grouping (collapsed by default)
3. ✅ All data sheets have freeze panes (first row + first column)
4. ✅ All sheets configured for landscape printing with fit-to-page
5. ✅ Professional formatting applied (headers, borders, number formats)
6. ✅ Configuration modal allows customization before export
7. ✅ Cover page includes project title, scenario name, date, disclaimer
8. ✅ Executive Summary displays KPIs in card layout
9. ✅ Cash Flow sheets follow USALI format
10. ✅ Export is print-ready out-of-the-box

### What v3.4 Explicitly Does NOT Do

1. **No Excel Formulas**:
   - Export contains values only (no dynamic Excel formulas)
   - Users can add formulas manually if needed

2. **No Excel Charts**:
   - Chart generation in Excel deferred to future version
   - Data is structured for easy chart creation by users

3. **No Excel Import**:
   - Import functionality remains separate (v2.9+)
   - This release focuses on export quality only

4. **No Custom Templates**:
   - Template customization deferred to future version
   - Standard enterprise format for all exports

### v3.4 Agent Responsibilities

**Architecture Agent** (this agent):
- ✅ Define enterprise Excel export architecture (this document)
- ✅ Update roadmap to mark v3.4 as In Progress

**Core Logic Agent**:
- Implement `enterpriseExcelExport.ts` engine
- Implement sheet creation functions
- Implement Excel grouping logic for monthly data
- Implement freeze panes and page setup
- Ensure USALI format compliance

**UI Agent**:
- Implement `ExcelExportConfigModal` component
- Integrate modal into Header export flow
- Style modal for professional appearance
- Handle configuration state management

**QA Agent**:
- Test Excel export with various scenarios
- Validate Excel grouping functionality
- Test freeze panes on all sheets
- Verify print layout and formatting
- Test configuration modal interactions
- Validate USALI format compliance

**Documentation Agent**:
- Update ARCHITECTURE.md with v3.4 implementation details
- Document Excel export format and structure
- Update user guide with export instructions
- Create sample Excel export for reference

---

## Strategic Milestone v3.5: "Operational Fidelity"

**Status**: ✅ **Implemented**

**Goal**: Enhance the financial model to accurately reflect real-world operational dynamics by introducing **Seasonality** (monthly revenue curves) and **Operating Leverage** (Fixed vs Variable cost structure). This enables more realistic modeling where low revenue months show lower margins due to fixed costs.

**Context**: The model currently treats occupancy/revenue mostly linearly or with simple inputs. Real estate operations require sophisticated seasonality modeling and cost structure differentiation to accurately reflect operating leverage effects.

### Data Structure Updates

**Seasonality Curve**:
- Add `seasonalityCurve: number[]` to all `OperationConfig` types
- Array of 12 values (one per month, January through December)
- Each value is a multiplier factor (e.g., 1.2 = 20% above average, 0.8 = 20% below average)
- **Constraint**: Average of all 12 values must equal 1.0 (normalized)
- **Default**: `[1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]` (flat, no seasonality)

**Fixed Operating Expenses**:
- Add `fixedOperatingExpenses: number` to all `OperationConfig` types
- Annual fixed cost amount in project currency
- Represents costs that do not vary with revenue (e.g., base payroll, rent, insurance, property taxes)
- **Default**: `0` (backward compatible - existing models use variable-only costs)

**Type Definition Updates**:
```typescript
// Add to all OperationConfig interfaces (HotelConfig, VillasConfig, etc.)
export interface HotelConfig {
  // ... existing fields ...
  
  // v3.5: Seasonality curve (12 monthly factors, average = 1.0)
  seasonalityCurve?: number[];  // Optional, defaults to flat [1.0, ...]
  
  // v3.5: Fixed operating expenses (annual $)
  fixedOperatingExpenses?: number;  // Optional, defaults to 0
}
```

### Logic Behavior

**Seasonality Application**:
- **Formula**: `MonthlyRevenue[m] = BaseRevenue[m] * SeasonalityFactor[m]`
- Seasonality is applied **after** calculating base revenue from occupancy/utilization
- Seasonality affects **all revenue streams** (room, food, beverage, other) proportionally
- Example: If base revenue is $100K and seasonality factor is 1.2, actual revenue = $120K

**Cost Structure Calculation**:
- **Formula**: `TotalOpex[m] = (FixedOpex / 12) + (Revenue[m] * VariableOpexPct)`
- Fixed costs are allocated evenly across 12 months (annual amount / 12)
- Variable costs remain as percentage of revenue (existing behavior)
- **Result**: Low revenue months show lower margins due to fixed cost burden

**Implementation Pattern** (for all operation engines):
```typescript
// Calculate base revenue (existing logic)
const baseRevenue = calculateBaseRevenue(config, monthIndex);

// Apply seasonality curve (v3.5)
const seasonalityFactor = config.seasonalityCurve?.[monthIndex] ?? 1.0;
const adjustedRevenue = baseRevenue * seasonalityFactor;

// Calculate costs with fixed + variable structure (v3.5)
const monthlyFixedOpex = (config.fixedOperatingExpenses ?? 0) / 12;
const variableOpex = adjustedRevenue * config.payrollPct + 
                     adjustedRevenue * config.utilitiesPct + 
                     // ... other variable percentages
const totalOpex = monthlyFixedOpex + variableOpex;
```

**Operating Leverage Effect**:
- High seasonality months (e.g., summer for beach properties) will show **higher margins** (fixed costs spread over more revenue)
- Low seasonality months (e.g., winter) will show **lower margins** (same fixed costs, less revenue)
- This creates realistic margin compression in off-peak periods

### UI Architecture

**Seasonality Editor**:

**Location**: `src/components/operations/SeasonalityEditor.tsx`

**Features**:
- Bar chart visualization of 12 monthly factors
- Interactive drag-handles on bars (or input fields) to adjust values
- Visual indicator showing average (must be 1.0)
- Preset templates: "Flat", "Summer Peak", "Winter Peak", "Holiday Peak", "Custom"
- Real-time validation: Warns if average ≠ 1.0
- Auto-normalize button: Adjusts all values to maintain average = 1.0

**Integration**:
- Embedded in `OperationsView` for each operation
- Tab or section: "Seasonality & Costs"
- Shows current seasonality curve with visual feedback

**Cost Form Enhancement**:

**Location**: `src/components/operations/OperatingExpensesForm.tsx` (UPDATE)

**Current Structure** (Variable Only):
- Payroll: X% of revenue
- Utilities: Y% of revenue
- Marketing: Z% of revenue
- etc.

**New Structure** (Fixed + Variable):
- **Fixed Operating Expenses**: $XXX,XXX annually
  - Input: Currency field
  - Help text: "Costs that don't vary with revenue (base payroll, rent, insurance, property taxes)"
  
- **Variable Operating Expenses** (as % of revenue):
  - Payroll: X% of revenue (incremental payroll)
  - Utilities: Y% of revenue
  - Marketing: Z% of revenue
  - Maintenance OPEX: W% of revenue
  - Other OPEX: V% of revenue

**Visual Design**:
- Split into two sections: "Fixed Costs" and "Variable Costs"
- Fixed costs section: Single input field with annual amount
- Variable costs section: Existing percentage inputs
- Summary card: Shows "Total Annual OPEX at 100% Revenue" = Fixed + (Variable % × Base Revenue)

### Technical Implementation

**Engine Updates**:

**Location**: All operation engines in `src/engines/operations/*.ts`

**Changes Required**:
1. Read `seasonalityCurve` from config (default to flat if not provided)
2. Apply seasonality factor to base revenue calculation
3. Read `fixedOperatingExpenses` from config (default to 0)
4. Calculate monthly fixed OPEX = annual fixed / 12
5. Calculate variable OPEX = revenue × percentages (existing logic)
6. Total OPEX = fixed + variable

**Example** (Hotel Engine):
```typescript
// Existing: Calculate base revenue
const roomRevenue = occupiedRooms * config.avgDailyRate;
// ... calculate foodRevenue, beverageRevenue, otherRevenue
const baseTotalRevenue = roomRevenue + foodRevenue + beverageRevenue + otherRevenue;

// v3.5: Apply seasonality
const seasonalityFactor = config.seasonalityCurve?.[monthIndex] ?? 1.0;
const totalRevenue = baseTotalRevenue * seasonalityFactor;

// v3.5: Calculate costs with fixed + variable
const monthlyFixedOpex = (config.fixedOperatingExpenses ?? 0) / 12;
const payroll = totalRevenue * config.payrollPct;
const utilities = totalRevenue * config.utilitiesPct;
// ... other variable costs
const variableOpex = payroll + utilities + marketing + maintenanceOpex + otherOpex;
const totalOpex = monthlyFixedOpex + variableOpex;
```

**Validation**:

**Location**: `src/engines/validation/operationConfigValidator.ts` (NEW or UPDATE)

**Rules**:
1. `seasonalityCurve` must have exactly 12 elements
2. All `seasonalityCurve` values must be > 0
3. Average of `seasonalityCurve` must equal 1.0 (within tolerance, e.g., ±0.01)
4. `fixedOperatingExpenses` must be ≥ 0

**Migration Path**

**Phase 1: Data Structure** (v3.5.0):
- Add `seasonalityCurve` and `fixedOperatingExpenses` to all `OperationConfig` types
- Make fields optional with sensible defaults (flat seasonality, $0 fixed costs)
- Update type definitions in `src/domain/types.ts`
- Ensure backward compatibility (existing configs work without new fields)

**Phase 2: Engine Logic** (v3.5.1):
- Update all operation engines to apply seasonality
- Update all operation engines to calculate fixed + variable costs
- Test with various seasonality curves and fixed cost amounts
- Validate operating leverage effects (low revenue months show lower margins)

**Phase 3: UI Components** (v3.5.2):
- Create `SeasonalityEditor` component
- Update `OperatingExpensesForm` to include fixed costs
- Integrate into `OperationsView`
- Add validation and normalization features

**Phase 4: Testing & Validation** (v3.5.3):
- Test seasonality with various curves (summer peak, winter peak, flat)
- Test fixed costs with various amounts
- Validate operating leverage (margins compress in low revenue months)
- Test backward compatibility (existing scenarios without new fields)
- User acceptance testing with real-world seasonality patterns

### Success Criteria

1. ✅ All `OperationConfig` types include `seasonalityCurve` and `fixedOperatingExpenses` fields
2. ✅ Seasonality is applied to monthly revenue calculations
3. ✅ Operating expenses calculated as Fixed + Variable structure
4. ✅ Low revenue months show lower margins (operating leverage effect)
5. ✅ Seasonality Editor component allows interactive adjustment of 12 monthly factors
6. ✅ Cost Form includes fixed operating expenses input
7. ✅ Validation ensures seasonality curve averages to 1.0
8. ✅ Backward compatibility maintained (existing configs work without new fields)
9. ✅ All operation engines (9 types) updated with new logic
10. ✅ Realistic margin compression in off-peak periods

### What v3.5 Explicitly Does NOT Do

1. **No Dynamic Seasonality**:
   - Seasonality curve is static (same pattern every year)
   - No year-over-year seasonality changes
   - No trend adjustments to seasonality

2. **No Category-Specific Fixed Costs**:
   - Fixed costs are a single annual amount
   - No breakdown by expense category (e.g., fixed payroll vs fixed rent)
   - All fixed costs allocated evenly across 12 months

3. **No Revenue-Specific Seasonality**:
   - Same seasonality factor applies to all revenue streams
   - No separate seasonality for room vs food vs beverage revenue
   - All revenue streams scale proportionally

4. **No Cost Escalation**:
   - Fixed costs remain constant across years
   - No inflation or escalation factors for fixed costs
   - Variable cost percentages remain constant

### v3.5 Agent Responsibilities

**Architecture Agent** (this agent):
- ✅ Define operational fidelity architecture (this document)
- ✅ Update roadmap to mark v3.5 as In Progress

**Core Logic Agent**:
- Update all `OperationConfig` type definitions
- Update all 9 operation engines with seasonality and fixed cost logic
- Implement validation for seasonality curve (average = 1.0)
- Ensure backward compatibility
- Test operating leverage effects

**UI Agent**:
- Create `SeasonalityEditor` component (bar chart with drag-handles)
- Update `OperatingExpensesForm` to include fixed costs section
- Integrate components into `OperationsView`
- Add validation and normalization UI features
- Create preset seasonality templates

**QA Agent**:
- Test seasonality application across all operation types
- Test fixed cost calculations and operating leverage
- Validate margin compression in low revenue months
- Test backward compatibility (existing configs)
- Test validation rules (seasonality average = 1.0)
- User acceptance testing with real-world patterns

**Documentation Agent**:
- Update ARCHITECTURE.md with v3.5 implementation details
- Document seasonality curve format and usage
- Document fixed vs variable cost structure
- Update user guide with seasonality and cost editing instructions
- Create examples of seasonality patterns (summer peak, winter peak, etc.)

---

## Strategic Milestone v3.6: "Development & Variance Intelligence"

**Status**: ✅ **Complete**

**Context**: We are merging two major feature sets:

1. **Development Modeling**: Spreading `initialInvestment` over a construction timeline (S-Curve) instead of Year 0 lump sum.
2. **Variance Analysis**: Explaining the delta between two scenarios via a "Bridge Chart".

### Construction Architecture (v3.6.0)

**Goal**: Transform `initialInvestment` from a single T0 outflow into a `monthlyConstructionFlow` array that spreads investment over a construction timeline.

#### ProjectConfig Updates

**Location**: `src/domain/types.ts`

**New Fields**:
```typescript
export interface ProjectConfig {
  // ... existing fields ...
  initialInvestment: number;        // total project cost (unchanged)
  
  // v3.6: Construction timeline configuration
  constructionDuration?: number;    // months, optional (default = 0 means T0 lump sum)
  constructionCurve?: 's-curve' | 'linear';  // default = 's-curve'
  drawdownLogic?: 'equity_first' | 'pari_passu';  // default = 'equity_first'
}
```

**Default Behavior (Backward Compatibility)**:
- If `constructionDuration === undefined` or `constructionDuration === 0`, use existing behavior (T0 lump sum)
- If `constructionDuration > 0`, generate `monthlyConstructionFlow` array

#### Construction Flow Generator

**Location**: `src/engines/project/constructionFlowGenerator.ts` (NEW)

**Function**:
```typescript
/**
 * Generates monthly construction flow array from initial investment.
 * 
 * v3.6: Development Modeling
 * 
 * @param initialInvestment - Total project cost
 * @param constructionDuration - Construction duration in months
 * @param constructionCurve - Curve type ('s-curve' | 'linear')
 * @returns Array of monthly construction outflows (negative values)
 */
export function generateConstructionFlow(
  initialInvestment: number,
  constructionDuration: number,
  constructionCurve: 's-curve' | 'linear' = 's-curve'
): number[] {
  // Returns array of length = constructionDuration
  // Each element is negative (outflow)
  // Sum of absolute values = initialInvestment
}
```

**S-Curve Formula**:
- Common S-curve pattern: Slow start (10-15%), ramp-up (60-70%), slow finish (15-20%)
- Implementation: Use cumulative normal distribution or piecewise linear approximation
- Formula: `monthlyFlow[i] = initialInvestment * (sCurveCdf((i+1)/duration) - sCurveCdf(i/duration))`

**Linear Formula**:
- Simple: `monthlyFlow[i] = -initialInvestment / constructionDuration`

#### ProjectEngine Integration

**Location**: `src/engines/project/projectEngine.ts`

**Changes**:
1. Generate `monthlyConstructionFlow` if `constructionDuration > 0`
2. Replace single Year 0 outflow with monthly flows
3. Aggregate monthly flows into annual cash flows for DCF

**Modified Logic** (lines 92-96):
```typescript
// v3.6: Construction flow generation
let constructionFlows: number[] = [];
if (config.constructionDuration && config.constructionDuration > 0) {
  const monthlyFlow = generateConstructionFlow(
    config.initialInvestment,
    config.constructionDuration,
    config.constructionCurve ?? 's-curve'
  );
  
  // Aggregate monthly flows into annual cash flows
  // Construction flows occur BEFORE Year 0 operational cash flows
  // Need to align with DCF cash flow series
  constructionFlows = aggregateMonthlyToAnnual(monthlyFlow, scenarioStartYear);
} else {
  // Legacy behavior: single T0 outflow
  constructionFlows = [-config.initialInvestment];
}

// Build cash flow series for DCF
const cashFlows: number[] = [];
// Year 0: construction flows (negative)
cashFlows.push(...constructionFlows);
// ... rest of DCF logic
```

**Challenge**: DCF cash flows are currently annual. Construction flows are monthly. Need to:
- Option 1: Aggregate monthly construction flows to annual (simpler, maintains annual DCF)
- Option 2: Switch DCF to monthly granularity (complex, breaks existing logic)

**Decision**: Use Option 1 (aggregate to annual) for v3.6. Monthly granularity deferred to v3.7+.

#### Drawdown Logic (Future)

**v3.6 Scope**: `drawdownLogic` is added to `ProjectConfig` but not implemented in v3.6.0.

**Future Implementation**:
- `'equity_first'`: Equity funds construction, debt draws down after completion
- `'pari_passu'`: Equity and debt draw down proportionally during construction

**Note**: This requires capital engine integration (when debt starts, construction draws). Deferred to v3.6.1.

### Variance Analysis Architecture (v3.6.1)

**Goal**: Create a "Step-by-Step" sensitivity comparison that explains the delta between two scenarios via a Bridge Chart.

#### Bridge Engine

**Location**: `src/engines/analysis/varianceEngine.ts` (NEW)

**Input**:
```typescript
export interface VarianceAnalysisInput {
  baseScenario: FullModelInput;      // Scenario A (Base)
  targetScenario: FullModelInput;    // Scenario B (Target)
  categories?: string[];              // Optional: specific categories to analyze
}
```

**Output**:
```typescript
export interface BridgeData {
  category: string;        // e.g., 'ADR', 'Occupancy', 'Cost', 'Discount Rate'
  impact: number;          // Delta in target KPI (e.g., NPV delta in $)
  baseValue: number;       // Base scenario value for this category
  targetValue: number;     // Target scenario value for this category
  sequence: number;        // Order of application (for bridge chart)
}

export interface VarianceAnalysisResult {
  bridgeData: BridgeData[];
  baseKpis: ProjectKpis;
  targetKpis: ProjectKpis;
  totalDelta: number;      // Total delta in target KPI (e.g., NPV)
  kpiType: 'npv' | 'irr' | 'equityMultiple';  // Which KPI is being analyzed
}
```

**Algorithm**: Sequential Step-by-Step Application

1. **Start with Base Scenario**: Run `runFullModel(baseScenario)` → `baseKpis`
2. **Apply Changes Sequentially**: 
   - Clone base scenario
   - Apply Target's ADR to Base → measure delta
   - Apply Target's Occupancy to previous result → measure delta
   - Apply Target's Cost to previous result → measure delta
   - Continue for all relevant categories
3. **Calculate Impacts**: Each step's delta = `currentKpi - previousKpi`

**Implementation**:
```typescript
export function runVarianceAnalysis(
  input: VarianceAnalysisInput,
  targetKpi: 'npv' | 'irr' | 'equityMultiple' = 'npv'
): VarianceAnalysisResult {
  // 1. Run base scenario
  const baseOutput = runFullModel(input.baseScenario);
  const baseKpis = baseOutput.project.projectKpis;
  
  // 2. Define categories to analyze (ADR, Occupancy, Cost, Discount Rate, etc.)
  const categories = input.categories ?? [
    'adr',
    'occupancy',
    'cost',
    'discountRate',
    'terminalGrowthRate',
  ];
  
  // 3. Sequential application
  const bridgeData: BridgeData[] = [];
  let currentInput = cloneFullModelInput(input.baseScenario);
  let previousKpi = extractKpi(baseKpis, targetKpi);
  
  for (const category of categories) {
    // Apply target's category value to current input
    applyCategoryValue(currentInput, input.targetScenario, category);
    
    // Run model with applied change
    const output = runFullModel(currentInput);
    const currentKpi = extractKpi(output.project.projectKpis, targetKpi);
    
    // Calculate impact
    const impact = currentKpi - previousKpi;
    
    // Get base and target values for this category
    const { baseValue, targetValue } = getCategoryValues(
      input.baseScenario,
      input.targetScenario,
      category
    );
    
    bridgeData.push({
      category,
      impact,
      baseValue,
      targetValue,
      sequence: bridgeData.length + 1,
    });
    
    previousKpi = currentKpi;
  }
  
  // 4. Run full target scenario to verify
  const targetOutput = runFullModel(input.targetScenario);
  const targetKpis = targetOutput.project.projectKpis;
  const finalKpi = extractKpi(targetKpis, targetKpi);
  const totalDelta = finalKpi - extractKpi(baseKpis, targetKpi);
  
  return {
    bridgeData,
    baseKpis,
    targetKpis,
    totalDelta,
    kpiType: targetKpi,
  };
}
```

#### Bridge Chart Visualization

**Location**: `src/components/analysis/BridgeChart.tsx` (NEW)

**Props**:
```typescript
interface BridgeChartProps {
  bridgeData: BridgeData[];
  baseKpi: number;
  targetKpi: number;
  kpiType: 'npv' | 'irr' | 'equityMultiple';
  currency?: string;
}
```

**Visualization**: Waterfall/Bridge Chart (using Recharts)
- Starting bar: Base KPI value
- Sequential bars: Each category impact (positive/negative)
- Ending bar: Target KPI value
- Colors: Green (positive impact), Red (negative impact)

### Modified Files

**New Files**:
- `src/engines/project/constructionFlowGenerator.ts` - Construction flow generation
- `src/engines/analysis/varianceEngine.ts` - Variance analysis engine
- `src/components/analysis/BridgeChart.tsx` - Bridge chart visualization
- `src/tests/engines/project/constructionFlowGenerator.test.ts` - Construction flow tests
- `src/tests/engines/analysis/varianceEngine.test.ts` - Variance analysis tests

**Modified Files**:
- `src/domain/types.ts` - Update `ProjectConfig` interface
- `src/engines/project/projectEngine.ts` - Integrate construction flows
- `src/domain/schemas.ts` - Update `ProjectConfigSchema` validation
- `docs/ARCHITECTURE.md` - Document v3.6 architecture

### Implementation Phases

**Phase 1: Construction Architecture** (v3.6.0)
1. Update `ProjectConfig` type with construction fields
2. Implement `generateConstructionFlow` function
3. Integrate construction flows into `projectEngine.ts`
4. Test backward compatibility (constructionDuration = 0)
5. Test S-curve and linear patterns

**Phase 2: Variance Architecture** (v3.6.1)
1. Implement `runVarianceAnalysis` function
2. Implement category extraction helpers
3. Create `BridgeChart` component
4. Integrate into Analysis view
5. Test sequential application accuracy

**Phase 3: UI Integration** (v3.6.2)
1. Add construction configuration UI to ProjectConfig form
2. Add Variance Analysis panel to Analysis view
3. Wire up Bridge Chart visualization
4. Add scenario comparison selector

### Risk Assessment

**Technical Risks**:

1. **Construction Flow Aggregation**: Monthly flows need aggregation to annual DCF
   - **Risk**: Timing mismatch (construction months vs. operational years)
   - **Mitigation**: Align construction period with scenario start year
   - **Impact**: Medium (affects DCF accuracy)

2. **Sequential Variance Application**: Order matters for impact calculation
   - **Risk**: Different orders produce different bridge results
   - **Mitigation**: Use fixed category order, document ordering
   - **Impact**: Low (expected behavior for sensitivity analysis)

3. **Performance**: Variance analysis runs multiple full model executions
   - **Risk**: Slow for large scenarios
   - **Mitigation**: Use Web Worker (if > 10 category comparisons)
   - **Impact**: Low (sequential runs are fast enough)

**Breaking Changes**:

- **None** - All changes are additive or optional
- `constructionDuration` defaults to 0 (backward compatible)
- Variance analysis is new feature (no existing code affected)

### Success Criteria

1. ✅ Construction flows spread `initialInvestment` over construction timeline
2. ✅ S-curve and linear patterns work correctly
3. ✅ Backward compatibility maintained (constructionDuration = 0)
4. ✅ Variance analysis produces accurate bridge data
5. ✅ Bridge Chart visualizes sequential impacts
6. ✅ Construction configuration UI functional
7. ✅ Variance Analysis panel integrated into Analysis view

### Confidence Score

**Confidence Score: 0.80**

**Justification**:
- **Strengths**:
  - Clear construction flow algorithm (S-curve formula well-defined)
  - Sequential variance analysis is standard sensitivity technique
  - Backward compatibility straightforward (optional fields)
  - Existing infrastructure supports both features
  
- **Gaps/Concerns**:
  - Monthly-to-annual aggregation timing needs careful alignment
  - Sequential variance order matters (need documentation)
  - Drawdown logic deferred (equity/debt timing complexity)
  
- **Recommendations**:
  - Start with construction architecture (foundation)
  - Use Option 1 (aggregate to annual) for simplicity
  - Document sequential variance ordering clearly
  - Defer drawdown logic to v3.6.1

### v3.6 Agent Responsibilities

**Architecture Agent** (this agent):
- ✅ Define v3.6 architecture (this document)
- ✅ Update roadmap to mark v3.6 as In Progress

**Core Logic Agent**:
- Update `ProjectConfig` type with construction fields
- Implement `generateConstructionFlow` function
- Integrate construction flows into `projectEngine.ts`
- Implement `runVarianceAnalysis` function
- Implement category extraction helpers

**UI Agent**:
- Add construction configuration UI to ProjectConfig form
- Create `BridgeChart` component
- Add Variance Analysis panel to Analysis view
- Wire up scenario comparison selector

**QA Agent**:
- Test construction flow generation (S-curve, linear)
- Test backward compatibility (constructionDuration = 0)
- Test variance analysis accuracy
- Test bridge chart visualization

**Documentation Agent**:
- Update ARCHITECTURE.md with v3.6 implementation details
- Document construction curve formulas
- Document variance analysis algorithm
- Update user guide with construction and variance features

---

## Strategic Milestone v4.0: "The Cloud Foundation"

**Status**: 🚧 **In Progress**

**Context**: We are migrating from "Local Storage" (localStorage) to "Cloud Storage" (Supabase). This enables multi-device access, user accounts, and centralized scenario management.

### Migration Overview

**Goal**: Transform the application from a local-first single-device experience to a cloud-first multi-device experience with user authentication and centralized data storage.

**Key Changes**:
1. **Storage Layer**: Replace `localStorage` with Supabase (PostgreSQL + Auth)
2. **Authentication**: Add user authentication via Supabase Auth
3. **Data Isolation**: Implement Row Level Security (RLS) for user data isolation
4. **Application Flow**: Add authentication flow (Login, Sign Up, Session Management)

### Current State Analysis

#### Existing Storage Layer

**Scenario Library** (`src/ui/state/scenarioLibrary.ts`):
- Stores `NamedScenario[]` in localStorage with key `'hospitality_scenarios_v1'`
- CRUD operations: `createScenario`, `updateScenario`, `deleteScenario`, `getScenario`, `getAllScenarios`
- Auto-saves to localStorage on every change

**Version Storage** (`src/ui/utils/versionStorage.ts`):
- Stores `SavedScenario[]` in localStorage with key `'hospitality_scenario_versions_v1'`
- CRUD operations: `addVersion`, `loadVersions`, `getVersion`
- Manages scenario version snapshots

**Data Structure**:
- `NamedScenario`: `{ id, name, description?, modelConfig: FullModelInput }`
- `SavedScenario`: extends `NamedScenario` with `lastModified: number` (milliseconds)

### Cloud Architecture (v4.0)

#### Tech Stack

**Backend**: Supabase
- **Database**: PostgreSQL (managed)
- **Auth**: Supabase Auth (email/password, OAuth support)
- **Storage**: Row Level Security (RLS) policies
- **API**: Auto-generated REST/GraphQL from database schema

**Client**: `@supabase/supabase-js`
- Official Supabase JavaScript client
- TypeScript support
- React hooks for authentication state

#### Database Schema

**Location**: `supabase/migrations/001_initial_schema.sql` (NEW)

**SQL Schema Definition**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scenarios table
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL,  -- Stores full NamedScenario as JSON
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX idx_scenarios_user_id ON scenarios(user_id);

-- Create index on updated_at for sorting
CREATE INDEX idx_scenarios_updated_at ON scenarios(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Scenarios RLS Policies
CREATE POLICY "Users can view their own scenarios"
  ON scenarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scenarios"
  ON scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios"
  ON scenarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios"
  ON scenarios FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on scenarios
CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Modified Files

**New Files**:
- `supabase/migrations/001_initial_schema.sql` - Database schema
- `src/domain/supabase.ts` - Database type definitions
- `src/lib/supabase.ts` - Supabase client setup
- `src/lib/auth.ts` - Authentication functions
- `src/ui/storage/cloudStorage.ts` - Cloud storage implementation
- `src/ui/hooks/useAuth.ts` - Authentication React hook
- `src/ui/components/AuthView.tsx` - Login/Sign Up UI
- `src/ui/components/LandingPage.tsx` - Landing page component
- `.env.local.example` - Environment variables template

**Modified Files**:
- `src/App.tsx` - Add authentication flow
- `src/ui/state/scenarioLibrary.ts` - Migrate to cloud storage
- `src/ui/utils/versionStorage.ts` - Migrate to cloud storage (or extend scenarios table)
- `package.json` - Add `@supabase/supabase-js` dependency
- `docs/ARCHITECTURE.md` - Document v4.0 architecture

### Implementation Phases

**Phase 1: Database Setup** (v4.0.0)
1. Create Supabase project
2. Run migration SQL to create schema
3. Set up RLS policies
4. Test database access

**Phase 2: Client Integration** (v4.0.1)
1. Install `@supabase/supabase-js`
2. Create Supabase client
3. Implement authentication layer
4. Create auth UI components

#### v4.0.1: Auth Redirects (URGENT FIX)

**Status**: ✅ **Complete**

**Context**: Users were locked out due to missing or implicit redirect URI logic. Google Sign-In and Magic Links were failing because Supabase didn't know where to send users back after authentication (Localhost vs Production).

**Solution**: Enforce explicit `redirectTo` parameters in all auth calls.

**Implementation**:

1. **Auth Logic Update** (`src/contexts/AuthContext.tsx`):
   - `signInWithGoogle`: **MUST** pass `redirectTo: window.location.origin` in `options`
   - `signInWithMagicLink`: **MUST** pass `emailRedirectTo: window.location.origin` in `options`
   - Added `getRedirectUri()` helper function to ensure consistent redirect URI generation
   - Added `enhanceRedirectError()` function to provide helpful error messages for redirect URL configuration issues

2. **UX Improvements** (`src/views/AuthView.tsx`):
   - Shows clear "Check your email" message after sending magic link
   - Hides the form after successful magic link send (replaced with prominent success state)
   - Displays multi-line error messages with helpful hints about Supabase Dashboard configuration
   - Preserves line breaks in error messages for better readability

3. **Error Handling**:
   - Detects redirect URL configuration errors
   - Provides actionable guidance: "Go to Supabase Dashboard → Authentication → URL Configuration"
   - Shows the exact redirect URI that needs to be added
   - Differentiates between localhost and production environments

**Critical Rules**:

- **NEVER** omit `redirectTo` or `emailRedirectTo` parameters
- **ALWAYS** use `window.location.origin` to ensure environment-agnostic redirects
- **ALWAYS** enhance redirect-related errors with configuration guidance
- **ALWAYS** show clear success states after sending magic links

**Files Modified**:
- `src/contexts/AuthContext.tsx` - Added explicit redirect URIs and error enhancement
- `src/views/AuthView.tsx` - Improved UX with success states and better error display

**Supabase Configuration Required**:
- Add redirect URLs in Supabase Dashboard → Authentication → URL Configuration
- For localhost: Add `http://localhost:*` or specific port (e.g., `http://localhost:5173`)
- For production: Add production domain (e.g., `https://yourdomain.com`)

#### v4.0.2: Guest Access Mode (Strategic Update)

**Status**: ✅ **Complete**

**Context**: Strict Authentication (v4.0) blocked AI Agents and quick demos. Users needed a way to access the application without Supabase Auth setup.

**Solution**: Implemented "Guest Mode" that allows access without authentication while preserving v4.0 cloud features for authenticated users.

**Implementation**:

1. **Auth Logic Update** (`src/contexts/AuthContext.tsx`):
   - Added `guestMode` boolean state to track guest access
   - Added `enterAsGuest()` function to enable guest mode
   - Added `exitGuestMode()` function to return to auth flow
   - Guest mode automatically exits when user signs in
   - Guest mode automatically exits when user signs out

2. **App Access Logic** (`src/App.tsx`):
   - Updated condition: `if (!user && !guestMode)` → Show AuthView
   - Allows access if `user OR guestMode` is true
   - Preserves v4.0 authentication flow for authenticated users

3. **Hybrid Data Layer** (`src/ui/hooks/useScenarioLibrary.ts`):
   - **If `user` exists**: Uses Supabase cloud storage (async, v4.0 behavior)
   - **If `guestMode` is enabled**: Uses localStorage (sync, v3.6 behavior)
   - **Otherwise**: Falls back to localStorage
   - All CRUD operations (list, get, add, update, delete, reset) respect the hybrid storage logic

4. **UX Improvements** (`src/views/AuthView.tsx`):
   - Added "Continue as Guest" button below Google sign-in
   - Button is hidden when magic link email is sent
   - Styled as secondary action (transparent background, subtle border)
   - Clear visual separation with divider

**Critical Rules**:

- **NEVER** require authentication for guest mode access
- **ALWAYS** use localStorage when `guestMode` is true (even if `user` is null)
- **ALWAYS** use Supabase when `user` exists (even if `guestMode` is true)
- **ALWAYS** exit guest mode when user authenticates
- **ALWAYS** preserve v3.6 localStorage behavior for guests

**Storage Decision Logic**:

```
if (user) {
  // Authenticated: Use Supabase cloud storage
  storage = 'cloud';
} else if (guestMode) {
  // Guest mode: Use localStorage (v3.6 behavior)
  storage = 'local';
} else {
  // Fallback: Use localStorage
  storage = 'local';
}
```

**Files Modified**:
- `src/contexts/AuthContext.tsx` - Added guestMode state and enterAsGuest/exitGuestMode functions
- `src/App.tsx` - Updated access condition to allow guest mode
- `src/ui/hooks/useScenarioLibrary.ts` - Updated to check guestMode for storage selection
- `src/views/AuthView.tsx` - Added "Continue as Guest" button

**Benefits**:
- Enables AI Agents to access the app without auth setup
- Allows quick demos without Supabase configuration
- Preserves v3.6 localStorage behavior for guests
- Maintains v4.0 cloud features for authenticated users
- Seamless transition: Guests can sign in later to migrate to cloud storage

**Phase 3: Storage Migration** (v4.0.2)
1. Implement cloud storage layer
2. Migrate scenario library to cloud
3. Add migration utility for localStorage data
4. Test CRUD operations

**Phase 4: Application Flow** (v4.0.3)
1. Add authentication flow to App.tsx
2. Create landing page / login UI
3. Handle session management
4. Test full flow (sign up, login, scenarios)

### Risk Assessment

**Technical Risks**:

1. **Data Migration**: Existing localStorage data needs migration
   - **Risk**: Data loss during migration
   - **Mitigation**: Create migration utility with backup, test thoroughly
   - **Impact**: High (user data at risk)

2. **RLS Policies**: Incorrect policies could expose data
   - **Risk**: Users can access other users' scenarios
   - **Mitigation**: Test RLS policies thoroughly, use Supabase RLS testing
   - **Impact**: Critical (security issue)

3. **Network Dependency**: Cloud storage requires internet
   - **Risk**: App unusable offline
   - **Mitigation**: Add offline mode with localStorage sync (v4.1.0)
   - **Impact**: Medium (affects UX)

**Breaking Changes**:

- **Major**: Requires Supabase account and environment variables
- **Major**: Existing localStorage data needs migration
- **Breaking**: Storage API changes (async operations)
- **Breaking**: Authentication required (no anonymous access)

### Success Criteria

1. ✅ Database schema created and RLS policies working
2. ✅ User authentication functional (sign up, sign in, sign out)
3. ✅ Scenarios stored in Supabase instead of localStorage
4. ✅ Users can only access their own scenarios (RLS verified)
5. ✅ Existing localStorage data migrates to Supabase
6. ✅ Application flow handles authenticated and unauthenticated states
7. ✅ Landing page / Login UI functional

### Confidence Score

**Confidence Score: 0.75**

**Justification**:
- **Strengths**:
  - Supabase is well-documented and mature
  - RLS policies are straightforward for single-tenant isolation
  - Storage layer migration is clear (replace localStorage calls)
  - Authentication flow is standard
  
- **Gaps/Concerns**:
  - Data migration from localStorage needs careful testing
  - RLS policy correctness is critical (security)
  - Offline mode deferred (affects UX initially)
  - Requires Supabase account setup (deployment dependency)

### v4.0 Agent Responsibilities

**Architecture Agent** (this agent):
- ✅ Define v4.0 cloud architecture (this document)
- ✅ Update roadmap to mark v4.0 as In Progress

**Core Logic Agent**:
- Create database schema migration
- Implement cloud storage layer
- Implement authentication layer
- Test RLS policies

**UI Agent**:
- Create authentication UI (Login, Sign Up)
- Create landing page component
- Update App.tsx with authentication flow
- Handle loading states

**QA Agent**:
- Test authentication flow (sign up, sign in, sign out)
- Test RLS policies (verify data isolation)
- Test data migration from localStorage
- Test session management

**Documentation Agent**:
- Update ARCHITECTURE.md with v4.0 implementation details
- Document Supabase setup process
- Document environment variables
- Create user migration guide

---

## Strategic Milestone v4.x: "UI/UX Transformation Series"

**Context**: With v4.0 (Cloud Foundation) and v4.1 (Long Scroll Layout) complete, the v4.x series focuses exclusively on transforming the UI/UX from "Standard Admin" to "Modern Financial Product".

### v4.2: Visual Hierarchy & Bento Grid

**Status**: 🚧 **In Progress**

**Context**: The current dashboard is linear and repetitive. We will adopt a **"Bento Grid" layout** strategy: Modular cards of varying sizes (1x1, 2x1, 2x2) to create visual interest and hierarchy.

**Goal**: Transform layout from "Standard Admin" to "Modern Financial Product" with enhanced visual hierarchy and modular grid layouts.

**Key Deliverables**:
- ✅ `StatCard` component with Header/Body/Footer anatomy
- ✅ `GridContainer` and `GridItem` components for 12-column layouts
- ✅ Bento Grid layout for Dashboard
- ✅ Enhanced typography contrast (bold headings, muted metadata)
- 🚧 Apply Bento Grid to other views (deferred to v4.3)

**Layout Philosophy**:
- **Bento Grid**: A 4-column or 12-column CSS Grid system
- **Card Anatomy**: Update `SectionCard` to support "Frameless" mode (cleaner look) and "Hero" mode (highlighted background)
- **Typography**: Enforce strict hierarchy. Use `text-display` for main KPIs and `text-muted` for labels

**Dashboard Composition** (Bento Grid Layout):

**Grid System**: 12-column CSS Grid with configurable gaps

**Hero Block (Top Left, 2x1)**:
- **Position**: Row 1, Columns 1-6 (spans 6 columns)
- **Content**: NPV & IRR (The most important numbers)
- **Layout**: Side-by-side or stacked within the block
- **Style**: Hero mode (highlighted background, larger typography)
- **Typography**: 
  - Main KPI: `text-display` (48px / 3rem), `Playfair Display`, bold
  - Label: `text-muted` (12px / 0.75rem), `Manrope`, medium

**Chart Block (Top Right, 2x2)**:
- **Position**: Row 1-2, Columns 7-12 (spans 6 columns, 2 rows)
- **Content**: Cash Flow Profile (Visual context)
- **Layout**: Full-height chart with optional controls
- **Style**: Frameless mode (minimal borders, clean look)

**Detail Blocks (Bottom, 1x1)**:
- **Position**: Row 2, Columns 1-3, 4-6 (spans 3 columns each)
- **Content**: 
  - Equity Multiple (Column 1-3)
  - Peak Equity (Column 4-6)
  - LTV (Column 7-9, if space allows)
- **Style**: Standard cards with clear hierarchy

**Component Updates**:

**`SectionCard` Component** (`src/components/ui/SectionCard.tsx`):
- **Props**:
  ```typescript
  interface SectionCardProps {
    variant?: 'default' | 'frameless' | 'hero';
    size?: '1x1' | '2x1' | '2x2' | 'full-width';
    children: ReactNode;
    className?: string;
  }
  ```
- **Variants**:
  - **`frameless`**: No border, minimal shadow, clean background
  - **`hero`**: Highlighted background (subtle gradient or accent color), larger padding, enhanced shadow
  - **`default`**: Standard card with border and shadow
- **Sizes**: Control grid span via `GridItem` colSpan prop

**Typography Enforcement**:
- **Main KPIs**: Use `.text-display` class (48px, `Playfair Display`, bold)
- **Labels**: Use `.text-muted` class (12px, `Manrope`, medium, uppercase)
- **Body Text**: Use `.text-body` class (16px, `Manrope`, regular)
- **Numeric Values**: Use `.numeric` class (`Space Grotesk`, tabular-nums)

**Implementation Requirements**:
1. Update `DashboardView` to use Bento Grid layout
2. Create `SectionCard` component with variant support
3. Apply typography classes consistently
4. Ensure responsive behavior (mobile: stack all blocks)

**See**: [Design Pattern: Visual Hierarchy & Grid Layout (v4.2)](#design-pattern-visual-hierarchy--grid-layout-v42) for detailed specifications.

### v4.3: Interaction Design

**Status**: 📋 **Planned**

**Context**: The app looks good (v4.2), but feels static. We need to implement **Drag-and-Drop** for lists and **Tactile Feedback** for actions.

**Goal**: Enhance user interactions with drag-and-drop reordering, micro-animations, hover states, and tactile feedback mechanisms.

**Key Deliverables**:
- Drag-and-drop reordering for lists (Operations, Debt Tranches)
- Micro-animations for state transitions
- Tactile feedback for button clicks
- Enhanced hover states and tooltips
- Loading states and skeleton screens
- Form validation feedback
- Keyboard navigation improvements
- Focus management
- Chart animations

**1. Drag-and-Drop System**

**Library**: `@dnd-kit/core` (lightweight, accessible, performant)

**Installation**:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Scope**:
- **Operations View**: Reorder assets (e.g., put "Hotel" at the top)
  - **Component**: `src/views/OperationsView.tsx`
  - **List Component**: `src/components/operations/OperationList.tsx`
  - **Behavior**: Drag handle on each operation card, visual feedback during drag, smooth drop animation
  - **Persistence**: Update operation order in model input, save to localStorage

- **Capital View**: Reorder debt tranches (Seniority visual order)
  - **Component**: `src/views/CapitalView.tsx`
  - **List Component**: `src/components/capital/DebtTrancheList.tsx`
  - **Behavior**: Drag handle on each tranche card, maintain seniority logic, visual feedback
  - **Persistence**: Update tranche order in capital config, maintain seniority calculations

**Implementation Pattern**:
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';

// Wrapper component
<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={items} strategy={verticalListSortingStrategy}>
    {items.map(item => <SortableItem key={item.id} item={item} />)}
  </SortableContext>
</DndContext>
```

**Visual Feedback**:
- **Drag Handle**: Visible on hover, cursor: `grab` / `grabbing`
- **Dragging State**: Opacity: 0.5, scale: 1.05, shadow: elevated
- **Drop Zone**: Highlight with border or background color
- **Animation**: Smooth transition on drop (200ms ease-out)

**2. Micro-Interactions**

**Button Interactions**:
- **Click Feedback**: Scale down on click (`transform: scale(0.95)`)
  ```css
  .btn:active {
    transform: scale(0.95);
    transition: transform 0.1s ease-out;
  }
  ```
- **Hover Feedback**: Subtle lift (`translateY(-2px)`) with enhanced shadow
- **Loading State**: Spinner or pulse animation

**Chart Animations**:
- **Entry Animation**: Staggered fade-in for chart elements
  - Use `framer-motion` or CSS animations
  - Duration: 300-500ms
  - Easing: `ease-out`
- **Data Updates**: Smooth transitions when data changes
  - Use Recharts `transition` prop
  - Duration: 200ms

**Form Interactions**:
- **Input Focus**: Border color change, subtle glow
- **Validation Feedback**: 
  - Error: Red border, shake animation
  - Success: Green checkmark, fade-in
- **Auto-save Indicator**: Subtle pulse or checkmark when saved

**3. Tactile Feedback**

**Haptic Feedback** (if supported):
- Use `navigator.vibrate()` for mobile devices
- Trigger on: Button clicks, drag start, drop complete
- Pattern: Short pulse (10-20ms)

**Visual Feedback**:
- **Ripple Effect**: On button click (optional, for premium feel)
- **Scale Animation**: On interactive elements
- **Color Transitions**: Smooth color changes on state changes

**4. Accessibility**

**Keyboard Navigation**:
- **Drag-and-Drop**: Support arrow keys for reordering
- **Focus Management**: Maintain focus after drag operations
- **Screen Reader**: Announce drag start, drop complete, new order

**Implementation Requirements**:
1. Install `@dnd-kit/core` and related packages
2. Create `SortableList` wrapper component
3. Update `OperationsView` with drag-and-drop
4. Update `CapitalView` with drag-and-drop
5. Add button click animations
6. Add chart entry animations
7. Test keyboard navigation
8. Test screen reader compatibility

**Design Principles**:
- **Immediate Feedback**: Every user action should have visual feedback (< 100ms)
- **Smooth Transitions**: Use CSS transitions and animations for state changes (200-300ms)
- **Accessibility**: Ensure keyboard navigation and screen reader support
- **Performance**: Animations should be GPU-accelerated (transform, opacity)
- **Consistency**: Use same animation timing and easing across all interactions

### v4.4: Theming System

**Status**: 📋 **Planned**

**Context**: We need a comprehensive theming system that supports multiple visual modes while maintaining the luxury fintech aesthetic.

**Goal**: Implement comprehensive theming system with multiple theme modes (Light, Dark, Midnight) and persistent user preferences.

**Key Deliverables**:
- Theme engine with CSS Variables refactoring
- Three theme modes: Light, Dark, Midnight
- Theme switcher component
- System preference detection (prefers-color-scheme)
- Persistent theme preference (localStorage)
- Smooth theme transitions
- Theme-aware components

**1. Theme Engine Architecture**

**CSS Variables Refactoring**:
- Refactor `src/index.css` to use CSS Variables for **ALL** colors
- No hardcoded color values in components
- All colors reference theme tokens: `--bg-surface`, `--text-primary`, etc.

**Theme Structure**:
```css
:root {
  /* Theme tokens - will be overridden by theme classes */
  --bg-surface: #ffffff;
  --text-primary: #0f172a;
  /* ... all other tokens */
}

[data-theme="light"] {
  /* Light theme overrides */
}

[data-theme="dark"] {
  /* Dark theme overrides */
}

[data-theme="midnight"] {
  /* Midnight theme overrides */
}
```

**2. Theme Modes**

**Light Theme** (Default):
- **Background**: Slate-50 (`#f8fafc`) / White (`#ffffff`)
- **Surface**: White (`#ffffff`)
- **Text Primary**: Slate-900 (`#0f172a`)
- **Text Secondary**: Slate-600 (`#475569`)
- **Primary**: Deep Jungle Green (`#0f2e2e`)
- **Accent**: Metallic Gold (`#d4af37`)
- **Borders**: Slate-200 (`#e2e8f0`)

**Dark Theme**:
- **Background**: Slate-900 (`#0f172a`) / Slate-800 (`#1e293b`)
- **Surface**: Slate-800 (`#1e293b`)
- **Text Primary**: Slate-50 (`#f8fafc`)
- **Text Secondary**: Slate-400 (`#94a3b8`)
- **Primary**: Deep Jungle Green (lighter shade: `#1a4a4a`)
- **Accent**: Metallic Gold (`#d4af37`)
- **Borders**: Slate-700 (`#334155`)

**Midnight Theme** (Luxury):
- **Background**: Deep Blue (`#0a0e27`) / Black (`#000000`)
- **Surface**: Deep Blue (`#0a0e27`)
- **Text Primary**: Slate-100 (`#f1f5f9`)
- **Text Secondary**: Slate-500 (`#64748b`)
- **Primary**: Deep Jungle Green (`#0f2e2e`)
- **Accent**: Metallic Gold (`#d4af37`) with enhanced glow
- **Borders**: Slate-800 (`#1e293b`)

**3. Theme Implementation**

**Theme Context** (`src/contexts/ThemeContext.tsx`):
```typescript
interface ThemeContextType {
  theme: 'light' | 'dark' | 'midnight';
  setTheme: (theme: 'light' | 'dark' | 'midnight') => void;
  systemPreference: 'light' | 'dark';
}

// Hook: useTheme()
// Provider: ThemeProvider
```

**Theme Switcher Component** (`src/components/ui/ThemeSwitcher.tsx`):
- Dropdown or toggle button
- Shows current theme
- Allows switching between themes
- Respects system preference (optional "Auto" mode)

**Persistence**:
- Save theme preference to `localStorage` with key: `hospitality_theme_preference`
- Load theme on app initialization
- Fallback to system preference if no saved preference

**System Preference Detection**:
```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

**4. Theme-Aware Components**

**Component Updates**:
- All components must use CSS variables (no hardcoded colors)
- Charts must support theme-aware colors
- Icons must adapt to theme (light/dark variants)

**Chart Colors** (Theme-Aware):
- Light: Standard palette
- Dark: Lighter, more saturated colors
- Midnight: Deep, rich colors with gold accents

**5. Smooth Transitions**

**CSS Transition**:
```css
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* Exclude transitions for interactive elements during interaction */
button:active,
input:focus {
  transition: none;
}
```

**6. Design Tokens Reference**

**Color Tokens** (All Themes):
- `--bg-primary`: Main background
- `--bg-surface`: Card/panel background
- `--bg-surface-hover`: Hover state background
- `--text-primary`: Primary text color
- `--text-secondary`: Secondary text color
- `--text-tertiary`: Muted text color
- `--border`: Border color
- `--border-soft`: Subtle border color
- `--primary`: Primary brand color
- `--accent`: Accent color (Gold)
- `--success`, `--warning`, `--error`, `--info`: State colors

**Spacing Scale** (Theme-Independent):
- `--space-xs`: 0.25rem (4px)
- `--space-sm`: 0.5rem (8px)
- `--space-md`: 1rem (16px)
- `--space-lg`: 1.5rem (24px)
- `--space-xl`: 2rem (32px)

**Border Radius** (Theme-Independent):
- `--radius-sm`: 4px
- `--radius-md`: 6px
- `--radius-lg`: 8px
- `--radius-xl`: 12px

**Shadows** (Theme-Aware):
- Light: Standard shadows
- Dark: Lighter shadows with more opacity
- Midnight: Deep shadows with subtle glow

**Implementation Requirements**:
1. Refactor `src/index.css` to use CSS variables for all colors
2. Create theme definitions for Light, Dark, Midnight
3. Create `ThemeContext` and `useTheme` hook
4. Create `ThemeSwitcher` component
5. Add theme persistence (localStorage)
6. Add system preference detection
7. Update all components to use theme tokens
8. Test theme switching and transitions
9. Ensure charts adapt to theme

**Migration Strategy**:
- Phase 1: Refactor CSS variables (no breaking changes)
- Phase 2: Add theme definitions
- Phase 3: Create theme context and switcher
- Phase 4: Migrate components to use theme tokens
- Phase 5: Add persistence and system preference
- Phase 6: Polish transitions and edge cases

### v4.5: Data Viz 2.0

**Status**: 📋 **Planned**

**Goal**: Enhance data visualization with interactive charts, advanced tooltips, and export capabilities.

**Key Deliverables**:
- Interactive chart tooltips with detailed breakdowns
- Chart zoom and pan capabilities
- Export charts as images (PNG, SVG)
- Chart annotations and markers
- Comparison mode (side-by-side scenarios)
- Custom chart themes
- Performance optimizations for large datasets

**Chart Enhancements**:
- **Cash Flow Chart**: Add drill-down to monthly data
- **Waterfall Chart**: Interactive tier breakdown
- **Distribution Chart**: Partner-level drill-down
- **Liquidity Chart**: Interactive "Valley of Death" analysis
- **Risk Charts**: Interactive Monte Carlo distributions

---

### v5.5: Visual Comfort & Fixes

**Status**: 📋 **Planned**

**Context**: User reports visual fatigue (background too bright), broken controls (Construction dropdown, Scenario selector), and clutter (Dark modes are distracting/broken). We are pivoting to a **Single High-Quality Theme** ("Eggshell/Winter") and fixing usability bugs.

**Goal**: Implement a single, refined theme focused on visual comfort and fix critical usability issues in Header and Construction View.

**Key Deliverables**:
1. **Design System Update**: Single theme strategy with warmer "Eggshell" background
2. **Header Refactor**: Functional scenario selector dropdown
3. **Construction View Refactor**: Flat dashboard layout (remove accordion navigation)
4. **Portfolio Charts Fix**: Legend positioning for MixPieChart

---

#### 1. Design System Update: Single Theme Strategy

**Theme Strategy**:
- **Deprecate**: "Dark" and "Midnight" themes
- **Focus**: Single "Light" theme with refined palette
- **Rationale**: Multiple themes create visual clutter and maintenance burden. Single high-quality theme provides better consistency and reduces cognitive load.

**Palette Changes**:
- **Background**: Change from Slate-50 (`#f8fafc`) to warmer "Eggshell" (`#F9F9F6` or `#FAF9F6`)
  - Rationale: Reduces eye strain from bright white backgrounds
  - Maintains professional appearance while improving comfort
- **Text Primary**: Dark Slate (`#1e293b`) for optimal readability against Eggshell background
- **Contrast Ratio**: Ensure WCAG AA compliance (minimum 4.5:1 for normal text, 3:1 for large text)

**CSS Variable Updates** (`src/index.css`):
```css
.theme-light {
  /* Backgrounds */
  --background: #F9F9F6;           /* Eggshell - warmer than Slate-50 */
  --bg-subtle: #F9F9F6;
  --bg-surface: #ffffff;            /* Cards remain white for contrast */
  --bg-surface-secondary: rgba(255, 255, 255, 0.95);
  
  /* Typography */
  --text-primary: #1e293b;          /* Dark Slate - high contrast */
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  
  /* Maintain existing primary/accent colors */
  --primary: #0f2e2e;
  --accent: #d4af37;
}
```

**Theme Context Updates** (`src/ui/contexts/ThemeContext.tsx`):
- Remove `'dark'` and `'midnight'` from `Theme` type
- Update `Theme` type to: `type Theme = 'light';`
- Remove theme switcher UI from Header (no longer needed)
- Migrate existing users: If `localStorage` contains `'dark'` or `'midnight'`, reset to `'light'`

**Migration Strategy**:
1. Update CSS variables in `src/index.css` (`.theme-light` section)
2. Update `ThemeContext` to only support `'light'`
3. Remove theme switcher component from Header
4. Add migration logic to reset invalid theme preferences
5. Update all hardcoded color references to use CSS variables

---

#### 2. Header Refactor: Functional Scenario Selector

**Current State**:
- Header displays static scenario name label
- Scenario selection requires opening `ScenarioHubModal` via "Manage Scenarios" button
- No direct scenario switching from header

**Target State**:
- Replace static scenario label with functional `<select>` dropdown
- Dropdown populated from `savedVersions` (via `useFinancialModel` hook) or `scenarioLibrary` (via `useScenarioLibrary` hook)
- Selecting a scenario loads its `modelConfig` into the current input state
- Maintains existing scenario name editing capability (inline input when clicking scenario name)

**Implementation** (`src/components/layout/Header.tsx`):
```typescript
// Add scenario selection handler
const handleScenarioSelect = (scenarioId: string) => {
  const selected = scenarios?.find(s => s.id === scenarioId);
  if (selected && onLoadScenario) {
    onLoadScenario(selected);
  }
};

// Replace static label with dropdown
<select
  value={activeScenarioId || ''}
  onChange={(e) => handleScenarioSelect(e.target.value)}
  className="scenario-selector"
  style={{
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    fontWeight: 600,
    minWidth: '200px',
  }}
>
  {scenarios?.map((s) => (
    <option key={s.id} value={s.id}>
      {s.name}
    </option>
  ))}
</select>
```

**Props Interface Update**:
```typescript
interface HeaderProps {
  // ... existing props
  scenarios?: NamedScenario[];
  activeScenarioId?: string;
  onLoadScenario?: (scenario: NamedScenario) => void;  // New prop
}
```

**Integration** (`src/App.tsx`):
- Pass `savedVersions` (or `scenarioLibrary` scenarios) to Header as `scenarios` prop
- Pass `activeScenarioId` from current input scenario
- Implement `handleLoadScenario` to update input state with selected scenario's `modelConfig`

**UX Considerations**:
- Dropdown should be visually distinct but not overwhelming
- Maintain existing scenario name editing (click to edit inline)
- Show loading state when switching scenarios
- Preserve unsaved changes warning (if applicable)

---

#### 3. Construction View Refactor: Flat Dashboard Layout

**Current State**:
- Construction View uses accordion/dropdown navigation pattern
- Controls section with inputs (Budget, Duration, Curve Shape)
- Charts displayed in separate sections

**Target State**:
- **Flat Dashboard Layout** (similar to `CapitalView` pattern)
- Remove accordion/dropdown navigation
- **Layout Structure**:
  - **Top Section**: Input Cards (Budget, Duration, Curve Shape) in horizontal grid
  - **Middle Section**: Charts (Drawdown Curve, Funding Source) in grid layout
  - **Bottom Section**: Data Table (Monthly Funding Source Table)
- All sections visible by default (no collapsing)

**Layout Pattern** (Reference: `CapitalView`):
```typescript
<div className="construction-view" style={{
  display: 'flex',
  flexDirection: 'column',
  padding: '2rem',
  gap: '1.5rem',
}}>
  {/* Header */}
  <div className="view-header">...</div>
  
  {/* Input Cards Grid */}
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
  }}>
    <SectionCard title="Budget">...</SectionCard>
    <SectionCard title="Duration">...</SectionCard>
    <SectionCard title="Curve Shape">...</SectionCard>
  </div>
  
  {/* Charts Grid */}
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
  }}>
    <SectionCard title="Drawdown Curve">...</SectionCard>
    <SectionCard title="Funding Source">...</SectionCard>
  </div>
  
  {/* Data Table */}
  <SectionCard title="Monthly Funding Source Table">...</SectionCard>
</div>
```

**Component Updates** (`src/views/ConstructionView.tsx`):
- Remove accordion/collapsible sections
- Reorganize into flat card-based layout
- Maintain existing functionality (all inputs and charts)
- Improve visual hierarchy with consistent card spacing

**Benefits**:
- Reduced cognitive load (no hidden content)
- Faster access to all controls and visualizations
- Consistent with `CapitalView` pattern
- Better mobile responsiveness (grid adapts to screen size)

---

#### 4. Portfolio Charts Fix: MixPieChart Legend Positioning

**Current State**:
- `MixPieChart` uses default Recharts legend positioning
- Legend overlaps with pie chart data
- Poor visual hierarchy

**Target State**:
- Legend positioned to the right side of pie chart
- Vertical layout (`layout="vertical"`)
- Right alignment (`align="right"`)
- No overlap with chart data

**Implementation** (`src/components/charts/MixPieChart.tsx`):
```typescript
<PieChart>
  <Pie
    data={data as any[]}
    cx="40%"  // Shift left to make room for legend
    cy="50%"
    // ... existing props
  />
  <Tooltip content={customTooltip} />
  <Legend 
    layout="vertical" 
    align="right" 
    verticalAlign="middle"
    wrapperStyle={{
      paddingLeft: '1rem',
    }}
  />
</PieChart>
```

**Layout Adjustments**:
- Adjust `cx` (center X) to `40%` to shift pie chart left
- Maintain `cy` (center Y) at `50%` for vertical centering
- Add padding to legend wrapper for spacing
- Ensure responsive behavior (legend may stack below on mobile)

**Visual Improvements**:
- Clear separation between chart and legend
- Improved readability of legend items
- Better use of horizontal space
- Consistent with professional chart design patterns

---

#### Implementation Checklist

**Phase 1: Design System** (v5.5.1)
- [ ] Update CSS variables in `src/index.css` (Eggshell background, Dark Slate text)
- [ ] Update `ThemeContext` to remove `'dark'` and `'midnight'`
- [ ] Remove theme switcher from Header
- [ ] Add migration logic for existing theme preferences
- [ ] Test contrast ratios (WCAG AA compliance)

**Phase 2: Header Scenario Selector** (v5.5.2)
- [ ] Add `onLoadScenario` prop to Header
- [ ] Implement scenario dropdown in Header
- [ ] Connect to `savedVersions` or `scenarioLibrary` in App
- [ ] Add loading state for scenario switching
- [ ] Test scenario loading and state updates

**Phase 3: Construction View Refactor** (v5.5.3)
- [ ] Remove accordion/collapsible sections
- [ ] Reorganize into flat card-based layout
- [ ] Update grid layout for inputs and charts
- [ ] Test responsive behavior (mobile/tablet)
- [ ] Verify all functionality preserved

**Phase 4: Portfolio Charts Fix** (v5.5.4)
- [ ] Update `MixPieChart` legend positioning
- [ ] Adjust pie chart center (`cx`) for legend space
- [ ] Test legend layout (vertical, right-aligned)
- [ ] Verify responsive behavior

**Phase 5: Testing & Polish** (v5.5.5)
- [ ] Visual regression testing
- [ ] Accessibility audit (contrast, keyboard navigation)
- [ ] Cross-browser testing
- [ ] Performance testing (no regressions)
- [ ] User acceptance testing

---

#### Success Criteria

1. ✅ Single "Light" theme with Eggshell background implemented
2. ✅ Dark/Midnight themes removed and deprecated
3. ✅ Header scenario selector functional and connected to scenario library
4. ✅ Construction View uses flat dashboard layout (no accordions)
5. ✅ MixPieChart legend positioned to right side (no overlap)
6. ✅ All existing functionality preserved
7. ✅ WCAG AA contrast compliance maintained
8. ✅ Responsive design works on mobile/tablet
9. ✅ No visual regressions in other views
10. ✅ Performance maintained (no slowdowns)

---

#### Risk Assessment

**Confidence Score: 0.85**

**Justification**:
- **Low Risk**: Design system changes are isolated to CSS variables
- **Low Risk**: Header scenario selector follows existing patterns (`ScenarioHubModal` already loads scenarios)
- **Low Risk**: Construction View refactor is layout-only (no logic changes)
- **Low Risk**: MixPieChart fix is simple Recharts configuration
- **Medium Risk**: Theme migration may require user communication (if users have saved dark/midnight preferences)
- **Mitigation**: Add migration logic to gracefully reset theme preferences

**Breaking Changes**:
- Theme system: Users with `'dark'` or `'midnight'` saved will be reset to `'light'`
- Header: Scenario selector replaces static label (visual change, not functional)
- Construction View: Layout change (no functional changes)

**Dependencies**:
- No new dependencies required
- Existing Recharts library supports legend positioning
- CSS variables already in place

---

### v5.6: Capital Refactor & Cleanup

**Status**: 📋 **Planned**

**Context**: The user requests a reorganization of the Capital View (separation of Debt/Equity), removal of the redundant Reports tab, and updates to system health/tooltips to ensure Comparison View works out-of-the-box.

**Goal**: Refactor Capital View architecture for clearer separation of concerns, remove redundant navigation, and improve default scenario initialization.

**Key Deliverables**:
1. **Capital View Architecture**: Explicit separation of Equity and Debt sections
2. **Navigation Cleanup**: Remove ReportsView from Sidebar and App routing
3. **Data Initialization**: Add default scenarios (Base Case, Stress, Upside) for Comparison View

---

#### 1. Capital View Architecture: Equity/Debt Separation

**Current State**:
- Capital View uses 2-column layout (Chart+Metrics left, Debt Manager+Equity+Debt Schedule right)
- Equity inputs and Debt configuration are mixed in the right pane
- No clear visual separation between Equity and Debt concerns

**Target State**:
- **Explicit Section Separation**: Two distinct card groups
  - **Section 1: Equity Structure** - Inputs for Initial Investment, Partner Splits (visual summary)
  - **Section 2: Debt Structure** - Debt Manager table and Metrics (DSCR, LTV)
- **Visual Hierarchy**: Use distinct Card groups with clear section headers
- **Layout**: Vertical flow (Equity section first, then Debt section)

**Layout Structure** (`src/views/CapitalView.tsx`):
```typescript
<div className="capital-view" style={{
  display: 'flex',
  flexDirection: 'column',
  padding: '2rem',
  gap: '1.5rem',
}}>
  {/* Header */}
  <div className="view-header">...</div>
  
  {/* Capital Stack Chart (Full Width) */}
  <SectionCard title="Capital Stack Visualization">
    <CapitalStackChart capitalConfig={capitalConfig} height={350} />
  </SectionCard>
  
  {/* Section 1: Equity Structure */}
  <SectionCard title="Equity Structure">
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem',
    }}>
      {/* Initial Investment Input */}
      <InputGroup label="Initial Investment">
        <input
          type="number"
          value={projectConfig.initialInvestment}
          onChange={(e) => handleInitialInvestmentChange(parseFloat(e.target.value))}
        />
      </InputGroup>
      
      {/* Working Capital % */}
      <InputGroup label="Working Capital %">
        <input
          type="number"
          value={projectConfig.workingCapitalPercentage * 100}
          onChange={(e) => handleWorkingCapitalChange(parseFloat(e.target.value) / 100)}
        />
      </InputGroup>
    </div>
    
    {/* Partner Splits Visual Summary */}
    <div style={{ marginTop: '1.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
        Partner Equity Splits
      </h3>
      <EquitySplitSummary capitalConfig={capitalConfig} />
    </div>
  </SectionCard>
  
  {/* Section 2: Debt Structure */}
  <SectionCard title="Debt Structure">
    {/* Debt Manager Table */}
    <div style={{ marginBottom: '1.5rem' }}>
      <DebtManager
        capitalConfig={capitalConfig}
        onCapitalConfigChange={onCapitalConfigChange}
      />
    </div>
    
    {/* Debt Metrics Grid */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
    }}>
      <MetricCard label="Loan-to-Value (LTV)" value={ltv / 100} />
      <MetricCard label="Debt Service Coverage Ratio (DSCR)" value={dscr} />
      <MetricCard label="Total Debt" value={totalDebtAmount} format="currency" />
    </div>
  </SectionCard>
  
  {/* Valuation Parameters (Separate Section) */}
  <SectionCard title="Valuation Parameters">
    {/* Discount Rate and Terminal Growth sliders */}
  </SectionCard>
</div>
```

**Component Updates**:
- Remove 2-column grid layout
- Reorganize into vertical sections with clear headers
- Group Equity-related inputs together
- Group Debt-related inputs and metrics together
- Maintain all existing functionality (no breaking changes)

**Visual Improvements**:
- Clear separation of Equity vs Debt concerns
- Better visual hierarchy with section headers
- Improved scanability (users can quickly find Equity or Debt sections)
- Consistent with flat dashboard layout pattern (v5.5)

---

#### 2. Navigation Cleanup: Remove ReportsView

**Current State**:
- `ReportsView` exists in Sidebar navigation (`src/components/layout/Sidebar.tsx`)
- `ReportsView` case exists in `App.tsx` routing (renders placeholder "Reports view coming soon...")
- Export functionality already exists in Global Header (Export JSON, Export Excel)

**Target State**:
- Remove `'reports'` from `ViewId` type
- Remove Reports navigation item from Sidebar
- Remove `case 'reports'` from App.tsx routing
- Export functionality remains in Header (no change)

**Implementation**:

**1. Update ViewId Type** (`src/components/layout/Sidebar.tsx`):
```typescript
export type ViewId = 
  | 'dashboard' 
  | 'operations' 
  | 'capital' 
  | 'waterfall' 
  | 'risk' 
  | 'liquidity' 
  | 'governance' 
  // 'reports' removed
  | 'portfolio' 
  | 'reaas' 
  | 'land' 
  | 'construction' 
  | 'comparison';
```

**2. Remove from Sidebar Navigation** (`src/components/layout/Sidebar.tsx`):
```typescript
const navItems: { id: ViewId; label: string; icon: React.ReactNode }[] = [
  // ... other items
  { id: 'governance', label: 'Governance', icon: <ShieldCheck size={20} /> },
  // { id: 'reports', label: 'Reports', icon: <FileText size={20} /> }, // REMOVED
  { id: 'portfolio', label: 'Portfolio', icon: <PieChart size={20} /> },
  // ... other items
];
```

**3. Remove from App Routing** (`src/App.tsx`):
```typescript
const renderView = () => {
  switch (activeView) {
    // ... other cases
    case 'governance':
      return <GovernanceView ... />;
    // case 'reports': // REMOVED
    //   return <div className="card">...</div>;
    case 'portfolio':
      return <PortfolioView ... />;
    // ... other cases
  }
};
```

**Rationale**:
- Export functionality (JSON, Excel) is already accessible via Header
- ReportsView was a placeholder with no actual functionality
- Reduces navigation clutter
- Users can export from any view via Header

**Migration Notes**:
- If any saved state references `'reports'` view, default to `'dashboard'`
- No data migration required (ReportsView had no state)

---

#### 3. Data Initialization: Default Scenarios for Comparison View

**Current State**:
- `scenarioLibrary.ts` creates 3 default scenarios:
  - "Base Case – All Ops, Single Tranche"
  - "Levered – All Ops, Multi-Tranche"
  - "Aggressive Promote – Same Ops, Different Waterfall"
- Comparison View requires scenarios with revenue variations to be useful
- No "Stress" or "Upside" scenarios by default

**Target State**:
- Add 2 additional default scenarios:
  - **"Base Case"** (existing, unchanged)
  - **"Stress (-10% Rev)"** - All revenue drivers reduced by 10%
  - **"Upside (+10% Rev)"** - All revenue drivers increased by 10%
- Comparison View works out-of-the-box with these 3 scenarios

**Implementation** (`src/ui/state/scenarioLibrary.ts`):

**Create Revenue Variation Helper**:
```typescript
/**
 * Creates a revenue-adjusted version of a model config.
 * Adjusts all revenue drivers (occupancy, rates, etc.) by the specified percentage.
 */
function adjustRevenueDrivers(
  config: FullModelInput,
  adjustmentPct: number
): FullModelInput {
  const adjusted = JSON.parse(JSON.stringify(config)); // Deep clone
  
  // Adjust all operations' revenue drivers
  adjusted.scenario.operations = adjusted.scenario.operations.map((op: OperationConfig) => {
    const adjustedOp = { ...op };
    
    // Adjust occupancy/utilization rates
    if ('occupancyByMonth' in adjustedOp) {
      adjustedOp.occupancyByMonth = adjustedOp.occupancyByMonth.map(
        (occ: number) => Math.max(0, Math.min(1, occ * (1 + adjustmentPct)))
      );
    }
    if ('utilizationByMonth' in adjustedOp) {
      adjustedOp.utilizationByMonth = adjustedOp.utilizationByMonth.map(
        (util: number) => Math.max(0, Math.min(1, util * (1 + adjustmentPct)))
      );
    }
    
    // Adjust rates
    if ('avgDailyRate' in adjustedOp) {
      adjustedOp.avgDailyRate *= (1 + adjustmentPct);
    }
    if ('avgNightlyRate' in adjustedOp) {
      adjustedOp.avgNightlyRate *= (1 + adjustmentPct);
    }
    if ('avgCheck' in adjustedOp) {
      adjustedOp.avgCheck *= (1 + adjustmentPct);
    }
    if ('avgDailyPassPrice' in adjustedOp) {
      adjustedOp.avgDailyPassPrice *= (1 + adjustmentPct);
    }
    if ('avgMembershipFee' in adjustedOp) {
      adjustedOp.avgMembershipFee *= (1 + adjustmentPct);
    }
    if ('avgCourtRate' in adjustedOp) {
      adjustedOp.avgCourtRate *= (1 + adjustmentPct);
    }
    if ('avgRentPerSqm' in adjustedOp) {
      adjustedOp.avgRentPerSqm *= (1 + adjustmentPct);
    }
    if ('avgMonthlyRate' in adjustedOp) {
      adjustedOp.avgMonthlyRate *= (1 + adjustmentPct);
    }
    
    // Adjust turnover rates (restaurants)
    if ('turnoverByMonth' in adjustedOp) {
      adjustedOp.turnoverByMonth = adjustedOp.turnoverByMonth.map(
        (turn: number) => turn * (1 + adjustmentPct)
      );
    }
    
    return adjustedOp;
  });
  
  return adjusted;
}
```

**Update createDefaultScenarios**:
```typescript
function createDefaultScenarios(): NamedScenario[] {
  const defaults: NamedScenario[] = [];
  
  const baseConfig = createSampleModelConfig();
  
  // Scenario 1: Base Case (unchanged)
  defaults.push({
    id: 'base-case',
    name: 'Base Case',
    description: 'Baseline scenario with standard assumptions',
    modelConfig: {
      ...baseConfig,
    },
  });
  
  // Scenario 2: Stress (-10% Revenue)
  const stressConfig = adjustRevenueDrivers(baseConfig, -0.10);
  defaults.push({
    id: 'stress-minus-10-rev',
    name: 'Stress (-10% Rev)',
    description: 'Downside scenario with all revenue drivers reduced by 10%',
    modelConfig: stressConfig,
  });
  
  // Scenario 3: Upside (+10% Revenue)
  const upsideConfig = adjustRevenueDrivers(baseConfig, 0.10);
  defaults.push({
    id: 'upside-plus-10-rev',
    name: 'Upside (+10% Rev)',
    description: 'Upside scenario with all revenue drivers increased by 10%',
    modelConfig: upsideConfig,
  });
  
  // Keep existing "Levered" and "Aggressive Promote" scenarios (optional)
  // Or remove them if we want to keep only the 3 core scenarios
  
  return defaults;
}
```

**Revenue Driver Adjustments**:
- **Occupancy/Utilization**: Multiply by `(1 + adjustmentPct)`, clamp to [0, 1]
- **Rates** (ADR, nightly rate, check, etc.): Multiply by `(1 + adjustmentPct)`
- **Turnover** (restaurants): Multiply by `(1 + adjustmentPct)`
- **Membership Fees**: Multiply by `(1 + adjustmentPct)`

**Benefits**:
- Comparison View works immediately (no need to create scenarios manually)
- Clear stress/upside variations for sensitivity analysis
- Consistent revenue adjustments across all operation types
- Users can see impact of revenue changes on KPIs

**Migration Strategy**:
- Existing users with saved scenarios: Keep their scenarios, add new defaults
- New users: Get 3 scenarios (Base, Stress, Upside)
- If localStorage already has scenarios, don't overwrite (preserve user data)

---

#### Implementation Checklist

**Phase 1: Capital View Refactor** (v5.6.1)
- [ ] Reorganize CapitalView into vertical sections (Equity, Debt)
- [ ] Create Equity Structure section with Initial Investment and Partner Splits
- [ ] Create Debt Structure section with Debt Manager and Metrics
- [ ] Move Capital Stack Chart to full-width at top
- [ ] Update section headers and visual hierarchy
- [ ] Test all functionality preserved (no breaking changes)

**Phase 2: Navigation Cleanup** (v5.6.2)
- [ ] Remove `'reports'` from `ViewId` type
- [ ] Remove Reports item from Sidebar navigation
- [ ] Remove `case 'reports'` from App.tsx routing
- [ ] Verify Export functionality still accessible via Header
- [ ] Test navigation (no broken links)

**Phase 3: Default Scenarios** (v5.6.3)
- [ ] Create `adjustRevenueDrivers` helper function
- [ ] Update `createDefaultScenarios` to include Base, Stress, Upside
- [ ] Test revenue adjustments for all operation types
- [ ] Verify Comparison View works with default scenarios
- [ ] Test migration (preserve existing user scenarios)

**Phase 4: Testing & Polish** (v5.6.4)
- [ ] Visual regression testing (Capital View layout)
- [ ] Functional testing (all Capital View inputs work)
- [ ] Comparison View testing (scenario selection and comparison)
- [ ] Navigation testing (no broken routes)
- [ ] Performance testing (no regressions)

---

#### Success Criteria

1. ✅ Capital View has explicit Equity and Debt sections (clear visual separation)
2. ✅ ReportsView removed from Sidebar and App routing
3. ✅ Export functionality remains accessible via Header
4. ✅ Default scenarios include Base Case, Stress (-10%), and Upside (+10%)
5. ✅ Comparison View works out-of-the-box with default scenarios
6. ✅ All existing Capital View functionality preserved
7. ✅ Revenue adjustments work correctly for all operation types
8. ✅ No navigation errors or broken routes
9. ✅ User's existing scenarios preserved (no data loss)

---

#### Risk Assessment

**Confidence Score: 0.90**

**Justification**:
- **Low Risk**: Capital View refactor is layout-only (no logic changes)
- **Low Risk**: Navigation cleanup is straightforward (remove items)
- **Low Risk**: Default scenarios are additive (no breaking changes)
- **Low Risk**: Revenue adjustment logic is deterministic and testable
- **Medium Risk**: Migration of existing scenarios (need to preserve user data)
- **Mitigation**: Check localStorage before overwriting, preserve existing scenarios

**Breaking Changes**:
- Navigation: `'reports'` view ID removed (users with saved state referencing it will default to dashboard)
- Capital View: Layout change (visual only, no functional changes)

**Dependencies**:
- No new dependencies required
- Existing `createSampleModelConfig` function
- Existing scenario library infrastructure

---

## Strategic Milestone v3.1: "The Capital Experience Upgrade"

**Status**: ✅ **Complete**

**Context**: The backend is a "Ferrari" (v3.0). The frontend is currently functional but basic. We are redesigning the `CapitalView` to be a **"Luxury Deal Structuring Room"** with focus on Visual Hierarchy, Immediate Feedback, and Polish.

### UX Vision: "The Deal Room"

**Design Philosophy**: Transform the CapitalView from a functional configuration screen into a premium deal structuring experience that matches the sophistication of the financial engine.

### Layout Architecture

**Desktop Layout**: CSS Grid (2 Columns)
- **Left Pane (The Output)**: "Capital Visualizer"
  - Large "Sources & Uses" Stacked Chart (Animated)
  - Key Metrics Cards (WACC, LTV, DSCR) overlaying or below the chart
- **Right Pane (The Input)**: "Structurer Console"
  - List of Debt Tranches as **Interactive Cards** (not just table rows)
  - Global Equity Inputs

**Mobile Layout**: Stacked (Single Column)
- Responsive breakpoint: Chart first, then inputs below

### Interaction Patterns

**Live Tuning**:
- Sliders for `Interest Rate` and `LTV` with immediate visual feedback
- Changes reflect instantly in the Left Pane (Capital Visualizer)
- Smooth animations for chart updates

**Constraint Feedback**:
- If Total Sources ≠ Total Uses, show a visual "Gap" warning immediately
- Color-coded indicators (green = balanced, red = gap)
- Real-time calculation of gap amount

**Interactive Debt Tranche Cards**:
- Each tranche displayed as a card (not table row)
- Inline editing capabilities
- Visual hierarchy: Primary tranche emphasized, secondary tranches nested
- Quick actions: Edit, Delete, Duplicate

### Visual Design Principles

**Visual Hierarchy**:
- Large, prominent chart (60-70% of left pane)
- Key metrics cards with clear typography
- Input cards with subtle elevation and spacing

**Immediate Feedback**:
- All input changes trigger instant recalculation
- Chart animations (smooth transitions, not jarring)
- Loading states for any async operations (if needed)

**Polish**:
- Professional color palette (consistent with v2.x UX guidelines)
- Smooth micro-interactions
- Clear visual states (hover, focus, active)
- Accessible contrast ratios

### Technical Implementation

**Component Structure**:
```
CapitalView (Grid Container)
├── Left Pane: CapitalVisualizer
│   ├── SourcesAndUsesChart (Large, Animated)
│   └── KeyMetricsCards (WACC, LTV, DSCR)
└── Right Pane: StructurerConsole
    ├── DebtTrancheCards (Interactive Cards)
    └── EquityInputs (Global Equity Configuration)
```

**State Management**:
- Live updates via React state
- Debounced calculations for performance (if needed)
- Optimistic UI updates for instant feedback

**Responsive Design**:
- CSS Grid with `grid-template-columns: repeat(auto-fit, minmax(400px, 1fr))`
- Mobile breakpoint: Stack layout
- Chart resizing with container queries (if supported) or media queries

### Migration Path

**Phase 1: Layout Restructure** (v3.1.0)
- Implement CSS Grid layout (2-column desktop, stacked mobile)
- Move chart to left pane
- Move inputs to right pane

**Phase 2: Interactive Cards** (v3.1.1)
- Replace table rows with interactive cards for debt tranches
- Add inline editing capabilities
- Implement card-based visual hierarchy

**Phase 3: Live Tuning & Feedback** (v3.1.2)
- Add sliders for Interest Rate and LTV
- Implement instant chart updates
- Add constraint feedback (Sources vs Uses gap warning)

**Phase 4: Polish & Animation** (v3.1.3)
- Add smooth chart animations
- Refine visual design (colors, spacing, typography)
- Add micro-interactions

### Success Criteria

1. ✅ Visual hierarchy clearly separates output (left) from input (right)
2. ✅ Chart is large and prominent (60-70% of left pane)
3. ✅ Debt tranches displayed as interactive cards (not table rows)
4. ✅ Sliders provide immediate feedback with instant chart updates
5. ✅ Constraint feedback (Sources ≠ Uses) is immediately visible
6. ✅ Responsive design works on mobile (stacked layout)
7. ✅ Smooth animations for all chart updates
8. ✅ Professional polish matches v2.x UX standards

---

## v3.0 Roadmap (Future)

**Status**: 📋 **Planning**

The v3.0 roadmap represents the next evolution of the Hospitality Financial Modeler, focusing on advanced capabilities and collaboration features.

### Potential v3.0 Features

**AI & Automation**:
- AI-powered narrative generation for financial reports
- Automated scenario recommendations based on market data
- Intelligent sensitivity analysis suggestions
- Natural language query interface for financial data

**Real-time Collaboration**:
- Multi-user collaborative editing
- Real-time scenario sharing and synchronization
- Comment and annotation system
- Team workspace management

**Advanced Analytics**:
- Multi-variable optimization
- Advanced solvers (Newton-Raphson, gradient descent)
- Constraint optimization
- Multi-objective optimization (Pareto frontier)
- Excel import/read capability
- Custom Excel templates
- Chart generation in Excel

**Enhanced Capital & Waterfall**:
- Per-tranche KPIs (partial refinancing and seniority implemented in v2.10)
- More sophisticated catch-up mechanisms
- Additional accumulation methods beyond compound interest

**Workflow & Versioning**:
- Version rollback/restore functionality
- Automatic version snapshots
- Branching and merging scenarios
- Advanced diff visualization (tree view, unified diff)

**Operation Type Refinements**:
- More sophisticated modeling for specific operation types
- Seasonal variations for memberships
- Operation subtypes (e.g., independent vs. assisted living)
- Enhanced revenue drivers and cost structures

**Note**: This roadmap is a placeholder for future planning. Specific features and priorities will be determined based on user feedback and business requirements.

---

## v5.x Roadmap: "The Real Estate Developer Suite"

**Status**: 📋 **Planning**

**Context**: We are transforming the app from an "Asset Manager" to a "Development Platform". The user wants to model the full lifecycle: **Land Acquisition → Construction (S-Curve) → Ramp-up → Stabilization**.

**Strategic Pivot**: The v5.x series extends the financial modeling engine to support the complete real estate development lifecycle, not just stabilized operations. This enables developers to model projects from land acquisition through construction, operational ramp-up, and eventual stabilization.

### v5.0: Land Bank (Pre-Construction)

**Status**: 📋 **Planned**

**Focus**: Model land acquisition costs and cash flows that occur before Year 0 (project start).

**Concept**: Land is acquired before construction begins. Land acquisition costs must be calculated separately and injected into the Project Cash Flow *before* construction starts.

#### Data Model: `LandConfig`

**Type Definition** (to be added to `src/domain/types.ts`):

```typescript
/**
 * Land acquisition configuration for pre-construction phase.
 * v5.0: Land Bank (Pre-Construction)
 */
export interface LandConfig {
  id: string;                              // Unique identifier for this land acquisition
  name: string;                            // Human-readable name (e.g., "Beachfront Parcel A")
  
  // Acquisition Details
  totalCost: number;                        // Total land acquisition cost in project currency
  acquisitionMonth: number;                // Month index relative to project start (negative = before Year 0)
                                             // e.g., -12 = 12 months before Year 0
  
  // Payment Structure
  downPayment: number;                      // Initial down payment at acquisition
  downPaymentMonth: number;                 // Month when down payment is made (typically same as acquisitionMonth)
  
  // Installment Options
  installments?: LandInstallment[];         // Optional: Structured installment payments
  installmentMethod?: 'equal' | 'custom';  // Payment method: equal installments or custom schedule
  
  // Alternative Payment Methods
  barterValue?: number;                     // Optional: Value of barter/permuta (land swap) in project currency
  barterMonth?: number;                     // Optional: Month when barter occurs
  
  // Notes
  notes?: string;                           // Optional: Additional notes about the land acquisition
}

/**
 * Land installment payment schedule.
 * v5.0: Land Bank (Pre-Construction)
 */
export interface LandInstallment {
  month: number;                           // Month index relative to project start (can be negative)
  amount: number;                           // Payment amount in project currency
  description?: string;                     // Optional: Description of this installment
}
```

#### Cash Flow Generation: `LandFlow`

**Engine**: `src/engines/land/landEngine.ts` (new module)

**Function Signature**:
```typescript
/**
 * Generates monthly land acquisition cash flow.
 * v5.0: Land Bank (Pre-Construction)
 * 
 * @param landConfig - Land acquisition configuration
 * @param projectStartMonth - Absolute month when project starts (Year 0, Month 0)
 * @returns Array of monthly cash flows (negative = cash outflow)
 */
export function generateLandFlow(
  landConfig: LandConfig,
  projectStartMonth: number = 0
): MonthlyLandFlow[];
```

**Output Type**:
```typescript
/**
 * Monthly land acquisition cash flow entry.
 * v5.0: Land Bank (Pre-Construction)
 */
export interface MonthlyLandFlow {
  monthIndex: number;                       // Month index relative to project start (can be negative)
  absoluteMonth: number;                    // Absolute month number (for timeline alignment)
  cashFlow: number;                         // Cash flow (negative = outflow, positive = inflow from barter)
  description: string;                       // Description of this cash flow event
  cumulativeCashFlow: number;              // Cumulative cash flow from first payment
}
```

**Calculation Logic**:
1. **Down Payment**: Applied at `acquisitionMonth`
2. **Installments**: 
   - If `installmentMethod === 'equal'`: Calculate equal installments for remaining balance
   - If `installmentMethod === 'custom'`: Use `installments[]` array
3. **Barter/Permuta**: If `barterValue` is provided, apply as positive cash flow at `barterMonth`
4. **Timeline**: All months are relative to project start (Year 0, Month 0)

#### Integration with Project Engine

**Modification to `ProjectConfig`**:
```typescript
export interface ProjectConfig {
  // ... existing fields ...
  
  // v5.0: Land Bank (Pre-Construction)
  landConfigs?: LandConfig[];               // Optional: Array of land acquisition configurations
}
```

**Modification to Project Engine** (`src/engines/project/projectEngine.ts`):
- **Before** calculating `initialInvestment`, sum all `LandFlow` cash flows
- **Equity Peak Calculation**: `EquityPeak = Sum(LandFlow) + Sum(ConstructionFlow)`
- **Timeline Alignment**: Land flows occur before Year 0, construction flows start at Year 0

**Pipeline Integration**:
```
1. Land Engine → LandFlow[] (negative months)
2. Construction Engine → ConstructionFlow[] (Year 0+)
3. Project Engine → Combines LandFlow + ConstructionFlow for Equity Peak
```

---

### v5.1: Construction Dynamics (The S-Curve)

**Status**: 📋 **Planned**

**Focus**: Replace linear CAPEX with realistic S-Curve (Sigmoid) construction spending pattern.

**Concept**: CAPEX is not linear. Construction spending follows a Bell Curve (Sigmoid) pattern: slow start, rapid acceleration in middle, slow finish.

#### Data Model: `ConstructionConfig`

**Type Definition** (to be added to `src/domain/types.ts`):

```typescript
/**
 * Construction configuration for S-Curve spending pattern.
 * v5.1: Construction Dynamics (The S-Curve)
 */
export interface ConstructionConfig {
  id: string;                              // Unique identifier for this construction phase
  name: string;                            // Human-readable name (e.g., "Phase 1: Main Building")
  
  // Budget & Timeline
  totalBudget: number;                      // Total construction budget in project currency
  startMonth: number;                       // Month when construction starts (typically 0 = Year 0, Month 0)
  durationMonths: number;                   // Construction duration in months
  
  // S-Curve Parameters
  curveType: 's-curve' | 'linear' | 'front-loaded' | 'back-loaded';
                                             // Spending pattern type
  steepness?: number;                       // Optional: S-curve steepness (0.1 = gentle, 10 = steep, default: 2.0)
                                             // Higher values = steeper curve (more spending in middle)
  
  // Payment Schedule
  paymentMethod?: 's-curve' | 'milestone';  // Optional: Payment method (default: 's-curve')
  milestones?: ConstructionMilestone[];     // Optional: Milestone-based payments (if paymentMethod === 'milestone')
  
  // Notes
  notes?: string;                           // Optional: Additional notes about construction
}

/**
 * Construction milestone for milestone-based payments.
 * v5.1: Construction Dynamics (The S-Curve)
 */
export interface ConstructionMilestone {
  name: string;                             // Milestone name (e.g., "Foundation Complete")
  month: number;                            // Month when milestone is reached (relative to startMonth)
  paymentPct: number;                      // Percentage of total budget paid at this milestone (0..1)
}
```

#### S-Curve Generation: `generateSCurve`

**Engine**: `src/engines/construction/constructionEngine.ts` (new module)

**Function Signature**:
```typescript
/**
 * Generates S-Curve (Sigmoid) construction spending pattern.
 * v5.1: Construction Dynamics (The S-Curve)
 * 
 * @param budget - Total construction budget
 * @param months - Construction duration in months
 * @param steepness - S-curve steepness parameter (default: 2.0)
 * @returns Array of monthly spending amounts
 */
export function generateSCurve(
  budget: number,
  months: number,
  steepness: number = 2.0
): number[];
```

**Mathematical Formula**:
- **Sigmoid Function**: `S(t) = 1 / (1 + e^(-k * (t - midpoint)))`
  - `t`: Time point (0 to 1, normalized)
  - `k`: Steepness parameter (higher = steeper)
  - `midpoint`: 0.5 (center of construction period)
- **Monthly Spending**: `spending[m] = budget * (S(m/months) - S((m-1)/months))`
  - Ensures cumulative spending sums to `budget`

**Alternative Patterns**:
- **Linear**: Equal monthly payments
- **Front-Loaded**: More spending in early months (inverse S-curve)
- **Back-Loaded**: More spending in later months (delayed S-curve)

**Output Type**:
```typescript
/**
 * Monthly construction cash flow entry.
 * v5.1: Construction Dynamics (The S-Curve)
 */
export interface MonthlyConstructionFlow {
  monthIndex: number;                       // Month index relative to project start
  absoluteMonth: number;                    // Absolute month number
  spending: number;                         // Construction spending for this month (negative = outflow)
  cumulativeSpending: number;              // Cumulative spending from start
  completionPct: number;                    // Percentage of construction complete (0..1)
}
```

#### Integration with Project Engine

**Modification to `ProjectConfig`**:
```typescript
export interface ProjectConfig {
  // ... existing fields ...
  
  // v5.1: Construction Dynamics (The S-Curve)
  constructionConfig?: ConstructionConfig;  // Optional: Construction configuration (replaces initialInvestment logic)
  
  // Backward Compatibility
  initialInvestment?: number;               // Deprecated: Use constructionConfig.totalBudget instead
}
```

**Modification to Project Engine**:
- **Replace** static `initialInvestment` logic with `ConstructionFlow` generation
- **Equity Peak Calculation**: `EquityPeak = Sum(LandFlow) + Sum(ConstructionFlow)`
- **Timeline**: Construction flows start at `constructionConfig.startMonth` (typically Month 0)

**Pipeline Integration**:
```
1. Land Engine → LandFlow[] (pre-Year 0)
2. Construction Engine → ConstructionFlow[] (Year 0+, S-Curve)
3. Project Engine → Combines both for Equity Peak and initial cash flow
```

---

### v5.2: Operational Ramp-up

**Status**: 📋 **Planned**

**Focus**: Model gradual operational ramp-up instead of immediate 100% performance.

**Concept**: Operations don't start at 100%. Revenue, occupancy, and operational metrics gradually increase during the first N months of operation.

#### Data Model: `RampUpConfig`

**Type Definition** (to be added to `src/domain/types.ts`):

```typescript
/**
 * Operational ramp-up configuration.
 * v5.2: Operational Ramp-up
 */
export interface RampUpConfig {
  id: string;                              // Unique identifier for this ramp-up profile
  name: string;                            // Human-readable name (e.g., "Standard Hotel Ramp-up")
  
  // Ramp-up Parameters
  rampUpMonths: number;                     // Number of months to reach full operational capacity (e.g., 12 months)
  rampUpCurve: 'linear' | 's-curve' | 'exponential' | 'custom';
                                             // Ramp-up curve type
  startMonth: number;                      // Month when operations begin (relative to project start)
  
  // Custom Curve (if rampUpCurve === 'custom')
  customFactors?: number[];                 // Optional: Custom ramp-up factors per month (0..1, length = rampUpMonths)
  
  // Application Scope
  applyToRevenue: boolean;                  // Apply ramp-up factor to revenue calculations
  applyToOccupancy: boolean;                 // Apply ramp-up factor to occupancy/utilization
  applyToOperations: boolean;               // Apply ramp-up factor to all operational metrics (default: true)
  
  // Notes
  notes?: string;                           // Optional: Additional notes about ramp-up assumptions
}
```

#### Ramp-up Factor Generation

**Engine**: `src/engines/rampup/rampUpEngine.ts` (new module)

**Function Signature**:
```typescript
/**
 * Generates ramp-up factors for operational metrics.
 * v5.2: Operational Ramp-up
 * 
 * @param rampUpConfig - Ramp-up configuration
 * @param totalMonths - Total months in operational period
 * @returns Array of ramp-up factors (0..1) for each month
 */
export function generateRampUpFactors(
  rampUpConfig: RampUpConfig,
  totalMonths: number
): number[];
```

**Calculation Logic**:
1. **Linear**: `factor[m] = min(1.0, m / rampUpMonths)`
2. **S-Curve**: Use sigmoid function (similar to construction S-curve)
3. **Exponential**: `factor[m] = 1 - e^(-m / rampUpMonths)`
4. **Custom**: Use `customFactors[]` array directly

**Output**: Array of factors (0..1) where:
- `factor[0]` = starting factor (e.g., 0.0 or 0.1)
- `factor[rampUpMonths-1]` = 1.0 (full capacity)
- `factor[m >= rampUpMonths]` = 1.0 (stabilized)

#### Integration with Operations Engine

**Modification to `OperationConfig`** (all operation types):
```typescript
export interface HotelConfig {
  // ... existing fields ...
  
  // v5.2: Operational Ramp-up
  rampUpConfig?: RampUpConfig;              // Optional: Ramp-up configuration for this operation
}
```

**Modification to Operations Engine** (`src/engines/operations/*`):
- **Before** calculating monthly revenue/occupancy, apply `rampUpFactor[month]`
- **Revenue Adjustment**: `adjustedRevenue = baseRevenue * rampUpFactor[month]`
- **Occupancy Adjustment**: `adjustedOccupancy = baseOccupancy * rampUpFactor[month]`
- **Timeline**: Ramp-up starts at `rampUpConfig.startMonth` (typically when operations begin)

**Example**:
```typescript
// Month 0 (operations start): rampUpFactor = 0.1 (10% capacity)
// Month 6: rampUpFactor = 0.55 (55% capacity)
// Month 12: rampUpFactor = 1.0 (100% capacity, stabilized)
```

---

### v5.3: Scenario War Room

**Status**: 📋 **Planned**

**Focus**: Dedicated view to compare 3 scenarios side-by-side with diffing capabilities.

**Concept**: A "War Room" view where developers can compare Base Case, Upside, and Downside scenarios simultaneously with visual diffing and KPI comparison.

#### Data Model: `WarRoomConfig`

**Type Definition** (to be added to `src/domain/types.ts`):

```typescript
/**
 * Scenario War Room configuration.
 * v5.3: Scenario War Room
 */
export interface WarRoomConfig {
  baseCase: NamedScenario;                  // Base case scenario
  upside?: NamedScenario;                   // Optional: Upside scenario
  downside?: NamedScenario;                 // Optional: Downside scenario
  
  // Comparison Settings
  compareMetrics: string[];                // Metrics to compare (e.g., ['npv', 'irr', 'dscr', 'equityMultiple'])
  highlightDifferences: boolean;            // Highlight differences between scenarios (default: true)
  showVariance: boolean;                    // Show variance percentages (default: true)
}
```

#### War Room View Architecture

**Component**: `src/views/WarRoomView.tsx` (new view)

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Scenario War Room                                          │
├──────────────────┬──────────────────┬──────────────────────┤
│  Base Case       │  Upside          │  Downside            │
│  (Scenario A)    │  (Scenario B)    │  (Scenario C)       │
├──────────────────┼──────────────────┼──────────────────────┤
│  KPIs            │  KPIs             │  KPIs                │
│  - NPV: $X       │  - NPV: $Y       │  - NPV: $Z           │
│  - IRR: X%       │  - IRR: Y%       │  - IRR: Z%           │
│  - DSCR: X       │  - DSCR: Y       │  - DSCR: Z           │
│                  │  [Δ +15%]        │  [Δ -10%]            │
├──────────────────┼──────────────────┼──────────────────────┤
│  Cash Flow Chart │  Cash Flow Chart │  Cash Flow Chart     │
│  (overlay)       │  (overlay)       │  (overlay)           │
├──────────────────┼──────────────────┼──────────────────────┤
│  Key Differences │  Variance Matrix │  Sensitivity Impact  │
│  - Land Cost     │  (heatmap)       │  (tornado chart)     │
│  - Construction  │                  │                      │
│  - Ramp-up      │                  │                      │
└──────────────────┴──────────────────┴──────────────────────┘
```

#### Diffing Engine

**Engine**: `src/engines/diff/warRoomDiffEngine.ts` (new module, extends existing diff engine)

**Function Signature**:
```typescript
/**
 * Compares three scenarios and generates diff results.
 * v5.3: Scenario War Room
 * 
 * @param baseCase - Base case scenario output
 * @param upside - Upside scenario output (optional)
 * @param downside - Downside scenario output (optional)
 * @returns Diff results with variance calculations
 */
export function compareWarRoomScenarios(
  baseCase: FullModelOutput,
  upside?: FullModelOutput,
  downside?: FullModelOutput
): WarRoomDiffResult;
```

**Output Type**:
```typescript
/**
 * War Room diff result with variance calculations.
 * v5.3: Scenario War Room
 */
export interface WarRoomDiffResult {
  baseCase: FullModelOutput;
  upside?: {
    output: FullModelOutput;
    variance: ScenarioVariance;            // Variance vs. base case
  };
  downside?: {
    output: FullModelOutput;
    variance: ScenarioVariance;            // Variance vs. base case
  };
  
  // Key Differences
  keyDifferences: KeyDifference[];        // Top differences between scenarios
}

/**
 * Variance calculation for a scenario vs. base case.
 * v5.3: Scenario War Room
 */
export interface ScenarioVariance {
  npv: { value: number; pctChange: number };
  irr: { value: number | null; pctChange: number | null };
  equityMultiple: { value: number; pctChange: number };
  dscr: { avgValue: number | null; pctChange: number | null };
  // ... other metrics
}

/**
 * Key difference between scenarios.
 * v5.3: Scenario War Room
 */
export interface KeyDifference {
  category: 'land' | 'construction' | 'rampup' | 'operations' | 'capital';
  field: string;                           // Field name (e.g., 'totalCost', 'steepness')
  baseValue: number | string;
  compareValue: number | string;
  variance: number;                        // Absolute difference
  variancePct: number;                     // Percentage difference
  impact: 'high' | 'medium' | 'low';       // Impact on overall KPIs
}
```

#### UI Components

**Components**:
- `WarRoomView.tsx`: Main view component
- `ScenarioPanel.tsx`: Individual scenario panel (Base/Upside/Downside)
- `VarianceMatrix.tsx`: Heatmap showing variance across metrics
- `KeyDifferencesPanel.tsx`: List of top differences between scenarios
- `OverlayChart.tsx`: Overlay chart showing all three scenarios on same axes

**Features**:
1. **Side-by-Side Comparison**: Three columns (Base/Upside/Downside)
2. **Visual Diffing**: Highlight differences with color coding (green = better, red = worse)
3. **Variance Matrix**: Heatmap showing percentage changes
4. **Overlay Charts**: All three scenarios on same chart with different colors
5. **Key Differences**: Automatically identify top differences and their impact
6. **Export**: Export comparison as PDF or Excel

---

### v5.x Integration Architecture

**Pipeline Flow** (Updated):
```
1. Land Engine → LandFlow[] (pre-Year 0)
2. Construction Engine → ConstructionFlow[] (Year 0+, S-Curve)
3. Operations Engine → MonthlyPnl[] (with Ramp-up factors)
4. Scenario Engine → ConsolidatedAnnualPnl[]
5. Project Engine → UnleveredFcf[] (combines Land + Construction + Operations)
6. Capital Engine → LeveredFcf[]
7. Waterfall Engine → WaterfallResult
8. War Room View → Side-by-side comparison (v5.3)
```

**Data Flow**:
- **LandFlow** and **ConstructionFlow** are combined in Project Engine to calculate **Equity Peak**
- **Ramp-up factors** are applied in Operations Engine before revenue/occupancy calculations
- **War Room** consumes multiple `FullModelOutput` objects and generates diff results

**Backward Compatibility**:
- All v5.x features are **optional** (via optional fields in configs)
- Existing scenarios without v5.x configs continue to work (default behavior)
- `initialInvestment` field is deprecated but maintained for backward compatibility

---

### v5.x Implementation Phases

**Phase 1: v5.0 Land Bank** (Foundation)
1. Define `LandConfig` and `LandInstallment` types
2. Implement `landEngine.ts` with `generateLandFlow()`
3. Integrate with `ProjectConfig` and `ProjectEngine`
4. Add tests for land flow calculations
5. Update UI to support land configuration input

**Phase 2: v5.1 Construction Dynamics** (S-Curve)
1. Define `ConstructionConfig` and `ConstructionMilestone` types
2. Implement `constructionEngine.ts` with `generateSCurve()`
3. Replace `initialInvestment` logic with `ConstructionFlow`
4. Add tests for S-curve generation and validation
5. Update UI to support construction configuration input

**Phase 3: v5.2 Operational Ramp-up** (Operations Enhancement)
1. Define `RampUpConfig` type
2. Implement `rampUpEngine.ts` with `generateRampUpFactors()`
3. Integrate ramp-up factors into all operations engines
4. Add tests for ramp-up factor calculations
5. Update UI to support ramp-up configuration input

**Phase 4: v5.3 Scenario War Room** (Comparison View)
1. Define `WarRoomConfig` and diff result types
2. Implement `warRoomDiffEngine.ts` with comparison logic
3. Create `WarRoomView` component with side-by-side layout
4. Add variance matrix and key differences panels
5. Add tests for diff engine and UI components

---

### v5.7: Dynamic Financial Statements

**Status**: ✅ **Implemented**

**Focus**: Enable selective consolidation of operations in P&L and Cash Flow statements. Users can filter which operations are included (e.g., "Show me only Hotel + Restaurant").

**Concept**: The pre-calculated `consolidatedAnnualPnl` in `FullModelOutput` includes ALL operations. We need client-side aggregation that filters by selected operation IDs and re-aggregates P&L and Cash Flow on the fly.

#### Architecture: Client-Side Aggregation

**Rationale**:
1. **Performance**: Aggregation is lightweight (summing arrays), no need for Web Worker.
2. **Flexibility**: Users can change selections without re-running the full model pipeline.
3. **Separation of Concerns**: Engine calculates all operations; UI layer handles filtering.

**Approach**:
- Re-run scenario engine to get individual operation results (same pattern as `portfolioEngine.ts` and `assetAnalytics.ts`).
- Filter operations by selected IDs.
- Re-aggregate P&L and Cash Flow on the fly.

#### Aggregation Engine

**Location**: `src/engines/analytics/statementAggregation.ts` (new file)

**Function**: `aggregateSelectedOperations(output: FullModelOutput, selectedOperationIds: string[])`

**Returns**:
- `annualPnl`: Filtered `ConsolidatedAnnualPnl[]`
- `monthlyPnl`: Filtered `ConsolidatedMonthlyPnl[]`
- `cashFlow`: Structured cash flow data (annual + monthly)

**Implementation**:
1. Call `runScenarioEngine(output.scenario)` to get individual operations.
2. Filter operations where `config.id` is in `selectedOperationIds`.
3. For each year/month:
   - Sum revenue, expenses, NOI from filtered operations.
   - Apply USALI structure (GOP, Undistributed, NOI).
   - Calculate Cash Flow: NOI - Capex - Debt Service.

**Key Considerations**:
- Use `calculateSponsorCashFlow()` to respect ownership models.
- Handle inactive operations (`isActive === false`) correctly.
- Maintain USALI structure consistency.

#### UI Components

**New Views**:
- `src/views/PnlView.tsx` - Detailed P&L Statement
- `src/views/CashFlowView.tsx` - Cash Flow Statement

**Layout Pattern**: `FilterableReportLayout` (new component)

**Component Hierarchy**:
```
FilterableReportLayout
├── OperationMultiSelect (sidebar or top bar)
│   └── CheckboxGroup for all active operations
└── StatementTable
    ├── PnlTable (for PnlView)
    └── CashFlowTable (for CashFlowView)
```

**Navigation Updates**:
- Add `'pnl'` and `'cashflow'` to `ViewId` type in `Sidebar.tsx`.
- Add navigation items with icons.

**P&L Table Structure** (USALI format):
- Revenue
- Departmental Expenses
- Gross Operating Profit (GOP)
- Undistributed Expenses
- Management Fees (optional)
- Non-Operating Income/Expense (optional)
- Net Operating Income (NOI)

**Cash Flow Table Structure**:
- Net Operating Income (NOI)
- Maintenance Capex
- Debt Service (Interest + Principal)
- Net Cash Flow

#### Cash Flow Calculation

**Formula**:
- **Annual Cash Flow**: `NOI - Maintenance Capex - Debt Service`
- **Monthly Cash Flow**: `NOI - Maintenance Capex - Debt Service`

**Data Sources**:
- NOI: From aggregated P&L
- Maintenance Capex: From aggregated P&L
- Debt Service: From `output.capital.debtSchedule` (project-level, not operation-specific)

**Note**: Debt service is project-level, not operation-specific. We apply the same debt service to the filtered operations' NOI.

#### Implementation Phases

**Phase 1: Core Aggregation Logic**
- Create `statementAggregation.ts` with `aggregateSelectedOperations()`.
- Unit tests for aggregation logic.
- Verify against existing `consolidatedAnnualPnl` (all operations selected).

**Phase 2: UI Components**
- Create `FilterableReportLayout` component.
- Create `OperationMultiSelect` component.
- Create `PnlTable` component.
- Create `CashFlowTable` component.

**Phase 3: Views Integration**
- Create `PnlView` component.
- Create `CashFlowView` component.
- Update `Sidebar` with new navigation items.
- Update `App.tsx` routing.

**Phase 4: Polish & Testing**
- Integration tests.
- UI/UX refinements (styling, responsiveness).
- Export functionality (Excel/CSV).
- Documentation updates.

#### Risk Assessment

**Confidence Score: 0.85**

**Justification**:
- Core logic is straightforward (summing arrays).
- Existing patterns (`portfolioEngine.ts`, `assetAnalytics.ts`) prove the approach.
- Main uncertainty: Debt service allocation (project-level vs operation-specific). Document assumption and allow user feedback.

**Technical Risks**:
1. **Performance**: Aggregation re-runs scenario engine (O(n) where n = operations).
   - **Mitigation**: Use `useMemo` to cache results. Scenario engine is fast (< 10ms for typical scenarios).
2. **Data Consistency**: Filtered aggregation must match full aggregation when all selected.
   - **Mitigation**: Unit test with property-based testing (invariant: sum of parts = whole).

**Breaking Changes**: None - This is a pure addition.

---

### v5.x Agent Responsibilities

**ARCHITECTURE_AGENT** (this agent):
- ✅ Define v5.x roadmap and data models (this document)
- ✅ Coordinate integration points between modules
- ✅ Ensure backward compatibility

**CORE_LOGIC_AGENT**:
- Implement `landEngine.ts`, `constructionEngine.ts`, `rampUpEngine.ts`
- Integrate with `ProjectEngine` and `OperationsEngine`
- Add types to `src/domain/types.ts`
- Write tests for all engines

**UI_AGENT**:
- Create UI components for land, construction, and ramp-up configuration
- Implement `WarRoomView` with side-by-side comparison
- Add variance visualization components

---

### v5.x Confidence Score

**Confidence Score: 0.85**

**Justification**:
- ✅ Clear data models defined for all four modules
- ✅ Mathematical formulas specified (S-curve, ramp-up factors)
- ✅ Integration points identified (Project Engine, Operations Engine)
- ✅ Backward compatibility strategy defined
- ⚠️ Minor gaps: Specific UI/UX details for War Room view (can be refined during implementation)
- ⚠️ Performance considerations: S-curve generation is lightweight, but War Room diffing may need optimization for large scenarios

---

### v0.10 – The Glass Box (Auditability)

**Status**: ✅ Implemented in v0.10

**Focus**: Expose calculation logic in the UI without cluttering it. Investors trust models they can audit.

**Overview**: Every major financial output should have metadata explaining its origin. The "Glass Box" approach provides transparency through an Audit Overlay UI mode that highlights calculated fields and opens Traceability Cards on click.

#### Core Concept: Traceability Architecture

**Principle**: Every major financial output should have metadata explaining its origin.

**Design Philosophy**:
- **Non-intrusive**: Audit features are opt-in via UI toggle, not always visible
- **Just-in-Time**: We don't rewrite engines to return audit traces for every calculation (too heavy)
- **Selective**: Only major outputs get traceability (KPIs, key line items, not every intermediate step)
- **UI-Layer**: Audit logic lives in UI layer or a dedicated `AuditEngine` helper, not embedded in core engines

#### Data Structure: AuditTrace

**Type Definition**:
```typescript
export interface AuditTrace {
  formula: string;                    // Human-readable formula (e.g., "NOI = GOP - Undistributed Expenses")
  inputs: Record<string, number | string>; // Input values used in calculation (e.g., { gop: 5000000, undistributedExpenses: 1200000 })
  sourceModule: string;               // Engine/module that produced this value (e.g., "scenarioEngine", "capitalEngine", "waterfallEngine")
  calculationStep?: string;           // Optional: specific step within the module (e.g., "calculateNOI", "applyPreferredReturn")
  yearIndex?: number;                 // Optional: year index if this is a time-series value
  operationId?: string;               // Optional: operation ID if this is operation-specific
}
```

**Usage Pattern**:
- Major outputs (NPV, IRR, NOI, DSCR, partner distributions) get `AuditTrace` metadata
- Traceability is computed on-demand when user clicks a field (Just-in-Time)
- Not stored in engine results by default (keeps engines pure and performant)

#### Audit Overlay UI Mode

**Concept**: A UI mode that, when toggled, highlights calculated fields. Clicking them opens a "Traceability Card".

**Implementation**:
1. **Toggle Button**: Global toggle in UI header (e.g., "Audit Mode" or "Show Calculations")
2. **Visual Highlighting**: When enabled, calculated fields get visual indicators:
   - Subtle border or background color
   - Icon (e.g., calculator icon) on hover
   - Tooltip: "Click to view calculation"
3. **Traceability Card**: Modal or side panel that shows:
   - Field name and value
   - Formula (human-readable)
   - Input values (with labels)
   - Source module/engine
   - Optional: Drill-down to upstream calculations

**UI Components**:
- `AuditOverlayToggle`: Toggle button component
- `TraceabilityCard`: Modal/side panel component
- `AuditableField`: Wrapper component that adds audit highlighting to any field

#### Just-in-Time Auditor

**Approach**: Implement a helper in the UI layer or a specific `AuditEngine` that reconstructs audit traces from engine outputs.

**Location**: `src/engines/audit/auditEngine.ts` (new module) or `src/ui/audit/auditHelpers.ts`

**Responsibilities**:
- Given a field path (e.g., `projectKpis.npv`, `consolidatedAnnualPnl[0].noi`), compute its `AuditTrace`
- Reconstruct formulas from engine outputs and known calculation patterns
- Map engine outputs back to their source modules
- Handle edge cases (missing data, invalid paths)

**Example**:
```typescript
function getAuditTrace(
  fieldPath: string,
  modelOutput: FullModelOutput
): AuditTrace | null {
  // Parse field path (e.g., "projectKpis.npv" or "consolidatedAnnualPnl[0].noi")
  // Reconstruct formula from modelOutput
  // Return AuditTrace with formula, inputs, sourceModule
}
```

**Key Calculations to Support**:
- **Project KPIs**: NPV, IRR, Equity Multiple, Payback Period, WACC
- **Consolidated P&L**: NOI, GOP, Departmental Expenses, Undistributed Expenses
- **Capital Metrics**: DSCR, LTV, Debt Service
- **Waterfall**: Partner distributions, Partner IRR, Partner MOIC
- **Sensitivity**: Sensitivity results and their base case comparisons

#### Traceability Card Design

**Content Structure**:
1. **Header**: Field name, current value, unit
2. **Formula Section**: 
   - Human-readable formula (e.g., "NOI = Gross Operating Profit - Undistributed Operating Expenses")
   - Optional: Mathematical notation
3. **Inputs Table**:
   - Input name | Value | Source
   - Example: "Gross Operating Profit" | $5,000,000 | Scenario Engine
   - Example: "Undistributed Operating Expenses" | $1,200,000 | Scenario Engine
4. **Source Information**:
   - Source Module: "scenarioEngine"
   - Calculation Step: "calculateNOI"
   - Year Index: 0 (if applicable)
5. **Optional Drill-Down**:
   - Links to trace upstream calculations (e.g., "View GOP calculation" → opens another Traceability Card)

**UI Design**:
- Modal overlay or slide-in side panel
- Clean, readable layout
- Copy-to-clipboard for formula
- Print-friendly styling

#### Implementation Strategy

**Phase 1: Core Infrastructure** (v0.10.0)
- Define `AuditTrace` type in `src/domain/types.ts`
- Create `AuditEngine` helper module
- Implement `getAuditTrace()` for top 10 most important fields:
  - NPV, IRR, Equity Multiple (Project KPIs)
  - NOI, GOP (Consolidated P&L)
  - DSCR, LTV (Capital Metrics)
  - Partner IRR, Partner MOIC (Waterfall)

**Phase 2: UI Components** (v0.10.1)
- Implement `AuditOverlayToggle` component
- Implement `TraceabilityCard` component
- Implement `AuditableField` wrapper
- Add audit mode to MainLayout

**Phase 3: Extended Coverage** (v0.10.2)
- Expand `getAuditTrace()` to cover all major outputs
- Add drill-down support for upstream calculations
- Add export functionality (export audit trace as JSON/PDF)

#### What v0.10 Explicitly Does NOT Do

1. **No Engine Rewrites**:
   - Engines remain pure and do not return audit traces by default
   - Audit logic is separate from calculation logic

2. **No Performance Impact**:
   - Audit traces computed on-demand (when user clicks)
   - No overhead during normal model execution

3. **No Full Calculation History**:
   - We don't track every intermediate calculation step
   - Only major outputs get traceability

4. **No Change Tracking**:
   - Version history and change tracking deferred to v0.11+
   - This release focuses on calculation transparency, not change audit trails

#### v0.10 Agent Responsibilities

**Architecture Agent** (this agent):
- ✅ Define traceability architecture (this document)
- ✅ Update roadmap to reflect v0.10 and v0.11

**UI Agent**:
- Implement `AuditOverlayToggle`, `TraceabilityCard`, `AuditableField` components
- Integrate audit mode into MainLayout
- Style traceability cards for readability

**Core Logic Agent** (optional):
- Document calculation formulas for major outputs (for use by AuditEngine)
- Ensure engine outputs are structured to enable audit trace reconstruction

**New: Audit Engine Agent** (or UI Agent):
- Implement `AuditEngine` helper module
- Implement `getAuditTrace()` function
- Map field paths to calculation formulas
- Test audit trace accuracy

**QA Agent**:
- Test audit traces match actual calculations
- Verify traceability cards display correctly
- Test audit mode toggle and interactions

**Documentation Agent**:
- Update ARCHITECTURE.md with v0.10 implementation details
- Document audit trace format and usage
- Update user guide with audit mode instructions

### v0.11 – Simulation (Monte Carlo)

**Status**: ✅ Implemented

**Focus**: Monte Carlo simulation for risk analysis and probabilistic modeling

**Overview**: Run 500-1000 iterations of the full financial model with probabilistic inputs to generate distribution of outcomes. Visualize results with histograms and calculate risk metrics (VaR, P50, P90).

#### Simulation Engine

**Input**: `BaseScenario` + `SimulationConfig` (list of variables and their volatility/stdDev)

**Process**: 
- Run 500-1000 iterations synchronously (batch processing)
- For each iteration:
  1. Sample probabilistic inputs from distributions
  2. Run full pipeline: Operations → Scenario → Project → Capital → Waterfall
  3. Collect resulting KPIs (NPV, IRR, MoIC, partner IRRs, etc.)

**Output**: `SimulationResult` (Array of resulting KPIs per iteration)

**Type Definitions**:
```typescript
/**
 * Configuration for a Monte Carlo simulation run.
 * Defines which variables are probabilistic and their distributions.
 */
export interface SimulationConfig {
  baseScenario: NamedScenario;  // Base case scenario to vary
  iterations: number;            // Number of simulation runs (500-1000 recommended)
  variables: Array<{
    variable: SensitivityVariable;  // Which variable to make probabilistic
    distribution: 'normal' | 'uniform' | 'triangular';
    // For normal distribution:
    mean?: number;                  // Mean value (defaults to base scenario value)
    stdDev?: number;                // Standard deviation
    // For uniform distribution:
    min?: number;                   // Minimum value
    max?: number;                   // Maximum value
    // For triangular distribution:
    mode?: number;                  // Most likely value
  }>;
}

/**
 * Results from a Monte Carlo simulation run.
 * Contains distribution of KPIs across all iterations.
 */
export interface SimulationResult {
  config: SimulationConfig;
  iterations: Array<{
    iterationIndex: number;
    variableValues: Record<string, number>;  // Actual sampled values for this iteration
    output: FullModelOutput;                  // Full model output for this iteration
    kpis: {
      npv: number;
      unleveredIrr: number | null;
      leveredIrr?: number | null;    // LP levered IRR (from waterfall)
      moic?: number;                  // LP MOIC (from waterfall)
      equityMultiple: number;
      wacc?: number | null;
    };
  }>;
  // Statistical summaries
  statistics: {
    npv: {
      mean: number;
      stdDev: number;
      p10: number;    // 10th percentile (pessimistic)
      p50: number;   // 50th percentile (median)
      p90: number;   // 90th percentile (optimistic)
      var95: number; // Value at Risk (95% confidence)
      cvar95: number; // Conditional VaR (expected loss beyond VaR)
    };
    unleveredIrr: {
      mean: number | null;
      stdDev: number | null;
      p10: number | null;
      p50: number | null;
      p90: number | null;
    };
    // ... similar for other KPIs
  };
}
```

#### Implementation Strategy

**Location**: `src/engines/simulation/simulationEngine.ts`

**Algorithm**:
1. **Input Validation**: Validate `SimulationConfig`, ensure all required distribution parameters are provided
2. **Distribution Sampling**: For each iteration, sample each probabilistic variable from its distribution
3. **Model Execution**: Run `runFullModel()` with sampled inputs
4. **Result Aggregation**: Collect KPIs from each iteration
5. **Statistical Analysis**: Calculate mean, stdDev, percentiles (P10, P50, P90), VaR, CVaR

**Key Functions**:
```typescript
/**
 * Run Monte Carlo simulation.
 * @param config Simulation configuration
 * @returns SimulationResult with all iterations and statistics
 */
function runMonteCarloSimulation(
  config: SimulationConfig
): SimulationResult {
  // 1. Validate config
  // 2. Initialize results array
  // 3. For each iteration:
  //    a. Sample probabilistic variables
  //    b. Create modified scenario with sampled values
  //    c. Run full model pipeline
  //    d. Collect KPIs
  // 4. Calculate statistics (mean, stdDev, percentiles, VaR, CVaR)
  // 5. Return SimulationResult
}

/**
 * Sample a value from a probability distribution.
 */
function sampleFromDistribution(
  distribution: 'normal' | 'uniform' | 'triangular',
  params: Record<string, number>
): number {
  // Implementation depends on distribution type
  // Use standard algorithms (Box-Muller for normal, etc.)
}
```

#### Visualization

**Distribution Chart**: A Histogram showing the frequency of IRR outcomes (and other KPIs)

**UI Components**:
- `SimulationConfigPanel`: Input form for simulation configuration
- `SimulationResultsView`: Display simulation results
- `DistributionHistogram`: Histogram chart showing KPI distribution
- `RiskMetricsCard`: Display VaR, P50, P90, and other risk metrics

**Chart Design**:
- X-axis: KPI value (e.g., IRR %)
- Y-axis: Frequency (number of iterations)
- Overlay: Vertical lines for P10, P50, P90, VaR
- Tooltip: Show exact values on hover

#### Risk Metrics

**Value at Risk (VaR)**:
- VaR95: 95th percentile (5% of outcomes are worse than this)
- Interpretation: "There is a 5% chance that NPV will be below VaR95"

**Conditional VaR (CVaR)**:
- Expected value of outcomes below VaR
- Interpretation: "If we're in the worst 5% of outcomes, expected NPV is CVaR95"

**Percentiles**:
- P10 (10th percentile): Pessimistic case
- P50 (50th percentile): Median case
- P90 (90th percentile): Optimistic case

#### Integration with Sensitivity Analysis

**Relationship**:
- Sensitivity Analysis: Deterministic, shows impact of single variable changes
- Monte Carlo: Probabilistic, shows distribution of outcomes with multiple uncertain variables
- Both complement each other in risk analysis

**UI Integration**:
- Add "Simulation" tab or section in Analysis view
- Allow users to switch between Sensitivity and Simulation modes
- Share base scenario between both analyses

#### Performance Considerations

**Synchronous Batch Processing**:
- Run all iterations in a single batch (no async/await for individual iterations)
- Use `Promise.all()` only if needed for parallelization (not recommended for 500-1000 iterations)
- Consider progress reporting for long-running simulations

**Optimization**:
- Cache base scenario calculations where possible
- Minimize redundant computations across iterations
- Consider Web Workers for very large simulations (1000+ iterations) if UI blocking becomes an issue

#### What v0.11 Explicitly Does NOT Do

1. **No Real-Time Streaming**:
   - Results are computed in batch, not streamed incrementally
   - Progress reporting is optional, not required

2. **No Advanced Distributions**:
   - Only normal, uniform, and triangular distributions in v0.11
   - More complex distributions (lognormal, beta, etc.) deferred to v0.12+

3. **No Correlation Modeling**:
   - Variables are sampled independently
   - Correlation between variables deferred to v0.12+

4. **No Optimization**:
   - Simulation is for risk analysis, not optimization
   - Optimization features deferred to v0.12+

#### v0.11 Agent Responsibilities

**Quant Agent**:
- Implement `simulationEngine.ts`
- Implement distribution sampling functions
- Calculate risk metrics (VaR, CVaR, percentiles)
- Ensure simulation results are statistically sound
- Test simulation accuracy and convergence

**Core Logic Agent**:
- Support simulation input validation
- Ensure scenario engine can handle probabilistic inputs
- Define `SimulationConfig` and `SimulationResult` types in `types.ts`

**UI Agent**:
- Implement `SimulationConfigPanel` component
- Implement `SimulationResultsView` component
- Implement `DistributionHistogram` chart component
- Implement `RiskMetricsCard` component
- Integrate simulation UI into Analysis tab

**QA Agent**:
- Test distribution sampling accuracy
- Test statistical calculations (mean, stdDev, percentiles, VaR, CVaR)
- Test simulation convergence (results stabilize with sufficient iterations)
- Test edge cases (single variable, all variables probabilistic, extreme distributions)

**Documentation Agent**:
- Update ARCHITECTURE.md with v0.11 implementation details
- Document simulation methodology and assumptions
- Update user guide with simulation instructions

### v0.12 – Governance & Versioning

**Status**: ✅ Implemented

**Focus**: Manage the evolution of scenarios with versioning, diff tracking, and comparison capabilities

**Overview**: Enable users to save scenario versions, track changes over time, and compare different versions side-by-side. This provides governance and auditability for scenario evolution.

#### Versioning Data Structure

**Type Definition**:
```typescript
/**
 * A versioned snapshot of a scenario.
 * Each version represents a point-in-time state of a scenario configuration.
 */
export interface ScenarioVersion {
  id: string;                    // Unique version identifier (UUID)
  parentScenarioId: string;      // ID of the parent scenario (the "current" scenario)
  timestamp: number;        // Timestamp in milliseconds since epoch
  label: string;              // Human-readable label (e.g., "v1.0", "After Q1 Review", "Pre-Refinancing")
  description?: string;       // Optional description of what changed in this version
  data: NamedScenario;        // The complete scenario configuration at this version
  createdBy?: string;         // Optional: user identifier who created this version
}

/**
 * Extended scenario library with version history.
 * Extends the existing scenario persistence to include version tracking.
 */
export interface VersionedScenarioLibrary {
  scenarios: NamedScenario[];           // Current scenarios (same as before)
  versions: Record<string, ScenarioVersion[]>; // Map: scenarioId -> array of versions
  // Note: The "current" scenario is in scenarios[], versions[] contains historical snapshots
}
```

**Storage Strategy**:
- Extend existing `ScenarioLibrary` persistence (localStorage) to include `versions` field
- Versions are stored per scenario (keyed by `parentScenarioId`)
- Maintain backward compatibility: existing scenario libraries without versions still work

#### Diff Engine

**Purpose**: Compare two scenario objects and identify all differences

**Location**: `src/engines/diff/diffEngine.ts`

**Type Definitions**:
```typescript
/**
 * A single change detected between two scenarios.
 */
export interface ScenarioChange {
  path: string;        // JSON path to the changed field (e.g., "projectConfig.discountRate", "operations[0].avgDailyRate")
  oldValue: any;       // Value in the old scenario (or null if field was added)
  newValue: any;       // Value in the new scenario (or null if field was removed)
  changeType: 'added' | 'removed' | 'modified'; // Type of change
}

/**
 * Result of comparing two scenarios.
 */
export interface DiffResult {
  scenarioId: string;              // ID of the scenario being compared
  oldVersionId?: string;           // Optional: ID of the old version (if comparing versions)
  newVersionId?: string;           // Optional: ID of the new version (if comparing versions)
  changes: ScenarioChange[];       // List of all changes detected
  summary: {
    totalChanges: number;
    addedFields: number;
    removedFields: number;
    modifiedFields: number;
  };
}
```

**Key Functions**:
```typescript
/**
 * Compare two scenarios and return a diff result.
 * @param oldScenario The older scenario (or version)
 * @param newScenario The newer scenario (or version)
 * @returns DiffResult with all detected changes
 */
function compareScenarios(
  oldScenario: NamedScenario,
  newScenario: NamedScenario
): DiffResult {
  // 1. Deep comparison of scenario objects
  // 2. Track all differences (added, removed, modified fields)
  // 3. Generate JSON paths for each change
  // 4. Return DiffResult with summary statistics
}

/**
 * Compare two scenario versions.
 * Convenience wrapper around compareScenarios for version comparison.
 */
function compareVersions(
  oldVersion: ScenarioVersion,
  newVersion: ScenarioVersion
): DiffResult {
  return compareScenarios(oldVersion.data, newVersion.data);
}
```

**Diff Algorithm**:
1. **Deep Object Comparison**: Recursively compare all fields in both scenarios
2. **Path Generation**: Generate JSON path strings for each difference (e.g., `"operations[0].avgDailyRate"`)
3. **Change Classification**: Classify each change as added, removed, or modified
4. **Summary Statistics**: Count total changes, added fields, removed fields, modified fields

**Edge Cases**:
- Handle array differences (operations added/removed/reordered)
- Handle nested object differences (capitalConfig.debtTranches[0].interestRate)
- Handle type mismatches (number vs string, etc.)
- Handle null/undefined values

#### UI Workflow

**1. Save Version Button**:
- **Location**: Global Header (next to existing scenario controls)
- **Behavior**:
  - Click opens a modal/dialog
  - User enters version label (required) and optional description
  - System generates version ID and timestamp
  - Creates `ScenarioVersion` and saves to `VersionedScenarioLibrary`
  - Shows success message

**2. Version History Panel**:
- **Location**: Dashboard tab (new section or expandable panel)
- **Content**:
  - List of all versions for the current scenario
  - Display: Version label, timestamp, description, "Compare" button
  - Sort: Most recent first (default)
  - Actions: View version, Compare with current, Compare with another version, Delete version

**3. Compare Action**:
- **Trigger**: "Compare" button in Version History panel
- **Workflow**:
  1. User selects two versions (or one version + current scenario)
  2. System calls `compareScenarios()` or `compareVersions()`
  3. Display side-by-side diff view:
     - Left panel: Old scenario/version
     - Right panel: New scenario/version
     - Highlighted differences (added/removed/modified fields)
     - Summary statistics at top

**UI Components**:
- `SaveVersionDialog`: Modal for saving a new version
- `VersionHistoryPanel`: Panel showing version list
- `VersionComparisonView`: Side-by-side diff view
- `DiffHighlight`: Component for highlighting changed fields

**UI Design**:
- **Version List**: Clean table/card layout with version metadata
- **Diff View**: Two-column layout with synchronized scrolling
- **Highlighting**: Color-coded changes (green for added, red for removed, yellow for modified)
- **Navigation**: Breadcrumbs showing "Scenario > Version History > Compare"

#### Implementation Strategy

**Phase 1: Data Structures** (v0.12.0)
- Define `ScenarioVersion` and `VersionedScenarioLibrary` types in `src/domain/types.ts`
- Extend scenario persistence to handle versions
- Update `ScenarioLibrary` storage format (backward compatible)

**Phase 2: Diff Engine** (v0.12.1)
- Implement `diffEngine.ts` with `compareScenarios()` function
- Test diff algorithm with various scenario changes
- Handle edge cases (arrays, nested objects, type mismatches)

**Phase 3: UI Components** (v0.12.2)
- Implement `SaveVersionDialog` component
- Implement `VersionHistoryPanel` component
- Implement `VersionComparisonView` component
- Integrate into Dashboard and Header

**Phase 4: Integration** (v0.12.3)
- Wire up version saving workflow
- Wire up version comparison workflow
- Test end-to-end versioning flow
- Add error handling and validation

#### What v0.12 Explicitly Does NOT Do

1. **No Automatic Versioning**:
   - Versions are only created when user explicitly clicks "Save Version"
   - No automatic snapshots on every change

2. **No Branching/Merging**:
   - Linear version history only
   - No branching, merging, or conflict resolution

3. **No Collaborative Features**:
   - No multi-user editing
   - No real-time collaboration
   - No conflict detection for concurrent edits

4. **No Version Rollback**:
   - Viewing and comparing versions only
   - Restoring a previous version as current is deferred to v0.13+

#### v0.12 Agent Responsibilities

**Core Logic Agent**:
- Define `ScenarioVersion` and `VersionedScenarioLibrary` types in `types.ts`
- Implement `diffEngine.ts` with `compareScenarios()` function
- Extend scenario persistence to handle versions (backward compatible)
- Test diff algorithm accuracy and edge cases

**UI Agent**:
- Implement `SaveVersionDialog` component
- Implement `VersionHistoryPanel` component
- Implement `VersionComparisonView` component
- Integrate "Save Version" button into Global Header
- Integrate version history into Dashboard tab
- Style diff view for readability

**QA Agent**:
- Test diff algorithm with various scenario changes
- Test version persistence and retrieval
- Test backward compatibility (scenarios without versions)
- Test edge cases (empty scenarios, large scenarios, deep nesting)
- Test UI workflows (save, view, compare)

**Documentation Agent**:
- Update ARCHITECTURE.md with v0.12 implementation details
- Document versioning workflow and best practices
- Update user guide with versioning instructions

### v0.13 – Excel Bridge

**Status**: ✅ Implemented

**Focus**: Export model results to professional `.xlsx` files with high-quality formatting and multi-sheet structure

**Overview**: Enable users to export complete financial model results to Excel for further analysis, presentation, or sharing. Focus on presentation quality with proper formatting, styles, and multi-sheet organization. Values only (hardcoded), no dynamic Excel formulas.

#### Library Selection

**Library**: `exceljs` (npm package)

**Rationale**:
- Robust styling support (colors, fonts, borders, alignment)
- Multi-sheet support
- Good TypeScript support
- Active maintenance
- Browser-compatible (works with Vite/React)

**Installation**:
```bash
npm install exceljs
```

#### Excel Structure

**Multi-Sheet Workbook** with 4 sheets:

**Sheet 1: Executive Summary**
- Top KPIs (NPV, IRR, Equity Multiple, Payback Period, WACC)
- Project-level metrics (Enterprise Value, Equity Value, Terminal Value)
- Capital metrics (Average DSCR, Final LTV)
- Partner-level KPIs (Partner IRRs, Partner MOICs)
- Optional: Chart data tables (for graphs that users can create in Excel)
- Layout: Clean, executive-friendly format with key metrics highlighted

**Sheet 2: Assumptions**
- Project Config (discount rate, terminal growth rate, initial investment, working capital %)
- Capital Structure (debt tranches with all parameters)
- Waterfall Config (equity classes, tiers, catch-up, clawback settings)
- Operations Config (all operation types with their parameters)
- Layout: Organized sections with clear headers, grouped by category

**Sheet 3: Annual Cash Flow**
- Consolidated Annual P&L (USALI format)
- Columns: Year, Revenue, Departmental Expenses, GOP, Undistributed Expenses, NOI, Maintenance Capex, Cash Flow
- Unlevered FCF breakdown (NOI, Maintenance Capex, Change in Working Capital, UFCF)
- Levered FCF breakdown (Unlevered FCF, Debt Service, Interest, Principal, Transaction Costs, Levered FCF)
- Layout: Year-by-year table with proper USALI field names

**Sheet 4: Waterfall**
- Partner distributions year-by-year
- Columns: Year, Owner Cash Flow, Partner 1 Distribution, Partner 2 Distribution, ..., Total Distributions
- Partner KPIs summary (IRR, MOIC per partner)
- Layout: Clear table showing how cash flows are distributed among partners

#### Formatting Rules

**Financial Values**:
- Format: `"$#,##0"` (currency with thousand separators, no decimals)
- Example: `$1,234,567`
- Apply to: All monetary values (NPV, cash flows, distributions, etc.)

**Percentages**:
- Format: `"0.00%"` (percentage with 2 decimal places)
- Example: `12.34%`
- Apply to: IRR, discount rates, interest rates, percentages

**Headers**:
- Style: Bold, Blue background (`#4472C4`), White text
- Alignment: Center
- Font: Arial or Calibri, 11pt
- Apply to: All sheet headers, section headers, column headers

**Sub-Headers**:
- Style: Bold, Light gray background (`#D9E1F2`), Black text
- Alignment: Left
- Apply to: Section sub-headers, grouped rows

**Data Rows**:
- Style: Default (white background, black text)
- Alignment: Numbers right-aligned, text left-aligned
- Borders: Thin borders between rows for readability

**Totals/Summary Rows**:
- Style: Bold, Light yellow background (`#FFF2CC`), Black text
- Apply to: Total rows, summary calculations

#### Implementation Strategy

**Location**: `src/utils/excelExport.ts` or `src/engines/export/excelExportEngine.ts`

**Key Functions**:
```typescript
import ExcelJS from 'exceljs';

/**
 * Export full model output to Excel file.
 * @param output FullModelOutput from the pipeline
 * @param scenarioName Name of the scenario (used in filename)
 * @returns Promise<Blob> Excel file blob for download
 */
async function exportToExcel(
  output: FullModelOutput,
  scenarioName: string
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  
  // Create sheets
  const summarySheet = workbook.addWorksheet('Executive Summary');
  const assumptionsSheet = workbook.addWorksheet('Assumptions');
  const cashFlowSheet = workbook.addWorksheet('Annual Cash Flow');
  const waterfallSheet = workbook.addWorksheet('Waterfall');
  
  // Populate each sheet with formatted data
  populateExecutiveSummary(summarySheet, output);
  populateAssumptions(assumptionsSheet, output);
  populateAnnualCashFlow(cashFlowSheet, output);
  populateWaterfall(waterfallSheet, output);
  
  // Generate blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

/**
 * Apply formatting to a cell or range.
 */
function applyFinancialFormat(worksheet: ExcelJS.Worksheet, cell: string, value: number) {
  const cellRef = worksheet.getCell(cell);
  cellRef.value = value;
  cellRef.numFmt = '$#,##0';
  cellRef.alignment = { horizontal: 'right' };
}

function applyPercentageFormat(worksheet: ExcelJS.Worksheet, cell: string, value: number) {
  const cellRef = worksheet.getCell(cell);
  cellRef.value = value;
  cellRef.numFmt = '0.00%';
  cellRef.alignment = { horizontal: 'right' };
}

function applyHeaderStyle(worksheet: ExcelJS.Worksheet, cell: string, text: string) {
  const cellRef = worksheet.getCell(cell);
  cellRef.value = text;
  cellRef.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cellRef.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  cellRef.alignment = { horizontal: 'center', vertical: 'middle' };
}
```

**UI Integration**:
- Add "Export to Excel" button in Global Header (next to existing export buttons)
- Button triggers `exportToExcel()` function
- Downloads file with name: `"{scenarioName}_Financial_Model_{timestamp}.xlsx"`
- Show loading state during export generation
- Handle errors gracefully (show error message if export fails)

#### Sheet Details

**Sheet 1: Executive Summary**
```
Row 1: [Header] Executive Summary
Row 2: [Sub-header] Project KPIs
Row 3: NPV: $X,XXX,XXX
Row 4: IRR: XX.XX%
Row 5: Equity Multiple: X.XX
Row 6: Payback Period: X years
Row 7: WACC: XX.XX%
Row 8: [Sub-header] Valuation
Row 9: Enterprise Value: $X,XXX,XXX
Row 10: Equity Value: $X,XXX,XXX
Row 11: Terminal Value: $X,XXX,XXX
Row 12: [Sub-header] Capital Metrics
Row 13: Average DSCR: X.XX
Row 14: Final LTV: XX.XX%
Row 15: [Sub-header] Partner Returns
Row 16: Partner 1 IRR: XX.XX%, MOIC: X.XX
Row 17: Partner 2 IRR: XX.XX%, MOIC: X.XX
...
```

**Sheet 2: Assumptions**
```
Row 1: [Header] Project Assumptions
Row 2: Discount Rate: XX.XX%
Row 3: Terminal Growth Rate: XX.XX%
Row 4: Initial Investment: $X,XXX,XXX
Row 5: Working Capital %: XX.XX%
Row 6: [Header] Capital Structure
Row 7: [Sub-header] Debt Tranche 1
Row 8: Initial Principal: $X,XXX,XXX
Row 9: Interest Rate: XX.XX%
Row 10: Amortization Type: Mortgage
Row 11: Term Years: XX
Row 12: [Sub-header] Debt Tranche 2
...
Row N: [Header] Waterfall Configuration
Row N+1: [Sub-header] Equity Classes
Row N+2: Partner 1: XX.XX% contribution
Row N+3: Partner 2: XX.XX% contribution
...
```

**Sheet 3: Annual Cash Flow**
```
Row 1: [Header] Year | Revenue | Dept Expenses | GOP | Undist Expenses | NOI | Maint Capex | Cash Flow
Row 2: Year 0 | $X,XXX | $X,XXX | $X,XXX | $X,XXX | $X,XXX | $X,XXX | $X,XXX
Row 3: Year 1 | $X,XXX | $X,XXX | $X,XXX | $X,XXX | $X,XXX | $X,XXX | $X,XXX
...
Row N: [Total] | $X,XXX | $X,XXX | $X,XXX | $X,XXX | $X,XXX | $X,XXX | $X,XXX
```

**Sheet 4: Waterfall**
```
Row 1: [Header] Year | Owner CF | Partner 1 | Partner 2 | ... | Total
Row 2: Year 0 | $X,XXX | $X,XXX | $X,XXX | ... | $X,XXX
Row 3: Year 1 | $X,XXX | $X,XXX | $X,XXX | ... | $X,XXX
...
Row N: [Total] | $X,XXX | $X,XXX | $X,XXX | ... | $X,XXX
Row N+1: [Header] Partner KPIs
Row N+2: Partner 1: IRR XX.XX%, MOIC X.XX
Row N+3: Partner 2: IRR XX.XX%, MOIC X.XX
...
```

#### What v0.13 Explicitly Does NOT Do

1. **No Dynamic Excel Formulas**:
   - All values are hardcoded (calculated values from the model)
   - No Excel formulas like `=SUM(A2:A10)` or `=NPV(...)`
   - Users can add formulas manually if needed

2. **No Chart Generation**:
   - Excel file contains data only
   - Users can create charts in Excel from the data
   - Optional: Include chart data tables for convenience

3. **No Import/Read Capability**:
   - Export only (one-way)
   - Reading Excel files back into the model deferred to v0.14+

4. **No Template Customization**:
   - Fixed sheet structure and layout
   - Custom templates or user-defined layouts deferred to v0.14+

#### v0.13 Agent Responsibilities

**UI Agent** (owns Data Export/IO domain):
- Install and configure `exceljs` library
- Implement `excelExport.ts` or `excelExportEngine.ts` module
- Implement sheet population functions (Executive Summary, Assumptions, Annual Cash Flow, Waterfall)
- Implement formatting functions (financial, percentage, headers, styles)
- Add "Export to Excel" button to Global Header
- Wire up export functionality to download Excel file
- Handle loading states and error cases
- Test export with various scenarios

**Core Logic Agent** (optional support):
- Ensure `FullModelOutput` structure supports all data needed for export
- Verify data types are compatible with Excel export

**QA Agent**:
- Test Excel file generation with various scenarios
- Verify formatting is correct (financial, percentage, headers)
- Verify all sheets contain expected data
- Test file download functionality
- Test with edge cases (empty scenarios, large datasets, special characters in names)

**Documentation Agent**:
- Update ARCHITECTURE.md with v0.13 implementation details
- Document Excel export format and structure
- Update user guide with export instructions

### v0.14+ (Future Milestones)

**Focus**: Advanced analytics, refinements, and extended capabilities

**Potential Features**:
- Excel import/read capability
- Custom Excel templates
- Chart generation in Excel
- Version rollback/restore functionality
- Automatic version snapshots
- Branching and merging scenarios
- Collaborative editing features
- Advanced diff visualization (tree view, unified diff)

---

## Maintenance Rules

**Before any significant change** (new feature, new engine, changes in financial logic):

1. **Update this document first** to describe the intended architecture
2. Then adjust the code to match the document
3. Code must not diverge from this architecture for long
4. When in doubt, align the code to this document

**When chat context gets reset**, this document is the starting point for new agents.

**This document is the single source of truth** for project architecture.

---

## Known Limitations / TODOs (Documented)

This section documents known limitations and planned enhancements for v0.4 and beyond.

### Current Limitations (v0.4)

1. **Operation Types**: 
   - ✅ All 9 operation types fully implemented, integrated, tested, and included in sample data:
     - HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING
   - ⚠️ Some operation types use simplified assumptions (documented in each config's "Note" field):
     - Membership revenue allocated evenly across months (no seasonal variations)
     - No distinction between operation subtypes (e.g., independent vs. assisted living)
     - Simplified revenue drivers for some types
   - ⏳ Future refinements (v0.5+): More sophisticated modeling for specific operation types

2. **Waterfall Implementation**:
   - ✅ Multi-tier waterfall (Return of Capital → Preferred Return → Promote) is implemented and tested
   - ✅ Single-tier waterfall (v0.2) still supported as fallback
   - ⏳ Enhanced waterfall features (catch-up, clawback, compounding preferred returns): planned for v0.5+

3. **Capital Structure**:
   - Only the first debt tranche is currently used in calculations
   - Multiple debt tranches support is planned for v0.5+
   - Refinancing logic is planned for v0.5+

4. **UI Features**:
   - ✅ v0.4: Multi-operation display (all 9 types), waterfall tiers summary, partner KPIs, editable parameters
   - ⏳ v0.5+: Custom scenario input forms, scenario comparison view, charts/visualizations, export functionality, sensitivity analysis, Monte Carlo simulation

### Validation Status (v0.4)

- ✅ All core invariants (debt schedule, waterfall, UFCF finiteness) are enforced and tested
- ✅ Pipeline order matches architecture exactly: Operations → Scenario → Project → Capital → Waterfall
- ✅ UI correctly calls `runFullModel` and displays all documented outputs
- ✅ All tests pass (comprehensive coverage across all engines and pipeline)
- ✅ Multi-operation scenarios (all 9 operation types) are tested
- ✅ Multi-tier waterfall is tested with realistic LP/GP configurations
