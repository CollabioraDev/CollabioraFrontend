 "use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import Footer from "../components/Footer";

const faqs = [
  {
    question: "What is collabiora?",
    answer:
      "collabiora is a social research network designed to make medical research more accessible, transparent, and collaborative for patients and researchers.",
  },
  {
    question: "Who can join collabiora?",
    answer:
      "Patients, caregivers, researchers, clinicians, students, and anyone interested in evidence-based health research are welcome.",
  },
  {
    question: "Does collabiora provide medical advice?",
    answer:
      "No. collabiora is an educational platform and does not replace professional medical care.",
  },
  {
    question: "Do I need a scientific background to use the platform?",
    answer:
      "Not at all. collabiora is designed to make research understandable without requiring a science background.",
  },
  {
    question: "How do I know the information is reliable?",
    answer:
      "We verify researcher credentials and share only peer-reviewed research to promote evidence-based discussion.",
  },
  {
    question: "Can I find clinical trials on collabiora?",
    answer:
      "Yes. We simplify clinical trial discovery and provide tools to better understand eligibility and study goals.",
  },
  {
    question: "Can researchers share their work?",
    answer:
      "Yes. Researchers can post publications, highlight ongoing studies, and engage directly with the community.",
  },
  {
    question: "Is my information private?",
    answer:
      "We prioritize user privacy and data security using industry-standard protections.",
  },
  {
    question: "Can I remain anonymous?",
    answer:
      "Patients may choose display names. Verified researchers must disclose credentials for credibility.",
  },
  {
    question: "Can I book time with researchers?",
    answer:
      "Yes. Verified researchers on collabiora may offer direct consultations or extended messaging access. Participation and pricing are determined individually by each researcher, and compensation goes directly to them.",
  },
];

export default function FAQ() {
  const [isMobile, setIsMobile] = useState(false);
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Animated collabiora Background */}
      <AnimatedBackground isMobile={isMobile} />

      <section className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 z-10">
        <div className="max-w-3xl w-full mx-auto">
          {/* Heading */}
          <motion.div
            initial={isMobile ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={isMobile ? { duration: 0 } : { duration: 0.6 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3">
              Frequently Asked Questions
            </h1>
      
          </motion.div>

          {/* FAQ List */}
          <div className="space-y-3">
            {faqs.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={item.question}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenIndex((prev) => (prev === index ? -1 : index))
                    }
                    className="w-full text-left"
                  >
                    <div
                      className={`flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border transition-all duration-200 ${
                        isOpen
                          ? "rounded-t-xl border-b-0"
                          : "rounded-xl shadow-sm"
                      }`}
                      style={{
                        backgroundColor: "#F5F2F8", // Same collabiora light pink when open and closed
                        borderColor: isOpen ? "#D0C4E2" : "#E5D8F2",
                      }}
                    >
                      <div>
                        <p
                          className="text-sm sm:text-base font-semibold"
                          style={{ color: "#2F3C96" }}
                        >
                          {item.question}
                        </p>
                      </div>
                      <div
                        className="ml-4 flex items-center justify-center w-7 h-7 rounded-full border"
                        style={{
                          borderColor: "#2F3C96",
                          backgroundColor: "#2F3C96",
                        }}
                      >
                        <ChevronDown
                          className={`w-4 h-4 text-white transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div
                          className="px-4 sm:px-6 pb-4 sm:pb-5 rounded-b-xl text-sm sm:text-base leading-relaxed border-x border-b shadow-sm"
                          style={{
                            backgroundColor: "#F5F2F8",
                            color: "#111827",
                            borderColor: "#D0C4E2",
                          }}
                        >
                          {item.question === "Is my information private?" ? (
                            <>
                              We prioritize user privacy and data security using industry-standard protections.{" "}
                              <Link to="/privacy" className="text-[#2F3C96] font-medium hover:underline">Privacy Policy</Link>
                              {" and "}
                              <Link to="/terms" className="text-[#2F3C96] font-medium hover:underline">Terms of Service</Link>
                              {" for full details."}
                            </>
                          ) : (
                            item.answer
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

