import React, { Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";
import Navbar from "./components/Navbar.jsx";
import LandingNavbar from "./components/LandingNavbar.jsx";
import { ProfileProvider } from "./contexts/ProfileContext.jsx";
import Auth0ProviderWithNavigate from "./contexts/Auth0ProviderWithNavigate.jsx";
import FeedbackWidget from "./components/FeedbackWidget.jsx";
import PageFeedbackWidget from "./components/PageFeedbackWidget.jsx";
import PWAInstallPrompt from "./components/PWAInstallPrompt.jsx";
import OnboardPatient from "./Pages/OnboardPatient.jsx";

// Lazy-loaded page components (onboarding is eager — it's the primary CTA on the landing page)
const Landing = React.lazy(() => import("./Pages/Landing.jsx"));
const Explore = React.lazy(() => import("./Pages/Explore.jsx"));
const SignIn = React.lazy(() => import("./Pages/SignIn.jsx"));
const DashboardPatient = React.lazy(
  () => import("./Pages/DashboardPatient.jsx"),
);
const DashboardResearcher = React.lazy(
  () => import("./Pages/DashboardResearcher.jsx"),
);
const Trials = React.lazy(() => import("./Pages/Trials.jsx"));
const Publications = React.lazy(() => import("./Pages/Publications.jsx"));
const Experts = React.lazy(() => import("./Pages/Experts.jsx"));
const ExpertProfile = React.lazy(() => import("./Pages/ExpertProfile.jsx"));
const CollabioraExpertProfile = React.lazy(
  () => import("./Pages/CuraLinkExpertProfile.jsx"),
);
const Forums = React.lazy(() => import("./Pages/Forums.jsx"));
const ResearcherForums = React.lazy(
  () => import("./Pages/ResearcherForums.jsx"),
);
const ForumCommunityPage = React.lazy(
  () => import("./Pages/ForumCommunityPage.jsx"),
);
const ResearcherCommunityPage = React.lazy(
  () => import("./Pages/ResearcherCommunityPage.jsx"),
);
const Favorites = React.lazy(() => import("./Pages/Favorites.jsx"));
const ManageTrials = React.lazy(() => import("./Pages/ManageTrials.jsx"));
const EditProfile = React.lazy(() => import("./Pages/EditProfile.jsx"));
const AdminLogin = React.lazy(() => import("./Pages/AdminLogin.jsx"));
const AdminDashboard = React.lazy(() => import("./Pages/AdminDashboard.jsx"));
const AdminExpertProfile = React.lazy(
  () => import("./Pages/AdminExpertProfile.jsx"),
);
const Auth0Callback = React.lazy(() => import("./Pages/Auth0Callback.jsx"));
const CompleteProfile = React.lazy(() => import("./Pages/CompleteProfile.jsx"));
const OrcidCallback = React.lazy(() => import("./Pages/OrcidCallback.jsx"));
const AboutUs = React.lazy(() => import("./Pages/AboutUs.jsx"));
const ContactUs = React.lazy(() => import("./Pages/ContactUs.jsx"));
const FAQ = React.lazy(() => import("./Pages/FAQ.jsx"));
const PrivacyPolicyAndTerms = React.lazy(
  () => import("./Pages/PrivacyPolicyAndTerms.jsx"),
);
const CookiePolicy = React.lazy(() => import("./Pages/CookiePolicy.jsx"));
const TrialDetails = React.lazy(() => import("./Pages/TrialDetails.jsx"));
const PublicationDetails = React.lazy(
  () => import("./Pages/PublicationDetails.jsx"),
);
const VerifyEmail = React.lazy(() => import("./Pages/VerifyEmail.jsx"));
const ForgotPassword = React.lazy(() => import("./Pages/ForgotPassword.jsx"));
const ResetPassword = React.lazy(() => import("./Pages/ResetPassword.jsx"));
const Discovery = React.lazy(() => import("./Pages/Discovery.jsx"));
const Notifications = React.lazy(() => import("./Pages/Notifications.jsx"));
const Trending = React.lazy(() => import("./Pages/Trending.jsx"));
const ErrorPage = React.lazy(() => import("./Pages/ErrorPage.jsx"));
const FloatingChatbot = React.lazy(
  () => import("./components/FloatingChatbot.jsx"),
);

// Redirect /dashboard to the correct dashboard based on user role
function DashboardRedirect() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role || "patient";
  return <Navigate to={`/dashboard/${role}`} replace />;
}

// Lightweight fallback so route transitions feel snappy (chunk usually already prefetched on hover)
function RouteFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      aria-hidden="true"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2F3C96] border-t-transparent" />
    </div>
  );
}

const AppContent = () => {
  const location = useLocation();
  const [showChatbot, setShowChatbot] = useState(false);
  const isVerifyEmailPage = location.pathname === "/verify-email";
  const isAdminPage = location.pathname.startsWith("/admin");
  const isErrorPage = location.pathname === "/404";
  const isHomePage = location.pathname === "/";
  const showLayout = !isVerifyEmailPage && !isAdminPage && !isErrorPage;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowChatbot(true);
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div>
      {showLayout && (isHomePage ? <LandingNavbar /> : <Navbar />)}
      {showLayout && showChatbot && (
        <Suspense fallback={null}>
          <FloatingChatbot />
        </Suspense>
      )}
      <PWAInstallPrompt />
      {showLayout && isHomePage && <FeedbackWidget />}
      {showLayout && <PageFeedbackWidget />}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options
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
          // Success toast
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
          // Error toast
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
          // Loading toast
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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<PrivacyPolicyAndTerms />} />
          <Route path="/terms" element={<PrivacyPolicyAndTerms />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<OnboardPatient />} />
          <Route
            path="/onboard/patient"
            element={<Navigate to="/onboarding" replace />}
          />
          <Route
            path="/onboard/researcher"
            element={<Navigate to="/onboarding" replace />}
          />
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="/dashboard/patient" element={<DashboardPatient />} />
          <Route
            path="/dashboard/researcher"
            element={<DashboardResearcher />}
          />
          <Route path="/trials" element={<Trials />} />
          <Route path="/trial/:nctId" element={<TrialDetails />} />
          <Route path="/publications" element={<Publications />} />
          <Route path="/library" element={<Publications />} />
          <Route path="/publication/:pmid" element={<PublicationDetails />} />
          <Route path="/experts" element={<Experts />} />
          <Route path="/expert/profile" element={<ExpertProfile />} />
          <Route
            path="/collabiora-expert/profile/:userId"
            element={<CollabioraExpertProfile />}
          />
          <Route path="/forums" element={<Forums />} />
          <Route path="/researcher-forums" element={<ResearcherForums />} />
          <Route
            path="/researcher-forums/community/:id"
            element={<ResearcherCommunityPage />}
          />
          <Route
            path="/forums/community/:id"
            element={<ForumCommunityPage />}
          />
          <Route path="/trending" element={<Trending />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/manage-trials" element={<ManageTrials />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<EditProfile />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route
            path="/admin/expert/:userId"
            element={<AdminExpertProfile />}
          />
          {/* Auth0 routes */}
          <Route path="/auth/callback" element={<Auth0Callback />} />
          <Route path="/auth/complete-profile" element={<CompleteProfile />} />
          {/* ORCID OAuth callback */}
          <Route path="/auth/orcid/callback" element={<OrcidCallback />} />
          {/* Email verification */}
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/404" element={<ErrorPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
      {/* Nav is provided by Navbar in Layout */}
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
