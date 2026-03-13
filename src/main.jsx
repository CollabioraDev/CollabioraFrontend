import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import LogRocket from 'logrocket';

LogRocket.init('fuvonk/collabiora');

// Register Service Worker (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Capture Chrome's install event for "Add to Home Screen"
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.__deferredPrompt = e;
  window.dispatchEvent(new CustomEvent("pwa-install-available"));
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
