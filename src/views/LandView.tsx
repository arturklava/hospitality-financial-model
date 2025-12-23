/**
 * Land View component (v5.0).
 * 
 * Displays land acquisition configuration with payment schedule visualization.
 */

import { useState, useMemo, useEffect } from 'react';
import { MasterDetailLayout } from '../components/layout/MasterDetailLayout';
import { SectionCard } from '../components/ui/SectionCard';
import { InputGroup } from '../components/ui/InputGroup';
import { CurrencyInput } from '../components/inputs/CurrencyInput';
import { formatCurrency, getLocaleConfig } from '../utils/formatters';
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

function normalizeBarterValue(rawValue?: number | null): number | null {
  if (rawValue === undefined || rawValue === null) return null;
  if (!Number.isFinite(rawValue)) return null;
  if (rawValue < 0) return null;
  if (rawValue <= 1) return rawValue;
  if (rawValue <= 100) return rawValue / 100;
  return null;
}

function formatBarterDisplay(rawValue?: number | null): string {
  const normalized = normalizeBarterValue(rawValue);
  if (normalized === null) return '';
  return (normalized * 100).toFixed(2);
}

function parseBarterInput(input: string): { normalized: number | null; error?: 'invalid' | 'range' } {
  const sanitized = input.replace(',', '.').trim();
  if (sanitized === '') {
    return { normalized: null };
  }

  const numericValue = Number(sanitized);
  if (!Number.isFinite(numericValue)) {
    return { normalized: null, error: 'invalid' };
  }

  const normalized = normalizeBarterValue(numericValue);
  if (normalized === null) {
    return { normalized: null, error: 'range' };
  }

  return { normalized };
}

function formatYAxisCurrencyTick(value: number, language: 'pt' | 'en'): string {
  const { locale, currency } = getLocaleConfig(language);

  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(value);
  }

  return formatCurrency(value, language);
}

export function LandView({ input, onProjectConfigChange }: LandViewProps) {
  const projectConfig = input.projectConfig;
  const landConfigs = projectConfig.landConfigs || [];
  const { t, language } = useTranslation();
  const [selectedLandId, setSelectedLandId] = useState<string | null>(
    landConfigs.length > 0 ? landConfigs[0].id : null
  );

  const selectedLand = landConfigs.find((land) => land.id === selectedLandId);
  const [barterInputValue, setBarterInputValue] = useState<string>('');
  const [barterError, setBarterError] = useState<string | undefined>();

  useEffect(() => {
    if (!selectedLand) {
      setBarterInputValue('');
      setBarterError(undefined);
      return;
    }

    const displayValue = formatBarterDisplay(selectedLand.barterValue);
    setBarterInputValue(displayValue);

    const normalized = normalizeBarterValue(selectedLand.barterValue);
    if (normalized === null && selectedLand.barterValue !== undefined) {
      setBarterError(t('land.barterPercentRangeError'));
      return;
    }

    setBarterError(undefined);
  }, [selectedLand, t]);

  // Calculate payment schedule for selected land
  const paymentSchedule = useMemo(() => {
    if (!selectedLand) return [];

    const schedule: Array<{ month: number; monthLabel: string; amount: number; type: string }> = [];
    const normalizedBarterValue = normalizeBarterValue(selectedLand.barterValue);

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
    if (selectedLand.installments && selectedLand.installments.length > 0) {
      selectedLand.installments.forEach((installment) => {
        schedule.push({
          month: installment.month,
          monthLabel: `${t('common.month')} ${installment.month}`,
          amount: installment.amount,
          type: 'Installment', // TODO: Add key for installment if missing, or use common
        });
      });
    }

    // Barter payment
    if (normalizedBarterValue && normalizedBarterValue > 0 && selectedLand.barterMonth !== undefined) {
      const barterAmount = selectedLand.totalCost * normalizedBarterValue;
      schedule.push({
        month: selectedLand.barterMonth,
        monthLabel: `${t('common.month')} ${selectedLand.barterMonth}`,
        amount: barterAmount,
        type: t('land.swap'),
      });
    }

    // Sort by month
    return schedule.sort((a, b) => a.month - b.month);
  }, [selectedLand, t]);

  const handleLandChange = (updates: Partial<LandConfig>) => {
    if (!selectedLand || !onProjectConfigChange) return;

    const updatedLandConfigs = landConfigs.map((land) => {
      if (land.id === selectedLand.id) {
        return { ...land, ...updates };
      }
      return land;
    });

    onProjectConfigChange({ landConfigs: updatedLandConfigs });
  };

  const handleBarterChange = (value: string) => {
    setBarterInputValue(value);

    const { normalized, error } = parseBarterInput(value);

    if (!selectedLand) return;

    if (error === 'invalid') {
      setBarterError(t('land.barterPercentInvalid'));
      handleLandChange({ barterValue: undefined });
      return;
    }

    if (error === 'range') {
      setBarterError(t('land.barterPercentRangeError'));
      handleLandChange({ barterValue: undefined });
      return;
    }

    setBarterError(undefined);
    handleLandChange({ barterValue: normalized ?? undefined });
  };

  const handleAddLand = () => {
    if (!onProjectConfigChange) return;

    const newLand: LandConfig = {
      id: `land-${Date.now()}`,
      name: 'New Land Acquisition',
      totalCost: 0,
      acquisitionMonth: -12,
      downPayment: 0,
      downPaymentMonth: -12,
      barterValue: 0,
    };

    const updatedLandConfigs = [...landConfigs, newLand];
    onProjectConfigChange({ landConfigs: updatedLandConfigs });
    setSelectedLandId(newLand.id);
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
        {landConfigs.map((land) => (
          <button
            key={land.id}
            onClick={() => setSelectedLandId(land.id)}
            style={{
              padding: '0.75rem',
              backgroundColor: selectedLandId === land.id ? 'var(--primary-light)' : 'var(--surface)',
              border: `1px solid ${selectedLandId === land.id ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
              {land.name}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body, "Montserrat", sans-serif)' }}>
              {formatCurrency(land.totalCost, language)}
            </div>
          </button>
        ))}
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
              value={selectedLand.downPaymentMonth}
              onChange={(e) => handleLandChange({ downPaymentMonth: parseInt(e.target.value) || 0 })}
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
            error={barterError}
          >
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9.,]*"
                aria-label={t('land.barterPercent')}
                value={barterInputValue}
                onChange={(e) => handleBarterChange(e.target.value)}
                aria-invalid={barterError ? 'true' : 'false'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '2.5rem',
                  border: `1px solid ${barterError ? 'var(--danger)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  fontSize: '0.9375rem',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: barterError ? 'var(--danger)' : 'var(--text-secondary)',
                  pointerEvents: 'none',
                }}
              >
                %
              </span>
            </div>
          </InputGroup>

          <InputGroup label={t('land.barterMonth')}>
            <input
              type="number"
              value={selectedLand.barterMonth ?? 0}
              onChange={(e) => handleLandChange({ barterMonth: parseInt(e.target.value) || 0 })}
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
                  tickFormatter={(value: number) => formatYAxisCurrencyTick(value, language)}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, language)}
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
