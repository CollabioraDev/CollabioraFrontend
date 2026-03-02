/**
 * Route preload: prefetch lazy route chunks on link hover/focus so navigation feels instant.
 * Call preload(pathname) from Link onMouseEnter/onFocus.
 */

const preloaders = {
  "/": () => import("../Pages/Landing.jsx"),
  "/about": () => import("../Pages/AboutUs.jsx"),
  "/contact": () => import("../Pages/ContactUs.jsx"),
  "/faq": () => import("../Pages/FAQ.jsx"),
  "/privacy": () => import("../Pages/PrivacyPolicyAndTerms.jsx"),
  "/terms": () => import("../Pages/PrivacyPolicyAndTerms.jsx"),
  "/cookie-policy": () => import("../Pages/CookiePolicy.jsx"),
  "/explore": () => import("../Pages/Explore.jsx"),
  "/signin": () => import("../Pages/SignIn.jsx"),
  "/forgot-password": () => import("../Pages/ForgotPassword.jsx"),
  "/reset-password": () => import("../Pages/ResetPassword.jsx"),
  "/dashboard/patient": () => import("../Pages/DashboardPatient.jsx"),
  "/dashboard/researcher": () => import("../Pages/DashboardResearcher.jsx"),
  "/trials": () => import("../Pages/Trials.jsx"),
  "/publications": () => import("../Pages/Publications.jsx"),
  "/library": () => import("../Pages/Publications.jsx"),
  "/experts": () => import("../Pages/Experts.jsx"),
  "/expert/profile": () => import("../Pages/ExpertProfile.jsx"),
  "/forums": () => import("../Pages/Forums.jsx"),
  "/researcher-forums": () => import("../Pages/ResearcherForums.jsx"),
  "/trending": () => import("../Pages/Trending.jsx"),
  "/discovery": () => import("../Pages/Discovery.jsx"),
  "/favorites": () => import("../Pages/Favorites.jsx"),
  "/manage-trials": () => import("../Pages/ManageTrials.jsx"),
  "/notifications": () => import("../Pages/Notifications.jsx"),
  "/profile": () => import("../Pages/EditProfile.jsx"),
  "/admin/login": () => import("../Pages/AdminLogin.jsx"),
  "/admin/dashboard": () => import("../Pages/AdminDashboard.jsx"),
  "/auth/callback": () => import("../Pages/Auth0Callback.jsx"),
  "/auth/complete-profile": () => import("../Pages/CompleteProfile.jsx"),
  "/auth/orcid/callback": () => import("../Pages/OrcidCallback.jsx"),
  "/verify-email": () => import("../Pages/VerifyEmail.jsx"),
  "/404": () => import("../Pages/ErrorPage.jsx"),
};

// Parametrized routes: prefix -> loader
const prefixPreloaders = [
  ["/trial/", () => import("../Pages/TrialDetails.jsx")],
  ["/publication/", () => import("../Pages/PublicationDetails.jsx")],
  ["/collabiora-expert/profile/", () => import("../Pages/CuraLinkExpertProfile.jsx")],
  ["/forums/community/", () => import("../Pages/ForumCommunityPage.jsx")],
  ["/researcher-forums/community/", () => import("../Pages/ResearcherCommunityPage.jsx")],
  ["/admin/expert/", () => import("../Pages/AdminExpertProfile.jsx")],
];

const preloaded = new Set();

/**
 * Preload the chunk for a route so that when the user navigates, it's already loaded.
 * Safe to call multiple times; each route is only prefetched once.
 * @param {string} pathname - e.g. "/explore" or "/trial/NCT123"
 */
export function preloadRoute(pathname) {
  if (!pathname || typeof pathname !== "string") return;
  const normalized = pathname.split("?")[0];
  if (preloaded.has(normalized)) return;

  const loader =
    preloaders[normalized] ||
    prefixPreloaders.find(([prefix]) => normalized.startsWith(prefix))?.[1];

  if (loader) {
    preloaded.add(normalized);
    loader().catch(() => {
      preloaded.delete(normalized);
    });
  }
}
