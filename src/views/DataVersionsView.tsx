
import { useState } from 'react';
import type { SavedScenario } from '../domain/types';
import { VersionTimeline } from '../components/governance/VersionTimeline';
import { RestorePreviewModal } from '../components/governance/RestorePreviewModal';

interface DataVersionsViewProps {
    versions: SavedScenario[];
    onLoadVersion: (versionId: string) => void;
    currentVersionId?: string;
}

export function DataVersionsView({ 
    versions, 
    onLoadVersion, 
    currentVersionId 
}: DataVersionsViewProps) {
    const [previewVersion, setPreviewVersion] = useState<SavedScenario | null>(null);
    const [currentVersion, setCurrentVersion] = useState<SavedScenario | null>(null);

    const handlePreview = (version: SavedScenario) => {
        // Find current version from versions list
        const current = versions.find(v => v.id === currentVersionId) || null;
        setCurrentVersion(current);
        setPreviewVersion(version);
    };

    const handleRestore = (version: SavedScenario) => {
        // Find current version from versions list
        const current = versions.find(v => v.id === currentVersionId) || null;
        setCurrentVersion(current);
        setPreviewVersion(version);
    };

    const handleConfirmRestore = () => {
        if (previewVersion) {
            onLoadVersion(previewVersion.id);
            setPreviewVersion(null);
            setCurrentVersion(null);
        }
    };

    const handleCloseModal = () => {
        setPreviewVersion(null);
        setCurrentVersion(null);
    };

    return (
        <>
            <div className="versions-view">
                <div className="view-header" style={{ marginBottom: '2rem' }}>      
                    <h1 style={{ fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>Version History</h1>
                    <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>Manage saved scenarios and model versions.</p>                                                    
                </div>

                <div className="card">
                    <VersionTimeline
                        versions={versions}
                        currentVersionId={currentVersionId}
                        onPreview={handlePreview}
                        onRestore={handleRestore}
                    />
                </div>
            </div>

            {previewVersion && (
                <RestorePreviewModal
                    isOpen={!!previewVersion}
                    currentVersion={currentVersion}
                    selectedVersion={previewVersion}
                    onClose={handleCloseModal}
                    onConfirmRestore={handleConfirmRestore}
                />
            )}
        </>
    );
}
