export type TabId = 'dashboard' | 'assumptions' | 'financials' | 'analysis' | 'simulation';

interface TabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'assumptions', label: 'Assumptions' },
  { id: 'financials', label: 'Financials' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'simulation', label: 'Simulation' },
];

export function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <div className="tabs-list">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`tab-trigger ${activeTab === tab.id ? 'active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

