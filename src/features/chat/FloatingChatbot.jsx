import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  X,
  Send,
  Loader2,
  Minimize2,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Microscope,
  Users,
  MapPin,
  MessageSquare,
  Mail,
  Phone,
  Trash2,
  User,
  Heart,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import {
  preprocessMarkdownWithGroundingCitations,
  flattenMarkdownChildrenToString,
  isLikelyGroundingSourceUrl,
  looksLikeHostnameChip,
  GROUNDING_SOURCE_CHIP_CLASSNAME,
} from "../../utils/groundingCitations.js";
import {
  normalizeSearchResultsTrialLocations,
  formatTrialLocationDisplayForCard,
} from "../../utils/trialCardLocations.js";
import toast from "react-hot-toast";
import { getDisplayName } from "../../utils/researcherDisplayName.js";
import {
  getGuestTrialCount,
  incrementGuestTrialAfterMessage,
  MAX_GUEST_TRIALS,
} from "../../utils/yoriGuestTrials.js";
import {
  loadGuestChatMessages,
  saveGuestChatMessages,
  restoreGuestGeneralMessages,
  YORI_GUEST_CHAT_STORAGE_KEY,
  IORA_CHAT_STORAGE_KEY,
  migrateGuestChatToIoraStorage,
} from "../../utils/yoriGuestChatStorage.js";
import { getApiLocale } from "../../i18n/getApiLocale.js";
import { getPublicationPath } from "../../utils/publicationRouting.js";
import i18n from "i18next";

// Quick-ask options when user clicks "Ask about this" (context is sent with the chosen question)
const YORI_MOBILE_TEASER_STORAGE_KEY =
  "collabiora_yori_mobile_teaser_collapsed";

/** Uses current i18n language (for cards rendered outside useTranslation scope). */
function getAskAboutOptions() {
  return {
    trial: [
      {
        label: i18n.t("chat.trialAskTellMore"),
        question: i18n.t("chat.trialAskTellMoreQ"),
      },
      {
        label: i18n.t("chat.trialAskInclusion"),
        question: i18n.t("chat.trialAskInclusionQ"),
      },
      {
        label: i18n.t("chat.trialAskParticipate"),
        question: i18n.t("chat.trialAskParticipateQ"),
      },
      {
        label: i18n.t("chat.trialAskContact"),
        question: i18n.t("chat.trialAskContactQ"),
      },
      {
        label: i18n.t("chat.trialAskLocations"),
        question: i18n.t("chat.trialAskLocationsQ"),
      },
    ],
    publication: [
      {
        label: i18n.t("chat.pubAskSummarize"),
        question: i18n.t("chat.pubAskSummarizeQ"),
      },
      {
        label: i18n.t("chat.pubAskMethods"),
        question: i18n.t("chat.pubAskMethodsQ"),
      },
      {
        label: i18n.t("chat.pubAskTakeaways"),
        question: i18n.t("chat.pubAskTakeawaysQ"),
      },
    ],
    expert: [
      {
        label: i18n.t("chat.expertAskTellMore"),
        question: i18n.t("chat.expertAskTellMoreQ"),
      },
      {
        label: i18n.t("chat.expertAskFocus"),
        question: i18n.t("chat.expertAskFocusQ"),
      },
    ],
  };
}

// Publication Card - compact; simplified title/summary for patients, full for researchers
const PublicationCard = React.memo(
  ({ publication, onAskAbout, onSaveToFavourites, userId, useSimplified }) => {
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
        className="relative rounded-xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md mb-3"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          borderColor: "rgba(47, 60, 150, 0.2)",
        }}
      >
        {userId && onSaveToFavourites && (
          <button
            type="button"
            onClick={() =>
              onSaveToFavourites("publication", {
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
            aria-label="Save publication"
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
            {publicationRoute ? (
              <Link
                to={publicationRoute}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:opacity-90"
                style={{
                  color: "#2F3C96",
                  backgroundColor: "rgba(208, 196, 226, 0.25)",
                  borderColor: "rgba(47, 60, 150, 0.25)",
                }}
              >
                View full Publication <ExternalLink className="w-3 h-3" />
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
                View full Publication <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}
            {onAskAbout && (
              <button
                type="button"
                onClick={() => onAskAbout(publication, "publication")}
                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                style={{ color: "#2F3C96" }}
              >
                <MessageSquare className="w-3 h-3" /> Ask about this
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

// Trial Card - compact; simplified title/summary for patients, full for researchers
const TrialCard = React.memo(
  ({ trial, onAskAbout, onSaveToFavourites, userId, useSimplified }) => {
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
        className="relative rounded-xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md mb-3"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          borderColor: "rgba(47, 60, 150, 0.2)",
        }}
      >
        {userId && onSaveToFavourites && (
          <button
            type="button"
            onClick={() =>
              onSaveToFavourites("trial", {
                id: trial.nctId || trial.id,
                nctId: trial.nctId || trial.id,
                title: trial.title,
                simplifiedTitle: trial.simplifiedTitle,
                url: trial.url,
              })
            }
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 transition-colors"
            style={{ color: "#2F3C96" }}
            aria-label="Save trial"
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
                View full Trial <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            {onAskAbout && (
              <button
                type="button"
                onClick={() => onAskAbout(trial, "trial")}
                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                style={{ color: "#2F3C96" }}
              >
                <MessageSquare className="w-3 h-3" /> Ask about this
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

// Expert Card - aligned with Chatbot.jsx (User icon in circle, View profile, Ask about this expert)
const ExpertCard = React.memo(({ expert, onAskAbout }) => {
  const profileUrl =
    expert.userId || expert.id || expert._id
      ? `/collabiora-expert/profile/${expert.userId || expert.id || expert._id}`
      : `/expert/profile?name=${encodeURIComponent(expert.name || "")}`;
  return (
    <div className="bg-white border border-[#D1D3E5] rounded-xl shadow-sm overflow-hidden mb-3 hover:shadow-md hover:border-[#A3A7CB] transition-all duration-200">
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
                Research Interests
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
                  publications
                </span>
              )}
              {expert.metrics.totalCitations > 0 && (
                <span className="flex items-center gap-1">
                  <Microscope className="w-3.5 h-3.5 text-[#2F3C96]" />
                  {expert.metrics.totalCitations.toLocaleString()} citations
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
            <User className="w-3.5 h-3.5" /> View profile
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
              <MessageSquare className="w-3.5 h-3.5" /> Ask about this expert
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// Custom components for styled markdown in assistant messages (publication analysis, etc.)
const markdownComponents = {
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold text-[#2F3C96] uppercase tracking-wide mt-4 mb-2 first:mt-0 border-b border-[#D1D3E5] pb-1.5">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-slate-800 mt-3 mb-1.5">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-slate-700 leading-relaxed my-2">{children}</p>
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
  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
  hr: () => (
    <hr
      className="my-5 border-0 border-t border-brand-purple-200/90 dark:border-brand-purple-400/40"
      role="separator"
    />
  ),
  a: ({ href, children }) => {
    const linkText = flattenMarkdownChildrenToString(children).trim();
    const isNumericCitation = /^\[\d+\]$/.test(linkText);
    if (
      href &&
      (isLikelyGroundingSourceUrl(href) ||
        looksLikeHostnameChip(linkText) ||
        isNumericCitation)
    ) {
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
    const isExpertProfile =
      href &&
      (/^\/expert\/profile/i.test(href) ||
        /^\/collabiora-expert\/profile/i.test(href));
    const isSpecialLink =
      isPubMed || isClinicalTrials || isExpertProfile || isInternal;
    const label = isPubMed
      ? "View on PubMed"
      : isClinicalTrials
        ? "View full trial on ClinicalTrials.gov"
        : isExpertProfile
          ? "View profile"
          : children || href;
    const linkClass = isSpecialLink
      ? "inline-flex items-center gap-2 mt-2 px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2] border border-[#D1D3E5] rounded-lg hover:bg-[#D1D3E5] transition-colors shrink-0"
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
        target={isSpecialLink ? undefined : "_blank"}
        rel={isSpecialLink ? undefined : "noopener noreferrer"}
        className={linkClass}
      >
        {label}
        <ExternalLink className="w-3 h-3 shrink-0" />
      </a>
    );
  },
};

const MessageBubble = React.memo(({ message, isUser }) => {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "text-white shadow-md"
            : "bg-white border border-[#D1D3E5] text-slate-700 shadow-sm"
        }`}
        style={
          isUser
            ? { background: "linear-gradient(135deg, #2F3C96, #474F97)" }
            : undefined
        }
      >
        {isUser ? (
          <p className="leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none [&>*:last-child]:mb-0">
            <ReactMarkdown components={markdownComponents}>
              {preprocessMarkdownWithGroundingCitations(
                message.content,
                message.groundingSources,
              )}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
});

// Formatted trial details card - shows only the section(s) the user asked for
const TrialDetailsCard = ({
  trialDetails,
  onAskMore,
  onSaveToFavourites,
  userId,
}) => {
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
    (title?.length > 80 ? title.slice(0, 77) + "..." : title) ||
    "Clinical Trial";
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
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] w-full">
        <div className="bg-white border border-[#D1D3E5] rounded-xl shadow-sm overflow-hidden">
          {/* Compact header - always show for context */}
          <div className="bg-gradient-to-br from-[#E8E9F2] to-[#D1D3E5] px-4 py-3 border-b border-[#D1D3E5]">
            <div className="flex items-start gap-2">
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

          <div className="p-4 space-y-4">
            {/* Conditions - for overview */}
            {show("overview") &&
              conditions &&
              conditions !== "Not specified" && (
                <section>
                  <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                    Conditions
                  </h5>
                  <p className="text-sm text-slate-700">{conditions}</p>
                </section>
              )}

            {/* Inclusion/Exclusion Criteria - only when asked */}
            {show("eligibility") && hasEligibility && (
              <section>
                <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                  Eligibility / Inclusion & Exclusion Criteria
                </h5>
                <div className="text-sm text-slate-700 space-y-2">
                  {eligibilityCriteria && (
                    <div className="bg-slate-50 rounded-lg p-3 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap border border-slate-100">
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
                            Age: {eligibility.minimumAge || "?"} -{" "}
                            {eligibility.maximumAge || "?"}
                          </span>
                        )}
                        {eligibility.gender && (
                          <span className="px-2 py-1 bg-[#E8E9F2] text-[#2F3C96] rounded text-xs">
                            Gender: {eligibility.gender}
                          </span>
                        )}
                        {eligibility.healthyVolunteers && (
                          <span className="px-2 py-1 bg-[#E8E9F2] text-[#2F3C96] rounded text-xs">
                            Healthy Volunteers: {eligibility.healthyVolunteers}
                          </span>
                        )}
                      </div>
                    )}
                </div>
              </section>
            )}

            {/* Contact Details - only when asked */}
            {show("contacts") && hasContacts && (
              <section>
                <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-2">
                  Contact Details
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
                              className="text-[#2F3C96] hover:text-[#474F97] font-medium hover:underline"
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
                              className="text-[#2F3C96] hover:text-[#474F97] font-medium hover:underline break-all"
                            >
                              {c.email}
                            </a>
                          </div>
                        )}
                        {c.url && (
                          <div className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-[#2F3C96] shrink-0" />
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#2F3C96] hover:text-[#474F97] font-medium hover:underline break-all"
                            >
                              {c.url}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Trial Locations - only when asked */}
            {show("locations") && hasLocations && (
              <section>
                <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-2">
                  Trial Locations
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
                        {(loc.contactPhone || loc.contactEmail) && (
                          <p className="text-xs text-slate-600 mt-1">
                            {loc.contactName && `${loc.contactName} · `}
                            {loc.contactPhone && (
                              <a
                                href={`tel:${loc.contactPhone}`}
                                className="text-[#2F3C96] hover:underline"
                              >
                                {loc.contactPhone}
                              </a>
                            )}
                            {loc.contactPhone && loc.contactEmail && " · "}
                            {loc.contactEmail && (
                              <a
                                href={`mailto:${loc.contactEmail}`}
                                className="text-[#2F3C96] hover:underline break-all"
                              >
                                {loc.contactEmail}
                              </a>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Summary - for overview (tell me more, etc) */}
            {show("overview") && summary && (
              <section>
                <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                  Summary
                </h5>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {summary}
                </p>
              </section>
            )}

            {/* Save to favourites + open full trial */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {userId && onSaveToFavourites && (
                <button
                  type="button"
                  onClick={() =>
                    onSaveToFavourites("trial", {
                      id: nctId,
                      nctId,
                      title: title || shortTitle,
                      url,
                    })
                  }
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2] border border-[#D1D3E5] rounded-lg hover:bg-[#D1D3E5] transition-colors"
                >
                  <Heart className="w-3.5 h-3.5" />
                  Save to favourites
                </button>
              )}
              {nctId && (
                <Link
                  to={`/trial/${encodeURIComponent(nctId)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2F3C96] hover:text-[#474F97] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  View full trial on collabiora
                </Link>
              )}
            </div>

            {/* Ask more about this trial - follow-up options */}
            {onAskMore && (
              <div className="pt-3 mt-3 border-t border-[#D1D3E5]">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Ask more about this trial
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {getAskAboutOptions().trial.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onAskMore(opt.question)}
                      className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2]/80 border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] shadow-sm transition-colors"
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
    </div>
  );
};

// Compact "Ask more about this trial" bar - shown below AI response (trial questions get AI answer, not raw card)
const TrialAskMoreBar = ({
  trialDetails,
  onAskMore,
  onSaveToFavourites,
  userId,
}) => {
  if (!trialDetails || !onAskMore) return null;
  const item = {
    id: trialDetails.nctId,
    nctId: trialDetails.nctId,
    title: trialDetails.title,
    url: trialDetails.url,
  };
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] w-full">
        <div className="bg-white border border-[#D1D3E5] rounded-xl px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Ask more about this trial
          </p>
          <div className="flex flex-wrap gap-1.5">
            {getAskAboutOptions().trial.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onAskMore(opt.question)}
                className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2]/80 border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] shadow-sm transition-colors"
              >
                {opt.label}
              </button>
            ))}
            {userId && onSaveToFavourites && (
              <button
                type="button"
                onClick={() => onSaveToFavourites("trial", item)}
                className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2]/80 border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] shadow-sm transition-colors"
              >
                <Heart className="w-3.5 h-3.5 inline mr-1" />
                Save to favourites
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Compact "Ask more about this publication" bar - shown below AI response for methods/takeaways
const PublicationAskMoreBar = ({
  publicationDetails,
  onAskMore,
  onSaveToFavourites,
  userId,
}) => {
  if (!publicationDetails || !onAskMore) return null;
  const item = {
    id: publicationDetails.pmid,
    pmid: publicationDetails.pmid,
    title: publicationDetails.title,
    authors: publicationDetails.authors,
    journal: publicationDetails.journal,
    year: publicationDetails.year,
    abstract: publicationDetails.abstract,
    url: publicationDetails.url,
  };
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] w-full">
        <div className="bg-white border border-[#D1D3E5] rounded-xl px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Ask more about this publication
          </p>
          <div className="flex flex-wrap gap-1.5">
            {getAskAboutOptions().publication.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onAskMore(opt.question)}
                className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2]/80 border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] shadow-sm transition-colors"
              >
                {opt.label}
              </button>
            ))}
            {userId && onSaveToFavourites && (
              <button
                type="button"
                onClick={() => onSaveToFavourites("publication", item)}
                className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2]/80 border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] shadow-sm transition-colors"
              >
                <Heart className="w-3.5 h-3.5 inline mr-1" />
                Save to favourites
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Formatted publication details card - shows title, authors, abstract, keywords in a clean layout
const PublicationDetailsCard = ({
  publicationDetails,
  onAskMore,
  onSaveToFavourites,
  userId,
}) => {
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

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] w-full">
        <div className="bg-white border border-[#D1D3E5] rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#E8E9F2] to-[#D1D3E5] px-4 py-3 border-b border-[#D1D3E5]">
            <div className="flex items-start gap-2">
              <BookOpen className="w-5 h-5 text-[#2F3C96] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm text-slate-800 leading-snug">
                  {title}
                </h4>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {pmid && (
                    <span className="px-2 py-0.5 bg-white/80 text-[#2F3C96] rounded text-xs font-mono border border-[#D1D3E5]">
                      PMID: {pmid}
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

          <div className="p-4 space-y-4">
            {/* Authors & Citation */}
            <section>
              <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                Authors
              </h5>
              <p className="text-sm text-slate-700">{authors}</p>
              <p className="text-xs text-slate-600 mt-1">
                {journal} ({year})
              </p>
            </section>

            {/* Abstract */}
            {abstract && (
              <section>
                <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                  Abstract
                </h5>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {abstract}
                </p>
              </section>
            )}

            {/* Keywords */}
            {keywords && (
              <section>
                <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                  Keywords
                </h5>
                <p className="text-sm text-slate-700">{keywords}</p>
              </section>
            )}

            {/* Link to PubMed */}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#2F3C96] hover:text-[#474F97] hover:underline"
              >
                View on PubMed <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Save to favourites */}
            {userId && onSaveToFavourites && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() =>
                    onSaveToFavourites("publication", {
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
                  <Heart className="w-3.5 h-3.5" />
                  Save to favourites
                </button>
              </div>
            )}

            {/* Ask more about this publication - follow-up options */}
            {onAskMore && (
              <div className="pt-3 mt-3 border-t border-[#D1D3E5]">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Ask more about this publication
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {getAskAboutOptions().publication.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onAskMore(opt.question)}
                      className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-[#E8E9F2]/80 border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] shadow-sm transition-colors"
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
    </div>
  );
};

// Component to render search results as separate cards
const SearchResultsCards = ({
  searchResults,
  onAskAbout,
  onSaveToFavourites,
  userId,
  userRole,
}) => {
  const { t } = useTranslation("common");
  const useSimplified = userRole === "patient";
  const resolvedResults = normalizeSearchResultsTrialLocations(
    searchResults,
    t,
  );
  if (
    !resolvedResults ||
    !resolvedResults.items ||
    resolvedResults.items.length === 0
  ) {
    return null;
  }

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

  const cardWrap = (child) => (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] w-full">{child}</div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-[#D1D3E5] bg-white/95 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[#D1D3E5] bg-[#E8E9F2]/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#D1D3E5]">
              <meta.Icon className="h-4 w-4 text-[#2F3C96]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2F3C96]">
                {meta.title}
              </p>
              <p className="text-xs text-slate-500">{meta.subtitle}</p>
            </div>
          </div>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-[#2F3C96] border border-[#D1D3E5]">
            {items.length} result{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="p-3 space-y-2">
          {type === "publications" &&
            items.map((pub, idx) =>
              cardWrap(
                <PublicationCard
                  key={idx}
                  publication={pub}
                  onAskAbout={onAskAbout}
                  onSaveToFavourites={onSaveToFavourites}
                  userId={userId}
                  useSimplified={useSimplified}
                />,
              ),
            )}
          {type === "trials" &&
            items.map((trial, idx) =>
              cardWrap(
                <TrialCard
                  key={idx}
                  trial={trial}
                  onAskAbout={onAskAbout}
                  onSaveToFavourites={onSaveToFavourites}
                  userId={userId}
                  useSimplified={useSimplified}
                />,
              ),
            )}
          {type === "experts" &&
            items.map((expert, idx) =>
              cardWrap(
                <ExpertCard
                  key={idx}
                  expert={expert}
                  onAskAbout={onAskAbout}
                />,
              ),
            )}
        </div>
      </div>
    </div>
  );
};

// Quick replies for "summarize for my doctor" and "collabiora features" (no API call)
const getCannedReply = (messageText) => {
  const t = (messageText || "").trim().toLowerCase();
  const summarizeForDoctor =
    /summar(?:y|ies|ize|izing)\s+(?:for\s+)?(?:my\s+)?doctor|how\s+can\s+i\s+summar(?:y|ize)|summar(?:y|ize)\s+for\s+(?:my\s+)?doctor/i.test(
      t,
    ) || /how\s+to\s+summar(?:y|ize)\s+for\s+doctor/i.test(t);
  const collabioraFeatures =
    /collabiora\s+features?|collaboration\s+features?|what\s+(?:can\s+)?(?:collabiora|you)\s+do|collabiora\s+capabilities/i.test(
      t,
    );

  if (summarizeForDoctor) {
    return (
      "You can **summarize for your doctor** using the **Favourites** page. " +
      "Save publications and trials you care about to Favourites, then from that page you can generate a summarized report to share with your doctor. " +
      "[Go to Favourites](/favourites) to get started."
    );
  }
  if (collabioraFeatures) {
    return (
      "Here’s what you can do with collabiora:\n\n" +
      "- **Search** publications, clinical trials, and experts\n" +
      "- **Save** items to your Favourites for quick access\n" +
      "- **Generate summarized reports** for your doctor from your saved favourites\n\n" +
      "To create a report for your doctor, save items to Favourites and use the summarize option there. [Go to Favourites](/favourites)"
    );
  }
  return null;
};

const loadSavedChat = () => {
  try {
    const raw = localStorage.getItem(IORA_CHAT_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.messages) && data.messages.length > 0) {
      return { messages: data.messages, isOpen: !!data.isOpen };
    }
  } catch (e) {
    console.warn("iora: could not load saved chat", e);
  }
  return null;
};

const saveChat = (messages, isOpen) => {
  try {
    localStorage.setItem(
      IORA_CHAT_STORAGE_KEY,
      JSON.stringify({ messages, isOpen, updatedAt: Date.now() }),
    );
  } catch (e) {
    console.warn("iora: could not save chat", e);
  }
};

const FloatingChatbot = () => {
  const { t, i18n } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();

  // `t` is stable across language changes; include i18n.language so memos refresh when locale switches.
  const localeKey = i18n.language;

  const DEFAULT_GREETING = useMemo(
    () => ({
      role: "assistant",
      content: t("yori.greetingDefault"),
      searchResults: null,
      yoriGreeting: "default",
    }),
    [t, localeKey],
  );

  const CONTEXT_GREETING = useMemo(
    () => ({
      role: "assistant",
      content: t("yori.greetingContext"),
      searchResults: null,
      yoriGreeting: "context",
    }),
    [t, localeKey],
  );

  const speechBubblePhrases = useMemo(
    () => [
      { primary: t("yori.speechHi"), secondary: null },
      { primary: t("yori.speechAskAnything"), secondary: null },
    ],
    [t, localeKey],
  );

  const generateContextQuestions = useCallback(
    (type) => {
      if (type === "trial") {
        return [
          t("yori.suggestionTrial1"),
          t("yori.suggestionTrial2"),
          t("yori.suggestionTrial3"),
          t("yori.suggestionTrial4"),
          t("yori.suggestionTrial5"),
        ];
      }
      if (type === "publication") {
        return [
          t("yori.suggestionPub1"),
          t("yori.suggestionPub2"),
          t("yori.suggestionPub3"),
          t("yori.suggestionPub4"),
          t("yori.suggestionPub5"),
        ];
      }
      return [];
    },
    [t, localeKey],
  );

  // Marketing landing `/` and guest Yori `/home` — same bottom offset on mobile when chatbot is shown
  const isLandingPage =
    location.pathname === "/" || location.pathname === "/home";
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSideCollapsed, setIsSideCollapsed] = useState(false);
  const [isClosedTeaserCollapsed, setIsClosedTeaserCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(YORI_MOBILE_TEASER_STORAGE_KEY) === "true";
    } catch (e) {
      console.warn("yori: could not load teaser state", e);
      return false;
    }
  });
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );
  const [messages, setMessages] = useState([DEFAULT_GREETING]);
  const [speechPhraseIndex, setSpeechPhraseIndex] = useState(0);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0]?.yoriGreeting === "default") {
        return [DEFAULT_GREETING];
      }
      if (prev.length === 1 && prev[0]?.yoriGreeting === "context") {
        return [CONTEXT_GREETING];
      }
      return prev;
    });
  }, [DEFAULT_GREETING, CONTEXT_GREETING]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [askAboutTarget, setAskAboutTarget] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sampleQuestionsOpen, setSampleQuestionsOpen] = useState(false);
  const [context, setContext] = useState(null); // { type: 'trial' | 'publication', item: {...} }
  const [isLoaderShowing, setIsLoaderShowing] = useState(false); // Hide chatbot when multi-step loader is showing
  const [chatTab, setChatTab] = useState("yori"); // 'yori' | 'meetings'
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [guestChatHydrated, setGuestChatHydrated] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Detect if we're on a trial or publication detail page
  const isTrialPage = location.pathname.startsWith("/trial/");
  const isPublicationPage = location.pathname.startsWith("/publication/");

  // Extract the current detail page ID (for tracking page switches)
  const currentTrialId = isTrialPage
    ? location.pathname.split("/trial/")[1]?.split("/")[0]
    : null;
  const currentPublicationId = isPublicationPage
    ? location.pathname.split("/publication/")[1]?.split("/")[0]
    : null;
  const currentDetailPageId = currentTrialId || currentPublicationId;

  // Track the last detail page ID we were on
  const lastDetailPageIdRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Cancel any pending scroll
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
      // Use requestAnimationFrame for better performance
      scrollTimeoutRef.current = requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  };

  // Rotate speech bubble phrases when chatbot is closed (only on non-context pages)
  useEffect(() => {
    if (isOpen || isTrialPage || isPublicationPage || context) return;
    const interval = setInterval(() => {
      setSpeechPhraseIndex((prev) => {
        const next = (prev + 1) % speechBubblePhrases.length;
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, isTrialPage, isPublicationPage, context]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const handleViewportChange = (event) => {
      setIsMobileView(event.matches);
      if (!event.matches) {
        setIsSideCollapsed(false);
      }
    };

    setIsMobileView(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () =>
        mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        YORI_MOBILE_TEASER_STORAGE_KEY,
        String(isClosedTeaserCollapsed),
      );
    } catch (e) {
      console.warn("yori: could not save teaser state", e);
    }
  }, [isClosedTeaserCollapsed]);

  // Listen for context events from detail pages
  useEffect(() => {
    const handleContextOpen = (event) => {
      const { type, item } = event.detail;
      if (type && item) {
        // Check if this is a different item than what we currently have
        const currentItemId =
          context?.item?.nctId || context?.item?.id || context?.item?.pmid;
        const newItemId = item.nctId || item.id || item.pmid;

        // If switching to a different item OR if we have conversation history, clear it
        if (
          (currentItemId && currentItemId !== newItemId) ||
          messages.length > 1
        ) {
          setMessages([CONTEXT_GREETING]);
          setInput("");
          setIsLoading(false);
          abortControllerRef.current?.abort();
        }

        setContext({ type, item });
        // Generate context-specific questions
        const contextQuestions = generateContextQuestions(type);
        setSuggestions(contextQuestions);
        // Ensure we have context greeting
        if (
          messages.length === 1 &&
          messages[0].yoriGreeting === "default"
        ) {
          setMessages([CONTEXT_GREETING]);
        }
      }
    };

    window.addEventListener("openChatbotWithContext", handleContextOpen);
    return () => {
      window.removeEventListener("openChatbotWithContext", handleContextOpen);
    };
  }, []);

  // Clear chat history when navigating to/from detail pages or switching between detail pages
  useEffect(() => {
    const wasOnDetailPage = lastDetailPageIdRef.current !== null;
    const isNowOnDetailPage = isTrialPage || isPublicationPage;
    const switchedDetailPages =
      wasOnDetailPage &&
      isNowOnDetailPage &&
      lastDetailPageIdRef.current !== currentDetailPageId;

    // If navigating away from detail pages OR switching between different detail pages
    if ((wasOnDetailPage && !isNowOnDetailPage) || switchedDetailPages) {
      // Signed-in: reset greeting; guest: restore persisted general chat (separate from IORA key)
      setMessages(
        user
          ? [DEFAULT_GREETING]
          : restoreGuestGeneralMessages([DEFAULT_GREETING]),
      );
      setContext(null);
      setSuggestions([]);
      setInput("");
      setIsLoading(false);
      abortControllerRef.current?.abort();
      // Clear saved chat for detail pages (signed-in only — never guest storage)
      if (wasOnDetailPage && user) {
        try {
          localStorage.removeItem(IORA_CHAT_STORAGE_KEY);
        } catch (e) {
          console.warn("Could not clear saved chat:", e);
        }
      }
    }

    // If entering a detail page (or switching to a different one)
    if (isNowOnDetailPage) {
      // Reset to context greeting - always start fresh when switching detail pages
      // Also reset if we just entered a detail page from a non-detail page
      if (switchedDetailPages || !wasOnDetailPage) {
        setMessages([CONTEXT_GREETING]);
        setContext(null); // Will be set by the context event from the page
        setInput("");
        setIsLoading(false);
        abortControllerRef.current?.abort();
        // Generate context questions
        const type = isTrialPage ? "trial" : "publication";
        const contextQuestions = generateContextQuestions(type);
        setSuggestions(contextQuestions);
      }
    }

    // Update the last detail page ID
    lastDetailPageIdRef.current = currentDetailPageId;
  }, [
    location.pathname,
    isTrialPage,
    isPublicationPage,
    currentDetailPageId,
    user,
  ]);

  // Restore last conversation and open state when user is available
  // BUT: Never restore when on detail pages - always start fresh
  useEffect(() => {
    if (!user) return;
    // Never restore chat history when on detail pages - always start fresh
    if (isTrialPage || isPublicationPage) {
      // Start with context greeting for detail pages
      setMessages([CONTEXT_GREETING]);
      setHydrated(true);
      return;
    }
    // Guest home-page thread → signed-in floating Yori (same browser)
    migrateGuestChatToIoraStorage();
    // Only restore saved chat when NOT on detail pages
    const saved = loadSavedChat();
    if (saved) {
      setMessages(saved.messages);
      setIsOpen(saved.isOpen);
    }
    setHydrated(true); // allow persisting from now on (whether we restored or not)
  }, [user, isTrialPage, isPublicationPage]);

  // Persist messages and open state (after hydration to avoid overwriting with defaults)
  // BUT: Don't persist when on detail pages - chat should be fresh for each detail page
  useEffect(() => {
    if (!hydrated || !user) return;
    // Don't save chat history when on detail pages - each detail page should have fresh chat
    if (isTrialPage || isPublicationPage) {
      return;
    }
    saveChat(messages, isOpen);
  }, [messages, isOpen, hydrated, user, isTrialPage, isPublicationPage]);

  // Guest-only persistence (separate localStorage key from signed-in IORA chat)
  useEffect(() => {
    if (user) {
      setGuestChatHydrated(true);
      return;
    }
    if (isTrialPage || isPublicationPage) {
      setGuestChatHydrated(true);
      return;
    }
    const loaded = loadGuestChatMessages();
    if (loaded !== null) {
      setMessages(loaded.length > 0 ? loaded : []);
    }
    setGuestChatHydrated(true);
  }, [user, isTrialPage, isPublicationPage]);

  useEffect(() => {
    if (user) return;
    if (!guestChatHydrated) return;
    if (isTrialPage || isPublicationPage) return;
    saveGuestChatMessages(messages);
  }, [messages, user, guestChatHydrated, isTrialPage, isPublicationPage]);

  useEffect(() => {
    if (user) return;
    const onGuestChatSync = () => {
      if (isTrialPage || isPublicationPage) return;
      const loaded = loadGuestChatMessages();
      if (loaded === null) return;
      setMessages((prev) => {
        try {
          if (JSON.stringify(prev) === JSON.stringify(loaded)) return prev;
        } catch {
          /* ignore */
        }
        return loaded;
      });
    };
    window.addEventListener("yoriGuestChatUpdated", onGuestChatSync);
    const onStorage = (e) => {
      if (e.key === YORI_GUEST_CHAT_STORAGE_KEY) onGuestChatSync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("yoriGuestChatUpdated", onGuestChatSync);
      window.removeEventListener("storage", onStorage);
    };
  }, [user, isTrialPage, isPublicationPage]);

  // Optimized scrolling - debounced and only when necessary
  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Debounce scroll to avoid excessive calls
      const timeoutId = setTimeout(() => scrollToBottom(), 150);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, isMinimized, messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Listen for multi-step loader events to hide/show chatbot
  useEffect(() => {
    const handleLoaderShow = () => setIsLoaderShowing(true);
    const handleLoaderHide = () => setIsLoaderShowing(false);

    window.addEventListener("multiStepLoaderShow", handleLoaderShow);
    window.addEventListener("multiStepLoaderHide", handleLoaderHide);

    return () => {
      window.removeEventListener("multiStepLoaderShow", handleLoaderShow);
      window.removeEventListener("multiStepLoaderHide", handleLoaderHide);
    };
  }, []);

  useEffect(() => {
    const checkUser = () => {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      // Only set user if email is verified (same check as Navbar)
      if (userData && !userData.emailVerified) {
        setUser(null);
        return;
      }
      setUser(userData);
    };
    const handleLogout = () => {
      localStorage.removeItem(IORA_CHAT_STORAGE_KEY);
      setSuggestions([]);
      checkUser();
      // Guest thread is restored from `collabiora_yori_guest_chat_v1` when user becomes null (see guest hydrate effect)
    };
    const handleStorageChange = (e) => {
      // Listen for user/token changes in localStorage (includes email verification)
      if (e.key === "user" || e.key === "token") {
        checkUser();
      }
    };
    checkUser();
    window.addEventListener("login", checkUser);
    window.addEventListener("logout", handleLogout);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("userUpdated", checkUser); // Same-tab user updates
    return () => {
      window.removeEventListener("login", checkUser);
      window.removeEventListener("logout", handleLogout);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userUpdated", checkUser);
    };
  }, []);

  // Fetch meeting requests for Yori second tab (patient: my requests; researcher: incoming requests)
  useEffect(() => {
    const uid = user?._id || user?.id;
    if (!uid || !user?.role) {
      setMeetingRequests([]);
      return;
    }
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const url =
      user.role === "patient"
        ? `${base}/api/meeting-requests/patient/${uid}`
        : `${base}/api/meeting-requests/${uid}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setMeetingRequests(data.requests || []))
      .catch(() => setMeetingRequests([]));
  }, [user?._id, user?.id, user?.role]);

  // Fetch personalized suggestions when chat is fresh (first load or after reset)
  // Skip if we have context or are on detail pages (context questions take priority)
  useEffect(() => {
    if (context || isTrialPage || isPublicationPage) return; // Don't fetch generic suggestions when we have context

    const fetchSuggestions = async () => {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userData =
        user || JSON.parse(localStorage.getItem("user") || "null");
      const role = userData?.role || "patient";
      let condition = userData?.medicalInterests?.[0] || null;
      if (!condition && userData?._id) {
        try {
          const res = await fetch(`${base}/api/profile/${userData._id}`);
          const data = await res.json();
          const profile = data?.profile;
          if (profile?.patient?.conditions?.length > 0) {
            condition = profile.patient.conditions[0];
          } else if (
            profile?.researcher &&
            (profile.researcher.specialties?.length > 0 ||
              profile.researcher.interests?.length > 0)
          ) {
            condition =
              profile.researcher.specialties?.[0] ||
              profile.researcher.interests?.[0];
          }
        } catch (_) {
          /* ignore */
        }
      }

      const params = new URLSearchParams({ role });
      if (condition) params.set("condition", condition);
      try {
        const res = await fetch(`${base}/api/chatbot/suggestions?${params}`);
        const data = await res.json();
        if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
      } catch (_) {
        setSuggestions([]);
      }
    };
    if (hydrated && messages.length === 1) {
      fetchSuggestions();
    } else if (messages.length > 1) {
      setSuggestions([]);
    }
  }, [
    user,
    hydrated,
    messages.length,
    context,
    isTrialPage,
    isPublicationPage,
  ]);

  // Close sample questions when suggestions are cleared (e.g. after sending a message)
  useEffect(() => {
    if (suggestions.length === 0) setSampleQuestionsOpen(false);
  }, [suggestions.length]);

  const handleSendMessage = async (
    messageText = input,
    messageContext = null,
  ) => {
    if (!messageText.trim() || isLoading) return;

    if (!user) {
      if (getGuestTrialCount() >= MAX_GUEST_TRIALS) {
        toast.error(t("yori.guestTrialLimit"));
        navigate("/signin");
        return;
      }
    }

    // Use component context if available, otherwise use message context
    // If on detail page but no context set yet, create minimal context (will be enriched by backend)
    // IMPORTANT: Only use context if it matches the current page ID (prevent cross-page context)
    let activeContext = null;
    if (context && context.item) {
      const contextItemId =
        context.item.nctId || context.item.id || context.item.pmid;
      const matchesCurrentPage =
        (isTrialPage && contextItemId === currentTrialId) ||
        (isPublicationPage && contextItemId === currentPublicationId);
      if (matchesCurrentPage) {
        activeContext = context;
      } else {
        // Context doesn't match current page - clear it
        setContext(null);
      }
    } else if (messageContext) {
      activeContext = messageContext;
    } else if (isTrialPage || isPublicationPage) {
      // On detail page but no context yet - backend will fetch it
      activeContext = { type: isTrialPage ? "trial" : "publication", item: {} };
    }

    const userMessage = {
      role: "user",
      content: messageText.trim(),
      ...(activeContext && { context: activeContext }),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    const cannedReply = getCannedReply(messageText.trim());
    if (cannedReply) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: cannedReply,
          searchResults: null,
          groundingSources: null,
        },
      ]);
      if (!user) incrementGuestTrialAfterMessage();
      return;
    }
    setIsLoading(true);

    const assistantMessageIndex = newMessages.length;
    setMessages([
      ...newMessages,
      {
        role: "assistant",
        content: "",
        searchResults: null,
        groundingSources: null,
      },
    ]);

    // Normalize messages for API: ensure content is always non-empty (backend rejects null/undefined)
    // When on detail pages, limit conversation history to only messages from this page
    // Filter out old messages that don't have matching context
    let messagesToSend = newMessages;
    if (activeContext && (isTrialPage || isPublicationPage)) {
      // Only keep messages that are either:
      // 1. The initial greeting (assistant)
      // 2. Messages with matching context (same item ID)
      const contextItemId =
        activeContext.item?.nctId ||
        activeContext.item?.id ||
        activeContext.item?.pmid ||
        currentDetailPageId;
      messagesToSend = newMessages.filter((msg, index) => {
        if (index === 0) return true; // Keep first greeting
        if (msg.role === "assistant") return true; // Keep all assistant messages (responses)
        // For user messages, only keep if they have matching context
        if (msg.context) {
          const msgItemId =
            msg.context.item?.nctId ||
            msg.context.item?.id ||
            msg.context.item?.pmid;
          return msgItemId === contextItemId;
        }
        // If no context in message but we're on detail page, include it (will add context)
        return true;
      });
    }

    // Normalize and add context to messages
    messagesToSend = messagesToSend.map((m, index) => ({
      ...m,
      content: m.content != null && m.content !== "" ? m.content : " ",
      // Add context to user messages when on detail pages
      ...(m.role === "user" &&
        activeContext &&
        (isTrialPage || isPublicationPage) &&
        !m.context && { context: activeContext }),
    }));

    try {
      abortControllerRef.current = new AbortController();

      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const requestBody = {
        locale: getApiLocale(),
        messages: messagesToSend,
        ...(activeContext && { context: activeContext }),
      };
      const response = await fetch(`${apiBase}/api/chatbot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errMsg = "Failed to get response";
        try {
          const errBody = await response.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch (_) {
          /* ignore */
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.trialDetails) {
                trialDetails = data.trialDetails;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    role: "assistant",
                    content: assistantContent,
                    searchResults,
                    trialDetails,
                    publicationDetails,
                    groundingSources,
                  };
                  return updated;
                });
              }

              if (data.publicationDetails) {
                publicationDetails = data.publicationDetails;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    role: "assistant",
                    content: assistantContent,
                    searchResults,
                    trialDetails,
                    publicationDetails,
                    groundingSources,
                  };
                  return updated;
                });
              }

              if (data.text) {
                assistantContent += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    role: "assistant",
                    content: assistantContent,
                    searchResults,
                    trialDetails,
                    publicationDetails,
                    groundingSources,
                  };
                  return updated;
                });
              }

              if (data.groundingSources) {
                groundingSources = data.groundingSources;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    role: "assistant",
                    content: assistantContent,
                    searchResults,
                    trialDetails,
                    publicationDetails,
                    groundingSources,
                  };
                  return updated;
                });
              }

              if (data.searchResults) {
                searchResults = data.searchResults;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    role: "assistant",
                    content: assistantContent,
                    searchResults,
                    trialDetails,
                    publicationDetails,
                    groundingSources,
                  };
                  return updated;
                });
              }

              if (data.done) {
                break;
              }
            } catch (e) {
              console.warn("Invalid JSON in stream:", e);
            }
          }
        }
      }
      if (!user) incrementGuestTrialAfterMessage();
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Request aborted");
        return;
      }

      console.error("Error sending message:", error);
      const displayMsg =
        error.message ||
        "I apologize, but I encountered an error. Please try again.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantMessageIndex] = {
          role: "assistant",
          content: displayMsg,
          searchResults: null,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleOpenAskMenu = (item, type) => {
    let itemType = type;
    if (itemType === undefined || itemType === "") {
      if (item?.title) itemType = item.pmid ? "publication" : "trial";
      else if (item?.name) itemType = "expert";
    }
    setAskAboutTarget({ item, type: itemType || "" });
  };

  const handleSelectAskOption = (question, item, type) => {
    handleSendMessage(question, { type, item });
    setAskAboutTarget(null);
  };

  const handleSaveToFavourites = async (type, item) => {
    const userId = user?._id || user?.id;
    if (!userId) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please sign in to save to favourites.",
          isFavouriteSuccess: false,
        },
      ]);
      return;
    }
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    try {
      const res = await fetch(`${base}/api/favorites/${userId}`, {
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
      const label = type === "trial" ? "trial" : "publication";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✓ Saved this ${label} to your favourites!`,
          isFavouriteSuccess: true,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err.message || "Failed to save to favourites. Please try again.",
          isFavouriteSuccess: false,
        },
      ]);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setIsSideCollapsed(false);
    if (isMobileView) {
      setIsClosedTeaserCollapsed(true);
    }
  };

  const handleMinimize = () => {
    if (isMobileView) {
      setIsMinimized(false);
      setIsSideCollapsed(true);
      return;
    }
    setIsMinimized(!isMinimized);
  };

  const handleOpen = () => {
    if (!user) {
      navigate("/");
      return;
    }
    setIsMinimized(false);
    setIsSideCollapsed(false);
    setIsOpen(true);
  };

  // Don't render only when multi-step loader is showing (show bot for everyone, including guests)
  if (isLoaderShowing) {
    return null;
  }

  const isGuest = !user;
  const isGuestBrowsePage =
    location.pathname === "/explore" ||
    location.pathname === "/library" ||
    location.pathname === "/experts" ||
    location.pathname === "/trials";
  const isLowerOnPublicPages = isLandingPage || (isGuest && isGuestBrowsePage);
  const mobileBottomOffsetClass = isLowerOnPublicPages
    ? "bottom-[max(1rem,env(safe-area-inset-bottom,0px))]"
    : "bottom-[calc(6rem+env(safe-area-inset-bottom,0px))]";
  const desktopBottomOffsetClass =
    "sm:bottom-[max(1rem,env(safe-area-inset-bottom,0px))]";
  const closedBotPositionClass = `${mobileBottomOffsetClass} ${desktopBottomOffsetClass}`;
  const openChatPositionClass = `${mobileBottomOffsetClass} ${desktopBottomOffsetClass}`;
  const showMobileCollapsedDock = isOpen && isMobileView && isSideCollapsed;
  const showClosedMobileCollapsedDock =
    !isOpen && isMobileView && isClosedTeaserCollapsed;

  return (
    <>
      {/* Floating Chat Button - constrained on mobile so it doesn't go off screen */}
      {!isOpen && !showClosedMobileCollapsedDock && (
        <div
          className={`fixed right-4 left-auto w-fit max-w-[calc(100vw-2rem)] sm:right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none [&>*]:pointer-events-auto drop-shadow-[0_10px_28px_rgba(47,60,150,0.22)] ${closedBotPositionClass}`}
        >
          {/* Speech Bubble - rotates between "Hi, I'm Yori" and "Ask me anything" */}
          {(() => {
            return (
              <div className="relative mr-2 w-max max-w-[min(13.5rem,calc(100vw-6rem))] bg-[#E8D5FF] border border-[#2F3C96] rounded-lg px-2 py-1 sm:px-2.5 sm:py-1 shadow-md flex items-center justify-center pointer-events-auto shrink-0">
                <p className="text-[9px] sm:text-[11px] font-semibold text-[#2F3C96] leading-snug text-center">
                  {isTrialPage || isPublicationPage || context ? (
                    <span className="block max-w-[min(13.5rem,calc(100vw-6rem))]">
                      {t("yori.speechContextHelp")}
                    </span>
                  ) : (
                    <span className="inline-block whitespace-nowrap">
                      {speechBubblePhrases[speechPhraseIndex].secondary ? (
                        <>
                          {speechBubblePhrases[speechPhraseIndex].primary}
                          <br />
                          {speechBubblePhrases[speechPhraseIndex].secondary}
                        </>
                      ) : (
                        speechBubblePhrases[speechPhraseIndex].primary
                      )}
                    </span>
                  )}
                </p>
                {/* Speech bubble tail */}
                <div className="absolute bottom-[-6px] right-10 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#2F3C96]"></div>
                <div className="absolute bottom-[-5px] right-10 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-[#E8D5FF]"></div>
              </div>
            );
          })()}
          <button
            onClick={handleOpen}
            className="flex items-center justify-center group bg-cover bg-center rounded-lg overflow-hidden"
            style={{
              backgroundImage: "url(/bot.webp)",
              width: "80px",
              height: "90px",

              transformOrigin: "bottom right",
            }}
            aria-label={t("yori.ariaOpenChat")}
            data-tour="yori-chatbot"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-[opacity,transform] duration-300 rounded-lg" />
          </button>
        </div>
      )}

      {showClosedMobileCollapsedDock && (
        <div
          className={`fixed right-0 left-auto z-[100] ${closedBotPositionClass}`}
        >
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center translate-x-2"
            aria-label={t("yori.ariaOpenChat")}
          >
            <span className="flex h-14 w-14 items-center justify-center overflow-visible drop-shadow-[0_8px_14px_rgba(47,60,150,0.35)]">
              <img
                src="/Yorisidepeak.webp"
                alt={t("yori.name")}
                className="h-full w-full object-contain"
              />
            </span>
          </button>
        </div>
      )}

      {showMobileCollapsedDock && (
        <div
          className={`fixed right-0 left-auto z-[100] ${openChatPositionClass}`}
        >
          <button
            type="button"
            onClick={() => setIsSideCollapsed(false)}
            className="flex items-center translate-x-2"
            aria-label={t("yori.ariaExpandChat")}
          >
            <span className="flex h-14 w-14 items-center justify-center overflow-visible drop-shadow-[0_8px_14px_rgba(47,60,150,0.35)]">
              <img
                src="/Yorisidepeak.webp"
                alt={t("yori.name")}
                className="h-full w-full object-contain"
              />
            </span>
          </button>
        </div>
      )}

      {/* Chat Window - reduced on mobile so it clears the bottom navigation */}
      {isOpen && !showMobileCollapsedDock && (
        <div
          className={`fixed left-4 right-4 sm:left-auto sm:right-6 bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-[100] flex flex-col overflow-visible ${openChatPositionClass} ${
            isMinimized
              ? "w-[calc(100vw-2rem)] sm:w-80 h-16"
              : "w-[calc(100vw-2rem)] sm:w-96 h-[min(460px,calc(100vh-8.5rem))] sm:h-[min(600px,calc(100vh-2rem))]"
          }`}
          style={{
            maxWidth: "calc(100vw - 2rem)",
            boxShadow:
              "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
          }}
        >
          {/* Header - site theme (royal blue) */}
          <div
            className="relative overflow-visible text-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-t-2xl flex items-center justify-between border-b border-white/20"
            style={{ background: "linear-gradient(135deg, #2F3C96, #474F97)" }}
          >
            <div className="relative flex items-center gap-3 pl-14 sm:pl-16">
              <div className="absolute -left-2 -top-0 w-14 h-14 sm:w-16 sm:h-16 pointer-events-none drop-shadow-[0_8px_14px_rgba(47,60,150,0.45)]">
                <img
                  src="/Yori's Face Outline.webp"
                  alt={t("yori.name")}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="font-bold text-sm">{t("yori.name")}</h3>
                <p className="text-[11px] sm:text-xs text-white/80">
                  {t("yori.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const shouldUseContextGreeting =
                    isTrialPage || isPublicationPage || context;
                  setMessages([
                    shouldUseContextGreeting
                      ? CONTEXT_GREETING
                      : DEFAULT_GREETING,
                  ]);
                  setAskAboutTarget(null);
                  if (!isTrialPage && !isPublicationPage) {
                    setContext(null);
                  }
                  setSuggestions([]);
                  abortControllerRef.current?.abort();
                }}
                className="w-8 h-8 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                aria-label={t("yori.clearChat")}
                title={t("yori.clearChat")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleMinimize}
                className="w-8 h-8 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                aria-label={
                  isMobileView
                    ? t("yori.ariaCollapseDock")
                    : t("yori.ariaMinimizeWindow")
                }
              >
                {isMobileView ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleClose}
                className="w-8 h-8 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                aria-label={t("yori.ariaCloseChatWindow")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab bar: Yori | Researcher updates / Meeting requests (only when user has meeting requests) */}
          {!isMinimized && !isGuest && meetingRequests.length > 0 && (
            <div className="flex border-b border-[#D1D3E5] bg-[#E8E9F2]/50">
              <button
                type="button"
                onClick={() => setChatTab("yori")}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                  chatTab === "yori"
                    ? "text-[#2F3C96] bg-white border-b-2 border-[#2F3C96]"
                    : "text-slate-600 hover:text-[#2F3C96]"
                }`}
              >
                {t("yori.name")}
              </button>
              <button
                type="button"
                onClick={() => setChatTab("meetings")}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                  chatTab === "meetings"
                    ? "text-[#2F3C96] bg-white border-b-2 border-[#2F3C96]"
                    : "text-slate-600 hover:text-[#2F3C96]"
                }`}
              >
                {user?.role === "patient" ? (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    {t("yori.tabResearcherUpdates")}
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    {t("yori.tabMeetingRequests")}
                  </>
                )}
              </button>
            </div>
          )}

          {!isMinimized &&
            (isGuest ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#E8E9F2]/50 via-white to-slate-50/80 rounded-b-2xl">
                <p className="text-slate-800 font-semibold mb-1">
                  {t("yori.guestPanelTitle")}
                </p>
                <p className="text-sm text-slate-600 mb-5 max-w-[260px]">
                  {t("yori.guestPanelBody")}
                </p>
                <Link
                  to="/signin"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white transition-all hover:opacity-90 shadow-md"
                  style={{
                    background: "linear-gradient(135deg, #2F3C96, #474F97)",
                  }}
                >
                  <User className="w-4 h-4" />
                  {t("yori.signIn")}
                </Link>
              </div>
            ) : (
              <>
                {chatTab === "meetings" ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-[#E8E9F2]/50 via-white to-slate-50/80">
                      <p className="text-sm text-slate-700 mb-3">
                        {user?.role === "patient"
                          ? t("yori.meetingsIntroPatient")
                          : t("yori.meetingsIntroResearcher")}
                      </p>
                      <div className="space-y-3">
                        {meetingRequests.map((req) => {
                          const other =
                            user?.role === "patient"
                              ? req.expertId
                              : req.patientId;
                          // When viewer is patient, "other" is the researcher — pass role so getDisplayName shows "Dr. Name"
                          const otherForDisplay =
                            user?.role === "patient" && other
                              ? { ...other, role: "researcher" }
                              : other;
                          const name = getDisplayName(
                            otherForDisplay,
                            user?.role === "patient" ? "Researcher" : "Patient",
                          );
                          const profileUrl =
                            user?.role === "patient" && other?._id
                              ? `/collabiora-expert/profile/${other._id}`
                              : null;
                          const statusLabel =
                            req.status === "pending"
                              ? t("yori.meetingStatusPending")
                              : req.status === "accepted"
                                ? t("yori.meetingStatusAccepted")
                                : req.status === "rejected"
                                  ? t("yori.meetingStatusRejected")
                                  : req.status || "";
                          return (
                            <div
                              key={req._id}
                              className="bg-white border border-[#D1D3E5] rounded-xl p-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="font-semibold text-sm text-slate-800 truncate">
                                  {user?.role === "patient"
                                    ? t("yori.meetingRequestToPrefix")
                                    : ""}
                                  {name}
                                </span>
                                <span
                                  className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    req.status === "pending"
                                      ? "bg-amber-100 text-amber-800"
                                      : req.status === "accepted"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {statusLabel}
                                </span>
                              </div>
                              {req.message && (
                                <p className="text-xs text-slate-600 mb-1">
                                  <span className="font-medium text-slate-500">
                                    {user?.role === "patient"
                                      ? "Your message: "
                                      : "Their message: "}
                                  </span>
                                  <span className="text-slate-700">
                                    &ldquo;{req.message}&rdquo;
                                  </span>
                                </p>
                              )}
                              {req.patientQuestions &&
                                user?.role === "researcher" && (
                                  <p className="text-xs text-amber-800 italic mb-1 mt-1">
                                    <span className="font-medium">
                                      Their questions:{" "}
                                    </span>
                                    {req.patientQuestions}
                                  </p>
                                )}
                              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                                {profileUrl && (
                                  <Link
                                    to={profileUrl}
                                    className="text-xs font-medium text-[#2F3C96] hover:underline"
                                  >
                                    View{" "}
                                    {user?.role === "patient"
                                      ? "their profile"
                                      : "profile"}
                                  </Link>
                                )}
                                <button
                                  type="button"
                                  onClick={() => navigate("/notifications")}
                                  className="text-xs font-medium text-[#2F3C96] hover:underline"
                                >
                                  See details in Activity
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gradient-to-br from-[#E8E9F2]/50 via-white to-slate-50/80">
                      {messages.map((message, index) => (
                        <React.Fragment key={index}>
                          {/* Skip assistant text when: empty placeholder OR full publication card (trials now show AI + compact bar) */}
                          {!(
                            message.role === "assistant" &&
                            (!message.content ||
                              (message.publicationDetails &&
                                message.publicationDetails.showFullCard !==
                                  false))
                          ) && (
                            <MessageBubble
                              message={message}
                              isUser={message.role === "user"}
                            />
                          )}
                          {/* Sample questions - collapsible "Show sample questions" dropdown */}
                          {/* Show when first message (greeting) and chat is fresh */}
                          {index === 0 &&
                            message.role === "assistant" &&
                            suggestions.length > 0 && (
                              <div className="mt-2 mb-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSampleQuestionsOpen((prev) => !prev)
                                  }
                                  className="flex items-center gap-1.5 text-sm font-medium text-[#2F3C96] hover:text-[#1e266d] transition-colors"
                                >
                                  {sampleQuestionsOpen ? (
                                    <ChevronUp className="h-4 w-4 shrink-0" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 shrink-0" />
                                  )}
                                  {sampleQuestionsOpen
                                    ? "Hide sample questions"
                                    : "Show sample questions"}
                                </button>
                                {sampleQuestionsOpen && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {suggestions.map((s, i) => (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                          const activeContext =
                                            context ||
                                            (isTrialPage || isPublicationPage
                                              ? {
                                                  type: isTrialPage
                                                    ? "trial"
                                                    : "publication",
                                                }
                                              : null);
                                          if (activeContext) {
                                            handleSendMessage(s, activeContext);
                                          } else {
                                            handleSendMessage(s);
                                          }
                                        }}
                                        disabled={isLoading}
                                        className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-white border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] shadow-sm transition-colors disabled:opacity-50"
                                      >
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          {/* Trial details card - only when showCard is true (legacy); otherwise use AI + TrialAskMoreBar */}
                          {message.role === "assistant" &&
                            message.trialDetails &&
                            message.trialDetails.showCard !== false && (
                              <TrialDetailsCard
                                trialDetails={message.trialDetails}
                                onAskMore={(question) => {
                                  const td = message.trialDetails;
                                  const item = {
                                    nctId: td.nctId,
                                    id: td.nctId,
                                    title: td.title,
                                    url: td.url,
                                  };
                                  handleSendMessage(question, {
                                    type: "trial",
                                    item,
                                  });
                                }}
                                onSaveToFavourites={handleSaveToFavourites}
                                userId={user?._id || user?.id}
                              />
                            )}
                          {/* Compact Ask more bar for trials (shown below AI response, only after response is complete) */}
                          {message.role === "assistant" &&
                            message.trialDetails &&
                            message.trialDetails.showCard === false &&
                            (!isLoading || index < messages.length - 1) && (
                              <TrialAskMoreBar
                                trialDetails={message.trialDetails}
                                onAskMore={(question) => {
                                  const td = message.trialDetails;
                                  const item = {
                                    nctId: td.nctId,
                                    id: td.nctId,
                                    title: td.title,
                                    url: td.url,
                                  };
                                  handleSendMessage(question, {
                                    type: "trial",
                                    item,
                                  });
                                }}
                                onSaveToFavourites={handleSaveToFavourites}
                                userId={user?._id || user?.id}
                              />
                            )}
                          {/* Formatted publication details (full card for summarize) */}
                          {message.role === "assistant" &&
                            message.publicationDetails &&
                            message.publicationDetails.showFullCard !==
                              false && (
                              <PublicationDetailsCard
                                publicationDetails={message.publicationDetails}
                                onAskMore={(question) => {
                                  const pd = message.publicationDetails;
                                  const item = {
                                    pmid: pd.pmid,
                                    id: pd.pmid,
                                    title: pd.title,
                                    authors: pd.authors,
                                    journal: pd.journal,
                                    year: pd.year,
                                    abstract: pd.abstract,
                                    fullAbstract: pd.abstract,
                                    url: pd.url,
                                  };
                                  handleSendMessage(question, {
                                    type: "publication",
                                    item,
                                  });
                                }}
                                onSaveToFavourites={handleSaveToFavourites}
                                userId={user?._id || user?.id}
                              />
                            )}
                          {/* Compact Ask more bar (for methods/takeaways - shown below AI response, only after response is complete) */}
                          {message.role === "assistant" &&
                            message.publicationDetails &&
                            message.publicationDetails.showFullCard === false &&
                            (!isLoading || index < messages.length - 1) && (
                              <PublicationAskMoreBar
                                publicationDetails={message.publicationDetails}
                                onAskMore={(question) => {
                                  const pd = message.publicationDetails;
                                  const item = {
                                    pmid: pd.pmid,
                                    id: pd.pmid,
                                    title: pd.title,
                                    authors: pd.authors,
                                    journal: pd.journal,
                                    year: pd.year,
                                    abstract: pd.abstract,
                                    fullAbstract: pd.abstract,
                                    url: pd.url,
                                  };
                                  handleSendMessage(question, {
                                    type: "publication",
                                    item,
                                  });
                                }}
                                onSaveToFavourites={handleSaveToFavourites}
                                userId={user?._id || user?.id}
                              />
                            )}
                          {/* Render search results as separate cards after the message */}
                          {message.role === "assistant" &&
                            message.searchResults && (
                              <SearchResultsCards
                                searchResults={message.searchResults}
                                onAskAbout={handleOpenAskMenu}
                                onSaveToFavourites={handleSaveToFavourites}
                                userId={user?._id || user?.id}
                                userRole={user?.role}
                              />
                            )}
                        </React.Fragment>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start mb-3">
                          <div className="bg-white border border-[#D1D3E5] rounded-2xl px-4 py-2.5 shadow-sm">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 text-[#2F3C96] animate-spin" />
                              <span className="text-sm text-slate-600">
                                Thinking...
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Ask about options panel - appears above the input when user clicks "Ask about this" */}
                    {askAboutTarget && (
                      <div className="px-4 pt-2 pb-2 border-t border-[#D1D3E5] bg-[#E8E9F2]/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-700">
                            Ask about this{" "}
                            {askAboutTarget.type === "trial"
                              ? "trial"
                              : askAboutTarget.type === "publication"
                                ? "publication"
                                : "expert"}
                            :
                          </span>
                          <button
                            type="button"
                            onClick={() => setAskAboutTarget(null)}
                            className="text-slate-500 hover:text-slate-700 p-0.5 rounded"
                            aria-label="Close options"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(getAskAboutOptions()[askAboutTarget.type] || []).map(
                            (opt, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() =>
                                  handleSelectAskOption(
                                    opt.question,
                                    askAboutTarget.item,
                                    askAboutTarget.type,
                                  )
                                }
                                className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-white border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] shadow-sm transition-colors"
                              >
                                {opt.label}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* Input Area - site theme */}
                    <div className="p-3 sm:p-4 border-t border-[#D1D3E5] bg-white rounded-b-2xl">
                      <div className="flex gap-2 items-end">
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={t("yori.placeholderInput")}
                          className="flex-1 resize-none rounded-xl border border-[#D1D3E5] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96] focus:border-transparent transition-[colors,shadow] max-h-24"
                          rows={1}
                          disabled={isLoading}
                        />
                        <button
                          onClick={() => handleSendMessage()}
                          disabled={!input.trim() || isLoading}
                          className="text-white rounded-xl p-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-[transform,shadow] duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
                          style={{
                            background:
                              "linear-gradient(135deg, #2F3C96, #474F97)",
                          }}
                          aria-label={t("yori.ariaSendMessage")}
                        >
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <div className="mt-2 flex justify-center px-1">
                        <button
                          type="button"
                          onClick={() => setDisclaimerOpen(true)}
                          className="text-[10px] sm:text-[11px] font-medium text-[#2F3C96] underline underline-offset-2 decoration-[#2F3C96]/60"
                        >
                          {t("yori.viewDisclaimer")}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ))}
        </div>
      )}

      {disclaimerOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/50"
          onClick={() => setDisclaimerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="yori-floating-disclaimer-title"
        >
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border-2 border-t bg-white p-5 shadow-2xl max-h-[min(85vh,520px)] overflow-y-auto sm:max-h-[85vh]"
            style={{ borderColor: "#D0C4E2" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2
                id="yori-floating-disclaimer-title"
                className="text-base font-bold text-[#2F3C96] pr-2"
              >
                {t("yori.disclaimerTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setDisclaimerOpen(false)}
                className="shrink-0 rounded-lg p-1.5 text-[#2F3C96] hover:bg-[#F5F2F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3C96] focus-visible:ring-offset-2"
                aria-label="Close disclaimer"
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
    </>
  );
};

export default FloatingChatbot;
