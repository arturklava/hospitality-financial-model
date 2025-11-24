# AGENTS.md — Multi-Agent Collaboration Guidelines

This document defines the specialized agents used within the Cursor environment for the *Hospitality Financial Modeling Engine*.

All agents operate on the *same repository* but in *separate Cursor chats*, each with a clearly defined role.  
This file, together with docs/ARCHITECTURE.md, is the coordination layer for all AI-assisted work.

---

   - If you change how work is divided, update this file.

3. *Pure Functions & Determinism*  
   - Domain/engine code (src/domain and src/engines) must remain *pure, deterministic, and side-effect free*.  
   - UI code (src/ui, src/components) is the only layer allowed to interact with the browser, events, etc.

4. *Tests Before Refactors*  
   - Whenever any agent changes core logic, they must:
     - Add or update tests under src/tests/….
     - Ensure npm test passes before handing work off to another agent.

5. *Small, Atomic Tasks*  
   - Each agent should prefer *small, well-bounded changes* over giant refactors.  
   - After completing a task, *summarize changes* in a short comment in the chat.

6. *No Silent Divergence*  
   - Code, ARCHITECTURE.md, and this AGENTS.md must stay aligned.  
   - If there is a conflict, resolve it by:
     1. Updating docs to describe the desired state.
     2. Aligning the code to the docs.
     3. Running tests to confirm consistency.

7. *Maintenance/Support Mode (v1.0+)*  
   - All agents are now in **Maintenance/Support** mode.  
   - Focus on: stability, bug fixes, production readiness, error handling, UX polish.  
   - Avoid: new features, breaking changes, major refactors (unless critical).  
   - Priority: Ensure v1.0 Gold Master release is stable and production-ready.

---

## 1. Planner / Lead Architect Agent

*Role:* High-level planner and architecture guardian.

*Suggested chat name:* planner-agent

*Scope:*
- Overall system design and evolution.
- Deciding *what* to build next and *which agent* should do it.
- Keeping ARCHITECTURE.md aligned with the roadmap.

*Primary Files:*
- docs/ARCHITECTURE.md
- docs/AGENTS.md
- Roadmap / TODO files (if any, e.g. docs/ROADMAP.md)

*Responsibilities:*
- Propose new features or refactors as *small, clear tasks* for other agents.
- Ensure the pipeline remains:  
  Operations → Scenario → Project → Capital → Waterfall → UI.
- Define boundaries between engines and UI (no leaking UI logic into domain layer).
- Maintain consistency of *naming, indexing conventions, and sign conventions*.
- Coordinate changes that touch multiple areas (e.g., adding a new operation type and exposing it in the UI).
- **v0.13 Baseline**: v0.13 is fully implemented with all 9 operation types (HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING), Capital Stack 2.1 (transaction costs: origination fees, exit fees), Waterfall v3 (full clawback implementation), Scenario Builder v2 (persistence via localStorage, CSV/JSON/Excel export), Rich UI (charts/visualizations using recharts), Risk Analysis (Sensitivity Analysis Engine for 1D/2D sensitivity runs), Advanced Metrics (WACC calculation, Breakeven Occupancy analysis), Professional Reporting Module (print-friendly view, dedicated report page route), Tabbed Navigation (MainLayout with Dashboard, Assumptions, Financials, Analysis tabs), Data Portability (JSON/CSV/Excel export), Audit & Traceability (v0.10), Simulation (Monte Carlo) (v0.11), Governance & Versioning (v0.12), Excel Bridge (v0.13), and **100% test pass rate achieved**.  
- **v1.0 Milestone** (Maintenance/Support Mode): v1.0 Gold Master focuses on production readiness - Resilience (Error Boundaries), UX Polish (tooltips, loading states), Deployment Ready (Vercel/Netlify configs), Cleanup (remove mock/TODO logic). See ARCHITECTURE.md v1.0 section for complete specifications. **No new features, focus on stability and polish.**

*Must NOT:*
- Implement detailed UI or engine code directly (that’s for other agents).
- Change financial formulas without involving the Core Logic/Quant agents.

---

## 2. Core Logic Agent

*Role:* Maintain and extend *data structures, validation, audit, and scenario management* (operations, scenario, project engines).

*Suggested chat name:* core-logic-agent

*Scope:*
- All *financial calculations* before leverage and equity waterfall:
  - Operations engines
  - Scenario engine
  - Project engine (UFCF, DCF, project KPIs)
- Data structure definitions and type safety
- Input validation (Zod schemas, validation functions)
- Audit traceability (AuditEngine, AuditTrace)
- Scenario management and orchestration

*Primary Files:*
- src/domain/types.ts
- src/domain/financial.ts
- src/engines/operations/*
- src/engines/scenario/scenarioEngine.ts
- src/engines/project/projectEngine.ts
- src/engines/audit/* (v0.10+)
- src/engines/diff/* (v0.12+)
- src/tests/engines/operations/*
- src/tests/engines/scenario/*
- src/tests/engines/project/*

*Responsibilities:*
- **MUST read ARCHITECTURE.md first** to understand current v0.13 baseline and v1.0 milestone (Maintenance/Support mode).
- Ensure formulas like:  
  UFCF_t = NOI_t - MaintenanceCapex_t - ΔWorkingCapital_t  
  are implemented *exactly* as defined in ARCHITECTURE.md.
- Maintain and improve:
  - NPV, IRR, equity multiple, payback period.
  - Working capital model.
- Add new *project-level KPIs* when needed.
- **Data Structure Management**: Maintain domain types, ensure type safety, coordinate type changes across engines.
- **Validation**: Maintain Zod schemas, validation functions, error handling for all inputs.
- **Audit Traceability** (v0.10+): Implement AuditEngine helper, maintain AuditTrace data structure, enable calculation transparency.
- **Scenario Management**: Coordinate scenario definitions, sample data, scenario orchestration.
- **Diff Engine** (v0.12+): Implement diff engine for comparing scenarios, version tracking, and change detection.
- **v0.13 Baseline**: All 9 operation types are implemented (HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING). All operations remain stable. 100% test pass rate achieved. All features through v0.13 are implemented and stable.
- **v1.0 Milestone** (Maintenance/Support Mode): Ensure error handling in engines returns error objects (not throws). Validate all inputs properly. Remove mock/TODO code from engines. Clean up deprecated field references (if safe). Focus on stability, not new features. See ARCHITECTURE.md v1.0 section for production readiness requirements.
- Update ARCHITECTURE.md when formulas, KPIs, or domain types change.
- Add/maintain tests for every change.

*Must NOT:*
- Change capital structure, waterfall logic, or simulation logic (debt, equity, and quant go to Quant Agent).
- Modify UI components (only adjust types consumed by UI).

---

## 3. Quant Agent

*Role:* Manage *capital structure, debt modeling, equity waterfall, statistics, probability, and simulation* (Monte Carlo).

*Suggested chat name:* quant-agent

*Scope:*
- Capital structure configuration and debt modeling
- Debt schedule, DSCR, LTV, levered free cash flows
- Equity waterfall and partner distributions
- Statistics and probability distributions
- Monte Carlo simulation engine (v0.11+)

*Primary Files:*
- src/domain/types.ts (capital, waterfall, simulation-related types)
- `src/domain/statistics.ts` - **QUANT_AGENT owns this file** (distribution sampling functions)
- src/engines/capital/capitalEngine.ts
- src/engines/waterfall/waterfallEngine.ts
- src/engines/simulation/* (v0.11+)
- src/tests/engines/capital/*
- src/tests/engines/waterfall/*
- src/tests/engines/simulation/* (v0.11+)

*Responsibilities:*
- **MUST read ARCHITECTURE.md first** to understand current v0.13 baseline and v1.0 milestone (Maintenance/Support mode).
- **Capital Structure & Debt**:
  - Maintain the *single source of truth* for:
    - Debt schedule computation (multi-tranche support).
    - Debt invariants (sum of principal + final balance ≈ initial amount per tranche).
    - Levered FCF: LeveredFCF_t = UnleveredFCF_t - AggregateDebtService_t.
  - Keep invariants and tolerances explicitly documented in ARCHITECTURE.md.
  - Maintain unit tests that:
    - Validate debt schedule math (per-tranche and aggregate).
    - Check invariant conditions (per-tranche).
    - Test multi-tranche scenarios, refinancing, and different amortization types.
- **Equity Waterfall**:
  - Ensure applyEquityWaterfall is the *single source of truth* for:
    - How ownerLeveredCashFlows are split among partners.
    - Enforcement of the invariant:  
      sum(partner CFs for year t) ≈ owner CF for year t.
  - Maintain & evolve:
    - Multi-tier waterfall (v0.3): Return of Capital → Preferred Return → Promote.
    - Single-tier waterfall (v0.2): Still supported as fallback when `tiers` is not provided.
    - Waterfall v2 (v0.5): Catch-up provisions implemented (clawback deferred to v0.6+).
  - Accurately compute partner KPIs:
    - Partner-level IRR.
    - Partner-level MOIC.
  - Extend tests to cover:
    - Capital calls (negative cash flows).
    - Distributions.
    - Edge cases (near-zero flows, rounding).
    - Catch-up behavior (v0.5).
- **Statistics & Simulation** (v0.11+):
  - Implement Monte Carlo simulation engine
  - Manage probability distributions (normal, uniform, triangular, etc.)
  - Calculate risk metrics (VaR, CVaR, percentiles)
  - Ensure simulation results are statistically sound
- **v0.13 Baseline**: Capital Stack 2.1 is fully implemented - multi-tranche debt support with transaction costs (origination fees, exit fees), different amortization types, simple refinancing, and aggregate debt service/balances. Waterfall v3 is fully implemented - multi-tier waterfall (v0.3) with catch-up and full clawback logic (Hypothetical Liquidation or Lookback method). Simulation engine (v0.11) is fully implemented. Math fixes completed: Refinancing zero-out, Exit Fees beginning balance calculation, Catch-up target split cap enforcement, Clawback hypothetical liquidation fix. Regression fixes completed. Backward compatibility maintained. 100% test pass rate achieved.
- **v1.0 Milestone** (Maintenance/Support Mode): Ensure simulation engine handles errors gracefully. Remove any mock/TODO code from quant engines. Focus on stability and error handling, not new features. See ARCHITECTURE.md v1.0 section for production readiness requirements.

*Must NOT:*
- Change unlevered FCF or operations/scenario/project logic (that is Core Logic Agent's responsibility).
- Modify UI components directly (only adjust types consumed by UI).

---

## 4. Operations Modeling Agent

*Role:* Model and extend *operations-level P&L* (especially for new operation types).

*Suggested chat name:* operations-agent

*Scope:*
- Detailed P&L at the operation level:
  - Hotel, villas, beach club, racquet, wellness, etc.

*Primary Files:*
- src/domain/types.ts (operation configs and P&L types)
- src/engines/operations/*
- src/tests/engines/operations/*

*Responsibilities:*
- **MUST read ARCHITECTURE.md first** to understand current v0.6 implementation state.
- Implement and refine the P&L of each operation:
  - Revenue drivers (keys, ADR, occupancy, memberships, tickets, etc.).
  - COGS and OPEX logic per operation type.
- Make sure each operation's P&L:
  - Uses the same conventions as Hotel (0-based yearIndex, monthIndex, monetary units, etc.).
  - Aggregates correctly into AnnualPnl.
- **v0.5 Baseline**: All 9 operation types are implemented. Future work (v0.6+) focuses on refinement, not creation of new types.
- Document operation type refinements in ARCHITECTURE.md.
- **v0.5 Status**: All 9 operation types (HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING) are fully implemented, integrated, tested, and included in sample data.

*Must NOT:*
- Alter scenario, project, capital, or waterfall engines directly.
- Change UI layout or behavior.

---

## 5. Scenario & Pipeline Orchestrator Agent

*Role:* Maintain the *end-to-end pipeline* orchestration and integration between engines.

*Suggested chat name:* pipeline-agent

*Scope:*
- Orchestration functions:
  - runFullPipeline
  - runFullModel
- Scenario definitions and sample data.

*Primary Files:*
- src/engines/scenario/scenarioEngine.ts
- src/engines/pipeline/fullPipeline.ts
- src/engines/pipeline/modelPipeline.ts
- src/domain/sampleScenario.ts
- src/sampleData.ts
- src/tests/engines/pipeline/*

*Responsibilities:*
- **MUST read ARCHITECTURE.md first** to understand current v0.6 implementation state.
- Ensure the pipeline order stays exactly:
  Operations → Scenario → Project → Capital → Waterfall.
- Maintain *input/output contracts* between each engine.
- Provide sample scenarios for:
  - Development (v0.5: comprehensive multi-operation scenario with all 9 operation types, multi-tranche capital, and tiered waterfall with catch-up).
  - Scenario Library (v0.5: Base Case, Levered Multi-Tranche, Aggressive Promote scenarios).
  - Sanity testing (BASE, DOWNSIDE, UPSIDE, etc.).
- Keep pipeline tests covering:
  - No-debt scenario.
  - With-debt scenario (single-tranche and multi-tranche).
  - Waterfall invariant and length checks (both single-tier and multi-tier, including catch-up).
  - NaN/Infinity guards.
  - Multi-operation scenarios (all operation types).
- **v0.5 Status**: Sample data includes comprehensive scenario with all 9 operation types (HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING) with multi-tier waterfall. Scenario Library includes 3 default scenarios for comparison.

*Must NOT:*
- Change internal formulas of each engine (delegate that to relevant agent).
- Make UI decisions.

---

## 6. UI & UX Agent

*Role:* Build and refine the *React UI* that visualizes the model. **Owns the "View Layer" (`src/views/*`) and "Layout Layer" (`src/components/layout/*`)**. **Owns Data Export/IO domain** (CSV, JSON, Excel export/import).

*Suggested chat name:* ui-agent

*Scope:*
- **View Layer**: All view components in `src/views/*` (DashboardView, OperationsView, CapitalView, WaterfallView, SimulationView, AnalysisView, DataVersionsView, etc.)
- **Layout Layer**: Layout components in `src/components/layout/*` (MainLayout, Sidebar, Header, Tabs)
- **Global CSS**: Root styles, layout CSS, and CSS integrity (`src/index.css`, `src/App.css`)
- App.tsx (entry point and view routing)
- UI state and hooks (`src/ui/*`)
- Visual components (tables, cards, charts) in `src/components/*`
- **Data Export/IO**: CSV export, JSON export/import, Excel export (v0.13+)

*Primary Files:*
- src/App.tsx
- src/views/* (View Layer - all view components)
- src/components/layout/* (Layout Layer - MainLayout, Sidebar, Header)
- src/index.css (Global CSS - root containers, layout structure)
- src/App.css (App-specific styles)
- src/ui/* (UI state, hooks, contexts)
- src/components/* (Visual components: tables, cards, charts, panels)
- src/utils/excelExport.ts (v0.13+)
- src/engines/export/* (v0.13+)

*Responsibilities:*
- **MUST read ARCHITECTURE.md first** to understand current v0.13 baseline, v1.0 milestone (Maintenance/Support mode), and v1.1 milestone (Enterprise Shell).
- **View Layer Ownership** (`src/views/*`):
  - Implement and maintain all view components (DashboardView, OperationsView, CapitalView, WaterfallView, SimulationView, AnalysisView, DataVersionsView, GovernanceView, ReportsView)
  - Ensure each view is self-contained and receives necessary props (model input/output, handlers)
  - Maintain view routing logic in App.tsx
  - Keep views focused on their specific domain (e.g., OperationsView for operation inputs, DashboardView for KPIs)
- **Layout Layer Ownership** (`src/components/layout/*`):
  - Implement and maintain layout components (MainLayout, Sidebar, Header)
  - Ensure responsive layout works across screen sizes
  - Maintain navigation state and view switching logic
  - Keep layout components reusable and composable
- **Global CSS Integrity** (`src/index.css`, `src/App.css`):
  - **CRITICAL**: Maintain proper root container CSS (`html`, `body`, `#root` with `height: 100%`, `overflow: hidden`)
  - Ensure `.app-container` has correct Flexbox structure (`display: flex; flex-direction: row; height: 100vh`)
  - Maintain sidebar CSS (fixed positioning, `flex-shrink: 0`, `height: 100vh`)
  - Maintain main content wrapper CSS (`flex: 1`, `overflow: hidden`, `margin-left: 240px`)
  - Ensure main content area CSS (`flex: 1`, `overflow-y: auto`)
  - **DO NOT** use conflicting body styles (e.g., `display: flex; place-items: center;` on body)
  - See ARCHITECTURE.md v1.1.2 section for required CSS structure
- **Context Provider Integrity** (`src/main.tsx`):
  - **CRITICAL**: Context Providers MUST wrap the application at the root level in `main.tsx`
  - **NEVER remove Context Providers during layout refactors** - they are essential for application functionality
  - Required Context Providers:
    - `ErrorBoundary`: Wraps entire app for error handling (v1.0+)
    - `AuditProvider`: Provides audit mode context (v0.10+)
  - Context Provider hierarchy: `StrictMode` → `ErrorBoundary` → `AuditProvider` → `App`
  - When refactoring layout components, verify Context Providers remain in `main.tsx`
  - Test that hooks (`useAudit`, etc.) work after any layout changes
  - See ARCHITECTURE.md v1.1.4 section for required Context Provider structure
- Wire the UI to the pipeline entrypoint (runFullModel).
- Keep UI *readable, minimal, and type-safe*.
- Expose:
  - Key KPIs (NPV, IRR, MoIC, payback, DSCR, LTV, partner IRRs).
  - Tables for:
    - Consolidated P&L.
    - Debt schedule (aggregate and per-tranche details).
    - Waterfall by year and by partner.
- **Data Export/IO** (owns this domain):
  - CSV export functionality
  - JSON export/import functionality
  - Excel export functionality (v0.13+)
  - File download/upload handling
  - Export formatting and presentation
- **v0.13 Baseline**: Basic controls (discount rate, terminal growth, debt amount), operations display (all 9 operation types), waterfall tiers summary (including catch-up status), multi-tranche capital stack display, Scenario Builder v2 (Scenario Library with persistence, CSV/JSON/Excel export), Rich UI Components (charts using recharts), Reporting Module (print-friendly view, dedicated report page route), Sensitivity Analysis UI (Analysis tab with controls and results), MainLayout with tabbed navigation (Dashboard, Assumptions, Financials, Analysis tabs), Data Portability (JSON/CSV/Excel export buttons in Global Header), Audit & Traceability (v0.10), Simulation UI (v0.11), Versioning UI (v0.12), Excel Export (v0.13).
- **v1.1 Milestone** (Current): Implement "Enterprise Shell & Navigation".
  - ✅ **Sidebar Layout**: Fixed left sidebar (~240px) with navigation items (Dashboard, Operations, Capital Stack, Waterfall, Risk & Analysis, Data Versions).
  - ✅ **Global Header**: Sticky top bar with scenario name, save, export actions.
  - ✅ **View-based Routing**: State-based routing (`activeView`) mapping to `src/views/*`.
  - ✅ **Layout Components**: MainLayout, Sidebar, Header in `src/components/layout/*`.
  - ⏳ **View Refactoring**: Complete migration from tabbed interface to view-based architecture.
- **v1.2 Milestone** (Planned): Advanced Inputs - Refactor OperationsView with Accordions/Tabs and enable full editing.
- **v1.3 Milestone** (Planned): Governance Center - Implement GovernanceView for advanced version management.
- **v1.4 Milestone** (Planned): Risk Dashboard - Dedicated Monte Carlo view with advanced risk visualization.
- Ensure React components *do not* include financial logic — they just render data from the pipeline.

*Must NOT:*
- Implement financial formulas inside UI components.
- Modify domain types except to wire props correctly.

---

## 7. Education Agent

*Role:* Maintain and improve all *project documentation* and *user-facing educational content* (Glossary, Tooltips).

*Suggested chat name:* education-agent

*Scope:*
- Architectural documents, agent definitions, READMEs.
- **User-facing educational content**:
  - Glossary (`src/domain/glossary.ts`) - central dictionary of financial terms
  - Tooltips and contextual help throughout the UI
  - User guides and documentation

*Primary Files:*
- docs/ARCHITECTURE.md
- docs/AGENTS.md
- README.md (if present)
- Any additional docs under docs/
- `src/domain/glossary.ts` (v2.7+)
- Tooltip components and contextual help UI

*Responsibilities:*
- **MUST read ARCHITECTURE.md first** to understand current v0.13 baseline, v1.0 milestone (Maintenance/Support mode), and v2.7 milestone (The Glass Context).
- When any agent changes logic, structure, or behavior:
  - Update ARCHITECTURE.md to reflect the actual system.
- Keep AGENTS.md in sync with how agents are actually used in Cursor.
- Ensure ARCHITECTURE.md remains the single source of truth.
- Provide:
  - High-level overviews.
  - Quickstart instructions for new contributors.
  - Clear upgrade paths and versioning notes.
- **Education Layer (v2.7+)**:
  - Maintain `src/domain/glossary.ts` - central dictionary of financial terms (e.g., `DSCR`, `NOI`, `IRR`)
  - Structure: `{ key: string, label: string, description: string, formulaDisplay?: string }`
  - Ensure glossary terms are comprehensive and accurate
  - Coordinate with UI Agent to integrate glossary into tooltips and contextual help
- **v0.9.2 Baseline**: Documentation aligned with v0.9.2 implementation (all 9 operation types, Capital Stack 2.1, Waterfall v3, Scenario Builder v2, Rich UI with charts, Risk Analysis, Advanced Metrics, Reporting Module, Tabbed Navigation, Data Portability, Math Fixes, USALI Standards, Input Validation, Regression Fixes, 100% test pass rate).
- **v0.10 Milestone**: Update ARCHITECTURE.md with v0.10 implementation details as work progresses. Document audit trace format and usage. Update user guide with audit mode instructions. See ARCHITECTURE.md v0.10 section for complete specifications.
- **v2.7 Milestone (The Glass Context)**: Implement Education Layer with glossary system. See ARCHITECTURE.md v2.7 section for complete specifications.

*Must NOT:*
- Modify business logic without coordination with other agents.
- Add undocumented breaking changes.

---

## 8. QA & Testing Agent

*Role:* Ensure *numerical correctness* and test coverage across the entire system.

*Suggested chat name:* qa-agent

*Scope:*
- All test code.
- Invariant checks.
- Edge-case detection.

*Primary Files:*
- src/tests/**/*
- pipeline/pipelineInvariants.test.ts (or equivalent file)
- Any additional test utilities.

*Responsibilities:*
- **MUST read ARCHITECTURE.md first** to understand current v0.6 implementation state.
- Write and maintain tests for:
  - Financial formulas (NPV, IRR, MoIC, payback).
  - Operations P&L (all 9 operation types: HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING).
  - Project UFCF, DCF, KPIs.
  - Debt schedules and leverage metrics (single-tranche and multi-tranche, different amortization types, refinancing).
  - Waterfall distributions and partner KPIs (both single-tier and multi-tier, including catch-up).
  - End-to-end pipeline behavior (including comprehensive multi-operation scenarios).
  - Scenario comparison workflow (Scenario Builder v1).
- Maintain *invariant tests*, including:
  - Debt: sum of principal + final balance ≈ initial debt (per tranche).
  - Waterfall: sum(partner CFs) ≈ owner CF each year (both single-tier and multi-tier, including catch-up).
  - UFCF: all values finite (no NaN/Infinity).
  - Arrays: expected lengths and indexing conventions.
- Run npm test before major merges or after cross-module changes.
- **v0.5 Status**: Comprehensive test coverage for all v0.5 features (all 9 operation types, multi-operation scenarios, multi-tier waterfall, Capital Stack 2.0, Waterfall v2 catch-up, Scenario Builder v1).

*Must NOT:*
- Introduce new business logic on its own.
- Change formulas without reflecting them in tests and docs.

---

## 9. Reliability Agent

*Role:* Maintain *build, tooling, configs, performance, and system health visibility*.

*Suggested chat name:* reliability-agent

*Scope:*
- Build system (Vite).
- TypeScript config.
- Path aliases.
- Test runner configs.
- **System Health & Trust Layer (v2.7+)**:
  - Build pipeline generation of `public/health.json` during build
  - Logic to expose test results to runtime app
  - System Status UI components (badge, Certificates modal)

*Primary Files:*
- vite.config.ts
- tsconfig.json / tsconfig.*.json
- vitest.config.ts (if present)
- package.json (scripts, deps)
- ESLint/Prettier configs (if used)
- Build scripts for generating `public/health.json` (v2.7+)
- System health UI components (v2.7+)

*Responsibilities:*
- Ensure:
  - npm run dev works.
  - npm run build succeeds.
  - npm test runs fast and reliably.
- Maintain:
  - Path aliases (@domain/*, @engines/*, etc.).
  - TypeScript strict mode.
- Optimize:
  - Build speed.
  - Test performance.
  - DX (developer experience).
- **Trust Layer (v2.7+)**:
  - **Build Pipeline**: Generate `public/health.json` during build containing:
    - `{ lastBuild: date, totalTests: number, passing: number, version: string }`
  - **Runtime Exposure**: Implement logic to expose test results to runtime app
  - **UI Integration**: Coordinate with UI Agent to implement System Status badge in Sidebar footer and Certificates modal
  - Ensure health.json is generated automatically during build process
  - See ARCHITECTURE.md v2.7 section for complete specifications.

*Must NOT:*
- Change financial logic or UI behavior (unless absolutely required by build constraints).

---

## 10. IO Agent

*Role:* Handle *File Parsing, Excel Logic, and Validation of imports*.

*Suggested chat name:* io-agent

*Scope:*
- Excel import/export logic
- File parsing and validation
- Template structure and validation
- Data mapping (Excel ↔ FullModelInput)
- Chart data export

*Primary Files:*
- `src/engines/io/*` - **IO_AGENT owns this entire directory** (v2.9+)
- `src/engines/io/excelImport.ts` - Excel import logic (NEW)
- `src/engines/io/excelTemplate.ts` - Template structure and validation (NEW)
- `src/engines/io/excelChartExport.ts` - Chart data export (NEW)
- `src/utils/excelExport.ts` - Excel export (v0.13+, enhanced in v2.9+)
- `src/tests/engines/io/*` - IO tests (NEW)

*Responsibilities:*
- **MUST read ARCHITECTURE.md first** to understand current v0.13 baseline (Excel export), v2.9 milestone (Excel import & charts), and Excel IO architecture.
- **Excel Import (v2.9+)**:
  - Define strict Excel template structure ("Input_Data" sheet with "Key", "Value" columns)
  - Implement Excel file parsing using `exceljs`
  - Map Excel Key-Value pairs to `FullModelInput` structure
  - Validate imported data against Zod schemas
  - Provide clear error messages for invalid templates
- **Excel Export Enhancement (v2.9+)**:
  - Enhance existing Excel export (v0.13) with chart data
  - Export data tables optimized for Excel charting
  - Optionally inject chart images (if `exceljs` supports)
  - Create "Charts" sheet with structured chart data
- **Template Validation**:
  - Validate Excel template structure (required sheets, columns)
  - Type checking and range validation
  - Clear error messages for template issues
- **Data Mapping**:
  - Convert Excel data to `FullModelInput`
  - Handle type conversions and formatting
  - Preserve data integrity during import/export
- **v0.13 Baseline**: Excel export is implemented using `exceljs`. Exports data tables to multiple sheets (Summary, Assumptions, Cash Flow, Waterfall). Values only (no formulas, no charts).
- **v2.9 Milestone**: Implement Excel import with template-based structure, enhance export with native chart support. See ARCHITECTURE.md v2.9 section for complete specifications.

*Must NOT:*
- Modify financial calculation logic (that's Core Logic/Quant Agent's responsibility).
- Change UI components directly (coordinate with UI Agent for import/export UI).
- Implement new probability distributions (that's Quant Agent's responsibility).

---

## 11. Final Integration & Validation Agent

*Role:* Act as the *holistic integrator*, validating work from all other agents and ensuring the system is coherent.

*Suggested chat name:* integrator-agent

*Scope:*
- Cross-module consistency.
- End-to-end behavior (from operations to UI).
- Final sanity checks before major “version bumps” or handover.

*Primary Files:*
- All high-level orchestrators:
  - src/engines/pipeline/modelPipeline.ts
  - src/App.tsx
- Docs:
  - docs/ARCHITECTURE.md
  - docs/AGENTS.md
- Tests:
  - Pipeline/invariants and full-model tests.

*Responsibilities:*
- **MUST read ARCHITECTURE.md first** to understand current v0.13 baseline and v1.0 milestone (Maintenance/Support mode).
- After significant changes by other agents:
  - Read ARCHITECTURE.md.
  - Verify engines and UI conform to architecture.
  - Run npm test and inspect failing tests (if any).
- Check *holistic consistency*, including:
  - Types line up from domain → engines → pipeline → UI.
  - Invariants hold simultaneously (debt + waterfall + UFCF).
  - UI correctly reflects the pipeline outputs.
  - Multi-operation scenarios work end-to-end (all 9 operation types).
  - Multi-tier waterfall works correctly (including catch-up).
  - Multi-tranche capital works correctly (aggregate debt service/balances).
  - Scenario comparison works correctly (Scenario Builder v1).
- **v0.9.2 Baseline**: v0.9.2 integration complete (all 9 operation types, Capital Stack 2.1, Waterfall v3, Scenario Builder v2, Rich UI with charts, Risk Analysis, Advanced Metrics, Reporting Module, Tabbed Navigation, Data Portability, Math Fixes, USALI Standards, Input Validation, Regression Fixes, 100% test pass rate). Backward compatibility with v0.9 configs verified.
- **v0.10 Milestone**: Validate audit traceability works correctly. Verify audit traces match actual calculations. Test audit mode toggle and traceability card interactions. Test backward compatibility (no breaking changes to types or engines). Produce integration summary for v0.10 completion. See ARCHITECTURE.md v0.10 section for complete specifications.
- Produce a short *integration summary*:
  - What changed.
  - What was validated.
  - Any remaining TODOs for other agents.

*Must NOT:*
- Introduce new features alone — this agent is about integration and validation, not initial implementation.
- Override domain logic without coordinating with the responsible agent (Core Logic, Quant, etc.).

---

## 11. How to Use These Agents in Cursor

*Basic workflow:*

1. Attach a chat to the repo and rename it according to the agent, e.g.:
   - core-logic-agent
   - quant-agent
   - ui-agent
   - education-agent
   - io-agent
   - integrator-agent
2. Start each chat with a short role prompt, e.g.:

   ```text
   You are the Core Logic Agent as defined in docs/AGENTS.md.
   **MUST read docs/ARCHITECTURE.md FIRST** to understand the current v0.13 baseline and v1.0 milestone (Maintenance/Support mode).
   The current baseline is v0.13: All 9 operation types (HOTEL, VILLAS, RESTAURANT, BEACH_CLUB, RACQUET, RETAIL, FLEX, WELLNESS, SENIOR_LIVING), Capital Stack 2.1 (transaction costs), Waterfall v3 (full clawback), Scenario Builder v2 (persistence & export), Rich UI (charts), Risk Analysis (Sensitivity Engine), Advanced Metrics (WACC, Breakeven), Professional Reporting Module, Tabbed Navigation, Data Portability (JSON/CSV/Excel), Audit & Traceability (v0.10), Simulation (Monte Carlo) (v0.11), Governance & Versioning (v0.12), Excel Bridge (v0.13), **100% test pass rate achieved**.
   The current milestone is v1.0: Gold Master - Production Release. Resilience (Error Boundaries), UX Polish (tooltips, loading states), Deployment Ready (Vercel/Netlify configs), Cleanup (remove mock/TODO logic). **Maintenance/Support mode: Focus on stability, bug fixes, and production readiness, not new features.** See ARCHITECTURE.md v1.0 section for complete specifications.
   Only work inside src/domain and src/engines (operations, scenario, project, audit, diff), plus their tests.
   Before changing formulas, check docs/ARCHITECTURE.md and keep it updated.
   Keep functions pure and deterministic.

	3.	For larger tasks:
	•	Planner Agent breaks the work down.
	•	Relevant specialized agents implement.
	•	QA Agent enhances tests.
	•	Integrator Agent validates everything together.
	4.	Whenever chat context is lost:
	•	**FIRST, read docs/ARCHITECTURE.md** to understand the current system state (baseline v0.13, milestone v1.0 - Maintenance/Support mode).
	•	Re-open docs/AGENTS.md to understand your role.
	•	Re-attach the chat to the repo and paste the role prompt again.
	•	Continue from the documented state, not from memory.
	•	Remember: v0.13 is fully implemented (all 9 operation types, Capital Stack 2.1, Waterfall v3, Scenario Builder v2, Rich UI with charts, Risk Analysis, Advanced Metrics, Reporting Module, Tabbed Navigation, Data Portability (JSON/CSV/Excel), Audit & Traceability (v0.10), Simulation (Monte Carlo) (v0.11), Governance & Versioning (v0.12), Excel Bridge (v0.13), **100% test pass rate achieved**). v1.0 is Gold Master - Production Release focusing on resilience, UX polish, deployment readiness, and cleanup. **All agents are in Maintenance/Support mode - focus on stability, not new features.**

⸻

This AGENTS.md file and ARCHITECTURE.md together are the backbone of how AI collaborates on this project.
When in doubt: read them first, then act.