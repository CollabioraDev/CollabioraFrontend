import React, { useEffect } from "react";

/**
 * Captures the PWA install prompt (beforeinstallprompt) and stores it globally
 * so the Landing page can trigger it when the user taps "Add to Home Screen".
 * Renders nothing — no popup. Install UI is only on the Landing page as a button.
 */
export default function PWAInstallPrompt() {
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      window.__deferredPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return null;
}
