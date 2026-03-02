"use client";

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronDown, Beaker, BookOpen, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("trials");
  const [isFocused, setIsFocused] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const inputRef = useRef(null);
  const categoryRef = useRef(null);
  const navigate = useNavigate();

  const categories = [
    { id: "trials", label: "Trials", icon: Beaker },
    { id: "publications", label: "Publications", icon: BookOpen },
    { id: "experts", label: "Experts", icon: Users },
  ];

  const selectedCategory = categories.find((c) => c.id === category);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/${category}?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
      setIsFocused(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };

  const handleClear = () => {
    setQuery("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCategorySelect = (catId) => {
    setCategory(catId);
    setIsCategoryOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };


  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(event.target)
      ) {
        setIsCategoryOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full sm:flex-1 sm:max-w-lg sm:mx-4"
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        // Don't blur if clicking on the form itself
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false);
        }
      }}
    >
      <div
        className={`relative flex items-center rounded-xl border-2 transition-all duration-200 overflow-hidden ${
          isFocused
            ? "shadow-lg scale-[1.01]"
            : "shadow-sm hover:shadow-md"
        }`}
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: isFocused ? "#2F3C96" : "#D0C4E2",
        }}
      >
        {/* Category Selector */}
        <div className="relative" ref={categoryRef}>
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="flex items-center gap-1.5 px-3 py-2.5 border-r-2 transition-colors hover:bg-gray-50"
            style={{
              borderColor: "#D0C4E2",
              color: "#2F3C96",
            }}
          >
            {selectedCategory && (
              <>
                <selectedCategory.icon className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">
                  {selectedCategory.label}
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    isCategoryOpen ? "rotate-180" : ""
                  }`}
                />
              </>
            )}
          </button>

          {/* Category Dropdown */}
          <AnimatePresence>
            {isCategoryOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 mt-1 w-48 rounded-lg border-2 shadow-xl z-50 overflow-hidden"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#D0C4E2",
                }}
              >
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        category === cat.id
                          ? ""
                          : "hover:bg-gray-50"
                      }`}
                      style={{
                        backgroundColor:
                          category === cat.id ? "#F5F2F8" : "transparent",
                        color: "#2F3C96",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{cat.label}</span>
                      {category === cat.id && (
                        <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: "#2F3C96" }} />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search Input */}
        <div className="flex-1 flex items-center relative">
          <Search
            className="absolute left-3 w-4 h-4 pointer-events-none"
            style={{ color: "#787878" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${selectedCategory?.label.toLowerCase()}...`}
            className="w-full pl-10 pr-10 py-2.5 bg-transparent border-0 outline-none text-sm"
            style={{ color: "#2F3C96" }}
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                onClick={handleClear}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                style={{ color: "#787878" }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

      </div>
    </form>
  );
};

export default GlobalSearch;

