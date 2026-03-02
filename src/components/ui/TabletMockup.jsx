import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

export default function TabletMockup({ children, className = "", imageSrc = null }) {
  const containerRef = useRef(null);

  // Track scroll progress relative to this element
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.9", "center 0.1"],
  });

  // Create spring configs for smooth animations
  const springConfig = {
    stiffness: 100,
    damping: 10,
    restDelta: 0.001
  };

  // Transform scroll progress to rotation with smoother curve
  const rotateXRaw = useTransform(
    scrollYProgress, 
    [0, 0.15, 0.35, 0.65, 1], 
    [15, 8, 3, 0, 0]
  );
  const rotateX = useSpring(rotateXRaw, springConfig);

  // Smoother opacity transition
  const opacityRaw = useTransform(
    scrollYProgress,
    [0, 0.1, 0.3, 1],
    [0, 0.6, 1, 1]
  );
  const opacity = useSpring(opacityRaw, { ...springConfig, damping: 25 });

  // Smoother scale with more steps
  const scaleRaw = useTransform(
    scrollYProgress, 
    [0, 0.15, 0.35, 0.65], 
    [0.88, 0.94, 0.98, 1]
  );
  const scale = useSpring(scaleRaw, springConfig);

  // Smoother vertical movement
  const yRaw = useTransform(scrollYProgress, [0, 0.25, 0.5], [80, 20, 0]);
  const y = useSpring(yRaw, springConfig);

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto ${className}`}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        style={{
          rotateX,
          opacity,
          scale,
          y,
          transformStyle: "preserve-3d",
        }}
        className="relative w-full max-w-6xl mx-auto"
        initial={{ rotateX: 15 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Outer Shadow/Glow with smooth pulsing */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/20 rounded-[2rem] blur-2xl mb-20"
          style={{
            scale: useSpring(
              useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1.12, 1.15]),
              springConfig
            ),
            opacity: useSpring(
              useTransform(scrollYProgress, [0, 0.3, 1], [0.4, 0.7, 0.9]),
              springConfig
            ),
          }}
          animate={{
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Tablet Container - Landscape Mode */}
        <motion.div
          className="relative bg-gray-900 rounded-[2rem] p-3"
          style={{ aspectRatio: "16/10" }}
          initial={{ boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)" }}
          animate={{
            boxShadow: [
              "0 20px 50px rgba(0, 0, 0, 0.3)",
              "0 25px 60px rgba(0, 0, 0, 0.4)",
              "0 0px 0px rgba(0, 0, 0, 0)",
            ],
          }}

        >
          {/* Camera on top (landscape orientation) */}
        
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-700 rounded-full" />
        

          {/* Screen */}
          <motion.div
            className="relative bg-white rounded-[1.75rem] overflow-hidden shadow-inner h-full"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Status Bar - Horizontal */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-gray-50 border-b border-gray-200 z-20 flex items-center justify-between px-4 text-[10px] text-gray-600">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1.5 border border-gray-400 rounded-sm">
                  <div className="w-2 h-full bg-gray-600 rounded-sm" />
                </div>
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>

            {/* Content Area */}
            <motion.div
              className="pt-6 h-full overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            >
              {imageSrc ? (
                <motion.img
                  src={imageSrc}
                  alt="Dashboard Preview"
                  className="w-full h-full object-cover object-top"
                  initial={{ scale: 1.05, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              ) : (
                children
              )}
            </motion.div>
          </motion.div>

          {/* Home Indicator - Horizontal */}
          <motion.div
            className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-gray-700 rounded-full"
            initial={{ opacity: 0, scaleX: 0.5 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
