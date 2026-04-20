/**
 * Loads merged publication details (same endpoints as dashboard “View publication details”).
 */
export async function fetchPublicationInsightsDetails(pub, { apiBase, locale, audience }) {
  const id = pub?.pmid || pub?.id || pub?._id;
  if (!id) return { publication: pub };
  const source = pub.source || "pubmed";
  const sourceParam = `source=${encodeURIComponent(source)}`;
  const loc = encodeURIComponent(locale || "en");

  try {
    if (audience === "researcher") {
      const response = await fetch(
        `${apiBase}/api/search/publication/${id}/simplified?audience=researcher&${sourceParam}&locale=${loc}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.publication)
          return { publication: { ...pub, ...data.publication } };
      }
      const fallbackResponse = await fetch(
        `${apiBase}/api/search/publication/${id}/simplified?${sourceParam}&locale=${loc}`,
      );
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.publication)
          return { publication: { ...pub, ...fallbackData.publication } };
      }
    } else {
      const response = await fetch(
        `${apiBase}/api/search/publication/${id}/simplified?${sourceParam}&locale=${loc}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.publication)
          return { publication: { ...pub, ...data.publication } };
      }
      const fallbackResponse = await fetch(
        `${apiBase}/api/search/publication/${id}?${sourceParam}`,
      );
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.publication)
          return { publication: { ...pub, ...fallbackData.publication } };
      }
    }
  } catch (error) {
    console.error("Error fetching detailed publication info:", error);
  }
  return { publication: pub };
}
