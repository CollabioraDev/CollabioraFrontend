"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import AnimatedBackground from "../components/ui/AnimatedBackground";
export default function ErrorPage() {
  const { t } = useTranslation("common");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col">
      <AnimatedBackground isMobile={isMobile} />

      <section className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 sm:pb-16 z-10">
        <div className="max-w-xl w-full flex flex-col items-center text-center">
          {/* Sad Yori full illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative mb-6"
          >
            <div className="inline-flex items-center justify-center rounded-2xl p-3 sm:p-4">
              <img
                src="/sad-yori-full.webp"
                alt={t("errors.yoriAlt")}
                className="max-h-44 sm:max-h-52 w-auto object-contain object-bottom"
              />
            </div>
          </motion.div>

          {/* 404 badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-purple-100/80 text-[#2F3C96] text-sm font-semibold mb-4 border border-[#D0C4E2]/60"
          >
            <span className="text-base font-bold">404</span>
            <span className="text-[#787878]">·</span>
            <span>{t("errors.pageNotFound")}</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2"
          >
            {t("errors.oops")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="text-[#787878] text-base sm:text-lg max-w-sm mx-auto mb-8"
          >
            {t("errors.description")}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-purple-200 text-[#2F3C96] font-semibold text-base shadow-lg shadow-[#D0C4E2]/40 hover:shadow-xl hover:bg-brand-purple-300 hover:text-[#1C2454] active:scale-[0.98] transition-all duration-200"
            >
              {t("errors.backHome")}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
