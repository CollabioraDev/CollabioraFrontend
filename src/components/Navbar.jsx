import { useState, useEffect, useRef, Fragment } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import PrefetchLink from "./PrefetchLink.jsx";
import GlobalSearch from "./GlobalSearch";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { listenForMessages } from "../utils/crossTabSync.js";
import { getDisplayName } from "../utils/researcherDisplayName.js";
import { IconBell } from "@tabler/icons-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isExploreDropdownOpen, setIsExploreDropdownOpen] = useState(false);
  const [isMobileExploreOpen, setIsMobileExploreOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const exploreDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isAtTop, setIsAtTop] = useState(true);

  // Check if we're on the landing page (`/` = Yori guest preview)
  const isLandingPage = location.pathname === "/";

  // Check if we're on a dashboard page
  const isDashboardPage = location.pathname.includes("/dashboard");

  // Check if we're on an onboarding page
  const isOnboardingPage =
    location.pathname.includes("/onboarding") ||
    location.pathname.includes("/onboard");

  // On admin routes, show only the logo (no nav links, no Sign In)
  const isAdminRoute = location.pathname.startsWith("/admin");

  // Curate site-listed trials: logo only (same as admin bar)
  const isCurateTrialsRoute =
    location.pathname === "/curate-trials" ||
    location.pathname.startsWith("/curate-trials/");

  const isLogoOnlyNav = isAdminRoute || isCurateTrialsRoute;

  // About Us, Contact, Sign In, Onboarding: for non-signed-in show basic nav (About Us, FAQ, Contact); for signed-in show Explore, Forums, Discovery
  const isSimpleNavPage =
    location.pathname === "/about" ||
    location.pathname === "/contact" ||
    location.pathname === "/signin" ||
    location.pathname.includes("/onboarding") ||
    location.pathname.includes("/onboard");

  // Check if we're on the FAQ page
  const isFAQPage = location.pathname === "/faq";

  // Privacy Policy, Terms, Cookie Policy: show only About Us, FAQ, Contact (and Sign In)
  const isPrivacyOrTermsPage =
    location.pathname === "/privacy" ||
    location.pathname === "/terms" ||
    location.pathname === "/cookie-policy";

  // How It Works: always show About Us, FAQ, Contact (Sign In button still visible)
  const isHowItWorksPage = location.pathname === "/how-it-works";

  // Check if we're on forgot-password or reset-password pages
  const isForgotOrResetPasswordPage =
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password";

  // Auth callback / complete-profile (setting up account): show only Explore, Forums, Discovery
  const isAuthCallbackPage =
    location.pathname === "/auth/callback" ||
    location.pathname === "/auth/complete-profile";

  // On explore page: show Explore (dropdown) + Forums + Discovery
  const isSignInOrExplorePage = location.pathname === "/explore";

  // Blogs listing + single blog (+ /discovery/blogs/:slug alias): same nav as Explore
  const isBlogsPage =
    location.pathname === "/blogs" ||
    location.pathname.startsWith("/blogs/") ||
    location.pathname.startsWith("/discovery/blogs/");

  // Press releases: same public content nav as blogs (not Trials / Publications / Experts)
  const isPressReleasePage = location.pathname.startsWith("/press-releases/");

  // Trials, Publications/Library, Experts (including detail pages): for non-signed-in users, show same nav as Explore (Explore, Forums, Discovery)
  const isTrialsPublicationsOrExperts =
    location.pathname === "/trials" ||
    location.pathname.startsWith("/trial/") ||
    location.pathname === "/publications" ||
    location.pathname === "/library" ||
    location.pathname.startsWith("/publication/") ||
    location.pathname === "/experts";

  // Discovery, Forums: when not signed in, show Explore, Forums, Discovery (same as Explore page)
  const isDiscoveryOrForumsPage =
    location.pathname === "/discovery" || location.pathname === "/forums";

  // Determine navigation items based on route and auth state
  // About/Contact/Sign-in/Onboarding + NOT signed in: About Us, FAQ, Contact (basic options)
  // About/Contact/Sign-in/Onboarding + signed in: Explore, Forums, Discovery
  // `/` (Yori guest) + NOT signed in: single Explore → `/explore` (public page), not the signed-in dropdown
  // Explore: Explore, Forums, Discovery
  // When signed in (other pages): Dashboard, Explore, Forums, Discovery
  const getNavItems = () => {
    // How It Works page: restrict to About Us, FAQ, Contact
    if (isHowItWorksPage) {
      return ["About Us", "FAQ", "Contact"];
    }
    // FAQ page: always show About Us, FAQ, Contact (regardless of auth state)
    if (isFAQPage) {
      return ["About Us", "FAQ", "Contact"];
    }
    // Privacy Policy / Terms: show only About Us, FAQ, Contact (Sign In shown in navbar)
    if (isPrivacyOrTermsPage) {
      return ["About Us", "FAQ", "Contact"];
    }
    // Forgot Password / Reset Password pages: always show About Us, FAQ, Contact (regardless of auth state)
    if (isForgotOrResetPasswordPage) {
      return ["About Us", "FAQ", "Contact"];
    }
    // Auth callback / complete-profile (setting up account): show only Explore, Forums, Discovery
    if (isAuthCallbackPage) {
      return ["Explore", "Forums", "Discovery"];
    }
    // Blogs + press releases: Explore, Forums, Discovery (no Dashboard — match Explore page)
    if (isBlogsPage || isPressReleasePage) {
      return ["Explore", "Forums", "Discovery"];
    }
    // About Us, Contact, Sign In, Onboarding: basic nav for guests, app nav for signed-in
    if (isSimpleNavPage && !user) {
      return ["About Us", "FAQ", "Contact"];
    }
    if (isSimpleNavPage && user) {
      return ["Explore", "Forums", "Discovery"];
    }
    if (isLandingPage && !user) {
      return ["Explore"];
    }
    if (isSignInOrExplorePage) {
      return ["Explore", "Forums", "Discovery"];
    }
    // Non-signed-in on Trials, Publications, or Experts: show Explore, Forums, Discovery
    if (!user && isTrialsPublicationsOrExperts) {
      return ["Explore", "Forums", "Discovery"];
    }
    // Non-signed-in on Discovery or Forums: show Explore, Forums, Discovery
    if (!user && isDiscoveryOrForumsPage) {
      return ["Explore", "Forums", "Discovery"];
    }
    if (user) {
      return ["Dashboard", "Explore", "Forums", "Discovery"];
    }
    const allNavItems = [
      "Trials",
      "Publications",
      "Experts",
      "Forums",
      "Discovery",
    ];
    return isDashboardPage
      ? allNavItems.filter(
          (item) => !["Trials", "Publications", "Experts"].includes(item),
        )
      : allNavItems;
  };

  const navItems = getNavItems();

  // When signed in as researcher, show "Collaborators" / "Publications" / "Clinical Trials"; for patients use friendlier terms
  const expertsNavLabel =
    user?.role === "researcher" ? "Collaborators" : "Health Experts";
  const publicationsNavLabel =
    user?.role === "researcher" ? "Publications" : "Health Library";
  const trialsNavLabel =
    user?.role === "researcher" ? "Clinical Trials" : "New Treatments";
  const publicationsNavRoute =
    user?.role === "researcher" ? "/publications" : "/library";

  useEffect(() => {
    const updateUser = () => {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      setUser(userData);
      setImageError(false); // Reset image error when user changes

      // Fetch profile data if user exists
      if (userData?._id || userData?.id) {
        fetchProfile(userData._id || userData.id);
        fetchNotifications(userData._id || userData.id);
      } else {
        setProfile(null);
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    const fetchProfile = async (userId) => {
      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(`${base}/api/profile/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile || null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    const fetchNotifications = async (userId) => {
      if (!userId) return;
      try {
        setNotificationsLoading(true);
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(`${base}/api/insights/${userId}?limit=10`);
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setNotificationsLoading(false);
      }
    };

    updateUser();

    const handleLogout = () => {
      setUser(null);
      setIsMenuOpen(false);
      setIsMobileMenuOpen(false);
    };

    const handleLogin = () => {
      updateUser();
    };

    // Refresh notifications periodically when user is logged in
    let notificationInterval = null;
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    if (currentUser?._id || currentUser?.id) {
      notificationInterval = setInterval(() => {
        const userId = JSON.parse(localStorage.getItem("user") || "null");
        if (userId?._id || userId?.id) {
          fetchNotifications(userId._id || userId.id);
        }
      }, 30000); // Refresh every 30 seconds
    }

    const handleStorageChange = (e) => {
      if (e.key === "user" || e.key === "token") {
        updateUser();
      }
    };

    window.addEventListener("logout", handleLogout);
    window.addEventListener("login", handleLogin);
    window.addEventListener("storage", handleStorageChange);

    // Listen for cross-tab messages (email verification, user updates)
    const cleanupCrossTab = listenForMessages((type, data) => {
      if (type === "email-verified" || type === "user-updated") {
        updateUser();
        // Also trigger login event for other listeners
        window.dispatchEvent(new Event("login"));
      }
    });

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
      if (
        exploreDropdownRef.current &&
        !exploreDropdownRef.current.contains(event.target)
      ) {
        setIsExploreDropdownOpen(false);
      }
      // Only close mobile menu if it's rendered (open) and click is outside both the menu and the button
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        mobileMenuButtonRef.current &&
        !mobileMenuButtonRef.current.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        // On onboarding pages, always keep navbar at top state (no scroll effect)
        if (isOnboardingPage) {
          setIsAtTop(true);
          return;
        }
        setIsAtTop(scrollY < 50);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial calculation
    handleScroll();

    return () => {
      window.removeEventListener("logout", handleLogout);
      window.removeEventListener("login", handleLogin);
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
      cleanupCrossTab();
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
      if (notificationInterval) {
        clearInterval(notificationInterval);
      }
    };
  }, [isOnboardingPage]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Clear search state for all search pages
    sessionStorage.removeItem("experts_search_state");
    sessionStorage.removeItem("trials_search_state");
    sessionStorage.removeItem("publications_search_state");
    window.dispatchEvent(new Event("logout"));
    navigate("/");
  }

  function getDashboardPath() {
    if (!user) return "/dashboard/patient";
    return `/dashboard/${user.role || "patient"}`;
  }

  const getIcon = (item) => {
    const icons = {
      // Landing page navigation
      "About Us": (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      FAQ: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      Contact: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      // Regular navigation
      Dashboard: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 4l4 2m-2-8l4-2m-6 2l-4-2"
          />
        </svg>
      ),
      Trials: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      Publications: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z"
          />
        </svg>
      ),
      Experts: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      Forums: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      "Researcher Forums": (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      ),
      Discovery: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      Explore: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
      Trending: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    };
    return icons[item];
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none ui-fade-in">
      <div
        className={`pointer-events-auto flex items-center justify-between w-full relative ${
          isAtTop
            ? "px-6 lg:px-8 py-4 bg-transparent border-transparent shadow-none"
            : "px-6 lg:px-8 py-3 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-lg"
        }`}
        style={
          !isAtTop
            ? {
                background:
                  "linear-gradient(135deg, rgba(245, 242, 248, 0.9), rgba(255, 255, 255, 0.7))",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                boxShadow:
                  "0 4px 16px 0 rgba(47, 60, 150, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)",
                borderBottomColor: "#D0C4E2",
              }
            : {}
        }
      >
        {/* Logo */}
        <PrefetchLink
          to={user ? "/yori" : isLandingPage ? "/home" : "/"}
          className="group relative flex items-center"
        >
          {/* Logo Image */}
          <img
            src={"/logo.webp"}
            alt="collabiora Logo"
            className={`w-auto relative z-10 ${isAtTop ? "h-14" : "h-12"}`}
            style={{
              width: "auto",
              maxWidth: "none",
              filter: isAtTop
                ? "drop-shadow(0 4px 8px rgba(47, 60, 150, 0.2))"
                : "drop-shadow(0 2px 4px rgba(47, 60, 150, 0.15))",
            }}
          />
        </PrefetchLink>

        {/* Desktop Nav - hidden on admin routes only (onboarding shows Explore, Forums, Discovery) */}
        {!isLogoOnlyNav && (
          <nav className="hidden sm:flex items-center gap-6 text-[15px] font-semibold">
            {navItems.map((item, index) => {
              // Map navigation items to their routes
              const routeMap = {
                // Landing page routes
                "About Us": "/about",
                FAQ: "/faq",
                Contact: "/contact",
                // Regular navigation routes
                Dashboard: getDashboardPath(),
                // Forums routes based on user role
                Forums:
                  user?.role === "researcher"
                    ? "/researcher-forums"
                    : "/forums",
                Discovery: "/discovery",
              };
              const route =
                routeMap[item] || `/${item.toLowerCase().replace(/\s+/g, "-")}`;

              // Handle Explore dropdown separately (guest Yori `/` uses a single link to public Explore page)
              if (item === "Explore") {
                if (isLandingPage && !user) {
                  return (
                    <Fragment key={`${item}-guest-landing`}>
                      <PrefetchLink
                        to="/explore"
                        className="relative group transition-all py-2"
                        data-tour="nav-explore"
                      >
                        <span className="relative z-10 text-[#2F3C96] transition-colors duration-200 group-hover:text-[#B8A5D5]">
                          {item}
                        </span>
                        <span className="absolute bottom-0 left-0 h-[3px] w-0 rounded-full bg-[#2F3C96] transition-all duration-300 group-hover:w-full" />
                      </PrefetchLink>
                      {index < navItems.length - 1 && (
                        <div
                          className="h-6 w-px"
                          style={{ backgroundColor: "#D0C4E2" }}
                        />
                      )}
                    </Fragment>
                  );
                }
                return (
                  <Fragment key={item}>
                    <div
                      ref={exploreDropdownRef}
                      className="relative"
                      onMouseEnter={() => setIsExploreDropdownOpen(true)}
                      onMouseLeave={() => setIsExploreDropdownOpen(false)}
                      data-tour="nav-explore"
                    >
                      <button className="relative group transition-all py-2 flex items-center gap-1">
                        <span
                          className="relative z-10 transition-colors duration-200"
                          style={{
                            color: isExploreDropdownOpen
                              ? "#B8A5D5"
                              : "#2F3C96",
                          }}
                        >
                          {item}
                        </span>
                        <svg
                          className="w-4 h-4 transition-transform duration-200"
                          style={{
                            color: isExploreDropdownOpen
                              ? "#B8A5D5"
                              : "#2F3C96",
                            transform: isExploreDropdownOpen
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                        <span
                          className="absolute bottom-0 left-0 h-[3px] rounded-full transition-all duration-300"
                          style={{
                            width: isExploreDropdownOpen ? "100%" : "0%",
                            backgroundColor: "#2F3C96",
                          }}
                        ></span>
                      </button>

                      {/* Explore Dropdown Menu */}
                      {isExploreDropdownOpen && (
                        <div
                          className="absolute top-full left-0 pt-2 w-48 backdrop-blur-xl rounded-2xl shadow-2xl border py-2 z-50 ui-fade-in-fast"
                          style={{
                            backgroundColor: "rgba(245, 242, 248, 0.98)",
                            borderColor: "#D0C4E2",
                          }}
                        >
                          {[
                            {
                              label: publicationsNavLabel,
                              route: publicationsNavRoute,
                              icon: (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z"
                                  />
                                </svg>
                              ),
                            },
                            {
                              label: expertsNavLabel,
                              route: "/experts",
                              icon: (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                              ),
                            },
                            {
                              label: trialsNavLabel,
                              route: "/trials",
                              icon: (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              ),
                            },
                          ].map((subItem) => (
                            <PrefetchLink
                              key={subItem.label}
                              to={subItem.route}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-150 rounded-lg mx-1"
                              style={{ color: "#2F3C96" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#E8E0EF";
                                e.currentTarget.style.color = "#474F97";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.color = "#2F3C96";
                              }}
                            >
                              {subItem.icon}
                              <span>{subItem.label}</span>
                            </PrefetchLink>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Vertical separator */}
                    {index < navItems.length - 1 && (
                      <div
                        className="h-6 w-px"
                        style={{ backgroundColor: "#D0C4E2" }}
                      />
                    )}
                  </Fragment>
                );
              }

              // Regular navigation items
              return (
                <Fragment key={item}>
                  <PrefetchLink
                    to={route}
                    className="relative group transition-all py-2"
                    {...(item === "Forums"
                      ? { "data-tour": "nav-forums" }
                      : {})}
                  >
                    <span
                      className="relative z-10 transition-colors duration-200"
                      style={{
                        color: "#2F3C96",
                      }}
                      onMouseEnter={(e) => (e.target.style.color = "#B8A5D5")}
                      onMouseLeave={(e) => (e.target.style.color = "#2F3C96")}
                    >
                      {item}
                    </span>
                    <span
                      className="absolute bottom-0 left-0 w-0 h-[3px] rounded-full transition-all duration-300 group-hover:w-full"
                      style={{ backgroundColor: "#2F3C96" }}
                    ></span>
                  </PrefetchLink>
                  {/* Vertical separator */}
                  {index < navItems.length - 1 && (
                    <div
                      className="h-6 w-px"
                      style={{ backgroundColor: "#D0C4E2" }}
                    />
                  )}
                </Fragment>
              );
            })}

            {/* Separator before buttons */}
            {navItems.length > 0 && (
              <div
                className="h-6 w-px ml-2"
                style={{ backgroundColor: "#D0C4E2" }}
              />
            )}

            {/* Global Search */}
            {/* <GlobalSearch /> */}

            <div className="flex items-center gap-3 ml-2">
              {/* Notification Bell */}
              {user && (
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="w-11 h-11 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center border backdrop-blur-sm hover:bg-[rgba(232,224,239,0.8)]"
                    style={{
                      backgroundColor: "",
                      borderColor: "rgba(47, 60, 150, 0.2)",
                      color: "#2F3C96",
                    }}
                  >
                    <IconBell className="w-5 h-5" stroke={1.75} />
                    {/* Notification dot indicator */}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {isNotificationOpen && (
                    <div
                      className="absolute right-0 mt-3 w-80 backdrop-blur-xl rounded-2xl shadow-2xl border py-4 z-50 overflow-hidden ui-fade-in-fast"
                      style={{
                        backgroundColor: "rgba(245, 242, 248, 0.95)",
                        borderColor: "#D0C4E2",
                      }}
                    >
                      <div
                        className="px-4 pb-3 border-b flex items-center justify-between"
                        style={{ borderColor: "#D0C4E2" }}
                      >
                        <h3
                          className="text-lg font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          Notifications
                        </h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const base =
                                    import.meta.env.VITE_API_URL ||
                                    "http://localhost:5000";
                                  const userId = user?._id || user?.id;
                                  if (userId) {
                                    await fetch(
                                      `${base}/api/insights/${userId}/read-all`,
                                      {
                                        method: "PATCH",
                                      },
                                    );
                                    setNotifications((prev) =>
                                      prev.map((n) => ({ ...n, read: true })),
                                    );
                                    setUnreadCount(0);
                                  }
                                } catch (error) {
                                  console.error(
                                    "Error clearing notifications:",
                                    error,
                                  );
                                }
                              }}
                              className="text-xs font-medium px-2 py-1 rounded transition-colors hover:text-[#2F3C96] hover:bg-[#E8E0EF]"
                              style={{ color: "#787878" }}
                            >
                              Clear All
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsNotificationOpen(false);
                              navigate("/notifications");
                            }}
                            className="text-xs font-medium px-2 py-1 rounded transition-colors hover:text-[#2F3C96] hover:bg-[#E8E0EF]"
                            style={{ color: "#787878" }}
                          >
                            View All
                          </button>
                        </div>
                      </div>
                      {notificationsLoading ? (
                        <div className="px-4 py-8 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-[#2F3C96] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 flex flex-col items-center justify-center">
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                            style={{ backgroundColor: "#E8E0EF" }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-8 h-8"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{ color: "#2F3C96" }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                              />
                            </svg>
                          </div>
                          <p
                            className="font-medium text-center"
                            style={{ color: "#2F3C96" }}
                          >
                            No new notifications
                          </p>
                          <p
                            className="text-sm mt-1 text-center mb-4"
                            style={{ color: "#787878" }}
                          >
                            You're all caught up!
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-[400px] overflow-y-auto">
                          {notifications.slice(0, 10).map((notification) => (
                            <div
                              key={notification._id}
                              className={`px-4 py-3 border-b transition-colors cursor-pointer ${
                                !notification.read ? "bg-[#E8E0EF]/30" : ""
                              }`}
                              style={{ borderColor: "#D0C4E2" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#E8E0EF";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  !notification.read
                                    ? "#E8E0EF/30"
                                    : "transparent";
                              }}
                              onClick={async () => {
                                if (!notification.read) {
                                  try {
                                    const base =
                                      import.meta.env.VITE_API_URL ||
                                      "http://localhost:5000";
                                    await fetch(
                                      `${base}/api/insights/${notification._id}/read`,
                                      {
                                        method: "PATCH",
                                      },
                                    );
                                    setNotifications((prev) =>
                                      prev.map((n) =>
                                        n._id === notification._id
                                          ? { ...n, read: true }
                                          : n,
                                      ),
                                    );
                                    setUnreadCount((prev) =>
                                      Math.max(0, prev - 1),
                                    );
                                  } catch (error) {
                                    console.error(
                                      "Error marking notification as read:",
                                      error,
                                    );
                                  }
                                }
                                setIsNotificationOpen(false);
                                navigate("/notifications");
                              }}
                            >
                              <p
                                className="text-sm font-medium mb-1"
                                style={{ color: "#2F3C96" }}
                              >
                                {(() => {
                                  // Format notification message
                                  if (
                                    notification.type === "new_follower" &&
                                    notification.relatedUserId
                                  ) {
                                    const followerUsername =
                                      notification.relatedUserId?.username ||
                                      notification.metadata?.followerUsername ||
                                      "Someone";
                                    const source =
                                      notification.metadata?.source;

                                    if (source) {
                                      // Format: "Ansh followed you through Forums"
                                      return `${followerUsername} followed you through ${source}`;
                                    }
                                    return `${followerUsername} followed you`;
                                  }
                                  return notification.message;
                                })()}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: "#787878" }}
                              >
                                {new Date(
                                  notification.createdAt,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* User Menu or Sign In */}
              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(!isDropdownOpen)}
                    aria-haspopup="menu"
                    aria-expanded={isDropdownOpen}
                    aria-label="Account menu"
                    className="flex items-center gap-2 px-2 py-2 rounded-full shadow-md hover:shadow-lg transition-colors duration-200 border backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2F3C96]/40 focus-visible:ring-offset-2 hover:bg-[rgba(232,224,239,0.8)]"
                    style={{
                      backgroundColor: "",
                      borderColor: "rgba(47, 60, 150, 0.2)",
                    }}
                  >
                    {/* Profile Avatar — fixed box + overflow clip stops image jump on open/click */}
                    {user?.picture && !imageError ? (
                      <span
                        className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200/90 ring-2 ring-[rgba(47,60,150,0.35)] shadow-sm [transform:translateZ(0)]"
                        aria-hidden
                      >
                        <img
                          src={user.picture}
                          alt=""
                          className="pointer-events-none h-full w-full object-cover object-center block select-none"
                          draggable={false}
                          onError={() => setImageError(true)}
                        />
                      </span>
                    ) : (
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[rgba(47,60,150,0.85)] text-white font-bold text-sm shadow-sm ring-2 ring-[rgba(47,60,150,0.35)] [transform:translateZ(0)]"
                        aria-hidden
                      >
                        {(user?.username || getDisplayName(user, "U"))
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}

                    {/* For patients: show only username (one line). For researchers: name + @handle */}
                    <div className="flex flex-col items-start min-w-0">
                      <span
                        className="text-xs font-semibold truncate max-w-[100px]"
                        style={{ color: "#2F3C96" }}
                      >
                        {user?.role === "patient"
                          ? user?.username ||
                            user?.handle ||
                            profile?.handle ||
                            user?.name ||
                            "User"
                          : getDisplayName(user, "User")}
                      </span>
                      {user?.role !== "patient" &&
                        (user?.handle || profile?.handle) && (
                          <span
                            className="text-[10px] truncate max-w-[100px] block"
                            style={{ color: "#787878" }}
                          >
                            @{user.handle || profile.handle}
                          </span>
                        )}
                    </div>

                    {/* Chevron */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{ color: "#2F3C96" }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <div
                      className="absolute right-0 mt-3 w-52 backdrop-blur-xl rounded-2xl shadow-2xl border py-2 z-50 overflow-hidden ui-fade-in-fast"
                      style={{
                        backgroundColor: "rgba(245, 242, 248, 0.95)",
                        borderColor: "#D0C4E2",
                      }}
                    >
                      <PrefetchLink
                        to="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200"
                        style={{ color: "#2F3C96" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#E8E0EF";
                          e.currentTarget.style.color = "#474F97";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#2F3C96";
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span>My Profile</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 ml-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </PrefetchLink>
                      <PrefetchLink
                        to="/favorites"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200"
                        style={{ color: "#2F3C96" }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#E8E0EF";
                          e.target.style.color = "#474F97";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#2F3C96";
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                        <span>Favorites</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 ml-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </PrefetchLink>
                      <hr className="my-2" style={{ borderColor: "#D0C4E2" }} />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200"
                        style={{ color: "#dc2626" }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#fee2e2";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>SignOut</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 ml-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ) : isLandingPage ? (
                <button
                  type="button"
                  onClick={() => navigate("/onboarding")}
                  className="px-6 py-2.5 rounded-xl font-bold text-[14px] uppercase tracking-wider transition-all active:scale-[0.97] shadow-[0_4px_0_0_#1c2459] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_0px_0_0_#1c2459]"
                  style={{ backgroundColor: "#2F3C96", color: "#FFFFFF" }}
                >
                  Get Started
                </button>
              ) : (
                <div>
                  <PrefetchLink
                    to="/signin"
                    className="px-6 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-semibold border-2 text-white"
                    style={{
                      background: "linear-gradient(135deg, #2F3C96, #474F97)",
                      borderColor: "#D0C4E2",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background =
                        "linear-gradient(135deg, #474F97, #2F3C96)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background =
                        "linear-gradient(135deg, #2F3C96, #474F97)";
                    }}
                  >
                    Sign In
                  </PrefetchLink>
                </div>
              )}
            </div>
          </nav>
        )}

        {/* Mobile Hamburger - hidden on admin routes only */}
        {!isLogoOnlyNav && (
          <div className="sm:hidden flex items-center gap-2">
            {/* Notification Bell for Mobile */}
            {user && (
              <button
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="w-10 h-10 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center border backdrop-blur-sm relative hover:bg-[rgba(232,224,239,0.8)]"
                style={{
                  backgroundColor: "rgba(245, 242, 248, 0.7)",
                  borderColor: "rgba(47, 60, 150, 0.2)",
                  color: "#2F3C96",
                }}
              >
                <IconBell className="w-5 h-5" stroke={1.75} />
                {/* Notification dot indicator */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            )}

            <button
              ref={mobileMenuButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen((prev) => !prev);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-md"
              style={{
                background: "linear-gradient(135deg, #F5F2F8, #E8E0EF)",
                borderColor: "#D0C4E2",
                color: "#2F3C96",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        )}
      </div>

      {isMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="pointer-events-auto absolute top-20 left-4 right-4 mx-auto rounded-2xl backdrop-blur-2xl border shadow-2xl py-4 px-4 flex flex-col items-stretch gap-2.5 sm:hidden z-50 max-h-[70vh] overflow-y-auto ui-fade-in-fast"
          style={{
            backgroundColor: "rgba(245, 242, 248, 0.95)",
            borderColor: "#D0C4E2",
          }}
        >
          {/* Global Search - Mobile */}
          {/* <div className="pb-4 border-b" style={{ borderColor: "#D0C4E2" }}>
              <GlobalSearch />
            </div> */}

          {/* `/` Yori guest: Explore → /explore (matches desktop nav item) */}
          {!user && isLandingPage && (
            <div
              className="space-y-1.5 pb-3 border-b"
              style={{ borderColor: "#D0C4E2" }}
            >
              <PrefetchLink
                to="/explore"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 w-full text-base font-medium rounded-xl py-2 px-3 transition-all duration-200 group"
                style={{ color: "#2F3C96" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#E8E0EF";
                  e.currentTarget.style.color = "#474F97";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#2F3C96";
                }}
              >
                <span
                  className="p-1.5 rounded-lg group-hover:scale-110 transition-all duration-200"
                  style={{ backgroundColor: "#E8E0EF", color: "#2F3C96" }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                Explore
              </PrefetchLink>
            </div>
          )}

          {/* Mobile menu - signed-in users only see account actions */}
          {user ? (
            <div
              className="space-y-1.5 pb-3 border-b"
              style={{ borderColor: "#D0C4E2" }}
            >
              <PrefetchLink
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 w-full text-base font-medium rounded-xl py-2 px-3 transition-all duration-200 group"
                style={{ color: "#2F3C96" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#E8E0EF";
                  e.currentTarget.style.color = "#474F97";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#2F3C96";
                }}
              >
                <span
                  className="p-1.5 rounded-lg group-hover:scale-110 transition-all duration-200"
                  style={{ backgroundColor: "#E8E0EF", color: "#2F3C96" }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </span>
                My Profile
              </PrefetchLink>

              <PrefetchLink
                to="/favorites"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 w-full text-base font-medium rounded-xl py-2 px-3 transition-all duration-200 group"
                style={{ color: "#2F3C96" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#E8E0EF";
                  e.currentTarget.style.color = "#474F97";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#2F3C96";
                }}
              >
                <span
                  className="p-1.5 rounded-lg group-hover:scale-110 transition-all duration-200"
                  style={{ backgroundColor: "#E8E0EF", color: "#2F3C96" }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </span>
                Favourites
              </PrefetchLink>
            </div>
          ) : null}

          {/* Auth Button */}
          <div className="pt-1.5">
            {user ? (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-center text-base font-semibold text-white py-2.5 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #dc2626, #ef4444)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #ef4444, #dc2626)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #dc2626, #ef4444)";
                }}
              >
                Sign out
              </button>
            ) : isLandingPage ? (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate("/onboarding");
                }}
                className="w-full text-center text-base font-bold uppercase tracking-wider text-white py-2.5 rounded-xl shadow-[0_4px_0_0_#1c2459] transition-all duration-200 transform hover:scale-[1.02] active:translate-y-[2px] active:shadow-[0_0px_0_0_#1c2459]"
                style={{ backgroundColor: "#2F3C96" }}
              >
                Get Started
              </button>
            ) : (
              <PrefetchLink
                to="/signin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center w-full text-center text-base font-semibold text-white py-2.5 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #2F3C96, #474F97)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #474F97, #2F3C96)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #2F3C96, #474F97)";
                }}
              >
                Sign In
              </PrefetchLink>
            )}
          </div>
        </div>
      )}

      {/* Mobile Notification Dropdown */}
      {isNotificationOpen && user && (
        <div className="pointer-events-auto absolute top-24 right-4 left-4 mx-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-indigo-200/60 shadow-2xl py-6 px-6 sm:hidden z-50 ui-fade-in-fast">
          <div className="px-2 pb-4 border-b border-indigo-200/60 mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const base =
                        import.meta.env.VITE_API_URL || "http://localhost:5000";
                      const userId = user?._id || user?.id;
                      if (userId) {
                        await fetch(`${base}/api/insights/${userId}/read-all`, {
                          method: "PATCH",
                        });
                        setNotifications((prev) =>
                          prev.map((n) => ({ ...n, read: true })),
                        );
                        setUnreadCount(0);
                      }
                    } catch (error) {
                      console.error("Error clearing notifications:", error);
                    }
                  }}
                  className="text-xs font-medium px-2 py-1 rounded transition-colors text-gray-500 hover:text-[#2F3C96] hover:bg-[#E8E0EF]"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNotificationOpen(false);
                  navigate("/notifications");
                }}
                className="text-xs font-medium px-2 py-1 rounded transition-colors text-gray-500 hover:text-[#2F3C96] hover:bg-[#E8E0EF]"
              >
                View All
              </button>
            </div>
          </div>
          {notificationsLoading ? (
            <div className="px-2 py-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-2 py-8 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-10 h-10 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <p className="text-gray-600 font-semibold text-center text-lg">
                No new notifications
              </p>
              <p className="text-sm text-gray-400 mt-2 text-center mb-4">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification._id}
                  className={`px-2 py-3 border-b transition-colors cursor-pointer ${
                    !notification.read ? "bg-indigo-50" : ""
                  }`}
                  style={{ borderColor: "#D0C4E2" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E8E0EF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = !notification.read
                      ? "#E8E0EF/30"
                      : "transparent";
                  }}
                  onClick={async () => {
                    if (!notification.read) {
                      try {
                        const base =
                          import.meta.env.VITE_API_URL ||
                          "http://localhost:5000";
                        await fetch(
                          `${base}/api/insights/${notification._id}/read`,
                          {
                            method: "PATCH",
                          },
                        );
                        setNotifications((prev) =>
                          prev.map((n) =>
                            n._id === notification._id
                              ? { ...n, read: true }
                              : n,
                          ),
                        );
                        setUnreadCount((prev) => Math.max(0, prev - 1));
                      } catch (error) {
                        console.error(
                          "Error marking notification as read:",
                          error,
                        );
                      }
                    }
                    setIsNotificationOpen(false);
                    navigate("/notifications");
                  }}
                >
                  <p className="text-sm font-medium mb-1 text-gray-800">
                    {(() => {
                      // Format notification message
                      if (
                        notification.type === "new_follower" &&
                        notification.relatedUserId
                      ) {
                        const followerUsername =
                          notification.relatedUserId?.username ||
                          notification.metadata?.followerUsername ||
                          "Someone";
                        const source = notification.metadata?.source;

                        if (source) {
                          // Format: "Ansh followed you through Forums"
                          return `${followerUsername} followed you through ${source}`;
                        }
                        return `${followerUsername} followed you`;
                      }
                      return notification.message;
                    })()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(notification.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
