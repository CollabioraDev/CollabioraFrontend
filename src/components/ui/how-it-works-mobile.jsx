import React from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  MessageSquare,
  Calendar,
  Download,
  Share2,
  Zap,
  Users,
  Beaker,
  BookOpen,
  Send,
} from "lucide-react";

export default function HowItWorksMobile() {
  const theme = {
    primary: "#2F3C96",
    secondary: "#D0C4E2",
    muted: "#787878",
    ctaGradient: "linear-gradient(135deg, #2F3C96 0%, #474F97 100%)",
    cardGradient:
      "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 242, 248, 0.95) 100%)",
    topLineGradient: "linear-gradient(90deg, #D0C4E2, rgba(208, 196, 226, 0.3))",
  };

  const features = [
    {
      icon: LayoutDashboard,
      title: "Unified Dashboard",
      description:
        "Manage trials, publications, experts, and reports from one personalized dashboard — all synced and accessible at a glance.",
      color: "brand",
      visual: "dashboard",
    },
    {
      icon: FileText,
      title: "Smart Reports",
      description:
        "Auto-generate structured reports from selected trials and publications. Perfect for sharing with doctors or keeping records.",
      color: "brand",
      visual: "reports",
    },
    {
      icon: Sparkles,
      title: "Instant Summaries",
      description:
        "Get instant automated summaries across trials, publications, and expert profiles — making complex medical info simple and actionable.",
      color: "brand",
      visual: "ai",
    },
    {
      icon: MessageSquare,
      title: "Collaborate & Schedule",
      description:
        "Patients can request meetings with experts. Researchers can chat with peers and collaborate directly within collabiora.",
      color: "brand",
      visual: "collaboration",
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      brand: {
        gradient: "from-[#2F3C96] to-[#474F97]",
        bg: "bg-white/70",
        border: "border-[#D0C4E2]/70",
        text: "text-[#2F3C96]",
        light: "bg-[#D0C4E2]",
      },
    };
    return colors[color] || colors.brand;
  };

  const renderVisual = (visual, colorClasses) => {
    switch (visual) {
      case "dashboard":
        return (
          <div className="grid grid-cols-2 gap-2 w-full">
            {[
              { icon: Beaker, label: "Trials", value: "12" },
              { icon: BookOpen, label: "Papers", value: "8" },
              { icon: Users, label: "Experts", value: "5" },
              { icon: FileText, label: "Reports", value: "3" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="bg-white/80 rounded-lg p-2 border"
                  style={{ borderColor: "rgba(208, 196, 226, 0.45)" }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3" style={{ color: theme.primary }} />
                    <span className="text-[9px] font-semibold" style={{ color: theme.primary }}>
                      {item.label}
                    </span>
                  </div>
                  <div className="text-xs font-bold" style={{ color: theme.primary }}>
                    {item.value}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case "reports":
        return (
          <div className="space-y-2 w-full">
            <button
              className={`w-full py-1.5 px-3 bg-linear-to-r ${colorClasses.gradient} text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md`}
            >
              <Zap className="w-3 h-3" />
              Generate
            </button>
            <div
              className="bg-white/80 rounded-lg p-2.5 border"
              style={{ borderColor: "rgba(208, 196, 226, 0.45)" }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-bold" style={{ color: theme.primary }}>Summary</div>
                <div className="flex gap-1">
                  <Download className="w-3 h-3" style={{ color: theme.muted }} />
                  <Share2 className="w-3 h-3" style={{ color: theme.muted }} />
                </div>
              </div>
              <div className="w-full h-1 bg-[#D0C4E2]/45 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full bg-linear-to-r ${colorClasses.gradient} w-3/4`}
                />
              </div>
              <div className="text-[10px]" style={{ color: theme.muted }}>
                3 trials, 5 papers
              </div>
            </div>
          </div>
        );

      case "ai":
        return (
          <div className="space-y-2 w-full">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colorClasses.bg} border ${colorClasses.border} w-full justify-center`}
            >
              <Sparkles className="w-3 h-3" style={{ color: theme.primary }} />
              <span className="text-[10px] font-bold" style={{ color: theme.primary }}>
                Quick Summary
              </span>
            </div>
            <div
              className="bg-white/80 rounded-lg p-2.5 border"
              style={{ borderColor: "rgba(208, 196, 226, 0.45)" }}
            >
              <div className="text-xs font-bold mb-1.5" style={{ color: theme.primary }}>
                Findings
              </div>
              <div className="text-[10px] leading-relaxed mb-2" style={{ color: theme.muted }}>
                78% response rate in advanced trials...
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: theme.primary }}>
                <Zap className="w-2.5 h-2.5" />
                <span>2s</span>
              </div>
            </div>
          </div>
        );

      case "collaboration":
        return (
          <div className="space-y-2 w-full">
            <button
              className={`w-full py-1.5 px-3 bg-linear-to-r ${colorClasses.gradient} text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md`}
            >
              <Calendar className="w-3 h-3" />
              Schedule
            </button>
            <div
              className="bg-white/80 rounded-lg p-2.5 border"
              style={{ borderColor: "rgba(208, 196, 226, 0.45)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                <div className="flex-1">
                  <div className="text-xs font-bold" style={{ color: theme.primary }}>
                    Dr. Chen
                  </div>
                  <div className="text-[10px]" style={{ color: theme.muted }}>
                    Online
                  </div>
                </div>
              </div>
              <div
                className="flex items-center gap-1.5 p-1.5 rounded border"
                style={{ backgroundColor: "#F5F2F8", borderColor: "rgba(208, 196, 226, 0.45)" }}
              >
                <MessageSquare className="w-3 h-3" style={{ color: theme.muted }} />
                <span className="text-[10px] flex-1" style={{ color: theme.muted }}>
                  Message...
                </span>
                <Send className="w-3 h-3" style={{ color: theme.primary }} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className="relative px-10 mb-10 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none ">
        <div
          className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: theme.secondary }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: theme.secondary }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-4"
        >
          <p className=" sm:text-lg font-bold leading-tight text-2xl pb-4" style={{ color: theme.primary }}>
            Everything{" "}
            <span style={{ color: theme.primary }}>
              You Need
            </span>{" "}
            for <br></br>
            <span className="block mt-1" style={{ color: theme.muted }}>Smarter Healthcare </span>
          </p>
        </motion.div>

        <div className="space-y-5 flex flex-col">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const colorClasses = getColorClasses(feature.color);

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div
                  className="backdrop-blur-sm rounded-xl p-3 border hover:shadow-lg transition-all duration-300 bg-white/85 relative overflow-hidden"
                  style={{
                    borderColor: theme.secondary,
                    backgroundColor: "#FFFFFF",
                    background: theme.cardGradient,
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                    style={{ background: theme.topLineGradient }}
                  />

                  <motion.div
                    whileHover={{ rotate: 8, scale: 1.05 }}
                    className="inline-flex p-2 rounded-lg shadow-md mb-2"
                    style={{ backgroundColor: theme.secondary }}
                  >
                    <Icon className="w-4 h-4" style={{ color: theme.primary }} />
                  </motion.div>

                  <h3 className="text-sm font-bold mb-1.5" style={{ color: theme.primary }}>
                    {feature.title}
                  </h3>

                  <p className="text-xs leading-relaxed mb-3" style={{ color: theme.muted }}>
                    {feature.description}
                  </p>

                  <div
                    className={`${colorClasses.bg} rounded-lg p-2.5 border ${colorClasses.border} backdrop-blur-sm`}
                  >
                    {renderVisual(feature.visual, colorClasses)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
