export const PRESS_RELEASES = [
  {
    slug: "pcla-partnership",
    title:
      "collabiora and Parkinson's Community Los Angeles Partner to Bring AI-Powered Health Information to Parkinson's Patients and Caregivers",
    category: "Press Release",
    publishedAt: "March 31, 2026",
    excerpt:
      "collabiora partners with Parkinson's Community Los Angeles (PCLA) to launch a pilot bringing plain-language research explanations, clinical trial discovery, and specialist matching to the Parkinson's community in Los Angeles.",
    route: "/press-releases/pcla-partnership",
  },
  {
    slug: "yori",
    title: "collabiora Files Provisional Patent for Yori",
    category: "Press Release",
    publishedAt: "March 17, 2026",
    excerpt:
      "collabiora announces the filing of a provisional patent application for Yori, its AI-powered health information retrieval agent.",
    route: "/press-releases/yori",
  },
];

export function getPressReleaseBySlug(slug) {
  return PRESS_RELEASES.find((item) => item.slug === slug) || null;
}
