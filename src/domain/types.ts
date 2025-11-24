export type OperationType =
  | 'HOTEL'
  | 'VILLAS'
  | 'BEACH_CLUB'
  | 'RESTAURANT'
  | 'RACQUET'
  | 'RETAIL'
  | 'FLEX'
  | 'WELLNESS'
  | 'SENIOR_LIVING';

export interface MonthlyPnl {
  yearIndex: number;   // 0-based relative to scenario start
  monthIndex: number;  // 0-based 0..11
  operationId: string;

  // Revenue breakdown
  roomRevenue: number;
  foodRevenue: number;
  beverageRevenue: number;
  otherRevenue: number;

  // Cost of goods sold
  foodCogs: number;
  beverageCogs: number;

  // Operating expenses
  payroll: number;
  utilities: number;
  marketing: number;
  maintenanceOpex: number;
  otherOpex: number;

  // Profitability
  grossOperatingProfit: number;
  ebitda: number;
  noi: number;
  maintenanceCapex: number;

  // Cash flow proxy for this month
  cashFlow: number;
}

export interface AnnualPnl {
  yearIndex: number;
  operationId: string;

  revenueTotal: number;
  cogsTotal: number;
  opexTotal: number;

  ebitda: number;
  noi: number;
  maintenanceCapex: number;
  cashFlow: number;
}

/**
 * Consolidated Annual P&L with USALI (Uniform System of Accounts for the Lodging Industry) standardization.
 * 
 * USALI Structure:
 * - Revenue: Total revenue from all departments
 * - Departmental Expenses: Direct expenses attributable to revenue-generating departments (COGS + direct labor)
 * - GOP (Gross Operating Profit): Revenue - Departmental Expenses
 * - Undistributed Expenses: Expenses not directly attributable to departments (admin, marketing, utilities, etc.)
 * - Management Fees: Fees paid to management company (if applicable)
 * - Non-Operating Income/Expense: Items not related to operations
 * - NOI (Net Operating Income): GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense
 * 
 * Legacy fields (cogsTotal, opexTotal, ebitda) are maintained for backward compatibility but deprecated.
 */
/**
 * Ownership model for Real Estate operations (v1.2: Advanced Asset Dynamics).
 * Distinguishes between different ownership structures (OpCo vs PropCo).
 */
export type OwnershipModel =
  | 'BUILD_AND_OPERATE'      // Sponsor owns and operates (traditional model)
  | 'BUILD_AND_LEASE_FIXED'  // Sponsor owns property, leases with fixed rent
  | 'BUILD_AND_LEASE_VARIABLE' // Sponsor owns property, leases with variable rent
  | 'CO_INVEST_OPCO';        // Sponsor co-invests in operating company

/**
 * Lease terms for lease-based ownership models (v1.2: Advanced Asset Dynamics).
 */
export interface LeaseTerms {
  baseRent: number;                        // Base annual rent (for fixed lease)
  variableRentPct?: number;                // Variable rent percentage (for variable lease, 0..1)
  variableRentBasis?: 'revenue' | 'noi';   // Basis for variable rent calculation
}

export interface ConsolidatedAnnualPnl {
  yearIndex: number;

  // Revenue
  revenueTotal: number;

  // USALI Fields (v0.9)
  departmentalExpenses: number;      // Direct expenses (COGS + direct departmental labor)
  gop: number;                       // Gross Operating Profit = Revenue - Departmental Expenses
  undistributedExpenses: number;    // Expenses not directly attributable to departments
  managementFees?: number;           // Optional: Management fees
  nonOperatingIncomeExpense?: number; // Optional: Non-operating items
  noi: number;                       // Net Operating Income (USALI) = GOP - Undistributed Expenses - Management Fees - Non-Operating

  // Legacy fields (deprecated, maintained for backward compatibility)
  /** @deprecated Use departmentalExpenses instead */
  cogsTotal: number;
  /** @deprecated Use undistributedExpenses instead */
  opexTotal: number;
  /** @deprecated Use gop instead */
  ebitda: number;

  // Other fields
  maintenanceCapex: number;
  cashFlow: number;

  // v5.8: Granular Financials - Revenue Breakdown (optional for backward compatibility)
  /** Revenue breakdown by source */
  roomRevenue?: number;
  foodRevenue?: number;
  beverageRevenue?: number;
  otherRevenue?: number;

  // v5.8: Granular Financials - Expense Breakdown (optional for backward compatibility)
  /** Departmental expenses breakdown */
  foodCogs?: number;
  beverageCogs?: number;
  
  /** Undistributed expenses breakdown */
  payroll?: number;
  utilities?: number;
  marketing?: number;
  maintenanceOpex?: number;
  otherOpex?: number;

  // v5.8: Granular Financials - Fees (optional for backward compatibility)
  /** Incentive fees (if applicable) */
  incentiveFees?: number;
}

/**
 * Consolidated Monthly P&L - aggregates MonthlyPnl from all operations.
 * 
 * Similar structure to ConsolidatedAnnualPnl but at monthly granularity.
 * Used for monthly liquidity analysis and covenant monitoring.
 * 
 * v2.2: Monthly Engines & Covenants
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

export interface HotelConfig {
  id: string;
  name: string;
  operationType: 'HOTEL';

  startYear: number;      // calendar year, e.g. 2026
  horizonYears: number;   // number of years to model, e.g. 5

  keys: number;           // number of rooms
  avgDailyRate: number;   // ADR in currency/room/night
  occupancyByMonth: number[]; // length 12, 0..1

  // Revenue mix as % of room revenue
  foodRevenuePctOfRooms: number;
  beverageRevenuePctOfRooms: number;
  otherRevenuePctOfRooms: number;

  // COGS as % of respective revenue
  foodCogsPct: number;
  beverageCogsPct: number;

  // Commissions as % of room revenue (v1.2.3: Engine Drivers Logic)
  commissionsPct?: number;  // Optional, default 0

  // Opex as % of total revenue
  payrollPct: number;
  utilitiesPct: number;
  marketingPct: number;
  maintenanceOpexPct: number;
  otherOpexPct: number;

  // Maintenance capex as % of total revenue
  maintenanceCapexPct: number;

  // Operational logic fields (v3.5: Operational Logic)
  seasonalityCurve?: number[];            // Optional, length 12, seasonal multipliers (default: [1,1,1,1,1,1,1,1,1,1,1,1])
  fixedPayroll?: number;                  // Optional, fixed monthly payroll cost (default: 0)
  fixedOtherExpenses?: number;            // Optional, fixed monthly other expenses (default: 0)

  // Ownership model fields (v1.2: Advanced Asset Dynamics)
  ownershipModel?: OwnershipModel;        // Default: 'BUILD_AND_OPERATE'
  ownershipPct?: number;                  // Equity stake in OpCo/PropCo (0..1, default: 1.0)
  leaseTerms?: LeaseTerms;                 // Optional, required for lease models
  isREaaS?: boolean;                       // Real Estate as a Service flag (default: false)
  isActive?: boolean;                       // Active status (default: true)
  
  // v5.2: Operational Ramp-up
  rampUpConfig?: RampUpConfig;              // Optional: Ramp-up configuration for this operation
}

export interface VillasConfig {
  id: string;
  name: string;
  operationType: 'VILLAS';

  startYear: number;      // calendar year, e.g. 2026
  horizonYears: number;   // number of years to model, e.g. 5

  units: number;          // number of villa units
  avgNightlyRate: number; // average nightly rate in currency/unit/night
  occupancyByMonth: number[]; // length 12, 0..1

  // Revenue mix as % of rental revenue
  foodRevenuePctOfRental: number;
  beverageRevenuePctOfRental: number;
  otherRevenuePctOfRental: number;

  // COGS as % of respective revenue
  foodCogsPct: number;
  beverageCogsPct: number;

  // Commissions as % of rental revenue (v1.2.3: Engine Drivers Logic)
  commissionsPct?: number;  // Optional, default 0

  // Opex as % of total revenue
  payrollPct: number;
  utilitiesPct: number;
  marketingPct: number;
  maintenanceOpexPct: number;
  otherOpexPct: number;

  // Maintenance capex as % of total revenue
  maintenanceCapexPct: number;

  // Operational logic fields (v3.5: Operational Logic)
  seasonalityCurve?: number[];            // Optional, length 12, seasonal multipliers (default: [1,1,1,1,1,1,1,1,1,1,1,1])
  fixedPayroll?: number;                  // Optional, fixed monthly payroll cost (default: 0)
  fixedOtherExpenses?: number;            // Optional, fixed monthly other expenses (default: 0)

  // Ownership model fields (v1.2: Advanced Asset Dynamics)
  ownershipModel?: OwnershipModel;        // Default: 'BUILD_AND_OPERATE'
  ownershipPct?: number;                  // Equity stake in OpCo/PropCo (0..1, default: 1.0)
  leaseTerms?: LeaseTerms;                 // Optional, required for lease models
  isREaaS?: boolean;                       // Real Estate as a Service flag (default: false)
  isActive?: boolean;                       // Active status (default: true)
  
  // v5.2: Operational Ramp-up
  rampUpConfig?: RampUpConfig;              // Optional: Ramp-up configuration for this operation
}

export interface RestaurantConfig {
  id: string;
  name: string;
  operationType: 'RESTAURANT';

  startYear: number;      // calendar year, e.g. 2026
  horizonYears: number;   // number of years to model, e.g. 5

  covers: number;         // number of covers/seats
  avgCheck: number;       // average check per cover in currency
  turnoverByMonth: number[]; // length 12, daily turnover rate (e.g., 1.5 = 1.5 turns per day)

  // Revenue mix as % of total revenue
  foodRevenuePctOfTotal: number;
  beverageRevenuePctOfTotal: number;
  otherRevenuePctOfTotal: number;

  // COGS as % of respective revenue
  foodCogsPct: number;
  beverageCogsPct: number;

  // Opex as % of total revenue
  payrollPct: number;
  utilitiesPct: number;
  marketingPct: number;
  maintenanceOpexPct: number;
  otherOpexPct: number;

  // Maintenance capex as % of total revenue
  maintenanceCapexPct: number;

  // Operational logic fields (v3.5: Operational Logic)
  seasonalityCurve?: number[];            // Optional, length 12, seasonal multipliers (default: [1,1,1,1,1,1,1,1,1,1,1,1])
  fixedPayroll?: number;                  // Optional, fixed monthly payroll cost (default: 0)
  fixedOtherExpenses?: number;            // Optional, fixed monthly other expenses (default: 0)

  // Ownership model fields (v1.2: Advanced Asset Dynamics)
  ownershipModel?: OwnershipModel;        // Default: 'BUILD_AND_OPERATE'
  ownershipPct?: number;                  // Equity stake in OpCo/PropCo (0..1, default: 1.0)
  leaseTerms?: LeaseTerms;                 // Optional, required for lease models
  isREaaS?: boolean;                       // Real Estate as a Service flag (default: false)
  isActive?: boolean;                       // Active status (default: true)
  
  // v5.2: Operational Ramp-up
  rampUpConfig?: RampUpConfig;              // Optional: Ramp-up configuration for this operation
}

/**
 * Beach Club operation configuration.
 * Pattern: Volume × Ticket (similar to RESTAURANT)
 * Revenue driver: daily passes × price + memberships × fee
 */
export interface BeachClubConfig {
  id: string;
  name: string;
  operationType: 'BEACH_CLUB';

  startYear: number;
  horizonYears: number;

  dailyPasses: number;         // number of daily passes available per day
  avgDailyPassPrice: number;   // average price per daily pass
  memberships: number;         // number of annual memberships
  avgMembershipFee: number;    // average annual membership fee
  utilizationByMonth: number[]; // length 12, 0..1 for daily pass utilization

  // Revenue mix as % of total revenue
  foodRevenuePctOfTotal: number;
  beverageRevenuePctOfTotal: number;
  otherRevenuePctOfTotal: number;

  // COGS as % of respective revenue
  foodCogsPct: number;
  beverageCogsPct: number;

  // Opex as % of total revenue
  payrollPct: number;
  utilitiesPct: number;
  marketingPct: number;
  maintenanceOpexPct: number;
  otherOpexPct: number;

  // Maintenance capex as % of total revenue
  maintenanceCapexPct: number;

  // Operational logic fields (v3.5: Operational Logic)
  seasonalityCurve?: number[];            // Optional, length 12, seasonal multipliers (default: [1,1,1,1,1,1,1,1,1,1,1,1])
  fixedPayroll?: number;                  // Optional, fixed monthly payroll cost (default: 0)
  fixedOtherExpenses?: number;            // Optional, fixed monthly other expenses (default: 0)

  // Ownership model fields (v1.2: Advanced Asset Dynamics)
  ownershipModel?: OwnershipModel;        // Default: 'BUILD_AND_OPERATE'
  ownershipPct?: number;                  // Equity stake in OpCo/PropCo (0..1, default: 1.0)
  leaseTerms?: LeaseTerms;                 // Optional, required for lease models
  isREaaS?: boolean;                       // Real Estate as a Service flag (default: false)
  isActive?: boolean;                       // Active status (default: true)
  
  // v5.2: Operational Ramp-up
  rampUpConfig?: RampUpConfig;              // Optional: Ramp-up configuration for this operation
}

/**
 * Racquet operation configuration.
 * Pattern: Volume × Ticket (similar to RESTAURANT)
 * Revenue driver: courts × utilization × hours × rate + memberships × fee
 */
export interface RacquetConfig {
  id: string;
  name: string;
  operationType: 'RACQUET';

  startYear: number;
  horizonYears: number;

  courts: number;              // number of courts
  avgCourtRate: number;        // average hourly rate per court
  utilizationByMonth: number[]; // length 12, 0..1 for court utilization
  hoursPerDay: number;         // average operating hours per day
  memberships: number;         // number of annual memberships
  avgMembershipFee: number;   // average annual membership fee

  // Revenue mix as % of total revenue
  foodRevenuePctOfTotal: number;
  beverageRevenuePctOfTotal: number;
  otherRevenuePctOfTotal: number;

  // COGS as % of respective revenue
  foodCogsPct: number;
  beverageCogsPct: number;

  // Opex as % of total revenue
  payrollPct: number;
  utilitiesPct: number;
  marketingPct: number;
  maintenanceOpexPct: number;
  otherOpexPct: number;

  // Maintenance capex as % of total revenue
  maintenanceCapexPct: number;

  // Operational logic fields (v3.5: Operational Logic)
  seasonalityCurve?: number[];            // Optional, length 12, seasonal multipliers (default: [1,1,1,1,1,1,1,1,1,1,1,1])
  fixedPayroll?: number;                  // Optional, fixed monthly payroll cost (default: 0)
  fixedOtherExpenses?: number;            // Optional, fixed monthly other expenses (default: 0)

  // Ownership model fields (v1.2: Advanced Asset Dynamics)
  ownershipModel?: OwnershipModel;        // Default: 'BUILD_AND_OPERATE'
  ownershipPct?: number;                  // Equity stake in OpCo/PropCo (0..1, default: 1.0)
  leaseTerms?: LeaseTerms;                 // Optional, required for lease models
  isREaaS?: boolean;                       // Real Estate as a Service flag (default: false)
  isActive?: boolean;                       // Active status (default: true)
  
  // v5.2: Operational Ramp-up
  rampUpConfig?: RampUpConfig;              // Optional: Ramp-up configuration for this operation
}

/**
 * Retail operation configuration.
 * Pattern: Volume × Rate (similar to RESTAURANT)
 * Revenue driver: sqm × occupancy × rent
 */
export interface RetailConfig {
  id: string;
  name: string;
  operationType: 'RETAIL';

  startYear: number;
  horizonYears: number;

  sqm: number;                // total square meters of retail space
  avgRentPerSqm: number;      // average monthly rent per square meter
  occupancyByMonth: number[]; // length 12, 0..1 for space occupancy

  // Revenue mix as % of total revenue
  rentalRevenuePctOfTotal: number;
  otherRevenuePctOfTotal: number;

  // COGS: none (retail is typically lease-based, no direct COGS)

  // Opex as % of total revenue
  payrollPct: number;
  utilitiesPct: number;
  marketingPct: number;
  maintenanceOpexPct: number;
  otherOpexPct: number;

  // Maintenance capex as % of total revenue
  maintenanceCapexPct: number;

  // Operational logic fields (v3.5: Operational Logic)
  seasonalityCurve?: number[];            // Optional, length 12, seasonal multipliers (default: [1,1,1,1,1,1,1,1,1,1,1,1])
  fixedPayroll?: number;                  // Optional, fixed monthly payroll cost (default: 0)
  fixedOtherExpenses?: number;            // Optional, fixed monthly other expenses (default: 0)

  // Ownership model fields (v1.2: Advanced Asset Dynamics)
  ownershipModel?: OwnershipModel;        // Default: 'BUILD_AND_OPERATE'
  ownershipPct?: number;                  // Equity stake in OpCo/PropCo (0..1, default: 1.0)
  leaseTerms?: LeaseTerms;                 // Optional, required for lease models
  isREaaS?: boolean;                       // Real Estate as a Service flag (default: false)
  isActive?: boolean;                       // Active status (default: true)
  
  // v5.2: Operational Ramp-up
  rampUpConfig?: RampUpConfig;              // Optional: Ramp-up configuration for this operation
}

/**
 * Flex operation configuration.
 * Pattern: Volume × Rate (similar to RETAIL)
 * Revenue driver: sqm × occupancy × rent
 */
export interface FlexConfig {
  id: string;
  name: string;
  operationType: 'FLEX';

  startYear: number;
  horizonYears: number;

  sqm: number;                // total square meters of flexible space
  avgRentPerSqm: number;      // average monthly rent per square meter
  occupancyByMonth: number[]; // length 12, 0..1 for space occupancy

  // Revenue mix as % of total revenue
  rentalRevenuePctOfTotal: number;
  otherRevenuePctOfTotal: number;

  // COGS: none (flexible space is lease-based, no direct COGS)

  // Opex as % of total revenue
  payrollPct: number;
  utilitiesPct: number;
  marketingPct: number;
  maintenanceOpexPct: number;
  otherOpexPct: number;

  // Maintenance capex as % of total revenue
  maintenanceCapexPct: number;

  // Operational logic fields (v3.5: Operational Logic)
  seasonalityCurve?: number[];            // Optional, length 12, seasonal multipliers (default: [1,1,1,1,1,1,1,1,1,1,1,1])
  fixedPayroll?: number;                  // Optional, fixed monthly payroll cost (default: 0)
  fixedOtherExpenses?: number;            // Optional, fixed monthly other expenses (default: 0)

  // Ownership model fields (v1.2: Advanced Asset Dynamics)
  ownershipModel?: OwnershipModel;        // Default: 'BUILD_AND_OPERATE'
  ownershipPct?: number;                  // Equity stake in OpCo/PropCo (0..1, default: 1.0)
  leaseTerms?: LeaseTerms;                 // Optional, required for lease models
  isREaaS?: boolean;                       // Real Estate as a Service flag (default: false)
  isActive?: boolean;                       // Active status (default: true)
  
  // v5.2: Operational Ramp-up
  rampUpConfig?: RampUpConfig;              // Optional: Ramp-up configuration for this operation
}

/**
 * Wellness operation configuration.
 * Pattern: Volume × Ticket (similar to RESTAURANT)
 * Revenue driver: memberships × fee + daily passes × price
 */
export interface WellnessConfig {
  id: string;
  name: string;
  operationType: 'WELLNESS';

  startYear: number;
  horizonYears: number;

  memberships: number;         // number of annual memberships
  avgMembershipFee: number;    // average annual membership fee
  dailyPasses: number;         // number of daily passes available per day
  avgDailyPassPrice: number;   // average price per daily pass
  utilizationByMonth: number[]; // length 12, 0..1 for daily pass utilization

  // Revenue mix as % of total revenue
  foodRevenuePctOfTotal: number;
  beverageRevenuePctOfTotal: number;
  otherRevenuePctOfTotal: number;

  // COGS as % of respective revenue
  foodCogsPct: number;
  beverageCogsPct: number;

  // Opex as % of total revenue
  payrollPct: number;
  utilitiesPct: number;
  marketingPct: number;
  maintenanceOpexPct: number;
  otherOpexPct: number;

  // Maintenance capex as % of total revenue
  maintenanceCapexPct: number;

  // Operational logic fields (v3.5: Operational Logic)
  seasonalityCurve?: number[];            // Optional, length 12, seasonal multipliers (default: [1,1,1,1,1,1,1,1,1,1,1,1])
  fixedPayroll?: number;                  // Optional, fixed monthly payroll cost (default: 0)
  fixedOtherExpenses?: number;            // Optional, fixed monthly other expenses (default: 0)

  // Ownership model fields (v1.2: Advanced Asset Dynamics)
  ownershipModel?: OwnershipModel;        // Default: 'BUILD_AND_OPERATE'
  ownershipPct?: number;                  // Equity stake in OpCo/PropCo (0..1, default: 1.0)
  leaseTerms?: LeaseTerms;                 // Optional, required for lease models
  isREaaS?: boolean;                       // Real Estate as a Service flag (default: false)
  isActive?: boolean;                       // Active status (default: true)
  
  // v5.2: Operational Ramp-up
  rampUpConfig?: RampUpConfig;              // Optional: Ramp-up configuration for this operation
}

/**
 * Senior Living operation configuration.
 * Pattern: Keys/Units × Occupancy × Rate (similar to HOTEL/VILLAS)
 * Revenue driver: units × occupancy × monthly rate
 */
export interface SeniorLivingConfig {
  id: string;
  name: string;
  operationType: 'SENIOR_LIVING';

  startYear: number;
  horizonYears: number;

  units: number;              // number of senior living units
  avgMonthlyRate: number;    // average monthly rate per unit
  occupancyByMonth: number[]; // length 12, 0..1 for unit occupancy

  // Revenue mix as % of rental revenue
  careRevenuePctOfRental: number;
  foodRevenuePctOfRental: number;
  otherRevenuePctOfRental: number;

  // COGS as % of respective revenue
  foodCogsPct: number;
  careCogsPct: number;

  // Opex as % of total revenue
  payrollPct: number;
  utilitiesPct: number;
  marketingPct: number;
  maintenanceOpexPct: number;
  otherOpexPct: number;

  // Maintenance capex as % of total revenue
  maintenanceCapexPct: number;

  // Operational logic fields (v3.5: Operational Logic)
  seasonalityCurve?: number[];            // Optional, length 12, seasonal multipliers (default: [1,1,1,1,1,1,1,1,1,1,1,1])
  fixedPayroll?: number;                  // Optional, fixed monthly payroll cost (default: 0)
  fixedOtherExpenses?: number;            // Optional, fixed monthly other expenses (default: 0)

  // Ownership model fields (v1.2: Advanced Asset Dynamics)
  ownershipModel?: OwnershipModel;        // Default: 'BUILD_AND_OPERATE'
  ownershipPct?: number;                  // Equity stake in OpCo/PropCo (0..1, default: 1.0)
  leaseTerms?: LeaseTerms;                 // Optional, required for lease models
  isREaaS?: boolean;                       // Real Estate as a Service flag (default: false)
  isActive?: boolean;                       // Active status (default: true)
  
  // v5.2: Operational Ramp-up
  rampUpConfig?: RampUpConfig;              // Optional: Ramp-up configuration for this operation
}

export type OperationConfig =
  | HotelConfig
  | VillasConfig
  | RestaurantConfig
  | BeachClubConfig
  | RacquetConfig
  | RetailConfig
  | FlexConfig
  | WellnessConfig
  | SeniorLivingConfig
  ;

export interface ProjectScenario {
  id: string;
  name: string;
  startYear: number;
  horizonYears: number;
  operations: OperationConfig[];
}

// Project-level configuration (discount rate, WC, etc.)
/**
 * Land installment payment schedule.
 * v5.0: Land Bank (Pre-Construction)
 */
export interface LandInstallment {
  month: number;                           // Month index relative to project start (can be negative)
  amount: number;                           // Payment amount in project currency
  description?: string;                     // Optional: Description of this installment
}

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
  barterValue?: number;                     // Optional: Value of barter/permuta (land swap) in project currency (0-1 range for percentage)
  barterMonth?: number;                     // Optional: Month when barter occurs
  
  // Notes
  notes?: string;                           // Optional: Additional notes about the land acquisition
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

export interface ProjectConfig {
  discountRate: number;             // as decimal, e.g. 0.10
  terminalGrowthRate: number;       // as decimal, e.g. 0.02
  initialInvestment: number;        // total project cost
  workingCapitalPercentage?: number; // optional, % of revenue
  workingCapitalPercent?: number;    // backward-compatible alias
  taxRate?: number;                  // optional, tax rate for WACC calculation (decimal, e.g. 0.25 for 25%, defaults to 0)
  
  // v3.6: Construction timeline configuration
  constructionDuration?: number;    // months, optional (default = 0 means T0 lump sum)
  constructionCurve?: 's-curve' | 'linear';  // default = 's-curve'
  drawdownMethod?: 'equity_first';  // default = 'equity_first'
  
  // v5.0: Land Bank (Pre-Construction)
  landConfigs?: LandConfig[];               // Optional: Array of land acquisition configurations
  
  // v5.1: Construction Dynamics (The S-Curve)
  constructionConfig?: ConstructionConfig;  // Optional: Construction configuration (replaces initialInvestment logic)
}

export interface UnleveredFcf {
  yearIndex: number;
  noi: number;
  maintenanceCapex: number;
  changeInWorkingCapital: number;
  unleveredFreeCashFlow: number;
}

export interface DcfValuation {
  discountRate: number;
  terminalGrowthRate: number;

  cashFlows: number[];      // full 0..N series used in NPV/IRR
  npv: number;
  enterpriseValue: number;
  equityValue: number;
  terminalValue: number;
}

export interface ProjectKpis {
  npv: number;
  unleveredIrr: number | null;
  equityMultiple: number;
  paybackPeriod: number | null;
  wacc?: number | null; // v0.7: Weighted Average Cost of Capital
}

/**
 * Asset-level KPIs for live metrics display (v3.2).
 * 
 * Provides key performance indicators for individual operations,
 * extracted from full model output for consistency.
 */
export interface AssetKpis {
  totalRevenue: number;      // Sum of revenue across all years (Sponsor P&L)
  totalNoi: number;          // Sum of NOI across all years (Sponsor P&L)
  marginPct: number;         // NOI margin as percentage (totalNoi / totalRevenue * 100)
  revPar?: number;          // Revenue per available room (only for HOTEL operations)
}

/**
 * WACC metrics (v0.7).
 * 
 * Weighted Average Cost of Capital calculation components.
 */
export interface WaccMetrics {
  equityPercentage: number;      // Equity / (Equity + Debt)
  debtPercentage: number;         // Debt / (Equity + Debt)
  costOfEquity: number;           // From ProjectConfig.discountRate
  costOfDebt: number;             // Weighted average interest rate from debt tranches
  taxRate: number;                 // Tax rate (decimal, e.g., 0.25 for 25%)
  wacc: number;                   // Calculated WACC
}

/**
 * Breakeven metrics (v0.7).
 * 
 * Operational breakeven analysis results.
 */
export interface BreakevenMetrics {
  breakevenOccupancy: number | null;  // Occupancy rate (0..1) where DSCR = 1.0, null if not achievable
  noiRequiredForBreakeven: number | null; // NOI required for DSCR = 1.0 (Total Debt Service)
  method: 'dscr_breakeven'; // Method used to find breakeven
}

export interface ProjectEngineResult {
  unleveredFcf: UnleveredFcf[];
  dcfValuation: DcfValuation;
  projectKpis: ProjectKpis;
}

// Capital structure types

/**
 * Debt tranche configuration (v0.5 Capital Stack 2.0).
 * 
 * Supports multiple debt tranches with different amortization types and refinancing.
 * 
 * @property id - Unique identifier for the tranche
 * @property label - Human-readable name (e.g., "Senior Loan", "Mezzanine Debt")
 * @property type - Tranche type classification
 * @property initialPrincipal - Initial loan amount at Year 0 (replaces `amount` for clarity in v0.5)
 * @property interestRate - Annual nominal interest rate (decimal, e.g., 0.06 for 6%)
 * @property amortizationType - Amortization pattern: 'interest_only' (IO only, principal at maturity), 'mortgage' (linear amortization), or 'bullet' (no payments until maturity)
 * @property termYears - Number of years until maturity
 * @property ioYears - Optional, number of interest-only years (only used when `amortizationType === 'interest_only'`)
 * @property startYear - Optional, year index (0-based) when tranche begins (defaults to 0)
 * @property refinanceAtYear - Optional, year index (0-based) when tranche is fully repaid and refinanced (if not provided, no refinancing)
 * 
 * @note v0.5 Simplifications:
 * - Refinancing is simple "pay off old, start new" within the same year (no fees, no partial refinances)
 * - Per-tranche KPIs are not computed in v0.5 (only aggregate project-level DSCR/LTV)
 * - Amortization logic is simplified (linear for mortgage, IO-only for interest_only, bullet for bullet)
 */
export interface DebtTrancheConfig {
  id: string;
  label?: string;            // optional human-readable name (e.g., "Senior Loan", "Mezzanine Debt")
  type?: 'SENIOR' | 'MEZZ' | 'BRIDGE' | 'OTHER'; // optional tranche type classification
  
  // v0.4 backward compatibility: 'amount' is still supported, but 'initialPrincipal' is preferred
  amount?: number;           // deprecated: use initialPrincipal instead (kept for backward compatibility)
  initialPrincipal?: number; // initial loan amount at Year 0 (or at startYear if specified)
  
  interestRate: number;      // annual nominal rate, e.g. 0.10 for 10%
  amortizationType?: 'interest_only' | 'mortgage' | 'bullet'; // default: 'mortgage'
  termYears: number;         // number of years until maturity
  amortizationYears?: number; // amortization horizon (can be >= termYears) - only used for 'mortgage' type
  ioYears?: number;          // optional, number of interest-only years (only used when amortizationType === 'interest_only')
  startYear?: number;        // optional, year index (0-based) when tranche begins (defaults to 0)
  refinanceAtYear?: number; // optional, year index (0-based) when tranche is fully repaid and refinanced
  refinanceAmountPct?: number; // v2.10: optional, percentage of principal to refinance (0-1, default 1.0 for full repayment)
  seniority?: 'senior' | 'mezzanine' | 'subordinate'; // v2.10: optional, seniority level (defaults to 'senior' if not specified)
  
  // v0.6: Transaction costs
  originationFeePct?: number; // optional, percentage of initialPrincipal paid upfront as origination fee (decimal, e.g., 0.01 for 1%, defaults to 0)
  exitFeePct?: number;        // optional, percentage of ending balance paid upon repayment/refinance (decimal, e.g., 0.005 for 0.5%, defaults to 0)
}

/**
 * Capital structure configuration for the project.
 * 
 * @property initialInvestment - Total project cost (same notion as in ProjectConfig)
 * @property debtTranches - Array of debt tranche configurations (v0.5 supports multiple tranches)
 * 
 * @note Backwards compatibility (v0.4 → v0.5):
 * - v0.4 single-tranche configs can be migrated by wrapping the old `DebtTrancheConfig` (with `amount` field) into a 1-element array
 * - v0.5 capital engine will process all tranches and aggregate debt service/balances at project level
 * - For v0.4 compatibility, a helper can convert old-style configs (with `amount`) to new-style (with `initialPrincipal`)
 */
export interface CapitalStructureConfig {
  initialInvestment: number;       // same notion as in ProjectConfig
  debtTranches: DebtTrancheConfig[]; // v0.5: supports multiple tranches with different start years and refinancing
  covenants?: Covenant[];  // v2.2: Optional covenants for monitoring
}

// Annual debt schedule entry
export interface DebtScheduleEntry {
  yearIndex: number;        // 0..N-1
  beginningBalance: number;
  interest: number;
  principal: number;
  endingBalance: number;
}

// Optional convenience type for the whole schedule
export interface DebtSchedule {
  entries: DebtScheduleEntry[];
}

// Levered FCF per year (project level, after debt service)
export interface LeveredFcf {
  yearIndex: number;
  unleveredFcf: number;
  debtService: number;
  interest: number;
  principal: number;
  transactionCosts: number;  // v0.6: transaction costs (origination fees, exit fees) paid in this year
  leveredFreeCashFlow: number;
}

// Basic debt KPIs per year
export interface DebtKpi {
  yearIndex: number;
  dscr: number | null;  // debt service coverage ratio
  ltv: number | null;   // loan-to-value or loan / initialInvestment
  seniorDebtService?: number; // v2.10: senior debt service (sum of senior tranches)
  seniorDscr?: number | null; // v2.10: senior debt service coverage ratio (senior debt service only)
}

/**
 * Monthly debt schedule entry.
 * v2.2: Monthly Engines & Covenants
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

/**
 * Monthly debt schedule - aggregated across all debt tranches.
 * v2.2: Monthly Engines & Covenants
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

/**
 * Monthly cash flow (after debt service).
 * v2.2: Monthly Engines & Covenants
 */
export interface MonthlyCashFlow {
  yearIndex: number;
  monthIndex: number;
  monthNumber: number;
  noi: number;                    // Monthly NOI
  debtService: number;            // Monthly debt service (interest + principal)
  maintenanceCapex: number;       // Monthly maintenance capex
  monthlyCashFlow: number;        // NOI - Debt Service - Capex
  cumulativeCashFlow: number;    // Cumulative cash flow from start
  cashPosition: number;           // Current cash position (same as cumulativeCashFlow for now)
}

/**
 * Monthly debt KPIs.
 * v2.2: Monthly Engines & Covenants
 */
export interface MonthlyDebtKpi {
  yearIndex: number;
  monthIndex: number;
  monthNumber: number;
  dscr: number | null;  // Monthly DSCR = Monthly NOI / Monthly Debt Service
  ltv: number | null;   // Monthly LTV = Monthly Debt Balance / Initial Investment
}

/**
 * Debt covenant definition.
 * v2.2: Monthly Engines & Covenants
 */
export interface Covenant {
  id: string;                              // Unique identifier
  name: string;                            // Human-readable name (e.g., "Minimum DSCR")
  type: 'min_dscr' | 'max_ltv' | 'min_cash'; // Covenant type
  threshold: number;                       // Threshold value (e.g., 1.25 for DSCR, 0.75 for LTV)
  trancheId?: string;                      // Optional: specific tranche (if null, applies to aggregate)
  gracePeriodMonths?: number;             // Optional: grace period in months
}

/**
 * Monthly covenant compliance status.
 * v2.2: Monthly Engines & Covenants
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

/**
 * Breach event - represents a covenant breach at a specific month.
 * v2.2: Monthly Engines & Covenants
 */
export interface BreachEvent {
  covenantId: string;
  covenantName: string;
  covenantType: 'min_dscr' | 'max_ltv' | 'min_cash';
  yearIndex: number;
  monthIndex: number;
  monthNumber: number;
  actualValue: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

// Capital engine result
export interface CapitalEngineResult {
  debtSchedule: DebtSchedule;
  monthlyDebtSchedule?: MonthlyDebtSchedule;     // v2.2: Monthly granularity
  leveredFcfByYear: LeveredFcf[];
  monthlyCashFlow?: MonthlyCashFlow[];            // v2.2: Monthly cash flow
  ownerLeveredCashFlows: number[]; // length N+1: Year0..YearN, to feed waterfall later
  debtKpis: DebtKpi[];
  monthlyDebtKpis?: MonthlyDebtKpi[];            // v2.2: Monthly DSCR/LTV
  covenantStatus?: CovenantStatus[];              // v2.2: Covenant compliance
}

// Equity waterfall types

// Equity partner / class in the cap table
export interface EquityClass {
  id: string;              // e.g. 'lp', 'gp'
  name: string;            // e.g. 'Limited Partner', 'General Partner'
  contributionPct: number; // fraction of total equity contributed at Year 0 (must roughly sum to 1)
  distributionPct?: number; // optional; defaults to contributionPct if omitted (used in v0.2 single-tier mode)
}

// Waterfall tier for v0.3 multi-tier waterfall (v0.5: Waterfall v2 with catch-up)
export interface WaterfallTier {
  id: string;                                    // e.g. 'roc', 'pref', 'promote'
  type: 'return_of_capital' | 'preferred_return' | 'promote';
  hurdleIrr?: number;                            // for preferred_return tier (e.g., 0.08-0.12)
  distributionSplits: Record<string, number>;   // partnerId -> percentage (0..1)
  
  // v0.5: Catch-up provisions
  enableCatchUp?: boolean;                       // if true, enables catch-up logic for this tier (defaults to false)
  catchUpTargetSplit?: Record<string, number>;  // target distribution split after catch-up is complete (e.g., { lp: 0.70, gp: 0.30 })
  catchUpRate?: number;                          // optional, rate at which catch-up occurs (if not provided, uses default catch-up mechanism)
  
  // v0.6: Clawback implementation
  enableClawback?: boolean;                       // if true, enables clawback logic for this tier (defaults to false)
  clawbackTrigger?: 'final_period' | 'annual';   // when clawback is evaluated: 'final_period' (end of horizon) or 'annual' (each year)
  clawbackMethod?: 'hypothetical_liquidation' | 'lookback'; // methodology: 'hypothetical_liquidation' (recalculate waterfall) or 'lookback' (compare cumulative distributions)
  
  // v2.10: Financial Types
  accumulationMethod?: 'CUMULATIVE' | 'NON_CUMULATIVE' | 'irr_hurdle' | 'compound_interest'; // optional, how distributions accumulate in this tier
  compoundPref?: boolean; // v2.10: optional, if true, uses compound preference logic instead of IRR hurdle
  prefRate?: number; // v2.10: optional, preferred return rate for compound preference (0-1, e.g., 0.08 for 8%)
}

// Waterfall configuration
// v0.2 (single-tier): uses equityClasses with distributionPct
// v0.3 (multi-tier): uses tiers array for return_of_capital → preferred_return → promote
export interface WaterfallConfig {
  equityClasses: EquityClass[];  // Required: defines partners and their contribution percentages
  tiers?: WaterfallTier[];       // Optional: if provided, enables multi-tier waterfall (v0.3)
}

// Per-partner distribution series
export interface PartnerDistributionSeries {
  partnerId: string;
  cashFlows: number[];          // length = ownerCashFlows.length; includes Year 0
  cumulativeCashFlows: number[]; // prefix sums
  irr: number | null;
  moic: number;                 // multiple on invested capital
}

// Per-year row for the waterfall table
export interface AnnualWaterfallRow {
  yearIndex: number;                        // 0..N (Year 0 is equity contribution)
  ownerCashFlow: number;                   // from ownerLeveredCashFlows[yearIndex]
  partnerDistributions: Record<string, number>; // partnerId -> CF in that year
  clawbackAdjustments?: Record<string, number>; // v0.6: optional clawback adjustments per partner (negative for GP, positive for LP)
}

// Aggregate result of the waterfall
export interface WaterfallResult {
  ownerCashFlows: number[];                    // identical to ownerLeveredCashFlows
  partners: PartnerDistributionSeries[];
  annualRows: AnnualWaterfallRow[];
}

// Full model pipeline types

/**
 * Input for the full financial modeling pipeline.
 * Contains all configuration needed to run the complete model.
 * 
 * @note v0.6: This type is fully serializable (JSON-compatible) for persistence.
 * All fields are data types (no functions, no circular references).
 */
export interface FullModelInput {
  scenario: ProjectScenario;
  projectConfig: ProjectConfig;
  capitalConfig: CapitalStructureConfig;
  waterfallConfig: WaterfallConfig;
  /**
   * Optional overrides for valuation if we want to decouple capitalConfig from net debt assumptions.
   * Currently not used in the pipeline but reserved for future enhancements.
   */
  netDebtOverride?: {
    grossDebt?: number;
    cash?: number;
  };
}

/**
 * Complete output from the full financial modeling pipeline.
 * Contains all results from scenario, project, capital, and waterfall engines.
 */
export interface FullModelOutput {
  scenario: ProjectScenario;
  consolidatedAnnualPnl: ConsolidatedAnnualPnl[];
  project: ProjectEngineResult;
  capital: CapitalEngineResult;
  waterfall: WaterfallResult;
// ADICIONADO: Permite que o exportador acesse os dados granulares
operationsResult?: {
  annualPnl: AnnualPnl[];
};
}

// Scenario Builder v1 types (v0.5)

/**
 * Named scenario for Scenario Builder v1.
 * 
 * Represents a complete scenario configuration with metadata for comparison.
 * 
 * @property id - Unique identifier for the scenario
 * @property name - Human-readable name (e.g., "Base Case", "Upside", "Downside")
 * @property description - Optional text description of the scenario
 * @property modelConfig - Complete model configuration (scenario, projectConfig, capitalConfig, waterfallConfig)
 */
export interface NamedScenario {
  id: string;
  name: string;
  description?: string;
  modelConfig: FullModelInput;
}

/**
 * Saved scenario for Scenario Builder v2 (v0.6) persistence.
 * 
 * Extends NamedScenario with persistence metadata.
 * 
 * @property id - Unique identifier for the scenario
 * @property name - Human-readable name
 * @property description - Optional text description
 * @property modelConfig - Complete model configuration (fully serializable)
 * @property lastModified - Timestamp (milliseconds since epoch) when scenario was last modified
 */
export interface SavedScenario extends NamedScenario {
  lastModified: number; // timestamp in milliseconds since epoch
}

/**
 * Scenario summary for Scenario Builder v1 comparison.
 * 
 * Extracts key KPIs from a full model output for side-by-side comparison.
 * All fields are independent of UI specifics (no React types).
 * 
 * @property scenarioId - Reference to the scenario
 * @property scenarioName - Human-readable name
 * @property projectKpis - Project-level KPIs (NPV, IRR, equity multiple, payback)
 * @property capitalKpis - Aggregated debt KPIs (average DSCR, final LTV, etc.)
 * @property waterfallKpis - Partner-level KPIs (IRR, MOIC per partner)
 */
export interface ScenarioSummary {
  scenarioId: string;
  scenarioName: string;
  projectKpis: ProjectKpis;
  capitalKpis: {
    avgDscr: number | null;      // average DSCR across all years (null if no debt or all DSCRs are null)
    finalLtv: number | null;     // final LTV (last year's LTV, null if no debt or LTV is null)
    totalDebtService: number;    // total debt service across all years
    totalDebtPrincipal: number; // total principal payments across all years
  };
  waterfallKpis: Array<{
    partnerId: string;
    partnerName: string;
    irr: number | null;
    moic: number;
  }>;
}

// Sensitivity Analysis Types (v0.7)

/**
 * Sensitivity variable types that can be varied in sensitivity analysis.
 * Each variable represents an input parameter that can be adjusted.
 */
export type SensitivityVariable =
  | 'occupancy'        // Multiplicative adjustment to all operations' occupancy (e.g., 0.9 = 90% of base)
  | 'adr'              // Multiplicative adjustment to hotel ADR (avgDailyRate)
  | 'discountRate'     // Discount rate adjustment
  | 'exitCap'          // Exit cap rate for terminal value (if implemented)
  | 'initialInvestment' // Absolute adjustment to initial investment
  | 'debtAmount'        // Debt amount adjustment (first tranche or aggregate)
  | 'interestRate'     // Interest rate adjustment (first tranche or aggregate)
  | 'terminalGrowthRate'; // Terminal growth rate adjustment

/**
 * Configuration for a sensitivity analysis run.
 * Supports 1D (single variable) or 2D (two variables) sensitivity analysis.
 */
export interface SensitivityConfig {
  variableX: SensitivityVariable;  // Primary variable to vary
  rangeX: { min: number; max: number; steps: number }; // Range for variable X (e.g., -0.2 to +0.2 in 10 steps)
  variableY?: SensitivityVariable; // Optional: secondary variable for 2D sensitivity (tornado chart)
  rangeY?: { min: number; max: number; steps: number }; // Range for variable Y (if variableY is provided)
  baseScenario: NamedScenario;    // Base case scenario to vary
}

/**
 * Results from a sensitivity analysis run.
 * Contains base case output, all runs with KPIs, and optional matrix for 2D sensitivity.
 */
export interface SensitivityResult {
  config: SensitivityConfig;
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
      wacc?: number | null;           // v0.7: Weighted Average Cost of Capital
    };
  }>;
  // Matrix representation for 2D sensitivity (if variableY is provided)
  matrix?: Array<Array<{
    variableXValue: number;
    variableYValue: number;
    kpis: SensitivityResult['runs'][0]['kpis'];
  }>>;
}

// Monte Carlo Simulation Types (v0.11)

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

/**
 * Distribution type for Monte Carlo simulation variables.
 */
export type DistributionType = 'normal' | 'lognormal' | 'pert';

/**
 * Configuration for Monte Carlo simulation.
 * 
 * Defines how random variations are applied to input variables.
 * 
 * @property iterations - Number of Monte Carlo iterations to run (default: 1000)
 * @property occupancyVariation - Standard deviation for occupancy variation (as decimal, e.g., 0.05 for 5%)
 * @property adrVariation - Standard deviation for ADR variation (as decimal, e.g., 0.10 for 10%)
 * @property interestRateVariation - Standard deviation for interest rate variation (as decimal, e.g., 0.01 for 1%)
 * @property correlationMatrix - Optional correlation matrix for correlated sampling (v2.1)
 * @property occupancyDistributionType - Distribution type for occupancy (default: 'normal')
 * @property adrDistributionType - Distribution type for ADR (default: 'normal', use 'lognormal' for prices)
 * @property interestRateDistributionType - Distribution type for interest rate (default: 'normal')
 */
export interface SimulationConfig {
  iterations?: number; // Default: 1000
  occupancyVariation?: number; // Standard deviation for occupancy (default: 0.05 = 5%)
  adrVariation?: number; // Standard deviation for ADR (default: 0.10 = 10%)
  interestRateVariation?: number; // Standard deviation for interest rate (default: 0.01 = 1%)
  correlationMatrix?: CorrelationMatrix; // Optional correlation matrix for correlated sampling (v2.1)
  occupancyDistributionType?: DistributionType; // Distribution type for occupancy (default: 'normal')
  adrDistributionType?: DistributionType; // Distribution type for ADR (default: 'normal', use 'lognormal' for prices)
  interestRateDistributionType?: DistributionType; // Distribution type for interest rate (default: 'normal')
}

/**
 * KPI results from a single Monte Carlo iteration.
 * Stores only the key metrics to save memory.
 */
export interface SimulationKpi {
  npv: number;
  unleveredIrr: number | null;
  leveredIrr: number | null;
  moic: number | null;
  equityMultiple: number;
  wacc: number | null;
}

/**
 * Results from a Monte Carlo simulation run.
 * 
 * Contains statistical summary of all iterations.
 * 
 * @property config - Simulation configuration used
 * @property baseCaseKpis - KPIs from the base case (no variations)
 * @property iterations - Array of KPI results from each iteration
 * @property statistics - Statistical summary (mean, percentiles) for each KPI
 */
export interface SimulationResult {
  config: SimulationConfig;
  baseCaseKpis: SimulationKpi;
  iterations: SimulationKpi[];
  statistics: {
    npv: {
      mean: number;
      p10: number;
      p50: number;
      p90: number;
    };
    unleveredIrr: {
      mean: number | null;
      p10: number | null;
      p50: number | null;
      p90: number | null;
    };
    leveredIrr: {
      mean: number | null;
      p10: number | null;
      p50: number | null;
      p90: number | null;
    };
    moic: {
      mean: number | null;
      p10: number | null;
      p50: number | null;
      p90: number | null;
    };
    equityMultiple: {
      mean: number;
      p10: number;
      p50: number;
      p90: number;
    };
    wacc: {
      mean: number | null;
      p10: number | null;
      p50: number | null;
      p90: number | null;
    };
  };
}

// Variance Analysis Types (v3.6)

/**
 * Bridge step in variance analysis waterfall.
 * Represents a single step in the bridge from base NPV to target NPV.
 * 
 * @property label - Human-readable label for this step (e.g., "Operational Impact", "Capital Impact")
 * @property value - NPV delta attributed to this step
 * @property cumulativeValue - Cumulative NPV after this step (base + all previous steps + this step)
 */
export interface BridgeStep {
  label: string;
  value: number;
  cumulativeValue: number;
}

// Portfolio Analytics Types (v1.4: BI Calculation Logic)

/**
 * Aggregated metrics by operation type.
 * Used for portfolio-level analytics and BI calculations.
 */
export interface PortfolioMetrics {
  revenue: number;
  noi: number;
  valuation: number;
}

/**
 * REaaS-specific metrics.
 * Used for Real Estate as a Service portfolio analytics.
 */
export interface ReaasMetrics {
  totalReaasRevenue: number;
  reaasRevenueShare: number; // Percentage of total revenue (0..1)
  reaasNoi: number;
}

// Analytics Helpers Types (v2.5: Analytics Helpers)

/**
 * Trend calculation result.
 * Indicates the direction and magnitude of change in a time series.
 */
export interface KpiTrend {
  direction: 'up' | 'down' | 'flat';
  percentChange: number;
}

/**
 * Health status evaluation result.
 * Indicates whether a value is within acceptable bounds.
 */
export type HealthStatus = 'success' | 'warning' | 'danger';

/**
 * Health evaluation rule.
 * Defines min/max thresholds for health evaluation.
 */
export interface HealthRule {
  min?: number;
  max?: number;
}

