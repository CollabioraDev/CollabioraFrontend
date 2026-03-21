import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidthClassName = "max-w-2xl",
}) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Modal Content */}
          <motion.div
            className={`relative z-10 w-full ${maxWidthClassName} max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl border`}
            style={{ borderColor: "rgba(208, 196, 226, 0.5)" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 0.8,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient Header */}
            <div
              className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 backdrop-blur-sm border-b"
              style={{
                background: "linear-gradient(135deg, rgba(232, 224, 239, 0.8), rgba(255, 255, 255, 0.9), rgba(232, 224, 239, 0.8))",
                borderColor: "rgba(208, 196, 226, 0.5)",
              }}
            >
              <motion.h2
                className="text-xl font-bold bg-clip-text text-transparent"
                style={{
                  background: "linear-gradient(135deg, #2F3C96, #253075)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {title}
              </motion.h2>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-lg transition-all duration-200 group"
                style={{
                  color: "#787878",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = "#2F3C96";
                  e.target.style.backgroundColor = "rgba(232, 224, 239, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "#787878";
                  e.target.style.backgroundColor = "transparent";
                }}
                aria-label="Close modal"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <X className="w-5 h-5 transition-colors" />
              </motion.button>
            </div>

            {/* Body with fade-in animation - min-h-0 so content can scroll inside */}
            <motion.div
              className="p-6 overflow-y-auto overflow-x-hidden max-h-[calc(90vh-80px)] min-h-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {children}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
