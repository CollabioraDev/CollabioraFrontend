import React, { Suspense, useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";
import { ProfileProvider } from "./contexts/ProfileContext.jsx";
import Auth0ProviderWithNavigate from "./contexts/Auth0ProviderWithNavigate.jsx";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import PWAInstallPrompt from "./components/PWAInstallPrompt.jsx";
import {
  installAuthFetchInterceptor,
  startSessionAutoRefresh,
} from "./utils/api.js";
import { AppRoutes } from "./app/AppRoutes.jsx";
import { RouteFallback } from "./app/routeFallback.jsx";
import { FloatingChatbot, LandingNavbar, Navbar } from "./app/lazyPages.js";

const AppContent = () => {
  const location = useLocation();
  const [showChatbot, setShowChatbot] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);
  const isVerifyEmailPage = location.pathname === "/verify-email";
  const isAdminPage = location.pathname.startsWith("/admin");
  const isErrorPage = location.pathname === "/404";
  const isHomePage = location.pathname === "/";
  const isMarketingHome = location.pathname === "/home";
  const isSignInPage = location.pathname === "/signin";
  const isOnboardingPage = location.pathname === "/onboarding";
  const isEditProfilePage = location.pathname === "/profile";
  const isYoriPage = location.pathname === "/yori";
  const isMeetingPage = location.pathname.startsWith("/meeting/");
  const isCurateTrialsPage =
    location.pathname === "/curate-trials" ||
    location.pathname.startsWith("/curate-trials/");
  const isAuthCallbackPage =
    location.pathname === "/auth/callback" ||
    location.pathname === "/auth/orcid/callback";
  const showLayout = !isVerifyEmailPage && !isAdminPage && !isErrorPage;

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  const [isSignedIn, setIsSignedIn] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      return Boolean(stored?._id || stored?.id);
    } catch {
      return false;
    }
  });
  const [userRole, setUserRole] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      return stored?.role || "patient";
    } catch {
      return "patient";
    }
  });

  useEffect(() => {
    installAuthFetchInterceptor();
    startSessionAutoRefresh();
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const syncUserState = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "null");
        setIsSignedIn(Boolean(stored?._id || stored?.id));
        setUserRole(stored?.role || "patient");
      } catch {
        setIsSignedIn(false);
        setUserRole("patient");
      }
    };
    syncUserState();
    window.addEventListener("login", syncUserState);
    window.addEventListener("logout", syncUserState);
    window.addEventListener("userUpdated", syncUserState);
    window.addEventListener("storage", syncUserState);
    return () => {
      window.removeEventListener("login", syncUserState);
      window.removeEventListener("logout", syncUserState);
      window.removeEventListener("userUpdated", syncUserState);
      window.removeEventListener("storage", syncUserState);
    };
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowChatbot(true);
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, []);

  const isPatient = userRole === "patient";

  return (
    <div>
      {showLayout && (
        <Suspense fallback={null}>
          {isMarketingHome ? <LandingNavbar /> : <Navbar />}
        </Suspense>
      )}
      {showLayout &&
        showChatbot &&
        !isHomePage &&
        !isSignInPage &&
        !isYoriPage &&
        !isMeetingPage &&
        !isOnboardingPage &&
        !isAuthCallbackPage &&
        !isCurateTrialsPage &&
        !(isMobile && isEditProfilePage) && (
          <Suspense fallback={null}>
            <FloatingChatbot />
          </Suspense>
        )}
      <PWAInstallPrompt />
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          className: "toast-notification",
          duration: 4000,
          style: {
            background: "#ffffff",
            color: "#2F3C96",
            padding: "16px 20px",
            borderRadius: "12px",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(47, 60, 150, 0.1)",
            fontSize: "14px",
            fontWeight: "500",
            maxWidth: "420px",
            minWidth: "300px",
          },
          success: {
            duration: 4000,
            iconTheme: {
              primary: "#10b981",
              secondary: "#ffffff",
            },
            style: {
              background: "#ffffff",
              color: "#065f46",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              boxShadow:
                "0 10px 25px -5px rgba(16, 185, 129, 0.15), 0 8px 10px -6px rgba(16, 185, 129, 0.1)",
            },
            className: "toast-success",
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#ffffff",
            },
            style: {
              background: "#ffffff",
              color: "#991b1b",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              boxShadow:
                "0 10px 25px -5px rgba(239, 68, 68, 0.15), 0 8px 10px -6px rgba(239, 68, 68, 0.1)",
            },
            className: "toast-error",
          },
          loading: {
            iconTheme: {
              primary: "#2F3C96",
              secondary: "#ffffff",
            },
            style: {
              background: "#ffffff",
              color: "#2F3C96",
              border: "1px solid rgba(47, 60, 150, 0.2)",
            },
            className: "toast-loading",
          },
        }}
      />
      <Suspense fallback={<RouteFallback />}>
        <main id="main-content">
          <AppRoutes />
        </main>
      </Suspense>
      {showLayout &&
        isMobile &&
        isSignedIn &&
        !isCurateTrialsPage && (
          <MobileBottomNav isPatient={isPatient} />
        )}
    </div>
  );
};

const App = () => {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <Auth0ProviderWithNavigate>
          <AppContent />
        </Auth0ProviderWithNavigate>
      </BrowserRouter>
    </ProfileProvider>
  );
};

export default App;
