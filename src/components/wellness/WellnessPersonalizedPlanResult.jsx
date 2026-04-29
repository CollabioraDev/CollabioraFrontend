import ReactMarkdown from "react-markdown";
import { X, RefreshCw } from "lucide-react";
import { normalizeMealCardMarkdown } from "../../lib/wellness/wellnessDietMarkdownCards.js";

const PERSONALIZED_PLAN_PROSE =
  "prose prose-slate max-w-none min-w-0 break-words rounded-2xl border border-slate-200/60 bg-white px-4 py-5 text-[15px] leading-relaxed shadow-sm sm:px-6 sm:py-6 prose-headings:scroll-mt-20 prose-p:text-slate-700 prose-strong:text-slate-900 [&_em]:text-slate-600 [&_h1]:mb-3 [&_h1]:mt-0 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-slate-100 [&_h2]:pb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:normal-case [&_h2]:tracking-normal [&_h2]:text-[#5B4B8A] [&_h2]:first:mt-0 [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-slate-800 [&_li]:marker:text-slate-400 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:last:mb-0 [&_ul]:my-3 [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto";

const MEAL_CARD_BODY_PROSE =
  "prose prose-sm prose-slate max-w-none min-w-0 break-words text-[14px] leading-relaxed prose-p:text-slate-700 prose-strong:text-slate-900 [&_em]:text-slate-600 [&_p]:mb-2 [&_p]:last:mb-0 [&_ul]:my-2 [&_ul]:space-y-1 [&_ul]:pl-4 [&_li]:marker:text-slate-400 [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto";

export default function WellnessPersonalizedPlanResult({
  reply,
  dietMealSplit,
  mealRefreshMessage,
  onRefreshMeal,
  mealSlotLoading,
  disableMealActions,
  onDismiss,
  sectionId,
}) {
  const panelId = `${sectionId}-panel`;

  if (!reply) return null;

  return (
    <section
      id={sectionId}
      className="min-w-0 scroll-mt-28 rounded-3xl border border-slate-200/90 bg-white text-slate-800 shadow-md ring-1 ring-slate-900/5"
    >
      <div className="overflow-hidden rounded-3xl">
        <div className="relative border-b border-slate-100 bg-gradient-to-br from-[#5B4B8A]/[0.06] via-white to-emerald-50/30 px-5 pb-4 pt-5 sm:px-6">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#5B4B8A]/20 to-transparent" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div
              id={`${sectionId}-heading`}
              className="flex min-w-0 flex-1 flex-col gap-2"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <h4 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  {reply.title}
                </h4>
                {reply.source === "yori" ? (
                  <span className="shrink-0 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900">
                    With Yori
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    Template
                  </span>
                )}
              </div>
              {reply.source !== "yori" && (
                <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                  {reply.kind === "diet"
                    ? "Offline template with approximate kcal band and your notes."
                    : "Offline template with session estimates and your notes."}
                </p>
              )}
            </div>
            <button
              type="button"
              className="self-start rounded-full border border-slate-200/80 bg-white/90 p-2 text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-800"
              aria-label={`Close ${reply.title}`}
              onClick={() => onDismiss()}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div id={panelId} role="region" aria-labelledby={`${sectionId}-heading`}>
        {reply.warnings?.length > 0 && (
          <div className="border-b border-amber-200/60 bg-amber-50/95 px-5 py-3 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
              Heads up
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-amber-950">
              {reply.warnings.map((w) => (
                <li key={w} className="flex gap-2">
                  <span
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-600"
                    aria-hidden
                  />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex min-w-0 flex-col lg:flex-row lg:items-stretch">
          {reply.macros &&
            (reply.kind === "diet"
              ? reply.macros.estimatedDayKcalLow != null ||
                reply.macros.proteinGLow != null
              : reply.macros.sessionActiveMinutesLow != null ||
                reply.macros.sessionKcalBurnLow != null) && (
              <aside className="border-b border-slate-100 bg-slate-50/80 px-5 py-5 sm:px-6 lg:w-[min(100%,300px)] lg:shrink-0 lg:border-b-0 lg:border-r lg:py-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#5B4B8A]">
                  At a glance
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {reply.kind === "diet" &&
                    reply.macros.estimatedDayKcalLow != null &&
                    reply.macros.estimatedDayKcalHigh != null && (
                      <div className="col-span-2 rounded-2xl border border-[#5B4B8A]/15 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Est. day energy
                        </p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                          ~
                          {reply.macros.estimatedDayKcalLow.toLocaleString()}
                          <span className="mx-0.5 font-semibold text-slate-400">
                            –
                          </span>
                          {reply.macros.estimatedDayKcalHigh.toLocaleString()}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          kcal / day
                        </p>
                      </div>
                    )}
                  {reply.kind === "diet" &&
                    reply.macros.proteinGLow != null &&
                    reply.macros.proteinGHigh != null && (
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Protein
                        </p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                          {reply.macros.proteinGLow}–{reply.macros.proteinGHigh}
                          <span className="text-sm font-semibold text-slate-500">
                            {" "}
                            g
                          </span>
                        </p>
                      </div>
                    )}
                  {reply.kind === "diet" &&
                    reply.macros.carbsGLow != null &&
                    reply.macros.carbsGHigh != null && (
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Carbs
                        </p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                          {reply.macros.carbsGLow}–{reply.macros.carbsGHigh}
                          <span className="text-sm font-semibold text-slate-500">
                            {" "}
                            g
                          </span>
                        </p>
                      </div>
                    )}
                  {reply.kind === "diet" &&
                    reply.macros.fatGLow != null &&
                    reply.macros.fatGHigh != null && (
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Fat
                        </p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                          {reply.macros.fatGLow}–{reply.macros.fatGHigh}
                          <span className="text-sm font-semibold text-slate-500">
                            {" "}
                            g
                          </span>
                        </p>
                      </div>
                    )}
                  {reply.kind === "diet" &&
                    reply.macros.fiberGTarget != null && (
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Fibre
                        </p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                          ~{reply.macros.fiberGTarget}
                          <span className="text-sm font-semibold text-slate-500">
                            {" "}
                            g
                          </span>
                        </p>
                      </div>
                    )}
                  {reply.kind === "workout" &&
                    reply.macros.sessionActiveMinutesLow != null &&
                    reply.macros.sessionActiveMinutesHigh != null && (
                      <div className="col-span-2 rounded-2xl border border-[#5B4B8A]/15 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Active minutes
                        </p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                          {reply.macros.sessionActiveMinutesLow}–
                          {reply.macros.sessionActiveMinutesHigh}
                          <span className="text-base font-semibold text-slate-500">
                            {" "}
                            min
                          </span>
                        </p>
                      </div>
                    )}
                  {reply.kind === "workout" &&
                    reply.macros.sessionKcalBurnLow != null &&
                    reply.macros.sessionKcalBurnHigh != null && (
                      <div className="col-span-2 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Session burn (approx.)
                        </p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                          {reply.macros.sessionKcalBurnLow}–
                          {reply.macros.sessionKcalBurnHigh}
                          <span className="text-base font-semibold text-slate-500">
                            {" "}
                            kcal
                          </span>
                        </p>
                      </div>
                    )}
                </div>
                <p className="mt-4 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                  Illustrative only, not medical advice. Apps and wearables track
                  this more accurately.
                </p>
              </aside>
            )}

          <div className="min-w-0 flex-1 bg-[#FAFAF8]">
            <div className="border-b border-slate-200/80 bg-[#FAFAF8] px-5 py-3 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Your plan
              </p>
            </div>
            <div className="px-5 pb-6 pt-2 sm:px-6">
              {dietMealSplit && reply.kind === "diet" ? (
                <div className="space-y-6">
                  {dietMealSplit.beforeMarkdown.trim() ? (
                    <div className={PERSONALIZED_PLAN_PROSE}>
                      <ReactMarkdown>{dietMealSplit.beforeMarkdown}</ReactMarkdown>
                    </div>
                  ) : null}
                  <div>
                    {dietMealSplit.mealsIntroMarkdown ? (
                      <div className="mb-4 rounded-xl border border-emerald-100/80 bg-emerald-50/25 px-4 py-3 sm:px-5">
                        <div className={MEAL_CARD_BODY_PROSE}>
                          <ReactMarkdown>
                            {dietMealSplit.mealsIntroMarkdown}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : null}
                    {mealRefreshMessage ? (
                      <p
                        className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
                        role="status"
                      >
                        {mealRefreshMessage}
                      </p>
                    ) : null}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {dietMealSplit.meals.map((m, mealIdx) => (
                        <article
                          key={`${m.slot}-${mealIdx}`}
                          className="flex flex-col rounded-2xl border border-emerald-100/90 bg-white p-4 shadow-sm ring-1 ring-emerald-900/[0.04] sm:p-5"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-900">
                              {m.title}
                            </h3>
                            {onRefreshMeal ? (
                              <button
                                type="button"
                                onClick={() => void onRefreshMeal(m.slot)}
                                disabled={disableMealActions}
                                className="shrink-0 rounded-full border border-emerald-200/80 bg-white p-2 text-emerald-800 shadow-sm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45"
                                aria-label={`Get another idea for ${m.title}`}
                                title="Refresh this meal with Yori"
                              >
                                <RefreshCw
                                  className={`h-4 w-4 ${mealSlotLoading === m.slot ? "animate-spin" : ""}`}
                                  aria-hidden
                                />
                              </button>
                            ) : null}
                          </div>
                          <div className={MEAL_CARD_BODY_PROSE}>
                            <ReactMarkdown>
                              {m.body.trim()
                                ? normalizeMealCardMarkdown(m.body)
                                : "_No suggestion for this slot._"}
                            </ReactMarkdown>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                  {dietMealSplit.afterMarkdown.trim() ? (
                    <div className={PERSONALIZED_PLAN_PROSE}>
                      <ReactMarkdown>
                        {dietMealSplit.afterMarkdown}
                      </ReactMarkdown>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className={PERSONALIZED_PLAN_PROSE}>
                  <ReactMarkdown>{reply.body}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
