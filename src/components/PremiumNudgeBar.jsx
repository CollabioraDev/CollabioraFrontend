"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useCollabioraPro } from "../utils/collabioraPro.js";

/**
 * A subtle, premium announcement bar shown at the very top of the app
 * to nudge basic users towards Collabiora Pro.
 */
export default function PremiumNudgeBar({ user, variant = "floating" }) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const isPro = useCollabioraPro();

  // Placeholder for legacy user logic.
  const isLegacyUser = user?.isLegacyFree === true;

  // Only show for signed-in users who are not Pro and not Legacy
  const shouldShow = user && !isPro && !isLegacyUser;

  if (!shouldShow) return null;

  if (variant === "navbar") {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navigate("/plans");
        }}
        className="flex items-center gap-1.5 rounded-full border border-emerald-200/50 bg-gradient-to-r from-emerald-50 to-sky-50 px-2 py-0.5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md sm:gap-2 sm:px-3 sm:py-1"
      >
        <Sparkles className="h-3 w-3 text-emerald-600 sm:h-3.5 sm:w-3.5" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 sm:text-[10px]">
          {t("plans.nudge.cta")}
        </span>
      </motion.button>
    );
  }

  return null;
}
