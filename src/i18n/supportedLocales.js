/**
 * Supported locales — keep codes in sync with server/config/locales.js
 */
export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "zh-Hans",
  "hi",
  "ar",
  "fr",
  "pt-BR",
  "ru",
  "ja",
  "de",
];

export const DEFAULT_LOCALE = "en";

/** English labels for locale picker (onboarding, settings). */
export const LOCALE_DISPLAY_NAMES = {
  en: "English",
  es: "Spanish",
  "zh-Hans": "Chinese (Simplified)",
  hi: "Hindi",
  ar: "Arabic",
  fr: "French",
  "pt-BR": "Portuguese (Brazil)",
  ru: "Russian",
  ja: "Japanese",
  de: "German",
};

/** @type {{ code: string; label: string }[]} */
export const LOCALE_SELECTOR_OPTIONS = SUPPORTED_LOCALES.map((code) => ({
  code,
  label: LOCALE_DISPLAY_NAMES[code] || code,
}));

const SET = new Set(SUPPORTED_LOCALES);

export function isSupportedLocale(code) {
  if (!code || typeof code !== "string") return false;
  return SET.has(code.trim());
}

export function normalizeLocale(code) {
  if (!code || typeof code !== "string") return DEFAULT_LOCALE;
  const t = code.trim();
  return SET.has(t) ? t : DEFAULT_LOCALE;
}
