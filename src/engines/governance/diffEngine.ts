/**
 * Diff Engine (v0.12)
 * 
 * Compares two scenarios and identifies differences.
 * Returns a structured diff result that can be formatted for display.
 */

import type { NamedScenario, FullModelInput, FullModelOutput } from '@domain/types';
import type { ScenarioVersion } from '@domain/governance';

/**
 * Type of change detected in a diff.
 */
export type DiffChangeType = 'added' | 'removed' | 'modified';

/**
 * A single change detected between two scenarios.
 */
export interface DiffChange {
  path: string;              // Dot-notation path (e.g., "projectConfig.discountRate", "operations[0].avgDailyRate")
  type: DiffChangeType;      // Type of change
  oldValue: unknown;         // Previous value (null for 'added')
  newValue: unknown;         // New value (null for 'removed')
}

/**
 * Result of comparing two scenarios.
 */
export interface DiffResult {
  changes: DiffChange[];
}

/**
 * High-level summary of differences between two model outputs (v3.3).
 * 
 * Provides key financial impact metrics for "Smart Restore" functionality.
 */
export interface DiffSummary {
  npvDelta: number;      // Change in NPV (target - base)
  irrDelta: number | null; // Change in IRR (target - base, null if either is null)
}

/**
 * Compare two scenarios and identify all differences.
 * 
 * Traverses projectConfig, capitalConfig, and operations to find
 * added, removed, or modified fields. Ignores metadata updates
 * like 'lastModified'.
 * 
 * @param base - The base scenario to compare against
 * @param target - The target scenario to compare
 * @returns A DiffResult containing all detected changes
 */
export function compareScenarios(base: NamedScenario, target: NamedScenario): DiffResult {
  const changes: DiffChange[] = [];

  // Compare modelConfig structure
  compareModelConfig(base.modelConfig, target.modelConfig, changes);

  // Compare top-level metadata (id, name, description) - but ignore lastModified
  if (base.id !== target.id) {
    changes.push({
      path: 'id',
      type: 'modified',
      oldValue: base.id,
      newValue: target.id,
    });
  }
  if (base.name !== target.name) {
    changes.push({
      path: 'name',
      type: 'modified',
      oldValue: base.name,
      newValue: target.name,
    });
  }
  if (base.description !== target.description) {
    changes.push({
      path: 'description',
      type: 'modified',
      oldValue: base.description,
      newValue: target.description,
    });
  }

  return { changes };
}

/**
 * Compare two FullModelInput objects recursively.
 */
function compareModelConfig(
  base: FullModelInput,
  target: FullModelInput,
  changes: DiffChange[],
  basePath = 'modelConfig'
): void {
  // Compare projectConfig
  compareObject(
    base.projectConfig as unknown as Record<string, unknown>,
    target.projectConfig as unknown as Record<string, unknown>,
    changes,
    `${basePath}.projectConfig`
  );

  // Compare capitalConfig
  compareObject(
    base.capitalConfig as unknown as Record<string, unknown>,
    target.capitalConfig as unknown as Record<string, unknown>,
    changes,
    `${basePath}.capitalConfig`
  );

  // Compare scenario
  compareObject(
    base.scenario as unknown as Record<string, unknown>,
    target.scenario as unknown as Record<string, unknown>,
    changes,
    `${basePath}.scenario`
  );

  // Compare operations array
  compareArray(
    base.scenario.operations,
    target.scenario.operations,
    changes,
    `${basePath}.scenario.operations`
  );

  // Compare waterfallConfig
  compareObject(
    base.waterfallConfig as unknown as Record<string, unknown>,
    target.waterfallConfig as unknown as Record<string, unknown>,
    changes,
    `${basePath}.waterfallConfig`
  );

  // Compare netDebtOverride if present
  if (base.netDebtOverride || target.netDebtOverride) {
    compareObject(
      base.netDebtOverride,
      target.netDebtOverride,
      changes,
      `${basePath}.netDebtOverride`
    );
  }
}

/**
 * Compare two objects recursively, ignoring metadata fields.
 */
function compareObject(
  base: Record<string, unknown> | undefined,
  target: Record<string, unknown> | undefined,
  changes: DiffChange[],
  basePath: string
): void {
  // Handle undefined/null cases
  if (base === undefined && target === undefined) {
    return;
  }
  if (base === undefined && target !== undefined) {
    // All target fields are added
    for (const key in target) {
      if (key === 'lastModified') continue; // Ignore metadata
      changes.push({
        path: `${basePath}.${key}`,
        type: 'added',
        oldValue: null,
        newValue: target[key],
      });
    }
    return;
  }
  if (base !== undefined && target === undefined) {
    // All base fields are removed
    for (const key in base) {
      if (key === 'lastModified') continue; // Ignore metadata
      changes.push({
        path: `${basePath}.${key}`,
        type: 'removed',
        oldValue: base[key],
        newValue: null,
      });
    }
    return;
  }

  // Both exist - compare fields
  const allKeys = new Set([...Object.keys(base!), ...Object.keys(target!)]);

  for (const key of allKeys) {
    if (key === 'lastModified') continue; // Ignore metadata

    const baseValue = base![key];
    const targetValue = target![key];

    if (!(key in base!)) {
      // Added in target
      changes.push({
        path: `${basePath}.${key}`,
        type: 'added',
        oldValue: null,
        newValue: targetValue,
      });
    } else if (!(key in target!)) {
      // Removed from base
      changes.push({
        path: `${basePath}.${key}`,
        type: 'removed',
        oldValue: baseValue,
        newValue: null,
      });
    } else if (Array.isArray(baseValue) && Array.isArray(targetValue)) {
      // Compare arrays
      compareArray(baseValue, targetValue, changes, `${basePath}.${key}`);
    } else if (
      typeof baseValue === 'object' &&
      baseValue !== null &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(baseValue) &&
      !Array.isArray(targetValue)
    ) {
      // Recursively compare nested objects
      compareObject(
        baseValue as Record<string, unknown>,
        targetValue as Record<string, unknown>,
        changes,
        `${basePath}.${key}`
      );
    } else if (baseValue !== targetValue) {
      // Primitive values differ
      changes.push({
        path: `${basePath}.${key}`,
        type: 'modified',
        oldValue: baseValue,
        newValue: targetValue,
      });
    }
  }
}

/**
 * Compare two arrays element by element.
 */
function compareArray(
  base: unknown[],
  target: unknown[],
  changes: DiffChange[],
  basePath: string
): void {
  const maxLength = Math.max(base.length, target.length);

  for (let i = 0; i < maxLength; i++) {
    const baseItem = base[i];
    const targetItem = target[i];

    if (i >= base.length) {
      // Added item
      changes.push({
        path: `${basePath}[${i}]`,
        type: 'added',
        oldValue: null,
        newValue: targetItem,
      });
    } else if (i >= target.length) {
      // Removed item
      changes.push({
        path: `${basePath}[${i}]`,
        type: 'removed',
        oldValue: baseItem,
        newValue: null,
      });
    } else if (
      typeof baseItem === 'object' &&
      baseItem !== null &&
      typeof targetItem === 'object' &&
      targetItem !== null &&
      !Array.isArray(baseItem) &&
      !Array.isArray(targetItem)
    ) {
      // Compare object items recursively
      compareObject(
        baseItem as Record<string, unknown>,
        targetItem as Record<string, unknown>,
        changes,
        `${basePath}[${i}]`
      );
    } else if (baseItem !== targetItem) {
      // Primitive or array items differ
      changes.push({
        path: `${basePath}[${i}]`,
        type: 'modified',
        oldValue: baseItem,
        newValue: targetItem,
      });
    }
  }
}

/**
 * Format a diff result into human-readable strings.
 * 
 * Converts structured diff changes into readable messages like:
 * - "Hotel ADR changed from 200 to 220"
 * - "Discount rate changed from 0.10 to 0.12"
 * - "Operation 'Restaurant 1' added"
 * 
 * @param diff - The diff result to format
 * @returns Array of formatted change messages
 */
export function formatDiff(diff: DiffResult): string[] {
  return diff.changes.map(change => {
    const path = change.path;

    // Extract meaningful field names from paths
    const fieldName = extractFieldName(path);

    switch (change.type) {
      case 'added':
        return `${fieldName} added: ${formatValue(change.newValue)}`;
      case 'removed':
        return `${fieldName} removed: ${formatValue(change.oldValue)}`;
      case 'modified':
        return `${fieldName} changed from ${formatValue(change.oldValue)} to ${formatValue(change.newValue)}`;
    }
  });
}

/**
 * Extract a human-readable field name from a path.
 */
function extractFieldName(path: string): string {
  // Remove modelConfig prefix if present
  let cleanPath = path.replace(/^modelConfig\./, '');

  // Handle common field mappings for better readability
  const fieldMappings: Record<string, string> = {
    'projectConfig.discountRate': 'Discount rate',
    'projectConfig.terminalGrowthRate': 'Terminal growth rate',
    'projectConfig.initialInvestment': 'Initial investment',
    'projectConfig.workingCapitalPercentage': 'Working capital percentage',
    'projectConfig.workingCapitalPercent': 'Working capital percentage',
    'projectConfig.taxRate': 'Tax rate',
    'scenario.startYear': 'Start year',
    'scenario.horizonYears': 'Horizon years',
    'scenario.name': 'Scenario name',
    'capitalConfig.initialInvestment': 'Capital initial investment',
    'waterfallConfig.equityClasses': 'Equity classes',
    'waterfallConfig.tiers': 'Waterfall tiers',
  };

  // Check for exact match first
  if (fieldMappings[cleanPath]) {
    return fieldMappings[cleanPath];
  }

  // Handle operation-specific fields
  const operationMatch = cleanPath.match(/scenario\.operations\[(\d+)\]\.(\w+)/);
  if (operationMatch) {
    const index = operationMatch[1];
    const field = operationMatch[2];
    const fieldName = formatOperationFieldName(field);
    return `Operation ${index} ${fieldName}`;
  }

  // Handle nested paths (e.g., "capitalConfig.debtTranches[0].interestRate")
  const nestedMatch = cleanPath.match(/(\w+)\[(\d+)\]\.(\w+)/);
  if (nestedMatch) {
    const arrayName = nestedMatch[1];
    const index = nestedMatch[2];
    const field = nestedMatch[3];
    const fieldName = formatNestedFieldName(arrayName, field);
    return `${fieldName} [${index}]`;
  }

  // Handle simple nested paths (e.g., "projectConfig.discountRate")
  const simpleNestedMatch = cleanPath.match(/(\w+)\.(\w+)/);
  if (simpleNestedMatch) {
    const parent = simpleNestedMatch[1];
    const field = simpleNestedMatch[2];
    return formatNestedFieldName(parent, field);
  }

  // Fallback: capitalize first letter and replace dots with spaces
  return cleanPath
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Format operation field names for readability.
 */
function formatOperationFieldName(field: string): string {
  const mappings: Record<string, string> = {
    avgDailyRate: 'ADR',
    avgNightlyRate: 'Average nightly rate',
    avgCheck: 'Average check',
    avgCourtRate: 'Average court rate',
    avgRentPerSqm: 'Average rent per sqm',
    avgMonthlyRate: 'Average monthly rate',
    avgDailyPassPrice: 'Average daily pass price',
    avgMembershipFee: 'Average membership fee',
    occupancyByMonth: 'Occupancy by month',
    turnoverByMonth: 'Turnover by month',
    utilizationByMonth: 'Utilization by month',
    keys: 'Keys',
    units: 'Units',
    covers: 'Covers',
    courts: 'Courts',
    sqm: 'Square meters',
    dailyPasses: 'Daily passes',
    memberships: 'Memberships',
    hoursPerDay: 'Hours per day',
    foodRevenuePctOfRooms: 'Food revenue % of rooms',
    beverageRevenuePctOfRooms: 'Beverage revenue % of rooms',
    otherRevenuePctOfRooms: 'Other revenue % of rooms',
    foodRevenuePctOfRental: 'Food revenue % of rental',
    beverageRevenuePctOfRental: 'Beverage revenue % of rental',
    otherRevenuePctOfRental: 'Other revenue % of rental',
    foodRevenuePctOfTotal: 'Food revenue % of total',
    beverageRevenuePctOfTotal: 'Beverage revenue % of total',
    otherRevenuePctOfTotal: 'Other revenue % of total',
    rentalRevenuePctOfTotal: 'Rental revenue % of total',
    careRevenuePctOfRental: 'Care revenue % of rental',
    foodCogsPct: 'Food COGS %',
    beverageCogsPct: 'Beverage COGS %',
    careCogsPct: 'Care COGS %',
    payrollPct: 'Payroll %',
    utilitiesPct: 'Utilities %',
    marketingPct: 'Marketing %',
    maintenanceOpexPct: 'Maintenance OPEX %',
    otherOpexPct: 'Other OPEX %',
    maintenanceCapexPct: 'Maintenance CAPEX %',
  };

  return mappings[field] || field;
}

/**
 * Format nested field names for readability.
 */
function formatNestedFieldName(parent: string, field: string): string {
  // Handle debt tranche fields
  if (parent === 'debtTranches') {
    const mappings: Record<string, string> = {
      initialPrincipal: 'Initial principal',
      interestRate: 'Interest rate',
      amortizationType: 'Amortization type',
      termYears: 'Term years',
      amortizationYears: 'Amortization years',
      ioYears: 'IO years',
      startYear: 'Start year',
      refinanceAtYear: 'Refinance at year',
      originationFeePct: 'Origination fee %',
      exitFeePct: 'Exit fee %',
      label: 'Label',
      type: 'Type',
    };
    return mappings[field] || `${parent} ${field}`;
  }

  // Handle equity class fields
  if (parent === 'equityClasses') {
    const mappings: Record<string, string> = {
      contributionPct: 'Contribution %',
      distributionPct: 'Distribution %',
      name: 'Name',
    };
    return mappings[field] || `${parent} ${field}`;
  }

  // Handle waterfall tier fields
  if (parent === 'tiers') {
    const mappings: Record<string, string> = {
      type: 'Type',
      hurdleIrr: 'Hurdle IRR',
      distributionSplits: 'Distribution splits',
      enableCatchUp: 'Enable catch-up',
      catchUpTargetSplit: 'Catch-up target split',
      catchUpRate: 'Catch-up rate',
      enableClawback: 'Enable clawback',
      clawbackTrigger: 'Clawback trigger',
      clawbackMethod: 'Clawback method',
    };
    return mappings[field] || `${parent} ${field}`;
  }

  // Default: capitalize and format
  const parentFormatted = parent.charAt(0).toUpperCase() + parent.slice(1);
  const fieldFormatted = field.replace(/([A-Z])/g, ' $1').trim();
  return `${parentFormatted} ${fieldFormatted}`;
}

/**
 * Format a value for display in diff messages.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === 'object') {
    return '[object]';
  }
  return String(value);
}

/**
 * Summarize high-level financial impacts between two model outputs (v3.3).
 * 
 * Calculates key KPI deltas (NPV, IRR) to support "Smart Restore" functionality.
 * This provides a quick overview of the financial impact of changes without
 * requiring a full diff analysis.
 * 
 * @param base - Base model output to compare against
 * @param target - Target model output to compare
 * @returns DiffSummary with NPV and IRR deltas
 */
export function summarizeDiff(base: FullModelOutput, target: FullModelOutput): DiffSummary {
  const baseKpis = base.project.projectKpis;
  const targetKpis = target.project.projectKpis;
  
  // Calculate NPV delta (target - base)
  const npvDelta = targetKpis.npv - baseKpis.npv;
  
  // Calculate IRR delta (target - base)
  // If either IRR is null, the delta is null
  const irrDelta = 
    baseKpis.unleveredIrr !== null && targetKpis.unleveredIrr !== null
      ? targetKpis.unleveredIrr - baseKpis.unleveredIrr
      : null;
  
  return {
    npvDelta,
    irrDelta,
  };
}

/**
 * Summarize high-level financial impacts between two scenario versions using cached KPIs (v3.3).
 * 
 * Fast version that uses cached KPIs from ScenarioVersion objects, avoiding model re-runs.
 * This is the preferred method for "Smart Restore" functionality as it leverages
 * the cached KPIs stored when versions were created.
 * 
 * @param baseVersion - Base scenario version with cached KPIs
 * @param targetVersion - Target scenario version with cached KPIs (or target output if available)
 * @returns DiffSummary with NPV and IRR deltas
 */
export function summarizeVersionDiff(
  baseVersion: ScenarioVersion,
  targetVersion: ScenarioVersion | FullModelOutput
): DiffSummary {
  const baseKpis = baseVersion.cachedKpis;
  
  // Extract target KPIs - either from cached version or from output
  const targetKpis = 'cachedKpis' in targetVersion
    ? targetVersion.cachedKpis
    : targetVersion.project.projectKpis;
  
  // Calculate NPV delta (target - base)
  const npvDelta = targetKpis.npv - baseKpis.npv;
  
  // Calculate IRR delta (target - base)
  // If either IRR is null, the delta is null
  const irrDelta = 
    baseKpis.unleveredIrr !== null && targetKpis.unleveredIrr !== null
      ? targetKpis.unleveredIrr - baseKpis.unleveredIrr
      : null;
  
  return {
    npvDelta,
    irrDelta,
  };
}

