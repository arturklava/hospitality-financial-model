import { useState } from 'react';
import { Save, Download, Eye, EyeOff, FolderOpen, FileText, Globe } from 'lucide-react';
import { useAudit } from '../../ui/contexts/AuditContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { MotionButton } from '../common/MotionButton';
import { ScenarioHubModal } from '../governance/ScenarioHubModal';
import { ExportDialog } from '../reports/ExportDialog';
import type { NamedScenario, FullModelOutput } from '../../domain/types';

interface HeaderProps {
    scenarioName: string;
    onScenarioNameChange?: (name: string) => void;
    onSave: () => void;
    onExport: () => void;
    onManageScenarios?: () => void;
    scenarios?: NamedScenario[];
    activeScenarioId?: string;
    onLoadScenario?: (scenarioId: string) => void;
    // Excel export props
    scenario?: NamedScenario;
    output?: FullModelOutput;
}

export function Header({
    scenarioName,
    onScenarioNameChange,
    onSave,
    onExport,
    onManageScenarios,
    scenarios,
    activeScenarioId,
    onLoadScenario,
    scenario,
    output,
}: HeaderProps) {
    const { isAuditMode, toggleAuditMode } = useAudit();
    const { t, language, toggleLanguage } = useTranslation();
    const { isGuest } = useAuth();
    const [isScenarioHubOpen, setIsScenarioHubOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isExcelGateOpen, setIsExcelGateOpen] = useState(false);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const handleSave = async () => {
        if (saveState === 'saving') return;

        setSaveState('saving');
        try {
            await Promise.resolve(onSave());
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 1500);
        } catch (error) {
            console.error(error);
            setSaveState('error');
            setTimeout(() => setSaveState('idle'), 2000);
        }
    };

    const getSaveLabel = () => {
        if (saveState === 'saving') {
            return language === 'pt' ? 'Salvando…' : 'Saving…';
        }
        if (saveState === 'saved') {
            return language === 'pt' ? 'Salvo!' : 'Saved!';
        }
        if (saveState === 'error') {
            return language === 'pt' ? 'Erro' : 'Error';
        }
        return t('common.save');
    };

    return (
        <>
            <header className="sticky-header">
                <div className="header-left">
                    <div className="scenario-info">
                        <span className="scenario-label">{t('common.scenario')}:</span>
                        {scenarios && scenarios.length > 0 && onLoadScenario ? (
                            <select
                                value={activeScenarioId || ''}
                                onChange={(e) => onLoadScenario(e.target.value)}
                                className="bg-transparent font-semibold text-slate-700 focus:ring-0 cursor-pointer"
                                style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: 'var(--radius)',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--surface)',
                                    cursor: 'pointer',
                                }}
                            >
                                {scenarios.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        ) : onScenarioNameChange ? (
                            <input
                                type="text"
                                className="scenario-name-input"
                                value={scenarioName}
                                onChange={(e) => onScenarioNameChange(e.target.value)}
                            />
                        ) : (
                            <span className="scenario-name">{scenarioName}</span>
                        )}
                    </div>
                </div>

                <div className="header-actions">
                    {/* Language Toggle */}
                    <MotionButton
                        className="btn btn-secondary"
                        onClick={toggleLanguage}
                        title={language === 'pt' ? 'Switch to English' : 'Mudar para Português'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            minWidth: '80px',
                        }}
                    >
                        <Globe size={18} />
                        <span>{language === 'pt' ? '🇧🇷 PT' : '🇺🇸 EN'}</span>
                    </MotionButton>

                    {(onManageScenarios || scenarios) && (
                        <MotionButton
                            className="btn btn-secondary"
                            onClick={() => setIsScenarioHubOpen(true)}
                            title={t('header.manageScenarios')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <FolderOpen size={18} />
                            <span>{t('header.manageScenarios')}</span>
                        </MotionButton>
                    )}
                    <MotionButton
                        className={`btn ${isAuditMode ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={toggleAuditMode}
                        title={isAuditMode ? 'Disable Inspector Mode' : 'Enable Inspector Mode'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        {isAuditMode ? <EyeOff size={18} /> : <Eye size={18} />}
                        <span>{t('header.inspector')}</span>
                    </MotionButton>
                    <MotionButton className="btn btn-secondary" onClick={onExport} title={t('header.exportJson')}>
                        <Download size={18} />
                        <span>{t('common.export')}</span>
                    </MotionButton>
                    {scenario && output && (
                        <MotionButton
                            className="btn btn-secondary"
                            onClick={() =>
                                isGuest ? setIsExcelGateOpen(true) : setIsExportDialogOpen(true)
                            }
                            title={t('header.exportExcel')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <FileText size={18} />
                            <span>{t('header.exportExcel')}</span>
                        </MotionButton>
                    )}
                    <MotionButton
                        className="btn btn-primary"
                        onClick={handleSave}
                        title={t('common.save')}
                        disabled={saveState === 'saving'}
                    >
                        <Save size={18} />
                        <span>{getSaveLabel()}</span>
                    </MotionButton>
                </div>
            </header>
            {(onManageScenarios || scenarios) && (
                <ScenarioHubModal
                    isOpen={isScenarioHubOpen}
                    onClose={() => setIsScenarioHubOpen(false)}
                    scenarios={scenarios || []}
                    activeScenarioId={activeScenarioId}
                    onSelectScenario={(_scenario) => {
                        if (onManageScenarios) {
                            onManageScenarios();
                        }
                        setIsScenarioHubOpen(false);
                    }}
                />
            )}
            {scenario && output && (
                <ExportDialog
                    isOpen={isExportDialogOpen}
                    onClose={() => setIsExportDialogOpen(false)}
                    scenario={scenario}
                    output={output}
                />
            )}
            {isExcelGateOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        style={{
                            background: 'var(--surface, #fff)',
                            borderRadius: 'var(--radius, 12px)',
                            padding: '1.5rem',
                            maxWidth: '420px',
                            width: '90%',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                            color: 'var(--text-primary, #0f172a)',
                        }}
                    >
                        <h3 style={{ marginBottom: '0.75rem', fontSize: '1.15rem', fontWeight: 700 }}>
                            {language === 'pt'
                                ? 'Exportação para Excel indisponível em modo demo'
                                : 'Excel export unavailable in demo mode'}
                        </h3>
                        <p style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
                            {language === 'pt'
                                ? 'Faça login para exportar seus cenários em Excel. No modo convidado, oferecemos apenas visualização e edição rápida.'
                                : 'Sign in to export your scenarios to Excel. In guest/demo mode, we provide view and quick editing only.'}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <MotionButton
                                className="btn btn-secondary"
                                onClick={() => setIsExcelGateOpen(false)}
                            >
                                {language === 'pt' ? 'Fechar' : 'Close'}
                            </MotionButton>
                            <MotionButton className="btn btn-primary" onClick={() => setIsExcelGateOpen(false)}>
                                {language === 'pt' ? 'Entrar' : 'Sign in'}
                            </MotionButton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

