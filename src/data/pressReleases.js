export const PRESS_RELEASES = [
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
