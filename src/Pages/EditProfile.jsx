import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import ProfilePictureUpload from "../components/ProfilePictureUpload.jsx";
import Layout from "../components/Layout.jsx";
import { AuroraText } from "@/components/ui/aurora-text";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import UniversityInput from "../components/UniversityInput.jsx";
import { SMART_SUGGESTION_KEYWORDS } from "../utils/smartSuggestions.js";
import icd11Dataset from "../data/icd11Dataset.json";
import {
  buildCanonicalMapFromIcd11,
  buildCanonicalMapFromLabels,
  buildNormalizedKey,
  resolveToCanonical,
} from "../utils/canonicalLabels.js";
import {
  Sparkles,
  Info,
  X,
  RefreshCw,
  Link2,
  Clock,
  CheckCircle2,
  Users,
  MessageCircle,
  UserCheck,
  Eye,
  BookOpen,
  FileText,
  Mail,
  Loader2,
  Globe,
} from "lucide-react";
import ManageProfilePublications from "../components/ManageProfilePublications.jsx";
import SubmitWorkModal from "../components/SubmitWorkModal.jsx";
import { motion } from "framer-motion";
import { generateUniqueUsernames } from "../utils/usernameSuggestions.js";
import {
  capitalizeCommaSeparated,
  capitalizeText,
} from "../utils/textCorrection.js";
import { getDisplayName } from "../utils/researcherDisplayName.js";
import { useTranslation } from "react-i18next";
import LanguagePicker, {
  savePreferredLanguageToApi,
} from "../components/LanguagePicker.jsx";
import {
  IconHospital,
  IconRibbonHealth,
  IconBrain,
  IconDroplet,
  IconHeartbeat,
  IconSalad,
  IconBarbell,
  IconMicroscope,
  IconBandage,
  IconShield,
  IconStethoscope,
} from "@tabler/icons-react";
import WellnessOnlySettingsModal from "../components/wellness/WellnessOnlySettingsModal.jsx";
import { useCollabioraPro } from "../utils/collabioraPro.js";
import CustomSelect from "../components/ui/CustomSelect.jsx";

const flatEthnicityOptions = [
  { value: "English", label: "English" },
  { value: "Irish", label: "Irish" },
  { value: "Scottish", label: "Scottish" },
  { value: "Welsh", label: "Welsh" },
  { value: "German", label: "German" },
  { value: "French", label: "French" },
  { value: "Italian", label: "Italian" },
  { value: "Spanish", label: "Spanish" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Dutch", label: "Dutch" },
  { value: "Belgian", label: "Belgian" },
  { value: "Swiss", label: "Swiss" },
  { value: "Austrian", label: "Austrian" },
  { value: "Swedish", label: "Swedish" },
  { value: "Norwegian", label: "Norwegian" },
  { value: "Danish", label: "Danish" },
  { value: "Finnish", label: "Finnish" },
  { value: "Greek", label: "Greek" },
  { value: "Polish", label: "Polish" },
  { value: "Russian", label: "Russian" },
  { value: "Ukrainian", label: "Ukrainian" },
  { value: "Czech", label: "Czech" },
  { value: "Slovak", label: "Slovak" },
  { value: "Hungarian", label: "Hungarian" },
  { value: "Romanian", label: "Romanian" },
  { value: "Bulgarian", label: "Bulgarian" },
  { value: "Serbian", label: "Serbian" },
  { value: "Croatian", label: "Croatian" },
  { value: "Bosnian", label: "Bosnian" },
  { value: "Albanian", label: "Albanian" },
  { value: "Lithuanian", label: "Lithuanian" },
  { value: "Latvian", label: "Latvian" },
  { value: "Estonian", label: "Estonian" },
  { value: "Slovenian", label: "Slovenian" },
  { value: "Macedonian", label: "Macedonian" },
  { value: "Other European", label: "Other European" },
  { value: "Mexican", label: "Mexican" },
  { value: "Puerto Rican", label: "Puerto Rican" },
  { value: "Cuban", label: "Cuban" },
  { value: "Dominican", label: "Dominican" },
  { value: "Guatemalan", label: "Guatemalan" },
  { value: "Honduran", label: "Honduran" },
  { value: "Salvadoran", label: "Salvadoran" },
  { value: "Nicaraguan", label: "Nicaraguan" },
  { value: "Costa Rican", label: "Costa Rican" },
  { value: "Panamanian", label: "Panamanian" },
  { value: "Colombian", label: "Colombian" },
  { value: "Venezuelan", label: "Venezuelan" },
  { value: "Ecuadorian", label: "Ecuadorian" },
  { value: "Peruvian", label: "Peruvian" },
  { value: "Bolivian", label: "Bolivian" },
  { value: "Chilean", label: "Chilean" },
  { value: "Argentinian", label: "Argentinian" },
  { value: "Uruguayan", label: "Uruguayan" },
  { value: "Paraguayan", label: "Paraguayan" },
  { value: "Brazilian", label: "Brazilian" },
  { value: "Other Hispanic or Latino", label: "Other Hispanic or Latino" },
  { value: "African American", label: "African American" },
  { value: "Nigerian", label: "Nigerian" },
  { value: "Ghanaian", label: "Ghanaian" },
  { value: "Kenyan", label: "Kenyan" },
  { value: "Ethiopian", label: "Ethiopian" },
  { value: "Somali", label: "Somali" },
  { value: "Ugandan", label: "Ugandan" },
  { value: "Tanzanian", label: "Tanzanian" },
  { value: "Rwandan", label: "Rwandan" },
  { value: "Congolese", label: "Congolese" },
  { value: "Cameroonian", label: "Cameroonian" },
  { value: "Senegalese", label: "Senegalese" },
  { value: "Ivorian", label: "Ivorian" },
  { value: "Malian", label: "Malian" },
  { value: "Zimbabwean", label: "Zimbabwean" },
  { value: "Zambian", label: "Zambian" },
  { value: "Mozambican", label: "Mozambican" },
  { value: "Angolan", label: "Angolan" },
  { value: "South African", label: "South African" },
  { value: "Caribbean Black", label: "Caribbean Black" },
  { value: "Jamaican", label: "Jamaican" },
  { value: "Haitian", label: "Haitian" },
  { value: "Trinidadian", label: "Trinidadian" },
  { value: "Barbadian", label: "Barbadian" },
  { value: "Other Black or African", label: "Other Black or African" },
  { value: "Chinese", label: "Chinese" },
  { value: "Japanese", label: "Japanese" },
  { value: "Korean", label: "Korean" },
  { value: "Taiwanese", label: "Taiwanese" },
  { value: "Mongolian", label: "Mongolian" },
  { value: "Tibetan", label: "Tibetan" },
  { value: "Other East Asian", label: "Other East Asian" },
  { value: "Indian", label: "Indian" },
  { value: "Pakistani", label: "Pakistani" },
  { value: "Bangladeshi", label: "Bangladeshi" },
  { value: "Sri Lankan", label: "Sri Lankan" },
  { value: "Nepali", label: "Nepali" },
  { value: "Bhutanese", label: "Bhutanese" },
  { value: "Maldivian", label: "Maldivian" },
  { value: "Afghan", label: "Afghan" },
  { value: "Other South Asian", label: "Other South Asian" },
  { value: "Filipino", label: "Filipino" },
  { value: "Vietnamese", label: "Vietnamese" },
  { value: "Thai", label: "Thai" },
  { value: "Indonesian", label: "Indonesian" },
  { value: "Malaysian", label: "Malaysian" },
  { value: "Singaporean", label: "Singaporean" },
  { value: "Burmese", label: "Burmese" },
  { value: "Cambodian", label: "Cambodian" },
  { value: "Laotian", label: "Laotian" },
  { value: "Bruneian", label: "Bruneian" },
  { value: "Timorese", label: "Timorese" },
  { value: "Other Southeast Asian", label: "Other Southeast Asian" },
  { value: "Kazakh", label: "Kazakh" },
  { value: "Uzbek", label: "Uzbek" },
  { value: "Turkmen", label: "Turkmen" },
  { value: "Kyrgyz", label: "Kyrgyz" },
  { value: "Tajik", label: "Tajik" },
  { value: "Other Central Asian", label: "Other Central Asian" },
  { value: "Arab", label: "Arab" },
  { value: "Egyptian", label: "Egyptian" },
  { value: "Moroccan", label: "Moroccan" },
  { value: "Algerian", label: "Algerian" },
  { value: "Tunisian", label: "Tunisian" },
  { value: "Libyan", label: "Libyan" },
  { value: "Lebanese", label: "Lebanese" },
  { value: "Syrian", label: "Syrian" },
  { value: "Iraqi", label: "Iraqi" },
  { value: "Iranian / Persian", label: "Iranian / Persian" },
  { value: "Saudi Arabian", label: "Saudi Arabian" },
  { value: "Yemeni", label: "Yemeni" },
  { value: "Jordanian", label: "Jordanian" },
  { value: "Palestinian", label: "Palestinian" },
  { value: "Emirati", label: "Emirati" },
  { value: "Kuwaiti", label: "Kuwaiti" },
  { value: "Qatari", label: "Qatari" },
  { value: "Bahraini", label: "Bahraini" },
  { value: "Omani", label: "Omani" },
  { value: "Turkish", label: "Turkish" },
  { value: "Kurdish", label: "Kurdish" },
  { value: "Israeli", label: "Israeli" },
  { value: "Other Middle Eastern or North African", label: "Other Middle Eastern or North African" },
  { value: "Cherokee", label: "Cherokee" },
  { value: "Navajo", label: "Navajo" },
  { value: "Sioux", label: "Sioux" },
  { value: "Chippewa", label: "Chippewa" },
  { value: "Choctaw", label: "Choctaw" },
  { value: "Apache", label: "Apache" },
  { value: "Iroquois", label: "Iroquois" },
  { value: "Creek", label: "Creek" },
  { value: "Blackfoot", label: "Blackfoot" },
  { value: "Seminole", label: "Seminole" },
  { value: "Alaska Native", label: "Alaska Native" },
  { value: "Other American Indian or Alaska Native", label: "Other American Indian or Alaska Native" },
  { value: "Native Hawaiian", label: "Native Hawaiian" },
  { value: "Samoan", label: "Samoan" },
  { value: "Tongan", label: "Tongan" },
  { value: "Fijian", label: "Fijian" },
  { value: "Chamorro", label: "Chamorro" },
  { value: "Marshallese", label: "Marshallese" },
  { value: "Palauan", label: "Palauan" },
  { value: "Other Pacific Islander", label: "Other Pacific Islander" },
  { value: "Mixed White and Black", label: "Mixed White and Black" },
  { value: "Mixed White and Asian", label: "Mixed White and Asian" },
  { value: "Mixed White and Hispanic", label: "Mixed White and Hispanic" },
  { value: "Mixed Black and Asian", label: "Mixed Black and Asian" },
  { value: "Mixed Black and Hispanic", label: "Mixed Black and Hispanic" },
  { value: "Mixed Asian and Hispanic", label: "Mixed Asian and Hispanic" },
  { value: "Other Mixed or Multi-Ethnic", label: "Other Mixed or Multi-Ethnic" },
  { value: "Jewish", label: "Jewish" },
  { value: "Roma / Gypsy", label: "Roma / Gypsy" },
  { value: "Sikh", label: "Sikh" },
  { value: "Prefer not to say", label: "Prefer not to say" },
  { value: "Not listed above", label: "Not listed above" }
];

/** Public-folder filenames for patient preset profile pictures (served from /). */
const PRESET_PATIENT_AVATAR_FILENAMES = [
  "1stAvatarPublic.png",
  "2ndAvatarPublic.png",
  "3rdAvatarPublic.png",
  "4thAvatarPublic.png",
  "5thAvatarPublic.png",
  "6thAvatarPublic.png",
];

const PRESET_RESEARCHER_AVATAR_FILENAMES = [
  "1stAvatarResearcher.png",
  "2ndAvatarResearcher.png",
  "3rdAvatarResearcher.png",
  "4thAvatarResearcher.png",
  "5thAvatarResearcher.png",
  "6thAvatarResearcher.png",
];

function normalizePicturePath(url) {
  if (!url || typeof url !== "string") return "";
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return new URL(url).pathname || url;
    }
  } catch {
    /* ignore */
  }
  return url.startsWith("/") ? url : `/${url}`;
}

function isSameProfilePicture(a, b) {
  return normalizePicturePath(a) === normalizePicturePath(b);
}

// Icon mapping for communities
const getCommunityIcon = (slug, name) => {
  const iconMap = {
    "general-health": IconHospital,
    "cancer-support": IconRibbonHealth,
    "mental-health": IconBrain,
    "diabetes-management": IconDroplet,
    "heart-health": IconHeartbeat,
    "nutrition-diet": IconSalad,
    "fitness-exercise": IconBarbell,
    "clinical-trials": IconMicroscope,
    "chronic-pain": IconBandage,
    "autoimmune-conditions": IconShield,
  };

  const IconComponent =
    iconMap[slug] ||
    iconMap[name?.toLowerCase().replace(/\s+/g, "-")] ||
    IconStethoscope;
  return IconComponent;
};

function AcademicLinkStatusBadge({ status }) {
  const { t } = useTranslation("common");
  if (!status) return null;
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        {t("editProfile.badgeAcademicConnected")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
      <Clock className="w-3 h-3" />
      {t("editProfile.badgePendingVerification")}
    </span>
  );
}

export default function EditProfile() {
  const { t } = useTranslation("common");
  const isCollabioraPro = useCollabioraPro();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [user, setUser] = useState(null);
  const [persistedUser, setPersistedUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [savingPresetAvatarUrl, setSavingPresetAvatarUrl] = useState(null);

  const patientPresetAvatarUrls = useMemo(() => {
    const root = import.meta.env.BASE_URL || "/";
    const prefix = root.endsWith("/") ? root : `${root}/`;
    return PRESET_PATIENT_AVATAR_FILENAMES.map((f) => `${prefix}${f}`);
  }, []);

  const researcherPresetAvatarUrls = useMemo(() => {
    const root = import.meta.env.BASE_URL || "/";
    const prefix = root.endsWith("/") ? root : `${root}/`;
    return PRESET_RESEARCHER_AVATAR_FILENAMES.map((f) => `${prefix}${f}`);
  }, []);

  // User fields
  const [username, setUsername] = useState("");
  const [handle, setHandle] = useState("");
  const [nameHidden, setNameHidden] = useState(false);

  // Profile fields
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [age, setAge] = useState("");
  const [conditionInput, setConditionInput] = useState(""); // For patients - input field
  const [selectedConditions, setSelectedConditions] = useState([]); // For patients - selected conditions
  const [identifiedConditions, setIdentifiedConditions] = useState([]); // Track auto-identified conditions
  const [isExtracting, setIsExtracting] = useState(false); // For condition extraction
  const [bio, setBio] = useState(""); // For researchers
  const [orcid, setOrcid] = useState(""); // For researchers
  const [researchGate, setResearchGate] = useState(""); // For researchers
  const [researchGateVerification, setResearchGateVerification] =
    useState(null); // "pending" | "verified"
  const [academiaEdu, setAcademiaEdu] = useState("");
  const [academiaEduVerification, setAcademiaEduVerification] = useState(null);
  const [linkingResearchGate, setLinkingResearchGate] = useState(false);
  const [linkingAcademia, setLinkingAcademia] = useState(false);
  const [institutionAffiliation, setInstitutionAffiliation] = useState(""); // For researchers
  const [specialties, setSpecialties] = useState(""); // For researchers
  const [interests, setInterests] = useState(""); // For researchers
  const [available, setAvailable] = useState(false); // For researchers
  const [interestedInMeetings, setInterestedInMeetings] = useState(false);
  const [meetingRate, setMeetingRate] = useState(""); // per 30 min
  const [meetingTimezone, setMeetingTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [stripeConnectStatus, setStripeConnectStatus] =
    useState("not_connected");
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [refreshingStripeStatus, setRefreshingStripeStatus] = useState(false);
  const [weeklyAvailability, setWeeklyAvailability] = useState(() =>
    Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      enabled: false,
      windows: [], // [{ startTime: "09:00", endTime: "13:00" }, ...]
    })),
  );
  const [gender, setGender] = useState(""); // Optional for both
  const [ethnicity, setEthnicity] = useState(""); // For patients
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  const [followedCommunities, setFollowedCommunities] = useState([]);
  const [followedPeople, setFollowedPeople] = useState([]);
  const [loadingFollowed, setLoadingFollowed] = useState(false);
  const [showManagePublications, setShowManagePublications] = useState(false);
  const [showSubmitWorkModal, setShowSubmitWorkModal] = useState(false);
  const [communityPostsCount, setCommunityPostsCount] = useState(0);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [wellnessModalOpen, setWellnessModalOpen] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState(false);
  const otpRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Generate 3 unique username suggestions (numbers used sparingly - only 30% chance)
  const [usernameSuggestions, setUsernameSuggestions] = useState(() =>
    generateUniqueUsernames(3, false),
  );

  function normalizeHandle(value) {
    return String(value || "")
      .replace(/^@+/, "")
      .trim();
  }

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

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);

    if (!userData?._id && !userData?.id) {
      navigate("/signin");
      return;
    }

    // Set username and handle from userData
    if (userData?.username) {
      setUsername(userData.username);
    }
    // Handle can be empty string, so check for undefined/null specifically
    if (userData?.handle !== undefined && userData?.handle !== null) {
      setHandle(userData.handle);
    } else {
      setHandle(""); // Initialize as empty string if not set
    }
    if (userData?.nameHidden !== undefined) {
      setNameHidden(userData.nameHidden);
    } else {
      setNameHidden(false); // Default to false
    }

    const uid = userData._id || userData.id;
    loadPersistedUser(uid, userData);
    loadProfile(uid);
    loadFollowedData(uid);
    if (userData.role === "researcher") {
      loadAvailability(uid);
      refreshStripeConnectStatus();
    }
  }, [navigate]);

  useEffect(() => {
    if (searchParams.get("wellness") === "1" && isCollabioraPro) {
      setWellnessModalOpen(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("wellness");
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams, isCollabioraPro]);

  // Listen for email verification (cross-tab or same-tab localStorage update)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "user") {
        try {
          const updated = JSON.parse(e.newValue || "{}");
          if (updated.emailVerified) {
            setUser((prev) => ({ ...prev, emailVerified: true }));
          }
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commonConditions = useMemo(() => {
    const arr = t("editProfile.conditionSuggestions", { returnObjects: true });
    return Array.isArray(arr) && arr.length ? arr : [];
  }, [t]);

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
              const hasIcdPattern =
                lowerTerm.includes("icd11 code") ||
                lowerTerm.includes("icd code") ||
                /icd11\s+[a-z]{2}[0-9]{2}/i.test(trimmedTerm) ||
                /icd\s+[a-z]{2}[0-9]{2}/i.test(trimmedTerm);

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

  // Canonical map for condition suggestions: ICD11 display_name wins, then curated labels
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
  }, [commonConditions]);

  async function extractConditions(text) {
    if (!text || text.length < 5) return;
    setIsExtracting(true);
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
        toast.success(
          t("editProfile.toastConditionsIdentified", {
            count: canonicalConditions.length,
          }),
        );
      } else {
        toast.error(t("editProfile.toastCouldNotIdentifyConditions"));
      }
    } catch (e) {
      console.error("Condition extraction failed", e);
      toast.error(t("editProfile.toastExtractConditionsFailed"));
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
    if (value && value.trim()) {
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

      // Known suggestion / ICD term: add directly. Otherwise long names or labels
      // containing words like "pain" or "pressure" wrongly triggered AI extraction
      // and "failed to identify keywords" when picking from the dropdown.
      const mapKey = buildNormalizedKey(trimmed);
      const knownLabel = conditionsCanonicalMap?.get(mapKey);
      if (knownLabel) {
        const k = buildNormalizedKey(knownLabel);
        const alreadyAdded = selectedConditions.some(
          (c) => buildNormalizedKey(c) === k,
        );
        if (!alreadyAdded) {
          setSelectedConditions((prev) => [...prev, knownLabel]);
          setConditionInput("");
          setIdentifiedConditions((prev) =>
            prev.filter((c) => buildNormalizedKey(c) !== k),
          );
        }
        return;
      }

      if (looksLikeSymptom) {
        extractConditions(trimmed);
        return;
      }

      const canonical = resolveToCanonical(trimmed, conditionsCanonicalMap);
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
  }

  async function loadProfile(userId) {
    try {
      // Fetch user profile
      const profileResponse = await fetch(`${base}/api/profile/${userId}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData.profile || null);

        const profileObj = profileData.profile || {};

        // For researchers, fetch community posts count
        if (profileObj.researcher) {
          try {
            const statsRes = await fetch(
              `${base}/api/profile/${userId}/landing-stats`,
            );
            if (statsRes.ok) {
              const stats = await statsRes.json();
              setCommunityPostsCount(stats.communityPosts ?? 0);
            }
          } catch {
            setCommunityPostsCount(0);
          }
        }

        if (profileObj.patient) {
          // Patient fields
          setCity(profileObj.patient.location?.city || "");
          setCountry(profileObj.patient.location?.country || "");
          setSelectedConditions(profileObj.patient.conditions || []);
          setGender(profileObj.patient.gender || "");
          setEthnicity(profileObj.patient.ethnicity || "");
          setAge(profileObj.patient.age?.toString() || "");
        } else if (profileObj.researcher) {
          // Researcher fields
          setCity(profileObj.researcher.location?.city || "");
          setCountry(profileObj.researcher.location?.country || "");
          setBio(profileObj.researcher.bio || "");
          setOrcid(profileObj.researcher.orcid || "");
          setResearchGate(profileObj.researcher.researchGate || "");
          setResearchGateVerification(
            profileObj.researcher.researchGateVerification || null,
          );
          setAcademiaEdu(profileObj.researcher.academiaEdu || "");
          setAcademiaEduVerification(
            profileObj.researcher.academiaEduVerification || null,
          );
          setInstitutionAffiliation(
            profileObj.researcher.institutionAffiliation || "",
          );
          setSpecialties((profileObj.researcher.specialties || []).join(", "));
          setInterests((profileObj.researcher.interests || []).join(", "));
          setAvailable(profileObj.researcher.available || false);
          setGender(profileObj.researcher.gender || "");
          setAge(profileObj.researcher.age?.toString() || "");
          setInterestedInMeetings(
            profileObj.researcher.interestedInMeetings || false,
          );
          if (profileObj.researcher.meetingRate != null) {
            setMeetingRate(String(profileObj.researcher.meetingRate));
          }
          if (profileObj.researcher.meetingTimezone) {
            setMeetingTimezone(profileObj.researcher.meetingTimezone);
          }
          if (profileObj.researcher.stripeConnectStatus) {
            setStripeConnectStatus(profileObj.researcher.stripeConnectStatus);
          }
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error(t("editProfile.toastLoadProfileFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function loadPersistedUser(userId, fallbackUser = {}) {
    try {
      const response = await fetch(
        `${base}/api/profile/${userId}/forum-profile`,
      );
      if (!response.ok) return;

      const data = await response.json();
      const serverUser = data.user || {};
      const mergedUser = { ...fallbackUser, ...serverUser };

      setPersistedUser(mergedUser);
      setUser((prev) => ({ ...(prev || {}), ...mergedUser }));
      localStorage.setItem("user", JSON.stringify(mergedUser));

      if (serverUser.username !== undefined && serverUser.username !== null) {
        setUsername(serverUser.username);
      }
      if (serverUser.handle !== undefined && serverUser.handle !== null) {
        setHandle(serverUser.handle);
      } else {
        setHandle("");
      }
    } catch (error) {
      console.error("Error loading persisted user:", error);
    }
  }

  async function loadAvailability(userId) {
    try {
      const res = await fetch(`${base}/api/researchers/${userId}/availability`);
      if (!res.ok) return;
      const data = await res.json();
      const availability = data.availability;
      if (!availability) return;

      const rules = Array.isArray(availability.weeklyRules)
        ? availability.weeklyRules
        : [];

      setWeeklyAvailability((prev) =>
        prev.map((day) => {
          const dayRules = rules.filter((r) => r.dayOfWeek === day.dayOfWeek);
          return {
            ...day,
            enabled: dayRules.length > 0,
            windows: dayRules.map((r) => ({
              startTime: r.startTime || "",
              endTime: r.endTime || "",
            })),
          };
        }),
      );

      if (availability.timezone) {
        setMeetingTimezone(availability.timezone);
      }
      if (typeof availability.isActive === "boolean") {
        setInterestedInMeetings(availability.isActive);
      }
    } catch (err) {
      console.error("Error loading availability:", err);
    }
  }

  async function refreshStripeConnectStatus() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      setRefreshingStripeStatus(true);
      const res = await fetch(`${base}/api/stripe/connect/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.stripeConnectStatus) {
        setStripeConnectStatus(data.stripeConnectStatus);
      }
    } catch (err) {
      console.error("Error refreshing Stripe status:", err);
    } finally {
      setRefreshingStripeStatus(false);
    }
  }

  async function connectStripeAccount() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error(t("editProfile.toastSignInFirst"));
        return;
      }
      setStripeConnecting(true);

      const createRes = await fetch(`${base}/api/stripe/connect/account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.ok) {
        throw new Error(
          createData.error || t("editProfile.errStripeCreateAccount"),
        );
      }

      const linkRes = await fetch(
        `${base}/api/stripe/connect/onboarding-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const linkData = await linkRes.json();
      if (!linkRes.ok || !linkData.ok || !linkData.url) {
        throw new Error(
          linkData.error || t("editProfile.errStripeOnboardingLink"),
        );
      }

      setStripeConnectStatus(createData.stripeConnectStatus || "pending");
      window.location.href = linkData.url;
    } catch (err) {
      console.error("Error connecting Stripe account:", err);
      toast.error(err.message || t("editProfile.toastStripeConnectFailed"));
    } finally {
      setStripeConnecting(false);
    }
  }

  async function loadFollowedData(userId) {
    setLoadingFollowed(true);
    try {
      // Fetch followed communities
      const communitiesResponse = await fetch(
        `${base}/api/communities/user/${userId}/following`,
      );
      if (communitiesResponse.ok) {
        const communitiesData = await communitiesResponse.json();
        setFollowedCommunities(communitiesData.communities || []);
      }

      // Fetch followed people
      const followingResponse = await fetch(
        `${base}/api/insights/${userId}/following`,
      );
      if (followingResponse.ok) {
        const followingData = await followingResponse.json();
        setFollowedPeople(followingData.following || []);
      }
    } catch (error) {
      console.error("Error loading followed data:", error);
    } finally {
      setLoadingFollowed(false);
    }
  }

  async function handleLinkAcademic(urlToUse, platform) {
    const url =
      (platform === "researchgate" ? researchGate : academiaEdu)?.trim() ||
      urlToUse?.trim();
    if (!url) {
      toast.error(
        t("editProfile.toastEnterAcademicUrl", {
          platform:
            platform === "researchgate"
              ? t("editProfile.platformResearchGate")
              : t("editProfile.platformAcademiaEdu"),
        }),
      );
      return;
    }
    if (platform === "researchgate") setLinkingResearchGate(true);
    else setLinkingAcademia(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${base}/api/profile/link-academic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("editProfile.errSaveLink"));
      if (data.normalizedUrl) {
        if (data.platform === "researchgate") {
          setResearchGate(data.normalizedUrl);
          setResearchGateVerification("pending");
        } else {
          setAcademiaEdu(data.normalizedUrl);
          setAcademiaEduVerification("pending");
        }
      }
      toast.success(data.message || t("editProfile.toastModeratorReview"));
    } catch (err) {
      toast.error(err.message || t("editProfile.toastCouldNotSaveLink"));
    } finally {
      setLinkingResearchGate(false);
      setLinkingAcademia(false);
    }
  }

  async function handlePictureUpload(file) {
    if (!file) return;

    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "profile-picture");

      const token = localStorage.getItem("token");
      const response = await fetch(`${base}/api/upload/profile-picture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("editProfile.errUploadPicture"));
      }

      const data = await response.json();

      // Update user picture
      const userId = user._id || user.id;
      const userUpdateResponse = await fetch(
        `${base}/api/auth/update-user/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ picture: data.url }),
        },
      );

      if (userUpdateResponse.ok) {
        const userData = await userUpdateResponse.json();
        const updatedUser = { ...user, ...userData.user, picture: data.url };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event("login"));
        toast.success(t("editProfile.toastPictureUpdated"));
      } else {
        throw new Error(t("editProfile.errUpdateUserPicture"));
      }
    } catch (error) {
      console.error("Error uploading picture:", error);
      toast.error(error.message || t("editProfile.errUploadPicture"));
      throw error; // Re-throw so component knows upload failed
    } finally {
      setUploadingPicture(false);
    }
  }

  async function handlePresetAvatar(pictureUrl) {
    const userId = user?._id || user?.id;
    if (!userId) {
      toast.error(t("editProfile.toastPleaseSignIn"));
      return;
    }
    if (!pictureUrl) return;

    setSavingPresetAvatarUrl(pictureUrl);
    try {
      const userUpdateResponse = await fetch(
        `${base}/api/auth/update-user/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ picture: pictureUrl }),
        },
      );

      if (!userUpdateResponse.ok) {
        throw new Error(t("editProfile.errUpdateUserPicture"));
      }

      const userData = await userUpdateResponse.json();
      const updatedUser = { ...user, ...userData.user, picture: pictureUrl };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      window.dispatchEvent(new Event("login"));
      toast.success(t("editProfile.toastPictureUpdated"));
    } catch (error) {
      console.error("Error setting preset avatar:", error);
      toast.error(error.message || t("editProfile.errUpdateUserPicture"));
    } finally {
      setSavingPresetAvatarUrl(null);
    }
  }

  async function handleSave() {
    if (!user?._id && !user?.id) {
      toast.error(t("editProfile.toastPleaseSignIn"));
      return;
    }

    // Validation: Name and conditions are mandatory
    if (!username.trim()) {
      toast.error(t("editProfile.toastFullNameRequired"));
      return;
    }

    if (user.role === "patient" && selectedConditions.length === 0) {
      toast.error(t("editProfile.toastConditionRequired"));
      return;
    }

    setSaving(true);
    const userId = user._id || user.id;

    try {
      const originalUser = persistedUser || user || {};

      // Track if there are any changes
      let hasUserChanges = false;
      let hasProfileChanges = false;

      // Check for user field changes
      const userUpdateData = {};
      const trimmedUsername = username.trim();
      const currentUsername = String(originalUser.username || "").trim();
      if (trimmedUsername && trimmedUsername !== currentUsername) {
        userUpdateData.username = trimmedUsername;
        hasUserChanges = true;
      }
      // Handle comparison: treat empty string and undefined as the same
      const currentHandle = normalizeHandle(originalUser.handle);
      const newHandle = normalizeHandle(handle);
      if (newHandle !== currentHandle) {
        userUpdateData.handle = newHandle || undefined;
        hasUserChanges = true;
      }
      if (nameHidden !== (originalUser.nameHidden || false)) {
        userUpdateData.nameHidden = nameHidden;
        hasUserChanges = true;
      }

      // Check for profile field changes
      const profileObj = profile || {};
      let profileData = { role: user.role };

      if (user.role === "patient") {
        const conditionsArray = [...selectedConditions];

        const originalConditions = profileObj.patient?.conditions || [];
        const originalCity = profileObj.patient?.location?.city || "";
        const originalCountry = profileObj.patient?.location?.country || "";
        const originalGender = profileObj.patient?.gender || "";
        const originalEthnicity = profileObj.patient?.ethnicity || "";
        const originalAge = profileObj.patient?.age?.toString() || "";

        const newCity = city.trim();
        const newCountry = country.trim();
        const newGender = gender.trim();
        const newEthnicity = ethnicity.trim();
        const newAge = age ? parseInt(age).toString() : "";

        // Check if conditions changed (compare arrays)
        const conditionsChanged =
          conditionsArray.length !== originalConditions.length ||
          conditionsArray.some((c, i) => c !== originalConditions[i]);

        // Check if any profile fields changed
        if (
          conditionsChanged ||
          newCity !== originalCity ||
          newCountry !== originalCountry ||
          newGender !== originalGender ||
          newEthnicity !== originalEthnicity ||
          newAge !== originalAge
        ) {
          hasProfileChanges = true;
        }

        profileData.patient = {
          conditions: conditionsArray,
          location: {
            city: newCity || undefined,
            country: newCountry || undefined,
          },
          gender: newGender || undefined,
          ethnicity: newEthnicity || undefined,
          age: age ? parseInt(age) : undefined,
        };
      } else if (user.role === "researcher") {
        const specialtiesArray = specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const interestsArray = interests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const originalSpecialties = (
          profileObj.researcher?.specialties || []
        ).join(", ");
        const originalInterests = (profileObj.researcher?.interests || []).join(
          ", ",
        );
        const originalInstitutionAffiliation =
          profileObj.researcher?.institutionAffiliation || "";
        const originalOrcid = profileObj.researcher?.orcid || "";
        const originalBio = profileObj.researcher?.bio || "";
        const originalResearchGate = profileObj.researcher?.researchGate || "";
        const originalResearchGateVerification =
          profileObj.researcher?.researchGateVerification ?? null;
        const originalAcademiaEdu = profileObj.researcher?.academiaEdu || "";
        const originalAcademiaEduVerification =
          profileObj.researcher?.academiaEduVerification ?? null;
        const originalAvailable = profileObj.researcher?.available || false;
        const originalCity = profileObj.researcher?.location?.city || "";
        const originalCountry = profileObj.researcher?.location?.country || "";
        const originalGender = profileObj.researcher?.gender || "";
        const originalAge = profileObj.researcher?.age?.toString() || "";

        const newCity = city.trim();
        const newCountry = country.trim();
        const newGender = gender.trim();
        const newAge = age ? parseInt(age).toString() : "";

        // Check if any profile fields changed
        if (
          specialties !== originalSpecialties ||
          interests !== originalInterests ||
          institutionAffiliation.trim() !== originalInstitutionAffiliation ||
          orcid.trim() !== originalOrcid ||
          bio.trim() !== originalBio ||
          researchGate.trim() !== originalResearchGate ||
          researchGateVerification !== originalResearchGateVerification ||
          academiaEdu.trim() !== originalAcademiaEdu ||
          academiaEduVerification !== originalAcademiaEduVerification ||
          available !== originalAvailable ||
          newCity !== originalCity ||
          newCountry !== originalCountry ||
          newGender !== originalGender ||
          newAge !== originalAge
        ) {
          hasProfileChanges = true;
        }

        profileData.researcher = {
          specialties: specialtiesArray,
          interests: interestsArray,
          institutionAffiliation: institutionAffiliation.trim() || undefined,
          orcid: orcid.trim() || undefined,
          bio: bio.trim() || undefined,
          researchGate: researchGate.trim() || undefined,
          researchGateVerification: researchGateVerification || undefined,
          academiaEdu: academiaEdu.trim() || undefined,
          academiaEduVerification: academiaEduVerification || undefined,
          available,
          location: {
            city: newCity || undefined,
            country: newCountry || undefined,
          },
          gender: newGender || undefined,
          age: age ? parseInt(age) : undefined,
        };
      }

      // If no profile/user changes detected:
      // - For patients, we can safely exit.
      // - For researchers, we still want to persist meeting settings + availability,
      //   so we do NOT return early here.
      if (!hasUserChanges && !hasProfileChanges && user.role !== "researcher") {
        toast.success(t("editProfile.toastAllUpToDate"));
        setSaving(false);
        return;
      }

      // Track updated user for use in profile update
      let currentUser = user;

      // Update user fields if there are changes
      if (hasUserChanges && Object.keys(userUpdateData).length > 0) {
        const userUpdateResponse = await fetch(
          `${base}/api/auth/update-user/${userId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userUpdateData),
          },
        );

        if (!userUpdateResponse.ok) {
          const errorData = await userUpdateResponse.json();
          throw new Error(
            errorData.error || t("editProfile.errUpdateUserInfo"),
          );
        }

        const userData = await userUpdateResponse.json();
        // Update local storage with all user fields including handle
        const updatedUser = { ...user, ...userData.user };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setPersistedUser(updatedUser);
        currentUser = updatedUser; // Update currentUser for profile update
        // Update form state with the saved handle - handle can be empty string
        if (
          userData.user.handle !== undefined &&
          userData.user.handle !== null
        ) {
          setHandle(userData.user.handle);
        } else {
          setHandle(""); // Clear handle if it was removed
        }
        // Update nameHidden in form state
        if (userData.user.nameHidden !== undefined) {
          setNameHidden(userData.user.nameHidden);
        }
        window.dispatchEvent(new Event("login")); // Update navbar
        window.dispatchEvent(new Event("userUpdated"));
      }

      // Update profile if there are changes
      if (hasProfileChanges) {
        if (currentUser.role === "patient") {
          const conditionsArray = [...selectedConditions];

          // Also update medicalInterests in User model
          if (conditionsArray.length > 0) {
            await fetch(`${base}/api/auth/update-profile`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                medicalInterests: conditionsArray,
              }),
            });
          }
        } else if (user.role === "researcher") {
          const specialtiesArray = specialties
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const interestsArray = interests
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          // Also update medicalInterests in User model (combined specialties + interests)
          const medicalInterests = [...specialtiesArray, ...interestsArray];
          if (medicalInterests.length > 0) {
            await fetch(`${base}/api/auth/update-profile`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                medicalInterests,
              }),
            });
          }
        }

        // Update profile in database
        const profileResponse = await fetch(`${base}/api/profile/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(profileData),
        });

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json();
          throw new Error(
            errorData.error || t("editProfile.toastUpdateProfileFailed"),
          );
        }

        // Reload profile to get latest data
        await loadProfile(userId);

        // Update user object in localStorage with new medicalInterests
        const updatedUserData = {
          ...currentUser,
          medicalInterests:
            currentUser.role === "patient"
              ? [...selectedConditions]
              : [
                  ...specialties
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  ...interests
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                ],
        };
        localStorage.setItem("user", JSON.stringify(updatedUserData));
        setUser(updatedUserData);
        setPersistedUser(updatedUserData);
      }

      // For researchers, also persist meeting settings and weekly availability
      if (currentUser.role === "researcher") {
        const token = localStorage.getItem("token");
        if (token) {
          try {
            // Derive whether there is any actual availability configured
            const weeklyRules = weeklyAvailability.flatMap((d) => {
              if (!d.enabled || !Array.isArray(d.windows)) return [];
              return d.windows
                .filter(
                  (w) => w.startTime && w.endTime && w.startTime !== w.endTime,
                )
                .map((w) => ({
                  dayOfWeek: d.dayOfWeek,
                  startTime: w.startTime,
                  endTime: w.endTime,
                }));
            });

            const hasAnyAvailability = weeklyRules.length > 0;
            const rateNumber =
              meetingRate && !Number.isNaN(Number(meetingRate))
                ? Number(meetingRate)
                : undefined;
            const wantsPaidMeetings =
              (typeof rateNumber === "number" && rateNumber > 0) ||
              interestedInMeetings ||
              hasAnyAvailability;
            if (wantsPaidMeetings && stripeConnectStatus !== "verified") {
              throw new Error(t("editProfile.errStripeBeforeMeetings"));
            }
            await fetch(`${base}/api/researchers/${userId}/meeting-settings`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                meetingRate: rateNumber,
                // If they have set any availability at all, automatically
                // mark that they accept meetings so patients can see slots.
                interestedInMeetings: hasAnyAvailability
                  ? true
                  : interestedInMeetings,
                meetingTimezone: meetingTimezone || undefined,
                meetingDurationMinutes: 30,
              }),
            });

            await fetch(`${base}/api/researchers/${userId}/availability`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                timezone: meetingTimezone || "UTC",
                weeklyRules,
                dateOverrides: [],
                // Back-end slot generation checks isActive, so tie that
                // directly to whether there is any availability configured.
                isActive: hasAnyAvailability,
              }),
            });
          } catch (err) {
            console.error("Error saving meeting availability:", err);
            // Do not throw; profile update already succeeded
          }
        }
      }

      // Trigger login event to update Navbar and other components
      window.dispatchEvent(new Event("login"));

      toast.success(t("editProfile.toastProfileUpdated"));
      // Don't redirect - stay on edit page
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(error.message || t("editProfile.toastUpdateProfileFailed"));
    } finally {
      setSaving(false);
    }
  }

  const weekdayShortLabels = useMemo(() => {
    const arr = t("editProfile.weekdaysShort", { returnObjects: true });
    return Array.isArray(arr) && arr.length === 7
      ? arr
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }, [t]);

  const weekdayLongLabels = useMemo(() => {
    const arr = t("editProfile.weekdaysLong", { returnObjects: true });
    return Array.isArray(arr) && arr.length === 7
      ? arr
      : [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
  }, [t]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-700">{t("editProfile.loading")}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleSendVerificationEmail = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error(t("editProfile.toastVerifyEmailLogin"));
      return;
    }
    setSendingVerification(true);
    try {
      const res = await fetch(`${base}/api/auth/send-verification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setVerificationSent(true);
        setShowOtpModal(true);
        setOtp(["", "", "", "", "", ""]);
        setOtpError("");
        setOtpSuccess(false);
        toast.success(
          t("editProfile.toastVerificationSentTo", {
            email: data.email || user.email,
          }),
        );
        setTimeout(() => otpRefs[0]?.current?.focus(), 200);
      } else {
        toast.error(data.error || t("editProfile.toastSendVerificationFailed"));
      }
    } catch {
      toast.error(t("editProfile.toastSendVerificationRetry"));
    } finally {
      setSendingVerification(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setOtpError("");
    if (value && index < 5) {
      otpRefs[index + 1]?.current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1]?.current?.focus();
    }
    if (e.key === "Enter") {
      const code = otp.join("");
      if (code.length === 6) handleVerifyOtp(code);
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);
    setOtpError("");
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs[focusIdx]?.current?.focus();
  };

  const handleVerifyOtp = async (code) => {
    const otpCode = code || otp.join("");
    if (otpCode.length !== 6) {
      setOtpError(t("editProfile.otpEnterFullCode"));
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    setVerifyingOtp(true);
    setOtpError("");
    try {
      const res = await fetch(`${base}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: otpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSuccess(true);
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        userData.emailVerified = true;
        localStorage.setItem("user", JSON.stringify(userData));
        setUser((prev) => ({ ...prev, emailVerified: true }));
        window.dispatchEvent(new Event("login"));
        toast.success(t("editProfile.toastEmailVerified"));
        setTimeout(() => setShowOtpModal(false), 1500);
      } else {
        setOtpError(data.error || t("editProfile.otpInvalid"));
      }
    } catch {
      setOtpError(t("editProfile.otpVerificationFailed"));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const currentPicture = user?.picture || user?.profilePicture || null;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackground />
        <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
          <div className="text-center mb-8 animate-fade-in pt-15">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#2F3C96] via-[#474F97] to-[#D0C4E2] bg-clip-text text-transparent mb-1">
              <AuroraText
                speed={2.5}
                colors={["#2F3C96", "#474F97", "#757BB1", "#B8A5D5", "#D0C4E2"]}
              >
                {t("editProfile.title")}
              </AuroraText>
            </h1>
          </div>

          {/* OTP Verification Modal */}
          {showOtpModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={t("ui.close")}
                >
                  <X className="h-5 w-5" />
                </button>

                {otpSuccess ? (
                  <div className="py-4 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-9 w-9 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {t("editProfile.otpEmailVerifiedTitle")}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {t("editProfile.otpEmailVerifiedBody")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8E9F2]">
                        <Mail className="h-7 w-7 text-[#2F3C96]" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        {t("editProfile.otpEnterTitle")}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {t("editProfile.otpSentIntro")}{" "}
                        <span className="font-medium text-slate-700">
                          {user.email}
                        </span>
                      </p>
                    </div>

                    <div
                      className="flex justify-center gap-2 sm:gap-3"
                      onPaste={handleOtpPaste}
                    >
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={otpRefs[i]}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className={`h-12 w-10 rounded-lg border-2 text-center text-lg font-semibold transition-colors focus:outline-none sm:h-14 sm:w-12 sm:text-xl ${
                            otpError
                              ? "border-red-300 bg-red-50 text-red-700 focus:border-red-500"
                              : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#2F3C96] focus:bg-white"
                          }`}
                        />
                      ))}
                    </div>

                    {otpError && (
                      <p className="mt-3 text-center text-sm text-red-600">
                        {otpError}
                      </p>
                    )}

                    <button
                      onClick={() => handleVerifyOtp()}
                      disabled={verifyingOtp || otp.join("").length < 6}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F3C96] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#474F97] disabled:opacity-50"
                    >
                      {verifyingOtp ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("editProfile.verifying")}
                        </>
                      ) : (
                        t("editProfile.verifyEmail")
                      )}
                    </button>

                    <div className="mt-4 text-center">
                      <p className="text-xs text-slate-400">
                        {t("editProfile.otpDidntGet")}{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setVerificationSent(false);
                            handleSendVerificationEmail();
                          }}
                          disabled={sendingVerification}
                          className="font-medium text-[#2F3C96] hover:underline disabled:opacity-50"
                        >
                          {sendingVerification
                            ? t("editProfile.sending")
                            : t("editProfile.otpResend")}
                        </button>
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {t("editProfile.otpOrLinkHint")}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {/* Interface language — full-width bar */}
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-[#2F3C96]/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2F3C96]/15 bg-[#2F3C96]/10 text-[#2F3C96]"
                  aria-hidden
                >
                  <Globe className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-[#2F3C96]">
                    {t("profile.languageTitle")}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {t("profile.languageHint")}
                  </p>
                </div>
              </div>
              <div className="w-full shrink-0 sm:w-72 md:w-80">
                <LanguagePicker
                  showLabel={false}
                  className="w-full"
                  value={user?.preferredLanguage}
                  onChange={async (lng) => {
                    const r = await savePreferredLanguageToApi(lng);
                    if (r.ok) {
                      toast.success(t("editProfile.toastLanguageUpdated"));
                      try {
                        const u = JSON.parse(
                          localStorage.getItem("user") || "{}",
                        );
                        setUser((prev) => ({ ...prev, ...u }));
                      } catch {
                        /* ignore */
                      }
                    } else
                      toast.error(
                        r.error || t("editProfile.toastLanguageSaveFailed"),
                      );
                  }}
                />
              </div>
            </div>
            <p className="border-t border-slate-100 px-4 pb-4 pt-3 text-[11px] leading-relaxed text-slate-500 sm:px-6">
              {t("profile.languageBetaNotice")}
            </p>

            <div className="space-y-6 p-6">
              {/* Profile Picture Upload + Email badge + Researcher name */}
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                  <div className="shrink-0">
                    <ProfilePictureUpload
                      currentPicture={currentPicture}
                      onUpload={handlePictureUpload}
                      uploading={uploadingPicture}
                    />
                  </div>
                  {user?.emailVerified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700 whitespace-nowrap">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      {t("editProfile.emailVerifiedBadge")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (verificationSent) {
                          setShowOtpModal(true);
                          setOtpError("");
                          setTimeout(() => otpRefs[0]?.current?.focus(), 200);
                        } else {
                          handleSendVerificationEmail();
                        }
                      }}
                      disabled={sendingVerification}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100/90 transition-colors whitespace-nowrap disabled:opacity-60"
                    >
                      {sendingVerification ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                          {t("editProfile.sending")}
                        </>
                      ) : verificationSent ? (
                        <>
                          <Mail className="h-3 w-3 shrink-0" />
                          {t("editProfile.enterCode")}
                        </>
                      ) : (
                        <>
                          <Mail className="h-3 w-3 shrink-0" />
                          {t("editProfile.verifyEmail")}
                        </>
                      )}
                    </button>
                  )}
                </div>
                {user?.role === "researcher" && (
                  <div className="ml-auto flex flex-col items-end text-right min-w-0">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {getDisplayName(
                        {
                          username: username || user?.username,
                          name: username || user?.username,
                          role: "researcher",
                          profession: profile?.researcher?.profession,
                          certifications: profile?.researcher?.certifications,
                        },
                        t("editProfile.roleResearcher"),
                      )}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 mt-0.5">
                      <FileText className="w-4 h-4 text-[#2F3C96] shrink-0" />
                      {t("editProfile.postsCount", {
                        count: communityPostsCount,
                      })}
                    </span>
                  </div>
                )}
              </div>

              {user?.role === "patient" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {t("editProfile.patientPresetAvatarsTitle")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {t("editProfile.patientPresetAvatarsHint")}
                  </p>
                  <div
                    className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4"
                    role="list"
                    aria-label={t("editProfile.patientPresetAvatarsTitle")}
                  >
                    {patientPresetAvatarUrls.map((url, idx) => {
                      const selected = isSameProfilePicture(
                        currentPicture,
                        url,
                      );
                      const busy = savingPresetAvatarUrl === url;
                      return (
                        <button
                          key={url}
                          type="button"
                          role="listitem"
                          aria-pressed={selected}
                          aria-label={t("editProfile.patientPresetAvatarOption", {
                            n: idx + 1,
                          })}
                          disabled={
                            busy ||
                            !!savingPresetAvatarUrl ||
                            uploadingPicture
                          }
                          onClick={() => handlePresetAvatar(url)}
                          className={`relative flex aspect-square w-full max-w-[88px] mx-auto items-center justify-center rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3C96] focus-visible:ring-offset-2 disabled:opacity-60 ${
                            selected
                              ? "border-[#2F3C96] bg-white shadow-md ring-2 ring-[#2F3C96]/25"
                              : "border-slate-200 bg-white hover:border-[#474F97]/60 hover:shadow-sm"
                          }`}
                        >
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                            draggable={false}
                          />
                          {selected && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#2F3C96] text-white shadow">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {busy && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                              <Loader2 className="h-6 w-6 animate-spin text-[#2F3C96]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {user?.role === "researcher" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {t("editProfile.researcherPresetAvatarsTitle")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {t("editProfile.researcherPresetAvatarsHint")}
                  </p>
                  <div
                    className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4"
                    role="list"
                    aria-label={t("editProfile.researcherPresetAvatarsTitle")}
                  >
                    {researcherPresetAvatarUrls.map((url, idx) => {
                      const selected = isSameProfilePicture(
                        currentPicture,
                        url,
                      );
                      const busy = savingPresetAvatarUrl === url;
                      return (
                        <button
                          key={url}
                          type="button"
                          role="listitem"
                          aria-pressed={selected}
                          aria-label={t(
                            "editProfile.researcherPresetAvatarOption",
                            { n: idx + 1 },
                          )}
                          disabled={
                            busy ||
                            !!savingPresetAvatarUrl ||
                            uploadingPicture
                          }
                          onClick={() => handlePresetAvatar(url)}
                          className={`relative flex aspect-square w-full max-w-[88px] mx-auto items-center justify-center rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3C96] focus-visible:ring-offset-2 disabled:opacity-60 ${
                            selected
                              ? "border-[#2F3C96] bg-white shadow-md ring-2 ring-[#2F3C96]/25"
                              : "border-slate-200 bg-white hover:border-[#474F97]/60 hover:shadow-sm"
                          }`}
                        >
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                            draggable={false}
                          />
                          {selected && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#2F3C96] text-white shadow">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {busy && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                              <Loader2 className="h-6 w-6 animate-spin text-[#2F3C96]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Personal Information Section */}
              <div className="pt-6 border-t border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-6">
                  {t("editProfile.personalInfo")}
                </h2>
              </div>

              {/* Full Name - Mandatory */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("editProfile.fullNameLabel")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t("editProfile.fullNamePlaceholder")}
                  required
                />
              </div>

              {/* Handle/Username */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("editProfile.handleLabel")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative" data-username-suggestions>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => {
                      let value = e.target.value.replace(/^@+/, "");
                      setHandle(value);
                      setShowUsernameSuggestions(value.length === 0);
                    }}
                    onFocus={() => setShowUsernameSuggestions(true)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t("editProfile.handlePlaceholder")}
                  />
                  {showUsernameSuggestions &&
                    usernameSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg">
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-600">
                              {t("editProfile.suggestedUsernames")}
                            </p>
                            <button
                              type="button"
                              onClick={refreshUsernameSuggestions}
                              className="flex items-center gap-1 text-xs text-[#2F3C96] hover:text-[#253075] transition-colors"
                              title={t("editProfile.refreshSuggestionsTitle")}
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>{t("editProfile.refresh")}</span>
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {usernameSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setHandle(suggestion);
                                  setShowUsernameSuggestions(false);
                                }}
                                className="px-3 py-1.5 text-xs font-medium bg-[#2F3C96]/10 text-[#2F3C96] rounded-lg hover:bg-[#2F3C96]/20 transition-all"
                              >
                                @{suggestion}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowUsernameSuggestions(false)}
                            className="text-xs text-slate-500 hover:text-slate-700"
                          >
                            {t("editProfile.hideSuggestions")}
                          </button>
                        </div>
                      </div>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {t("editProfile.handleHint")}
                </p>
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("editProfile.ageLabel")}
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="0"
                  max="120"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t("editProfile.agePlaceholder")}
                />
              </div>

              {/* Sex */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("editProfile.genderLabel")}
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t("editProfile.genderSelect")}</option>
                  <option value="male">{t("editProfile.genderMale")}</option>
                  <option value="female">
                    {t("editProfile.genderFemale")}
                  </option>
                  <option value="other">{t("editProfile.genderOther")}</option>
                  <option value="prefer-not-to-say">
                    {t("editProfile.genderPreferNot")}
                  </option>
                </select>
              </div>

              {/* Ethnicity */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Ethnicity
                </label>
                <CustomSelect
                  value={ethnicity}
                  onChange={setEthnicity}
                  options={flatEthnicityOptions}
                  placeholder="Select ethnicity"
                  variant="default"
                  searchable
                  searchPlaceholder="Search ethnicity..."
                  maxDropdownHeight={300}
                  className="w-full"
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("editProfile.cityLabel")}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onBlur={(e) => {
                      const corrected = capitalizeText(e.target.value);
                      setCity(corrected);
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t("editProfile.cityPlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("editProfile.countryLabel")}
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    onBlur={(e) => {
                      const corrected = capitalizeText(e.target.value);
                      setCountry(corrected);
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t("editProfile.countryPlaceholder")}
                  />
                </div>
              </div>

              {/* Medical Information Section */}
              <div className="pt-6 border-t border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-6">
                  {t("editProfile.medicalInfo")}
                </h2>
              </div>

              {isCollabioraPro ? (
                <div className="mb-8 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {t("editProfile.wellnessOnlySectionTitle")}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {t("editProfile.wellnessOnlySectionBody")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setWellnessModalOpen(true)}
                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#5B4B8A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4a3d72]"
                  >
                    {t("editProfile.wellnessOnlyOpenButton")}
                  </button>
                </div>
              ) : null}

              {/* Role-specific fields */}
              {user?.role === "patient" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      {t("editProfile.conditionsInterestedLabel")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <Info
                        size={16}
                        className="text-slate-400 hover:text-slate-600 cursor-help transition-colors"
                        onMouseEnter={() => setShowInfoTooltip(true)}
                        onMouseLeave={() => setShowInfoTooltip(false)}
                      />
                      {showInfoTooltip && (
                        <div className="absolute left-0 top-6 z-50 w-72 p-3 bg-white border border-slate-200 rounded-lg shadow-xl text-xs text-slate-700 pointer-events-none">
                          <p className="font-semibold mb-2 text-slate-900">
                            {t("editProfile.symptomTooltipTitle")}
                          </p>
                          <p className="leading-relaxed">
                            {t("editProfile.symptomTooltipBody")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <SmartSearchInput
                        value={conditionInput}
                        onChange={setConditionInput}
                        onSubmit={handleConditionSubmit}
                        placeholder={t(
                          "editProfile.conditionSearchPlaceholder",
                        )}
                        extraTerms={[
                          ...commonConditions,
                          ...SMART_SUGGESTION_KEYWORDS,
                          ...icd11Suggestions,
                        ]}
                        canonicalMap={conditionsCanonicalMap}
                        maxSuggestions={8}
                        autoSubmitOnSelect={true}
                        inputClassName="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {isExtracting && (
                        <div className="absolute right-3 top-2.5 flex items-center gap-1">
                          <Sparkles
                            size={14}
                            className="animate-pulse text-blue-600"
                          />
                        </div>
                      )}
                    </div>
                    {conditionInput && conditionInput.trim().length >= 1 && (
                      <button
                        type="button"
                        onClick={() => handleConditionSubmit(conditionInput)}
                        disabled={isExtracting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {t("editProfile.add")}
                      </button>
                    )}
                  </div>

                  {/* Selected Conditions Chips */}
                  {selectedConditions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedConditions.map((condition, idx) => {
                        const isIdentified =
                          identifiedConditions.includes(condition);
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            {isIdentified && (
                              <Sparkles size={12} className="text-blue-600" />
                            )}
                            {condition}
                            <button
                              type="button"
                              onClick={() => toggleCondition(condition)}
                              className="ml-1 hover:opacity-70 transition-opacity text-blue-600"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Helper text */}
                  <p className="text-xs text-slate-500">
                    {t("editProfile.conditionHelper")}
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("editProfile.specialtiesLabel")}{" "}
                      <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {t("editProfile.commaSeparated")}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={specialties}
                      onChange={(e) => setSpecialties(e.target.value)}
                      onBlur={(e) => {
                        const corrected = capitalizeCommaSeparated(
                          e.target.value,
                        );
                        setSpecialties(corrected);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t("editProfile.specialtiesPlaceholder")}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("editProfile.researchInterestsLabel")}{" "}
                      <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {t("editProfile.commaSeparated")}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      onBlur={(e) => {
                        const corrected = capitalizeCommaSeparated(
                          e.target.value,
                        );
                        setInterests(corrected);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t("editProfile.interestsPlaceholder")}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("editProfile.institutionLabel")}
                    </label>
                    <UniversityInput
                      value={institutionAffiliation}
                      onChange={setInstitutionAffiliation}
                      onBlur={(e) => {
                        if (
                          institutionAffiliation &&
                          institutionAffiliation.trim()
                        ) {
                          const corrected = capitalizeText(
                            institutionAffiliation,
                          );
                          setInstitutionAffiliation(corrected);
                        }
                      }}
                      allowManualFallback
                      placeholder={t("editProfile.institutionPlaceholder")}
                      maxSuggestions={10}
                      className="w-full"
                      inputClassName="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {t("editProfile.institutionHint")}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("editProfile.orcidLabel")}
                    </label>
                    <input
                      type="text"
                      value={orcid}
                      onChange={(e) => setOrcid(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t("editProfile.orcidPlaceholder")}
                    />
                  </div>

                  {/* Select publications to display on profile — ORCID + OpenAlex */}
                  {orcid?.trim() && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-[#2F3C96]" />
                          <div>
                            <h3 className="text-sm font-semibold text-slate-800">
                              {t("editProfile.publicationsDisplayTitle")}
                            </h3>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {t("editProfile.publicationsDisplayHint")}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowManagePublications(true)}
                          className="shrink-0 px-4 py-2 bg-[#2F3C96] text-white rounded-lg text-sm font-medium hover:bg-[#253075] transition-colors"
                        >
                          {t("editProfile.managePublications")}
                        </button>
                      </div>
                      {profile?.researcher?.selectedPublications?.length >
                        0 && (
                        <p className="text-xs text-slate-500 mt-2">
                          {t("editProfile.publicationsCountHint", {
                            count:
                              profile.researcher.selectedPublications.length,
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#2F3C96]" />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">
                            {t("editProfile.addWorkTitle")}
                          </h3>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {t("editProfile.addWorkHint")}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSubmitWorkModal(true)}
                        className="shrink-0 px-4 py-2 bg-[#2F3C96] text-white rounded-lg text-sm font-medium hover:bg-[#253075] transition-colors"
                      >
                        {t("editProfile.submitWork")}
                      </button>
                    </div>
                  </div>

                  {/* Academic profiles: ResearchGate & Academia.edu — moderator verification */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-5">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-[#2F3C96]" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        {t("editProfile.academicProfilesTitle")}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600">
                      {t("editProfile.academicProfilesHint")}
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          {t("editProfile.researchGateLabel")}
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="url"
                            value={researchGate}
                            onChange={(e) => setResearchGate(e.target.value)}
                            placeholder={t(
                              "editProfile.researchGatePlaceholder",
                            )}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <div className="flex items-center gap-2 shrink-0">
                            {!researchGateVerification && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleLinkAcademic(
                                    researchGate,
                                    "researchgate",
                                  )
                                }
                                disabled={
                                  linkingResearchGate || !researchGate?.trim()
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2F3C96] text-white rounded-lg text-sm font-medium hover:bg-[#253075] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {linkingResearchGate ? (
                                  <>
                                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                                    {t("editProfile.verifyingLink")}
                                  </>
                                ) : (
                                  t("editProfile.link")
                                )}
                              </button>
                            )}
                            <AcademicLinkStatusBadge
                              status={researchGateVerification}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          {t("editProfile.academiaLabel")}
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="url"
                            value={academiaEdu}
                            onChange={(e) => setAcademiaEdu(e.target.value)}
                            placeholder={t("editProfile.academiaPlaceholder")}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <div className="flex items-center gap-2 shrink-0">
                            {!academiaEduVerification && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleLinkAcademic(academiaEdu, "academia")
                                }
                                disabled={
                                  linkingAcademia || !academiaEdu?.trim()
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2F3C96] text-white rounded-lg text-sm font-medium hover:bg-[#253075] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {linkingAcademia ? (
                                  <>
                                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                                    {t("editProfile.verifyingLink")}
                                  </>
                                ) : (
                                  t("editProfile.link")
                                )}
                              </button>
                            )}
                            <AcademicLinkStatusBadge
                              status={academiaEduVerification}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">
                          {t("editProfile.academiaExampleHint")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("editProfile.bioLabel")}
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t("editProfile.bioPlaceholder")}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="available"
                      checked={available}
                      onChange={(e) => setAvailable(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="available"
                      className="text-sm text-slate-700"
                    >
                      {t("editProfile.availableCollaboration")}
                    </label>
                  </div>

                  {/* Meetings configuration */}
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            {t("editProfile.stripePayouts")}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {t("editProfile.stripeConnectHint")}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            stripeConnectStatus === "verified"
                              ? "bg-emerald-100 text-emerald-700"
                              : stripeConnectStatus === "pending"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {stripeConnectStatus === "verified"
                            ? t("editProfile.stripeVerified")
                            : stripeConnectStatus === "pending"
                              ? t("editProfile.stripeOnboardingPending")
                              : t("editProfile.stripeNotConnected")}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={connectStripeAccount}
                          disabled={stripeConnecting}
                          className="inline-flex items-center rounded-lg bg-[#2F3C96] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#253075] disabled:opacity-60"
                        >
                          {stripeConnecting
                            ? t("editProfile.stripeOpening")
                            : stripeConnectStatus === "verified"
                              ? t("editProfile.stripeReconnect")
                              : t("editProfile.stripeConnect")}
                        </button>
                        <button
                          type="button"
                          onClick={refreshStripeConnectStatus}
                          disabled={refreshingStripeStatus}
                          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        >
                          {refreshingStripeStatus
                            ? t("editProfile.stripeRefreshing")
                            : t("editProfile.stripeRefreshStatus")}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          {t("editProfile.meetingsTitle")}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {t("editProfile.meetingsHint")}
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={interestedInMeetings}
                          onChange={(e) => {
                            if (
                              e.target.checked &&
                              stripeConnectStatus !== "verified"
                            ) {
                              toast.error(
                                t("editProfile.errStripeBeforeMeetings"),
                              );
                              return;
                            }
                            setInterestedInMeetings(e.target.checked);
                          }}
                          disabled={stripeConnectStatus !== "verified"}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        {t("editProfile.acceptMeetingRequests")}
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          {t("editProfile.rateUsdLabel")}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-slate-500">$</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={meetingRate}
                            onChange={(e) => setMeetingRate(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={t("editProfile.ratePlaceholder")}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {t("editProfile.rateHint")}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          {t("editProfile.timezoneLabel")}
                        </label>
                        <select
                          value={meetingTimezone}
                          onChange={(e) => setMeetingTimezone(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {/* Recommended readable timezones */}
                          <option value="UTC">{t("editProfile.tzUTC")}</option>
                          <option value="America/Los_Angeles">
                            {t("editProfile.tzLosAngeles")}
                          </option>
                          <option value="America/New_York">
                            {t("editProfile.tzNewYork")}
                          </option>
                          <option value="Europe/London">
                            {t("editProfile.tzLondon")}
                          </option>
                          <option value="Europe/Berlin">
                            {t("editProfile.tzBerlin")}
                          </option>
                          <option value="Asia/Kolkata">
                            {t("editProfile.tzKolkata")}
                          </option>
                          <option value="Asia/Singapore">
                            {t("editProfile.tzSingapore")}
                          </option>
                          <option value="Australia/Sydney">
                            {t("editProfile.tzSydney")}
                          </option>
                          {/* Preserve any previously-saved custom timezone */}
                          {![
                            "UTC",
                            "America/Los_Angeles",
                            "America/New_York",
                            "Europe/London",
                            "Europe/Berlin",
                            "Asia/Kolkata",
                            "Asia/Singapore",
                            "Australia/Sydney",
                          ].includes(meetingTimezone) && (
                            <option value={meetingTimezone}>
                              {meetingTimezone}
                            </option>
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setMeetingTimezone(
                              Intl.DateTimeFormat().resolvedOptions()
                                .timeZone || "UTC",
                            )
                          }
                          className="mt-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                        >
                          {t("editProfile.useDetectedTimezone")}
                        </button>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {t("editProfile.timezoneSlotsHint")}
                        </p>
                      </div>
                    </div>

                    {/* Availability UX */}
                    <div className="mt-2 space-y-4">
                      {/* Select days & quick presets */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-xs font-semibold text-slate-700">
                            {t("editProfile.selectDays")}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                // Weekdays 9–5
                                const preset = [1, 2, 3, 4, 5];
                                setWeeklyAvailability((prev) =>
                                  prev.map((day) => {
                                    if (preset.includes(day.dayOfWeek)) {
                                      return {
                                        ...day,
                                        enabled: true,
                                        windows: [
                                          {
                                            startTime: "09:00",
                                            endTime: "17:00",
                                          },
                                        ],
                                      };
                                    }
                                    return {
                                      ...day,
                                      enabled: false,
                                      windows: [],
                                    };
                                  }),
                                );
                              }}
                              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                            >
                              {t("editProfile.presetWeekdays")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // Evenings every day 18–21
                                setWeeklyAvailability((prev) =>
                                  prev.map((day) => ({
                                    ...day,
                                    enabled: true,
                                    windows: [
                                      { startTime: "18:00", endTime: "21:00" },
                                    ],
                                  })),
                                );
                              }}
                              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                            >
                              {t("editProfile.presetEvenings")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // Custom = clear, let user choose
                                setWeeklyAvailability((prev) =>
                                  prev.map((day) => ({
                                    ...day,
                                    enabled: false,
                                    windows: [],
                                  })),
                                );
                              }}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                            >
                              {t("editProfile.presetCustom")}
                            </button>
                          </div>
                        </div>

                        <div className="inline-flex flex-wrap gap-1.5 rounded-lg bg-white px-2.5 py-2 border border-slate-200">
                          {weekdayShortLabels.map((label, idx) => {
                            const day = weeklyAvailability[idx];
                            const active = day?.enabled;
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() =>
                                  setWeeklyAvailability((prev) =>
                                    prev.map((d, i) =>
                                      i === idx
                                        ? {
                                            ...d,
                                            enabled: !d.enabled,
                                            windows:
                                              !d.enabled &&
                                              d.windows.length === 0
                                                ? [
                                                    {
                                                      startTime: "09:00",
                                                      endTime: "13:00",
                                                    },
                                                  ]
                                                : d.windows,
                                          }
                                        : d,
                                    ),
                                  )
                                }
                                className={`min-w-[2.25rem] px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                                  active
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Time windows */}
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          {t("editProfile.timeWindows")}
                        </label>
                        <p className="text-[11px] text-slate-500 mb-1">
                          {t("editProfile.timeWindowsHint")}
                        </p>
                        <div className="space-y-2">
                          {weekdayLongLabels.map((label, idx) => {
                            const day = weeklyAvailability[idx];
                            if (!day.enabled) return null;
                            return (
                              <div
                                key={label}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-medium text-slate-800">
                                    {label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setWeeklyAvailability((prev) =>
                                        prev.map((d, i) =>
                                          i === idx
                                            ? {
                                                ...d,
                                                windows: [
                                                  ...d.windows,
                                                  {
                                                    startTime: "09:00",
                                                    endTime: "13:00",
                                                  },
                                                ],
                                              }
                                            : d,
                                        ),
                                      )
                                    }
                                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                                  >
                                    {t("editProfile.addWindow")}
                                  </button>
                                </div>
                                {(day.windows.length > 0
                                  ? day.windows
                                  : [{ startTime: "09:00", endTime: "13:00" }]
                                ).map((window, wIdx) => (
                                  <div
                                    key={wIdx}
                                    className="flex items-center gap-2 justify-between"
                                  >
                                    <span className="text-[11px] text-slate-500">
                                      {day.windows.length > 1
                                        ? t("editProfile.windowNumber", {
                                            n: wIdx + 1,
                                          })
                                        : t("editProfile.windowLabel")}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={window.startTime || "09:00"}
                                        onChange={(e) =>
                                          setWeeklyAvailability((prev) =>
                                            prev.map((d, i) =>
                                              i === idx
                                                ? {
                                                    ...d,
                                                    windows: d.windows.map(
                                                      (w, j) =>
                                                        j === wIdx
                                                          ? {
                                                              ...w,
                                                              startTime:
                                                                e.target.value,
                                                            }
                                                          : w,
                                                    ),
                                                  }
                                                : d,
                                            ),
                                          )
                                        }
                                        className="w-22 px-1.5 py-1 border border-slate-300 rounded-md text-[11px] bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        {Array.from({ length: 48 }).map(
                                          (_, i) => {
                                            const hours = Math.floor(i / 2)
                                              .toString()
                                              .padStart(2, "0");
                                            const minutes =
                                              i % 2 === 0 ? "00" : "30";
                                            const value = `${hours}:${minutes}`;
                                            return (
                                              <option key={value} value={value}>
                                                {value}
                                              </option>
                                            );
                                          },
                                        )}
                                      </select>
                                      <span className="text-[10px] text-slate-500">
                                        {t("editProfile.timeTo")}
                                      </span>
                                      <select
                                        value={window.endTime || "13:00"}
                                        onChange={(e) =>
                                          setWeeklyAvailability((prev) =>
                                            prev.map((d, i) =>
                                              i === idx
                                                ? {
                                                    ...d,
                                                    windows: d.windows.map(
                                                      (w, j) =>
                                                        j === wIdx
                                                          ? {
                                                              ...w,
                                                              endTime:
                                                                e.target.value,
                                                            }
                                                          : w,
                                                    ),
                                                  }
                                                : d,
                                            ),
                                          )
                                        }
                                        className="w-22 px-1.5 py-1 border border-slate-300 rounded-md text-[11px] bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        {Array.from({ length: 48 }).map(
                                          (_, i) => {
                                            const hours = Math.floor(i / 2)
                                              .toString()
                                              .padStart(2, "0");
                                            const minutes =
                                              i % 2 === 0 ? "00" : "30";
                                            const value = `${hours}:${minutes}`;
                                            return (
                                              <option key={value} value={value}>
                                                {value}
                                              </option>
                                            );
                                          },
                                        )}
                                      </select>
                                    </div>
                                    {day.windows.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setWeeklyAvailability((prev) =>
                                            prev.map((d, i) =>
                                              i === idx
                                                ? {
                                                    ...d,
                                                    windows: d.windows.filter(
                                                      (_, j) => j !== wIdx,
                                                    ),
                                                  }
                                                : d,
                                            ),
                                          )
                                        }
                                        className="text-[11px] text-slate-500 hover:text-rose-600"
                                      >
                                        {t("editProfile.remove")}
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <p className="mt-1 text-[11px] text-slate-500">
                        {t("editProfile.slotsBookableHint")}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving
                    ? t("editProfile.saving")
                    : t("editProfile.saveChanges")}
                </button>
              </div>
            </div>
          </div>

          {/* Followed Communities and People Section */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Followed Communities */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-purple-100 px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-bold text-slate-800">
                    {t("editProfile.communitiesTitle")}
                  </h2>
                  <span className="ml-auto px-2 py-0.5 bg-purple-600 text-white rounded-full text-xs font-medium">
                    {followedCommunities.length}
                  </span>
                </div>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {loadingFollowed ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : followedCommunities.length > 0 ? (
                  <div className="space-y-3">
                    {followedCommunities.map((community) => (
                      <div
                        key={community._id}
                        className="bg-white border border-slate-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() =>
                          navigate(`/forums?communityId=${community._id}`)
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                            {(() => {
                              const IconComponent = getCommunityIcon(
                                community.slug,
                                community.name,
                              );
                              const iconColor = community.color || "#9333ea";
                              return (
                                <IconComponent
                                  className="shrink-0"
                                  style={{
                                    color: iconColor,
                                    width: "1.25rem",
                                    height: "1.25rem",
                                  }}
                                  stroke={1.5}
                                />
                              );
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-800 mb-1">
                              {community.name}
                            </h3>
                            {community.description && (
                              <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                                {community.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {community.memberCount || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {community.threadCount || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">
                      {t("editProfile.noCommunitiesYet")}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/forums")}
                      className="mt-3 text-purple-600 hover:text-purple-700 font-medium text-sm"
                    >
                      {t("editProfile.exploreCommunities")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Followed People */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-green-100 px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-bold text-slate-800">
                    {t("editProfile.followingTitle")}
                  </h2>
                  <span className="ml-auto px-2 py-0.5 bg-green-600 text-white rounded-full text-xs font-medium">
                    {followedPeople.length}
                  </span>
                </div>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {loadingFollowed ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : followedPeople.length > 0 ? (
                  <div className="space-y-3">
                    {followedPeople.map((person) => {
                      const personInitial = (person.username || "U")
                        .charAt(0)
                        .toUpperCase();
                      return (
                        <div
                          key={person._id}
                          className="bg-white border border-slate-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => {
                            if (person.role === "researcher") {
                              navigate(`/expert/${person._id}`);
                            } else {
                              navigate(`/profile/${person._id}`);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {person.picture ? (
                              <img
                                src={person.picture}
                                alt={person.username}
                                className="w-12 h-12 rounded-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-lg shrink-0 ${
                                person.picture ? "hidden" : ""
                              }`}
                            >
                              {personInitial}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-800">
                                  {person.username ||
                                    t("editProfile.anonymousUser")}
                                </h3>
                                {person.role && (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                      person.role === "researcher"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {person.role === "researcher"
                                      ? t("editProfile.roleResearcher")
                                      : t("editProfile.rolePatient")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <UserCheck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">{t("editProfile.noFollowingYet")}</p>
                    <button
                      type="button"
                      onClick={() => navigate("/discovery")}
                      className="mt-3 text-green-600 hover:text-green-700 font-medium text-sm"
                    >
                      {t("editProfile.discoverPeople")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Manage Profile Publications Modal — researchers only */}
        {user?.role === "researcher" && (
          <ManageProfilePublications
            isOpen={showManagePublications}
            onClose={() => setShowManagePublications(false)}
            baseUrl={base}
            token={localStorage.getItem("token")}
            existingSelected={profile?.researcher?.selectedPublications || []}
            onSaved={() => {
              loadProfile(user._id || user.id);
              toast.success(t("editProfile.toastPublicationsUpdated"));
            }}
          />
        )}
        {user?.role === "researcher" && (
          <SubmitWorkModal
            isOpen={showSubmitWorkModal}
            onClose={() => setShowSubmitWorkModal(false)}
            baseUrl={base}
            token={localStorage.getItem("token")}
          />
        )}
        {isCollabioraPro ? (
          <WellnessOnlySettingsModal
            open={wellnessModalOpen}
            onClose={() => setWellnessModalOpen(false)}
          />
        ) : null}
      </div>
    </Layout>
  );
}
