import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Admin login is integrated with main sign-in. Redirect to sign-in so admins
// use email + password + role; backend returns isAdmin and frontend redirects to admin dashboard.
export default function AdminLogin() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/signin", { replace: true });
  }, [navigate]);

  return null;
}

