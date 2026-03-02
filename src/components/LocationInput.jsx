import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { MapPin, Globe, Loader2 } from "lucide-react";

// Popular cities for instant city suggestions
const POPULAR_CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "San Francisco",
  "Boston",
  "Seattle",
  "Miami",
  "London",
  "Toronto",
  "Vancouver",
  "Sydney",
  "Melbourne",
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Singapore",
  "Dubai",
  "Paris",
  "Berlin",
  "Tokyo",
  "Hong Kong",
  "Shanghai",
  "Beijing",
  "Seoul",
  "São Paulo",
  "Mexico City",
  "Amsterdam",
  "Stockholm",
  "Zurich",
  "Tel Aviv",
  "Cape Town",
  "Lagos",
  "Cairo",
  "Bangkok",
  "Kuala Lumpur",
  "Jakarta",
  "Manila",
  "Ho Chi Minh City",
  "Auckland",
];

// Comprehensive list of countries for instant country suggestions
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador",
  "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji",
  "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece",
  "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras",
  "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho",
  "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
  "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "São Tomé and Príncipe", "Saudi Arabia", "Senegal",
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen",
  "Zambia", "Zimbabwe",
];

// Legacy combined locations (kept for backward compatibility)
const POPULAR_LOCATIONS = [
  "New York, New York, United States",
  "Los Angeles, California, United States",
  "Chicago, Illinois, United States",
  "Houston, Texas, United States",
  "San Francisco, California, United States",
  "Boston, Massachusetts, United States",
  "Seattle, Washington, United States",
  "Miami, Florida, United States",
  "London, England, United Kingdom",
  "Toronto, Ontario, Canada",
  "Vancouver, British Columbia, Canada",
  "Sydney, New South Wales, Australia",
  "Melbourne, Victoria, Australia",
  "Mumbai, Maharashtra, India",
  "Delhi, Delhi, India",
  "Bangalore, Karnataka, India",
  "Singapore, Singapore",
  "Dubai, Dubai, United Arab Emirates",
  "Paris, Île-de-France, France",
  "Berlin, Berlin, Germany",
  "Tokyo, Tokyo, Japan",
  "Hong Kong, Hong Kong",
  "Shanghai, Shanghai, China",
  "Beijing, Beijing, China",
  "Seoul, Seoul, South Korea",
  "São Paulo, São Paulo, Brazil",
  "Mexico City, Mexico City, Mexico",
  "Amsterdam, North Holland, Netherlands",
  "Stockholm, Stockholm, Sweden",
  "Zurich, Zurich, Switzerland",
  "Tel Aviv, Tel Aviv, Israel",
  "Cape Town, Western Cape, South Africa",
  "Lagos, Lagos, Nigeria",
  "Cairo, Cairo, Egypt",
  "Bangkok, Bangkok, Thailand",
  "Kuala Lumpur, Kuala Lumpur, Malaysia",
  "Jakarta, Jakarta, Indonesia",
  "Manila, Manila, Philippines",
  "Ho Chi Minh City, Ho Chi Minh City, Vietnam",
  "Auckland, Auckland, New Zealand",
];

// Simple in-memory cache for API results
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function LocationInput({
  value,
  onChange,
  onBlur,
  placeholder,
  className = "",
  inputClassName = "",
  disabled = false,
  name,
  mode = "location", // "location" (legacy), "city", or "country"
  suppressDropdown = false, // when true (e.g. value from "Use my current location"), never show dropdown
  ...rest
}) {
  const defaultPlaceholder =
    mode === "city"
      ? "e.g. New York, London, Mumbai"
      : mode === "country"
        ? "e.g. United States, India, Germany"
        : "e.g. City, State/Province, Country";
  const resolvedPlaceholder = placeholder || defaultPlaceholder;

  const IconComponent = mode === "country" ? Globe : MapPin;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [apiSuggestions, setApiSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null); // Track selected location
  const [isSelecting, setIsSelecting] = useState(false); // Track if user is selecting from dropdown
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const blurTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const requestTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Pick the right popular list based on mode
  const popularList =
    mode === "city"
      ? POPULAR_CITIES
      : mode === "country"
        ? COUNTRIES
        : POPULAR_LOCATIONS;

  // Instant local suggestions based on query (no API call needed)
  const localSuggestions = useMemo(() => {
    if (!value || value.trim().length < 1) return [];
    const query = value.toLowerCase().trim();
    return popularList.filter((loc) =>
      loc.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [value, popularList]);

  // Combined suggestions: local first, then API results (deduplicated)
  const suggestions = useMemo(() => {
    const combined = [...localSuggestions];

    // Add API suggestions that aren't already in local
    apiSuggestions.forEach((apiSug) => {
      const isDuplicate = combined.some(
        (local) => local.toLowerCase() === apiSug.toLowerCase()
      );
      if (!isDuplicate) {
        combined.push(apiSug);
      }
    });

    return combined.slice(0, 8);
  }, [localSuggestions, apiSuggestions]);

  // Get suggestions from Photon (komoot/photon) – open source OSM geocoder, no API key
  // Demo server: https://photon.komoot.io | https://github.com/komoot/photon
  const getPlaceSuggestions = async (query) => {
    if (!query || query.trim().length < 2) {
      setApiSuggestions([]);
      return;
    }

    // For country mode, the static COUNTRIES list is comprehensive enough
    // Only hit the API if we don't have enough local matches
    if (mode === "country") {
      const q = query.toLowerCase().trim();
      const staticMatches = COUNTRIES.filter((c) => c.toLowerCase().includes(q));
      if (staticMatches.length >= 3) {
        setApiSuggestions([]);
        setIsLoading(false);
        return;
      }
    }

    const cacheKey = `${mode}:${query.toLowerCase().trim()}`;

    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setApiSuggestions(cached.results);
      setIsLoading(false);
      return;
    }

    // Clear previous timeout and abort previous request
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Debounce API calls to reduce network requests and improve performance
    requestTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        // Build base Photon API URL
        const params = new URLSearchParams({
          q: query,
          limit: "10",
          lang: "en",
        });

        let url = `https://photon.komoot.io/api?${params.toString()}`;

        // Add mode-specific osm_tag filters for better results
        if (mode === "city") {
          // Filter for city-level places only
          url += "&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village";
        } else if (mode === "country") {
          // Filter for country-level places only
          url += "&osm_tag=place:country";
        }

        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();
        const features = data.features || [];

        // Format results based on mode
        const formattedSuggestions = features
          .map((f) => {
            const p = f.properties || {};

            if (mode === "country") {
              // For country mode, just return the country name
              return p.country || p.name || "";
            }

            if (mode === "city") {
              // For city mode, return "City" or "City, State" for disambiguation
              const cityName = p.name || p.city || "";
              if (!cityName) return "";
              return cityName;
            }

            // Legacy "location" mode: full "City, State, Country"
            const parts = [];
            const name = p.name || p.city;
            if (name) parts.push(name);
            const state = p.state;
            if (state && state !== name) parts.push(state);
            const country = p.country;
            if (country) parts.push(country);
            return parts.length > 0 ? parts.join(", ") : "";
          })
          .filter(Boolean)
          .filter((s, i, arr) => arr.indexOf(s) === i) // deduplicate
          .slice(0, 8);

        searchCache.set(cacheKey, {
          results: formattedSuggestions,
          timestamp: Date.now(),
        });

        setApiSuggestions(formattedSuggestions);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching location suggestions:", error);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce 300ms to reduce API calls and improve performance
  };

  // Initialize selectedLocation from value prop on mount (for persistence when switching tabs)
  // Any pre-filled value (e.g. from sessionStorage or profile) is treated as selected so the
  // dropdown does not open on first visit / page load
  useEffect(() => {
    if (value && value.trim().length > 0 && !selectedLocation) {
      setSelectedLocation(value.trim());
    }
  }, []); // Run only on mount - this handles remounts and pre-filled values on load

  // Sync selectedLocation when value changes externally (e.g., cleared by parent)
  useEffect(() => {
    const trimmedValue = value?.trim() || "";
    // If value is cleared externally and we had a selected location, clear it
    if (!trimmedValue) {
      if (selectedLocation) {
        setSelectedLocation(null);
      }
    }
    // If value matches selected location exactly, ensure dropdown stays closed
    else if (selectedLocation && trimmedValue === selectedLocation.trim()) {
      setIsDropdownOpen(false);
    }
    // Only set selectedLocation if value looks like a complete location (has comma) or matches popular
    // This prevents setting selectedLocation while user is actively typing
    else if (trimmedValue && !selectedLocation) {
      const matchesPopular = popularList.some(
        (loc) => loc.toLowerCase() === trimmedValue.toLowerCase()
      );
      const looksComplete =
        mode === "country" || mode === "city"
          ? matchesPopular
          : trimmedValue.includes(",");
      
      if (matchesPopular || looksComplete) {
        setSelectedLocation(trimmedValue);
      }
    }
  }, [value, selectedLocation, popularList, mode]);

  // Update API suggestions when value changes
  useEffect(() => {
    // Only fetch suggestions if user is actively editing (not viewing selected location)
    const isEditing =
      !selectedLocation || value.trim() !== selectedLocation.trim();
    const hasLocalMatches = localSuggestions.length > 0;
    // Skip API call if we have good local matches (3+ suggestions) to improve performance
    const shouldSkipAPI = hasLocalMatches && localSuggestions.length >= 3;
    const willFetch =
      value && value.trim().length >= 2 && isEditing && !shouldSkipAPI;
    if (willFetch) {
      getPlaceSuggestions(value);
    } else {
      setApiSuggestions([]);
    }

    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [value, selectedLocation, localSuggestions]);

  // Open dropdown when we have suggestions, but only if:
  // - User is actively typing (not just viewing a selected location)
  // - Value doesn't exactly match the selected location
  // - Not suppressed (e.g. value was filled from "Use my current location")
  // - Not in the middle of selecting (prevents stuck dropdown after picking an option)
  useEffect(() => {
    if (suppressDropdown) {
      setIsDropdownOpen(false);
      return;
    }
    // Always close when there are no suggestions (user typed something with no matches)
    if (suggestions.length === 0) {
      setIsDropdownOpen(false);
      return;
    }
    // Close when value exactly matches selected location (e.g. after selection or external sync)
    if (selectedLocation && value?.trim() === selectedLocation.trim()) {
      setIsDropdownOpen(false);
      return;
    }
    // Don't reopen right after user selected an option (parent value may not have updated yet)
    if (isSelecting) {
      return;
    }
    if (
      suggestions.length > 0 &&
      value &&
      value.trim().length >= 1 &&
      (!selectedLocation || value.trim() !== selectedLocation.trim())
    ) {
      setIsDropdownOpen(true);
      updateDropdownPosition();
    }
  }, [suppressDropdown, suggestions, value, selectedLocation, isSelecting]);

  // Only show dropdown if:
  // 1. Not suppressed (e.g. value from "Use my current location")
  // 2. Dropdown is open
  // 3. We have suggestions
  // 4. User has typed something
  // 5. Value doesn't exactly match the selected location (to prevent showing dropdown for selected values)
  const showDropdown =
    !suppressDropdown &&
    isDropdownOpen &&
    suggestions.length > 0 &&
    value?.trim()?.length >= 1 &&
    (!selectedLocation || value.trim() !== selectedLocation.trim());

  // Find scrollable ancestors so we can listen to their scroll (e.g. when input is inside a long form)
  const getScrollParents = (el) => {
    const parents = [];
    let node = el?.parentElement;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      const overflow = style.overflow + style.overflowY + style.overflowX;
      if (/(auto|scroll|overlay)/.test(overflow)) parents.push(node);
      node = node.parentElement;
    }
    return parents;
  };

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      // Always show dropdown below the input (user expectation: suggestions under the field)
      const next = {
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 200),
      };
      setDropdownPosition(next);
    }
  };

  // useLayoutEffect: run BEFORE paint so dropdown never appears at (0,0) or stale position
  useLayoutEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
      // Re-run after next frame(s) so we catch scroll-into-view (e.g. on Publications/Trials where input is lower on page)
      const raf1 = requestAnimationFrame(() => {
        updateDropdownPosition();
        requestAnimationFrame(updateDropdownPosition);
      });
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

      const scrollParents = getScrollParents(inputRef.current);
      scrollParents.forEach((parent) =>
        parent.addEventListener("scroll", handleScroll, { passive: true })
      );

      const intervalId = setInterval(updateDropdownPosition, 100);

      return () => {
        cancelAnimationFrame(raf1);
        if (rafId) cancelAnimationFrame(rafId);
        clearInterval(intervalId);
        window.removeEventListener("scroll", handleScroll, { capture: true });
        document.removeEventListener("scroll", handleScroll, { capture: true });
        window.removeEventListener("resize", handleResize);
        scrollParents.forEach((parent) =>
          parent.removeEventListener("scroll", handleScroll)
        );
      };
    }
  }, [showDropdown, value]);

  // Close dropdown when clicking outside (input or dropdown) - backup for blur
  useEffect(() => {
    if (!showDropdown) return;
    const handleMouseDown = (e) => {
      const target = e.target;
      const inputEl = inputRef.current;
      const dropdown = document.querySelector("[data-location-dropdown]");
      const clickedInput = inputEl && (target === inputEl || inputEl.contains(target));
      const clickedDropdown = dropdown && dropdown.contains(target);
      if (!clickedInput && !clickedDropdown) {
        closeDropdown(0);
      }
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    return () => document.removeEventListener("mousedown", handleMouseDown, true);
  }, [showDropdown]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const closeDropdown = (delay = 0) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
      setActiveIndex(-1);
    }, delay);
  };

  const handleInputChange = (event) => {
    const newValue = event.target.value;
    onChange?.(newValue);
    setActiveIndex(-1);
    setIsSelecting(false); // User is typing, so not in "just selected" state

    // Reset selected location if user is editing
    if (selectedLocation && newValue.trim() !== selectedLocation.trim()) {
      setSelectedLocation(null);
    }

    if (newValue && newValue.trim().length >= 1) {
      // Only open dropdown if value doesn't match selected location
      if (!selectedLocation || newValue.trim() !== selectedLocation.trim()) {
        setIsDropdownOpen(true);
      } else {
        setIsDropdownOpen(false);
      }
    } else {
      // Input cleared - close dropdown and clear state
      setIsDropdownOpen(false);
      setApiSuggestions([]);
      setSelectedLocation(null);
    }

    setTimeout(() => updateDropdownPosition(), 0);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    if (!disabled && !suppressDropdown) {
      // Only show dropdown on focus if:
      // 1. Value doesn't match selected location (user is editing)
      // 2. Or there's no selected location yet
      const isEditing =
        !selectedLocation || value.trim() !== selectedLocation.trim();

      if (isEditing) {
        if (value && value.trim().length >= 1 && suggestions.length > 0) {
          setIsDropdownOpen(true);
          updateDropdownPosition();
          requestAnimationFrame(updateDropdownPosition); // After browser scroll-into-view (e.g. Publications/Trials)
        } else if (value && value.trim().length >= 2) {
          setIsDropdownOpen(true);
          getPlaceSuggestions(value);
          requestAnimationFrame(updateDropdownPosition);
        }
      }
      // If value matches selected location, don't show dropdown on focus
    }
  };

  const handleBlur = (event) => {
    const relatedTarget = event.relatedTarget || document.activeElement;
    const dropdown = document.querySelector("[data-location-dropdown]");

    // Don't close if clicking on dropdown
    if (dropdown && relatedTarget && dropdown.contains(relatedTarget)) {
      return;
    }

    // Close dropdown but preserve selected location state
    closeDropdown(150);

    // Call parent's onBlur handler if provided
    if (onBlur) {
      onBlur(event);
    }

    const trimmedValue = value.trim();
    
    // If we have a selected location and the value matches it, keep it selected
    if (selectedLocation && trimmedValue === selectedLocation.trim()) {
      // Value matches selected location - keep it selected
      return;
    }
    
    // Auto-complete: If user typed something that matches the first suggestion, auto-complete it
    if (trimmedValue.length > 0 && suggestions.length > 0) {
      const firstSuggestion = suggestions[0];
      const valueLower = trimmedValue.toLowerCase();
      const suggestionLower = firstSuggestion.toLowerCase();
      
      // Check if the typed value matches the beginning of the first suggestion
      // This handles cases like "New York" -> "New York, United States"
      if (suggestionLower.startsWith(valueLower) && suggestionLower !== valueLower) {
        // Auto-complete to the full suggestion
        setSelectedLocation(firstSuggestion);
        onChange?.(firstSuggestion);
        return;
      }
    }
    
    // If user has entered a value (not empty) and it doesn't match selected location,
    // treat it as a manually entered location and persist it
    if (trimmedValue.length > 0 && (!selectedLocation || trimmedValue !== selectedLocation.trim())) {
      // User manually entered a location - persist it
      setSelectedLocation(trimmedValue);
    } else if (trimmedValue.length === 0) {
      // User cleared the value - clear selected location
      setSelectedLocation(null);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setIsSelecting(true); // Mark that we're selecting (prevents effect from reopening dropdown)
    setSelectedLocation(suggestion); // Store the selected location
    onChange?.(suggestion);
    setActiveIndex(-1);
    setIsDropdownOpen(false);
    setApiSuggestions([]);

    // Reset selecting flag after parent has had time to update value prop
    setTimeout(() => {
      setIsSelecting(false);
    }, 200);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= suggestions.length) return 0;
        return nextIndex;
      });
      return;
    }

    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((prev) => {
        const nextIndex = prev - 1;
        if (nextIndex < 0) return suggestions.length - 1;
        return nextIndex;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        // User selected from dropdown
        handleSelectSuggestion(suggestions[activeIndex]);
      } else if (value && value.trim().length > 0) {
        // User manually entered a location and pressed Enter - treat as selected
        const trimmedValue = value.trim();
        setSelectedLocation(trimmedValue);
        setIsDropdownOpen(false);
        setApiSuggestions([]);
        // Ensure the value is set (in case parent component needs it)
        onChange?.(trimmedValue);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  };

  const dropdownContent = showDropdown && (
    <div
      data-location-dropdown
      className="fixed overflow-hidden rounded-xl border bg-white shadow-xl"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${Math.max(dropdownPosition.width, 200)}px`,
        maxWidth: "calc(100vw - 2rem)",
        zIndex: 9999,
        borderColor: "#E8E8E8",
        maxHeight: "320px",
      }}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
    >
      <ul
        className="overflow-y-auto overscroll-contain"
        style={{
          maxHeight: "320px",
          scrollBehavior: "smooth",
        }}
      >
        {suggestions.map((suggestion, index) => {
          const isLocal = localSuggestions.includes(suggestion);
          return (
            <li
              key={`${suggestion}-${index}`}
              onMouseDown={(event) => {
                event.preventDefault();
                handleSelectSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors cursor-pointer"
              )}
              style={
                index === activeIndex
                  ? {
                      backgroundColor: "rgba(208, 196, 226, 0.3)",
                      color: "#2F3C96",
                    }
                  : {
                      color: "#787878",
                    }
              }
            >
              <IconComponent
                size={14}
                style={{
                  color: index === activeIndex ? "#2F3C96" : "#D0C4E2",
                  flexShrink: 0,
                }}
              />
              <span className="truncate flex-1">{suggestion}</span>
              {index === activeIndex && (
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide shrink-0"
                  style={{ color: "#2F3C96" }}
                >
                  Enter ↵
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {isLoading && (
        <div
          className="flex items-center justify-center gap-2 px-3 py-2 border-t"
          style={{ borderColor: "#E8E8E8" }}
        >
          <Loader2
            size={12}
            className="animate-spin"
            style={{ color: "#2F3C96" }}
          />
          <span className="text-xs" style={{ color: "#787878" }}>
            Finding more...
          </span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className={clsx("relative", className)}>
        <div className="relative">
          <IconComponent
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "#D0C4E2" }}
          />
          {isLoading && (
            <Loader2
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none animate-spin"
              style={{ color: "#2F3C96" }}
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            name={name}
            className={clsx(
              "w-full rounded-xl border bg-white pl-9 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
              isLoading ? "pr-9" : "pr-3",
              inputClassName
            )}
            style={{
              borderColor: "#E8E8E8",
              color: "#2F3C96",
              "--tw-ring-color": "#D0C4E2",
            }}
            autoComplete="off"
            {...rest}
          />
        </div>
      </div>
      {typeof document !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </>
  );
}
