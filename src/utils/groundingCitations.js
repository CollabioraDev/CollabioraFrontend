/**
 * Escape text used as a CommonMark link label (brackets break parsing).
 */
function escapeMarkdownLinkLabel(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

/**
 * Short label for inline source chips (hostname, or title when URL is a redirector).
 */
export function shortInlineSourceLabel(source) {
  if (!source?.url) {
    const t = (source?.title || "Source").trim();
    return t.length > 36 ? `${t.slice(0, 33)}…` : t;
  }
  try {
    const u = new URL(source.url);
    const host = u.hostname.replace(/^www\./i, "");
    if (/vertexaisearch\.cloud\.google\.com/i.test(host)) {
      const t = (source.title || "").trim();
      if (t) return t.length > 36 ? `${t.slice(0, 33)}…` : t;
      return "Source";
    }
    if (host.length > 36) return `${host.slice(0, 33)}…`;
    return host;
  } catch {
    const t = (source.title || "Source").trim();
    return t.length > 36 ? `${t.slice(0, 33)}…` : t;
  }
}

/** Google Search grounding redirect URLs — style as inline chips, not big link buttons */
export function isLikelyGroundingSourceUrl(href) {
  if (!href || typeof href !== "string") return false;
  return /vertexaisearch\.cloud\.google\.com/i.test(href);
}

/**
 * Looks like a hostname chip (nih.gov, mayoclinic.org) used as link text
 */
export function looksLikeHostnameChip(text) {
  const t = String(text || "").trim();
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(…)?$/i.test(t);
}

/** Shared Tailwind classes for inline web-grounding source chips (collabiora brand; light + dark). */
export const GROUNDING_SOURCE_CHIP_CLASSNAME =
  "inline-flex max-w-[min(100%,14rem)] items-center rounded-md border border-brand-purple-200/95 bg-brand-purple-50 px-1.5 py-0.5 text-[0.78rem] font-medium leading-none text-brand-royal-blue shadow-sm transition-colors hover:border-brand-purple-300 hover:bg-brand-purple-100/95 hover:text-brand-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-400/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background dark:border-brand-purple-400/45 dark:bg-brand-blue-700/35 dark:text-brand-purple-100 dark:shadow-none dark:hover:border-brand-purple-300/65 dark:hover:bg-brand-blue-600/40 dark:hover:text-white dark:focus-visible:ring-brand-purple-300/50 dark:focus-visible:ring-offset-0 mx-0.5 align-baseline whitespace-nowrap";

function stripObsoleteGroundingPhrases(content) {
  if (!content || typeof content !== "string") return content;
  return content
    .replace(/\s*Sources appear in the panel below\.?\s*/gi, "\n\n")
    .replace(/\s*Sources are (shown|listed) in the panel below\.?\s*/gi, "\n\n")
    .replace(
      /\s*The sources are listed below for further reading\.?\s*/gi,
      "\n\n",
    )
    .replace(/\s*sources are listed below for further reading\.?\s*/gi, "\n\n")
    .replace(/\s*sources appear below\.?\s*/gi, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Turn [1], [2], … into inline markdown links whose label is a short site name
 * (Google-style), not a bottom “Sources” list.
 * If the model omitted [n] markers but sources were returned, appends a row of chip links.
 */
export function preprocessMarkdownWithGroundingCitations(content, sources) {
  if (!content || typeof content !== "string" || !sources?.length) return content;
  const cleaned = stripObsoleteGroundingPhrases(content);
  const hadNumericCitationMarkers = /\[\d+\]/.test(cleaned);
  const byIndex = new Map();
  for (const s of sources) {
    const i = Number(s.index);
    if (Number.isFinite(i) && s.url && typeof s.url === "string") {
      byIndex.set(i, s);
    }
  }
  if (byIndex.size === 0) return cleaned;
  let out = cleaned.replace(/\[(\d+)\]/g, (match, numStr) => {
    const n = Number(numStr);
    const src = byIndex.get(n);
    if (!src?.url) return match;
    const label = escapeMarkdownLinkLabel(shortInlineSourceLabel(src));
    return `[${label}](${src.url})`;
  });
  if (!hadNumericCitationMarkers) {
    const chips = [];
    for (const s of sources) {
      if (!s?.url || typeof s.url !== "string") continue;
      const label = escapeMarkdownLinkLabel(shortInlineSourceLabel(s));
      chips.push(`[${label}](${s.url})`);
    }
    if (chips.length) {
      out = `${out.trimEnd()}\n\n---\n\n${chips.join(" ")}`;
    }
  }
  return out;
}

/** Flatten ReactMarkdown `children` for link components */
export function flattenMarkdownChildrenToString(children) {
  if (children == null || children === false) return "";
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(flattenMarkdownChildrenToString).join("");
  }
  if (typeof children === "object" && children.props != null) {
    return flattenMarkdownChildrenToString(children.props.children);
  }
  return "";
}
