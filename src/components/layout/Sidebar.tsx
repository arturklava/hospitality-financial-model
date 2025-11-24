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

export type ViewId = 'dashboard' | 'operations' | 'capital' | 'waterfall' | 'risk' | 'liquidity' | 'governance' | 'portfolio' | 'reaas' | 'land' | 'construction' | 'comparison' | 'pnl' | 'cashflow' | 'glossary';

interface SidebarProps {
    activeView: ViewId;
    onViewChange: (view: ViewId) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
    const { user, signOut, isGuest, exitGuestMode } = useAuth();
    
    const navItems: { id: ViewId; label: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'operations', label: 'Operations', icon: <Building2 size={20} /> },
        { id: 'land', label: 'Land', icon: <LandPlot size={20} /> },
        { id: 'construction', label: 'Construction', icon: <Hammer size={20} /> },
        { id: 'capital', label: 'Capital', icon: <Coins size={20} /> },
        { id: 'waterfall', label: 'Waterfall', icon: <Waves size={20} /> },
        { id: 'pnl', label: 'P&L Statement', icon: <Receipt size={20} /> },
        { id: 'cashflow', label: 'Cash Flow', icon: <DollarSign size={20} /> },
        { id: 'risk', label: 'Risk', icon: <AlertTriangle size={20} /> },
        { id: 'liquidity', label: 'Liquidity', icon: <Droplets size={20} /> },
        { id: 'comparison', label: 'Comparison', icon: <GitCompare size={20} /> },
        { id: 'governance', label: 'Governance', icon: <ShieldCheck size={20} /> },
        { id: 'portfolio', label: 'Portfolio', icon: <PieChart size={20} /> },
        { id: 'reaas', label: 'REaaS', icon: <TrendingUp size={20} /> },
        { id: 'glossary', label: 'Glossary', icon: <BookOpen size={20} /> },
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
                                <span className="nav-label">{item.label}</span>
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
                        <span className="user-name">{isGuest ? 'Guest User' : (user?.email || 'User')}</span>
                        <span className="user-role">Enterprise Edition</span>
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
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
