import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft } from "lucide-react";
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";

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

const markdownComponents = {
  h1: ({ ...props }) => (
    <h1
      {...props}
      className="text-2xl md:text-4xl font-bold text-[#2F3C96] mt-6 mb-3"
    />
  ),
  h2: ({ ...props }) => (
    <h2
      {...props}
      className="text-xl md:text-2xl font-semibold text-[#2F3C96] mt-6 mb-2"
    />
  ),
  p: ({ ...props }) => (
    <p
      {...props}
      className="text-slate-700 leading-7 text-[1.04rem] mb-3"
    />
  ),
  hr: () => <hr className="my-4 border-slate-200" />,
  blockquote: ({ ...props }) => (
    <blockquote
      {...props}
      className="border-l-4 border-[#2F3C96]/35 bg-indigo-50/40 px-4 py-2 rounded-r-md my-4 text-slate-700"
    />
  ),
  ul: ({ ...props }) => (
    <ul {...props} className="list-disc pl-6 my-3 space-y-2 text-slate-700" />
  ),
  li: ({ ...props }) => <li {...props} className="leading-7" />,
};

export default function PressReleaseYoriDetails() {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pressMarkdownUrl = "/PressRelease_YoriText.md";

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(pressMarkdownUrl);
        if (!res.ok) throw new Error("Unable to load press release markdown");
        const text = await res.text();
        setMarkdown(text || "");
      } catch {
        setMarkdown("## Press release unavailable\n\nPlease try again later.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    const title = "collabiora Files Provisional Patent for Yori";
    const description =
      "Press release: collabiora announces the filing of a provisional patent application for Yori, its AI-powered health information retrieval agent.";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const canonicalUrl = origin
      ? `${origin}/press-releases/yori`
      : "/press-releases/yori";

    document.title = `${title} | collabiora`;
    upsertMetaTag({ name: "description", content: description });
    upsertCanonicalLink(canonicalUrl);

    upsertMetaTag({ property: "og:title", content: title });
    upsertMetaTag({ property: "og:description", content: description });
    upsertMetaTag({ property: "og:type", content: "news" });
    upsertMetaTag({ property: "og:url", content: canonicalUrl });

    upsertMetaTag({ name: "twitter:card", content: "summary_large_image" });
    upsertMetaTag({ name: "twitter:title", content: title });
    upsertMetaTag({ name: "twitter:description", content: description });

    upsertJsonLdScript({
      scriptId: "pressrelease-yori-jsonld",
      json: {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: title,
        description,
        datePublished: "2026-03-17",
        mainEntityOfPage: canonicalUrl,
        url: canonicalUrl,
        articleSection: "Press Release",
        author: {
          "@type": "Organization",
          name: "collabiora",
        },
      },
    });

    return () => {
      document.title = "collabiora | Health Research Made Simple";
    };
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-500">Loading press release...</div>
        </div>
      </Layout>
    );
  }

  if (!markdown) return <Navigate to="/discovery" replace />;

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
            <ReactMarkdown components={markdownComponents}>
              {markdown}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </Layout>
  );
}

