import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  FileText,
  BookOpen,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Info,
  Calendar,
  User,
  MapPin,
  TrendingUp,
  ListChecks,
  CheckCircle,
  AlertCircle,
  Heart,
  FileDown,
} from "lucide-react";
import InlinePdfViewer from "../components/InlinePdfViewer.jsx";
import { inferPublicationSourceFromId } from "../utils/publicationRouting.js";

const SOURCE_LABELS = {
  pubmed: "PubMed",
  openalex: "OpenAlex",
  semantic_scholar: "Semantic Scholar",
  arxiv: "arXiv",
  openfda: "OpenFDA",
  uspstf: "USPSTF",
  genereviews: "GeneReviews",
  medlineplus: "MedlinePlus",
};

export default function PublicationDetails() {
  const { t } = useTranslation("common");
  const { pmid: idParam } = useParams();
  const [searchParams] = useSearchParams();
  const source =
    searchParams.get("source") ||
    inferPublicationSourceFromId(idParam) ||
    "pubmed";
  const navigate = useNavigate();
  const [publication, setPublication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEmbeddedPdf, setShowEmbeddedPdf] = useState(false);
  const [fullTextData, setFullTextData] = useState(null);
  const [fullTextLoading, setFullTextLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isResearcher = user?.role === "researcher";
  const listPath = isResearcher ? "/publications" : "/library";

  const pdfUrl =
    fullTextData?.pdfUrl ||
    publication?.openAccessPdf ||
    publication?.pdfUrl ||
    null;
  const publicationSource = publication?.source || "";
  const baseApi = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const pubDoi = publication?.doi
    ?.replace(/^https?:\/\/doi\.org\//i, "")
    .trim();
  const pdfProxyUrl =
    pdfUrl && baseApi
      ? `${baseApi}/api/search/pdf-proxy?url=${encodeURIComponent(pdfUrl)}${pubDoi ? `&doi=${encodeURIComponent(pubDoi)}` : ""}`
      : null;

  useEffect(() => {
    async function fetchPublicationDetails() {
      if (!idParam) {
        toast.error(t("publicationDetails.toastNoId"));
        navigate(listPath);
        return;
      }

      setLoading(true);
      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const url = `${base}/api/search/publication/${encodeURIComponent(idParam)}?source=${encodeURIComponent(source)}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch publication details");
        }

        const data = await response.json();
        if (data.publication) {
          setPublication(data.publication);
          const item = {
            pmid:
              data.publication.pmid ||
              data.publication.id ||
              data.publication._id,
            id:
              data.publication.pmid ||
              data.publication.id ||
              data.publication._id,
            title: data.publication.title || data.publication.simplifiedTitle,
            authors: data.publication.authors,
            journal: data.publication.journal,
            year: data.publication.year,
            abstract:
              data.publication.abstract ||
              data.publication.simplifiedDetails?.abstract,
            url: data.publication.url,
            keywords: data.publication.keywords,
            simplifiedDetails: data.publication.simplifiedDetails,
          };
          window.dispatchEvent(
            new CustomEvent("openChatbotWithContext", {
              detail: { type: "publication", item },
            }),
          );
        } else {
          toast.error(t("publicationDetails.toastNotFound"));
          navigate(listPath);
        }
      } catch (error) {
        console.error("Error fetching publication details:", error);
        toast.error(t("publicationDetails.toastLoadFailed"));
        navigate(listPath);
      } finally {
        setLoading(false);
      }
    }

    fetchPublicationDetails();
  }, [idParam, source, navigate, t]);

  // Fetch full-text and access level for in-platform reading
  useEffect(() => {
    if (!publication || !idParam) return;
    let cancelled = false;
    setFullTextLoading(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    fetch(
      `${base}/api/search/publication/${encodeURIComponent(idParam)}/fulltext?source=${encodeURIComponent(source)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.accessLevel) {
          setFullTextData({
            accessLevel: data.accessLevel,
            fullText: data.fullText,
            pdfUrl: data.pdfUrl,
            publisher: data.publisher,
            pmcViewerUrl: data.pmcViewerUrl || null,
          });
          if (data.pdfUrl) setShowEmbeddedPdf(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFullTextLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publication, idParam, source]);

  // Show PDF by default when available (from publication or fullTextData)
  useEffect(() => {
    if (publication?.openAccessPdf || publication?.pdfUrl) {
      setShowEmbeddedPdf(true);
    }
  }, [publication?.openAccessPdf, publication?.pdfUrl]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: "#2F3C96" }}
          />
          <p className="text-lg font-medium" style={{ color: "#787878" }}>
            {t("publicationDetails.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (!publication) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <p className="text-lg font-medium mb-4" style={{ color: "#787878" }}>
            {t("publicationDetails.notFound")}
          </p>
          <button
            onClick={() => navigate(listPath)}
            className="px-4 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: "#2F3C96" }}
          >
            {t("publicationDetails.goBack")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium mb-4 transition-colors"
            style={{ color: "#2F3C96" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#253075")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#2F3C96")}
          >
            <ArrowLeft className="w-4 h-4" />
            {t("publicationDetails.back")}
          </button>

          <div
            className="bg-white rounded-xl shadow-sm border p-6"
            style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: "rgba(208, 196, 226, 0.2)" }}
              >
                <FileText className="w-8 h-8" style={{ color: "#2F3C96" }} />
              </div>
              <div className="flex-1">
                <h1
                  className="text-2xl font-bold mb-3"
                  style={{ color: "#2F3C96" }}
                >
                  {isResearcher
                    ? publication.title || t("publications.untitledPublication")
                    : publication.simplifiedTitle ||
                      publication.title ||
                      t("publications.untitledPublication")}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {fullTextData?.accessLevel && (
                    <span
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border"
                      style={{
                        backgroundColor:
                          fullTextData.accessLevel.badgeColor === "emerald"
                            ? "rgba(16, 185, 129, 0.15)"
                            : fullTextData.accessLevel.badgeColor === "amber"
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(148, 163, 184, 0.2)",
                        color:
                          fullTextData.accessLevel.badgeColor === "emerald"
                            ? "#047857"
                            : fullTextData.accessLevel.badgeColor === "amber"
                              ? "#b45309"
                              : "#475569",
                        borderColor:
                          fullTextData.accessLevel.badgeColor === "emerald"
                            ? "rgba(16, 185, 129, 0.4)"
                            : fullTextData.accessLevel.badgeColor === "amber"
                              ? "rgba(245, 158, 11, 0.4)"
                              : "rgba(148, 163, 184, 0.4)",
                      }}
                    >
                      {t("publicationDetails.accessPrefix")}{" "}
                      {fullTextData.accessLevel.label}
                    </span>
                  )}
                  {fullTextLoading && !fullTextData?.accessLevel && (
                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                      {t("publicationDetails.checkingAccess")}
                    </span>
                  )}
                  {publication.url && (
                    <a
                      href={publication.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border"
                      style={{
                        backgroundColor: "rgba(47, 60, 150, 0.1)",
                        color: "#2F3C96",
                        borderColor: "rgba(47, 60, 150, 0.3)",
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t("publicationDetails.viewOnPubMed")}
                    </a>
                  )}
                  {publication.doi && (
                    <a
                      href={`https://doi.org/${publication.doi.replace(/^https?:\/\/doi\.org\//i, "").trim()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t("publicationDetails.viewAtPublisher")}
                    </a>
                  )}
                </div>
                {/* Open Access / PDF (no duplicate view links) */}
                {(publication.openAccessPdf ||
                  publication.pdfUrl ||
                  publication.url ||
                  publication.doi) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {publication.openAccessPdf && (
                      <a
                        href={publication.openAccessPdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 transition-colors"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        {t("publicationDetails.openAccessPdf")}
                        {publication.openAccessPdfStatus && (
                          <span className="opacity-80">
                            ({publication.openAccessPdfStatus})
                          </span>
                        )}
                      </a>
                    )}
                    {publication.pdfUrl && !publication.openAccessPdf && (
                      <a
                        href={publication.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        {t("publicationDetails.pdf")}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Loading: Checking access and full text */}
            {fullTextLoading && (
              <div
                className="bg-white rounded-xl p-8 border shadow-sm flex flex-col items-center justify-center gap-3"
                style={{
                  borderColor: "rgba(208, 196, 226, 0.3)",
                  minHeight: "120px",
                }}
              >
                <Loader2
                  className="w-8 h-8 animate-spin"
                  style={{ color: "#2F3C96" }}
                />
                <p className="text-sm" style={{ color: "#787878" }}>
                  {t("publicationDetails.checkingAccessFullText")}
                </p>
              </div>
            )}

            {/* Read on platform: Full-text sections (PMC XML or HTML) - only when no PDF */}
            {!fullTextLoading &&
              !pdfUrl &&
              fullTextData?.fullText?.sections &&
              fullTextData.fullText.sections.length > 0 && (
                <div
                  className="bg-white rounded-xl p-6 border shadow-sm"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <h2
                    className="font-bold mb-4 flex items-center gap-2 text-lg"
                    style={{ color: "#2F3C96" }}
                  >
                    <BookOpen className="w-5 h-5" />
                    {t("publicationDetails.readOnPlatform")}
                    {fullTextData.fullText.source === "pmc_xml" && (
                      <span className="text-xs font-normal opacity-80">
                        {t("publicationDetails.fullTextPmc")}
                      </span>
                    )}
                    {fullTextData.fullText.source === "html" && (
                      <span className="text-xs font-normal opacity-80">
                        {t("publicationDetails.fullTextPublisher")}
                      </span>
                    )}
                  </h2>
                  <div className="space-y-6">
                    {fullTextData.fullText.sections.map((sec, idx) => (
                      <div key={idx}>
                        {sec.label && (
                          <h3
                            className="font-semibold mb-2 text-base"
                            style={{ color: "#2F3C96" }}
                          >
                            {sec.label}
                          </h3>
                        )}
                        {sec.isHtml ? (
                          <div
                            className="text-sm leading-relaxed prose prose-sm max-w-none [&_a]:text-[#2F3C96] [&_a]:underline"
                            style={{ color: "#787878" }}
                            dangerouslySetInnerHTML={{ __html: sec.content }}
                          />
                        ) : (
                          <p
                            className="text-sm leading-relaxed whitespace-pre-wrap"
                            style={{ color: "#787878" }}
                          >
                            {sec.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* PDF section */}
            {!fullTextLoading && pdfUrl && (
              <div
                className="bg-white rounded-xl border shadow-sm overflow-hidden"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <div
                  className="flex items-center justify-between gap-4 px-6 py-3 border-b"
                  style={{
                    backgroundColor: "rgba(47, 60, 150, 0.06)",
                    borderColor: "rgba(208, 196, 226, 0.3)",
                  }}
                >
                  <h2
                    className="font-bold flex items-center gap-2 text-lg"
                    style={{ color: "#2F3C96" }}
                  >
                    <BookOpen className="w-5 h-5" />
                    {t("publicationDetails.readPaper")}
                    {(fullTextData?.publisher || publicationSource) && (
                      <span className="text-sm font-normal opacity-80">
                        {t("publicationDetails.fromSource", {
                          name:
                            fullTextData?.publisher ||
                            SOURCE_LABELS[publicationSource] ||
                            publicationSource,
                        })}
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    <a
                      href={fullTextData?.pmcViewerUrl || pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                      style={{
                        backgroundColor: "rgba(47, 60, 150, 0.1)",
                        color: "#2F3C96",
                        borderColor: "rgba(47, 60, 150, 0.3)",
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t("publicationDetails.openInNewTab")}
                    </a>
                  </div>
                </div>
                {showEmbeddedPdf && (pdfProxyUrl || pdfUrl) && (
                  <div className="w-full px-4 pb-4">
                    <InlinePdfViewer
                      url={pdfProxyUrl}
                      directUrl={pdfUrl}
                      pmcViewerUrl={fullTextData?.pmcViewerUrl || null}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Open Access HTML: View at publisher when we couldn't fetch full text */}
            {!pdfUrl &&
              !fullTextData?.fullText?.sections?.length &&
              fullTextData?.accessLevel?.externalUrl && (
                <div
                  className="bg-white rounded-xl p-4 border shadow-sm"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <p className="text-sm mb-2" style={{ color: "#787878" }}>
                    {t("publicationDetails.fullArticleAtPublisher")}
                  </p>
                  <a
                    href={fullTextData.accessLevel.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg text-white transition-colors"
                    style={{ backgroundColor: "#2F3C96" }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t("publicationDetails.viewFullArticleAtPublisher")}
                  </a>
                </div>
              )}

            {/* Restricted access: Publisher / Subscription required */}
            {!fullTextLoading &&
              !pdfUrl &&
              !fullTextData?.accessLevel?.externalUrl &&
              (fullTextData?.accessLevel?.level === "publisher_closed" ||
                publication.url ||
                publication.doi) && (
                <div
                  className="bg-white rounded-xl p-6 border shadow-sm"
                  style={{
                    borderColor: "rgba(208, 196, 226, 0.3)",
                    background:
                      "linear-gradient(135deg, rgba(248, 250, 252, 0.8), rgba(241, 245, 249, 0.6))",
                  }}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: "rgba(148, 163, 184, 0.2)" }}
                    >
                      <BookOpen
                        className="w-5 h-5"
                        style={{ color: "#64748b" }}
                      />
                    </div>
                    <div>
                      <h3
                        className="font-semibold mb-1"
                        style={{ color: "#334155" }}
                      >
                        {fullTextData?.accessLevel?.publisher ||
                        publication.journal
                          ? t(
                              "publicationDetails.restrictedHeadingWithJournal",
                              {
                                journal:
                                  fullTextData?.accessLevel?.publisher ||
                                  publication.journal,
                              },
                            )
                          : t("publicationDetails.restrictedHeadingGeneric")}
                      </h3>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#64748b" }}
                      >
                        {fullTextData?.accessLevel?.publisher ||
                        publication.journal
                          ? t(
                              "publicationDetails.restrictedBodyWithJournal",
                              {
                                journal:
                                  fullTextData?.accessLevel?.publisher ||
                                  publication.journal,
                              },
                            )
                          : t("publicationDetails.restrictedBodyGeneric")}{" "}
                        {t("publicationDetails.accessThroughLinks")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {publication.url && (
                      <a
                        href={publication.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors hover:opacity-90"
                        style={{
                          backgroundColor: "rgba(47, 60, 150, 0.1)",
                          color: "#2F3C96",
                          borderColor: "rgba(47, 60, 150, 0.3)",
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t("publicationDetails.viewOnSource", {
                          source:
                            SOURCE_LABELS[publication.source] ||
                            publication.source ||
                            t("publicationDetails.sourceFallback"),
                        })}
                      </a>
                    )}
                    {publication.doi && (
                      <a
                        href={`https://doi.org/${publication.doi.replace(/^https?:\/\/doi\.org\//i, "").trim()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t("publicationDetails.viewAtPublisher")}
                      </a>
                    )}
                  </div>
                </div>
              )}

            {/* Affiliations Section */}
            {publication.affiliations &&
              publication.affiliations.length > 0 && (
                <div
                  className="bg-white rounded-xl p-6 border shadow-sm"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <h2
                    className="font-bold mb-4 flex items-center gap-2 text-lg"
                    style={{ color: "#2F3C96" }}
                  >
                    <MapPin className="w-5 h-5" />
                    {t("publications.affiliation")}
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#787878" }}
                  >
                    {publication.affiliations[0]}
                  </p>
                </div>
              )}

            {/* Publication Types */}
            {publication.publicationTypes &&
              publication.publicationTypes.length > 0 && (
                <div
                  className="bg-white rounded-xl p-6 border shadow-sm"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <h2
                    className="font-bold mb-4 flex items-center gap-2 text-lg"
                    style={{ color: "#2F3C96" }}
                  >
                    <FileText className="w-5 h-5" />
                    {t("publications.publicationType")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {publication.publicationTypes.map((type, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.2)",
                          color: "#787878",
                          borderColor: "rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Methods Section */}
            {publication.simplifiedDetails?.methods && (
              <div
                className="bg-white rounded-xl p-6 border shadow-sm"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <ListChecks className="w-5 h-5" />
                  {t("publications.methods")}
                </h2>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {publication.simplifiedDetails.methods}
                </p>
              </div>
            )}

            {/* Results Section */}
            {publication.simplifiedDetails?.results && (
              <div
                className="bg-white rounded-xl p-6 border shadow-sm"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <TrendingUp className="w-5 h-5" />
                  {t("publications.results")}
                </h2>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {publication.simplifiedDetails.results}
                </p>
              </div>
            )}

            {/* Conclusion Section */}
            {publication.simplifiedDetails?.conclusion && (
              <div
                className="bg-white rounded-xl p-6 border shadow-sm"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <CheckCircle className="w-5 h-5" />
                  {t("publications.conclusion")}
                </h2>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {publication.simplifiedDetails.conclusion}
                </p>
              </div>
            )}

            {/* Key Takeaways Section */}
            {publication.simplifiedDetails?.keyTakeaways &&
              publication.simplifiedDetails.keyTakeaways.length > 0 && (
                <div
                  className="bg-gradient-to-br rounded-xl p-6 border shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(232, 224, 239, 0.4), rgba(245, 242, 248, 0.6))",
                    borderColor: "rgba(208, 196, 226, 0.3)",
                  }}
                >
                  <h2
                    className="font-bold mb-4 flex items-center gap-2 text-lg"
                    style={{ color: "#2F3C96" }}
                  >
                    <AlertCircle className="w-5 h-5" />
                    {t("publications.keyTakeaways")}
                  </h2>
                  <ul className="space-y-3">
                    {publication.simplifiedDetails.keyTakeaways.map(
                      (takeaway, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-sm"
                          style={{ color: "#787878" }}
                        >
                          <span
                            className="mt-1.5 shrink-0 w-2 h-2 rounded-full"
                            style={{ backgroundColor: "#2F3C96" }}
                          ></span>
                          <span>{takeaway}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

            {/* What This Means For You Section */}
            {publication.simplifiedDetails?.whatThisMeansForYou && (
              <div
                className="bg-gradient-to-br rounded-xl p-6 border shadow-sm"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(232, 233, 242, 1), rgba(245, 242, 248, 1))",
                  borderColor: "rgba(163, 167, 203, 1)",
                }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <Heart className="w-5 h-5" />
                  {t("publicationDetails.whatThisMeansForYou")}
                </h2>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {publication.simplifiedDetails.whatThisMeansForYou}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Authors Section */}
            {publication.authors &&
              Array.isArray(publication.authors) &&
              publication.authors.length > 0 && (
                <div
                  className="bg-white rounded-xl p-6 border shadow-sm"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <h2
                    className="font-bold mb-4 flex items-center gap-2 text-lg"
                    style={{ color: "#2F3C96" }}
                  >
                    <User className="w-5 h-5" />
                    {t("publications.authors")}
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#787878" }}
                  >
                    {publication.authors.join(", ")}
                  </p>
                  {publication.authors.length > 1 && (
                    <p className="text-xs mt-3" style={{ color: "#787878" }}>
                      {t("publications.authorsCount", {
                        count: publication.authors.length,
                      })}
                    </p>
                  )}
                </div>
              )}

            {/* Publication Information */}
            <div
              className="bg-white rounded-xl p-6 border shadow-sm"
              style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
            >
              <h2
                className="font-bold mb-4 flex items-center gap-2 text-lg"
                style={{ color: "#2F3C96" }}
              >
                <Info className="w-5 h-5" />
                {t("publications.publicationInformation")}
              </h2>
              <div className="space-y-4">
                {/* Publication Date */}
                {(publication.year || publication.month) && (
                  <div
                    className="flex justify-between items-center py-2 border-b"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <span
                      className="text-sm font-medium flex items-center gap-2"
                      style={{ color: "#787878" }}
                    >
                      <Calendar className="w-4 h-4" />
                      {t("publicationDetails.publishedLabel")}
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#2F3C96" }}
                    >
                      {publication.month ? `${publication.month} ` : ""}
                      {publication.day ? `${publication.day}, ` : ""}
                      {publication.year || t("publications.notAvailable")}
                    </span>
                  </div>
                )}

                {/* Journal */}
                {publication.journal && (
                  <div
                    className="flex justify-between items-center py-2 border-b"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <span
                      className="text-sm font-medium flex items-center gap-2"
                      style={{ color: "#787878" }}
                    >
                      <BookOpen className="w-4 h-4" />
                      {t("publicationDetails.journalLabel")}
                    </span>
                    <span
                      className="text-sm font-semibold text-right max-w-[60%]"
                      style={{ color: "#2F3C96" }}
                    >
                      {publication.journal}
                    </span>
                  </div>
                )}

                {/* DOI */}
                {publication.doi && (
                  <div
                    className="flex justify-between items-center py-2 border-b"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#787878" }}
                    >
                      {t("publicationDetails.doiLabel")}
                    </span>
                    <span
                      className="text-sm font-semibold text-right max-w-[60%] break-words"
                      style={{ color: "#2F3C96" }}
                    >
                      {publication.doi}
                    </span>
                  </div>
                )}

                {/* PMID */}
                {publication.pmid && (
                  <div
                    className="flex justify-between items-center py-2 border-b"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#787878" }}
                    >
                      {t("publicationDetails.pmidLabel")}
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#2F3C96" }}
                    >
                      {publication.pmid}
                    </span>
                  </div>
                )}

                {/* Keywords Section */}
                {publication.keywords && publication.keywords.length > 0 && (
                  <div className="py-2">
                    <span
                      className="text-sm font-medium block mb-3 flex items-center gap-2"
                      style={{ color: "#787878" }}
                    >
                      <TrendingUp className="w-4 h-4" />
                      {t("publicationDetails.keywordsLabel")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {publication.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border"
                          style={{
                            backgroundColor: "rgba(47, 60, 150, 0.15)",
                            color: "#2F3C96",
                            borderColor: "rgba(47, 60, 150, 0.3)",
                          }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            {publication.url && (
              <a
                href={publication.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md w-full"
                style={{
                  background: "linear-gradient(135deg, #2F3C96, #253075)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #253075, #1C2454)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #2F3C96, #253075)";
                }}
              >
                <ExternalLink className="w-4 h-4" />
                {t("publicationDetails.viewOnSource", {
                  source:
                    SOURCE_LABELS[publication.source] ||
                    publication.source ||
                    t("publicationDetails.sourceFallbackTitle"),
                })}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
