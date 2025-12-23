/**
 * Land View component (v5.0).
 * 
 * Displays land acquisition configuration with payment schedule visualization.
 */

import { useState, useMemo } from 'react';
import { MasterDetailLayout } from '../components/layout/MasterDetailLayout';
import { SectionCard } from '../components/ui/SectionCard';
import { InputGroup } from '../components/ui/InputGroup';
import { CurrencyInput } from '../components/inputs/CurrencyInput';
import { getLocaleConfig } from '../utils/formatters';
import type { FullModelInput, LandConfig } from '../domain/types';
import { useTranslation } from '../contexts/LanguageContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface LandViewProps {
  input: FullModelInput;
  onProjectConfigChange?: (config: Partial<FullModelInput['projectConfig']>) => void;
}

/**
 * Formats a number as currency.
 */
function formatCurrency(value: number, language: 'pt' | 'en'): string {
  const { locale, currency } = getLocaleConfig(language);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function LandView({ input, onProjectConfigChange }: LandViewProps) {
  const projectConfig = input.projectConfig;
  const landConfigs = projectConfig.landConfigs || [];
  const { t, language } = useTranslation();
  const [selectedLandId, setSelectedLandId] = useState<string | null>(
    landConfigs.length > 0 ? landConfigs[0].id : null
  );

  const selectedLand = landConfigs.find((land) => land.id === selectedLandId);
  const selectedInstallments = selectedLand?.installments ?? [];

  const sanitizedInstallments = useMemo(() => {
    if (!selectedInstallments) return [];

    return selectedInstallments
      .map((installment) => ({
        ...installment,
        month: Number.isFinite(installment.month)
          ? Math.round(installment.month)
          : 0,
        amount: Math.max(0, installment.amount || 0),
        description: installment.description?.trim() || '',
      }))
      .filter((installment) => installment.amount > 0);
  }, [selectedInstallments]);

  // Calculate payment schedule for selected land
  const paymentSchedule = useMemo(() => {
    if (!selectedLand) return [];

    const schedule: Array<{ month: number; monthLabel: string; amount: number; type: string }> = [];

    // Down payment
    if (selectedLand.downPayment > 0) {
      schedule.push({
        month: selectedLand.downPaymentMonth,
        monthLabel: `${t('common.month')} ${selectedLand.downPaymentMonth}`,
        amount: selectedLand.downPayment,
        type: t('land.downPayment'),
      });
    }

    // Installments
    if (sanitizedInstallments.length > 0) {
      sanitizedInstallments.forEach((installment) => {
        schedule.push({
          month: installment.month,
          monthLabel: `${t('common.month')} ${installment.month}`,
          amount: installment.amount,
          type: installment.description || t('land.installment'),
        });
      });
    }

    // Barter payment
    if (selectedLand.barterValue && selectedLand.barterValue > 0 && selectedLand.barterMonth !== undefined) {
      const barterAmount = selectedLand.totalCost * selectedLand.barterValue;
      schedule.push({
        month: selectedLand.barterMonth,
        monthLabel: `${t('common.month')} ${selectedLand.barterMonth}`,
        amount: barterAmount,
        type: t('land.swap'),
      });
    }

    // Sort by month
    return schedule.sort((a, b) => a.month - b.month);
  }, [sanitizedInstallments, selectedLand, t]);

  const updateLandConfig = (landId: string, updates: Partial<LandConfig>) => {
    if (!onProjectConfigChange) return;

    const updatedLandConfigs = landConfigs.map((land) => {
      if (land.id === landId) {
        return { ...land, ...updates };
      }
      return land;
    });

    onProjectConfigChange({ landConfigs: updatedLandConfigs });
  };

  const handleLandChange = (updates: Partial<LandConfig>) => {
    if (!selectedLand) return;

    updateLandConfig(selectedLand.id, updates);
  };

  const handleAddLand = () => {
    if (!onProjectConfigChange) return;

    const newLand: LandConfig = {
      id: `land-${Date.now()}`,
      name: t('land.defaultName'),
      totalCost: 0,
      acquisitionMonth: -12,
      downPayment: 0,
      downPaymentMonth: -12,
      barterValue: 0,
    };

    const updatedLandConfigs = [...landConfigs, newLand];
    setSelectedLandId(newLand.id);
    onProjectConfigChange({ landConfigs: updatedLandConfigs });
  };

  const handleDeleteLand = (landId: string) => {
    if (!onProjectConfigChange) return;

    const confirmDelete = window.confirm(t('land.deleteConfirm'));
    if (!confirmDelete) return;

    const updatedLandConfigs = landConfigs.filter((land) => land.id !== landId);
    onProjectConfigChange({ landConfigs: updatedLandConfigs });

    if (selectedLandId === landId) {
      setSelectedLandId(updatedLandConfigs[0]?.id ?? null);
    }
  };

  const handleDuplicateLand = (landId: string) => {
    if (!onProjectConfigChange) return;

    const sourceLand = landConfigs.find((land) => land.id === landId);
    if (!sourceLand) return;

    const duplicateLand: LandConfig = {
      ...sourceLand,
      id: `land-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${sourceLand.name} ${t('land.copySuffix')}`.trim(),
    };

    const updatedLandConfigs = [...landConfigs, duplicateLand];
    onProjectConfigChange({ landConfigs: updatedLandConfigs });
    setSelectedLandId(duplicateLand.id);
  };

  const handleAddInstallment = () => {
    if (!selectedLand) return;

    const currentInstallments = selectedLand.installments || [];
    const newInstallment = {
      month: selectedLand.acquisitionMonth ?? 0,
      amount: 0,
      description: '',
    };

    handleLandChange({ installments: [...currentInstallments, newInstallment] });
  };

  const handleInstallmentChange = (
    index: number,
    field: 'month' | 'amount' | 'description',
    value: number | string
  ) => {
    if (!selectedLand) return;

    const currentInstallments = selectedLand.installments || [];
    const updatedInstallments = currentInstallments.map((installment, idx) => {
      if (idx !== index) return installment;

      if (field === 'month') {
        return { ...installment, month: Math.round(Number(value) || 0) };
      }

      if (field === 'amount') {
        return { ...installment, amount: Math.max(0, Number(value) || 0) };
      }

      return { ...installment, description: (value as string) ?? '' };
    });

    handleLandChange({ installments: updatedInstallments });
  };

  const handleRemoveInstallment = (index: number) => {
    if (!selectedLand) return;

    const currentInstallments = selectedLand.installments || [];
    const updatedInstallments = currentInstallments.filter((_, idx) => idx !== index);
    handleLandChange({ installments: updatedInstallments });
  };

  // Master Panel: Land List
  const masterPanel = (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>
          {t('land.landAcquisitions')}
        </h3>
        <button
          onClick={handleAddLand}
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: 500,
            fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
          }}
        >
          {t('land.addLand')}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {landConfigs.map((land) => {
          const isSelected = selectedLandId === land.id;

          return (
            <div
              key={land.id}
              data-testid={`land-card-${land.id}`}
              onClick={() => setSelectedLandId(land.id)}
              style={{
                padding: '0.75rem',
                backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <input
                type="text"
                value={land.name}
                data-testid={`land-name-${land.id}`}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updateLandConfig(land.id, { name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  backgroundColor: 'var(--surface)',
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
                  {formatCurrency(land.totalCost, language)}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateLand(land.id);
                    }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                    }}
                  >
                    {t('common.duplicate')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLand(land.id);
                    }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--error)',
                      fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {landConfigs.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
            {t('land.noLandConfigured')}
          </div>
        )}
      </div>
    </div>
  );

  // Detail Panel: Land Editor
  const detailPanel = selectedLand ? (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>
          {selectedLand.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
          {t('land.configureDetails')}
        </p>
      </div>

      {/* Acquisition Details */}
      <SectionCard title={t('land.acquisitionDetails')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <InputGroup label={t('land.landName')} required>
            <input
              type="text"
              value={selectedLand.name}
              onChange={(e) => handleLandChange({ name: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              }}
            />
          </InputGroup>

          <InputGroup label={t('land.totalAcquisitionCost')} required>
            <CurrencyInput
              value={selectedLand.totalCost}
              onChange={(value) => handleLandChange({ totalCost: value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              }}
            />
          </InputGroup>

          <InputGroup label={t('land.acquisitionMonth')} helperText={t('land.negativeBeforeYear0')}>
            <input
              type="number"
              value={selectedLand.acquisitionMonth}
              onChange={(e) => handleLandChange({ acquisitionMonth: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              }}
            />
          </InputGroup>
        </div>
      </SectionCard>

      {/* Payment Structure */}
      <SectionCard title={t('land.paymentStructure')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <InputGroup label={t('land.downPayment')} required>
            <CurrencyInput
              value={selectedLand.downPayment}
              onChange={(value) => handleLandChange({ downPayment: value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              }}
            />
          </InputGroup>

          <InputGroup label={t('land.downPaymentMonth')}>
            <input
              type="number"
              step="1"
              value={selectedLand.downPaymentMonth}
              onChange={(e) => handleLandChange({ downPaymentMonth: parseInt(e.target.value, 10) || 0 })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              }}
            />
          </InputGroup>

          <InputGroup
            label={t('land.barterPercent')}
            helperText={t('land.barterPercentHelper')}
          >
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={selectedLand.barterValue || 0}
              onChange={(e) => handleLandChange({ barterValue: parseFloat(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              }}
            />
          </InputGroup>

          <InputGroup label={t('land.barterMonth')}>
            <input
              type="number"
              step="1"
              value={selectedLand.barterMonth ?? 0}
              onChange={(e) => handleLandChange({ barterMonth: parseInt(e.target.value, 10) || 0 })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              }}
            />
          </InputGroup>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display, "Josefin Sans", sans-serif)' }}>
              {t('land.installments')}
            </h4>
            <button
              type="button"
              onClick={handleAddInstallment}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontWeight: 500,
                fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
              }}
            >
              {t('land.addInstallment')}
            </button>
          </div>

          {(selectedLand.installments || []).length === 0 && (
            <div style={{
              padding: '1rem',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
            }}>
              {t('land.noInstallments')}
            </div>
          )}

          {(selectedLand.installments || []).map((installment, index) => (
            <div
              key={`${installment.month}-${index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                padding: '1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                alignItems: 'center',
                backgroundColor: 'var(--surface)',
              }}
            >
              <InputGroup label={t('land.installmentMonth')}>
                <input
                  type="number"
                  step="1"
                  value={installment.month}
                  onChange={(e) => handleInstallmentChange(index, 'month', parseInt(e.target.value, 10) || 0)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.9375rem',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  }}
                />
              </InputGroup>

              <InputGroup label={t('land.installmentAmount')}>
                <CurrencyInput
                  value={installment.amount}
                  onChange={(value) => handleInstallmentChange(index, 'amount', value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.9375rem',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  }}
                />
              </InputGroup>

              <InputGroup label={t('land.installmentNote')}>
                <input
                  type="text"
                  value={installment.description || ''}
                  onChange={(e) => handleInstallmentChange(index, 'description', e.target.value)}
                  placeholder={t('land.installmentNotePlaceholder')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.9375rem',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  }}
                />
              </InputGroup>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => handleRemoveInstallment(index)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'transparent',
                    color: 'var(--danger)',
                    border: '1px solid var(--danger)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                  }}
                >
                  {t('land.removeInstallment')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Payment Schedule Chart */}
      {paymentSchedule.length > 0 && (
        <SectionCard title={t('land.paymentSchedule')}>
          <div style={{ width: '100%', height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentSchedule} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                />
                <YAxis
                  label={{ value: t('common.value'), angle: -90, position: 'insideLeft', offset: 10 }}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  tickFormatter={(value: number) => {
                    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                    return `$${value.toFixed(0)}`;
                  }}
                />
                <Tooltip
                  formatter={(value: number, _name, entry) => [
                    formatCurrency(value, language),
                    entry?.payload?.type,
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Legend />
                <Bar dataKey="amount" fill="var(--primary)" name={t('land.paymentAmount')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {paymentSchedule.length === 0 && (
        <SectionCard title={t('land.paymentSchedule')}>
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
            {t('land.configurePaymentSchedule')}
          </div>
        </SectionCard>
      )}
    </div>
  ) : (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
      {landConfigs.length === 0
        ? t('land.noLandConfigured')
        : t('land.selectLand')}
    </div>
  );

  return <MasterDetailLayout master={masterPanel} detail={detailPanel} masterWidth="300px" />;
}
