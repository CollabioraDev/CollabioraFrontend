import React from "react";
import PrefetchLink from "./PrefetchLink.jsx";
import {
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Youtube,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative w-full bg-transparent border-t-2 pt-12 pb-8" style={{ borderColor: "#D0C4E2" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/logo1.png"
                alt="Collabiora Logo"
                className="h-6 w-auto"
              />
              <span
                className="text-lg font-bold tracking-tight"
                style={{ color: "#2F3C96" }}
              >
                Collabiora
              </span>
            </div>
            <p
              className="text-sm font-semibold mb-2"
              style={{ color: "#2F3C96" }}
            >
              Empower Your
              <br />
              Health Decisions
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#787878" }}>
              Making health research transparent, ethical, and accessible to everyone. Join the movement to humanize science.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3
              className="text-sm font-bold mb-4"
              style={{ color: "#2F3C96" }}
            >
              Quick Links
            </h3>
            <ul className="space-y-2">
              {["About Us", "How it Works", "Explore", "News"].map((link) => {
                const routeMap = {
                  "About Us": "/about",
                  "How it Works": "/how-it-works",
                  Explore: "/explore",
                  // News should go to Discovery page
                  News: "/discovery",
                };
                const route =
                  routeMap[link] ||
                  `/${link.toLowerCase().replace(/\s+/g, "-")}`;

                return (
                  <li key={link}>
                    <PrefetchLink
                      to={route}
                      className="text-xs transition-colors duration-200 block"
                      style={{ color: "#787878" }}
                      onMouseEnter={(e) => (e.target.style.color = "#2F3C96")}
                      onMouseLeave={(e) => (e.target.style.color = "#787878")}
                    >
                      {link}
                    </PrefetchLink>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3
              className="text-sm font-bold mb-4"
              style={{ color: "#2F3C96" }}
            >
              Resources
            </h3>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact Us", "FAQ"].map((link) => {
                const routeMap = {
                  "Privacy Policy": "/privacy",
                  "Terms of Service": "/terms",
                  "Cookie Policy": "/cookie-policy",
                  "Contact Us": "/contact",
                  FAQ: "/faq",
                };
                const route = routeMap[link] || `/${link.toLowerCase().replace(/\s+/g, "-")}`;
                
                return (
                  <li key={link}>
                    <PrefetchLink
                      to={route}
                      className="text-xs transition-colors duration-200 block"
                      style={{ color: "#787878" }}
                      onMouseEnter={(e) => (e.target.style.color = "#2F3C96")}
                      onMouseLeave={(e) => (e.target.style.color = "#787878")}
                    >
                      {link}
                    </PrefetchLink>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3
              className="text-sm font-bold mb-4"
              style={{ color: "#2F3C96" }}
            >
              Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:info@collabiora.com"
                  className="flex items-center gap-2 text-xs transition-colors duration-200"
                  style={{ color: "#787878" }}
                  onMouseEnter={(e) => (e.target.style.color = "#2F3C96")}
                  onMouseLeave={(e) => (e.target.style.color = "#787878")}
                >
                  <Mail className="w-4 h-4" />
                  info@collabiora.com
                </a>
              </li>
              <li>
                <div className="flex items-center gap-2 text-xs" style={{ color: "#787878" }}>
                  <MapPin className="w-4 h-4" />
                  Los Angeles, CA
                </div>
              </li>
            </ul>

            {/* Social Media Icons */}
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://www.linkedin.com/company/collabiora"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: "#787878" }}
                onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
                onMouseLeave={(e) => (e.target.style.color = "#787878")}
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/drscollaborate/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: "#787878" }}
                onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
                onMouseLeave={(e) => (e.target.style.color = "#787878")}
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.tiktok.com/@collabiora"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: "#787878" }}
                onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
                onMouseLeave={(e) => (e.target.style.color = "#787878")}
                aria-label="TikTok"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@collabiora"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: "#787878" }}
                onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
                onMouseLeave={(e) => (e.target.style.color = "#787878")}
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t-2 pt-6" style={{ borderColor: "#D0C4E2" }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="flex items-center gap-0.5 text-xs" style={{ color: "#787878" }}>
              <span>© {new Date().getFullYear()}</span>
              <div className="flex items-center ">
                <span
                  className="font-semibold"
                  style={{ color: "#2F3C96" }}
                >
                  collabiora
                </span>
              </div>
              <span>. All rights reserved.</span>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}
