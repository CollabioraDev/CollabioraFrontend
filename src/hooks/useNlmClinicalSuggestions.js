import { useEffect, useState } from "react";
import { fetchNlmClinicalSuggestions } from "../utils/nlmClinicalSuggestions.js";

const DEFAULT_DEBOUNCE_MS = 280;

/**
 * Debounced NLM Clinical Tables suggestions for SmartSearchInput priorityExtraTerms.
 * @param {string} inputValue
 * @param {{
 *   includeProcedures?: boolean
 *   includeDiseaseNames?: boolean
 *   includeHpo?: boolean
 *   debounceMs?: number
 *   minChars?: number
 * }} [options]
 * @returns {{ terms: string[], loading: boolean }}
 */
export function useNlmClinicalSuggestions(
  inputValue,
  {
    includeProcedures = true,
    includeDiseaseNames = true,
    includeHpo = true,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    minChars = 2,
  } = {},
) {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = typeof inputValue === "string" ? inputValue.trim() : "";
    if (q.length < minChars) {
      setLoading(false);
      setTerms([]);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const suggestions = await fetchNlmClinicalSuggestions(q, {
          includeProcedures,
          includeDiseaseNames,
          includeHpo,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setTerms(suggestions);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setLoading(false);
    };
  }, [
    inputValue,
    includeProcedures,
    includeDiseaseNames,
    includeHpo,
    debounceMs,
    minChars,
  ]);

  return {
    terms,
    loading,
  };
}
