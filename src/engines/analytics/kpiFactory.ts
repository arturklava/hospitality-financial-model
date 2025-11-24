/**
 * KPI Factory for operation-specific KPIs.
 * 
 * Generates operation-specific KPIs based on operation type and annual P&L results.
 * 
 * v5.8: Detailed Aggregation
 */

import type {
  OperationConfig,
  AnnualPnl,
  HotelConfig,
  VillasConfig,
  RestaurantConfig,
  BeachClubConfig,
  RacquetConfig,
  RetailConfig,
  FlexConfig,
  WellnessConfig,
} from '@domain/types';

export interface OperationKpi {
  label: string;
  value: string;
  subtext: string;
}

/**
 * Calculates operation-specific KPIs based on operation type.
 * 
 * @param op - Operation configuration
 * @param results - Array of annual P&L results for the operation
 * @returns Array of KPI objects with label, value, and subtext
 * 
 * @example
 * // Hotel operation: RevPAR, ADR, Occupancy %
 * const hotelKpis = getOperationKpis(hotelConfig, annualPnlResults);
 * 
 * // Restaurant operation: Avg Check, Seat Turnover, COGS %
 * const restaurantKpis = getOperationKpis(restaurantConfig, annualPnlResults);
 */
export function getOperationKpis(
  op: OperationConfig,
  results: AnnualPnl[]
): OperationKpi[] {
  switch (op.operationType) {
    case 'HOTEL': {
      return getHotelKpis(op, results);
    }
    
    case 'VILLAS': {
      return getVillasKpis(op, results);
    }
    
    case 'RESTAURANT': {
      return getRestaurantKpis(op, results);
    }
    
    case 'BEACH_CLUB': {
      return getBeachClubKpis(op, results);
    }
    
    case 'RACQUET': {
      return getRacquetKpis(op, results);
    }
    
    case 'RETAIL': {
      return getRetailKpis(op, results);
    }
    
    case 'FLEX': {
      return getFlexKpis(op, results);
    }
    
    case 'WELLNESS': {
      return getWellnessKpis(op, results);
    }
    
    default: {
      // For other operation types, return empty array
      return [];
    }
  }
}

/**
 * Calculates Hotel-specific KPIs.
 * 
 * KPIs: RevPAR, ADR, Occupancy %
 * 
 * @param config - Hotel operation configuration
 * @param results - Array of annual P&L results
 * @returns Array of Hotel KPIs
 */
function getHotelKpis(
  config: HotelConfig,
  _results: AnnualPnl[]
): OperationKpi[] {
  const kpis: OperationKpi[] = [];
  
  // ADR (Average Daily Rate)
  const adr = config.avgDailyRate;
  kpis.push({
    label: 'ADR',
    value: formatCurrency(adr),
    subtext: 'Average Daily Rate',
  });
  
  // Occupancy % (average across all months)
  const avgOccupancy = config.occupancyByMonth.length > 0
    ? config.occupancyByMonth.reduce((sum, occ) => sum + occ, 0) / config.occupancyByMonth.length
    : 0;
  const occupancyPct = avgOccupancy * 100;
  kpis.push({
    label: 'Occupancy %',
    value: formatPercentage(occupancyPct),
    subtext: 'Average annual occupancy',
  });
  
  // RevPAR (Revenue per Available Room) = ADR × Occupancy
  const revPar = adr * avgOccupancy;
  kpis.push({
    label: 'RevPAR',
    value: formatCurrency(revPar),
    subtext: 'Revenue per Available Room',
  });
  
  return kpis;
}

/**
 * Calculates Villas-specific KPIs.
 * 
 * KPIs: RevPAR, ADR, Occupancy %
 * 
 * @param config - Villas operation configuration
 * @param results - Array of annual P&L results
 * @returns Array of Villas KPIs
 */
function getVillasKpis(
  config: VillasConfig,
  _results: AnnualPnl[]
): OperationKpi[] {
  const kpis: OperationKpi[] = [];
  
  // ADR (Average Daily Rate)
  const adr = config.avgNightlyRate;
  kpis.push({
    label: 'ADR',
    value: formatCurrency(adr),
    subtext: 'Average Nightly Rate',
  });
  
  // Occupancy % (average across all months)
  const avgOccupancy = config.occupancyByMonth.length > 0
    ? config.occupancyByMonth.reduce((sum, occ) => sum + occ, 0) / config.occupancyByMonth.length
    : 0;
  const occupancyPct = avgOccupancy * 100;
  kpis.push({
    label: 'Occupancy %',
    value: formatPercentage(occupancyPct),
    subtext: 'Average annual occupancy',
  });
  
  // RevPAR (Revenue per Available Unit) = ADR × Occupancy
  const revPar = adr * avgOccupancy;
  kpis.push({
    label: 'RevPAR',
    value: formatCurrency(revPar),
    subtext: 'Revenue per Available Unit',
  });
  
  return kpis;
}

/**
 * Calculates Restaurant-specific KPIs.
 * 
 * KPIs: Avg Check, Seat Turnover, COGS %
 * 
 * @param config - Restaurant operation configuration
 * @param results - Array of annual P&L results
 * @returns Array of Restaurant KPIs
 */
function getRestaurantKpis(
  config: RestaurantConfig,
  results: AnnualPnl[]
): OperationKpi[] {
  const kpis: OperationKpi[] = [];
  
  if (config.covers <= 0) {
    return kpis; // Invalid covers, skip KPI calculation
  }
  
  // Calculate average annual revenue and COGS across all years
  const totalRevenue = results.reduce((sum, pnl) => sum + pnl.revenueTotal, 0);
  const totalCogs = results.reduce((sum, pnl) => sum + pnl.cogsTotal, 0);
  const avgAnnualRevenue = results.length > 0 ? totalRevenue / results.length : 0;
  const avgAnnualCogs = results.length > 0 ? totalCogs / results.length : 0;
  
  // Avg Check = Revenue / (covers × avgTurnover × 365)
  const avgTurnover = config.turnoverByMonth.length > 0
    ? config.turnoverByMonth.reduce((sum, turn) => sum + turn, 0) / config.turnoverByMonth.length
    : 0;
  
  if (avgTurnover > 0) {
    const totalCoversPerYear = config.covers * avgTurnover * 365;
    const avgCheck = totalCoversPerYear > 0 ? avgAnnualRevenue / totalCoversPerYear : 0;
    kpis.push({
      label: 'Avg Check',
      value: formatCurrency(avgCheck),
      subtext: 'Average check per cover',
    });
  }
  
  // Seat Turnover (average daily turnover)
  kpis.push({
    label: 'Seat Turnover',
    value: avgTurnover.toFixed(2),
    subtext: 'Average daily seat turnover',
  });
  
  // COGS % = (COGS / Revenue) × 100
  const cogsPct = avgAnnualRevenue > 0 ? (avgAnnualCogs / avgAnnualRevenue) * 100 : 0;
  kpis.push({
    label: 'COGS %',
    value: formatPercentage(cogsPct),
    subtext: 'Cost of Goods Sold as % of revenue',
  });
  
  return kpis;
}

/**
 * Calculates Beach Club-specific KPIs.
 * 
 * KPIs: Avg Check, COGS %, Revenue per Member
 * 
 * @param config - Beach Club operation configuration
 * @param results - Array of annual P&L results
 * @returns Array of Beach Club KPIs
 */
function getBeachClubKpis(
  config: BeachClubConfig,
  results: AnnualPnl[]
): OperationKpi[] {
  const kpis: OperationKpi[] = [];
  
  // Calculate average annual revenue and COGS across all years
  const totalRevenue = results.reduce((sum, pnl) => sum + pnl.revenueTotal, 0);
  const totalCogs = results.reduce((sum, pnl) => sum + pnl.cogsTotal, 0);
  const avgAnnualRevenue = results.length > 0 ? totalRevenue / results.length : 0;
  const avgAnnualCogs = results.length > 0 ? totalCogs / results.length : 0;
  
  // Avg Check (from daily passes)
  // Daily pass revenue = dailyPasses × avgDailyPassPrice × avgUtilization × 365
  const avgUtilization = config.utilizationByMonth.length > 0
    ? config.utilizationByMonth.reduce((sum, util) => sum + util, 0) / config.utilizationByMonth.length
    : 0;
  const dailyPassRevenue = config.dailyPasses * config.avgDailyPassPrice * avgUtilization * 365;
  const totalCovers = config.dailyPasses * avgUtilization * 365;
  const avgCheck = totalCovers > 0 ? dailyPassRevenue / totalCovers : 0;
  
  if (avgCheck > 0) {
    kpis.push({
      label: 'Avg Check',
      value: formatCurrency(avgCheck),
      subtext: 'Average check per daily pass',
    });
  }
  
  // COGS % = (COGS / Revenue) × 100
  const cogsPct = avgAnnualRevenue > 0 ? (avgAnnualCogs / avgAnnualRevenue) * 100 : 0;
  kpis.push({
    label: 'COGS %',
    value: formatPercentage(cogsPct),
    subtext: 'Cost of Goods Sold as % of revenue',
  });
  
  // Revenue per Member
  if (config.memberships > 0) {
    const revenuePerMember = avgAnnualRevenue / config.memberships;
    kpis.push({
      label: 'Revenue per Member',
      value: formatCurrency(revenuePerMember),
      subtext: 'Annual revenue per membership',
    });
  }
  
  return kpis;
}

/**
 * Calculates Racquet-specific KPIs.
 * 
 * KPIs: Avg Check, COGS %
 * 
 * @param config - Racquet operation configuration
 * @param results - Array of annual P&L results
 * @returns Array of Racquet KPIs
 */
function getRacquetKpis(
  _config: RacquetConfig,
  results: AnnualPnl[]
): OperationKpi[] {
  const kpis: OperationKpi[] = [];
  
  // Calculate average annual revenue and COGS across all years
  const totalRevenue = results.reduce((sum, pnl) => sum + pnl.revenueTotal, 0);
  const totalCogs = results.reduce((sum, pnl) => sum + pnl.cogsTotal, 0);
  const avgAnnualRevenue = results.length > 0 ? totalRevenue / results.length : 0;
  const avgAnnualCogs = results.length > 0 ? totalCogs / results.length : 0;
  
  // COGS % = (COGS / Revenue) × 100
  const cogsPct = avgAnnualRevenue > 0 ? (avgAnnualCogs / avgAnnualRevenue) * 100 : 0;
  kpis.push({
    label: 'COGS %',
    value: formatPercentage(cogsPct),
    subtext: 'Cost of Goods Sold as % of revenue',
  });
  
  return kpis;
}

/**
 * Calculates Retail-specific KPIs.
 * 
 * KPIs: Rent per sqm, GLA Occupancy
 * 
 * @param config - Retail operation configuration
 * @param results - Array of annual P&L results
 * @returns Array of Retail KPIs
 */
function getRetailKpis(
  config: RetailConfig,
  results: AnnualPnl[]
): OperationKpi[] {
  const kpis: OperationKpi[] = [];
  
  if (config.sqm <= 0) {
    return kpis; // Invalid sqm, skip KPI calculation
  }
  
  // Calculate average annual revenue across all years
  const totalRevenue = results.reduce((sum, pnl) => sum + pnl.revenueTotal, 0);
  const avgAnnualRevenue = results.length > 0 ? totalRevenue / results.length : 0;
  
  // Rent per sqm (annual)
  const rentPerSqm = avgAnnualRevenue / config.sqm;
  kpis.push({
    label: 'Rent per sqm',
    value: formatCurrency(rentPerSqm),
    subtext: 'Annual rent per square meter',
  });
  
  // GLA Occupancy (Gross Leasable Area Occupancy) = average occupancy × 100
  const avgOccupancy = config.occupancyByMonth.length > 0
    ? config.occupancyByMonth.reduce((sum, occ) => sum + occ, 0) / config.occupancyByMonth.length
    : 0;
  const glaOccupancy = avgOccupancy * 100;
  kpis.push({
    label: 'GLA Occupancy',
    value: formatPercentage(glaOccupancy),
    subtext: 'Gross Leasable Area Occupancy',
  });
  
  return kpis;
}

/**
 * Calculates Flex-specific KPIs.
 * 
 * KPIs: Rent per sqm, GLA Occupancy
 * 
 * @param config - Flex operation configuration
 * @param results - Array of annual P&L results
 * @returns Array of Flex KPIs
 */
function getFlexKpis(
  config: FlexConfig,
  results: AnnualPnl[]
): OperationKpi[] {
  const kpis: OperationKpi[] = [];
  
  if (config.sqm <= 0) {
    return kpis; // Invalid sqm, skip KPI calculation
  }
  
  // Calculate average annual revenue across all years
  const totalRevenue = results.reduce((sum, pnl) => sum + pnl.revenueTotal, 0);
  const avgAnnualRevenue = results.length > 0 ? totalRevenue / results.length : 0;
  
  // Rent per sqm (annual)
  const rentPerSqm = avgAnnualRevenue / config.sqm;
  kpis.push({
    label: 'Rent per sqm',
    value: formatCurrency(rentPerSqm),
    subtext: 'Annual rent per square meter',
  });
  
  // GLA Occupancy (Gross Leasable Area Occupancy) = average occupancy × 100
  const avgOccupancy = config.occupancyByMonth.length > 0
    ? config.occupancyByMonth.reduce((sum, occ) => sum + occ, 0) / config.occupancyByMonth.length
    : 0;
  const glaOccupancy = avgOccupancy * 100;
  kpis.push({
    label: 'GLA Occupancy',
    value: formatPercentage(glaOccupancy),
    subtext: 'Gross Leasable Area Occupancy',
  });
  
  return kpis;
}

/**
 * Calculates Wellness-specific KPIs.
 * 
 * KPIs: Revenue per Member
 * 
 * @param config - Wellness operation configuration
 * @param results - Array of annual P&L results
 * @returns Array of Wellness KPIs
 */
function getWellnessKpis(
  config: WellnessConfig,
  results: AnnualPnl[]
): OperationKpi[] {
  const kpis: OperationKpi[] = [];
  
  // Calculate average annual revenue across all years
  const totalRevenue = results.reduce((sum, pnl) => sum + pnl.revenueTotal, 0);
  const avgAnnualRevenue = results.length > 0 ? totalRevenue / results.length : 0;
  
  // Revenue per Member
  if (config.memberships > 0) {
    const revenuePerMember = avgAnnualRevenue / config.memberships;
    kpis.push({
      label: 'Revenue per Member',
      value: formatCurrency(revenuePerMember),
      subtext: 'Annual revenue per membership',
    });
  }
  
  // Note: Churn Rate is not applicable as we don't track churn in the model
  
  return kpis;
}

/**
 * Formats a number as currency string.
 * 
 * @param value - Numeric value to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
function formatCurrency(value: number): string {
  // Use Intl.NumberFormat for proper currency formatting
  // Default to USD, but can be extended to support project currency
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a number as percentage string.
 * 
 * @param value - Numeric value to format (e.g., 75.5 for 75.5%)
 * @returns Formatted percentage string (e.g., "75.50%")
 */
function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

