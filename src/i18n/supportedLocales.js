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
