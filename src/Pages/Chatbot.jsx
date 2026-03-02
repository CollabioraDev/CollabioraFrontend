import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, BookOpen, Microscope, Users } from "lucide-react";
import { api } from "../utils/api";
import ReactMarkdown from "react-markdown";

const SuggestionPill = ({ text, onClick }) => (
  <button
    onClick={() => onClick(text)}
    className="px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border border-orange-200 rounded-full text-sm text-orange-700 font-medium transition-all duration-300 hover:shadow-md hover:scale-105 active:scale-95"
  >
    {text}
  </button>
);

const MessageBubble = ({ message, isUser }) => (
  <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
    <div
      className={`max-w-[80%] rounded-2xl px-6 py-4 ${
        isUser
          ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg"
          : "bg-white border border-orange-100 text-slate-700 shadow-md"
      }`}
    >
      {isUser ? (
        <p className="text-sm leading-relaxed">{message.content}</p>
      ) : (
        <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-slate-800 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      )}
    </div>
  </div>
);

const Chatbot = () => {
  // Check if user has seen the greeting before
  const hasSeenGreeting = localStorage.getItem("chatbot_greeting_seen") === "true";
  
  const [messages, setMessages] = useState(
    hasSeenGreeting
      ? [] // No greeting if user has seen it before
      : [
          {
            role: "assistant",
            content:
              "Hello! I'm Yori, your personal AI assistant on Collabiora. I can help you understand research information.",
          },
        ]
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Mark greeting as seen when component mounts (if greeting was shown)
  useEffect(() => {
    if (!hasSeenGreeting && messages.length > 0 && messages[0].role === "assistant") {
      localStorage.setItem("chatbot_greeting_seen", "true");
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load suggestions based on user role
    const loadSuggestions = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const role = user?.role || "patient";
        const response = await api.get(`/chatbot/suggestions?role=${role}`);
        setSuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error("Failed to load suggestions:", error);
        // Default suggestions
        setSuggestions([
          "Find clinical trials for my condition",
          "Explain recent research on cancer treatments",
          "Help me understand this medical term",
          "Find experts in cardiology",
        ]);
      }
    };
    loadSuggestions();
  }, []);

  const handleSendMessage = async (messageText = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: "user", content: messageText.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Create a new assistant message that we'll stream into
    const assistantMessageIndex = newMessages.length;
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiBase}/api/chatbot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ messages: newMessages }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
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
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.text) {
                assistantContent += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
              
              if (data.done) {
                break;
              }
            } catch (e) {
              // Skip invalid JSON
              console.warn("Invalid JSON in stream:", e);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      
      console.error("Error sending message:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantMessageIndex] = {
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    handleSendMessage(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 pt-20 pb-8 px-4">
      <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-lg border border-orange-100 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                CuraBot
              </h1>
              <p className="text-xs text-slate-600">AI Research Assistant</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto">
            Ask me anything about publications, clinical trials, or medical experts
          </p>
        </div>

        {/* Quick Actions */}
        {messages.filter(m => m.role === "user").length === 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleSuggestionClick("Find recent publications on immunotherapy")}
              className="p-4 bg-white border border-orange-100 rounded-xl hover:border-orange-300 hover:shadow-lg transition-all duration-300 group"
            >
              <BookOpen className="w-6 h-6 text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-slate-800 text-sm mb-1">Publications</h3>
              <p className="text-xs text-slate-600">Search research papers</p>
            </button>
            <button
              onClick={() => handleSuggestionClick("Show me clinical trials for diabetes")}
              className="p-4 bg-white border border-orange-100 rounded-xl hover:border-orange-300 hover:shadow-lg transition-all duration-300 group"
            >
              <Microscope className="w-6 h-6 text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-slate-800 text-sm mb-1">Clinical Trials</h3>
              <p className="text-xs text-slate-600">Find ongoing trials</p>
            </button>
            <button
              onClick={() => handleSuggestionClick("Find experts in cardiology")}
              className="p-4 bg-white border border-orange-100 rounded-xl hover:border-orange-300 hover:shadow-lg transition-all duration-300 group"
            >
              <Users className="w-6 h-6 text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-slate-800 text-sm mb-1">Experts</h3>
              <p className="text-xs text-slate-600">Discover researchers</p>
            </button>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto mb-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-orange-100 p-6 shadow-inner">
          {messages.map((message, index) => (
            <MessageBubble
              key={index}
              message={message}
              isUser={message.role === "user"}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-orange-100 rounded-2xl px-6 py-4 shadow-md">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                  <span className="text-sm text-slate-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Pills */}
        {messages.filter(m => m.role === "user").length === 0 && suggestions.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, index) => (
              <SuggestionPill
                key={index}
                text={suggestion}
                onClick={handleSuggestionClick}
              />
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-4">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about publications, trials, or experts..."
              className="flex-1 resize-none rounded-xl border border-orange-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all min-h-[48px] max-h-32"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl px-6 py-3 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">
            CuraBot can make mistakes. Verify important information with healthcare professionals.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
