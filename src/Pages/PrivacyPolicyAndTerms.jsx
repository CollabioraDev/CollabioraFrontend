"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { FileText, Shield, List, ChevronDown, Lock, Clock } from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackground";

const PRIVACY_SECTIONS = [
  { id: "privacy-policy", label: "Privacy Policy" },
  { id: "privacy-1", label: "1. Information We Collect" },
  { id: "privacy-2", label: "2. How We Use Information" },
  { id: "privacy-3", label: "3. Consultation Data" },
  { id: "privacy-4", label: "4. Data Security" },
  { id: "privacy-5", label: "5. User Privacy Controls" },
  { id: "privacy-6", label: "6. Legal Compliance" },
  { id: "privacy-7", label: "7. Data Retention" },
];

const TERMS_SECTIONS = [
  { id: "terms", label: "Terms and Conditions" },
  { id: "terms-1", label: "1. Acceptance of Terms" },
  { id: "terms-2", label: "2. Purpose of the Platform" },
  { id: "terms-3", label: "3. No Medical Advice" },
  { id: "terms-4", label: "4. Paid Consultations" },
  { id: "terms-5", label: "5. Researcher Responsibility" },
  { id: "terms-6", label: "6. User Conduct" },
  { id: "terms-7", label: "7. Confidentiality & Privacy" },
  { id: "terms-8", label: "8. Payments & Financial Terms" },
  { id: "terms-9", label: "9. Clinical Trial Information" },
  { id: "terms-10", label: "10. Intellectual Property" },
  { id: "terms-11", label: "11. Limitation of Liability" },
  { id: "terms-12", label: "12. Indemnification" },
  { id: "terms-13", label: "13. Termination" },
];

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function PrivacyPolicyAndTerms() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [privacyDropdownOpen, setPrivacyDropdownOpen] = useState(true);
  const [termsDropdownOpen, setTermsDropdownOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const hash = location.hash?.slice(1);
    const targetId = hash || (location.pathname === "/terms" ? "terms" : location.pathname === "/privacy" ? "privacy-policy" : null);
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [location.pathname, location.hash]);

  const contentStyle = {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "#E5D8F2",
  };
  const headingStyle = { color: "#2F3C96" };
  const bodyClass = "text-[15px] sm:text-base text-gray-700 leading-relaxed";
  const listClass = "list-disc pl-6 space-y-3 text-gray-700";

  const SidebarContent = () => (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
        <List className="w-4 h-4" style={headingStyle} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={headingStyle}>On this page</span>
      </div>
      <div className="space-y-1">
        <div>
          <button
            type="button"
            onClick={() => setPrivacyDropdownOpen((o) => !o)}
            className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#F5F2F8] transition-colors"
            style={{ color: "#2F3C96" }}
          >
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0" />
              Privacy Policy
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${privacyDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {privacyDropdownOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 pl-3 pb-2" style={{ borderColor: "#D0C4E2" }}>
                  {PRIVACY_SECTIONS.slice(1).map(({ id, label }) => (
                    <button key={id} type="button" onClick={() => { scrollToId(id); setSidebarOpen(false); }} className="w-full text-left py-1.5 px-0 text-xs text-[#4B5563] hover:text-[#2F3C96] transition-colors truncate">{label}</button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setTermsDropdownOpen((o) => !o)}
            className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#F5F2F8] transition-colors"
            style={{ color: "#2F3C96" }}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0" />
              Terms and Conditions
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${termsDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {termsDropdownOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 pl-3 pb-2" style={{ borderColor: "#D0C4E2" }}>
                  {TERMS_SECTIONS.slice(1).map(({ id, label }) => (
                    <button key={id} type="button" onClick={() => { scrollToId(id); setSidebarOpen(false); }} className="w-full text-left py-1.5 px-0 text-xs text-[#4B5563] hover:text-[#2F3C96] transition-colors truncate">{label}</button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col">
      <AnimatedBackground isMobile={isMobile} />
      <section className="relative flex-1 px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 z-10">
        <div className="max-w-6xl w-full mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch lg:items-start">
          <aside className={`shrink-0 w-56 lg:w-64 ${isMobile ? "fixed inset-y-0 left-0 z-50 pt-20 pb-6 pl-4 pr-4 overflow-y-auto transform transition-transform duration-200 ease-out " + (sidebarOpen ? "translate-x-0" : "-translate-x-full") : "sticky top-24 self-start"}`}>
            <div className="rounded-xl border p-4 shadow-sm backdrop-blur-sm" style={{ ...contentStyle, borderColor: "#E5D8F2" }}>
              <SidebarContent />
            </div>
          </aside>
          {isMobile && sidebarOpen && (
            <button type="button" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" aria-label="Close menu" />
          )}
          <div className="min-w-0 flex-1 max-w-3xl w-full">
            {/* Simple header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <button type="button" onClick={() => setSidebarOpen(true)} className="flex items-center justify-center w-10 h-10 rounded-lg border shrink-0" style={{ borderColor: "#D0C4E2", color: "#2F3C96" }} aria-label="Open table of contents">
                    <List className="w-5 h-5" />
                  </button>
                )}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                  Privacy Policy & Terms and Conditions
                </h1>
              </div>
            </motion.div>

            <motion.section id="privacy-policy" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mb-12">
              <div className="rounded-2xl border p-6 sm:p-8 shadow-md" style={{ ...contentStyle, borderColor: "#E5D8F2" }}>
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2" style={headingStyle}>
                  <Shield className="w-6 h-6 shrink-0" />
                  Privacy Policy
                </h2>
                <div className="space-y-10">
                  <div id="privacy-1" className="mt-8 first:mt-0">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>1. Information We Collect</h3>
                    <p className={`mb-3 ${bodyClass}`}>We may collect:</p>
                    <ul className={listClass}>
                      <li>Account information (name, email, credentials)</li>
                      <li>Verification documentation for researchers</li>
                      <li>Consultation booking details</li>
                      <li>Payment transaction metadata (processed via third-party providers)</li>
                      <li>User-generated content</li>
                      <li>Usage analytics</li>
                    </ul>
                    <p className={`mt-3 ${bodyClass}`}>We do not require users to share protected health information.</p>
                  </div>
                  <div id="privacy-2" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>2. How We Use Information</h3>
                    <p className={`mb-3 ${bodyClass}`}>We use data to:</p>
                    <ul className={listClass}>
                      <li>Operate the Platform</li>
                      <li>Facilitate consultations</li>
                      <li>Verify researcher credentials</li>
                      <li>Improve services</li>
                      <li>Prevent fraud and misuse</li>
                    </ul>
                    <p className={`mt-3 ${bodyClass}`}>We do not sell personal health data.</p>
                  </div>
                  <div id="privacy-3" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>3. Consultation Data</h3>
                    <p className={`mb-3 ${bodyClass}`}>Consultation scheduling and payment information may be processed by third-party providers.</p>
                    <p className={`mb-2 ${bodyClass}`}>Collabiora:</p>
                    <ul className={listClass}>
                      <li>Does not record consultations.</li>
                      <li>Does not access private consultation discussions except as required for safety or compliance.</li>
                    </ul>
                  </div>
                  <div id="privacy-4" className="mt-8">
                    <h3 className="text-lg font-medium mb-3 flex items-center gap-2" style={headingStyle}>
                      <Lock className="w-5 h-5 shrink-0 opacity-80" />
                      4. Data Security
                    </h3>
                    <p className={bodyClass}>We implement reasonable administrative, technical, and physical safeguards. However, no system can guarantee complete security.</p>
                  </div>
                  <div id="privacy-5" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>5. User Privacy Controls</h3>
                    <p className={`mb-3 ${bodyClass}`}>Users may:</p>
                    <ul className={listClass}>
                      <li>Use pseudonymous handles</li>
                      <li>Control publicly visible information</li>
                      <li>Request account deletion</li>
                    </ul>
                  </div>
                  <div id="privacy-6" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>6. Legal Compliance</h3>
                    <p className={`mb-3 ${bodyClass}`}>Users and researchers are responsible for complying with:</p>
                    <ul className={listClass}>
                      <li>HIPAA (if applicable)</li>
                      <li>State medical licensing laws</li>
                      <li>International privacy regulations (e.g., GDPR where applicable)</li>
                    </ul>
                    <p className={`mt-3 ${bodyClass}`}>Collabiora is not responsible for individual regulatory compliance failures by users.</p>
                  </div>
                  <div id="privacy-7" className="mt-8">
                    <h3 className="text-lg font-medium mb-3 flex items-center gap-2" style={headingStyle}>
                      <Clock className="w-5 h-5 shrink-0 opacity-80" />
                      7. Data Retention
                    </h3>
                    <p className={bodyClass}>Data is retained as necessary for:</p>
                    <ul className={`${listClass} mt-2`}>
                      <li>Platform functionality</li>
                      <li>Legal compliance</li>
                      <li>Fraud prevention</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section id="terms" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
              <div className="rounded-2xl border p-6 sm:p-8 shadow-md" style={{ ...contentStyle, borderColor: "#E5D8F2" }}>
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2" style={headingStyle}>
                  <FileText className="w-6 h-6 shrink-0" />
                  Terms and Conditions
                </h2>
                <div className="space-y-10">
                  <div id="terms-1" className="mt-8 first:mt-0">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>1. Acceptance of Terms</h3>
                    <p className={bodyClass}>By accessing or using Collabiora (“the Platform”), you agree to these Terms and Conditions. If you do not agree, you may not use the Platform.</p>
                  </div>
                  <div id="terms-2" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>2. Purpose of the Platform</h3>
                    <p className={`mb-3 ${bodyClass}`}>Collabiora is an educational and research-focused platform designed to:</p>
                    <ul className={listClass}>
                      <li>Improve medical literacy</li>
                      <li>Translate peer-reviewed research into accessible insights</li>
                      <li>Facilitate discussion between patients and researchers</li>
                      <li>Provide awareness of clinical trials</li>
                      <li>Enable paid educational consultations between users and verified researchers</li>
                    </ul>
                    <p className={`mt-3 ${bodyClass}`}>Collabiora is not a healthcare provider.</p>
                  </div>
                  <div id="terms-3" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>3. No Medical Advice / No Physician-Patient Relationship</h3>
                    <ul className={listClass}>
                      <li>The Platform provides educational information only.</li>
                      <li>Consultations conducted through Collabiora are for informational and research-related discussion purposes.</li>
                      <li>These consultations do not constitute medical diagnosis, treatment, or clinical care.</li>
                      <li>Use of the Platform does not create a physician-patient relationship.</li>
                      <li>Researchers participating in consultations act independently and are not agents of Collabiora.</li>
                      <li>Users should seek medical advice from licensed healthcare professionals for personal medical decisions.</li>
                    </ul>
                  </div>
                  <div id="terms-4" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>4. Paid Consultations</h3>
                    <ul className={listClass}>
                      <li>Collabiora may allow verified researchers to offer paid consultations.</li>
                      <li>Researchers set their own consultation fees.</li>
                      <li>Payments are made directly to the researcher or processed through the Platform as a facilitation service.</li>
                      <li>Collabiora does not control, supervise, or direct consultation content.</li>
                      <li>Collabiora does not guarantee outcomes, accuracy, or clinical applicability of consultation discussions.</li>
                      <li>Users acknowledge that consultations are educational in nature and not a substitute for medical care.</li>
                    </ul>
                  </div>
                  <div id="terms-5" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>5. Researcher Responsibility</h3>
                    <p className={`mb-3 ${bodyClass}`}>Researchers agree:</p>
                    <ul className={listClass}>
                      <li>To accurately represent their credentials</li>
                      <li>Not to provide individualized medical diagnosis or treatment</li>
                      <li>To comply with applicable licensing and regulatory laws</li>
                      <li>To avoid establishing a physician-patient relationship through the Platform</li>
                    </ul>
                    <p className={`mt-3 ${bodyClass}`}>Collabiora reserves the right to suspend or remove researchers who violate these policies.</p>
                  </div>
                  <div id="terms-6" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>6. User Conduct</h3>
                    <p className={`mb-3 ${bodyClass}`}>Users agree not to:</p>
                    <ul className={listClass}>
                      <li>Share false or misleading medical information</li>
                      <li>Provide medical advice without proper licensure and verification</li>
                      <li>Plagiarize or post copyrighted content without permission</li>
                      <li>Impersonate another individual</li>
                      <li>Upload protected health information without authorization</li>
                    </ul>
                    <p className={`mt-3 ${bodyClass}`}>Violations may result in:</p>
                    <ul className={listClass}>
                      <li>Content removal</li>
                      <li>Account suspension or termination</li>
                      <li>Referral to appropriate authorities</li>
                      <li>Legal action where applicable</li>
                    </ul>
                  </div>
                  <div id="terms-7" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>7. Confidentiality & Privacy</h3>
                    <ul className={listClass}>
                      <li>Users are responsible for the information they choose to share.</li>
                      <li>The Platform allows pseudonymous handles to enhance privacy.</li>
                      <li>Users should avoid posting identifiable medical information publicly.</li>
                      <li>Researchers must comply with applicable privacy laws when interacting with users.</li>
                      <li>Collabiora implements reasonable safeguards but cannot guarantee absolute confidentiality of information shared voluntarily by users.</li>
                    </ul>
                  </div>
                  <div id="terms-8" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>8. Payments & Financial Terms</h3>
                    <p className={`mb-3 ${bodyClass}`}>If the Platform processes payments:</p>
                    <ul className={listClass}>
                      <li>Collabiora may use third-party payment processors.</li>
                      <li>Users agree to the terms of those processors.</li>
                      <li>Refund policies (if applicable) will be defined separately.</li>
                      <li>Collabiora is not responsible for disputes arising from consultation content.</li>
                    </ul>
                  </div>
                  <div id="terms-9" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>9. Clinical Trial Information</h3>
                    <p className={`mb-3 ${bodyClass}`}>Clinical trial listings are for informational purposes only. Collabiora:</p>
                    <ul className={listClass}>
                      <li>Does not sponsor trials</li>
                      <li>Does not determine eligibility</li>
                      <li>Is not responsible for trial outcomes</li>
                    </ul>
                  </div>
                  <div id="terms-10" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>10. Intellectual Property</h3>
                    <p className={`mb-3 ${bodyClass}`}>Users may not:</p>
                    <ul className={listClass}>
                      <li>Reproduce Platform materials without permission</li>
                      <li>Copy research summaries for commercial use</li>
                      <li>Post plagiarized material</li>
                    </ul>
                    <p className={`mt-3 ${bodyClass}`}>Proper citation of peer-reviewed sources is required.</p>
                  </div>
                  <div id="terms-11" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>11. Limitation of Liability</h3>
                    <p className={`mb-3 ${bodyClass}`}>To the fullest extent permitted by law:</p>
                    <ul className={listClass}>
                      <li>Collabiora is not liable for health decisions made based on Platform content.</li>
                      <li>Collabiora is not liable for actions or statements made by researchers.</li>
                      <li>Collabiora does not guarantee the accuracy of user-generated content.</li>
                      <li>Users assume all risk associated with using the Platform.</li>
                    </ul>
                  </div>
                  <div id="terms-12" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>12. Indemnification</h3>
                    <p className={bodyClass}>Users agree to indemnify and hold harmless Collabiora from claims arising from: misuse of the Platform; violation of these Terms; improper medical advice or misconduct.</p>
                  </div>
                  <div id="terms-13" className="mt-8">
                    <h3 className="text-lg font-medium mb-3" style={headingStyle}>13. Termination</h3>
                    <p className={bodyClass}>Collabiora may suspend or terminate accounts at its discretion for policy violations.</p>
                  </div>
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </section>
    </div>
  );
}
