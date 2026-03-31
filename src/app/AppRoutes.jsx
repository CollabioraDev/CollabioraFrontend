import { Routes, Route, Navigate } from "react-router-dom";
import {
  AuthenticatedRedirect,
  DashboardRedirect,
  ProfileGuard,
} from "./guards.jsx";
import {
  AboutUs,
  AdminDashboard,
  AdminExpertProfile,
  AdminLogin,
  Auth0Callback,
  Blogs,
  CollabioraExpertProfile,
  CompleteProfile,
  ContactUs,
  CookiePolicy,
  CuratedTrialsManage,
  CurateTrials,
  DashboardPatient,
  DashboardResearcher,
  Discovery,
  DiscoveryBlogDetails,
  EditProfile,
  EmailPreferences,
  ErrorPage,
  ExpertProfile,
  Experts,
  Explore,
  FAQ,
  Favorites,
  ForgotPassword,
  ForumCommunityPage,
  Forums,
  HowItWorks,
  Landing,
  YoriGuestLandingPage,
  ManageTrials,
  MeetingRoom,
  Notifications,
  OnboardingNew,
  OrcidCallback,
  PressReleasePCLADetails,
  PressReleaseYoriDetails,
  PrivacyPolicyAndTerms,
  PublicationDetails,
  Publications,
  ResearcherCommunityPage,
  ResearcherForums,
  ResetPassword,
  SignIn,
  TrialDetails,
  Trials,
  Trending,
  VerifyEmail,
  YoriAI,
} from "./lazyPages.js";

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthenticatedRedirect>
            <YoriGuestLandingPage />
          </AuthenticatedRedirect>
        }
      />
      <Route path="/home" element={<Landing />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/contact" element={<ContactUs />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/privacy" element={<PrivacyPolicyAndTerms />} />
      <Route path="/terms" element={<PrivacyPolicyAndTerms />} />
      <Route path="/cookie-policy" element={<CookiePolicy />} />
      <Route path="/explore" element={<Explore />} />
      <Route
        path="/signin"
        element={
          <AuthenticatedRedirect>
            <SignIn />
          </AuthenticatedRedirect>
        }
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/onboarding"
        element={
          <AuthenticatedRedirect allowIncomplete>
            <OnboardingNew />
          </AuthenticatedRedirect>
        }
      />
      <Route
        path="/onboard/patient"
        element={<Navigate to="/onboarding" replace />}
      />
      <Route
        path="/onboard/researcher"
        element={<Navigate to="/onboarding" replace />}
      />
      <Route path="/yori" element={<YoriAI />} />
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route
        path="/dashboard/patient"
        element={
          <ProfileGuard>
            <DashboardPatient />
          </ProfileGuard>
        }
      />
      <Route
        path="/dashboard/researcher"
        element={
          <ProfileGuard>
            <DashboardResearcher />
          </ProfileGuard>
        }
      />
      <Route path="/trials" element={<Trials />} />
      <Route path="/curate-trials" element={<CurateTrials />} />
      <Route path="/curate-trials/manage" element={<CuratedTrialsManage />} />
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
      <Route path="/forums/community/:id" element={<ForumCommunityPage />} />
      <Route path="/trending" element={<Trending />} />
      <Route path="/discovery" element={<Discovery />} />
      <Route path="/blogs" element={<Blogs />} />
      <Route path="/blogs/:slug" element={<DiscoveryBlogDetails />} />
      <Route
        path="/discovery/blogs/:slug"
        element={<DiscoveryBlogDetails />}
      />
      <Route
        path="/press-releases/pcla-partnership"
        element={<PressReleasePCLADetails />}
      />
      <Route
        path="/press-releases/yori"
        element={<PressReleaseYoriDetails />}
      />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/manage-trials" element={<ManageTrials />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route
        path="/meeting/:appointmentId"
        element={
          <ProfileGuard>
            <MeetingRoom />
          </ProfileGuard>
        }
      />
      <Route path="/profile" element={<EditProfile />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/expert/:userId" element={<AdminExpertProfile />} />
      <Route path="/auth/callback" element={<Auth0Callback />} />
      <Route path="/auth/complete-profile" element={<CompleteProfile />} />
      <Route path="/auth/orcid/callback" element={<OrcidCallback />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/email-preferences" element={<EmailPreferences />} />
      <Route path="/404" element={<ErrorPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
