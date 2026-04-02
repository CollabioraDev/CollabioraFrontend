import i18n from "i18next";
import { normalizeLocale } from "./supportedLocales.js";
import { applyDocumentLanguageAndDir } from "./documentLanguage.js";

export function getLanguageFromStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    const lang = u?.preferredLanguage;
    return typeof lang === "string" ? lang : null;
  } catch {
    return null;
  }
}

/** Apply locale from user object or localStorage; call after login and on app init. */
export function syncI18nFromUser(user) {
  const fromUser = user?.preferredLanguage;
  if (fromUser && typeof fromUser === "string") {
    const lng = normalizeLocale(fromUser);
    void i18n.changeLanguage(lng);
    applyDocumentLanguageAndDir(lng);
    return;
  }
  const stored = getLanguageFromStoredUser();
  if (stored) {
    const lng = normalizeLocale(stored);
    void i18n.changeLanguage(lng);
    applyDocumentLanguageAndDir(lng);
  }
}
