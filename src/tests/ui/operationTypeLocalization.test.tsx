/**
 * Operation type localization coverage.
 *
 * Verifies that operation types share a single translation map and that
 * components render localized labels for known types.
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OperationList } from '../../components/operations/OperationList';
import { getOperationTypeLabel } from '../../components/operations/operationTypes';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { translations, type TranslationKey } from '../../i18n/translations';
import { buildBeachClubConfig, buildFlexConfig } from '../helpers/buildOperationConfig';

const noop = () => {};
const baseProps = {
  selectedIds: new Set<string>(),
  onToggleSelect: noop,
  onSelectAll: noop,
  onClearSelection: noop,
  onBulkActivate: noop,
  onBulkDeactivate: noop,
  onBulkDelete: noop,
};

describe('operation type localization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('maps known operation types to translation keys', () => {
    const translate = (key: TranslationKey) => translations.en[key];

    expect(getOperationTypeLabel(translate, 'BEACH_CLUB')).toBe('Beach Club');
    expect(getOperationTypeLabel(translate, 'FLEX')).toBe('Flex Space');
  });

  it('renders localized labels for the current language', () => {
    const operations = [buildFlexConfig({ id: 'flex-1', name: 'Flex Asset' })];

    render(
      <LanguageProvider>
        <OperationList
          operations={operations}
          selectedOperationId={null}
          onSelectOperation={noop}
          {...baseProps}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Espaço Flexível')).toBeInTheDocument();
  });

  it('respects stored language preference when rendering labels', () => {
    localStorage.setItem('hfm-language', 'en');
    const operations = [buildBeachClubConfig({ id: 'beach-1', name: 'Beach Asset' })];

    render(
      <LanguageProvider>
        <OperationList
          operations={operations}
          selectedOperationId={null}
          onSelectOperation={noop}
          {...baseProps}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Beach Club')).toBeInTheDocument();
  });
});
