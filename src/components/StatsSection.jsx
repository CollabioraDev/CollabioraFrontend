"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Users, FlaskConical, BookOpen, Globe } from "lucide-react";

const AnimatedNumber = ({ value, delay = 0 }) => {
  const [displayValue, setDisplayValue] = useState("0");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    const numericValue = parseInt(value.replace(/[^0-9]/g, ""));
    const suffix = value.replace(/[0-9]/g, "");
    const duration = 2000;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setDisplayValue(numericValue + suffix);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current) + suffix);
        }
      }, duration / steps);
    }, delay * 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [isInView, value, delay]);

  return <span ref={ref}>{displayValue}</span>;
};

const StatsSection = () => {
  const stats = [
    {
      value: "100+",
      label: "Researchers",
      icon: Users,
      delay: 0.1,
    },
    {
      value: "1500+",
      label: "Participants",
      icon: FlaskConical,
      delay: 0.2,
    },
    {
      value: "1000+",
      label: "Studies",
      icon: BookOpen,
      delay: 0.3,
    },
    {
      value: "25+",
      label: "Countries",
      icon: Globe,
      delay: 0.4,
    },
  ];

  return (
    <section
      className="relative py-12 sm:py-16 px-4 sm:px-6 overflow-hidden"
      style={{ backgroundColor: "transparent" }}
    >
      <div className="relative max-w-6xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.6,
                  delay: stat.delay,
                  type: "spring",
                  stiffness: 100,
                }}
                className="relative group"
              >
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  className="relative h-full"
                >
                  <div
                    className="rounded-xl p-4 sm:p-5 border bg-white h-full flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                    style={{
                      borderColor: "#D0C4E2",
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    {/* Gradient top border */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2F3C96] via-[#D0C4E2] to-[#2F3C96] opacity-60 group-hover:opacity-100 transition-opacity" />

                    {/* Icon with background */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.5,
                        delay: stat.delay + 0.1,
                      }}
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      className="mb-3 sm:mb-4"
                    >
                      <div
                        className="p-2 sm:p-2.5 rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, #F5F2F8 0%, #E8E0EF 100%)`,
                          border: "1px solid #D0C4E2",
                        }}
                      >
                        <Icon
                          className="w-4 h-4 sm:w-5 sm:h-5"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                    </motion.div>

                    {/* Animated Value */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.6,
                        delay: stat.delay + 0.3,
                      }}
                      className="mb-1.5 sm:mb-2"
                    >
                      <span
                        className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight block"
                        style={{
                          color: "#2F3C96",
                          fontWeight: "normal",
                          background: `linear-gradient(135deg, #2F3C96 0%, #474F97 100%)`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        <AnimatedNumber
                          value={stat.value}
                          delay={stat.delay + 0.3}
                        />
                      </span>
                    </motion.div>

                    {/* Label */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: stat.delay + 0.5 }}
                      className="text-xs sm:text-sm font-normal"
                      style={{ color: "#787878", fontWeight: "normal" }}
                    >
                      {stat.label}
                    </motion.p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
