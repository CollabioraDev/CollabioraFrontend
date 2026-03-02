import React from "react";
import { motion } from "framer-motion";

export default function AnimatedBackground() {
  // Animation variants for icons
  const iconVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 20
    },
    visible: (i) => ({
      opacity: 0.6,
      scale: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: "easeOut"
      }
    })
  };

  // Floating animation for icons
  const floatVariants = {
    animate: {
      y: [0, -30, -20, -35, 0],
      x: [0, 15, -10, 10, 0],
      scale: [1, 1.05, 0.95, 1.02, 1],
      opacity: [0.6, 0.8, 0.7, 0.85, 0.6],
      transition: {
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Rotating float animation for icons
  const rotateFloatVariants = {
    animate: {
      y: [0, -25, -15, -30, 0],
      x: [0, 20, -15, 10, 0],
      rotate: [0, 5, -3, 4, 0],
      scale: [1, 1.05, 0.95, 1.02, 1],
      opacity: [0.6, 0.8, 0.7, 0.85, 0.6],
      transition: {
        duration: 14,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };
  return (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-indigo-50 via-white to-indigo-100">
        {/* Enhanced Gradient Blobs - Multiple layers with better animations */}
        {/* Large primary blob - top right */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-400/30 via-blue-400/20 to-indigo-600/25 rounded-full blur-3xl animate-blob-float" />

        {/* Medium blob - bottom left */}
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-500/25 via-blue-500/20 to-indigo-700/30 rounded-full blur-3xl animate-blob-float-reverse"
          style={{ animationDelay: "1s" }}
        />

        {/* Small accent blob - top center */}
        <div
          className="absolute top-1/4 left-1/2 w-[300px] h-[300px] bg-gradient-to-br from-blue-400/20 to-indigo-400/25 rounded-full blur-3xl animate-blob-pulse"
          style={{ animationDelay: "0.5s" }}
        />

        {/* Medium blob - center right */}
        <div
          className="absolute top-1/2 right-10 w-[350px] h-[350px] bg-gradient-to-bl from-indigo-300/20 via-blue-300/15 to-indigo-500/25 rounded-full blur-3xl animate-blob-float"
          style={{ animationDelay: "1.5s" }}
        />

        {/* Small blob - bottom right */}
        <div
          className="absolute bottom-20 right-1/4 w-[250px] h-[250px] bg-gradient-to-tr from-blue-500/25 to-indigo-600/30 rounded-full blur-3xl animate-blob-float-reverse"
          style={{ animationDelay: "0.8s" }}
        />

        {/* Floating Medical Icons - Enhanced with indigo/blue tones and better animations */}
        {/* Left Side Icons - Evenly spaced with constant left-10 position */}
        {/* Stethoscope */}
      </div>

      <style>{`
        /* Enhanced blob animations */
        @keyframes blob-float {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        @keyframes blob-float-reverse {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(-30px, 50px) scale(0.9);
          }
          66% {
            transform: translate(20px, -20px) scale(1.1);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        @keyframes blob-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.8;
          }
        }

        .animate-blob-float {
          animation: blob-float 20s ease-in-out infinite;
        }

        .animate-blob-float-reverse {
          animation: blob-float-reverse 18s ease-in-out infinite;
        }

        .animate-blob-pulse {
          animation: blob-pulse 8s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
