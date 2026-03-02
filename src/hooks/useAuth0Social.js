import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

/**
 * Custom hook for Auth0 social login
 * Provides methods to login with Google, Microsoft (Outlook), Facebook, and Apple
 */
export function useAuth0Social() {
  const auth0 = useAuth0();

  // Check if Auth0 is configured
  const isConfigured =
    !!import.meta.env.VITE_AUTH0_DOMAIN &&
    !!import.meta.env.VITE_AUTH0_CLIENT_ID;

  /**
   * Login with Google
   * @param {Object} options - Optional settings
   * @param {string} options.returnTo - URL to redirect after login
   * @param {Object} options.onboardingData - Data to pass through (role, conditions, etc.)
   */
  const loginWithGoogle = useCallback(
    async (options = {}) => {
      if (!isConfigured) {
        console.error(
          "[Auth0] Not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID"
        );
        return;
      }

      // Store onboarding data for after OAuth callback
      if (options.onboardingData) {
        localStorage.setItem(
          "auth0_pending_onboarding",
          JSON.stringify(options.onboardingData)
        );
      }

      try {
        await auth0.loginWithRedirect({
          authorizationParams: {
            connection: "google-oauth2",
            screen_hint: options.screenHint || "signup",
          },
          appState: {
            returnTo: options.returnTo || "/auth/callback",
          },
        });
      } catch (error) {
        console.error("[Auth0] Google login error:", error);
        throw error;
      }
    },
    [auth0, isConfigured]
  );

  /**
   * Login with Microsoft (Outlook)
   * @param {Object} options - Optional settings
   * @param {string} options.returnTo - URL to redirect after login
   * @param {Object} options.onboardingData - Data to pass through (role, conditions, etc.)
   */
  const loginWithMicrosoft = useCallback(
    async (options = {}) => {
      if (!isConfigured) {
        console.error(
          "[Auth0] Not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID"
        );
        return;
      }

      // Store onboarding data for after OAuth callback
      if (options.onboardingData) {
        localStorage.setItem(
          "auth0_pending_onboarding",
          JSON.stringify(options.onboardingData)
        );
      }

      try {
        // The connection name must match exactly what's configured in your Auth0 dashboard
        // Common names: "windowslive" (personal accounts), "microsoft-azure-ad" (work/school)
        // Check your Auth0 dashboard > Authentication > Social > Microsoft to see the exact name
        const connectionName = "windowslive"; // Change this if your Auth0 connection uses a different name

        await auth0.loginWithRedirect({
          authorizationParams: {
            connection: connectionName,
            screen_hint: options.screenHint || "signup",
          },
          appState: {
            returnTo: options.returnTo || "/auth/callback",
          },
        });
      } catch (error) {
        console.error("[Auth0] Microsoft login error:", error);
        console.error(
          "[Auth0] TROUBLESHOOTING: If Microsoft OAuth URL shows empty client_id:",
          "\n1. Go to Auth0 Dashboard > Authentication > Social",
          "\n2. Find your Microsoft connection (windowslive, microsoft-azure-ad, etc.)",
          "\n3. Ensure it has a Microsoft Azure AD Application Client ID configured",
          "\n4. Ensure the Client Secret is set",
          "\n5. Verify the Redirect URI in Azure AD matches:",
          `\n   https://${import.meta.env.VITE_AUTH0_DOMAIN}/login/callback`,
          "\n6. The connection name in code must match the connection name in Auth0 dashboard"
        );
        throw error;
      }
    },
    [auth0, isConfigured]
  );

  /**
   * Login with Facebook
   * @param {Object} options - Optional settings
   * @param {string} options.returnTo - URL to redirect after login
   * @param {Object} options.onboardingData - Data to pass through (role, conditions, etc.)
   */
  const loginWithFacebook = useCallback(
    async (options = {}) => {
      if (!isConfigured) {
        console.error(
          "[Auth0] Not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID"
        );
        return;
      }

      // Store onboarding data for after OAuth callback
      if (options.onboardingData) {
        localStorage.setItem(
          "auth0_pending_onboarding",
          JSON.stringify(options.onboardingData)
        );
      }

      try {
        await auth0.loginWithRedirect({
          authorizationParams: {
            connection: "facebook",
            screen_hint: options.screenHint || "signup",
          },
          appState: {
            returnTo: options.returnTo || "/auth/callback",
          },
        });
      } catch (error) {
        console.error("[Auth0] Facebook login error:", error);
        throw error;
      }
    },
    [auth0, isConfigured]
  );

  /**
   * Login with Apple
   * @param {Object} options - Optional settings
   */
  const loginWithApple = useCallback(
    async (options = {}) => {
      if (!isConfigured) {
        console.error(
          "[Auth0] Not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID"
        );
        return;
      }

      // Store onboarding data for after OAuth callback
      if (options.onboardingData) {
        localStorage.setItem(
          "auth0_pending_onboarding",
          JSON.stringify(options.onboardingData)
        );
      }

      try {
        await auth0.loginWithRedirect({
          authorizationParams: {
            connection: "apple",
            screen_hint: options.screenHint || "signup",
          },
          appState: {
            returnTo: options.returnTo || "/auth/callback",
          },
        });
      } catch (error) {
        console.error("[Auth0] Apple login error:", error);
        throw error;
      }
    },
    [auth0, isConfigured]
  );

  /**
   * Logout from Auth0
   */
  const logout = useCallback(() => {
    if (!isConfigured) return;

    // Clear local storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("auth0_pending_onboarding");

    // Logout from Auth0
    auth0.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0, isConfigured]);

  return {
    loginWithGoogle,
    loginWithMicrosoft,
    loginWithFacebook,
    loginWithApple,
    logout,
    isAuthenticated: auth0.isAuthenticated,
    isLoading: auth0.isLoading,
    user: auth0.user,
    isConfigured,
  };
}

export default useAuth0Social;
