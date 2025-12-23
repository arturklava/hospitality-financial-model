/**
 * StatementTable i18n currency symbol test
 * @vitest-environment jsdom
 */

import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StatementTable, type StatementRow } from '../../components/financials/StatementTable';
import { LanguageProvider, useTranslation } from '../../contexts/LanguageContext';
import { getCurrencySymbol } from '../../utils/formatters';
import type { Language } from '../../i18n/translations';

const sampleRows: StatementRow[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    level: 0,
    values: [100],
  },
];

const columnHeaders = ['Year 1'];

function StatementTableWithLanguage({ targetLanguage }: { targetLanguage: Language }) {
  const { language, setLanguage } = useTranslation();

  useEffect(() => {
    if (language !== targetLanguage) {
      setLanguage(targetLanguage);
    }
  }, [language, targetLanguage, setLanguage]);

  const currencySymbol = getCurrencySymbol(language);

  return (
    <StatementTable
      rows={sampleRows}
      columnHeaders={columnHeaders}
      currencySymbol={currencySymbol}
      showNegativeInParentheses={false}
    />
  );
}

describe('StatementTable currency symbol localization', () => {
  it('updates the currency symbol when the language changes', async () => {
    const { rerender } = render(
      <LanguageProvider>
        <StatementTableWithLanguage targetLanguage="pt" />
      </LanguageProvider>
    );

    expect(await screen.findByText(/R\$\s*100/)).toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <StatementTableWithLanguage targetLanguage="en" />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/\$\s*100/)).toBeInTheDocument();
    });
  });
});
