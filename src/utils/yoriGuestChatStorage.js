/**
 * Persisted Yori chat for signed-out users only.
 * Signed-in users use `collabiora_iora_chat` in FloatingChatbot — never mix keys.
 */
export const YORI_GUEST_CHAT_STORAGE_KEY = "collabiora_yori_guest_chat_v1";

function stripForStorage(msg) {
  if (!msg || typeof msg !== "object") return msg;
  const o = {
    role: msg.role,
    content: msg.content != null ? String(msg.content) : "",
  };
  if (msg.context != null) o.context = msg.context;
  if (msg.searchResults != null) o.searchResults = msg.searchResults;
  if (msg.trialDetails != null) o.trialDetails = msg.trialDetails;
  if (msg.publicationDetails != null) o.publicationDetails = msg.publicationDetails;
  if (msg.groundingSources != null) o.groundingSources = msg.groundingSources;
  if (msg.communityResults != null) o.communityResults = msg.communityResults;
  return o;
}

export function sanitizeGuestMessagesForStorage(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map(stripForStorage);
}

/** Legacy landing-only assistant bubble; guest UI now starts empty until first send. */
function normalizeGuestMessagesOnLoad(messages) {
  if (!Array.isArray(messages)) return [];
  if (
    messages.length === 1 &&
    messages[0].role === "assistant" &&
    (String(messages[0].content || "").includes("Ask a general health question") ||
      String(messages[0].content || "").includes("try a suggestion below"))
  ) {
    return [];
  }
  return messages;
}

export function loadGuestChatMessages() {
  try {
    const raw = localStorage.getItem(YORI_GUEST_CHAT_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.messages)) {
      return normalizeGuestMessagesOnLoad(data.messages);
    }
  } catch (e) {
    console.warn("yori guest chat: could not load", e);
  }
  return null;
}

export function saveGuestChatMessages(messages) {
  try {
    const payload = {
      messages: sanitizeGuestMessagesForStorage(messages),
      updatedAt: Date.now(),
    };
    localStorage.setItem(YORI_GUEST_CHAT_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event("yoriGuestChatUpdated"));
  } catch (e) {
    console.warn("yori guest chat: could not save", e);
  }
}

/** Restore general guest thread after leaving a trial/publication detail view. */
export function restoreGuestGeneralMessages(fallbackMessages) {
  const loaded = loadGuestChatMessages();
  if (loaded === null) return fallbackMessages;
  return loaded.length > 0 ? loaded : [];
}
