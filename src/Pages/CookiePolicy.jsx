"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import Footer from "../components/Footer";

const contentStyle = {
  backgroundColor: "rgba(255,255,255,0.92)",
  borderColor: "#E5D8F2",
};
const headingStyle = { color: "#2F3C96" };
const bodyClass = "text-[15px] sm:text-base text-gray-700 leading-relaxed";

export default function CookiePolicy() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const openConsentPreferences = () => {
    if (typeof window !== "undefined" && window.CookieYes) {
      window.CookieYes.open();
    } else {
      document.querySelector(".cky-consent-bar")?.classList.add("cky-show");
      const wrapper = document.querySelector(".cky-wrapper");
      if (wrapper) wrapper.style.display = "block";
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <style>{`
        a.cky-banner-element,
        button.cky-banner-element {
          padding: 8px 30px;
          background: #f8f9fa;
          color: #858a8f;
          border: 1px solid #dee2e6;
          box-sizing: border-box;
          border-radius: 2px;
          cursor: pointer;
          display: inline-block;
          font-size: 14px;
          text-decoration: none;
          transition: background 0.2s, color 0.2s;
        }
        a.cky-banner-element:hover,
        button.cky-banner-element:hover {
          background: #e9ecef;
          color: #495057;
        }
        .cookie-policy-h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }
        .cookie-policy-date-container {
          margin-bottom: 1.5rem;
        }
        .cookie-policy-date-container p {
          margin: 0.25rem 0;
          font-size: 0.875rem;
          color: #6b7280;
        }
        .cookie-policy-p {
          margin-bottom: 1rem;
        }
        .cookie-policy-p p {
          margin-bottom: 0.75rem;
        }
        .cky-audit-table-element {
          min-height: 1px;
          margin-bottom: 1.5rem;
        }
      `}</style>
      <AnimatedBackground isMobile={isMobile} />
      <section className="relative flex-1 px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 z-10">
        <div className="max-w-3xl w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border p-6 sm:p-8 shadow-md"
            style={{ ...contentStyle, borderColor: "#E5D8F2" }}
          >
            <h1 className="cookie-policy-h1">Cookie Policy</h1>
            <div className="cookie-policy-date-container">
              <p>Effective date: February 16, 2026</p>
              <p>Last updated: February 16, 2026</p>
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-4" style={headingStyle}>
              What are cookies?
            </h2>
            <div className={`cookie-policy-p ${bodyClass}`}>
              <p>
                Cookies are small text files used to store small pieces of information. They are stored on your device when a website loads in your browser. These cookies help ensure that the website functions properly, enhance security, provide a better user experience, and analyse performance to identify what works and where improvements are needed.
              </p>
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-4" style={headingStyle}>
              How do we use cookies?
            </h2>
            <div className={`cookie-policy-p ${bodyClass}`}>
              <p>
                Like most online services, our website uses both first-party and third-party cookies for various purposes. First-party cookies are primarily necessary for the website to function properly and do not collect any personally identifiable data.
              </p>
              <p>
                The third-party cookies used on our website primarily help us understand how the website performs, track how you interact with it, keep our services secure, deliver relevant advertisements, and enhance your overall user experience while improving the speed of your future interactions with our website.
              </p>
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-4" style={headingStyle}>
              Types of cookies we use
            </h2>
            <div className="cky-audit-table-element" />

            <h2 className="text-xl font-semibold mt-8 mb-5" style={headingStyle}>
              Manage cookie preferences
            </h2>
            <button
              type="button"
              className="cky-banner-element"
              onClick={openConsentPreferences}
            >
              Consent Preferences
            </button>
            <br />
            <div className={`mt-4 ${bodyClass}`}>
              <p>
                You can modify your cookie settings anytime by clicking the &apos;Consent Preferences&apos; button above. This will allow you to revisit the cookie consent banner and update your preferences or withdraw your consent immediately.
              </p>
              <p>
                Additionally, different browsers offer various methods to block and delete cookies used by websites. You can adjust your browser settings to block or delete cookies. Below are links to support documents on how to manage and delete cookies in major web browsers.
              </p>
              <p>
                Chrome:{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://support.google.com/accounts/answer/32050"
                  className="underline hover:no-underline"
                  style={{ color: "#2F3C96" }}
                >
                  https://support.google.com/accounts/answer/32050
                </a>
              </p>
              <p>
                Safari:{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://support.apple.com/en-in/guide/safari/sfri11471/mac"
                  className="underline hover:no-underline"
                  style={{ color: "#2F3C96" }}
                >
                  https://support.apple.com/en-in/guide/safari/sfri11471/mac
                </a>
              </p>
              <p>
                Firefox:{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox?redirectslug=delete-cookies-remove-info-websites-stored&redirectlocale=en-US"
                  className="underline hover:no-underline"
                  style={{ color: "#2F3C96" }}
                >
                  https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox
                </a>
              </p>
              <p>
                Internet Explorer:{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://support.microsoft.com/en-us/topic/how-to-delete-cookie-files-in-internet-explorer-bca9446f-d873-78de-77ba-d42645fa52fc"
                  className="underline hover:no-underline"
                  style={{ color: "#2F3C96" }}
                >
                  https://support.microsoft.com/en-us/topic/how-to-delete-cookie-files-in-internet-explorer-bca9446f-d873-78de-77ba-d42645fa52fc
                </a>
              </p>
              <p>
                If you are using a different web browser, please refer to its official support documentation.
              </p>
            </div>

            <p className={`cookie-policy-p mt-8 ${bodyClass}`}>
              Cookie Policy generated by{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.cookieyes.com/?utm_source=CP&utm_medium=footer&utm_campaign=UW"
                className="underline hover:no-underline"
                style={{ color: "#2F3C96" }}
              >
                CookieYes - Cookie Policy Generator
              </a>
            </p>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
