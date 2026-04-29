import { useCallback, useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MEDICATION_GENERICS } from "../../lib/wellness/medicationGenerics.js";
import {
  buildSnapshotPayload,
  writeWellnessProSnapshot,
  WELLNESS_SNAPSHOT_UPDATED,
} from "../../lib/wellness/wellnessProStorage.js";
import {
  WELLNESS_CO_OPTIONS,
  createWellnessSnapshotState,
  mapWellnessGoal,
} from "../../lib/wellness/wellnessOnlyShared.js";
import { getWellnessPlan } from "../../lib/wellness/getWellnessPlan.js";

function ToggleChip({ active, children, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-sm font-medium transition",
        active
          ? "border-[#5B4B8A] bg-[#5B4B8A] text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function WellnessOnlySettingsModal({ open, onClose }) {
  const { t } = useTranslation("common");
  const [age, setAge] = useState("mid");
  const [sex, setSex] = useState("f");
  const [healthJourney, setHealthJourney] = useState("prevent");
  const [focus, setFocus] = useState("general");
  const [coSelected, setCoSelected] = useState(() => new Set(["none"]));
  const [diet, setDiet] = useState("varied");
  const [activity, setActivity] = useState("light");
  const [foodLikes, setFoodLikes] = useState("");
  const [foodDislikes, setFoodDislikes] = useState("");
  const [medications, setMedications] = useState([]);
  const [manualSupplements, setManualSupplements] = useState([]);
  const [dismissedSupplements, setDismissedSupplements] = useState([]);
  const [medInput, setMedInput] = useState("");

  const hydrate = useCallback(() => {
    const s = createWellnessSnapshotState();
    setAge(s.age);
    setSex(s.sex);
    setHealthJourney(s.healthJourney);
    setFocus(s.focus);
    setCoSelected(s.coSelected);
    setDiet(s.diet);
    setActivity(s.activity);
    setFoodLikes(s.foodLikes);
    setFoodDislikes(s.foodDislikes);
    setMedications(s.medications);
    setManualSupplements(s.manualSupplements);
    setDismissedSupplements(s.dismissedSupplements);
    setMedInput("");
  }, []);

  useEffect(() => {
    if (open) hydrate();
  }, [open, hydrate]);

  const toggleCo = useCallback((id) => {
    setCoSelected((prev) => {
      const next = new Set(prev);
      if (id === "none") {
        return new Set(["none"]);
      }
      next.delete("none");
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) return new Set(["none"]);
      return next;
    });
  }, []);

  const addMedication = useCallback((label) => {
    const normalized = label.trim().toLowerCase();
    if (!normalized) return;
    setMedications((m) => (m.includes(normalized) ? m : [...m, normalized]));
    setMedInput("");
  }, []);

  const fuseMeds = useMemo(
    () =>
      new Fuse(MEDICATION_GENERICS, {
        keys: ["label"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [],
  );

  const medSuggestions = useMemo(() => {
    const q = medInput.trim();
    if (q.length < 2) return [];
    return fuseMeds.search(q, { limit: 8 }).map((r) => r.item);
  }, [fuseMeds, medInput]);

  const comorbiditySet = useMemo(() => {
    const s = new Set(coSelected);
    if (s.has("none")) return new Set(["none"]);
    s.delete("none");
    return s;
  }, [coSelected]);

  const wellnessGoal = useMemo(
    () => mapWellnessGoal(healthJourney, focus),
    [healthJourney, focus],
  );

  const wellnessPlan = useMemo(
    () =>
      getWellnessPlan(age, sex, wellnessGoal, comorbiditySet, diet, activity),
    [age, sex, wellnessGoal, comorbiditySet, diet, activity],
  );

  const dismissedSuppSet = useMemo(
    () => new Set(dismissedSupplements),
    [dismissedSupplements],
  );

  const visiblePlanSupplements = useMemo(
    () =>
      wellnessPlan.vitTags.filter((line) => !dismissedSuppSet.has(line)),
    [wellnessPlan.vitTags, dismissedSuppSet],
  );

  const hiddenPlanSupplements = useMemo(
    () => wellnessPlan.vitTags.filter((line) => dismissedSuppSet.has(line)),
    [wellnessPlan.vitTags, dismissedSuppSet],
  );

  useEffect(() => {
    if (!open) return undefined;
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
      window.dispatchEvent(new CustomEvent(WELLNESS_SNAPSHOT_UPDATED));
    }, 250);
    return () => window.clearTimeout(id);
  }, [
    open,
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wellness-only-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="wellness-only-modal-title"
              className="text-lg font-semibold text-slate-900"
            >
              {t("editProfile.wellnessOnlyModalTitle")}
            </h2>
            <p className="mt-1 text-pretty text-sm leading-relaxed text-slate-600">
              {t("editProfile.wellnessOnlyModalSubtitle")}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-1 hover:bg-slate-100"
            onClick={onClose}
            aria-label={t("editProfile.wellnessOnlyModalCloseAria")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              {t("editProfile.wellnessOnlyAge")}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "young", label: t("editProfile.wellnessOnlyAgeYoung") },
                { id: "mid", label: t("editProfile.wellnessOnlyAgeMid") },
                { id: "older", label: t("editProfile.wellnessOnlyAgeOlder") },
              ].map((o) => (
                <ToggleChip
                  key={o.id}
                  active={age === o.id}
                  onClick={() => setAge(o.id)}
                >
                  {o.label}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              {t("editProfile.wellnessOnlySex")}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "f", label: t("editProfile.wellnessOnlySexF") },
                { id: "m", label: t("editProfile.wellnessOnlySexM") },
                {
                  id: "other",
                  label: t("editProfile.wellnessOnlySexOther"),
                },
              ].map((o) => (
                <ToggleChip
                  key={o.id}
                  active={sex === o.id}
                  onClick={() => setSex(o.id)}
                >
                  {o.label}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              {t("editProfile.wellnessOnlyJourney")}
            </p>
            <div className="flex flex-wrap gap-2">
              <ToggleChip
                active={healthJourney === "prevent"}
                onClick={() => setHealthJourney("prevent")}
              >
                {t("editProfile.wellnessOnlyJourneyPrevent")}
              </ToggleChip>
              <ToggleChip
                active={healthJourney === "manage"}
                onClick={() => setHealthJourney("manage")}
              >
                {t("editProfile.wellnessOnlyJourneyManage")}
              </ToggleChip>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              {t("editProfile.wellnessOnlyFocus")}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "general", label: t("editProfile.wellnessOnlyFocusGeneral") },
                { id: "weight", label: t("editProfile.wellnessOnlyFocusWeight") },
                {
                  id: "energy",
                  label: t("editProfile.wellnessOnlyFocusEnergy"),
                },
              ].map((o) => (
                <ToggleChip
                  key={o.id}
                  active={focus === o.id}
                  onClick={() => setFocus(o.id)}
                >
                  {o.label}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              {t("editProfile.wellnessOnlyComorbidities")}
            </p>
            <div className="flex flex-wrap gap-2">
              {WELLNESS_CO_OPTIONS.map((o) => (
                <ToggleChip
                  key={o.id}
                  active={coSelected.has(o.id)}
                  onClick={() => toggleCo(o.id)}
                >
                  {t(`editProfile.wellnessCo.${o.id}`)}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                {t("editProfile.wellnessOnlyDietPattern")}
              </p>
              <select
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="varied">
                  {t("editProfile.wellnessOnlyDietVaried")}
                </option>
                <option value="plantbased">
                  {t("editProfile.wellnessOnlyDietPlant")}
                </option>
                <option value="lowcarb">
                  {t("editProfile.wellnessOnlyDietLowCarb")}
                </option>
                <option value="processed">
                  {t("editProfile.wellnessOnlyDietProcessed")}
                </option>
                <option value="unsure">
                  {t("editProfile.wellnessOnlyDietUnsure")}
                </option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                {t("editProfile.wellnessOnlyActivity")}
              </p>
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="sedentary">
                  {t("editProfile.wellnessOnlyActivitySedentary")}
                </option>
                <option value="light">
                  {t("editProfile.wellnessOnlyActivityLight")}
                </option>
                <option value="moderate">
                  {t("editProfile.wellnessOnlyActivityModerate")}
                </option>
                <option value="active">
                  {t("editProfile.wellnessOnlyActivityActive")}
                </option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {t("editProfile.wellnessOnlyFoodLikes")}
              </label>
              <textarea
                value={foodLikes}
                onChange={(e) => setFoodLikes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {t("editProfile.wellnessOnlyFoodDislikes")}
              </label>
              <textarea
                value={foodDislikes}
                onChange={(e) => setFoodDislikes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="mb-1 text-sm font-semibold text-slate-900">
              {t("editProfile.wellnessOnlyMedicationsTitle")}
            </h3>
            <p className="mb-3 text-xs text-slate-600">
              {t("editProfile.wellnessOnlyMedicationsHint")}
            </p>
            <div className="relative">
              <input
                value={medInput}
                onChange={(e) => setMedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const first = medSuggestions[0];
                    if (first) addMedication(first.label);
                    else addMedication(medInput);
                  }
                }}
                placeholder={t("editProfile.wellnessOnlyMedicationsPlaceholder")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                autoComplete="off"
              />
              {medSuggestions.length > 0 && medInput.length >= 2 && (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {medSuggestions.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => addMedication(m.label)}
                      >
                        <span className="capitalize">{m.label}</span>
                        <span className="ml-2 text-xs text-slate-400">
                          {m.category.replace(/_/g, " ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {medications.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {medications.map((m) => (
                  <li
                    key={m}
                    className="flex items-center gap-1 rounded-full bg-violet-50 pl-3 pr-1 text-xs font-medium text-violet-900"
                  >
                    <span className="capitalize">{m}</span>
                    <button
                      type="button"
                      className="rounded-full p-1 hover:bg-violet-100"
                      onClick={() =>
                        setMedications((list) => list.filter((x) => x !== m))
                      }
                      aria-label={`Remove ${m}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="mb-1 text-sm font-semibold text-slate-900">
              {t("editProfile.wellnessOnlyPlanSupplementsTitle")}
            </h3>
            <p className="mb-3 text-xs text-slate-600">
              {t("editProfile.wellnessOnlyPlanSupplementsHint")}
            </p>
            {wellnessPlan.vitTags.length === 0 ? (
              <p className="text-xs text-slate-500">
                {t("editProfile.wellnessOnlyPlanSupplementsEmpty")}
              </p>
            ) : (
              <>
                {visiblePlanSupplements.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {visiblePlanSupplements.map((line) => (
                      <li
                        key={line}
                        className="flex max-w-full items-center gap-1 rounded-full bg-violet-50 py-1 pl-2.5 pr-1 text-xs font-medium text-violet-900"
                      >
                        <span className="min-w-0">{line}</span>
                        <button
                          type="button"
                          className="shrink-0 rounded-full p-0.5 text-violet-700 hover:bg-violet-100"
                          aria-label={t(
                            "editProfile.wellnessOnlyPlanSupplementsRemoveAria",
                            { name: line },
                          )}
                          onClick={() =>
                            setDismissedSupplements((d) =>
                              d.includes(line) ? d : [...d, line],
                            )
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">
                    {t("editProfile.wellnessOnlyPlanSupplementsAllHidden")}
                  </p>
                )}
                {hiddenPlanSupplements.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("editProfile.wellnessOnlyPlanSupplementsHiddenTitle")}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {hiddenPlanSupplements.map((line) => (
                        <li key={line}>
                          <button
                            type="button"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-800 hover:bg-slate-100"
                            onClick={() =>
                              setDismissedSupplements((d) =>
                                d.filter((x) => x !== line),
                              )
                            }
                          >
                            <span className="font-medium">{line}</span>
                            <span className="mt-0.5 block text-[11px] text-slate-600">
                              {t("editProfile.wellnessOnlyPlanSupplementsRestore")}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-[#5B4B8A] py-3 text-sm font-semibold text-white hover:bg-[#4a3d72]"
        >
          {t("editProfile.wellnessOnlyModalDone")}
        </button>
      </div>
    </div>
  );
}
