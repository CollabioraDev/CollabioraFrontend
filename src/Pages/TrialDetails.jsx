import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { recordTrialEngagement } from "../utils/productAnalytics.js";
import {
  Beaker,
  FileText,
  ListChecks,
  Mail,
  Phone,
  MapPin,
  User,
  Calendar,
  Users,
  CheckCircle,
  Activity,
  ExternalLink,
  ArrowLeft,
  Building2,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function TrialDetails() {
  const { t } = useTranslation("common");
  const { nctId } = useParams();
  const navigate = useNavigate();
  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState([]);

  useEffect(() => {
    async function fetchTrialDetails() {
      if (!nctId) {
        toast.error(t("trialDetails.toastNoId"));
        navigate("/dashboard/patient");
        return;
      }

      setLoading(true);
      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        
        // Fetch original trial details (not simplified)
        const response = await fetch(`${base}/api/search/trial/${nctId}`);

        if (!response.ok) {
          throw new Error(t("trialDetails.fetchError"));
        }

        const data = await response.json();
        if (data.trial) {
          recordTrialEngagement("trial_detail_view");
          setTrial(data.trial);
          // Dispatch context event for chatbot
          const item = {
            id: data.trial.id || data.trial._id || data.trial.nctId,
            nctId: data.trial.nctId || data.trial.id || data.trial._id,
            title: data.trial.title || data.trial.simplifiedTitle,
            url: data.trial.url,
            status: data.trial.status,
            phase: data.trial.phase,
            conditions: data.trial.conditions,
            summary: data.trial.summary || data.trial.simplifiedDetails?.summary,
            eligibilityCriteria: data.trial.eligibilityCriteria || data.trial.simplifiedDetails?.eligibilityCriteria,
            description: data.trial.description,
            eligibility: data.trial.eligibility,
          };
          window.dispatchEvent(
            new CustomEvent("openChatbotWithContext", {
              detail: { type: "trial", item },
            })
          );
        } else {
          toast.error(t("trialDetails.toastNotFound"));
          navigate("/dashboard/patient");
        }
      } catch (error) {
        console.error("Error fetching trial details:", error);
        toast.error(t("trialDetails.toastLoadFailed"));
        navigate("/dashboard/patient");
      } finally {
        setLoading(false);
      }
    }

    fetchTrialDetails();
  }, [nctId, navigate, t]);

  // Function to get Google Maps URL for a location
  const getGoogleMapsUrl = (location) => {
    if (!location) return null;
    const address =
      location.fullAddress ||
      location.address ||
      `${location.facility || ""} ${location.city || ""} ${
        location.state || ""
      } ${location.country || ""}`.trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
  };

  // Function to get Google Maps static image URL (no API key needed for basic usage)
  const getMapImageUrl = (location) => {
    if (!location) return null;
    const address =
      location.fullAddress ||
      location.address ||
      `${location.facility || ""} ${location.city || ""} ${
        location.state || ""
      } ${location.country || ""}`.trim();
    // Using Google Maps Static API - note: requires API key for production
    // For now, we'll just link to Google Maps
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: "#2F3C96" }}
          />
          <p className="text-lg font-medium" style={{ color: "#787878" }}>
            {t("trialDetails.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (!trial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <p className="text-lg font-medium mb-4" style={{ color: "#787878" }}>
            {t("trialDetails.notFound")}
          </p>
          <button
            onClick={() => navigate("/dashboard/patient")}
            className="px-4 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: "#2F3C96" }}
          >
            {t("trialDetails.goBack")}
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("recruiting")) {
      return "bg-green-100 text-green-800 border-green-300";
    } else if (statusLower.includes("completed")) {
      return "bg-blue-100 text-blue-800 border-blue-300";
    } else if (
      statusLower.includes("terminated") ||
      statusLower.includes("withdrawn")
    ) {
      return "bg-red-100 text-red-800 border-red-300";
    } else if (statusLower.includes("suspended")) {
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    }
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium mb-4 transition-colors"
            style={{ color: "#2F3C96" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#253075")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#2F3C96")}
          >
            <ArrowLeft className="w-4 h-4" />
            {t("trialDetails.back")}
          </button>

          <div
            className="bg-white rounded-xl shadow-sm border p-6"
            style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: "rgba(208, 196, 226, 0.2)" }}
              >
                <Beaker className="w-8 h-8" style={{ color: "#2F3C96" }} />
              </div>
              <div className="flex-1">
                <h1
                  className="text-2xl font-bold mb-3"
                  style={{ color: "#2F3C96" }}
                >
                  {trial.title}
                </h1>
                <div className="flex flex-wrap gap-2">
                  <span
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border"
                    style={{
                      backgroundColor: "rgba(209, 211, 229, 1)",
                      color: "#253075",
                      borderColor: "rgba(163, 167, 203, 1)",
                    }}
                  >
                    {trial.id || trial._id || t("trialDetails.notAvailable")}
                  </span>
                  {trial.status && (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        trial.status
                      )}`}
                    >
                      {trial.status.replace(/_/g, " ")}
                    </span>
                  )}
                  {trial.phase && (
                    <span
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border"
                      style={{
                        backgroundColor: "#F5F5F5",
                        color: "#787878",
                        borderColor: "rgba(232, 232, 232, 1)",
                      }}
                    >
                      {t("trialDetails.phaseLabel", { phase: trial.phase })}
                    </span>
                  )}
                  {trial.locations?.some(l => l.isNear) && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm animate-pulse">
                      <MapPin className="w-3.5 h-3.5" />
                      {trial.locations.find(l => l.isNear).city || trial.locations.find(l => l.isNear).facility} — {t("trials.nearestToYou", { defaultValue: "Nearest to you" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Study Purpose / Description */}
            {trial.description && (
              <div
                className="bg-white rounded-xl p-6 border shadow-sm"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <FileText className="w-5 h-5" />
                  {t("trialDetails.studyDescription")}
                </h2>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {trial.description}
                </p>
              </div>
            )}

            {/* Eligibility */}
            {trial.eligibility && (
              <div
                className="bg-white rounded-xl p-6 border shadow-sm"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <ListChecks className="w-5 h-5" />
                  {t("trialDetails.eligibilityCriteria")}
                </h2>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div
                    className="bg-gray-50 rounded-lg p-4 border"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4" style={{ color: "#2F3C96" }} />
                      <span
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#787878" }}
                      >
                        {t("trialDetails.gender")}
                      </span>
                    </div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#2F3C96" }}
                    >
                      {trial.eligibility?.gender || t("trialDetails.genderAll")}
                    </p>
                  </div>

                  <div
                    className="bg-gray-50 rounded-lg p-4 border"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar
                        className="w-4 h-4"
                        style={{ color: "#2F3C96" }}
                      />
                      <span
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#787878" }}
                      >
                        {t("trialDetails.ageRange")}
                      </span>
                    </div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#2F3C96" }}
                    >
                      {trial.eligibility?.minimumAge !== "Not specified" &&
                      trial.eligibility?.minimumAge
                        ? trial.eligibility.minimumAge
                        : t("trialDetails.notAvailable")}{" "}
                      -{" "}
                      {trial.eligibility?.maximumAge !== "Not specified" &&
                      trial.eligibility?.maximumAge
                        ? trial.eligibility.maximumAge
                        : t("trialDetails.notAvailable")}
                    </p>
                  </div>

                  <div
                    className="bg-gray-50 rounded-lg p-4 border"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle
                        className="w-4 h-4"
                        style={{ color: "#2F3C96" }}
                      />
                      <span
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#787878" }}
                      >
                        {t("trialDetails.volunteers")}
                      </span>
                    </div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#2F3C96" }}
                    >
                      {trial.eligibility?.healthyVolunteers ||
                        t("trialDetails.unknownVolunteers")}
                    </p>
                  </div>

                  <div
                    className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4" style={{ color: "#2F3C96" }} />
                      <span
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#787878" }}
                      >
                        {t("trialDetails.recruitmentTarget", {
                          defaultValue: "Recruitment Target",
                        })}
                      </span>
                    </div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#2F3C96" }}
                    >
                      {trial.targetEnrollment ? (
                        <>
                          {trial.targetEnrollment}{" "}
                          {t("trialDetails.patients", {
                            defaultValue: "Patients",
                          })}
                        </>
                      ) : (
                        trial.status?.replace(/_/g, " ") || "N/A"
                      )}
                    </p>
                  </div>
                </div>

                {/* Study Population Description */}
                {trial.eligibility?.population && (
                  <div className="mt-4">
                    <h3
                      className="font-semibold mb-2 text-sm flex items-center gap-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <Users className="w-4 h-4" />
                      {t("trialDetails.studyPopulation")}
                    </h3>
                    <div
                      className="bg-gray-50 rounded-lg p-4 border text-sm whitespace-pre-line"
                      style={{
                        color: "#787878",
                        borderColor: "rgba(232, 224, 239, 1)",
                      }}
                    >
                      {trial.eligibility.population}
                    </div>
                  </div>
                )}

                {trial.eligibility?.criteria &&
                  trial.eligibility.criteria !== "Not specified" && (
                    <div className="mt-4">
                      <h3
                        className="font-semibold mb-2 text-sm flex items-center gap-2"
                        style={{ color: "#2F3C96" }}
                      >
                        <ListChecks className="w-4 h-4" />
                        {t("trialDetails.detailedEligibilityCriteria")}
                      </h3>
                      <div
                        className="bg-gray-50 rounded-lg p-4 border text-sm whitespace-pre-line"
                        style={{
                          color: "#787878",
                          borderColor: "rgba(232, 224, 239, 1)",
                        }}
                      >
                        {trial.eligibility.criteria}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Conditions */}
            {trial.conditions && trial.conditions.length > 0 && (
              <div
                className="bg-white rounded-xl p-6 border shadow-sm"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <Activity className="w-5 h-5" />
                  {t("trialDetails.conditionsStudied")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {trial.conditions.map((condition, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-gray-50 text-sm font-medium rounded-lg border"
                      style={{ color: "#2F3C96", borderColor: "#D0C4E2" }}
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            {trial.contacts && trial.contacts.length > 0 && (
              <div
                className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #F5F5F5, #F5F5F5)",
                  borderColor: "rgba(232, 232, 232, 1)",
                }}
              >
                <h4
                  className="font-bold mb-4 flex items-center gap-2 text-base"
                  style={{ color: "#2F3C96" }}
                >
                  <Mail className="w-5 h-5" style={{ color: "#787878" }} />
                  {t("trialDetails.contactInformation")}
                </h4>
                <div className="space-y-3">
                  {trial.contacts.map((contact, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg p-4 border shadow-sm"
                      style={{ borderColor: "rgba(232, 232, 232, 1)" }}
                    >
                      {contact.name && (
                        <div
                          className="font-bold mb-3 text-base flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <User
                            className="w-4 h-4"
                            style={{ color: "#787878" }}
                          />
                          {contact.name}
                        </div>
                      )}
                      <div className="space-y-2">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-2 text-sm font-medium transition-colors"
                            style={{ color: "#2F3C96" }}
                            onMouseEnter={(e) =>
                              (e.target.style.color = "#253075")
                            }
                            onMouseLeave={(e) =>
                              (e.target.style.color = "#2F3C96")
                            }
                          >
                            <Mail className="w-4 h-4" />
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <div
                            className="flex items-center gap-2 text-sm"
                            style={{ color: "#787878" }}
                          >
                            <span style={{ color: "#2F3C96" }}>📞</span>
                            <a
                              href={`tel:${contact.phone}`}
                              className="transition-colors"
                              style={{ color: "#787878" }}
                              onMouseEnter={(e) =>
                                (e.target.style.color = "#2F3C96")
                              }
                              onMouseLeave={(e) =>
                                (e.target.style.color = "#787878")
                              }
                            >
                              {contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trial Locations */}
            {trial.locations && trial.locations.length > 0 && (
              <div
                className="bg-white rounded-xl p-6 border shadow-sm"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <MapPin className="w-5 h-5" />
                  {t("trialDetails.trialLocations", {
                    count: trial.locations.length,
                  })}
                </h2>
                <div className="space-y-4">
                  {trial.locations.slice(0, showAllLocations ? undefined : 5).map((location, i) => (
                    <div
                      key={i}
                      className="bg-gray-50 rounded-lg border border-slate-200 overflow-hidden transition-all duration-200"
                    >
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedLocations);
                          if (newExpanded.has(i)) newExpanded.delete(i);
                          else newExpanded.add(i);
                          setExpandedLocations(Array.from(newExpanded));
                        }}
                        className="w-full text-left p-4 hover:bg-slate-100/50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex-1">
                          {location.facility && (
                            <div
                              className="font-bold mb-1 flex items-center justify-between group-hover:text-indigo-700 transition-colors"
                              style={{ color: "#2F3C96" }}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                {location.facility}
                              </div>
                              {location.isNear && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-tight animate-pulse shadow-sm border border-emerald-200">
                                  Nearest to you
                                </span>
                              )}
                            </div>
                          )}
                          <div
                            className="text-xs leading-relaxed"
                            style={{ color: "#787878" }}
                          >
                            {location.fullAddress || location.address}
                          </div>
                        </div>
                        {(location.contactName || location.contactEmail || location.contactPhone) ? (
                          <div className="ml-4 text-slate-400 group-hover:text-indigo-600 transition-colors">
                            {expandedLocations.includes(i) ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        ) : (
                          <div className="ml-4 text-slate-300">
                            {expandedLocations.includes(i) ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        )}
                      </button>

                      {expandedLocations.includes(i) && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-white space-y-3">
                          {location.contactName || location.contactEmail || location.contactPhone ? (
                            <>
                              {location.contactName && (
                                <div className="text-xs font-semibold flex items-center gap-2" style={{ color: "#2F3C96" }}>
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  {location.contactName}
                                </div>
                              )}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                {location.contactEmail && (
                                  <a
                                    href={`mailto:${location.contactEmail}`}
                                    className="text-xs flex items-center gap-2 hover:underline transition-colors py-1 px-2 bg-slate-50 rounded-md border border-slate-200"
                                    style={{ color: "#2F3C96" }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    {location.contactEmail}
                                  </a>
                                )}
                                {location.contactPhone && (
                                  <a
                                    href={`tel:${location.contactPhone}`}
                                    className="text-xs flex items-center gap-2 hover:underline transition-colors py-1 px-2 bg-slate-50 rounded-md border border-slate-200"
                                    style={{ color: "#787878" }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    {location.contactPhone}
                                  </a>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs italic py-2" style={{ color: "#787878" }}>
                              {t("trials.noLocationContact", { defaultValue: "No specific contact info for this location. Please use the Central Contact info below." })}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {getGoogleMapsUrl(location) && (
                        <div className="px-4 pb-3 flex justify-end">
                          <a
                            href={getGoogleMapsUrl(location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
                            style={{ color: "#2F3C96" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPin className="w-3 h-3" />
                            {t("trialDetails.viewOnMap")}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                  {trial.locations.length > 5 && (
                    <button
                      onClick={() => setShowAllLocations(!showAllLocations)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg transition-colors border"
                      style={{
                        color: "#2F3C96",
                        backgroundColor: "rgba(208, 196, 226, 0.1)",
                        borderColor: "rgba(208, 196, 226, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(208, 196, 226, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(208, 196, 226, 0.1)";
                      }}
                    >
                      {showAllLocations ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          {t("trialDetails.showLessHidden", {
                            count: trial.locations.length - 5,
                          })}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          {t("trialDetails.showMoreLocations", {
                            count: trial.locations.length - 5,
                          })}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Additional Trial Information */}
            <div
              className="bg-white rounded-xl p-6 border shadow-sm"
              style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
            >
              <h2
                className="font-bold mb-4 flex items-center gap-2 text-lg"
                style={{ color: "#2F3C96" }}
              >
                <Info className="w-5 h-5" />
                {t("trialDetails.trialInformation")}
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "rgba(232, 224, 239, 1)" }}>
                  <span className="text-sm font-medium" style={{ color: "#787878" }}>
                    {t("trialDetails.trialIdLabel")}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "#2F3C96" }}>
                    {trial.id || trial._id || t("trialDetails.notAvailable")}
                  </span>
                </div>
                {trial.status && (
                  <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "rgba(232, 224, 239, 1)" }}>
                    <span className="text-sm font-medium" style={{ color: "#787878" }}>
                      {t("trialDetails.statusLabel")}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        trial.status
                      )}`}
                    >
                      {trial.status.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
                {trial.phase && (
                  <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "rgba(232, 224, 239, 1)" }}>
                    <span className="text-sm font-medium" style={{ color: "#787878" }}>
                      {t("trialDetails.phaseFieldLabel")}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "#2F3C96" }}>
                      {trial.phase}
                    </span>
                  </div>
                )}
                {trial.targetEnrollment && (
                  <div
                    className="flex justify-between items-center py-2 border-b"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#787878" }}
                    >
                      {t("trialDetails.targetEnrollmentLabel", {
                        defaultValue: "Target Enrollment",
                      })}
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#2F3C96" }}
                    >
                      {trial.targetEnrollment}{" "}
                      {t("trialDetails.patients", { defaultValue: "Patients" })}
                    </span>
                  </div>
                )}
                {trial.conditions && trial.conditions.length > 0 && (
                  <div className="py-2">
                    <span className="text-sm font-medium block mb-2" style={{ color: "#787878" }}>
                      {t("trialDetails.conditionsLabel")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {trial.conditions.map((condition, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-gray-50 text-xs font-medium rounded-lg border"
                          style={{ color: "#2F3C96", borderColor: "#D0C4E2" }}
                        >
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
