const apiBase = () => import.meta.env.VITE_API_URL || "http://localhost:5000";

/** Fire-and-forget clinical trial funnel events (admin dashboard). */
export function recordTrialEngagement(action) {
  const allowed = new Set([
    "contact_modal",
    "email_click",
    "trial_detail_view",
  ]);
  if (!allowed.has(action)) return;
  fetch(`${apiBase()}/api/analytics/trial-engagement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  }).catch(() => {});
}

/** First-party page usage (routes excluding /admin). */
export function recordPageView(pathname) {
  if (!pathname || typeof pathname !== "string") return;
  if (pathname.startsWith("/admin")) return;
  fetch(`${apiBase()}/api/analytics/page-view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: pathname }),
  }).catch(() => {});
}
