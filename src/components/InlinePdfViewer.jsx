import React, { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Maximize2,
  BookOpen,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PAGE_WIDTH = 680;

/**
 * Hosts known to block X-Frame-Options / CSP frame-ancestors for iframe embeds.
 * For these, we skip the iframe step entirely and go straight to error/PMC fallback.
 */
const NO_IFRAME_HOSTS = [
  "springer.com",
  "link.springer.com",
  "springerlink.com",
  "nature.com",
  "springernature.com",
  "wiley.com",
  "onlinelibrary.wiley.com",
  "sciencedirect.com",
  "elsevier.com",
  "jamanetwork.com",
  "thelancet.com",
  "nejm.org",
  "bmj.com",
  "oup.com",
  "academic.oup.com",
  "tandfonline.com",
  "taylorfrancis.com",
  "sagepub.com",
  "journals.sagepub.com",
  "cambridge.org",
  "karger.com",
  "ahajournals.org",
];

/**
 * Hosts that work well in an iframe (truly open-access, no frame blocking).
 */
const IFRAME_OK_HOSTS = [
  "europepmc.org",
  "pmc.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov",
  "medrxiv.org",
  "biorxiv.org",
  "arxiv.org",
  "mdpi.com",
  "frontiersin.org",
  "plos.org",
  "journals.plos.org",
  "zenodo.org",
  "elifesciences.org",
  "peerj.com",
  "f1000research.com",
  "hindawi.com",
  "biomedcentral.com",
  "ugeskriftet.dk",
];

function getHostname(url) {
  if (!url || typeof url !== "string") return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Returns true for URLs that are known to be broken/deprecated and should never
 * be used as a PDF source or iframe src (e.g. old Europe PMC ptpmcrender.fcgi endpoint).
 */
function isDeprecatedUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.includes("ptpmcrender.fcgi");
}

function matchesHost(url, list) {
  const host = getHostname(url);
  if (!host) return false;
  return list.some((h) => host === h || host.endsWith("." + h));
}

function canIframe(url) {
  if (!url) return false;
  if (matchesHost(url, NO_IFRAME_HOSTS)) return false;
  return true; // allow iframe for unknown/unlisted hosts
}

/**
 * Rendering modes:
 * 1. "proxy"  — pdfjs Document with server proxy URL (works for PMC, arXiv, etc.)
 * 2. "direct" — pdfjs Document with the original directUrl (CORS-limited)
 * 3. "iframe" — <iframe> embed (only for hosts that allow framing)
 * 4. "pmc"    — show PubMed Central / Europe PMC viewer link (our best fallback)
 * 5. "error"  — all options exhausted
 */
export default function InlinePdfViewer({ url, directUrl, pmcViewerUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [mode, setMode] = useState("init");
  const [errorMsg, setErrorMsg] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const containerRef = useRef(null);
  const iframeTimerRef = useRef(null);

  // Pick initial mode whenever props change
  useEffect(() => {
    setNumPages(null);
    setPageNumber(1);
    setErrorMsg(null);
    setIframeLoaded(false);

    // If directUrl is a deprecated/broken URL (e.g. ptpmcrender.fcgi), skip PDF modes
    // entirely and go straight to pmcViewerUrl fallback.
    const effectiveDirectUrl = isDeprecatedUrl(directUrl) ? null : directUrl;
    const effectiveProxyUrl = isDeprecatedUrl(url) ? null : url;

    if (effectiveProxyUrl) {
      setMode("proxy");
    } else if (effectiveDirectUrl && canIframe(effectiveDirectUrl)) {
      setMode("iframe");
    } else if (pmcViewerUrl) {
      setMode("pmc");
    } else {
      setMode("error");
    }
  }, [url, directUrl, pmcViewerUrl]);

  const advanceMode = useCallback(
    (currentMode, errMessage) => {
      // Never use deprecated URLs (ptpmcrender.fcgi, etc.) in any fallback mode
      const safeDirectUrl = isDeprecatedUrl(directUrl) ? null : directUrl;

      if (currentMode === "proxy") {
        // Try direct pdfjs fetch (works if CORS headers present or same-origin)
        if (safeDirectUrl) {
          setMode("direct");
          setNumPages(null);
          setPageNumber(1);
          setErrorMsg(null);
          return;
        }
      }

      if (currentMode === "proxy" || currentMode === "direct") {
        // Try iframe (only for hosts that permit framing)
        if (safeDirectUrl && canIframe(safeDirectUrl)) {
          setMode("iframe");
          setErrorMsg(null);
          return;
        }
        // Show PMC viewer as fallback
        if (pmcViewerUrl) {
          setMode("pmc");
          setErrorMsg(null);
          return;
        }
      }

      if (currentMode === "iframe") {
        if (pmcViewerUrl) {
          setMode("pmc");
          return;
        }
      }

      setMode("error");
      setErrorMsg(errMessage || "Unable to load PDF in the viewer.");
    },
    [directUrl, pmcViewerUrl],
  );

  function onLoadSuccess({ numPages: n }) {
    setNumPages(n);
    setErrorMsg(null);
  }

  function onLoadError(err) {
    const msg = err?.message || "Failed to load PDF";
    advanceMode(mode, msg);
  }

  // Fullscreen toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Iframe load detection — if it loads an X-Frame-Options blocked page,
  // the browser silently shows blank. We set a timeout: if the iframe fires
  // its onLoad within a reasonable time, assume it rendered. If it never fires
  // (this can happen with cross-origin blocking), or if the contentWindow is
  // inaccessible, fall back.
  useEffect(() => {
    if (mode === "iframe") {
      setIframeLoaded(false);
      // Give iframe 8s to load; if it hasn't, assume blocked
      iframeTimerRef.current = setTimeout(() => {
        if (!iframeLoaded) {
          advanceMode("iframe", "Publisher does not allow embedded viewing.");
        }
      }, 8000);
    }
    return () => {
      if (iframeTimerRef.current) clearTimeout(iframeTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const safeDirectUrl = isDeprecatedUrl(directUrl) ? null : directUrl;
  const effectiveUrl =
    mode === "proxy" ? url : mode === "direct" ? safeDirectUrl : null;

  // ── PMC Viewer fallback ──────────────────────────────────────────────────
  if (mode === "pmc" && pmcViewerUrl) {
    return (
      <div className="flex flex-col items-center gap-5 py-10 px-4 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
        >
          <BookOpen className="w-7 h-7" style={{ color: "#2F3C96" }} />
        </div>
        <div>
          <p className="font-semibold mb-1" style={{ color: "#2F3C96" }}>
            Available on PubMed Central
          </p>
          <p className="text-sm" style={{ color: "#64748b" }}>
            The full text is freely available through Europe PubMed Central.
            Click below to open the article in a new tab.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href={pmcViewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition-all shadow-sm hover:shadow-md"
            style={{
              background: "linear-gradient(135deg, #2F3C96, #253075)",
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Read on PubMed Central
          </a>
          {safeDirectUrl && (
            <a
              href={safeDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors hover:bg-slate-50"
              style={{
                color: "#2F3C96",
                borderColor: "rgba(47, 60, 150, 0.3)",
              }}
            >
              <ExternalLink className="w-4 h-4" />
              Open PDF directly
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── IFRAME mode ──────────────────────────────────────────────────────────
  if (mode === "iframe" && safeDirectUrl) {
    return (
      <div ref={containerRef} className="w-full flex flex-col gap-2">
        <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 border rounded-lg border-slate-200">
          <span className="text-xs text-slate-500">Embedded viewer</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Fullscreen"
              className="p-1 rounded hover:bg-slate-200 transition-colors"
              style={{ color: "#2F3C96" }}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <a
              href={pmcViewerUrl || directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border transition-colors"
              style={{
                backgroundColor: "rgba(47, 60, 150, 0.1)",
                color: "#2F3C96",
                borderColor: "rgba(47, 60, 150, 0.3)",
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in new tab
            </a>
          </div>
        </div>
        <iframe
          src={safeDirectUrl}
          title="PDF viewer"
          className="w-full rounded border"
          style={{
            minHeight: isFullscreen ? "100vh" : "75vh",
            borderColor: "rgba(208, 196, 226, 0.3)",
          }}
          onLoad={() => {
            if (iframeTimerRef.current) clearTimeout(iframeTimerRef.current);
            setIframeLoaded(true);
          }}
          onError={() => {
            advanceMode("iframe", "Embedded viewing not allowed by the publisher.");
          }}
        />
      </div>
    );
  }

  // ── ERROR state ──────────────────────────────────────────────────────────
  if (mode === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 px-4 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(148, 163, 184, 0.15)" }}
        >
          <AlertCircle className="w-7 h-7" style={{ color: "#64748b" }} />
        </div>
        <div>
          <p className="font-medium mb-1" style={{ color: "#334155" }}>
            Unable to embed PDF
          </p>
          <p className="text-sm" style={{ color: "#64748b" }}>
            {errorMsg ||
              "The publisher does not allow embedded viewing for this paper."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {pmcViewerUrl && (
            <a
              href={pmcViewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-all"
              style={{ backgroundColor: "#2F3C96" }}
            >
              <BookOpen className="w-4 h-4" />
              Read on PubMed Central
            </a>
          )}
          {safeDirectUrl && (
            <a
              href={safeDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open PDF in new tab
            </a>
          )}
        </div>
        {url && (
          <button
            type="button"
            onClick={() => {
              setMode("proxy");
              setErrorMsg(null);
              setNumPages(null);
              setPageNumber(1);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  // ── PDF.js Document (proxy or direct) ────────────────────────────────────
  return (
    <div ref={containerRef} className="w-full">
      <Document
        file={{ url: effectiveUrl }}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        loading={
          <div
            className="flex flex-col items-center justify-center gap-3 py-24"
            style={{ minHeight: "60vh" }}
          >
            <Loader2
              className="w-10 h-10 animate-spin"
              style={{ color: "#2F3C96" }}
            />
            <p className="text-sm" style={{ color: "#787878" }}>
              {mode === "proxy"
                ? "Loading paper via secure proxy…"
                : "Fetching paper…"}
            </p>
          </div>
        }
        error={<div style={{ display: "none" }} />}
      >
        {numPages != null && (
          <>
            {/* Page navigation bar */}
            <div
              className="flex items-center justify-between gap-3 py-2 px-2 mb-2 border-b"
              style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
            >
              <button
                type="button"
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="flex items-center gap-1 px-2 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-slate-50"
                style={{
                  borderColor: "rgba(208, 196, 226, 0.5)",
                  color: "#2F3C96",
                }}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm" style={{ color: "#787878" }}>
                Page {pageNumber} of {numPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPageNumber((p) => Math.min(numPages, p + 1))
                  }
                  disabled={pageNumber >= numPages}
                  className="flex items-center gap-1 px-2 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-slate-50"
                  style={{
                    borderColor: "rgba(208, 196, 226, 0.5)",
                    color: "#2F3C96",
                  }}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title="Fullscreen"
                  className="p-1.5 rounded border hover:bg-slate-50 transition-colors"
                  style={{
                    borderColor: "rgba(208, 196, 226, 0.5)",
                    color: "#2F3C96",
                  }}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                {(pmcViewerUrl || directUrl) && (
                  <a
                    href={pmcViewerUrl || directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in new tab"
                    className="p-1.5 rounded border hover:bg-slate-50 transition-colors"
                    style={{
                      borderColor: "rgba(208, 196, 226, 0.5)",
                      color: "#2F3C96",
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
            <div
              className="flex justify-center overflow-auto"
              style={{ minHeight: "70vh" }}
            >
              <Page
                pageNumber={pageNumber}
                width={PAGE_WIDTH}
                renderTextLayer
                renderAnnotationLayer
              />
            </div>
          </>
        )}
      </Document>
    </div>
  );
}
