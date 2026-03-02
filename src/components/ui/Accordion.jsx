"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const Accordion = ({ items, featureIcon: FeatureIcon, className = "" }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const handleToggle = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, idx) => {
        const Icon = item.icon;
        const DetailIcon = item.details?.icon;
        const isExpanded = expandedIndex === idx;

        return (
          <div key={idx} className="w-full">
            <button
              type="button"
              onClick={(e) => handleToggle(idx, e)}
              className="w-full text-left focus:outline-none"
            >
              <div
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: isExpanded ? "#F5F2F8" : "#F5F5F5",
                  borderColor: isExpanded ? "#D0C4E2" : "transparent",
                  borderWidth: isExpanded ? "1px" : "0px",
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs"
                    style={{
                      backgroundColor: "#2F3C96",
                      color: "#FFFFFF",
                    }}
                  >
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: "#2F3C96" }}
                      />
                      <p
                        className="text-sm font-semibold leading-tight"
                        style={{ color: "#2F3C96" }}
                      >
                        {item.title}
                      </p>
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 ml-auto ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        style={{ color: "#787878" }}
                      />
                    </div>
                    <p
                      className="text-[10px] leading-tight truncate"
                      style={{ color: "#787878" }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    className="mt-2.5 pt-2.5"
                    style={{
                      borderTop: "1px solid rgba(208, 196, 226, 0.3)",
                    }}
                  >
                    {item.features && item.features.length > 0 && (
                      <ul className="space-y-1.5 mb-2.5">
                        {item.features.map((feature, fIdx) => (
                          <li
                            key={fIdx}
                            className="flex items-start gap-1.5 text-xs leading-relaxed"
                            style={{ color: "#2F3C96" }}
                          >
                            {FeatureIcon && (
                              <FeatureIcon
                                className="w-3 h-3 shrink-0 mt-0.5"
                                style={{ color: "#D0C4E2" }}
                              />
                            )}
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.details && (
                      <div
                        className="flex items-start gap-1.5 p-2 rounded-lg"
                        style={{
                          backgroundColor: "rgba(47, 60, 150, 0.05)",
                        }}
                      >
                        {DetailIcon && (
                          <DetailIcon
                            className="w-3.5 h-3.5 shrink-0 mt-0.5"
                            style={{ color: "#2F3C96" }}
                          />
                        )}
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: "#2F3C96" }}
                        >
                          <span className="font-semibold">Tip: </span>
                          {item.details.highlight}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
