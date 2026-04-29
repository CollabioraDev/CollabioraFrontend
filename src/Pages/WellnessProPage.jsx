"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import Fuse from "fuse.js";
import {
  Leaf,
  PersonStanding,
  Pill,
  ArrowUpRight,
  ChevronDown,
  X,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import apiFetch from "../utils/api.js";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import { DISCLAIMER, getWellnessPlan } from "../lib/wellness/getWellnessPlan.js";
import {
  COMMON_SUPPLEMENT_PICKS,
  getSupplementDrugInteractionFlags,
} from "../lib/wellness/supplementInteractions.js";
import {
  blurbForDietTag,
  buildDailyExercisePlan,
  buildDailyMeals,
  buildYoriStyleDietToday,
  buildYoriStyleWorkoutToday,
  getAlternateMealLine,
} from "../lib/wellness/wellnessProGenerators.js";
import { dedupeSupplementLines } from "../lib/wellness/supplementDedupe.js";
import {
  buildSnapshotPayload,
  getWellnessLocalDateKey,
  readWellnessDailyPlans,
  writeWellnessDailyPlans,
  writeWellnessProSnapshot,
  WELLNESS_SNAPSHOT_UPDATED,
} from "../lib/wellness/wellnessProStorage.js";
import {
  createWellnessSnapshotState,
  mapWellnessGoal,
} from "../lib/wellness/wellnessOnlyShared.js";
import {
  buildWellnessProfileBlock,
  openFloatingChatWellness,
  promptDietTopicDeeper,
  promptExerciseTagDeeper,
  promptImportantNoteDeeper,
  wellnessDietTopicDisplay,
  wellnessExerciseTagDisplay,
  wellnessImportantNoteDisplay,
} from "../utils/wellnessYoriChat.js";
import WellnessInfoTip from "../components/wellness/WellnessInfoTip.jsx";
import WellnessPersonalizedPlanResult from "../components/wellness/WellnessPersonalizedPlanResult.jsx";
import {
  getWhyForDietTag,
  getWhyForExerciseTag,
  getWhyForSupplement,
} from "../lib/wellness/wellnessWhyReasons.js";
import {
  replaceMealBodyInDietMarkdown,
  splitDietPlanForMealCards,
} from "../lib/wellness/wellnessDietMarkdownCards.js";

export default function WellnessProPage() {
  const initialRef = useRef(null);
  if (initialRef.current === null) {
    initialRef.current = createWellnessSnapshotState();
  }
  const init = initialRef.current;

  const [age, setAge] = useState(init.age);
  const [sex, setSex] = useState(init.sex);
  const [healthJourney, setHealthJourney] = useState(init.healthJourney);
  const [focus, setFocus] = useState(init.focus);
  const [coSelected, setCoSelected] = useState(init.coSelected);
  const [diet, setDiet] = useState(init.diet);
  const [activity, setActivity] = useState(init.activity);
  const [foodLikes, setFoodLikes] = useState(init.foodLikes);
  const [foodDislikes, setFoodDislikes] = useState(init.foodDislikes);

  const [medications, setMedications] = useState(init.medications);
  const [manualSupplements, setManualSupplements] = useState(
    init.manualSupplements,
  );
  const [dismissedSupplements, setDismissedSupplements] = useState(
    init.dismissedSupplements,
  );
  const [suppInput, setSuppInput] = useState("");
  const [topicModal, setTopicModal] = useState(null);
  const [vitExpanded, setVitExpanded] = useState(false);
  const [personalizedDietReply, setPersonalizedDietReply] = useState(null);
  const [personalizedWorkoutReply, setPersonalizedWorkoutReply] =
    useState(null);
  const [dietDayNotes, setDietDayNotes] = useState("");
  const [workoutDayNotes, setWorkoutDayNotes] = useState("");
  const [calorieTargetInput, setCalorieTargetInput] = useState("");
  const [dietVariationIdx, setDietVariationIdx] = useState(0);
  const [workoutVariationIdx, setWorkoutVariationIdx] = useState(0);
  const [dietPlanLoading, setDietPlanLoading] = useState(false);
  const [workoutPlanLoading, setWorkoutPlanLoading] = useState(false);
  const [personalizedBanner, setPersonalizedBanner] = useState(null);
  const [mealSlotLoading, setMealSlotLoading] = useState(null);
  const [mealRefreshMessage, setMealRefreshMessage] = useState(null);
  const [dailyReady, setDailyReady] = useState(false);
  const personalizedResultsRef = useRef(null);
  const profileFingerprintPrevRef = useRef(null);
  const dailyHydrateOnceRef = useRef(false);
  const mealSlotSeedsRef = useRef({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snacks: 0,
  });

  const goal = useMemo(
    () => mapWellnessGoal(healthJourney, focus),
    [healthJourney, focus],
  );

  const applySnapshotFromStorage = useCallback(() => {
    const snap = createWellnessSnapshotState();
    setAge(snap.age);
    setSex(snap.sex);
    setHealthJourney(snap.healthJourney);
    setFocus(snap.focus);
    setCoSelected(snap.coSelected);
    setDiet(snap.diet);
    setActivity(snap.activity);
    setFoodLikes(snap.foodLikes);
    setFoodDislikes(snap.foodDislikes);
    setMedications(snap.medications);
    setManualSupplements(snap.manualSupplements);
    setDismissedSupplements(snap.dismissedSupplements);
  }, []);

  useEffect(() => {
    const onUpdate = () => applySnapshotFromStorage();
    window.addEventListener(WELLNESS_SNAPSHOT_UPDATED, onUpdate);
    return () =>
      window.removeEventListener(WELLNESS_SNAPSHOT_UPDATED, onUpdate);
  }, [applySnapshotFromStorage]);

  useEffect(() => {
    if (!personalizedDietReply && !personalizedWorkoutReply) return;
    const el = personalizedResultsRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [personalizedDietReply, personalizedWorkoutReply]);

  const comorbiditySet = useMemo(() => {
    const s = new Set(coSelected);
    if (s.has("none")) return new Set(["none"]);
    s.delete("none");
    return s;
  }, [coSelected]);

  const plan = useMemo(
    () =>
      getWellnessPlan(age, sex, goal, comorbiditySet, diet, activity),
    [age, sex, goal, comorbiditySet, diet, activity],
  );

  const wellnessProfileBlock = useMemo(
    () =>
      buildWellnessProfileBlock({
        age,
        sex,
        goal,
        coSelected: comorbiditySet,
        diet,
        activity,
        plan,
        healthJourney,
        focus,
        foodLikes,
        foodDislikes,
      }),
    [
      age,
      sex,
      goal,
      comorbiditySet,
      diet,
      activity,
      plan,
      healthJourney,
      focus,
      foodLikes,
      foodDislikes,
    ],
  );

  const whyCtx = useMemo(
    () => ({
      plan,
      co: comorbiditySet,
      age,
      sex,
      goal,
      diet,
      activity,
      healthJourney,
    }),
    [plan, comorbiditySet, age, sex, goal, diet, activity, healthJourney],
  );

  const dislikesList = useMemo(
    () =>
      foodDislikes
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [foodDislikes],
  );

  const meals = useMemo(
    () =>
      buildDailyMeals(plan, {
        healthFocus: healthJourney === "manage" ? "manage" : "prevent",
        likes: foodLikes,
        dislikes: dislikesList,
        co: comorbiditySet,
      }),
    [plan, healthJourney, foodLikes, dislikesList, comorbiditySet],
  );

  const exerciseDay = useMemo(
    () =>
      buildDailyExercisePlan(plan, {
        healthFocus: healthJourney === "manage" ? "manage" : "prevent",
        co: comorbiditySet,
        activity,
      }),
    [plan, healthJourney, comorbiditySet, activity],
  );

  const dismissedSuppSet = useMemo(
    () => new Set(dismissedSupplements),
    [dismissedSupplements],
  );

  const planVitTagsVisible = useMemo(
    () => plan.vitTags.filter((t) => !dismissedSuppSet.has(t)),
    [plan.vitTags, dismissedSuppSet],
  );

  const allSupplementLines = useMemo(
    () =>
      dedupeSupplementLines([...planVitTagsVisible, ...manualSupplements]),
    [planVitTagsVisible, manualSupplements],
  );

  const displayedSupplementLines = useMemo(
    () =>
      !vitExpanded && allSupplementLines.length > 10
        ? allSupplementLines.slice(0, 10)
        : allSupplementLines,
    [vitExpanded, allSupplementLines],
  );

  const interactionFlags = useMemo(
    () =>
      getSupplementDrugInteractionFlags(medications, allSupplementLines),
    [medications, allSupplementLines],
  );

  const fuseSupp = useMemo(
    () =>
      new Fuse(
        COMMON_SUPPLEMENT_PICKS.map((label) => ({ label })),
        { keys: ["label"], threshold: 0.4 },
      ),
    [],
  );

  const suppSuggestions = useMemo(() => {
    const q = suppInput.trim();
    if (q.length < 1) return COMMON_SUPPLEMENT_PICKS.slice(0, 8);
    return fuseSupp.search(q, { limit: 8 }).map((r) => r.item.label);
  }, [fuseSupp, suppInput]);

  const addManualSupp = useCallback((line) => {
    const t = line.trim();
    if (!t) return;
    setManualSupplements((s) => (s.includes(t) ? s : [...s, t]));
    setSuppInput("");
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      writeWellnessProSnapshot(
        buildSnapshotPayload({
          age,
          sex,
          healthJourney,
          focus,
          coSelected,
          diet,
          activity,
          foodLikes,
          foodDislikes,
          medications,
          manualSupplements,
          dismissedSupplements,
        }),
      );
    }, 250);
    return () => window.clearTimeout(id);
  }, [
    age,
    sex,
    healthJourney,
    focus,
    coSelected,
    diet,
    activity,
    foodLikes,
    foodDislikes,
    medications,
    manualSupplements,
    dismissedSupplements,
  ]);

  const profileFingerprint = useMemo(
    () =>
      JSON.stringify(
        buildSnapshotPayload({
          age,
          sex,
          healthJourney,
          focus,
          coSelected,
          diet,
          activity,
          foodLikes,
          foodDislikes,
          medications,
          manualSupplements,
          dismissedSupplements,
        }),
      ),
    [
      age,
      sex,
      healthJourney,
      focus,
      coSelected,
      diet,
      activity,
      foodLikes,
      foodDislikes,
      medications,
      manualSupplements,
      dismissedSupplements,
    ],
  );

  /** Same fingerprint as persist effect; hydrate must use this (not a fresh storage read) so cache hits match writes. */
  const profileFingerprintRef = useRef(profileFingerprint);
  profileFingerprintRef.current = profileFingerprint;

  const personalizedProfile = useMemo(
    () => ({ age, sex, activity }),
    [age, sex, activity],
  );

  useEffect(() => {
    if (!mealRefreshMessage) return undefined;
    const t = window.setTimeout(() => setMealRefreshMessage(null), 6000);
    return () => window.clearTimeout(t);
  }, [mealRefreshMessage]);

  const applyLocalDietFallback = (variationIndex) => {
    setPersonalizedDietReply({
      kind: "diet",
      title: "Today's eating plan",
      source: "local",
      macros: null,
      warnings: null,
      body: buildYoriStyleDietToday({
        plan,
        meals,
        healthJourney,
        foodLikes,
        dislikesList,
        diet,
        profile: personalizedProfile,
        extraNotes: dietDayNotes,
        calorieTarget: calorieTargetInput,
        variationIndex: variationIndex,
      }),
    });
  };

  const applyLocalWorkoutFallback = (variationIndex) => {
    setPersonalizedWorkoutReply({
      kind: "workout",
      title: "Today's movement plan",
      source: "local",
      macros: null,
      warnings: null,
      body: buildYoriStyleWorkoutToday({
        exerciseDay,
        plan,
        activity,
        healthJourney,
        profile: personalizedProfile,
        extraNotes: workoutDayNotes,
        variationIndex: variationIndex,
      }),
    });
  };

  const fetchPersonalizedOrFallback = async (type, variationSeed) => {
    if (type === "diet") setDietPlanLoading(true);
    else setWorkoutPlanLoading(true);
    setPersonalizedBanner(null);
    try {
      const res = await apiFetch("/api/wellness-pro/personalized-plan", {
        method: "POST",
        body: JSON.stringify({
          type,
          age,
          sex,
          healthJourney,
          focus,
          co: [...coSelected],
          diet,
          activity,
          foodLikes,
          foodDislikes,
          medications,
          manualSupplements,
          userNotes: type === "diet" ? dietDayNotes : workoutDayNotes,
          calorieTarget: type === "diet" ? calorieTargetInput : "",
          variationSeed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && typeof data.markdown === "string" && data.markdown.trim()) {
        const reply = {
          kind: type,
          title:
            type === "diet"
              ? "Today's eating plan"
              : "Today's movement plan",
          body: data.markdown.trim(),
          macros: data.macros || null,
          warnings: Array.isArray(data.warnings) ? data.warnings : null,
          source: "yori",
        };
        if (type === "diet") setPersonalizedDietReply(reply);
        else setPersonalizedWorkoutReply(reply);
        return;
      }
      setPersonalizedBanner(
        typeof data?.error === "string" && data.error
          ? `${data.error} — showing a template plan.`
          : "Yori couldn't generate a plan right now — showing a template instead. You can still use Ask Yori in chat for more depth.",
      );
      if (type === "diet") applyLocalDietFallback(variationSeed);
      else applyLocalWorkoutFallback(variationSeed);
    } catch {
      setPersonalizedBanner(
        "Network error — showing a template plan. Check your connection or try again.",
      );
      if (type === "diet") applyLocalDietFallback(variationSeed);
      else applyLocalWorkoutFallback(variationSeed);
    } finally {
      if (type === "diet") setDietPlanLoading(false);
      else setWorkoutPlanLoading(false);
    }
  };

  const onCreateDiet = () => {
    setDietVariationIdx(0);
    void fetchPersonalizedOrFallback("diet", 0);
  };

  const onDifferentDietMix = () => {
    const next = dietVariationIdx + 1;
    setDietVariationIdx(next);
    void fetchPersonalizedOrFallback("diet", next);
  };

  const onCreateWorkout = () => {
    setWorkoutVariationIdx(0);
    void fetchPersonalizedOrFallback("workout", 0);
  };

  const onDifferentWorkoutFeel = () => {
    const next = workoutVariationIdx + 1;
    setWorkoutVariationIdx(next);
    void fetchPersonalizedOrFallback("workout", next);
  };

  /** Restore today's saved plans or auto-generate eating + movement plans on first visit. */
  useLayoutEffect(() => {
    if (dailyHydrateOnceRef.current) return;
    dailyHydrateOnceRef.current = true;

    const today = getWellnessLocalDateKey();
    const raw = readWellnessDailyPlans();
    const fp = profileFingerprintRef.current;

    let needDiet = true;
    let needWorkout = true;

    if (raw?.dateKey === today && raw.profileFingerprint === fp) {
      if (raw.personalizedDietReply) {
        setPersonalizedDietReply(raw.personalizedDietReply);
        needDiet = false;
      }
      if (raw.personalizedWorkoutReply) {
        setPersonalizedWorkoutReply(raw.personalizedWorkoutReply);
        needWorkout = false;
      }
      if (typeof raw.dietVariationIdx === "number") {
        setDietVariationIdx(raw.dietVariationIdx);
      }
      if (typeof raw.workoutVariationIdx === "number") {
        setWorkoutVariationIdx(raw.workoutVariationIdx);
      }
      if (typeof raw.dietDayNotes === "string") {
        setDietDayNotes(raw.dietDayNotes);
      }
      if (typeof raw.workoutDayNotes === "string") {
        setWorkoutDayNotes(raw.workoutDayNotes);
      }
      if (typeof raw.calorieTargetInput === "string") {
        setCalorieTargetInput(raw.calorieTargetInput);
      }
      if (
        typeof raw.personalizedBanner === "string" &&
        raw.personalizedBanner.trim()
      ) {
        setPersonalizedBanner(raw.personalizedBanner);
      }
    }

    profileFingerprintPrevRef.current = fp;
    setDailyReady(true);

    if (needDiet || needWorkout) {
      queueMicrotask(() => {
        if (needDiet) {
          void fetchPersonalizedOrFallback(
            "diet",
            raw?.dietVariationIdx ?? 0,
          );
        }
        if (needWorkout) {
          void fetchPersonalizedOrFallback(
            "workout",
            raw?.workoutVariationIdx ?? 0,
          );
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time hydrate + auto-fetch
  }, []);

  /** After wellness inputs change (profile / modal), regenerate plans for the same calendar day. */
  useEffect(() => {
    if (!dailyReady) return;
    const prev = profileFingerprintPrevRef.current;
    if (prev === profileFingerprint) return;
    profileFingerprintPrevRef.current = profileFingerprint;

    setPersonalizedDietReply(null);
    setPersonalizedWorkoutReply(null);
    setPersonalizedBanner(null);
    setMealRefreshMessage(null);
    setMealSlotLoading(null);
    setDietVariationIdx(0);
    setWorkoutVariationIdx(0);
    void fetchPersonalizedOrFallback("diet", 0);
    void fetchPersonalizedOrFallback("workout", 0);
  }, [profileFingerprint, dailyReady]);

  /** Persist personalized outputs for the local calendar day so leaving and returning keeps the same plans. */
  useEffect(() => {
    if (!dailyReady) return;
    const today = getWellnessLocalDateKey();
    const id = window.setTimeout(() => {
      writeWellnessDailyPlans({
        dateKey: today,
        profileFingerprint,
        personalizedDietReply,
        personalizedWorkoutReply,
        dietVariationIdx,
        workoutVariationIdx,
        dietDayNotes,
        workoutDayNotes,
        calorieTargetInput,
        personalizedBanner,
      });
    }, 120);
    return () => window.clearTimeout(id);
  }, [
    dailyReady,
    profileFingerprint,
    personalizedDietReply,
    personalizedWorkoutReply,
    dietVariationIdx,
    workoutVariationIdx,
    dietDayNotes,
    workoutDayNotes,
    calorieTargetInput,
    personalizedBanner,
  ]);

  const refreshDietMeal = useCallback(
    async (slot) => {
      const body = personalizedDietReply?.body;
      if (!body || personalizedDietReply?.kind !== "diet") return;
      setMealRefreshMessage(null);
      setMealSlotLoading(slot);
      mealSlotSeedsRef.current[slot] = (mealSlotSeedsRef.current[slot] ?? 0) + 1;
      const nextSeed = mealSlotSeedsRef.current[slot];
      try {
        const res = await apiFetch("/api/wellness-pro/personalized-plan", {
          method: "POST",
          body: JSON.stringify({
            type: "diet",
            age,
            sex,
            healthJourney,
            focus,
            co: [...coSelected],
            diet,
            activity,
            foodLikes,
            foodDislikes,
            medications,
            manualSupplements,
            userNotes: dietDayNotes,
            calorieTarget: calorieTargetInput,
            variationSeed: dietVariationIdx,
            mealSlot: slot,
            mealVariationSeed: nextSeed,
            currentMarkdown: body.slice(0, 50000),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (
          res.ok &&
          data.ok &&
          data.partial &&
          typeof data.mealBody === "string" &&
          data.mealBody.trim()
        ) {
          setPersonalizedDietReply((dr) => {
            if (!dr || dr.kind !== "diet") return dr;
            return {
              ...dr,
              body: replaceMealBodyInDietMarkdown(
                dr.body,
                slot,
                data.mealBody.trim(),
              ),
              warnings: Array.isArray(data.warnings) ? data.warnings : dr.warnings,
            };
          });
          return;
        }
        const fallback = getAlternateMealLine(
          slot,
          dislikesList,
          nextSeed + dietVariationIdx,
        );
        setPersonalizedDietReply((dr) => {
          if (!dr || dr.kind !== "diet") return dr;
          return {
            ...dr,
            body: replaceMealBodyInDietMarkdown(dr.body, slot, fallback),
          };
        });
        setMealRefreshMessage(
          typeof data?.error === "string" && data.error
            ? `${data.error} — showing a rotated template idea for this meal.`
            : "Couldn’t refresh this meal with Yori — showing a rotated template idea instead.",
        );
      } catch {
        const fallback = getAlternateMealLine(
          slot,
          dislikesList,
          nextSeed + dietVariationIdx,
        );
        setPersonalizedDietReply((dr) => {
          if (!dr || dr.kind !== "diet") return dr;
          return {
            ...dr,
            body: replaceMealBodyInDietMarkdown(dr.body, slot, fallback),
          };
        });
        setMealRefreshMessage(
          "Network error — showing a rotated template idea for this meal.",
        );
      } finally {
        setMealSlotLoading(null);
      }
    },
    [
      personalizedDietReply?.body,
      personalizedDietReply?.kind,
      age,
      sex,
      healthJourney,
      focus,
      coSelected,
      diet,
      activity,
      foodLikes,
      foodDislikes,
      medications,
      manualSupplements,
      dietDayNotes,
      calorieTargetInput,
      dietVariationIdx,
      dislikesList,
    ],
  );

  const importantNotes = [
    ...plan.cautions,
    ...interactionFlags.flags,
  ];

  const dietPlanMealSplit = useMemo(() => {
    if (
      personalizedDietReply?.kind !== "diet" ||
      !personalizedDietReply.body?.trim()
    ) {
      return null;
    }
    return splitDietPlanForMealCards(personalizedDietReply.body);
  }, [personalizedDietReply?.kind, personalizedDietReply?.body]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FAF8F5] text-slate-800">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-4xl px-4 pb-24 pt-16 sm:pt-20 md:px-6">
        <div className="mb-6 text-center lg:mb-8">
          <h1 className="mb-3 text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl">
            Wellness
          </h1>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        </div>

        <div className="relative z-0 mt-4 grid min-w-0 gap-4 overflow-visible md:grid-cols-2 has-[.wellness-tip:hover]:z-[480] has-[.wellness-tip:focus-within]:z-[480]">
          <article className="flex min-w-0 flex-col rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Leaf className="h-5 w-5 text-emerald-600" />
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                Diet approach
              </h3>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {plan.dietTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 py-1 pl-2.5 pr-1"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setTopicModal({ title: tag, body: blurbForDietTag(tag) })
                    }
                    className="min-w-0 text-left text-xs font-medium text-emerald-900 underline-offset-2 hover:underline"
                  >
                    {tag}
                  </button>
                  <WellnessInfoTip text={getWhyForDietTag(tag, whyCtx)} />
                </span>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              {plan.dietNote}
            </p>
          </article>

          <article className="flex min-w-0 flex-col rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
                <PersonStanding className="h-5 w-5 text-sky-600" />
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                Exercise
              </h3>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {plan.exTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-sky-50 py-1 pl-2.5 pr-1"
                >
                  <button
                    type="button"
                    onClick={() =>
                      openFloatingChatWellness({
                        prompt: promptExerciseTagDeeper({
                          profileBlock: wellnessProfileBlock,
                          tag,
                          exNote: plan.exNote,
                          activity,
                        }),
                        displayContent: wellnessExerciseTagDisplay(tag),
                        autoSend: true,
                      })
                    }
                    className="min-w-0 text-left text-xs font-medium text-sky-900 underline-offset-2 hover:underline"
                  >
                    {tag}
                  </button>
                  <WellnessInfoTip text={getWhyForExerciseTag(tag, whyCtx)} />
                </span>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              {plan.exNote}
            </p>
          </article>
        </div>

        {/* Vitamins */}
        <section className="relative z-0 mt-4 min-w-0 overflow-visible rounded-3xl border border-violet-100 bg-white p-5 shadow-sm has-[.wellness-tip:hover]:z-[480] has-[.wellness-tip:focus-within]:z-[480]">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <Pill className="h-5 w-5 text-violet-600" />
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
              Vitamins & supplements
            </h3>
          </div>
          {plan.vitNote && (
            <p className="mb-3 text-sm text-slate-600">{plan.vitNote}</p>
          )}
          <div className="relative flex flex-wrap gap-2 overflow-visible">
            {displayedSupplementLines.map((tag) => (
              <span
                key={tag}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 py-1 pl-2.5 pr-1 text-xs font-medium text-violet-900"
              >
                <span className="min-w-0">{tag}</span>
                <WellnessInfoTip
                  text={getWhyForSupplement(tag, whyCtx, {
                    isManual: manualSupplements.includes(tag),
                  })}
                />
              </span>
            ))}
          </div>
          {allSupplementLines.length > 10 && (
            <button
              type="button"
              onClick={() => setVitExpanded((v) => !v)}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-violet-700"
            >
              <ChevronDown
                className={`h-4 w-4 transition ${vitExpanded ? "rotate-180" : ""}`}
              />
              {vitExpanded ? "Show less" : "Show all"}
            </button>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Add supplements manually (flags interactions)
            </p>
            <div className="relative">
              <input
                value={suppInput}
                onChange={(e) => setSuppInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addManualSupp(suppInput);
                  }
                }}
                placeholder="Type e.g. potassium, omega-3…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              {suppSuggestions.length > 0 && suppInput.length >= 1 && (
                <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {suppSuggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => addManualSupp(s)}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {manualSupplements.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {manualSupplements.map((s) => (
                  <li
                    key={s}
                    className="flex items-center gap-1 rounded-full bg-slate-100 pl-2 pr-1 text-xs"
                  >
                    {s}
                    <button
                      type="button"
                      aria-label={`Remove ${s}`}
                      className="rounded-full p-0.5 hover:bg-slate-200"
                      onClick={() =>
                        setManualSupplements((list) => list.filter((x) => x !== s))
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Premium diet & workouts — below summary cards; outputs render below controls for the same calendar day */}
        <section
          id="wellness-personalized-diet-workouts"
          className="mt-6 min-w-0 scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h3 className="mb-5 text-base font-bold text-slate-900">
            Premium diet and workouts
          </h3>

          {personalizedBanner && (
            <p
              className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
              role="status"
            >
              {personalizedBanner}
            </p>
          )}

          {dietPlanLoading && (
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#5B4B8A]">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
              Creating your eating plan…
            </div>
          )}
          {workoutPlanLoading && (
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#5B4B8A]">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
              Creating your movement plan…
            </div>
          )}

          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-slate-100 bg-[#FAFAF8] p-4 sm:p-5">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                Today&apos;s eating plan
              </p>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Anything to emphasize, avoid, or change today?
              </label>
              <textarea
                value={dietDayNotes}
                onChange={(e) => setDietDayNotes(e.target.value)}
                rows={3}
                placeholder="e.g. vegetarian dinner, no dairy, high protein, travelling…"
                className="mb-3 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#5B4B8A] focus:outline-none focus:ring-1 focus:ring-[#5B4B8A]/30"
              />
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Daily calorie target (optional)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={calorieTargetInput}
                onChange={(e) => setCalorieTargetInput(e.target.value)}
                placeholder="e.g. 2000"
                className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#5B4B8A] focus:outline-none focus:ring-1 focus:ring-[#5B4B8A]/30"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onCreateDiet}
                  disabled={dietPlanLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#5B4B8A] bg-[#5B4B8A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4a3d72] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create eating plan
                </button>
                <button
                  type="button"
                  onClick={onDifferentDietMix}
                  disabled={
                    dietPlanLoading ||
                    !personalizedDietReply ||
                    personalizedDietReply.kind !== "diet"
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  title="Rotate to a different meal set (same goals)"
                >
                  <RefreshCw className="h-4 w-4" />
                  Different meal mix
                </button>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-100 bg-[#FAFAF8] p-4 sm:p-5">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                Today&apos;s movement plan
              </p>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Equipment, pain areas, time available, or intensity?
              </label>
              <textarea
                value={workoutDayNotes}
                onChange={(e) => setWorkoutDayNotes(e.target.value)}
                rows={3}
                placeholder="e.g. bad knee, 25 minutes, no gym, prefer walking…"
                className="mb-3 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#5B4B8A] focus:outline-none focus:ring-1 focus:ring-[#5B4B8A]/30"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onCreateWorkout}
                  disabled={workoutPlanLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#5B4B8A] bg-[#5B4B8A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4a3d72] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create workout
                </button>
                <button
                  type="button"
                  onClick={onDifferentWorkoutFeel}
                  disabled={
                    workoutPlanLoading ||
                    !personalizedWorkoutReply ||
                    personalizedWorkoutReply.kind !== "workout"
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  title="Shift coaching emphasis (same structure)"
                >
                  <RefreshCw className="h-4 w-4" />
                  Different emphasis
                </button>
              </div>
            </div>
          </div>

          {(personalizedDietReply || personalizedWorkoutReply) && (
            <div
              ref={personalizedResultsRef}
              id="wellness-personalized-results"
              className="mt-8 min-w-0 space-y-8 border-t border-slate-100 pt-8 scroll-mt-28"
            >
              {personalizedDietReply ? (
                <WellnessPersonalizedPlanResult
                  reply={personalizedDietReply}
                  dietMealSplit={dietPlanMealSplit}
                  mealRefreshMessage={mealRefreshMessage}
                  onRefreshMeal={refreshDietMeal}
                  mealSlotLoading={mealSlotLoading}
                  disableMealActions={
                    dietPlanLoading || mealSlotLoading !== null
                  }
                  onDismiss={() => setPersonalizedDietReply(null)}
                  sectionId="wellness-personalized-diet-result"
                />
              ) : null}
              {personalizedWorkoutReply ? (
                <WellnessPersonalizedPlanResult
                  reply={personalizedWorkoutReply}
                  dietMealSplit={null}
                  mealRefreshMessage={null}
                  onRefreshMeal={null}
                  mealSlotLoading={null}
                  disableMealActions={false}
                  onDismiss={() => setPersonalizedWorkoutReply(null)}
                  sectionId="wellness-personalized-workout-result"
                />
              ) : null}
            </div>
          )}
        </section>

        {importantNotes.length > 0 && (
          <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="mb-2 flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wide">
                Important notes
              </h3>
            </div>
            <ul className="space-y-3 pl-0 text-sm text-amber-950 list-none">
              {importantNotes.map((c, i) => (
                <li
                  key={`${i}-${c.slice(0, 48)}`}
                  className="flex flex-col gap-2 rounded-xl border border-amber-200/60 bg-white/60 p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <span className="min-w-0 flex-1">{c}</span>
                  <button
                    type="button"
                    onClick={() =>
                      openFloatingChatWellness({
                        prompt: promptImportantNoteDeeper({
                          profileBlock: wellnessProfileBlock,
                          caution: c,
                        }),
                        displayContent: wellnessImportantNoteDisplay(),
                        autoSend: true,
                      })
                    }
                    className="shrink-0 text-xs font-semibold text-amber-900 underline-offset-2 hover:underline"
                  >
                    Ask Yori
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">{DISCLAIMER}</p>

        {/* Footer actions */}
        <div className="mt-8 flex justify-center">
          <Link
            to="/profile?wellness=1"
            className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl border-2 border-[#5B4B8A] px-6 py-3 text-sm font-semibold text-[#5B4B8A] hover:bg-[#5B4B8A]/5"
          >
            Edit Preferences
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Topic explainer */}
      {topicModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-lg font-semibold text-slate-900">
                {topicModal.title}
              </h4>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-slate-100"
                onClick={() => setTopicModal(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {topicModal.body}
            </p>
            <button
              type="button"
              onClick={() => {
                const prompt = promptDietTopicDeeper({
                  profileBlock: wellnessProfileBlock,
                  title: topicModal.title,
                  body: topicModal.body,
                });
                setTopicModal(null);
                openFloatingChatWellness({
                  prompt,
                  displayContent: wellnessDietTopicDisplay(topicModal.title),
                  autoSend: true,
                });
              }}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#5B4B8A] hover:underline"
            >
              Ask Yori for a deeper dive
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
