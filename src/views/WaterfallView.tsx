import { DistributionChart } from '../components/charts/DistributionChart';
import { WaterfallTable } from '../components/WaterfallTable';
import type { WaterfallResult, WaterfallConfig, WaterfallTier } from '../domain/types';
import { formatPercent } from '../utils/formatters';
import { SectionCard } from '../components/ui/SectionCard';
import { InputGroup } from '../components/ui/InputGroup';
import { PercentageSlider } from '../components/inputs/PercentageSlider';

interface WaterfallViewProps {
    waterfall: WaterfallResult;
    hasClawback: boolean;
    waterfallConfig?: WaterfallConfig;
    onWaterfallConfigChange?: (config: WaterfallConfig) => void;
}

function formatNumber(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return value.toFixed(2);
}

function formatPercentSafe(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return formatPercent(value);
}

export function WaterfallView({ waterfall, waterfallConfig, onWaterfallConfigChange }: WaterfallViewProps) {
    const handleTierUpdate = (tierId: string, updates: Partial<WaterfallTier>) => {
        if (!waterfallConfig || !onWaterfallConfigChange) return;
        
        const updatedTiers = waterfallConfig.tiers?.map(tier =>
            tier.id === tierId ? { ...tier, ...updates } : tier
        ) ?? [];
        
        onWaterfallConfigChange({
            ...waterfallConfig,
            tiers: updatedTiers,
        });
    };

    return (
        <div className="waterfall-view" style={{ 
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            gap: '1.5rem'
        }}>
            {/* Header */}
            <div className="view-header" style={{ marginBottom: '0.5rem' }}>
                <h1 style={{ margin: 0, marginBottom: '0.5rem', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Waterfall Analysis</h1>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>Distribution of cash flows between GP and LP.</p>
            </div>

            {/* Tier Configuration Section */}
            {waterfallConfig && waterfallConfig.tiers && waterfallConfig.tiers.length > 0 && (
                <SectionCard 
                    title="Tier Configuration" 
                    defaultExpanded={false}
                    className="tier-configuration"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {waterfallConfig.tiers.map((tier) => (
                            <div key={tier.id} style={{
                                padding: '1rem',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                backgroundColor: 'var(--surface)',
                            }}>
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>
                                        {tier.id} ({tier.type})
                                    </h4>
                                </div>
                                {tier.type === 'preferred_return' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <InputGroup label="Calculation Method">
                                            <select
                                                value={(tier as any).accumulationMethod === 'compound_interest' || (tier as any).calculationMethod === 'compound_interest' ? 'compound_interest' : 'irr_hurdle'}
                                                onChange={(e) => {
                                                    const method = e.target.value === 'compound_interest' ? 'compound_interest' : 'irr_hurdle';
                                                    handleTierUpdate(tier.id, {
                                                        accumulationMethod: method,
                                                    } as any);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 'var(--radius)',
                                                    fontSize: '0.9375rem',
                                                    backgroundColor: 'var(--surface)',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                                                }}
                                            >
                                                <option value="irr_hurdle">IRR Hurdle</option>
                                                <option value="compound_interest">Compound Accrual</option>
                                            </select>
                                        </InputGroup>

                                        {(tier as any).accumulationMethod === 'compound_interest' || (tier as any).calculationMethod === 'compound_interest' ? (
                                            <InputGroup 
                                                label="Preferred Return Rate" 
                                                helperText="Annual rate for compound preference (e.g., 8% = 0.08)"
                                            >
                                                <PercentageSlider
                                                    value={tier.prefRate ?? tier.hurdleIrr ?? 0.08}
                                                    onChange={(value) => handleTierUpdate(tier.id, {
                                                        prefRate: value,
                                                        compoundPref: true,
                                                    })}
                                                    min={0}
                                                    max={0.5}
                                                    step={0.001}
                                                />
                                            </InputGroup>
                                        ) : (
                                            <InputGroup 
                                                label="Hurdle IRR" 
                                                helperText="Target IRR that must be achieved before promote tier (e.g., 8% = 0.08)"
                                            >
                                                <PercentageSlider
                                                    value={tier.hurdleIrr ?? 0.08}
                                                    onChange={(value) => handleTierUpdate(tier.id, {
                                                        hurdleIrr: value,
                                                    })}
                                                    min={0}
                                                    max={0.5}
                                                    step={0.001}
                                                />
                                            </InputGroup>
                                        )}

                                        <div>
                                            <label style={{
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: 'var(--text-secondary)',
                                                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                                            }}>
                                                Distribution Splits:
                                            </label>
                                            {waterfallConfig?.equityClasses?.map((equityClass) => {
                                                const currentSplit = tier.distributionSplits[equityClass.id] ?? 0;
                                                return (
                                                    <div key={equityClass.id} style={{ marginBottom: '0.75rem' }}>
                                                        <InputGroup label={`${equityClass.name} (${equityClass.id.toUpperCase()})`}>
                                                            <PercentageSlider
                                                                value={currentSplit}
                                                                onChange={(value) => {
                                                                    const newSplits = { ...tier.distributionSplits };
                                                                    newSplits[equityClass.id] = value;
                                                                    handleTierUpdate(tier.id, {
                                                                        distributionSplits: newSplits,
                                                                    });
                                                                }}
                                                                min={0}
                                                                max={1}
                                                                step={0.01}
                                                            />
                                                        </InputGroup>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {tier.type === 'promote' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label style={{
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: 'var(--text-secondary)',
                                                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                                            }}>
                                                Promote Distribution Splits:
                                            </label>
                                            {waterfallConfig?.equityClasses?.map((equityClass) => {
                                                const currentSplit = tier.distributionSplits[equityClass.id] ?? 0;
                                                return (
                                                    <div key={equityClass.id} style={{ marginBottom: '0.75rem' }}>
                                                        <InputGroup label={`${equityClass.name} (${equityClass.id.toUpperCase()})`}>
                                                            <PercentageSlider
                                                                value={currentSplit}
                                                                onChange={(value) => {
                                                                    const newSplits = { ...tier.distributionSplits };
                                                                    newSplits[equityClass.id] = value;
                                                                    handleTierUpdate(tier.id, {
                                                                        distributionSplits: newSplits,
                                                                    });
                                                                }}
                                                                min={0}
                                                                max={1}
                                                                step={0.01}
                                                            />
                                                        </InputGroup>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {tier.enableCatchUp && (
                                            <div>
                                                <label style={{
                                                    display: 'block',
                                                    marginBottom: '0.5rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 500,
                                                    color: 'var(--text-secondary)',
                                                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                                                }}>
                                                    Catch-Up Target Splits:
                                                </label>
                                                {waterfallConfig?.equityClasses?.map((equityClass) => {
                                                    const currentTarget = tier.catchUpTargetSplit?.[equityClass.id] ?? 0;
                                                    return (
                                                        <div key={equityClass.id} style={{ marginBottom: '0.75rem' }}>
                                                            <InputGroup label={`${equityClass.name} Target`}>
                                                                <PercentageSlider
                                                                    value={currentTarget}
                                                                    onChange={(value) => {
                                                                        const newTargets = { ...(tier.catchUpTargetSplit ?? {}) };
                                                                        newTargets[equityClass.id] = value;
                                                                        handleTierUpdate(tier.id, {
                                                                            catchUpTargetSplit: newTargets,
                                                                        });
                                                                    }}
                                                                    min={0}
                                                                    max={1}
                                                                    step={0.01}
                                                                />
                                                            </InputGroup>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Top: Summary KPIs (Cards) */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem',
                flexShrink: 0
            }}>
                {waterfall.partners.map((partner) => (
                    <div key={partner.partnerId} className="card" style={{ 
                        padding: '1.5rem',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                    }}>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--text-secondary)',
                            marginBottom: '0.5rem',
                        }}>
                            {partner.partnerId.toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '0.25rem',
                                }}>
                                    IRR
                                </div>
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                }}>
                                    {formatPercentSafe(partner.irr)}
                                </div>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '0.25rem',
                                }}>
                                    MOIC
                                </div>
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                }}>
                                    {formatNumber(partner.moic)}x
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Middle: DistributionChart (Stacked Bar: LP vs GP) */}
            <div className="card" style={{ 
                padding: '1.5rem',
                height: '400px',
                minHeight: '400px',
                maxHeight: '400px',
                flexShrink: 0,
                overflow: 'hidden'
            }}>
                <h2 style={{ 
                    margin: 0, 
                    marginBottom: '1rem',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                }}>
                    Distribution Chart (LP vs GP)
                </h2>
                <div style={{ width: '100%', height: 'calc(100% - 2.5rem)' }}>
                    <DistributionChart waterfallResult={waterfall} height={350} />
                </div>
            </div>

            {/* Bottom: Detailed WaterfallTable */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <WaterfallTable waterfall={waterfall} />
            </div>
        </div>
    );
}
