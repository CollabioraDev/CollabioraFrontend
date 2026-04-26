import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/index.js'
import './index.css'
import App from './App.jsx'

const clarityId = import.meta.env.VITE_CLARITY_PROJECT_ID
if (clarityId && typeof window !== 'undefined') {
  (function (c, l, a, r, i, t, y) {
    c[a] =
      c[a] ||
      function () {
        ;(c[a].q = c[a].q || []).push(arguments)
      }
    t = l.createElement(r)
    t.async = 1
    t.src = 'https://www.clarity.ms/tag/' + i
    y = l.getElementsByTagName(r)[0]
    y.parentNode.insertBefore(t, y)
  })(window, document, 'clarity', 'script', clarityId)
}
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
