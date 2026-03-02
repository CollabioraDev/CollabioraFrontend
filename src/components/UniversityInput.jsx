import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

/* ═══════════════════════════════════════════════════════════════════════════
   ROR API v2 — dynamic organization / university search
   Endpoint: https://api.ror.org/v2/organizations
   Docs:     https://ror.readme.io/docs/api-list
   ═══════════════════════════════════════════════════════════════════════════ */

const ROR_API = "https://api.ror.org/v2/organizations";
const DEBOUNCE_MS = 300;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── In-memory cache shared across all component instances ──────────────────

const queryCache = new Map();

function cacheKey(query, countryCode) {
  return `${(query || "").toLowerCase().trim()}||${countryCode || ""}`;
}

function cacheGet(key) {
  const entry = queryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    queryCache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  if (queryCache.size > 200) {
    queryCache.delete(queryCache.keys().next().value);
  }
  queryCache.set(key, { data, ts: Date.now() });
}

// ── Country name → ISO 3166-1 alpha-2 code ────────────────────────────────

const COUNTRY_CODES = {
  "united states": "US", "united states of america": "US", usa: "US", us: "US",
  "united kingdom": "GB", uk: "GB", "great britain": "GB", gb: "GB",
  canada: "CA", australia: "AU", india: "IN", germany: "DE", france: "FR",
  japan: "JP", china: "CN", brazil: "BR", mexico: "MX", italy: "IT",
  spain: "ES", netherlands: "NL", switzerland: "CH", sweden: "SE",
  norway: "NO", denmark: "DK", finland: "FI", belgium: "BE", austria: "AT",
  "south korea": "KR", korea: "KR", "republic of korea": "KR",
  singapore: "SG", "new zealand": "NZ", ireland: "IE",
  portugal: "PT", poland: "PL", czechia: "CZ", "czech republic": "CZ",
  hungary: "HU", romania: "RO", greece: "GR", turkey: "TR", "türkiye": "TR",
  israel: "IL", "saudi arabia": "SA", "united arab emirates": "AE", uae: "AE",
  egypt: "EG", "south africa": "ZA", nigeria: "NG", kenya: "KE",
  pakistan: "PK", bangladesh: "BD", "sri lanka": "LK",
  thailand: "TH", vietnam: "VN", malaysia: "MY", indonesia: "ID",
  philippines: "PH", taiwan: "TW", "hong kong": "HK",
  russia: "RU", "russian federation": "RU", ukraine: "UA",
  argentina: "AR", chile: "CL", colombia: "CO", peru: "PE",
  nepal: "NP", myanmar: "MM", cambodia: "KH", jordan: "JO",
  lebanon: "LB", qatar: "QA", kuwait: "KW", bahrain: "BH", oman: "OM",
  iraq: "IQ", iran: "IR", morocco: "MA", tunisia: "TN", algeria: "DZ",
  ghana: "GH", ethiopia: "ET", tanzania: "TZ", uganda: "UG",
  luxembourg: "LU", iceland: "IS", croatia: "HR", serbia: "RS",
  bulgaria: "BG", slovakia: "SK", slovenia: "SI", lithuania: "LT",
  latvia: "LV", estonia: "EE", malta: "MT", cyprus: "CY",
};

function toCountryCode(name) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  if (COUNTRY_CODES[n]) return COUNTRY_CODES[n];
  if (/^[a-z]{2}$/i.test(n)) return n.toUpperCase();
  return null;
}

// ── Parse a ROR v2 organization item into a flat object ───────────────────

function parseRORItem(item) {
  const displayName =
    item.names?.find((n) => n.types?.includes("ror_display"))?.value ||
    item.names?.[0]?.value ||
    "";
  const loc = item.locations?.[0]?.geonames_details;
  return {
    name: displayName,
    country: loc?.country_name || "",
    "state-province": loc?.name || "",
    rorId: item.id,
  };
}

// ── Fetch organisations from ROR v2 ──────────────────────────────────────

async function rorFetch(query, countryCode = null, max = 20) {
  const key = cacheKey(query, countryCode);
  const hit = cacheGet(key);
  if (hit) return hit;

  const params = new URLSearchParams();
  if (query?.trim()) params.set("query", query.trim());

  const filters = ["status:active"];
  if (countryCode) {
    filters.push(`locations.geonames_details.country_code:${countryCode}`);
  }
  params.set("filter", filters.join(","));

  const res = await fetch(`${ROR_API}?${params}`);
  if (!res.ok) throw new Error(`ROR API ${res.status}`);

  const { items = [] } = await res.json();
  const results = items.slice(0, max).map(parseRORItem);

  cacheSet(key, results);
  return results;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function UniversityInput({
  value,
  onChange,
  onBlur,
  placeholder = "Search for your institution…",
  className = "",
  inputClassName = "",
  maxSuggestions = 12,
  disabled = false,
  style,
  /** Location — string "City, Country" or { city, country } — used to show local institutions when input is empty */
  location: locationProp,
  /** When true, only values selected from the dropdown are accepted; typed values are cleared on blur */
  strict = false,
  ...rest
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [wasPickedFromList, setWasPickedFromList] = useState(false);

  const inputRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const debounceRef = useRef(null);
  const searchIdRef = useRef(0);

  // ── Parse location prop ────────────────────────────────────────────────

  const priorityLocation = useMemo(() => {
    if (!locationProp) return null;
    if (
      typeof locationProp === "object" &&
      (locationProp?.city || locationProp?.country)
    ) {
      return {
        city: locationProp.city?.trim() || null,
        country: locationProp.country?.trim() || null,
      };
    }
    if (typeof locationProp === "string") {
      const parts = locationProp
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length === 0) return null;
      if (parts.length === 1) return { city: null, country: parts[0] };
      return { city: parts[0], country: parts.slice(1).join(", ") };
    }
    return null;
  }, [locationProp]);

  const countryCode = useMemo(
    () => toCountryCode(priorityLocation?.country),
    [priorityLocation?.country],
  );

  const hasLocation = !!(
    priorityLocation?.city || priorityLocation?.country
  );

  // ── Debounced search ───────────────────────────────────────────────────

  const performSearch = useCallback(
    (query) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const q = (query || "").trim();
      const id = ++searchIdRef.current;

      // Not enough text and no location context → clear
      if (q.length < 2 && !(hasLocation && q.length === 0)) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      // When query is empty + location known → filter by country for local suggestions
      // When query has text → search globally so user can find any institution
      const cc = q.length === 0 ? countryCode : null;

      // Instant return if cached
      const key = cacheKey(q || "", cc);
      const hit = cacheGet(key);
      if (hit) {
        setSuggestions(hit);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const delay = q.length === 0 ? 0 : DEBOUNCE_MS;

      debounceRef.current = setTimeout(() => {
        rorFetch(q || "", cc, maxSuggestions)
          .then((results) => {
            if (searchIdRef.current === id) setSuggestions(results);
          })
          .catch(() => {
            if (searchIdRef.current === id) setSuggestions([]);
          })
          .finally(() => {
            if (searchIdRef.current === id) setIsLoading(false);
          });
      }, delay);
    },
    [countryCode, hasLocation, maxSuggestions],
  );

  // ── Cleanup ────────────────────────────────────────────────────────────

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    },
    [],
  );

  // ── Dropdown positioning ───────────────────────────────────────────────

  const showDropdown =
    isDropdownOpen &&
    (suggestions.length > 0 || isLoading) &&
    ((value?.trim()?.length ?? 0) >= 2 ||
      (hasLocation && (value?.trim()?.length ?? 0) === 0));

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 240;
      const positionBelow =
        spaceBelow > dropdownHeight || spaceBelow > spaceAbove;

      setDropdownPosition({
        top: positionBelow ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
        left: rect.left,
        width: Math.max(rect.width, 200),
      });
    }
  };

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();

      let rafId;
      let ticking = false;

      const handleScroll = () => {
        if (!ticking) {
          ticking = true;
          rafId = requestAnimationFrame(() => {
            updateDropdownPosition();
            ticking = false;
          });
        }
      };

      const handleResize = () => {
        if (rafId) cancelAnimationFrame(rafId);
        updateDropdownPosition();
      };

      window.addEventListener("scroll", handleScroll, {
        passive: true,
        capture: true,
      });
      document.addEventListener("scroll", handleScroll, {
        passive: true,
        capture: true,
      });
      window.addEventListener("resize", handleResize, { passive: true });

      const intervalId = setInterval(updateDropdownPosition, 100);

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        clearInterval(intervalId);
        window.removeEventListener("scroll", handleScroll, { capture: true });
        document.removeEventListener("scroll", handleScroll, {
          capture: true,
        });
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [showDropdown, value]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const closeDropdown = (delay = 0) => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
      setActiveIndex(-1);
    }, delay);
  };

  const handleInputChange = (event) => {
    const v = event.target.value;
    onChange?.(v);
    setActiveIndex(-1);
    setWasPickedFromList(false);
    if (!isDropdownOpen) setIsDropdownOpen(true);
    performSearch(v);
    setTimeout(() => updateDropdownPosition(), 0);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (!disabled) {
      setIsDropdownOpen(true);
      performSearch(value);
      updateDropdownPosition();
    }
  };

  const handleBlurEvent = (event) => {
    const relatedTarget = event.relatedTarget || document.activeElement;
    const dropdown = document.querySelector(
      "[data-university-input-dropdown]",
    );

    if (dropdown && relatedTarget && dropdown.contains(relatedTarget)) {
      return;
    }

    if (strict && value?.trim() && !wasPickedFromList) {
      onChange?.("");
    }

    closeDropdown(150);
    onBlur?.(event);
  };

  const handleSelectUniversity = (uni) => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    onChange?.(uni.name);
    setWasPickedFromList(true);
    setActiveIndex(-1);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((prev) =>
        prev + 1 >= suggestions.length ? 0 : prev + 1,
      );
      return;
    }

    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((prev) =>
        prev - 1 < 0 ? suggestions.length - 1 : prev - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelectUniversity(suggestions[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const dropdownContent = showDropdown && (
    <div
      data-university-input-dropdown
      className="fixed overflow-hidden rounded-lg border bg-white shadow-xl z-9999"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${Math.max(dropdownPosition.width, 200)}px`,
        maxWidth: "calc(100vw - 2rem)",
        borderColor: "#E8E8E8",
        maxHeight: "240px",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <ul
        className="overflow-y-auto overscroll-contain"
        style={{ maxHeight: "240px", scrollBehavior: "smooth" }}
      >
        {isLoading && suggestions.length === 0 && (
          <li
            className="flex items-center justify-center gap-2 px-3 py-4 text-sm"
            style={{ color: "#787878" }}
          >
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Searching institutions…
          </li>
        )}
        {!isLoading && suggestions.length === 0 && (
          <li
            className="px-3 py-4 text-sm text-center"
            style={{ color: "#787878" }}
          >
            No institutions found
          </li>
        )}
        {suggestions.map((uni, index) => (
          <li
            key={`${uni.rorId || uni.name}-${index}`}
            onMouseDown={(event) => {
              event.preventDefault();
              handleSelectUniversity(uni);
            }}
            onMouseEnter={() => setActiveIndex(index)}
            className={clsx(
              "flex flex-col px-3 py-2 text-sm transition-colors cursor-pointer",
            )}
            style={
              index === activeIndex
                ? {
                    backgroundColor: "rgba(245, 242, 248, 1)",
                    color: "#2F3C96",
                  }
                : { color: "#787878" }
            }
          >
            <span className="truncate font-medium">{uni.name}</span>
            {uni.country && (
              <span className="text-xs opacity-80 mt-0.5 truncate">
                {uni.country}
                {uni["state-province"] ? `, ${uni["state-province"]}` : ""}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <div className={clsx("relative", className)}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlurEvent}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={clsx(
            "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
            inputClassName,
          )}
          style={style}
          autoComplete="off"
          {...rest}
        />
        {isLoading && (value?.trim()?.length ?? 0) >= 2 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              className="animate-spin h-4 w-4 text-indigo-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
      </div>
      {typeof document !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </>
  );
}
