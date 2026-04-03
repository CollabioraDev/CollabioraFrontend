import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout.jsx";
import Button from "../../components/ui/Button.jsx";
import toast from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  Mail,
  MapPin,
  User,
  Loader2,
  LogOut,
  Briefcase,
  Search,
  RefreshCw,
  Database,
  Globe,
  BarChart3,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Users,
  UserCircle,
  Trash2,
  Plus,
  Calendar,
  MessageCircle,
  Hash,
  Info,
  FlaskConical,
  BookOpen,
  Eye,
  ExternalLink,
  FileCheck,
  Star,
  CheckSquare,
  Square,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Filter,
  ClipboardList,
  StickyNote,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
  Menu,
  X,
  Send,
  History,
} from "lucide-react";
import { jsPDF } from "jspdf";
import {
  parseDisplayNameFromEmail,
  extractEmailsFromBulkText,
  deriveLastNameFromDisplayName,
} from "../../utils/parseResearcherEmailName.js";

// --- Export helpers for experts/patients (TXT & PDF) ---
function downloadAsText(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(val) {
  if (val == null) return "";
  const s = String(val).trim();
  if (
    s.includes(",") ||
    s.includes('"') ||
    s.includes("\n") ||
    s.includes("\r")
  ) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function downloadAsCsv(content, filename) {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportExpertsAsTxt(experts) {
  const lines = [
    "collabiora – Experts / Researchers Export",
    "Generated: " + new Date().toLocaleString(),
    "",
  ];
  experts.forEach((e, i) => {
    const loc = e.location
      ? e.location.city
        ? `${e.location.city}, ${e.location.country}`
        : e.location.country
      : "";
    lines.push(`${i + 1}. ${e.name || "—"}`);
    if (e.email) lines.push(`   Email: ${e.email}`);
    lines.push(`   Verified: ${e.isVerified ? "Yes" : "No"}`);
    if (loc) lines.push(`   Location: ${loc}`);
    if (e.specialties?.length)
      lines.push(`   Specialties: ${e.specialties.join(", ")}`);
    if (e.accountCreated)
      lines.push(
        `   Account created: ${new Date(e.accountCreated).toLocaleDateString()}`,
      );
    lines.push("");
  });
  downloadAsText(lines.join("\n"), "experts-export.txt");
}

function exportExpertsAsPdf(experts) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;
  doc.setFontSize(14);
  doc.text("collabiora – Experts / Researchers", 14, y);
  y += 8;
  doc.setFontSize(9);
  doc.text("Generated: " + new Date().toLocaleString(), 14, y);
  y += 10;
  doc.setFontSize(10);
  experts.forEach((e, i) => {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    const loc = e.location
      ? e.location.city
        ? `${e.location.city}, ${e.location.country}`
        : e.location.country
      : "";
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}. ${(e.name || "—").substring(0, 60)}`, 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    if (e.email) {
      doc.text(`Email: ${e.email.substring(0, 80)}`, 14, y);
      y += 5;
    }
    doc.text(`Verified: ${e.isVerified ? "Yes" : "No"}`, 14, y);
    y += 5;
    if (loc) {
      doc.text(`Location: ${loc.substring(0, 80)}`, 14, y);
      y += 5;
    }
    if (e.specialties?.length) {
      doc.text(
        `Specialties: ${e.specialties.join(", ").substring(0, 100)}`,
        14,
        y,
      );
      y += 5;
    }
    if (e.accountCreated) {
      doc.text(
        `Account created: ${new Date(e.accountCreated).toLocaleDateString()}`,
        14,
        y,
      );
      y += 5;
    }
    y += 4;
  });
  doc.save("experts-export.pdf");
}

function exportExpertsAsCsv(experts) {
  const headers = [
    "#",
    "Name",
    "Email",
    "Verified",
    "Location",
    "Specialties",
    "Account created",
  ];
  const rows = experts.map((e, i) => {
    const loc = e.location
      ? e.location.city
        ? `${e.location.city}, ${e.location.country}`
        : e.location.country
      : "";
    return [
      i + 1,
      e.name || "",
      e.email || "",
      e.isVerified ? "Yes" : "No",
      loc,
      e.specialties && e.specialties.length ? e.specialties.join("; ") : "",
      e.accountCreated ? new Date(e.accountCreated).toLocaleDateString() : "",
    ]
      .map(escapeCsvCell)
      .join(",");
  });
  const csv = [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");
  downloadAsCsv(csv, "experts-export.csv");
}

function exportPatientsAsTxt(patients) {
  const lines = [
    "collabiora – Patients Export",
    "Generated: " + new Date().toLocaleString(),
    "",
  ];
  patients.forEach((p, i) => {
    const loc = p.location
      ? p.location.city
        ? `${p.location.city}, ${p.location.country}`
        : p.location.country
      : "";
    lines.push(`${i + 1}. ${p.name || "—"}`);
    if (p.email) lines.push(`   Email: ${p.email}`);
    if (loc) lines.push(`   Location: ${loc}`);
    if (p.conditions?.length)
      lines.push(`   Conditions: ${p.conditions.join(", ")}`);
    if (p.accountCreated)
      lines.push(
        `   Account created: ${new Date(p.accountCreated).toLocaleDateString()}`,
      );
    lines.push("");
  });
  downloadAsText(lines.join("\n"), "patients-export.txt");
}

function exportPatientsAsPdf(patients) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 15;
  doc.setFontSize(14);
  doc.text("collabiora – Patients", 14, y);
  y += 8;
  doc.setFontSize(9);
  doc.text("Generated: " + new Date().toLocaleString(), 14, y);
  y += 10;
  doc.setFontSize(10);
  patients.forEach((p, i) => {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    const loc = p.location
      ? p.location.city
        ? `${p.location.city}, ${p.location.country}`
        : p.location.country
      : "";
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}. ${(p.name || "—").substring(0, 60)}`, 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    if (p.email) {
      doc.text(`Email: ${p.email.substring(0, 80)}`, 14, y);
      y += 5;
    }
    if (loc) {
      doc.text(`Location: ${loc.substring(0, 80)}`, 14, y);
      y += 5;
    }
    if (p.conditions?.length) {
      doc.text(
        `Conditions: ${p.conditions.join(", ").substring(0, 100)}`,
        14,
        y,
      );
      y += 5;
    }
    if (p.accountCreated) {
      doc.text(
        `Account created: ${new Date(p.accountCreated).toLocaleDateString()}`,
        14,
        y,
      );
      y += 5;
    }
    y += 4;
  });
  doc.save("patients-export.pdf");
}

function exportPatientsAsCsv(patients) {
  const headers = [
    "#",
    "Name",
    "Email",
    "Location",
    "Conditions",
    "Account created",
  ];
  const rows = patients.map((p, i) => {
    const loc = p.location
      ? p.location.city
        ? `${p.location.city}, ${p.location.country}`
        : p.location.country
      : "";
    return [
      i + 1,
      p.name || "",
      p.email || "",
      loc,
      p.conditions && p.conditions.length ? p.conditions.join("; ") : "",
      p.accountCreated ? new Date(p.accountCreated).toLocaleDateString() : "",
    ]
      .map(escapeCsvCell)
      .join(",");
  });
  const csv = [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");
  downloadAsCsv(csv, "patients-export.csv");
}

// Mini SVG line chart for overview (no deps)
function MiniLineChart({
  data,
  valueKey,
  color = "#2F3C96",
  height = 48,
  width = "100%",
}) {
  const values = data.map((d) => d[valueKey] ?? 0);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const w = typeof width === "number" ? width : 280;
  const padding = 4;
  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1 || 1)) * (w - 2 * padding);
      const y = height - padding - ((v - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// --- Page Feedback: auto-categorize by keywords ---
const FEEDBACK_TYPE_KEYWORDS = {
  bug: [
    "cant go back",
    "can't go back",
    "land on wrong",
    "wrong page",
    "broken",
    "error",
    "crash",
    "doesn't work",
    "does not work",
    "not working",
    "login",
    "logout",
    "dashboard",
    "bug",
  ],
  performance: [
    "slow",
    "long",
    "loading",
    "takes too long",
    "lag",
    "freeze",
    "delay",
  ],
  feature: [
    "should add",
    "maybe add",
    "add a",
    "need a",
    "would like",
    "feature",
    "yori needs",
    "memory",
    "chat section",
  ],
  ux: [
    "confus",
    "unclear",
    "hard to",
    "difficult",
    "slides",
    "unnecessary",
    "redirect",
    "landing",
  ],
};
const FEEDBACK_TYPE_LABELS = {
  bug: "Bug",
  performance: "Performance",
  feature: "Feature Request",
  ux: "UX",
};
const FEEDBACK_TYPE_COLORS = {
  bug: "bg-red-100 text-red-800 border-red-200",
  performance: "bg-amber-100 text-amber-800 border-amber-200",
  feature: "bg-blue-100 text-blue-800 border-blue-200",
  ux: "bg-yellow-100 text-yellow-800 border-yellow-200",
};
const FEEDBACK_TYPE_STRIP = {
  bug: "bg-red-500",
  performance: "bg-amber-500",
  feature: "bg-blue-500",
  ux: "bg-yellow-500",
};

function categorizeFeedback(text) {
  if (!text || typeof text !== "string") return "ux";
  const lower = text.toLowerCase().trim();
  for (const [type, keywords] of Object.entries(FEEDBACK_TYPE_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return type;
  }
  return "ux";
}

// Normalize feedback for grouping (top recurring issues)
function normalizeForPattern(s) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
}

function getPatternSummary(feedbacks, limit = 5) {
  const byNorm = {};
  feedbacks.forEach((f) => {
    const norm = normalizeForPattern(f.feedback);
    if (norm.length < 5) return;
    byNorm[norm] = (byNorm[norm] || []).concat(f);
  });
  return Object.entries(byNorm)
    .map(([norm, items]) => ({
      text:
        items[0].feedback.slice(0, 60) +
        (items[0].feedback.length > 60 ? "…" : ""),
      count: items.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Safely parse legacy structured survey stored as JSON in `comment`
function parseSurveyComment(comment) {
  if (!comment) return null;
  try {
    const parsed = JSON.parse(comment);
    if (
      parsed &&
      typeof parsed === "object" &&
      ("experience" in parsed || "role" in parsed)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// Normalise survey data for a review: prefer explicit schema fields, fall back to JSON in `comment`
function getSurveyFromReview(review) {
  if (!review) return null;

  const hasStructuredFields =
    review.surveyRole ||
    (Array.isArray(review.surveyPurposes) && review.surveyPurposes.length) ||
    review.surveyExperience ||
    review.surveyFound ||
    (Array.isArray(review.surveyMostValuable) &&
      review.surveyMostValuable.length) ||
    (Array.isArray(review.surveyConfusing) && review.surveyConfusing.length) ||
    review.surveyReturnLikelihood != null ||
    review.surveyImprovement;

  if (hasStructuredFields) {
    return {
      role: review.surveyRole || "",
      purposes: Array.isArray(review.surveyPurposes)
        ? review.surveyPurposes
        : [],
      experience: review.surveyExperience || "",
      found: review.surveyFound || "",
      mostValuable: Array.isArray(review.surveyMostValuable)
        ? review.surveyMostValuable
        : [],
      confusing: Array.isArray(review.surveyConfusing)
        ? review.surveyConfusing
        : [],
      returnLikelihood:
        typeof review.surveyReturnLikelihood === "number"
          ? review.surveyReturnLikelihood
          : review.surveyReturnLikelihood != null
            ? Number(review.surveyReturnLikelihood)
            : null,
      improvement: review.surveyImprovement || review.comment || "",
    };
  }

  // Legacy: try to parse from JSON stored in `comment`
  return parseSurveyComment(review.comment);
}

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "active-users", label: "Active users", icon: Activity },
  { id: "search", label: "Search", icon: Search },
  { id: "experts", label: "Experts", icon: User },
  { id: "patients", label: "Patients", icon: UserCircle },
  { id: "forums", label: "Forums", icon: MessageSquare },
  { id: "posts", label: "Discovery", icon: FileText },
  { id: "community", label: "Community", icon: Users },
  { id: "work", label: "Work Moderation", icon: FileCheck },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "page-feedback", label: "Page Feedback", icon: MessageCircle },
  { id: "contacts", label: "Contact Messages", icon: Mail },
  {
    id: "profile-reminders",
    label: "Profile Reminders",
    icon: ClipboardList,
  },
  {
    id: "weekly-mailer",
    label: "Weekly Mailer",
    icon: Mail,
  },
  {
    id: "beta-users",
    label: "Beta program",
    icon: FlaskConical,
  },
  {
    id: "researcher-invites",
    label: "Researcher Invites",
    icon: Send,
  },
  {
    id: "onboarding-cleanup",
    label: "Onboarding Cleanup",
    icon: AlertTriangle,
  },
  { id: "meeting-requests", label: "Meeting Requests", icon: Calendar },
];

const SIDEBAR_GROUPS = [
  { title: "MENU", items: ["overview", "active-users", "work"] },
  {
    title: "MANAGEMENT",
    items: ["search", "experts", "patients", "forums", "posts", "community"],
  },
  { title: "SUPPORT", items: ["reviews", "page-feedback", "contacts"] },
  {
    title: "OTHERS",
    items: [
      "weekly-mailer",
      "beta-users",
      "researcher-invites",
      "onboarding-cleanup",
      "meeting-requests",
      "profile-reminders",
    ],
  },
];

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [searchStats, setSearchStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [searchChannelAnalytics, setSearchChannelAnalytics] = useState(null);
  const [loadingSearchChannels, setLoadingSearchChannels] = useState(false);
  const [searchChannelAudience, setSearchChannelAudience] = useState("all");
  const [resetting, setResetting] = useState({
    deviceTokens: false,
    ipLimits: false,
    all: false,
    cleanup: false,
  });
  // Forums
  const [forumCategories, setForumCategories] = useState([]);
  const [forumThreads, setForumThreads] = useState([]);
  const [loadingForums, setLoadingForums] = useState(false);
  const [deletingForumId, setDeletingForumId] = useState(null);
  const [deletingThreadId, setDeletingThreadId] = useState(null);
  const [selectedForumCategoryIds, setSelectedForumCategoryIds] = useState([]);
  const [bulkDeletingForums, setBulkDeletingForums] = useState(false);
  const [selectedForumThreadIds, setSelectedForumThreadIds] = useState([]);
  const [bulkDeletingThreads, setBulkDeletingThreads] = useState(false);
  // Posts
  const [posts, setPosts] = useState([]);
  const [postsPagination, setPostsPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [postExpanded, setPostExpanded] = useState({});
  // Communities
  const [communities, setCommunities] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [deletingCommunityId, setDeletingCommunityId] = useState(null);
  const [newCommunity, setNewCommunity] = useState({
    name: "",
    description: "",
    thumbnailUrl: "",
    categoryId: "",
    iconSvg: "",
    color: "#2F3C96",
  });
  const [newCommunityThumbnailUploading, setNewCommunityThumbnailUploading] =
    useState(false);
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  const [communityCategories, setCommunityCategories] = useState([]);
  const [loadingCommunityCategories, setLoadingCommunityCategories] =
    useState(false);
  const [newCommunityCategory, setNewCommunityCategory] = useState({
    name: "",
    defaultOpen: false,
    headingColor: "#2F3C96",
  });
  const [creatingCommunityCategory, setCreatingCommunityCategory] =
    useState(false);
  const [editingCommunityId, setEditingCommunityId] = useState(null);
  const [editCommunity, setEditCommunity] = useState({
    name: "",
    description: "",
    categoryId: "",
    iconSvg: "",
    color: "#2F3C96",
  });
  const [updatingCommunity, setUpdatingCommunity] = useState(false);
  const [editingIconCommunityId, setEditingIconCommunityId] = useState(null);
  const [editingIconSvg, setEditingIconSvg] = useState("");
  const [editingIconCommunityName, setEditingIconCommunityName] = useState("");
  const [updatingIconOnly, setUpdatingIconOnly] = useState(false);
  const [communityProposals, setCommunityProposals] = useState([]);
  const [loadingCommunityProposals, setLoadingCommunityProposals] =
    useState(false);
  const [approvingProposalId, setApprovingProposalId] = useState(null);
  const [rejectingProposalId, setRejectingProposalId] = useState(null);
  const [approvalThumbnailOverride, setApprovalThumbnailOverride] = useState(
    {},
  );
  const [approvalThumbnailUploading, setApprovalThumbnailUploading] = useState(
    {},
  );
  const [communityManagementTab, setCommunityManagementTab] =
    useState("patient");
  const [newResearcherCommunity, setNewResearcherCommunity] = useState({
    name: "",
    description: "",
    thumbnailUrl: "",
  });
  const [
    newResearcherCommunityThumbnailUploading,
    setNewResearcherCommunityThumbnailUploading,
  ] = useState(false);
  const [creatingResearcherCommunity, setCreatingResearcherCommunity] =
    useState(false);
  // Work submissions
  const [workSubmissions, setWorkSubmissions] = useState([]);
  const [loadingWorkSubmissions, setLoadingWorkSubmissions] = useState(false);
  const [approvingWorkSubmissionId, setApprovingWorkSubmissionId] =
    useState(null);
  const [rejectingWorkSubmissionId, setRejectingWorkSubmissionId] =
    useState(null);
  // Patients
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [deletingPatientId, setDeletingPatientId] = useState(null);
  const [deletingExpertId, setDeletingExpertId] = useState(null);
  const [patientSortBy, setPatientSortBy] = useState("accountCreated");
  const [patientOrder, setPatientOrder] = useState("desc");
  // Weekly mailer
  const [weeklyMailerSelectedUserIds, setWeeklyMailerSelectedUserIds] =
    useState([]);
  const [sendingWeeklyMailer, setSendingWeeklyMailer] = useState(false);
  const [weeklyMailerSearchQuery, setWeeklyMailerSearchQuery] = useState("");
  const [weeklyMailerPipeline, setWeeklyMailerPipeline] = useState([]);
  // Beta program — opted-in users & survey emails
  const [betaProgramUsers, setBetaProgramUsers] = useState([]);
  const [loadingBetaProgramUsers, setLoadingBetaProgramUsers] = useState(false);
  const [betaSurveyUrl, setBetaSurveyUrl] = useState("");
  const [betaSelectedUserIds, setBetaSelectedUserIds] = useState([]);
  const [sendingBetaSurvey, setSendingBetaSurvey] = useState(false);
  const [betaSurveySearchQuery, setBetaSurveySearchQuery] = useState("");
  const [betaSurveyPipeline, setBetaSurveyPipeline] = useState([]);
  const [betaSurveyLastBatch, setBetaSurveyLastBatch] = useState(null);
  // Researcher invite mailer (external researchers; tags + parsed or manual name each)
  const [researcherInviteDraftEmail, setResearcherInviteDraftEmail] =
    useState("");
  const [researcherInviteNameMode, setResearcherInviteNameMode] =
    useState("auto");
  const [researcherInviteDraftName, setResearcherInviteDraftName] =
    useState("");
  const [researcherInviteBulkText, setResearcherInviteBulkText] = useState("");
  const [researcherInviteRecipients, setResearcherInviteRecipients] = useState(
    [],
  );
  const [sendingResearcherInvites, setSendingResearcherInvites] =
    useState(false);
  const [researcherInvitePipeline, setResearcherInvitePipeline] = useState([]);
  const [researcherInviteLogs, setResearcherInviteLogs] = useState([]);
  const [loadingResearcherInviteLogs, setLoadingResearcherInviteLogs] =
    useState(false);
  // Overview stats
  const [overviewStats, setOverviewStats] = useState(null);
  const [loadingOverviewStats, setLoadingOverviewStats] = useState(false);
  // Reviews/Feedback
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewsPagination, setReviewsPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  // Contact Messages
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactStats, setContactStats] = useState(null);
  const [contactsPagination, setContactsPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [updatingContactId, setUpdatingContactId] = useState(null);
  const [deletingContactId, setDeletingContactId] = useState(null);
  // Page Feedback
  const [pageFeedbacks, setPageFeedbacks] = useState([]);
  const [loadingPageFeedback, setLoadingPageFeedback] = useState(false);
  const [pageFeedbackStats, setPageFeedbackStats] = useState(null);
  const [pageFeedbackPagination, setPageFeedbackPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [pageFeedbackFilters, setPageFeedbackFilters] = useState({
    role: "",
    page: "",
    type: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  });
  const [pageFeedbackExpanded, setPageFeedbackExpanded] = useState({});
  const [pageFeedbackMeta, setPageFeedbackMeta] = useState({}); // { [id]: { resolved, reviewed, internalNote } }
  const [pageInsightsSort, setPageInsightsSort] = useState({
    key: "count",
    dir: "desc",
  });
  const [feedbackNoteInput, setFeedbackNoteInput] = useState({}); // { [id]: string } for inline note
  const [pageFeedbackRecurringOpen, setPageFeedbackRecurringOpen] =
    useState(false);
  const [pageFeedbackInsightsOpen, setPageFeedbackInsightsOpen] =
    useState(false);
  // Onboarding Cleanup
  const [incompleteOnboardingUsers, setIncompleteOnboardingUsers] = useState(
    [],
  );
  const [loadingIncompleteOnboarding, setLoadingIncompleteOnboarding] =
    useState(false);
  const [resettingOnboardingId, setResettingOnboardingId] = useState(null);
  const [deletingIncompleteId, setDeletingIncompleteId] = useState(null);
  const [onboardingFilter, setOnboardingFilter] = useState("all");
  const [selectedIncompleteUserIds, setSelectedIncompleteUserIds] = useState(
    [],
  );
  const [bulkResettingOnboarding, setBulkResettingOnboarding] = useState(false);
  const [bulkDeletingIncomplete, setBulkDeletingIncomplete] = useState(false);
  // Meeting requests (admin testing)
  const [meetingRequestsList, setMeetingRequestsList] = useState([]);
  const [loadingMeetingRequests, setLoadingMeetingRequests] = useState(false);
  const [clearingAllMeetings, setClearingAllMeetings] = useState(false);
  const [deletingMeetingId, setDeletingMeetingId] = useState(null);
  // Profile reminder mailing
  const [profileReminderStats, setProfileReminderStats] = useState(null);
  const [profileReminderLogs, setProfileReminderLogs] = useState([]);
  const [loadingProfileReminders, setLoadingProfileReminders] = useState(false);
  const [profileReminderRoleFilter, setProfileReminderRoleFilter] =
    useState("all");
  const [activeUserAnalytics, setActiveUserAnalytics] = useState(null);
  const [loadingActiveUsers, setLoadingActiveUsers] = useState(false);

  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const researcherInviteAutoPreview = useMemo(() => {
    if (researcherInviteNameMode !== "auto") return null;
    const e = researcherInviteDraftEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
    return parseDisplayNameFromEmail(e).displayName;
  }, [researcherInviteDraftEmail, researcherInviteNameMode]);

  const getAuth = () => {
    const token = localStorage.getItem("adminToken");
    return { token, headers: { Authorization: `Bearer ${token}` } };
  };

  // Handle 401 (invalid/expired token) and 403 (valid token but not admin) from admin API
  const handleAdminAuthFailure = (res) => {
    if (res.status === 401) {
      localStorage.removeItem("adminToken");
      toast.error("Session expired or invalid token. Please sign in again.");
      navigate("/");
      return true;
    }
    if (res.status === 403) {
      localStorage.removeItem("adminToken");
      toast.error(
        "Your account does not have admin access. On the server, set ADMIN_EMAILS to your email (or isAdmin on your user).",
      );
      navigate("/");
      return true;
    }
    return false;
  };

  const fetchProfileReminderData = async (role = profileReminderRoleFilter) => {
    try {
      setLoadingProfileReminders(true);
      const { token, headers } = getAuth();
      if (!token) return;

      const [statsRes, logsRes] = await Promise.all([
        fetch(`${base}/api/admin/profile-reminders/stats`, {
          headers,
        }),
        fetch(
          `${base}/api/admin/profile-reminders/logs${
            role && role !== "all" ? `?role=${role}` : ""
          }`,
          { headers },
        ),
      ]);

      if (handleAdminAuthFailure(statsRes) || handleAdminAuthFailure(logsRes)) {
        return;
      }

      const statsJson = await statsRes.json();
      const logsJson = await logsRes.json();
      setProfileReminderStats(statsJson);
      setProfileReminderLogs(Array.isArray(logsJson) ? logsJson : []);
    } catch (error) {
      console.error("Failed to load profile reminder data:", error);
      toast.error("Failed to load profile reminder stats");
    } finally {
      setLoadingProfileReminders(false);
    }
  };

  const fetchResearcherInviteLogs = async () => {
    try {
      setLoadingResearcherInviteLogs(true);
      const { token, headers } = getAuth();
      if (!token) return;
      const res = await fetch(`${base}/api/admin/researcher-invites/logs`, {
        headers,
      });
      if (handleAdminAuthFailure(res)) return;
      const data = await res.json();
      setResearcherInviteLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (error) {
      console.error("Failed to load researcher invite logs:", error);
      toast.error("Failed to load invite history");
    } finally {
      setLoadingResearcherInviteLogs(false);
    }
  };

  useEffect(() => {
    const adminToken = localStorage.getItem("adminToken");
    if (!adminToken) {
      toast.error("Access denied. Admin access required.");
      navigate("/");
      return;
    }
    fetchExperts();
    if (activeSection === "search") {
      fetchSearchStats();
    }
    if (activeSection === "reviews") {
      fetchReviews();
      fetchReviewStats();
    }
    if (activeSection === "overview") fetchOverviewStats();
    if (activeSection === "profile-reminders") fetchProfileReminderData();
  }, [navigate, activeSection]);

  useEffect(() => {
    if (activeSection === "forums") {
      fetchForumCategories();
      fetchForumThreads();
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === "posts") fetchAdminPosts();
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === "community") {
      fetchAdminCommunities();
      fetchCommunityCategories();
      fetchCommunityProposals();
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === "work") {
      fetchWorkSubmissions();
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === "patients" || activeSection === "weekly-mailer") {
      fetchPatients();
    }
  }, [activeSection, patientSortBy, patientOrder]);

  useEffect(() => {
    if (activeSection === "overview") fetchOverviewStats();
    if (activeSection === "reviews") {
      fetchReviews();
      fetchReviewStats();
    }
    if (activeSection === "contacts") {
      fetchContacts();
      fetchContactStats();
    }
    if (activeSection === "page-feedback") {
      fetchPageFeedback();
      fetchPageFeedbackStats();
    }
    if (activeSection === "onboarding-cleanup") {
      fetchIncompleteOnboarding();
    }
    if (activeSection === "meeting-requests") {
      fetchMeetingRequests();
    }
    if (activeSection === "profile-reminders") {
      fetchProfileReminderData();
    }
    if (activeSection === "researcher-invites") {
      fetchResearcherInviteLogs();
    }
    if (activeSection === "beta-users") {
      fetchBetaProgramUsers();
    }
    if (activeSection === "active-users") {
      fetchActiveUserStats();
    }
  }, [activeSection]);

  const fetchMeetingRequests = async () => {
    const { token, headers } = getAuth();
    if (!token) return;
    setLoadingMeetingRequests(true);
    try {
      const res = await fetch(`${base}/api/admin/meeting-requests`, {
        headers,
      });
      if (handleAdminAuthFailure(res)) return;
      const data = await res.json();
      setMeetingRequestsList(data.requests || []);
    } catch (e) {
      toast.error("Failed to load meeting requests");
    } finally {
      setLoadingMeetingRequests(false);
    }
  };

  const clearAllMeetingRequests = async () => {
    if (
      !confirm(
        "Clear ALL meeting requests and their notifications? This cannot be undone.",
      )
    )
      return;
    const { token, headers } = getAuth();
    if (!token) return;
    setClearingAllMeetings(true);
    try {
      const res = await fetch(`${base}/api/admin/meeting-requests/clear-all`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (handleAdminAuthFailure(res)) return;
      const data = await res.json();
      toast.success(data.message || "All cleared");
      setMeetingRequestsList([]);
    } catch (e) {
      toast.error("Failed to clear meeting requests");
    } finally {
      setClearingAllMeetings(false);
    }
  };

  const cancelOneMeetingRequest = async (id) => {
    const { token, headers } = getAuth();
    if (!token) return;
    setDeletingMeetingId(id);
    try {
      const res = await fetch(`${base}/api/admin/meeting-requests/${id}`, {
        method: "DELETE",
        headers,
      });
      if (handleAdminAuthFailure(res)) return;
      toast.success("Meeting request cancelled");
      setMeetingRequestsList((prev) => prev.filter((r) => r._id !== id));
    } catch (e) {
      toast.error("Failed to cancel meeting request");
    } finally {
      setDeletingMeetingId(null);
    }
  };

  // Reviews/Feedback
  const fetchReviews = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingReviews(true);
    try {
      const res = await fetch(
        `${base}/api/feedback?limit=50&offset=0&sort=desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const data = await res.json();
      setReviews(data.feedbacks || []);
      setReviewsPagination({
        page: 1,
        pages: Math.ceil((data.total || 0) / 50),
        total: data.total || 0,
      });
    } catch (e) {
      toast.error("Failed to load reviews");
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchReviewStats = async () => {
    const { token } = getAuth();
    if (!token) return;
    try {
      const res = await fetch(`${base}/api/feedback/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch review stats");
      const data = await res.json();
      setReviewStats(data);
    } catch (e) {
      console.error("Failed to load review stats", e);
    }
  };

  // Contact Messages
  const fetchContacts = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingContacts(true);
    try {
      const res = await fetch(`${base}/api/contact?limit=50&offset=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = await res.json();
      setContacts(data.contacts || []);
      setContactsPagination({
        page: 1,
        pages: Math.ceil((data.total || 0) / 50),
        total: data.total || 0,
      });
    } catch (e) {
      toast.error("Failed to load contact messages");
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchContactStats = async () => {
    const { token } = getAuth();
    if (!token) return;
    try {
      const res = await fetch(`${base}/api/contact/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch contact stats");
      const data = await res.json();
      setContactStats(data);
    } catch (e) {
      console.error("Failed to load contact stats", e);
    }
  };

  // Page Feedback
  const fetchPageFeedback = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingPageFeedback(true);
    try {
      const res = await fetch(
        `${base}/api/page-feedback?limit=50&offset=0&sort=desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch page feedback");
      const data = await res.json();
      setPageFeedbacks(data.feedbacks || []);
      setPageFeedbackPagination({
        page: 1,
        pages: Math.ceil((data.total || 0) / 50),
        total: data.total || 0,
      });
    } catch (e) {
      toast.error("Failed to load page feedback");
    } finally {
      setLoadingPageFeedback(false);
    }
  };

  const fetchPageFeedbackStats = async () => {
    const { token } = getAuth();
    if (!token) return;
    try {
      const res = await fetch(`${base}/api/page-feedback/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch page feedback stats");
      const data = await res.json();
      setPageFeedbackStats(data);
    } catch (e) {
      console.error("Failed to load page feedback stats", e);
    }
  };

  const handleUpdateContactStatus = async (id, status) => {
    setUpdatingContactId(id);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/contact/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Contact status updated");
      fetchContacts();
      fetchContactStats();
    } catch (e) {
      toast.error("Failed to update contact status");
    } finally {
      setUpdatingContactId(null);
    }
  };

  const handleDeleteContact = async (id) => {
    if (!confirm("Delete this contact message? This cannot be undone.")) return;
    setDeletingContactId(id);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/contact/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Contact message deleted");
      fetchContacts();
      fetchContactStats();
    } catch (e) {
      toast.error("Failed to delete contact message");
    } finally {
      setDeletingContactId(null);
    }
  };

  const fetchPatients = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingPatients(true);
    try {
      const res = await fetch(
        `${base}/api/admin/patients?token=${token}&sortBy=${patientSortBy}&order=${patientOrder}`,
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (e) {
      toast.error("Failed to load patients");
    } finally {
      setLoadingPatients(false);
    }
  };

  const toggleWeeklyMailerUser = (userId) => {
    if (sendingWeeklyMailer) return;
    setWeeklyMailerSelectedUserIds((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      return [...prev, userId];
    });
  };

  const getWeeklyMailerFilteredPatients = () => {
    const q = (weeklyMailerSearchQuery || "").trim().toLowerCase();
    if (!q) return patients;

    return (patients || []).filter((p) => {
      const name = p?.name || "";
      const email = p?.email || "";
      const cond = Array.isArray(p?.conditions) ? p.conditions.join(" ") : "";
      const loc = p?.location;
      const locStr =
        loc && typeof loc === "object"
          ? [loc.city, loc.state, loc.country]
              .map((x) => (x == null ? "" : String(x).trim()))
              .filter(Boolean)
              .join(" ")
          : "";
      const hay = `${name} ${email} ${cond} ${locStr}`.toLowerCase();
      return hay.includes(q);
    });
  };

  /** Conditions that drive the weekly digest: primary selections when set, else full list (matches backend). */
  const getWeeklyMailerPatientConditions = (p) => {
    const list = Array.isArray(p?.conditions) ? p.conditions : [];
    const rawIdx = Array.isArray(p?.primaryConditionIndices)
      ? p.primaryConditionIndices
      : [];
    const picked = rawIdx
      .filter(
        (i) =>
          typeof i === "number" &&
          Number.isFinite(i) &&
          i >= 0 &&
          i < list.length,
      )
      .map((i) => list[i])
      .filter(Boolean);
    if (picked.length > 0) return picked;
    return list;
  };

  /** Same string as expert pipeline / weekly digest: city, state, country. */
  const getWeeklyMailerPatientLocationLabel = (p) => {
    const loc = p?.location;
    if (!loc || typeof loc !== "object") return "";
    const parts = [loc.city, loc.state, loc.country]
      .map((x) => (x == null ? "" : String(x).trim()))
      .filter(Boolean);
    return parts.join(", ");
  };

  const handleToggleSelectAllWeeklyMailer = () => {
    if (sendingWeeklyMailer) return;
    const filtered = getWeeklyMailerFilteredPatients();
    if (!Array.isArray(filtered) || filtered.length === 0) return;
    const allIds = filtered.map((p) => p.userId);
    setWeeklyMailerSelectedUserIds((prev) => {
      const same = prev.length === allIds.length;
      return same ? [] : allIds;
    });
  };

  const handleSendWeeklyMailer = async () => {
    if (weeklyMailerSelectedUserIds.length === 0) {
      toast.error("Select at least one patient to send the weekly mailer.");
      return;
    }

    const { token, headers } = getAuth();
    if (!token) return;

    // Initialize per-user pipeline so the admin can see progress "1 by 1"
    const pipelineInit = weeklyMailerSelectedUserIds.map((id, idx) => {
      const u = (patients || []).find((p) => p.userId === id);
      const locationLabel = u ? getWeeklyMailerPatientLocationLabel(u) : "";
      return {
        idx,
        userId: id,
        name: u?.name || "Patient",
        email: u?.email || "",
        locationLabel,
        status: "pending",
        message: "",
      };
    });
    setWeeklyMailerPipeline(pipelineInit);

    setSendingWeeklyMailer(true);
    try {
      let sentCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      const ids = weeklyMailerSelectedUserIds;
      for (let i = 0; i < ids.length; i++) {
        const userId = ids[i];

        setWeeklyMailerPipeline((prev) =>
          prev.map((entry) =>
            entry.userId === userId
              ? {
                  ...entry,
                  status: "sending",
                  message: `Sending (${i + 1}/${ids.length})...`,
                }
              : entry,
          ),
        );

        try {
          const res = await fetch(`${base}/api/admin/weekly-mailer/send`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ userIds: [userId] }),
          });

          if (handleAdminAuthFailure(res)) return;
          const data = await res.json();

          if (!res.ok) {
            errorCount += 1;
            setWeeklyMailerPipeline((prev) =>
              prev.map((entry) =>
                entry.userId === userId
                  ? {
                      ...entry,
                      status: "error",
                      message: data?.message || data?.error || "Failed to send",
                    }
                  : entry,
              ),
            );
            continue;
          }

          const sent = Number(data.sent || 0);
          const skipped = Number(data.skipped || 0);
          const hasErr = Array.isArray(data.errors) && data.errors.length > 0;

          if (sent > 0) {
            sentCount += sent;
            setWeeklyMailerPipeline((prev) =>
              prev.map((entry) =>
                entry.userId === userId
                  ? {
                      ...entry,
                      status: "sent",
                      message: "Sent",
                    }
                  : entry,
              ),
            );
          } else if (skipped > 0) {
            skippedCount += skipped;
            setWeeklyMailerPipeline((prev) =>
              prev.map((entry) =>
                entry.userId === userId
                  ? {
                      ...entry,
                      status: "skipped",
                      message: "Skipped (missing email/profile or opted out)",
                    }
                  : entry,
              ),
            );
          } else if (hasErr) {
            errorCount += 1;
            setWeeklyMailerPipeline((prev) =>
              prev.map((entry) =>
                entry.userId === userId
                  ? {
                      ...entry,
                      status: "error",
                      message: data.errors?.[0]?.message || "Failed",
                    }
                  : entry,
              ),
            );
          } else {
            // Fallback: treat as sent if backend didn't explicitly skip
            sentCount += 1;
            setWeeklyMailerPipeline((prev) =>
              prev.map((entry) =>
                entry.userId === userId
                  ? {
                      ...entry,
                      status: "sent",
                      message: "Sent",
                    }
                  : entry,
              ),
            );
          }
        } catch (err) {
          errorCount += 1;
          setWeeklyMailerPipeline((prev) =>
            prev.map((entry) =>
              entry.userId === userId
                ? {
                    ...entry,
                    status: "error",
                    message: err?.message || "Request failed",
                  }
                : entry,
            ),
          );
        }
      }

      toast.success(
        `Weekly mailer finished. Sent: ${sentCount}, skipped: ${skippedCount}, errors: ${errorCount}`,
      );
    } catch (e) {
      toast.error(e?.message || "Failed to send weekly mailer");
    } finally {
      setSendingWeeklyMailer(false);
    }
  };

  const fetchBetaProgramUsers = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingBetaProgramUsers(true);
    try {
      const res = await fetch(`${base}/api/admin/beta-users?token=${token}`);
      if (handleAdminAuthFailure(res)) return;
      const data = await res.json();
      const list = (data.users || []).map((u) => ({
        userId: u._id,
        email: u.email,
        role: u.role,
        username: u.username,
        handle: u.handle,
        betaProgramOptedAt: u.betaProgramOptedAt,
      }));
      setBetaProgramUsers(list);
      setBetaSurveyLastBatch(data.lastBatch || null);
    } catch (e) {
      toast.error("Failed to load beta program users");
    } finally {
      setLoadingBetaProgramUsers(false);
    }
  };

  const getBetaUsersFiltered = () => {
    const q = (betaSurveySearchQuery || "").trim().toLowerCase();
    if (!q) return betaProgramUsers;
    return (betaProgramUsers || []).filter((u) => {
      const hay =
        `${u.username || ""} ${u.email || ""} ${u.handle || ""} ${u.role || ""}`.toLowerCase();
      return hay.includes(q);
    });
  };

  const toggleBetaSurveyUser = (userId) => {
    if (sendingBetaSurvey) return;
    const sid = String(userId);
    setBetaSelectedUserIds((prev) => {
      if (prev.some((id) => String(id) === sid))
        return prev.filter((id) => String(id) !== sid);
      return [...prev, userId];
    });
  };

  const handleToggleSelectAllBetaUsers = () => {
    if (sendingBetaSurvey) return;
    const filtered = getBetaUsersFiltered();
    if (!filtered.length) return;
    const allIds = filtered.map((u) => u.userId);
    setBetaSelectedUserIds((prev) => {
      const same =
        prev.length === allIds.length &&
        allIds.every((id) => prev.some((p) => String(p) === String(id)));
      return same ? [] : allIds;
    });
  };

  const handleSendBetaSurveyEmails = async () => {
    const url = (betaSurveyUrl || "").trim();
    if (!url || !/^https:\/\//i.test(url)) {
      toast.error(
        "Paste a valid https survey link (e.g. your Google Form URL).",
      );
      return;
    }
    if (betaSelectedUserIds.length === 0) {
      toast.error("Select at least one beta participant.");
      return;
    }

    const { token, headers } = getAuth();
    if (!token) return;

    const pipelineInit = betaSelectedUserIds.map((id, idx) => {
      const u = betaProgramUsers.find((x) => String(x.userId) === String(id));
      return {
        idx,
        userId: id,
        name: u?.username || u?.email || "User",
        email: u?.email || "",
        status: "pending",
        message: "",
      };
    });
    setBetaSurveyPipeline(pipelineInit);
    setSendingBetaSurvey(true);

    let sent = 0;
    let err = 0;

    try {
      for (let i = 0; i < betaSelectedUserIds.length; i++) {
        const userId = betaSelectedUserIds[i];
        setBetaSurveyPipeline((prev) =>
          prev.map((entry) =>
            entry.userId === userId
              ? {
                  ...entry,
                  status: "sending",
                  message: `Sending (${i + 1}/${betaSelectedUserIds.length})…`,
                }
              : entry,
          ),
        );

        try {
          const res = await fetch(`${base}/api/admin/beta-users/send-survey`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ userId, surveyUrl: url }),
          });
          if (handleAdminAuthFailure(res)) return;
          const data = await res.json();

          if (!res.ok) {
            err += 1;
            setBetaSurveyPipeline((prev) =>
              prev.map((entry) =>
                entry.userId === userId
                  ? {
                      ...entry,
                      status: "error",
                      message: data?.error || "Failed to send",
                    }
                  : entry,
              ),
            );
            continue;
          }

          sent += 1;
          setBetaSurveyPipeline((prev) =>
            prev.map((entry) =>
              entry.userId === userId
                ? { ...entry, status: "sent", message: "Sent" }
                : entry,
            ),
          );
        } catch (e) {
          err += 1;
          setBetaSurveyPipeline((prev) =>
            prev.map((entry) =>
              entry.userId === userId
                ? {
                    ...entry,
                    status: "error",
                    message: e?.message || "Request failed",
                  }
                : entry,
            ),
          );
        }
      }

      try {
        const logRes = await fetch(`${base}/api/admin/beta-users/batch-log`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ successCount: sent, errorCount: err }),
        });
        if (logRes.ok) {
          const logData = await logRes.json().catch(() => ({}));
          if (logData?.lastBatch) setBetaSurveyLastBatch(logData.lastBatch);
        }
      } catch {
        /* non-blocking */
      }

      toast.success(
        `Survey emails finished. Sent: ${sent}${err ? `, errors: ${err}` : ""}`,
      );
    } catch (e) {
      toast.error(e?.message || "Failed to send survey emails");
    } finally {
      setSendingBetaSurvey(false);
    }
  };

  const addResearcherInviteRecipient = () => {
    const email = researcherInviteDraftEmail.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      toast.error("Enter an email address.");
      return;
    }
    if (!emailRe.test(email)) {
      toast.error("Invalid email address.");
      return;
    }
    if (researcherInviteRecipients.length >= 10) {
      toast.error("Maximum 10 emails per batch.");
      return;
    }
    const lower = email.toLowerCase();
    if (
      researcherInviteRecipients.some((r) => r.email.toLowerCase() === lower)
    ) {
      toast.error("That email is already in the list.");
      return;
    }
    let displayName = "";
    let lastName = "";
    if (researcherInviteNameMode === "auto") {
      const p = parseDisplayNameFromEmail(email);
      displayName = p.displayName;
      lastName = p.lastName;
    } else {
      displayName = researcherInviteDraftName.trim();
      if (!displayName) {
        toast.error("Enter a name for this recipient.");
        return;
      }
      lastName = deriveLastNameFromDisplayName(displayName);
    }
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `r-${Date.now()}-${Math.random()}`;
    setResearcherInviteRecipients((prev) => [
      ...prev,
      {
        id,
        email,
        displayName,
        lastName,
        nameMode: researcherInviteNameMode,
      },
    ]);
    setResearcherInviteDraftEmail("");
    setResearcherInviteDraftName("");
  };

  const addBulkResearcherInvitesFromText = () => {
    if (sendingResearcherInvites) return;
    const emails = extractEmailsFromBulkText(researcherInviteBulkText);
    if (emails.length === 0) {
      toast.error("No valid email addresses found.");
      return;
    }
    const existing = new Set(
      researcherInviteRecipients.map((r) => r.email.toLowerCase()),
    );
    const newOnes = [];
    for (const email of emails) {
      if (researcherInviteRecipients.length + newOnes.length >= 10) {
        break;
      }
      const el = email.toLowerCase();
      if (existing.has(el)) continue;
      existing.add(el);
      const { displayName, lastName } = parseDisplayNameFromEmail(email);
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `r-${Date.now()}-${Math.random()}`;
      newOnes.push({
        id,
        email,
        displayName,
        lastName,
        nameMode: "auto",
      });
    }
    if (newOnes.length === 0) {
      toast.error("No new emails to add (duplicates, invalid, or list full).");
      return;
    }
    setResearcherInviteRecipients((prev) => [...prev, ...newOnes]);
    setResearcherInviteBulkText("");
    const skipped = emails.length - newOnes.length;
    toast.success(
      `Added ${newOnes.length} recipient(s).${
        skipped > 0
          ? ` ${skipped} skipped (duplicate or batch limit of 10).`
          : ""
      }`,
    );
  };

  const removeResearcherInviteRecipient = (id) => {
    if (sendingResearcherInvites) return;
    setResearcherInviteRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSendResearcherInvites = async () => {
    if (researcherInviteRecipients.length === 0) {
      toast.error("Add at least one email address.");
      return;
    }

    const emails = researcherInviteRecipients.map((r) => r.email);
    const lastNames = researcherInviteRecipients.map((r) => r.lastName || "");

    const { token, headers } = getAuth();
    if (!token) return;

    const jobId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `job-${Date.now()}`;

    const pipelineInit = emails.map((email, idx) => ({
      idx,
      email,
      displayName: researcherInviteRecipients[idx]?.displayName || "",
      lastName: lastNames[idx] || "",
      status: "pending",
      message: "",
    }));
    setResearcherInvitePipeline(pipelineInit);
    setSendingResearcherInvites(true);

    try {
      let sentCount = 0;
      let errorCount = 0;
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        const lastName = lastNames[i] || "";
        setResearcherInvitePipeline((prev) =>
          prev.map((entry) =>
            entry.idx === i
              ? {
                  ...entry,
                  status: "sending",
                  message: `Sending (${i + 1}/${emails.length})...`,
                }
              : entry,
          ),
        );
        try {
          const res = await fetch(
            `${base}/api/admin/researcher-invites/send-one`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ email, lastName, jobId }),
            },
          );
          if (handleAdminAuthFailure(res)) return;
          const data = await res.json();
          if (!res.ok || !data.ok) {
            errorCount += 1;
            setResearcherInvitePipeline((prev) =>
              prev.map((entry) =>
                entry.idx === i
                  ? {
                      ...entry,
                      status: "error",
                      message: data?.error || "Failed to send",
                    }
                  : entry,
              ),
            );
            continue;
          }
          sentCount += 1;
          setResearcherInvitePipeline((prev) =>
            prev.map((entry) =>
              entry.idx === i
                ? { ...entry, status: "sent", message: "Sent" }
                : entry,
            ),
          );
        } catch (err) {
          errorCount += 1;
          setResearcherInvitePipeline((prev) =>
            prev.map((entry) =>
              entry.idx === i
                ? {
                    ...entry,
                    status: "error",
                    message: err?.message || "Request failed",
                  }
                : entry,
            ),
          );
        }
      }
      toast.success(
        `Researcher invites finished. Sent: ${sentCount}, errors: ${errorCount}`,
      );
      await fetchResearcherInviteLogs();
      if (errorCount === 0 && sentCount > 0) {
        setResearcherInviteRecipients([]);
      }
    } catch (e) {
      toast.error(e?.message || "Failed to send invites");
    } finally {
      setSendingResearcherInvites(false);
    }
  };

  const fetchOverviewStats = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingOverviewStats(true);
    try {
      const res = await fetch(
        `${base}/api/admin/stats/overview?token=${token}`,
      );
      if (handleAdminAuthFailure(res)) return;
      const data = await res.json();
      setOverviewStats(data);
    } catch (e) {
      toast.error("Failed to load overview stats");
    } finally {
      setLoadingOverviewStats(false);
    }
  };

  const handleDeletePatient = async (id) => {
    if (
      !confirm(
        "Permanently delete this patient account and all their content (threads, replies, posts, comments)? This cannot be undone.",
      )
    )
      return;
    setDeletingPatientId(id);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/admin/patients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Patient account deleted");
      fetchPatients();
    } catch (e) {
      toast.error("Failed to delete patient account");
    } finally {
      setDeletingPatientId(null);
    }
  };

  // Incomplete Onboarding
  const fetchIncompleteOnboarding = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingIncompleteOnboarding(true);
    try {
      const res = await fetch(
        `${base}/api/admin/incomplete-onboarding?token=${token}`,
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      const data = await res.json();
      setIncompleteOnboardingUsers(data.users || []);
    } catch (e) {
      toast.error("Failed to load incomplete onboarding users");
    } finally {
      setLoadingIncompleteOnboarding(false);
    }
  };

  const handleResetOnboarding = async (id, email) => {
    if (
      !confirm(
        `Reset onboarding data for ${email}? This will delete their profile and unverify their email so they can start the onboarding process from scratch. Their account (email/password) will be kept.`,
      )
    )
      return;
    setResettingOnboardingId(id);
    const { headers } = getAuth();
    try {
      const res = await fetch(
        `${base}/api/admin/incomplete-onboarding/${id}/reset`,
        {
          method: "POST",
          headers,
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Reset failed");
      toast.success(`Onboarding data reset for ${email}`);
      fetchIncompleteOnboarding();
    } catch (e) {
      toast.error("Failed to reset onboarding data");
    } finally {
      setResettingOnboardingId(null);
    }
  };

  const handleDeleteIncompleteUser = async (id, role) => {
    if (
      !confirm(
        "Permanently delete this account and all associated data? This cannot be undone.",
      )
    )
      return;
    setDeletingIncompleteId(id);
    const { headers } = getAuth();
    try {
      const endpoint = role === "researcher" ? "experts" : "patients";
      const res = await fetch(`${base}/api/admin/${endpoint}/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Account deleted");
      fetchIncompleteOnboarding();
    } catch (e) {
      toast.error("Failed to delete account");
    } finally {
      setDeletingIncompleteId(null);
    }
  };

  const getFilteredIncompleteUsers = () =>
    incompleteOnboardingUsers.filter((u) => {
      if (onboardingFilter === "no-profile")
        return u.issues.includes("No profile created");
      if (onboardingFilter === "no-email")
        return u.issues.includes("Email not verified");
      if (onboardingFilter === "missing-data")
        return u.issues.some(
          (i) =>
            i.includes("No conditions") ||
            i.includes("No specialties") ||
            i.includes("No location"),
        );
      return true;
    });

  const handleToggleSelectIncompleteUser = (userId) => {
    setSelectedIncompleteUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleToggleSelectAllIncomplete = () => {
    const filtered = getFilteredIncompleteUsers();
    if (selectedIncompleteUserIds.length === filtered.length) {
      setSelectedIncompleteUserIds([]);
    } else {
      setSelectedIncompleteUserIds(filtered.map((u) => u.userId));
    }
  };

  const handleBulkResetOnboarding = async () => {
    const filtered = getFilteredIncompleteUsers().filter((u) =>
      selectedIncompleteUserIds.includes(u.userId),
    );
    if (filtered.length === 0) return;
    if (
      !confirm(
        `Reset onboarding data for ${filtered.length} selected account${
          filtered.length === 1 ? "" : "s"
        }? This will delete their profiles and unverify their emails so they can start the onboarding process from scratch. Their accounts (email/password) will be kept.`,
      )
    )
      return;

    setBulkResettingOnboarding(true);
    const { headers } = getAuth();
    try {
      for (const user of filtered) {
        const res = await fetch(
          `${base}/api/admin/incomplete-onboarding/${user.userId}/reset`,
          {
            method: "POST",
            headers,
          },
        );
        if (res.status === 401) {
          localStorage.removeItem("adminToken");
          navigate("/");
          return;
        }
        if (!res.ok) throw new Error("Reset failed");
      }
      toast.success(
        `Onboarding data reset for ${filtered.length} account${filtered.length === 1 ? "" : "s"}`,
      );
      setSelectedIncompleteUserIds([]);
      fetchIncompleteOnboarding();
    } catch (e) {
      console.error(e);
      toast.error("Failed to reset onboarding data for selected accounts");
    } finally {
      setBulkResettingOnboarding(false);
    }
  };

  const handleBulkDeleteIncompleteUsers = async () => {
    const filtered = getFilteredIncompleteUsers().filter((u) =>
      selectedIncompleteUserIds.includes(u.userId),
    );
    if (filtered.length === 0) return;
    if (
      !confirm(
        `Permanently delete ${filtered.length} selected account${
          filtered.length === 1 ? "" : "s"
        } and all associated data? This cannot be undone.`,
      )
    )
      return;

    setBulkDeletingIncomplete(true);
    const { headers } = getAuth();
    try {
      for (const user of filtered) {
        const endpoint = user.role === "researcher" ? "experts" : "patients";
        const res = await fetch(
          `${base}/api/admin/${endpoint}/${user.userId}`,
          {
            method: "DELETE",
            headers,
          },
        );
        if (res.status === 401) {
          localStorage.removeItem("adminToken");
          navigate("/");
          return;
        }
        if (!res.ok) throw new Error("Delete failed");
      }
      toast.success(
        `Deleted ${filtered.length} account${filtered.length === 1 ? "" : "s"}`,
      );
      setSelectedIncompleteUserIds([]);
      fetchIncompleteOnboarding();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete selected accounts");
    } finally {
      setBulkDeletingIncomplete(false);
    }
  };

  const handleDeleteExpert = async (id) => {
    const expertId = id?._id ?? id?.id ?? id;
    if (
      !confirm(
        "Permanently delete this researcher account and all their content (threads, replies, posts, comments, work submissions, trials)? This cannot be undone.",
      )
    )
      return;
    setDeletingExpertId(expertId);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/admin/experts/${expertId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Researcher account deleted");
      fetchExperts();
    } catch (e) {
      toast.error("Failed to delete researcher account");
    } finally {
      setDeletingExpertId(null);
    }
  };

  const fetchExperts = async () => {
    try {
      const adminToken = localStorage.getItem("adminToken");

      // If no admin token, redirect to home
      if (!adminToken) {
        toast.error("Access denied. Admin access required.");
        navigate("/");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${base}/api/admin/experts?token=${adminToken}`,
      );

      if (handleAdminAuthFailure(response)) return;

      if (!response.ok) {
        throw new Error("Failed to fetch experts");
      }

      const data = await response.json();
      setExperts(data.experts || []);
    } catch (error) {
      console.error("Error fetching experts:", error);
      // On error, check if it's an auth error and redirect
      if (
        error.message.includes("401") ||
        error.message.includes("Unauthorized")
      ) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }
      toast.error("Failed to load experts");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToggle = async (userId, currentStatus) => {
    setUpdating({ ...updating, [userId]: true });
    try {
      const adminToken = localStorage.getItem("adminToken");
      const newStatus = !currentStatus;

      const response = await fetch(
        `${base}/api/admin/experts/${userId}/verify`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ isVerified: newStatus }),
        },
      );

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to update verification status");
      }

      // Update local state
      setExperts((prev) =>
        prev.map((expert) =>
          expert.userId === userId
            ? {
                ...expert,
                isVerified: newStatus,
                researchGateVerification:
                  data.expert?.researchGateVerification ??
                  expert.researchGateVerification,
                academiaEduVerification:
                  data.expert?.academiaEduVerification ??
                  expert.academiaEduVerification,
                needsAttention: false,
              }
            : expert,
        ),
      );

      toast.success(
        `Expert ${newStatus ? "verified" : "unverified"} successfully`,
      );
    } catch (error) {
      console.error("Error updating verification:", error);
      toast.error("Failed to update verification status");
    } finally {
      setUpdating({ ...updating, [userId]: false });
    }
  };

  const fetchSearchStats = async () => {
    setLoadingStats(true);
    try {
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) return;

      const response = await fetch(`${base}/api/admin/search/config`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (handleAdminAuthFailure(response)) return;

      if (!response.ok) {
        throw new Error("Failed to fetch search stats");
      }

      const data = await response.json();
      setSearchStats(data);
    } catch (error) {
      console.error("Error fetching search stats:", error);
      toast.error("Failed to load search statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchSearchChannelAnalytics = async () => {
    setLoadingSearchChannels(true);
    try {
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) return;

      const response = await fetch(
        `${base}/api/admin/analytics/search-channels?days=30&audience=${encodeURIComponent(
          searchChannelAudience,
        )}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      if (handleAdminAuthFailure(response)) return;

      if (!response.ok) {
        throw new Error("Failed to fetch search channel metrics");
      }

      const data = await response.json();
      setSearchChannelAnalytics(data);
    } catch (error) {
      console.error("Error fetching search channel analytics:", error);
      toast.error("Failed to load search vs chat metrics");
    } finally {
      setLoadingSearchChannels(false);
    }
  };

  useEffect(() => {
    if (activeSection !== "search") return;
    fetchSearchChannelAnalytics();
  }, [activeSection, searchChannelAudience]);

  const fetchActiveUserStats = async () => {
    setLoadingActiveUsers(true);
    try {
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) return;

      const response = await fetch(`${base}/api/admin/analytics/active-users`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (handleAdminAuthFailure(response)) return;

      if (!response.ok) {
        throw new Error("Failed to fetch active user metrics");
      }

      const data = await response.json();
      setActiveUserAnalytics(data);
    } catch (error) {
      console.error("Error fetching active user analytics:", error);
      toast.error("Failed to load active user metrics");
    } finally {
      setLoadingActiveUsers(false);
    }
  };

  const handleResetDeviceTokens = async () => {
    if (
      !confirm("Are you sure you want to reset all device token search counts?")
    ) {
      return;
    }

    setResetting({ ...resetting, deviceTokens: true });
    try {
      const adminToken = localStorage.getItem("adminToken");
      const response = await fetch(
        `${base}/api/admin/search/reset-device-tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to reset device tokens");
      }

      const data = await response.json();
      toast.success(data.message);
      fetchSearchStats(); // Refresh stats
    } catch (error) {
      console.error("Error resetting device tokens:", error);
      toast.error("Failed to reset device tokens");
    } finally {
      setResetting({ ...resetting, deviceTokens: false });
    }
  };

  const handleResetIPLimits = async () => {
    if (
      !confirm("Are you sure you want to reset all IP limit search counts?")
    ) {
      return;
    }

    setResetting({ ...resetting, ipLimits: true });
    try {
      const adminToken = localStorage.getItem("adminToken");
      const response = await fetch(`${base}/api/admin/search/reset-ip-limits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to reset IP limits");
      }

      const data = await response.json();
      toast.success(data.message);
      fetchSearchStats(); // Refresh stats
    } catch (error) {
      console.error("Error resetting IP limits:", error);
      toast.error("Failed to reset IP limits");
    } finally {
      setResetting({ ...resetting, ipLimits: false });
    }
  };

  const handleResetAll = async () => {
    if (
      !confirm(
        "Are you sure you want to reset ALL search limits (device tokens + IPs)?",
      )
    ) {
      return;
    }

    setResetting({ ...resetting, all: true });
    try {
      const adminToken = localStorage.getItem("adminToken");
      const response = await fetch(`${base}/api/admin/search/reset-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to reset all limits");
      }

      const data = await response.json();
      toast.success(data.message);
      fetchSearchStats(); // Refresh stats
    } catch (error) {
      console.error("Error resetting all limits:", error);
      toast.error("Failed to reset all limits");
    } finally {
      setResetting({ ...resetting, all: false });
    }
  };

  const handleCleanupDeviceTokens = async () => {
    if (
      !confirm(
        "This will delete old unused device tokens (30+ days unused or 7+ days old and never used). Continue?",
      )
    ) {
      return;
    }

    setResetting({ ...resetting, cleanup: true });
    try {
      const adminToken = localStorage.getItem("adminToken");
      const response = await fetch(
        `${base}/api/admin/search/cleanup-device-tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to cleanup device tokens");
      }

      const data = await response.json();
      toast.success(data.message);
      fetchSearchStats(); // Refresh stats
    } catch (error) {
      console.error("Error cleaning up device tokens:", error);
      toast.error("Failed to cleanup device tokens");
    } finally {
      setResetting({ ...resetting, cleanup: false });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    navigate("/admin/login");
    toast.success("Logged out successfully");
  };

  // Forums
  const fetchForumCategories = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingForums(true);
    try {
      const res = await fetch(
        `${base}/api/admin/forums/categories?token=${token}`,
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      const data = await res.json();
      setForumCategories(data.categories || []);
    } catch (e) {
      toast.error("Failed to load forum categories");
    } finally {
      setLoadingForums(false);
    }
  };

  const fetchForumThreads = async () => {
    const { token } = getAuth();
    if (!token) return;
    try {
      const res = await fetch(
        `${base}/api/admin/forums/threads?token=${token}&limit=50`,
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      const data = await res.json();
      setForumThreads(data.threads || []);
    } catch (e) {
      toast.error("Failed to load forum threads");
    }
  };

  const handleDeleteForumCategory = async (id) => {
    if (
      !confirm(
        "Delete this forum category and all its threads? This cannot be undone.",
      )
    )
      return;
    setDeletingForumId(id);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/admin/forums/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Forum category deleted");
      setSelectedForumCategoryIds((prev) => prev.filter((x) => x !== id));
      fetchForumCategories();
      fetchForumThreads();
    } catch (e) {
      toast.error("Failed to delete forum category");
    } finally {
      setDeletingForumId(null);
    }
  };

  const handleBulkDeleteForumCategories = async () => {
    if (selectedForumCategoryIds.length === 0) return;
    if (
      !confirm(
        `Delete ${selectedForumCategoryIds.length} selected forum categor${selectedForumCategoryIds.length === 1 ? "y" : "ies"} and all their threads? This cannot be undone.`,
      )
    )
      return;
    setBulkDeletingForums(true);
    const { token } = getAuth();
    try {
      const res = await fetch(
        `${base}/api/admin/forums/categories/bulk-delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids: selectedForumCategoryIds }),
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Bulk delete failed");
      const data = await res.json();
      toast.success(data.message || "Forum categories deleted");
      setSelectedForumCategoryIds([]);
      fetchForumCategories();
      fetchForumThreads();
    } catch (e) {
      toast.error("Failed to delete forum categories");
    } finally {
      setBulkDeletingForums(false);
    }
  };

  const handleDeleteThread = async (id) => {
    if (!confirm("Delete this thread and all replies? This cannot be undone."))
      return;
    setDeletingThreadId(id);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/admin/forums/threads/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Thread deleted");
      setSelectedForumThreadIds((prev) => prev.filter((x) => x !== id));
      fetchForumThreads();
    } catch (e) {
      toast.error("Failed to delete thread");
    } finally {
      setDeletingThreadId(null);
    }
  };

  const handleBulkDeleteForumThreads = async () => {
    if (selectedForumThreadIds.length === 0) return;
    if (
      !confirm(
        `Delete ${selectedForumThreadIds.length} selected thread${selectedForumThreadIds.length === 1 ? "" : "s"} and all replies? This cannot be undone.`,
      )
    )
      return;
    setBulkDeletingThreads(true);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/admin/forums/threads/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedForumThreadIds }),
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Bulk delete failed");
      const data = await res.json();
      toast.success(data.message || "Threads deleted");
      setSelectedForumThreadIds([]);
      fetchForumThreads();
    } catch (e) {
      toast.error("Failed to delete threads");
    } finally {
      setBulkDeletingThreads(false);
    }
  };

  // Posts
  const fetchAdminPosts = async (page = 1) => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingPosts(true);
    try {
      const res = await fetch(
        `${base}/api/admin/posts?token=${token}&page=${page}&limit=20`,
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      const data = await res.json();
      setPosts(data.posts || []);
      setPostsPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (e) {
      toast.error("Failed to load posts");
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleDeletePost = async (id) => {
    if (!confirm("Are you sure? This action cannot be undone.")) return;
    setDeletingPostId(id);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/admin/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Post deleted");
      fetchAdminPosts(postsPagination.page);
    } catch (e) {
      toast.error("Failed to delete post");
    } finally {
      setDeletingPostId(null);
    }
  };

  // Communities
  const fetchAdminCommunities = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingCommunities(true);
    try {
      const res = await fetch(`${base}/api/admin/communities?token=${token}`);
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      const data = await res.json();
      setCommunities(data.communities || []);
    } catch (e) {
      toast.error("Failed to load communities");
    } finally {
      setLoadingCommunities(false);
    }
  };

  const fetchCommunityCategories = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingCommunityCategories(true);
    try {
      const res = await fetch(`${base}/api/admin/community-categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      const data = await res.json();
      setCommunityCategories(data.categories || []);
    } catch (e) {
      toast.error("Failed to load forum categories");
    } finally {
      setLoadingCommunityCategories(false);
    }
  };

  const handleCreateCommunityCategory = async (e) => {
    e.preventDefault();
    if (!newCommunityCategory.name?.trim()) {
      toast.error("Category name is required");
      return;
    }
    setCreatingCommunityCategory(true);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/admin/community-categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCommunityCategory.name.trim(),
          defaultOpen: newCommunityCategory.defaultOpen,
          headingColor: newCommunityCategory.headingColor || "#2F3C96",
        }),
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Create failed");
      }
      toast.success("Category created");
      setNewCommunityCategory({
        name: "",
        defaultOpen: false,
        headingColor: "#2F3C96",
      });
      fetchCommunityCategories();
    } catch (e) {
      toast.error(e.message || "Failed to create category");
    } finally {
      setCreatingCommunityCategory(false);
    }
  };

  const handleDeleteCommunityCategory = async (id) => {
    if (
      !confirm(
        "Remove this category? Communities in it will be unlinked (not deleted).",
      )
    )
      return;
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/admin/community-categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Category removed");
      fetchCommunityCategories();
      fetchAdminCommunities();
    } catch (e) {
      toast.error("Failed to delete category");
    }
  };

  const handleUpdateCommunity = async (e) => {
    e.preventDefault();
    if (!editingCommunityId) return;
    setUpdatingCommunity(true);
    const { token } = getAuth();
    try {
      const res = await fetch(
        `${base}/api/admin/communities/${editingCommunityId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editCommunity.name?.trim() || undefined,
            description: editCommunity.description,
            categoryId: editCommunity.categoryId || null,
            iconSvg: editCommunity.iconSvg,
            color: editCommunity.color || "#2F3C96",
          }),
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }
      toast.success("Community updated");
      setEditingCommunityId(null);
      setEditCommunity({
        name: "",
        description: "",
        categoryId: "",
        iconSvg: "",
        color: "#2F3C96",
      });
      fetchAdminCommunities();
    } catch (e) {
      toast.error(e.message || "Failed to update community");
    } finally {
      setUpdatingCommunity(false);
    }
  };

  const handleUpdateCommunityIconOnly = async (e) => {
    e.preventDefault();
    if (!editingIconCommunityId) return;
    setUpdatingIconOnly(true);
    const { token } = getAuth();
    try {
      const res = await fetch(
        `${base}/api/admin/communities/${editingIconCommunityId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ iconSvg: editingIconSvg }),
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }
      toast.success("Icon updated");
      setEditingIconCommunityId(null);
      setEditingIconSvg("");
      setEditingIconCommunityName("");
      fetchAdminCommunities();
    } catch (e) {
      toast.error(e.message || "Failed to update icon");
    } finally {
      setUpdatingIconOnly(false);
    }
  };

  const handleNewCommunityThumbnailChange = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image (JPEG, PNG, GIF, or WebP)");
      return;
    }
    const { token } = getAuth();
    if (!token) return;
    setNewCommunityThumbnailUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${base}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      if (data.url)
        setNewCommunity((prev) => ({ ...prev, thumbnailUrl: data.url }));
    } catch (err) {
      toast.error(err.message || "Failed to upload thumbnail");
    } finally {
      setNewCommunityThumbnailUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleProposalThumbnailChange = async (proposalId, e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image (JPEG, PNG, GIF, or WebP)");
      return;
    }
    const { token } = getAuth();
    if (!token) return;
    setApprovalThumbnailUploading((prev) => ({ ...prev, [proposalId]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${base}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      if (data.url)
        setApprovalThumbnailOverride((prev) => ({
          ...prev,
          [proposalId]: data.url,
        }));
    } catch (err) {
      toast.error(err.message || "Failed to upload thumbnail");
    } finally {
      setApprovalThumbnailUploading((prev) => ({
        ...prev,
        [proposalId]: false,
      }));
      if (e.target) e.target.value = "";
    }
  };

  const handleNewResearcherCommunityThumbnailChange = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image (JPEG, PNG, GIF, or WebP)");
      return;
    }
    const { token } = getAuth();
    if (!token) return;
    setNewResearcherCommunityThumbnailUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${base}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      if (data.url)
        setNewResearcherCommunity((prev) => ({
          ...prev,
          thumbnailUrl: data.url,
        }));
    } catch (err) {
      toast.error(err.message || "Failed to upload thumbnail");
    } finally {
      setNewResearcherCommunityThumbnailUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleCreateResearcherCommunity = async (e) => {
    e.preventDefault();
    if (!newResearcherCommunity.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    setCreatingResearcherCommunity(true);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/admin/communities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newResearcherCommunity.name.trim(),
          description: newResearcherCommunity.description || "",
          coverImage: newResearcherCommunity.thumbnailUrl || undefined,
          isOfficial: false,
          communityType: "researcher",
        }),
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Create failed");
      }
      toast.success("Researcher community created");
      setNewResearcherCommunity({
        name: "",
        description: "",
        thumbnailUrl: "",
      });
      fetchAdminCommunities();
    } catch (e) {
      toast.error(e.message || "Failed to create researcher community");
    } finally {
      setCreatingResearcherCommunity(false);
    }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!newCommunity.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    setCreatingCommunity(true);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/admin/communities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCommunity.name.trim(),
          description: newCommunity.description || "",
          coverImage: newCommunity.thumbnailUrl || undefined,
          isOfficial: false,
          communityType: "patient",
          categoryId: newCommunity.categoryId || null,
          iconSvg: newCommunity.iconSvg || "",
          color: newCommunity.color || "#2F3C96",
        }),
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Create failed");
      }
      toast.success("Community created");
      setNewCommunity({
        name: "",
        description: "",
        thumbnailUrl: "",
        categoryId: "",
        iconSvg: "",
        color: "#2F3C96",
      });
      fetchAdminCommunities();
    } catch (e) {
      toast.error(e.message || "Failed to create community");
    } finally {
      setCreatingCommunity(false);
    }
  };

  const handleDeleteCommunity = async (id) => {
    if (
      !confirm(
        "Delete this community and all its threads/members? This cannot be undone.",
      )
    )
      return;
    setDeletingCommunityId(id);
    const { token } = getAuth();
    try {
      const res = await fetch(`${base}/api/admin/communities/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Community deleted");
      fetchAdminCommunities();
    } catch (e) {
      toast.error("Failed to delete community");
    } finally {
      setDeletingCommunityId(null);
    }
  };

  const fetchCommunityProposals = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingCommunityProposals(true);
    try {
      const res = await fetch(
        `${base}/api/admin/community-proposals?token=${token}`,
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      const data = await res.json();
      setCommunityProposals(data.proposals || []);
    } catch (e) {
      toast.error("Failed to load community proposals");
    } finally {
      setLoadingCommunityProposals(false);
    }
  };

  const handleApproveProposal = async (proposalId, thumbnailUrl) => {
    const { token } = getAuth();
    if (!token) return;
    setApprovingProposalId(proposalId);
    try {
      const res = await fetch(
        `${base}/api/admin/community-proposals/${proposalId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ thumbnailUrl: thumbnailUrl || undefined }),
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Approve failed");
      }
      toast.success("Proposal approved and community created");
      fetchCommunityProposals();
      fetchAdminCommunities();
    } catch (e) {
      toast.error(e.message || "Failed to approve proposal");
    } finally {
      setApprovingProposalId(null);
    }
  };

  const handleRejectProposal = async (proposalId) => {
    if (!confirm("Reject this community proposal?")) return;
    const { token } = getAuth();
    if (!token) return;
    setRejectingProposalId(proposalId);
    try {
      const res = await fetch(
        `${base}/api/admin/community-proposals/${proposalId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) throw new Error("Reject failed");
      toast.success("Proposal rejected");
      fetchCommunityProposals();
    } catch (e) {
      toast.error("Failed to reject proposal");
    } finally {
      setRejectingProposalId(null);
    }
  };

  const fetchWorkSubmissions = async () => {
    const { token } = getAuth();
    if (!token) return;
    setLoadingWorkSubmissions(true);
    try {
      const res = await fetch(`${base}/api/admin/work-submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      const data = await res.json();
      setWorkSubmissions(data.submissions || []);
    } catch (e) {
      toast.error("Failed to load work submissions");
    } finally {
      setLoadingWorkSubmissions(false);
    }
  };

  const handleApproveWorkSubmission = async (submissionId) => {
    const { token } = getAuth();
    if (!token) return;
    setApprovingWorkSubmissionId(submissionId);
    try {
      const res = await fetch(
        `${base}/api/admin/work-submissions/${submissionId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Approve failed");
      }
      toast.success("Submission approved");
      fetchWorkSubmissions();
    } catch (e) {
      toast.error(e.message || "Failed to approve submission");
    } finally {
      setApprovingWorkSubmissionId(null);
    }
  };

  const handleRejectWorkSubmission = async (submissionId) => {
    if (!confirm("Reject this work submission?")) return;
    const { token } = getAuth();
    if (!token) return;
    setRejectingWorkSubmissionId(submissionId);
    try {
      const res = await fetch(
        `${base}/api/admin/work-submissions/${submissionId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Reject failed");
      }
      toast.success("Submission rejected");
      fetchWorkSubmissions();
    } catch (e) {
      toast.error(e.message || "Failed to reject submission");
    } finally {
      setRejectingWorkSubmissionId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex bg-slate-50 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-royal-blue" />
        </div>
      </Layout>
    );
  }

  const verifiedCount = experts.filter((e) => e.isVerified).length;
  const unverifiedCount = experts.filter((e) => !e.isVerified).length;

  const activeSectionLabel =
    SECTIONS.find((s) => s.id === activeSection)?.label ?? "Dashboard";
  const adminEmail =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("adminEmail") || ""
      : "";

  return (
    <Layout>
      <div className="min-h-screen flex bg-slate-50/80">
        {/* Mobile overlay when sidebar is open */}
        <div
          className={`fixed inset-0 z-20 bg-black/40 transition-opacity md:hidden ${sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-hidden={!sidebarOpen}
          onClick={() => setSidebarOpen(false)}
        />
        {/* Sidebar — site colour (light pink/lavender); drawer on mobile, fixed on md+ */}
        <aside
          className={`fixed left-0 top-0 bottom-0 z-30 w-60 shrink-0 flex flex-col bg-brand-purple-100 border-r border-brand-purple-200 shadow-lg transition-transform duration-200 ease-out md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          aria-label="Admin navigation"
        >
          <div className="shrink-0 px-4 py-3 flex items-center gap-3 border-b border-brand-purple-200">
            <div className="w-9 h-9 rounded-lg bg-brand-royal-blue/10 flex items-center justify-center shrink-0">
              <img
                src="/logo1.webp"
                alt="collabiora"
                className="h-5 w-5 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-brand-royal-blue text-sm block truncate">
                collabiora
              </span>
              <span className="text-[11px] text-brand-royal-blue/80 font-medium block">
                Admin
              </span>
              {adminEmail ? (
                <span
                  className="text-[10px] text-brand-royal-blue/70 truncate block mt-0.5"
                  title={adminEmail}
                >
                  {adminEmail}
                </span>
              ) : null}
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto overscroll-contain py-3">
            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.title} className="mb-5">
                <p className="text-[10px] font-semibold text-brand-royal-blue/70 uppercase tracking-widest px-3 mb-1.5">
                  {group.title}
                </p>
                <ul className="space-y-0.5 px-2">
                  {group.items.map((id) => {
                    const section = SECTIONS.find((s) => s.id === id);
                    if (!section) return null;
                    const Icon = section.icon;
                    const isActive = activeSection === id;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSection(id);
                            setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition-colors rounded-lg ${
                            isActive
                              ? "bg-brand-royal-blue text-white shadow-sm"
                              : "text-brand-royal-blue/90 hover:bg-brand-purple-200/70 hover:text-brand-royal-blue"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-brand-royal-blue/80"}`}
                          />
                          <span className="flex-1 truncate">
                            {section.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="p-3 border-t border-brand-purple-200">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-brand-royal-blue/90 hover:text-brand-royal-blue hover:bg-brand-purple-200/70 rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              LogOut
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 ml-0 md:ml-60 relative">
          {/* Top bar — section title (site colour) + mobile menu button */}
          <header className="sticky top-0 z-10 h-14 shrink-0 flex items-center gap-3 px-4 md:px-6 bg-brand-purple-100/95 backdrop-blur-sm border-b border-brand-purple-200/80 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="md:hidden p-2 -ml-1 rounded-lg text-brand-royal-blue hover:bg-brand-purple-200/70 transition-colors"
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <h1 className="text-base md:text-lg font-semibold text-brand-royal-blue truncate flex-1 min-w-0">
              {activeSectionLabel}
            </h1>
          </header>
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {activeSection === "overview" &&
              (() => {
                const newJoiners =
                  (overviewStats?.newPatients?.thisMonth ?? 0) +
                  (overviewStats?.newResearchers?.thisMonth ?? 0);
                const newJoinersLastMonth =
                  (overviewStats?.newPatients?.lastMonth ?? 0) +
                  (overviewStats?.newResearchers?.lastMonth ?? 0);
                const joinersDiff = newJoiners - newJoinersLastMonth;
                const joinersPct = newJoinersLastMonth
                  ? Math.round((joinersDiff / newJoinersLastMonth) * 100)
                  : joinersDiff > 0
                    ? 100
                    : 0;
                const verificationRate = experts.length
                  ? Math.round((verifiedCount / experts.length) * 100)
                  : 0;
                const pendingOver3Count = experts.filter(
                  (e) =>
                    !e.isVerified && e.pendingDays != null && e.pendingDays > 3,
                ).length;
                const signupsOverTime = overviewStats?.signupsOverTime || [];
                const engagementOverTime =
                  overviewStats?.engagementOverTime || [];
                return (
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 min-w-0 space-y-4">
                      {loadingOverviewStats ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin text-brand-royal-blue" />
                        </div>
                      ) : (
                        <>
                          {/* Total patients & researchers */}
                          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                              Site totals
                            </h3>
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold text-brand-royal-blue">
                                {overviewStats?.totalPatients ?? "—"} total
                                patients
                              </span>
                              {" · "}
                              <span className="font-semibold text-brand-royal-blue">
                                {overviewStats?.totalResearchers ?? "—"} total
                                researchers
                              </span>
                            </p>
                          </div>

                          {/* This Week Summary */}
                          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                              This week summary
                            </h3>
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold text-emerald-600">
                                +{overviewStats?.newPatients?.thisWeek ?? 0} new
                                patients
                              </span>
                              {", "}
                              <span className="font-semibold">
                                {overviewStats?.newResearchers?.thisWeek ?? 0}{" "}
                                new researchers
                              </span>
                              {verificationRate > 0 && ", "}
                              <span>{verificationRate}% experts verified</span>
                              {", "}
                              <span>
                                {overviewStats?.unresolvedFeedbackCount ?? 0}{" "}
                                feedback open
                              </span>
                              {joinersPct !== 0 && (
                                <span
                                  className={
                                    joinersPct < 0
                                      ? "text-amber-600"
                                      : "text-emerald-600"
                                  }
                                >
                                  {" "}
                                  · Engagement {joinersPct > 0 ? "+" : ""}
                                  {joinersPct}% vs last month
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Row 1 — Smart KPI cards with trends */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <UserCircle className="w-5 h-5 text-brand-royal-blue" />
                                {newJoinersLastMonth !== undefined && (
                                  <span
                                    className={`text-xs font-medium flex items-center gap-0.5 ${joinersDiff >= 0 ? "text-emerald-600" : "text-red-600"}`}
                                  >
                                    {joinersDiff >= 0 ? (
                                      <TrendingUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <TrendingDown className="w-3.5 h-3.5" />
                                    )}
                                    {joinersDiff >= 0 ? "+" : ""}
                                    {joinersDiff} vs last month (
                                    {joinersPct >= 0 ? "+" : ""}
                                    {joinersPct}%)
                                  </span>
                                )}
                              </div>
                              <p className="text-2xl font-bold text-brand-royal-blue tabular-nums">
                                {newJoiners || "—"}
                              </p>
                              <p className="text-sm text-brand-gray">
                                New joiners (
                                {overviewStats?.currentMonthLabel ??
                                  "this month"}
                                )
                              </p>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <User className="w-5 h-5 text-brand-royal-blue" />
                                <span className="text-xs font-medium text-emerald-600">
                                  {verificationRate}% verified
                                </span>
                              </div>
                              <p className="text-2xl font-bold text-brand-royal-blue tabular-nums">
                                {experts.length}
                              </p>
                              <p className="text-sm text-brand-gray">
                                Researchers (total on site)
                              </p>
                              <p className="text-xs text-brand-gray mt-0.5">
                                {verifiedCount} verified, {unverifiedCount}{" "}
                                pending
                                {pendingOver3Count > 0 && (
                                  <> · {pendingOver3Count} pending &gt;3 days</>
                                )}
                              </p>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <MessageSquare className="w-5 h-5 text-brand-royal-blue" />
                                <span className="text-xs text-brand-gray">
                                  {overviewStats?.forumsActiveThisWeek ?? 0}{" "}
                                  active this week
                                </span>
                              </div>
                              <p className="text-2xl font-bold text-brand-royal-blue tabular-nums">
                                {overviewStats?.totalForums ?? "—"}
                              </p>
                              <p className="text-sm text-brand-gray">Forums</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <FileText className="w-5 h-5 text-brand-royal-blue" />
                                {(overviewStats?.discoveryPostsLast7Days ??
                                  0) === 0 && (
                                  <span className="text-xs font-medium text-amber-600 flex items-center gap-0.5">
                                    <AlertTriangle className="w-3.5 h-3.5" /> 0
                                    in last 7 days
                                  </span>
                                )}
                              </div>
                              <p className="text-2xl font-bold text-brand-royal-blue tabular-nums">
                                {overviewStats?.totalDiscoveryPosts ?? "—"}
                              </p>
                              <p className="text-sm text-brand-gray">
                                Discovery Posts
                              </p>
                              <p className="text-xs text-brand-gray">
                                {overviewStats?.discoveryPostsLast7Days ?? 0}{" "}
                                posted in last 7 days
                              </p>
                            </div>
                          </div>

                          {/* Row 2 — Platform Health */}
                          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                              Platform health
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                                <p className="text-xs text-slate-500">
                                  Active signups (7d)
                                </p>
                                <p className="text-lg font-bold text-brand-royal-blue tabular-nums">
                                  {(overviewStats?.newPatients?.thisWeek ?? 0) +
                                    (overviewStats?.newResearchers?.thisWeek ??
                                      0)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                                <p className="text-xs text-slate-500">
                                  Returning rate
                                </p>
                                <p className="text-lg font-bold text-brand-royal-blue tabular-nums">
                                  —
                                </p>
                              </div>
                              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                                <p className="text-xs text-slate-500">
                                  Unresolved feedback
                                </p>
                                <p className="text-lg font-bold text-brand-royal-blue tabular-nums">
                                  {overviewStats?.unresolvedFeedbackCount ?? 0}
                                </p>
                              </div>
                              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                                <p className="text-xs text-slate-500">
                                  Avg dashboard load
                                </p>
                                <p className="text-lg font-bold text-brand-royal-blue tabular-nums">
                                  —
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Month comparison (from Feb) — calendar month = same as "New joiners" KPI above */}
                          {(overviewStats?.monthlyComparison?.length ?? 0) >
                            0 && (
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm overflow-x-auto">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                Month comparison (from Feb)
                              </h3>
                              <p className="text-xs text-brand-gray mb-3">
                                New signups per calendar month. Current month
                                matches &quot;New joiners (
                                {overviewStats?.currentMonthLabel ??
                                  "this month"}
                                )&quot; above.
                              </p>
                              <table className="w-full min-w-[320px] text-sm">
                                <thead>
                                  <tr className="border-b border-brand-gray-100">
                                    <th className="text-left py-2 pr-4 font-semibold text-brand-gray">
                                      Month
                                    </th>
                                    <th className="text-right py-2 px-2 font-semibold text-brand-gray">
                                      Patients
                                    </th>
                                    <th className="text-right py-2 px-2 font-semibold text-brand-gray">
                                      Researchers
                                    </th>
                                    <th className="text-right py-2 pl-2 font-semibold text-brand-royal-blue">
                                      Total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {overviewStats.monthlyComparison.map(
                                    (row) => (
                                      <tr
                                        key={`${row.year}-${row.month}`}
                                        className="border-b border-brand-gray-50 last:border-0"
                                      >
                                        <td className="py-2 pr-4 font-medium text-gray-800">
                                          {row.monthLabel}
                                        </td>
                                        <td className="text-right py-2 px-2 tabular-nums text-brand-royal-blue">
                                          {row.patients}
                                        </td>
                                        <td className="text-right py-2 px-2 tabular-nums text-purple-600">
                                          {row.researchers}
                                        </td>
                                        <td className="text-right py-2 pl-2 tabular-nums font-semibold text-gray-800">
                                          {row.total}
                                        </td>
                                      </tr>
                                    ),
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Row 3 — New users compact + Charts */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                New users (last 30 days)
                              </h3>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Patients
                                  </p>
                                  <p className="text-sm font-bold text-brand-royal-blue">
                                    24h:{" "}
                                    {overviewStats?.newPatients?.last24 ?? "—"}{" "}
                                    · Week:{" "}
                                    {overviewStats?.newPatients?.thisWeek ??
                                      "—"}{" "}
                                    · Month:{" "}
                                    {overviewStats?.newPatients?.thisMonth ??
                                      "—"}
                                  </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Researchers
                                  </p>
                                  <p className="text-sm font-bold text-brand-royal-blue">
                                    24h:{" "}
                                    {overviewStats?.newResearchers?.last24 ??
                                      "—"}{" "}
                                    · Week:{" "}
                                    {overviewStats?.newResearchers?.thisWeek ??
                                      "—"}{" "}
                                    · Month:{" "}
                                    {overviewStats?.newResearchers?.thisMonth ??
                                      "—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                Experts
                              </h3>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{ width: `${verificationRate}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-brand-royal-blue tabular-nums">
                                  {verificationRate}%
                                </span>
                              </div>
                              <p className="text-xs text-brand-gray mt-1">
                                Verification rate · Pending &gt;3 days:{" "}
                                {unverifiedCount}
                              </p>
                            </div>
                          </div>

                          {/* Row 4 — Charts */}
                          {(signupsOverTime.length > 0 ||
                            engagementOverTime.length > 0) && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              {signupsOverTime.length > 0 &&
                                (() => {
                                  const slice = signupsOverTime.slice(-30);
                                  const maxBoth = Math.max(
                                    1,
                                    ...slice.map(
                                      (x) =>
                                        (x.patients || 0) +
                                        (x.researchers || 0),
                                    ),
                                  );
                                  return (
                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                        Signups over time
                                      </h3>
                                      <div className="h-[80px] flex items-end gap-px">
                                        {slice.map((d) => {
                                          const p = d.patients || 0;
                                          const r = d.researchers || 0;
                                          const total = p + r;
                                          const sum = (total / maxBoth) * 100;
                                          return (
                                            <div
                                              key={d.date}
                                              className="flex-1 flex flex-col rounded-t min-h-[2px] overflow-hidden"
                                              style={{
                                                height: `${Math.max(2, sum)}%`,
                                              }}
                                              title={`${d.date}: ${p} patients, ${r} researchers`}
                                            >
                                              {p > 0 && (
                                                <div
                                                  className="w-full bg-brand-royal-blue/80"
                                                  style={{
                                                    height: `${(p / total) * 100}%`,
                                                  }}
                                                />
                                              )}
                                              {r > 0 && (
                                                <div
                                                  className="w-full bg-purple-500/80"
                                                  style={{
                                                    height: `${(r / total) * 100}%`,
                                                  }}
                                                />
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="flex gap-3 mt-1 text-xs text-brand-gray">
                                        <span className="flex items-center gap-1">
                                          <span className="w-2 h-2 rounded-full bg-brand-royal-blue/80" />{" "}
                                          Patients
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <span className="w-2 h-2 rounded-full bg-purple-500/80" />{" "}
                                          Researchers
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              {engagementOverTime.length > 0 && (
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                    Engagement (forums + posts)
                                  </h3>
                                  <div className="h-[80px] flex items-end gap-px">
                                    {engagementOverTime
                                      .slice(-30)
                                      .map((d, i) => {
                                        const total =
                                          (d.threads || 0) + (d.posts || 0);
                                        const maxVal = Math.max(
                                          1,
                                          ...engagementOverTime.map(
                                            (x) =>
                                              (x.threads || 0) + (x.posts || 0),
                                          ),
                                        );
                                        return (
                                          <div
                                            key={d.date}
                                            className="flex-1 bg-emerald-500/70 rounded-t min-h-[2px]"
                                            style={{
                                              height: `${Math.max(2, (total / maxVal) * 100)}%`,
                                            }}
                                            title={`${d.date}: ${total}`}
                                          />
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Row 5 — Conversion funnels */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                Researchers funnel
                              </h3>
                              <div className="space-y-1 text-sm">
                                <p className="flex justify-between">
                                  <span>{experts.length} total</span>
                                </p>
                                <p className="flex justify-between text-emerald-600">
                                  → {verifiedCount} verified
                                </p>
                                <p className="flex justify-between text-amber-600">
                                  → {unverifiedCount} unverified
                                </p>
                                <p className="flex justify-between text-brand-gray">
                                  → — active this week
                                </p>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                Patients (
                                {overviewStats?.currentMonthLabel ??
                                  "this month"}
                                )
                              </h3>
                              <div className="space-y-1 text-sm">
                                <p className="flex justify-between">
                                  <span>
                                    {overviewStats?.newPatients?.thisMonth ?? 0}{" "}
                                    joined
                                  </span>
                                </p>
                                <p className="flex justify-between text-brand-gray">
                                  → — completed profile
                                </p>
                                <p className="flex justify-between text-brand-gray">
                                  → — searched experts
                                </p>
                                <p className="flex justify-between text-brand-gray">
                                  → — contacted expert
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right sidebar — Alerts */}
                    <div className="lg:w-72 shrink-0">
                      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 shadow-sm sticky top-20">
                        <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          Attention needed
                        </h3>
                        <ul className="space-y-2 text-sm text-amber-900">
                          {unverifiedCount > 0 && (
                            <li className="flex items-start gap-2">
                              <span className="text-amber-600 font-medium">
                                {unverifiedCount} researcher
                                {unverifiedCount !== 1 ? "s" : ""} unverified
                              </span>
                            </li>
                          )}
                          {(overviewStats?.unresolvedFeedbackCount ?? 0) >
                            0 && (
                            <li className="flex items-start gap-2">
                              <span className="text-amber-600 font-medium">
                                {overviewStats?.unresolvedFeedbackCount ?? 0}{" "}
                                feedback open
                              </span>
                            </li>
                          )}
                          {(overviewStats?.discoveryPostsLast7Days ?? 0) ===
                            0 &&
                            (overviewStats?.totalDiscoveryPosts ?? 0) > 0 && (
                              <li className="flex items-start gap-2">
                                <span className="text-amber-600 font-medium">
                                  0 discovery posts in last 7 days
                                </span>
                              </li>
                            )}
                          {unverifiedCount === 0 &&
                            (overviewStats?.unresolvedFeedbackCount ?? 0) ===
                              0 &&
                            !(
                              (overviewStats?.discoveryPostsLast7Days ?? 0) ===
                                0 &&
                              (overviewStats?.totalDiscoveryPosts ?? 0) > 0
                            ) && (
                              <li className="text-brand-gray">
                                No urgent items
                              </li>
                            )}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {activeSection === "profile-reminders" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-brand-royal-blue">
                      Profile completion reminders
                    </h2>
                    <p className="text-xs text-slate-600">
                      Track automated reminder emails for patients and
                      researchers.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-0.5 text-xs">
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded-full ${profileReminderRoleFilter === "all" ? "bg-brand-royal-blue text-white" : "text-slate-700"}`}
                      onClick={() => {
                        setProfileReminderRoleFilter("all");
                        fetchProfileReminderData("all");
                      }}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded-full ${profileReminderRoleFilter === "patient" ? "bg-brand-royal-blue text-white" : "text-slate-700"}`}
                      onClick={() => {
                        setProfileReminderRoleFilter("patient");
                        fetchProfileReminderData("patient");
                      }}
                    >
                      Patients
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded-full ${profileReminderRoleFilter === "researcher" ? "bg-brand-royal-blue text-white" : "text-slate-700"}`}
                      onClick={() => {
                        setProfileReminderRoleFilter("researcher");
                        fetchProfileReminderData("researcher");
                      }}
                    >
                      Researchers
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Total patients
                    </p>
                    <p className="text-2xl font-semibold text-brand-royal-blue">
                      {profileReminderStats?.totalPatients ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Total researchers
                    </p>
                    <p className="text-2xl font-semibold text-brand-royal-blue">
                      {profileReminderStats?.totalResearchers ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Incomplete patients
                    </p>
                    <p className="text-2xl font-semibold text-brand-royal-blue">
                      {profileReminderStats?.incompletePatients ?? "—"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Completed: {profileReminderStats?.completePatients ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Incomplete researchers
                    </p>
                    <p className="text-2xl font-semibold text-brand-royal-blue">
                      {profileReminderStats?.incompleteResearchers ?? "—"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Completed:{" "}
                      {profileReminderStats?.completeResearchers ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Total reminders sent
                    </p>
                    <p className="text-2xl font-semibold text-brand-royal-blue">
                      {profileReminderStats?.totalRemindersSent ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Opt-outs
                    </p>
                    <p className="text-2xl font-semibold text-brand-royal-blue">
                      {profileReminderStats?.optOuts ?? 0}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200/80">
                    <p className="text-xs font-semibold text-slate-600">
                      Recent users (sorted by account created)
                    </p>
                    {loadingProfileReminders && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Refreshing...</span>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">
                            Email
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Role
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Email verified
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Completion
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Missing steps
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Last stage
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Account created
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Last reminder
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileReminderLogs.length === 0 && (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-3 py-6 text-center text-slate-500"
                            >
                              No reminder activity yet.
                            </td>
                          </tr>
                        )}
                        {profileReminderLogs.map((row) => (
                          <tr
                            key={row._id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-3 py-2 text-slate-800 break-all">
                              {row.email || "—"}
                            </td>
                            <td className="px-3 py-2 capitalize text-slate-700">
                              {row.role || "unknown"}
                            </td>
                            <td className="px-3 py-2">
                              {row.emailVerified ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                                  <CheckCircle className="w-3 h-3" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">
                                  <AlertTriangle className="w-3 h-3" />
                                  Not verified
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.isComplete ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                                  <CheckCircle className="w-3 h-3" />
                                  Complete
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-100">
                                  <XCircle className="w-3 h-3" />
                                  Incomplete
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600 max-w-[260px]">
                              <span className="line-clamp-2">
                                {row.missingStepsSummary || "Completed"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {row.stage || "—"}
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {row.userCreatedAt
                                ? new Date(
                                    row.userCreatedAt,
                                  ).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {row.sentAt
                                ? new Date(row.sentAt).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-3 py-2">
                              {row.optOut ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 border border-red-100">
                                  <XCircle className="w-3 h-3" />
                                  Opted out
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                                  <CheckCircle className="w-3 h-3" />
                                  Active
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "active-users" && (
              <div className="space-y-4">
                <div className="flex items-center justify-end">
                  <Button
                    onClick={fetchActiveUserStats}
                    disabled={loadingActiveUsers}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-royal-blue hover:bg-brand-blue-600 text-white rounded-lg text-sm transition-all disabled:opacity-50"
                  >
                    {loadingActiveUsers ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Refresh
                  </Button>
                </div>

                {loadingActiveUsers && !activeUserAnalytics ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-royal-blue" />
                  </div>
                ) : activeUserAnalytics ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          DAU (today, UTC)
                        </p>
                        <p className="text-3xl font-bold text-brand-royal-blue">
                          {activeUserAnalytics.summary?.dauToday ?? 0}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          Distinct users with at least one activity signal today
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          WAU (rolling 7d)
                        </p>
                        <p className="text-3xl font-bold text-emerald-700">
                          {activeUserAnalytics.summary?.wau ?? 0}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          Distinct users active on any of the last 7 UTC days
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          MAU (rolling 30d)
                        </p>
                        <p className="text-3xl font-bold text-violet-700">
                          {activeUserAnalytics.summary?.mau ?? 0}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          Distinct users active on any of the last 30 UTC days
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        Today&apos;s DAU by role (UTC)
                      </p>
                      <div className="flex flex-wrap gap-6 text-sm">
                        <span>
                          <span className="text-slate-500">Patients:</span>{" "}
                          <span className="font-semibold text-brand-royal-blue">
                            {activeUserAnalytics.dauTodayByRole?.patient ?? 0}
                          </span>
                        </span>
                        <span>
                          <span className="text-slate-500">Researchers:</span>{" "}
                          <span className="font-semibold text-brand-royal-blue">
                            {activeUserAnalytics.dauTodayByRole?.researcher ??
                              0}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <h3 className="text-sm font-semibold text-brand-royal-blue mb-1 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Daily active users (UTC)
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">
                        From {activeUserAnalytics.trackingStartedDate ?? "—"}{" "}
                        through today — only days with tracking data (no
                        backfilled history).
                      </p>
                      <div className="grid grid-cols-1 gap-2 max-h-[min(70vh,520px)] overflow-y-auto pr-1">
                        {(() => {
                          const series = activeUserAnalytics.dailySeries || [];
                          const max = Math.max(
                            1,
                            ...series.map((d) => d.count || 0),
                          );
                          return series.map((row) => (
                            <div
                              key={row.date}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="w-[88px] shrink-0 text-slate-500 tabular-nums">
                                {row.date}
                              </span>
                              <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                                <div
                                  className="h-full bg-brand-royal-blue/80 rounded-sm transition-all min-w-[2px]"
                                  style={{
                                    width: `${Math.max(
                                      4,
                                      (row.count / max) * 100,
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="w-10 text-right font-semibold text-slate-700 tabular-nums">
                                {row.count}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      As of{" "}
                      {activeUserAnalytics.summary?.asOf
                        ? new Date(
                            activeUserAnalytics.summary.asOf,
                          ).toLocaleString()
                        : "—"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">No data.</p>
                )}
              </div>
            )}

            {activeSection === "search" && (
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="search-channel-audience"
                      className="text-xs font-medium text-brand-gray whitespace-nowrap"
                    >
                      Audience
                    </label>
                    <select
                      id="search-channel-audience"
                      value={searchChannelAudience}
                      onChange={(e) => setSearchChannelAudience(e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-800 min-w-[200px]"
                    >
                      <option value="all">All (signed in + guests)</option>
                      <option value="signed_in">Signed in only</option>
                      <option value="guest">Guests only</option>
                    </select>
                  </div>
                  <Button
                    onClick={() => {
                      fetchSearchStats();
                      fetchSearchChannelAnalytics();
                    }}
                    disabled={loadingStats || loadingSearchChannels}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-royal-blue hover:bg-brand-blue-600 text-white rounded-lg text-sm transition-all disabled:opacity-50"
                  >
                    {loadingStats || loadingSearchChannels ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Refresh
                  </Button>
                </div>

                <div className="mb-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-5 h-5 text-brand-royal-blue" />
                    <h3 className="font-semibold text-brand-gray text-base">
                      Page search vs Yori (chatbot)
                    </h3>
                  </div>
                  <p className="text-xs text-brand-gray mb-3 max-w-3xl">
                    {searchChannelAudience === "all" && (
                      <>
                        <span className="font-medium text-slate-700">
                          Everyone
                        </span>{" "}
                        — signed-in users (unlimited search on Trials,
                        Publications, Experts) plus guests on the free tier.
                        Guest uniques use{" "}
                        <code className="text-[11px] bg-slate-100 px-1 rounded">
                          x-device-id
                        </code>{" "}
                        when present; guests without a device id are counted in
                        events but not in distinct actors.
                      </>
                    )}
                    {searchChannelAudience === "signed_in" && (
                      <>
                        <span className="font-medium text-slate-700">
                          Signed in only
                        </span>{" "}
                        — same cohort as unlimited search on the classic pages.
                        Chatbot counts user messages when authenticated.
                      </>
                    )}
                    {searchChannelAudience === "guest" && (
                      <>
                        <span className="font-medium text-slate-700">
                          Guests only
                        </span>{" "}
                        — anonymous API usage (search limits apply). Distinct
                        guests require{" "}
                        <code className="text-[11px] bg-slate-100 px-1 rounded">
                          x-device-id
                        </code>
                        .
                      </>
                    )}{" "}
                    All views use{" "}
                    <code className="text-[11px] bg-slate-100 px-1 rounded">
                      POST /api/chatbot/chat
                    </code>{" "}
                    for Yori message events (filter applies the same way).
                  </p>

                  {loadingSearchChannels && !searchChannelAnalytics ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-royal-blue" />
                    </div>
                  ) : searchChannelAnalytics ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-blue-50/80 to-white p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            <FlaskConical className="w-4 h-4 text-blue-600" />
                            Trials
                          </div>
                          <p className="text-2xl font-bold text-brand-royal-blue mt-1 tabular-nums">
                            {searchChannelAnalytics.totalsLastPeriod?.trials
                              ?.events ?? 0}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            distinct actors (range):{" "}
                            {searchChannelAnalytics.totalsLastPeriod?.trials
                              ?.uniqueUsersPeriod ?? 0}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-violet-50/80 to-white p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            <BookOpen className="w-4 h-4 text-violet-600" />
                            Publications
                          </div>
                          <p className="text-2xl font-bold text-violet-700 mt-1 tabular-nums">
                            {searchChannelAnalytics.totalsLastPeriod
                              ?.publications?.events ?? 0}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            distinct actors (range):{" "}
                            {searchChannelAnalytics.totalsLastPeriod
                              ?.publications?.uniqueUsersPeriod ?? 0}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            <Users className="w-4 h-4 text-emerald-600" />
                            Experts
                          </div>
                          <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                            {searchChannelAnalytics.totalsLastPeriod?.experts
                              ?.events ?? 0}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            distinct actors (range):{" "}
                            {searchChannelAnalytics.totalsLastPeriod?.experts
                              ?.uniqueUsersPeriod ?? 0}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-amber-50/80 to-white p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            <MessageSquare className="w-4 h-4 text-amber-600" />
                            Yori (chat)
                          </div>
                          <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
                            {searchChannelAnalytics.totalsLastPeriod?.chatbot
                              ?.events ?? 0}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            distinct actors (range):{" "}
                            {searchChannelAnalytics.totalsLastPeriod?.chatbot
                              ?.uniqueUsersPeriod ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                          Comparison (last {searchChannelAnalytics.days} days,
                          UTC
                          {searchChannelAudience === "all"
                            ? " · all users"
                            : searchChannelAudience === "signed_in"
                              ? " · signed in"
                              : " · guests"}
                          )
                        </p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                          <span>
                            <span className="text-slate-500">
                              Classic search (trials + publications + experts):
                            </span>{" "}
                            <span className="font-semibold tabular-nums">
                              {searchChannelAnalytics.comparison
                                ?.classicSearchEvents ?? 0}{" "}
                              events
                            </span>
                            {searchChannelAnalytics.comparison?.classicShare !=
                              null && (
                              <span className="text-slate-500 ml-1">
                                (
                                {(
                                  (searchChannelAnalytics.comparison
                                    .classicShare || 0) * 100
                                ).toFixed(1)}
                                %)
                              </span>
                            )}
                          </span>
                          <span>
                            <span className="text-slate-500">
                              Chatbot messages:
                            </span>{" "}
                            <span className="font-semibold tabular-nums text-amber-800">
                              {searchChannelAnalytics.comparison
                                ?.chatbotEvents ?? 0}{" "}
                              events
                            </span>
                            {searchChannelAnalytics.comparison?.chatbotShare !=
                              null && (
                              <span className="text-slate-500 ml-1">
                                (
                                {(
                                  (searchChannelAnalytics.comparison
                                    .chatbotShare || 0) * 100
                                ).toFixed(1)}
                                %)
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Distinct users (any classic surface):{" "}
                          <span className="font-medium text-slate-700">
                            {searchChannelAnalytics.comparison
                              ?.distinctUsersClassicAnyChannel ?? 0}
                          </span>
                          {" · "}
                          Distinct chatbot actors:{" "}
                          <span className="font-medium text-slate-700">
                            {searchChannelAnalytics.comparison
                              ?.distinctUsersChatbot ?? 0}
                          </span>
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 bg-white p-3 overflow-x-auto">
                        <p className="text-xs font-semibold text-slate-600 mb-2">
                          Daily events (UTC) — filtered by audience
                        </p>
                        <table className="w-full text-xs text-left border-collapse min-w-[520px]">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                              <th className="py-2 pr-2 font-medium">Date</th>
                              <th className="py-2 pr-2 font-medium text-right">
                                Trials
                              </th>
                              <th className="py-2 pr-2 font-medium text-right">
                                Publications
                              </th>
                              <th className="py-2 pr-2 font-medium text-right">
                                Experts
                              </th>
                              <th className="py-2 pr-2 font-medium text-right">
                                Chat
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(searchChannelAnalytics.series || [])
                              .slice()
                              .reverse()
                              .slice(0, 14)
                              .map((row) => (
                                <tr
                                  key={row.date}
                                  className="border-b border-slate-100 hover:bg-slate-50/80"
                                >
                                  <td className="py-1.5 pr-2 text-slate-600 whitespace-nowrap">
                                    {row.date}
                                  </td>
                                  <td className="py-1.5 pr-2 text-right tabular-nums">
                                    {row.trials?.events ?? 0}
                                  </td>
                                  <td className="py-1.5 pr-2 text-right tabular-nums">
                                    {row.publications?.events ?? 0}
                                  </td>
                                  <td className="py-1.5 pr-2 text-right tabular-nums">
                                    {row.experts?.events ?? 0}
                                  </td>
                                  <td className="py-1.5 pr-2 text-right tabular-nums text-amber-800">
                                    {row.chatbot?.events ?? 0}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        <p className="text-[11px] text-slate-400 mt-2">
                          Showing last 14 UTC days (newest first). Range:{" "}
                          {searchChannelAnalytics.range?.start} →{" "}
                          {searchChannelAnalytics.range?.end}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No search channel metrics yet. Data appears as users run
                      searches and use the chatbot.
                    </p>
                  )}
                </div>

                {loadingStats ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-royal-blue" />
                  </div>
                ) : searchStats ? (
                  <>
                    <div className="bg-[#F5F5F5] rounded-lg p-4 border border-[rgba(208,196,226,0.4)] mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-5 h-5 text-brand-royal-blue" />
                        <h3 className="font-semibold text-brand-gray">
                          Configuration
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-brand-gray mb-1">
                            Max Free Searches
                          </p>
                          <p className="text-2xl font-bold text-brand-royal-blue">
                            {searchStats?.maxFreeSearches ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-brand-gray mb-1">
                            Device Tokens
                          </p>
                          <p className="text-2xl font-bold text-brand-royal-blue">
                            {searchStats?.statistics?.deviceTokens?.total ??
                              searchStats?.statistics?.anonymousTokens?.total ??
                              0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-brand-gray mb-1">
                            IP Limits
                          </p>
                          <p className="text-2xl font-bold text-brand-royal-blue">
                            {searchStats?.statistics?.ipLimits?.total ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#F5F5F5] rounded-lg p-4 border border-[rgba(208,196,226,0.4)] mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Database className="w-5 h-5 text-brand-royal-blue" />
                        <h3 className="font-semibold text-brand-gray">
                          Statistics
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-brand-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="w-4 h-4 text-brand-royal-blue" />
                            <span className="text-sm font-semibold text-brand-gray">
                              Device Token Searches
                            </span>
                          </div>
                          <p className="text-xl font-bold text-brand-royal-blue">
                            {searchStats?.statistics?.deviceTokens
                              ?.totalSearches ??
                              searchStats?.statistics?.anonymousTokens
                                ?.totalSearches ??
                              0}
                          </p>
                          <p className="text-xs text-brand-gray mt-1">
                            Total searches across all device tokens
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-semibold text-brand-gray">
                              IP Limit Searches
                            </span>
                          </div>
                          <p className="text-xl font-bold text-purple-700">
                            {searchStats?.statistics?.ipLimits?.totalSearches ??
                              0}
                          </p>
                          <p className="text-xs text-brand-gray mt-1">
                            Total searches across all IP addresses
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#F5F5F5] rounded-lg p-4 border border-[rgba(208,196,226,0.4)]">
                      <div className="flex items-center gap-2 mb-3">
                        <RefreshCw className="w-5 h-5 text-brand-royal-blue" />
                        <h3 className="font-semibold text-brand-gray">
                          Reset Controls
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Button
                          onClick={handleResetDeviceTokens}
                          disabled={resetting.deviceTokens}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resetting.deviceTokens ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Database className="w-4 h-4" />
                          )}
                          Reset Device Tokens
                        </Button>
                        <Button
                          onClick={handleResetIPLimits}
                          disabled={resetting.ipLimits}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resetting.ipLimits ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Globe className="w-4 h-4" />
                          )}
                          Reset IP Limits
                        </Button>
                        <Button
                          onClick={handleResetAll}
                          disabled={resetting.all}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resetting.all ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Reset All
                        </Button>
                      </div>
                      <p className="text-xs text-brand-gray mt-3">
                        ⚠️ Resetting will set all search counts to 0. This
                        action cannot be undone.
                      </p>
                    </div>

                    <div className="bg-yellow-50 backdrop-blur-sm rounded-lg p-4 border border-yellow-200 mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <RefreshCw className="w-5 h-5 text-yellow-600" />
                        <h3 className="font-semibold text-brand-gray">
                          Database Cleanup
                        </h3>
                      </div>
                      <div className="mb-3">
                        <Button
                          onClick={handleCleanupDeviceTokens}
                          disabled={resetting.cleanup}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resetting.cleanup ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Database className="w-4 h-4" />
                          )}
                          Cleanup Old Device Tokens
                        </Button>
                      </div>
                      <p className="text-xs text-brand-gray">
                        🧹 Deletes device tokens that haven't been used in 30+
                        days or were created 7+ days ago and never used.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-brand-gray">
                    Failed to load search statistics
                  </div>
                )}
              </div>
            )}

            {activeSection === "experts" && (
              <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border border-brand-purple-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-brand-royal-blue/8 via-brand-purple-50 to-transparent border-b border-brand-purple-200/40 px-4 md:px-6 py-3 md:py-4">
                  <p className="text-xs md:text-sm text-brand-gray">
                    Review and verify expert profiles
                    <span className="ml-1 md:ml-2 font-semibold text-brand-royal-blue">
                      · {overviewStats?.totalResearchers ?? experts.length}{" "}
                      researchers
                    </span>
                  </p>
                </div>
                <div className="px-4 md:px-6 pt-3 pb-2 border-b border-brand-purple-200/40 flex flex-wrap items-center gap-2">
                  <span className="text-xs md:text-sm font-medium text-brand-gray flex items-center gap-1.5 shrink-0">
                    <Download className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-royal-blue" />
                    Export:
                  </span>
                  <Button
                    onClick={() => exportExpertsAsTxt(experts)}
                    disabled={experts.length === 0}
                    className="px-2.5 py-1 text-xs md:text-sm bg-white border border-brand-purple-200/60 text-brand-royal-blue hover:bg-brand-purple-50 rounded-lg flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    TXT
                  </Button>
                  <Button
                    onClick={() => exportExpertsAsPdf(experts)}
                    disabled={experts.length === 0}
                    className="px-2.5 py-1 text-xs md:text-sm bg-white border border-brand-purple-200/60 text-brand-royal-blue hover:bg-brand-purple-50 rounded-lg flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    PDF
                  </Button>
                  <Button
                    onClick={() => exportExpertsAsCsv(experts)}
                    disabled={experts.length === 0}
                    className="px-2.5 py-1 text-xs md:text-sm bg-white border border-brand-purple-200/60 text-brand-royal-blue hover:bg-brand-purple-50 rounded-lg flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    CSV
                  </Button>
                </div>
                <div className="p-3 md:p-6">
                  {(() => {
                    const expertsNeedingAttention = experts.filter(
                      (e) => e.needsAttention,
                    );
                    const expertsWithDocuments = experts.filter(
                      (e) =>
                        e.verificationDocumentUrl && !e.orcid && !e.isVerified,
                    );
                    const otherExperts = experts.filter(
                      (e) =>
                        !e.needsAttention &&
                        !(
                          e.verificationDocumentUrl &&
                          !e.orcid &&
                          !e.isVerified
                        ),
                    );
                    const renderExpertCard = (expert) => (
                      <div
                        key={expert.userId}
                        className="bg-white rounded-lg md:rounded-xl border border-brand-purple-200/50 p-3 md:p-5 hover:shadow-md hover:border-brand-purple-300/60 transition-all duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 md:gap-4">
                          <div className="flex gap-3 md:gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-brand-royal-blue/10 flex items-center justify-center text-brand-royal-blue font-bold text-base md:text-lg shrink-0">
                              {(expert.name || "E").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                                <h3 className="text-base md:text-lg font-semibold text-brand-royal-blue">
                                  {expert.name}
                                </h3>
                                {expert.isVerified ? (
                                  expert.orcid ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200/60">
                                      <CheckCircle className="w-3 h-3" />{" "}
                                      Verified with ORCID
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200/60">
                                      <CheckCircle className="w-3 h-3" />{" "}
                                      Verified
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold border border-amber-200/60">
                                    <XCircle className="w-3 h-3" /> Unverified
                                  </span>
                                )}
                                {expert.needsAttention && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-purple-100 text-brand-royal-blue rounded-full text-xs font-semibold border border-brand-purple-200/60"
                                    title="Academic profile pending verification"
                                  >
                                    <Info className="w-3 h-3" /> Pending
                                    verification
                                  </span>
                                )}
                                {expert.betaProgramOptIn && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-800 rounded-full text-xs font-semibold border border-violet-200/70"
                                    title={
                                      expert.betaProgramOptedAt
                                        ? `Beta program · opted in ${new Date(expert.betaProgramOptedAt).toLocaleDateString()}`
                                        : "Beta program participant"
                                    }
                                  >
                                    <FlaskConical className="w-3 h-3" />
                                    Beta program
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1 text-xs md:text-sm text-brand-gray">
                                {expert.email && (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-brand-royal-blue/70" />
                                    <span className="truncate">
                                      {expert.email}
                                    </span>
                                  </div>
                                )}
                                {expert.accountCreated && (
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-brand-royal-blue/70" />
                                    <span>
                                      {new Date(
                                        expert.accountCreated,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {expert.location && (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-brand-royal-blue/70" />
                                    <span className="truncate">
                                      {expert.location.city
                                        ? `${expert.location.city}, ${expert.location.country}`
                                        : expert.location.country}
                                    </span>
                                  </div>
                                )}
                                {expert.specialties &&
                                  expert.specialties.length > 0 && (
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-brand-royal-blue/70" />
                                      <span className="line-clamp-1">
                                        {expert.specialties.join(", ")}
                                      </span>
                                    </div>
                                  )}
                                {expert.bio && (
                                  <p className="text-xs text-brand-gray mt-1.5 line-clamp-2">
                                    {expert.bio}
                                  </p>
                                )}
                              </div>
                              {(expert.threadCount > 0 ||
                                expert.replyCount > 0 ||
                                expert.postCount > 0 ||
                                expert.commentCount > 0 ||
                                expert.communityCount > 0) && (
                                <div className="flex flex-wrap gap-2 md:gap-3 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-brand-purple-200/40 text-xs">
                                  {(expert.threadCount ?? 0) > 0 && (
                                    <span
                                      className="flex items-center gap-1 text-brand-royal-blue"
                                      title="Forum threads started"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />{" "}
                                      {expert.threadCount} threads
                                    </span>
                                  )}
                                  {(expert.replyCount ?? 0) > 0 && (
                                    <span
                                      className="flex items-center gap-1 text-brand-royal-blue"
                                      title="Forum replies"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />{" "}
                                      {expert.replyCount} replies
                                    </span>
                                  )}
                                  {(expert.postCount ?? 0) > 0 && (
                                    <span
                                      className="flex items-center gap-1 text-brand-royal-blue"
                                      title="Community posts"
                                    >
                                      <FileText className="w-3.5 h-3.5" />{" "}
                                      {expert.postCount} posts
                                    </span>
                                  )}
                                  {(expert.commentCount ?? 0) > 0 && (
                                    <span
                                      className="flex items-center gap-1 text-brand-royal-blue"
                                      title="Comments on posts"
                                    >
                                      <Hash className="w-3.5 h-3.5" />{" "}
                                      {expert.commentCount} comments
                                    </span>
                                  )}
                                  {(expert.communityCount ?? 0) > 0 && (
                                    <span
                                      className="flex items-center gap-1 text-brand-royal-blue"
                                      title="Communities joined"
                                    >
                                      <Users className="w-3.5 h-3.5" />{" "}
                                      {expert.communityCount} communities
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="sm:shrink-0 flex flex-row flex-wrap sm:flex-nowrap sm:flex-col gap-2 sm:border-l sm:border-brand-purple-200/40 sm:pl-4">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/admin/expert/${expert.userId?._id || expert.userId?.id || expert.userId}`,
                                )
                              }
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm bg-brand-royal-blue text-white hover:bg-brand-blue-600 shadow-md transition-all border-0"
                            >
                              View profile
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleVerifyToggle(
                                  expert.userId,
                                  expert.isVerified,
                                )
                              }
                              disabled={updating[expert.userId]}
                              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
                                expert.isVerified
                                  ? "bg-white text-brand-royal-blue border-2 border-brand-royal-blue hover:bg-brand-purple-50"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md"
                              }`}
                            >
                              {updating[expert.userId] ? (
                                <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                              ) : expert.isVerified ? (
                                "Unverify"
                              ) : (
                                "Verify"
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteExpert(
                                  expert.userId?._id ??
                                    expert.userId?.id ??
                                    expert.userId,
                                )
                              }
                              disabled={
                                deletingExpertId ===
                                (expert.userId?._id ??
                                  expert.userId?.id ??
                                  expert.userId)
                              }
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm bg-red-100 text-red-700 hover:bg-red-200 border border-red-200/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingExpertId ===
                              (expert.userId?._id ??
                                expert.userId?.id ??
                                expert.userId) ? (
                                <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                    return (
                      <>
                        {expertsWithDocuments.length > 0 && (
                          <div className="mb-6 md:mb-8">
                            <div className="flex items-center gap-2 mb-3 p-2.5 md:p-3 rounded-lg md:rounded-xl bg-amber-50 border border-amber-200/50">
                              <div className="p-1.5 rounded-lg bg-amber-500/10 shrink-0">
                                <FileCheck className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm md:text-base font-semibold text-amber-700">
                                  Document Review (no ORCID)
                                </h3>
                                <p className="text-xs md:text-sm text-amber-600">
                                  {expertsWithDocuments.length} researcher
                                  {expertsWithDocuments.length !== 1
                                    ? "s"
                                    : ""}{" "}
                                  need document review
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3 md:space-y-4">
                              {expertsWithDocuments.map((expert) => (
                                <div
                                  key={expert.userId}
                                  className="bg-white rounded-lg md:rounded-xl border-2 border-amber-200/60 p-3 md:p-5 hover:shadow-md hover:border-amber-300/80 transition-all duration-200"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 md:gap-4">
                                    <div className="flex gap-3 md:gap-4 flex-1 min-w-0">
                                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-base md:text-lg shrink-0">
                                        {(expert.name || "E")
                                          .charAt(0)
                                          .toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                          <h3 className="text-base md:text-lg font-semibold text-brand-royal-blue">
                                            {expert.name}
                                          </h3>
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 md:px-2.5 md:py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] md:text-xs font-semibold border border-amber-200/60">
                                            <FileCheck className="w-2.5 h-2.5 md:w-3 md:h-3" />{" "}
                                            Document Review
                                          </span>
                                        </div>
                                        <div className="space-y-1 text-xs md:text-sm text-brand-gray mb-2 md:mb-3">
                                          {expert.email && (
                                            <div className="flex items-center gap-2">
                                              <Mail className="w-4 h-4 shrink-0 text-brand-royal-blue/70" />
                                              <span>{expert.email}</span>
                                            </div>
                                          )}
                                          {expert.specialties &&
                                            expert.specialties.length > 0 && (
                                              <div className="flex items-center gap-2">
                                                <Briefcase className="w-4 h-4 shrink-0 text-brand-royal-blue/70" />
                                                <span>
                                                  {expert.specialties.join(
                                                    ", ",
                                                  )}
                                                </span>
                                              </div>
                                            )}
                                        </div>
                                        {expert.verificationDocumentUrl && (
                                          <div className="mt-3 p-3 bg-amber-50/50 rounded-lg border border-amber-200/50">
                                            <div className="flex items-center gap-2 mb-2">
                                              <FileText className="w-4 h-4 text-amber-600" />
                                              <span className="text-sm font-medium text-amber-700">
                                                Verification Document
                                              </span>
                                            </div>
                                            <a
                                              href={
                                                expert.verificationDocumentUrl
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                                            >
                                              <Eye className="w-4 h-4" />
                                              View Document
                                              <ExternalLink className="w-3 h-3" />
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="sm:shrink-0 flex flex-row flex-wrap sm:flex-nowrap sm:flex-col gap-2 sm:border-l sm:border-amber-200/40 sm:pl-4">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          navigate(
                                            `/admin/expert/${expert.userId?._id || expert.userId?.id || expert.userId}`,
                                          )
                                        }
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm bg-brand-royal-blue text-white hover:bg-brand-blue-600 shadow-md transition-all border-0"
                                      >
                                        View profile
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleVerifyToggle(
                                            expert.userId,
                                            expert.isVerified,
                                          )
                                        }
                                        disabled={updating[expert.userId]}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {updating[expert.userId] ? (
                                          <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                                        ) : (
                                          <>
                                            <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            Verify
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteExpert(
                                            expert.userId?._id ??
                                              expert.userId?.id ??
                                              expert.userId,
                                          )
                                        }
                                        disabled={
                                          deletingExpertId ===
                                          (expert.userId?._id ??
                                            expert.userId?.id ??
                                            expert.userId)
                                        }
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm bg-red-100 text-red-700 hover:bg-red-200 border border-red-200/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {deletingExpertId ===
                                        (expert.userId?._id ??
                                          expert.userId?.id ??
                                          expert.userId) ? (
                                          <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                        )}
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {expertsNeedingAttention.length > 0 && (
                          <div className="mb-6 md:mb-8">
                            <div className="flex items-center gap-2 mb-3 p-2.5 md:p-3 rounded-lg md:rounded-xl bg-brand-purple-50 border border-brand-purple-200/50">
                              <div className="p-1.5 rounded-lg bg-brand-royal-blue/10 shrink-0">
                                <Info className="w-4 h-4 md:w-5 md:h-5 text-brand-royal-blue" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm md:text-base font-semibold text-brand-royal-blue">
                                  Need your attention
                                </h3>
                                <p className="text-xs md:text-sm text-brand-gray">
                                  {expertsNeedingAttention.length} pending
                                  verification
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3 md:space-y-4">
                              {expertsNeedingAttention.map((expert) =>
                                renderExpertCard(expert),
                              )}
                            </div>
                          </div>
                        )}

                        {experts.length === 0 ? (
                          <div className="text-center py-8 md:py-12 rounded-lg md:rounded-xl border border-brand-purple-200/40 bg-brand-purple-50/30">
                            <User className="w-12 h-12 md:w-16 md:h-16 text-brand-gray mx-auto mb-3 md:mb-4 opacity-60" />
                            <p className="text-sm md:text-base text-brand-gray font-medium">
                              No experts found
                            </p>
                          </div>
                        ) : (
                          <div>
                            {otherExperts.length > 0 && (
                              <>
                                <h3 className="text-sm md:text-base font-semibold text-brand-royal-blue mb-2 md:mb-3 flex items-center gap-2">
                                  <span className="w-1 h-4 md:h-5 rounded-full bg-brand-royal-blue/30" />
                                  {expertsNeedingAttention.length > 0
                                    ? "Other experts"
                                    : "All experts"}
                                </h3>
                                <div className="space-y-3 md:space-y-4">
                                  {otherExperts.map((expert) =>
                                    renderExpertCard(expert),
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeSection === "patients" && (
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="px-4 md:px-6 py-3 border-b border-brand-purple-200/40 bg-brand-purple-50/30">
                  <p className="text-xs md:text-sm text-brand-gray">
                    <span className="font-semibold text-brand-royal-blue">
                      {overviewStats?.totalPatients ?? patients.length} patients
                    </span>
                  </p>
                </div>
                <div className="p-3 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs md:text-sm font-medium text-brand-gray shrink-0">
                        Sort:
                      </span>
                      <select
                        value={patientSortBy}
                        onChange={(e) => setPatientSortBy(e.target.value)}
                        className="px-2.5 py-1.5 border border-[rgba(208,196,226,0.5)] rounded-lg text-xs md:text-sm bg-white flex-1 min-w-0 max-w-[140px]"
                      >
                        <option value="accountCreated">Date</option>
                        <option value="name">Name</option>
                        <option value="activity">Activity</option>
                      </select>
                      <select
                        value={patientOrder}
                        onChange={(e) => setPatientOrder(e.target.value)}
                        className="px-2.5 py-1.5 border border-[rgba(208,196,226,0.5)] rounded-lg text-xs md:text-sm bg-white flex-1 min-w-0 max-w-[140px]"
                      >
                        <option value="desc">Newest first</option>
                        <option value="asc">Oldest first</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-[rgba(208,196,226,0.3)]">
                      <span className="text-xs md:text-sm font-medium text-brand-gray flex items-center gap-1.5 shrink-0">
                        <Download className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-royal-blue" />
                        Export:
                      </span>
                      <Button
                        onClick={() => exportPatientsAsTxt(patients)}
                        disabled={patients.length === 0}
                        className="px-2.5 py-1 text-xs md:text-sm bg-white border border-[rgba(208,196,226,0.5)] text-brand-royal-blue hover:bg-brand-purple-50 rounded-lg flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        TXT
                      </Button>
                      <Button
                        onClick={() => exportPatientsAsPdf(patients)}
                        disabled={patients.length === 0}
                        className="px-2.5 py-1 text-xs md:text-sm bg-white border border-[rgba(208,196,226,0.5)] text-brand-royal-blue hover:bg-brand-purple-50 rounded-lg flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        PDF
                      </Button>
                      <Button
                        onClick={() => exportPatientsAsCsv(patients)}
                        disabled={patients.length === 0}
                        className="px-2.5 py-1 text-xs md:text-sm bg-white border border-[rgba(208,196,226,0.5)] text-brand-royal-blue hover:bg-brand-purple-50 rounded-lg flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        CSV
                      </Button>
                    </div>
                  </div>

                  {loadingPatients ? (
                    <div className="flex justify-center py-8 md:py-12">
                      <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-brand-royal-blue" />
                    </div>
                  ) : patients.length === 0 ? (
                    <div className="text-center py-8 md:py-12 rounded-lg border border-brand-purple-200/40 bg-brand-purple-50/30">
                      <UserCircle className="w-12 h-12 md:w-16 md:h-16 text-brand-gray mx-auto mb-3 md:mb-4" />
                      <p className="text-sm md:text-base text-brand-gray">
                        No patients found
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 md:space-y-4">
                      {patients.map((patient) => (
                        <div
                          key={patient.userId}
                          className="bg-slate-50/80 md:bg-[#F5F5F5] rounded-lg p-3 md:p-4 border border-[rgba(208,196,226,0.4)] hover:shadow-md transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5 md:mb-2">
                                <h3 className="text-base md:text-lg font-semibold text-[#2F3C96]">
                                  {patient.name}
                                </h3>
                                {patient.betaProgramOptIn && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-800 border border-violet-200/70"
                                    title={
                                      patient.betaProgramOptedAt
                                        ? `Beta program · opted in ${new Date(patient.betaProgramOptedAt).toLocaleDateString()}`
                                        : "Beta program participant"
                                    }
                                  >
                                    <FlaskConical className="w-3 h-3" />
                                    Beta program
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1 text-xs md:text-sm text-brand-gray">
                                {patient.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 shrink-0" />
                                    <span>{patient.email}</span>
                                  </div>
                                )}
                                {patient.accountCreated && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 shrink-0" />
                                    <span>
                                      Account created:{" "}
                                      {new Date(
                                        patient.accountCreated,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {patient.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 shrink-0" />
                                    <span>
                                      {patient.location.city
                                        ? `${patient.location.city}, ${patient.location.country}`
                                        : patient.location.country}
                                    </span>
                                  </div>
                                )}
                                {patient.conditions &&
                                  patient.conditions.length > 0 && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Briefcase className="w-4 h-4 shrink-0" />
                                      <span>
                                        {patient.conditions.join(", ")}
                                      </span>
                                    </div>
                                  )}
                              </div>
                              {(patient.threadCount > 0 ||
                                patient.replyCount > 0 ||
                                patient.postCount > 0 ||
                                patient.commentCount > 0 ||
                                patient.communityCount > 0) && (
                                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[rgba(208,196,226,0.4)] text-xs text-brand-royal-blue">
                                  {(patient.threadCount ?? 0) > 0 && (
                                    <span
                                      className="flex items-center gap-1"
                                      title="Forum threads started"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />{" "}
                                      {patient.threadCount} threads
                                    </span>
                                  )}
                                  {(patient.replyCount ?? 0) > 0 && (
                                    <span
                                      className="flex items-center gap-1"
                                      title="Forum replies"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />{" "}
                                      {patient.replyCount} replies
                                    </span>
                                  )}
                                  {(patient.postCount ?? 0) > 0 && (
                                    <span
                                      className="flex items-center gap-1"
                                      title="Community posts"
                                    >
                                      <FileText className="w-3.5 h-3.5" />{" "}
                                      {patient.postCount} posts
                                    </span>
                                  )}
                                  {(patient.commentCount ?? 0) > 0 && (
                                    <span
                                      className="flex items-center gap-1"
                                      title="Comments on posts"
                                    >
                                      <Hash className="w-3.5 h-3.5" />{" "}
                                      {patient.commentCount} comments
                                    </span>
                                  )}
                                  {(patient.communityCount ?? 0) > 0 && (
                                    <span
                                      className="flex items-center gap-1"
                                      title="Communities joined"
                                    >
                                      <Users className="w-3.5 h-3.5" />{" "}
                                      {patient.communityCount} communities
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 sm:pt-0 pt-1 border-t sm:border-t-0 border-[rgba(208,196,226,0.3)]">
                              <Button
                                onClick={() =>
                                  handleDeletePatient(patient.userId)
                                }
                                disabled={deletingPatientId === patient.userId}
                                className="w-full sm:w-auto px-3 py-2 text-xs md:text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center justify-center gap-1.5"
                              >
                                {deletingPatientId === patient.userId ? (
                                  <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                )}
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "forums" && (
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="px-4 md:px-6 py-3 border-b border-brand-purple-200/40 bg-brand-purple-50/30">
                  <p className="text-xs md:text-sm text-brand-gray">
                    <span className="font-semibold text-brand-royal-blue">
                      Forums
                    </span>{" "}
                    · Categories & threads
                  </p>
                </div>
                <div className="p-3 md:p-6 space-y-4 md:space-y-6">
                  <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 md:mb-3">
                        <h3 className="text-sm md:text-base font-semibold text-brand-gray">
                          Categories
                        </h3>
                        {forumCategories.length > 0 &&
                          selectedForumCategoryIds.length > 0 && (
                            <Button
                              onClick={handleBulkDeleteForumCategories}
                              disabled={bulkDeletingForums}
                              className="px-2.5 py-1 text-xs md:text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center gap-1.5"
                            >
                              {bulkDeletingForums ? (
                                <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              )}
                              Delete ({selectedForumCategoryIds.length})
                            </Button>
                          )}
                      </div>
                      {loadingForums ? (
                        <div className="flex justify-center py-4 md:py-6">
                          <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-brand-royal-blue" />
                        </div>
                      ) : forumCategories.length === 0 ? (
                        <p className="text-brand-gray text-xs md:text-sm">
                          No forum categories.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          <li className="flex items-center gap-2 px-2.5 md:px-3 py-1.5 md:py-2 border-b border-[rgba(208,196,226,0.4)]">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedForumCategoryIds(
                                  selectedForumCategoryIds.length ===
                                    forumCategories.length
                                    ? []
                                    : forumCategories.map((c) => c._id),
                                )
                              }
                              className="shrink-0 text-brand-royal-blue hover:opacity-80"
                              title={
                                selectedForumCategoryIds.length ===
                                forumCategories.length
                                  ? "Deselect all"
                                  : "Select all"
                              }
                            >
                              {selectedForumCategoryIds.length ===
                              forumCategories.length ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-xs font-medium text-brand-gray">
                              Select all
                            </span>
                          </li>
                          {forumCategories.map((cat) => (
                            <li
                              key={cat._id}
                              className="flex items-center gap-2 bg-white/50 rounded-lg p-2 md:p-3 border border-[rgba(208,196,226,0.4)]"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedForumCategoryIds((prev) =>
                                    prev.includes(cat._id)
                                      ? prev.filter((id) => id !== cat._id)
                                      : [...prev, cat._id],
                                  )
                                }
                                className="shrink-0 text-brand-royal-blue hover:opacity-80"
                                title="Toggle selection"
                              >
                                {selectedForumCategoryIds.includes(cat._id) ? (
                                  <CheckSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                )}
                              </button>
                              <span className="font-medium text-[#2F3C96] text-sm md:text-base flex-1 min-w-0 truncate">
                                {cat.name}
                              </span>
                              <span className="text-[10px] md:text-xs text-brand-gray shrink-0">
                                {cat.threadCount ?? 0}
                              </span>
                              <Button
                                onClick={() =>
                                  handleDeleteForumCategory(cat._id)
                                }
                                disabled={deletingForumId === cat._id}
                                className="px-1.5 py-1 md:px-2 md:py-1.5 text-xs md:text-sm bg-red-100 text-red-700 hover:bg-red-200 shrink-0 rounded-lg"
                              >
                                {deletingForumId === cat._id ? (
                                  <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                )}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 md:mb-3">
                        <h3 className="text-sm md:text-base font-semibold text-brand-gray">
                          Threads
                        </h3>
                        {forumThreads.length > 0 &&
                          selectedForumThreadIds.length > 0 && (
                            <Button
                              onClick={handleBulkDeleteForumThreads}
                              disabled={bulkDeletingThreads}
                              className="px-2.5 py-1 text-xs md:text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center gap-1.5"
                            >
                              {bulkDeletingThreads ? (
                                <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              )}
                              Delete ({selectedForumThreadIds.length})
                            </Button>
                          )}
                      </div>
                      {forumThreads.length === 0 && !loadingForums ? (
                        <p className="text-brand-gray text-xs md:text-sm">
                          No threads.
                        </p>
                      ) : (
                        <ul className="space-y-1.5 max-h-64 md:max-h-96 overflow-y-auto">
                          <li className="flex items-center gap-2 px-2.5 md:px-3 py-1.5 md:py-2 border-b border-[rgba(208,196,226,0.4)] sticky top-0 bg-white/95 z-10">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedForumThreadIds(
                                  selectedForumThreadIds.length ===
                                    forumThreads.length
                                    ? []
                                    : forumThreads.map((th) => th._id),
                                )
                              }
                              className="shrink-0 text-brand-royal-blue hover:opacity-80"
                              title={
                                selectedForumThreadIds.length ===
                                forumThreads.length
                                  ? "Deselect all"
                                  : "Select all"
                              }
                            >
                              {selectedForumThreadIds.length ===
                              forumThreads.length ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-xs font-medium text-brand-gray">
                              Select all
                            </span>
                          </li>
                          {forumThreads.map((t) => (
                            <li
                              key={t._id}
                              className="flex items-center gap-2 bg-white/50 rounded-lg p-2 md:p-3 border border-[rgba(208,196,226,0.4)]"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedForumThreadIds((prev) =>
                                    prev.includes(t._id)
                                      ? prev.filter((id) => id !== t._id)
                                      : [...prev, t._id],
                                  )
                                }
                                className="shrink-0 text-brand-royal-blue hover:opacity-80"
                                title="Toggle selection"
                              >
                                {selectedForumThreadIds.includes(t._id) ? (
                                  <CheckSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                )}
                              </button>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-[#2F3C96] text-sm md:text-base truncate">
                                  {t.title}
                                </p>
                                <p className="text-[10px] md:text-xs text-brand-gray">
                                  {t.categoryId?.name ?? "—"} ·{" "}
                                  {t.replyCount ?? 0}
                                </p>
                              </div>
                              <Button
                                onClick={() => handleDeleteThread(t._id)}
                                disabled={deletingThreadId === t._id}
                                className="px-1.5 py-1 md:px-2 md:py-1.5 text-xs md:text-sm bg-red-100 text-red-700 hover:bg-red-200 shrink-0 rounded-lg"
                              >
                                {deletingThreadId === t._id ? (
                                  <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                )}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "posts" && (
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="px-4 md:px-6 py-3 border-b border-brand-purple-200/40 bg-brand-purple-50/30">
                  <p className="text-xs md:text-sm text-brand-gray">
                    <span className="font-semibold text-brand-royal-blue">
                      Discovery
                    </span>{" "}
                    · Click row to expand · Delete requires confirmation
                  </p>
                </div>
                <div className="p-3 md:p-6">
                  <p className="text-xs md:text-sm text-brand-gray mb-3 md:mb-4 sr-only md:not-sr-only">
                    Compact list. Click a row to expand full content.
                  </p>
                  {loadingPosts ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-royal-blue" />
                    </div>
                  ) : posts.length === 0 ? (
                    <p className="text-brand-gray">No posts.</p>
                  ) : (
                    <div className="space-y-0 divide-y divide-[rgba(208,196,226,0.3)] border border-[rgba(208,196,226,0.4)] rounded-lg overflow-hidden">
                      {posts.map((post) => {
                        const content = post.content || "(No content)";
                        const truncated =
                          content.length > 120
                            ? content.slice(0, 120) + "…"
                            : content;
                        const isExpanded = postExpanded[post._id];
                        const hasAttachment =
                          post.attachments && post.attachments.length > 0;
                        const authorName = post.authorUserId?.username ?? "—";
                        const role = post.authorRole || post.postType || "—";
                        const dateStr = post.createdAt
                          ? new Date(post.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "—";
                        const toggleExpanded = () =>
                          setPostExpanded((prev) => ({
                            ...prev,
                            [post._id]: !prev[post._id],
                          }));

                        return (
                          <div
                            key={post._id}
                            className="bg-white hover:bg-gray-50/50 transition-colors"
                          >
                            <div className="flex items-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5">
                              <button
                                type="button"
                                onClick={toggleExpanded}
                                className="flex-1 min-w-0 text-left"
                              >
                                <p className="text-sm text-gray-800 truncate max-w-[calc(100%-2.5rem)]">
                                  {truncated}
                                </p>
                                <p className="text-xs text-brand-gray mt-0.5">
                                  {authorName} · {String(role)} · {dateStr}
                                  {hasAttachment && " · Has attachment"}
                                </p>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePost(post._id);
                                }}
                                disabled={deletingPostId === post._id}
                                className="shrink-0 p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 transition-colors"
                                title="Delete post"
                              >
                                {deletingPostId === post._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="px-4 pb-3 pt-0 border-t border-[rgba(208,196,226,0.25)]">
                                <div className="bg-brand-light-gray rounded-lg p-3 border border-[rgba(208,196,226,0.3)] mt-2">
                                  <p className="text-sm text-[#2F3C96] whitespace-pre-wrap break-words">
                                    {content}
                                  </p>
                                </div>
                                {hasAttachment && (
                                  <div className="mt-2">
                                    <p className="text-xs font-semibold text-brand-gray mb-1.5">
                                      Attachments
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {post.attachments.map((att, idx) => {
                                        const url = att.url || "";
                                        const name = att.name || "";
                                        const isPdf =
                                          att.type === "file" &&
                                          (url.toLowerCase().endsWith(".pdf") ||
                                            name
                                              .toLowerCase()
                                              .includes(".pdf"));
                                        const isVideo =
                                          att.type === "file" &&
                                          (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(
                                            url,
                                          ) ||
                                            /\.(mp4|webm|ogg|mov)(\?|$)/i.test(
                                              name,
                                            ));
                                        const isImage =
                                          att.type === "image" ||
                                          /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(
                                            url,
                                          ) ||
                                          /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(
                                            name,
                                          );
                                        if (isImage) {
                                          return (
                                            <div
                                              key={idx}
                                              className="rounded-lg overflow-hidden border border-[rgba(208,196,226,0.3)] bg-brand-light-gray shrink-0"
                                            >
                                              <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block"
                                              >
                                                <img
                                                  src={url}
                                                  alt={name || "Attachment"}
                                                  className="max-h-40 w-auto object-contain"
                                                />
                                              </a>
                                              {name && (
                                                <p className="text-xs text-brand-gray p-1 truncate max-w-[180px]">
                                                  {name}
                                                </p>
                                              )}
                                            </div>
                                          );
                                        }
                                        if (isVideo) {
                                          return (
                                            <div
                                              key={idx}
                                              className="rounded-lg overflow-hidden border border-[rgba(208,196,226,0.3)] bg-black shrink-0 max-w-xs"
                                            >
                                              <video
                                                src={url}
                                                controls
                                                className="max-h-40 w-full"
                                                preload="metadata"
                                              >
                                                Your browser does not support
                                                the video tag.
                                              </video>
                                              {name && (
                                                <p className="text-xs text-brand-gray p-1 truncate">
                                                  {name}
                                                </p>
                                              )}
                                            </div>
                                          );
                                        }
                                        if (isPdf) {
                                          return (
                                            <div
                                              key={idx}
                                              className="rounded-lg border border-[rgba(208,196,226,0.3)] bg-brand-light-gray p-2 shrink-0"
                                            >
                                              <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-brand-royal-blue hover:underline text-sm font-medium flex items-center gap-1"
                                              >
                                                <FileText className="w-4 h-4" />
                                                {name || "View PDF"}
                                              </a>
                                            </div>
                                          );
                                        }
                                        return (
                                          <div
                                            key={idx}
                                            className="rounded-lg border border-[rgba(208,196,226,0.3)] bg-brand-light-gray p-2"
                                          >
                                            <a
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-brand-royal-blue hover:underline text-sm"
                                            >
                                              {name || "Open file"}
                                            </a>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!loadingPosts &&
                    posts.length > 0 &&
                    postsPagination.pages > 1 && (
                      <div className="flex gap-2 justify-center pt-4 items-center">
                        <Button
                          disabled={postsPagination.page <= 1}
                          onClick={() =>
                            fetchAdminPosts(postsPagination.page - 1)
                          }
                          className="px-3 py-1.5 text-sm"
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-brand-gray">
                          Page {postsPagination.page} of {postsPagination.pages}
                        </span>
                        <Button
                          disabled={
                            postsPagination.page >= postsPagination.pages
                          }
                          onClick={() =>
                            fetchAdminPosts(postsPagination.page + 1)
                          }
                          className="px-3 py-1.5 text-sm"
                        >
                          Next
                        </Button>
                      </div>
                    )}
                </div>
              </div>
            )}

            {activeSection === "community" && (
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="px-4 md:px-6 py-3 border-b border-brand-purple-200/40 bg-brand-purple-50/30">
                  <p className="text-xs md:text-sm text-brand-gray">
                    <span className="font-semibold text-brand-royal-blue">
                      Community
                    </span>{" "}
                    · Patient & researcher communities
                  </p>
                </div>
                <div className="p-3 md:p-6 space-y-4 md:space-y-6">
                  {/* Tabs: Patient Communities | Researcher Communities */}
                  <div className="flex gap-0 border-b border-[rgba(208,196,226,0.5)] -mx-3 md:mx-0 px-3 md:px-0">
                    <button
                      type="button"
                      onClick={() => setCommunityManagementTab("patient")}
                      className={`px-3 md:px-4 py-2.5 md:py-3 font-semibold text-xs md:text-sm transition-all border-b-2 -mb-px ${
                        communityManagementTab === "patient"
                          ? "text-brand-royal-blue border-brand-royal-blue"
                          : "text-brand-gray border-transparent hover:text-brand-royal-blue/80"
                      }`}
                    >
                      Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommunityManagementTab("researcher")}
                      className={`px-3 md:px-4 py-2.5 md:py-3 font-semibold text-xs md:text-sm transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                        communityManagementTab === "researcher"
                          ? "text-brand-royal-blue border-brand-royal-blue"
                          : "text-brand-gray border-transparent hover:text-brand-royal-blue/80"
                      }`}
                    >
                      <FlaskConical className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      Researcher
                    </button>
                  </div>

                  {communityManagementTab === "patient" && (
                    <>
                      {/* Forum categories (for Health Forums page grouping) */}
                      <div>
                        <h3 className="font-semibold text-brand-gray mb-3">
                          Forum categories (Health Forums)
                        </h3>
                        <p className="text-sm text-brand-gray mb-3">
                          Categories group patient communities on the Health
                          Forums page. Create categories, then assign them when
                          creating/editing a patient community.
                        </p>
                        {loadingCommunityCategories ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-brand-royal-blue" />
                          </div>
                        ) : (
                          <>
                            <form
                              onSubmit={handleCreateCommunityCategory}
                              className="flex flex-wrap items-end gap-3 mb-4"
                            >
                              <input
                                type="text"
                                placeholder="Category name (e.g. Neurology)"
                                value={newCommunityCategory.name}
                                onChange={(e) =>
                                  setNewCommunityCategory((p) => ({
                                    ...p,
                                    name: e.target.value,
                                  }))
                                }
                                className="px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg min-w-[180px]"
                              />
                              <label className="flex items-center gap-2 text-sm text-brand-gray">
                                <input
                                  type="checkbox"
                                  checked={newCommunityCategory.defaultOpen}
                                  onChange={(e) =>
                                    setNewCommunityCategory((p) => ({
                                      ...p,
                                      defaultOpen: e.target.checked,
                                    }))
                                  }
                                  className="rounded"
                                />
                                Open by default
                              </label>
                              <input
                                type="text"
                                placeholder="Heading color (#2F3C96)"
                                value={newCommunityCategory.headingColor}
                                onChange={(e) =>
                                  setNewCommunityCategory((p) => ({
                                    ...p,
                                    headingColor: e.target.value,
                                  }))
                                }
                                className="w-28 px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg"
                              />
                              <Button
                                type="submit"
                                disabled={creatingCommunityCategory}
                                className="px-3 py-2 bg-brand-royal-blue text-white rounded-lg text-sm font-medium hover:bg-brand-blue-600 disabled:opacity-50"
                              >
                                {creatingCommunityCategory ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                                <span className="ml-1">Add category</span>
                              </Button>
                            </form>
                            {communityCategories.length === 0 ? (
                              <p className="text-brand-gray text-sm">
                                No categories yet. Add one above.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {communityCategories.map((cat) => (
                                  <li
                                    key={cat._id}
                                    className="flex items-center justify-between gap-2 bg-white/50 rounded-lg p-3 border border-[rgba(208,196,226,0.4)]"
                                  >
                                    <span className="font-medium text-brand-royal-blue">
                                      {cat.name}
                                    </span>
                                    <span className="text-xs text-brand-gray">
                                      ({cat.communityCount ?? 0} communities) ·{" "}
                                      {cat.defaultOpen
                                        ? "Open by default"
                                        : "Collapsed"}
                                    </span>
                                    <Button
                                      onClick={() =>
                                        handleDeleteCommunityCategory(cat._id)
                                      }
                                      className="px-2 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 shrink-0 rounded-lg"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                      </div>

                      {/* Community proposals (pending review) - patient proposals */}
                      <div>
                        <h3 className="font-semibold text-brand-gray mb-3">
                          Community proposals (pending review)
                        </h3>
                        {loadingCommunityProposals ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-royal-blue" />
                          </div>
                        ) : communityProposals.filter(
                            (p) => p.status === "pending",
                          ).length === 0 ? (
                          <p className="text-brand-gray text-sm">
                            No pending proposals.
                          </p>
                        ) : (
                          <ul className="space-y-4">
                            {communityProposals
                              .filter((p) => p.status === "pending")
                              .map((p) => {
                                const displayThumbnail =
                                  approvalThumbnailOverride[p._id] ??
                                  p.thumbnailUrl;
                                return (
                                  <li
                                    key={p._id}
                                    className="bg-white/50 rounded-xl p-4 border border-[rgba(208,196,226,0.4)]"
                                  >
                                    <div className="flex flex-col sm:flex-row gap-4">
                                      <div className="shrink-0 flex items-start gap-3">
                                        <label className="shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-brand-purple-200 bg-brand-purple-50/50 cursor-pointer hover:border-brand-royal-blue/40 hover:bg-brand-royal-blue/5 transition-all">
                                          {approvalThumbnailUploading[p._id] ? (
                                            <Loader2 className="w-6 h-6 text-brand-royal-blue animate-spin" />
                                          ) : displayThumbnail ? (
                                            <img
                                              src={displayThumbnail}
                                              alt=""
                                              className="w-full h-full rounded-lg object-cover"
                                            />
                                          ) : (
                                            <>
                                              <Plus className="w-6 h-6 text-brand-gray" />
                                              <span className="text-xs text-brand-gray mt-1">
                                                Thumbnail
                                              </span>
                                            </>
                                          )}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) =>
                                              handleProposalThumbnailChange(
                                                p._id,
                                                e,
                                              )
                                            }
                                            disabled={
                                              !!approvalThumbnailUploading[
                                                p._id
                                              ]
                                            }
                                          />
                                        </label>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-brand-royal-blue">
                                            {p.title}
                                          </p>
                                          {p.description && (
                                            <p className="text-sm text-brand-gray mt-1 line-clamp-2">
                                              {p.description}
                                            </p>
                                          )}
                                          <p className="text-xs text-brand-gray mt-2">
                                            Proposed by{" "}
                                            {p.proposedBy?.username ?? "—"} (
                                            {p.proposedByRole ?? "—"}) ·{" "}
                                            {p.createdAt
                                              ? new Date(
                                                  p.createdAt,
                                                ).toLocaleDateString()
                                              : "—"}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                                        <Button
                                          onClick={() =>
                                            handleApproveProposal(
                                              p._id,
                                              displayThumbnail || undefined,
                                            )
                                          }
                                          disabled={
                                            approvingProposalId === p._id
                                          }
                                          className="px-3 py-1.5 text-sm bg-green-100 text-green-800 hover:bg-green-200 rounded-lg flex items-center gap-1.5"
                                        >
                                          {approvingProposalId === p._id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : null}
                                          Approve
                                        </Button>
                                        <Button
                                          onClick={() =>
                                            handleRejectProposal(p._id)
                                          }
                                          disabled={
                                            rejectingProposalId === p._id
                                          }
                                          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center gap-1.5"
                                        >
                                          {rejectingProposalId === p._id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : null}
                                          Reject
                                        </Button>
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                          </ul>
                        )}
                      </div>

                      <form
                        onSubmit={handleCreateCommunity}
                        className="bg-white/50 rounded-xl p-4 border border-[rgba(208,196,226,0.4)] space-y-3"
                      >
                        <h3 className="font-semibold text-brand-gray">
                          Create new patient community
                        </h3>
                        <input
                          type="text"
                          placeholder="Name"
                          value={newCommunity.name}
                          onChange={(e) =>
                            setNewCommunity((p) => ({
                              ...p,
                              name: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg"
                          required
                        />
                        <textarea
                          placeholder="Description"
                          value={newCommunity.description}
                          onChange={(e) =>
                            setNewCommunity((p) => ({
                              ...p,
                              description: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg min-h-[80px]"
                        />
                        <div>
                          <label className="block text-sm font-medium text-brand-gray mb-1.5">
                            Category (Health Forums grouping)
                          </label>
                          <select
                            value={newCommunity.categoryId}
                            onChange={(e) =>
                              setNewCommunity((p) => ({
                                ...p,
                                categoryId: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg"
                          >
                            <option value="">— None —</option>
                            {communityCategories.map((cat) => (
                              <option key={cat._id} value={cat._id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-brand-gray mb-1.5">
                            Icon (SVG code, optional)
                          </label>
                          <textarea
                            placeholder='Paste SVG code, e.g. <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">...</svg>'
                            value={newCommunity.iconSvg}
                            onChange={(e) =>
                              setNewCommunity((p) => ({
                                ...p,
                                iconSvg: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg min-h-[80px] font-mono text-sm"
                            rows={3}
                          />
                          <p className="text-xs text-brand-gray mt-1">
                            Use currentColor for stroke/fill to inherit site
                            colour.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-brand-gray mb-1.5">
                            Colour (hex, optional)
                          </label>
                          <input
                            type="text"
                            placeholder="#2F3C96"
                            value={newCommunity.color}
                            onChange={(e) =>
                              setNewCommunity((p) => ({
                                ...p,
                                color: e.target.value,
                              }))
                            }
                            className="w-28 px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-brand-gray mb-1.5">
                            Thumbnail (optional)
                          </label>
                          <div className="flex items-start gap-3">
                            <label className="shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-brand-purple-200 bg-brand-purple-50/50 cursor-pointer hover:border-brand-royal-blue/40 hover:bg-brand-royal-blue/5 transition-all">
                              {newCommunityThumbnailUploading ? (
                                <Loader2 className="w-6 h-6 text-brand-royal-blue animate-spin" />
                              ) : newCommunity.thumbnailUrl ? (
                                <img
                                  src={newCommunity.thumbnailUrl}
                                  alt="Thumbnail"
                                  className="w-full h-full rounded-lg object-cover"
                                />
                              ) : (
                                <>
                                  <Plus className="w-6 h-6 text-brand-gray" />
                                  <span className="text-xs text-brand-gray mt-1">
                                    Upload
                                  </span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleNewCommunityThumbnailChange}
                                disabled={newCommunityThumbnailUploading}
                              />
                            </label>
                            <p className="text-xs text-brand-gray">
                              Add a cover image for the community.
                            </p>
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={creatingCommunity}
                          className="inline-flex items-center justify-center gap-2 min-h-[42px] px-5 py-2.5 bg-brand-royal-blue text-white font-semibold text-sm rounded-xl hover:bg-brand-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-md hover:shadow-lg"
                        >
                          {creatingCommunity ? (
                            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 shrink-0" />
                          )}
                          <span>Create patient community</span>
                        </button>
                      </form>
                      <div>
                        <h3 className="font-semibold text-brand-gray mb-3">
                          Patient communities
                        </h3>
                        {loadingCommunities ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-royal-blue" />
                          </div>
                        ) : communities.filter(
                            (c) => (c.communityType || "patient") === "patient",
                          ).length === 0 ? (
                          <p className="text-brand-gray text-sm">
                            No patient communities.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {communities
                              .filter(
                                (c) =>
                                  (c.communityType || "patient") === "patient",
                              )
                              .map((c) => (
                                <li
                                  key={c._id}
                                  className="bg-white/50 rounded-lg p-3 border border-[rgba(208,196,226,0.4)]"
                                >
                                  {editingCommunityId === c._id ? (
                                    <form
                                      onSubmit={handleUpdateCommunity}
                                      className="space-y-3"
                                    >
                                      <input
                                        type="text"
                                        placeholder="Name"
                                        value={editCommunity.name}
                                        onChange={(e) =>
                                          setEditCommunity((p) => ({
                                            ...p,
                                            name: e.target.value,
                                          }))
                                        }
                                        className="w-full px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg"
                                      />
                                      <textarea
                                        placeholder="Description"
                                        value={editCommunity.description}
                                        onChange={(e) =>
                                          setEditCommunity((p) => ({
                                            ...p,
                                            description: e.target.value,
                                          }))
                                        }
                                        className="w-full px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg min-h-[60px]"
                                      />
                                      <div>
                                        <label className="block text-xs font-medium text-brand-gray mb-1">
                                          Category
                                        </label>
                                        <select
                                          value={editCommunity.categoryId || ""}
                                          onChange={(e) =>
                                            setEditCommunity((p) => ({
                                              ...p,
                                              categoryId: e.target.value,
                                            }))
                                          }
                                          className="w-full px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg"
                                        >
                                          <option value="">— None —</option>
                                          {communityCategories.map((cat) => (
                                            <option
                                              key={cat._id}
                                              value={cat._id}
                                            >
                                              {cat.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-brand-gray mb-1">
                                          Icon SVG
                                        </label>
                                        <textarea
                                          value={editCommunity.iconSvg}
                                          onChange={(e) =>
                                            setEditCommunity((p) => ({
                                              ...p,
                                              iconSvg: e.target.value,
                                            }))
                                          }
                                          className="w-full px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg min-h-[70px] font-mono text-sm"
                                          rows={2}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-brand-gray mb-1">
                                          Colour
                                        </label>
                                        <input
                                          type="text"
                                          value={editCommunity.color}
                                          onChange={(e) =>
                                            setEditCommunity((p) => ({
                                              ...p,
                                              color: e.target.value,
                                            }))
                                          }
                                          className="w-28 px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          type="submit"
                                          disabled={updatingCommunity}
                                          className="px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded-lg"
                                        >
                                          {updatingCommunity ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : null}{" "}
                                          Save
                                        </Button>
                                        <Button
                                          type="button"
                                          onClick={() => {
                                            setEditingCommunityId(null);
                                            setEditCommunity({
                                              name: "",
                                              description: "",
                                              categoryId: "",
                                              iconSvg: "",
                                              color: "#2F3C96",
                                            });
                                          }}
                                          className="px-3 py-1.5 text-sm bg-brand-gray-100 text-brand-gray rounded-lg"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-3 min-w-0">
                                        {c.coverImage || c.image ? (
                                          <img
                                            src={c.coverImage || c.image}
                                            alt=""
                                            className="w-10 h-10 rounded-lg object-cover border border-[rgba(208,196,226,0.4)] shrink-0"
                                          />
                                        ) : (
                                          <div className="w-10 h-10 rounded-lg border border-[rgba(208,196,226,0.4)] bg-brand-purple-50 flex items-center justify-center shrink-0">
                                            <Users className="w-5 h-5 text-brand-royal-blue/60" />
                                          </div>
                                        )}
                                        <span className="font-medium text-brand-royal-blue truncate">
                                          {c.name}
                                        </span>
                                        <span className="text-xs text-brand-gray shrink-0">
                                          ({c.memberCount ?? 0} members,{" "}
                                          {c.threadCount ?? 0} threads)
                                        </span>
                                      </div>
                                      <div className="flex gap-1 shrink-0 flex-wrap">
                                        <Button
                                          onClick={() => {
                                            setEditingIconCommunityId(c._id);
                                            setEditingIconSvg(c.iconSvg || "");
                                            setEditingIconCommunityName(
                                              c.name || "",
                                            );
                                          }}
                                          className="px-2 py-1.5 text-sm bg-brand-purple-100 text-brand-royal-blue hover:bg-brand-purple-200 rounded-lg"
                                          title="Edit SVG icon only"
                                        >
                                          Edit icon
                                        </Button>
                                        <Button
                                          onClick={() => {
                                            setEditingCommunityId(c._id);
                                            setEditCommunity({
                                              name: c.name || "",
                                              description: c.description || "",
                                              categoryId:
                                                c.categoryId?.toString?.() ||
                                                "",
                                              iconSvg: c.iconSvg || "",
                                              color: c.color || "#2F3C96",
                                            });
                                          }}
                                          className="px-2 py-1.5 text-sm bg-brand-royal-blue/10 text-brand-royal-blue hover:bg-brand-royal-blue/20 rounded-lg"
                                        >
                                          Edit
                                        </Button>
                                        <Button
                                          onClick={() =>
                                            handleDeleteCommunity(c._id)
                                          }
                                          disabled={
                                            deletingCommunityId === c._id
                                          }
                                          className="px-2 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"
                                        >
                                          {deletingCommunityId === c._id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-4 h-4" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>

                      {/* Edit icon only modal */}
                      {editingIconCommunityId && (
                        <div
                          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                          onClick={() =>
                            !updatingIconOnly &&
                            (setEditingIconCommunityId(null),
                            setEditingIconSvg(""),
                            setEditingIconCommunityName(""))
                          }
                        >
                          <div
                            className="bg-white rounded-xl shadow-lg max-w-lg w-full p-5 border border-brand-gray-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <h4 className="font-semibold text-brand-royal-blue mb-1">
                              Edit icon (SVG)
                            </h4>
                            <p className="text-sm text-brand-gray mb-3">
                              {editingIconCommunityName}
                            </p>
                            <form onSubmit={handleUpdateCommunityIconOnly}>
                              <textarea
                                value={editingIconSvg}
                                onChange={(e) =>
                                  setEditingIconSvg(e.target.value)
                                }
                                placeholder="Paste SVG code (use currentColor for stroke/fill)"
                                className="w-full px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg min-h-[120px] font-mono text-sm"
                                rows={5}
                              />
                              <div className="flex gap-2 mt-3">
                                <Button
                                  type="submit"
                                  disabled={updatingIconOnly}
                                  className="px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded-lg"
                                >
                                  {updatingIconOnly ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : null}{" "}
                                  Save icon
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    setEditingIconCommunityId(null);
                                    setEditingIconSvg("");
                                    setEditingIconCommunityName("");
                                  }}
                                  className="px-3 py-1.5 text-sm bg-brand-gray-100 text-brand-gray rounded-lg"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {communityManagementTab === "researcher" && (
                    <>
                      <p className="text-sm text-brand-gray">
                        Researcher communities are for scientific discussions
                        and research topics. Only admins can create them.
                      </p>
                      <form
                        onSubmit={handleCreateResearcherCommunity}
                        className="bg-white/50 rounded-xl p-4 border border-[rgba(208,196,226,0.4)] space-y-3"
                      >
                        <h3 className="font-semibold text-brand-gray flex items-center gap-2">
                          <FlaskConical className="w-4 h-4" />
                          Create new researcher community
                        </h3>
                        <input
                          type="text"
                          placeholder="Name (e.g. Basic & Pre-clinical Research)"
                          value={newResearcherCommunity.name}
                          onChange={(e) =>
                            setNewResearcherCommunity((p) => ({
                              ...p,
                              name: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg"
                          required
                        />
                        <textarea
                          placeholder="Description (e.g. Molecular biology, animal models, gene editing, cell signaling)"
                          value={newResearcherCommunity.description}
                          onChange={(e) =>
                            setNewResearcherCommunity((p) => ({
                              ...p,
                              description: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg min-h-[80px]"
                        />
                        <div>
                          <label className="block text-sm font-medium text-brand-gray mb-1.5">
                            Thumbnail (optional)
                          </label>
                          <div className="flex items-start gap-3">
                            <label className="shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-brand-purple-200 bg-brand-purple-50/50 cursor-pointer hover:border-brand-royal-blue/40 hover:bg-brand-royal-blue/5 transition-all">
                              {newResearcherCommunityThumbnailUploading ? (
                                <Loader2 className="w-6 h-6 text-brand-royal-blue animate-spin" />
                              ) : newResearcherCommunity.thumbnailUrl ? (
                                <img
                                  src={newResearcherCommunity.thumbnailUrl}
                                  alt="Thumbnail"
                                  className="w-full h-full rounded-lg object-cover"
                                />
                              ) : (
                                <>
                                  <Plus className="w-6 h-6 text-brand-gray" />
                                  <span className="text-xs text-brand-gray mt-1">
                                    Upload
                                  </span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={
                                  handleNewResearcherCommunityThumbnailChange
                                }
                                disabled={
                                  newResearcherCommunityThumbnailUploading
                                }
                              />
                            </label>
                            <p className="text-xs text-brand-gray">
                              Add a cover image for the researcher community.
                            </p>
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={creatingResearcherCommunity}
                          className="inline-flex items-center justify-center gap-2 min-h-[42px] px-5 py-2.5 bg-brand-royal-blue text-white font-semibold text-sm rounded-xl hover:bg-brand-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-md hover:shadow-lg"
                        >
                          {creatingResearcherCommunity ? (
                            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                          ) : (
                            <FlaskConical className="w-4 h-4 shrink-0" />
                          )}
                          <span>Create researcher community</span>
                        </button>
                      </form>
                      <div>
                        <h3 className="font-semibold text-brand-gray mb-3">
                          Researcher communities
                        </h3>
                        {loadingCommunities ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-royal-blue" />
                          </div>
                        ) : communities.filter(
                            (c) => c.communityType === "researcher",
                          ).length === 0 ? (
                          <p className="text-brand-gray text-sm">
                            No researcher communities. Create one above.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {communities
                              .filter((c) => c.communityType === "researcher")
                              .map((c) => (
                                <li
                                  key={c._id}
                                  className="flex items-center justify-between gap-2 bg-white/50 rounded-lg p-3 border border-[rgba(208,196,226,0.4)]"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {c.coverImage || c.image ? (
                                      <img
                                        src={c.coverImage || c.image}
                                        alt=""
                                        className="w-10 h-10 rounded-lg object-cover border border-[rgba(208,196,226,0.4)] shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg border border-[rgba(208,196,226,0.4)] bg-brand-purple-50 flex items-center justify-center shrink-0">
                                        <FlaskConical className="w-5 h-5 text-brand-royal-blue/60" />
                                      </div>
                                    )}
                                    <span className="font-medium text-brand-royal-blue truncate">
                                      {c.name}
                                    </span>
                                    <span className="text-xs text-brand-gray shrink-0">
                                      ({c.memberCount ?? 0} members,{" "}
                                      {c.threadCount ?? 0} threads)
                                    </span>
                                  </div>
                                  <Button
                                    onClick={() => handleDeleteCommunity(c._id)}
                                    disabled={deletingCommunityId === c._id}
                                    className="px-2 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 shrink-0 rounded-lg"
                                  >
                                    {deletingCommunityId === c._id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeSection === "work" && (
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 overflow-hidden">
                <div className="px-4 md:px-6 py-3 border-b border-brand-purple-200/40 bg-brand-purple-50/30">
                  <p className="text-xs md:text-sm text-brand-gray">
                    <span className="font-semibold text-brand-royal-blue">
                      Work Moderation
                    </span>{" "}
                    · Pending submissions
                  </p>
                </div>
                <div className="p-3 md:p-6 space-y-4 md:space-y-6">
                  {loadingWorkSubmissions ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-royal-blue" />
                    </div>
                  ) : workSubmissions.filter((s) => s.status === "pending")
                      .length === 0 ? (
                    <p className="text-brand-gray text-sm">
                      No pending work submissions.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {workSubmissions
                        .filter((s) => s.status === "pending")
                        .map((s) => (
                          <li
                            key={s._id}
                            className="bg-white/50 rounded-xl p-4 border border-[rgba(208,196,226,0.4)]"
                          >
                            <div className="flex flex-col gap-2">
                              <p className="font-semibold text-brand-royal-blue">
                                {s.title}{" "}
                                <span className="text-xs font-medium text-brand-gray">
                                  ({s.type})
                                </span>
                              </p>
                              <p className="text-xs text-brand-gray">
                                Submitted by{" "}
                                {s.submittedBy?.username || "Unknown"} (
                                {s.submittedBy?.email || "—"})
                              </p>
                              {s.type === "publication" ? (
                                <p className="text-sm text-brand-gray">
                                  {s.journal ? `Journal: ${s.journal} · ` : ""}
                                  {s.year ? `Year: ${s.year}` : ""}
                                </p>
                              ) : (
                                <p className="text-sm text-brand-gray">
                                  {s.phase ? `Phase: ${s.phase} · ` : ""}
                                  {s.trialStatus
                                    ? `Status: ${s.trialStatus}`
                                    : ""}
                                </p>
                              )}
                              <div className="flex gap-2 pt-1">
                                <Button
                                  onClick={() =>
                                    handleApproveWorkSubmission(s._id)
                                  }
                                  disabled={approvingWorkSubmissionId === s._id}
                                  className="px-3 py-1.5 text-sm bg-green-100 text-green-800 hover:bg-green-200 rounded-lg flex items-center gap-1.5"
                                >
                                  {approvingWorkSubmissionId === s._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : null}
                                  Approve
                                </Button>
                                <Button
                                  onClick={() =>
                                    handleRejectWorkSubmission(s._id)
                                  }
                                  disabled={rejectingWorkSubmissionId === s._id}
                                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center gap-1.5"
                                >
                                  {rejectingWorkSubmissionId === s._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : null}
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {activeSection === "reviews" && (
              <div className="space-y-6">
                <div>
                  {reviewStats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white/50 rounded-xl p-4 border border-[rgba(208,196,226,0.4)]">
                        <div className="text-sm text-gray-600 mb-1">
                          Total Reviews
                        </div>
                        <div
                          className="text-2xl font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          {reviewStats.total}
                        </div>
                      </div>
                      <div className="bg-white/50 rounded-xl p-4 border border-[rgba(208,196,226,0.4)]">
                        <div className="text-sm text-gray-600 mb-1">
                          Excellent
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {reviewStats.ratings?.excellent || 0}
                        </div>
                      </div>
                      <div className="bg-white/50 rounded-xl p-4 border border-[rgba(208,196,226,0.4)]">
                        <div className="text-sm text-gray-600 mb-1">Good</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {reviewStats.ratings?.good || 0}
                        </div>
                      </div>
                      <div className="bg-white/50 rounded-xl p-4 border border-[rgba(208,196,226,0.4)]">
                        <div className="text-sm text-gray-600 mb-1">
                          Average/Poor
                        </div>
                        <div className="text-2xl font-bold text-orange-600">
                          {(reviewStats.ratings?.average || 0) +
                            (reviewStats.ratings?.poor || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                  {loadingReviews ? (
                    <div className="flex justify-center py-8">
                      <Loader2
                        className="w-6 h-6 animate-spin"
                        style={{ color: "#2F3C96" }}
                      />
                    </div>
                  ) : reviews.length === 0 ? (
                    <p className="text-gray-600">No reviews yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => {
                        const ratingColors = {
                          excellent: "text-green-600 bg-green-50",
                          good: "text-blue-600 bg-blue-50",
                          average: "text-orange-600 bg-orange-50",
                          poor: "text-red-600 bg-red-50",
                        };
                        const survey = getSurveyFromReview(review);
                        return (
                          <div
                            key={review._id}
                            className="bg-white/50 rounded-xl p-4 border border-[rgba(208,196,226,0.4)]"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-purple-100 flex items-center justify-center">
                                  <span
                                    className="text-sm font-bold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {review.username
                                      ?.charAt(0)
                                      ?.toUpperCase() || "U"}
                                  </span>
                                </div>
                                <div>
                                  <div
                                    className="font-semibold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {review.username || "Unknown User"}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {review.userRole === "patient"
                                      ? "Patient"
                                      : "Researcher"}{" "}
                                    • {review.email || "No email"}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                                  ratingColors[review.rating] ||
                                  "text-gray-600 bg-gray-50"
                                }`}
                              >
                                {review.rating}
                              </span>
                            </div>
                            {/* Structured survey view if available */}
                            {survey ? (
                              <div className="mt-3 mb-2 space-y-3 text-xs text-gray-700">
                                <div className="grid gap-2 md:grid-cols-2">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      1. I am a
                                    </p>
                                    <p className="mt-0.5 text-gray-700 capitalize">
                                      {survey.role || "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      4. Found what they were looking for
                                    </p>
                                    <p className="mt-0.5 text-gray-700">
                                      {survey.found || "—"}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid gap-2 md:grid-cols-2">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      2. What brought them to collabiora
                                    </p>
                                    <p className="mt-0.5 text-gray-700">
                                      {Array.isArray(survey.purposes) &&
                                      survey.purposes.length
                                        ? survey.purposes.join(", ")
                                        : "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      5. What felt most valuable
                                    </p>
                                    <p className="mt-0.5 text-gray-700">
                                      {Array.isArray(survey.mostValuable) &&
                                      survey.mostValuable.length
                                        ? survey.mostValuable.join(", ")
                                        : "—"}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid gap-2 md:grid-cols-2">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      3. Experience label
                                    </p>
                                    <p className="mt-0.5 text-gray-700 capitalize">
                                      {survey.experience || "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      6. Confusing or difficult
                                    </p>
                                    <p className="mt-0.5 text-gray-700">
                                      {Array.isArray(survey.confusing) &&
                                      survey.confusing.length
                                        ? survey.confusing.join(", ")
                                        : "—"}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid gap-2 md:grid-cols-2">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      7. Likely to return (0–10)
                                    </p>
                                    <p className="mt-0.5 text-gray-700">
                                      {typeof survey.returnLikelihood ===
                                      "number"
                                        ? survey.returnLikelihood
                                        : "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      8. One thing to improve
                                    </p>
                                    <p className="mt-0.5 text-gray-700">
                                      {survey.improvement || "—"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              review.comment && (
                                <p className="text-sm text-gray-700 mt-3 mb-2">
                                  {review.comment}
                                </p>
                              )
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{review.pageUrl || "Unknown page"}</span>
                              <span>
                                {new Date(review.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "contacts" && (
              <div className="space-y-6">
                <div>
                  {contactStats && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                      <div className="bg-white/50 rounded-xl p-4 border border-[rgba(208,196,226,0.4)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail
                            className="w-5 h-5"
                            style={{ color: "#2F3C96" }}
                          />
                          <span className="text-sm font-semibold text-brand-gray">
                            Total
                          </span>
                        </div>
                        <p
                          className="text-2xl font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          {contactStats.total}
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-semibold text-brand-gray">
                            New
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">
                          {contactStats.byStatus?.new || 0}
                        </p>
                      </div>
                      <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-5 h-5 text-yellow-600" />
                          <span className="text-sm font-semibold text-brand-gray">
                            Read
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-700">
                          {contactStats.byStatus?.read || 0}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="w-5 h-5 text-purple-600" />
                          <span className="text-sm font-semibold text-brand-gray">
                            Replied
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-purple-700">
                          {contactStats.byStatus?.replied || 0}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-semibold text-brand-gray">
                            Resolved
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">
                          {contactStats.byStatus?.resolved || 0}
                        </p>
                      </div>
                    </div>
                  )}

                  {loadingContacts ? (
                    <div className="flex justify-center py-12">
                      <Loader2
                        className="w-8 h-8 animate-spin"
                        style={{ color: "#2F3C96" }}
                      />
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="text-center py-12 bg-white/50 rounded-xl border border-[rgba(208,196,226,0.4)]">
                      <Mail className="w-12 h-12 mx-auto mb-3 text-brand-gray/40" />
                      <p className="text-brand-gray">No contact messages yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contacts.map((contact) => {
                        const statusColors = {
                          new: "bg-blue-100 text-blue-700 border-blue-200",
                          read: "bg-yellow-100 text-yellow-700 border-yellow-200",
                          replied:
                            "bg-purple-100 text-purple-700 border-purple-200",
                          resolved:
                            "bg-green-100 text-green-700 border-green-200",
                        };

                        return (
                          <div
                            key={contact._id}
                            className="bg-white rounded-xl p-5 border border-[rgba(208,196,226,0.4)] hover:shadow-lg transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: "#E8E0EF" }}
                                >
                                  <span
                                    className="text-sm font-bold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {contact.name?.charAt(0)?.toUpperCase() ||
                                      "U"}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="font-semibold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {contact.name}
                                  </div>
                                  <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <Mail className="w-3 h-3" />
                                    {contact.email}
                                  </div>
                                  {contact.userId && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Registered User
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${
                                  statusColors[contact.status] ||
                                  "text-gray-600 bg-gray-50"
                                }`}
                              >
                                {contact.status}
                              </span>
                            </div>

                            <div className="mb-4">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {contact.message}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                              <span>
                                {new Date(contact.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                              <span>IP: {contact.ipAddress || "Unknown"}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                              <select
                                value={contact.status}
                                onChange={(e) =>
                                  handleUpdateContactStatus(
                                    contact._id,
                                    e.target.value,
                                  )
                                }
                                disabled={updatingContactId === contact._id}
                                className="px-3 py-1.5 text-sm border border-[rgba(208,196,226,0.5)] rounded-lg bg-white disabled:opacity-50"
                                style={{ color: "#2F3C96" }}
                              >
                                <option value="new">New</option>
                                <option value="read">Read</option>
                                <option value="replied">Replied</option>
                                <option value="resolved">Resolved</option>
                              </select>

                              <button
                                onClick={() => handleDeleteContact(contact._id)}
                                disabled={deletingContactId === contact._id}
                                className="ml-auto px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg disabled:opacity-50 flex items-center gap-2"
                              >
                                {deletingContactId === contact._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "page-feedback" &&
              (() => {
                const now = Date.now();
                const oneDayMs = 24 * 60 * 60 * 1000;
                const withType = (pageFeedbacks || []).map((f) => ({
                  ...f,
                  _type: categorizeFeedback(f.feedback),
                }));
                const filtered = withType.filter((f) => {
                  if (
                    pageFeedbackFilters.role &&
                    f.userRole !== pageFeedbackFilters.role
                  )
                    return false;
                  if (
                    pageFeedbackFilters.page &&
                    f.pagePath !== pageFeedbackFilters.page
                  )
                    return false;
                  if (
                    pageFeedbackFilters.type &&
                    f._type !== pageFeedbackFilters.type
                  )
                    return false;
                  const t = new Date(f.createdAt).getTime();
                  if (
                    pageFeedbackFilters.dateFrom &&
                    t < new Date(pageFeedbackFilters.dateFrom).getTime()
                  )
                    return false;
                  if (
                    pageFeedbackFilters.dateTo &&
                    t >
                      new Date(pageFeedbackFilters.dateTo).getTime() + oneDayMs
                  )
                    return false;
                  if (
                    pageFeedbackFilters.search &&
                    !f.feedback
                      .toLowerCase()
                      .includes(pageFeedbackFilters.search.toLowerCase())
                  )
                    return false;
                  return true;
                });
                const kpiBugs = withType.filter(
                  (f) => f._type === "bug",
                ).length;
                const kpiFeature = withType.filter(
                  (f) => f._type === "feature",
                ).length;
                const kpiUx = withType.filter((f) => f._type === "ux").length;
                const kpiPerf = withType.filter(
                  (f) => f._type === "performance",
                ).length;
                const kpiNew24h = withType.filter(
                  (f) => now - new Date(f.createdAt).getTime() < oneDayMs,
                ).length;
                const pagesForInsights = (pageFeedbackStats?.byPage || []).map(
                  (p) => {
                    const onPage = withType.filter((f) => f.pagePath === p._id);
                    const typeCounts = {};
                    onPage.forEach((f) => {
                      typeCounts[f._type] = (typeCounts[f._type] || 0) + 1;
                    });
                    const dominantType =
                      Object.entries(typeCounts).sort(
                        (a, b) => b[1] - a[1],
                      )[0]?.[0] || "ux";
                    const sample =
                      onPage[0]?.feedback?.slice(0, 50) +
                        (onPage[0]?.feedback?.length > 50 ? "…" : "") || "—";
                    return {
                      page: p._id,
                      count: p.count,
                      type: dominantType,
                      sample,
                    };
                  },
                );
                const sortedInsights = [...pagesForInsights].sort((a, b) => {
                  const key = pageInsightsSort.key;
                  const d = pageInsightsSort.dir === "asc" ? 1 : -1;
                  if (key === "page") return d * a.page.localeCompare(b.page);
                  if (key === "count") return d * (a.count - b.count);
                  if (key === "type") return d * a.type.localeCompare(b.type);
                  return 0;
                });
                const patternSummary = getPatternSummary(filtered, 5);
                const toggleExpanded = (id) =>
                  setPageFeedbackExpanded((prev) => ({
                    ...prev,
                    [id]: !prev[id],
                  }));
                const setMeta = (id, patch) =>
                  setPageFeedbackMeta((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], ...patch },
                  }));
                const roleColors = {
                  patient: "bg-blue-100 text-blue-700 border-blue-200",
                  researcher: "bg-purple-100 text-purple-700 border-purple-200",
                  guest: "bg-gray-100 text-gray-700 border-gray-200",
                };

                return (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
                        style={{ backgroundColor: "rgba(47,60,150,0.08)" }}
                      >
                        <MessageCircle
                          className="h-5 w-5"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-brand-gray">
                          Review and act on user feedback by page and type
                        </p>
                      </div>
                    </div>

                    {/* Zone 1 — KPI Summary */}
                    {pageFeedbackStats && (
                      <div className="rounded-2xl border border-[rgba(208,196,226,0.4)] bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-brand-gray mb-3">
                          At a glance
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                          <div className="rounded-xl bg-[rgba(47,60,150,0.06)] border border-[rgba(47,60,150,0.12)] px-4 py-3 flex flex-col">
                            <span className="text-xs font-medium text-brand-gray">
                              Total
                            </span>
                            <span
                              className="text-2xl font-bold mt-0.5 tabular-nums"
                              style={{ color: "#2F3C96" }}
                            >
                              {pageFeedbackStats.total}
                            </span>
                          </div>
                          <div className="rounded-xl bg-red-50/90 border border-red-100 px-4 py-3 flex flex-col">
                            <span className="text-xs font-medium text-red-600">
                              Bugs
                            </span>
                            <span className="text-2xl font-bold text-red-700 mt-0.5 tabular-nums">
                              {kpiBugs}
                            </span>
                          </div>
                          <div className="rounded-xl bg-blue-50/90 border border-blue-100 px-4 py-3 flex flex-col">
                            <span className="text-xs font-medium text-blue-600">
                              Features
                            </span>
                            <span className="text-2xl font-bold text-blue-700 mt-0.5 tabular-nums">
                              {kpiFeature}
                            </span>
                          </div>
                          <div className="rounded-xl bg-yellow-50/90 border border-yellow-100 px-4 py-3 flex flex-col">
                            <span className="text-xs font-medium text-yellow-700">
                              UX
                            </span>
                            <span className="text-2xl font-bold text-yellow-700 mt-0.5 tabular-nums">
                              {kpiUx}
                            </span>
                          </div>
                          <div className="rounded-xl bg-amber-50/90 border border-amber-100 px-4 py-3 flex flex-col">
                            <span className="text-xs font-medium text-amber-700">
                              Perf
                            </span>
                            <span className="text-2xl font-bold text-amber-700 mt-0.5 tabular-nums">
                              {kpiPerf}
                            </span>
                          </div>
                          <div className="rounded-xl bg-emerald-50/90 border border-emerald-100 px-4 py-3 flex flex-col">
                            <span className="text-xs font-medium text-emerald-700">
                              New 24h
                            </span>
                            <span className="text-2xl font-bold text-emerald-700 mt-0.5 tabular-nums">
                              {kpiNew24h}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-[rgba(208,196,226,0.3)]">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                            <UserCircle className="h-3.5 w-3.5" />
                            <strong>
                              {pageFeedbackStats.byRole?.patient || 0}
                            </strong>{" "}
                            Patients
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-100">
                            <User className="h-3.5 w-3.5" />
                            <strong>
                              {pageFeedbackStats.byRole?.researcher || 0}
                            </strong>{" "}
                            Researchers
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200">
                            <strong>
                              {pageFeedbackStats.byRole?.guest || 0}
                            </strong>{" "}
                            Guests
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Filters */}
                    <div className="rounded-2xl border border-[rgba(208,196,226,0.4)] bg-white/80 p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Filter className="h-4 w-4 text-brand-gray" />
                        <span className="text-sm font-semibold text-brand-gray">
                          Filters
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={pageFeedbackFilters.role}
                          onChange={(e) =>
                            setPageFeedbackFilters((f) => ({
                              ...f,
                              role: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-[rgba(208,196,226,0.5)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20"
                        >
                          <option value="">Role: All</option>
                          <option value="patient">Patient</option>
                          <option value="researcher">Researcher</option>
                          <option value="guest">Guest</option>
                        </select>
                        <select
                          value={pageFeedbackFilters.page}
                          onChange={(e) =>
                            setPageFeedbackFilters((f) => ({
                              ...f,
                              page: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-[rgba(208,196,226,0.5)] bg-white px-3 py-2 text-sm max-w-[200px] focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20"
                        >
                          <option value="">Page: All</option>
                          {(pageFeedbackStats?.byPage || []).map((p) => (
                            <option key={p._id} value={p._id}>
                              {p._id}
                            </option>
                          ))}
                        </select>
                        <select
                          value={pageFeedbackFilters.type}
                          onChange={(e) =>
                            setPageFeedbackFilters((f) => ({
                              ...f,
                              type: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-[rgba(208,196,226,0.5)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20"
                        >
                          <option value="">Type: All</option>
                          <option value="bug">Bug</option>
                          <option value="feature">Feature Request</option>
                          <option value="ux">UX</option>
                          <option value="performance">Performance</option>
                        </select>
                        <div className="flex items-center gap-1 rounded-lg border border-[rgba(208,196,226,0.5)] bg-gray-50/50 px-2">
                          <Calendar className="h-4 w-4 text-brand-gray shrink-0" />
                          <input
                            type="date"
                            value={pageFeedbackFilters.dateFrom}
                            onChange={(e) =>
                              setPageFeedbackFilters((f) => ({
                                ...f,
                                dateFrom: e.target.value,
                              }))
                            }
                            className="border-0 bg-transparent py-2 pl-0 pr-2 text-sm focus:outline-none focus:ring-0"
                          />
                          <span className="text-brand-gray">–</span>
                          <input
                            type="date"
                            value={pageFeedbackFilters.dateTo}
                            onChange={(e) =>
                              setPageFeedbackFilters((f) => ({
                                ...f,
                                dateTo: e.target.value,
                              }))
                            }
                            className="border-0 bg-transparent py-2 pl-0 pr-2 text-sm focus:outline-none focus:ring-0"
                          />
                        </div>
                        <div className="relative flex-1 min-w-[160px] max-w-[220px]">
                          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Search in feedback..."
                            value={pageFeedbackFilters.search}
                            onChange={(e) =>
                              setPageFeedbackFilters((f) => ({
                                ...f,
                                search: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-[rgba(208,196,226,0.5)] bg-white py-2 pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPageFeedbackFilters({
                              role: "",
                              page: "",
                              type: "",
                              dateFrom: "",
                              dateTo: "",
                              search: "",
                            })
                          }
                          className="rounded-lg border border-[rgba(208,196,226,0.5)] bg-white px-3 py-2 text-sm font-medium text-brand-royal-blue hover:bg-[rgba(47,60,150,0.06)] transition-colors"
                        >
                          Clear filters
                        </button>
                      </div>
                    </div>

                    {/* Pattern Summary — Top Recurring Issues (dropdown, closed by default) */}
                    {patternSummary.length > 0 && (
                      <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 shadow-sm overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setPageFeedbackRecurringOpen((v) => !v)
                          }
                          className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-amber-100/30 transition-colors"
                        >
                          <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
                              <BarChart3 className="h-4 w-4 text-amber-700" />
                            </span>
                            Top Recurring Issues
                            <span className="text-amber-700 font-normal">
                              ({patternSummary.length})
                            </span>
                          </h3>
                          <ChevronDown
                            className={`h-5 w-5 text-amber-700 shrink-0 transition-transform duration-200 ${pageFeedbackRecurringOpen ? "" : "-rotate-90"}`}
                          />
                        </button>
                        {pageFeedbackRecurringOpen && (
                          <div className="px-4 pb-4 pt-0">
                            <ul className="space-y-2">
                              {patternSummary.map((p, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 rounded-lg bg-white/70 px-3 py-2 border border-amber-100/80"
                                >
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200/80 text-xs font-bold text-amber-800">
                                    {p.count}
                                  </span>
                                  <span className="text-sm text-amber-900">
                                    <strong>{p.text}</strong>{" "}
                                    <span className="text-amber-700 font-normal">
                                      — {p.count} report
                                      {p.count !== 1 ? "s" : ""}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Feedback Insights (Sortable Table, dropdown, closed by default) */}
                    {sortedInsights.length > 0 && (
                      <div className="rounded-2xl border border-[rgba(208,196,226,0.4)] bg-white/80 overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setPageFeedbackInsightsOpen((v) => !v)}
                          className="w-full flex items-center justify-between gap-2 px-4 py-3 border-b border-[rgba(208,196,226,0.4)] bg-[rgba(47,60,150,0.04)] hover:bg-[rgba(47,60,150,0.08)] transition-colors text-left"
                        >
                          <h3
                            className="text-sm font-semibold flex items-center gap-2"
                            style={{ color: "#2F3C96" }}
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            Feedback by Page — Insights
                            <span className="font-normal text-brand-gray">
                              ({sortedInsights.length} pages)
                            </span>
                          </h3>
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 transition-transform duration-200 ${pageFeedbackInsightsOpen ? "" : "-rotate-90"}`}
                            style={{ color: "#2F3C96" }}
                          />
                        </button>
                        {pageFeedbackInsightsOpen && (
                          <div className="overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0">
                            <table className="w-full min-w-[320px] text-sm">
                              <thead>
                                <tr className="bg-gray-50/90 text-left">
                                  <th
                                    className="px-4 py-3 font-semibold text-brand-gray cursor-pointer hover:bg-gray-100/80 transition-colors rounded-tl-lg"
                                    onClick={() =>
                                      setPageInsightsSort((s) => ({
                                        key: "page",
                                        dir:
                                          s.key === "page" && s.dir === "asc"
                                            ? "desc"
                                            : "asc",
                                      }))
                                    }
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      Page{" "}
                                      {pageInsightsSort.key === "page" &&
                                        (pageInsightsSort.dir === "asc"
                                          ? "↑"
                                          : "↓")}
                                    </span>
                                  </th>
                                  <th
                                    className="px-4 py-3 font-semibold text-brand-gray cursor-pointer hover:bg-gray-100/80 transition-colors"
                                    onClick={() =>
                                      setPageInsightsSort((s) => ({
                                        key: "count",
                                        dir:
                                          s.key === "count" && s.dir === "asc"
                                            ? "desc"
                                            : "asc",
                                      }))
                                    }
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      Count{" "}
                                      {pageInsightsSort.key === "count" &&
                                        (pageInsightsSort.dir === "asc"
                                          ? "↑"
                                          : "↓")}
                                    </span>
                                  </th>
                                  <th
                                    className="px-4 py-3 font-semibold text-brand-gray cursor-pointer hover:bg-gray-100/80 transition-colors"
                                    onClick={() =>
                                      setPageInsightsSort((s) => ({
                                        key: "type",
                                        dir:
                                          s.key === "type" && s.dir === "asc"
                                            ? "desc"
                                            : "asc",
                                      }))
                                    }
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      Type{" "}
                                      {pageInsightsSort.key === "type" &&
                                        (pageInsightsSort.dir === "asc"
                                          ? "↑"
                                          : "↓")}
                                    </span>
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-brand-gray">
                                    Most common issue
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedInsights.map((row, idx) => (
                                  <tr
                                    key={row.page}
                                    className={`border-t border-[rgba(208,196,226,0.25)] hover:bg-[rgba(47,60,150,0.03)] transition-colors ${idx % 2 === 0 ? "bg-white/50" : ""}`}
                                  >
                                    <td
                                      className="px-4 py-2.5 font-medium text-gray-800 truncate max-w-[200px]"
                                      title={row.page}
                                    >
                                      {row.page}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span
                                        className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[rgba(47,60,150,0.08)] px-2 text-sm font-bold tabular-nums"
                                        style={{ color: "#2F3C96" }}
                                      >
                                        {row.count}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span
                                        className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border ${FEEDBACK_TYPE_COLORS[row.type] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                                      >
                                        {FEEDBACK_TYPE_LABELS[row.type] ||
                                          row.type}
                                      </span>
                                    </td>
                                    <td
                                      className="px-4 py-2.5 text-gray-600 truncate max-w-[260px]"
                                      title={row.sample}
                                    >
                                      {row.sample}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Smart Compact Feedback List */}
                    {loadingPageFeedback ? (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-[rgba(208,196,226,0.4)] bg-white/60 py-16">
                        <Loader2
                          className="h-10 w-10 animate-spin mb-3"
                          style={{ color: "#2F3C96" }}
                        />
                        <p className="text-sm text-brand-gray">
                          Loading feedback…
                        </p>
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="text-center rounded-2xl border border-[rgba(208,196,226,0.4)] bg-white/60 py-16 px-6">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(47,60,150,0.08)] mb-4">
                          <MessageCircle className="h-7 w-7 text-brand-gray/60" />
                        </div>
                        <p className="text-brand-gray font-medium">
                          No page feedback{" "}
                          {pageFeedbackFilters.role ||
                          pageFeedbackFilters.page ||
                          pageFeedbackFilters.type ||
                          pageFeedbackFilters.search
                            ? "matching filters"
                            : "yet"}
                        </p>
                        <p className="text-sm text-brand-gray/80 mt-1">
                          Try adjusting filters or check back later.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-[rgba(208,196,226,0.4)] bg-white/80 overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(208,196,226,0.4)] bg-[rgba(47,60,150,0.04)]">
                          <span className="text-sm font-medium text-brand-gray">
                            Showing{" "}
                            <strong className="text-gray-800">
                              {filtered.length}
                            </strong>{" "}
                            of{" "}
                            <strong className="text-gray-800">
                              {withType.length}
                            </strong>{" "}
                            feedback
                          </span>
                        </div>
                        <div className="divide-y divide-[rgba(208,196,226,0.25)]">
                          {filtered.map((item) => {
                            const type = item._type;
                            const stripColor =
                              FEEDBACK_TYPE_STRIP[type] || "bg-gray-400";
                            const isExpanded = pageFeedbackExpanded[item._id];
                            const meta = pageFeedbackMeta[item._id] || {};
                            const timeAgo = (() => {
                              const sec = Math.floor(
                                (now - new Date(item.createdAt).getTime()) /
                                  1000,
                              );
                              if (sec < 60) return "just now";
                              if (sec < 3600)
                                return `${Math.floor(sec / 60)}m ago`;
                              if (sec < 86400)
                                return `${Math.floor(sec / 3600)}h ago`;
                              return `${Math.floor(sec / 86400)}d ago`;
                            })();

                            return (
                              <div
                                key={item._id}
                                className={`transition-all duration-200 ${meta.resolved ? "opacity-70 bg-gray-50/50" : "hover:bg-gray-50/50"}`}
                              >
                                <div className="flex">
                                  <div
                                    className={`w-1.5 shrink-0 self-stretch ${stripColor}`}
                                  />
                                  <div className="flex-1 min-w-0 py-2.5 px-4">
                                    <button
                                      type="button"
                                      onClick={() => toggleExpanded(item._id)}
                                      className="w-full text-left flex items-center gap-2.5 flex-wrap group"
                                    >
                                      <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 group-hover:bg-gray-200 transition-colors">
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-gray-500" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-gray-500" />
                                        )}
                                      </span>
                                      <span
                                        className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-semibold border ${FEEDBACK_TYPE_COLORS[type] || "bg-gray-100"}`}
                                      >
                                        {FEEDBACK_TYPE_LABELS[
                                          type
                                        ]?.toUpperCase() || "UX"}
                                      </span>
                                      <span className="text-gray-400 text-sm">
                                        ·
                                      </span>
                                      <span
                                        className="text-gray-600 text-sm font-medium truncate max-w-[140px]"
                                        title={item.pagePath}
                                      >
                                        {item.pagePath}
                                      </span>
                                      <span className="text-gray-400 text-sm">
                                        ·
                                      </span>
                                      <span
                                        className={`shrink-0 text-xs px-2 py-0.5 rounded-md capitalize font-medium ${roleColors[item.userRole] || "bg-gray-100"}`}
                                      >
                                        {item.userRole}
                                      </span>
                                      <span className="text-gray-400 text-xs shrink-0">
                                        {timeAgo}
                                      </span>
                                      <span className="flex-1 min-w-0 text-sm text-gray-700 ml-0.5 italic whitespace-pre-wrap">
                                        "{item.feedback}"
                                      </span>
                                    </button>

                                    {isExpanded && (
                                      <div className="mt-3 ml-8 pl-4 border-l-2 border-[rgba(208,196,226,0.3)] space-y-3">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                          {item.feedback}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                          <span className="flex items-center gap-1.5">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600">
                                              {item.username
                                                ?.charAt(0)
                                                ?.toUpperCase() || "U"}
                                            </span>
                                            <span className="font-medium text-gray-700">
                                              {item.username}
                                            </span>
                                          </span>
                                          {item.email && (
                                            <span className="flex items-center gap-1">
                                              <Mail className="h-3.5 w-3.5" />
                                              {item.email}
                                            </span>
                                          )}
                                          <a
                                            href={item.pageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-brand-royal-blue hover:underline font-medium"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />{" "}
                                            View page
                                          </a>
                                          <span>
                                            {new Date(
                                              item.createdAt,
                                            ).toLocaleString()}
                                          </span>
                                        </div>
                                        {meta.internalNote && (
                                          <div className="text-xs text-gray-600 bg-amber-50/80 border border-amber-100 rounded-lg p-2.5">
                                            <strong className="text-amber-800">
                                              Note:
                                            </strong>{" "}
                                            {meta.internalNote}
                                          </div>
                                        )}
                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setMeta(item._id, {
                                                resolved: !meta.resolved,
                                              })
                                            }
                                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${meta.resolved ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                                          >
                                            <CheckCircle className="h-3.5 w-3.5" />{" "}
                                            {meta.resolved
                                              ? "Resolved"
                                              : "Mark resolved"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setMeta(item._id, {
                                                reviewed: !meta.reviewed,
                                              })
                                            }
                                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${meta.reviewed ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                                          >
                                            <Eye className="h-3.5 w-3.5" />{" "}
                                            {meta.reviewed
                                              ? "Reviewed"
                                              : "Mark reviewed"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(
                                                `${item.pagePath}: ${item.feedback}`,
                                              );
                                              toast.success("Copied as task");
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                          >
                                            <ClipboardList className="h-3.5 w-3.5" />{" "}
                                            Convert to task
                                          </button>
                                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1">
                                            <StickyNote className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                            <input
                                              type="text"
                                              placeholder="Internal note..."
                                              value={
                                                feedbackNoteInput[item._id] ??
                                                meta.internalNote ??
                                                ""
                                              }
                                              onChange={(e) =>
                                                setFeedbackNoteInput(
                                                  (prev) => ({
                                                    ...prev,
                                                    [item._id]: e.target.value,
                                                  }),
                                                )
                                              }
                                              onBlur={() =>
                                                feedbackNoteInput[item._id] !==
                                                  undefined &&
                                                setMeta(item._id, {
                                                  internalNote:
                                                    feedbackNoteInput[
                                                      item._id
                                                    ] ??
                                                    meta.internalNote ??
                                                    "",
                                                })
                                              }
                                              className="w-40 border-0 bg-transparent py-0.5 text-xs focus:outline-none focus:ring-0"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            {activeSection === "weekly-mailer" && (
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 p-4 md:p-6">
                <p className="text-sm text-brand-gray mb-4">
                  Search patients, select who should receive the weekly digest,
                  then send. The email is personalized using your backend
                  pipeline. Profile location is shown when set (used for expert
                  matching in the digest).
                </p>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                    <Search className="w-4 h-4 text-brand-gray/70 shrink-0" />
                    <input
                      type="text"
                      value={weeklyMailerSearchQuery}
                      onChange={(e) =>
                        setWeeklyMailerSearchQuery(e.target.value)
                      }
                      placeholder="Search users (name, email, condition, location)..."
                      className="w-full px-2.5 py-1.5 border border-[rgba(208,196,226,0.5)] rounded-lg text-xs md:text-sm bg-white"
                      disabled={sendingWeeklyMailer}
                    />
                  </div>

                  {getWeeklyMailerFilteredPatients().length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAllWeeklyMailer}
                      disabled={sendingWeeklyMailer}
                      className="flex items-center gap-2 text-xs text-brand-royal-blue hover:underline"
                      title="Select/deselect all filtered patients"
                    >
                      {weeklyMailerSelectedUserIds.length ===
                        getWeeklyMailerFilteredPatients().length &&
                      getWeeklyMailerFilteredPatients().length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {weeklyMailerSelectedUserIds.length > 0
                          ? `Selected (${weeklyMailerSelectedUserIds.length})`
                          : "Select all"}
                      </span>
                    </button>
                  )}

                  {weeklyMailerSelectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setWeeklyMailerSelectedUserIds([])}
                      disabled={sendingWeeklyMailer}
                      className="flex items-center gap-2 text-xs text-brand-gray hover:underline"
                      title="Clear selection"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}

                  <div className="flex-1" />

                  <button
                    type="button"
                    onClick={handleSendWeeklyMailer}
                    disabled={
                      sendingWeeklyMailer ||
                      weeklyMailerSelectedUserIds.length === 0
                    }
                    className="px-3 py-1.5 text-sm bg-brand-royal-blue/10 text-brand-royal-blue rounded-lg hover:bg-brand-royal-blue/20 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingWeeklyMailer ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Send ({weeklyMailerSelectedUserIds.length})
                  </button>
                </div>

                {weeklyMailerPipeline.length > 0 && (
                  <div className="mb-4 rounded-xl border border-[rgba(208,196,226,0.35)] bg-slate-50/80 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-brand-gray uppercase">
                        Sending pipeline
                      </p>
                      <p className="text-xs text-brand-gray">
                        {
                          weeklyMailerPipeline.filter(
                            (e) => e.status === "sent",
                          ).length
                        }{" "}
                        sent •{" "}
                        {
                          weeklyMailerPipeline.filter(
                            (e) => e.status === "skipped",
                          ).length
                        }{" "}
                        skipped •{" "}
                        {
                          weeklyMailerPipeline.filter(
                            (e) => e.status === "error",
                          ).length
                        }{" "}
                        errors
                      </p>
                    </div>
                    <div className="space-y-2">
                      {weeklyMailerPipeline.map((entry) => {
                        const isSending = entry.status === "sending";
                        const isSent = entry.status === "sent";
                        const isSkipped = entry.status === "skipped";
                        const isError = entry.status === "error";
                        const pillClass = isSent
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : isSkipped
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : isError
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : isSending
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : "bg-slate-50 text-slate-700 border-slate-200";

                        return (
                          <div
                            key={entry.userId}
                            className="flex items-start justify-between gap-3 rounded-lg border border-[rgba(208,196,226,0.35)] bg-white p-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#2F3C96] truncate">
                                {entry.idx + 1}. {entry.name}
                              </p>
                              {entry.email && (
                                <p className="text-[11px] text-brand-gray truncate">
                                  {entry.email}
                                </p>
                              )}
                              {!!entry.locationLabel && (
                                <p className="text-[11px] text-brand-gray/80 flex items-center gap-1 mt-0.5 min-w-0">
                                  <MapPin className="w-3 h-3 shrink-0 text-brand-royal-blue/60" />
                                  <span className="truncate">
                                    {entry.locationLabel}
                                  </span>
                                </p>
                              )}
                              {!!entry.message && (
                                <p className="text-[11px] text-brand-gray mt-1">
                                  {entry.message}
                                </p>
                              )}
                            </div>
                            <div
                              className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${pillClass}`}
                            >
                              {isSending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isSent ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                              ) : isSkipped ? (
                                <XCircle className="w-3.5 h-3.5" />
                              ) : isError ? (
                                <XCircle className="w-3.5 h-3.5" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              <span className="capitalize">{entry.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {loadingPatients ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-royal-blue" />
                  </div>
                ) : getWeeklyMailerFilteredPatients().length === 0 ? (
                  <div className="text-center py-12">
                    <UserCircle className="w-16 h-16 text-brand-gray-300 mx-auto mb-4" />
                    <p className="text-brand-gray font-medium">
                      No matching patients found
                    </p>
                    {weeklyMailerSearchQuery.trim() && (
                      <p className="text-sm text-brand-gray/70 mt-1">
                        Try a different search (name, email, condition, or
                        location).
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getWeeklyMailerFilteredPatients().map((p) => (
                      <div
                        key={p.userId}
                        className="bg-slate-50/80 rounded-lg p-3 border border-[rgba(208,196,226,0.4)] hover:shadow-md transition-all flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              !sendingWeeklyMailer &&
                              toggleWeeklyMailerUser(p.userId)
                            }
                            className="shrink-0 text-brand-royal-blue hover:opacity-80 mt-0.5"
                            title="Toggle selection"
                          >
                            {weeklyMailerSelectedUserIds.includes(p.userId) ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#2F3C96] truncate">
                              {p.name || "Patient"}
                            </p>
                            {p.email && (
                              <p className="text-xs text-brand-gray truncate">
                                {p.email}
                              </p>
                            )}
                            {(() => {
                              const locLabel =
                                getWeeklyMailerPatientLocationLabel(p);
                              if (!locLabel) return null;
                              return (
                                <p className="text-xs text-brand-gray/85 flex items-center gap-1 mt-1 min-w-0">
                                  <MapPin className="w-3.5 h-3.5 shrink-0 text-brand-royal-blue/65" />
                                  <span className="truncate" title={locLabel}>
                                    {locLabel}
                                  </span>
                                </p>
                              );
                            })()}
                            {(() => {
                              const shown = getWeeklyMailerPatientConditions(p);
                              if (!shown.length) return null;
                              return (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {shown.map((c, i) => (
                                    <span
                                      key={`${p.userId}-${i}-${c}`}
                                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-200 max-w-full truncate"
                                      title={c}
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === "beta-users" && (
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 p-4 md:p-6">
                <p className="text-sm text-brand-gray mb-1">
                  Users who opted in to the beta program (from Yori). Send a
                  short survey message with your Google Form or other{" "}
                  <strong className="font-semibold text-brand-royal-blue">
                    https
                  </strong>{" "}
                  link—one message per recipient, same link for all.
                </p>
                <p className="text-xs text-brand-gray/80 mb-4">
                  Emails are sent through the same Azure mail as the rest of the
                  app. You can select everyone or individual participants.
                </p>

                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-brand-gray border border-brand-purple-200/50 bg-brand-purple-50/50 rounded-lg px-3 py-2.5">
                  <History className="w-4 h-4 text-brand-royal-blue shrink-0" />
                  {betaSurveyLastBatch?.sentAt ? (
                    <span>
                      <span className="font-semibold text-brand-royal-blue">
                        Last batch sent
                      </span>
                      {" · "}
                      {new Date(betaSurveyLastBatch.sentAt).toLocaleString()}
                      {" · "}
                      <span className="font-medium text-[#2F3C96]">
                        {betaSurveyLastBatch.successCount}
                      </span>{" "}
                      {betaSurveyLastBatch.successCount === 1
                        ? "mail sent"
                        : "mails sent"}
                      {betaSurveyLastBatch.errorCount > 0 ? (
                        <span className="text-amber-800">
                          {" "}
                          ({betaSurveyLastBatch.errorCount} failed)
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-brand-gray/90">
                      No survey batches sent yet.
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-brand-gray mb-1">
                    Survey link (https)
                  </label>
                  <input
                    type="url"
                    inputMode="url"
                    value={betaSurveyUrl}
                    onChange={(e) => setBetaSurveyUrl(e.target.value)}
                    placeholder="https://docs.google.com/forms/d/e/..."
                    disabled={sendingBetaSurvey}
                    className="w-full max-w-2xl px-2.5 py-1.5 border border-[rgba(208,196,226,0.5)] rounded-lg text-xs md:text-sm bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                    <Search className="w-4 h-4 text-brand-gray/70 shrink-0" />
                    <input
                      type="text"
                      value={betaSurveySearchQuery}
                      onChange={(e) => setBetaSurveySearchQuery(e.target.value)}
                      placeholder="Search by name, email, role…"
                      className="w-full px-2.5 py-1.5 border border-[rgba(208,196,226,0.5)] rounded-lg text-xs md:text-sm bg-white"
                      disabled={sendingBetaSurvey}
                    />
                  </div>

                  {getBetaUsersFiltered().length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAllBetaUsers}
                      disabled={sendingBetaSurvey}
                      className="flex items-center gap-2 text-xs text-brand-royal-blue hover:underline"
                    >
                      {betaSelectedUserIds.length ===
                        getBetaUsersFiltered().length &&
                      getBetaUsersFiltered().length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {betaSelectedUserIds.length > 0
                          ? `Selected (${betaSelectedUserIds.length})`
                          : "Select all"}
                      </span>
                    </button>
                  )}

                  {betaSelectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBetaSelectedUserIds([])}
                      disabled={sendingBetaSurvey}
                      className="flex items-center gap-2 text-xs text-brand-gray hover:underline"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}

                  <div className="flex-1" />

                  <button
                    type="button"
                    onClick={handleSendBetaSurveyEmails}
                    disabled={
                      sendingBetaSurvey ||
                      betaSelectedUserIds.length === 0 ||
                      !(betaSurveyUrl || "").trim()
                    }
                    className="px-3 py-1.5 text-sm bg-brand-royal-blue/10 text-brand-royal-blue rounded-lg hover:bg-brand-royal-blue/20 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingBetaSurvey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send ({betaSelectedUserIds.length})
                  </button>
                </div>

                {betaSurveyPipeline.length > 0 && (
                  <div className="mb-4 rounded-xl border border-[rgba(208,196,226,0.35)] bg-slate-50/80 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-brand-gray uppercase">
                        Sending
                      </p>
                      <p className="text-xs text-brand-gray">
                        {
                          betaSurveyPipeline.filter((e) => e.status === "sent")
                            .length
                        }{" "}
                        sent •{" "}
                        {
                          betaSurveyPipeline.filter((e) => e.status === "error")
                            .length
                        }{" "}
                        errors
                      </p>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {betaSurveyPipeline.map((entry) => {
                        const isSending = entry.status === "sending";
                        const isSent = entry.status === "sent";
                        const isError = entry.status === "error";
                        const pillClass = isSent
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : isError
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : isSending
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-slate-50 text-slate-700 border-slate-200";
                        return (
                          <div
                            key={entry.userId}
                            className="flex items-start justify-between gap-3 rounded-lg border border-[rgba(208,196,226,0.35)] bg-white p-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#2F3C96] truncate">
                                {entry.idx + 1}. {entry.name}
                              </p>
                              {entry.email && (
                                <p className="text-[11px] text-brand-gray truncate">
                                  {entry.email}
                                </p>
                              )}
                              {!!entry.message && (
                                <p className="text-[11px] text-brand-gray mt-1">
                                  {entry.message}
                                </p>
                              )}
                            </div>
                            <div
                              className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${pillClass}`}
                            >
                              {isSending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isSent ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                              ) : isError ? (
                                <XCircle className="w-3.5 h-3.5" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              <span className="capitalize">{entry.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {loadingBetaProgramUsers ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-royal-blue" />
                  </div>
                ) : betaProgramUsers.length === 0 ? (
                  <div className="text-center py-12 rounded-lg border border-brand-purple-200/40 bg-brand-purple-50/30">
                    <FlaskConical className="w-16 h-16 text-brand-gray-300 mx-auto mb-4" />
                    <p className="text-brand-gray font-medium">
                      No beta opt-ins yet
                    </p>
                    <p className="text-sm text-brand-gray/70 mt-1 max-w-md mx-auto">
                      When users choose to join the beta from Yori, they will
                      appear here.
                    </p>
                  </div>
                ) : getBetaUsersFiltered().length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-brand-gray font-medium">
                      No users match your search
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getBetaUsersFiltered().map((u) => (
                      <div
                        key={String(u.userId)}
                        className="bg-slate-50/80 rounded-lg p-3 border border-[rgba(208,196,226,0.4)] hover:shadow-md transition-all flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              !sendingBetaSurvey &&
                              toggleBetaSurveyUser(u.userId)
                            }
                            className="shrink-0 text-brand-royal-blue hover:opacity-80 mt-0.5"
                            title="Toggle selection"
                          >
                            {betaSelectedUserIds.some(
                              (id) => String(id) === String(u.userId),
                            ) ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#2F3C96] truncate">
                              {u.username || "—"}
                            </p>
                            {u.email && (
                              <p className="text-xs text-brand-gray truncate">
                                {u.email}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 capitalize">
                                {u.role || "user"}
                              </span>
                              {u.betaProgramOptedAt && (
                                <span className="text-[11px] text-brand-gray">
                                  Opted in{" "}
                                  {new Date(
                                    u.betaProgramOptedAt,
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === "researcher-invites" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 p-4 md:p-6">
                  <p className="text-sm text-brand-gray mb-1">
                    Send outreach emails to external researchers using the same
                    Azure mail as the rest of Collabiora. Profile link in the
                    message:{" "}
                    <a
                      href="https://www.collabiora.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-royal-blue font-medium underline break-all"
                    >
                      https://www.collabiora.com/
                    </a>
                  </p>
                  <p className="text-xs text-brand-gray/80 mb-4">
                    Add up to 10 recipients. Names can be inferred from the part
                    before @ (e.g. AKeener@… → &quot;A Keener&quot;) or entered
                    manually. The email uses &quot;Dear Dr. [last word]&quot;;
                    if no name, &quot;Dear Doctor,&quot;.
                  </p>

                  <div className="space-y-3 mb-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[11px] font-semibold text-brand-gray uppercase">
                        Name for each row
                      </span>
                      <button
                        type="button"
                        onClick={() => setResearcherInviteNameMode("auto")}
                        disabled={sendingResearcherInvites}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          researcherInviteNameMode === "auto"
                            ? "bg-brand-royal-blue/15 border-brand-royal-blue/40 text-[#2F3C96]"
                            : "bg-white border-[rgba(208,196,226,0.6)] text-brand-gray hover:bg-slate-50"
                        } disabled:opacity-50`}
                      >
                        Auto from email
                      </button>
                      <button
                        type="button"
                        onClick={() => setResearcherInviteNameMode("manual")}
                        disabled={sendingResearcherInvites}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          researcherInviteNameMode === "manual"
                            ? "bg-brand-royal-blue/15 border-brand-royal-blue/40 text-[#2F3C96]"
                            : "bg-white border-[rgba(208,196,226,0.6)] text-brand-gray hover:bg-slate-50"
                        } disabled:opacity-50`}
                      >
                        Enter name manually
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-end">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-brand-gray uppercase mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={researcherInviteDraftEmail}
                          onChange={(e) =>
                            setResearcherInviteDraftEmail(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addResearcherInviteRecipient();
                            }
                          }}
                          placeholder="researcher@university.edu"
                          disabled={sendingResearcherInvites}
                          className="w-full px-2.5 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg text-xs md:text-sm bg-white font-mono"
                        />
                        {researcherInviteNameMode === "auto" &&
                          researcherInviteAutoPreview && (
                            <p className="mt-1 text-[11px] text-brand-gray">
                              Parsed name:{" "}
                              <span className="font-medium text-[#2F3C96]">
                                {researcherInviteAutoPreview}
                              </span>
                            </p>
                          )}
                      </div>
                      {researcherInviteNameMode === "manual" && (
                        <div className="flex-1 min-w-[160px] sm:max-w-[240px]">
                          <label className="block text-xs font-semibold text-brand-gray uppercase mb-1">
                            Full name
                          </label>
                          <input
                            type="text"
                            value={researcherInviteDraftName}
                            onChange={(e) =>
                              setResearcherInviteDraftName(e.target.value)
                            }
                            placeholder="e.g. Timothy Chang"
                            disabled={sendingResearcherInvites}
                            className="w-full px-2.5 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg text-xs md:text-sm bg-white"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={addResearcherInviteRecipient}
                        disabled={
                          sendingResearcherInvites ||
                          researcherInviteRecipients.length >= 10
                        }
                        className="shrink-0 px-3 py-2 text-sm rounded-lg border border-[rgba(208,196,226,0.6)] bg-white text-brand-royal-blue font-medium hover:bg-brand-royal-blue/5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-brand-gray uppercase mb-1">
                        Paste multiple emails (optional)
                      </label>
                      <p className="text-[11px] text-brand-gray/90 mb-1.5">
                        One per line; leading &quot;-&quot; is fine. Names are
                        always auto-parsed from each address.
                      </p>
                      <textarea
                        value={researcherInviteBulkText}
                        onChange={(e) =>
                          setResearcherInviteBulkText(e.target.value)
                        }
                        rows={4}
                        placeholder={
                          "jsmith@example.edu\n-MGarcia@research.org\nKPLee@university.ac.uk"
                        }
                        disabled={sendingResearcherInvites}
                        className="w-full px-2.5 py-2 border border-[rgba(208,196,226,0.5)] rounded-lg text-xs md:text-sm bg-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={addBulkResearcherInvitesFromText}
                        disabled={
                          sendingResearcherInvites ||
                          researcherInviteRecipients.length >= 10 ||
                          !researcherInviteBulkText.trim()
                        }
                        className="mt-2 px-3 py-1.5 text-xs rounded-lg border border-[rgba(208,196,226,0.6)] bg-white text-brand-royal-blue font-medium hover:bg-brand-royal-blue/5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add all from list
                      </button>
                    </div>

                    {researcherInviteRecipients.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-brand-gray uppercase mb-2">
                          Selected ({researcherInviteRecipients.length}/10)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {researcherInviteRecipients.map((r) => (
                            <span
                              key={r.id}
                              className="inline-flex items-center gap-1.5 max-w-full rounded-full border border-[rgba(47,60,150,0.2)] bg-[rgba(232,224,239,0.45)] pl-3 pr-1 py-1 text-xs text-[#2F3C96]"
                            >
                              <span className="min-w-0 truncate font-mono">
                                {r.email}
                                {r.displayName ? (
                                  <span className="text-brand-gray font-sans">
                                    {" "}
                                    · {r.displayName}
                                  </span>
                                ) : r.lastName ? (
                                  <span className="text-brand-gray font-sans">
                                    {" "}
                                    · Dr. {r.lastName}
                                  </span>
                                ) : null}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeResearcherInviteRecipient(r.id)
                                }
                                disabled={sendingResearcherInvites}
                                className="shrink-0 rounded-full p-1 text-brand-gray hover:bg-white/80 hover:text-rose-600 disabled:opacity-40"
                                title="Remove"
                                aria-label={`Remove ${r.email}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <button
                      type="button"
                      onClick={handleSendResearcherInvites}
                      disabled={
                        sendingResearcherInvites ||
                        researcherInviteRecipients.length === 0
                      }
                      className="px-3 py-1.5 text-sm bg-brand-royal-blue/10 text-brand-royal-blue rounded-lg hover:bg-brand-royal-blue/20 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingResearcherInvites ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send invites ({researcherInviteRecipients.length})
                    </button>
                  </div>

                  {researcherInvitePipeline.length > 0 && (
                    <div className="mb-4 rounded-xl border border-[rgba(208,196,226,0.35)] bg-slate-50/80 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-brand-gray uppercase">
                          Sending progress
                        </p>
                        <p className="text-xs text-brand-gray">
                          {
                            researcherInvitePipeline.filter(
                              (e) => e.status === "sent",
                            ).length
                          }{" "}
                          sent •{" "}
                          {
                            researcherInvitePipeline.filter(
                              (e) => e.status === "error",
                            ).length
                          }{" "}
                          errors
                        </p>
                      </div>
                      <div className="space-y-2">
                        {researcherInvitePipeline.map((entry) => {
                          const isSending = entry.status === "sending";
                          const isSent = entry.status === "sent";
                          const isError = entry.status === "error";
                          const pillClass = isSent
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : isError
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : isSending
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : "bg-slate-50 text-slate-700 border-slate-200";

                          return (
                            <div
                              key={entry.idx}
                              className="flex items-start justify-between gap-3 rounded-lg border border-[rgba(208,196,226,0.35)] bg-white p-2.5"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#2F3C96] truncate">
                                  {entry.idx + 1}. {entry.email}
                                </p>
                                {entry.displayName ? (
                                  <p className="text-[11px] text-brand-gray truncate">
                                    {entry.displayName}
                                  </p>
                                ) : entry.lastName ? (
                                  <p className="text-[11px] text-brand-gray truncate">
                                    Dr. {entry.lastName}
                                  </p>
                                ) : null}
                                {!!entry.message && (
                                  <p className="text-[11px] text-brand-gray mt-1">
                                    {entry.message}
                                  </p>
                                )}
                              </div>
                              <div
                                className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${pillClass}`}
                              >
                                {isSending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : isSent ? (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                ) : isError ? (
                                  <XCircle className="w-3.5 h-3.5" />
                                ) : (
                                  <Mail className="w-3.5 h-3.5" />
                                )}
                                <span className="capitalize">
                                  {entry.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 p-4 md:p-6">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#2F3C96]">
                        Sent invites (history)
                      </h3>
                      <p className="text-xs text-brand-gray mt-0.5">
                        All researcher invite sends from this admin tool (newest
                        first).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchResearcherInviteLogs()}
                      disabled={loadingResearcherInviteLogs}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {loadingResearcherInviteLogs ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Refresh
                    </button>
                  </div>

                  {loadingResearcherInviteLogs &&
                  researcherInviteLogs.length === 0 ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-royal-blue" />
                    </div>
                  ) : researcherInviteLogs.length === 0 ? (
                    <p className="text-sm text-brand-gray text-center py-8">
                      No invites sent yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-[rgba(208,196,226,0.35)]">
                      <table className="w-full min-w-[640px] text-sm text-left">
                        <thead>
                          <tr className="bg-slate-50/90 text-xs uppercase text-brand-gray border-b border-[rgba(208,196,226,0.35)]">
                            <th className="py-2 px-3 font-semibold">When</th>
                            <th className="py-2 px-3 font-semibold">Email</th>
                            <th className="py-2 px-3 font-semibold">
                              Last name
                            </th>
                            <th className="py-2 px-3 font-semibold">Status</th>
                            <th className="py-2 px-3 font-semibold">Admin</th>
                            <th className="py-2 px-3 font-semibold">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {researcherInviteLogs.map((row) => (
                            <tr
                              key={row._id}
                              className="border-b border-[rgba(208,196,226,0.25)] last:border-0"
                            >
                              <td className="py-2 px-3 text-xs text-brand-gray whitespace-nowrap">
                                {row.createdAt
                                  ? new Date(row.createdAt).toLocaleString()
                                  : "—"}
                              </td>
                              <td className="py-2 px-3 text-xs font-mono text-[#2F3C96] break-all">
                                {row.email}
                              </td>
                              <td className="py-2 px-3 text-xs text-brand-gray">
                                {row.lastName || "—"}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    row.status === "sent"
                                      ? "bg-emerald-50 text-emerald-800"
                                      : "bg-rose-50 text-rose-800"
                                  }`}
                                >
                                  {row.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-xs text-brand-gray">
                                {row.adminEmail || row.adminUsername || "—"}
                              </td>
                              <td className="py-2 px-3 text-xs text-rose-700 max-w-[200px]">
                                {row.errorMessage || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "onboarding-cleanup" && (
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 p-4 md:p-6">
                <p className="text-sm text-brand-gray mb-4">
                  Users who have partially completed onboarding. You can reset
                  their data so they can start fresh, or delete their account
                  entirely.
                </p>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="text-sm font-medium text-brand-gray">
                    Filter:
                  </span>
                  <select
                    value={onboardingFilter}
                    onChange={(e) => setOnboardingFilter(e.target.value)}
                    className="px-3 py-1.5 border border-[rgba(208,196,226,0.5)] rounded-lg text-sm bg-white"
                  >
                    <option value="all">All issues</option>
                    <option value="no-profile">No profile created</option>
                    <option value="no-email">Email not verified</option>
                    <option value="missing-data">Missing profile data</option>
                  </select>
                  <button
                    onClick={fetchIncompleteOnboarding}
                    className="px-3 py-1.5 text-sm bg-brand-royal-blue/10 text-brand-royal-blue rounded-lg hover:bg-brand-royal-blue/20 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                  {incompleteOnboardingUsers.length > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                      {(() => {
                        const filtered = getFilteredIncompleteUsers();
                        return `${filtered.length} user${filtered.length === 1 ? "" : "s"}`;
                      })()}
                    </span>
                  )}
                  {incompleteOnboardingUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAllIncomplete}
                      className="ml-1 flex items-center gap-1 text-xs text-brand-royal-blue hover:underline"
                      title={
                        selectedIncompleteUserIds.length ===
                          getFilteredIncompleteUsers().length &&
                        selectedIncompleteUserIds.length > 0
                          ? "Deselect all"
                          : "Select all in current filter"
                      }
                    >
                      {selectedIncompleteUserIds.length ===
                        getFilteredIncompleteUsers().length &&
                      selectedIncompleteUserIds.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {selectedIncompleteUserIds.length > 0
                          ? `Selected (${selectedIncompleteUserIds.length})`
                          : "Select all"}
                      </span>
                    </button>
                  )}
                </div>

                {incompleteOnboardingUsers.length > 0 &&
                  selectedIncompleteUserIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <button
                        type="button"
                        onClick={handleBulkResetOnboarding}
                        disabled={
                          bulkResettingOnboarding || bulkDeletingIncomplete
                        }
                        className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {bulkResettingOnboarding ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        Reset selected ({selectedIncompleteUserIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDeleteIncompleteUsers}
                        disabled={
                          bulkDeletingIncomplete || bulkResettingOnboarding
                        }
                        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {bulkDeletingIncomplete ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete selected ({selectedIncompleteUserIds.length})
                      </button>
                    </div>
                  )}

                {loadingIncompleteOnboarding ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-royal-blue" />
                  </div>
                ) : incompleteOnboardingUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <p className="text-brand-gray font-medium">
                      All users have completed onboarding
                    </p>
                    <p className="text-sm text-brand-gray/70 mt-1">
                      No incomplete onboarding records found.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getFilteredIncompleteUsers().map((user) => (
                      <div
                        key={user.userId}
                        className="bg-[#F5F5F5] rounded-lg p-4 border border-[rgba(208,196,226,0.4)] hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleSelectIncompleteUser(user.userId)
                                }
                                className="shrink-0 text-brand-royal-blue hover:opacity-80"
                                title="Toggle selection"
                              >
                                {selectedIncompleteUserIds.includes(
                                  user.userId,
                                ) ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                              <h3 className="text-base font-semibold text-[#2F3C96]">
                                {user.username}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize border ${
                                  user.role === "researcher"
                                    ? "bg-purple-100 text-purple-700 border-purple-200"
                                    : "bg-blue-100 text-blue-700 border-blue-200"
                                }`}
                              >
                                {user.role || "unknown"}
                              </span>
                              {user.isOAuthUser && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                  OAuth
                                  {user.oauthProvider
                                    ? ` (${user.oauthProvider.replace("-oauth2", "")})`
                                    : ""}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1 text-sm text-brand-gray">
                              {user.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 shrink-0" />
                                  <span>{user.email}</span>
                                  {user.emailVerified ? (
                                    <span className="text-xs text-green-600 font-medium">
                                      (verified)
                                    </span>
                                  ) : (
                                    <span className="text-xs text-red-500 font-medium">
                                      (not verified)
                                    </span>
                                  )}
                                </div>
                              )}
                              {user.createdAt && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 shrink-0" />
                                  <span>
                                    Registered:{" "}
                                    {new Date(
                                      user.createdAt,
                                    ).toLocaleDateString()}{" "}
                                    (
                                    {new Date(
                                      user.createdAt,
                                    ).toLocaleTimeString()}
                                    )
                                  </span>
                                </div>
                              )}
                              {user.hasProfile && user.profileSummary && (
                                <div className="flex items-center gap-2">
                                  <Info className="w-4 h-4 shrink-0" />
                                  <span className="text-xs">
                                    Profile: {user.profileSummary.role} &middot;
                                    {user.profileSummary.hasConditions
                                      ? " Has conditions"
                                      : ""}
                                    {user.profileSummary.hasSpecialties
                                      ? " Has specialties"
                                      : ""}
                                    {user.profileSummary.hasLocation
                                      ? " &middot; Has location"
                                      : ""}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-3">
                              {user.issues.map((issue, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                    issue.includes("Email not verified")
                                      ? "bg-red-100 text-red-700"
                                      : issue.includes("No profile")
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {issue}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col gap-2">
                            <button
                              onClick={() =>
                                handleResetOnboarding(user.userId, user.email)
                              }
                              disabled={resettingOnboardingId === user.userId}
                              className="px-3 py-2 text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                              title="Reset onboarding data so user can start fresh"
                            >
                              {resettingOnboardingId === user.userId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                              Reset data
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteIncompleteUser(
                                  user.userId,
                                  user.role,
                                )
                              }
                              disabled={deletingIncompleteId === user.userId}
                              className="px-3 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                              title="Permanently delete this account"
                            >
                              {deletingIncompleteId === user.userId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Delete account
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === "meeting-requests" && (
              <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 p-4 md:p-6">
                <p className="text-sm text-brand-gray mb-4">
                  Cancel individual meeting requests or clear all (including
                  related notifications). Useful for testing.
                </p>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <button
                    onClick={fetchMeetingRequests}
                    className="px-3 py-1.5 text-sm bg-brand-royal-blue/10 text-brand-royal-blue rounded-lg hover:bg-brand-royal-blue/20 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                  {meetingRequestsList.length > 0 && (
                    <button
                      onClick={clearAllMeetingRequests}
                      disabled={clearingAllMeetings}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {clearingAllMeetings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Clear all ({meetingRequestsList.length})
                    </button>
                  )}
                </div>
                {loadingMeetingRequests ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-royal-blue" />
                  </div>
                ) : meetingRequestsList.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-brand-gray-300 mx-auto mb-4" />
                    <p className="text-brand-gray font-medium">
                      No meeting requests
                    </p>
                    <p className="text-sm text-brand-gray/70 mt-1">
                      Patient–researcher meeting requests will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meetingRequestsList.map((req) => (
                      <div
                        key={req._id}
                        className="bg-[#F5F5F5] rounded-lg p-4 border border-[rgba(208,196,226,0.4)] hover:shadow-md transition-all flex justify-between items-start gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800">
                            {req.patientId?.username || "Patient"} →{" "}
                            {req.expertId?.username || "Expert"}
                          </p>
                          <p className="text-sm text-brand-gray mt-1 line-clamp-2">
                            {req.message}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                req.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : req.status === "accepted"
                                    ? "bg-green-100 text-green-800"
                                    : req.status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {req.status}
                            </span>
                            {req.preferredDate && (
                              <span className="text-xs text-brand-gray">
                                {new Date(
                                  req.preferredDate,
                                ).toLocaleDateString()}
                                {req.preferredTime
                                  ? ` ${req.preferredTime}`
                                  : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => cancelOneMeetingRequest(req._id)}
                          disabled={deletingMeetingId === req._id}
                          className="shrink-0 px-3 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {deletingMeetingId === req._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
