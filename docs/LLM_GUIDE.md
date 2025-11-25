# LLM.guide.md — How to Work on This Repo as an AI Assistant

Welcome, AI assistant 👋  
This guide explains **how you should behave** when editing this repository, which hosts the *Hospitality Financial Modeling Engine* (HFM): a TypeScript/React application for modeling hospitality real estate projects.

Your goal is to help bring this project to a **v1.0 Gold Master (Hardening / Maintenance Mode)**:
- Preserve and improve **financial correctness**.
- Strengthen **tests, docs, and health checks**.
- Avoid unnecessary complexity or speculative features.

---

## 1. Always Read These First

Before any non-trivial change, you MUST:

1. Read `docs/ARCHITECTURE.md`
   - Understand the financial model, pipeline, and key KPIs.
   - Respect the definitions, naming and sign conventions described there.

2. Read `docs/AGENTS.md`
   - Identify which agent you are acting as (Planner, Core Logic, Quant, UI, QA, etc.).
   - Follow the responsibilities and constraints for that agent.

3. Skim this `LLM.guide.md`
   - Refresh the global rules and workflow.

If you are missing context or something seems inconsistent, **ask for clarification** instead of guessing.

---

## 2. Repository Overview (Mental Map)

At a high level, the codebase is structured like this:

- `src/domain/**`
  - Pure financial and mathematical logic.
  - Types, validation, statistics, and domain-specific functions.
- `src/engines/**`
  - Orchestration of domain logic:
    - operations,
    - scenario,
    - project,
    - capital,
    - waterfall,
    - simulation and analytics.
- `src/components/**`
  - React components for views and UI flows.
  - Inputs for configs, dashboards, charts, and tables.
- `src/hooks/**`
  - React hooks to fetch, compute, and bind data to components.
- `src/tests/**`
  - Unit and integration tests for domain, engines, and views.
- `scripts/generate-health.js`
  - Script that runs tests and outputs a health summary to `public/health.json`.
- `docs/**`
  - Architecture and coordination documents, including this guide.

You MUST respect the following separation:

- **Domain & engines**: pure, side-effect free, deterministic.
- **UI & hooks**: user interactions, browser concerns, local state, presentation.

---

## 3. Golden Rules for Any Change

1. **Do Not Invent Financial Logic**
   - Financial formulas (NPV, IRR, debt schedule, waterfall, KPIs like ADR/RevPAR, etc.) must match:
     - `docs/ARCHITECTURE.md`, or
     - Already existing domain code.
   - If the requirements are unclear, do not guess — ask for clarification or propose options.

2. **Pure Domain, Side-Effects in UI Only**
   - No DOM, browser APIs, or global state inside `src/domain/**` or `src/engines/**`.
   - Keep domain functions pure: same inputs → same outputs.

3. **Tests First for Bugs**
   - When addressing a bug:
     - Add or modify a test that reproduces the issue and fails.
     - Only then update the implementation to make the test pass.
   - Never mark tests as “skipped” to avoid dealing with them, unless explicitly instructed.

4. **Run Tests and Health Before Finishing**
   - After non-trivial changes:
     - Run: `npm test`.
     - Run: `node scripts/generate-health.js`.
   - Check `public/health.json` to verify the repo is still in a good state.

5. **Small, Focused Changes**
   - Prefer many small, atomic changes over large, mixed refactors.
   - Each change should:
     - be easy to review,
     - have clear tests,
     - be described in a short summary (commit or PR message).

---

## 3.5 Testing / Health checklist

- ✅ Run `npm test -- --run` to execute all Vitest suites, including validation and pipeline guards.
- ✅ Run `node scripts/generate-health.js` to refresh `public/health.json`; the script now fails fast if tests fail and records the Vitest command under `checks`.
- 📝 Inspect the generated `public/health.json` and attach it (or its summary) to build artifacts when relevant.

---

## 4. Typical Workflows

### 4.1 Fixing a Bug in Domain/Engines

1. Identify the failing behavior (often reported via a scenario or view).
2. Locate the relevant test file in `src/tests/domain/**` or `src/tests/engines/**`.
3. Add a **new test case** that reproduces the bug (should fail initially).
4. Open the relevant implementation file (e.g. `src/domain/financial.ts` or a specific engine).
5. Modify as little code as possible to make the new test pass.
6. Run all tests and the health script.
7. If the bug reveals a missing invariant or unclear formula, update `docs/ARCHITECTURE.md`.

### 4.2 Adjusting UI / UX

1. Identify which view/component is responsible (e.g. `CapitalView`, `OperationsView`, etc.).
2. Ensure the view **does not re-implement domain formulas**:
   - It should rely on data computed by engines and passed via props/hooks.
3. Make layout and UX improvements:
   - clearer labels, tooltips and help text,
   - responsive layout,
   - better empty/loading/error states.
4. If a view reveals a missing KPI or value from the engines:
   - modify the relevant engine to expose data (without UI logic),
   - update types and tests accordingly.
5. Manually “play” with the app (if possible) to ensure the flow feels coherent.

### 4.3 Adding a New Derived Metric or KPI

1. Check `docs/ARCHITECTURE.md` to see if the metric:
   - already exists conceptually, or
   - requires a new definition.
2. Implement the calculation in `src/domain/financial.ts` or the appropriate engine module.
3. Add tests that:
   - verify the formula against known examples,
   - keep values within reasonable ranges.
4. Expose the metric through the pipeline to the UI.
5. Update docs to define and explain the metric.

---

## 5. v1.0 Hardening Guidelines

During the v1.0 Gold Master hardening phase:

- **Prioritize:**
  - fixing incorrect or unstable calculations,
  - clarifying or tightening invariants,
  - improving error handling and UX feedback,
  - strengthening tests and health reporting.

- **De-prioritize:**
  - new operation types,
  - completely new views or features,
  - experimental refactors that don’t clearly improve robustness.

Before declaring a task “done” in this phase, ask yourself:

> “Did I leave the code, tests, and docs in a better state,  
>  such that the *next* change will be easier and safer?”

If the answer is “no”, improve it a bit more.

---

## 6. Do / Don’t Cheat Sheet

**DO:**
- Keep domain logic pure and well-typed.
- Write descriptive test names and messages.
- Use existing types and helper functions; extend them if needed.
- Update docs when behavior changes or when ambiguity is removed.
- Keep changes scoped and incremental.

**DON’T:**
- Push breaking changes without tests.
- Duplicate formulas across files.
- Introduce UI-specific concerns into domain/engine modules.
- Silence errors without understanding root causes.
- Modify `public/health.json` manually (let the script generate it).

---

## 7. When You Are Confused

If you are unsure about something:

1. Re-read:
   - `docs/ARCHITECTURE.md`
   - `docs/AGENTS.md`
   - This `LLM.guide.md`.

2. If still unclear:
   - Explicitly state the ambiguity.
   - Propose 1–2 options and their tradeoffs.
   - Ask the human maintainer to choose or clarify.

Working carefully and transparently is more important than making big changes quickly.  
Your main job is to keep this financial modeling engine **correct, reliable, and pleasant to use.**
