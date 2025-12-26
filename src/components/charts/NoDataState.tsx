/**
 * NoDataState component (v3.2).
 * 
 * Reusable fallback state for charts when data is empty or invalid.
 * Prevents layout collapse by maintaining explicit height.
 */

import { useTranslation } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';

interface NoDataStateProps {
  height?: number;
  /** Optional explicit message (overrides translation keys) */
  message?: string;
  /** Optional explicit description (overrides translation keys) */
  description?: string;
  /** Translation key for the main message */
  messageKey?: TranslationKey;
  /** Translation key for the description */
  descriptionKey?: TranslationKey;
}

export function NoDataState({
  height = 400,
  message,
  description,
  messageKey = 'common.noDataAvailable',
  descriptionKey,
}: NoDataStateProps) {
  const { t } = useTranslation();

  const resolvedMessage = message ?? t(messageKey);
  const resolvedDescription = description ?? (descriptionKey ? t(descriptionKey) : undefined);

  return (
    <div style={{
      width: '100%',
      height: `${height}px`,
      minHeight: `${height}px`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      color: 'var(--text-secondary)',
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius)',
      backgroundColor: 'var(--surface)',
    }}>
      <p style={{
        fontSize: '1rem',
        fontWeight: 500,
        marginBottom: resolvedDescription ? '0.5rem' : 0,
        color: 'var(--text-primary)',
      }}>
        {resolvedMessage}
      </p>
      {resolvedDescription && (
        <p style={{
          fontSize: '0.875rem',
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}>
          {resolvedDescription}
        </p>
      )}
    </div>
  );
}

