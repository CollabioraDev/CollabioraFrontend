import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";

export default function LandingNavbar() {
  const [user, setUser] = useState(null);
  const [isPastHero, setIsPastHero] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const scrollRafRef = useRef(null);
  const navigate = useNavigate();

  /* ── Auth state ── */
  useEffect(() => {
    const updateUser = () => {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");
      if (userData && token) {
        setUser(userData);
      } else {
        setUser(null);
      }
    };

    updateUser();
    window.addEventListener("login", updateUser);
    window.addEventListener("logout", () => setUser(null));
    window.addEventListener("storage", (e) => {
      if (e.key === "user" || e.key === "token") updateUser();
    });

    return () => {
      window.removeEventListener("login", updateUser);
      window.removeEventListener("logout", () => setUser(null));
    };
  }, []);

  /* ── Mobile detection ── */
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* ── Scroll tracking ── */
  useEffect(() => {
    const onScroll = () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        // Hero section is ~100vh, show the CTA after ~80% of that
        const threshold = window.innerHeight * 0.75;
        setIsAtTop(y < 50);
        setIsPastHero(y > threshold);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initial check
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  const getDashboardPath = () =>
    user ? `/dashboard/${user.role || "patient"}` : "/dashboard/patient";

  const logoHeightClass = isMobile
    ? isAtTop
      ? "h-14"
      : "h-10"
    : isAtTop
      ? "h-[4.5rem]"
      : "h-14";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none ui-fade-in">
      <div
        className={`pointer-events-auto flex items-center justify-between w-full ${
          isAtTop
            ? "px-6 lg:px-10 py-4 bg-transparent border-transparent shadow-none"
            : "px-6 lg:px-10 py-3"
        }`}
        style={
          !isAtTop
            ? {
                background:
                  "linear-gradient(135deg, rgba(245, 242, 248, 0.92), rgba(255, 255, 255, 0.75))",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                boxShadow:
                  "0 4px 16px 0 rgba(47, 60, 150, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)",
                borderBottom: "1px solid #D0C4E2",
              }
            : {}
        }
      >
        {/* ── Logo (bigger on landing) ── */}
        <Link
          to={user ? "/yori" : "/"}
          className="flex items-center"
          aria-label="collabiora home"
        >
          <img
            src="/logo.webp"
            alt="collabiora"
            width={842}
            height={704}
            className={`w-auto ${logoHeightClass}`}
            style={{
              filter: isAtTop
                ? "drop-shadow(0 6px 12px rgba(47, 60, 150, 0.25))"
                : "drop-shadow(0 3px 6px rgba(47, 60, 150, 0.18))",
            }}
          />
        </Link>

        {/* ── Right side: CTA that appears after hero ── */}
        <div className="flex items-center min-h-[2.75rem]">
          {isPastHero && (
            <div className="ui-fade-in-fast">
              {!user ? (
                <button
                  type="button"
                  onClick={() => navigate("/onboarding")}
                  className="px-6 py-2.5 rounded-xl font-bold text-[14px] uppercase tracking-wider transition-all active:scale-[0.97] shadow-[0_4px_0_0_#1c2459] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_0px_0_0_#1c2459]"
                  style={{ backgroundColor: "#2F3C96", color: "#FFFFFF" }}
                >
                  Get Started
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(getDashboardPath())}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[14px] uppercase tracking-wider transition-all active:scale-[0.97] shadow-[0_4px_0_0_#1c2459] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_0px_0_0_#1c2459]"
                  style={{ backgroundColor: "#2F3C96", color: "#FFFFFF" }}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
