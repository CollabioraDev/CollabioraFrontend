export const DISCOVERY_BLOGS = [
  {
    slug: "hot-mic-ep-1-research-literacy",
    title: "Don't Believe Everything You Read - Especially Online",
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
  {
    slug: "hot-mic-ep-3-mental-health-adhd",
    title: "Your Brain Isn't Broken - But It Might Need Some Help",
    category:
      "Mental Health · ADHD · Neurodivergence · Hot Mic Podcast",
    readTime: "9 min read",
    publishedAt: "Mar 2026",
    markdownPath: "/HotMic_Ep3_BlogText-2.md",
    excerpt:
      'A grounded, stigma-free conversation with a psychiatrist on anxiety, depression, ADHD, and when "feeling off" is worth taking seriously.',
    image:
      "https://static.vecteezy.com/system/resources/thumbnails/017/048/151/small/finding-solution-concept-human-heads-with-confused-thoughts-and-ideas-inside-set-of-brain-process-illustrations-mental-health-and-psychology-concept-growth-mindset-skills-illustration-vector.jpg",
  },
  {
    slug: "hot-mic-ep-4-eczema",
    title: "30 Years of Eczema - and the Shot That Changed Everything",
    category:
      "Chronic Illness · Skin Health · Patient Advocacy · Hot Mic Podcast",
    readTime: "9 min read",
    publishedAt: "Mar 2026",
    markdownPath: "/HotMic_Ep4_BlogText.md",
    excerpt:
      "A personal journey with severe atopic dermatitis — visibility, exhaustion, misinformation, and finally finding something that works.",
    image:
      "https://img.freepik.com/free-vector/person-suffering-from-rush_74855-6623.jpg?semt=ais_incoming&w=740&q=80",
  },
];

export function getDiscoveryBlogBySlug(slug) {
  return DISCOVERY_BLOGS.find((blog) => blog.slug === slug) || null;
}
