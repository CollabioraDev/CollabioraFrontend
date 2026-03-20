import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import LocationInput from "../components/LocationInput.jsx";
import UniversityInput from "../components/UniversityInput.jsx";
import CustomSelect from "../components/ui/CustomSelect.jsx";
import ResearchInterestInput from "../components/ResearchInterestInput.jsx";
import EmailVerificationStep from "../components/EmailVerificationStep.jsx";
import { SMART_SUGGESTION_KEYWORDS } from "../utils/smartSuggestions.js";
import { useAuth0Social } from "../hooks/useAuth0Social.js";
import icd11Dataset from "../data/icd11Dataset.json";
import {
  buildCanonicalMapFromIcd11,
  buildCanonicalMapFromLabels,
  buildNormalizedKey,
  resolveToCanonical,
} from "../utils/canonicalLabels.js";
import { generateUniqueUsernames } from "../utils/usernameSuggestions.js";
import { capitalizeText } from "../utils/textCorrection.js";
import { getCityAndCountryFromLocation } from "../utils/geolocation.js";
import { primarySpecialtyOptionGroups } from "../data/primarySpecialtyOptions.js";
import { getSubspecialtyOptionGroups } from "../data/subspecialtyDataset.js";
import {
  User,
  Heart,
  MapPin,
  Mail,
  CheckCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  GraduationCap,
  Briefcase,
  Microscope,
  FileText,
  Loader2,
} from "lucide-react";

export default function OnboardPatient() {
  const [searchParams] = useSearchParams();
  const isOAuthFlow = searchParams.get("oauth") === "true";
  const initialStep = parseInt(searchParams.get("step") || "1", 10);

  const [step, setStep] = useState(initialStep);
  const [maxStepReached, setMaxStepReached] = useState(initialStep); // Track the highest step reached
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [conditionInput, setConditionInput] = useState("");
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [identifiedConditions, setIdentifiedConditions] = useState([]); // Track auto-identified conditions
  const [lastExtractedText, setLastExtractedText] = useState(""); // Track what was extracted
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [isQuickSelectOpen, setIsQuickSelectOpen] = useState(true); // Expanded by default
  const [showAllConditions, setShowAllConditions] = useState(false);
  const [socialLoginLoading, setSocialLoginLoading] = useState(null); // Track which social login is loading
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationFilledFromGeo, setLocationFilledFromGeo] = useState(false);

  // New unified onboarding states
  const [isMedicalProfessional, setIsMedicalProfessional] = useState(null); // null = not answered, true/false = answered
  const [institutionAffiliation, setInstitutionAffiliation] = useState("");
  const [educationEntries, setEducationEntries] = useState([]); // Array of {institution, degree, field, year}
  const [isAcademicResearcher, setIsAcademicResearcher] = useState(null);
  const [orcid, setOrcid] = useState("");
  const [hasOrcid, setHasOrcid] = useState(true); // true = has ORCID, false = doesn't have ORCID
  const [verificationDocument, setVerificationDocument] = useState(null);
  const [verificationDocumentUrl, setVerificationDocumentUrl] = useState("");
  const [uploadingVerification, setUploadingVerification] = useState(false);
  const [orcidSuggestedInstitution, setOrcidSuggestedInstitution] =
    useState(null);

  // Researcher-specific states (only used if isMedicalProfessional === true)
  const [profession, setProfession] = useState("");
  const [academicRank, setAcademicRank] = useState("");
  const [primarySpecialty, setPrimarySpecialty] = useState("");
  const [subspecialtySelectValue, setSubspecialtySelectValue] = useState("");
  const [subspecialties, setSubspecialties] = useState([]);
  const [researchInterestInput, setResearchInterestInput] = useState("");
  const [researchInterests, setResearchInterests] = useState([]);
  const [certificationInput, setCertificationInput] = useState("");
  const [certifications, setCertifications] = useState([]);
  const [skillsInput, setSkillsInput] = useState("");
  const [skills, setSkills] = useState([]);
  const [interestedInMeetings, setInterestedInMeetings] = useState(false);
  const [interestedInForums, setInterestedInForums] = useState(false);
  const [meetingRate, setMeetingRate] = useState("");
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false);
  const [shouldAutoComplete, setShouldAutoComplete] = useState(false); // Auto-submit after OAuth restore

  const navigate = useNavigate();

  // ─── Save/Restore form state for OAuth flow ───
  // Before OAuth redirect, we save all form data to sessionStorage.
  // When the page loads back with oauth=true, we restore it.
  const FORM_DRAFT_KEY = "onboard_form_draft";

  const saveFormDraft = () => {
    const draft = {
      step,
      maxStepReached,
      firstName,
      lastName,
      handle,
      selectedConditions,
      gender,
      city,
      country,
      agreedToTerms,
      isMedicalProfessional,
      institutionAffiliation,
      educationEntries,
      isAcademicResearcher,
      orcid,
      hasOrcid,
      verificationDocumentUrl,
      profession,
      academicRank,
      primarySpecialty,
      subspecialtySelectValue,
      subspecialties,
      researchInterests,
      certifications,
      skills,
      interestedInMeetings,
      interestedInForums,
      meetingRate,
    };
    sessionStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(draft));
  };

  const clearFormDraft = () => {
    sessionStorage.removeItem(FORM_DRAFT_KEY);
  };

  // Restore form draft on mount if coming back from OAuth
  useEffect(() => {
    if (!isOAuthFlow) return;
    const raw = sessionStorage.getItem(FORM_DRAFT_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      console.log(
        "[OnboardPatient] Restoring form draft from sessionStorage",
        draft,
      );

      // Restore all fields
      if (draft.firstName) setFirstName(draft.firstName);
      if (draft.lastName) setLastName(draft.lastName);
      if (draft.handle) setHandle(draft.handle);
      if (draft.selectedConditions?.length)
        setSelectedConditions(draft.selectedConditions);
      if (draft.gender) setGender(draft.gender);
      if (draft.city) setCity(draft.city);
      if (draft.country) setCountry(draft.country);
      // Legacy support: restore from old single "location" field
      if (!draft.city && !draft.country && draft.location) {
        const parts = draft.location.split(",").map((s) => s.trim());
        if (parts.length > 1) {
          setCity(parts[0]);
          setCountry(parts.slice(1).join(", "));
        } else {
          setCity(parts[0] || "");
        }
      }
      if (draft.agreedToTerms) setAgreedToTerms(draft.agreedToTerms);
      if (
        draft.isMedicalProfessional !== null &&
        draft.isMedicalProfessional !== undefined
      ) {
        setIsMedicalProfessional(draft.isMedicalProfessional);
      }
      if (draft.institutionAffiliation)
        setInstitutionAffiliation(draft.institutionAffiliation);
      if (draft.educationEntries?.length)
        setEducationEntries(draft.educationEntries);
      if (
        draft.isAcademicResearcher !== null &&
        draft.isAcademicResearcher !== undefined
      ) {
        setIsAcademicResearcher(draft.isAcademicResearcher);
      }
      if (draft.orcid) setOrcid(draft.orcid);
      if (draft.hasOrcid !== undefined) setHasOrcid(draft.hasOrcid);
      if (draft.verificationDocumentUrl)
        setVerificationDocumentUrl(draft.verificationDocumentUrl);
      if (draft.profession) setProfession(draft.profession);
      if (draft.academicRank) setAcademicRank(draft.academicRank);
      if (draft.primarySpecialty) setPrimarySpecialty(draft.primarySpecialty);
      if (draft.subspecialtySelectValue)
        setSubspecialtySelectValue(draft.subspecialtySelectValue);
      if (draft.subspecialties?.length) setSubspecialties(draft.subspecialties);
      if (draft.researchInterests?.length)
        setResearchInterests(draft.researchInterests);
      if (draft.certifications?.length) setCertifications(draft.certifications);
      if (draft.skills?.length) setSkills(draft.skills);
      if (draft.interestedInMeetings)
        setInterestedInMeetings(draft.interestedInMeetings);
      if (draft.interestedInForums)
        setInterestedInForums(draft.interestedInForums);
      if (draft.meetingRate) setMeetingRate(draft.meetingRate);

      // Restore the step the user was on
      if (draft.step >= 5) {
        // User was on Account step (5) or beyond — they already filled everything.
        // OAuth created their account, so auto-submit their profile and go to step 6.
        setStep(4); // Temporarily show step 4 while auto-submitting
        setMaxStepReached(5);
        setShouldAutoComplete(true);
      } else {
        const restoredStep = draft.step || 2;
        const restoredMax = Math.max(
          draft.maxStepReached || restoredStep,
          restoredStep,
        );
        setStep(restoredStep);
        setMaxStepReached(restoredMax);
      }
    } catch (e) {
      console.error("[OnboardPatient] Failed to restore form draft:", e);
    }
  }, []); // Only run once on mount

  // Generate 3 unique username suggestions (numbers used sparingly - only 30% chance)
  const [usernameSuggestions, setUsernameSuggestions] = useState(() =>
    generateUniqueUsernames(3, false),
  );

  // Function to refresh username suggestions
  const refreshUsernameSuggestions = () => {
    setUsernameSuggestions(generateUniqueUsernames(3, false));
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showUsernameSuggestions &&
        !event.target.closest("[data-username-suggestions]")
      ) {
        setShowUsernameSuggestions(false);
      }
    };

    if (showUsernameSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUsernameSuggestions]);

  // Debug: Log step changes
  useEffect(() => {
    console.log("OnboardPatient - Current step:", step);
  }, [step]);

  // Auto-complete flag is handled later (after handleOAuthComplete is defined)

  // Track the maximum step reached - allows navigation to any previously reached step
  useEffect(() => {
    if (step > maxStepReached) {
      setMaxStepReached(step);
    }
  }, [step, maxStepReached]);

  // Auth0 social login
  const {
    loginWithGoogle,
    loginWithMicrosoft,
    loginWithFacebook,
    loginWithApple,
    isConfigured: isAuth0Configured,
  } = useAuth0Social();

  // Pre-fill name and profile data from OAuth if available
  useEffect(() => {
    if (!isOAuthFlow) return;
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return;
      const user = JSON.parse(storedUser);
      // Pre-fill name
      if (user.username) {
        const nameParts = user.username.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }

      // Pre-fill email from localStorage user
      if (user.email) {
        setEmail(user.email);
      }

      // For returning users (landing on step 6 with no form draft), fetch their full profile
      // so navigating back shows their previously saved data
      const userId = user._id || user.id;
      const hasDraft = !!sessionStorage.getItem(FORM_DRAFT_KEY);
      if (userId && !hasDraft && initialStep >= 6) {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const token = localStorage.getItem("token");
        fetch(`${base}/api/profile/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((res) => res.json())
          .then((data) => {
            const profile = data.profile;
            if (!profile) return;

            // Set role-based data
            if (profile.role === "researcher" && profile.researcher) {
              const r = profile.researcher;
              setIsMedicalProfessional(true);
              if (r.profession) setProfession(r.profession);
              if (r.academicRank) setAcademicRank(r.academicRank);
              if (r.specialties?.length) {
                setPrimarySpecialty(r.specialties[0] || "");
                setSubspecialties(r.specialties.slice(1) || []);
              }
              if (r.interests?.length) setResearchInterests(r.interests);
              if (r.certifications?.length) setCertifications(r.certifications);
              if (r.skills?.length) setSkills(r.skills);
              if (r.institutionAffiliation)
                setInstitutionAffiliation(r.institutionAffiliation);
              if (r.orcid) setOrcid(r.orcid);
              if (r.education?.length) setEducationEntries(r.education);
              if (r.interestedInMeetings !== undefined)
                setInterestedInMeetings(r.interestedInMeetings);
              if (r.interestedInForums !== undefined)
                setInterestedInForums(r.interestedInForums);
              if (r.meetingRate) setMeetingRate(String(r.meetingRate));
              if (r.gender) setGender(r.gender);
              if (r.location) {
                const loc = r.location;
                if (loc.city) setCity(loc.city);
                if (loc.country) setCountry(loc.country);
              }
            } else if (profile.patient) {
              const p = profile.patient;
              setIsMedicalProfessional(false);
              if (p.conditions?.length) setSelectedConditions(p.conditions);
              if (p.gender) setGender(p.gender);
              if (p.location) {
                const loc = p.location;
                if (loc.city) setCity(loc.city);
                if (loc.country) setCountry(loc.country);
              }
            }

            // Also set agreed to terms since they already completed onboarding
            setAgreedToTerms(true);
          })
          .catch((err) => {
            console.error(
              "[OnboardPatient] Failed to fetch profile for returning user:",
              err,
            );
          });
      }
    } catch (e) {
      console.error("Failed to parse stored user:", e);
    }
  }, [isOAuthFlow, initialStep]);

  // Check for ORCID OAuth callback data
  useEffect(() => {
    const orcidSuccess = searchParams.get("orcid_success");
    if (orcidSuccess === "true") {
      try {
        const orcidData = localStorage.getItem("orcid_data");
        const draftRaw = sessionStorage.getItem("onboard_unified_draft");
        const draft = draftRaw ? JSON.parse(draftRaw) : null;
        // Full form draft saved before ORCID redirect (step, isMedicalProfessional, etc.)
        const formDraftRaw = sessionStorage.getItem(FORM_DRAFT_KEY);
        const formDraft = formDraftRaw ? JSON.parse(formDraftRaw) : null;

        if (orcidData) {
          const { orcid: orcidId, profile } = JSON.parse(orcidData);
          setOrcid(orcidId);

          // Restore full form state so we stay on step 2 with researcher/institution preserved
          if (formDraft) {
            if (formDraft.step != null) setStep(formDraft.step);
            if (formDraft.maxStepReached != null)
              setMaxStepReached(formDraft.maxStepReached);
            if (
              formDraft.isMedicalProfessional !== null &&
              formDraft.isMedicalProfessional !== undefined
            ) {
              setIsMedicalProfessional(formDraft.isMedicalProfessional);
            }
            if (
              formDraft.isAcademicResearcher !== null &&
              formDraft.isAcademicResearcher !== undefined
            ) {
              setIsAcademicResearcher(formDraft.isAcademicResearcher);
            }
            if (formDraft.institutionAffiliation?.trim()) {
              setInstitutionAffiliation(formDraft.institutionAffiliation);
            }
            if (formDraft.educationEntries?.length) {
              setEducationEntries(formDraft.educationEntries);
            }
            if (formDraft.profession?.trim())
              setProfession(formDraft.profession);
            if (formDraft.academicRank?.trim())
              setAcademicRank(formDraft.academicRank);
          } else if (draft) {
            // Fallback to unified draft only
            if (draft.institutionAffiliation?.trim()) {
              setInstitutionAffiliation(draft.institutionAffiliation);
            }
            if (draft.educationEntries)
              setEducationEntries(draft.educationEntries);
            if (draft.profession?.trim()) setProfession(draft.profession);
            if (draft.academicRank?.trim()) setAcademicRank(draft.academicRank);
          }

          if (profile) {
            if (profile.affiliation?.trim()) {
              const orcidAff = profile.affiliation.trim();
              const currentAff =
                formDraft?.institutionAffiliation?.trim() ||
                draft?.institutionAffiliation?.trim() ||
                institutionAffiliation;
              if (orcidAff !== currentAff) {
                setOrcidSuggestedInstitution(orcidAff);
              }
            }
            if (
              profile.researchInterests &&
              profile.researchInterests.length > 0 &&
              researchInterests.length === 0
            ) {
              setResearchInterests(profile.researchInterests.slice(0, 5));
            }
            if (profile.email?.trim()) {
              setEmail(profile.email.trim());
            }
            // Auto-populate education from ORCID only if we don't already have entries
            if (
              profile.educations &&
              profile.educations.length > 0 &&
              !formDraft?.educationEntries?.length &&
              !draft?.educationEntries?.length
            ) {
              const orcidEducations = profile.educations
                .slice(0, 3)
                .map((edu) => ({
                  institution: edu.organization || "",
                  degree: edu.degree || "",
                  field: edu.department || "",
                  year: edu.endDate ? edu.endDate.split("-")[0] : "",
                }));
              setEducationEntries(orcidEducations);
            }
          }

          sessionStorage.removeItem("onboard_unified_draft");
          localStorage.removeItem("orcid_data");

          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete("orcid_success");
          // Persist step in URL so we land on the same step (e.g. step 2 for Professional Info)
          const restoredStep = formDraft?.step ?? 2;
          newSearchParams.set("step", String(restoredStep));
          navigate(`/onboarding?${newSearchParams.toString()}`, {
            replace: true,
          });
        }
      } catch (e) {
        console.error("Failed to parse ORCID data:", e);
      }
    }
  }, [
    searchParams,
    navigate,
    researchInterests.length,
    educationEntries.length,
    institutionAffiliation,
  ]);

  // CRITICAL: Check if user needs email verification
  // Allow users to navigate to verification step (step 6) if they're registered but not verified
  // Allow users to navigate back to edit their information (steps 1-5)
  // IMPORTANT: Don't interfere with OAuth flow - respect the URL step parameter
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");

    // If this is an OAuth flow (oauth=true in URL), always respect the URL step
    // Don't try to "resume" or redirect based on user state
    if (isOAuthFlow) {
      console.log(
        "[OnboardPatient] OAuth flow detected, respecting URL step:",
        step,
      );
      return;
    }

    // Only check if user is registered but not verified
    // Don't interfere if user is already on step 6 (verification step)
    if (
      token &&
      userData &&
      (userData._id || userData.id) &&
      !userData.emailVerified &&
      step !== 6 // Don't redirect if already on verification step
    ) {
      // Allow navigation to steps 1-6 (including verification step 6)
      // Only prevent navigation beyond step 6 if user is not verified
      if (step > 6) {
        console.log("User email not verified, forcing step 6 (verification)");
        setStep(6);
      }
      // If step is 1-6, allow user to navigate freely (including verification step)
    }
  }, [step, isOAuthFlow]);

  // Profession options (grouped by category) - for medical professionals
  const professionOptions = [
    {
      group: "Physician",
      options: [
        "MD — Doctor of Medicine",
        "DO — Doctor of Osteopathic Medicine",
        "MBBS — Bachelor of Medicine, Bachelor of Surgery",
        "MBChB (UK/Commonwealth)",
        "FRCP / MRCP (Royal College Fellowships)",
      ],
    },
    {
      group: "Nursing & Allied Health",
      options: [
        "RN — Registered Nurse",
        "NP — Nurse Practitioner",
        "PA — Physician Assistant",
        "PharmD — Doctor of Pharmacy",
        "DPT — Doctor of Physical Therapy",
        "OT — Occupational Therapist",
        "RT — Respiratory Therapist",
      ],
    },
    {
      group: "Non-Clinical Researchers",
      options: [
        "PhD — Doctor of Philosophy",
        "ScD / DSc — Doctor of Science",
        "DrPH — Doctor of Public Health",
        "MPH — Master of Public Health",
        "MS / MSc — Master of Science",
        "MPhil — Master of Philosophy",
      ],
    },
  ];

  // Academic rank options
  const academicRankOptions = [
    { value: "Professor", label: "Professor" },
    { value: "Associate Professor", label: "Associate Professor" },
    { value: "Assistant Professor", label: "Assistant Professor" },
    { value: "Research Scientist", label: "Research Scientist" },
    {
      value: "Principal Investigator (PI)",
      label: "Principal Investigator (PI)",
    },
    { value: "Postdoctoral Fellow", label: "Postdoctoral Fellow" },
    { value: "Research Fellow", label: "Research Fellow" },
    { value: "Graduate Researcher", label: "Graduate Researcher" },
  ];

  // Research skills options
  const researchSkills = [
    "Clinical Trials",
    "Industry Research",
    "Qualitative Research",
    "Quantitative Research",
    "Translational Research",
    "Public Health Research",
    "Regulatory / Compliance Research",
    "Academic Research",
  ];

  // Common medical conditions
  const commonConditions = [
    "Diabetes",
    "Hypertension",
    "Heart Disease",
    "Prostate Cancer",
    "Breast Cancer",
    "Lung Cancer",
    "Asthma",
    "Arthritis",
    "Depression",
    "Anxiety",
    "Chronic Pain",
    "Migraine",
    "Obesity",
    "High Cholesterol",
    "Thyroid Disorder",
    "Sleep Apnea",
    "COPD",
    "Epilepsy",
    "Parkinson's Disease",
    "Alzheimer's Disease",
    "Multiple Sclerosis",
    "Crohn's Disease",
    "IBD",
    "Osteoporosis",
    "Fibromyalgia",
    "Lupus",
    "Rheumatoid Arthritis",
  ];

  // Extract terms from ICD11 dataset for suggestions
  const icd11Suggestions = useMemo(() => {
    const termsSet = new Set();

    if (Array.isArray(icd11Dataset)) {
      icd11Dataset.forEach((item) => {
        // Add display_name
        if (item.display_name && typeof item.display_name === "string") {
          const displayName = item.display_name.trim();
          if (displayName) {
            termsSet.add(displayName);
          }
        }

        // Add patient_terms, but filter out ICD code patterns
        if (Array.isArray(item.patient_terms)) {
          item.patient_terms.forEach((term) => {
            if (typeof term === "string") {
              const trimmedTerm = term.trim();
              if (!trimmedTerm) return;

              // Filter out terms containing ICD code patterns
              const lowerTerm = trimmedTerm.toLowerCase();
              // Check for patterns like "icd11 code aa00", "icd code aa00", "icd aa00", "icd11 aa00"
              const hasIcdPattern =
                lowerTerm.includes("icd11 code") ||
                lowerTerm.includes("icd code") ||
                /icd11\s+[a-z]{2}[0-9]{2}/i.test(trimmedTerm) || // "icd11 aa00"
                /icd\s+[a-z]{2}[0-9]{2}/i.test(trimmedTerm); // "icd aa00", "icd ba20"

              if (!hasIcdPattern) {
                termsSet.add(trimmedTerm);
              }
            }
          });
        }
      });
    }

    return Array.from(termsSet);
  }, []);

  const conditionsCanonicalMap = useMemo(() => {
    const map = buildCanonicalMapFromIcd11(icd11Dataset);
    const curated = buildCanonicalMapFromLabels([
      ...commonConditions,
      ...SMART_SUGGESTION_KEYWORDS,
    ]);
    for (const [key, label] of curated) {
      if (!map.has(key)) map.set(key, label);
    }
    return map;
  }, []);

  async function extractConditions(text) {
    if (!text || text.length < 5) return;
    setIsExtracting(true);
    setLastExtractedText(text);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    try {
      const res = await fetch(`${base}/api/ai/extract-conditions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).then((r) => r.json());
      if (res.conditions?.length > 0) {
        const canonicalConditions = res.conditions.map((c) =>
          resolveToCanonical(c, conditionsCanonicalMap),
        );
        const seenKey = (arr, label) =>
          arr.some((x) => buildNormalizedKey(x) === buildNormalizedKey(label));
        setIdentifiedConditions((prev) => {
          const newConditions = canonicalConditions.filter(
            (c) => !seenKey(prev, c),
          );
          return [...prev, ...newConditions];
        });
        setSelectedConditions((prev) => {
          const newConditions = canonicalConditions.filter(
            (c) => !seenKey(prev, c),
          );
          return [...prev, ...newConditions];
        });
        setConditionInput("");
      }
    } catch (e) {
      console.error("Condition extraction failed", e);
    } finally {
      setIsExtracting(false);
    }
  }

  function toggleCondition(condition) {
    setSelectedConditions((prev) => {
      if (prev.includes(condition)) {
        return prev.filter((c) => c !== condition);
      } else {
        return [...prev, condition];
      }
    });
    // If removing, also remove from identified if it was there
    if (selectedConditions.includes(condition)) {
      setIdentifiedConditions((prev) => prev.filter((c) => c !== condition));
    }
  }

  function handleConditionSubmit(value) {
    const canonical = resolveToCanonical(value, conditionsCanonicalMap);
    if (!canonical) return;
    const key = buildNormalizedKey(canonical);
    const alreadyAdded = selectedConditions.some(
      (c) => buildNormalizedKey(c) === key,
    );
    if (!alreadyAdded) {
      setSelectedConditions((prev) => [...prev, canonical]);
      setConditionInput("");
      setIdentifiedConditions((prev) =>
        prev.filter((c) => buildNormalizedKey(c) !== key),
      );
    }
  }

  function getCombinedConditions() {
    return [...new Set(selectedConditions)];
  }

  function getLocationData() {
    return { city: city.trim(), country: country.trim() };
  }

  async function handleUseMyLocation() {
    setLocationError("");
    setLocationLoading(true);
    try {
      const { city: detectedCity, country: detectedCountry } =
        await getCityAndCountryFromLocation();
      setCity(detectedCity || city);
      setCountry(detectedCountry || country);
      setLocationFilledFromGeo(true);
    } catch (err) {
      setLocationError(err?.message || "Could not detect your location.");
    } finally {
      setLocationLoading(false);
    }
  }

  // Education entry management
  function addEducationEntry() {
    setEducationEntries([
      ...educationEntries,
      { institution: "", degree: "", field: "", year: "" },
    ]);
  }

  function updateEducationEntry(index, field, value) {
    const updated = [...educationEntries];
    updated[index] = { ...updated[index], [field]: value };
    setEducationEntries(updated);
  }

  function removeEducationEntry(index) {
    setEducationEntries(educationEntries.filter((_, i) => i !== index));
  }

  // Researcher-specific handlers
  function handleResearchInterestSubmit(value) {
    const corrected = capitalizeText(value);
    if (corrected && !researchInterests.includes(corrected)) {
      setResearchInterests((prev) => [...prev, corrected]);
      setResearchInterestInput("");
    }
  }

  function handleCertificationSubmit(value) {
    const corrected = value.trim().toUpperCase();
    if (corrected && !certifications.includes(corrected)) {
      setCertifications((prev) => [...prev, corrected]);
      setCertificationInput("");
    }
  }

  function removeCertification(cert) {
    setCertifications((prev) => prev.filter((c) => c !== cert));
  }

  function toggleResearchInterest(interest) {
    setResearchInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  }

  function handleSkillSubmit(value) {
    const corrected = capitalizeText(value);
    if (corrected && !skills.includes(corrected)) {
      setSkills((prev) => [...prev, corrected]);
      setSkillsInput("");
    }
  }

  function handleSubspecialtySelect(value) {
    const corrected = capitalizeText(value);
    if (corrected && !subspecialties.includes(corrected)) {
      setSubspecialties((prev) => [...prev, corrected]);
    }
    setSubspecialtySelectValue("");
  }

  function removeSubspecialty(sub) {
    setSubspecialties((prev) => prev.filter((s) => s !== sub));
  }

  function toggleSkill(skill) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  // Handle ORCID OAuth connection
  async function handleOrcidConnect() {
    setLoading(true);
    setError("");

    const base = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

    try {
      const response = await fetch(`${base}/api/orcid/auth`);
      const data = await response.json();

      if (data.authUrl) {
        localStorage.setItem("orcid_state", data.state);
        // Save full form draft so when we return from ORCID we preserve step,
        // isMedicalProfessional, isAcademicResearcher, institution, etc.
        saveFormDraft();
        sessionStorage.setItem(
          "onboard_unified_draft",
          JSON.stringify({
            institutionAffiliation,
            educationEntries,
            profession,
            academicRank,
          }),
        );
        window.location.href = data.authUrl;
      } else {
        throw new Error("Failed to get ORCID authorization URL");
      }
    } catch (err) {
      console.error("Error initiating ORCID OAuth:", err);
      setError("Failed to connect to ORCID. Please try again.");
      setLoading(false);
    }
  }

  // Handle verification document upload (for OAuth users who are already logged in)
  async function handleVerificationDocumentUpload(file) {
    if (!file) return;

    setUploadingVerification(true);
    setError("");

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const token = localStorage.getItem("token");

    // If no token, just store the file for later upload (after account creation)
    if (!token) {
      setVerificationDocument(file);
      setUploadingVerification(false);
      setError(""); // Clear any previous errors
      return;
    }

    try {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch(`${base}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload verification document");
      }

      if (data.files && data.files.length > 0) {
        setVerificationDocumentUrl(data.files[0].url);
        setVerificationDocument(file);
      } else {
        throw new Error("No file URL returned from upload");
      }
    } catch (err) {
      console.error("Error uploading verification document:", err);
      setError("Failed to upload verification document. Please try again.");
    } finally {
      setUploadingVerification(false);
    }
  }

  // Upload verification document after account creation (for non-OAuth users)
  async function uploadVerificationDocumentAfterAuth(file, token) {
    if (!file || !token) return null;

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch(`${base}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload verification document");
      }

      if (data.files && data.files.length > 0) {
        return data.files[0].url;
      } else {
        throw new Error("No file URL returned from upload");
      }
    } catch (err) {
      console.error("Error uploading verification document:", err);
      throw err;
    }
  }

  // Handle file input change
  function handleVerificationFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (images and PDFs)
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ];
      if (!validTypes.includes(file.type)) {
        setError("Please upload an image (JPEG, PNG, GIF, WebP) or PDF file");
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      handleVerificationDocumentUpload(file);
    }
  }

  // Handle social login button clicks
  async function handleSocialLogin(provider) {
    // Check if terms are accepted before proceeding
    if (!agreedToTerms) {
      setShowTermsDialog(true);
      return;
    }

    setSocialLoginLoading(provider);
    setError("");

    // Save all form data before redirecting to OAuth so it can be restored
    saveFormDraft();

    // Prepare onboarding data to pass through OAuth flow
    const onboardingData =
      isMedicalProfessional === true
        ? {
            role: "researcher",
            profession,
            academicRank,
            primarySpecialty,
            subspecialties,
            researchInterests,
            certifications,
            location: getLocationData(),
            institutionAffiliation,
            orcid,
            skills,
            educationEntries,
            profession,
            academicRank,
            isAcademicResearcher,
            interestedInMeetings,
            interestedInForums,
            meetingRate,
            gender: gender.trim() || undefined,
          }
        : {
            role: "patient",
            conditions: getCombinedConditions(),
            location: getLocationData(),
            gender: gender.trim() || undefined,
          };

    try {
      if (provider === "google") {
        await loginWithGoogle({ onboardingData, screenHint: "signup" });
      } else if (provider === "microsoft") {
        await loginWithMicrosoft({ onboardingData, screenHint: "signup" });
      } else if (provider === "facebook") {
        await loginWithFacebook({ onboardingData, screenHint: "signup" });
      } else if (provider === "apple") {
        await loginWithApple({ onboardingData, screenHint: "signup" });
      }
    } catch (e) {
      console.error(`${provider} login error:`, e);
      setError(`Failed to sign up with ${provider}. Please try again.`);
      setSocialLoginLoading(null);
    }
  }

  // Handle OAuth profile completion (when coming back from OAuth with step=2)
  async function handleOAuthComplete() {
    setLoading(true);
    setError("");

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      setLoading(false);
      return;
    }

    // Validate researcher-specific requirements
    if (isMedicalProfessional === true) {
      if (!primarySpecialty?.trim()) {
        setError("Please select a primary specialty");
        setLoading(false);
        return;
      }
      // Check if ORCID or verification document is provided for academic researchers
      if (
        isAcademicResearcher === true &&
        !orcid?.trim() &&
        !verificationDocumentUrl?.trim() &&
        !verificationDocument
      ) {
        setError(
          "Please connect with ORCID or upload a verification document to continue.",
        );
        setLoading(false);
        return;
      }
    }

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const token = localStorage.getItem("token");

    try {
      const locationData = getLocationData();
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = storedUser._id || storedUser.id;

      if (!userId) {
        throw new Error("User not found. Please sign in again.");
      }

      let profile;
      let medicalInterests;

      if (isMedicalProfessional === true) {
        // Researcher path
        medicalInterests = [
          ...(primarySpecialty ? [primarySpecialty] : []),
          ...subspecialties,
          ...researchInterests,
        ];

        // Upload verification document if it was selected but not yet uploaded (for OAuth users)
        let finalVerificationDocumentUrl = verificationDocumentUrl;
        if (verificationDocument && !verificationDocumentUrl && token) {
          try {
            finalVerificationDocumentUrl =
              await uploadVerificationDocumentAfterAuth(
                verificationDocument,
                token,
              );
          } catch (err) {
            console.error("Failed to upload verification document:", err);
            // Continue without verification document URL - user can upload later
          }
        }

        profile = {
          role: "researcher",
          researcher: {
            profession: profession || undefined,
            academicRank: academicRank || undefined,
            specialties: [primarySpecialty, ...subspecialties].filter(Boolean),
            interests: researchInterests,
            certifications:
              certifications.length > 0 ? certifications : undefined,
            location: locationData,
            institutionAffiliation,
            orcid: orcid || undefined,
            verificationDocumentUrl: finalVerificationDocumentUrl || undefined,
            skills,
            education:
              educationEntries.filter(
                (e) => e.institution || e.degree || e.field || e.year,
              ).length > 0
                ? educationEntries.filter(
                    (e) => e.institution || e.degree || e.field || e.year,
                  )
                : undefined,
            available: interestedInMeetings,
            interestedInMeetings,
            interestedInForums,
            meetingRate: meetingRate ? parseFloat(meetingRate) : undefined,
            gender: gender.trim() || undefined,
          },
        };

        // Update user role if needed
        await fetch(`${base}/api/auth/update-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            role: "researcher",
            medicalInterests,
          }),
        });
      } else {
        // Patient path
        const conditionsArray = getCombinedConditions();
        medicalInterests = conditionsArray;

        profile = {
          role: "patient",
          patient: {
            conditions: conditionsArray,
            location: locationData,
            gender: gender.trim() || undefined,
          },
        };

        // Update user's medicalInterests
        await fetch(`${base}/api/auth/update-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            medicalInterests: conditionsArray,
          }),
        });
      }

      await fetch(`${base}/api/profile/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      // Ensure emailVerified is false for OAuth users too
      const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
      updatedUser.emailVerified = false;
      updatedUser.role =
        isMedicalProfessional === true ? "researcher" : "patient";
      localStorage.setItem("user", JSON.stringify(updatedUser));
      // DO NOT dispatch login event until email is verified

      // Send verification email for OAuth users too
      try {
        const verifyRes = await fetch(
          `${base}/api/auth/send-verification-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          // Store OTP expiry if provided
          const userEmail = updatedUser.email || email;
          if (verifyData.otpExpiresAt && userEmail) {
            localStorage.setItem(
              `otp_expiry_${userEmail}`,
              verifyData.otpExpiresAt,
            );
          }
        }
      } catch (e) {
        console.error("Failed to send verification email:", e);
        // Continue to verification step anyway
      }

      // Store the email used for verification tracking
      const userEmail = updatedUser.email || email;
      if (userEmail) {
        localStorage.setItem(`verification_email_address`, userEmail);
      }

      // Clear the form draft since onboarding is complete
      clearFormDraft();

      // Move to verification step instead of dashboard
      setStep(6);
      setMaxStepReached(6); // Ensure step 6 is marked as reached
      setLoading(false);
      // Update URL to persist step 6
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("step", "6");
      navigate(`/onboarding?${newSearchParams.toString()}`, { replace: true });
    } catch (e) {
      console.error("OAuth profile completion error:", e);
      setError(e.message || "Failed to save profile. Please try again.");
      setLoading(false);
    }
  }

  // Auto-complete: when user was on step 5 (Account) and used OAuth,
  // their form data is restored and we auto-submit their profile.
  // Placed here so handleOAuthComplete is defined.
  useEffect(() => {
    if (!shouldAutoComplete || !isOAuthFlow) return;

    // Wait for all restored state to be applied by React
    const timer = setTimeout(() => {
      console.log(
        "[OnboardPatient] Auto-completing profile after OAuth restore",
      );
      setShouldAutoComplete(false);
      handleOAuthComplete();
    }, 300);

    return () => clearTimeout(timer);
  }, [shouldAutoComplete, isOAuthFlow]);

  async function handleComplete() {
    setError("");

    // If OAuth flow, just save profile and redirect
    if (isOAuthFlow) {
      await handleOAuthComplete();
      return;
    }

    if (password !== confirmPassword) return setError("Passwords do not match");
    if (password.length < 6)
      return setError("Password must be at least 6 characters");
    if (!email) return setError("Email is required");

    // Validate researcher-specific requirements
    if (isMedicalProfessional === true) {
      if (!primarySpecialty?.trim()) {
        return setError("Please select a primary specialty");
      }
      // Check if ORCID or verification document is provided for academic researchers
      if (
        isAcademicResearcher === true &&
        !orcid?.trim() &&
        !verificationDocumentUrl?.trim() &&
        !verificationDocument
      ) {
        return setError(
          "Please connect with ORCID or upload a verification document to continue.",
        );
      }
    }

    setLoading(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const username = `${firstName} ${lastName}`.trim();
      const locationData = getLocationData();
      let medicalInterests;
      let role;

      if (isMedicalProfessional === true) {
        // Researcher path
        role = "researcher";
        medicalInterests = [
          ...(primarySpecialty ? [primarySpecialty] : []),
          ...subspecialties,
          ...researchInterests,
        ];
      } else {
        // Patient path
        role = "patient";
        medicalInterests = getCombinedConditions();
      }

      const registerRes = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          role,
          medicalInterests,
          handle: handle.trim(),
        }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        setError(registerData.error || "Registration failed");
        setLoading(false);
        return;
      }

      const user = registerData.user;
      localStorage.setItem("token", registerData.token);
      // Explicitly set emailVerified to false - user needs to verify first
      if (user.emailVerified !== false) {
        user.emailVerified = false;
      }
      user.role = role;
      localStorage.setItem("user", JSON.stringify(user));
      // DO NOT dispatch login event until email is verified
      console.log(
        "Registration complete, user emailVerified:",
        user.emailVerified,
      );

      // Upload verification document if it was selected but not yet uploaded
      let finalVerificationDocumentUrl = verificationDocumentUrl;
      if (
        isMedicalProfessional === true &&
        verificationDocument &&
        !verificationDocumentUrl
      ) {
        try {
          finalVerificationDocumentUrl =
            await uploadVerificationDocumentAfterAuth(
              verificationDocument,
              registerData.token,
            );
        } catch (err) {
          console.error("Failed to upload verification document:", err);
          // Continue without verification document URL - user can upload later
        }
      }

      let profile;
      if (isMedicalProfessional === true) {
        // Researcher profile
        profile = {
          role: "researcher",
          researcher: {
            profession: profession || undefined,
            academicRank: academicRank || undefined,
            specialties: [primarySpecialty, ...subspecialties].filter(Boolean),
            interests: researchInterests,
            certifications:
              certifications.length > 0 ? certifications : undefined,
            location: locationData,
            institutionAffiliation,
            orcid: orcid || undefined,
            verificationDocumentUrl: finalVerificationDocumentUrl || undefined,
            skills,
            education:
              educationEntries.filter(
                (e) => e.institution || e.degree || e.field || e.year,
              ).length > 0
                ? educationEntries.filter(
                    (e) => e.institution || e.degree || e.field || e.year,
                  )
                : undefined,
            available: interestedInMeetings,
            interestedInMeetings,
            interestedInForums,
            meetingRate: meetingRate ? parseFloat(meetingRate) : undefined,
            gender: gender.trim() || undefined,
          },
        };
      } else {
        // Patient profile
        profile = {
          role: "patient",
          patient: {
            conditions: getCombinedConditions(),
            location: locationData,
            gender: gender.trim() || undefined,
          },
        };
      }

      await fetch(`${base}/api/profile/${user._id || user.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${registerData.token}`,
        },
        body: JSON.stringify(profile),
      });

      // Send verification email
      try {
        const verifyRes = await fetch(
          `${base}/api/auth/send-verification-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${registerData.token}`,
            },
          },
        );

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          // Store OTP expiry if provided
          if (verifyData.otpExpiresAt) {
            localStorage.setItem(
              `otp_expiry_${email}`,
              verifyData.otpExpiresAt,
            );
          }
          console.log("Verification email sent successfully");
        } else {
          const errorData = await verifyRes.json();
          console.error("Failed to send verification email:", errorData);
        }
      } catch (e) {
        console.error("Failed to send verification email:", e);
        // Continue to verification step anyway
      }

      // CRITICAL: Move to verification step instead of dashboard
      // Ensure emailVerified is false before moving to step 6
      const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
      updatedUser.emailVerified = false;
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Store the email used for verification tracking
      localStorage.setItem(`verification_email_address`, email);

      // Clear the form draft since onboarding is complete
      clearFormDraft();

      console.log("Setting step to 6 - Email Verification");
      setLoading(false);
      // Set step immediately and update URL to persist verification step
      setStep(6);
      setMaxStepReached(6); // Ensure step 6 is marked as reached
      // Update URL to persist step 6
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("step", "6");
      navigate(`/onboarding?${newSearchParams.toString()}`, { replace: true });
    } catch (e) {
      console.error("Registration error:", e);
      setError("Failed to create account. Please try again.");
      setLoading(false);
    }
  }

  // Determine steps based on user path
  const getSteps = () => {
    if (isMedicalProfessional === null) {
      // Before answering medical professional question
      return [
        { id: 1, label: "Your Name", icon: User },
        { id: 2, label: "Professional Info", icon: Briefcase },
        { id: 3, label: "Specialty", icon: Microscope },
        { id: 4, label: "Location", icon: MapPin },
        { id: 5, label: "Account", icon: Mail },
        { id: 6, label: "Verify Email", icon: CheckCircle },
      ];
    } else if (isMedicalProfessional === true) {
      // Medical professional path (researcher flow)
      return [
        { id: 1, label: "Your Name", icon: User },
        { id: 2, label: "Professional Info", icon: Briefcase },
        { id: 3, label: "Specialty", icon: Microscope },
        { id: 4, label: "Location", icon: MapPin },
        { id: 5, label: "Account", icon: Mail },
        { id: 6, label: "Verify Email", icon: CheckCircle },
      ];
    } else {
      // Patient path
      return [
        { id: 1, label: "Your Name", icon: User },
        { id: 2, label: "Professional Info", icon: Briefcase },
        { id: 3, label: "Conditions", icon: Heart },
        { id: 4, label: "Location", icon: MapPin },
        { id: 5, label: "Account", icon: Mail },
        { id: 6, label: "Verify Email", icon: CheckCircle },
      ];
    }
  };

  const steps = getSteps();

  // Handle step navigation - allow clicking on completed or current step
  const handleStepClick = (stepId) => {
    // Allow navigation to any step that has been reached (including going forward to previously completed steps)
    // Prevent navigation to future steps that haven't been reached yet
    // Special case: if user is registered but not verified, allow navigation to step 6 (verification)
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    const isRegisteredButNotVerified =
      token &&
      userData &&
      (userData._id || userData.id) &&
      !userData.emailVerified;

    if (
      stepId <= maxStepReached ||
      (stepId === 6 && isRegisteredButNotVerified)
    ) {
      setStep(stepId);
      // Update URL when navigating
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("step", stepId.toString());
      navigate(`/onboarding?${newSearchParams.toString()}`, { replace: true });
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  // Close gender dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isGenderDropdownOpen &&
        !event.target.closest("[data-gender-dropdown]")
      ) {
        setIsGenderDropdownOpen(false);
      }
    };

    if (isGenderDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isGenderDropdownOpen]);

  // Close skills dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isSkillsDropdownOpen &&
        !event.target.closest("[data-skills-dropdown]")
      ) {
        setIsSkillsDropdownOpen(false);
      }
    };

    if (isSkillsDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSkillsDropdownOpen]);

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />

        <div className="flex justify-center items-start min-h-screen px-4 py-6 relative z-10 pt-30 pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl"
          >
            {/* Progress Bar - Desktop: full stepper | Mobile: single step with arrows */}
            <div className="mb-4 pt-5 pb-5">
              {/* Mobile: Single step with prev/next arrows */}
              <div className="flex md:hidden items-center justify-between gap-2 px-1">
                <button
                  type="button"
                  onClick={() => step > 1 && handleStepClick(step - 1)}
                  disabled={step <= 1}
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                  style={{
                    backgroundColor: step > 1 ? "#2F3C96" : "#E8E8E8",
                    color: step > 1 ? "#FFFFFF" : "#787878",
                  }}
                  aria-label="Previous step"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const currentStepData = steps.find((s) => s.id === step);
                      const Icon = currentStepData?.icon || User;
                      return (
                        <>
                          <div
                            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: "#2F3C96",
                              color: "#FFFFFF",
                            }}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="text-left min-w-0">
                            <p
                              className="text-xs font-medium truncate"
                              style={{ color: "#787878" }}
                            >
                              Step {step} of {steps.length}
                            </p>
                            <p
                              className="text-sm font-semibold truncate"
                              style={{ color: "#2F3C96" }}
                            >
                              {currentStepData?.label || "Step"}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {/* Mini progress bar on mobile */}
                  <div className="w-full mt-2 h-1 rounded-full overflow-hidden bg-gray-200/80 max-w-[180px]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: "#2F3C96" }}
                      initial={false}
                      animate={{
                        width: `${(step / steps.length) * 100}%`,
                      }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                </div>
                {(() => {
                  const userData = JSON.parse(
                    localStorage.getItem("user") || "{}",
                  );
                  const token = localStorage.getItem("token");
                  const isRegisteredButNotVerified =
                    token &&
                    userData &&
                    (userData._id || userData.id) &&
                    !userData.emailVerified;
                  const canGoNext =
                    step < maxStepReached ||
                    (step === 5 && isRegisteredButNotVerified);
                  const nextStep = Math.min(step + 1, steps.length);
                  return (
                    <button
                      type="button"
                      onClick={() =>
                        canGoNext &&
                        nextStep <= steps.length &&
                        handleStepClick(nextStep)
                      }
                      disabled={!canGoNext}
                      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                      style={{
                        backgroundColor: canGoNext ? "#2F3C96" : "#E8E8E8",
                        color: canGoNext ? "#FFFFFF" : "#787878",
                      }}
                      aria-label="Next step"
                    >
                      <ChevronRight size={22} />
                    </button>
                  );
                })()}
              </div>

              {/* Desktop: Full step indicator */}
              <div className="hidden md:flex items-center justify-center relative">
                <div
                  className="absolute top-5 left-[12%] right-[12%] h-[2px]"
                  style={{ backgroundColor: "rgba(120, 120, 120, 0.15)" }}
                />
                <motion.div
                  className="absolute top-5 left-[12%] h-[2px]"
                  style={{ backgroundColor: "#2F3C96" }}
                  initial={{ width: "0%" }}
                  animate={{
                    width: `${Math.max(
                      0,
                      ((step - 1) / (steps.length - 1)) * 76,
                    )}%`,
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
                <div className="flex items-center justify-between w-full max-w-lg">
                  {steps.map((s) => {
                    const Icon = s.icon;
                    const isActive = step === s.id;
                    const isCompleted = s.id <= maxStepReached && s.id !== step;
                    const userData = JSON.parse(
                      localStorage.getItem("user") || "{}",
                    );
                    const token = localStorage.getItem("token");
                    const isRegisteredButNotVerified =
                      token &&
                      userData &&
                      (userData._id || userData.id) &&
                      !userData.emailVerified;
                    const isClickable =
                      s.id <= maxStepReached ||
                      (s.id === 6 && isRegisteredButNotVerified);
                    return (
                      <div
                        key={s.id}
                        className="flex flex-col items-center relative z-10"
                      >
                        <div className="relative">
                          <motion.div
                            className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 ${
                              isClickable
                                ? "cursor-pointer"
                                : "cursor-not-allowed"
                            }`}
                            onClick={() => isClickable && handleStepClick(s.id)}
                            style={{
                              backgroundColor:
                                isCompleted || isActive ? "#2F3C96" : "#F5F5F5",
                              color:
                                isCompleted || isActive ? "#FFFFFF" : "#787878",
                              border: isActive
                                ? "2px solid #D0C4E2"
                                : "2px solid transparent",
                              boxShadow: isActive
                                ? "0 2px 8px rgba(208, 196, 226, 0.4)"
                                : isCompleted
                                  ? "0 1px 4px rgba(47, 60, 150, 0.1)"
                                  : "none",
                            }}
                            animate={{
                              backgroundColor:
                                isCompleted || isActive ? "#2F3C96" : "#F5F5F5",
                            }}
                            transition={{ duration: 0.3 }}
                            whileHover={
                              isClickable
                                ? {
                                    scale: 1.1,
                                    boxShadow:
                                      "0 4px 12px rgba(47, 60, 150, 0.3)",
                                  }
                                : {}
                            }
                          >
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ duration: 0.3, ease: "backOut" }}
                              >
                                <CheckCircle size={16} />
                              </motion.div>
                            ) : (
                              <Icon size={16} />
                            )}
                          </motion.div>
                        </div>
                        <span
                          className={`text-xs font-medium mt-1.5 ${
                            isClickable
                              ? "cursor-pointer"
                              : "cursor-not-allowed"
                          }`}
                          onClick={() => isClickable && handleStepClick(s.id)}
                          style={{
                            color:
                              isActive || isCompleted ? "#2F3C96" : "#787878",
                          }}
                        >
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Card */}
            <motion.div
              className="bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border p-4 sm:p-6"
              style={{
                borderColor: "#D0C4E2",
                boxShadow: "0 10px 40px rgba(208, 196, 226, 0.2)",
                backgroundColor: "rgba(255, 255, 255, 0.98)",
              }}
            >
              {/* Unified Section Heading */}
              <div className="text-center mb-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2
                      className="text-xl font-bold mb-0.5"
                      style={{ color: "#2F3C96" }}
                    >
                      {step === 1 && "Let's get started"}
                      {step === 2 && "Professional Info"}
                      {step === 3 &&
                        isMedicalProfessional === true &&
                        "Research Information"}
                      {step === 3 &&
                        isMedicalProfessional === false &&
                        "Medical Conditions"}
                      {step === 4 && "Your Location"}
                      {step === 5 && "Create Your Account"}
                      {step === 6 && "Verify Your Email"}
                    </h2>
                    <p className="text-xs" style={{ color: "#787878" }}>
                      {step === 1 &&
                        "Tell us your name to personalize your experience"}
                      {step === 2 &&
                        "This helps us customize your experience on the platform"}
                      {step === 3 &&
                        isMedicalProfessional === true &&
                        "Share your specialty and research interests"}
                      {step === 3 &&
                        isMedicalProfessional === false &&
                        "Select or describe your conditions. We'll help identify them automatically."}
                      {step === 4 &&
                        "Help us find relevant clinical trials and experts near you"}
                      {step === 5 &&
                        "Almost there! Set up your account to get started"}
                      {step === 6 &&
                        "Just before you get started, verify yourself"}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                {/* Step 1: Name */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-2.5"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: "#2F3C96" }}
                        >
                          First Name
                        </label>
                        <Input
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            firstName &&
                            lastName &&
                            handle.trim() &&
                            setStep(2)
                          }
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: "#2F3C96" }}
                        >
                          Last Name
                        </label>
                        <Input
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            firstName &&
                            lastName &&
                            setStep(2)
                          }
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Username
                      </label>
                      <div className="relative" data-username-suggestions>
                        <Input
                          placeholder="@username or choose from suggestions"
                          value={handle}
                          onChange={(e) => {
                            // Remove @ if user types it, we'll add it for display
                            let value = e.target.value.replace(/^@+/, "");
                            setHandle(value);
                            setShowUsernameSuggestions(value.length === 0);
                          }}
                          onFocus={() => setShowUsernameSuggestions(true)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            firstName &&
                            lastName &&
                            handle.trim() &&
                            setStep(2)
                          }
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                        {showUsernameSuggestions &&
                          usernameSuggestions.length > 0 && (
                            <div
                              className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg"
                              style={{ borderColor: "#E8E8E8" }}
                            >
                              <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <p
                                    className="text-xs font-semibold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    Suggested usernames:
                                  </p>
                                  <button
                                    type="button"
                                    onClick={refreshUsernameSuggestions}
                                    className="flex items-center gap-1 text-xs transition-colors"
                                    style={{ color: "#2F3C96" }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.color = "#253075";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.color = "#2F3C96";
                                    }}
                                    title="Refresh suggestions"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Refresh</span>
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {usernameSuggestions.map(
                                    (suggestion, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          setHandle(suggestion);
                                          setShowUsernameSuggestions(false);
                                        }}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                                        style={{
                                          backgroundColor: "#2F3C961A",
                                          color: "#2F3C96",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "#2F3C9633";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "#2F3C961A";
                                        }}
                                      >
                                        @{suggestion}
                                      </button>
                                    ),
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowUsernameSuggestions(false)
                                  }
                                  className="text-xs hover:underline"
                                  style={{ color: "#787878" }}
                                >
                                  Hide suggestions
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#787878" }}>
                        Username will be public.
                      </p>
                    </div>

                    <Button
                      onClick={() =>
                        firstName && lastName && handle.trim() && setStep(2)
                      }
                      disabled={!firstName || !lastName || !handle.trim()}
                      className="w-full py-1.5 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      style={{
                        backgroundColor: "#2F3C96",
                        color: "#FFFFFF",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = "#474F97";
                          e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(208, 196, 226, 0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#2F3C96";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      Continue →
                    </Button>
                  </motion.div>
                )}

                {/* Step 2: Medical Professional Question & Professional Info */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* First option: Are you a medical or allied healthcare professional? (Yes/No) */}
                    {(isMedicalProfessional === null ||
                      isMedicalProfessional === false) && (
                      <div className="space-y-3">
                        <label
                          className="block text-lg font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          Are you a medical or allied healthcare professional?
                        </label>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => {
                              setIsMedicalProfessional(false);
                              setStep(3);
                            }}
                            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all border-2"
                            style={{
                              backgroundColor: "#FFFFFF",
                              color: "#787878",
                              borderColor: "#E8E8E8",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#D0C4E2";
                              e.currentTarget.style.backgroundColor =
                                "rgba(208, 196, 226, 0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "#E8E8E8";
                              e.currentTarget.style.backgroundColor = "#FFFFFF";
                            }}
                          >
                            No
                          </Button>
                          <Button
                            onClick={() => setIsMedicalProfessional(true)}
                            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all border-2"
                            style={{
                              backgroundColor: "#FFFFFF",
                              color: "#787878",
                              borderColor: "#E8E8E8",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#D0C4E2";
                              e.currentTarget.style.backgroundColor =
                                "rgba(208, 196, 226, 0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "#E8E8E8";
                              e.currentTarget.style.backgroundColor = "#FFFFFF";
                            }}
                          >
                            Yes
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* If Yes - Show professional info fields */}
                    {isMedicalProfessional === true && (
                      <>
                        {/* Profession & Academic Rank (dropdowns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label
                              className="block text-sm font-semibold"
                              style={{ color: "#2F3C96" }}
                            >
                              Profession <span className="text-red-500">*</span>
                            </label>
                            <CustomSelect
                              value={profession}
                              onChange={setProfession}
                              optionGroups={professionOptions}
                              placeholder="Select your profession / credential"
                              variant="onboarding"
                              maxDropdownHeight={280}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label
                              className="block text-sm font-semibold"
                              style={{ color: "#2F3C96" }}
                            >
                              Academic Rank{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <CustomSelect
                              value={academicRank}
                              onChange={setAcademicRank}
                              options={academicRankOptions}
                              placeholder="Select your academic rank"
                              variant="onboarding"
                              maxDropdownHeight={240}
                              className="w-full"
                            />
                          </div>
                        </div>

                        {/* Institution Affiliation */}
                        <div
                          className="pt-2 border-t"
                          style={{ borderColor: "#E8E8E8" }}
                        >
                          <label
                            className="block text-sm font-semibold mb-2"
                            style={{ color: "#2F3C96" }}
                          >
                            Institution Affiliation{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <UniversityInput
                            value={institutionAffiliation}
                            onChange={setInstitutionAffiliation}
                            location={
                              city || country ? getLocationData() : null
                            }
                            strict
                            allowManualFallback
                            placeholder="Search and select your institution"
                            maxSuggestions={10}
                            inputClassName="w-full py-2 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          />
                          {orcidSuggestedInstitution && (
                            <div
                              className="mt-2 p-2.5 rounded-lg border text-xs"
                              style={{
                                borderColor: "#A6CE39",
                                backgroundColor: "rgba(166, 206, 57, 0.08)",
                              }}
                            >
                              <p className="font-medium mb-1.5">
                                ORCID suggested: {orcidSuggestedInstitution}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOrcidSuggestedInstitution(null)
                                  }
                                  className="px-2.5 py-1 rounded border text-xs"
                                >
                                  Keep current
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInstitutionAffiliation(
                                      orcidSuggestedInstitution,
                                    );
                                    setOrcidSuggestedInstitution(null);
                                  }}
                                  className="px-2.5 py-1 rounded text-xs"
                                  style={{
                                    backgroundColor: "#A6CE39",
                                    color: "#FFFFFF",
                                  }}
                                >
                                  Use suggestion
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Education (Multiple Entries) */}
                        <div
                          className="space-y-3 pt-2 border-t"
                          style={{ borderColor: "#E8E8E8" }}
                        >
                          <div className="flex items-center justify-between">
                            <label
                              className="block text-sm font-semibold"
                              style={{ color: "#2F3C96" }}
                            >
                              Education
                              <span
                                className="ml-1 text-xs font-normal"
                                style={{ color: "#787878" }}
                              >
                                (Add all your education)
                              </span>
                            </label>
                            <Button
                              type="button"
                              onClick={addEducationEntry}
                              className="px-3 py-1.5 text-xs rounded-lg font-semibold transition-all"
                              style={{
                                backgroundColor: "#2F3C96",
                                color: "#FFFFFF",
                              }}
                            >
                              + Add Education
                            </Button>
                          </div>
                          {educationEntries.length === 0 && (
                            <p
                              className="text-xs text-center py-2"
                              style={{ color: "#787878" }}
                            >
                              No education entries yet. Click "Add Education" to
                              add one.
                            </p>
                          )}
                          {educationEntries.map((edu, idx) => (
                            <div
                              key={idx}
                              className="border rounded-lg p-2 space-y-2"
                              style={{ borderColor: "#E8E8E8" }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: "#2F3C96" }}
                                >
                                  Education #{idx + 1}
                                </span>
                                {educationEntries.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeEducationEntry(idx)}
                                    className="text-xs text-red-600 hover:underline"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  placeholder="Institution"
                                  value={edu.institution}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "institution",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full py-1.5 px-2 text-xs border rounded-lg"
                                />
                                <Input
                                  placeholder="Degree (e.g., MD, PhD)"
                                  value={edu.degree}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "degree",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full py-1.5 px-2 text-xs border rounded-lg"
                                />
                                <Input
                                  placeholder="Field of Study"
                                  value={edu.field}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "field",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full py-1.5 px-2 text-xs border rounded-lg"
                                />
                                <Input
                                  placeholder="Year"
                                  value={edu.year}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "year",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full py-1.5 px-2 text-xs border rounded-lg"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Are you an academic researcher? - Slider toggle */}
                        <div
                          className="space-y-2 pt-2 border-t"
                          style={{ borderColor: "#E8E8E8" }}
                        >
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
                            Are you an academic researcher?
                          </p>
                          <div
                            className="relative flex rounded-full p-1 border transition-colors"
                            style={{
                              backgroundColor: "#E8E8E8",
                              borderColor: "#D0C4E2",
                            }}
                          >
                            {/* Sliding pill background */}
                            <motion.div
                              className="absolute top-1 bottom-1 rounded-full"
                              style={{
                                backgroundColor: "#2F3C96",
                                width: "calc(50% - 4px)",
                              }}
                              animate={{
                                left:
                                  isAcademicResearcher === true
                                    ? "calc(50% + 2px)"
                                    : 4,
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 30,
                              }}
                            />
                            {/* No option */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsAcademicResearcher(false);
                              }}
                              className="relative z-10 flex-1 py-2.5 rounded-full font-semibold text-sm transition-colors"
                              style={{
                                color:
                                  isAcademicResearcher === false
                                    ? "#FFFFFF"
                                    : "#787878",
                              }}
                            >
                              No
                            </button>
                            {/* Yes option */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsAcademicResearcher(true);
                              }}
                              className="relative z-10 flex-1 py-2.5 rounded-full font-semibold text-sm transition-colors"
                              style={{
                                color:
                                  isAcademicResearcher === true
                                    ? "#FFFFFF"
                                    : "#787878",
                              }}
                            >
                              Yes
                            </button>
                          </div>
                        </div>

                        {/* ORCID Connection (if academic researcher) */}
                        {isAcademicResearcher === true && (
                          <div
                            className="pt-2 border-t"
                            style={{ borderColor: "#E8E8E8" }}
                          >
                            <label
                              className="block text-sm font-semibold mb-2"
                              style={{ color: "#2F3C96" }}
                            >
                              ORCID ID
                              <span
                                className="text-xs font-normal ml-1"
                                style={{ color: "#DC2626" }}
                              >
                                (Required for academic researchers)
                              </span>
                            </label>

                            {!hasOrcid ? (
                              <div className="space-y-3">
                                <div
                                  className="p-3 rounded-lg border"
                                  style={{
                                    borderColor: "#E8E8E8",
                                    backgroundColor: "#F9FAFB",
                                  }}
                                >
                                  <p
                                    className="text-xs mb-3"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    Upload a verification document (ID,
                                    certificate, or other proof of research
                                    credentials). You will be verified by
                                    moderators before your account is fully
                                    activated.
                                  </p>
                                  {verificationDocumentUrl ||
                                  verificationDocument ? (
                                    <div className="space-y-2">
                                      <div
                                        className="flex items-center gap-2 p-2 rounded border"
                                        style={{
                                          borderColor: "#A6CE39",
                                          backgroundColor: "#F8FFF0",
                                        }}
                                      >
                                        <CheckCircle
                                          size={16}
                                          style={{ color: "#A6CE39" }}
                                        />
                                        <span
                                          className="text-xs font-medium flex-1 truncate"
                                          style={{ color: "#2F3C96" }}
                                        >
                                          {verificationDocument?.name ||
                                            "Verification document uploaded"}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setVerificationDocument(null);
                                            setVerificationDocumentUrl("");
                                          }}
                                          className="text-gray-500 hover:text-gray-700 transition-colors shrink-0"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                      <p
                                        className="text-[10px] text-center"
                                        style={{ color: "#787878" }}
                                      >
                                        {verificationDocumentUrl
                                          ? "Your verification document will be reviewed by moderators"
                                          : "File selected. It will be uploaded when you complete registration."}
                                      </p>
                                    </div>
                                  ) : (
                                    <label className="block">
                                      <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={handleVerificationFileChange}
                                        disabled={
                                          uploadingVerification ||
                                          verificationDocumentUrl ||
                                          verificationDocument
                                        }
                                        className="hidden"
                                      />
                                      <div
                                        className={`w-full py-2.5 px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 border-2 border-dashed ${
                                          uploadingVerification ||
                                          verificationDocumentUrl ||
                                          verificationDocument
                                            ? "cursor-not-allowed opacity-60"
                                            : "cursor-pointer hover:shadow-md"
                                        }`}
                                        style={{
                                          borderColor: uploadingVerification
                                            ? "#E8E8E8"
                                            : "#2F3C96",
                                          backgroundColor: uploadingVerification
                                            ? "#F3F4F6"
                                            : "#FFFFFF",
                                          color: uploadingVerification
                                            ? "#787878"
                                            : "#2F3C96",
                                        }}
                                      >
                                        {uploadingVerification ? (
                                          <>
                                            <RefreshCw
                                              size={16}
                                              className="animate-spin"
                                            />
                                            Uploading...
                                          </>
                                        ) : (
                                          <>
                                            <FileText size={16} />
                                            Attach Verification Document
                                          </>
                                        )}
                                      </div>
                                    </label>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHasOrcid(true);
                                    setVerificationDocument(null);
                                    setVerificationDocumentUrl("");
                                  }}
                                  className="text-xs underline"
                                  style={{ color: "#2F3C96" }}
                                >
                                  I have an ORCID ID instead
                                </button>
                              </div>
                            ) : !orcid ? (
                              <div className="space-y-2">
                                <button
                                  type="button"
                                  onClick={handleOrcidConnect}
                                  disabled={loading}
                                  className="w-full py-2.5 px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-md"
                                  style={{
                                    backgroundColor: "#A6CE39",
                                    color: "white",
                                  }}
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 256 256"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="currentColor"
                                  >
                                    <path
                                      d="M256 128c0 70.7-57.3 128-128 128S0 198.7 0 128 57.3 0 128 0s128 57.3 128 128z"
                                      fill="currentColor"
                                    />
                                    <path
                                      d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7C191.7 111.2 178 93 148 93h-23.7v79.4zM71.3 54.8c0 5.2-4.2 9.4-9.4 9.4-5.2 0-9.4-4.2-9.4-9.4 0-5.2 4.2-9.4 9.4-9.4 5.2 0 9.4 4.2 9.4 9.4z"
                                      fill="white"
                                    />
                                  </svg>
                                  {loading
                                    ? "Connecting..."
                                    : "Connect with ORCID"}
                                </button>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="flex-1 h-px"
                                    style={{ backgroundColor: "#E8E8E8" }}
                                  ></div>
                                  <span
                                    className="text-[10px]"
                                    style={{ color: "#787878" }}
                                  >
                                    OR
                                  </span>
                                  <div
                                    className="flex-1 h-px"
                                    style={{ backgroundColor: "#E8E8E8" }}
                                  ></div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setHasOrcid(false)}
                                  className="w-full py-2 px-4 text-xs font-medium rounded-lg transition-all border hover:shadow-sm"
                                  style={{
                                    borderColor: "#E8E8E8",
                                    color: "#2F3C96",
                                    backgroundColor: "#FFFFFF",
                                  }}
                                >
                                  I don't have an ORCID ID
                                </button>
                                <p
                                  className="text-[10px] text-center"
                                  style={{ color: "#787878" }}
                                >
                                  Authenticate with ORCID to automatically link
                                  your research profile
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div
                                  className="w-full py-2.5 px-4 text-sm rounded-lg border-2 flex items-center justify-between"
                                  style={{
                                    borderColor: "#A6CE39",
                                    backgroundColor: "#F8FFF0",
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <CheckCircle
                                      size={16}
                                      style={{ color: "#A6CE39" }}
                                    />
                                    <span
                                      className="font-medium"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      {orcid}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setOrcid("")}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                <p
                                  className="text-[10px] text-center"
                                  style={{ color: "#787878" }}
                                >
                                  Your ORCID is connected and will be saved with
                                  your profile
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <div
                          className="flex gap-3 pt-4 border-t"
                          style={{ borderColor: "#E8E8E8" }}
                        >
                          <Button
                            onClick={() => setStep(1)}
                            className="flex-1 py-2 rounded-lg font-semibold text-sm border transition-all"
                            style={{
                              backgroundColor: "#FFFFFF",
                              color: "#787878",
                              borderColor: "#E8E8E8",
                            }}
                          >
                            Back
                          </Button>
                          <Button
                            onClick={() => {
                              // Validate required fields
                              // Check if ORCID or verification document is provided for academic researchers
                              if (
                                isAcademicResearcher === true &&
                                !orcid?.trim() &&
                                !verificationDocumentUrl?.trim() &&
                                !verificationDocument
                              ) {
                                setError(
                                  "Please connect with ORCID or upload a verification document to continue.",
                                );
                                return;
                              }
                              if (!profession?.trim()) {
                                setError("Please select your profession");
                                return;
                              }
                              if (!academicRank?.trim()) {
                                setError("Please select your academic rank");
                                return;
                              }
                              if (!institutionAffiliation?.trim()) {
                                setError(
                                  "Please select your institution affiliation",
                                );
                                return;
                              }
                              setError("");
                              setStep(3); // Move to specialty/conditions step
                            }}
                            disabled={
                              !profession?.trim() ||
                              !academicRank?.trim() ||
                              !institutionAffiliation?.trim() ||
                              (isAcademicResearcher === true &&
                                !orcid?.trim() &&
                                !verificationDocumentUrl?.trim() &&
                                !verificationDocument)
                            }
                            className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            style={{
                              backgroundColor: "#2F3C96",
                              color: "#FFFFFF",
                            }}
                          >
                            Continue →
                          </Button>
                        </div>
                      </>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-2 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          color: "#DC2626",
                        }}
                      >
                        <p className="text-xs">{error}</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Conditions (for patients) OR Specialty (for medical professionals) */}
                {step === 3 && isMedicalProfessional === false && (
                  <motion.div
                    key="step2"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Search Input */}
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <SmartSearchInput
                            value={conditionInput}
                            onChange={setConditionInput}
                            onSubmit={(value) => {
                              if (!value?.trim()) return;
                              const trimmed = value.trim();
                              const symptomKeywords = [
                                "pain",
                                "ache",
                                "pressure",
                                "high",
                                "low",
                                "difficulty",
                                "trouble",
                                "issue",
                                "problem",
                                "feeling",
                                "symptom",
                                "bp",
                                "blood pressure",
                                "breathing",
                                "chest",
                                "headache",
                              ];
                              const looksLikeSymptom =
                                symptomKeywords.some((keyword) =>
                                  trimmed.toLowerCase().includes(keyword),
                                ) || trimmed.length > 15;
                              if (looksLikeSymptom) {
                                extractConditions(trimmed);
                              } else {
                                handleConditionSubmit(trimmed);
                              }
                            }}
                            placeholder="Search or describe symptoms..."
                            extraTerms={[
                              ...commonConditions,
                              ...SMART_SUGGESTION_KEYWORDS,
                              ...icd11Suggestions,
                            ]}
                            canonicalMap={conditionsCanonicalMap}
                            maxSuggestions={8}
                            autoSubmitOnSelect={true}
                            inputClassName="w-full py-1.5 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          />
                          {isExtracting && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute right-2.5 top-1.5 flex items-center gap-1"
                            >
                              <Sparkles
                                size={10}
                                className="animate-pulse"
                                style={{ color: "#2F3C96" }}
                              />
                            </motion.div>
                          )}
                        </div>
                        {/* Only show Add button when typing something unusual (not matching suggestions) */}
                        {conditionInput &&
                          conditionInput.trim().length >= 3 &&
                          !commonConditions.some(
                            (c) =>
                              c.toLowerCase() ===
                              conditionInput.trim().toLowerCase(),
                          ) && (
                            <Button
                              onClick={() => {
                                const trimmed = conditionInput.trim();
                                // Check if it looks like symptoms
                                const symptomKeywords = [
                                  "pain",
                                  "ache",
                                  "pressure",
                                  "high",
                                  "low",
                                  "difficulty",
                                  "trouble",
                                  "issue",
                                  "problem",
                                  "feeling",
                                  "symptom",
                                  "bp",
                                  "blood pressure",
                                  "breathing",
                                  "chest",
                                  "headache",
                                ];
                                const looksLikeSymptom =
                                  symptomKeywords.some((keyword) =>
                                    trimmed.toLowerCase().includes(keyword),
                                  ) || trimmed.length > 15;

                                if (looksLikeSymptom) {
                                  extractConditions(trimmed);
                                } else {
                                  handleConditionSubmit(trimmed);
                                }
                              }}
                              disabled={isExtracting}
                              className="px-3 py-1.5 rounded-lg font-semibold text-xs transition-all disabled:opacity-40"
                              style={{
                                backgroundColor: "#2F3C96",
                                color: "#FFFFFF",
                              }}
                            >
                              Add
                            </Button>
                          )}
                      </div>
                      {/* Inline Selected Conditions Chips */}
                      {getCombinedConditions().length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {getCombinedConditions().map((condition, idx) => {
                            const isIdentified =
                              identifiedConditions.includes(condition);
                            return (
                              <motion.span
                                key={idx}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium"
                                style={{
                                  backgroundColor: isIdentified
                                    ? "rgba(208, 196, 226, 0.2)"
                                    : "rgba(208, 196, 226, 0.1)",
                                  color: "#2F3C96",
                                }}
                              >
                                {isIdentified && (
                                  <Sparkles
                                    size={7}
                                    style={{ color: "#2F3C96" }}
                                  />
                                )}
                                {condition}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCondition(condition);
                                  }}
                                  className="ml-0.5 hover:opacity-70 transition-opacity"
                                  style={{ color: "#787878" }}
                                >
                                  <X size={8} />
                                </button>
                              </motion.span>
                            );
                          })}
                        </div>
                      )}
                      {/* Softer helper text */}
                      <p
                        className="text-xs flex items-center gap-0.5"
                        style={{ color: "#787878", opacity: 0.7 }}
                      >
                        <Sparkles size={7} />
                        You can describe symptoms if you're unsure of the
                        condition
                      </p>
                    </div>

                    {/* Collapsible Quick Select */}
                    <div className="pt-1">
                      <motion.button
                        type="button"
                        onClick={() => setIsQuickSelectOpen(!isQuickSelectOpen)}
                        className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg transition-all border cursor-pointer"
                        style={{
                          backgroundColor: isQuickSelectOpen
                            ? "rgba(208, 196, 226, 0.1)"
                            : "rgba(208, 196, 226, 0.05)",
                          borderColor: isQuickSelectOpen
                            ? "#D0C4E2"
                            : "rgba(208, 196, 226, 0.3)",
                          color: "#2F3C96",
                        }}
                        whileHover={{
                          backgroundColor: "rgba(208, 196, 226, 0.15)",
                          borderColor: "#D0C4E2",
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            Common conditions
                          </span>
                          {selectedConditions.length > 0 && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "#2F3C96",
                                color: "#FFFFFF",
                              }}
                            >
                              {selectedConditions.length}
                            </span>
                          )}
                          {!isQuickSelectOpen && (
                            <span
                              className="text-xs font-normal"
                              style={{ color: "#787878", opacity: 0.7 }}
                            >
                              (Click to expand)
                            </span>
                          )}
                        </div>
                        <motion.div
                          animate={{ rotate: isQuickSelectOpen ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ color: "#2F3C96" }}
                        >
                          <ChevronRight size={16} />
                        </motion.div>
                      </motion.button>

                      <AnimatePresence>
                        {isQuickSelectOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {(showAllConditions
                                  ? commonConditions
                                  : commonConditions.slice(0, 8)
                                ).map((condition) => {
                                  const isSelected =
                                    selectedConditions.includes(condition);
                                  return (
                                    <motion.button
                                      key={condition}
                                      type="button"
                                      onClick={() => toggleCondition(condition)}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      className="px-2.5 py-1 rounded-lg text-sm font-medium transition-all border"
                                      style={{
                                        backgroundColor: isSelected
                                          ? "#2F3C96"
                                          : "transparent",
                                        color: isSelected
                                          ? "#FFFFFF"
                                          : "#787878",
                                        borderColor: isSelected
                                          ? "#2F3C96"
                                          : "rgba(208, 196, 226, 0.2)",
                                      }}
                                    >
                                      {condition}
                                    </motion.button>
                                  );
                                })}
                              </div>
                              {commonConditions.length > 8 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowAllConditions(!showAllConditions)
                                  }
                                  className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
                                  style={{
                                    color: "#2F3C96",
                                    backgroundColor: "rgba(208, 196, 226, 0.1)",
                                  }}
                                >
                                  {showAllConditions
                                    ? "Show less"
                                    : `Show ${
                                        commonConditions.length - 8
                                      } more`}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex gap-2.5">
                        <Button
                          onClick={() => setStep(2)}
                          className="flex-1 py-2 rounded-lg font-semibold text-base border transition-all"
                          style={{
                            backgroundColor: "#FFFFFF",
                            color: "#787878",
                            borderColor: "#E8E8E8",
                          }}
                        >
                          Back
                        </Button>
                        <Button
                          onClick={() => setStep(4)}
                          className="flex-1 py-2 rounded-lg font-semibold text-base transition-all transform hover:scale-[1.02]"
                          style={{
                            backgroundColor: "#2F3C96",
                            color: "#FFFFFF",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#474F97";
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(208, 196, 226, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#2F3C96";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          Continue →
                        </Button>
                      </div>
                      <p
                        className="text-sm text-center font-medium"
                        style={{ color: "#2F3C96" }}
                      >
                        You can edit this later
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Researcher Specialty (for medical professionals) */}
                {step === 3 && isMedicalProfessional === true && (
                  <motion.div
                    key="step3-researcher"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Specialty */}
                    <div className="space-y-3">
                      <div
                        className="text-xs font-semibold pb-1 border-b"
                        style={{ color: "#2F3C96", borderColor: "#E8E8E8" }}
                      >
                        Specialty
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <label
                            className="block text-xs font-medium mb-1"
                            style={{ color: "#2F3C96" }}
                          >
                            Primary Specialty{" "}
                            <span
                              className="text-[10px] font-normal"
                              style={{ color: "#DC2626" }}
                            >
                              (Required)
                            </span>
                          </label>
                          <CustomSelect
                            value={primarySpecialty}
                            onChange={setPrimarySpecialty}
                            optionGroups={primarySpecialtyOptionGroups}
                            placeholder="Select or search for your primary specialty"
                            variant="onboarding"
                            maxDropdownHeight={280}
                            searchable
                            searchPlaceholder="Search specialties..."
                            className="w-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <label
                            className="block text-xs font-medium mb-1"
                            style={{ color: "#2F3C96" }}
                          >
                            Subspecialty{" "}
                            <span
                              className="text-[10px] font-normal"
                              style={{ color: "#787878" }}
                            >
                              (Optional)
                            </span>
                          </label>
                          <CustomSelect
                            value={subspecialtySelectValue}
                            onChange={(val) => handleSubspecialtySelect(val)}
                            optionGroups={getSubspecialtyOptionGroups(
                              primarySpecialty,
                            )}
                            placeholder={
                              !primarySpecialty?.trim()
                                ? "Select primary specialty first"
                                : "Select subspecialties"
                            }
                            variant="onboarding"
                            maxDropdownHeight={220}
                            searchable
                            disabled={!primarySpecialty?.trim()}
                            className="w-full"
                          />
                          {subspecialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {subspecialties.map((sub, idx) => (
                                <motion.span
                                  key={idx}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium"
                                  style={{
                                    backgroundColor: "rgba(208, 196, 226, 0.2)",
                                    color: "#2F3C96",
                                  }}
                                >
                                  {sub}
                                  <button
                                    type="button"
                                    onClick={() => removeSubspecialty(sub)}
                                    className="ml-0.5 hover:opacity-70"
                                    style={{ color: "#787878" }}
                                  >
                                    <X size={8} />
                                  </button>
                                </motion.span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Research Interests */}
                    <div className="space-y-1.5">
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Research Interests
                      </label>
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <ResearchInterestInput
                            value={researchInterestInput}
                            onChange={setResearchInterestInput}
                            onSelect={(term) =>
                              handleResearchInterestSubmit(term)
                            }
                            placeholder="Search research interests from MeSH database..."
                            maxSuggestions={8}
                            inputClassName="w-full py-1.5 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          />
                        </div>
                        {researchInterestInput &&
                          researchInterestInput.trim().length >= 2 &&
                          !researchInterests.includes(
                            capitalizeText(researchInterestInput.trim()),
                          ) && (
                            <Button
                              onClick={() =>
                                handleResearchInterestSubmit(
                                  researchInterestInput,
                                )
                              }
                              className="px-3 py-1.5 rounded-lg font-semibold text-sm transition-all"
                              style={{
                                backgroundColor: "#2F3C96",
                                color: "#FFFFFF",
                              }}
                            >
                              Add
                            </Button>
                          )}
                      </div>
                      {researchInterests.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {researchInterests.map((interest, idx) => (
                            <motion.span
                              key={idx}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.2)",
                                color: "#2F3C96",
                              }}
                            >
                              <Sparkles size={7} style={{ color: "#2F3C96" }} />
                              {interest}
                              <button
                                type="button"
                                onClick={() => toggleResearchInterest(interest)}
                                className="ml-0.5 hover:opacity-70"
                                style={{ color: "#787878" }}
                              >
                                <X size={8} />
                              </button>
                            </motion.span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    <div className="space-y-1.5" data-skills-dropdown>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Skills
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setIsSkillsDropdownOpen(!isSkillsDropdownOpen)
                          }
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 flex items-center justify-between"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            backgroundColor: "#FFFFFF",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        >
                          <span
                            className="text-xs"
                            style={{
                              color: skills.length > 0 ? "#2F3C96" : "#787878",
                            }}
                          >
                            {skills.length > 0
                              ? `${skills.length} skill${skills.length > 1 ? "s" : ""} selected`
                              : "Select research skills"}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${isSkillsDropdownOpen ? "rotate-180" : ""}`}
                            style={{ color: "#787878" }}
                          />
                        </button>
                        {isSkillsDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto"
                            style={{
                              borderColor: "#E8E8E8",
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                            }}
                          >
                            {researchSkills.map((skill) => (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => toggleSkill(skill)}
                                className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-opacity-10 transition-all flex items-center gap-2"
                                style={{
                                  backgroundColor: skills.includes(skill)
                                    ? "rgba(47, 60, 150, 0.1)"
                                    : "transparent",
                                  color: "#2F3C96",
                                }}
                              >
                                <div
                                  className="w-3.5 h-3.5 rounded border flex items-center justify-center"
                                  style={{
                                    borderColor: skills.includes(skill)
                                      ? "#2F3C96"
                                      : "#E8E8E8",
                                    backgroundColor: skills.includes(skill)
                                      ? "#2F3C96"
                                      : "transparent",
                                  }}
                                >
                                  {skills.includes(skill) && (
                                    <CheckCircle
                                      size={10}
                                      style={{ color: "#FFFFFF" }}
                                    />
                                  )}
                                </div>
                                <span>{skill}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {skills.map((skill, idx) => (
                            <motion.span
                              key={idx}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.1)",
                                color: "#2F3C96",
                              }}
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => toggleSkill(skill)}
                                className="ml-0.5 hover:opacity-70"
                                style={{ color: "#787878" }}
                              >
                                <X size={8} />
                              </button>
                            </motion.span>
                          ))}
                        </div>
                      )}
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-2 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          color: "#DC2626",
                        }}
                      >
                        <p className="text-xs">{error}</p>
                      </motion.div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => setStep(2)}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm border transition-all"
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: "#787878",
                          borderColor: "#E8E8E8",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => {
                          if (!primarySpecialty?.trim()) {
                            setError("Please select a primary specialty");
                            return;
                          }
                          setError("");
                          setStep(4);
                        }}
                        disabled={!primarySpecialty?.trim()}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        style={{ backgroundColor: "#2F3C96", color: "#FFFFFF" }}
                      >
                        Continue →
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Location */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        disabled={locationLoading}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all border disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 hover:bg-[rgba(208,196,226,0.2)]"
                        style={{
                          borderColor: "#D0C4E2",
                          color: "#2F3C96",
                          backgroundColor: "rgba(208, 196, 226, 0.12)",
                          ["--tw-ring-color"]: "#D0C4E2",
                        }}
                      >
                        {locationLoading ? (
                          <Loader2
                            size={14}
                            className="animate-spin shrink-0"
                          />
                        ) : (
                          <MapPin size={14} className="shrink-0" />
                        )}
                        {locationLoading
                          ? "Detecting…"
                          : "Use my current location"}
                      </button>
                    </div>
                    {locationError && (
                      <p className="text-xs" style={{ color: "#b91c1c" }}>
                        {locationError}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: "#2F3C96" }}
                        >
                          Country
                        </label>
                        <LocationInput
                          value={country}
                          onChange={(v) => {
                            setCountry(v);
                            setLocationFilledFromGeo(false);
                          }}
                          mode="country"
                          suppressDropdown={locationFilledFromGeo}
                          inputClassName="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                        />
                        <p
                          className="text-xs mt-1"
                          style={{ color: "#787878" }}
                        >
                          Type to see country suggestions
                        </p>
                      </div>
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: "#2F3C96" }}
                        >
                          City
                        </label>
                        <LocationInput
                          value={city}
                          onChange={(v) => {
                            setCity(v);
                            setLocationFilledFromGeo(false);
                          }}
                          mode="city"
                          suppressDropdown={locationFilledFromGeo}
                          inputClassName="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                        />
                        <p
                          className="text-xs mt-1"
                          style={{ color: "#787878" }}
                        >
                          Type to see city suggestions
                        </p>
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Gender (Optional)
                      </label>
                      <div className="relative" data-gender-dropdown>
                        <button
                          type="button"
                          onClick={() =>
                            setIsGenderDropdownOpen(!isGenderDropdownOpen)
                          }
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 flex items-center justify-between cursor-pointer"
                          style={{
                            borderColor: isGenderDropdownOpen
                              ? "#D0C4E2"
                              : gender
                                ? "#2F3C96"
                                : "#E8E8E8",
                            color: gender ? "#2F3C96" : "#787878",
                            backgroundColor: isGenderDropdownOpen
                              ? "rgba(208, 196, 226, 0.08)"
                              : gender
                                ? "rgba(208, 196, 226, 0.05)"
                                : "#FFFFFF",
                            "--tw-ring-color": "#D0C4E2",
                            boxShadow: isGenderDropdownOpen
                              ? "0 2px 6px rgba(208, 196, 226, 0.25)"
                              : gender
                                ? "0 1px 3px rgba(208, 196, 226, 0.2)"
                                : "none",
                          }}
                          onMouseEnter={(e) => {
                            if (!isGenderDropdownOpen) {
                              e.currentTarget.style.borderColor = "#D0C4E2";
                              e.currentTarget.style.backgroundColor = gender
                                ? "rgba(208, 196, 226, 0.1)"
                                : "rgba(208, 196, 226, 0.05)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isGenderDropdownOpen) {
                              e.currentTarget.style.borderColor = gender
                                ? "#2F3C96"
                                : "#E8E8E8";
                              e.currentTarget.style.backgroundColor = gender
                                ? "rgba(208, 196, 226, 0.05)"
                                : "#FFFFFF";
                            }
                          }}
                        >
                          <span>{gender || "Select gender"}</span>
                          <motion.div
                            animate={{
                              rotate: isGenderDropdownOpen ? 180 : 0,
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown
                              size={16}
                              style={{
                                color: gender ? "#2F3C96" : "#787878",
                              }}
                            />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {isGenderDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute z-50 w-full mt-1 bg-white rounded-xl border shadow-xl overflow-hidden"
                              style={{
                                borderColor: "#D0C4E2",
                                boxShadow:
                                  "0 8px 24px rgba(208, 196, 226, 0.2)",
                              }}
                            >
                              {[
                                { value: "", label: "Select gender" },
                                { value: "Male", label: "Male" },
                                { value: "Female", label: "Female" },
                                { value: "Non-binary", label: "Non-binary" },
                                {
                                  value: "Prefer not to say",
                                  label: "Prefer not to say",
                                },
                              ].map((option) => {
                                const isSelected = gender === option.value;
                                return (
                                  <motion.button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      setGender(option.value);
                                      setIsGenderDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-sm transition-all duration-150 flex items-center justify-between"
                                    style={{
                                      backgroundColor: isSelected
                                        ? "rgba(208, 196, 226, 0.15)"
                                        : "transparent",
                                      color: isSelected ? "#2F3C96" : "#787878",
                                    }}
                                    whileHover={{
                                      backgroundColor: isSelected
                                        ? "rgba(208, 196, 226, 0.2)"
                                        : "rgba(208, 196, 226, 0.08)",
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <span className="font-medium">
                                      {option.label}
                                    </span>
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 500,
                                          damping: 30,
                                        }}
                                      >
                                        <CheckCircle
                                          size={16}
                                          style={{ color: "#2F3C96" }}
                                        />
                                      </motion.div>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Terms & Conditions (for OAuth flow) */}
                    {isOAuthFlow && (
                      <div
                        className="p-2 rounded-lg border"
                        style={{ borderColor: "#E8E8E8" }}
                      >
                        <label className="flex items-start gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-0.5 w-3.5 h-3.5 rounded"
                            style={{ accentColor: "#2F3C96" }}
                          />
                          <span
                            className="text-xs"
                            style={{ color: "#787878" }}
                          >
                            I agree to the{" "}
                            <a
                              href="/terms"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:opacity-80 transition-opacity"
                              style={{ color: "#2F3C96" }}
                            >
                              Terms of Service
                            </a>{" "}
                            and{" "}
                            <a
                              href="/privacy"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:opacity-80 transition-opacity"
                              style={{ color: "#2F3C96" }}
                            >
                              Privacy Policy
                            </a>
                          </span>
                        </label>
                      </div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-2 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          color: "#DC2626",
                        }}
                      >
                        <p className="text-xs">{error}</p>
                      </motion.div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setStep(3)}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm border transition-all"
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: "#787878",
                          borderColor: "#E8E8E8",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => {
                          if (isOAuthFlow) {
                            // Skip email/password step for OAuth users
                            handleOAuthComplete();
                          } else {
                            setStep(5);
                          }
                        }}
                        disabled={loading || (isOAuthFlow && !agreedToTerms)}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        style={{
                          backgroundColor: "#2F3C96",
                          color: "#FFFFFF",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = "#474F97";
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(208, 196, 226, 0.4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#2F3C96";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        {isOAuthFlow
                          ? loading
                            ? "Saving..."
                            : "Complete →"
                          : "Continue →"}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Email & Password (Only for non-OAuth users) */}
                {step === 5 && !isOAuthFlow && (
                  <motion.div
                    key="step5"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-2.5"
                  >
                    {/* Social Sign-In Options - At Top */}
                    {isAuth0Configured && (
                      <div className="space-y-2">
                        <p
                          className="text-xs text-center font-medium"
                          style={{ color: "#787878" }}
                        >
                          Sign up with
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {/* Google Button */}
                          <motion.button
                            type="button"
                            disabled={socialLoginLoading !== null}
                            whileHover={{
                              scale: socialLoginLoading ? 1 : 1.02,
                              backgroundColor: socialLoginLoading
                                ? "rgba(208, 196, 226, 0.08)"
                                : "rgba(208, 196, 226, 0.15)",
                            }}
                            whileTap={{
                              scale: socialLoginLoading ? 1 : 0.98,
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg border transition-all disabled:opacity-50"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.08)",
                              borderColor: "#D0C4E2",
                              color: "#2F3C96",
                            }}
                            onClick={() => handleSocialLogin("google")}
                          >
                            {socialLoginLoading === "google" ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="w-[14px] h-[14px] rounded-full border-2"
                                style={{
                                  borderColor: "rgba(47, 60, 150, 0.3)",
                                  borderTopColor: "#2F3C96",
                                }}
                              />
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                  fill="#4285F4"
                                />
                                <path
                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                  fill="#34A853"
                                />
                                <path
                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                  fill="#FBBC05"
                                />
                                <path
                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                  fill="#EA4335"
                                />
                              </svg>
                            )}
                            <span className="text-[9px] font-medium leading-tight">
                              Google
                            </span>
                          </motion.button>

                          {/* Microsoft Button */}
                          <motion.button
                            type="button"
                            disabled={socialLoginLoading !== null}
                            whileHover={{
                              scale: socialLoginLoading ? 1 : 1.02,
                              backgroundColor: socialLoginLoading
                                ? "rgba(208, 196, 226, 0.08)"
                                : "rgba(208, 196, 226, 0.15)",
                            }}
                            whileTap={{
                              scale: socialLoginLoading ? 1 : 0.98,
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg border transition-all disabled:opacity-50"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.08)",
                              borderColor: "#D0C4E2",
                              color: "#2F3C96",
                            }}
                            onClick={() => handleSocialLogin("microsoft")}
                          >
                            {socialLoginLoading === "microsoft" ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="w-[14px] h-[14px] rounded-full border-2"
                                style={{
                                  borderColor: "rgba(0, 120, 212, 0.3)",
                                  borderTopColor: "#0078D4",
                                }}
                              />
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M11.4 11.4H3V3h8.4v8.4z"
                                  fill="#F25022"
                                />
                                <path
                                  d="M21 11.4h-8.4V3H21v8.4z"
                                  fill="#7FBA00"
                                />
                                <path
                                  d="M11.4 21H3v-8.4h8.4V21z"
                                  fill="#00A4EF"
                                />
                                <path
                                  d="M21 21h-8.4v-8.4H21V21z"
                                  fill="#FFB900"
                                />
                              </svg>
                            )}
                            <span className="text-[9px] font-medium leading-tight">
                              Microsoft
                            </span>
                          </motion.button>

                          {/* Facebook Button */}
                          <motion.button
                            type="button"
                            disabled={socialLoginLoading !== null}
                            whileHover={{
                              scale: socialLoginLoading ? 1 : 1.02,
                              backgroundColor: socialLoginLoading
                                ? "rgba(208, 196, 226, 0.08)"
                                : "rgba(208, 196, 226, 0.15)",
                            }}
                            whileTap={{
                              scale: socialLoginLoading ? 1 : 0.98,
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg border transition-all disabled:opacity-50"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.08)",
                              borderColor: "#D0C4E2",
                              color: "#2F3C96",
                            }}
                            onClick={() => handleSocialLogin("facebook")}
                          >
                            {socialLoginLoading === "facebook" ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="w-[14px] h-[14px] rounded-full border-2"
                                style={{
                                  borderColor: "rgba(24, 119, 242, 0.3)",
                                  borderTopColor: "#1877F2",
                                }}
                              />
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                                  fill="#1877F2"
                                />
                              </svg>
                            )}
                            <span className="text-[9px] font-medium leading-tight">
                              Facebook
                            </span>
                          </motion.button>

                          {/* Apple Button */}
                          <motion.button
                            type="button"
                            disabled={socialLoginLoading !== null}
                            whileHover={{
                              scale: socialLoginLoading ? 1 : 1.02,
                              backgroundColor: socialLoginLoading
                                ? "rgba(208, 196, 226, 0.08)"
                                : "rgba(208, 196, 226, 0.15)",
                            }}
                            whileTap={{
                              scale: socialLoginLoading ? 1 : 0.98,
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg border transition-all disabled:opacity-50"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.08)",
                              borderColor: "#D0C4E2",
                              color: "#2F3C96",
                            }}
                            onClick={() => handleSocialLogin("apple")}
                          >
                            {socialLoginLoading === "apple" ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="w-[14px] h-[14px] rounded-full border-2"
                                style={{
                                  borderColor: "rgba(0, 0, 0, 0.3)",
                                  borderTopColor: "#000000",
                                }}
                              />
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                                  fill="#000000"
                                />
                              </svg>
                            )}
                            <span className="text-[9px] font-medium leading-tight">
                              Apple
                            </span>
                          </motion.button>
                        </div>

                        <div
                          className="flex items-center gap-2 py-1"
                          style={{ color: "#787878" }}
                        >
                          <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: "#E8E8E8" }}
                          />
                          <span className="text-xs">or</span>
                          <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: "#E8E8E8" }}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Email
                      </label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full py-1.5 px-2.5 text-xs border rounded-lg transition-all focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Minimum 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full py-1.5 pl-2.5 pr-9 text-xs border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors hover:bg-black/5"
                          style={{ color: "#787878" }}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            email &&
                            password &&
                            confirmPassword &&
                            !loading &&
                            handleComplete()
                          }
                          className="w-full py-1.5 pl-2.5 pr-9 text-xs border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors hover:bg-black/5"
                          style={{ color: "#787878" }}
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-2 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          color: "#DC2626",
                        }}
                      >
                        <p className="text-xs">{error}</p>
                      </motion.div>
                    )}

                    {/* Terms & Conditions */}
                    <div
                      className="p-2 rounded-lg border"
                      style={{ borderColor: "#E8E8E8" }}
                    >
                      <label className="flex items-start gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 rounded"
                          style={{ accentColor: "#2F3C96" }}
                        />
                        <span className="text-xs" style={{ color: "#787878" }}>
                          I agree to the{" "}
                          <a
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: "#2F3C96" }}
                          >
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a
                            href="/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: "#2F3C96" }}
                          >
                            Privacy Policy
                          </a>
                        </span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setStep(4)}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm border transition-all"
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: "#787878",
                          borderColor: "#E8E8E8",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleComplete}
                        disabled={
                          loading ||
                          (!isOAuthFlow &&
                            (!email ||
                              !password ||
                              !confirmPassword ||
                              !agreedToTerms))
                        }
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        style={{
                          backgroundColor: "#2F3C96",
                          color: "#FFFFFF",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = "#474F97";
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(208, 196, 226, 0.4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#2F3C96";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        {loading
                          ? isOAuthFlow
                            ? "Saving..."
                            : "Creating..."
                          : isOAuthFlow
                            ? "Save Profile →"
                            : "Complete →"}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 6: Email Verification */}
                {step === 6 && (
                  <motion.div
                    key="step5"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <EmailVerificationStep
                      email={(() => {
                        // Get email from state or localStorage
                        if (email) return email;
                        const userData = JSON.parse(
                          localStorage.getItem("user") || "{}",
                        );
                        const userEmail = userData.email || "";
                        console.log(
                          "EmailVerificationStep - Using email:",
                          userEmail,
                        );
                        return userEmail;
                      })()}
                      onVerified={() => {
                        // After verification, navigate to dashboard
                        const userData = JSON.parse(
                          localStorage.getItem("user") || "{}",
                        );
                        const userRole = userData?.role || "patient";
                        navigate(`/dashboard/${userRole}`);
                      }}
                      onResend={() => {
                        // Resend handled by EmailVerificationStep component
                      }}
                      onEdit={() => {
                        // Go back to step 5 (Account step) to edit email with info prefilled
                        // Clear the verification email tracking so a new email can be sent if changed
                        const currentEmail =
                          email ||
                          (() => {
                            const userData = JSON.parse(
                              localStorage.getItem("user") || "{}",
                            );
                            return userData.email || "";
                          })();
                        localStorage.removeItem(`verification_email_address`);
                        setStep(5);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Terms of Service Dialog */}
      <AnimatePresence>
        {showTermsDialog && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTermsDialog(false)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="bg-white rounded-xl shadow-xl border p-6 max-w-md w-full"
                style={{
                  borderColor: "#D0C4E2",
                  boxShadow: "0 10px 40px rgba(208, 196, 226, 0.3)",
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="rounded-full p-2 shrink-0"
                    style={{
                      backgroundColor: "rgba(47, 60, 150, 0.1)",
                    }}
                  >
                    <AlertCircle size={24} style={{ color: "#2F3C96" }} />
                  </div>
                  <div className="flex-1">
                    <h3
                      className="text-lg font-bold mb-2"
                      style={{ color: "#2F3C96" }}
                    >
                      Agreement Required
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      To continue with social sign-in, please review and agree
                      to our{" "}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: "#2F3C96" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: "#2F3C96" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Privacy Policy
                      </a>
                      . This helps us protect your privacy and ensure a safe
                      experience.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={() => setShowTermsDialog(false)}
                    className="flex-1 py-2 rounded-lg font-semibold text-sm border transition-all"
                    style={{
                      backgroundColor: "#FFFFFF",
                      color: "#787878",
                      borderColor: "#E8E8E8",
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowTermsDialog(false);
                      // Scroll to terms checkbox
                      const termsCheckbox = document.querySelector(
                        'input[type="checkbox"]',
                      );
                      if (termsCheckbox) {
                        termsCheckbox.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                        // Highlight the checkbox area briefly
                        setTimeout(() => {
                          const termsContainer = termsCheckbox.closest("div");
                          if (termsContainer) {
                            termsContainer.style.transition =
                              "background-color 0.3s";
                            termsContainer.style.backgroundColor =
                              "rgba(208, 196, 226, 0.2)";
                            setTimeout(() => {
                              termsContainer.style.backgroundColor = "";
                            }, 2000);
                          }
                        }, 500);
                      }
                    }}
                    className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02]"
                    style={{
                      backgroundColor: "#2F3C96",
                      color: "#FFFFFF",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#474F97";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(208, 196, 226, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2F3C96";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    Go to Terms
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .condition-selector::-webkit-scrollbar {
          display: none;
        }
        /* Custom scrollbar for main card */
        .onboard-card-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .onboard-card-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .onboard-card-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(208, 196, 226, 0.5);
          border-radius: 4px;
        }
        .onboard-card-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(208, 196, 226, 0.7);
        }
      `}</style>
    </Layout>
  );
}
