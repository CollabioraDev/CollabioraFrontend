import toast from "react-hot-toast";

/**
 * Checks if the current user has verified their email.
 * Shows a toast and returns false if not verified.
 * Returns true if verified (or no user logged in — let other guards handle auth).
 */
export function isEmailVerified() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user?._id && !user?.id) return true;
  return !!user.emailVerified;
}

/**
 * Gate an interaction behind email verification.
 * Call before any write action (post, reply, vote, follow, etc.).
 * Returns true if the action can proceed, false if blocked.
 */
export function requireEmailVerification() {
  if (isEmailVerified()) return true;

  toast("Please verify your email before using this feature", {
    duration: 4000,
    icon: "✉️",
    style: {
      background: "#2F3C96",
      color: "#fff",
      fontWeight: 500,
      borderRadius: "12px",
      padding: "12px 20px",
    },
  });
  return false;
}
