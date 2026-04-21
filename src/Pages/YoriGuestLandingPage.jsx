import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, ExternalLink, X, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  getGuestHomeTrialCount,
  incrementGuestHomeTrialAfterMessage,
  isGuestHomeTrialExhausted,
  MAX_GUEST_HOME_MESSAGES,
  resetGuestHomeTrialCount,
} from "../utils/yoriGuestTrials.js";
import {
  loadGuestChatMessages,
  saveGuestChatMessages,
  YORI_GUEST_CHAT_STORAGE_KEY,
} from "../utils/yoriGuestChatStorage.js";
import {
  preprocessMarkdownWithGroundingCitations,
  flattenMarkdownChildrenToString,
  isLikelyGroundingSourceUrl,
  looksLikeHostnameChip,
  GROUNDING_SOURCE_CHIP_CLASSNAME,
} from "../utils/groundingCitations.js";
import { GUEST_BROWSE_MODE_ENABLED } from "../utils/guestBrowseMode.js";
import {
  getApiLocale,
  appendLocaleToSearchParams,
} from "../i18n/getApiLocale.js";
import {
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
  YoriChatComposer,
} from "../features/chat/ChatbotPage.jsx";
import YoriGuestTutorialOverlay, {
  isYoriGuestTutorialDone,
} from "../components/YoriGuestTutorialOverlay.jsx";

const SAMPLE_PROMPTS = [
  "How much water should I drink in a day?",
  "What are new treatments for breast cancer?",
  "Is exercise good for Parkinson's disease?",
  "Should I be taking multivitamins?",
];

const YORI_DISCLAIMER =
  "Yori is an AI-powered health information tool. The content provided is for informational and educational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional for diagnosis, treatment, or medical decisions. Your information will never be sold or used for commercial purposes.";

/** Same markdown styling as ChatbotPage.jsx */
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
    const isPublicationRoute = href && /^\/publication\//i.test(href);
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
        : isPublicationRoute
          ? "View on collabiora"
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

export default function YoriGuestLandingPage() {
  const { t, i18n } = useTranslation("common");
  const askAboutOptions = useMemo(
    () => buildAskAboutOptions(t),
    [t, i18n.language],
  );
  const navigate = useNavigate();
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    if (typeof window === "undefined") return [];
    const loaded = loadGuestChatMessages();
    return loaded !== null ? loaded : [];
  });
  const [composerRemountKey, setComposerRemountKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [trialCount, setTrialCount] = useState(() => getGuestHomeTrialCount());
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [conditionExploreBusy, setConditionExploreBusy] = useState(false);
  const [conditionExploreKind, setConditionExploreKind] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const latestAssistantStartRef = useRef(null);
  const userJustSentRef = useRef(false);
  const abortControllerRef = useRef(null);

  const syncTrial = useCallback(() => {
    setTrialCount(getGuestHomeTrialCount());
  }, []);

  useEffect(() => {
    const onTrial = () => syncTrial();
    window.addEventListener("yoriGuestTrialUpdated", onTrial);
    return () => window.removeEventListener("yoriGuestTrialUpdated", onTrial);
  }, [syncTrial]);

  useEffect(() => {
    let fromLanding = false;
    try {
      if (sessionStorage.getItem("collabiora_show_yori_tutorial") === "1") {
        sessionStorage.removeItem("collabiora_show_yori_tutorial");
        fromLanding = true;
      }
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("tutorial") === "1";
    if (fromQuery) {
      setTutorialOpen(true);
    } else if (fromLanding && !isYoriGuestTutorialDone()) {
      setTutorialOpen(true);
    }
    if (fromQuery) {
      params.delete("tutorial");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
      navigate(next, { replace: true });
    }
  }, [navigate]);

  useLayoutEffect(() => {
    if (!userJustSentRef.current) return;
    userJustSentRef.current = false;
    latestAssistantStartRef.current?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }, [messages]);

  useEffect(() => {
    saveGuestChatMessages(messages);
  }, [messages]);

  useEffect(() => {
    const sync = () => {
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
    window.addEventListener("yoriGuestChatUpdated", sync);
    const onStorage = (e) => {
      if (e.key === YORI_GUEST_CHAT_STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("yoriGuestChatUpdated", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const hasUserMessages = useMemo(
    () => messages.some((m) => m.role === "user"),
    [messages],
  );
  const showSignupGate = isGuestHomeTrialExhausted();
  const remaining = Math.max(0, MAX_GUEST_HOME_MESSAGES - trialCount);
  const chatInteractionDisabled =
    isLoading || showSignupGate || conditionExploreBusy;

  const composerHistoryPayload = useMemo(
    () =>
      messages
        .slice(-8)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content:
            typeof m.content === "string"
              ? m.content.replace(/\s+/g, " ").trim().slice(0, 700)
              : "",
        }))
        .filter((m) => m.content.length > 0),
    [messages],
  );

  const getRemoteGhostSuffix = useCallback(
    async (prefix, signal) => {
      const trimmed = prefix.replace(/\r\n/g, "\n");
      if (trimmed.trim().length < 10) return "";
      try {
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(
          `${apiBase}/api/chatbot/composer-completion`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              prefix: trimmed.slice(0, 2400),
              messages: composerHistoryPayload,
              locale: getApiLocale(),
            }),
            signal,
          },
        );
        if (!response.ok) return "";
        const data = await response.json().catch(() => ({}));
        return typeof data?.suffix === "string" ? data.suffix : "";
      } catch (e) {
        if (e?.name === "AbortError") throw e;
        return "";
      }
    },
    [composerHistoryPayload, i18n.language],
  );

  const handleSendMessage = async (messageText, context = null) => {
    const text = typeof messageText === "string" ? messageText.trim() : "";
    if (!text || chatInteractionDisabled) return;

    const userMessage = {
      role: "user",
      content: text,
      ...(context ? { context } : {}),
    };
    const newMessages = [...messages, userMessage];
    const assistantMessageIndex = newMessages.length;

    userJustSentRef.current = true;
    setIsLoading(true);

    setMessages([
      ...newMessages,
      {
        role: "assistant",
        content: "",
        searchResults: null,
        trialDetails: null,
        publicationDetails: null,
        communityResults: null,
        groundingSources: null,
        conditionDiscovery: null,
        relatedExplore: null,
      },
    ]);

    const messagesToSend = newMessages.map((message) => {
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
          content = `${content}\n${topicHint}`;
        }
      }
      return { ...message, content };
    });

    try {
      abortControllerRef.current = new AbortController();
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiBase}/api/chatbot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: messagesToSend,
          locale: getApiLocale(),
          ...(context ? { context } : {}),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errMsg = "Failed to get response";
        try {
          const errBody = await response.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch {
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
      let communityResults = null;
      let groundingSources = null;
      let conditionDiscovery = null;
      let relatedExplore = null;
      let buffer = "";

      const applyUpdate = () => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantMessageIndex] = {
            role: "assistant",
            content: assistantContent,
            searchResults,
            trialDetails,
            publicationDetails,
            communityResults,
            groundingSources,
            conditionDiscovery,
            relatedExplore,
          };
          return updated;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        if (done && buffer.trim()) lines.push(buffer);

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.error) throw new Error(data.error);
            if (data.trialDetails) trialDetails = data.trialDetails;
            if (data.publicationDetails) publicationDetails = data.publicationDetails;
            if (data.text) assistantContent += data.text;
            if (data.groundingSources) groundingSources = data.groundingSources;
            if (data.searchResults) searchResults = data.searchResults;
            if (data.communityResults) communityResults = data.communityResults;
            if (data.conditionDiscovery)
              conditionDiscovery = data.conditionDiscovery;
            if (data.relatedExplore) relatedExplore = data.relatedExplore;
            applyUpdate();
          } catch (e) {
            if (e.message && !e.message.includes("JSON")) throw e;
          }
        }
        if (done) break;
      }
      applyUpdate();

      incrementGuestHomeTrialAfterMessage();
      syncTrial();
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Yori guest landing:", error);
      const displayMsg =
        error.message ||
        "I apologize, but I encountered an error. Please try again.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantMessageIndex] = {
          role: "assistant",
          content: displayMsg,
          searchResults: null,
          trialDetails: null,
          publicationDetails: null,
          communityResults: null,
          groundingSources: null,
          conditionDiscovery: null,
          relatedExplore: null,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleGuestConditionDirectSearch = useCallback(
    async (kind, rawQuery) => {
      const q = String(rawQuery || "").trim();
      if (!q || conditionExploreBusy || isLoading || showSignupGate) return;

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
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const params = new URLSearchParams();
        params.set("q", q);
        params.set("page", "1");
        params.set("pageSize", "12");
        params.set("sortByDate", "true");
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
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content,
            ...emptyAssistantShell,
            ...(searchResults ? { searchResults } : {}),
          },
        ]);
        incrementGuestHomeTrialAfterMessage();
        syncTrial();
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              err?.message || "Something went wrong loading results.",
            ...emptyAssistantShell,
          },
        ]);
      } finally {
        setConditionExploreBusy(false);
        setConditionExploreKind(null);
      }
    },
    [
      conditionExploreBusy,
      isLoading,
      showSignupGate,
      t,
      syncTrial,
    ],
  );

  const handleAskAbout = (item, type) => {
    const question =
      type === "publication"
        ? `Tell me more about this publication: "${item.title}"`
        : type === "trial"
          ? `Tell me more about this trial: "${item.title}"`
          : `Tell me more about this researcher: "${item.name}"`;
    handleSendMessage(question, getAskContext(type, item));
  };

  const handleTrialAskMore = (question, details) => {
    handleSendMessage(question, getAskContext("trial", details));
  };

  const handlePublicationAskMore = (question, details) => {
    handleSendMessage(question, getAskContext("publication", details));
  };

  const handleClearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    resetGuestHomeTrialCount();
    setTrialCount(0);
    setComposerRemountKey((k) => k + 1);
    setMessages([]);
  }, []);

  return (
    <div className="relative min-h-screen pt-18 pb-3 sm:pt-16 sm:pb-0 ui-fade-in">
      {/* Same gradient background as marketing home — static blobs (no pan/zoom) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-[#F5F2F8] via-white to-[#E8E0EF]">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{
            background:
              "linear-gradient(to bottom right, rgba(208, 196, 226, 0.3), rgba(47, 60, 150, 0.2), rgba(208, 196, 226, 0.25))",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl"
          style={{
            background:
              "linear-gradient(to top right, rgba(47, 60, 150, 0.25), rgba(208, 196, 226, 0.2), rgba(47, 60, 150, 0.3))",
          }}
        />
        <div
          className="absolute top-1/4 left-1/2 w-[300px] h-[300px] rounded-full blur-3xl opacity-70"
          style={{
            background:
              "linear-gradient(to bottom right, rgba(208, 196, 226, 0.2), rgba(208, 196, 226, 0.25))",
          }}
        />
      </div>

      {/* Taller shell on mobile: was pb-19 + h-[calc(100dvh-9.25rem)] stacking extra empty band below the card */}
      <div className="relative mx-auto flex h-[calc(100dvh-5.25rem)] sm:h-[calc(100vh-4rem)] max-w-[1500px] px-1.5 py-1.5 sm:px-4 sm:py-4">
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#D1D3E5] bg-white/65 shadow-sm backdrop-blur">
          <div className="relative flex h-14 items-center gap-2 border-b border-[#D1D3E5] bg-white/90 px-3 sm:px-4 overflow-visible">
            <div className="min-w-0 flex-1 pr-1">
              <p className="truncate text-sm font-semibold text-[#2F3C96]">
                Meet Yori, your health information companion!
              </p>
              {!showSignupGate && !GUEST_BROWSE_MODE_ENABLED && (
                <p
                  className="truncate text-[11px] sm:text-xs text-slate-500"
                  aria-live="polite"
                >
                  {remaining} {remaining === 1 ? "message" : "messages"} left.
                </p>
              )}
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#2F3C96] hover:bg-[#E8E9F2]/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3C96] focus-visible:ring-offset-2"
                aria-label="Clear chat and reset free messages"
                title="Clear chat and reset your free messages for this page"
              >
                <Trash2 className="h-5 w-5" strokeWidth={2} />
              </button>
            )}
            <Link
              to="/"
              className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#2F3C96] hover:bg-[#E8E9F2]/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3C96] focus-visible:ring-offset-2"
              aria-label="Close and go to home"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </Link>
          </div>

          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 overflow-y-auto px-2 pt-3 pb-3 sm:px-6 sm:pt-6 sm:pb-6"
          >
            {!hasUserMessages ? (
              <div className="flex min-h-full flex-col items-center justify-center px-1 py-2 sm:px-2 sm:py-0 sm:pb-10">
                <div className="mb-3 text-center sm:mb-6">
                  <img
                    src="/bot.webp"
                    alt="Yori"
                    className="mx-auto mb-2 h-14 w-14 sm:mb-3 sm:h-24 sm:w-24 object-contain"
                  />
                  <h1 className="text-lg font-bold text-[#2F3C96] sm:text-3xl">
                    What can I help with?
                  </h1>
                </div>

                <div className="w-full max-w-2xl mx-auto">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SAMPLE_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleSendMessage(q)}
                        disabled={chatInteractionDisabled}
                        className="px-3 py-1.5 text-xs font-medium text-[#2F3C96] bg-white border border-[#D1D3E5] rounded-lg hover:bg-[#E8E9F2] hover:border-[#A3A7CB] shadow-sm transition-colors disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
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
                          <div className="relative z-10 mt-2 -mr-2 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center">
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
                                  onSend={(prompt) =>
                                    handleSendMessage(prompt)
                                  }
                                  disabled={chatInteractionDisabled}
                                />
                              </div>
                            )}

                            {!message.content &&
                              !message.searchResults &&
                              !message.trialDetails &&
                              !message.publicationDetails &&
                              !message.communityResults &&
                              !message.conditionDiscovery &&
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

                            {message.searchResults && (
                              <SearchResultsCards
                                searchResults={message.searchResults}
                                onAskAbout={handleAskAbout}
                                onSave={undefined}
                                userId={null}
                                userRole={null}
                              />
                            )}

                            {message.conditionDiscovery && (
                              <ConditionDiscoveryPanel
                                conditionDiscovery={message.conditionDiscovery}
                                busyKind={conditionExploreKind}
                                onExploreTrials={(query) =>
                                  handleGuestConditionDirectSearch(
                                    "trials",
                                    query,
                                  )
                                }
                                onExplorePublications={(query) =>
                                  handleGuestConditionDirectSearch(
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
                                  onSave={undefined}
                                  userId={null}
                                  askOptions={askAboutOptions.trial}
                                />
                              )}

                            {message.trialDetails &&
                              message.trialDetails.showCard === false &&
                              (!isLoading ||
                                index < messages.length - 1) && (
                                <AskMoreBar
                                  type="trial"
                                  details={message.trialDetails}
                                  onAskMore={(question) =>
                                    handleTrialAskMore(
                                      question,
                                      message.trialDetails,
                                    )
                                  }
                                  onSave={undefined}
                                  userId={null}
                                  askAboutOptions={askAboutOptions}
                                />
                              )}

                            {message.publicationDetails &&
                              message.publicationDetails.showFullCard !==
                                false && (
                                <PublicationDetailsCard
                                  publicationDetails={
                                    message.publicationDetails
                                  }
                                  onAskMore={(question) =>
                                    handlePublicationAskMore(
                                      question,
                                      message.publicationDetails,
                                    )
                                  }
                                  onSave={undefined}
                                  userId={null}
                                  askOptions={askAboutOptions.publication}
                                />
                              )}

                            {message.publicationDetails &&
                              message.publicationDetails.showFullCard ===
                                false &&
                              (!isLoading ||
                                index < messages.length - 1) && (
                                <AskMoreBar
                                  type="publication"
                                  details={message.publicationDetails}
                                  onAskMore={(question) =>
                                    handlePublicationAskMore(
                                      question,
                                      message.publicationDetails,
                                    )
                                  }
                                  onSave={undefined}
                                  userId={null}
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
                </div>
                <div ref={messagesEndRef} className="h-px w-full shrink-0" />
              </>
            )}
          </div>

          {showSignupGate ? (
            <div
              className="border-t border-[#D1D3E5] px-4 py-5 sm:px-8 shrink-0"
              style={{ backgroundColor: "rgba(232, 224, 239, 0.35)" }}
            >
              <p className="text-center text-sm font-semibold text-[#2F3C96] mb-2">
                You&apos;ve used all {MAX_GUEST_HOME_MESSAGES} free messages in
                this session. Sign up or sign in for full access, or clear the
                chat to start another {MAX_GUEST_HOME_MESSAGES}-message try on
                this device.
              </p>
              <div className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/onboarding")}
                  className="flex-1 rounded-xl py-3.5 text-sm font-bold text-white shadow-sm hover:opacity-95"
                  style={{ backgroundColor: "#2F3C96" }}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/signin")}
                  className="flex-1 rounded-xl border-2 border-[#D0C4E2] bg-white py-3.5 text-sm font-semibold text-[#2F3C96] hover:bg-white/90"
                >
                  Sign in
                </button>
              </div>
              <button
                type="button"
                onClick={handleClearChat}
                className="mt-3 mx-auto block w-full max-w-md rounded-xl border-2 border-[#D1D3E5] bg-white py-3 text-sm font-semibold text-[#2F3C96] hover:bg-[#F5F2F8]"
              >
                Clear chat and start over
              </button>
              <p className="mt-4 text-center text-xs text-slate-600">
                Want to browse first?{" "}
                <Link
                  to="/"
                  className="font-semibold text-[#2F3C96] underline"
                >
                  Explore collabiora
                </Link>
              </p>
            </div>
          ) : (
            <div className="px-2 pb-2 pt-1 sm:px-6 sm:pb-3 shrink-0">
              <YoriChatComposer
                key={composerRemountKey}
                onSubmit={handleSendMessage}
                disabled={chatInteractionDisabled}
                isSending={isLoading}
                getRemoteGhostSuffix={getRemoteGhostSuffix}
                completionCandidates={SAMPLE_PROMPTS}
                placeholder={t("yori.placeholderAskAnything")}
              />
              <p className="mt-2 max-w-4xl mx-auto px-1 text-center text-[10px] sm:text-[11px] text-slate-500 leading-relaxed hidden sm:block">
                {YORI_DISCLAIMER}
              </p>
              <div className="sm:hidden mt-2 flex justify-center px-1">
                <button
                  type="button"
                  onClick={() => setDisclaimerOpen(true)}
                  className="text-[11px] font-medium text-[#2F3C96] underline underline-offset-2 decoration-[#2F3C96]/60"
                >
                  View disclaimer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <YoriGuestTutorialOverlay
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
      />

      {disclaimerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/50"
          onClick={() => setDisclaimerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="yori-disclaimer-title"
        >
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border-2 border-t bg-white p-5 shadow-2xl max-h-[min(85vh,520px)] overflow-y-auto sm:max-h-[85vh]"
            style={{ borderColor: "#D0C4E2" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2
                id="yori-disclaimer-title"
                className="text-base font-bold text-[#2F3C96] pr-2"
              >
                Disclaimer
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
              {YORI_DISCLAIMER}
            </p>
            <button
              type="button"
              onClick={() => setDisclaimerOpen(false)}
              className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: "#2F3C96" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
