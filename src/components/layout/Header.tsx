import { useState } from 'react';
import { Save, Download, Eye, EyeOff, FolderOpen, FileText, Globe } from 'lucide-react';
import { useAudit } from '../../ui/contexts/AuditContext';
import { useTranslation } from '../../contexts/LanguageContext';
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
    const [isScenarioHubOpen, setIsScenarioHubOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

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
                            onClick={() => setIsExportDialogOpen(true)}
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
                    <MotionButton className="btn btn-primary" onClick={onSave} title={t('common.save')}>
                        <Save size={18} />
                        <span>{t('common.save')}</span>
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
        </>
    );
}

