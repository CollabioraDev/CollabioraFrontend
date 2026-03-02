import React from "react";
import { motion } from "framer-motion";

export default function AnimatedBackground({ isMobile = false }) {
  // Reduced opacity for mobile
  const iconOpacity = isMobile ? 0.2 : 0.6;
  const blobOpacity = isMobile ? 0.1 : 1;

  // Animation variants for icons
  const iconVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 20,
    },
    visible: (i) => ({
      opacity: iconOpacity,
      scale: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: "easeOut",
      },
    }),
  };

  // Floating animation for icons
  const floatVariants = {
    animate: {
      y: [0, -30, -20, -35, 0],
      x: [0, 15, -10, 10, 0],
      scale: [1, 1.05, 0.95, 1.02, 1],
      opacity: [
        iconOpacity,
        iconOpacity * 1.3,
        iconOpacity * 1.15,
        iconOpacity * 1.4,
        iconOpacity,
      ],
      transition: {
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // Rotating float animation for icons
  const rotateFloatVariants = {
    animate: {
      y: [0, -25, -15, -30, 0],
      x: [0, 20, -15, 10, 0],
      rotate: [0, 5, -3, 4, 0],
      scale: [1, 1.05, 0.95, 1.02, 1],
      opacity: [
        iconOpacity,
        iconOpacity * 1.3,
        iconOpacity * 1.15,
        iconOpacity * 1.4,
        iconOpacity,
      ],
      transition: {
        duration: 14,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };
  return (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-[#F5F2F8] via-white to-[#E8E0EF] ">
        {/* Optimized Gradient Blobs - Reduced from 6 to 3 for better performance */}
        {/* Large primary blob - top right */}
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br rounded-full blur-2xl animate-blob-float"
          style={{
            background: `linear-gradient(to bottom right, rgba(208, 196, 226, ${
              0.3 * blobOpacity
            }), rgba(47, 60, 150, ${0.2 * blobOpacity}), rgba(208, 196, 226, ${
              0.25 * blobOpacity
            }))`,
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />

        {/* Medium blob - bottom left */}
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr rounded-full blur-2xl animate-blob-float-reverse"
          style={{
            animationDelay: "1s",
            background: `linear-gradient(to top right, rgba(47, 60, 150, ${
              0.25 * blobOpacity
            }), rgba(208, 196, 226, ${0.2 * blobOpacity}), rgba(47, 60, 150, ${
              0.3 * blobOpacity
            }))`,
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />

        {/* Small accent blob - top center */}
        <div
          className="absolute top-1/4 left-1/2 w-[300px] h-[300px] bg-gradient-to-br rounded-full blur-2xl animate-blob-pulse"
          style={{
            animationDelay: "0.5s",
            background: `linear-gradient(to bottom right, rgba(208, 196, 226, ${
              0.2 * blobOpacity
            }), rgba(208, 196, 226, ${0.25 * blobOpacity}))`,
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
          }}
        />
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
          will-change: transform;
          transform: translateZ(0);
        }

        .animate-blob-float-reverse {
          animation: blob-float-reverse 18s ease-in-out infinite;
          will-change: transform;
          transform: translateZ(0);
        }

        .animate-blob-pulse {
          animation: blob-pulse 8s ease-in-out infinite;
          will-change: transform, opacity;
          transform: translateZ(0);
        }
      `}</style>
    </>
  );
}
