import { useState, useEffect } from 'react';
import type { OperationConfig, FullModelOutput } from '../domain/types';
import { MasterDetailLayout } from '../components/layout/MasterDetailLayout';
import { OperationList } from '../components/operations/OperationList';
import { OperationKpiCards } from '../components/operations/OperationKpiCards';
import { AssetWaterfallChart } from '../components/operations/AssetWaterfallChart';
import { OperationEditor } from '../components/operations/OperationEditor';
import { getOperationIcon } from '../components/operations/OperationList';
import { useTranslation } from '../contexts/LanguageContext';

interface OperationsViewProps {
  operations: OperationConfig[];
  onOperationsChange?: (operations: OperationConfig[]) => void;
  onAddOperation?: (type: string) => string;
  onRemoveOperation?: (id: string) => void;
  modelOutput?: FullModelOutput;
}

export function OperationsView({
  operations,
  onOperationsChange,
  onAddOperation,
  onRemoveOperation,
  modelOutput,
}: OperationsViewProps) {
  const { t } = useTranslation();
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(
    operations.length > 0 ? operations[0].id : null
  );

  // Update selected operation when operations list changes
  useEffect(() => {
    if (operations.length > 0) {
      // If currently selected ID is not in the list (e.g. was deleted), select the first one
      const currentSelected = operations.find((op) => op.id === selectedOperationId);
      if (!currentSelected) {
        setSelectedOperationId(operations[0].id);
      }
    } else {
      setSelectedOperationId(null);
    }
  }, [operations, selectedOperationId]);

  const selectedOperation = operations.find((op) => op.id === selectedOperationId);

  const getOperationTypeLabel = (type: string): string => {
    return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handleOperationChange = (updates: Partial<OperationConfig>) => {
    if (!selectedOperation || !onOperationsChange) return;

    const updatedOperations: OperationConfig[] = operations.map((op) => {
      if (op.id === selectedOperation.id) {
        // Type assertion is safe because we're preserving the operation structure
        // and only updating fields that are compatible with the operation type
        return { ...op, ...updates } as OperationConfig;
      }
      return op;
    });

    onOperationsChange(updatedOperations);
  };

  const handleActiveToggle = (isActive: boolean) => {
    handleOperationChange({ isActive });
  };

  const handleAddAsset = (operationType?: string) => {
    if (onAddOperation) {
      const newId = onAddOperation(operationType || 'HOTEL');
      // Set selected ID immediately - the effect will confirm it once operations prop updates
      setSelectedOperationId(newId);
    }
  };



  // Master Panel: OperationList
  const masterPanel = (
    <OperationList
      operations={operations}
      selectedOperationId={selectedOperationId}
      onSelectOperation={setSelectedOperationId}
      onAddAsset={onAddOperation ? handleAddAsset : undefined}

      onRemoveOperation={onRemoveOperation}
    />
  );

  // Detail Panel: Command Center
  const detailPanel = selectedOperation ? (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {(() => {
              const Icon = getOperationIcon(selectedOperation.operationType);
              return <Icon size={28} style={{ color: 'var(--primary)' }} />;
            })()}
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.75rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)',
                }}
              >
                {selectedOperation.name}
              </h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
                {getOperationTypeLabel(selectedOperation.operationType)}
              </p>
            </div>
          </div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={selectedOperation.isActive !== false}
              onChange={(e) => handleActiveToggle(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
              }}
            />
            <span style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}>
              {t('common.active')}
            </span>
          </label>
        </div>
      </div>

      {/* Command Center Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Row 1: Operation-Specific KPI Cards */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <OperationKpiCards
            operation={selectedOperation}
            modelOutput={modelOutput}
          />
        </div>

        {/* Row 2: AssetWaterfallChart */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <h2 style={{
            margin: 0,
            marginBottom: '1rem',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {t('operations.revenueBreakdown')}
          </h2>
          <AssetWaterfallChart
            operation={selectedOperation}
            modelOutput={modelOutput}
            height={300}
          />
        </div>

        {/* Row 3: OperationEditor */}
        <div
          style={{
            padding: '2rem',
          }}
        >
          <OperationEditor
            operation={selectedOperation}
            onChange={handleOperationChange}
          />
        </div>
      </div>
    </div>
  ) : (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
          {t('operations.selectAsset')}
        </p>
        <p style={{ fontSize: '0.875rem' }}>
          {t('operations.selectAssetDescription')}
        </p>
      </div>
    </div>
  );

  return (
    <MasterDetailLayout
      master={masterPanel}
      detail={detailPanel}
      masterWidth="300px"
    />
  );
}
