/**
 * OpenAlex work short IDs look like W1234567890. Detail API needs ?source=openalex.
 * @param {string} id
 * @returns {"openalex"|null}
 */
export function inferPublicationSourceFromId(id) {
  const raw = String(id ?? "").trim();
  if (!raw) return null;
  if (/^W\d+$/i.test(raw)) return "openalex";
  return null;
}

/**
 * Internal link path for publication detail (includes source when not PubMed-only).
 * @param {{ pmid?: string, id?: string, source?: string }} publication
 * @returns {string|null}
 */
export function getPublicationPath(publication) {
  const publicationId = publication?.pmid || publication?.id;
  if (!publicationId) return null;
  const src =
    publication?.source || inferPublicationSourceFromId(publicationId);
  const q =
    src && src !== "pubmed"
      ? `?source=${encodeURIComponent(src)}`
      : "";
  return `/publication/${encodeURIComponent(publicationId)}${q}`;
}
