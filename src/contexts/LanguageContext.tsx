/**
 * Language Context (v10.0: i18n Support)
 * 
 * Provides language state and translation function throughout the application.
 * Default language is PT-BR. Language preference is persisted in localStorage.
 * 
 * Usage:
 * ```tsx
 * const { t, language, setLanguage } = useTranslation();
 * return <h1>{t('nav.dashboard')}</h1>;
 * ```
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { translations, type Language, type TranslationKey } from '../i18n/translations';

const STORAGE_KEY = 'hfm-language';
const DEFAULT_LANGUAGE: Language = 'pt';

interface LanguageContextType {
    /** Current language ('pt' | 'en') */
    language: Language;
    /** Set the current language */
    setLanguage: (lang: Language) => void;
    /** Toggle between PT and EN */
    toggleLanguage: () => void;
    /** Translation function - returns translated string for given key */
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Load language preference from localStorage with fallback to default
 */
function loadLanguagePreference(): Language {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'pt' || stored === 'en') {
            return stored;
        }
    } catch {
        // localStorage may not be available (SSR, privacy mode, etc.)
    }
    return DEFAULT_LANGUAGE;
}

/**
 * Save language preference to localStorage
 */
function saveLanguagePreference(lang: Language): void {
    try {
        localStorage.setItem(STORAGE_KEY, lang);
    } catch {
        // localStorage may not be available
    }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(loadLanguagePreference);

    // Persist language preference when it changes
    useEffect(() => {
        saveLanguagePreference(language);
    }, [language]);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
    }, []);

    const toggleLanguage = useCallback(() => {
        setLanguageState((prev) => (prev === 'pt' ? 'en' : 'pt'));
    }, []);

    /**
     * Translation function
     * Returns the translated string for the given key in the current language.
     * Falls back to the key itself if translation is not found.
     */
    const t = useCallback(
        (key: TranslationKey): string => {
            const translation = translations[language][key];
            if (!translation) {
                console.warn(`[i18n] Missing translation for key: "${key}" in language: "${language}"`);
                return key;
            }
            return translation;
        },
        [language]
    );

    return (
        <LanguageContext.Provider
            value={{
                language,
                setLanguage,
                toggleLanguage,
                t,
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
}

/**
 * Hook to access translation function and language state
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, language, toggleLanguage } = useTranslation();
 *   return (
 *     <div>
 *       <h1>{t('nav.dashboard')}</h1>
 *       <button onClick={toggleLanguage}>
 *         {language === 'pt' ? '🇺🇸 EN' : '🇧🇷 PT'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranslation() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
}
