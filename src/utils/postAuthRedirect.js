const STORAGE_KEY = "collabiora_return_after_auth";

/** Call before navigating to sign-in when user must return (e.g. Plans → unlock Pro). */
export function setPostAuthRedirect(path, opts = {}) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        path: typeof path === "string" ? path : "/plans",
        proIntent: !!opts.proIntent,
      }),
    );
  } catch {
    /* ignore */
  }
}

/** Returns { path, proIntent } once, then clears storage. */
export function consumePostAuthRedirect() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (!parsed?.path || typeof parsed.path !== "string") return null;
    return {
      path: parsed.path,
      proIntent: !!parsed.proIntent,
    };
  } catch {
    return null;
  }
}
