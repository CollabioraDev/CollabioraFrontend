import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Check if user has scrolled halfway down the page
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Calculate if scrolled past 50% of the page
      const scrollableHeight = scrollHeight - clientHeight;
      
      // Only show button if page is scrollable and user has scrolled past 50%
      if (scrollableHeight > 0) {
        const scrollPercentage = scrollTop / scrollableHeight;
        setIsVisible(scrollPercentage > 0.5);
      } else {
        setIsVisible(false);
      }
    };

    // Listen to scroll events
    window.addEventListener("scroll", toggleVisibility);

    // Check initial scroll position
    toggleVisibility();

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0, y: 20 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={scrollToTop}
          className="fixed bottom-8 left-8 z-50 p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            backgroundColor: "#2F3C96",
            color: "#FFFFFF",
            border: "none",
          }}
          aria-label="Scroll to top"
        >
          <motion.div
            animate={{
              y: [0, -4, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <ArrowUp className="w-5 h-5" />
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

