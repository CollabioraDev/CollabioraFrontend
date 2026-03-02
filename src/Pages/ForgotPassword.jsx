import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send reset email");
        setLoading(false);
        return;
      }

      // Always show success (security: prevent email enumeration)
      setSuccess(true);
      toast.success("If this email exists, we've sent a reset link.");
    } catch (e) {
      console.error("Forgot password error:", e);
      // Still show success to prevent email enumeration
      setSuccess(true);
      toast.success("If this email exists, we've sent a reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackgroundDiff />

        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <div
            className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border p-5 sm:p-6 space-y-4 transition-all duration-300"
            style={{
              borderColor: "#D0C4E2",
              boxShadow: "0 20px 60px rgba(208, 196, 226, 0.25)",
              backgroundColor: "rgba(255, 255, 255, 0.98)",
            }}
          >
            {/* Back Button */}
            <button
              onClick={() => navigate("/signin")}
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "#2F3C96" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </button>

            {/* Header */}
            <div className="text-center space-y-1.5">
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: "#2F3C96" }}
              >
                Forgot Password?
              </h1>
              <p className="text-xs font-medium" style={{ color: "#787878" }}>
                {success
                  ? "Check your email for reset instructions"
                  : "Enter your email to receive a reset link"}
              </p>
            </div>

            {!success ? (
              <>
                {/* Form */}
                <div className="space-y-3">
                  <div>
                    <label
                      className="text-xs font-semibold mb-1.5 block"
                      style={{ color: "#2F3C96" }}
                    >
                      Email
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: "#787878" }}
                      />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleForgotPassword()
                        }
                        className="w-full py-2 pl-10 pr-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          backgroundColor: "#FFFFFF",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className="text-xs py-2 px-3 rounded-lg border"
                    style={{
                      color: "#666",
                      backgroundColor: "rgba(208, 196, 226, 0.1)",
                      borderColor: "#D0C4E2",
                    }}
                  >
                    <p>
                      If this email exists, we'll send you a password reset
                      link that expires in 15 minutes.
                    </p>
                  </div>

                  <Button
                    onClick={handleForgotPassword}
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
                    {loading ? "Sending..." : "Send Reset Link →"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                  >
                    <CheckCircle2
                      className="w-8 h-8"
                      style={{ color: "#10b981" }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: "#2F3C96" }}
                  >
                    Check your email
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: "#787878" }}
                  >
                    We've sent a password reset link to{" "}
                    <span className="font-medium">{email}</span>. The link will
                    expire in 15 minutes.
                  </p>
                  <p
                    className="text-xs mt-4"
                    style={{ color: "#787878" }}
                  >
                    Didn't receive the email? Check your spam folder or{" "}
                    <button
                      onClick={() => {
                        setSuccess(false);
                        setEmail("");
                      }}
                      className="font-medium underline"
                      style={{ color: "#2F3C96" }}
                    >
                      try again
                    </button>
                    .
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
