import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Loader2, Mail, AlertCircle } from "lucide-react";
import Modal from "./ui/Modal.jsx";
import { broadcastEmailVerified } from "../utils/crossTabSync.js";

export default function VerifyEmailModal({ isOpen, onClose, onVerified }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState("idle"); // idle, verifying, success, error
  const [message, setMessage] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Check for email sent status from backend and token in URL when modal opens
  useEffect(() => {
    if (isOpen) {
      const authToken = localStorage.getItem("token");
      
      // Reset emailSent state first
      setEmailSent(false);
      
      // Check backend for email sent status
      const checkEmailStatus = async () => {
        if (!authToken) return;
        
        try {
          const response = await fetch(`${base}/api/auth/check-email-status`, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.emailSent) {
              setEmailSent(true);
            }
          }
        } catch (error) {
          console.error("Error checking email status:", error);
        }
      };

      // Check backend status
      checkEmailStatus();

      const urlToken = searchParams.get("token");
      if (urlToken) {
        setVerificationToken(urlToken);
        handleVerifyEmail(urlToken);
      } else {
        // Reset status to idle if no token
        setStatus("idle");
      }
    } else {
      // Reset states when modal closes
      setStatus("idle");
      setVerificationToken("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, searchParams]);

  const handleVerifyEmail = async (token) => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    setStatus("verifying");
    setMessage("");

    try {
      // Decode the token in case it's URL encoded
      const decodedToken = decodeURIComponent(token);
      const response = await fetch(`${base}/api/auth/verify-email?token=${decodedToken}`);
      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");

        // Update user in localStorage
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        if (userData._id || userData.id) {
          userData.emailVerified = true;
          localStorage.setItem("user", JSON.stringify(userData));
          
          // Dispatch event to update user state in same tab
          window.dispatchEvent(new Event("login"));
          
          // Broadcast to all tabs (cross-tab sync)
          broadcastEmailVerified(userData);

          // Clear email sent flag from localStorage
          const userId = userData._id || userData.id;
          if (userId) {
            const emailSentKey = `verification_email_sent_${userId}`;
            localStorage.removeItem(emailSentKey);
          }
        }

        // Call onVerified callback
        if (onVerified) {
          onVerified();
        }

        // Clear token from URL
        setSearchParams({});
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to verify email. The link may be invalid or expired.");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("error");
      setMessage("An error occurred while verifying your email");
    }
  };

  const handleSendVerificationEmail = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please sign in to verify your email");
      return;
    }

    try {
      const response = await fetch(`${base}/api/auth/send-verification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Mark email as sent in localStorage
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = userData._id || userData.id;
        if (userId) {
          const emailSentKey = `verification_email_sent_${userId}`;
          localStorage.setItem(emailSentKey, Date.now().toString());
        }
        
        setEmailSent(true);
        toast.success("Verification email sent! Please check your inbox and spam folder.");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to send verification email");
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      setStatus("error");
      setMessage("Failed to send verification email. Please try again.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email Verification">
      <div className="space-y-6">
        {status === "idle" && (
          <>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
                >
                  <Mail className="w-8 h-8" style={{ color: "#2F3C96" }} />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
                {emailSent ? "Verification Email Already Sent" : "Verify Your Email Address"}
              </h3>
              {emailSent ? (
                <>
                  <p className="text-gray-600 mb-4">
                    We've already sent a verification email to your inbox. Please check your email and click the verification link.
                  </p>
                </>
              ) : (
                <p className="text-gray-600 mb-6">
                  Click the button below to send a verification email to your inbox.
                </p>
              )}
              <button
                onClick={handleSendVerificationEmail}
                className="px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:scale-105"
                style={{ backgroundColor: "#2F3C96" }}
              >
                {emailSent ? "Resend Verification Email" : "Send Verification Email"}
              </button>
            </div>
            {emailSent && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Don't see the email?</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Check your spam or junk folder</li>
                      <li>Wait a few minutes and refresh your inbox</li>
                      <li>Make sure you're checking the correct email address</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {status === "verifying" && (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <Loader2 className="w-16 h-16 text-[#2F3C96] animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
              Verifying Your Email
            </h3>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
              >
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
              Email Verified!
            </h3>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:scale-105"
              style={{ backgroundColor: "#2F3C96" }}
            >
              Close
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
              >
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
              Verification Failed
            </h3>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStatus("idle")}
                className="px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:scale-105"
                style={{ backgroundColor: "#2F3C96" }}
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl border font-semibold transition-all hover:scale-105"
                style={{
                  borderColor: "#2F3C96",
                  color: "#2F3C96",
                  backgroundColor: "transparent",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

