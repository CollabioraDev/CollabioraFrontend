import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { useAuth0Social } from "../hooks/useAuth0Social.js";
import { Mail, Eye, EyeOff } from "lucide-react";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [socialLoginLoading, setSocialLoginLoading] = useState(null);
  const navigate = useNavigate();

  // Auth0 social login
  const {
    loginWithGoogle,
    loginWithMicrosoft,
    loginWithFacebook,
    loginWithApple,
    isConfigured: isAuth0Configured,
  } = useAuth0Social();

  // Handle social login
  async function handleSocialLogin(provider) {
    setSocialLoginLoading(provider);
    setError("");

    // For sign-in, we don't need to pass onboarding data
    // The user should already have an account
    try {
      if (provider === "google") {
        await loginWithGoogle({ screenHint: "login" });
      } else if (provider === "microsoft") {
        await loginWithMicrosoft({ screenHint: "login" });
      } else if (provider === "facebook") {
        await loginWithFacebook({ screenHint: "login" });
      } else if (provider === "apple") {
        await loginWithApple({ screenHint: "login" });
      }
    } catch (e) {
      console.error(`${provider} login error:`, e);
      setError(`Failed to sign in with ${provider}. Please try again.`);
      setSocialLoginLoading(null);
    }
  }

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);
    setError("");
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign in failed");
        setLoading(false);
        return;
      }

      // Admin: use main sign-in; backend returns isAdmin when user has admin access
      if (data.isAdmin) {
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminEmail", email.trim());
        navigate("/admin/dashboard");
        setLoading(false);
        return;
      }

      // Store JWT token for regular users
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Dispatch login event to update navbar
      window.dispatchEvent(new Event("login"));

      navigate("/yori");
    } catch (e) {
      setError("Failed to sign in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />

        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <div
            className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border p-5 sm:p-6 space-y-4 transition-all duration-300"
            style={{
              borderColor: "#D0C4E2",
              boxShadow: "0 20px 60px rgba(208, 196, 226, 0.25)",
              backgroundColor: "rgba(255, 255, 255, 0.98)",
            }}
          >
            {/* Header */}
            <div className="text-center space-y-1.5">
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: "#2F3C96" }}
              >
                Sign In
              </h1>
              <p className="text-xs font-medium" style={{ color: "#787878" }}>
                Resume your session
              </p>
            </div>

            {/* Social Sign-In Options */}
            {isAuth0Configured && (
              <div className="space-y-2.5">
                <p
                  className="text-xs text-center font-medium"
                  style={{ color: "#787878" }}
                >
                  Sign in with
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <motion.button
                    type="button"
                    disabled={socialLoginLoading !== null}
                    whileHover={{
                      scale: socialLoginLoading ? 1 : 1.02,
                      backgroundColor: "rgba(208, 196, 226, 0.15)",
                    }}
                    whileTap={{ scale: socialLoginLoading ? 1 : 0.98 }}
                    className="flex flex-col items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: "rgba(208, 196, 226, 0.08)",
                      borderColor: "#D0C4E2",
                      color: "#2F3C96",
                    }}
                    onClick={() => handleSocialLogin("google")}
                  >
                    {socialLoginLoading === "google" ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-[18px] h-[18px] rounded-full border-2"
                        style={{
                          borderColor: "rgba(47, 60, 150, 0.3)",
                          borderTopColor: "#2F3C96",
                        }}
                      />
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                    )}
                    <span className="text-[10px] font-medium leading-tight">
                      Google
                    </span>
                  </motion.button>
                  <motion.button
                    type="button"
                    disabled={socialLoginLoading !== null}
                    whileHover={{
                      scale: socialLoginLoading ? 1 : 1.02,
                      backgroundColor: "rgba(208, 196, 226, 0.15)",
                    }}
                    whileTap={{ scale: socialLoginLoading ? 1 : 0.98 }}
                    className="flex flex-col items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: "rgba(208, 196, 226, 0.08)",
                      borderColor: "#D0C4E2",
                      color: "#2F3C96",
                    }}
                    onClick={() => handleSocialLogin("microsoft")}
                  >
                    {socialLoginLoading === "microsoft" ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-[18px] h-[18px] rounded-full border-2"
                        style={{
                          borderColor: "rgba(0, 120, 212, 0.3)",
                          borderTopColor: "#0078D4",
                        }}
                      />
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M11.4 11.4H3V3h8.4v8.4z" fill="#F25022" />
                        <path d="M21 11.4h-8.4V3H21v8.4z" fill="#7FBA00" />
                        <path d="M11.4 21H3v-8.4h8.4V21z" fill="#00A4EF" />
                        <path d="M21 21h-8.4v-8.4H21V21z" fill="#FFB900" />
                      </svg>
                    )}
                    <span className="text-[10px] font-medium leading-tight">
                      Microsoft
                    </span>
                  </motion.button>
                  <motion.button
                    type="button"
                    disabled={socialLoginLoading !== null}
                    whileHover={{
                      scale: socialLoginLoading ? 1 : 1.02,
                      backgroundColor: "rgba(208, 196, 226, 0.15)",
                    }}
                    whileTap={{ scale: socialLoginLoading ? 1 : 0.98 }}
                    className="flex flex-col items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: "rgba(208, 196, 226, 0.08)",
                      borderColor: "#D0C4E2",
                      color: "#2F3C96",
                    }}
                    onClick={() => handleSocialLogin("facebook")}
                  >
                    {socialLoginLoading === "facebook" ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-[18px] h-[18px] rounded-full border-2"
                        style={{
                          borderColor: "rgba(24, 119, 242, 0.3)",
                          borderTopColor: "#1877F2",
                        }}
                      />
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                          fill="#1877F2"
                        />
                      </svg>
                    )}
                    <span className="text-[10px] font-medium leading-tight">
                      Facebook
                    </span>
                  </motion.button>
                  <motion.button
                    type="button"
                    disabled={socialLoginLoading !== null}
                    whileHover={{
                      scale: socialLoginLoading ? 1 : 1.02,
                      backgroundColor: "rgba(208, 196, 226, 0.15)",
                    }}
                    whileTap={{ scale: socialLoginLoading ? 1 : 0.98 }}
                    className="flex flex-col items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: "rgba(208, 196, 226, 0.08)",
                      borderColor: "#D0C4E2",
                      color: "#2F3C96",
                    }}
                    onClick={() => handleSocialLogin("apple")}
                  >
                    {socialLoginLoading === "apple" ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-[18px] h-[18px] rounded-full border-2"
                        style={{
                          borderColor: "rgba(0, 0, 0, 0.3)",
                          borderTopColor: "#000000",
                        }}
                      />
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                          fill="#000000"
                        />
                      </svg>
                    )}
                    <span className="text-[10px] font-medium leading-tight">
                      Apple
                    </span>
                  </motion.button>
                </div>
                <div className="relative my-3">
                  <div
                    className="absolute inset-0 flex items-center"
                    style={{ borderColor: "#E8E8E8" }}
                  >
                    <div
                      className="w-full border-t"
                      style={{ borderColor: "#E8E8E8" }}
                    />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span
                      className="px-2"
                      style={{
                        color: "#787878",
                        backgroundColor: "rgba(255, 255, 255, 0.98)",
                      }}
                    >
                      Or continue with email
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: "#2F3C96" }}
                >
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSignIn()}
                  className="w-full py-2 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: "#E8E8E8",
                    color: "#2F3C96",
                    backgroundColor: "#FFFFFF",
                    "--tw-ring-color": "#D0C4E2",
                  }}
                />
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: "#2F3C96" }}
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSignIn()}
                    className="w-full py-2 pl-3 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: "#E8E8E8",
                      color: "#2F3C96",
                      backgroundColor: "#FFFFFF",
                      "--tw-ring-color": "#D0C4E2",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-black/5"
                    style={{ color: "#787878" }}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="text-xs py-1.5 px-3 rounded-lg border"
                  style={{
                    color: "#DC2626",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    borderColor: "rgba(239, 68, 68, 0.3)",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: "#2F3C96" }}
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full rounded-lg py-2 font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  backgroundColor: "#2F3C96",
                  color: "#FFFFFF",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = "#474F97";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(208, 196, 226, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2F3C96";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {loading ? "Signing in..." : "Sign In →"}
              </Button>
            </div>

            <p
              className="text-center text-[11px] mt-3"
              style={{ color: "#787878" }}
            >
              By signing in or using third-party authentication, you agree to
              collabiora's{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80 transition-opacity"
                style={{ color: "#2F3C96" }}
              >
                Terms of Service
              </a>
              , and acknowledge the{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80 transition-opacity"
                style={{ color: "#2F3C96" }}
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80 transition-opacity"
                style={{ color: "#2F3C96" }}
              >
                Cookie Policy
              </a>
              .
            </p>

            <div className="pt-2">
              <p className="text-center text-xs" style={{ color: "#787878" }}>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/onboarding")}
                  className="font-semibold underline hover:opacity-80 transition-opacity"
                  style={{ color: "#2F3C96" }}
                >
                  Create account
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
