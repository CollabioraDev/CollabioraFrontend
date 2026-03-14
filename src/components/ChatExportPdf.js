/**
 * ChatExportPdf — Builds print/PDF-ready HTML for a Yori chat session.
 * Renders messages plus structured publication and trial cards (with DOI, PMID, NCT ID).
 * Used when the user downloads the chat as PDF.
 */

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert markdown-style formatting to HTML for export (bold, headers, lists).
 * Escapes HTML first, then applies **bold**, ## headers, * list items.
 */
function markdownToHtml(text) {
  if (!text || !String(text).trim()) return "";
  const escaped = escapeHtml(text);
  const lines = escaped.split("\n");
  const out = [];
  let inList = false;
  const blockStyle = "margin:6px 0; line-height:1.6; color:#1F2937;";
  const h2Style = "font-size:16px; font-weight:700; color:#2F3C96; margin:14px 0 8px;";
  const h3Style = "font-size:14px; font-weight:700; color:#1F2937; margin:12px 0 6px;";

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Bold then italic (** before *)
    line = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    line = line.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    if (/^### /.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h3 style="${h3Style}">${line.slice(4)}</h3>`);
    } else if (/^## /.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h2 style="${h2Style}">${line.slice(3)}</h2>`);
    } else if (/^\s*[\*-]\s+/.test(line)) {
      const bulletMatch = line.match(/^\s*[\*-]\s+/);
      const content = bulletMatch ? line.slice(bulletMatch[0].length) : line;
      if (!inList) {
        out.push('<ul style="margin:8px 0 8px 20px; padding-left:16px;">');
        inList = true;
      }
      out.push(`<li style="${blockStyle}">${content}</li>`);
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (line.trim()) {
        out.push(`<p style="${blockStyle}">${line}</p>`);
      } else {
        out.push("<br>");
      }
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

const styles = {
  messageBlock: "margin-bottom:20px; border-radius:12px; padding:16px 20px; border:1px solid #E5E7EB;",
  messageLabel: "font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;",
  messageContent: "font-size:14px; color:#1F2937; line-height:1.65;",
  sectionHeading: "margin-top:16px; margin-bottom:8px; font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #E5E7EB; padding-bottom:6px;",
  card: "margin-top:12px; margin-bottom:12px; padding:14px 16px; border:1px solid #D1D3E5; border-radius:10px; background:#FAFAFC; font-size:13px;",
  cardTitle: "font-weight:700; color:#2F3C96; font-size:14px; line-height:1.4; margin-bottom:8px;",
  cardMeta: "font-size:12px; color:#4B5563; margin-bottom:4px; line-height:1.45;",
  cardMetaLabel: "color:#6B7280; font-weight:600;",
  cardSummary: "font-size:12px; color:#374151; line-height:1.55; margin-top:8px; margin-bottom:8px; padding-top:8px; border-top:1px solid #E5E7EB;",
  cardLink: "font-size:12px; color:#2F3C96; font-weight:600; text-decoration:none;",
  cardIds: "font-size:11px; color:#6B7280; margin-top:6px; font-family:ui-monospace, monospace;",
};

/**
 * Build HTML for a single publication card in the export.
 */
function buildPublicationCardHtml(item) {
  const title = escapeHtml(item.simplifiedTitle || item.title || "Untitled");
  const authors = escapeHtml(item.authors || "—");
  const journal = escapeHtml(item.journal || "").trim();
  const year = item.year ? escapeHtml(String(item.year)) : "";
  const journalLine = journal && year ? `${journal} (${year})` : journal || year || "—";
  const summaryRaw = item.simplifiedSummary || item.abstract || item.summary || "";
  const summary = summaryRaw
    ? escapeHtml(summaryRaw.slice(0, 400)) + (summaryRaw.length > 400 ? "…" : "")
    : "";
  const url = item.pmid
    ? `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}`
    : item.doi
      ? `https://doi.org/${item.doi}`
      : item.url || "#";

  const ids = [];
  if (item.pmid) ids.push(`PMID: ${escapeHtml(String(item.pmid))}`);
  if (item.doi) ids.push(`DOI: ${escapeHtml(String(item.doi))}`);

  return `
    <div style="${styles.card}">
      <div style="${styles.cardTitle}">${title}</div>
      <div style="${styles.cardMeta}">${authors}</div>
      <div style="${styles.cardMeta}">${journalLine}</div>
      ${ids.length ? `<div style="${styles.cardIds}">${ids.join(" &middot; ")}</div>` : ""}
      ${summary ? `<div style="${styles.cardSummary}">${summary}</div>` : ""}
      <a href="${escapeHtml(url)}" style="${styles.cardLink}">View full Publication</a>
    </div>`;
}

/**
 * Build HTML for a single trial card in the export.
 */
function buildTrialCardHtml(item) {
  const title = escapeHtml(item.simplifiedTitle || item.title || "Untitled");
  const summaryRaw = item.simplifiedSummary || item.summary || "";
  const summary = summaryRaw
    ? escapeHtml(summaryRaw.slice(0, 400)) + (summaryRaw.length > 400 ? "…" : "")
    : "";
  const url = item.nctId
    ? `https://clinicaltrials.gov/study/${item.nctId}`
    : item.url || "#";

  const rows = [];
  if (item.nctId) rows.push(`<div style="${styles.cardMeta}"><span style="${styles.cardMetaLabel}">NCT ID:</span> ${escapeHtml(item.nctId)}</div>`);
  if (item.conditions && item.conditions !== "Not specified") {
    rows.push(`<div style="${styles.cardMeta}"><span style="${styles.cardMetaLabel}">Condition:</span> ${escapeHtml(item.conditions)}</div>`);
  }
  if (item.status || (item.phase && item.phase !== "Not specified")) {
    const statusPhase = [item.status, item.phase].filter(Boolean).filter((v) => v !== "Not specified").join(" · ");
    rows.push(`<div style="${styles.cardMeta}"><span style="${styles.cardMetaLabel}">Status:</span> ${escapeHtml(statusPhase)}</div>`);
  }
  if (item.locations && item.locations !== "Not specified") {
    rows.push(`<div style="${styles.cardMeta}"><span style="${styles.cardMetaLabel}">Location:</span> ${escapeHtml(item.locations)}</div>`);
  }

  return `
    <div style="${styles.card}">
      <div style="${styles.cardTitle}">${title}</div>
      ${rows.join("")}
      ${summary ? `<div style="${styles.cardSummary}">${summary}</div>` : ""}
      <a href="${escapeHtml(url)}" style="${styles.cardLink}">View full Trial</a>
    </div>`;
}

/**
 * Build HTML for a search results section (publications or trials).
 */
function buildSearchResultsSectionHtml(searchResults) {
  if (!searchResults?.items?.length) return "";
  const { type, items } = searchResults;
  const sectionLabel =
    type === "publications" ? "Publications" : type === "trials" ? "Clinical trials" : "Results";
  const cards = items.map((item) =>
    type === "publications" ? buildPublicationCardHtml(item) : type === "trials" ? buildTrialCardHtml(item) : ""
  );
  return `
    <div style="${styles.sectionHeading}">${sectionLabel}</div>
    ${cards.join("")}`;
}

/**
 * Build HTML for a single message block (user or assistant), including any search result cards.
 */
function buildMessageBlockHtml(message) {
  const isUser = message.role === "user";
  const label = isUser ? "You" : "Yori";
  const bg = isUser ? "#EEF0FB" : "#FFFFFF";
  const labelColor = isUser ? "#2F3C96" : "#6B7280";

  const text = (message.content || "").replace(/\[Previous search topic:.*?\]/gi, "").trim();
  const contentHtml = text
    ? `<div style="${styles.messageContent}">${markdownToHtml(text)}</div>`
    : "";
  const searchResultsHtml =
    message.role === "assistant" && message.searchResults
      ? buildSearchResultsSectionHtml(message.searchResults)
      : "";

  return `
    <div style="${styles.messageBlock} background:${bg};">
      <div style="${styles.messageLabel} color:${labelColor}">${label}</div>
      ${contentHtml}
      ${searchResultsHtml}
    </div>`;
}

/**
 * Build the full HTML document for the chat export (print/PDF).
 * @param {{ title?: string, updatedAt?: number, messages?: Array }} session - Chat session
 * @returns {string} Full HTML string
 */
export function buildChatExportHtml(session) {
  const messages = (session.messages || []).filter(
    (m) =>
      m.role === "user" ||
      (m.role === "assistant" && (m.content?.trim() || m.searchResults?.items?.length > 0))
  );
  if (messages.length === 0) return "";

  const rows = messages.map(buildMessageBlockHtml).join("");

  const title = escapeHtml(session.title || "Chat with Yori");
  const date = new Date(session.updatedAt || Date.now()).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F9FAFB; padding: 32px; max-width: 780px; margin: 0 auto; }
    header { margin-bottom: 28px; border-bottom: 2px solid #E5E7EB; padding-bottom: 16px; }
    header h1 { font-size: 20px; color: #2F3C96; font-weight: 700; }
    header p { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
    footer { margin-top: 28px; border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 11px; color: #9CA3AF; text-align: center; }
    @media print { body { background: white; } }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <p>Exported from Collabiora · ${date}</p>
  </header>
  ${rows}
  <footer>Generated by Yori — Collabiora Health Research Assistant</footer>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}
