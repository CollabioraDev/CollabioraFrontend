import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const YORI_STORAGE_KEY = "collabiora_yori_chat_sessions_v1";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CHAT_SESSIONS = 5;

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
  messages: [],
});

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
  return {
    id: session?.id || createChatId(),
    title: session?.title || deriveChatTitle(messages),
    createdAt,
    updatedAt,
    messages,
  };
};

const loadSavedChatSessions = () => {
  try {
    const saved = localStorage.getItem(YORI_STORAGE_KEY);
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

const formatRelativeTime = (timestamp) => {
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return "Just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
  if (diff < 24 * 60 * 60 * 1000)
    return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
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

const ASK_ABOUT_OPTIONS = {
  trial: [
    {
      label: "Tell me more",
      question:
        "Tell me more about this trial. Summarize the key details and what it's testing.",
    },
    {
      label: "Inclusion criteria",
      question:
        "What are the inclusion and exclusion criteria for this trial? Explain who can participate.",
    },
    {
      label: "How to participate",
      question:
        "How can I participate in this trial? What are the steps and who do I contact?",
    },
    {
      label: "Contact details",
      question:
        "What are the contact details for this trial? Give me phone numbers, emails, or links to sign up.",
    },
    {
      label: "Trial locations",
      question:
        "Where is this trial being conducted? List the locations and sites.",
    },
  ],
  publication: [
    {
      label: "Summarize",
      question:
        "Summarize this publication. What are the main findings and conclusions?",
    },
    {
      label: "Methods used",
      question: "What methodology and methods were used in this study?",
    },
    {
      label: "Key takeaways",
      question: "What are the key takeaways and implications of this research?",
    },
  ],
  expert: [
    {
      label: "Tell me more",
      question:
        "Tell me more about this researcher. What are their main contributions and expertise?",
    },
    {
      label: "Research focus",
      question: "What is this expert's research focus and recent work?",
    },
  ],
};

const markdownComponents = {
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
  a: ({ href, children }) => {
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
        ? "View on ClinicalTrials.gov"
        : isExpertProfile
          ? "View profile"
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
};

// --- Card Components (full-page variants) ---

const PublicationCard = React.memo(
  ({ publication, onAskAbout, onSave, userId }) => (
    <div className="bg-white border border-[#D1D3E5] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#A3A7CB] transition-all duration-200">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-[#E8E9F2] rounded-lg flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-[#2F3C96]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-slate-800 line-clamp-2 mb-1">
            {publication.title}
          </h4>
          <p className="text-xs text-slate-600">
            <span className="font-medium text-slate-700">
              {publication.authors}
            </span>
          </p>
          <p className="text-xs text-slate-500">
            {publication.journal} ({publication.year})
          </p>
        </div>
      </div>
      {publication.abstract && (
        <p className="text-sm text-slate-600 mb-3 line-clamp-4 leading-relaxed">
          {publication.abstract}
        </p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href={publication.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2F3C96] hover:text-[#474F97] bg-[#E8E9F2] px-3 py-1.5 rounded-lg border border-[#D1D3E5] hover:bg-[#D1D3E5] transition-colors"
        >
          View on PubMed <ExternalLink className="w-3 h-3" />
        </a>
        {onAskAbout && (
          <button
            onClick={() => onAskAbout(publication, "publication")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2F3C96] hover:text-[#474F97] hover:underline"
          >
            <MessageSquare className="w-3 h-3" /> Ask about this
          </button>
        )}
        {userId && onSave && (
          <button
            onClick={() =>
              onSave("publication", {
                id: publication.pmid,
                pmid: publication.pmid,
                title: publication.title,
                authors: publication.authors,
                journal: publication.journal,
                year: publication.year,
                abstract: publication.abstract,
                url: publication.url,
              })
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2F3C96] hover:text-[#474F97] hover:underline"
          >
            <Heart className="w-3 h-3" /> Save
          </button>
        )}
      </div>
    </div>
  ),
);

const TrialCard = React.memo(({ trial, onAskAbout, onSave, userId }) => (
  <div className="bg-white border border-[#D1D3E5] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#A3A7CB] transition-all duration-200">
    <div className="flex items-start gap-3 mb-3">
      <div className="w-10 h-10 bg-gradient-to-br from-[#E8E9F2] to-[#D1D3E5] rounded-lg flex items-center justify-center shrink-0">
        <Microscope className="w-5 h-5 text-[#2F3C96]" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-slate-800 line-clamp-2 mb-2">
          {trial.title}
        </h4>
        <div className="flex items-center gap-2 flex-wrap">
          {trial.status && (
            <span className="px-2.5 py-1 bg-[#E8E9F2] text-[#2F3C96] rounded-full text-xs font-medium border border-[#D1D3E5]">
              {trial.status}
            </span>
          )}
          {trial.phase && trial.phase !== "Not specified" && (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs border border-slate-200">
              {trial.phase}
            </span>
          )}
          {trial.nctId && (
            <span className="px-2.5 py-1 bg-[#E8E9F2] text-[#2F3C96] rounded-full text-xs font-mono border border-[#D1D3E5]">
              {trial.nctId}
            </span>
          )}
        </div>
      </div>
    </div>
    <div className="text-xs text-slate-600 space-y-1.5 mb-3">
      {trial.conditions && trial.conditions !== "Not specified" && (
        <p>
          <span className="font-medium text-slate-700">Conditions:</span>{" "}
          {trial.conditions}
        </p>
      )}
      {trial.locations && trial.locations !== "Multiple locations" && (
        <p className="flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
          <span>{trial.locations}</span>
        </p>
      )}
    </div>
    {trial.summary && trial.summary !== "No summary available" && (
      <p className="text-sm text-slate-600 mb-3 line-clamp-3 leading-relaxed">
        {trial.summary}
      </p>
    )}
    <div className="flex items-center gap-3 flex-wrap">
      {onAskAbout && (
        <button
          onClick={() => onAskAbout(trial, "trial")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2F3C96] hover:text-[#474F97] hover:underline"
        >
          <MessageSquare className="w-3 h-3" /> Ask about this
        </button>
      )}
      {userId && onSave && (
        <button
          onClick={() =>
            onSave("trial", {
              id: trial.nctId || trial.id,
              nctId: trial.nctId || trial.id,
              title: trial.title,
              url: trial.url,
            })
          }
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2F3C96] hover:text-[#474F97] hover:underline"
        >
          <Heart className="w-3 h-3" /> Save
        </button>
      )}
    </div>
  </div>
));

const ExpertCard = React.memo(({ expert, onAskAbout }) => {
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

const TrialDetailsCard = ({ trialDetails, onAskMore, onSave, userId }) => {
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
                Conditions
              </h5>
              <p className="text-sm text-slate-700">{conditions}</p>
            </section>
          )}
          {show("eligibility") && hasEligibility && (
            <section>
              <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                Eligibility Criteria
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
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
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
              <Heart className="w-3.5 h-3.5" /> Save to favourites
            </button>
          )}
          {onAskMore && (
            <div className="pt-3 border-t border-[#D1D3E5]">
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Ask more about this trial
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ASK_ABOUT_OPTIONS.trial.map((opt, i) => (
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
        <div className="p-5 space-y-4">
          <section>
            <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
              Authors
            </h5>
            <p className="text-sm text-slate-700">{authors}</p>
            <p className="text-xs text-slate-600 mt-1">
              {journal} ({year})
            </p>
          </section>
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
          {keywords && (
            <section>
              <h5 className="text-xs font-semibold text-[#2F3C96] uppercase tracking-wide mb-1.5">
                Keywords
              </h5>
              <p className="text-sm text-slate-700">{keywords}</p>
            </section>
          )}
          <div className="flex items-center gap-3 flex-wrap">
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
                <Heart className="w-3.5 h-3.5" /> Save to favourites
              </button>
            )}
          </div>
          {onAskMore && (
            <div className="pt-3 border-t border-[#D1D3E5]">
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Ask more about this publication
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ASK_ABOUT_OPTIONS.publication.map((opt, i) => (
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

const AskMoreBar = ({ type, details, onAskMore, onSave, userId }) => {
  if (!details || !onAskMore) return null;
  const options = ASK_ABOUT_OPTIONS[type] || [];
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
          Ask more about this {type}
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

const SearchResultsCards = ({ searchResults, onAskAbout, onSave, userId }) => {
  if (!searchResults?.items?.length) return null;
  const { type, items } = searchResults;
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

const GroundingSources = ({ sources }) => {
  if (!sources?.length) return null;
  return (
    <div className="w-full">
      <div className="rounded-2xl border border-[#D1D3E5] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#D1D3E5] bg-[#E8E9F2]/60 px-5 py-4">
          <p className="text-sm font-semibold text-[#2F3C96] flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Sources
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Supporting references used for the answer above.
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {sources.map((src) => {
            let domain = "";
            try {
              domain = new URL(src.url).hostname.replace("www.", "");
            } catch {
              domain = "";
            }
            return (
              <a
                key={src.index}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-xl border border-[#D1D3E5] p-3 hover:bg-[#E8E9F2]/50 transition-colors"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#E8E9F2] text-xs font-bold text-[#2F3C96]">
                  {src.index}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-[#2F3C96] group-hover:underline">
                    {src.title || `Source ${src.index}`}
                  </p>
                  {domain && (
                    <p className="mt-1 text-xs text-slate-500">{domain}</p>
                  )}
                </div>
                <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-slate-400" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CommunityCards = ({ communities }) => {
  if (!communities?.length) return null;
  return (
    <div className="w-full">
      <div className="rounded-2xl border border-[#D1D3E5] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#D1D3E5] bg-[#E8E9F2]/60 px-5 py-4">
          <p className="text-sm font-semibold text-[#2F3C96] flex items-center gap-2">
            <Users className="w-4 h-4" />
            Communities on Collabiora
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Join these communities to connect with others.
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
 * Messages are labelled "You" (user) and "Yori" (assistant).
 */
function downloadChatAsPdf(session) {
  const messages = (session.messages || []).filter(
    (m) => m.role === "user" || (m.role === "assistant" && m.content?.trim())
  );
  if (messages.length === 0) return;

  const escapeHtml = (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const rows = messages
    .map((m) => {
      const isUser = m.role === "user";
      const label = isUser ? "You" : "Yori";
      const bg = isUser ? "#EEF0FB" : "#FFFFFF";
      const labelColor = isUser ? "#2F3C96" : "#6B7280";
      // Strip [Previous search topic: ...] hints from assistant messages
      const text = (m.content || "").replace(/\[Previous search topic:.*?\]/gi, "").trim();
      return `
        <div style="margin-bottom:18px; background:${bg}; border-radius:10px; padding:14px 18px; border:1px solid #E5E7EB;">
          <div style="font-size:11px; font-weight:700; color:${labelColor}; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px;">${label}</div>
          <div style="font-size:14px; color:#1F2937; line-height:1.65; white-space:pre-wrap;">${escapeHtml(text)}</div>
        </div>`;
    })
    .join("");

  const title = escapeHtml(session.title || "Chat with Yori");
  const date = new Date(session.updatedAt || Date.now()).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9FAFB; padding: 32px; max-width: 780px; margin: 0 auto; }
    header { margin-bottom: 28px; border-bottom: 2px solid #E5E7EB; padding-bottom: 16px; }
    header h1 { font-size: 20px; color: #2F3C96; font-weight: 700; }
    header p { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
    footer { margin-top: 28px; border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 11px; color: #D1D5DB; text-align: center; }
    @media print { body { background: white; } }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <p>Exported from Collabiora &middot; ${date}</p>
  </header>
  ${rows}
  <footer>Generated by Yori &mdash; Collabiora Health Research Assistant</footer>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("afterprint", () => URL.revokeObjectURL(url));
  } else {
    // Fallback: trigger download as .html (user can open and print)
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(session.title || "chat").replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}

const ChatHistoryItem = ({ session, isActive, onSelect, onDelete }) => {
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
            {session.title || "New chat"}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
            {getChatPreview(session.messages)}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            {formatRelativeTime(session.updatedAt)}
          </p>
        </button>

        {/* Triple-dot menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="mt-0.5 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-[#2F3C96] transition-colors"
            aria-label="Chat options"
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
                Download as PDF
              </button>
              <div className="border-t border-[#E5E7EB]" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(session.id);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                Delete chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function YoriAI() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [chatSessions, setChatSessions] = useState(() =>
    loadSavedChatSessions(),
  );
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [userConditions, setUserConditions] = useState([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [sessionLimitNotice, setSessionLimitNotice] = useState("");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);

  const userId = user?._id || user?.id;
  const userRole = user?.role || "patient";
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
    localStorage.setItem(YORI_STORAGE_KEY, JSON.stringify(chatSessions));
  }, [chatSessions]);

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
      try {
        setUser(JSON.parse(localStorage.getItem("user") || "null"));
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("login", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("login", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

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

  const isPatient = userRole === "patient";
  const trialWord = isPatient ? "treatments" : "clinical trials";

  const defaultQuestions = useMemo(() => {
    const questions = [];
    if (userConditions.length > 0) {
      userConditions.slice(0, 2).forEach((c) => {
        questions.push(`Find ${trialWord} for ${c}`);
      });
    } else {
      questions.push(`Find ${trialWord} for my condition`);
    }
    if (userConditions.length > 0) {
      questions.push(`Find experts in ${userConditions[0]}`);
    } else {
      questions.push("Find experts in my area of interest");
    }
    questions.push(
      "Help me understand a medical term",
      "What communities can I join on Collabiora?",
    );
    return questions;
  }, [userConditions, trialWord]);
  const messages = activeChat?.messages || [];
  const hasUserMessages = messages.some((message) => message.role === "user");
  const canCreateNewChat = chatSessions.length < MAX_CHAT_SESSIONS;

  const updateSessionMessages = useCallback(
    (sessionId, nextMessagesOrUpdater) => {
      setChatSessions((prev) =>
        prev
          .map((session) => {
            if (session.id !== sessionId) return session;
            const nextMessages =
              typeof nextMessagesOrUpdater === "function"
                ? nextMessagesOrUpdater(session.messages)
                : nextMessagesOrUpdater;
            return {
              ...session,
              messages: nextMessages,
              title: deriveChatTitle(nextMessages),
              updatedAt: Date.now(),
            };
          })
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
    },
    [],
  );

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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distanceFromBottom > 200);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeChatId, hasUserMessages]);

  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);

  const createNewChat = useCallback(() => {
    if (!canCreateNewChat) {
      setSessionLimitNotice(
        "You can keep up to 5 chats. Delete one to start a new chat.",
      );
      return;
    }
    const newChat = createChatSession();
    setChatSessions((prev) =>
      [newChat, ...prev].sort((a, b) => b.updatedAt - a.updatedAt),
    );
    setActiveChatId(newChat.id);
    setInput("");
    setSidebarOpen(false);
    setSessionLimitNotice("");
  }, [canCreateNewChat]);

  const deleteChat = useCallback(
    (sessionId) => {
      if (abortControllerRef.current && sessionId === activeChat?.id) {
        abortControllerRef.current.abort();
      }
      setChatSessions((prev) => {
        const remaining = prev.filter((session) => session.id !== sessionId);
        if (remaining.length > 0) return remaining;
        return [createChatSession()];
      });
      setActiveChatId((prevActiveId) =>
        prevActiveId === sessionId ? null : prevActiveId,
      );
      setSessionLimitNotice("");
    },
    [activeChat?.id],
  );

  const handleSelectChat = useCallback((sessionId) => {
    setActiveChatId(sessionId);
    setSidebarOpen(false);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, []);

  const handleSendMessage = useCallback(
    async (messageText = input, context = null) => {
      const sessionId = activeChat?.id;
      if (!sessionId) return;
      const text = (
        typeof messageText === "string" ? messageText : input
      ).trim();
      if (!text || isLoading) return;

      const currentMessages = activeChat.messages || [];
      const userMessage = {
        role: "user",
        content: text,
        ...(context ? { context } : {}),
      };
      const newMessages = [...currentMessages, userMessage];
      const assistantMessageIndex = newMessages.length;

      updateSessionMessages(sessionId, [
        ...newMessages,
        {
          role: "assistant",
          content: "",
          searchResults: null,
          trialDetails: null,
          publicationDetails: null,
          groundingSources: null,
        },
      ]);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setIsLoading(true);

      try {
        abortControllerRef.current = new AbortController();
        const requestMessages = newMessages.map((message) => {
          let content = message.content != null && message.content !== ""
            ? message.content
            : " ";
          // Enrich assistant messages that had search results with an inline topic hint.
          // This keeps the conversation topic alive for the backend even when the user
          // asks generic follow-ups like "what are the symptoms?" or "tell me more".
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
        });
        const response = await fetch(`${apiBase}/api/chatbot/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            messages: requestMessages,
            ...(context ? { context } : {}),
            ...(userId ? { userId } : {}),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          let errMsg = "Failed to get response";
          try {
            const errBody = await response.json();
            if (errBody?.error) errMsg = errBody.error;
          } catch {
            // noop
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
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
                };
                return updated;
              });

              if (data.done) break;
            } catch (error) {
              if (error.message && !error.message.includes("JSON")) throw error;
            }
          }
        }
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
          };
          return updated;
        });
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [activeChat, apiBase, input, isLoading, updateSessionMessages],
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative min-h-screen pt-20 sm:pt-16 yori-page-enter">
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
        @media (max-width: 767px) {
          .yori-sidebar-enter { animation: none; opacity: 1; }
        }
      `,
        }}
      />

      <div className="relative mx-auto flex h-[calc(100vh-5rem)] sm:h-[calc(100vh-4rem)] max-w-[1500px] px-2 py-2 sm:px-4 sm:py-4">

        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — drawer on mobile, inline on desktop */}
        <aside
          className={`
            shrink-0 transition-all duration-300 ease-in-out overflow-hidden
            ${isMobile
              ? `fixed inset-y-0 left-0 z-50 w-[min(300px,85vw)] pt-[5.5rem] pb-2 px-2 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
              : `${sidebarOpen ? "w-[280px] mr-4" : "w-0 mr-0"}`
            }
          `}
          style={isMobile ? { transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)" } : undefined}
        >
          <div className={`flex flex-col rounded-2xl border border-[#D1D3E5] bg-white/95 backdrop-blur shadow-sm overflow-hidden yori-sidebar-enter ${isMobile ? "h-full" : "h-full w-[280px]"}`}>
            <div className="flex items-center gap-2 p-3">
              <button
                type="button"
                onClick={createNewChat}
                disabled={!canCreateNewChat}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #2F3C96, #474F97)",
                }}
              >
                <Plus className="h-4 w-4" />
                New chat
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
            {sessionLimitNotice && (
              <p className="px-3 text-xs text-amber-600 text-center">
                {sessionLimitNotice}
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
                />
              ))}
            </div>

            <div className="border-t border-[#D1D3E5] px-3 py-2.5 text-center">
              <p className="text-[11px] text-slate-400">
                {chatSessions.length}/{MAX_CHAT_SESSIONS} chats &middot; kept 7
                days
              </p>
            </div>
          </div>
        </aside>

        {/* Main chat area */}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#D1D3E5] bg-white/65 shadow-sm backdrop-blur yori-main-enter">
          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-3 border-b border-[#D1D3E5] bg-white/80 px-3 py-2.5 sm:px-4 sm:py-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D1D3E5] bg-white text-[#2F3C96] hover:bg-[#E8E9F2]/50 transition-colors"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#2F3C96]">
                {activeChat?.title || "New chat"}
              </p>
            </div>
            {isMobile && hasUserMessages && (
              <button
                type="button"
                onClick={createNewChat}
                disabled={!canCreateNewChat}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D1D3E5] bg-white text-[#2F3C96] hover:bg-[#E8E9F2]/50 transition-colors disabled:opacity-40"
                title="New chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Messages area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6"
          >
            {!hasUserMessages ? (
              <div className="flex min-h-full flex-col items-center justify-center px-2 pb-6 sm:pb-10">
                <div className="text-center mb-6 sm:mb-8 yori-section-enter yori-delay-1">
                  <img
                    src="/bot.png"
                    alt="Yori"
                    className="mx-auto mb-3 h-12 w-12 sm:mb-4 sm:h-16 sm:w-16 object-contain"
                  />
                  <h1 className="text-xl font-bold text-[#2F3C96] sm:text-3xl">
                    Hey, I'm Yori!
                  </h1>
                </div>

                <div className="flex max-w-3xl flex-wrap justify-center gap-1.5 sm:gap-2 yori-section-enter yori-delay-3">
                  {defaultQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="rounded-full border border-[#D0C4E2]/50 bg-white/70 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm text-[#2F3C96] hover:bg-[#F5F2F8] hover:border-[#D0C4E2] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
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
                    ) : isLoading &&
                      index === messages.length - 1 &&
                      !message.content &&
                      !message.searchResults &&
                      !message.trialDetails &&
                      !message.publicationDetails &&
                      !message.communityResults ? null : (
                      <div className="flex gap-3">
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2F3C96]">
                          <img
                            src="/yori-face.png"
                            alt=""
                            className="h-6 w-6 object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          {message.content &&
                            !(
                              message.publicationDetails &&
                              message.publicationDetails.showFullCard !== false
                            ) && (
                              <div className="rounded-2xl border border-[#D0C4E2]/40 bg-[#F5F2F8]/30 px-3 py-3 sm:px-5 sm:py-4">
                                <div className="prose prose-sm max-w-none [&>*:last-child]:mb-0">
                                  <ReactMarkdown
                                    components={markdownComponents}
                                  >
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
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
                              />
                            )}

                          {message.searchResults && (
                            <SearchResultsCards
                              searchResults={message.searchResults}
                              onAskAbout={handleAskAbout}
                              onSave={handleSaveToFavourites}
                              userId={userId}
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

                          {Array.isArray(message.groundingSources) &&
                            message.groundingSources.length > 0 && (
                              <GroundingSources
                                sources={message.groundingSources}
                              />
                            )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {isLoading && (
                  <div className="flex gap-3 py-2">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2F3C96]">
                      <img
                        src="/yori-face.png"
                        alt=""
                        className="h-6 w-6 object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
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
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Scroll to bottom */}
          {showScrollBtn && hasUserMessages && (
            <div className="pointer-events-none absolute bottom-28 left-1/2 z-10 -translate-x-1/2">
              <button
                type="button"
                onClick={scrollToBottom}
                className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#D1D3E5] bg-white shadow-md hover:bg-[#E8E9F2]"
              >
                <ArrowDown className="h-4 w-4 text-[#2F3C96]" />
              </button>
            </div>
          )}

          {/* Input */}
          <div className="px-2 pb-2 pt-1 sm:px-6 sm:pb-3">
            <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#D0C4E2]/60 bg-[#F5F2F8]/40 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm transition-all focus-within:border-[#D0C4E2] focus-within:bg-[#F5F2F8]/60">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    resizeTextarea();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Yori anything..."
                  className="min-h-[38px] max-h-32 sm:max-h-40 flex-1 resize-none bg-transparent py-2 text-[14px] sm:text-[15px] text-[#2F3C96] placeholder:text-slate-400 focus:outline-none"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="mb-1 flex h-9 w-9 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-[#2F3C96] transition-colors hover:bg-[#D0C4E2]/30 disabled:opacity-30"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <p className="mt-1 text-center text-[10px] sm:text-[11px] text-slate-400">
              Yori can make mistakes. Verify important information.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
