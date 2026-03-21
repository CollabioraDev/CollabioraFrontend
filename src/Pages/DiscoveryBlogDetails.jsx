import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import {
  getDiscoveryBlogBySlug,
  DISCOVERY_BLOGS,
} from "../data/discoveryBlogs.js";

function toYoutubeEmbedUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }
    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }
    return "";
  } catch {
    return "";
  }
}

function extractMediaUrls(markdown) {
  if (!markdown) return { spotifyUrl: "", youtubeUrl: "", youtubeEmbedUrl: "" };
  const spotifyMatch = markdown.match(
    /\[SPOTIFY BUTTON\s*→\s*(https?:\/\/[^\]]+)\]/i,
  );
  const youtubeMatch = markdown.match(
    /\[YOUTUBE BUTTON\s*→\s*(https?:\/\/[^\]]+)\]/i,
  );

  const spotifyUrl = spotifyMatch?.[1]?.trim() || "";
  const youtubeUrl = youtubeMatch?.[1]?.trim() || "";
  return {
    spotifyUrl,
    youtubeUrl,
    youtubeEmbedUrl: toYoutubeEmbedUrl(youtubeUrl),
  };
}

function sanitizeMarkdownForDetails(markdown) {
  if (!markdown) return "";
  return markdown
    .replace(/^# .+\r?\n+/, "")
    .replace(/^\*\*CATEGORY:\*\*.+\r?\n+/im, "")
    .replace(/\[SPOTIFY BUTTON\s*→\s*https?:\/\/[^\]]+\]\r?\n?/gi, "")
    .replace(/\[YOUTUBE BUTTON\s*→\s*https?:\/\/[^\]]+\]\r?\n?/gi, "")
    .replace(/(\r?\n){3,}/g, "\n\n")
    .trim();
}

const markdownComponents = {
  h1: ({ ...props }) => (
    <h1
      {...props}
      className="text-2xl md:text-3xl font-bold text-[#2F3C96] mt-6 mb-3"
    />
  ),
  h2: ({ ...props }) => (
    <h2
      {...props}
      className="text-xl md:text-2xl font-semibold text-[#2F3C96] mt-5 mb-2"
    />
  ),
  h3: ({ ...props }) => (
    <h3 {...props} className="text-lg font-semibold text-slate-900 mt-4 mb-2" />
  ),
  p: ({ ...props }) => (
    <p {...props} className="text-slate-700 leading-7 text-[1.04rem] mb-3" />
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
  blockquote: ({ ...props }) => (
    <blockquote
      {...props}
      className="border-l-4 border-[#2F3C96]/35 bg-indigo-50/40 px-4 py-2 rounded-r-md my-3 text-slate-700"
    />
  ),
  ul: ({ ...props }) => (
    <ul
      {...props}
      className="list-disc pl-6 my-3 space-y-2 text-slate-700"
    />
  ),
  ol: ({ ...props }) => (
    <ol
      {...props}
      className="list-decimal pl-6 my-3 space-y-2 text-slate-700"
    />
  ),
  li: ({ ...props }) => <li {...props} className="leading-7" />,
  strong: ({ ...props }) => <strong {...props} className="font-semibold text-slate-900" />,
  em: ({ ...props }) => <em {...props} className="italic text-slate-700" />,
  a: ({ ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[#2F3C96] font-medium hover:text-brand-blue-600 underline underline-offset-2"
    >
      {props.children}
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  ),
};

function upsertMetaTag({ name, content, property = null }) {
  if (typeof document === "undefined") return;
  const selector = property
    ? `meta[property="${property}"]`
    : `meta[name="${name}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    if (property) el.setAttribute("property", property);
    else el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonicalLink(href) {
  if (typeof document === "undefined") return;
  let link = document.head.querySelector(`link[rel="canonical"]`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function upsertJsonLdScript({ scriptId, json }) {
  if (typeof document === "undefined") return;
  let script = document.getElementById(scriptId);
  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("id", scriptId);
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(json);
}

export default function DiscoveryBlogDetails() {
  const { slug } = useParams();
  const blog = getDiscoveryBlogBySlug(slug);
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(Boolean(blog?.markdownPath));

  useEffect(() => {
    if (!blog) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const canonicalUrl = origin
      ? `${origin}/discovery/blogs/${blog.slug}`
      : `/discovery/blogs/${blog.slug}`;

    // Basic SEO tags
    document.title = `${blog.title} | collabiora`;
    upsertMetaTag({
      name: "description",
      content: blog.excerpt || blog.title,
    });
    upsertCanonicalLink(canonicalUrl);

    // OpenGraph tags (sharing + indexing hints)
    upsertMetaTag({
      property: "og:title",
      content: blog.title,
    });
    upsertMetaTag({
      property: "og:description",
      content: blog.excerpt || blog.title,
    });
    upsertMetaTag({
      property: "og:type",
      content: "article",
    });
    upsertMetaTag({
      property: "og:url",
      content: canonicalUrl,
    });
    if (blog.image) {
      upsertMetaTag({
        property: "og:image",
        content: blog.image,
      });
    }

    upsertMetaTag({
      property: "twitter:card",
      content: "summary_large_image",
    });
    upsertMetaTag({
      property: "twitter:title",
      content: blog.title,
    });
    upsertMetaTag({
      property: "twitter:description",
      content: blog.excerpt || blog.title,
    });
    if (blog.image) {
      upsertMetaTag({
        property: "twitter:image",
        content: blog.image,
      });
    }

    // JSON-LD structured data
    upsertJsonLdScript({
      scriptId: "discovery-blogposting-jsonld",
      json: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: blog.title,
        description: blog.excerpt || blog.title,
        datePublished: blog.publishedAt || undefined,
        image: blog.image || undefined,
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        articleSection: blog.category,
      },
    });

    return () => {
      document.title = "collabiora | Health Research Made Simple";
    };
  }, [blog]);

  useEffect(() => {
    let cancelled = false;

    async function loadMarkdown() {
      if (!blog) return;
      if (blog.content) {
        setMarkdown(blog.content);
        setLoading(false);
        return;
      }

      if (!blog.markdownPath) {
        setMarkdown("");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(blog.markdownPath);
        if (!response.ok) throw new Error("Unable to load blog markdown");
        const text = await response.text();
        if (!cancelled) {
          setMarkdown(text);
        }
      } catch (error) {
        if (!cancelled) {
          setMarkdown("## Blog not available\n\nPlease try again later.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMarkdown();
    return () => {
      cancelled = true;
    };
  }, [blog]);

  if (!blog) {
    return <Navigate to="/discovery" replace />;
  }

  const sanitizedMarkdown = sanitizeMarkdownForDetails(markdown);
  const { spotifyUrl, youtubeUrl, youtubeEmbedUrl } = extractMediaUrls(markdown);
  const relatedBlogs = DISCOVERY_BLOGS.filter((item) => item.slug !== blog.slug).slice(
    0,
    3,
  );

  return (
    <Layout>
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackground />

        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-5xl pb-10">
          <Link
            to="/discovery"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#2F3C96] hover:text-brand-blue-600 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Discovery
          </Link>

          <article className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <header className="mb-6 border-b border-slate-100 pb-4">
              <p className="text-xs md:text-sm text-slate-500 mb-2">
                {blog.category} • {blog.readTime} • {blog.publishedAt}
              </p>
              <h1 className="text-2xl md:text-4xl font-bold text-[#2F3C96]">
                {blog.title}
              </h1>
            </header>

            {loading ? (
              <div className="py-10 text-center text-slate-500">
                Loading blog...
              </div>
            ) : (
              <div className="max-w-none">
                <ReactMarkdown components={markdownComponents}>
                  {sanitizedMarkdown}
                </ReactMarkdown>

                {(spotifyUrl || youtubeUrl) && (
                  <section className="mt-8 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <h3 className="text-base md:text-lg font-semibold text-[#2F3C96]">
                        Listen or Watch Episode
                      </h3>

                      {spotifyUrl && (
                        <a
                          href={spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2F3C96] text-white text-sm font-medium hover:bg-brand-blue-600 transition-colors shrink-0"
                        >
                          Listen on Spotify
                        </a>
                      )}
                    </div>

                    {youtubeEmbedUrl && (
                      <div className="mt-4 aspect-video w-full rounded-xl overflow-hidden border border-slate-200">
                        <iframe
                          src={youtubeEmbedUrl}
                          title={`${blog.title} YouTube episode`}
                          className="w-full h-full"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </article>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              Previous blogs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {relatedBlogs.map((item) => (
                <Link
                  key={item.slug}
                  to={`/discovery/blogs/${item.slug}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-[#2F3C96]/40 hover:shadow-sm transition-all"
                >
                  <p className="text-xs text-slate-500 mb-1">{item.category}</p>
                  <h3 className="text-sm font-semibold text-slate-800 line-clamp-2">
                    {item.title}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
