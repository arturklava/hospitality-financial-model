/**
 * Defensive Formatters (v3.0 - i18n Support)
 * 
 * All formatters handle edge cases gracefully:
 * - null/undefined → "-"
 * - NaN → "-"
 * - Infinity → "∞" or "-∞"
 * 
 * Locale-aware formatting:
 * - 'pt' → pt-BR locale, BRL currency (R$)
 * - 'en' → en-US locale, USD currency ($)
 */

export type SupportedLocale = 'pt' | 'en';

interface LocaleConfig {
    locale: string;
    currency: string;
}

interface FormatterOptions {
    fallbackText?: string;
}

/**
 * Extract a locale-aware currency symbol (with spacing if provided by the locale)
 */
export function getCurrencySymbol(lang: SupportedLocale = 'pt'): string {
    const { locale, currency } = getLocaleConfig(lang);
    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    const parts = formatter.formatToParts(0);
    const currencyIndex = parts.findIndex(part => part.type === 'currency');

    if (currencyIndex === -1) {
        return '';
    }

    const symbol = parts[currencyIndex]?.value ?? '';
    const nextPart = parts[currencyIndex + 1];
    const trailingSpace = nextPart?.type === 'literal' ? nextPart.value : '';

    return `${symbol}${trailingSpace}`;
}

/**
 * Get locale configuration based on language code
 */
export function getLocaleConfig(lang: SupportedLocale = 'pt'): LocaleConfig {
    switch (lang) {
        case 'pt':
            return { locale: 'pt-BR', currency: 'BRL' };
        case 'en':
            return { locale: 'en-US', currency: 'USD' };
        default:
            return { locale: 'pt-BR', currency: 'BRL' };
    }
}

/**
 * Format a number as currency.
 * Locale-aware: 'pt' uses R$ (BRL), 'en' uses $ (USD).
 * Returns "-" for null/undefined/NaN, "∞" for Infinity.
 */
export function formatCurrency(
    value: number | null | undefined,
    lang: SupportedLocale = 'pt',
    options: FormatterOptions = {}
): string {
    const { fallbackText = '-' } = options;

    if (value === null || value === undefined) return fallbackText;
    if (Number.isNaN(value)) return fallbackText;
    if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';

    const { locale, currency } = getLocaleConfig(lang);

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Format a number as a percentage.
 * Locale-aware: 'pt' uses comma decimal separator, 'en' uses dot.
 * Returns "-" for null/undefined/NaN, "∞" for Infinity.
 */
export function formatPercent(
    value: number | null | undefined,
    lang: SupportedLocale = 'pt',
    options: Intl.NumberFormatOptions & FormatterOptions = {}
): string {
    const { fallbackText = '-', ...formatOptions } = options;

    if (value === null || value === undefined) return fallbackText;
    if (Number.isNaN(value)) return fallbackText;
    if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';

    const { locale } = getLocaleConfig(lang);

    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        ...formatOptions,
    }).format(value);
}

/**
 * Format a number as a multiplier (e.g., "1.50x" for MOIC).
 * Locale-aware decimal separator.
 * Returns "-" for null/undefined/NaN.
 */
export function formatMultiplier(
    value: number | null | undefined,
    lang: SupportedLocale = 'pt',
    options: FormatterOptions = {}
): string {
    const { fallbackText = '-' } = options;

    if (value === null || value === undefined) return fallbackText;
    if (Number.isNaN(value)) return fallbackText;
    if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';

    const { locale } = getLocaleConfig(lang);

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value) + 'x';
}

/**
 * Format a number with fixed decimal places.
 * Locale-aware decimal separator.
 * Returns "-" for null/undefined/NaN.
 */
export function formatNumber(
    value: number | null | undefined,
    decimals: number = 2,
    lang: SupportedLocale = 'pt',
    options: FormatterOptions = {}
): string {
    const { fallbackText = '-' } = options;

    if (value === null || value === undefined) return fallbackText;
    if (Number.isNaN(value)) return fallbackText;
    if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';

    const { locale } = getLocaleConfig(lang);

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}
