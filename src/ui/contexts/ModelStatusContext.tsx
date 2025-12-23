import { createContext, useContext, useState, type ReactNode, useCallback, useMemo } from 'react';

export type ModelStatus = 'idle' | 'computing' | 'syncing';

interface ModelStatusContextType {
    status: ModelStatus;
    setStatus: (status: ModelStatus) => void;
    lastUpdateTime: number | null;
}

const ModelStatusContext = createContext<ModelStatusContextType | undefined>(undefined);

export function ModelStatusProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<ModelStatus>('idle');
    const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

    const handleSetStatus = useCallback((newStatus: ModelStatus) => {
        setStatus(newStatus);
        if (newStatus === 'idle') {
            setLastUpdateTime(Date.now());
        }
    }, []);

    const value = useMemo(() => ({
        status,
        setStatus: handleSetStatus,
        lastUpdateTime
    }), [status, handleSetStatus, lastUpdateTime]);

    return (
        <ModelStatusContext.Provider value={value}>
            {children}
        </ModelStatusContext.Provider>
    );
}

export function useModelStatus() {
    const context = useContext(ModelStatusContext);
    if (context === undefined) {
        throw new Error('useModelStatus must be used within a ModelStatusProvider');
    }
    return context;
}
