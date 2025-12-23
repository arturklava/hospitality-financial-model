# LLM.guide.md — How to Work on This Repo (Google Antigravity)

Welcome, AI assistant 👋  
This guide explains **how you should behave** when editing this repository, which hosts the *Hospitality Financial Modeling Engine* (HFM): a TypeScript/React application for modeling hospitality real estate projects.

You are running inside **Google Antigravity**, with access to tools for:

- Searching and navigating the codebase (`find_by_name`, `list_dir`, `codebase_search`, `grep_search`, `view_file_outline`, `view_file`).
- Editing files (`write_to_file`, `multi_replace_file_content` and related edit tools).
- Running commands (`run_command` + `command_status`).
- Interacting with the browser (`browser_subagent`) and generating assets (`generate_image`).

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
   - Identify which agent role you are acting as (Planner, Core Logic, Quant, UI, QA, etc.).
   - Follow the responsibilities and constraints for that agent.

3. Skim this `LLM.guide.md`
   - Refresh the global rules and workflow.

4. Use Antigravity tools to inspect the current code:
   - `list_dir` to see project layout.
   - `find_by_name` or `codebase_search` to locate relevant modules.
   - `view_file_outline` and `view_file` to understand the structure and contents.

If you are missing context or something seems inconsistent, **do not guess**. Ask for clarification and/or propose options with tradeoffs.

---

## 2. Repository Overview (Mental Map)

At a high level, the codebase is structured like this:

- `src/domain/**`
  - Pure financial and mathematical logic.
  - Types (`types.ts`), validation (`validation.ts`), statistics, and domain-specific operations.

- `src/engines/**`
  - Orchestration of domain logic into larger flows:
    - operations,
    - scenario,
    - project,
    - capital,
    - waterfall,
    - simulation and analytics.

- `src/components/**`
  - React components for views and UI flows:
    - dashboards, forms, charts, tables.

- `src/hooks/**`
  - React hooks to fetch, compute, and bind engine data to components.

- `src/tests/**`
  - Unit and integration tests for domain, engines, and views.

- `scripts/generate-health.js`
  - Script that runs tests and outputs a health summary (`public/health.json`).

- `docs/**`
  - Architecture and coordination documents, including:
    - `ARCHITECTURE.md`
    - `AGENTS.md`
    - `LLM.guide.md`

You MUST respect the following separation:

- **Domain & engines**: pure, side-effect free, deterministic.
- **UI & hooks**: user interactions, browser concerns, local state, presentation.

---

## 3. Golden Rules for Any Change

### 3.1 Do Not Invent Financial Logic

- Financial formulas (NPV, IRR, debt schedule, waterfall, ADR/RevPAR, etc.) must match:
  - `docs/ARCHITECTURE.md`, or
  - existing domain code that is already considered correct.

If requirements are unclear:
- State the ambiguity explicitly.
- Propose 1–2 options with pros/cons.
- Wait for the user or Planner to choose.

---

### 3.2 Pure Domain, Side-Effects in UI Only

- No DOM, browser APIs, or global state in `src/domain/**` or `src/engines/**`.
- Domain functions must be pure: same inputs → same outputs.
- Interactions with the browser occur via React components/hooks and, in Antigravity, via `browser_subagent` for automated browser sessions.

---

### 3.3 Tests First for Bugs

When addressing a bug:

1. Use `codebase_search` / `grep_search` to locate existing tests.
2. Add or modify a test in `src/tests/**` that reproduces the issue and fails.
3. Only then update the implementation to make the test pass.

Never:
- Mark tests as skipped only to avoid dealing with failures.
- Remove critical tests without strong justification.

Run tests with `run_command`:
- e.g. `npm test`, or a more specific test command.

---

### 3.4 Run Tests and Health Before Finishing

After non-trivial changes:

1. Use `run_command` to run:
   - `npm test`
   - or the appropriate test commands configured in `package.json`.
2. Use `run_command` to run:
   - `node scripts/generate-health.js`
3. Check `public/health.json` to verify the repo is still in a good state.

If tests or health checks fail:
- Inspect the failure.
- Fix root causes rather than hiding the problem.

---

### 3.5 Small, Focused Changes

- Prefer many small, atomic changes over large, mixed refactors.
- Each change should be:
  - easy to review,
  - covered by tests,
  - summarized clearly in comments or commit messages.

When using edit tools (`multi_replace_file_content`, `write_to_file`):
- Modify only what is necessary.
- Keep diffs minimal and intentional.

---

## 4. Typical Workflows in Antigravity

### 4.1 Fixing a Bug in Domain/Engines

1. **Locate the problem**
   - Use `codebase_search`/`grep_search` to find relevant functions and tests.
   - Use `view_file_outline` and `view_file` to inspect details.

2. **Test first**
   - Add or update tests in `src/tests/domain/**` or `src/tests/engines/**` that reproduce the bug.
   - Ensure they fail initially.

3. **Minimal implementation changes**
   - Edit the relevant files using `multi_replace_file_content` (or similar tools).
   - Keep changes as small and local as possible.

4. **Run tests & health**
   - Run the test suite via `run_command`.
   - Run `node scripts/generate-health.js` via `run_command`.

5. **Update docs (if formulas/invariants changed)**
   - Reflect the final behavior in `docs/ARCHITECTURE.md`.

---

### 4.2 Adjusting UI / UX

1. **Identify the view**
   - Use `find_by_name` / `codebase_search` to locate components and hooks.
   - Use `view_file_outline` to get an overview.

2. **Ensure separation of concerns**
   - Confirm the view receives data from engines/hooks.
   - Remove any duplicated domain formulas from components.

3. **Improve usability**
   - Tidy layout, labels, tooltips, and states (loading / empty / error).
   - Consider how a CFO/FP&A user would navigate.

4. **Test the UI**
   - Add or update component/view tests where applicable.
   - Optionally, use `browser_subagent` to:
     - run end-to-end flows in the browser,
     - record a video of the interaction (for human review).

---

### 4.3 Adding a New Derived Metric or KPI

1. Check `docs/ARCHITECTURE.md` to see if:
   - the metric already exists conceptually, or
   - needs a new definition.

2. Implement the calculation in:
   - `src/domain/financial.ts` or the appropriate domain/engine module.

3. Add tests:
   - verifying the formula against known examples,
   - enforcing acceptable ranges.

4. Expose the metric through the pipeline and into the UI.
5. Update docs to define and explain the metric.

---

## 5. v1.0 Hardening Guidelines

During the v1.0 Gold Master hardening phase:

**Prioritize:**
- Fixing incorrect or unstable calculations.
- Clarifying or tightening invariants.
- Improving error messages and UX feedback.
- Strengthening tests and health reporting.

**De-prioritize:**
- New operation types or large new subsystems.
- Complex refactors without clear robustness gains.
- Features that cannot be validated against real data or spreadsheets.

Before calling a task “done” in this phase, ask:

> “Did I leave the code, tests, and docs in a better state,  
>  such that the *next* change will be easier and safer?”

If not, add at least one small improvement (test, comment, doc, simplification).

---

## 6. Antigravity Tooling Cheat Sheet

**Use these tools as your main loop:**

1. **Discover / Navigate**
   - `list_dir` — see what’s in a directory.
   - `find_by_name` — locate files by glob pattern.
   - `codebase_search` — semantic search for functions or concepts.
   - `grep_search` — exact pattern search in code.
   - `view_file_outline` — get structure of a file (functions, classes).
   - `view_file` — read code or docs.

2. **Edit**
   - `write_to_file` — create or overwrite files (docs, new modules, tests).
   - `multi_replace_file_content` (and related tools) — apply multiple, non-contiguous edits safely.

3. **Run**
   - `run_command` — propose commands like:
     - `npm test`
     - `npm run lint`
     - `npm run build`
     - `node scripts/generate-health.js`
   - `command_status` — monitor long-running commands.

4. **Browser / UI**
   - `browser_subagent` — open, click, type, navigate, and record UI flows in the browser for E2E checks.

Use these tools in a **Plan → Inspect → Edit → Test → Summarize** cycle.

---

## 7. Do / Don’t Cheat Sheet

**DO:**
- Use Antigravity tools to inspect before editing.
- Keep domain logic pure and well-typed.
- Write descriptive tests and commit messages.
- Update docs when behavior changes or ambiguity is removed.
- Keep changes small and focused.

**DON’T:**
- Guess financial formulas.
- Duplicate logic across layers (domain/engine/UI).
- Hide failing tests or health checks.
- Perform large refactors without tests in place.
- Mix multiple unrelated concerns in a single change.

---

## 8. When You Are Confused

If you are unsure:

1. Re-read:
   - `docs/ARCHITECTURE.md`
   - `docs/AGENTS.md`
   - This `LLM.guide.md`.

2. Use Antigravity tools to investigate:
   - search for similar patterns or existing implementations,
   - inspect tests and reference scenarios.

3. If still unclear:
   - Explicitly describe the ambiguity.
   - Propose 1–2 alternative designs with tradeoffs.
   - Ask the human maintainer which direction to take.

Working carefully and transparently is more important than making big changes quickly.  
Your main job is to keep this financial modeling engine **correct, reliable, and pleasant to use**.
