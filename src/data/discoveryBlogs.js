export const DISCOVERY_BLOGS = [
  {
    slug: "hot-mic-ep-1-research-literacy",
    title: "Don't Believe Everything You Read — Especially Online",
    category: "Health & Research · Research Literacy · Hot Mic Podcast",
    readTime: "8 min read",
    publishedAt: "Mar 2026",
    markdownPath: "/HotMic_Ep1_BlogText.md",
    excerpt:
      "Why research literacy matters, how social media distorts science, and practical red flags to spot weak health claims.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "hot-mic-ep-2-cancer-screening",
    title: "Cancer Doesn't Wait Until You're Old",
    category:
      "Health & Research · Cancer Screening · Patient Autonomy · Hot Mic Podcast",
    readTime: "9 min read",
    publishedAt: "Mar 2026",
    markdownPath: "/HotMic_Ep2_BlogText.md",
    excerpt:
      "A clear conversation on rising early-onset cancer risk, symptom advocacy, and making treatment choices aligned with your values.",
    image:
      "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=1400&q=80",
  },
];

export function getDiscoveryBlogBySlug(slug) {
  return DISCOVERY_BLOGS.find((blog) => blog.slug === slug) || null;
}
