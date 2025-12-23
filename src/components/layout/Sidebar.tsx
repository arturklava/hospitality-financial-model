import {
    LayoutDashboard,
    Building2,
    Coins,
    Waves,
    AlertTriangle,
    ShieldCheck,
    User,
    PieChart,
    TrendingUp,
    Droplets,
    LogOut,
    LandPlot,
    Hammer,
    GitCompare,
    Receipt,
    DollarSign,
    BookOpen
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { SystemStatus } from './SystemStatus';
import { MotionButton } from '../common/MotionButton';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';

export type ViewId = 'dashboard' | 'operations' | 'capital' | 'waterfall' | 'risk' | 'liquidity' | 'governance' | 'portfolio' | 'reaas' | 'land' | 'construction' | 'comparison' | 'pnl' | 'cashflow' | 'glossary';

interface SidebarProps {
    activeView: ViewId;
    onViewChange: (view: ViewId) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
    const { user, signOut, isGuest, exitGuestMode } = useAuth();
    const { t } = useTranslation();

    // Map view IDs to translation keys
    const navItems: { id: ViewId; labelKey: TranslationKey; icon: React.ReactNode }[] = [
        { id: 'dashboard', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'operations', labelKey: 'nav.operations', icon: <Building2 size={20} /> },
        { id: 'land', labelKey: 'nav.land', icon: <LandPlot size={20} /> },
        { id: 'construction', labelKey: 'nav.construction', icon: <Hammer size={20} /> },
        { id: 'capital', labelKey: 'nav.capital', icon: <Coins size={20} /> },
        { id: 'waterfall', labelKey: 'nav.waterfall', icon: <Waves size={20} /> },
        { id: 'pnl', labelKey: 'nav.pnl', icon: <Receipt size={20} /> },
        { id: 'cashflow', labelKey: 'nav.cashflow', icon: <DollarSign size={20} /> },
        { id: 'risk', labelKey: 'nav.risk', icon: <AlertTriangle size={20} /> },
        { id: 'liquidity', labelKey: 'nav.liquidity', icon: <Droplets size={20} /> },
        { id: 'comparison', labelKey: 'nav.comparison', icon: <GitCompare size={20} /> },
        { id: 'governance', labelKey: 'nav.governance', icon: <ShieldCheck size={20} /> },
        { id: 'portfolio', labelKey: 'nav.portfolio', icon: <PieChart size={20} /> },
        { id: 'reaas', labelKey: 'nav.reaas', icon: <TrendingUp size={20} /> },
        { id: 'glossary', labelKey: 'nav.glossary', icon: <BookOpen size={20} /> },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo-icon">HFM</div>
                <div className="app-title">
                    <span className="title-main">Financial</span>
                    <span className="title-sub">Modeler</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <ul style={{ position: 'relative' }}>
                    {navItems.map((item) => (
                        <li key={item.id} style={{ position: 'relative' }}>
                            {activeView === item.id && (
                                <motion.div
                                    layoutId="activeNavBackground"
                                    className="active-nav-background"
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'var(--primary, #2196F3)',
                                        opacity: 0.1,
                                        borderRadius: 'var(--radius, 8px)',
                                        zIndex: 0,
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 300,
                                        damping: 30,
                                    }}
                                />
                            )}
                            <MotionButton
                                className={clsx('nav-item', activeView === item.id && 'active')}
                                onClick={() => onViewChange(item.id)}
                                style={{ position: 'relative', zIndex: 1 }}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{t(item.labelKey)}</span>
                            </MotionButton>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <SystemStatus />
                <div className="user-profile">
                    <div className="avatar">
                        <User size={16} />
                    </div>
                    <div className="user-info">
                        <span className="user-name">{isGuest ? t('common.guestUser') : (user?.email || 'User')}</span>
                        <span className="user-role">{t('common.enterpriseEdition')}</span>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (isGuest) {
                            exitGuestMode();
                        } else {
                            signOut();
                        }
                    }}
                    style={{
                        width: '100%',
                        marginTop: '0.75rem',
                        padding: '0.5rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--border-soft, #e2e8f0)',
                        borderRadius: 'var(--radius, 8px)',
                        color: 'var(--text-secondary, #64748b)',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-hover, #f8fafc)';
                        e.currentTarget.style.borderColor = 'var(--border, #cbd5e1)';
                        e.currentTarget.style.color = 'var(--text-primary, #1e293b)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'var(--border-soft, #e2e8f0)';
                        e.currentTarget.style.color = 'var(--text-secondary, #64748b)';
                    }}
                >
                    <LogOut size={16} />
                    {t('common.signOut')}
                </button>
            </div>
        </aside>
    );
}

