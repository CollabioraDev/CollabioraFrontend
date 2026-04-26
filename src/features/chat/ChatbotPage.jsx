import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  startTransition,
} from "react";
import { Link } from "react-router-dom";
import PublicationKeyInsightsModal from "../../components/publication/PublicationKeyInsightsModal.jsx";
import { fetchPublicationInsightsDetails } from "../../utils/fetchPublicationInsightsDetails.js";
import {
  Send,
  Loader2,
  BookOpen,
  Microscope,
  Users,
  MapPin,
  ExternalLink,
  MessageSquare,
  Heart,
  User,
  Mail,
  Phone,
  Trash2,
  ArrowDown,
  Plus,
  PanelLeft,
  MoreHorizontal,
  Download,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { buildChatExportHtml } from "../../components/ChatExportPdf.js";
import {
  getApiLocale,
  appendLocaleToSearchParams,
} from "../../i18n/getApiLocale.js";
import { getPublicationPath } from "../../utils/publicationRouting.js";
import {
  normalizeSearchResultsTrialLocations,
  formatTrialLocationDisplayForCard,
} from "../../utils/trialCardLocations.js";
import {
  preprocessMarkdownWithGroundingCitations,
  flattenMarkdownChildrenToString,
  isLikelyGroundingSourceUrl,
  looksLikeHostnameChip,
  GROUNDING_SOURCE_CHIP_CLASSNAME,
} from "../../utils/groundingCitations.js";
import { useTranslation } from "react-i18next";
import Button from "../../components/ui/Button.jsx";
import { X } from "lucide-react";

const YORI_STORAGE_KEY_PREFIX = "collabiora_yori_chat_sessions_v1";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CHAT_SESSIONS = 5;
const MAX_MESSAGES_PER_SESSION = 80;

const createChatId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const createChatSession = (title = "New chat") => ({
  id: createChatId(),
  title,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  preview: "No messages yet",
  messageCount: 0,
  isFull: false,
  messages: [],
  loaded: true,
});

const loadStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

// v2: "Maybe Later" no longer sets this — only X or after opting in (Yes).
// v1 incorrectly persisted dismiss on Maybe Later; using a new key resets that.
const BETA_PROMPT_DISMISSED_KEY = "collabiora_beta_prompt_dismissed_v2";

const getChatStorageKey = (user) => {
  const identity =
    user?._id || user?.id || user?.email || user?.username || "guest";
  return `${YORI_STORAGE_KEY_PREFIX}_${identity}`;
};

const getChatPreview = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0)
    return "No messages yet";
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.content?.trim());
  const previewText =
    latestUserMessage?.content ||
    latestAssistantMessage?.content ||
    "No messages yet";
  return (
    previewText.replace(/\s+/g, " ").trim().slice(0, 80) || "No messages yet"
  );
};

const deriveChatTitle = (messages) => {
  if (!Array.isArray(messages)) return "New chat";
  const firstUserMessage = messages.find(
    (message) => message.role === "user" && message.content?.trim(),
  );
  if (!firstUserMessage) return "New chat";
  const normalized = firstUserMessage.content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 34) return normalized;
  return `${normalized.slice(0, 34).trim()}...`;
};

const normalizeSession = (session) => {
  const messages = Array.isArray(session?.messages) ? session.messages : [];
  const createdAt = Number(session?.createdAt) || Date.now();
  const updatedAt = Number(session?.updatedAt) || createdAt;
  const messageCount = Number.isFinite(Number(session?.messageCount))
    ? Number(session.messageCount)
    : messages.length;
  return {
    id: session?.id || createChatId(),
    title: session?.title || deriveChatTitle(messages),
    createdAt,
    updatedAt,
    preview: session?.preview || getChatPreview(messages),
    messageCount,
    isFull:
      typeof session?.isFull === "boolean"
        ? session.isFull
        : messageCount >= MAX_MESSAGES_PER_SESSION,
    messages,
    loaded: session?.loaded ?? Array.isArray(session?.messages),
  };
};

const loadSavedChatSessions = (storageKey) => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return [createChatSession()];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [createChatSession()];
    const now = Date.now();
    const validSessions = parsed
      .map(normalizeSession)
      .filter((session) => now - session.updatedAt <= ONE_WEEK_MS)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CHAT_SESSIONS);
    return validSessions.length > 0 ? validSessions : [createChatSession()];
  } catch {
    return [createChatSession()];
  }
};

const getAuthToken = () => {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
};

const readJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const decodeJwtPayload = (token) => {
  try {
    const payload = token?.split(".")?.[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isTokenExpiringSoon = (token, thresholdMs = 10 * 60 * 1000) => {
  const payload = decodeJwtPayload(token);
  const expMs = Number(payload?.exp) * 1000;
  if (!Number.isFinite(expMs)) return false;
  return expMs - Date.now() <= thresholdMs;
};

function formatRelativeTimeLocalized(timestamp, t) {
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return t("chat.justNow");
  if (diff < 60 * 60 * 1000) {
    return t("chat.minutesAgo", { count: Math.floor(diff / (60 * 1000)) });
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return t("chat.hoursAgo", { count: Math.floor(diff / (60 * 60 * 1000)) });
  }
  return t("chat.daysAgo", { count: Math.floor(diff / (24 * 60 * 60 * 1000)) });
}

const hasDismissedBetaPrompt = () => {
  try {
    return localStorage.getItem(BETA_PROMPT_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
};

const setDismissedBetaPrompt = () => {
  try {
    localStorage.setItem(BETA_PROMPT_DISMISSED_KEY, "true");
  } catch {
    // ignore
  }
};

const getAskContext = (type, item) => {
  if (!item || !type) return null;
  if (type === "trial") {
    return {
      type: "trial",
      item: {
        id: item.id || item.nctId,
        nctId: item.nctId || item.id,
        title: item.title,
        url: item.url,
      },
    };
  }
  if (type === "publication") {
    return {
      type: "publication",
      item: {
        id: item.id || item.pmid,
        pmid: item.pmid || item.id,
        title: item.title,
        authors: item.authors,
        journal: item.journal,
        year: item.year,
        abstract: item.abstract || item.fullAbstract,
        fullAbstract: item.fullAbstract || item.abstract,
        url: item.url,
      },
    };
  }
  if (type === "expert") {
    return {
      type: "expert",
      item: {
        id: item.id || item.userId || item._id,
        userId: item.userId || item.id || item._id,
        name: item.name,
        affiliation: item.affiliation,
        location: item.location,
        bio: item.bio,
        researchInterests: item.researchInterests,
        orcidUrl: item.orcidUrl,
      },
    };
  }
  return null;
};

function buildAskAboutOptions(t) {
  return {
    trial: [
      {
        label: t("chat.trialAskTellMore"),
        question: t("chat.trialAskTellMoreQ"),
      },
      {
        label: t("chat.trialAskInclusion"),
        question: t("chat.trialAskInclusionQ"),
      },
      {
        label: t("chat.trialAskParticipate"),
        question: t("chat.trialAskParticipateQ"),
      },
      {
        label: t("chat.trialAskContact"),
        question: t("chat.trialAskContactQ"),
      },
      {
        label: t("chat.trialAskLocations"),
        question: t("chat.trialAskLocationsQ"),
      },
    ],
    publication: [
      {
        label: t("chat.pubAskSummarize"),
        question: t("chat.pubAskSummarizeQ"),
      },
      {
        label: t("chat.pubAskMethods"),
        question: t("chat.pubAskMethodsQ"),
      },
      {
        label: t("chat.pubAskTakeaways"),
        question: t("chat.pubAskTakeawaysQ"),
      },
    ],
    expert: [
      {
        label: t("chat.expertAskTellMore"),
        question: t("chat.expertAskTellMoreQ"),
      },
      {
        label: t("chat.expertAskFocus"),
        question: t("chat.expertAskFocusQ"),
      },
    ],
  };
}

const getMarkdownComponents = (t) => ({
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-[#2F3C96] mt-5 mb-3 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-[#2F3C96] uppercase tracking-wide mt-5 mb-2 first:mt-0 border-b border-[#D1D3E5] pb-1.5">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-slate-800 mt-4 mb-1.5">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-[15px] text-slate-700 leading-relaxed my-2">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-800">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2 space-y-1 text-slate-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-700">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[15px] leading-relaxed">{children}</li>
  ),
  hr: () => (
    <hr
      className="my-5 border-0 border-t border-brand-purple-200/90 dark:border-brand-purple-400/40"
      role="separator"
    />
  ),
  a: ({ href, children }) => {
    const linkText = flattenMarkdownChildrenToString(children).trim();
    const isNumericCitation = /^\[\d+\]$/.test(linkText);
    const isGoogleStyleInlineSource =
      href &&
      (isLikelyGroundingSourceUrl(href) ||
        looksLikeHostnameChip(linkText) ||
        isNumericCitation);
    if (isGoogleStyleInlineSource) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={href}
          className={GROUNDING_SOURCE_CHIP_CLASSNAME}
        >
          <span className="truncate">{children}</span>
        </a>
      );
    }
    const isInternal = href && href.startsWith("/") && !href.startsWith("//");
    const isPubMed = href && /pubmed\.ncbi\.nlm\.nih\.gov/i.test(href);
    const isClinicalTrials = href && /clinicaltrials\.gov/i.test(href);
    const isPublicationRoute = href && /^\/publication\//i.test(href);
    const isExpertProfile =
      href &&
      (/^\/expert\/profile/i.test(href) ||
        /^\/collabiora-expert\/profile/i.test(href));
    const isSpecialLink =
      isPubMed || isClinicalTrials || isExpertProfile || isInternal;
    const label = isPubMed
      ? t("chat.linkViewPubMed")
      : isClinicalTrials
        ? t("chat.linkViewClinicalTrials")
        : isPublicationRoute
          ? t("chat.linkViewCollabiora")
          : isExpertProfile
            ? t("chat.linkViewProfile")
            : children || href;
    const linkClass = isSpecialLink
      ? "inline-flex items-center gap-2 mt-2 px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2] border border-[#D1D3E5] rounded-lg hover:bg-[#D1D3E5] transition-colors"
      : "text-[#2F3C96] hover:text-[#474F97] font-medium hover:underline inline-flex items-center gap-1";
    if (isInternal) {
      return (
        <Link to={href} className={linkClass}>
          {label}
          <ExternalLink className="w-3 h-3 shrink-0" />
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {label}
        <ExternalLink className="w-3 h-3 shrink-0" />
      </a>
    );
  },
});

// --- Compact chatbot cards (simplified title, short summary, CTAs) ---

const PublicationCard = React.memo(
  ({
    publication,
    onAskAbout,
    onSave,
    userId,
    useSimplified,
    onReadDetails,
  }) => {
    const { t } = useTranslation("common");
    const publicationRoute = getPublicationPath(publication);
    const displayTitle =
      useSimplified && publication.simplifiedTitle
        ? publication.simplifiedTitle
        : publication.title;
    const summary =
      useSimplified && publication.simplifiedSummary
        ? publication.simplifiedSummary
        : publication.fullAbstract || publication.abstract || "";

    return (
      <div
        className="relative rounded-xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          borderColor: "rgba(47, 60, 150, 0.2)",
        }}
      >
        {userId && onSave && (
          <button
            type="button"
            onClick={() =>
              onSave("publication", {
                id: publication.pmid,
                pmid: publication.pmid,
                title: publication.title,
                simplifiedTitle: publication.simplifiedTitle,
                authors: publication.authors,
                journal: publication.journal,
                year: publication.year,
                abstract: publication.abstract,
                url: publication.url,
              })
            }
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 transition-colors"
            style={{ color: "#2F3C96" }}
            aria-label={t("chat.savePublication")}
          >
            <Heart className="w-4 h-4" />
          </button>
        )}
        <div className="p-4">
          <div className="flex items-start gap-2.5 mb-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(208, 196, 226, 0.35)" }}
            >
              <BookOpen className="w-4 h-4" style={{ color: "#2F3C96" }} />
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <h4
                className="font-bold text-sm leading-snug line-clamp-2"
                style={{ color: "#2F3C96" }}
              >
                {displayTitle}
              </h4>
            </div>
          </div>
          <div className="text-xs text-slate-600 space-y-0.5 mb-2">
            <p className="line-clamp-1">{publication.authors}</p>
            <p className="text-slate-500">
              {publication.journal} ({publication.year})
            </p>
          </div>
          {summary && (
            <p
              className={`text-xs leading-relaxed text-slate-600 mb-3 ${useSimplified ? "line-clamp-2" : "line-clamp-3"}`}
              style={{
                WebkitLineClamp: useSimplified ? 2 : 3,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {summary}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {onReadDetails ? (
              <button
                type="button"
                onClick={() => onReadDetails(publication)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:opacity-90"
                style={{
                  color: "#2F3C96",
                  backgroundColor: "rgba(208, 196, 226, 0.25)",
                  borderColor: "rgba(47, 60, 150, 0.25)",
                }}
              >
                {t("chat.readMoreDetails", {
                  defaultValue: "Read More Details",
                })}{" "}
                <ChevronRight className="w-3 h-3" aria-hidden />
              </button>
            ) : publicationRoute ? (
              <Link
                to={publicationRoute}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:opacity-90"
                style={{
                  color: "#2F3C96",
                  backgroundColor: "rgba(208, 196, 226, 0.25)",
                  borderColor: "rgba(47, 60, 150, 0.25)",
                }}
              >
                {t("chat.viewFullPublication")}{" "}
                <ExternalLink className="w-3 h-3" />
              </Link>
            ) : publication.url ? (
              <a
                href={publication.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:opacity-90"
                style={{
                  color: "#2F3C96",
                  backgroundColor: "rgba(208, 196, 226, 0.25)",
                  borderColor: "rgba(47, 60, 150, 0.25)",
                }}
              >
                {t("chat.viewFullPublication")}{" "}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}
            {onAskAbout && (
              <button
                type="button"
                onClick={() => onAskAbout(publication, "publication")}
                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                style={{ color: "#2F3C96" }}
              >
                <MessageSquare className="w-3 h-3" /> {t("chat.askAboutThis")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

const TrialCard = React.memo(
  ({ trial, onAskAbout, onSave, userId, useSimplified }) => {
    const { t } = useTranslation("common");
    const locationLine = formatTrialLocationDisplayForCard(trial, t);
    const displayTitle =
      useSimplified && trial.simplifiedTitle
        ? trial.simplifiedTitle
        : trial.title;
    const summary =
      useSimplified && trial.simplifiedSummary
        ? trial.simplifiedSummary
        : trial.summary || "";

    return (
      <div
        className="relative rounded-xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          borderColor: "rgba(47, 60, 150, 0.2)",
        }}
      >
        {userId && onSave && (
          <button
            type="button"
            onClick={() =>
              onSave("trial", {
                id: trial.nctId || trial.id,
                nctId: trial.nctId || trial.id,
                title: trial.title,
                simplifiedTitle: trial.simplifiedTitle,
                url: trial.url,
              })
            }
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 transition-colors"
            style={{ color: "#2F3C96" }}
            aria-label={t("chat.saveTrial")}
          >
            <Heart className="w-4 h-4" />
          </button>
        )}
        <div className="p-4">
          <div className="flex items-start gap-2.5 mb-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(208, 196, 226, 0.4), rgba(209, 211, 229, 0.5))",
              }}
            >
              <Microscope className="w-4 h-4" style={{ color: "#2F3C96" }} />
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <h4
                className="font-bold text-sm leading-snug line-clamp-2"
                style={{ color: "#2F3C96" }}
              >
                {displayTitle}
              </h4>
            </div>
          </div>
          {trial.conditions && trial.conditions !== "Not specified" && (
            <p className="text-xs text-slate-600 line-clamp-1 mb-1">
              <span className="font-medium text-slate-700">Condition:</span>{" "}
              {trial.conditions}
            </p>
          )}
          {(trial.status ||
            (trial.phase && trial.phase !== "Not specified")) && (
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {trial.status && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    backgroundColor: "rgba(208, 196, 226, 0.35)",
                    color: "#2F3C96",
                    border: "1px solid rgba(47, 60, 150, 0.2)",
                  }}
                >
                  {trial.status}
                </span>
              )}
              {trial.phase && trial.phase !== "Not specified" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                  {trial.phase}
                </span>
              )}
            </div>
          )}
          {locationLine && (
            <p className="text-xs text-slate-600 line-clamp-2 mb-2 flex items-start gap-1 break-words">
              <MapPin
                className="w-3.5 h-3.5 shrink-0 mt-0.5"
                style={{ color: "#2F3C96" }}
              />
              <span>
                <span className="font-medium text-slate-700">Location:</span>{" "}
                {locationLine}
              </span>
            </p>
          )}
          {summary && summary !== "No summary available" && (
            <p
              className="text-xs leading-relaxed text-slate-600 mb-3 line-clamp-3"
              style={{
                WebkitLineClamp: 3,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {summary}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {trial.nctId && (
              <Link
                to={`/trial/${encodeURIComponent(trial.nctId)}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:opacity-90"
                style={{
                  color: "#2F3C96",
                  backgroundColor: "rgba(208, 196, 226, 0.25)",
                  borderColor: "rgba(47, 60, 150, 0.25)",
                }}
              >
                {t("chat.viewFullTrial")}{" "}
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            {onAskAbout && (
              <button
                type="button"
                onClick={() => onAskAbout(trial, "trial")}
                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                style={{ color: "#2F3C96" }}
              >
                <MessageSquare className="w-3 h-3" /> {t("chat.askAboutThis")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

const ExpertCard = React.memo(({ expert, onAskAbout }) => {
  const { t } = useTranslation("common");
  const profileUrl =
    expert.userId || expert.id || expert._id
      ? `/collabiora-expert/profile/${expert.userId || expert.id || expert._id}`
      : `/expert/profile?name=${encodeURIComponent(expert.name || "")}`;
  return (
    <div className="bg-white border border-[#D1D3E5] rounded-xl shadow-sm overflow-hidden hover:shadow-md hover:border-[#A3A7CB] transition-all duration-200">
      <div className="bg-gradient-to-br from-[#E8E9F2] to-[#D1D3E5] px-5 py-3 border-b border-[#D1D3E5]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-[#2F3C96]" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm text-slate-800">
              {expert.name}
            </h4>
            {expert.affiliation && (
              <p className="text-xs text-slate-600 mt-0.5">
                {expert.affiliation}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {expert.location && (
          <p className="text-sm text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#2F3C96] shrink-0" />
            {expert.location}
          </p>
        )}
        {expert.researchInterests &&
          expert.researchInterests !== "Not specified" && (
            <div>
              <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1">
                {t("chat.researchInterests")}
              </h5>
              <p className="text-sm text-slate-700">
                {expert.researchInterests}
              </p>
            </div>
          )}
        {expert.metrics &&
          (expert.metrics.totalPublications ||
            expert.metrics.totalCitations) && (
            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
              {expert.metrics.totalPublications > 0 && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#2F3C96]" />
                  {expert.metrics.totalPublications.toLocaleString()}{" "}
                  {t("chat.publicationsCount")}
                </span>
              )}
              {expert.metrics.totalCitations > 0 && (
                <span className="flex items-center gap-1">
                  <Microscope className="w-3.5 h-3.5 text-[#2F3C96]" />
                  {expert.metrics.totalCitations.toLocaleString()}{" "}
                  {t("chat.citationsCount")}
                </span>
              )}
            </div>
          )}
        {expert.bio && (
          <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
            {expert.bio}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <Link
            to={profileUrl}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2] border border-[#D1D3E5] rounded-lg hover:bg-[#D1D3E5] transition-colors"
          >
            <User className="w-3.5 h-3.5" /> {t("chat.viewProfile")}
          </Link>
          {expert.orcidUrl && (
            <a
              href={expert.orcidUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> ORCID
            </a>
          )}
          {onAskAbout && (
            <button
              onClick={() => onAskAbout(expert, "expert")}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2F3C96] hover:text-[#474F97] hover:underline"
            >
              <MessageSquare className="w-3.5 h-3.5" />{" "}
              {t("chat.askAboutThisExpert")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

const TrialDetailsCard = ({
  trialDetails,
  onAskMore,
  onSave,
  userId,
  askOptions = [],
}) => {
  const { t } = useTranslation("common");
  if (!trialDetails) return null;
  const {
    requestedSections = ["overview"],
    title,
    shortTitle,
    nctId,
    url,
    status,
    phase,
    conditions,
    eligibilityCriteria,
    eligibility,
    contacts,
    locations,
    summary,
  } = trialDetails;
  const displayTitle =
    shortTitle ||
    (title?.length > 100 ? title.slice(0, 97) + "..." : title) ||
    t("chat.clinicalTrialFallback");
  const show = (s) => requestedSections.includes(s);
  const hasEligibility =
    eligibilityCriteria ||
    (eligibility &&
      (eligibility.minimumAge ||
        eligibility.maximumAge ||
        eligibility.gender ||
        eligibility.healthyVolunteers));
  const hasContacts = contacts && contacts.length > 0;
  const hasLocations = locations && locations.length > 0;

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white border border-[#D1D3E5] rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-[#E8E9F2] to-[#D1D3E5] px-5 py-4 border-b border-[#D1D3E5]">
          <div className="flex items-start gap-3">
            <Microscope className="w-5 h-5 text-[#2F3C96] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm text-slate-800 leading-snug">
                {displayTitle}
              </h4>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {nctId && (
                  <span className="px-2 py-0.5 bg-white/80 text-[#2F3C96] rounded text-xs font-mono border border-[#D1D3E5]">
                    {nctId}
                  </span>
                )}
                {status && (
                  <span className="px-2 py-0.5 bg-[#2F3C96]/10 text-[#2F3C96] rounded text-xs font-medium">
                    {status}
                  </span>
                )}
                {phase && phase !== "Not specified" && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                    {phase}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {show("overview") && conditions && conditions !== "Not specified" && (
            <section>
              <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                {t("chat.conditionsHeading")}
              </h5>
              <p className="text-sm text-slate-700">{conditions}</p>
            </section>
          )}
          {show("eligibility") && hasEligibility && (
            <section>
              <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                {t("chat.eligibilityCriteriaHeading")}
              </h5>
              <div className="text-sm text-slate-700 space-y-2">
                {eligibilityCriteria && (
                  <div className="bg-slate-50 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap border border-slate-100">
                    {eligibilityCriteria}
                  </div>
                )}
                {eligibility &&
                  (eligibility.minimumAge ||
                    eligibility.maximumAge ||
                    eligibility.gender ||
                    eligibility.healthyVolunteers) && (
                    <div className="flex flex-wrap gap-2">
                      {(eligibility.minimumAge || eligibility.maximumAge) && (
                        <span className="px-2 py-1 bg-[#E8E9F2] text-[#2F3C96] rounded text-xs">
                          {t("chat.ageLabel")} {eligibility.minimumAge || "?"} -{" "}
                          {eligibility.maximumAge || "?"}
                        </span>
                      )}
                      {eligibility.gender && (
                        <span className="px-2 py-1 bg-[#E8E9F2] text-[#2F3C96] rounded text-xs">
                          {t("chat.genderLabel")} {eligibility.gender}
                        </span>
                      )}
                      {eligibility.healthyVolunteers && (
                        <span className="px-2 py-1 bg-[#E8E9F2] text-[#2F3C96] rounded text-xs">
                          {t("chat.healthyVolunteersLabel")}{" "}
                          {eligibility.healthyVolunteers}
                        </span>
                      )}
                    </div>
                  )}
              </div>
            </section>
          )}
          {show("contacts") && hasContacts && (
            <section>
              <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-2">
                {t("chat.contactDetails")}
              </h5>
              <div className="space-y-3">
                {contacts.map((c, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                  >
                    {(c.name || c.role) && (
                      <p className="font-medium text-slate-800 text-sm mb-2">
                        {[c.name, c.role].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="space-y-2 text-sm">
                      {c.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-[#2F3C96] shrink-0" />
                          <a
                            href={`tel:${String(c.phone).replace(/\D/g, "")}`}
                            className="text-[#2F3C96] hover:underline font-medium"
                          >
                            {c.phone}
                          </a>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#2F3C96] shrink-0" />
                          <a
                            href={`mailto:${c.email}`}
                            className="text-[#2F3C96] hover:underline font-medium break-all"
                          >
                            {c.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {show("locations") && hasLocations && (
            <section>
              <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-2">
                {t("chat.trialLocationsHeading")}
              </h5>
              <div className="space-y-2">
                {locations.map((loc, i) => (
                  <div
                    key={i}
                    className="flex gap-2 bg-slate-50 rounded-lg p-3 border border-slate-100"
                  >
                    <MapPin className="w-4 h-4 text-[#2F3C96] shrink-0 mt-0.5" />
                    <div>
                      {loc.facility && (
                        <p className="font-medium text-slate-800 text-sm">
                          {loc.facility}
                        </p>
                      )}
                      <p className="text-sm text-slate-700">
                        {loc.fullAddress ||
                          [loc.city, loc.state, loc.country]
                            .filter(Boolean)
                            .join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {show("overview") && summary && (
            <section>
              <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                {t("chat.summaryHeading")}
              </h5>
              <p className="text-sm text-slate-700 leading-relaxed">
                {summary}
              </p>
            </section>
          )}
          {userId && onSave && (
            <button
              type="button"
              onClick={() =>
                onSave("trial", {
                  id: nctId,
                  nctId,
                  title: title || shortTitle,
                  url,
                })
              }
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2] border border-[#D1D3E5] rounded-lg hover:bg-[#D1D3E5] transition-colors"
            >
              <Heart className="w-3.5 h-3.5" /> {t("chat.saveToFavourites")}
            </button>
          )}
          {onAskMore && (
            <div className="pt-3 border-t border-[#D1D3E5]">
              <p className="text-xs font-semibold text-slate-700 mb-2">
                {t("chat.askMoreTrial")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {askOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onAskMore(opt.question)}
                    className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2]/80 border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PublicationDetailsCard = ({
  publicationDetails,
  onAskMore,
  onSave,
  userId,
  askOptions = [],
}) => {
  const { t } = useTranslation("common");
  if (!publicationDetails) return null;
  const {
    title,
    pmid,
    url,
    authors,
    journal,
    year,
    abstract,
    keywords,
    publicationTypes,
  } = publicationDetails;
  const publicationRoute = getPublicationPath({ pmid });
  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white border border-[#D1D3E5] rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-[#E8E9F2] to-[#D1D3E5] px-5 py-4 border-b border-[#D1D3E5]">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-[#2F3C96] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm text-slate-800 leading-snug">
                {title}
              </h4>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {pmid && (
                  <span className="px-2 py-0.5 bg-white/80 text-[#2F3C96] rounded text-xs font-mono border border-[#D1D3E5]">
                    {t("chat.pmidLabel")} {pmid}
                  </span>
                )}
                {publicationTypes && (
                  <span className="px-2 py-0.5 bg-[#2F3C96]/10 text-[#2F3C96] rounded text-xs font-medium">
                    {publicationTypes}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <section>
            <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
              {t("publications.authors")}
            </h5>
            <p className="text-sm text-slate-700">{authors}</p>
            <p className="text-xs text-slate-600 mt-1">
              {journal} ({year})
            </p>
          </section>
          {abstract && (
            <section>
              <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                {t("publications.abstract")}
              </h5>
              <p className="text-sm text-slate-700 leading-relaxed">
                {abstract}
              </p>
            </section>
          )}
          {keywords && (
            <section>
              <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                {t("publications.keywords")}
              </h5>
              <p className="text-sm text-slate-700">{keywords}</p>
            </section>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            {publicationRoute ? (
              <Link
                to={publicationRoute}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#2F3C96] hover:text-[#474F97] hover:underline"
              >
                {t("chat.linkViewCollabiora")}{" "}
                <ExternalLink className="w-4 h-4" />
              </Link>
            ) : url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#2F3C96] hover:text-[#474F97] hover:underline"
              >
                {t("chat.linkViewPubMed")} <ExternalLink className="w-4 h-4" />
              </a>
            ) : null}
            {userId && onSave && (
              <button
                type="button"
                onClick={() =>
                  onSave("publication", {
                    id: pmid,
                    pmid,
                    title,
                    authors,
                    journal,
                    year,
                    abstract,
                    url,
                  })
                }
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2] border border-[#D1D3E5] rounded-lg hover:bg-[#D1D3E5] transition-colors"
              >
                <Heart className="w-3.5 h-3.5" /> {t("chat.saveToFavourites")}
              </button>
            )}
          </div>
          {onAskMore && (
            <div className="pt-3 border-t border-[#D1D3E5]">
              <p className="text-xs font-semibold text-slate-700 mb-2">
                {t("chat.askMorePublication")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {askOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onAskMore(opt.question)}
                    className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2]/80 border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AskMoreBar = ({ type, details, onAskMore, onSave, userId, askAboutOptions }) => {
  const { t } = useTranslation("common");
  if (!details || !onAskMore) return null;
  const options = (askAboutOptions && askAboutOptions[type]) || [];
  const itemForSave =
    type === "trial"
      ? {
          id: details.nctId,
          nctId: details.nctId,
          title: details.title,
          url: details.url,
        }
      : {
          id: details.pmid,
          pmid: details.pmid,
          title: details.title,
          authors: details.authors,
          journal: details.journal,
          year: details.year,
          abstract: details.abstract,
          url: details.url,
        };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white border border-[#D1D3E5] rounded-xl px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold text-slate-700 mb-2">
          {type === "trial"
            ? t("chat.askMoreTrial")
            : t("chat.askMorePublication")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onAskMore(opt.question)}
              className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2]/80 border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] transition-colors"
            >
              {opt.label}
            </button>
          ))}
          {userId && onSave && (
            <button
              type="button"
              onClick={() => onSave(type, itemForSave)}
              className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2]/80 border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] transition-colors"
            >
              <Heart className="w-3.5 h-3.5 inline mr-1" /> Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SearchResultsCards = ({
  searchResults,
  onAskAbout,
  onSave,
  userId,
  userRole,
  onReadPublicationDetails,
}) => {
  const { t } = useTranslation("common");
  const useSimplified = userRole === "patient";
  const resolvedResults = normalizeSearchResultsTrialLocations(
    searchResults,
    t,
  );
  if (!resolvedResults?.items?.length) return null;
  const { type, items } = resolvedResults;
  const meta = {
    publications: {
      title: "Publications",
      subtitle: "Research papers and evidence-backed reading.",
      Icon: BookOpen,
    },
    trials: {
      title: "Clinical trials",
      subtitle: "Structured trial matches with status and key details.",
      Icon: Microscope,
    },
    experts: {
      title: "Experts",
      subtitle: "Researchers and collaborators relevant to your query.",
      Icon: Users,
    },
  }[type];

  if (!meta) return null;

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-[#D1D3E5] bg-white/95 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[#D1D3E5] bg-[#E8E9F2]/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#D1D3E5]">
              <meta.Icon className="h-5 w-5 text-[#2F3C96]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2F3C96]">
                {meta.title}
              </p>
              <p className="text-xs text-slate-500">{meta.subtitle}</p>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#2F3C96] border border-[#D1D3E5]">
            {items.length} result{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {type === "publications" &&
            items.map((pub, idx) => (
              <PublicationCard
                key={idx}
                publication={pub}
                onAskAbout={onAskAbout}
                onSave={onSave}
                userId={userId}
                useSimplified={useSimplified}
                onReadDetails={onReadPublicationDetails}
              />
            ))}
          {type === "trials" &&
            items.map((trial, idx) => (
              <TrialCard
                key={idx}
                trial={trial}
                onAskAbout={onAskAbout}
                onSave={onSave}
                userId={userId}
                useSimplified={useSimplified}
              />
            ))}
          {type === "experts" &&
            items.map((expert, idx) => (
              <ExpertCard key={idx} expert={expert} onAskAbout={onAskAbout} />
            ))}
        </div>
      </div>
    </div>
  );
};

function buildDirectSearchIntro(kind, count, query, t) {
  const safeQuery = query ? `"${query}"` : "your query";
  if (kind === "trials") {
    return t("yori.directSearchTrialsIntro", {
      count,
      query: safeQuery,
      defaultValue: `I found ${count} verified clinical trial${count === 1 ? "" : "s"} from collabiora's trial pipeline for ${safeQuery}. The real results and links are below.`,
    });
  }
  return t("yori.directSearchPubsIntro", {
    count,
    query: safeQuery,
    defaultValue: `I found ${count} verified publication${count === 1 ? "" : "s"} from collabiora's research pipeline for ${safeQuery}. The real results and links are below.`,
  });
}

function buildDirectSearchEmpty(kind, query, t) {
  const safeQuery = query ? `"${query}"` : "that query";
  if (kind === "trials") {
    return t("yori.directSearchNoTrials", {
      query: safeQuery,
      defaultValue: `I couldn't find verified clinical trials from collabiora's trial pipeline for ${safeQuery}. Try a simpler keyword or the Trials page.`,
    });
  }
  return t("yori.directSearchNoPubs", {
    query: safeQuery,
    defaultValue: `I couldn't find verified publications from collabiora's research pipeline for ${safeQuery}. Try a more specific topic or the Publications page.`,
  });
}

const ConditionDiscoveryPanel = ({
  conditionDiscovery,
  disabled,
  busyKind,
  onExploreTrials,
  onExplorePublications,
}) => {
  const { t } = useTranslation("common");
  const conditionLabel = conditionDiscovery?.conditionLabel || "";
  const searchQuery = (
    conditionDiscovery?.query ||
    conditionDiscovery?.trials?.query ||
    conditionDiscovery?.publications?.query ||
    conditionLabel
  )
    .toString()
    .trim();

  if (!conditionLabel || !onExploreTrials || !onExplorePublications)
    return null;

  const exploreBusy = Boolean(busyKind);

  return (
    <div className="w-full max-w-4xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled || exploreBusy}
          onClick={() => onExploreTrials(searchQuery)}
          className="rounded-xl border border-[#D1D3E5] bg-white/95 px-4 py-3 text-center text-sm font-semibold text-[#2F3C96] shadow-sm transition-colors hover:bg-[#F5F2F8]/60 hover:border-[#A3A7CB] disabled:opacity-50 disabled:pointer-events-none"
        >
          <span className="inline-flex items-center justify-center gap-2">
            {busyKind === "trials" ? (
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-[#2F3C96]"
                aria-hidden
              />
            ) : null}
            {t("yori.conditionExploreTrialsTitle", {
              defaultValue: "New treatments related to {{condition}}",
              condition: conditionLabel,
            })}
          </span>
        </button>

        <button
          type="button"
          disabled={disabled || exploreBusy}
          onClick={() => onExplorePublications(searchQuery)}
          className="rounded-xl border border-[#D1D3E5] bg-white/95 px-4 py-3 text-center text-sm font-semibold text-[#2F3C96] shadow-sm transition-colors hover:bg-[#F5F2F8]/60 hover:border-[#A3A7CB] disabled:opacity-50 disabled:pointer-events-none"
        >
          <span className="inline-flex items-center justify-center gap-2">
            {busyKind === "publications" ? (
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-[#2F3C96]"
                aria-hidden
              />
            ) : null}
            {t("yori.conditionExplorePubsTitle", {
              defaultValue: "Research papers",
            })}
          </span>
        </button>
      </div>
    </div>
  );
};

const RelatedTrialsChip = ({ relatedExplore, onSend, disabled }) => {
  const { t } = useTranslation("common");
  if (!relatedExplore?.trialsPrompt) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSend(relatedExplore.trialsPrompt)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#A3A7CB] bg-white px-3 py-1 text-[11px] font-semibold text-[#2F3C96] shadow-sm hover:bg-[#E8E9F2]/80 disabled:opacity-50"
      >
        {relatedExplore.trialsChipLabel ||
          t("yori.relatedTrialsChip", {
            defaultValue: "New treatments (trials)",
          })}
      </button>
    </div>
  );
};

const CommunityCards = ({ communities }) => {
  const { t } = useTranslation("common");
  if (!communities?.length) return null;
  return (
    <div className="w-full">
      <div className="rounded-2xl border border-[#D1D3E5] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#D1D3E5] bg-[#E8E9F2]/60 px-5 py-4">
          <p className="text-sm font-semibold text-[#2F3C96] flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t("yori.communitiesCardTitle")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t("yori.communitiesCardSubtitle")}
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {communities.map((c) => (
            <Link
              key={c.id || c.slug}
              to={`/forums/community/${c.id}`}
              className="group flex items-start gap-3 rounded-xl border border-[#D1D3E5] p-3 hover:bg-[#E8E9F2]/50 transition-colors"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8E9F2] text-lg">
                {c.icon || "💬"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#2F3C96] group-hover:underline">
                  {c.name}
                </p>
                {c.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {c.description}
                  </p>
                )}
                {c.tags?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#F5F2F8] px-2 py-0.5 text-[10px] text-[#2F3C96]/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-slate-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Generate and open a print-ready PDF of the chat session in a new tab.
 * Uses ChatExportPdf component for structured message and card layout (including DOI, PMID, NCT ID).
 */
function downloadChatAsPdf(session) {
  const html = buildChatExportHtml(session);
  if (!html) return;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("afterprint", () => URL.revokeObjectURL(url));
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(session.title || "chat").replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}

const ChatHistoryItem = ({
  session,
  isActive,
  onSelect,
  onDelete,
  isDeleting,
}) => {
  const { t } = useTranslation("common");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className={`group rounded-2xl border p-3 transition-all ${
        isActive
          ? "border-[#2F3C96] bg-[#E8E9F2]/70 shadow-sm"
          : "border-transparent bg-white/80 hover:border-[#D1D3E5] hover:bg-white"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onSelect(session.id)}
          className="flex-1 text-left min-w-0"
        >
          <p className="truncate text-sm font-semibold text-[#2F3C96]">
            {session.title || t("chat.newChat")}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
            {session.preview || getChatPreview(session.messages)}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            {formatRelativeTimeLocalized(session.updatedAt, t)}
          </p>
        </button>

        {/* Triple-dot menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="mt-0.5 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-[#2F3C96] transition-colors"
            aria-label={t("chat.sessionOptions")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-[#D1D3E5] bg-white shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  downloadChatAsPdf(session);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-[#E8E9F2]/60 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-[#2F3C96] shrink-0" />
                {t("chat.downloadSessionPdf")}
              </button>
              <div className="border-t border-[#E5E7EB]" />
              <button
                type="button"
                onClick={() => {
                  if (isDeleting) return;
                  setMenuOpen(false);
                  onDelete(session.id);
                }}
                disabled={isDeleting}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                )}
                {isDeleting ? t("chat.deletingSession") : t("chat.deleteSession")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Named exports for YoriGuestLandingPage (/home) and other consumers that reuse chat UI. */
export {
  SearchResultsCards,
  ConditionDiscoveryPanel,
  RelatedTrialsChip,
  buildDirectSearchIntro,
  buildDirectSearchEmpty,
  getAskContext,
  buildAskAboutOptions,
  TrialDetailsCard,
  PublicationDetailsCard,
  AskMoreBar,
  CommunityCards,
};

/**
 * Local draft state so typing does not re-render the full chat (messages + markdown).
 */
export const YoriChatComposer = React.memo(function YoriChatComposer({
  onSubmit,
  disabled,
  placeholder,
  isSending,
}) {
  const [draft, setDraft] = useState("");
  const taRef = useRef(null);
  const resize = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);
  const submit = useCallback(() => {
    const text = draft.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setDraft("");
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = "auto";
    });
  }, [draft, disabled, onSubmit]);
  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );
  return (
    <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#D0C4E2]/60 bg-[#F5F2F8] px-3 py-1.5 sm:px-4 sm:py-2 transition-colors focus-within:border-[#D0C4E2] focus-within:bg-[#EDE8F3]">
      <div className="flex items-end gap-2">
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            resize();
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="min-h-[38px] max-h-32 sm:max-h-40 flex-1 resize-none bg-transparent py-2 text-[14px] sm:text-[15px] text-[#2F3C96] placeholder:text-slate-400 focus:outline-none"
          rows={1}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim() || disabled}
          className="mb-1 flex h-9 w-9 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-[#2F3C96] transition-colors hover:bg-[#D0C4E2]/30 disabled:opacity-30"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
});

export default function YoriAI() {
  const [user, setUser] = useState(loadStoredUser);
  const [authExpired, setAuthExpired] = useState(false);
  const [chatSessions, setChatSessions] = useState(() => {
    const initialUser = loadStoredUser();
    return initialUser && getAuthToken()
      ? []
      : loadSavedChatSessions(getChatStorageKey(initialUser));
  });
  const [activeChatId, setActiveChatId] = useState(null);
  /** Bumps when synced sessions hydrate so the composer remounts with an empty draft. */
  const [composerRemountKey, setComposerRemountKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydratingChats, setIsHydratingChats] = useState(() =>
    Boolean(loadStoredUser() && getAuthToken()),
  );
  const [, setSuggestions] = useState([]);
  const [userConditions, setUserConditions] = useState([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 768,
  );
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  const [sessionLimitNotice, setSessionLimitNotice] = useState("");
  const [conditionExploreBusy, setConditionExploreBusy] = useState(false);
  const [conditionExploreKind, setConditionExploreKind] = useState(null);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [sampleQuestionsOpen, setSampleQuestionsOpen] = useState(false);
  const [publicationInsightsModal, setPublicationInsightsModal] = useState({
    open: false,
    publication: null,
    loading: false,
  });
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  /** Top of the latest assistant bubble — align here once when the user sends (read from start of reply). */
  const latestAssistantStartRef = useRef(null);
  /** After submit, one layout pass scrolls so the new assistant row starts at the top of the thread view. */
  const userJustSentRef = useRef(false);
  const abortControllerRef = useRef(null);
  const scrollShowBtnRafRef = useRef(null);
  const refreshPromiseRef = useRef(null);

  const userId = user?._id || user?.id;
  const { t, i18n } = useTranslation("common");
  const askAboutOptions = useMemo(
    () => buildAskAboutOptions(t),
    [t, i18n.language],
  );
  const markdownComponents = useMemo(
    () => getMarkdownComponents(t),
    [t, i18n.language],
  );
  const userRole = user?.role || "patient";
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const authToken = getAuthToken();
  const isRemoteChatUser = Boolean(userId && authToken && !authExpired);
  const chatStorageKey = useMemo(() => getChatStorageKey(user), [user]);
  const handleAuthExpired = useCallback(
    (errorMessage) => {
      setAuthExpired(true);
      setUser(null);
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch {
        // Ignore storage errors and still recover chat locally.
      }
      window.dispatchEvent(new Event("logout"));
      setSessionLimitNotice(
        errorMessage || t("discovery.sessionExpired"),
      );
    },
    [t],
  );

  useEffect(() => {
    if (userId && authToken) {
      setAuthExpired(false);
    }
  }, [userId, authToken]);

  const refreshAuthToken = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      const currentToken = getAuthToken();
      if (!currentToken) return null;

      try {
        const response = await fetch(`${apiBase}/api/auth/refresh`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });
        const data = await readJsonSafely(response);
        if (!response.ok) {
          if (response.status === 401) {
            handleAuthExpired(data?.error);
          }
          return null;
        }
        if (!data?.token) return null;

        localStorage.setItem("token", data.token);
        if (data?.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          setUser(data.user);
          window.dispatchEvent(new Event("userUpdated"));
        }
        return data.token;
      } catch (error) {
        console.error("Silent token refresh failed:", error);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [apiBase, handleAuthExpired]);

  const fetchWithAuthRetry = useCallback(
    async (url, options = {}) => {
      const doFetch = (token) =>
        fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

      let response = await doFetch(getAuthToken());
      if (response.status === 401) {
        const refreshedToken = await refreshAuthToken();
        if (refreshedToken) {
          response = await doFetch(refreshedToken);
        }
      }
      return response;
    },
    [refreshAuthToken],
  );

  // Beta program modal state (shown on /yori, not during onboarding)
  const [showBetaModal, setShowBetaModal] = useState(false);
  const [betaChoicePending, setBetaChoicePending] = useState(null);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  // Show beta prompt when eligible: sync betaProgramOptIn from the server (localStorage can be stale),
  // respect permanent dismiss (X), and do not depend on `user` object identity (avoids flaky re-runs).
  useEffect(() => {
    if (!userId || !authToken) return;
    if (hasDismissedBetaPrompt()) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/users/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const u = data?.user;
          if (u && typeof u === "object") {
            setUser((prev) => {
              const merged = { ...(prev || {}), ...u };
              try {
                localStorage.setItem("user", JSON.stringify(merged));
              } catch {
                // ignore
              }
              return merged;
            });
            window.dispatchEvent(new Event("userUpdated"));
            if (u.betaProgramOptIn === true) return;
            if (hasDismissedBetaPrompt()) return;
            setShowBetaModal(true);
            return;
          }
        }
      } catch {
        // fall through to client-only check
      }
      if (cancelled) return;
      const fromStorage = loadStoredUser();
      if (fromStorage?.betaProgramOptIn === true) return;
      if (hasDismissedBetaPrompt()) return;
      setShowBetaModal(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, authToken, apiBase]);

  useEffect(() => {
    if (!activeChatId && chatSessions.length > 0) {
      setActiveChatId(chatSessions[0].id);
    }
  }, [activeChatId, chatSessions]);

  useEffect(() => {
    if (
      activeChatId &&
      !chatSessions.some((session) => session.id === activeChatId)
    ) {
      setActiveChatId(chatSessions[0]?.id || null);
    }
  }, [activeChatId, chatSessions]);

  useEffect(() => {
    if (isRemoteChatUser) return;
    localStorage.setItem(chatStorageKey, JSON.stringify(chatSessions));
  }, [chatSessions, chatStorageKey, isRemoteChatUser]);

  useLayoutEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const handler = () => {
      setUser(loadStoredUser());
    };
    window.addEventListener("login", handler);
    window.addEventListener("logout", handler);
    window.addEventListener("userUpdated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("login", handler);
      window.removeEventListener("logout", handler);
      window.removeEventListener("userUpdated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setComposerRemountKey((k) => k + 1);
    setSessionLimitNotice("");

    let cancelled = false;

    const hydrateChats = async () => {
      if (!isRemoteChatUser) {
        const nextSessions = loadSavedChatSessions(chatStorageKey);
        if (cancelled) return;
        setChatSessions(nextSessions);
        setActiveChatId(nextSessions[0]?.id || null);
        setIsHydratingChats(false);
        return;
      }

      setIsHydratingChats(true);

      try {
        const response = await fetchWithAuthRetry(
          `${apiBase}/api/chatbot/sessions`,
        );
        const data = await readJsonSafely(response);
        if (!response.ok) {
          if (response.status === 401) {
            handleAuthExpired(data?.error);
            return;
          }
          throw new Error(data?.error || "Failed to load chat sessions");
        }

        let nextSessions = Array.isArray(data.sessions)
          ? data.sessions.map(normalizeSession)
          : [];

        if (nextSessions.length === 0) {
          const createRes = await fetchWithAuthRetry(
            `${apiBase}/api/chatbot/sessions`,
            { method: "POST" },
          );
          const createData = await readJsonSafely(createRes);
          if (!createRes.ok) {
            if (createRes.status === 401) {
              handleAuthExpired(createData?.error);
              return;
            }
            throw new Error(
              createData?.error || "Failed to create chat session",
            );
          }
          nextSessions = [normalizeSession(createData.session)];
        }

        if (cancelled) return;

        setChatSessions(nextSessions);
        setActiveChatId(nextSessions[0]?.id || null);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to hydrate synced chats:", error);
        const fallback = [createChatSession()];
        setChatSessions(fallback);
        setActiveChatId(fallback[0].id);
        setSessionLimitNotice(
          "Couldn't load synced chats right now. Please try again.",
        );
      } finally {
        if (!cancelled) {
          setIsHydratingChats(false);
        }
      }
    };

    hydrateChats();

    return () => {
      cancelled = true;
    };
  }, [
    apiBase,
    chatStorageKey,
    fetchWithAuthRetry,
    handleAuthExpired,
    isRemoteChatUser,
  ]);

  useEffect(() => {
    const loadProfileAndSuggestions = async () => {
      try {
        const conditions = [];
        let condition = user?.medicalInterests?.[0] || null;
        if (userId) {
          try {
            const profileRes = await fetch(`${apiBase}/api/profile/${userId}`);
            const profileData = await profileRes.json();
            const profile = profileData?.profile;
            if (profile?.patient?.conditions?.length > 0) {
              conditions.push(...profile.patient.conditions.slice(0, 3));
              if (!condition) condition = conditions[0];
            } else if (profile?.researcher) {
              const specs = profile.researcher.specialties || [];
              const ints = profile.researcher.interests || [];
              conditions.push(...[...specs, ...ints].slice(0, 3));
              if (!condition) condition = conditions[0];
            }
          } catch {
            /* ignore */
          }
        }
        setUserConditions(conditions);

        const params = new URLSearchParams({ role: userRole });
        if (condition) params.set("condition", condition);
        const res = await fetch(`${apiBase}/api/chatbot/suggestions?${params}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    };
    loadProfileAndSuggestions();
  }, [userRole, apiBase, userId, user]);

  const activeChat = useMemo(
    () =>
      chatSessions.find((session) => session.id === activeChatId) ||
      chatSessions[0],
    [activeChatId, chatSessions],
  );

  const suggestionOptions = useMemo(() => {
    const first = userConditions[0];
    const second = userConditions[1];
    const diseaseLabel = (c) => c || t("yori.myConditionFallback");
    return [
      t("yori.suggestionFindTreatments", { condition: diseaseLabel(first) }),
      t("yori.suggestionFindTreatments", {
        condition: diseaseLabel(second || first),
      }),
      first
        ? t("yori.suggestionFindExpertsIn", { topic: first })
        : t("yori.suggestionFindExpertsDefault"),
      first
        ? t("yori.suggestionLatestResearch", { condition: first })
        : t("yori.suggestionLatestResearchDefault"),
      t("yori.suggestionCommunitiesCollabiora"),
    ];
  }, [userConditions, t, i18n.language]);
  const messages = useMemo(() => activeChat?.messages || [], [activeChat]);
  const activeChatLoaded = activeChat?.loaded !== false;
  const hasUserMessages = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages],
  );
  const canCreateNewChat = chatSessions.length < MAX_CHAT_SESSIONS;
  const activeChatMessageCount = Number.isFinite(
    Number(activeChat?.messageCount),
  )
    ? Number(activeChat.messageCount)
    : messages.length;
  const activeChatIsFull =
    activeChat?.isFull || activeChatMessageCount >= MAX_MESSAGES_PER_SESSION;
  const chatInteractionDisabled =
    isLoading ||
    conditionExploreBusy ||
    isHydratingChats ||
    (isRemoteChatUser && activeChatId && !activeChatLoaded) ||
    activeChatIsFull;

  const updateSessionMessages = useCallback(
    (sessionId, nextMessagesOrUpdater) => {
      setChatSessions((prev) => {
        let touchedIdx = -1;
        const mapped = prev.map((session, idx) => {
          if (session.id !== sessionId) return session;
          touchedIdx = idx;
          const nextMessages =
            typeof nextMessagesOrUpdater === "function"
              ? nextMessagesOrUpdater(session.messages)
              : nextMessagesOrUpdater;
          return {
            ...session,
            messages: nextMessages,
            title: deriveChatTitle(nextMessages),
            preview: getChatPreview(nextMessages),
            messageCount: nextMessages.length,
            isFull: nextMessages.length >= MAX_MESSAGES_PER_SESSION,
            loaded: true,
            updatedAt: Date.now(),
          };
        });
        if (touchedIdx <= 0) return mapped;
        const next = [...mapped];
        const [moved] = next.splice(touchedIdx, 1);
        return [moved, ...next];
      });
    },
    [],
  );

  const mergeRemoteSession = useCallback((sessionData) => {
    const normalized = normalizeSession({ ...sessionData, loaded: true });
    setChatSessions((prev) => {
      const exists = prev.some((session) => session.id === normalized.id);
      const next = exists
        ? prev.map((session) =>
            session.id === normalized.id
              ? { ...session, ...normalized }
              : session,
          )
        : [normalized, ...prev];
      return next.sort((a, b) => b.updatedAt - a.updatedAt);
    });
    return normalized;
  }, []);

  useEffect(() => {
    if (!isRemoteChatUser) return;

    const refreshIfNeeded = async () => {
      const currentToken = getAuthToken();
      if (!currentToken || !isTokenExpiringSoon(currentToken)) return;
      await refreshAuthToken();
    };

    refreshIfNeeded();
    const timer = window.setInterval(refreshIfNeeded, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [isRemoteChatUser, refreshAuthToken]);

  useEffect(() => {
    if (!isRemoteChatUser || !activeChatId) return;
    const selectedSession = chatSessions.find(
      (session) => session.id === activeChatId,
    );
    if (!selectedSession || selectedSession.loaded) return;

    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetchWithAuthRetry(
          `${apiBase}/api/chatbot/sessions/${activeChatId}`,
        );
        const data = await readJsonSafely(response);
        if (!response.ok) {
          if (response.status === 401) {
            handleAuthExpired(data?.error);
            return;
          }
          throw new Error(data?.error || "Failed to load chat history");
        }
        if (!cancelled) {
          mergeRemoteSession(data.session);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load remote chat:", error);
          setSessionLimitNotice("Couldn't load this chat. Please try again.");
        }
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [
    activeChatId,
    apiBase,
    chatSessions,
    fetchWithAuthRetry,
    isRemoteChatUser,
    mergeRemoteSession,
    handleAuthExpired,
  ]);

  const appendAssistantNotice = useCallback(
    (content) => {
      if (!activeChat?.id) return;
      updateSessionMessages(activeChat.id, (prev) => [
        ...prev,
        { role: "assistant", content },
      ]);
    },
    [activeChat?.id, updateSessionMessages],
  );

  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useLayoutEffect(() => {
    if (!activeChatId) return;
    userJustSentRef.current = false;
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [activeChatId]);

  useLayoutEffect(() => {
    if (!userJustSentRef.current) return;
    userJustSentRef.current = false;
    latestAssistantStartRef.current?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }, [messages]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const flush = () => {
      scrollShowBtnRafRef.current = null;
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distanceFromBottom > 200);
    };
    const onScroll = () => {
      if (scrollShowBtnRafRef.current != null) return;
      scrollShowBtnRafRef.current = requestAnimationFrame(flush);
    };
    flush();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (scrollShowBtnRafRef.current != null) {
        cancelAnimationFrame(scrollShowBtnRafRef.current);
        scrollShowBtnRafRef.current = null;
      }
    };
  }, [activeChatId, hasUserMessages]);

  const createNewChat = useCallback(async () => {
    if (!canCreateNewChat) {
      setSessionLimitNotice(
        "You can keep up to 5 chats. Delete one to start a new chat.",
      );
      return;
    }
    setIsCreatingNewChat(true);
    setSessionLimitNotice("");
    let tempChatId = null;

    try {
      let newChat;
      if (isRemoteChatUser) {
        const tempChat = {
          ...createChatSession("New chat"),
          pendingRemoteCreate: true,
        };
        tempChatId = tempChat.id;
        setChatSessions((prev) =>
          [tempChat, ...prev].sort((a, b) => b.updatedAt - a.updatedAt),
        );
        setActiveChatId(tempChat.id);
        setSidebarOpen(false);

        const response = await fetchWithAuthRetry(
          `${apiBase}/api/chatbot/sessions`,
          {
            method: "POST",
          },
        );
        const data = await readJsonSafely(response);
        if (!response.ok) {
          if (response.status === 401) {
            handleAuthExpired(data?.error);
            throw new Error("Your session expired. Please sign in again.");
          }
          throw new Error(data?.error || "Failed to create chat session");
        }
        newChat = normalizeSession({ ...data.session, loaded: true });
        setChatSessions((prev) => {
          const mapped = prev.map((s) => (s.id === tempChatId ? newChat : s));
          const seen = new Set();
          return mapped
            .filter((s) => {
              if (seen.has(s.id)) return false;
              seen.add(s.id);
              return true;
            })
            .sort((a, b) => b.updatedAt - a.updatedAt);
        });
        setActiveChatId((prev) => (prev === tempChatId ? newChat.id : prev));
      } else {
        newChat = createChatSession();
        setChatSessions((prev) =>
          [newChat, ...prev].sort((a, b) => b.updatedAt - a.updatedAt),
        );
        setActiveChatId(newChat.id);
        setSidebarOpen(false);
      }
    } catch (error) {
      setSessionLimitNotice(
        error.message || "Couldn't create a new chat right now.",
      );
      if (tempChatId) {
        setChatSessions((prev) => {
          const next = prev.filter((s) => s.id !== tempChatId);
          const fallbackActive = next[0]?.id ?? null;
          setActiveChatId((prevActive) =>
            prevActive === tempChatId ? fallbackActive : prevActive,
          );
          return next;
        });
      }
    } finally {
      setIsCreatingNewChat(false);
    }
  }, [
    apiBase,
    canCreateNewChat,
    fetchWithAuthRetry,
    isRemoteChatUser,
    handleAuthExpired,
  ]);

  const deleteChat = useCallback(
    async (sessionId) => {
      if (abortControllerRef.current && sessionId === activeChat?.id) {
        abortControllerRef.current.abort();
      }
      setDeletingSessionId(sessionId);

      const previousSessions = chatSessions;
      const sessionBeingDeleted = previousSessions.find(
        (s) => s.id === sessionId,
      );
      const skipRemoteDelete =
        isRemoteChatUser && sessionBeingDeleted?.pendingRemoteCreate === true;
      const remaining = previousSessions.filter((s) => s.id !== sessionId);
      const nextActiveId =
        activeChatId === sessionId ? (remaining[0]?.id ?? null) : activeChatId;

      // Optimistic update: remove from UI immediately
      if (remaining.length > 0) {
        setChatSessions(remaining);
        setActiveChatId(nextActiveId);
      } else if (isRemoteChatUser) {
        setChatSessions([]);
        setActiveChatId(null);
      } else {
        const fallback = createChatSession();
        setChatSessions([fallback]);
        setActiveChatId(fallback.id);
      }
      setSessionLimitNotice("");

      try {
        if (isRemoteChatUser) {
          if (!skipRemoteDelete) {
            const response = await fetchWithAuthRetry(
              `${apiBase}/api/chatbot/sessions/${sessionId}`,
              { method: "DELETE" },
            );
            if (!response.ok) {
              const data = (await readJsonSafely(response)) || {};
              if (response.status === 401) {
                handleAuthExpired(data.error);
                throw new Error("Your session expired. Please sign in again.");
              }
              throw new Error(data.error || "Failed to delete chat");
            }
          }
          if (remaining.length === 0) {
            await createNewChat();
          }
        }
      } catch (error) {
        setSessionLimitNotice(error.message || "Couldn't delete this chat.");
        setChatSessions(previousSessions);
        setActiveChatId(
          activeChatId === sessionId
            ? (previousSessions[0]?.id ?? null)
            : activeChatId,
        );
      } finally {
        setDeletingSessionId(null);
      }
    },
    [
      activeChatId,
      activeChat?.id,
      apiBase,
      chatSessions,
      createNewChat,
      fetchWithAuthRetry,
      handleAuthExpired,
      isRemoteChatUser,
    ],
  );

  const handleSelectChat = useCallback((sessionId) => {
    setActiveChatId(sessionId);
    setSidebarOpen(false);
  }, []);

  const handleSendMessage = useCallback(
    async (messageText, context = null) => {
      const sessionId = activeChat?.id;
      if (!sessionId) return;
      const text = typeof messageText === "string" ? messageText.trim() : "";
      if (!text || chatInteractionDisabled) return;
      if (
        activeChatIsFull ||
        activeChatMessageCount + 2 > MAX_MESSAGES_PER_SESSION
      ) {
        setSessionLimitNotice(
          "This chat reached its limit. Download it if needed, then start a new chat.",
        );
        return;
      }

      const currentMessages = activeChat.messages || [];
      const userMessage = {
        role: "user",
        content: text,
        ...(context ? { context } : {}),
      };
      const newMessages = [...currentMessages, userMessage];
      const assistantMessageIndex = newMessages.length;

      userJustSentRef.current = true;
      updateSessionMessages(sessionId, [
        ...newMessages,
        {
          role: "assistant",
          content: "",
          searchResults: null,
          trialDetails: null,
          publicationDetails: null,
          groundingSources: null,
          conditionDiscovery: null,
          relatedExplore: null,
        },
      ]);
      setIsLoading(true);

      try {
        abortControllerRef.current = new AbortController();

        const requestHeaders = {
          "Content-Type": "application/json",
        };

        const requestBody = isRemoteChatUser
          ? {
              sessionId,
              message: text,
              locale: getApiLocale(),
              ...(context ? { context } : {}),
              ...(userId ? { userId } : {}),
            }
          : {
              locale: getApiLocale(),
              messages: newMessages.map((message) => {
                let content =
                  message.content != null && message.content !== ""
                    ? message.content
                    : " ";
                if (
                  message.role === "assistant" &&
                  message.searchResults?.items?.length > 0
                ) {
                  const topicHint = message.searchResults.query
                    ? `[Previous search topic: "${message.searchResults.query}"]`
                    : "";
                  if (topicHint) {
                    content = content + "\n" + topicHint;
                  }
                }
                return { ...message, content };
              }),
              ...(context ? { context } : {}),
              ...(userId ? { userId } : {}),
            };

        const response = isRemoteChatUser
          ? await fetchWithAuthRetry(`${apiBase}/api/chatbot/chat`, {
              method: "POST",
              headers: requestHeaders,
              credentials: "include",
              body: JSON.stringify(requestBody),
              signal: abortControllerRef.current.signal,
            })
          : await fetch(`${apiBase}/api/chatbot/chat`, {
              method: "POST",
              headers: requestHeaders,
              credentials: "include",
              body: JSON.stringify(requestBody),
              signal: abortControllerRef.current.signal,
            });

        if (!response.ok) {
          let errMsg = "Failed to get response";
          const errBody = await readJsonSafely(response);
          if (errBody?.error) errMsg = errBody.error;
          if (response.status === 401) {
            errMsg = "Your session expired. Please sign in again.";
            handleAuthExpired(errBody?.error || errMsg);
          }
          if (response.status === 409) {
            setSessionLimitNotice(errMsg);
          }
          throw new Error(errMsg);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let searchResults = null;
        let trialDetails = null;
        let publicationDetails = null;
        let groundingSources = null;
        let communityResults = null;
        let conditionDiscovery = null;
        let relatedExplore = null;
        let buffer = "";
        let streamFlushRaf = null;

        const flushStreamUi = () => {
          streamFlushRaf = null;
          updateSessionMessages(sessionId, (prevMessages) => {
            const updated = [...prevMessages];
            updated[assistantMessageIndex] = {
              role: "assistant",
              content: assistantContent,
              searchResults,
              trialDetails,
              publicationDetails,
              groundingSources,
              communityResults,
              conditionDiscovery,
              relatedExplore,
            };
            return updated;
          });
        };

        const scheduleStreamUi = () => {
          if (streamFlushRaf != null) return;
          streamFlushRaf = requestAnimationFrame(flushStreamUi);
        };

        while (true) {
          const { done, value } = await reader.read();
          if (value) buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // keep incomplete line in buffer
          if (done && buffer.trim()) lines.push(buffer); // process remainder at end

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.error) throw new Error(data.error);
              if (data.trialDetails) trialDetails = data.trialDetails;
              if (data.publicationDetails)
                publicationDetails = data.publicationDetails;
              if (data.text) assistantContent += data.text;
              if (data.groundingSources)
                groundingSources = data.groundingSources;
              if (data.searchResults) searchResults = data.searchResults;
              if (data.communityResults)
                communityResults = data.communityResults;
              if (data.conditionDiscovery)
                conditionDiscovery = data.conditionDiscovery;
              if (data.relatedExplore) relatedExplore = data.relatedExplore;

              scheduleStreamUi();
              // Do not break early on `done`: other `data:` lines in this chunk
              // (e.g. conditionDiscovery) must still be applied.
            } catch (error) {
              if (error.message && !error.message.includes("JSON")) throw error;
            }
          }
          if (done) break;
        }

        if (streamFlushRaf != null) {
          cancelAnimationFrame(streamFlushRaf);
          streamFlushRaf = null;
        }
        // Final update so we never miss searchResults/trialDetails/etc. from last chunk
        flushStreamUi();
      } catch (error) {
        if (error.name === "AbortError") return;
        updateSessionMessages(sessionId, (prevMessages) => {
          const updated = [...prevMessages];
          updated[assistantMessageIndex] = {
            role: "assistant",
            content:
              error.message || "I encountered an error. Please try again.",
            searchResults: null,
            trialDetails: null,
            publicationDetails: null,
            groundingSources: null,
            communityResults: null,
            conditionDiscovery: null,
            relatedExplore: null,
          };
          return updated;
        });
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      activeChat,
      activeChatIsFull,
      activeChatMessageCount,
      apiBase,
      chatInteractionDisabled,
      fetchWithAuthRetry,
      isRemoteChatUser,
      handleAuthExpired,
      updateSessionMessages,
      userId,
    ],
  );

  const handleConditionDirectSearch = useCallback(
    async (kind, rawQuery) => {
      const sessionId = activeChat?.id;
      const q = String(rawQuery || "").trim();
      if (!sessionId || !q || conditionExploreBusy) return;
      if (
        activeChatIsFull ||
        activeChatMessageCount + 1 > MAX_MESSAGES_PER_SESSION
      ) {
        setSessionLimitNotice(
          "This chat reached its limit. Download it if needed, then start a new chat.",
        );
        return;
      }

      setConditionExploreBusy(true);
      setConditionExploreKind(kind);

      const emptyAssistantShell = {
        trialDetails: null,
        publicationDetails: null,
        groundingSources: null,
        communityResults: null,
        conditionDiscovery: null,
        relatedExplore: null,
      };

      try {
        const params = new URLSearchParams();
        params.set("q", q);
        params.set("page", "1");
        params.set("pageSize", "12");
        params.set("sortByDate", "true");
        if (userId) params.set("userId", userId);
        appendLocaleToSearchParams(params);

        const url =
          kind === "trials"
            ? `${apiBase}/api/search/trials?${params.toString()}`
            : `${apiBase}/api/search/publications?${params.toString()}`;

        const res = await fetch(url, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Search failed");
        }
        const items = Array.isArray(data.results) ? data.results : [];
        const content =
          items.length > 0
            ? buildDirectSearchIntro(kind, items.length, q, t)
            : buildDirectSearchEmpty(kind, q, t);
        const searchResults =
          items.length > 0
            ? {
                type: kind === "trials" ? "trials" : "publications",
                query: q,
                items,
              }
            : undefined;

        if (isRemoteChatUser) {
          const appendRes = await fetchWithAuthRetry(
            `${apiBase}/api/chatbot/sessions/${sessionId}/append-assistant-search`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                content,
                ...(searchResults ? { searchResults } : {}),
              }),
            },
          );
          const appendData = await readJsonSafely(appendRes);
          if (!appendRes.ok) {
            if (appendRes.status === 401) {
              handleAuthExpired(appendData?.error);
              throw new Error("Your session expired. Please sign in again.");
            }
            if (appendRes.status === 409) {
              setSessionLimitNotice(
                appendData?.error ||
                  "This chat reached its limit. Start a new chat.",
              );
            }
            throw new Error(appendData?.error || "Failed to save results");
          }
          const saved = appendData?.message;
          if (saved?.role === "assistant") {
            updateSessionMessages(sessionId, (prev) => [
              ...prev,
              {
                role: "assistant",
                content: saved.content || "",
                searchResults: saved.searchResults ?? null,
                trialDetails: saved.trialDetails ?? null,
                publicationDetails: saved.publicationDetails ?? null,
                groundingSources: saved.groundingSources ?? null,
                communityResults: saved.communityResults ?? null,
                conditionDiscovery: saved.conditionDiscovery ?? null,
                relatedExplore: saved.relatedExplore ?? null,
              },
            ]);
          }
        } else {
          updateSessionMessages(sessionId, (prev) => [
            ...prev,
            {
              role: "assistant",
              content,
              ...emptyAssistantShell,
              ...(searchResults ? { searchResults } : {}),
            },
          ]);
        }
      } catch (err) {
        appendAssistantNotice(
          err?.message || "Something went wrong loading results.",
        );
      } finally {
        setConditionExploreBusy(false);
        setConditionExploreKind(null);
      }
    },
    [
      activeChat?.id,
      activeChatIsFull,
      activeChatMessageCount,
      apiBase,
      appendAssistantNotice,
      conditionExploreBusy,
      fetchWithAuthRetry,
      handleAuthExpired,
      isRemoteChatUser,
      t,
      updateSessionMessages,
      userId,
    ],
  );

  const handleAskAbout = useCallback(
    (item, type) => {
      const question =
        type === "publication"
          ? `Tell me more about this publication: "${item.title}"`
          : type === "trial"
            ? `Tell me more about this trial: "${item.title}"`
            : `Tell me more about this researcher: "${item.name}"`;
      handleSendMessage(question, getAskContext(type, item));
    },
    [handleSendMessage],
  );

  const handleTrialAskMore = useCallback(
    (question, details) => {
      handleSendMessage(question, getAskContext("trial", details));
    },
    [handleSendMessage],
  );

  const handlePublicationAskMore = useCallback(
    (question, details) => {
      handleSendMessage(question, getAskContext("publication", details));
    },
    [handleSendMessage],
  );

  const handleSaveToFavourites = useCallback(
    async (type, item) => {
      if (!userId) {
        appendAssistantNotice(
          "Please sign in to save this item to favourites.",
        );
        return;
      }
      try {
        const res = await fetch(`${apiBase}/api/favorites/${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            item: {
              ...item,
              id: item.id || item.nctId || item.pmid,
              _id: item._id || item.id,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save");
        appendAssistantNotice(
          `Saved this ${type === "trial" ? "trial" : type === "publication" ? "publication" : "item"} to your favourites.`,
        );
      } catch (error) {
        appendAssistantNotice(
          error.message || "Failed to save. Please try again.",
        );
      }
    },
    [apiBase, appendAssistantNotice, userId],
  );

  const openPublicationInsightsModal = useCallback(
    async (pub) => {
      setPublicationInsightsModal({
        open: true,
        publication: pub,
        loading: true,
      });
      const { publication: merged } = await fetchPublicationInsightsDetails(
        pub,
        {
          apiBase,
          locale: getApiLocale(),
          audience: userRole === "researcher" ? "researcher" : "patient",
        },
      );
      startTransition(() => {
        setPublicationInsightsModal({
          open: true,
          publication: merged,
          loading: false,
        });
      });
    },
    [apiBase, userRole],
  );

  const closePublicationInsightsModal = useCallback(() => {
    setPublicationInsightsModal({
      open: false,
      publication: null,
      loading: false,
    });
  }, []);

  return (
    <div className="relative min-h-screen pt-18 pb-19 sm:pt-16 sm:pb-0 yori-page-enter">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-[#F5F2F8] via-white to-[#E8E0EF]">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{
            willChange: "transform",
            transform: "translateZ(0)",
            background:
              "linear-gradient(to bottom right, rgba(208, 196, 226, 0.3), rgba(47, 60, 150, 0.2), rgba(208, 196, 226, 0.25))",
            animation: "yori-blob-float 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl"
          style={{
            willChange: "transform",
            transform: "translateZ(0)",
            animationDelay: "1s",
            background:
              "linear-gradient(to top right, rgba(47, 60, 150, 0.25), rgba(208, 196, 226, 0.2), rgba(47, 60, 150, 0.3))",
            animation: "yori-blob-float-reverse 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/4 left-1/2 w-[300px] h-[300px] rounded-full blur-3xl"
          style={{
            willChange: "transform, opacity",
            transform: "translateZ(0)",
            animationDelay: "0.5s",
            background:
              "linear-gradient(to bottom right, rgba(208, 196, 226, 0.2), rgba(208, 196, 226, 0.25))",
            animation: "yori-blob-pulse 8s ease-in-out infinite",
          }}
        />
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes yori-blob-float {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes yori-blob-float-reverse {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-30px, 50px) scale(0.9); }
          66% { transform: translate(20px, -20px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes yori-blob-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        @keyframes yori-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes yori-rise {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .yori-page-enter {
          animation: yori-fade-in 0.45s ease-out both;
        }
        .yori-section-enter {
          opacity: 0;
          animation: yori-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .yori-delay-1 { animation-delay: 0.08s; }
        .yori-delay-2 { animation-delay: 0.18s; }
        .yori-delay-3 { animation-delay: 0.28s; }
        .yori-delay-4 { animation-delay: 0.38s; }
        .yori-delay-5 { animation-delay: 0.48s; }
        .yori-sidebar-enter {
          animation: yori-rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }
        .yori-main-enter {
          animation: yori-rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }
        .yori-message-enter {
          animation: yori-rise 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (max-width: 767px) {
          .yori-sidebar-enter { animation: none; opacity: 1; }
        }
      `,
        }}
      />

      <div className="relative mx-auto flex h-[calc(100dvh-9.25rem)] sm:h-[calc(100vh-4rem)] max-w-[1500px] px-1.5 py-1.5 sm:px-4 sm:py-4">
        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-200"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — drawer on mobile, inline on desktop */}
        <aside
          className={`
            shrink-0 transition-all duration-300 ease-in-out overflow-hidden
            ${
              isMobile
                ? `fixed left-0 top-0 bottom-16 z-50 w-[min(300px,85vw)] pt-[5.5rem] pb-2 px-2 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
                : `${sidebarOpen ? "w-[280px] mr-4" : "w-0 mr-0"}`
            }
          `}
          style={
            isMobile
              ? { transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)" }
              : undefined
          }
        >
          <div
            className={`flex flex-col rounded-2xl border border-[#D1D3E5] bg-white/95 shadow-sm overflow-hidden yori-sidebar-enter ${isMobile ? "h-full" : "h-full w-[280px]"}`}
          >
            <div className="flex items-center gap-2 p-3">
              <button
                type="button"
                onClick={createNewChat}
                disabled={!canCreateNewChat || isCreatingNewChat}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 transition-opacity"
                style={{
                  background: "linear-gradient(135deg, #2F3C96, #474F97)",
                }}
              >
                {isCreatingNewChat ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isCreatingNewChat
                  ? t("chat.creatingChat")
                  : t("chat.newChat")}
              </button>
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D1D3E5] bg-white text-[#2F3C96] hover:bg-[#E8E9F2]/50 transition-colors"
                  aria-label="Close sidebar"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              )}
            </div>
            {(sessionLimitNotice || deletingSessionId) && (
              <p className="px-3 text-xs text-center min-h-[1.25rem]">
                {deletingSessionId ? (
                  <span className="text-slate-500">Deleting chat…</span>
                ) : (
                  <span className="text-amber-600">{sessionLimitNotice}</span>
                )}
              </p>
            )}

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
              {chatSessions.map((session) => (
                <ChatHistoryItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeChat?.id}
                  onSelect={handleSelectChat}
                  onDelete={deleteChat}
                  isDeleting={deletingSessionId === session.id}
                />
              ))}
            </div>

            <div className="border-t border-[#D1D3E5] px-3 py-2.5 text-center">
              <p className="text-[11px] text-slate-400">
                {chatSessions.length}/{MAX_CHAT_SESSIONS} chats &middot;{" "}
                {isRemoteChatUser ? "synced to your account" : "kept 7 days"}
              </p>
            </div>
          </div>
        </aside>

        {/* Main chat area */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#D1D3E5] bg-white shadow-sm yori-main-enter">
          {/* Header - aligned with global layout */}
          <div className="relative flex h-14 items-center gap-2 sm:gap-3 border-b border-[#D1D3E5] bg-white/90 px-3 sm:px-4 overflow-visible">
            <div className="relative flex items-center gap-3 min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#2F3C96] min-w-0">
                {activeChat?.title || t("chat.newChat")}
              </p>
            </div>
            {/* Placeholder notification icon to mirror navbar */}
            <button
              type="button"
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-[#2F3C96] hover:bg-[#E8E9F2]/60 transition-colors"
              aria-label={t("chat.notifications")}
            >
              <Loader2 className="h-4 w-4 animate-spin opacity-0" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D1D3E5] bg-white text-[#2F3C96] hover:bg-[#E8E9F2]/60 transition-colors"
              aria-label={
                sidebarOpen ? t("chat.hideChats") : t("chat.showChats")
              }
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Messages area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto overscroll-y-contain px-2 pt-3 pb-3 sm:px-6 sm:pt-6 sm:pb-6"
          >
            {isHydratingChats ||
            (isRemoteChatUser && activeChatId && !activeChatLoaded) ? (
              <div className="flex min-h-full items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-[#2F3C96]" />
                  {t("yori.pageLoadingHistory")}
                </div>
              </div>
            ) : !hasUserMessages ? (
              <div className="flex min-h-full flex-col items-center justify-start px-1 pt-8 pb-14 sm:justify-center sm:px-2 sm:pt-0 sm:pb-10">
                {/* Hero */}
                <div className="mb-3 text-center sm:mb-6 yori-section-enter yori-delay-1">
                  <img
                    src="/bot.webp"
                    alt={t("yori.name")}
                    className="mx-auto mb-2 h-14 w-14 sm:mb-3 sm:h-24 sm:w-24 object-contain"
                  />
                  <h1 className="text-lg font-bold text-[#2F3C96] sm:text-3xl">
                    {t("yori.pageHeroGreeting")}
                  </h1>
                </div>

                {/* Suggested questions - collapsible like FloatingChatbot */}
                <div className="w-full max-w-2xl mx-auto yori-section-enter yori-delay-3">
                  <button
                    type="button"
                    onClick={() => setSampleQuestionsOpen((prev) => !prev)}
                    className="flex items-center justify-center gap-1.5 w-full text-sm font-medium text-[#2F3C96] hover:text-[#1e266d] transition-colors"
                  >
                    {sampleQuestionsOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    )}
                    {sampleQuestionsOpen
                      ? t("yori.sampleQuestionsHide")
                      : t("yori.sampleQuestionsShow")}
                  </button>
                  {sampleQuestionsOpen && (
                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                      {suggestionOptions.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(q)}
                          disabled={chatInteractionDisabled}
                          className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-white border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] shadow-sm transition-colors disabled:opacity-50"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-5">
                {messages.map((message, index) => (
                  <React.Fragment key={index}>
                    {message.role === "user" ? (
                      <div className="flex justify-end">
                        <div
                          className="max-w-[90%] rounded-2xl px-4 py-2.5 text-white shadow-sm sm:max-w-[70%] sm:px-5 sm:py-3"
                          style={{
                            background:
                              "linear-gradient(135deg, #2F3C96, #474F97)",
                          }}
                        >
                          <p className="text-[15px] leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        ref={
                          message.role === "assistant" &&
                          index === messages.length - 1
                            ? latestAssistantStartRef
                            : undefined
                        }
                        className="flex items-start gap-0 yori-message-enter"
                      >
                        <div className="relative z-10 mt-2 -mr-2  flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center">
                          <img
                            src={
                              isLoading &&
                              index === messages.length - 1 &&
                              !message.content &&
                              !message.searchResults &&
                              !message.trialDetails &&
                              !message.publicationDetails &&
                              !message.communityResults &&
                              !message.conditionDiscovery
                                ? "/yori-thinking.webp"
                                : "/Yorisidepeak.webp"
                            }
                            alt={t("yori.name")}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          {/* Same as YoriGuestLandingPage: always show prose + grounding chips when there is content */}
                          {message.content && (
                            <div className="rounded-2xl border border-[#D0C4E2]/40 bg-[#F5F2F8]/30 px-3 py-3 sm:px-5 sm:py-4">
                              <div className="prose prose-sm max-w-none [&>*:last-child]:mb-0">
                                <ReactMarkdown
                                  components={markdownComponents}
                                >
                                  {preprocessMarkdownWithGroundingCitations(
                                    message.content,
                                    message.groundingSources,
                                  )}
                                </ReactMarkdown>
                              </div>
                              <RelatedTrialsChip
                                relatedExplore={message.relatedExplore}
                                onSend={(prompt) => handleSendMessage(prompt)}
                                disabled={chatInteractionDisabled}
                              />
                            </div>
                          )}

                          {!message.content &&
                            !message.searchResults &&
                            !message.trialDetails &&
                            !message.publicationDetails &&
                            !message.communityResults &&
                            isLoading &&
                            index === messages.length - 1 && (
                              <div className="ml-2 sm:ml-3 inline-flex items-center gap-1.5 rounded-2xl border border-[#D0C4E2]/40 bg-[#F5F2F8]/30 px-3 py-2.5 sm:px-4">
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-[#2F3C96]/60 animate-bounce"
                                  style={{ animationDelay: "0ms" }}
                                />
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-[#2F3C96]/60 animate-bounce"
                                  style={{ animationDelay: "150ms" }}
                                />
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-[#2F3C96]/60 animate-bounce"
                                  style={{ animationDelay: "300ms" }}
                                />
                              </div>
                            )}

                          {/* Match guest order: search result cards directly under the answer */}
                          {message.searchResults && (
                            <SearchResultsCards
                              searchResults={message.searchResults}
                              onAskAbout={handleAskAbout}
                              onSave={handleSaveToFavourites}
                              userId={userId}
                              userRole={userRole}
                              onReadPublicationDetails={
                                openPublicationInsightsModal
                              }
                            />
                          )}

                          {message.conditionDiscovery && (
                            <ConditionDiscoveryPanel
                              conditionDiscovery={message.conditionDiscovery}
                              busyKind={conditionExploreKind}
                              onExploreTrials={(query) =>
                                handleConditionDirectSearch("trials", query)
                              }
                              onExplorePublications={(query) =>
                                handleConditionDirectSearch(
                                  "publications",
                                  query,
                                )
                              }
                              disabled={chatInteractionDisabled}
                            />
                          )}

                          {message.trialDetails &&
                            message.trialDetails.showCard !== false && (
                              <TrialDetailsCard
                                trialDetails={message.trialDetails}
                                onAskMore={(question) =>
                                  handleTrialAskMore(
                                    question,
                                    message.trialDetails,
                                  )
                                }
                                onSave={handleSaveToFavourites}
                                userId={userId}
                                askOptions={askAboutOptions.trial}
                              />
                            )}

                          {message.trialDetails &&
                            message.trialDetails.showCard === false &&
                            (!isLoading || index < messages.length - 1) && (
                              <AskMoreBar
                                type="trial"
                                details={message.trialDetails}
                                onAskMore={(question) =>
                                  handleTrialAskMore(
                                    question,
                                    message.trialDetails,
                                  )
                                }
                                onSave={handleSaveToFavourites}
                                userId={userId}
                                askAboutOptions={askAboutOptions}
                              />
                            )}

                          {message.publicationDetails &&
                            message.publicationDetails.showFullCard !==
                              false && (
                              <PublicationDetailsCard
                                publicationDetails={message.publicationDetails}
                                onAskMore={(question) =>
                                  handlePublicationAskMore(
                                    question,
                                    message.publicationDetails,
                                  )
                                }
                                onSave={handleSaveToFavourites}
                                userId={userId}
                                askOptions={askAboutOptions.publication}
                              />
                            )}

                          {message.publicationDetails &&
                            message.publicationDetails.showFullCard === false &&
                            (!isLoading || index < messages.length - 1) && (
                              <AskMoreBar
                                type="publication"
                                details={message.publicationDetails}
                                onAskMore={(question) =>
                                  handlePublicationAskMore(
                                    question,
                                    message.publicationDetails,
                                  )
                                }
                                onSave={handleSaveToFavourites}
                                userId={userId}
                                askAboutOptions={askAboutOptions}
                              />
                            )}

                          {message.communityResults &&
                            message.communityResults.communities?.length >
                              0 && (
                              <CommunityCards
                                communities={
                                  message.communityResults.communities
                                }
                              />
                            )}

                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Scroll to bottom */}
          {showScrollBtn && hasUserMessages && (
            <div className="pointer-events-none absolute bottom-28 left-1/2 z-10 -translate-x-1/2">
              <button
                type="button"
                onClick={() => scrollToBottom("smooth")}
                className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#D1D3E5] bg-white shadow-md hover:bg-[#E8E9F2]"
              >
                <ArrowDown className="h-4 w-4 text-[#2F3C96]" />
              </button>
            </div>
          )}

          {/* Input */}
          <div className="px-2 pb-2 pt-1 sm:px-6 sm:pb-3">
            {activeChatIsFull && (
              <p className="mx-auto mb-2 w-full max-w-4xl text-center text-xs text-amber-600">
                {t("yori.chatReachedLimitNotice")}
              </p>
            )}
            <YoriChatComposer
              key={`${activeChatId ?? "none"}-${composerRemountKey}`}
              onSubmit={handleSendMessage}
              disabled={chatInteractionDisabled}
              isSending={isLoading}
              placeholder={
                activeChatIsFull
                  ? t("yori.placeholderChatFull")
                  : isHydratingChats ||
                      (isRemoteChatUser && activeChatId && !activeChatLoaded)
                    ? t("yori.placeholderLoadingChat")
                    : t("yori.placeholderAskAnything")
              }
            />
            <p className="mt-2 max-w-4xl mx-auto px-1 text-center text-[10px] sm:text-[11px] text-slate-500 leading-relaxed hidden sm:block">
              {t("yori.disclaimer")}
            </p>
            <div className="sm:hidden mt-2 flex justify-center px-1">
              <button
                type="button"
                onClick={() => setDisclaimerOpen(true)}
                className="text-[11px] font-medium text-[#2F3C96] underline underline-offset-2 decoration-[#2F3C96]/60"
              >
                {t("yori.viewDisclaimer")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Join Beta Program Modal (shown on /yori for signed-in users) */}
      {showBetaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border p-6 space-y-4"
            style={{ borderColor: "#D0C4E2" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  className="text-lg font-bold mb-1"
                  style={{ color: "#2F3C96" }}
                >
                  Join our beta program?
                </h2>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "#555" }}
                >
                  Get early access to new collabiora features and help shape
                  what comes next. Join as a beta user to preview updates, test
                  improvements, and share your feedback.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBetaModal(false);
                  setDismissedBetaPrompt();
                }}
                className="p-1 rounded-full hover:bg-black/5"
                aria-label="Close beta program dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={async () => {
                  if (betaChoicePending || !authToken || !userId) {
                    setShowBetaModal(false);
                    setDismissedBetaPrompt();
                    return;
                  }
                  setBetaChoicePending("yes");
                  try {
                    await fetch(`${apiBase}/api/users/me/beta-program`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${authToken}`,
                      },
                      body: JSON.stringify({ wantsBeta: true }),
                    });
                    const updated = { ...(user || {}), betaProgramOptIn: true };
                    setUser(updated);
                    try {
                      localStorage.setItem("user", JSON.stringify(updated));
                    } catch {
                      // ignore
                    }
                  } catch {
                    // non-blocking
                  } finally {
                    setShowBetaModal(false);
                    setBetaChoicePending(null);
                    setDismissedBetaPrompt();
                  }
                }}
                disabled={!!betaChoicePending}
                className="flex-1 rounded-lg py-2 text-sm font-semibold"
                style={{
                  backgroundColor: "#2F3C96",
                  color: "#FFFFFF",
                }}
              >
                Yes, Count Me In
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Not now: close for this visit only — do not persist dismiss or
                  // record a decline in the DB (so we can ask again next time).
                  setShowBetaModal(false);
                  setBetaChoicePending(null);
                }}
                disabled={!!betaChoicePending}
                className="flex-1 rounded-lg py-2 text-sm font-semibold border"
                style={{
                  borderColor: "#D0C4E2",
                  color: "#2F3C96",
                  backgroundColor: "#FFFFFF",
                }}
              >
                Maybe Later
              </Button>
            </div>

            <p className="text-[11px]" style={{ color: "#777" }}>
              We’ll only use your email to share beta updates, research invites,
              and opportunities to give feedback.
            </p>
          </div>
        </div>
      )}

      <PublicationKeyInsightsModal
        isOpen={publicationInsightsModal.open}
        onClose={closePublicationInsightsModal}
        publication={publicationInsightsModal.publication}
        loading={publicationInsightsModal.loading}
        userId={userId}
        userRole={userRole}
        onAddToFavorites={handleSaveToFavourites}
      />

      {disclaimerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/50"
          onClick={() => setDisclaimerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="yori-chat-disclaimer-title"
        >
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border-2 border-t bg-white p-5 shadow-2xl max-h-[min(85vh,520px)] overflow-y-auto sm:max-h-[85vh]"
            style={{ borderColor: "#D0C4E2" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2
                id="yori-chat-disclaimer-title"
                className="text-base font-bold text-[#2F3C96] pr-2"
              >
                {t("yori.disclaimerTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setDisclaimerOpen(false)}
                className="shrink-0 rounded-lg p-1.5 text-[#2F3C96] hover:bg-[#F5F2F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3C96] focus-visible:ring-offset-2"
                aria-label={t("yori.close")}
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t("yori.disclaimer")}
            </p>
            <button
              type="button"
              onClick={() => setDisclaimerOpen(false)}
              className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: "#2F3C96" }}
            >
              {t("yori.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
