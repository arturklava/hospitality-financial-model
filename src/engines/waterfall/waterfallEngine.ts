/**
 * Waterfall engine.
 * This will calculate distribution waterfalls for equity partners.
 * 
 * v0.2: Single-tier, percentage-based distribution
 * v0.3: Multi-tier waterfall with Return of Capital → Preferred Return → Promote
 * v0.5: Waterfall v2 with catch-up provisions
 * v0.6: Waterfall v3 with full clawback implementation
 */

import { irr, equityMultiple } from '@domain/financial';
import type {
  WaterfallConfig,
  WaterfallResult,
  PartnerDistributionSeries,
  AnnualWaterfallRow,
} from '@domain/types';

/**
 * Normalizes an array of percentages to sum to exactly 1.0.
 *
 * @param pcts - Array of percentages
 * @returns Normalized array that sums to 1.0
 */
function normalizePercentages(pcts: number[]): number[] {
  const sum = pcts.reduce((acc, pct) => acc + pct, 0);
  if (Math.abs(sum) < 1e-10) {
    // If sum is effectively zero, return equal distribution
    return pcts.map(() => 1 / pcts.length);
  }
  return pcts.map((pct) => pct / sum);
}

/**
 * Equity waterfall:
 * - v0.2 (single-tier): Simple percentage-based split using distributionPct (fallback: contributionPct)
 * - v0.3 (multi-tier): Return of Capital → Preferred Return → Promote
 * - Handles capital calls (negative owner CF) and distributions (positive owner CF).
 * - Guarantees for every year: sum(partner CFs) === owner CF (up to tiny rounding error).
 *
 * @param ownerCashFlows - Owner levered cash flows (Year 0..N)
 * @param config - Waterfall configuration
 * @returns Waterfall result with partner distributions and KPIs
 */
export function applyEquityWaterfall(
  ownerCashFlows: number[],
  config: WaterfallConfig
): WaterfallResult {
  const n = ownerCashFlows.length;

  // Validation: minimum length check
  if (n < 2) {
    console.warn('Waterfall: ownerCashFlows must have at least 2 entries (Year 0 and at least one distribution year)');
    // Return trivial waterfall
    return {
      ownerCashFlows,
      partners: [],
      annualRows: [],
    };
  }

  // Handle empty equity classes: default to single "Owner" class
  let classes = config.equityClasses;
  if (classes.length === 0) {
    classes = [
      {
        id: 'owner',
        name: 'Owner',
        contributionPct: 1.0,
        distributionPct: 1.0,
      },
    ];
  }

  // Check if multi-tier waterfall is enabled
  const useMultiTier = config.tiers && config.tiers.length > 0;

  if (useMultiTier) {
    return applyMultiTierWaterfall(ownerCashFlows, config, classes);
  } else {
    return applySingleTierWaterfall(ownerCashFlows, config, classes);
  }
}

/**
 * v0.2 single-tier waterfall: simple percentage-based distribution
 */
function applySingleTierWaterfall(
  ownerCashFlows: number[],
  _config: WaterfallConfig,
  classes: Array<{ id: string; name: string; contributionPct: number; distributionPct?: number }>
): WaterfallResult {
  const n = ownerCashFlows.length;

  // Precompute contribution and distribution percentages
  const contributionPcts = normalizePercentages(classes.map((cls) => cls.contributionPct));
  const distributionPcts = normalizePercentages(
    classes.map((cls) => cls.distributionPct ?? cls.contributionPct)
  );

  // Validate percentages are in (0, 1]
  for (let i = 0; i < classes.length; i++) {
    if (contributionPcts[i] <= 0 || contributionPcts[i] > 1) {
      throw new Error(`Invalid contributionPct for ${classes[i].id}: must be in (0, 1]`);
    }
    if (distributionPcts[i] <= 0 || distributionPcts[i] > 1) {
      throw new Error(`Invalid distributionPct for ${classes[i].id}: must be in (0, 1]`);
    }
  }

  // Initialize partner cash flows: partnerCashFlows[i][t] = cash flow for partner i in year t
  const partnerCashFlows: number[][] = [];
  for (let i = 0; i < classes.length; i++) {
    partnerCashFlows.push(new Array(n).fill(0));
  }

  // Loop over years and split owner cash flows
  for (let t = 0; t < n; t++) {
    const cf = ownerCashFlows[t];

    // Choose percentages: use contributionPct for capital calls (negative), distributionPct for distributions (positive)
    const pcts = cf < 0 ? contributionPcts : distributionPcts;

    let runningSum = 0;

    // Allocate to all partners except the last
    for (let i = 0; i < classes.length - 1; i++) {
      const share = cf * pcts[i];
      partnerCashFlows[i][t] = share;
      runningSum += share;
    }

    // Last partner gets the remainder to ensure exact sum
    const lastIndex = classes.length - 1;
    partnerCashFlows[lastIndex][t] = cf - runningSum;
  }

  return buildWaterfallResult(ownerCashFlows, classes, partnerCashFlows);
}

/**
 * v2.10: Applies compound preference logic.
 * 
 * Tracks preference account balance for each partner:
 * - Each year: balance = balance * (1 + rate) (compound interest)
 * - Distributions reduce the balance
 * - Tier is satisfied when balance <= 0
 * 
 * @param tier - Preferred return tier configuration
 * @param partnerIds - Array of partner IDs
 * @param prefAccountBalance - Preference account balance per partner (modified in place)
 * @param yearDistributions - Year distributions per partner (modified in place)
 * @param remainingDistribution - Remaining distribution to allocate (modified in place)
 * @param yearIndex - Current year index
 * @param unreturnedCapital - Unreturned capital per partner (used to initialize preference balance)
 */
function applyCompoundPref(
  tier: { prefRate?: number; distributionSplits: Record<string, number> },
  partnerIds: string[],
  prefAccountBalance: Record<string, number>,
  yearDistributions: Record<string, number>,
  remainingDistribution: number,
  yearIndex: number,
  unreturnedCapital: Record<string, number>
): number {
  if (tier.prefRate === undefined) {
    throw new Error('prefRate must be defined for compound preference');
  }
  
  const prefRate = tier.prefRate;
  
  // Normalize distribution splits
  const tierSplits: Record<string, number> = {};
  const splitValues = partnerIds.map((id) => tier.distributionSplits[id] ?? 0);
  const normalizedSplits = normalizePercentages(splitValues);
  for (let i = 0; i < partnerIds.length; i++) {
    tierSplits[partnerIds[i]] = normalizedSplits[i];
  }
  
  // Initialize preference account balance from unreturned capital (if not already initialized)
  // Preference balance starts from unreturned capital at Year 0
  if (yearIndex === 0) {
    for (const partnerId of partnerIds) {
      if (prefAccountBalance[partnerId] === 0 && unreturnedCapital[partnerId] < 0) {
        // Negative unreturned capital means capital contributed but not returned
        prefAccountBalance[partnerId] = Math.abs(unreturnedCapital[partnerId]);
      }
    }
  }
  
  // Accrue compound interest: balance = balance * (1 + rate)
  for (const partnerId of partnerIds) {
    if (prefAccountBalance[partnerId] > 0) {
      prefAccountBalance[partnerId] = prefAccountBalance[partnerId] * (1 + prefRate);
    }
  }
  
  // Allocate distributions to reduce preference account balance
  // Allocate according to tier splits until all balances are satisfied
  let remaining = remainingDistribution;
  
  // Calculate total preference balance that needs to be satisfied
  let totalPrefBalance = 0;
  for (const partnerId of partnerIds) {
    totalPrefBalance += prefAccountBalance[partnerId];
  }
  
  // Allocate distributions to satisfy preference balances
  let allocated = 0;
  if (totalPrefBalance > 0 && remaining > 0) {
    // Allocate to satisfy preference balances, prioritizing full satisfaction
    // If there's enough distribution, allocate the full balance to each partner
    let runningSum = 0;
    for (let i = 0; i < partnerIds.length - 1; i++) {
      const partnerId = partnerIds[i];
      // Allocate up to the preference balance, but don't exceed remaining distribution
      const share = Math.min(
        prefAccountBalance[partnerId],
        remaining - runningSum
      );
      yearDistributions[partnerId] = (yearDistributions[partnerId] ?? 0) + share;
      // Reduce preference balance by allocated amount
      prefAccountBalance[partnerId] = Math.max(0, prefAccountBalance[partnerId] - share);
      runningSum += share;
    }
    // Last partner gets remainder (capped at their preference balance)
    const lastPartnerId = partnerIds[partnerIds.length - 1];
    const lastShare = Math.min(
      remaining - runningSum,
      prefAccountBalance[lastPartnerId]
    );
    yearDistributions[lastPartnerId] = (yearDistributions[lastPartnerId] ?? 0) + lastShare;
    // Reduce preference balance by allocated amount
    prefAccountBalance[lastPartnerId] = Math.max(0, prefAccountBalance[lastPartnerId] - lastShare);
    
    allocated = runningSum + lastShare;
  }
  
  return allocated;
}

/**
 * v0.3 multi-tier waterfall: Return of Capital → Preferred Return → Promote
 * v0.5: Enhanced with catch-up provisions (Waterfall v2)
 * v0.6: Supports skipClawback flag for hypothetical liquidation calculations
 */
function applyMultiTierWaterfall(
  ownerCashFlows: number[],
  config: WaterfallConfig,
  classes: Array<{ id: string; name: string; contributionPct: number; distributionPct?: number }>,
  skipClawback: boolean = false // v0.6: Skip clawback for hypothetical calculations
): WaterfallResult {
  const n = ownerCashFlows.length;
  const tiers = config.tiers!;

  // Validate tiers
  if (tiers.length === 0) {
    throw new Error('Multi-tier waterfall requires at least one tier');
  }

  // Precompute contribution percentages (for capital calls and return of capital)
  const contributionPcts = normalizePercentages(classes.map((cls) => cls.contributionPct));
  const partnerIds = classes.map((cls) => cls.id);

  // Initialize partner cash flows
  const partnerCashFlows: number[][] = [];
  for (let i = 0; i < classes.length; i++) {
    partnerCashFlows.push(new Array(n).fill(0));
  }

  // Track unreturned capital per partner
  // unreturnedCapital[partnerId] = amount of capital partner still needs to get back
  // Negative values mean partner has contributed capital that hasn't been returned
  const unreturnedCapital: Record<string, number> = {};
  for (let i = 0; i < classes.length; i++) {
    unreturnedCapital[partnerIds[i]] = 0;
  }

  // v0.5: Track cumulative distributions for catch-up logic
  const cumulativeDistributions: Record<string, number> = {};
  for (let i = 0; i < classes.length; i++) {
    cumulativeDistributions[partnerIds[i]] = 0;
  }

  // v2.10: Track preference account balance for compound preference
  const prefAccountBalance: Record<string, number> = {};
  for (let i = 0; i < classes.length; i++) {
    prefAccountBalance[partnerIds[i]] = 0;
  }

  // Process each year
  for (let t = 0; t < n; t++) {
    const ownerCF = ownerCashFlows[t];

    // Handle capital calls (negative cash flows) using contributionPct
    if (ownerCF < 0) {
      let runningSum = 0;
      for (let i = 0; i < classes.length - 1; i++) {
        const share = ownerCF * contributionPcts[i];
        partnerCashFlows[i][t] = share;
        // Increase unreturned capital (share is negative, so we subtract to make it more negative)
        unreturnedCapital[partnerIds[i]] += Math.abs(share);
        runningSum += share;
      }
      const lastIndex = classes.length - 1;
      partnerCashFlows[lastIndex][t] = ownerCF - runningSum;
      unreturnedCapital[partnerIds[lastIndex]] += Math.abs(partnerCashFlows[lastIndex][t]);
      continue;
    }

    // Handle distributions (positive cash flows) using tier logic
    if (ownerCF > 0) {
      let remainingDistribution = ownerCF;
      const yearDistributions: Record<string, number> = {};
      for (const partnerId of partnerIds) {
        yearDistributions[partnerId] = 0;
      }

      // Apply tiers in order
      for (const tier of tiers) {
        if (remainingDistribution <= 0) break;

        if (tier.type === 'return_of_capital') {
          // Return of capital: distribute pro rata until all capital is returned
          // Calculate total unreturned capital
          let totalUnreturned = 0;
          for (const partnerId of partnerIds) {
            totalUnreturned += unreturnedCapital[partnerId];
          }

          if (totalUnreturned > 0 && remainingDistribution > 0) {
            // Distribute pro rata based on unreturned capital amounts in a single pass
            // Calculate shares for all partners first
            const shares: Record<string, number> = {};
            let totalShares = 0;

            for (let i = 0; i < classes.length; i++) {
              const partnerId = partnerIds[i];
              const unreturned = unreturnedCapital[partnerId];
              if (unreturned > 0) {
                // Pro rata share based on unreturned capital
                const proRataPct = unreturned / totalUnreturned;
                const share = Math.min(
                  remainingDistribution * proRataPct,
                  unreturned
                );
                shares[partnerId] = share;
                totalShares += share;
              } else {
                shares[partnerId] = 0;
              }
            }

            // Apply shares and update unreturned capital
            for (let i = 0; i < classes.length; i++) {
              const partnerId = partnerIds[i];
              const share = shares[partnerId];
              yearDistributions[partnerId] += share;
              unreturnedCapital[partnerId] -= share;
              remainingDistribution -= share;
            }
          }
        } else if (tier.type === 'preferred_return') {
          // v2.10: Check if compound preference is enabled
          const useCompoundPref = tier.compoundPref === true;
          
          if (useCompoundPref) {
            // v2.10: Compound preference logic
            if (tier.prefRate === undefined) {
              throw new Error('prefRate must be defined for compound preference');
            }
            
            // Apply compound preference: track balance, accrue interest, reduce with distributions
            const allocated = applyCompoundPref(
              tier,
              partnerIds,
              prefAccountBalance,
              yearDistributions,
              remainingDistribution,
              t,
              unreturnedCapital
            );
            
            // Reduce remaining distribution by allocated amount
            remainingDistribution -= allocated;
          } else {
            // Original IRR-based preferred return logic
            if (tier.hurdleIrr === undefined) {
              throw new Error(`Preferred return tier ${tier.id} must have hurdleIrr defined`);
            }

            // Normalize distribution splits for this tier
            const tierSplits: Record<string, number> = {};
            const splitValues = partnerIds.map((id) => tier.distributionSplits[id] ?? 0);
            const normalizedSplits = normalizePercentages(splitValues);
            for (let i = 0; i < partnerIds.length; i++) {
              tierSplits[partnerIds[i]] = normalizedSplits[i];
            }

            // Get current cash flows (before this year's distribution)
            const currentCashFlows: number[][] = [];
            for (let i = 0; i < classes.length; i++) {
              currentCashFlows.push([...partnerCashFlows[i].slice(0, t)]);
            }

            // Find LP partner (typically first partner, or partner with highest contribution)
            // For simplicity, assume first partner is LP
            const lpIndex = 0;

            // Compute current IRR for LP (before this year's distribution)
            const lpCurrentCF = [...currentCashFlows[lpIndex]];
            const lpCurrentIrr = irr(lpCurrentCF);

            // If hurdle is not yet met, allocate according to tier splits
            if (lpCurrentIrr === null || lpCurrentIrr < tier.hurdleIrr) {
              // Allocate remaining distribution according to tier splits
              // We'll allocate the full amount; the hurdle check happens year-by-year
              let runningSum = 0;
              for (let i = 0; i < classes.length - 1; i++) {
                const partnerId = partnerIds[i];
                const share = remainingDistribution * tierSplits[partnerId];
                yearDistributions[partnerId] += share;
                runningSum += share;
              }
              // Last partner gets remainder
              yearDistributions[partnerIds[classes.length - 1]] += remainingDistribution - runningSum;
              remainingDistribution = 0;
            }
            // If hurdle is already met, skip this tier (remaining goes to next tier)
          }
        } else if (tier.type === 'promote') {
          // Promote: allocate remaining distributions according to promote splits
          // v0.5: Check if catch-up is enabled and needed
          const enableCatchUp = tier.enableCatchUp === true;
          const catchUpTargetSplit = tier.catchUpTargetSplit;

          if (enableCatchUp && catchUpTargetSplit) {
            // Catch-up logic: allocate according to catchUpTargetSplit until catch-up is complete
            // Catch-up is complete when cumulative distribution ratio matches catchUpTargetSplit

            // Calculate current cumulative distribution totals (including this year's distributions so far)
            const currentCumulative: Record<string, number> = {};
            let totalCumulative = 0;
            for (const partnerId of partnerIds) {
              const cumul = cumulativeDistributions[partnerId] + (yearDistributions[partnerId] ?? 0);
              currentCumulative[partnerId] = cumul;
              totalCumulative += cumul;
            }

            // v0.9.2 FIX: Check if catch-up is needed with precision tolerance
            // Use small precision tolerance to handle floating-point errors
            const precisionTolerance = 1e-9;
            let catchUpNeeded = false;
            if (totalCumulative > 0) {
              for (const partnerId of partnerIds) {
                const targetPct = catchUpTargetSplit[partnerId] ?? 0;
                if (targetPct > 0) {
                  const currentPct = currentCumulative[partnerId] / totalCumulative;
                  // v0.9.2 FIX: Use precision tolerance to handle floating-point errors
                  if (Math.abs(currentPct - targetPct) > precisionTolerance) {
                    catchUpNeeded = true;
                    break;
                  }
                }
              }
            }

            if (catchUpNeeded && totalCumulative > 0) {
              // v0.9.1 FIX: Implement hard cap to prevent GP from exceeding target split
              // Normalize catch-up target splits
              const catchUpSplits: Record<string, number> = {};
              const splitValues = partnerIds.map((id) => catchUpTargetSplit[id] ?? 0);
              const normalizedCatchUpSplits = normalizePercentages(splitValues);
              for (let i = 0; i < partnerIds.length; i++) {
                catchUpSplits[partnerIds[i]] = normalizedCatchUpSplits[i];
              }

              // v0.9.2 FIX: Allocate catch-up with strict hard cap per partner
              // Calculate total distributions after allocating remaining (assumes all remaining is allocated)
              const totalDistributions = totalCumulative + remainingDistribution;
              
              // v0.9.2 FIX: Use precision tolerance for floating-point comparisons
              const precisionTolerance = 1e-9;
              
              let runningSum = 0;
              for (let i = 0; i < classes.length - 1; i++) {
                const partnerId = partnerIds[i];
                const targetPct = catchUpTargetSplit[partnerId] ?? 0;
                const catchUpSplit = catchUpSplits[partnerId];
                
                if (targetPct > 0 && catchUpSplit > 0 && remainingDistribution > precisionTolerance) {
                  const currentCatchUpDist = currentCumulative[partnerId];
                  
                  // v0.9.2 FIX: Strict hard cap calculation
                  // What would total distributions be if we allocate all remaining?
                  const targetCatchUpDist = totalDistributions * targetPct;
                  // Maximum this partner can receive to stay at target ratio
                  const maxCatchUp = Math.max(0, targetCatchUpDist - currentCatchUpDist);
                  
                  // Calculate share based on catch-up split, but STRICTLY cap it
                  const uncappedShare = remainingDistribution * catchUpSplit;
                  // v0.9.2 FIX: Strict enforcement - share = min(remainingDistribution, maxCatchUp)
                  const finalShare = Math.max(0, Math.min(uncappedShare, maxCatchUp));
                  
                  yearDistributions[partnerId] += finalShare;
                  runningSum += finalShare;
                }
              }
              
              // Last partner gets remainder (capped to their max)
              const lastPartnerId = partnerIds[classes.length - 1];
              const lastTargetPct = catchUpTargetSplit[lastPartnerId] ?? 0;
              const lastCatchUpSplit = catchUpSplits[lastPartnerId];
              const lastCurrentCatchUpDist = currentCumulative[lastPartnerId];
              
              if (lastTargetPct > 0 && lastCatchUpSplit > 0) {
                const lastTargetCatchUpDist = totalDistributions * lastTargetPct;
                const lastMaxCatchUp = Math.max(0, lastTargetCatchUpDist - lastCurrentCatchUpDist);
                const lastUncappedShare = remainingDistribution - runningSum;
                // v0.9.2 FIX: Strict cap enforcement for last partner
                // share = min(remainingDistribution, maxCatchUp)
                const lastShare = Math.max(0, Math.min(lastUncappedShare, lastMaxCatchUp));
                yearDistributions[lastPartnerId] += lastShare;
                runningSum += lastShare;
              } else {
                yearDistributions[lastPartnerId] += remainingDistribution - runningSum;
                runningSum = remainingDistribution;
              }
              
              remainingDistribution -= runningSum;

              // If there's remaining distribution after catch-up, it goes to promote split
              if (remainingDistribution > 0) {
                // Catch-up complete or max reached: use standard tier splits for remainder
                const tierSplits: Record<string, number> = {};
                const splitValues = partnerIds.map((id) => tier.distributionSplits[id] ?? 0);
                const normalizedSplits = normalizePercentages(splitValues);
                for (let i = 0; i < partnerIds.length; i++) {
                  tierSplits[partnerIds[i]] = normalizedSplits[i];
                }

                // Allocate remaining distribution
                let runningSum = 0;
                for (let i = 0; i < classes.length - 1; i++) {
                  const partnerId = partnerIds[i];
                  const share = remainingDistribution * tierSplits[partnerId];
                  yearDistributions[partnerId] += share;
                  runningSum += share;
                }
                // Last partner gets remainder
                yearDistributions[partnerIds[classes.length - 1]] += remainingDistribution - runningSum;
                remainingDistribution = 0;
              }
            } else {
              // Catch-up complete or not needed: use standard tier splits
              const tierSplits: Record<string, number> = {};
              const splitValues = partnerIds.map((id) => tier.distributionSplits[id] ?? 0);
              const normalizedSplits = normalizePercentages(splitValues);
              for (let i = 0; i < partnerIds.length; i++) {
                tierSplits[partnerIds[i]] = normalizedSplits[i];
              }

              // Allocate remaining distribution
              let runningSum = 0;
              for (let i = 0; i < classes.length - 1; i++) {
                const partnerId = partnerIds[i];
                const share = remainingDistribution * tierSplits[partnerId];
                yearDistributions[partnerId] += share;
                runningSum += share;
              }
              // Last partner gets remainder
              yearDistributions[partnerIds[classes.length - 1]] += remainingDistribution - runningSum;
              remainingDistribution = 0;
            }
          } else {
            // No catch-up: use standard tier splits (v0.3 behavior)
            const tierSplits: Record<string, number> = {};
            const splitValues = partnerIds.map((id) => tier.distributionSplits[id] ?? 0);
            const normalizedSplits = normalizePercentages(splitValues);
            for (let i = 0; i < partnerIds.length; i++) {
              tierSplits[partnerIds[i]] = normalizedSplits[i];
            }

            // Allocate remaining distribution
            let runningSum = 0;
            for (let i = 0; i < classes.length - 1; i++) {
              const partnerId = partnerIds[i];
              const share = remainingDistribution * tierSplits[partnerId];
              yearDistributions[partnerId] += share;
              runningSum += share;
            }
            // Last partner gets remainder
            yearDistributions[partnerIds[classes.length - 1]] += remainingDistribution - runningSum;
            remainingDistribution = 0;
          }
        }
      }

      // Apply year distributions to partner cash flows
      for (let i = 0; i < classes.length; i++) {
        const distribution = yearDistributions[partnerIds[i]];
        partnerCashFlows[i][t] = distribution;
        // v0.5: Update cumulative distributions (only positive distributions count for catch-up)
        if (distribution > 0) {
          cumulativeDistributions[partnerIds[i]] += distribution;
        }
        
        // v2.10: Update preference account balances after distributions (for compound preference)
        // Reduce preference account balance by distribution amount
        const partnerId = partnerIds[i];
        if (distribution > 0 && prefAccountBalance[partnerId] > 0) {
          prefAccountBalance[partnerId] = Math.max(0, prefAccountBalance[partnerId] - distribution);
        }
      }
    }
  }

  // v0.6: Apply clawback adjustments if enabled (skip for hypothetical calculations)
  if (!skipClawback) {
    applyClawbackAdjustments(ownerCashFlows, config, classes, partnerCashFlows, partnerIds);
  }

  return buildWaterfallResult(ownerCashFlows, classes, partnerCashFlows);
}

/**
 * v0.6: Applies clawback adjustments using hypothetical liquidation method.
 * 
 * For each tier with clawback enabled:
 * - Recalculates the waterfall hypothetically at the evaluation point
 * - Compares required distributions (from hypothetical recalculation) with actual distributions
 * - If GP received more than required: applies clawback adjustment
 * 
 * @param ownerCashFlows - Owner levered cash flows (Year 0..N)
 * @param config - Waterfall configuration
 * @param classes - Equity classes
 * @param partnerCashFlows - Actual partner cash flows (will be modified with clawback adjustments)
 * @param partnerIds - Partner IDs array
 */
function applyClawbackAdjustments(
  ownerCashFlows: number[],
  config: WaterfallConfig,
  classes: Array<{ id: string; name: string; contributionPct: number; distributionPct?: number }>,
  partnerCashFlows: number[][],
  partnerIds: string[]
): void {
  const tiers = config.tiers;
  if (!tiers || tiers.length === 0) {
    return; // No tiers, no clawback
  }

  // Find tiers with clawback enabled
  const clawbackTiers = tiers.filter(
    (tier) => tier.enableClawback === true && tier.clawbackMethod !== undefined
  );

  if (clawbackTiers.length === 0) {
    return; // No clawback enabled
  }

  const n = ownerCashFlows.length;

  // For each clawback tier, evaluate at the specified trigger points
  for (const tier of clawbackTiers) {
    const trigger = tier.clawbackTrigger ?? 'final_period';
    const method = tier.clawbackMethod ?? 'hypothetical_liquidation';

    if (method === 'hypothetical_liquidation') {
      if (trigger === 'final_period') {
        // Evaluate only at final period (Year N-1, which is the last year)
        applyClawbackAtPeriod(n - 1, ownerCashFlows, config, classes, partnerCashFlows, partnerIds, tier);
      } else if (trigger === 'annual') {
        // Evaluate at the end of each year (Years 1..N-1)
        for (let evalYear = 1; evalYear < n; evalYear++) {
          applyClawbackAtPeriod(evalYear, ownerCashFlows, config, classes, partnerCashFlows, partnerIds, tier);
        }
      }
    }
    // Note: 'lookback' method can be implemented similarly if needed
  }
}

/**
 * v0.6: Applies clawback adjustment at a specific evaluation period using hypothetical liquidation.
 * 
 * @param evalYear - Year index (0-based) at which to evaluate clawback
 * @param ownerCashFlows - Owner levered cash flows
 * @param config - Waterfall configuration
 * @param classes - Equity classes
 * @param partnerCashFlows - Actual partner cash flows (will be modified)
 * @param partnerIds - Partner IDs array
 * @param tier - Tier with clawback enabled
 */
function applyClawbackAtPeriod(
  evalYear: number,
  ownerCashFlows: number[],
  config: WaterfallConfig,
  classes: Array<{ id: string; name: string; contributionPct: number; distributionPct?: number }>,
  partnerCashFlows: number[][],
  partnerIds: string[],
  _tier: { id: string; type: string; distributionSplits: Record<string, number> } // v0.9.2: Currently unused, reserved for future tier-specific logic
): void {
  // Create hypothetical cash flows: all cash flows up to evalYear, then zero
  const hypotheticalCashFlows = ownerCashFlows.slice(0, evalYear + 1);

  // Recalculate waterfall hypothetically for this truncated cash flow series
  // v0.6: Skip clawback in hypothetical calculation to avoid recursion
  const hypotheticalResult = applyMultiTierWaterfall(
    hypotheticalCashFlows,
    config,
    classes,
    true // skipClawback = true
  );

  // v0.9 FIX: Calculate required cumulative distributions from hypothetical recalculation
  // Cumulative means sum of all cash flows from Year 0 through evalYear (inclusive)
  const requiredCumulative: Record<string, number> = {};
  for (let i = 0; i < classes.length; i++) {
    const partnerId = partnerIds[i];
    requiredCumulative[partnerId] = 0;
    for (let t = 0; t <= evalYear; t++) {
      requiredCumulative[partnerId] += hypotheticalResult.partners[i].cashFlows[t] ?? 0;
    }
  }

  // v0.9 FIX: Calculate actual cumulative distributions (from original waterfall run)
  // Cumulative means sum of all cash flows from Year 0 through evalYear (inclusive)
  const actualCumulative: Record<string, number> = {};
  for (let i = 0; i < classes.length; i++) {
    const partnerId = partnerIds[i];
    actualCumulative[partnerId] = 0;
    for (let t = 0; t <= evalYear; t++) {
      actualCumulative[partnerId] += partnerCashFlows[i][t] ?? 0;
    }
  }

  // Find GP partner (typically the partner with lower contribution percentage)
  // For simplicity, assume last partner is GP (or partner with smallest contributionPct)
  let gpIndex = classes.length - 1;
  let minContribution = classes[gpIndex].contributionPct;
  for (let i = 0; i < classes.length; i++) {
    if (classes[i].contributionPct < minContribution) {
      minContribution = classes[i].contributionPct;
      gpIndex = i;
    }
  }

  const gpId = partnerIds[gpIndex];
  const requiredGP = requiredCumulative[gpId] ?? 0;
  const actualGP = actualCumulative[gpId] ?? 0;

  // If GP received more than required, calculate clawback
  if (actualGP > requiredGP) {
    const clawbackAmount = actualGP - requiredGP;

    // Apply clawback adjustment in the evaluation year:
    // - Subtract from GP (negative cash flow)
    // - Add to LP (positive cash flow)
    // Note: We distribute the clawback to all non-GP partners pro rata based on contribution
    const contributionPcts = normalizePercentages(classes.map((cls) => cls.contributionPct));
    const totalNonGPContribution = contributionPcts.reduce((sum, pct, idx) => {
      return idx === gpIndex ? sum : sum + pct;
    }, 0);

    // Distribute clawback to non-GP partners pro rata
    let totalLPAdjustment = 0;
    for (let i = 0; i < classes.length; i++) {
      if (i !== gpIndex) {
        const share = (contributionPcts[i] / totalNonGPContribution) * clawbackAmount;
        partnerCashFlows[i][evalYear] += share;
        totalLPAdjustment += share;
      }
    }

    // Subtract clawback from GP
    partnerCashFlows[gpIndex][evalYear] -= clawbackAmount;

    // Verify invariant: sum of adjustments should be zero (GP loses, LPs gain)
    const adjustmentSum = totalLPAdjustment - clawbackAmount;
    if (Math.abs(adjustmentSum) > 0.01) {
      console.warn(
        `[Waterfall Engine] Clawback adjustment sum not zero: ${adjustmentSum.toFixed(2)} ` +
          `(LP adjustment: ${totalLPAdjustment.toFixed(2)}, GP clawback: ${clawbackAmount.toFixed(2)})`
      );
    }
  }
}

/**
 * Builds the final waterfall result from partner cash flows
 */
function buildWaterfallResult(
  ownerCashFlows: number[],
  classes: Array<{ id: string; name: string; contributionPct: number; distributionPct?: number }>,
  partnerCashFlows: number[][]
): WaterfallResult {
  const n = ownerCashFlows.length;

  // Build PartnerDistributionSeries[]
  const partners: PartnerDistributionSeries[] = classes.map((cls, i) => {
    const cashFlows = partnerCashFlows[i];

    // Calculate cumulative cash flows (prefix sums)
    const cumulativeCashFlows: number[] = [];
    let cumulative = 0;
    for (const cf of cashFlows) {
      cumulative += cf;
      cumulativeCashFlows.push(cumulative);
    }

    // Calculate IRR and MOIC
    const irrValue = irr(cashFlows);
    const moicValue = equityMultiple(cashFlows);

    return {
      partnerId: cls.id,
      cashFlows,
      cumulativeCashFlows,
      irr: irrValue,
      moic: moicValue,
    };
  });

  // Build AnnualWaterfallRow[]
  const annualRows: AnnualWaterfallRow[] = [];
  for (let t = 0; t < n; t++) {
    const row: AnnualWaterfallRow = {
      yearIndex: t,
      ownerCashFlow: ownerCashFlows[t],
      partnerDistributions: {},
    };

    classes.forEach((cls, i) => {
      row.partnerDistributions[cls.id] = partnerCashFlows[i][t] ?? 0;
    });

    // Invariant check: sum of partner CFs should equal owner CF
    const ownerCF = ownerCashFlows[t];
    const sumPartners = Object.values(row.partnerDistributions).reduce((sum, cf) => sum + cf, 0);
    const tolerance = 0.01; // Allow small floating-point differences
    const difference = Math.abs(ownerCF - sumPartners);

    if (difference > tolerance) {
      console.warn(
        `[Waterfall Engine] Invariant violation at yearIndex ${t}: ` +
          `ownerCF = ${ownerCF.toFixed(2)}, ` +
          `sumPartners = ${sumPartners.toFixed(2)}, ` +
          `difference = ${difference.toFixed(2)}`
      );
    }

    annualRows.push(row);
  }

  return {
    ownerCashFlows,
    partners,
    annualRows,
  };
}
