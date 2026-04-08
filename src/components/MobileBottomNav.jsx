import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  Compass,
  MessageCircle,
  FileText,
  Microscope,
  BookOpen,
  X,
  Users as UsersIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function MobileBottomNav({ isPatient }) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const [showExploreMenu, setShowExploreMenu] = useState(false);

  useEffect(() => {
    setShowExploreMenu(false);
  }, [location.pathname]);

  const isActiveTab = (key) => {
    const path = location.pathname || "/";
    if (key === "home")
      return path === "/" || path === "/home" || path === "/yori";
    if (key === "dashboard") return path.startsWith("/dashboard");
    if (key === "explore") {
      return (
        path.startsWith("/explore") ||
        path.startsWith("/trials") ||
        path.startsWith("/publications") ||
        path.startsWith("/library") ||
        path.startsWith("/experts")
      );
    }
    if (key === "forums") {
      return path.startsWith("/forums") || path.startsWith("/researcher-forums");
    }
    if (key === "discovery") {
      return path.startsWith("/discovery") || path.startsWith("/trending");
    }
    return false;
  };

  const tabs = [
    { key: "home", label: t("mobileNav.home"), to: "/", Icon: Home },
    {
      key: "dashboard",
      label: t("mobileNav.dashboard"),
      to: "/dashboard",
      Icon: LayoutDashboard,
    },
    {
      key: "explore",
      label: t("mobileNav.explore"),
      to: "/explore",
      Icon: Compass,
    },
    {
      key: "forums",
      label: t("mobileNav.forums"),
      to: "/forums",
      Icon: MessageCircle,
    },
    {
      key: "discovery",
      label: t("mobileNav.discovery"),
      to: "/discovery",
      Icon: FileText,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D1D3E5] bg-white/95 backdrop-blur md:hidden">
      <div className="relative mx-auto flex max-w-md items-center justify-between px-3 py-2">
        {showExploreMenu && (
          <div className="pointer-events-auto absolute inset-x-0 -top-8 mb-4 flex justify-center">
            <div className="mb-24 w-full max-w-sm rounded-2xl border border-[#D1D3E5] bg-white shadow-lg shadow-slate-900/10 px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("mobileNav.exploreMenuTitle")}
                </p>
                <button
                  type="button"
                  onClick={() => setShowExploreMenu(false)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-[#2F3C96] transition-colors"
                  aria-label={t("mobileNav.closeExploreMenu")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Link
                  to="/trials"
                  className="flex flex-col items-center gap-1 rounded-xl bg-[#F5F2F8] px-2 py-2.5 text-center text-[11px] text-[#2F3C96]"
                >
                  <Microscope className="h-4 w-4" />
                  <span className="leading-tight">
                    {isPatient
                      ? t("mobileNav.patientTrials")
                      : t("mobileNav.researcherTrials")}
                  </span>
                </Link>
                <Link
                  to="/publications"
                  className="flex flex-col items-center gap-1 rounded-xl bg-[#F5F2F8] px-2 py-2.5 text-center text-[11px] text-[#2F3C96]"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="leading-tight">
                    {isPatient
                      ? t("mobileNav.patientPubs")
                      : t("mobileNav.researcherPubs")}
                  </span>
                </Link>
                <Link
                  to="/experts"
                  className="flex flex-col items-center gap-1 rounded-xl bg-[#F5F2F8] px-2 py-2.5 text-center text-[11px] text-[#2F3C96]"
                >
                  <UsersIcon className="h-4 w-4" />
                  <span className="leading-tight">
                    {isPatient
                      ? t("mobileNav.patientExperts")
                      : t("mobileNav.researcherExperts")}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {tabs.map(({ key, label, to, Icon }) => {
          const active = isActiveTab(key);
          const isExplore = key === "explore";
          const commonClasses = `flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] ${
            active ? "text-[#2F3C96]" : "text-slate-400 hover:text-slate-600"
          }`;
          const iconWrapperClasses = `mb-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
            active ? "bg-[#E8E9F2] shadow-sm" : "bg-transparent hover:bg-slate-100"
          }`;

          if (isExplore) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => setShowExploreMenu((prev) => !prev)}
                className={commonClasses}
              >
                <div className={iconWrapperClasses}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="leading-none">{label}</span>
              </button>
            );
          }

          return (
            <Link key={key} to={to} className={commonClasses}>
              <div className={iconWrapperClasses}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
