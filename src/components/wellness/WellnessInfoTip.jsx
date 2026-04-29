/**
 * Hover / focus tooltip with an (i)-style control — parent must not be a &lt;button&gt;.
 * High z-index + hover lift so popovers paint above grid siblings and typical page chrome.
 */
export default function WellnessInfoTip({ text, className }) {
  const t = typeof text === "string" ? text.trim() : "";
  if (!t) return null;

  return (
    <span
      className={[
        "wellness-tip group relative z-0 inline-flex shrink-0 align-middle overflow-visible",
        "hover:z-[500] focus-within:z-[500]",
        className ?? "",
      ].join(" ")}
    >
      <button
        type="button"
        tabIndex={0}
        className="relative z-[1] inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300/90 bg-white text-[11px] font-semibold italic leading-none text-slate-500 shadow-sm hover:border-slate-400 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4B8A]/40"
        aria-label="Why we suggest this"
      >
        <span aria-hidden>i</span>
      </button>
      <span
        role="tooltip"
        className={[
          "invisible absolute end-0 top-full z-[501] mt-1.5 w-[min(20rem,calc(100dvw-1.5rem))] max-w-[min(20rem,calc(100dvw-1.5rem))]",
          "rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-normal leading-snug text-slate-700 shadow-xl",
          "opacity-0 transition-opacity duration-150",
          "pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto",
          "group-hover:visible group-hover:opacity-100",
          "group-focus-within:visible group-focus-within:opacity-100",
        ].join(" ")}
      >
        {t}
      </span>
    </span>
  );
}
