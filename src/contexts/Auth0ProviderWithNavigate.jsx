import React from "react";
import { Auth0Provider } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";

/**
 * Auth0 Provider that wraps the application and handles authentication
 *
 * Required Environment Variables:
 * - VITE_AUTH0_DOMAIN: Your Auth0 domain (e.g., dev-xxxxx.us.auth0.com)
 * - VITE_AUTH0_CLIENT_ID: Your Auth0 application client ID
 * - VITE_AUTH0_AUDIENCE: (Optional) API audience for access tokens
 */
export default function Auth0ProviderWithNavigate({ children }) {
  const navigate = useNavigate();

  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  // Callback after Auth0 redirects back
  const onRedirectCallback = (appState) => {
    // Navigate to the intended destination or default to home
    navigate(appState?.returnTo || "/");
  };

  // If Auth0 is not configured, render children without Auth0 (graceful fallback)
  if (!domain || !clientId) {
    console.warn(
      "[Auth0] Missing VITE_AUTH0_DOMAIN or VITE_AUTH0_CLIENT_ID. Social login will be disabled."
    );
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/auth/callback`,
        ...(audience && { audience }),
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
