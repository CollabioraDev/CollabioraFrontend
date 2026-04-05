import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Send, Loader2, ExternalLink, X, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  getGuestTrialCount,
  incrementGuestTrialAfterMessage,
  isGuestTrialExhausted,
  MAX_GUEST_TRIALS,
} from "../utils/yoriGuestTrials.js";
import {
  loadGuestChatMessages,
  saveGuestChatMessages,
  YORI_GUEST_CHAT_STORAGE_KEY,
} from "../utils/yoriGuestChatStorage.js";
import { GUEST_BROWSE_MODE_ENABLED } from "../utils/guestBrowseMode.js";

const SAMPLE_PROMPTS = [
  "How much water should I drink?",
  "Tell me about stem cell therapy in Parkinson's disease",
  "Treatments for metastatic breast cancer",
  "What are common vitamin deficiencies?",
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
  a: ({ href, children }) => {
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
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => {
    if (typeof window === "undefined") return [];
    const loaded = loadGuestChatMessages();
    return loaded !== null ? loaded : [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [trialCount, setTrialCount] = useState(() => getGuestTrialCount());
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);

  const syncTrial = useCallback(() => {
    setTrialCount(getGuestTrialCount());
  }, []);

  useEffect(() => {
    const onTrial = () => syncTrial();
    window.addEventListener("yoriGuestTrialUpdated", onTrial);
    return () => window.removeEventListener("yoriGuestTrialUpdated", onTrial);
  }, [syncTrial]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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

  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);

  const hasUserMessages = messages.some((m) => m.role === "user");
  const showSignupGate = isGuestTrialExhausted();
  const remaining = Math.max(0, MAX_GUEST_TRIALS - trialCount);
  const chatInteractionDisabled = isLoading || showSignupGate;

  const handleSendMessage = async (text) => {
    const messageText = (text ?? input).trim();
    if (!messageText || chatInteractionDisabled) return;

    const userMessage = { role: "user", content: messageText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

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

    const messagesToSend = newMessages.map((m) => ({
      ...m,
      content: m.content != null && m.content !== "" ? m.content : " ",
    }));

    try {
      abortControllerRef.current = new AbortController();
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiBase}/api/chatbot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: messagesToSend }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);
              if (data.text) {
                assistantContent += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    role: "assistant",
                    content: assistantContent,
                    searchResults: null,
                    groundingSources: null,
                  };
                  return updated;
                });
              }
              if (data.done) break;
            } catch (e) {
              console.warn("Invalid JSON in stream:", e);
            }
          }
        }
      }

      incrementGuestTrialAfterMessage();
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
          groundingSources: null,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
                aria-label="Clear chat"
                title="Clear chat"
              >
                <Trash2 className="h-5 w-5" strokeWidth={2} />
              </button>
            )}
            <Link
              to="/home"
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
                        <div className="flex items-start gap-0">
                          <div className="relative z-10 mt-2 -mr-2 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center">
                            <img
                              src={
                                isLoading &&
                                index === messages.length - 1 &&
                                !message.content &&
                                !message.searchResults
                                  ? "/yori-thinking.webp"
                                  : "/Yorisidepeak.webp"
                              }
                              alt="Yori"
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
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )}

                            {!message.content &&
                              !message.searchResults &&
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
              <p className="text-center text-sm font-semibold text-[#2F3C96] mb-4">
                You&apos;ve used your free messages. Sign up to keep chatting
                with Yori and unlock the full platform.
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
              <p className="mt-4 text-center text-xs text-slate-600">
                Want to browse first?{" "}
                <Link
                  to="/home"
                  className="font-semibold text-[#2F3C96] underline"
                >
                  Explore collabiora
                </Link>
              </p>
            </div>
          ) : (
            <div className="px-2 pb-2 pt-1 sm:px-6 sm:pb-3 shrink-0">
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
                    disabled={chatInteractionDisabled}
                  />
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || chatInteractionDisabled}
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
