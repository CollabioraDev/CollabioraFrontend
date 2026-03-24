import { useEffect, useState, useRef } from "react";
import { Info } from "lucide-react";

/** Renders outside modal overflow */
export default function Tooltip({ content }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const updatePosition = () => {
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });
      }
    };

    if (isVisible) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isVisible]);

  return (
    <>
      <div
        ref={iconRef}
        className="relative"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <Info className="w-4 h-4 text-slate-400 cursor-help" />
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed w-80 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-[10000] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: "translate(-50%, calc(-100% - 8px))",
          }}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-slate-900"></div>
          </div>
        </div>
      )}
    </>
  );
}
