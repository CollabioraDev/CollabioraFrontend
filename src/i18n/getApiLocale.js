import i18n from "i18next";
import { normalizeLocale } from "./supportedLocales.js";

/** Current UI locale (BCP-47) for `?locale=` on search/chat APIs (Azure MT). */
export function getApiLocale() {
  return normalizeLocale(i18n.language || "en");
}

export function appendLocaleToSearchParams(params) {
  params.set("locale", getApiLocale());
}
