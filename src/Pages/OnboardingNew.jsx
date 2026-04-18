import React, { useState, useEffect, useMemo, startTransition } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
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
import { useAuth0Social } from "../hooks/useAuth0Social.js";
import { generateUniqueUsernames } from "../utils/usernameSuggestions.js";
import { capitalizeText } from "../utils/textCorrection.js";
import { SMART_SUGGESTION_KEYWORDS } from "../utils/smartSuggestions.js";
import { primarySpecialtyOptionGroups } from "../data/primarySpecialtyOptions.js";
import { getSubspecialtyOptionGroups } from "../data/subspecialtyDataset.js";
import {
  Loader2,
  RefreshCw,
  X,
  ChevronDown,
  Eye,
  EyeOff,
  CheckCircle,
  FileText,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { getGuestDeviceIdHeaders } from "../utils/api.js";
import { useTranslation } from "react-i18next";
import {
  LOCALE_SELECTOR_OPTIONS,
  normalizeLocale,
  DEFAULT_LOCALE,
} from "../i18n/supportedLocales.js";
import { applyDocumentLanguageAndDir } from "../i18n/documentLanguage.js";
import { syncI18nFromUser } from "../i18n/syncUserLanguage.js";
import icd11Dataset from "../data/icd11Dataset.json";
import {
  buildCanonicalMapFromIcd11,
  buildCanonicalMapFromLabels,
  buildNormalizedKey,
  resolveToCanonical,
} from "../utils/canonicalLabels.js";

// Social provider logos
const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);
const MicrosoftLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="#F25022" d="M1 1h10v10H1z" />
    <path fill="#00A4EF" d="M1 13h10v10H1z" />
    <path fill="#7FBA00" d="M13 1h10v10H13z" />
    <path fill="#FFB900" d="M13 13h10v10H13z" />
  </svg>
);
const FacebookLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const AppleLogo = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ color: "#000" }}
    aria-hidden
  >
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const STEP_MEDICAL = 1;
const STEP_EMAIL = 2;
const STEP_NAME = 3;
const STEP_LANGUAGE = 4;
/** Patient path */
const STEP_PATIENT_CONDITIONS = 5;
const STEP_PATIENT_LOCATION = 6;
/** Researcher path */
const STEP_RESEARCHER_PROFESSIONAL = 5;
const STEP_RESEARCHER_ORCID = 6;
const STEP_RESEARCHER_SPECIALTY = 7;
const STEP_RESEARCHER_LOCATION = 8;

const ONBOARDING_DRAFT_KEY = "onboard_new_draft";
/** Bump when a new step is inserted so saved drafts shift step indices. */
const ONBOARDING_FLOW_VERSION = 2;

function migrateOnboardingDraftIfNeeded(draft) {
  if (!draft || typeof draft !== "object") return draft;
  const v = draft.onboardingFlowVersion;
  if (v != null && v >= ONBOARDING_FLOW_VERSION) return draft;
  const next = { ...draft, onboardingFlowVersion: ONBOARDING_FLOW_VERSION };
  if (typeof next.step === "number" && next.step > STEP_NAME) next.step += 1;
  if (
    typeof next.maxStepReached === "number" &&
    next.maxStepReached > STEP_NAME
  ) {
    next.maxStepReached += 1;
  }
  return next;
}

/** Maps to existing researcher vs patient onboarding flows */
const ABOUT_SELF_OPTIONS = [
  { id: "patient", label: "Patient", researcher: false },
  { id: "caregiver", label: "Caregiver", researcher: false },
  { id: "clinical_researcher", label: "Clinical Researcher", researcher: true },
  {
    id: "allied_health",
    label: "Allied Health Professional",
    researcher: true,
  },
  { id: "pharma_biotech", label: "Pharma/Biotech", researcher: true },
  { id: "other", label: "Other", researcher: false },
];

function getCombinedConditions(conditions, symptomsText) {
  const list = Array.isArray(conditions) ? [...conditions] : [];
  if (symptomsText?.trim()) list.push(`Symptoms: ${symptomsText.trim()}`);
  return list;
}

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
];

// Keywords that suggest the user is describing symptoms (trigger AI extraction)
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

export default function OnboardingNew() {
  const { t, i18n } = useTranslation("common");
  const [searchParams] = useSearchParams();
  const isOAuth = searchParams.get("oauth") === "true";
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [step, setStep] = useState(STEP_MEDICAL);
  const [maxStepReached, setMaxStepReached] = useState(STEP_MEDICAL);
  const [isMedicalProfessional, setIsMedicalProfessional] = useState(null);
  const [aboutYourself, setAboutYourself] = useState(null);
  const [aboutYourselfDetail, setAboutYourselfDetail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [handle, setHandle] = useState("");
  const [usernameSuggestions, setUsernameSuggestions] = useState(() =>
    generateUniqueUsernames(3, false),
  );
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [conditionInput, setConditionInput] = useState("");
  const [identifiedConditions, setIdentifiedConditions] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [symptomsText, setSymptomsText] = useState("");
  const [location, setLocation] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  // Researcher
  const [profession, setProfession] = useState("");
  const [academicRank, setAcademicRank] = useState("");
  const [institutionAffiliation, setInstitutionAffiliation] = useState("");
  const [educationEntries, setEducationEntries] = useState([]);
  const [primarySpecialty, setPrimarySpecialty] = useState("");
  const [subspecialtySelectValue, setSubspecialtySelectValue] = useState("");
  const [subspecialties, setSubspecialties] = useState([]);
  const [researchInterestInput, setResearchInterestInput] = useState("");
  const [researchInterests, setResearchInterests] = useState([]);
  const [skills, setSkills] = useState([]);
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false);
  // ORCID / academic researcher
  const [isAcademicResearcher, setIsAcademicResearcher] = useState(false);
  const [orcid, setOrcid] = useState("");
  const [orcidConnecting, setOrcidConnecting] = useState(false);
  const [orcidSuggestedInstitution, setOrcidSuggestedInstitution] =
    useState("");
  /** true = show ORCID connect; false = show ID verification upload (no ORCID) */
  const [hasOrcid, setHasOrcid] = useState(true);
  const [verificationDocument, setVerificationDocument] = useState(null);
  const [verificationDocumentUrl, setVerificationDocumentUrl] = useState("");
  const [uploadingVerification, setUploadingVerification] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState(
    () => normalizeLocale(i18n.language) || DEFAULT_LOCALE,
  );

  const {
    loginWithGoogle,
    loginWithMicrosoft,
    loginWithFacebook,
    loginWithApple,
    isConfigured: isAuth0Configured,
  } = useAuth0Social();

  // Researcher steps: 1=Medical? → 2=Email → 3=Name → 4=Professional Info → 5=ORCID → 6=Specialty → 7=Location
  const getSteps = () => {
    if (isMedicalProfessional === null) {
      return [
        { id: 1, label: "Get started" },
        { id: 2, label: "Email" },
        { id: 3, label: "Your details" },
        { id: STEP_LANGUAGE, label: "Language" },
        { id: 5, label: "Profile" },
        { id: 6, label: "Location" },
      ];
    }
    if (isMedicalProfessional === true) {
      return [
        { id: 1, label: "Get started" },
        { id: 2, label: "Email" },
        { id: 3, label: "Your details" },
        { id: STEP_LANGUAGE, label: "Language" },
        { id: 5, label: "Professional Info" },
        { id: 6, label: "ORCID" },
        { id: 7, label: "Specialty" },
        { id: 8, label: "Location" },
      ];
    }
    return [
      { id: 1, label: "Get started" },
      { id: 2, label: "Email" },
      { id: 3, label: "Your details" },
      { id: STEP_LANGUAGE, label: "Language" },
      { id: 5, label: "Conditions" },
      { id: 6, label: "Location" },
    ];
  };
  const steps = getSteps();
  const lastStepId = steps[steps.length - 1].id; // 5 for patient, 6 for researcher
  const onboardingRole =
    isMedicalProfessional === null
      ? null
      : isMedicalProfessional
        ? "researcher"
        : "patient";

  const buildOnboardingDraft = () => ({
    onboardingFlowVersion: ONBOARDING_FLOW_VERSION,
    step,
    maxStepReached,
    isMedicalProfessional,
    aboutYourself,
    aboutYourselfDetail,
    isAcademicResearcher,
    firstName,
    lastName,
    handle,
    preferredLanguage: normalizeLocale(preferredLanguage),
    email,
    conditions,
    symptomsText,
    profession,
    academicRank,
    institutionAffiliation,
    educationEntries,
    primarySpecialty,
    subspecialties,
    researchInterests,
    skills,
    location,
    orcid,
    hasOrcid,
    verificationDocumentUrl,
  });

  const persistOnboardingDraft = () => {
    sessionStorage.setItem(
      ONBOARDING_DRAFT_KEY,
      JSON.stringify(buildOnboardingDraft()),
    );
  };

  const clearStoredOnboardingState = () => {
    sessionStorage.removeItem(ONBOARDING_DRAFT_KEY);
    localStorage.removeItem("auth0_pending_onboarding");
    localStorage.removeItem("orcid_data");
  };

  const restoreOnboardingDraft = (draft) => {
    if (!draft || typeof draft !== "object") return;
    if (draft.isMedicalProfessional != null)
      setIsMedicalProfessional(draft.isMedicalProfessional);
    if (typeof draft.aboutYourself === "string")
      setAboutYourself(draft.aboutYourself);
    if (typeof draft.aboutYourselfDetail === "string")
      setAboutYourselfDetail(draft.aboutYourselfDetail);
    if (draft.isAcademicResearcher != null)
      setIsAcademicResearcher(draft.isAcademicResearcher);
    if (typeof draft.firstName === "string") setFirstName(draft.firstName);
    if (typeof draft.lastName === "string") setLastName(draft.lastName);
    if (typeof draft.handle === "string") setHandle(draft.handle);
    if (typeof draft.preferredLanguage === "string")
      setPreferredLanguage(normalizeLocale(draft.preferredLanguage));
    if (typeof draft.email === "string") setEmail(draft.email);
    if (Array.isArray(draft.conditions)) setConditions(draft.conditions);
    if (typeof draft.symptomsText === "string")
      setSymptomsText(draft.symptomsText);
    if (typeof draft.profession === "string") setProfession(draft.profession);
    if (typeof draft.academicRank === "string")
      setAcademicRank(draft.academicRank);
    if (typeof draft.institutionAffiliation === "string")
      setInstitutionAffiliation(draft.institutionAffiliation);
    if (Array.isArray(draft.educationEntries))
      setEducationEntries(draft.educationEntries);
    if (typeof draft.primarySpecialty === "string")
      setPrimarySpecialty(draft.primarySpecialty);
    if (Array.isArray(draft.subspecialties))
      setSubspecialties(draft.subspecialties);
    if (Array.isArray(draft.researchInterests))
      setResearchInterests(draft.researchInterests);
    if (Array.isArray(draft.skills)) setSkills(draft.skills);
    if (typeof draft.location === "string") setLocation(draft.location);
    if (typeof draft.orcid === "string") setOrcid(draft.orcid);
    if (draft.hasOrcid !== undefined) setHasOrcid(draft.hasOrcid);
    if (typeof draft.verificationDocumentUrl === "string")
      setVerificationDocumentUrl(draft.verificationDocumentUrl);
    if (draft.step) setStep(draft.step);
    if (draft.maxStepReached) setMaxStepReached(draft.maxStepReached);
  };

  const buildAuth0OnboardingData = () => ({
    role: onboardingRole || "patient",
    preferredLanguage: normalizeLocale(preferredLanguage),
    conditions: getCombinedConditions(conditions, symptomsText),
    location: location.trim() ? getLocationData() : undefined,
    profession: profession || undefined,
    academicRank: academicRank || undefined,
    institutionAffiliation: institutionAffiliation || undefined,
    primarySpecialty: primarySpecialty || undefined,
    subspecialties,
    researchInterests,
    educationEntries,
    skills,
    isAcademicResearcher,
    orcid: orcid || undefined,
    verificationDocumentUrl: verificationDocumentUrl || undefined,
  });

  const getExistingEmailMessage = (availability) => {
    if (availability?.isOAuthUser) {
      return "This email already has an account created with social sign-in. Please use that sign-in method instead.";
    }
    return "This email already has an account. Please sign in instead.";
  };

  const checkEmailAvailability = async () => {
    if (!isValidEmail(email.trim()) || !onboardingRole) {
      return { exists: false };
    }

    const params = new URLSearchParams({
      email: email.trim().toLowerCase(),
      role: onboardingRole,
    });
    const response = await fetch(
      `${base}/api/auth/check-email-availability?${params.toString()}`,
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Could not verify this email right now.");
    }

    return data;
  };

  const ensureResearcherAccountForOrcid = async () => {
    const existingToken = localStorage.getItem("token");
    const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (existingToken && (existingUser._id || existingUser.id)) {
      return { token: existingToken, user: existingUser };
    }

    if (!email.trim()) {
      throw new Error("Please enter your email before connecting ORCID.");
    }
    if (!password.trim()) {
      throw new Error("Please choose a password before connecting ORCID.");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    const username =
      `${firstName} ${lastName}`.trim() || email.split("@")[0] || "User";
    const handleValue =
      (username.replace(/\s+/g, "").toLowerCase() || "user") +
      "_" +
      Math.random().toString(36).slice(2, 8);
    const medicalInterests = [
      primarySpecialty,
      ...subspecialties,
      ...researchInterests,
    ].filter(Boolean);

    const registerRes = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getGuestDeviceIdHeaders(),
      },
      body: JSON.stringify({
        username,
        email: email.trim(),
        password,
        role: "researcher",
        medicalInterests,
        handle: handleValue,
        preferredLanguage: normalizeLocale(preferredLanguage),
      }),
    });
    const registerData = await registerRes.json().catch(() => ({}));

    if (!registerRes.ok) {
      const alreadyExists =
        registerRes.status === 409 ||
        /already exists/i.test(registerData.error || "");

      if (!alreadyExists) {
        throw new Error(
          registerData.error ||
            "Could not save your account before ORCID connection.",
        );
      }

      const loginRes = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role: "researcher",
        }),
      });
      const loginData = await loginRes.json().catch(() => ({}));

      if (!loginRes.ok) {
        throw new Error(
          loginData.error ||
            registerData.error ||
            "Could not resume your researcher account for ORCID connection.",
        );
      }

      const resumedUser = {
        ...loginData.user,
        username: loginData.user?.username || username,
        handle: loginData.user?.handle || handleValue,
        role: "researcher",
      };
      if (resumedUser.emailVerified !== false)
        resumedUser.emailVerified = false;
      localStorage.setItem("token", loginData.token);
      localStorage.setItem("user", JSON.stringify(resumedUser));
      return { token: loginData.token, user: resumedUser };
    }

    const newUser = {
      ...registerData.user,
      username,
      handle: handleValue,
      role: "researcher",
    };
    if (newUser.emailVerified !== false) newUser.emailVerified = false;
    localStorage.setItem("token", registerData.token);
    localStorage.setItem("user", JSON.stringify(newUser));
    return { token: registerData.token, user: newUser };
  };

  const goToStep = (nextStep) => {
    startTransition(() => setStep(nextStep));
  };

  const handleAboutSelfSelect = (option) => {
    setAboutYourself(option.id);
    setIsMedicalProfessional(option.researcher);
    if (option.id !== "other") {
      setAboutYourselfDetail("");
      goToStep(STEP_EMAIL);
    }
  };

  useEffect(() => {
    if (step > maxStepReached) setMaxStepReached(step);
  }, [step, maxStepReached]);

  const refreshUsernameSuggestions = () =>
    setUsernameSuggestions(generateUniqueUsernames(3, false));
  const stepVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
  };

  const getLocationData = () => {
    if (!location.trim()) return undefined;
    const parts = location
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2)
      return { city: parts[0], country: parts[parts.length - 1] };
    return { city: parts[0], country: parts[0] };
  };
  const updateEducationEntry = (idx, field, value) =>
    setEducationEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );
  const addEducationEntry = () =>
    setEducationEntries((prev) => [
      ...prev,
      { institution: "", degree: "", field: "", year: "" },
    ]);
  const removeEducationEntry = (idx) =>
    setEducationEntries((prev) => prev.filter((_, i) => i !== idx));
  const [customSubspecialty, setCustomSubspecialty] = useState("");
  const handleSubspecialtySelect = (val) => {
    if (val === "__other__") {
      setSubspecialtySelectValue("__other__");
      return;
    }
    if (val && !subspecialties.includes(val))
      setSubspecialties((prev) => [...prev, val]);
    setSubspecialtySelectValue("");
  };
  const addCustomSubspecialty = () => {
    const v = customSubspecialty.trim();
    if (v && !subspecialties.includes(v))
      setSubspecialties((prev) => [...prev, v]);
    setCustomSubspecialty("");
    setSubspecialtySelectValue("");
  };
  const removeSubspecialty = (s) =>
    setSubspecialties((prev) => prev.filter((x) => x !== s));
  const toggleSkill = (s) =>
    setSkills((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  const handleResearchInterestSubmit = (term) => {
    const t = capitalizeText((term || researchInterestInput).trim());
    if (t && !researchInterests.includes(t)) {
      setResearchInterests((prev) => [...prev, t]);
      setResearchInterestInput("");
    }
  };
  const toggleResearchInterest = (t) =>
    setResearchInterests((prev) => prev.filter((x) => x !== t));

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

  const looksLikeSymptom = (trimmed) =>
    symptomKeywords.some((keyword) =>
      trimmed.toLowerCase().includes(keyword),
    ) || trimmed.length > 15;

  const handleConditionSubmit = (val) => {
    const canonical = resolveToCanonical(
      (val || conditionInput || "").trim(),
      conditionsCanonicalMap,
    );
    if (!canonical) return;
    const key = buildNormalizedKey(canonical);
    const alreadyAdded = conditions.some((c) => buildNormalizedKey(c) === key);
    if (!alreadyAdded) {
      setConditions((prev) => [...prev, canonical].slice(0, 15));
      setConditionInput("");
      setIdentifiedConditions((prev) =>
        prev.filter((c) => buildNormalizedKey(c) !== key),
      );
    }
  };

  async function extractConditions(text) {
    if (!text || text.length < 5) return;
    setIsExtracting(true);
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
          const newC = canonicalConditions.filter((c) => !seenKey(prev, c));
          return [...prev, ...newC];
        });
        setConditions((prev) => {
          const newC = canonicalConditions.filter((c) => !seenKey(prev, c));
          return [...prev, ...newC].slice(0, 15);
        });
        setConditionInput("");
      }
    } catch (e) {
      console.error("Condition extraction failed", e);
    } finally {
      setIsExtracting(false);
    }
  }
  // ORCID OAuth connect
  const handleOrcidConnect = async () => {
    setOrcidConnecting(true);
    setError("");
    try {
      if (onboardingRole === "researcher") {
        await ensureResearcherAccountForOrcid();
      }

      persistOnboardingDraft();
      const response = await fetch(`${base}/api/orcid/auth`);
      const data = await response.json();
      if (data.authUrl) {
        localStorage.setItem("orcid_state", data.state);
        window.location.href = data.authUrl;
      } else {
        throw new Error("Failed to get ORCID authorization URL");
      }
    } catch (err) {
      console.error("Error initiating ORCID OAuth:", err);
      setError("Failed to connect to ORCID. Please try again.");
      setOrcidConnecting(false);
    }
  };

  async function handleVerificationDocumentUpload(file) {
    if (!file) return;

    setUploadingVerification(true);
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      setVerificationDocument(file);
      setUploadingVerification(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch(`${base}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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

  async function uploadVerificationDocumentAfterAuth(file, token) {
    if (!file || !token) return null;

    try {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch(`${base}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload verification document");
      }

      if (data.files && data.files.length > 0) {
        return data.files[0].url;
      }
      throw new Error("No file URL returned from upload");
    } catch (err) {
      console.error("Error uploading verification document:", err);
      throw err;
    }
  }

  function handleVerificationFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
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
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      handleVerificationDocumentUpload(file);
    }
  }

  // Restore form after ORCID callback
  useEffect(() => {
    const orcidSuccess = searchParams.get("orcid_success");
    if (orcidSuccess !== "true") return;
    try {
      const orcidRaw = localStorage.getItem("orcid_data");
      const draftRaw = sessionStorage.getItem(ONBOARDING_DRAFT_KEY);
      const draft = draftRaw
        ? migrateOnboardingDraftIfNeeded(JSON.parse(draftRaw))
        : null;
      if (orcidRaw) {
        const { orcid: orcidId, profile } = JSON.parse(orcidRaw);
        if (draft) {
          restoreOnboardingDraft(draft);
          setStep(draft.step || STEP_RESEARCHER_ORCID);
          setMaxStepReached(
            Math.max(
              draft.maxStepReached || STEP_RESEARCHER_ORCID,
              STEP_RESEARCHER_ORCID,
            ),
          );
        } else {
          setStep(STEP_RESEARCHER_ORCID);
          setMaxStepReached(STEP_RESEARCHER_ORCID);
        }
        // Apply the ORCID returned from OAuth after draft restore so a stale
        // pre-auth draft value cannot overwrite the connected ORCID.
        setOrcid(orcidId);
        setHasOrcid(true);
        if (profile) {
          if (
            profile.affiliation?.trim() &&
            profile.affiliation.trim() !==
              (draft?.institutionAffiliation || institutionAffiliation)
          ) {
            setOrcidSuggestedInstitution(profile.affiliation.trim());
          }
          if (
            profile.researchInterests?.length &&
            researchInterests.length === 0
          ) {
            setResearchInterests(profile.researchInterests.slice(0, 5));
          }
          if (profile.educations?.length && !draft?.educationEntries?.length) {
            setEducationEntries(
              profile.educations.slice(0, 3).map((edu) => ({
                institution: edu.organization || "",
                degree: edu.degree || "",
                field: edu.department || "",
                year: edu.endDate ? edu.endDate.split("-")[0] : "",
              })),
            );
          }
        }
        localStorage.removeItem("orcid_data");
      }
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("orcid_success");
      navigate(`/onboarding?${newParams.toString()}`, { replace: true });
    } catch (e) {
      console.error("Failed to parse ORCID data:", e);
    }
  }, [searchParams]);

  const handleUseMyLocation = async () => {
    setLocationLoading(true);
    setLocationError("");
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      const parts = [data.city, data.country_name].filter(Boolean);
      if (parts.length > 0) setLocation(parts.join(", "));
    } catch (e) {
      setLocationError("Could not detect location.");
    } finally {
      setLocationLoading(false);
    }
  };

  // Auto-detect location when user lands on the location step
  const locationStepId =
    isMedicalProfessional === true
      ? STEP_RESEARCHER_LOCATION
      : STEP_PATIENT_LOCATION;
  useEffect(() => {
    if (step === locationStepId && !location.trim() && !locationLoading) {
      handleUseMyLocation();
    }
  }, [step, locationStepId]);

  const icd11Suggestions = useMemo(() => {
    const s = new Set();
    if (Array.isArray(icd11Dataset))
      icd11Dataset.forEach((item) => {
        if (item.display_name) s.add(item.display_name.trim());
        (item.patient_terms || []).forEach((t) => {
          if (typeof t === "string" && t.trim() && !/icd|icd11/i.test(t))
            s.add(t.trim());
        });
      });
    return Array.from(s);
  }, []);

  const addCondition = (value) => {
    const canonical = resolveToCanonical(
      (value || "").trim(),
      conditionsCanonicalMap,
    );
    if (!canonical) return;
    const key = buildNormalizedKey(canonical);
    if (conditions.some((c) => buildNormalizedKey(c) === key)) return;
    setConditions((prev) => [...prev, canonical].slice(0, 10));
    setConditionInput("");
  };

  const removeCondition = (index) => {
    const removed = conditions[index];
    setConditions((prev) => prev.filter((_, i) => i !== index));
    if (removed)
      setIdentifiedConditions((prev) => prev.filter((c) => c !== removed));
  };

  const isProfileComplete = (role) => {
    if (role === "patient") {
      const combined = getCombinedConditions(conditions, symptomsText);
      const loc = getLocationData();
      return combined.length > 0 && loc && (loc.city || loc.country);
    }
    const specs = [primarySpecialty, ...subspecialties].filter(Boolean);
    const loc = getLocationData();
    return (
      specs.length > 0 &&
      researchInterests.length > 0 &&
      loc &&
      (loc.city || loc.country)
    );
  };

  const markOnboardingComplete = async (userId, token, complete) => {
    const response = await fetch(
      `${base}/api/profile/${userId}/onboarding-complete`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ complete }),
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to finish onboarding.");
    }

    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    stored.onboardingComplete = complete;
    localStorage.setItem("user", JSON.stringify(stored));
  };

  const handleEnterPlatform = async () => {
    setError("");
    setLoading(true);
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user._id || user.id;

    if (token && userId) {
      try {
        let finalVerificationDocumentUrl = verificationDocumentUrl;
        if (verificationDocument && !verificationDocumentUrl) {
          try {
            finalVerificationDocumentUrl =
              await uploadVerificationDocumentAfterAuth(
                verificationDocument,
                token,
              );
          } catch (err) {
            console.error("Failed to upload verification document:", err);
          }
        }

        const locationData = getLocationData();
        const selectedRole = onboardingRole || user?.role || "patient";
        const role =
          user?.onboardingComplete === true
            ? user?.role || selectedRole
            : selectedRole;
        const profile =
          role === "patient"
            ? {
                role: "patient",
                patient: {
                  conditions: getCombinedConditions(conditions, symptomsText),
                  location: locationData,
                },
              }
            : {
                role: "researcher",
                researcher: {
                  profession: profession || undefined,
                  academicRank: academicRank || undefined,
                  institutionAffiliation: institutionAffiliation || undefined,
                  specialties: [primarySpecialty, ...subspecialties].filter(
                    Boolean,
                  ),
                  interests: researchInterests,
                  skills,
                  location: locationData,
                  education:
                    educationEntries.filter(
                      (e) => e.institution || e.degree || e.field || e.year,
                    ).length > 0
                      ? educationEntries
                      : undefined,
                  isAcademicResearcher,
                  orcid: orcid || undefined,
                  verificationDocumentUrl:
                    finalVerificationDocumentUrl || undefined,
                },
              };
        const profileRes = await fetch(`${base}/api/profile/${userId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(profile),
        });
        if (!profileRes.ok) {
          const profileData = await profileRes.json().catch(() => ({}));
          throw new Error(profileData.error || "Failed to save your profile.");
        }
        const lang = normalizeLocale(preferredLanguage);
        const langRes = await fetch(`${base}/api/users/me/language`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ preferredLanguage: lang }),
        });
        let mergedUser = { ...user, role };
        if (langRes.ok) {
          const langBody = await langRes.json().catch(() => ({}));
          if (langBody.user) mergedUser = { ...mergedUser, ...langBody.user };
          else mergedUser = { ...mergedUser, preferredLanguage: lang };
        } else {
          mergedUser = { ...mergedUser, preferredLanguage: lang };
        }
        await markOnboardingComplete(userId, token, isProfileComplete(role));
        const finalUser = {
          ...mergedUser,
          onboardingComplete: isProfileComplete(role),
        };
        localStorage.setItem("user", JSON.stringify(finalUser));
        syncI18nFromUser(finalUser);
        clearStoredOnboardingState();
        window.dispatchEvent(new Event("login"));
        navigate("/yori");
      } catch (e) {
        console.error(e);
        setError(e.message || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      setLoading(false);
      return;
    }
    if (!password.trim()) {
      setError("Please choose a password (min 6 characters).");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const username =
        `${firstName} ${lastName}`.trim() || email.split("@")[0] || "User";
      const generatedHandle =
        (username.replace(/\s+/g, "").toLowerCase() || "user") +
        "_" +
        Math.random().toString(36).slice(2, 8);
      const handleValue =
        isMedicalProfessional === false
          ? handle.trim() || generatedHandle
          : generatedHandle;
      const combined = getCombinedConditions(conditions, symptomsText);
      const locationData = getLocationData();
      const role = isMedicalProfessional ? "researcher" : "patient";
      const medicalInterests = isMedicalProfessional
        ? [primarySpecialty, ...subspecialties, ...researchInterests].filter(
            Boolean,
          )
        : combined;

      const res = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getGuestDeviceIdHeaders(),
        },
        body: JSON.stringify({
          username,
          email: email.trim(),
          password,
          role,
          medicalInterests,
          handle: handleValue,
          preferredLanguage: normalizeLocale(preferredLanguage),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (
          /already exists/i.test(data.error || "") ||
          /email already exists/i.test(data.error || "")
        ) {
          setStep(STEP_EMAIL);
          setMaxStepReached(Math.max(maxStepReached, STEP_EMAIL));
          setError(
            "This email already has an account. Please sign in instead.",
          );
          setLoading(false);
          return;
        }
        setError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }

      const newUser = {
        ...data.user,
        username,
        handle: handleValue,
        role: role,
        preferredLanguage:
          data.user?.preferredLanguage ||
          normalizeLocale(preferredLanguage),
      };
      if (newUser.emailVerified !== false) newUser.emailVerified = false;
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(newUser));
      syncI18nFromUser(newUser);

      let finalVerificationDocumentUrl = verificationDocumentUrl;
      if (verificationDocument && !verificationDocumentUrl && data.token) {
        try {
          finalVerificationDocumentUrl =
            await uploadVerificationDocumentAfterAuth(
              verificationDocument,
              data.token,
            );
        } catch (err) {
          console.error("Failed to upload verification document:", err);
        }
      }

      const profile =
        role === "patient"
          ? {
              role: "patient",
              patient: { conditions: combined, location: locationData },
            }
          : {
              role: "researcher",
              researcher: {
                profession,
                academicRank: academicRank || undefined,
                institutionAffiliation,
                specialties: [primarySpecialty, ...subspecialties].filter(
                  Boolean,
                ),
                interests: researchInterests,
                skills,
                location: locationData,
                education:
                  educationEntries.filter(
                    (e) => e.institution || e.degree || e.field || e.year,
                  ).length > 0
                    ? educationEntries
                    : undefined,
                isAcademicResearcher,
                orcid: orcid || undefined,
                verificationDocumentUrl:
                  finalVerificationDocumentUrl || undefined,
              },
            };
      const profileRes = await fetch(
        `${base}/api/profile/${newUser._id || newUser.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.token}`,
          },
          body: JSON.stringify(profile),
        },
      );
      if (!profileRes.ok) {
        const profileData = await profileRes.json().catch(() => ({}));
        throw new Error(profileData.error || "Failed to save your profile.");
      }

      await markOnboardingComplete(
        newUser._id || newUser.id,
        data.token,
        isProfileComplete(role),
      );
      clearStoredOnboardingState();
      window.dispatchEvent(new Event("login"));
      navigate("/yori");
    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignUp = async (provider) => {
    setError("");
    setSocialLoading(provider);
    persistOnboardingDraft();
    const onboardingData = buildAuth0OnboardingData();
    try {
      if (provider === "google")
        await loginWithGoogle({ onboardingData, screenHint: "signup" });
      else if (provider === "microsoft")
        await loginWithMicrosoft({ onboardingData, screenHint: "signup" });
      else if (provider === "facebook")
        await loginWithFacebook({ onboardingData, screenHint: "signup" });
      else if (provider === "apple")
        await loginWithApple({ onboardingData, screenHint: "signup" });
    } catch (e) {
      console.error(e);
      setError("Sign up failed. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const getPasswordStrength = (pw) => {
    if (!pw) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: "Weak", color: "#D0C4E2" };
    if (score <= 2) return { level: 2, label: "Fair", color: "#9B8BB4" };
    if (score <= 3) return { level: 3, label: "Good", color: "#6A5A96" };
    return { level: 4, label: "Strong", color: "#2F3C96" };
  };
  const passwordStrength = getPasswordStrength(password);
  const canGoNextFromEmail = isValidEmail(email.trim()) && password.length >= 6;

  // When returning from OAuth: restore medical choice and land on Name step so user fills in their details first
  useEffect(() => {
    if (!isOAuth) return;
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (token && (user._id || user.id)) {
      try {
        const draftRaw = sessionStorage.getItem(ONBOARDING_DRAFT_KEY);
        const draft = draftRaw
          ? migrateOnboardingDraftIfNeeded(JSON.parse(draftRaw))
          : null;

        if (draft) {
          restoreOnboardingDraft(draft);
          setStep(Math.max(draft.step || STEP_NAME, STEP_NAME));
          setMaxStepReached(
            Math.max(draft.maxStepReached || STEP_NAME, STEP_NAME),
          );
        } else {
          if (user.role === "researcher") setIsMedicalProfessional(true);
          else if (user.role === "patient") setIsMedicalProfessional(false);
          if (user.email) setEmail(user.email);
          setStep(STEP_NAME);
          setMaxStepReached(STEP_NAME);
        }
      } catch (e) {
        console.error("Failed to restore OAuth onboarding draft:", e);
        if (user.role === "researcher") setIsMedicalProfessional(true);
        else setIsMedicalProfessional(false);
        if (user.email) setEmail(user.email);
        setStep(STEP_NAME);
        setMaxStepReached(STEP_NAME);
      }
    }
  }, [isOAuth]);

  // Close username suggestions / skills dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showUsernameSuggestions &&
        !e.target.closest("[data-username-suggestions]")
      )
        setShowUsernameSuggestions(false);
      if (isSkillsDropdownOpen && !e.target.closest("[data-skills-dropdown]"))
        setIsSkillsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUsernameSuggestions, isSkillsDropdownOpen]);

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <div className="w-full max-w-lg">
            {/* Progress */}
            <div className="flex justify-center gap-1.5 mb-4">
              {steps.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => s.id <= maxStepReached && goToStep(s.id)}
                  className="h-1 flex-1 max-w-12 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      step >= s.id ? "#2F3C96" : "rgba(47, 60, 150, 0.2)",
                  }}
                  aria-label={`Step ${s.id}`}
                />
              ))}
            </div>

            {/* Above the card: A few quick details (step 3 onwards) */}
            {step >= 3 && (
              <div className="w-full max-w-md mx-auto mb-4 text-center">
                <h2
                  className="text-xl sm:text-2xl font-bold tracking-tight"
                  style={{ color: "#2F3C96" }}
                >
                  A few quick details
                </h2>
                <p
                  className="mt-1.5 text-sm sm:text-base"
                  style={{ color: "#787878" }}
                >
                  This’ll only take about 2 minutes — we’ll keep it short.
                </p>
              </div>
            )}

            <div
              className="rounded-xl shadow-lg border p-5 sm:p-6 space-y-5"
              style={{
                backgroundColor: "rgba(255,255,255,0.98)",
                borderColor: "#D0C4E2",
                boxShadow: "0 12px 40px rgba(208, 196, 226, 0.2)",
              }}
            >
              <AnimatePresence mode="wait">
                {/* Step 1: Tell us about yourself */}
                {step === STEP_MEDICAL && (
                  <motion.div
                    key="step1"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <h1
                      className="text-xl sm:text-2xl font-bold text-center"
                      style={{ color: "#2F3C96" }}
                    >
                      Tell us about yourself
                    </h1>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ABOUT_SELF_OPTIONS.map((option) => {
                        const selected = aboutYourself === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleAboutSelfSelect(option)}
                            className="relative flex min-h-[2.75rem] items-center justify-center rounded-lg border px-2 py-2 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                              borderColor: selected ? "#2F3C96" : "#D0C4E2",
                              backgroundColor: selected
                                ? "rgba(47, 60, 150, 0.10)"
                                : "rgba(47, 60, 150, 0.03)",
                              color: "#2F3C96",
                            }}
                          >
                            {selected && (
                              <span
                                className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full"
                                style={{ backgroundColor: "#2F3C96" }}
                                aria-hidden
                              >
                                <CheckCircle className="h-2.5 w-2.5 text-white" />
                              </span>
                            )}
                            <span className="text-[11px] font-semibold leading-tight sm:text-xs">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {aboutYourself === "other" && (
                      <div className="space-y-2 pt-0.5">
                        <Input
                          value={aboutYourselfDetail}
                          onChange={(e) =>
                            setAboutYourselfDetail(e.target.value)
                          }
                          placeholder="Please specify (optional)"
                          className="!text-sm h-9 w-full rounded-lg border px-3"
                          style={{ borderColor: "#D0C4E2", color: "#2F3C96" }}
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          className="w-full"
                          onClick={() => goToStep(STEP_EMAIL)}
                        >
                          Continue
                        </Button>
                      </div>
                    )}
                    <div className="-mx-5 sm:-mx-6 -mb-5 sm:-mb-6 mt-6 overflow-hidden rounded-b-xl">
                      <Link
                        to="/signin"
                        className="group flex w-full cursor-pointer flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4 no-underline border-t border-[#D0C4E2] shadow-[inset_0_-4px_0_0_#1c2459] transition-all duration-200 hover:brightness-[1.03] active:brightness-[0.98] active:scale-[0.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2F3C96]"
                        style={{
                          backgroundColor: "#2F3C96",
                          color: "#FFFFFF",
                        }}
                        aria-label="Already have an account? Sign in"
                      >
                        <span className="text-center text-sm font-medium text-white/90 sm:text-left">
                          Already have an account?
                        </span>
                        <span
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/12 px-5 py-2.5 text-[13px] font-bold uppercase tracking-wider text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all group-hover:border-white/55 group-hover:bg-white/18 group-active:bg-white/10"
                          aria-hidden
                        >
                          Sign in
                          <ChevronRight
                            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </span>
                      </Link>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: EMAIL (first, before name) */}
                {step === STEP_EMAIL && (
                  <motion.div
                    key="stepEmail"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <h1
                      className="text-xl sm:text-2xl font-bold text-center"
                      style={{ color: "#2F3C96" }}
                    >
                      Enter your email
                    </h1>
                    <p
                      className="text-sm text-center"
                      style={{ color: "#787878" }}
                    >
                      We’ll use this for your account.
                    </p>

                    {/* Sign up with — OAuth buttons above email (logo + name per button) */}
                    {isAuth0Configured && (
                      <>
                        <p
                          className="text-center text-sm font-semibold"
                          style={{ color: "#2F3C96" }}
                        >
                          Sign up with
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { id: "google", label: "Google", Logo: GoogleLogo },
                            {
                              id: "microsoft",
                              label: "Microsoft",
                              Logo: MicrosoftLogo,
                            },
                            {
                              id: "facebook",
                              label: "Facebook",
                              Logo: FacebookLogo,
                            },
                            { id: "apple", label: "Apple", Logo: AppleLogo },
                          ].map(({ id, label, Logo }) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!!socialLoading}
                              onClick={() => handleSocialSignUp(id)}
                              className="py-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                              style={{
                                borderColor: "#D0C4E2",
                                color: "#2F3C96",
                              }}
                              title={label}
                            >
                              {socialLoading === id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Logo />
                              )}
                              <span
                                className="text-xs font-semibold"
                                style={{ color: "#2F3C96" }}
                              >
                                {label}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="relative my-2">
                          <div className="absolute inset-0 flex items-center">
                            <div
                              className="w-full border-t"
                              style={{ borderColor: "#E8E8E8" }}
                            />
                          </div>
                          <div className="relative flex justify-center">
                            <span
                              className="px-3 text-sm bg-white"
                              style={{ color: "#787878" }}
                            >
                              or
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          Email
                        </label>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full py-3 px-4 text-base border rounded-xl focus:outline-none focus:ring-2"
                          style={{
                            borderColor:
                              email && !isValidEmail(email.trim())
                                ? "#EF4444"
                                : "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                        {email && !isValidEmail(email.trim()) && (
                          <p
                            className="text-xs mt-1"
                            style={{ color: "#EF4444" }}
                          >
                            Please enter a valid email address
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
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
                            className="w-full py-3 px-4 pr-11 text-base border rounded-xl focus:outline-none focus:ring-2"
                            style={{
                              borderColor: "#E8E8E8",
                              color: "#2F3C96",
                              "--tw-ring-color": "#D0C4E2",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 transition-colors"
                            style={{ color: "#787878" }}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <Eye className="w-5 h-5" />
                            ) : (
                              <EyeOff className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        {password && (
                          <div className="mt-2 space-y-1">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4].map((i) => (
                                <div
                                  key={i}
                                  className="h-1 flex-1 rounded-full transition-colors"
                                  style={{
                                    backgroundColor:
                                      i <= passwordStrength.level
                                        ? passwordStrength.color
                                        : "#E8E8E8",
                                  }}
                                />
                              ))}
                            </div>
                            <p
                              className="text-xs font-medium"
                              style={{ color: passwordStrength.color }}
                            >
                              {passwordStrength.label}
                              {password.length < 6
                                ? " — must be at least 6 characters"
                                : ""}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      By signing up, you agree to our{" "}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline hover:opacity-80"
                        style={{ color: "#2F3C96" }}
                      >
                        Terms &amp; Conditions
                      </a>{" "}
                      and{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline hover:opacity-80"
                        style={{ color: "#2F3C96" }}
                      >
                        Privacy Policy
                      </a>
                      .
                    </p>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => goToStep(STEP_MEDICAL)}
                        className="py-3 px-5 rounded-xl font-semibold text-base border"
                        style={{
                          borderColor: "#2F3C96",
                          color: "#2F3C96",
                          backgroundColor: "transparent",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => {
                          if (!canGoNextFromEmail) return;

                          setCheckingEmail(true);
                          setError("");
                          checkEmailAvailability()
                            .then((availability) => {
                              if (availability.exists) {
                                setError(getExistingEmailMessage(availability));
                                return;
                              }
                              goToStep(STEP_NAME);
                            })
                            .catch((e) => {
                              setError(
                                e.message ||
                                  "Could not verify this email right now.",
                              );
                            })
                            .finally(() => {
                              setCheckingEmail(false);
                            });
                        }}
                        disabled={
                          !isValidEmail(email.trim()) ||
                          password.length < 6 ||
                          checkingEmail
                        }
                        className="flex-1 py-3 rounded-xl font-semibold text-base disabled:opacity-50"
                        style={{ backgroundColor: "#2F3C96", color: "#fff" }}
                      >
                        {checkingEmail ? "Checking..." : "Continue"}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: NAME (compulsory) */}
                {step === STEP_NAME && (
                  <motion.div
                    key="stepName"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full py-3 px-4 text-base border rounded-xl focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full py-3 px-4 text-base border rounded-xl focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>
                    </div>
                    {isMedicalProfessional === false && (
                      <div className="space-y-2">
                        <label
                          className="block text-sm font-semibold"
                          style={{ color: "#2F3C96" }}
                        >
                          Username <span className="text-red-500">*</span>
                        </label>
                        <div className="relative" data-username-suggestions>
                          <Input
                            placeholder="@username or pick one below"
                            value={handle}
                            onChange={(e) => {
                              const v = e.target.value.replace(/^@+/, "");
                              setHandle(v);
                              setShowUsernameSuggestions(v.length === 0);
                            }}
                            onFocus={() => setShowUsernameSuggestions(true)}
                            className="w-full py-3 px-4 text-base border rounded-xl focus:outline-none focus:ring-2"
                            style={{
                              borderColor: "#E8E8E8",
                              color: "#2F3C96",
                              "--tw-ring-color": "#D0C4E2",
                            }}
                          />
                          {showUsernameSuggestions &&
                            usernameSuggestions.length > 0 && (
                              <div
                                className="absolute z-10 w-full mt-1.5 bg-white border rounded-xl shadow-lg py-3 px-3"
                                style={{ borderColor: "#E8E8E8" }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span
                                    className="text-sm font-semibold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    Suggested usernames
                                  </span>
                                  <button
                                    type="button"
                                    onClick={refreshUsernameSuggestions}
                                    className="flex items-center gap-1 text-sm"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    <RefreshCw className="w-4 h-4" /> Refresh
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {usernameSuggestions.map((s, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => {
                                        setHandle(s);
                                        setShowUsernameSuggestions(false);
                                      }}
                                      className="px-3 py-2 text-sm font-medium rounded-lg"
                                      style={{
                                        backgroundColor:
                                          "rgba(47, 60, 150, 0.12)",
                                        color: "#2F3C96",
                                      }}
                                    >
                                      @{s}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowUsernameSuggestions(false)
                                  }
                                  className="text-sm hover:underline"
                                  style={{ color: "#787878" }}
                                >
                                  Hide suggestions
                                </button>
                              </div>
                            )}
                        </div>
                        <p className="text-sm" style={{ color: "#787878" }}>
                          Username will be public.
                        </p>
                      </div>
                    )}
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => goToStep(STEP_EMAIL)}
                        className="py-3 px-5 rounded-xl font-semibold text-base border"
                        style={{
                          borderColor: "#2F3C96",
                          color: "#2F3C96",
                          backgroundColor: "transparent",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() =>
                          firstName?.trim() &&
                          lastName?.trim() &&
                          (isMedicalProfessional !== false || handle?.trim()) &&
                          goToStep(STEP_LANGUAGE)
                        }
                        disabled={
                          !firstName?.trim() ||
                          !lastName?.trim() ||
                          (isMedicalProfessional === false && !handle?.trim())
                        }
                        className="flex-1 py-3 rounded-xl font-semibold text-base disabled:opacity-50"
                        style={{ backgroundColor: "#2F3C96", color: "#fff" }}
                      >
                        Continue
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Language (all paths) */}
                {step === STEP_LANGUAGE && (
                  <motion.div
                    key="stepLanguage"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <h1
                      className="text-xl sm:text-2xl font-bold text-center"
                      style={{ color: "#2F3C96" }}
                    >
                      Choose your language
                    </h1>
                    <p
                      className="text-sm text-center"
                      style={{ color: "#787878" }}
                    >
                      This sets the language for the Collabiora site and emails.
                      You can change it anytime in settings.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {LOCALE_SELECTOR_OPTIONS.map(({ code, label }) => {
                        const selected = preferredLanguage === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              const lng = normalizeLocale(code);
                              setPreferredLanguage(lng);
                              void i18n.changeLanguage(lng);
                              applyDocumentLanguageAndDir(lng);
                            }}
                            className="rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors"
                            style={{
                              borderColor: selected ? "#2F3C96" : "#E8E8E8",
                              backgroundColor: selected
                                ? "rgba(47, 60, 150, 0.1)"
                                : "#fff",
                              color: "#2F3C96",
                              boxShadow: selected
                                ? "0 0 0 2px rgba(47, 60, 150, 0.25)"
                                : undefined,
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => goToStep(STEP_NAME)}
                        className="py-3 px-5 rounded-xl font-semibold text-base border"
                        style={{
                          borderColor: "#2F3C96",
                          color: "#2F3C96",
                          backgroundColor: "transparent",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={() =>
                          goToStep(
                            isMedicalProfessional === true
                              ? STEP_RESEARCHER_PROFESSIONAL
                              : STEP_PATIENT_CONDITIONS,
                          )
                        }
                        className="flex-1 py-3 rounded-xl font-semibold text-base"
                        style={{ backgroundColor: "#2F3C96", color: "#fff" }}
                      >
                        Continue
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 5 Patient: Conditions */}
                {step === STEP_PATIENT_CONDITIONS &&
                  isMedicalProfessional === false && (
                  <motion.div
                    key="step4Patient"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <h1
                      className="text-xl sm:text-2xl font-bold text-center"
                      style={{ color: "#2F3C96" }}
                    >
                      Medical Conditions
                    </h1>
                    <div>
                      <div className="flex gap-2 items-stretch">
                        <div className="relative flex-1 min-w-0">
                          <SmartSearchInput
                            value={conditionInput}
                            onChange={setConditionInput}
                            onSubmit={(value) => {
                              if (!value?.trim()) return;
                              const trimmed = value.trim();
                              if (looksLikeSymptom(trimmed)) {
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
                            inputClassName="w-full py-3 px-4 text-base border rounded-xl"
                          />
                        </div>
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
                                if (looksLikeSymptom(trimmed))
                                  extractConditions(trimmed);
                                else handleConditionSubmit(trimmed);
                              }}
                              disabled={isExtracting}
                              className="px-4 py-3 rounded-xl text-sm font-semibold shrink-0"
                              style={{
                                backgroundColor: "#2F3C96",
                                color: "#fff",
                              }}
                            >
                              {isExtracting ? "..." : "Add"}
                            </Button>
                          )}
                      </div>
                      {conditions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {conditions.map((c, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border"
                              style={{
                                backgroundColor: "rgba(47, 60, 150, 0.1)",
                                borderColor: "#D0C4E2",
                                color: "#2F3C96",
                              }}
                            >
                              {c}
                              <button
                                type="button"
                                onClick={() => removeCondition(i)}
                                className="text-slate-500 hover:text-slate-700"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs mt-2" style={{ color: "#787878" }}>
                        You can describe symptoms if you're unsure of the
                        condition.
                      </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => goToStep(STEP_LANGUAGE)}
                        className="py-3 px-5 rounded-xl font-semibold border"
                        style={{
                          borderColor: "#2F3C96",
                          color: "#2F3C96",
                          backgroundColor: "transparent",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => goToStep(STEP_PATIENT_LOCATION)}
                        className="flex-1 py-3 rounded-xl font-semibold"
                        style={{ backgroundColor: "#2F3C96", color: "#fff" }}
                      >
                        Continue
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 5 Researcher: Professional Info */}
                {step === STEP_RESEARCHER_PROFESSIONAL &&
                  isMedicalProfessional === true && (
                  <motion.div
                    key="step4Researcher"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <h1
                      className="text-xl sm:text-2xl font-bold text-center"
                      style={{ color: "#2F3C96" }}
                    >
                      Professional Info
                    </h1>
                    <p
                      className="text-base text-center"
                      style={{ color: "#787878" }}
                    >
                      Help us customize your experience.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          Profession <span className="text-red-500">*</span>
                        </label>
                        <CustomSelect
                          value={profession}
                          onChange={setProfession}
                          optionGroups={professionOptions}
                          placeholder="Select profession"
                          variant="onboarding"
                          maxDropdownHeight={280}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          Academic Rank
                        </label>
                        <CustomSelect
                          value={academicRank}
                          onChange={setAcademicRank}
                          options={academicRankOptions}
                          placeholder="Select academic rank"
                          variant="onboarding"
                          maxDropdownHeight={240}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div>
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
                        location={location.trim() ? getLocationData() : null}
                        strict
                        allowManualFallback
                        placeholder="Search and select your institution"
                        maxSuggestions={10}
                        inputClassName="w-full py-3 px-4 text-base border rounded-xl"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-semibold mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        Education (optional)
                      </label>
                      {educationEntries.map((edu, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-2 gap-2 mb-2 p-3 border rounded-lg"
                          style={{ borderColor: "#E8E8E8" }}
                        >
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
                            className="py-2 px-3 text-sm"
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
                            className="py-2 px-3 text-sm"
                          />
                          <Input
                            placeholder="Field"
                            value={edu.field}
                            onChange={(e) =>
                              updateEducationEntry(idx, "field", e.target.value)
                            }
                            className="py-2 px-3 text-sm"
                          />
                          <Input
                            placeholder="Year"
                            value={edu.year}
                            onChange={(e) =>
                              updateEducationEntry(idx, "year", e.target.value)
                            }
                            className="py-2 px-3 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeEducationEntry(idx)}
                            className="text-xs text-red-600 col-span-2"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <Button
                        onClick={addEducationEntry}
                        className="text-sm py-2 px-3 rounded-lg"
                        style={{ backgroundColor: "#2F3C96", color: "#fff" }}
                      >
                        + Add Education
                      </Button>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => goToStep(STEP_LANGUAGE)}
                        className="py-3 px-5 rounded-xl font-semibold border"
                        style={{
                          borderColor: "#2F3C96",
                          color: "#2F3C96",
                          backgroundColor: "transparent",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => {
                          setError("");
                          goToStep(STEP_RESEARCHER_ORCID);
                        }}
                        className="flex-1 py-3 rounded-xl font-semibold"
                        style={{ backgroundColor: "#2F3C96", color: "#fff" }}
                      >
                        Continue
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 6 Researcher: Academic Researcher & ORCID */}
                {step === STEP_RESEARCHER_ORCID &&
                  isMedicalProfessional === true && (
                  <motion.div
                    key="step5Orcid"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <h1
                      className="text-xl sm:text-2xl font-bold text-center"
                      style={{ color: "#2F3C96" }}
                    >
                      Are you an academic researcher?
                    </h1>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setIsAcademicResearcher(false)}
                        className="py-4 rounded-xl border-2 font-semibold text-base transition-all hover:shadow-md"
                        style={{
                          borderColor:
                            isAcademicResearcher === false
                              ? "#2F3C96"
                              : "#D0C4E2",
                          backgroundColor:
                            isAcademicResearcher === false
                              ? "rgba(47, 60, 150, 0.08)"
                              : "#fff",
                          color: "#2F3C96",
                        }}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAcademicResearcher(true)}
                        className="py-4 rounded-xl border-2 font-semibold text-base transition-all hover:shadow-md"
                        style={{
                          borderColor:
                            isAcademicResearcher === true
                              ? "#2F3C96"
                              : "#D0C4E2",
                          backgroundColor:
                            isAcademicResearcher === true
                              ? "rgba(47, 60, 150, 0.08)"
                              : "#fff",
                          color: "#2F3C96",
                        }}
                      >
                        Yes
                      </button>
                    </div>

                    {isAcademicResearcher && (
                      <div
                        className="pt-2 border-t space-y-2"
                        style={{ borderColor: "#E8E8E8" }}
                      >
                        <label
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          ORCID ID
                          <span
                            className="text-xs font-normal ml-1"
                            style={{ color: "#787878" }}
                          >
                            (Required — connect or verify with ID)
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
                                Upload a verification document (ID, certificate,
                                or other proof of research credentials). Your
                                document will be reviewed by moderators.
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
                                      : "File selected. It will be uploaded when you finish onboarding."}
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
                                        Attach verification document
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
                              disabled={orcidConnecting}
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
                              {orcidConnecting
                                ? "Connecting..."
                                : "Connect with ORCID"}
                            </button>
                            <div className="flex items-center gap-2">
                              <div
                                className="flex-1 h-px"
                                style={{ backgroundColor: "#E8E8E8" }}
                              />
                              <span
                                className="text-[10px]"
                                style={{ color: "#787878" }}
                              >
                                OR
                              </span>
                              <div
                                className="flex-1 h-px"
                                style={{ backgroundColor: "#E8E8E8" }}
                              />
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
                              I don&apos;t have an ORCID ID
                            </button>
                            <p
                              className="text-[10px] text-center"
                              style={{ color: "#787878" }}
                            >
                              Authenticate with ORCID to link your research
                              profile, or upload ID verification above.
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
                            {orcidSuggestedInstitution &&
                              orcidSuggestedInstitution !==
                                institutionAffiliation && (
                                <div
                                  className="p-2 rounded-lg border text-xs"
                                  style={{
                                    borderColor: "#A6CE39",
                                    backgroundColor: "#F8FFF0",
                                  }}
                                >
                                  <span style={{ color: "#787878" }}>
                                    ORCID suggested:{" "}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInstitutionAffiliation(
                                        orcidSuggestedInstitution,
                                      );
                                      setOrcidSuggestedInstitution("");
                                    }}
                                    className="font-medium underline"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {orcidSuggestedInstitution}
                                  </button>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )}

                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => goToStep(STEP_RESEARCHER_PROFESSIONAL)}
                        className="py-3 px-5 rounded-xl font-semibold border"
                        style={{
                          borderColor: "#2F3C96",
                          color: "#2F3C96",
                          backgroundColor: "transparent",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => {
                          setError("");
                          if (
                            isAcademicResearcher &&
                            !orcid?.trim() &&
                            !verificationDocumentUrl?.trim() &&
                            !verificationDocument
                          ) {
                            setError(
                              "Please connect with ORCID or upload a verification document to continue.",
                            );
                            return;
                          }
                          goToStep(STEP_RESEARCHER_SPECIALTY);
                        }}
                        className="flex-1 py-3 rounded-xl font-semibold"
                        style={{ backgroundColor: "#2F3C96", color: "#fff" }}
                      >
                        Continue
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 6 Patient: Location */}
                {step === STEP_PATIENT_LOCATION &&
                  isMedicalProfessional === false && (
                  <motion.div
                    key="step5Patient"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <h1
                      className="text-xl sm:text-2xl font-bold text-center"
                      style={{ color: "#2F3C96" }}
                    >
                      Your Location
                    </h1>
                    {locationLoading && (
                      <div
                        className="flex items-center justify-center gap-2 py-2"
                        style={{ color: "#787878" }}
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">
                          Detecting your location…
                        </span>
                      </div>
                    )}
                    <div>
                      <label
                        className="block text-sm font-semibold mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        Location
                      </label>
                      <LocationInput
                        value={location}
                        onChange={setLocation}
                        mode="location"
                        inputClassName="w-full py-3 px-4 text-base border rounded-xl"
                        placeholder="Enter your city or country"
                      />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => goToStep(STEP_PATIENT_CONDITIONS)}
                        className="py-3 px-5 rounded-xl font-semibold border"
                        style={{
                          borderColor: "#2F3C96",
                          color: "#2F3C96",
                          backgroundColor: "transparent",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleEnterPlatform()}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50"
                        style={{ backgroundColor: "#2F3C96", color: "#fff" }}
                      >
                        {loading ? "Setting up…" : "Continue"}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 7 Researcher: Specialty */}
                {step === STEP_RESEARCHER_SPECIALTY &&
                  isMedicalProfessional === true && (
                  <motion.div
                    key="step6Researcher"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <h1
                      className="text-xl sm:text-2xl font-bold text-center"
                      style={{ color: "#2F3C96" }}
                    >
                      Specialty & Research
                    </h1>
                    <div>
                      <label
                        className="block text-sm font-semibold mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        Primary Specialty{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        value={primarySpecialty}
                        onChange={setPrimarySpecialty}
                        optionGroups={primarySpecialtyOptionGroups}
                        placeholder="Select primary specialty"
                        variant="onboarding"
                        searchable
                        searchPlaceholder="Search..."
                        maxDropdownHeight={280}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-semibold mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        Subspecialty (optional)
                      </label>
                      <CustomSelect
                        value={subspecialtySelectValue}
                        onChange={(v) => handleSubspecialtySelect(v)}
                        optionGroups={[
                          ...getSubspecialtyOptionGroups(primarySpecialty),
                          {
                            group: "Other",
                            options: [
                              {
                                value: "__other__",
                                label: "Other (enter your own)",
                              },
                            ],
                          },
                        ]}
                        placeholder={
                          !primarySpecialty
                            ? "Select primary first"
                            : "Select subspecialties"
                        }
                        variant="onboarding"
                        disabled={!primarySpecialty}
                        searchable
                        maxDropdownHeight={220}
                        className="w-full"
                      />
                      {subspecialtySelectValue === "__other__" && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={customSubspecialty}
                            onChange={(e) =>
                              setCustomSubspecialty(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addCustomSubspecialty();
                              }
                            }}
                            placeholder="Enter your subspecialty"
                            className="flex-1 py-2 px-3 text-sm border rounded-xl"
                            style={{ borderColor: "#D0C4E2" }}
                          />
                          <Button
                            type="button"
                            onClick={addCustomSubspecialty}
                            disabled={!customSubspecialty.trim()}
                            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                            style={{
                              backgroundColor: "#2F3C96",
                              color: "#fff",
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      )}
                      {subspecialties.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {subspecialties.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.2)",
                                color: "#2F3C96",
                              }}
                            >
                              {s}
                              <button
                                type="button"
                                onClick={() => removeSubspecialty(s)}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        className="block text-sm font-semibold mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        Research Interests
                      </label>
                      <ResearchInterestInput
                        value={researchInterestInput}
                        onChange={setResearchInterestInput}
                        onSelect={(t) => handleResearchInterestSubmit(t)}
                        placeholder="Search research interests..."
                        maxSuggestions={8}
                        inputClassName="w-full py-3 px-4 text-base border rounded-xl"
                      />
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
                            className="mt-2 px-3 py-2 rounded-lg text-sm"
                            style={{
                              backgroundColor: "#2F3C96",
                              color: "#fff",
                            }}
                          >
                            Add
                          </Button>
                        )}
                      {researchInterests.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {researchInterests.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.2)",
                                color: "#2F3C96",
                              }}
                            >
                              {r}
                              <button
                                type="button"
                                onClick={() => toggleResearchInterest(r)}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div data-skills-dropdown>
                      <label
                        className="block text-sm font-semibold mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        Skills (optional)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setIsSkillsDropdownOpen(!isSkillsDropdownOpen)
                        }
                        className="w-full py-3 px-4 border rounded-xl flex justify-between items-center"
                        style={{ borderColor: "#E8E8E8", color: "#2F3C96" }}
                      >
                        {skills.length > 0
                          ? `${skills.length} selected`
                          : "Select skills"}
                        <ChevronDown
                          className={`w-4 h-4 ${isSkillsDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isSkillsDropdownOpen && (
                        <div
                          className="mt-2 p-2 border rounded-xl max-h-40 overflow-y-auto"
                          style={{ borderColor: "#E8E8E8" }}
                        >
                          {researchSkills.map((sk) => (
                            <button
                              key={sk}
                              type="button"
                              onClick={() => toggleSkill(sk)}
                              className="block w-full text-left py-2 px-2 rounded-lg text-sm hover:bg-gray-50"
                              style={{
                                color: "#2F3C96",
                                backgroundColor: skills.includes(sk)
                                  ? "rgba(47, 60, 150, 0.1)"
                                  : "",
                              }}
                            >
                              {sk}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => goToStep(STEP_RESEARCHER_ORCID)}
                        className="py-3 px-5 rounded-xl font-semibold border"
                        style={{
                          borderColor: "#2F3C96",
                          color: "#2F3C96",
                          backgroundColor: "transparent",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => {
                          if (!primarySpecialty?.trim()) {
                            setError("Please select primary specialty");
                            return;
                          }
                          setError("");
                          goToStep(STEP_RESEARCHER_LOCATION);
                        }}
                        disabled={!primarySpecialty?.trim()}
                        className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50"
                        style={{ backgroundColor: "#2F3C96", color: "#fff" }}
                      >
                        Continue
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 8 Researcher: Location */}
                {step === STEP_RESEARCHER_LOCATION &&
                  isMedicalProfessional === true && (
                  <motion.div
                    key="step7Researcher"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <h1
                      className="text-xl sm:text-2xl font-bold text-center"
                      style={{ color: "#2F3C96" }}
                    >
                      Your Location
                    </h1>
                    {locationLoading && (
                      <div
                        className="flex items-center justify-center gap-2 py-2"
                        style={{ color: "#787878" }}
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">
                          Detecting your location…
                        </span>
                      </div>
                    )}
                    <div>
                      <label
                        className="block text-sm font-semibold mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        Location
                      </label>
                      <LocationInput
                        value={location}
                        onChange={setLocation}
                        mode="location"
                        inputClassName="w-full py-3 px-4 text-base border rounded-xl"
                        placeholder="Enter your city or country"
                      />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => goToStep(STEP_RESEARCHER_SPECIALTY)}
                        className="py-3 px-5 rounded-xl font-semibold border"
                        style={{
                          borderColor: "#2F3C96",
                          color: "#2F3C96",
                          backgroundColor: "transparent",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleEnterPlatform()}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50"
                        style={{ backgroundColor: "#2F3C96", color: "#fff" }}
                      >
                        {loading ? "Setting up…" : "Continue"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Below the card: Skip for now (step 4 onwards) */}
            {step >= 4 && (
              <div className="w-full flex justify-center mt-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    const isPatient = isMedicalProfessional === false;
                    const lastStep = isPatient
                      ? STEP_PATIENT_LOCATION
                      : STEP_RESEARCHER_LOCATION;
                    if (step >= lastStep) {
                      handleEnterPlatform();
                    } else {
                      goToStep(step + 1);
                    }
                  }}
                  className="px-5 py-2.5 rounded-full text-sm font-medium border-2 transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{
                    borderColor: "#D0C4E2",
                    color: "#2F3C96",
                    backgroundColor: "rgba(208, 196, 226, 0.15)",
                  }}
                >
                  {loading ? "Setting up…" : "Skip for now"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
