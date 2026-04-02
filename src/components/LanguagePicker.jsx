import { useTranslation } from "react-i18next";
import CustomSelect from "./ui/CustomSelect.jsx";
import { SUPPORTED_LOCALES, normalizeLocale } from "../i18n/supportedLocales.js";
import { syncI18nFromUser } from "../i18n/syncUserLanguage.js";

function localeToLabelKey(code) {
  const map = {
    en: "language.en",
    es: "language.es",
    "zh-Hans": "language.zhHans",
    hi: "language.hi",
    ar: "language.ar",
    fr: "language.fr",
    "pt-BR": "language.ptBR",
    ru: "language.ru",
    ja: "language.ja",
    de: "language.de",
  };
  return map[code] || "language.en";
}

export default function LanguagePicker({
  value,
  onChange,
  disabled = false,
  className = "",
  showLabel = true,
}) {
  const { t, i18n } = useTranslation("common");
  const current = normalizeLocale(value ?? i18n.language);

  const options = SUPPORTED_LOCALES.map((code) => ({
    value: code,
    label: t(localeToLabelKey(code)),
  }));

  return (
    <div className={className}>
      {showLabel && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("language.label")}
        </label>
      )}
      <CustomSelect
        value={current}
        disabled={disabled}
        options={options}
        onChange={(next) => {
          const lng = normalizeLocale(next);
          void i18n.changeLanguage(lng);
          onChange?.(lng);
        }}
        placeholder={t("language.label")}
      />
    </div>
  );
}

export async function savePreferredLanguageToApi(lng) {
  const token = localStorage.getItem("token");
  if (!token) {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        u.preferredLanguage = normalizeLocale(lng);
        localStorage.setItem("user", JSON.stringify(u));
      }
    } catch {
      /* ignore */
    }
    syncI18nFromUser({ preferredLanguage: normalizeLocale(lng) });
    return { ok: true };
  }

  const base =
    import.meta.env.VITE_API_URL || "http://localhost:5000";
  const res = await fetch(`${base}/api/users/me/language`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ preferredLanguage: normalizeLocale(lng) }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || "Failed to save language" };
  }
  if (data.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
    window.dispatchEvent(new Event("login"));
  }
  syncI18nFromUser(data.user || { preferredLanguage: normalizeLocale(lng) });
  return { ok: true };
}
