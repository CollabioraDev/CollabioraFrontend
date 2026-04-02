import { DEFAULT_LOCALE } from "./supportedLocales.js";

export function applyDocumentLanguageAndDir(lng) {
  if (typeof document === "undefined") return;
  const code = lng || DEFAULT_LOCALE;
  document.documentElement.lang = code;
  document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
}
