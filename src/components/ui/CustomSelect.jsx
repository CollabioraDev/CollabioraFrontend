import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";

/** @type {{ value: string; label: string }[]} */
function flattenOptionGroups(optionGroups) {
  if (!optionGroups?.length) return [];
  return optionGroups.flatMap((g) =>
    (g.options || []).map((opt) =>
      typeof opt === "string" ? { value: opt, label: opt } : opt
    )
  );
}

/** Filter option groups by search term */
function filterOptionGroups(optionGroups, searchTerm) {
  if (!searchTerm?.trim()) return optionGroups;
  const term = searchTerm.toLowerCase().trim();
  return optionGroups
    .map((g) => ({
      ...g,
      options: (g.options || []).filter((opt) => {
        const label = typeof opt === "string" ? opt : opt?.label || "";
        return label.toLowerCase().includes(term);
      }),
    }))
    .filter((g) => (g.options || []).length > 0);
}

export default function CustomSelect({
  value,
  onChange,
  options,
  optionGroups,
  placeholder = "Select...",
  className = "",
  disabled = false,
  maxDropdownHeight = 240,
  variant = "default",
  searchable = false,
  searchPlaceholder = "Search...",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [isPositionCalculated, setIsPositionCalculated] = useState(false);
  const selectRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  const filteredOptionGroups = useMemo(
    () =>
      searchable && optionGroups
        ? filterOptionGroups(optionGroups, searchTerm)
        : optionGroups,
    [optionGroups, searchTerm, searchable]
  );

  const flatOptions = useMemo(() => {
    let list = optionGroups
      ? flattenOptionGroups(filteredOptionGroups || optionGroups)
      : options || [];
    if (searchable && searchTerm?.trim() && !optionGroups) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((opt) =>
        (opt.label ?? opt.value ?? "").toLowerCase().includes(term)
      );
    }
    return list;
  }, [optionGroups, options, filteredOptionGroups, searchable, searchTerm]);

  const selectedOption = flatOptions.find((opt) => opt.value === value);

  // Update dropdown position (always below the trigger)
  const updateDropdownPosition = () => {
    if (selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();

      const minWidth = Math.max(
        rect.width,
        ...flatOptions.map((opt) =>
          Math.min((opt.label?.length || 0) * 8 + 80, 500)
        )
      );

      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, minWidth),
      });
      setIsPositionCalculated(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsPositionCalculated(false);
      updateDropdownPosition();
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    } else {
      setIsPositionCalculated(false);
    }
  }, [isOpen, flatOptions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const closeDropdown = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    closeDropdown();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
      return;
    }

    if (e.key === "Escape") {
      closeDropdown();
      return;
    }

    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const currentIndex = flatOptions.findIndex((opt) => opt.value === value);
      const nextIndex =
        currentIndex < flatOptions.length - 1 ? currentIndex + 1 : 0;
      onChange(flatOptions[nextIndex].value);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const currentIndex = flatOptions.findIndex((opt) => opt.value === value);
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : flatOptions.length - 1;
      onChange(flatOptions[prevIndex].value);
      return;
    }
  };

  const isOnboarding = variant === "onboarding";
  const isLocation = variant === "location";
  const borderColor = isOnboarding || isLocation
    ? "#E8E8E8"
    : "rgba(208, 196, 226, 0.3)";
  const selectedBg = isOnboarding
    ? "rgba(208, 196, 226, 0.25)"
    : "rgba(232, 224, 239, 0.6)";
  const hoverBg = isOnboarding
    ? "rgba(208, 196, 226, 0.15)"
    : "rgba(245, 242, 248, 1)";
  const accentColor = "#2F3C96";

  const renderOption = (option) => {
    const isSelected = option.value === value;
    const optKey = option.value === "" ? "__empty__" : String(option.value);

    if (isLocation) {
      return (
        <li
          key={optKey}
          onMouseDown={(e) => {
            e.preventDefault();
            handleSelect(option.value);
          }}
          className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors cursor-pointer min-w-0"
          style={
            isSelected
              ? {
                  backgroundColor: "rgba(208, 196, 226, 0.3)",
                  color: "#2F3C96",
                }
              : { color: "#787878" }
          }
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor =
                "rgba(208, 196, 226, 0.2)";
              e.currentTarget.style.color = "#2F3C96";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#787878";
            }
          }}
        >
          <span className="flex-1 min-w-0 truncate">{option.label}</span>
          {isSelected && (
            <Check className="w-4 h-4 shrink-0" style={{ color: "#2F3C96" }} />
          )}
        </li>
      );
    }

    return (
      <li
        key={optKey}
        onMouseDown={(e) => {
          e.preventDefault();
          handleSelect(option.value);
        }}
        className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors cursor-pointer min-w-0"
        style={
          isSelected
            ? { backgroundColor: selectedBg, color: accentColor }
            : { color: "#787878" }
        }
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = hoverBg;
            e.currentTarget.style.color = accentColor;
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#787878";
          }
        }}
      >
        <span className="flex-1 min-w-0 whitespace-normal break-words">
          {option.label}
        </span>
        {isSelected && (
          <Check className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
        )}
      </li>
    );
  };

  const dropdownContent = isOpen && (
    <div
      ref={dropdownRef}
      data-custom-select-dropdown
      className={`fixed overflow-hidden border bg-white shadow-xl ${
        isLocation ? "rounded-xl z-[9999]" : "rounded-lg z-[10000]"
      }`}
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        minWidth: "200px",
        maxWidth: "calc(100vw - 2rem)",
        maxHeight: `${maxDropdownHeight}px`,
        borderColor,
        overflowX: "hidden",
        visibility:
          isPositionCalculated || dropdownPosition.width > 0
            ? "visible"
            : "hidden",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {searchable && (
        <div
          className="flex items-center gap-2 px-3 py-2 border-b"
          style={{ borderColor: "#E8E8E8", backgroundColor: "#FAFAFA" }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: "#787878" }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                closeDropdown();
              }
            }}
            placeholder={searchPlaceholder}
            className="flex-1 text-sm bg-transparent border-none outline-none placeholder-slate-400"
            style={{ color: "#2F3C96" }}
          />
        </div>
      )}
      <ul
        className="overflow-y-auto overflow-x-hidden overscroll-contain list-none"
        style={{
          maxHeight: searchable
            ? `${maxDropdownHeight - 44}px`
            : `${maxDropdownHeight}px`,
          scrollBehavior: "smooth",
        }}
      >
        {optionGroups ? (
          (filteredOptionGroups || optionGroups).map((group) => (
            <li key={group.group} className="list-none">
              <div
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide pointer-events-none sticky top-0 z-10"
                style={{ color: "#787878", backgroundColor: "#F9F9F9" }}
              >
                {group.group}
              </div>
              <ul className="list-none">
                {(group.options || []).map((opt) =>
                  renderOption(typeof opt === "string" ? { value: opt, label: opt } : opt)
                )}
              </ul>
            </li>
          ))
        ) : (
          flatOptions.map((option) => renderOption(option))
        )}
      </ul>
    </div>
  );

  return (
    <>
      <div
        ref={selectRef}
        className={`relative ${className}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div
          className={`w-full border bg-white focus:outline-none transition-all cursor-pointer ${
            isLocation
              ? `h-9 min-h-9 rounded-xl px-3 pr-8 py-0 text-xs leading-none box-border flex items-center ${
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-[#D0C4E2]"
                } ${
                  isOpen
                    ? "border-[#E8E8E8] ring-2 ring-[#D0C4E2]"
                    : "border-[#E8E8E8]"
                }`
              : `px-3 py-2 pr-8 rounded-lg text-sm ${
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : isOnboarding
                      ? "hover:border-[#D0C4E2]"
                      : "hover:border-indigo-300"
                } ${
                  isOpen
                    ? isOnboarding
                      ? "border-[#2F3C96] ring-2 ring-[#D0C4E2]"
                      : "border-indigo-500 ring-2 ring-indigo-500"
                    : isOnboarding
                      ? "border-[#E8E8E8]"
                      : "border-slate-300"
                }`
          }`}
          style={
            isOnboarding || isLocation
              ? { color: selectedOption ? "#2F3C96" : "#787878" }
              : {}
          }
        >
          <span className="block truncate min-w-0">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none transition-transform ${
            isOpen ? "rotate-180" : ""
          } ${isLocation ? "h-3 w-3" : "w-4 h-4"}`}
          style={{ color: "#787878" }}
        />
      </div>
      {typeof document !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </>
  );
}

