// i18next setup — the single source of translation state for the website and
// Buddy. Bundled JSON resources only; no online translation API is called.
//
// Language selection: a manually saved choice wins; otherwise the site opens
// automatically in the visitor's country/browser language (Arabic or Urdu)
// and falls back to English everywhere else, including India.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  detectLanguage,
  formatNumber,
  formatUsd,
  getLocaleConfig,
  isSupportedLanguage,
  LanguageCode,
} from './languageConfig';
import en from './locales/en.json';
import ur from './locales/ur.json';
import ar from './locales/ar.json';

// Versioned storage keys so older saved assistant data can never break the
// updated flow — unknown/invalid values fall back to defaults safely.
export const LANGUAGE_STORAGE_KEY = 'scs-lang-v2';

interface StoredLanguage {
  code: LanguageCode;
  remember: boolean;
}

function readStored(storage: Storage, key: string): StoredLanguage | null {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? '') as StoredLanguage;
    if (parsed && isSupportedLanguage(parsed.code)) return parsed;
  } catch {
    /* invalid stored data → defaults */
  }
  return null;
}

export function loadStoredLanguage(): StoredLanguage | null {
  if (typeof window === 'undefined') return null;
  return readStored(window.localStorage, LANGUAGE_STORAGE_KEY) ?? readStored(window.sessionStorage, LANGUAGE_STORAGE_KEY);
}

export function persistLanguage(code: LanguageCode, remember: boolean): void {
  const payload = JSON.stringify({ code, remember } satisfies StoredLanguage);
  try {
    if (remember) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, payload);
      window.sessionStorage.removeItem(LANGUAGE_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(LANGUAGE_STORAGE_KEY, payload);
      window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    }
  } catch {
    /* storage unavailable — language still works for this page view */
  }
}

function applyDocumentLocale(code: string): void {
  if (typeof document === 'undefined') return;
  const cfg = getLocaleConfig(code);
  document.documentElement.lang = cfg.code;
  document.documentElement.dir = cfg.dir;
}

// Saved manual choice wins; otherwise detect from the visitor's country /
// browser settings, falling back to English.
const initialLanguage: LanguageCode = loadStoredLanguage()?.code ?? detectLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
    ur: { translation: ur },
  },
  lng: initialLanguage,
  fallbackLng: 'en', // unsupported / missing strings safely fall back to English
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

// Custom interpolation formatters, e.g. "{{cost, usd}}" / "{{hours, number}}".
// USD amounts are locale-formatted but never converted to another currency.
i18n.services.formatter?.add('usd', (value, lng) =>
  typeof value === 'number' ? formatUsd(value, lng ?? 'en') : String(value),
);
i18n.services.formatter?.add('number', (value, lng) =>
  typeof value === 'number' ? formatNumber(value, lng ?? 'en') : String(value),
);

applyDocumentLocale(initialLanguage);
i18n.on('languageChanged', applyDocumentLocale);

/** Change the site language everywhere, without a reload. */
export function setAppLanguage(code: LanguageCode, remember: boolean): void {
  persistLanguage(code, remember);
  void i18n.changeLanguage(code);
}

export default i18n;
