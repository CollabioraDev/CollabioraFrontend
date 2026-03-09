import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function OrcidCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        setError("ORCID authentication was cancelled or failed");
        setTimeout(() => {
          navigate("/onboarding");
        }, 3000);
        return;
      }

      if (!code) {
        setError("No authorization code received");
        setTimeout(() => {
          navigate("/onboarding");
        }, 3000);
        return;
      }

      try {
        // Exchange code for ORCID ID
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/orcid/callback`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code, state }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to complete ORCID authentication");
        }

        const data = await response.json();
        const { orcid, profile } = data;

        // Store ORCID data in localStorage
        const orcidData = {
          orcid,
          profile: profile || null,
        };

        localStorage.setItem("orcid_data", JSON.stringify(orcidData));

        // Redirect back to onboarding with ORCID data
        navigate("/onboarding?orcid_success=true");
      } catch (err) {
        console.error("Error exchanging ORCID code:", err);
        setError(err.message || "Failed to complete ORCID authentication");
        setTimeout(() => {
          navigate("/onboarding");
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Redirecting you back to onboarding...
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg
                className="w-8 h-8 text-purple-600 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Connecting to ORCID
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your ORCID credentials...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
