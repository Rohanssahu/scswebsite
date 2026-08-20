// Centralized locale configuration for the whole website and Buddy.
// Language, direction, speech voices, Buddy position, and Intl formatting
// preferences all come from this single table — never hardcode them elsewhere.
//
// Supported languages: English (default + fallback, including India),
// Arabic and Urdu for international visitors. The site opens automatically in
// the visitor's country/browser language when supported — otherwise English.

export type LanguageCode = 'en' | 'ur' | 'ar';
export type TextDirection = 'ltr' | 'rtl';
export type SpeechSpeed = 'slow' | 'normal' | 'fast';

export interface LocaleConfig {
  code: LanguageCode;
  /** Full BCP-47 locale used for Intl formatting and speech. */
  locale: string;
  /** Label shown in its own script (never flags-only). */
  nativeLabel: string;
  /** English name, used in accessible labels alongside the native one. */
  englishLabel: string;
  dir: TextDirection;
  /** Preferred speech-synthesis voice locales, best first. */
  voicePreferences: string[];
  /** Speech rates per user speed setting. */
  speechRates: Record<SpeechSpeed, number>;
  /** Which physical side Buddy docks to for this direction. */
  buddyPosition: 'right' | 'left';
  /** Locale used by Intl.DateTimeFormat / Intl.NumberFormat. */
  formatLocale: string;
  dateFormat: Intl.DateTimeFormatOptions;
  timeFormat: Intl.DateTimeFormatOptions;
  /** Currency the visitor most likely expects to see amounts labelled in. */
  preferredCurrency: string;
}

export const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'ar', 'ur'];

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
const SHORT_TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

export const LOCALES: Record<LanguageCode, LocaleConfig> = {
  en: {
    code: 'en',
    locale: 'en-IN',
    nativeLabel: 'English',
    englishLabel: 'English',
    dir: 'ltr',
    voicePreferences: ['en-IN', 'en-US', 'en-GB', 'en'],
    speechRates: { slow: 0.7, normal: 0.82, fast: 1.0 },
    buddyPosition: 'right',
    formatLocale: 'en-IN',
    dateFormat: LONG_DATE,
    timeFormat: SHORT_TIME,
    preferredCurrency: 'INR',
  },
  ar: {
    code: 'ar',
    locale: 'ar-SA',
    nativeLabel: 'العربية',
    englishLabel: 'Arabic',
    dir: 'rtl',
    voicePreferences: ['ar-SA', 'ar-AE', 'ar-EG', 'ar'],
    speechRates: { slow: 0.68, normal: 0.78, fast: 0.95 },
    buddyPosition: 'left',
    formatLocale: 'ar-SA',
    dateFormat: LONG_DATE,
    timeFormat: SHORT_TIME,
    preferredCurrency: 'SAR',
  },
  ur: {
    code: 'ur',
    locale: 'ur-PK',
    nativeLabel: 'اردو',
    englishLabel: 'Urdu',
    dir: 'rtl',
    voicePreferences: ['ur-PK', 'ur-IN', 'ur'],
    speechRates: { slow: 0.68, normal: 0.78, fast: 0.95 },
    buddyPosition: 'left',
    formatLocale: 'ur-PK',
    dateFormat: LONG_DATE,
    timeFormat: SHORT_TIME,
    preferredCurrency: 'PKR',
  },
};

export function isSupportedLanguage(code: string | null | undefined): code is LanguageCode {
  return !!code && (SUPPORTED_LANGUAGES as string[]).includes(code);
}

export function getLocaleConfig(code: string | undefined): LocaleConfig {
  return isSupportedLanguage(code) ? LOCALES[code] : LOCALES.en;
}

// ---------- country-wise automatic language detection ----------

/** IANA time zones of countries whose primary language we support. */
const TIMEZONE_LANGUAGE: Record<string, LanguageCode> = {
  // Urdu — Pakistan
  'Asia/Karachi': 'ur',
  // Arabic — Gulf, Levant, North Africa
  'Asia/Riyadh': 'ar',
  'Asia/Dubai': 'ar',
  'Asia/Kuwait': 'ar',
  'Asia/Qatar': 'ar',
  'Asia/Bahrain': 'ar',
  'Asia/Muscat': 'ar',
  'Asia/Baghdad': 'ar',
  'Asia/Amman': 'ar',
  'Asia/Beirut': 'ar',
  'Asia/Damascus': 'ar',
  'Asia/Aden': 'ar',
  'Africa/Cairo': 'ar',
  'Africa/Casablanca': 'ar',
  'Africa/Algiers': 'ar',
  'Africa/Tunis': 'ar',
  'Africa/Tripoli': 'ar',
  'Africa/Khartoum': 'ar',
};

/**
 * Detect the visitor's language from their country/browser settings, with no
 * network call: browser languages first, then the device time zone as a
 * country hint. Unsupported countries/languages (including India) fall back
 * to English.
 */
export function detectLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return 'en';
  for (const raw of navigator.languages ?? [navigator.language]) {
    const base = raw?.toLowerCase().split('-')[0];
    if (isSupportedLanguage(base)) return base;
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_LANGUAGE[tz]) return TIMEZONE_LANGUAGE[tz];
  } catch {
    /* time zone unavailable — English fallback */
  }
  return 'en';
}

// ---------- Intl helpers (country influences formatting, not language) ----------

/**
 * All demo estimates are calculated in USD. We format the USD amount using the
 * visitor's locale conventions and label the currency clearly — no live
 * currency conversion happens anywhere in the app.
 */
export function formatUsd(amount: number, langOrLocale: string): string {
  const cfg = getLocaleConfig(langOrLocale.split('-')[0]);
  try {
    return new Intl.NumberFormat(cfg.formatLocale, {
      style: 'currency',
      currency: 'USD',
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `USD ${amount.toLocaleString()}`;
  }
}

export function formatNumber(value: number, langOrLocale: string): string {
  const cfg = getLocaleConfig(langOrLocale.split('-')[0]);
  try {
    return new Intl.NumberFormat(cfg.formatLocale).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(date: Date, langOrLocale: string, options?: Intl.DateTimeFormatOptions): string {
  const cfg = getLocaleConfig(langOrLocale.split('-')[0]);
  try {
    return new Intl.DateTimeFormat(cfg.formatLocale, options ?? cfg.dateFormat).format(date);
  } catch {
    return date.toDateString();
  }
}

/**
 * Stable key for translating enumerable display values (question options,
 * quick-reply labels, role names…) while keeping the canonical English value
 * in state and storage, so saved answers survive language switches.
 */
export function valueKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
