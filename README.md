# Hospitality Financial Modeler v2.8 (Enterprise Edition)

A comprehensive financial modeling engine for hospitality multi-operation projects that calculates cash flows, DCF valuations, debt schedules, and equity waterfall distributions.

**Tech Stack**: TypeScript (strict mode), Vite, React, Vitest

## Quickstart & onboarding

1. Install dependencies: `npm install` (run once).
2. Validate the model before shipping changes:
   - `npm test`
   - `node scripts/generate-health.js` (produces `public/health.json`)
3. Run the app: `npm run dev` (defaults to http://localhost:5173).
4. Keep changes focused on correctness and hardening—align with `docs/ARCHITECTURE.md` before adjusting formulas or KPIs.

## Model pipeline (at a glance)

The end-to-end flow is deterministic and orchestrated by `runFullModel`:

1. **Operations** (`runHotelEngine`, `runOperation`): per-asset monthly/annual P&L.
2. **Scenario** (`runScenarioEngine`): consolidates operations into project-level P&L.
3. **Project** (`runProjectEngine`): unlevered FCF, DCF valuation, project KPIs.
4. **Capital** (`runCapitalEngine`): debt schedules, levered FCF, owner cash flows.
5. **Waterfall** (`applyEquityWaterfall`): LP/GP distributions, IRR/MOIC by partner.
6. **UI/hooks** (`useFullModel`): presents KPIs, statements, and analytics.

## Features

### Core Capabilities
- **Non-blocking High-Frequency Calculation Engine**: Powered by Web Workers for lag-free UX during heavy computations (Monte Carlo simulations, sensitivity analysis)
- **9 Operation Types**: Hotel, Villas, Restaurant, Beach Club, Racquet, Retail, Flex, Wellness, Senior Living
- **Multi-Model Ownership (Operate vs Lease vs Co-Invest)**: Support for different real estate ownership structures including Build & Operate, Build & Lease (Fixed/Variable), and Co-Invest OpCo models, enabling sophisticated ownership arrangements and accurate sponsor cash flow modeling
- **Asset Lifecycle (Active/Inactive)**: Asset status management allowing operations to be marked as active or inactive, with inactive assets excluded from sponsor-level consolidation while maintaining asset-level analysis capabilities
- **Dynamic Capital Stack Structuring**: Interactive deal structuring module with full CRUD operations for debt tranches, enabling users to dynamically add, remove, and modify debt structures with real-time WACC and equity multiple updates
- **Live Sources & Uses Visualization**: Real-time visual representation of capital composition showing debt and equity breakdown with immediate updates as capital structure changes
- **Capital Stack 2.0**: Multi-tranche capital structure with support for multiple debt tranches, different amortization types, simple refinancing, and transaction costs (origination fees, exit fees)
- **Partial Refinancing Support**: Flexible refinancing capabilities allowing partial repayment and restructuring of debt tranches, enabling sophisticated capital management strategies and optimization of debt structures over time
- **Senior/Subordinated Debt Tranching**: Advanced debt structuring with support for senior and subordinated debt tranches, enabling complex capital stack arrangements with different priority levels, interest rates, and covenant requirements for each tranche
- **Waterfall 3.0**: Advanced multi-tier waterfall with return of capital, preferred returns, catch-up provisions, and full clawback implementation
- **European-style Waterfall (Compound Accrual)**: Compound preferred return calculation method where unpaid preferred returns accrue and compound over time, similar to an interest-bearing account, providing European-style waterfall structures for sophisticated equity distribution modeling
- **Scenario Builder**: In-memory scenario library with side-by-side comparison, versioning, and audit diff tracking
- **Rich Visualizations**: Interactive charts for capital stack, cash flow profiles, and scenario comparison
- **Seasonality Modeling**: Advanced monthly revenue curve modeling with 12-month seasonality factors that accurately reflect real-world operational patterns. Configure custom seasonality curves for each operation type, with preset templates (Summer Peak, Winter Peak, Holiday Peak) and interactive editing. Seasonality affects all revenue streams proportionally, enabling realistic modeling of peak and off-peak periods.
- **Operating Leverage Analysis (Fixed vs Variable Costs)**: Sophisticated cost structure modeling that differentiates between fixed operating expenses (base payroll, rent, insurance, property taxes) and variable costs (percentage of revenue). This enables accurate operating leverage analysis where low revenue months show lower margins due to fixed cost burden, and high revenue months show improved margins as fixed costs are spread over more revenue. Visualize the impact of cost structure on profitability across seasonal variations.
- **S-Curve Construction Modeling**: Realistic construction cost distribution modeling that transforms lump-sum initial investment into monthly construction drawdowns over a specified timeline. Supports S-curve distribution (sigmoid function) for realistic project cash flow patterns where construction starts slow, accelerates in the middle phase, and tapers off at completion, as well as linear, front-loaded, and back-loaded distribution options. Construction outflows are properly integrated into unlevered free cash flow calculations, enabling accurate modeling of development projects with phased construction timelines. The S-curve pattern reflects real-world construction spending where initial mobilization is slow, peak spending occurs during active construction, and final completion phases require less capital intensity.
- **Land Bank Management (Cash & Barter)**: Comprehensive pre-construction land acquisition modeling that supports both traditional cash transactions and barter/permuta (land swap) arrangements. Model land acquisition costs with flexible payment structures including down payments and structured installments, with timeline support for acquisitions occurring before Year 0 (project start). Barter/permuta functionality allows modeling of land swaps where land is exchanged for other assets, creating positive cash flow entries that offset acquisition costs. Land flows are integrated into equity peak calculations, providing accurate pre-construction capital requirements for development projects.
- **Scenario War Room**: Strategic decision-making view that enables side-by-side comparison of Base Case, Upside, and Downside scenarios with visual diffing and variance analysis. The War Room provides a comprehensive comparison dashboard with KPI panels, overlay charts, variance matrices, and automated identification of key differences between scenarios. Visual diffing highlights variances with color coding (green for improvements, red for deteriorations), while variance matrices show percentage changes across all key metrics. This enables rapid scenario analysis and informed decision-making during deal structuring and risk assessment.
- **Detailed Cash Flow Statement (Indirect Method)**: Professional cash flow statement view following the indirect method format, starting from Net Operating Income (NOI) and adjusting for non-cash items (maintenance CAPEX) and financing activities (debt service including interest and principal). The statement provides clear visibility into cash generation from operations, capital expenditures, and debt obligations, enabling comprehensive cash flow analysis with grouped debt service components and net cash flow calculations.
- **Dynamic P&L Filtering**: Interactive filtering capabilities that allow users to selectively include or exclude operations from P&L statements in real-time. Users can filter operations by selecting specific operation IDs, enabling custom consolidation views (e.g., "Show me only Hotel + Restaurant"). The filtering system dynamically aggregates selected operations' revenues, expenses, and P&L components while maintaining USALI structure consistency, providing flexible analysis capabilities without re-running the full model pipeline.

### Risk Analysis & Analytics
- **Risk Intelligence Dashboard**: Unified strategic dashboard combining probabilistic (Monte Carlo) and deterministic (Sensitivity) risk assessment tools for comprehensive risk analysis
- **Sensitivity Analysis**: 1D and 2D sensitivity analysis with heatmap visualization to assess impact of key variables on financial metrics
- **Monte Carlo Simulation**: Probabilistic risk analysis with 500-1000 iterations to generate distribution of outcomes and calculate risk metrics
- **Multivariate Monte Carlo**: Advanced simulation engine using Cholesky Decomposition to generate correlated random samples, enabling realistic modeling of interdependent market variables
- **Correlation Modeling**: Realistic market behavior simulation that accounts for relationships between variables (e.g., high ADR often correlates with high Occupancy in luxury hotels), providing more accurate risk assessment by capturing tail risks and avoiding unrealistic independent scenarios
- **Value at Risk (VaR) Analysis**: Statistical risk metrics including VaR (95% confidence), Conditional VaR (CVaR), and percentile analysis (P10, P50, P90) to quantify downside risk
- **Probability of Loss**: Clear probability metric showing the likelihood that your investment will result in a negative return (e.g., "15.3% chance of loss" means 15.3% of simulated scenarios resulted in negative NPV)
- **Monthly Liquidity Analysis**: Monthly granularity cash flow tracking and visualization to detect cash flow gaps ("Valley of Death" scenarios) and seasonal variations that are invisible at annual granularity
- **Bank Covenant Monitoring**: Real-time monitoring of debt covenant compliance (DSCR, LTV, minimum cash) at monthly frequency with breach detection and timeline visualization to enable early warning systems for covenant violations
- **Goal Seek Optimization**: Reverse-engineer your deal: Find the required ADR for your target IRR. Automated binary search solver that finds input values (ADR, Occupancy, CapEx) needed to achieve target KPIs (IRR, NPV), eliminating manual trial-and-error and enabling systematic deal optimization
- **Advanced Probability Distributions**: Enhanced Monte Carlo simulation with multiple probability distribution options including Normal, LogNormal (best for prices/values that cannot be negative), and PERT (Program Evaluation and Review Technique, ideal for estimating project costs/timelines), allowing users to select the most appropriate distribution type for each variable to improve simulation accuracy
- **NPV Bridge Analysis**: Sophisticated variance analysis engine that explains the difference between two scenarios by breaking down NPV changes into discrete impact categories. The bridge analysis sequentially applies operational changes (revenue/cost parameters), capital changes (debt rates/LTV), and development changes (construction budget/timeline) to isolate and quantify each factor's contribution to the total NPV delta. Visualized as a waterfall/bridge chart, this enables clear communication of scenario comparison results by showing how each component drives value creation or destruction, making it easier to understand the drivers behind different deal structures and operational assumptions

#### Understanding Risk Metrics (For Non-Financial Users)

**Value at Risk (VaR) - "What's the worst-case scenario?"**
- VaR tells you the maximum amount you could lose with a given level of confidence (typically 95%)
- Example: "VaR (95%): -$2.5M" means there's a 95% chance your losses won't exceed $2.5 million
- Think of it as: "In 95 out of 100 possible scenarios, I won't lose more than $2.5M"
- A negative VaR indicates potential losses; the larger the negative number, the greater the risk

**Probability of Loss - "What are the odds I'll lose money?"**
- This simple percentage tells you how likely it is that your investment will result in a loss
- Example: "Probability of Loss: 15.3%" means 15.3% of all simulated scenarios resulted in negative returns
- Think of it as: "Out of 1000 possible future scenarios, 153 would result in me losing money"
- Lower percentages are better - a 5% probability of loss is much safer than 50%

### Professional Reporting & Export
- **Board-Ready Excel Export**: Enterprise-grade Excel export with native grouping, print layouts, and formatted KPIs. Export includes professional cover pages, executive summaries with card layouts, USALI-compliant cash flow sheets with Excel grouping (collapsed by default), freeze panes for easy navigation, and print-ready formatting with landscape orientation and fit-to-page settings. Native Grouping, Print Layouts, and Formatted KPIs ensure presentation-ready outputs for executive meetings and investor presentations.
- **Professional Excel Export**: Formatted .xlsx generation with USALI structure - multi-sheet workbooks with executive summary, assumptions, annual cash flow, and waterfall distributions
- **Excel Bi-Directional Sync**: Seamless two-way synchronization between Excel and the application, enabling users to import data from Excel templates and export results back to Excel while maintaining data integrity and formatting
- **Print Reporting**: Print-friendly report view with professional formatting for presentations and documentation
- **Import/Export**: Full data portability with JSON import/export functionality for sharing scenarios across environments

### User Experience
- **Smart Dashboards**: Context-rich KPI scorecards with trend indicators, sparklines, and health status visualization for comprehensive financial insights at a glance
- **Visual Trend Analysis & Health Monitoring**: Real-time trend visualization with sparklines showing trajectory over time, health status indicators (traffic lights), and comparisons against targets and baselines
- **Enterprise-Grade Input Forms**: Professional, organized input experience with logical grouping, progressive disclosure, and comprehensive editing capabilities for all operation types and capital structures
- **Tabbed Dashboard**: Professional CFO-ready interface with organized tabs (Dashboard, Assumptions, Financials, Analysis) for efficient navigation
- **Fluid Motion & Skeleton Loading**: Professional animations and smooth transitions throughout the application, with skeleton UI placeholders that mimic actual content layout during loading, eliminating "janky" updates and providing a premium user experience
- **Inspector Mode (Formula Transparency)**: Global toggle that activates Inspector Mode - click any key number to see its calculation formula, input values, and source information for complete transparency
- **Model Health Checks (Automated Risk Detection)**: Automated validation system that runs health checks against financial models, flagging issues like low DSCR, high LTV, and negative cash flows with severity levels (warning/critical)
- **Scenario Versioning**: Track every change with immutable snapshots, version history, comparison, and audit diff tracking
- **Persistence**: Browser localStorage for saving and loading scenarios

### Standards & Quality
- **USALI Compliance**: P&L structure follows Uniform System of Accounts for the Lodging Industry standards
- **Investment-Grade Math Accuracy**: Strict refinancing logic, correct exit fee calculations, and waterfall catch-up enforcement for reliable financial modeling
- **Data Validation**: Comprehensive input validation using Zod schemas for all scenario inputs

## Quick Start

### How to Run Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

The development server will start at `http://localhost:5173` (or the next available port).

### How to Deploy

```bash
# Build for production
npm run build

# The dist/ folder contains the production-ready static files
# Deploy dist/ to your hosting service (Vercel, Netlify, AWS S3, etc.)
```

For static hosting services:
- **Vercel**: Connect your repository and deploy automatically
- **Netlify**: Connect your repository or drag-and-drop the `dist/` folder
- **AWS S3 + CloudFront**: Upload `dist/` contents to an S3 bucket and configure CloudFront

## User Guide

### Tabbed Workflow

The application uses a professional tabbed interface designed for efficient financial modeling workflows:

1. **Dashboard Tab**: Start here for an executive overview
   - Key performance indicators (NPV, IRR, Equity Multiple, Payback Period, WACC)
   - Capital stack visualization
   - Cash flow profile chart
   - Quick scenario comparison

2. **Assumptions Tab**: Configure your model inputs
   - Project configuration (discount rate, terminal growth, initial investment)
   - Capital structure (debt tranches, interest rates, amortization)
   - Waterfall configuration (equity classes, tiers, catch-up, clawback)
   - Operations configuration (all 9 operation types with their parameters)

3. **Financials Tab**: Review detailed financial outputs
   - Consolidated P&L (USALI format)
   - Unlevered and levered free cash flows
   - Debt schedule (aggregate and per-tranche)
   - Waterfall distributions by year and by partner
   - Partner-level KPIs (IRR, MOIC)

4. **Analysis Tab**: Perform risk and sensitivity analysis
   - Risk Intelligence Dashboard with unified risk assessment
   - Sensitivity analysis controls (1D and 2D)
   - Sensitivity results with heatmap visualization
   - Monte Carlo simulation configuration
   - Risk metrics (VaR, CVaR, percentiles)
   - Distribution histograms

**Global Header**: Access scenario selector, import/export buttons, Excel export, print functionality, and version management from any tab.

**Note**: The application uses a **Responsive Sidebar Layout** as the standard navigation pattern. The sidebar provides quick access to all views and features, ensuring a consistent and professional user experience across all screen sizes.

**UI Updates**: The interface has been redesigned with enterprise-grade input forms featuring logical grouping and progressive disclosure. Operations and capital configuration screens now provide comprehensive, organized editing capabilities that scale across all operation types.

## Dependencies

### Core Dependencies
- `react`: ^19.2.0
- `react-dom`: ^19.2.0

### Key Libraries
- `recharts`: React-based charting library for data visualization
- `exceljs`: Professional Excel file generation
- `zod`: Runtime type validation and schema validation

## Project Structure

See `docs/ARCHITECTURE.md` for complete architecture documentation.

Key directories:
- `src/domain/`: Domain types and financial utilities
- `src/engines/`: Financial calculation engines (operations, scenario, project, capital, waterfall, simulation, diff, export)
- `src/ui/`: React UI components and state management
- `src/components/`: Reusable UI components including charts
- `src/tests/`: Comprehensive test suite

## Standards & Compliance

### USALI Aligned P&L
- **USALI Standard**: Financial statements follow the Uniform System of Accounts for the Lodging Industry (USALI) standards
- **GOP (Gross Operating Profit)**: Calculated as Revenue - Departmental Expenses, following USALI definitions
- **NOI (Net Operating Income)**: Calculated as GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense, USALI-compliant
- **Terminology**: Uses USALI-standard field names (departmentalExpenses, undistributedExpenses, replacementReserve) for professional hospitality financial reporting

### Strict Data Validation
- **Zod Schemas**: Comprehensive input validation using Zod schema validation library
- **Type Safety**: Runtime validation ensures all inputs conform to expected types and constraints
- **Error Handling**: Clear, detailed error messages guide users to correct invalid inputs
- **Data Integrity**: Validation prevents invalid scenarios from entering the financial model pipeline

## Documentation

- **Architecture**: `docs/ARCHITECTURE.md` — pipeline, formulas, and invariants
- **Glossary**: `docs/GLOSSARY.md` — ADR, RevPAR, NOI, MOIC, and other KPIs with formulas
- **Agents**: `docs/AGENTS.md` — role responsibilities and collaboration rules
- **LLM Guide**: `docs/LLM_GUIDE.md` — workflow and hardening principles for AI contributors

## Testing

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui
```

All engines are pure functions with comprehensive test coverage. Tests validate:
- Financial calculations (NPV, IRR, MOIC, payback)
- Multi-tranche capital structures
- Waterfall distributions (including catch-up and clawback)
- Scenario comparison workflows
- Monte Carlo simulation accuracy
- Data invariants and edge cases

## Troubleshooting

If icons are missing, ensure `lucide-react` is installed.

## Version History

- **v1.6**: Risk Intelligence Dashboard - Unified strategic dashboard combining Monte Carlo simulation and Sensitivity Analysis with clear risk metrics (VaR, Probability of Loss) for comprehensive risk assessment
- **v1.5**: Governance & Audit Suite - Inspector Mode (Formula Transparency), Model Health Checks (Automated Risk Detection), and enhanced Scenario Versioning with GovernanceView integration
- **v1.1.4**: Fixed startup crash caused by missing Audit Context.
- **v1.1.2**: Fixed critical layout rendering issue (White Screen) on production builds.
- **v1.0**: Production release - Complete feature set with Capital 2.0, Waterfall 3.0, Monte Carlo Simulation, Excel Export, and Scenario Versioning
- **v0.13**: Professional Excel Export - Formatted .xlsx generation (USALI structure)
- **v0.12**: Scenario Versioning & Audit Diff - Track every change with immutable snapshots
- **v0.11**: Monte Carlo Simulation - Probabilistic risk analysis with VaR metrics and distribution analysis
- **v0.10**: Auditability / Glass Box Mode - Click any number to see how it was calculated
- **v0.9**: Standards & Compliance - USALI-aligned P&L, Zod validation, investment-grade math accuracy
- **v0.8**: Tabbed dashboard, JSON import/export, sensitivity analysis, advanced metrics
- **v0.6**: Transaction costs, full clawback, scenario persistence, rich charts
- **v0.5**: Capital Stack 2.0 (multi-tranche), Waterfall v2 (catch-up), Scenario Builder v1

See `docs/ARCHITECTURE.md` for detailed version history and technical specifications.

## v2.0 Roadmap Completion Summary

**🎉 Celebrating the completion of the v2.0 roadmap! 🎉**

With v2.8, we have successfully completed the comprehensive v2.0 roadmap, delivering enterprise-grade financial modeling capabilities across four key pillars:

### ✅ Correlation Analysis (v2.1)
- **Multivariate Monte Carlo Simulation**: Advanced simulation engine using Cholesky Decomposition to generate correlated random samples, enabling realistic modeling of interdependent market variables
- **Realistic Market Behavior**: Accounts for relationships between variables (e.g., high ADR often correlates with high Occupancy in luxury hotels), providing more accurate risk assessment

### ✅ Liquidity & Covenant Monitoring (v2.2)
- **Monthly Liquidity Analysis**: Monthly granularity cash flow tracking and visualization to detect cash flow gaps ("Valley of Death" scenarios) and seasonal variations
- **Bank Covenant Monitoring**: Real-time monitoring of debt covenant compliance (DSCR, LTV, minimum cash) at monthly frequency with breach detection and timeline visualization

### ✅ Optimization (v2.3)
- **Goal Seek Optimization**: Reverse-engineer your deal - Find the required ADR for your target IRR. Automated binary search solver that finds input values (ADR, Occupancy, CapEx) needed to achieve target KPIs (IRR, NPV)

### ✅ User Experience Excellence (v2.4 - v2.8)
- **Visual Foundation & Readability**: Enterprise-grade UI/UX overhaul with professional design standards
- **Dashboard Storytelling**: Context-rich visualizations and trend analysis
- **Interactive Scenarios**: Real-time stress testing with dynamic input controls
- **Trust & Education**: Integrated glossary, system health monitoring, and contextual tooltips
- **Fluid Motion & Skeleton Loading**: Professional animations and polished loading states

The v2.0 series represents a complete transformation from a functional financial calculator to an **Enterprise Edition** platform ready for professional use in hospitality investment analysis.

## Future Roadmap (v3.0)

### Advanced Capital Features
- Partial refinances
- Subordinated debt structures
- Per-tranche KPIs

### Advanced Waterfall Features
- Compounding preferred returns
- More sophisticated catch-up mechanisms

### Advanced Analytics
- Excel import/read capability
- Custom Excel templates
- Chart generation in Excel
- Advanced correlation modeling for Monte Carlo
- More probability distributions (lognormal, beta, etc.)

### Collaboration & Workflow
- Version rollback/restore functionality
- Automatic version snapshots
- Branching and merging scenarios
- Collaborative editing features
- Advanced diff visualization (tree view, unified diff)

### Operation Type Refinements
- More sophisticated modeling for specific operation types
- Seasonal variations for memberships
- Operation subtypes (e.g., independent vs. assisted living)
- Enhanced revenue drivers and cost structures

### AI & Automation
- AI-powered narrative generation for financial reports
- Automated scenario recommendations
- Intelligent sensitivity analysis suggestions

## License

[Add license information here]
