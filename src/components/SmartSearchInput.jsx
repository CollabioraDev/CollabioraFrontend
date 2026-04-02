import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import {
  DEFAULT_SUGGESTION_LIMIT,
  getSmartSuggestions,
} from "@/utils/smartSuggestions";

export default function SmartSearchInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  extraTerms = [],
  canonicalMap = null,
  maxSuggestions = DEFAULT_SUGGESTION_LIMIT,
  className = "",
  inputClassName = "",
  autoSubmitOnSelect = true,
  disabled = false,
  name,
  ...rest
}) {
  const { t } = useTranslation("common");
  const resolvedPlaceholder = placeholder ?? t("smartSearch.defaultPlaceholder");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const blurTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  // Defer suggestion computation so typing stays responsive; suggestions update shortly after
  const deferredValue = useDeferredValue(value ?? "");

  const suggestions = useMemo(() => {
    if (!deferredValue || !deferredValue.trim()) return [];
    return getSmartSuggestions(
      deferredValue,
      extraTerms,
      maxSuggestions,
      canonicalMap
    );
  }, [deferredValue, extraTerms, maxSuggestions, canonicalMap]);

  const showDropdown =
    isDropdownOpen && suggestions.length > 0 && value?.trim()?.length > 0;

  // Update dropdown position based on input position (viewport-relative for better scroll handling)
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();

      // Calculate available space below input
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 240; // max-height

      // Position dropdown below input if there's space, otherwise above
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

      // Use requestAnimationFrame for smoother updates during scroll
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

      // Add scroll listeners with passive option for better performance
      // Listen on window and all scrollable containers
      window.addEventListener("scroll", handleScroll, {
        passive: true,
        capture: true,
      });
      document.addEventListener("scroll", handleScroll, {
        passive: true,
        capture: true,
      });
      window.addEventListener("resize", handleResize, { passive: true });

      // Also update position periodically to handle any missed scroll events
      const intervalId = setInterval(updateDropdownPosition, 100);

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        clearInterval(intervalId);
        window.removeEventListener("scroll", handleScroll, { capture: true });
        document.removeEventListener("scroll", handleScroll, { capture: true });
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [showDropdown, value]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
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
    onChange?.(event.target.value);
    setActiveIndex(-1);
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
    // Update position when input changes (dropdown might appear/disappear)
    setTimeout(() => updateDropdownPosition(), 0);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    if (!disabled) {
      setIsDropdownOpen(true);
      updateDropdownPosition();
    }
  };

  const handleBlur = (event) => {
    // Don't close if user is clicking/interacting with dropdown
    const relatedTarget = event.relatedTarget || document.activeElement;
    const dropdown = document.querySelector("[data-smart-search-dropdown]");

    // Check if the related target is within the dropdown
    if (dropdown && relatedTarget && dropdown.contains(relatedTarget)) {
      return;
    }

    // Delay closing to allow click events to fire first
    closeDropdown(150);
  };

  const handleSelectSuggestion = (suggestion) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    onChange?.(suggestion);
    setActiveIndex(-1);
    setIsDropdownOpen(false);
    if (autoSubmitOnSelect && typeof onSubmit === "function") {
      onSubmit(suggestion);
    }
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
        // User has selected a suggestion with arrow keys
        handleSelectSuggestion(suggestions[activeIndex]);
      } else if (typeof onSubmit === "function") {
        // User pressed Enter without selecting - submit current input value
        // Get the current value directly from the input to ensure it's up-to-date
        const currentValue = event.target.value || value;
        if (currentValue && currentValue.trim()) {
          setIsDropdownOpen(false);
          setActiveIndex(-1);
          // Small delay to ensure state is updated
          setTimeout(() => {
            onSubmit(currentValue.trim());
          }, 0);
        }
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
      data-smart-search-dropdown
      className="fixed overflow-hidden rounded-lg border bg-white shadow-xl"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${Math.max(dropdownPosition.width, 200)}px`,
        maxWidth: "calc(100vw - 2rem)",
        zIndex: 9999,
        borderColor: "#E8E8E8",
        maxHeight: "240px",
      }}
      onMouseDown={(e) => {
        // Prevent dropdown from closing when clicking inside it
        e.preventDefault();
      }}
    >
      <ul
        className="overflow-y-auto overscroll-contain"
        style={{
          maxHeight: "240px",
          scrollBehavior: "smooth",
        }}
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={`${suggestion}-${index}`}
            onMouseDown={(event) => {
              event.preventDefault();
              handleSelectSuggestion(suggestion);
            }}
            onMouseEnter={() => setActiveIndex(index)}
            className={clsx(
              "flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors cursor-pointer",
              index === activeIndex ? "" : "",
            )}
            style={
              index === activeIndex
                ? {
                    backgroundColor: "rgba(245, 242, 248, 1)",
                    color: "#2F3C96",
                  }
                : {
                    color: "#787878",
                  }
            }
            onMouseLeave={() => {
              // Keep hover state but don't clear activeIndex to preserve keyboard selection
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate">{suggestion}</span>
            </div>
            {index === activeIndex && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wide shrink-0"
                style={{ color: "#2F3C96" }}
              >
                Enter ↵
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
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={resolvedPlaceholder}
          disabled={disabled}
          name={name}
          className={clsx(
            "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
            inputClassName,
          )}
          autoComplete="off"
          {...rest}
        />
      </div>
      {typeof document !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </>
  );
}
