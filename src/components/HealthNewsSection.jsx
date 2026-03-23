import { useEffect, useState, useCallback, useRef } from "react";
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  BookOpen,
  X,
  Info,
  ListOrdered,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Time formatter ─────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Condition Pill (smaller, below the boxes) ────────────────────────────────
function ConditionPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
        active
          ? "bg-[#2F3C96] text-white border-[#2F3C96] shadow-sm"
          : "bg-white border-gray-200 text-gray-600 hover:border-[#2F3C96]/50 hover:text-[#2F3C96] hover:bg-[#2F3C96]/5"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Single Article Card ────────────────────────────────────────────────────
function NewsCard({
  article,
  expanded,
  onToggleExpand,
  summaryLoading,
  onSummaryClick,
  searchQuery,
}) {
  const hasImage = !!article.urlToImage;
  const isCautionTier = (article.reliabilityTier ?? 0) >= 5;

  // Highlight search matches in text
  function highlight(text) {
    if (!searchQuery || !text) return text;
    const regex = new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }

  return (
    <article
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#2F3C96]/30 transition-all duration-300"
      style={{ animation: "newsCardIn 0.4s ease-out both" }}
    >
      {/* Image */}
      {hasImage && (
        <div className="relative h-36 overflow-hidden bg-gray-100">
          <img
            src={article.urlToImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.style.display = "none";
            }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-[#2F3C96] border border-white/50">
              {article.source}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Meta row — source + reliability tier */}
        {!hasImage && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-[#2F3C96]/8 text-[10px] font-semibold text-[#2F3C96] border border-[#2F3C96]/20">
              {article.source}
            </span>
          </div>
        )}

        {/* Tier 5: Use with Caution — flag in UI */}
        {isCautionTier && (
          <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-800 font-medium">
              Interpret cautiously — this source is advocacy-focused or has
              limited specialist review.
            </p>
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-3 group-hover:text-[#2F3C96] transition-colors">
          {highlight(article.title)}
        </h3>

        {/* Description (toggled) */}
        {article.description && (
          <div>
            <p
              className={`text-xs text-gray-600 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
            >
              {highlight(article.description)}
            </p>
            {article.description.length > 120 && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-0.5 text-[10px] text-[#2F3C96] mt-1 hover:underline"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    More
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-gray-400 text-[11px]">
            <Clock className="w-3 h-3" />
            <span>{timeAgo(article.publishedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSummaryClick(article)}
              disabled={summaryLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#2F3C96]/40 text-[#2F3C96] text-[11px] font-semibold hover:bg-[#2F3C96]/5 transition-colors disabled:opacity-60"
            >
              {summaryLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ListOrdered className="w-3 h-3" />
              )}
              Simplify
            </button>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2F3C96] text-white text-[11px] font-semibold hover:bg-[#253075] transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              Read
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Summary (Key Points) Modal ──────────────────────────────────────────────
function SummaryModal({ open, onClose, article, loading, keyPoints, error }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-[#D0C4E2]/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-[#2F3C96] pr-8 line-clamp-2">
            {article?.title || "Simplify"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#2F3C96]" />
              <span className="ml-2 text-sm text-gray-500">
                Reading the article in detail…
              </span>
            </div>
          )}
          {!loading && error && (
            <div className="py-4 flex flex-col items-center text-center">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Could not generate summary
              </p>
              <p className="text-xs text-gray-500 mt-1">{error}</p>
            </div>
          )}
          {!loading && keyPoints && (
            <div className="space-y-5 pt-1">
              {keyPoints
                .split(/\n+/)
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, i) => {
                  const match = line.match(/^([^:]+):\s*(.+)?$/);
                  const heading = match ? (match[1] || "").trim() : "";
                  const body = match ? (match[2] || "").trim() : line;

                  return (
                    <div
                      key={i}
                      className="bg-white rounded-xl p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                      style={{ borderLeftColor: "#2F3C96" }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[#2F3C96]/10">
                          <span className="w-5 h-5 rounded-full bg-[#2F3C96] text-white text-[10px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                            {heading || `Key insight ${i + 1}`}
                          </p>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <ReactMarkdown
                              components={{
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-[#2F3C96]">
                                    {children}
                                  </strong>
                                ),
                                p: ({ children }) => <>{children}</>,
                              }}
                            >
                              {body}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function HealthNewsSection({ user }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [activeCondition, setActiveCondition] = useState(null); // null = no condition filter
  const [userConditions, setUserConditions] = useState([]);
  const [summaryLoadingUrl, setSummaryLoadingUrl] = useState(null);
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    article: null,
    loading: false,
    keyPoints: null,
    error: null,
  });

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // committed query (Enter/button only)
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const fetchedRef = useRef(false);

  // ── Extract user conditions ───────────────────────────────────────────────
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    if (!userData) return;
    const userId = userData._id || userData.id;
    const role = userData.role;
    if (userId) {
      fetch(`${base}/api/profile/${userId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const profile = data?.profile || data;
          const conditions = [];
          if (role === "patient" && profile?.patient?.conditions)
            conditions.push(...profile.patient.conditions);
          else if (role === "researcher" && profile?.researcher?.interests)
            conditions.push(...profile.researcher.interests);
          if (profile?.conditions)
            conditions.push(...(profile.conditions || []));
          const unique = [...new Set(conditions.filter(Boolean))];
          setUserConditions(
            unique.length > 0 ? unique : getFallbackConditions(userData),
          );
        })
        .catch(() => setUserConditions(getFallbackConditions(userData)));
    } else {
      setUserConditions(getFallbackConditions(userData));
    }
  }, [user]);

  function getFallbackConditions(userData) {
    const conditions = [];
    if (userData?.conditions)
      conditions.push(
        ...(Array.isArray(userData.conditions) ? userData.conditions : []),
      );
    if (userData?.patient?.conditions)
      conditions.push(
        ...(Array.isArray(userData.patient.conditions)
          ? userData.patient.conditions
          : []),
      );
    if (userData?.medicalConditions)
      conditions.push(
        ...(Array.isArray(userData.medicalConditions)
          ? userData.medicalConditions
          : []),
      );
    return [...new Set(conditions.filter(Boolean))];
  }

  // ── Fetch news by active selection ───────────────────────────────────────
  const fetchNews = useCallback(
    async (overrideConditions) => {
      setLoading(true);
      setError(null);
      fetchedRef.current = true;
      try {
        const params = new URLSearchParams();
        let conditions = overrideConditions;
        if (conditions === undefined) {
          if (activeCondition) {
            conditions = [activeCondition];
          } else {
            conditions = [];
          }
        }
        if (conditions && conditions.length > 0)
          params.set("conditions", conditions.join(","));
        params.set("pageSize", "12");
        const res = await fetch(`${base}/api/news?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || `Failed to fetch news (${res.status})`,
          );
        }
        const data = await res.json();
        setArticles(data.articles || []);
      } catch (err) {
        console.error("Health news fetch error:", err);
        setError(err.message || "Failed to load health news");
      } finally {
        setLoading(false);
      }
    },
    [activeCondition],
  );

  useEffect(() => {
    if (!searchQuery) fetchNews();
  }, [activeCondition, fetchNews, searchQuery]);

  // ── Search input handler — only updates the text, does NOT auto-search ────
  function handleSearchInput(val) {
    setSearchInput(val);
    // If input is cleared, also clear search results
    if (!val.trim()) {
      setSearchQuery("");
      setSearchResults(null);
      setSearchError(null);
    }
  }

  async function commitSearch(query) {
    setSearchQuery(query);
    setSearchLoading(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ q: query, pageSize: "12" });
      const res = await fetch(`${base}/api/news/search?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Search failed (${res.status})`);
      }
      const data = await res.json();
      setSearchResults(data.articles || []);
    } catch (err) {
      setSearchError(err.message || "Search failed");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function clearSearch() {
    setSearchInput("");
    setSearchQuery("");
    setSearchResults(null);
    setSearchError(null);
  }

  const toggleExpand = (url) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  async function handleSummaryClick(article) {
    const url = article?.url;
    if (!url) return;
    setSummaryLoadingUrl(url);
    setSummaryModal({
      open: true,
      article,
      loading: true,
      keyPoints: null,
      error: null,
    });
    try {
      const res = await fetch(`${base}/api/news/key-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.title,
          description: article.description || "",
          url: article.url,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setSummaryModal((prev) => ({
        ...prev,
        loading: false,
        keyPoints: data.keyPoints || null,
        error: data.error || (res.ok ? null : "Failed to generate key points"),
      }));
    } catch (e) {
      setSummaryModal((prev) => ({
        ...prev,
        loading: false,
        keyPoints: null,
        error: e?.message || "Failed to generate key points",
      }));
    } finally {
      setSummaryLoadingUrl(null);
    }
  }

  // ── Determine displayed articles ─────────────────────────────────────────
  const displayedArticles = searchQuery ? searchResults || [] : articles;
  const isSearchMode = !!searchQuery;

  // ── Handle condition pill click ───────────────────────────────────────
  function handleConditionClick(cond) {
    if (activeCondition === cond) {
      // deselect
      setActiveCondition(null);
    } else {
      setActiveCondition(cond);
    }
  }

  return (
    <div className="mb-8">
      {/* ── Persistent Search Bar ──────────────────────────────────────── */}
      <div className="relative mb-5">
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 bg-white transition-all duration-200 ${
            searchInput
              ? "border-[#2F3C96] shadow-md shadow-[#2F3C96]/10"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          {searchLoading ? (
            <Loader2 className="w-4 h-4 text-[#2F3C96] animate-spin shrink-0" />
          ) : (
            <Search
              className={`w-4 h-4 shrink-0 transition-colors ${searchInput ? "text-[#2F3C96]" : "text-gray-400"}`}
            />
          )}
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search health news…"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchInput.trim()) {
                commitSearch(searchInput.trim());
              }
              if (e.key === "Escape") clearSearch();
            }}
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="p-0.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Explicit search button */}
          <button
            onClick={() =>
              searchInput.trim() && commitSearch(searchInput.trim())
            }
            disabled={!searchInput.trim() || searchLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2F3C96] text-white text-xs font-semibold hover:bg-[#253075] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {searchLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Search className="w-3 h-3" />
            )}
            Search
          </button>
        </div>

        {/* Search results banner */}
        {isSearchMode && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span>
              {searchLoading
                ? "Searching…"
                : searchError
                  ? `⚠ ${searchError}`
                  : `${(searchResults || []).length} result${(searchResults || []).length !== 1 ? "s" : ""} for `}
            </span>
            {!searchLoading && !searchError && (
              <span className="font-semibold text-[#2F3C96]">
                "{searchQuery}"
              </span>
            )}
            <button
              onClick={clearSearch}
              className="ml-auto text-[#2F3C96] hover:underline font-medium"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* ── General Health block + Your Conditions (hidden during active search) ───── */}
      {!isSearchMode && (
        <div className="mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                News curated to your conditions
              </span>
              <button
                type="button"
                onClick={() => fetchNews()}
                disabled={loading}
                className="p-1.5 rounded-lg text-gray-400 hover:text-[#2F3C96] hover:bg-[#2F3C96]/5 transition-colors disabled:opacity-40"
                title="Refresh news"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {/* General Health pill */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <ConditionPill
                label="General Health"
                active={!activeCondition}
                onClick={() => setActiveCondition(null)}
              />
            </div>

            {/* Conditions (your conditions) — shown only if user has conditions */}
            {userConditions.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Your Conditions
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {userConditions.slice(0, 8).map((cond) => (
                    <ConditionPill
                      key={cond}
                      label={cond}
                      active={activeCondition === cond}
                      onClick={() => handleConditionClick(cond)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <>
        {/* ── Loading skeleton ──────────────────────────────────────────── */}
        {(loading && !isSearchMode) || (searchLoading && isSearchMode) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse"
              >
                <div className="h-36 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* ── Error state ────────────────────────────────────────────────── */}
        {!loading && !searchLoading && error && !isSearchMode && (
          <div className="flex flex-col items-center justify-center py-10 bg-white rounded-xl border border-gray-200 text-center px-6">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
            <p className="font-semibold text-gray-700 mb-1">
              Could not load health news
            </p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => fetchNews()}
              className="px-4 py-2 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Search error ─────────────────────────────────────────────── */}
        {isSearchMode && !searchLoading && searchError && (
          <div className="flex flex-col items-center justify-center py-10 bg-white rounded-xl border border-gray-200 text-center px-6">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
            <p className="font-semibold text-gray-700 mb-1">Search failed</p>
            <p className="text-sm text-gray-500">{searchError}</p>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {!loading &&
          !searchLoading &&
          !error &&
          !searchError &&
          displayedArticles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-xl border border-gray-200 text-center px-6">
              <Newspaper className="w-10 h-10 text-gray-300 mb-3" />
              <p className="font-semibold text-gray-600 mb-1">
                {isSearchMode
                  ? "No articles match your search"
                  : "No articles found"}
              </p>
              <p className="text-sm text-gray-400">
                {isSearchMode
                  ? "Try a different keyword or clear the search"
                  : "Try selecting a different category or check back later"}
              </p>
              {isSearchMode && (
                <button
                  onClick={clearSearch}
                  className="mt-3 px-4 py-2 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

        {/* ── Articles grid ─────────────────────────────────────────────── */}
        {!loading &&
          !searchLoading &&
          !error &&
          !searchError &&
          displayedArticles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedArticles.map((article) => (
                <NewsCard
                  key={article.url}
                  article={article}
                  expanded={expanded.has(article.url)}
                  onToggleExpand={() => toggleExpand(article.url)}
                  summaryLoading={summaryLoadingUrl === article.url}
                  onSummaryClick={handleSummaryClick}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}

        {/* ── Disclaimer ────────────────────────────────────────────────── */}
        {!loading && !searchLoading && displayedArticles.length > 0 && (
          <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
            <Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Articles are ranked by source reliability (e.g. WHO, CDC, FDA =
              Authoritative). Sources marked &quot;Use with Caution&quot; are
              flagged for limited specialist review. Summaries are informational
              only and not medical advice.
            </p>
          </div>
        )}
      </>

      {/* Summary (key points) modal */}
      <SummaryModal
        open={summaryModal.open}
        onClose={() => setSummaryModal((prev) => ({ ...prev, open: false }))}
        article={summaryModal.article}
        loading={summaryModal.loading}
        keyPoints={summaryModal.keyPoints}
        error={summaryModal.error}
      />

      <style>{`
        @keyframes newsCardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
