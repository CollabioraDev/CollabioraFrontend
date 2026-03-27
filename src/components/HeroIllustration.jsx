import { motion } from "framer-motion";

// Floating pill badge — minimal label only
function Pill({ label, delay, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className={`absolute px-3 py-1.5 rounded-full text-xs font-bold border bg-white shadow-md ${className}`}
      style={{ borderColor: "#E8E0EF", color: "#474F96" }}
    >
      {label}
    </motion.div>
  );
}

export default function HeroIllustration() {
  return (
    <div
      className="relative w-full hidden lg:flex items-center justify-center"
      style={{ minHeight: 380 }}
    >
      {/* Soft radial glow behind bot */}
      <div
        className="absolute rounded-full blur-3xl opacity-30"
        style={{
          width: 260,
          height: 260,
          background:
            "radial-gradient(circle, #7C3AED 0%, #2F3C96 60%, transparent 100%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Dashed orbit ring */}
      <svg
        className="absolute pointer-events-none"
        width="320"
        height="320"
        viewBox="0 0 320 320"
        fill="none"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      >
        <circle
          cx="160"
          cy="160"
          r="140"
          stroke="#D0C4E2"
          strokeWidth="1.2"
          strokeDasharray="6 9"
          opacity="0.7"
        />
        <circle
          cx="160"
          cy="160"
          r="100"
          stroke="#E8E0EF"
          strokeWidth="1"
          strokeDasharray="3 8"
          opacity="0.5"
        />
      </svg>

      {/* Floating minimal pills */}
      <Pill label="✦ Clinical Trials" delay={0.6} className="top-8  left-4" />
      <Pill label="✦ Treatments" delay={0.75} className="top-8  right-4" />
      <Pill label="✦ Research" delay={0.9} className="bottom-10 left-8" />
      <Pill label="✦ Connect" delay={1.05} className="bottom-10 right-8" />

      {/* Bot mascot */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.3,
          type: "spring",
          stiffness: 110,
        }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Chat bubble */}
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.85, duration: 0.45, type: "spring" }}
          className="mb-3 relative flex items-center gap-2 bg-white rounded-2xl rounded-bl-none px-4 py-2.5 shadow-lg border"
          style={{ borderColor: "#E8E0EF" }}
        >
          {/* typing dots animation on load then settle to text */}
          <span className="text-[13px] font-bold" style={{ color: "#2F3C96" }}>
            I found <span style={{ color: "#7C3AED" }}>3 matches</span> for you!
            ✨
          </span>
          {/* bubble tail */}
          <span
            className="absolute -bottom-[9px] left-5"
            style={{
              width: 0,
              height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "0px solid transparent",
              borderTop: "9px solid white",
              filter: "drop-shadow(0 1px 0 #E8E0EF)",
            }}
          />
        </motion.div>

        {/* Bot image */}
        <motion.img
          src="/bot.webp"
          alt="Yori the AI health assistant"
          className="relative w-36 h-36 object-contain drop-shadow-2xl"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          draggable={false}
        />

        {/* Small shadow under bot */}
        <div
          className="mt-2 rounded-full blur-md opacity-20"
          style={{ width: 80, height: 14, backgroundColor: "#2F3C96" }}
        />
      </motion.div>
    </div>
  );
}
