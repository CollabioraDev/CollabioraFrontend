import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

export default function SpecialtyAutocompleteInput({
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = "e.g. Internal Medicine, Pediatrics",
  className = "",
  inputClassName = "",
  maxSuggestions = 10,
  disabled = false,
  ...rest
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const blurTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = useMemo(() => {
    if (!options?.length) return [];
    if (!value || !value.trim()) {
      return options.slice(0, maxSuggestions);
    }
    const searchTerm = value.toLowerCase().trim();
    const filtered = options.filter((opt) =>
      opt.toLowerCase().includes(searchTerm)
    );
    return filtered
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aStarts = aLower.startsWith(searchTerm);
        const bStarts = bLower.startsWith(searchTerm);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return aLower.localeCompare(bLower);
      })
      .slice(0, maxSuggestions);
  }, [value, options, maxSuggestions]);

  const showDropdown =
    isDropdownOpen && suggestions.length > 0;

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
      window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
      document.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleResize, { passive: true });
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
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const closeDropdown = (delay = 0) => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
      setActiveIndex(-1);
    }, delay);
  };

  const handleInputChange = (event) => {
    onChange?.(event.target.value);
    setActiveIndex(-1);
    if (!isDropdownOpen) setIsDropdownOpen(true);
    setTimeout(() => updateDropdownPosition(), 0);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (!disabled) {
      setIsDropdownOpen(true);
      updateDropdownPosition();
    }
  };

  const handleBlur = (event) => {
    const relatedTarget = event.relatedTarget || document.activeElement;
    const dropdown = document.querySelector("[data-specialty-autocomplete-dropdown]");
    if (dropdown && relatedTarget && dropdown.contains(relatedTarget)) return;
    closeDropdown(150);
    if (onBlur) onBlur(event);
  };

  const handleSelectSuggestion = (suggestion) => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    onChange?.(suggestion);
    setActiveIndex(-1);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((prev) => {
        const next = prev + 1;
        return next >= suggestions.length ? 0 : next;
      });
      return;
    }
    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? suggestions.length - 1 : next;
      });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelectSuggestion(suggestions[activeIndex]);
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
      data-specialty-autocomplete-dropdown
      className="fixed overflow-hidden rounded-lg border bg-white shadow-xl z-[9999]"
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
        {suggestions.map((suggestion, index) => (
          <li
            key={`${suggestion}-${index}`}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectSuggestion(suggestion);
            }}
            onMouseEnter={() => setActiveIndex(index)}
            className={clsx(
              "flex items-center px-3 py-2 text-sm transition-colors cursor-pointer"
            )}
            style={
              index === activeIndex
                ? { backgroundColor: "rgba(245, 242, 248, 1)", color: "#2F3C96" }
                : { color: "#787878" }
            }
          >
            <span className="truncate flex-1">{suggestion}</span>
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
          placeholder={placeholder}
          disabled={disabled}
          className={clsx(
            "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
            inputClassName
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
