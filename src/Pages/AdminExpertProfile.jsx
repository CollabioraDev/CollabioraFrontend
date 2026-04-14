import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Building2,
  MapPin,
  ExternalLink,
  Mail,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Link as LinkIcon,
  BookOpen,
  FileText,
  Users,
  UserPlus,
  UserCheck,
  Smartphone,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";

export default function AdminExpertProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIosInstallPrompt, setShowIosInstallPrompt] = useState(false);

  const getAuth = () => {
    const token = localStorage.getItem("adminToken");
    return { token, headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const { token } = getAuth();
    if (!token) {
      toast.error("Admin access required");
      navigate("/admin/login");
      return;
    }
    if (!userId) {
      toast.error("Expert ID not provided");
      navigate("/admin/dashboard");
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${base}/api/admin/expert/${userId}?token=${token}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("adminToken");
          navigate("/admin/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch expert profile");
        const data = await res.json();
        setProfile(data.profile);
      } catch (err) {
        toast.error(err.message || "Failed to load expert profile");
        navigate("/admin/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, navigate, base]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissedPrompt = localStorage.getItem("iosInstallPromptDismissed") === "true";
    if (dismissedPrompt) return;

    const ua = window.navigator.userAgent || "";
    const isIosDevice = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

    if (isIosDevice && isSafari && !isStandalone) {
      setShowIosInstallPrompt(true);
    }
  }, []);

  const locationText =
    profile?.location &&
    [profile.location.city, profile.location.country].filter(Boolean).length > 0
      ? [profile.location.city, profile.location.country].filter(Boolean).join(", ")
      : null;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-linear-to-br from-brand-purple-50 via-brand-blue-50/30 to-brand-purple-50 flex flex-col items-center justify-center gap-4 relative">
          <AnimatedBackground />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-brand-royal-blue" />
            <p className="text-brand-gray text-sm font-medium">Loading expert profile…</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return null;
  }

  const sectionCardClass =
    "bg-white rounded-2xl shadow-lg border border-[rgba(208,196,226,0.4)] overflow-hidden transition-all duration-200 hover:shadow-xl hover:border-brand-purple-300/50";
  const sectionHeaderClass =
    "flex items-center gap-3 px-5 py-4 border-b border-[rgba(208,196,226,0.35)] bg-gradient-to-r from-brand-purple-50 to-transparent";
  const sectionTitleClass = "text-base font-bold text-brand-royal-blue";
  const metaCardClass = "rounded-xl p-4 bg-brand-blue-50/80 border border-brand-purple-200/40";
  const linkClass =
    "inline-flex items-center gap-2 text-brand-royal-blue hover:text-brand-blue-700 font-semibold text-sm transition-colors underline-offset-2 hover:underline";
  const statIconClass = "w-4 h-4 shrink-0 text-brand-royal-blue";
  const dismissIosPrompt = () => {
    setShowIosInstallPrompt(false);
    localStorage.setItem("iosInstallPromptDismissed", "true");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-linear-to-br from-brand-purple-50 via-brand-blue-50/30 to-brand-purple-50 relative overflow-hidden">
        <AnimatedBackground />
        {showIosInstallPrompt && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[1px]">
            <div className="w-full max-w-md rounded-2xl bg-white border border-brand-purple-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-brand-purple-100 bg-linear-to-r from-brand-purple-50 to-brand-blue-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-brand-royal-blue/10">
                      <Smartphone className="w-4 h-4 text-brand-royal-blue" />
                    </div>
                    <p className="text-sm font-bold text-brand-royal-blue">Add Collaboria to Home Screen</p>
                  </div>
                  <button
                    onClick={dismissIosPrompt}
                    className="text-brand-gray-500 hover:text-brand-royal-blue text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="px-5 py-4">
                <ol className="space-y-2 text-sm text-brand-gray-700 list-decimal list-inside">
                  <li>Tap the Share icon in Safari.</li>
                  <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> to install Collaboria.</li>
                </ol>
                <p className="mt-3 text-xs text-brand-gray-500">
                  Next time, open Collaboria from your Home Screen for an app-like experience.
                </p>
              </div>
              <div className="px-5 py-4 border-t border-brand-purple-100 bg-brand-purple-50/40">
                <Button onClick={dismissIosPrompt} className="w-full">
                  Got it
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="max-w-4xl mx-auto px-4 py-8 relative z-10 pt-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="flex items-center gap-2 text-brand-royal-blue hover:text-brand-blue-700 font-semibold text-sm py-2 px-3 rounded-lg hover:bg-white/80 transition-colors border border-transparent hover:border-brand-purple-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin Dashboard
            </button>
            <span className="text-xs font-medium text-brand-gray uppercase tracking-wider">Expert profile</span>
          </div>

          {/* Hero header — platform gradient (matches Admin Dashboard palette) */}
          <div
            className="rounded-2xl shadow-xl border border-brand-purple-300/50 relative overflow-hidden mb-8"
            style={{
              background: "linear-gradient(135deg, #2F3C96 0%, #253075 50%, #1C2454 100%)",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_80%_-20%,rgba(255,255,255,0.12),transparent)]" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full -ml-20 -mb-20" />
            <div className="relative z-10 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg ring-2 ring-white/30 shrink-0">
                    {profile.name?.charAt(0)?.toUpperCase() || "E"}
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{profile.name}</h1>
                    {profile.email && (
                      <div className="flex items-center gap-2 text-white/90 text-sm mt-1.5">
                        <Mail className="w-4 h-4 shrink-0" />
                        <span>{profile.email}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {profile.isVerified ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/25 text-white rounded-full text-xs font-semibold border border-emerald-400/40 backdrop-blur-sm"
                          title="Automatic when ORCID or proof document is on file"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {profile.verificationSource === "orcid"
                            ? "Verified · ORCID"
                            : profile.verificationSource === "document"
                              ? "Verified · Proof uploaded"
                              : profile.verificationSource === "orcid_and_document"
                                ? "Verified · ORCID + proof"
                                : "Verified"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/25 text-white rounded-full text-xs font-semibold border border-amber-400/40 backdrop-blur-sm">
                          <XCircle className="w-3.5 h-3.5" /> No credential yet
                        </span>
                      )}
                    </div>
                    <p className="text-white/75 text-xs mt-2 max-w-md">
                      Account verification is automatic (linked ORCID or uploaded
                      proof). This page is read-only for status.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ORCID | ResearchGate | Academia.edu */}
          <div className="grid gap-6">
            {/* ORCID */}
            <div className={sectionCardClass}>
              <div className={sectionHeaderClass}>
                <div className="p-2 rounded-lg bg-brand-royal-blue/10">
                  <Database className="w-5 h-5 text-brand-royal-blue" />
                </div>
                <h2 className={sectionTitleClass}>ORCID</h2>
              </div>
              <div className="p-5 sm:p-6">
                {profile.orcid ? (
                  <div className="space-y-4">
                    <a
                      href={`https://orcid.org/${profile.orcidId || profile.orcid}`}
                      target="_blank"
                      rel="noreferrer"
                      className={linkClass}
                    >
                      {profile.orcidId || profile.orcid}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {(profile.bio || profile.biography) && (
                      <div className={metaCardClass}>
                        <p className="text-xs font-bold text-brand-royal-blue uppercase tracking-wider mb-2">Biography</p>
                        <p className="text-sm text-brand-gray-700 whitespace-pre-wrap leading-relaxed">{profile.bio || profile.biography}</p>
                      </div>
                    )}
                    {profile.currentPosition && (
                      <div className={metaCardClass}>
                        <p className="text-xs font-bold text-brand-royal-blue uppercase tracking-wider mb-2">Current position</p>
                        <p className="text-sm text-brand-gray-700">{profile.currentPosition}</p>
                      </div>
                    )}
                    {(profile.affiliation || locationText) && (
                      <div className="flex flex-wrap gap-4 text-sm text-brand-gray-600">
                        {profile.affiliation && (
                          <div className="flex items-center gap-2">
                            <Building2 className={statIconClass} />
                            <span>{profile.affiliation}</span>
                          </div>
                        )}
                        {locationText && (
                          <div className="flex items-center gap-2">
                            <MapPin className={statIconClass} />
                            <span>{locationText}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {(profile.publications?.length > 0 || profile.works?.length > 0) && (
                      <div className="pt-2">
                        <p className="text-xs font-bold text-brand-royal-blue uppercase tracking-wider mb-2 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Publications ({(profile.publications || profile.works || []).length})
                        </p>
                        <ul className="space-y-2 max-h-44 overflow-y-auto rounded-lg border border-brand-purple-200/50 p-3 bg-white/70">
                          {(profile.publications || profile.works || []).slice(0, 10).map((pub, i) => (
                            <li key={i} className="text-sm text-brand-gray-600 line-clamp-2 border-b border-brand-gray-100 pb-2 last:border-0 last:pb-0">
                              {pub.title || "Untitled"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-brand-gray">No ORCID linked</p>
                )}
              </div>
            </div>

            {/* Uploaded verification proof (alternative to ORCID) */}
            <div className={sectionCardClass}>
              <div className={sectionHeaderClass}>
                <div className="p-2 rounded-lg bg-brand-royal-blue/10">
                  <FileText className="w-5 h-5 text-brand-royal-blue" />
                </div>
                <h2 className={sectionTitleClass}>Verification document</h2>
              </div>
              <div className="p-5 sm:p-6">
                {profile.verificationDocumentUrl ? (
                  <a
                    href={profile.verificationDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    View uploaded proof
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <p className="text-sm text-brand-gray">No document on file</p>
                )}
              </div>
            </div>

            {/* ResearchGate */}
            <div className={sectionCardClass}>
              <div className={sectionHeaderClass}>
                <div className="p-2 rounded-lg bg-brand-royal-blue/10">
                  <LinkIcon className="w-5 h-5 text-brand-royal-blue" />
                </div>
                <h2 className={sectionTitleClass}>ResearchGate</h2>
                {profile.researchGateVerification && (
                  <span
                    className={
                      profile.researchGateVerification === "verified"
                        ? "ml-auto text-xs px-2.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold border border-emerald-200/60"
                        : "ml-auto text-xs px-2.5 py-1.5 bg-amber-100 text-amber-700 rounded-full font-semibold border border-amber-200/60"
                    }
                  >
                    {profile.researchGateVerification === "verified" ? "Verified" : "Pending"}
                  </span>
                )}
              </div>
              <div className="p-5 sm:p-6">
                {profile.researchGate ? (
                  <>
                    <a href={profile.researchGate} target="_blank" rel="noreferrer" className={`${linkClass} mb-4 inline-block`}>
                      View profile
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {profile.researchGateMetadata && (
                      <div className={`${metaCardClass} space-y-3`}>
                        {profile.researchGateMetadata.name && (
                          <p className="text-sm font-semibold text-brand-gray-700">{profile.researchGateMetadata.name}</p>
                        )}
                        {profile.researchGateMetadata.institution && (
                          <div className="flex items-center gap-2 text-sm text-brand-gray-600">
                            <Building2 className={statIconClass} />
                            <span>{profile.researchGateMetadata.institution}</span>
                          </div>
                        )}
                        {(profile.researchGateMetadata.paperCount != null || profile.researchGateMetadata.followersCount != null) && (
                          <div className="flex flex-wrap gap-4 pt-2 border-t border-brand-purple-200/40 text-xs">
                            {profile.researchGateMetadata.paperCount != null && (
                              <span className="flex items-center gap-1.5 text-brand-gray-600" title="Publications">
                                <FileText className={statIconClass} />
                                <strong className="text-brand-gray-700">{profile.researchGateMetadata.paperCount}</strong> Publications
                              </span>
                            )}
                            {profile.researchGateMetadata.followersCount != null && (
                              <span className="flex items-center gap-1.5 text-brand-gray-600" title="Followers">
                                <Users className={statIconClass} />
                                <strong className="text-brand-gray-700">{profile.researchGateMetadata.followersCount.toLocaleString()}</strong> Followers
                              </span>
                            )}
                          </div>
                        )}
                        {profile.researchGateMetadata.description && (
                          <p className="text-xs text-brand-gray-600 line-clamp-3 pt-1 leading-relaxed">{profile.researchGateMetadata.description}</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-brand-gray">No ResearchGate link submitted</p>
                )}
              </div>
            </div>

            {/* Academia.edu */}
            <div className={sectionCardClass}>
              <div className={sectionHeaderClass}>
                <div className="p-2 rounded-lg bg-brand-royal-blue/10">
                  <LinkIcon className="w-5 h-5 text-brand-royal-blue" />
                </div>
                <h2 className={sectionTitleClass}>Academia.edu</h2>
                {profile.academiaEduVerification && (
                  <span
                    className={
                      profile.academiaEduVerification === "verified"
                        ? "ml-auto text-xs px-2.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold border border-emerald-200/60"
                        : "ml-auto text-xs px-2.5 py-1.5 bg-amber-100 text-amber-700 rounded-full font-semibold border border-amber-200/60"
                    }
                  >
                    {profile.academiaEduVerification === "verified" ? "Verified" : "Pending"}
                  </span>
                )}
              </div>
              <div className="p-5 sm:p-6">
                {profile.academiaEdu ? (
                  <>
                    <a href={profile.academiaEdu} target="_blank" rel="noreferrer" className={`${linkClass} mb-4 inline-block`}>
                      View profile
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {profile.academiaEduMetadata && (
                      <div className={`${metaCardClass} space-y-3`}>
                        {profile.academiaEduMetadata.name && (
                          <p className="text-sm font-semibold text-brand-gray-700">{profile.academiaEduMetadata.name}</p>
                        )}
                        {profile.academiaEduMetadata.institution && (
                          <div className="flex items-center gap-2 text-sm text-brand-gray-600">
                            <Building2 className={statIconClass} />
                            <span>{profile.academiaEduMetadata.institution}</span>
                          </div>
                        )}
                        {(profile.academiaEduMetadata.paperCount != null ||
                          profile.academiaEduMetadata.followersCount != null ||
                          profile.academiaEduMetadata.followingCount != null ||
                          profile.academiaEduMetadata.coAuthorsCount != null) && (
                          <div className="flex flex-wrap gap-4 pt-2 border-t border-brand-purple-200/40 text-xs">
                            {profile.academiaEduMetadata.paperCount != null && (
                              <span className="flex items-center gap-1.5 text-brand-gray-600" title="Papers">
                                <FileText className={statIconClass} />
                                <strong className="text-brand-gray-700">{profile.academiaEduMetadata.paperCount}</strong> Papers
                              </span>
                            )}
                            {profile.academiaEduMetadata.followersCount != null && (
                              <span className="flex items-center gap-1.5 text-brand-gray-600" title="Followers">
                                <Users className={statIconClass} />
                                <strong className="text-brand-gray-700">{profile.academiaEduMetadata.followersCount.toLocaleString()}</strong> Followers
                              </span>
                            )}
                            {profile.academiaEduMetadata.followingCount != null && (
                              <span className="flex items-center gap-1.5 text-brand-gray-600" title="Following">
                                <UserPlus className={statIconClass} />
                                <strong className="text-brand-gray-700">{profile.academiaEduMetadata.followingCount.toLocaleString()}</strong> Following
                              </span>
                            )}
                            {profile.academiaEduMetadata.coAuthorsCount != null && (
                              <span className="flex items-center gap-1.5 text-brand-gray-600" title="Co-authors">
                                <UserCheck className={statIconClass} />
                                <strong className="text-brand-gray-700">{profile.academiaEduMetadata.coAuthorsCount}</strong> Co-authors
                              </span>
                            )}
                          </div>
                        )}
                        {profile.academiaEduMetadata.description && (
                          <p className="text-xs text-brand-gray-600 line-clamp-4 pt-1 leading-relaxed">{profile.academiaEduMetadata.description}</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-brand-gray">No Academia.edu link submitted</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
