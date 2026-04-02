import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./supportedLocales.js";
import { syncI18nFromUser } from "./syncUserLanguage.js";

const modules = import.meta.glob("./locales/*/common.json", { eager: true });

const resources = {};
for (const path of Object.keys(modules)) {
  const normalized = path.replace(/\\/g, "/");
  const m = normalized.match(/\/locales\/([^/]+)\/common\.json$/);
  if (!m) continue;
  const lng = m[1];
  const mod = modules[path];
  const data = mod?.default ?? mod;
  resources[lng] = { common: data };
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    nonExplicitSupportedLngs: true,
    ns: ["common"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    react: { useSuspense: false },
  })
  .then(() => {
    try {
      const raw = localStorage.getItem("user");
      const u = raw ? JSON.parse(raw) : null;
      syncI18nFromUser(u || {});
    } catch {
      syncI18nFromUser({});
    }
  });

export { applyDocumentLanguageAndDir } from "./documentLanguage.js";
