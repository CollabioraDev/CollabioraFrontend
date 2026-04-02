import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applyDocumentLanguageAndDir } from "./documentLanguage.js";

export default function LanguageShell({ children }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    applyDocumentLanguageAndDir(i18n.language);
  }, [i18n.language]);

  return children;
}
