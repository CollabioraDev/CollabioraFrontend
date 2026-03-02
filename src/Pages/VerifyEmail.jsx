import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { broadcastEmailVerified } from "../utils/crossTabSync.js";

const logoUrl = import.meta.env.VITE_LOGO_URL || "https://res.cloudinary.com/dtgmjvfms/image/upload/logo_mh2rpv.png";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("idle"); // idle, verifying, success, error
  const [message, setMessage] = useState("");
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      handleVerifyEmail(token);
    } else {
      // No token, show idle state
      setStatus("idle");
    }
  }, [searchParams]);

  const handleVerifyEmail = async (token) => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    setStatus("verifying");
    setMessage("");

    // Add minimum delay to show loading state (at least 1.5 seconds)
    const minDelay = new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const decodedToken = decodeURIComponent(token);
      
      // Make the API call
      const fetchPromise = fetch(`${base}/api/auth/verify-email?token=${decodedToken}`);
      
      // Wait for both the API call and minimum delay
      const [response] = await Promise.all([fetchPromise, minDelay]);
      
      // Get response text first to check if it's valid JSON
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response:", parseError, responseText);
        setStatus("error");
        setMessage("Invalid response from server. Please try again.");
        return;
      }
      
      // Check if response is ok
      if (!response.ok) {
        // Handle different error cases
        if (data.code === "EXPIRED_TOKEN") {
          setStatus("error");
          setMessage(data.error || "This verification link has expired. Please request a new verification email.");
        } else if (data.code === "INVALID_TOKEN") {
          setStatus("error");
          setMessage(data.error || "Invalid verification token. Please request a new verification email.");
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to verify email. The link may be invalid or expired.");
        }
        return;
      }

      // Check if email is already verified
      if (data.alreadyVerified) {
        setStatus("success");
        setMessage(data.message || "Your email is already verified.");
        
        // Update user in localStorage if user is logged in
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        if (userData._id || userData.id) {
          userData.emailVerified = true;
          localStorage.setItem("user", JSON.stringify(userData));
          
          // Dispatch event to update user state
          window.dispatchEvent(new Event("login"));
          
          // Broadcast to all tabs (cross-tab sync)
          broadcastEmailVerified(userData);
        }
        return;
      }

      // Success - email is verified on the backend
      setStatus("success");
      setMessage(data.message || "Email verified successfully!");

      // Update user in localStorage if user is logged in
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (userData._id || userData.id) {
        userData.emailVerified = true;
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Dispatch event to update user state
        window.dispatchEvent(new Event("login"));
        
        // Broadcast to all tabs (cross-tab sync)
        broadcastEmailVerified(userData);
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("error");
      setMessage("An error occurred while verifying your email. Please try again.");
    }
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#D0C4E2] via-[#E8E0EF] to-[#F5F0FA] px-4 py-8">
      {/* Logo */}
      <div className="mb-8">
        <img 
          src={logoUrl} 
          alt="Collabiora Logo" 
          className="h-16 w-auto"
        />
      </div>

      {/* Main Content Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {status === "idle" && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
              >
                <Mail className="w-10 h-10" style={{ color: "#2F3C96" }} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#2F3C96" }}>
                Email Verification
              </h1>
              <p className="text-gray-600">
                Please check your email and click the verification link to verify your email address.
              </p>
            </div>
          </div>
        )}

        {status === "verifying" && (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center">
              <Loader2 className="w-20 h-20 text-[#2F3C96] animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#2F3C96" }}>
                Verifying Your Email
              </h1>
              <p className="text-gray-600">
                Please wait while we verify your email address...
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="text-center space-y-6 py-4">
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
              >
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#2F3C96" }}>
                Email Verified!
              </h1>
              <p className="text-gray-600 mb-4">
                {message || "Your email has been successfully verified."}
              </p>
              <p className="text-gray-600 text-sm">
                You can now go back to your health research journey.
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="text-center space-y-6 py-4">
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
              >
                <XCircle className="w-16 h-16 text-red-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#2F3C96" }}>
                Verification Failed
              </h1>
              <p className="text-gray-600 mb-4">
                {message || "Failed to verify your email. The link may be invalid or expired."}
              </p>
              <p className="text-sm text-gray-500">
                Please request a new verification email from your dashboard.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Text */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          © {new Date().getFullYear()} Collabiora. All rights reserved.
        </p>
      </div>
    </div>
  );
}
