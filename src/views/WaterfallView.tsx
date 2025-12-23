import { DistributionChart } from '../components/charts/DistributionChart';
import { WaterfallTable } from '../components/WaterfallTable';
import type { WaterfallResult, WaterfallConfig, WaterfallTier } from '../domain/types';
import { formatPercent, formatMultiplier } from '../utils/formatters';
import { SectionCard } from '../components/ui/SectionCard';
import { InputGroup } from '../components/ui/InputGroup';
import { PercentageSlider } from '../components/inputs/PercentageSlider';
import { PercentageInput } from '../components/inputs/PercentageInput';
import { useTranslation } from '../contexts/LanguageContext';

// Extracted styles to reduce inline style noise
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        padding: '2rem',
        gap: '1.5rem',
    },
    header: {
        marginBottom: '0.5rem',
    },
    h1: {
        margin: 0,
        marginBottom: '0.5rem',
        fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
    },
    subtitle: {
        color: 'var(--text-secondary)',
        margin: 0,
        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
    },
    flexColumn: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1.5rem',
    },
    flexColumnSmall: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1rem',
    },
    tierCard: {
        padding: '1rem',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        backgroundColor: 'var(--surface)',
    },
    tierHeader: {
        marginBottom: '0.75rem',
    },
    tierTitle: {
        margin: 0,
        fontSize: '0.9375rem',
        fontWeight: 600,
        fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
    },
    select: {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        fontSize: '0.9375rem',
        backgroundColor: 'var(--surface)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
    },
    label: {
        display: 'block',
        marginBottom: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
    },
    inputItem: {
        marginBottom: '0.75rem',
    },
    kpiGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        flexShrink: 0,
    },
    card: {
        padding: '1.5rem',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
    },
    cardLabel: {
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        color: 'var(--text-secondary)',
        marginBottom: '0.5rem',
    },
    flexColumnMetrics: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.75rem',
    },
    metricLabel: {
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        marginBottom: '0.25rem',
    },
    metricValue: {
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    chartCard: {
        padding: '1.5rem',
        height: '400px',
        minHeight: '400px',
        maxHeight: '400px',
        flexShrink: 0,
        overflow: 'hidden',
    },
    chartTitle: {
        margin: 0,
        marginBottom: '1rem',
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
    },
    chartContainer: {
        width: '100%',
        height: 'calc(100% - 2.5rem)',
    },
};

interface WaterfallViewProps {
    waterfall: WaterfallResult;
    hasClawback: boolean;
    waterfallConfig?: WaterfallConfig;
    onWaterfallConfigChange?: (config: WaterfallConfig) => void;
}

export function WaterfallView({ waterfall, waterfallConfig, onWaterfallConfigChange }: WaterfallViewProps) {
    const { t } = useTranslation();

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
        <div className="waterfall-view" style={styles.container}>
            {/* Header */}
            <div className="view-header" style={styles.header}>
                <h1 style={styles.h1}>{t('waterfall.title')}</h1>
                <p style={styles.subtitle}>{t('waterfall.subtitle')}</p>
            </div>

            {/* Tier Configuration Section */}
            {waterfallConfig && waterfallConfig.tiers && waterfallConfig.tiers.length > 0 && (
                <SectionCard
                    title={t('waterfall.tierConfiguration')}
                    defaultExpanded={false}
                    className="tier-configuration"
                >
                    <div style={styles.flexColumn}>
                        {waterfallConfig.tiers.map((tier) => (
                            <div key={tier.id} style={styles.tierCard}>
                                <div style={styles.tierHeader}>
                                    <h4 style={styles.tierTitle}>
                                        {tier.id} ({tier.type})
                                    </h4>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <InputGroup label={t('waterfall.enableClawback')} helperText={t('waterfall.enableClawbackHelper')}>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={tier.enableClawback ?? false}
                                                    onChange={(e) => handleTierUpdate(tier.id, { enableClawback: e.target.checked })}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </InputGroup>
                                    </div>
                                </div>
                                {tier.type === 'preferred_return' && (
                                    <div style={styles.flexColumnSmall}>
                                        <InputGroup label={t('waterfall.calculationMethod')}>
                                            <select
                                                value={(tier as any).accumulationMethod === 'compound_interest' || (tier as any).calculationMethod === 'compound_interest' ? 'compound_interest' : 'irr_hurdle'}
                                                onChange={(e) => {
                                                    const method = e.target.value === 'compound_interest' ? 'compound_interest' : 'irr_hurdle';
                                                    handleTierUpdate(tier.id, {
                                                        accumulationMethod: method,
                                                    } as any);
                                                }}
                                                style={styles.select}
                                            >
                                                <option value="irr_hurdle">{t('waterfall.irrHurdle')}</option>
                                                <option value="compound_interest">{t('waterfall.compoundAccrual')}</option>
                                            </select>
                                        </InputGroup>

                                        {(tier as any).accumulationMethod === 'compound_interest' || (tier as any).calculationMethod === 'compound_interest' ? (
                                            <InputGroup
                                                label={t('waterfall.preferredReturnRate')}
                                                helperText={t('waterfall.preferredReturnRateHelper')}
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
                                                label={t('waterfall.hurdleIrr')}
                                                helperText={t('waterfall.hurdleIrrHelper')}
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
                                            <label style={styles.label}>
                                                {t('waterfall.distributionSplits')}:
                                            </label>
                                            {waterfallConfig?.equityClasses?.map((equityClass) => {
                                                const currentSplit = tier.distributionSplits[equityClass.id] ?? 0;
                                                return (
                                                    <div key={equityClass.id} style={styles.inputItem}>
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
                                    <div style={styles.flexColumnSmall}>
                                        <div>
                                            <label style={styles.label}>
                                                {t('waterfall.promoteDistributionSplits')}:
                                            </label>
                                            {waterfallConfig?.equityClasses?.map((equityClass) => {
                                                const currentSplit = tier.distributionSplits[equityClass.id] ?? 0;
                                                return (
                                                    <div key={equityClass.id} style={styles.inputItem}>
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

                                        <div>
                                            <InputGroup
                                                label={t('waterfall.catchUpPct')}
                                                helperText={t('waterfall.catchUpPctHelper')}
                                            >
                                                <PercentageInput
                                                    value={tier.catchUpPct ?? 0}
                                                    onChange={(value) => handleTierUpdate(tier.id, {
                                                        catchUpPct: value,
                                                    })}
                                                />
                                            </InputGroup>
                                        </div>

                                        {tier.enableCatchUp && (
                                            <div>
                                                <label style={styles.label}>
                                                    {t('waterfall.catchUpTargetSplits')}:
                                                </label>
                                                {waterfallConfig?.equityClasses?.map((equityClass) => {
                                                    const currentTarget = tier.catchUpTargetSplit?.[equityClass.id] ?? 0;
                                                    return (
                                                        <div key={equityClass.id} style={styles.inputItem}>
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
            <div style={styles.kpiGrid}>
                {waterfall.partners.map((partner) => (
                    <div key={partner.partnerId} className="card" style={styles.card}>
                        <div style={styles.cardLabel}>
                            {partner.partnerId.toUpperCase()}
                        </div>
                        <div style={styles.flexColumnMetrics}>
                            <div>
                                <div style={styles.metricLabel}>{t('financial.irr')}</div>
                                <div style={styles.metricValue}>
                                    {formatPercent(partner.irr)}
                                </div>
                            </div>
                            <div>
                                <div style={styles.metricLabel}>{t('financial.moic')}</div>
                                <div style={styles.metricValue}>
                                    {formatMultiplier(partner.moic)}
                                </div>
                            </div>
                        </div>
                        {waterfall.annualRows.some(row => (row.clawbackAdjustments?.[partner.partnerId] ?? 0) !== 0) && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.25rem 0.5rem',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid var(--warning)',
                                borderRadius: '4px',
                                color: 'var(--warning)',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                textTransform: 'uppercase'
                            }}>
                                {t('waterfall.clawback')} {t('common.active')}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Middle: DistributionChart (Stacked Bar: LP vs GP) */}
            <div className="card" style={styles.chartCard}>
                <h2 style={styles.chartTitle}>
                    {t('waterfall.distributionChart')}
                </h2>
                <div style={styles.chartContainer}>
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
