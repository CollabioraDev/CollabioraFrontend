import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getIsCollabioraPro } from "../utils/collabioraPro.js";

/** Wellness Pro routes require Collabiora Pro (until billing is wired). */
export function ProWellnessGate({ children }) {
  if (!getIsCollabioraPro()) {
    return <Navigate to="/plans" replace />;
  }
  return children;
}

export function AuthenticatedRedirect({ children, allowIncomplete = false }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAuthenticated = token && (user._id || user.id);

  if (
    isAuthenticated &&
    allowIncomplete &&
    location.pathname === "/onboarding" &&
    user.onboardingComplete !== true
  ) {
    return children;
  }

  if (isAuthenticated) return <Navigate to="/yori" replace />;
  return children;
}

export function DashboardRedirect() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role || "patient";
  return <Navigate to={`/dashboard/${role}`} replace />;
}

export function ProfileGuard({ children }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user?._id || user?.id;
    const role = user?.role || "patient";

    if (!userId) {
      setStatus("complete");
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
    let cancelled = false;

    fetch(`${apiBase}/api/profile/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const profile = data?.profile;

        let isIncomplete = false;
        if (!profile) {
          isIncomplete = true;
        } else if (role === "patient") {
          const conditions = profile.patient?.conditions || [];
          isIncomplete = conditions.length === 0;
        } else if (role === "researcher") {
          const specialties = profile.researcher?.specialties || [];
          const interests = profile.researcher?.interests || [];
          isIncomplete = specialties.length === 0 && interests.length === 0;
        }

        if (isIncomplete) {
          setStatus("redirecting");
          toast(
            "Add your medical conditions or research interests to personalise your dashboard",
            {
              duration: 5000,
              icon: null,
              style: {
                background: "#2F3C96",
                color: "#fff",
                fontWeight: 500,
                borderRadius: "12px",
                padding: "12px 20px",
              },
            },
          );
          navigate("/profile", { replace: true });
        } else {
          setStatus("complete");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("complete");
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (status === "checking") {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        aria-hidden="true"
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2F3C96] border-t-transparent" />
      </div>
    );
  }

  if (status === "redirecting") return null;
  return children;
}
