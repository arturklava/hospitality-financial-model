/**
 * Zod validation schemas for domain objects (v0.9).
 * 
 * Provides strict validation rules for all domain types using Zod.
 * 
 * @note Requires 'zod' package to be installed: npm install zod
 */

// Import Zod - will fail at runtime if not installed
// This is intentional - the user should install zod as a dependency
import { z } from 'zod';

/**
 * Validates that a value is a number between min and max (inclusive).
 */
function numberBetween(min: number, max: number) {
  return z.number().min(min).max(max);
}

/**
 * Schema for validating occupancy/utilization values (0 to 1).
 */
export const occupancySchema = numberBetween(0, 1);

/**
 * Schema for validating percentage values (0 to 1).
 */
export const percentageSchema = numberBetween(0, 1);

/**
 * Schema for validating discount rate (typically 0 to 1, but can be higher).
 */
export const discountRateSchema = z.number().min(0).max(1);

/**
 * Schema for validating interest rate (typically 0 to 1).
 */
export const interestRateSchema = numberBetween(0, 1);

/**
 * Schema for validating positive numbers (>= 0).
 */
export const positiveNumberSchema = z.number().min(0);

/**
 * Schema for validating non-negative integers.
 */
export const nonNegativeIntegerSchema = z.number().int().min(0);

/**
 * Schema for validating year values (reasonable range).
 */
export const yearSchema = z.number().int().min(2000).max(2100);

/**
 * Schema for validating debt tranche configuration (v2.10: Financial Types).
 * 
 * Includes validation for new fields:
 * - refinanceAmountPct: percentage (0 to 1)
 * - seniority: enum validation
 */
export const debtTrancheConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  type: z.enum(['SENIOR', 'MEZZ', 'BRIDGE', 'OTHER']).optional(),
  amount: positiveNumberSchema.optional(),
  initialPrincipal: positiveNumberSchema.optional(),
  interestRate: interestRateSchema,
  amortizationType: z.enum(['interest_only', 'mortgage', 'bullet']).optional(),
  termYears: z.number().int().positive().max(50),
  amortizationYears: z.number().int().positive().max(50).optional(),
  ioYears: z.number().int().nonnegative().max(50).optional(),
  startYear: z.number().int().nonnegative().max(50).optional(),
  refinanceAtYear: z.number().int().nonnegative().max(50).optional(),
  originationFeePct: percentageSchema.optional(),
  exitFeePct: percentageSchema.optional(),
  // v2.10: Financial Types
  refinanceAmountPct: percentageSchema.optional(), // 0 to 1
  seniority: z.enum(['senior', 'mezzanine', 'subordinate']).optional(),
}).refine(
  (data) => data.initialPrincipal !== undefined || data.amount !== undefined,
  { message: "Either initialPrincipal or amount must be provided" }
);

/**
 * Schema for validating waterfall tier configuration (v2.10: Financial Types).
 * 
 * Includes validation for new fields:
 * - accumulationMethod: enum validation
 * - compoundPref: boolean for compound preference
 * - prefRate: preferred return rate
 */
export const waterfallTierSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['return_of_capital', 'preferred_return', 'promote']),
  hurdleIrr: percentageSchema.optional(),
  distributionSplits: z.record(z.string(), percentageSchema),
  enableCatchUp: z.boolean().optional(),
  catchUpTargetSplit: z.record(z.string(), percentageSchema).optional(),
  catchUpRate: percentageSchema.optional(),
  enableClawback: z.boolean().optional(),
  clawbackTrigger: z.enum(['final_period', 'annual']).optional(),
  clawbackMethod: z.enum(['hypothetical_liquidation', 'lookback']).optional(),
  // v2.10: Financial Types
  accumulationMethod: z.enum(['CUMULATIVE', 'NON_CUMULATIVE', 'irr_hurdle', 'compound_interest']).optional(),
  compoundPref: z.boolean().optional(),
  prefRate: percentageSchema.optional(),
});

/**
 * Schema for validating scenario structure.
 * 
 * This is a comprehensive validation schema that checks:
 * - Required fields exist
 * - Field types are correct
 * - Arrays are properly structured
 * - Numeric values are within valid ranges
 */
export const scenarioSchema = z.object({
  id: z.string().min(1, { message: 'id is required and must not be empty' }),
  name: z.string().min(1, { message: 'name is required and must not be empty' }),
  description: z.string().optional(),
  modelConfig: z.object({
    scenario: z.object({
      id: z.string().min(1, { message: 'scenario.id is required and must not be empty' }),
      name: z.string().min(1, { message: 'scenario.name is required and must not be empty' }),
      startYear: z.number().int().min(2000, { message: 'startYear must be at least 2000' }).max(2100, { message: 'startYear must be at most 2100' }),
      horizonYears: z.number().int().min(1, { message: 'horizonYears must be at least 1' }).max(50, { message: 'horizonYears must be at most 50' }),
      // Note: operations use z.any() for flexibility. Individual operation configs (HotelConfig, VillasConfig, etc.)
      // may include optional fields like commissionsPct (v1.2.3: Engine Drivers Logic).
      // If provided, commissionsPct should be a number between 0 and 1 (percentage).
      operations: z.array(z.any()).min(1, { message: 'operations array must contain at least one operation' }),
    }),
    projectConfig: z.object({
      discountRate: z.number().min(0, { message: 'discountRate must be at least 0' }).max(1, { message: 'discountRate must be at most 1' }),
      terminalGrowthRate: z.number().min(-0.1, { message: 'terminalGrowthRate must be at least -0.1' }).max(0.1, { message: 'terminalGrowthRate must be at most 0.1' }),
      initialInvestment: z.number().min(0, { message: 'initialInvestment must be at least 0' }),
      workingCapitalPercentage: z.number().min(0).max(1).optional(),
      workingCapitalPercent: z.number().min(0).max(1).optional(),
      taxRate: z.number().min(0).max(1).optional(),
      // v5.0: Land Bank (Pre-Construction)
      landConfigs: z.array(z.lazy(() => landConfigSchema)).optional(),
      // v5.1: Construction Dynamics (The S-Curve)
      constructionConfig: z.lazy(() => constructionConfigSchema).optional(),
    }),
    capitalConfig: z.object({
      initialInvestment: z.number().min(0, { message: 'capitalConfig.initialInvestment must be at least 0' }),
      debtTranches: z.array(debtTrancheConfigSchema).min(0), // Can be empty array
      covenants: z.array(z.any()).optional(),
    }),
    waterfallConfig: z.object({
      equityClasses: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        contributionPct: z.number().min(0, { message: 'contributionPct must be at least 0' }).max(1, { message: 'contributionPct must be at most 1' }),
        distributionPct: z.number().min(0).max(1).optional(),
      })).min(1, { message: 'equityClasses array must contain at least one equity class' }),
      tiers: z.array(waterfallTierSchema).optional(),
    }),
  }),
});

/**
 * Validates a scenario object using Zod schema.
 * 
 * @param data - Data to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateScenarioWithZod(data: any): { isValid: boolean; error?: string } {
  try {
    scenarioSchema.parse(data);
    return { isValid: true };
  } catch (error) {
    // Zod errors are ZodError objects with an 'issues' property
    if (error && typeof error === 'object' && 'issues' in error) {
      // Extract user-friendly error messages from Zod
      const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
      const errorMessages = zodError.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
        return `${path}: ${issue.message}`;
      });
      return { 
        isValid: false, 
        error: errorMessages.join('; ') || 'Validation failed' 
      };
    }
    return { isValid: false, error: 'Validation failed' };
  }
}

/**
 * Validates occupancy value (0 to 1).
 */
export function validateOccupancy(value: number): boolean {
  try {
    occupancySchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates percentage value (0 to 1).
 */
export function validatePercentage(value: number): boolean {
  try {
    percentageSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Schema for validating debt KPI (v2.10: Financial Types).
 * 
 * Includes validation for new fields:
 * - seniorDscr: optional number or null
 */
export const debtKpiSchema = z.object({
  yearIndex: z.number().int().nonnegative(),
  dscr: z.number().nullable(),
  ltv: z.number().nullable(),
  // v2.10: Financial Types
  seniorDscr: z.number().nullable().optional(),
});

/**
 * Schema for validating land installment payment.
 * v5.0: Land Bank (Pre-Construction)
 */
export const landInstallmentSchema = z.object({
  month: z.number().int(),
  amount: positiveNumberSchema,
  description: z.string().optional(),
});

/**
 * Schema for validating land acquisition configuration.
 * v5.0: Land Bank (Pre-Construction)
 */
export const landConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  totalCost: positiveNumberSchema,
  acquisitionMonth: z.number().int(),
  downPayment: positiveNumberSchema,
  downPaymentMonth: z.number().int(),
  installments: z.array(landInstallmentSchema).optional(),
  installmentMethod: z.enum(['equal', 'custom']).optional(),
  barterValue: percentageSchema.optional(), // 0-1 range for percentage
  barterMonth: z.number().int().optional(),
  notes: z.string().optional(),
});

/**
 * Schema for validating construction milestone.
 * v5.1: Construction Dynamics (The S-Curve)
 */
export const constructionMilestoneSchema = z.object({
  name: z.string().min(1),
  month: z.number().int().nonnegative(),
  paymentPct: percentageSchema, // 0-1 range
});

/**
 * Schema for validating construction configuration.
 * v5.1: Construction Dynamics (The S-Curve)
 */
export const constructionConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  totalBudget: positiveNumberSchema,
  startMonth: z.number().int().nonnegative(),
  durationMonths: z.number().int().positive(),
  curveType: z.enum(['s-curve', 'linear', 'front-loaded', 'back-loaded']),
  steepness: z.number().positive().optional(),
  paymentMethod: z.enum(['s-curve', 'milestone']).optional(),
  milestones: z.array(constructionMilestoneSchema).optional(),
  notes: z.string().optional(),
});

/**
 * Schema for validating ramp-up configuration.
 * v5.2: Operational Ramp-up
 */
export const rampUpConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rampUpMonths: z.number().int().positive(),
  rampUpCurve: z.enum(['linear', 's-curve', 'exponential', 'custom']),
  startMonth: z.number().int().nonnegative(),
  customFactors: z.array(percentageSchema).optional(), // Array of 0-1 values
  applyToRevenue: z.boolean(),
  applyToOccupancy: z.boolean(),
  applyToOperations: z.boolean(),
  notes: z.string().optional(),
});

