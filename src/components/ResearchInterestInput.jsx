import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import researchInterestDataset from "../data/researchInterestDataset.json";

export default function ResearchInterestInput({
  value,
  onChange,
  onSelect,
  placeholder = "e.g. Calcimycin, Pharmacology",
  className = "",
  inputClassName = "",
  maxSuggestions = 8,
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

  // Filter suggestions based on input value
  const suggestions = useMemo(() => {
    if (!value || !value.trim()) return [];
    
    const searchTerm = value.toLowerCase().trim();
    const filtered = researchInterestDataset.filter((item) => {
      const termLower = item.term.toLowerCase();
      const scopeNoteLower = (item.scopeNote || "").toLowerCase();
      
      // Check if search term matches term, synonyms, or scope note
      const matchesTerm = termLower.includes(searchTerm);
      const matchesScopeNote = scopeNoteLower.includes(searchTerm);
      const matchesSynonym = item.synonyms?.some(syn => 
        syn.toLowerCase().includes(searchTerm)
      ) || false;
      
      return matchesTerm || matchesScopeNote || matchesSynonym;
    });

    // Sort by relevance - prioritize alphabetical terms over code-like terms
    return filtered
      .sort((a, b) => {
        const aTerm = a.term.toLowerCase();
        const bTerm = b.term.toLowerCase();
        const aStarts = aTerm.startsWith(searchTerm);
        const bStarts = bTerm.startsWith(searchTerm);
        
        // Both start with search term
        if (aStarts && bStarts) {
          // Check if next character after search term is a letter (alphabetical) or hyphen/number (code-like)
          const aNextChar = aTerm[searchTerm.length];
          const bNextChar = bTerm[searchTerm.length];
          
          // Check if next character is alphabetical (letter) or code-like (hyphen, number, etc.)
          const aIsAlphabetical = aNextChar && /[a-z]/.test(aNextChar);
          const bIsAlphabetical = bNextChar && /[a-z]/.test(bNextChar);
          
          // Prioritize alphabetical terms over code-like terms
          if (aIsAlphabetical && !bIsAlphabetical) return -1;
          if (!aIsAlphabetical && bIsAlphabetical) return 1;
          
          // Both same type, sort alphabetically
          return aTerm.localeCompare(bTerm);
        }
        
        // One starts with search term, prioritize it
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Neither starts with search term, sort alphabetically
        return aTerm.localeCompare(bTerm);
      })
      .slice(0, maxSuggestions);
  }, [value, maxSuggestions]);

  const showDropdown =
    isDropdownOpen && suggestions.length > 0 && value?.trim()?.length > 0;

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 240;
      const positionBelow = spaceBelow > dropdownHeight || spaceBelow > spaceAbove;

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
      document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
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
    const relatedTarget = event.relatedTarget || document.activeElement;
    const dropdown = document.querySelector('[data-research-interest-dropdown]');
    
    if (dropdown && relatedTarget && dropdown.contains(relatedTarget)) {
      return;
    }
    
    closeDropdown(150);
  };

  const handleSelectSuggestion = (suggestion) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    onChange?.(suggestion.term);
    // Call onSelect callback if provided (for auto-adding to list)
    if (onSelect) {
      onSelect(suggestion.term);
    }
    setActiveIndex(-1);
    setIsDropdownOpen(false);
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
      data-research-interest-dropdown
      className="fixed overflow-hidden rounded-lg border bg-white shadow-xl z-[9999]"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${Math.max(dropdownPosition.width, 200)}px`,
        maxWidth: "calc(100vw - 2rem)",
        borderColor: "#E8E8E8",
        maxHeight: "240px",
      }}
      onMouseDown={(e) => {
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
            key={`${suggestion.id}-${index}`}
            onMouseDown={(event) => {
              event.preventDefault();
              handleSelectSuggestion(suggestion);
            }}
            onMouseEnter={() => setActiveIndex(index)}
            className={clsx(
              "flex items-center px-3 py-2 text-sm transition-colors cursor-pointer"
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
          >
            <span className="truncate flex-1">{suggestion.term}</span>
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
      {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </>
  );
}

