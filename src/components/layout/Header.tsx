import { useState } from 'react';
import { Save, Download, Eye, EyeOff, FileUp, FolderOpen, FileText } from 'lucide-react';
import { useAudit } from '../../ui/contexts/AuditContext';
import { MotionButton } from '../common/MotionButton';
import { ImportModal } from '../io/ImportModal';
import { ScenarioHubModal } from '../governance/ScenarioHubModal';
import { ExportDialog } from '../reports/ExportDialog';
import type { NamedScenario, FullModelOutput } from '../../domain/types';

interface HeaderProps {
    scenarioName: string;
    onScenarioNameChange?: (name: string) => void;
    onSave: () => void;
    onExport: () => void;
    onImport?: (scenario: NamedScenario) => void;
    onManageScenarios?: () => void;
    scenarios?: NamedScenario[];
    activeScenarioId?: string;
    onLoadScenario?: (scenarioId: string) => void;
    // Excel export props
    scenario?: NamedScenario;
    output?: FullModelOutput;
    // Guest mode indicator
    isGuest?: boolean;
}

export function Header({
    scenarioName,
    onScenarioNameChange,
    onSave,
    onExport,
    onImport,
    onManageScenarios,
    scenarios,
    activeScenarioId,
    onLoadScenario,
    scenario,
    output,
    isGuest = false,
}: HeaderProps) {
    const { isAuditMode, toggleAuditMode } = useAudit();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isScenarioHubOpen, setIsScenarioHubOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

    const handleImport = (scenario: NamedScenario) => {
        if (onImport) {
            onImport(scenario);
        }
        setIsImportModalOpen(false);
    };

    return (
        <>
            <header className="sticky-header">
                <div className="header-left">
                    <div className="scenario-info">
                        <span className="scenario-label">Scenario:</span>
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
                    {isGuest && (
                        <div style={{
                            marginLeft: '1rem',
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            border: '1px solid #fde68a',
                        }}>
                            Guest Mode - Data not saved to cloud
                        </div>
                    )}
                </div>

                <div className="header-actions">
                    {(onManageScenarios || scenarios) && (
                        <MotionButton
                            className="btn btn-secondary"
                            onClick={() => setIsScenarioHubOpen(true)}
                            title="Manage Scenarios"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <FolderOpen size={18} />
                            <span>Manage Scenarios</span>
                        </MotionButton>
                    )}
                    {onImport && (
                        <MotionButton
                            className="btn btn-secondary"
                            onClick={() => setIsImportModalOpen(true)}
                            title="Import from Excel"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <FileUp size={18} />
                            <span>Import Excel</span>
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
                        <span>Inspector</span>
                    </MotionButton>
                    <MotionButton className="btn btn-secondary" onClick={onExport} title="Export JSON">
                        <Download size={18} />
                        <span>Export</span>
                    </MotionButton>
                    {scenario && output && (
                        <MotionButton
                            className="btn btn-secondary"
                            onClick={() => setIsExportDialogOpen(true)}
                            title="Export Investment Memo to Excel"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <FileText size={18} />
                            <span>Export Excel</span>
                        </MotionButton>
                    )}
                    <MotionButton className="btn btn-primary" onClick={onSave} title="Save">
                        <Save size={18} />
                        <span>Save</span>
                    </MotionButton>
                </div>
            </header>
            {onImport && (
                <ImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleImport}
                />
            )}
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
                        // TODO: Load selected scenario's modelConfig if needed
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
