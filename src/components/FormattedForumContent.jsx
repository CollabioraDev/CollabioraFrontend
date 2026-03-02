/**
 * Renders forum thread/reply body with preserved formatting:
 * - Line breaks and paragraphs
 * - Bullet points (·, -, *, •)
 * - Numbered lists (1. 2. or 1) 2))
 * - Readable typography for long research-style responses
 */
export default function FormattedForumContent({ content, className = "" }) {
  if (!content || typeof content !== "string") return null;

  const trimmed = content.trim();
  if (!trimmed) return null;

  const BULLET_REGEX = /^\s*[·•\-*]\s+/;
  const NUMBERED_REGEX = /^\s*\d+[.)]\s+/;

  const lines = trimmed.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      i++;
      continue;
    }

    if (BULLET_REGEX.test(line)) {
      const items = [];
      while (i < lines.length && (BULLET_REGEX.test(lines[i]) || lines[i].trim() === "")) {
        if (lines[i].trim()) {
          items.push(lines[i].replace(BULLET_REGEX, "").trim());
        }
        i++;
      }
      if (items.length > 0) {
        elements.push(
          <ul
            key={elements.length}
            className="list-disc list-outside pl-6 space-y-1.5 my-3 marker:text-[#2F3C96]/70"
          >
            {items.map((item, j) => (
              <li key={j} className="leading-relaxed pl-0.5">
                {item}
              </li>
            ))}
          </ul>
        );
      }
      continue;
    }

    if (NUMBERED_REGEX.test(line)) {
      const items = [];
      while (i < lines.length && (NUMBERED_REGEX.test(lines[i]) || lines[i].trim() === "")) {
        if (lines[i].trim()) {
          items.push(lines[i].replace(NUMBERED_REGEX, "").trim());
        }
        i++;
      }
      if (items.length > 0) {
        elements.push(
          <ol
            key={elements.length}
            className="list-decimal list-outside pl-6 space-y-1.5 my-3 marker:font-medium marker:text-[#2F3C96]/80"
          >
            {items.map((item, j) => (
              <li key={j} className="leading-relaxed pl-0.5">
                {item}
              </li>
            ))}
          </ol>
        );
      }
      continue;
    }

    const paraLines = [];
    while (i < lines.length && lines[i].trim() && !BULLET_REGEX.test(lines[i]) && !NUMBERED_REGEX.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(
        <p key={elements.length} className="my-2.5 leading-relaxed first:mt-0 last:mb-0">
          {paraLines.join(" ")}
        </p>
      );
    }
  }

  return (
    <div
      className={`formatted-forum-content text-sm text-[#484848] max-w-full ${className}`}
      style={{ wordBreak: "break-word" }}
    >
      {elements.length > 0 ? elements : <p className="leading-relaxed">{trimmed}</p>}
    </div>
  );
}
