import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Newspaper } from "lucide-react";
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import DiscoveryBlogsSection from "../components/DiscoveryBlogsSection.jsx";
import { PRESS_RELEASES } from "../data/pressReleases.js";
import { DEFAULT_PAGE_TITLE } from "../constants/siteMeta.js";

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

export default function Blogs() {
  const [viewMode, setViewMode] = useState("articles");

  useEffect(() => {
    const title = "Health Blogs, Articles and Press Releases";
    const description =
      "Explore collabiora health articles and official press releases in one place, including research literacy and patient-first health education.";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const canonicalUrl = origin ? `${origin}/blogs` : "/blogs";

    document.title = `${title} | collabiora`;
    upsertMetaTag({ name: "description", content: description });
    upsertCanonicalLink(canonicalUrl);

    upsertMetaTag({ property: "og:title", content: title });
    upsertMetaTag({ property: "og:description", content: description });
    upsertMetaTag({ property: "og:type", content: "website" });
    upsertMetaTag({ property: "og:url", content: canonicalUrl });

    upsertMetaTag({ name: "twitter:card", content: "summary_large_image" });
    upsertMetaTag({ name: "twitter:title", content: title });
    upsertMetaTag({ name: "twitter:description", content: description });

    upsertJsonLdScript({
      scriptId: "blogs-collection-jsonld",
      json: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url: canonicalUrl,
        about: ["Health Research", "Patient Education", "Press Releases"],
      },
    });

    return () => {
      document.title = DEFAULT_PAGE_TITLE;
    };
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackground />

        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8">
          <div className="text-center mb-8 animate-fade-in overflow-visible">
            <h1 className="inline-block text-3xl md:text-5xl font-bold leading-normal pb-1 bg-gradient-to-r from-[#2F3C96] via-[#474F97] to-[#D0C4E2] bg-clip-text text-transparent">
              Blogs
            </h1>
          </div>

          {/* Tabs — same pattern as Discovery (News & Articles / Community) */}
          <div className="max-w-6xl mx-auto mb-6">
            <div className="flex items-center gap-0 border-b border-[#E8E8E8]">
              <button
                type="button"
                onClick={() => setViewMode("articles")}
                className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                  viewMode === "articles"
                    ? "text-[#2F3C96] border-b-2 border-[#2F3C96]"
                    : "text-[#787878] hover:text-[#484848]"
                }`}
              >
                Articles
              </button>
              <button
                type="button"
                onClick={() => setViewMode("press")}
                className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                  viewMode === "press"
                    ? "text-[#2F3C96] border-b-2 border-[#2F3C96]"
                    : "text-[#787878] hover:text-[#484848]"
                }`}
              >
                Press Releases
              </button>
            </div>
          </div>

          {viewMode === "articles" && (
            <div className="mb-8">
              <DiscoveryBlogsSection showSectionTitle={false} />
            </div>
          )}

          {viewMode === "press" && (
            <div>
              <section className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PRESS_RELEASES.map((item) => (
                    <article
                      key={item.slug}
                      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
                    >
                      <div className="inline-flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <Newspaper className="w-4 h-4 text-[#2F3C96]" />
                        <span>{item.category}</span>
                        <span>•</span>
                        <span>{item.publishedAt}</span>
                      </div>
                      <h3 className="text-[1.05rem] leading-6 font-semibold text-slate-900 mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-sm leading-6 text-slate-600 mb-4 line-clamp-3">
                        {item.excerpt}
                      </p>
                      <Link
                        to={item.route}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2F3C96] hover:text-brand-blue-600 mt-auto"
                      >
                        Read press release
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
