import React from "react";

// Navbars — lazy to shave framer-motion + icons from initial chunk
export const Navbar = React.lazy(() => import("../components/Navbar.jsx"));
export const LandingNavbar = React.lazy(() =>
  import("../components/LandingNavbar.jsx"),
);

export const OnboardingNew = React.lazy(() =>
  import("../Pages/OnboardingNew.jsx"),
);

export const Landing = React.lazy(() => import("../Pages/Landing.jsx"));
export const YoriGuestLandingPage = React.lazy(() =>
  import("../Pages/YoriGuestLandingPage.jsx"),
);
export const Explore = React.lazy(() => import("../Pages/Explore.jsx"));
export const SignIn = React.lazy(() => import("../Pages/SignIn.jsx"));
export const DashboardPatient = React.lazy(() =>
  import("../Pages/DashboardPatient.jsx"),
);
export const DashboardResearcher = React.lazy(() =>
  import("../Pages/DashboardResearcher.jsx"),
);
export const Trials = React.lazy(() => import("../Pages/Trials.jsx"));
export const CurateTrials = React.lazy(() =>
  import("../Pages/CurateTrials.jsx"),
);
export const CuratedTrialsManage = React.lazy(() =>
  import("../Pages/CuratedTrialsManage.jsx"),
);
export const Publications = React.lazy(() =>
  import("../Pages/Publications.jsx"),
);
export const Experts = React.lazy(() => import("../Pages/Experts.jsx"));
export const ExpertProfile = React.lazy(() =>
  import("../Pages/ExpertProfile.jsx"),
);
export const CollabioraExpertProfile = React.lazy(() =>
  import("../Pages/CuraLinkExpertProfile.jsx"),
);
export const Forums = React.lazy(() => import("../Pages/Forums.jsx"));
export const ResearcherForums = React.lazy(() =>
  import("../Pages/ResearcherForums.jsx"),
);
export const ForumCommunityPage = React.lazy(() =>
  import("../Pages/ForumCommunityPage.jsx"),
);
export const ResearcherCommunityPage = React.lazy(() =>
  import("../Pages/ResearcherCommunityPage.jsx"),
);
export const Favorites = React.lazy(() => import("../Pages/Favorites.jsx"));
export const ManageTrials = React.lazy(() =>
  import("../Pages/ManageTrials.jsx"),
);
export const EditProfile = React.lazy(() => import("../Pages/EditProfile.jsx"));
export const AdminLogin = React.lazy(() => import("../Pages/AdminLogin.jsx"));
export const AdminDashboard = React.lazy(() =>
  import("../Pages/AdminDashboard.jsx"),
);
export const AdminExpertProfile = React.lazy(() =>
  import("../Pages/AdminExpertProfile.jsx"),
);
export const Auth0Callback = React.lazy(() =>
  import("../Pages/Auth0Callback.jsx"),
);
export const CompleteProfile = React.lazy(() =>
  import("../Pages/CompleteProfile.jsx"),
);
export const OrcidCallback = React.lazy(() =>
  import("../Pages/OrcidCallback.jsx"),
);
export const AboutUs = React.lazy(() => import("../Pages/AboutUs.jsx"));
export const ContactUs = React.lazy(() => import("../Pages/ContactUs.jsx"));
export const FAQ = React.lazy(() => import("../Pages/FAQ.jsx"));
export const PrivacyPolicyAndTerms = React.lazy(() =>
  import("../Pages/PrivacyPolicyAndTerms.jsx"),
);
export const CookiePolicy = React.lazy(() =>
  import("../Pages/CookiePolicy.jsx"),
);
export const HowItWorks = React.lazy(() => import("../Pages/HowItWorks.jsx"));
export const TrialDetails = React.lazy(() =>
  import("../Pages/TrialDetails.jsx"),
);
export const PublicationDetails = React.lazy(() =>
  import("../Pages/PublicationDetails.jsx"),
);
export const VerifyEmail = React.lazy(() => import("../Pages/VerifyEmail.jsx"));
export const ForgotPassword = React.lazy(() =>
  import("../Pages/ForgotPassword.jsx"),
);
export const ResetPassword = React.lazy(() =>
  import("../Pages/ResetPassword.jsx"),
);
export const Discovery = React.lazy(() => import("../Pages/Discovery.jsx"));
export const Blogs = React.lazy(() => import("../Pages/Blogs.jsx"));
export const DiscoveryBlogDetails = React.lazy(() =>
  import("../Pages/DiscoveryBlogDetails.jsx"),
);
export const PressReleaseYoriDetails = React.lazy(() =>
  import("../Pages/PressReleaseYoriDetails.jsx"),
);
export const PressReleasePCLADetails = React.lazy(() =>
  import("../Pages/PressReleasePCLADetails.jsx"),
);
export const Notifications = React.lazy(() =>
  import("../Pages/Notifications.jsx"),
);
export const Trending = React.lazy(() => import("../Pages/Trending.jsx"));
export const ErrorPage = React.lazy(() => import("../Pages/ErrorPage.jsx"));
export const YoriAI = React.lazy(() => import("../Pages/Chatbot.jsx"));
export const FloatingChatbot = React.lazy(() =>
  import("../features/chat/FloatingChatbot.jsx"),
);
export const MeetingRoom = React.lazy(() =>
  import("../Pages/MeetingRoom.jsx"),
);
export const EmailPreferences = React.lazy(() =>
  import("../Pages/EmailPreferences.jsx"),
);
