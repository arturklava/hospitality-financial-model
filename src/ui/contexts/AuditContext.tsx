import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuditContextType {
  isAuditMode: boolean;
  toggleAuditMode: () => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export function AuditProvider({ children }: { children: ReactNode }) {
  const [isAuditMode, setIsAuditMode] = useState(false);

  const toggleAuditMode = () => {
    setIsAuditMode((prev) => !prev);
  };

  return (
    <AuditContext.Provider value={{ isAuditMode, toggleAuditMode }}>
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit() {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
}

