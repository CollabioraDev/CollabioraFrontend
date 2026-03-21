"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Send,
  User,
  MessageSquare,
  MapPin,
  Phone,
  ExternalLink,
} from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import Footer from "../components/Footer";

const SEARCH_EXHAUSTED_MESSAGE =
  "I've used all my free searches and would love to continue exploring the platform. Could you please help me with additional access?";

export default function ContactUs() {
  const [isMobile, setIsMobile] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [searchParams] = useSearchParams();

  // Pre-fill from signed-in user
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    if (userData) {
      setName(userData.username || userData.name || userData.email || "");
      setEmail(userData.email || "");
    }
  }, []);

  // Pre-fill message when coming from search-exhausted state
  useEffect(() => {
    const from = searchParams.get("from");
    if (from === "search-exhausted") {
      setMessage(SEARCH_EXHAUSTED_MESSAGE);
    }
  }, [searchParams]);

  // Detect mobile view for disabling animations (phones < 768px)
  const [isMobileAnim, setIsMobileAnim] = useState(
    typeof window !== "undefined" && window.innerWidth < 768,
  );
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      setIsMobileAnim(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(`${base}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
          userId: userData?.id || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit contact form");
      }

      // Show success message
      alert("Thank you for contacting us! We'll get back to you soon.");

      // Clear form
      setMessage("");
      // Only clear name and email if they weren't pre-filled from user data
      if (!userData) {
        setName("");
        setEmail("");
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      alert("Failed to submit contact form. Please try again later.");
    }
  };

  const defaultEmailSubject = "Contact from collabiora website";
  const defaultEmailBody =
    "Hello,\n\nI would like to get in touch with the collabiora team.\n\n[Please share your question or feedback here]";
  const contactEmail = "info@collabiora.com";

  // Gmail compose URL — opens compose in a new browser tab
  const emailGmailCompose =
    "https://mail.google.com/mail/?view=cm&fs=1&to=" +
    encodeURIComponent(contactEmail) +
    "&su=" +
    encodeURIComponent(defaultEmailSubject) +
    "&body=" +
    encodeURIComponent(defaultEmailBody);

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      content: contactEmail,
      description: "Click to open your email and send us a message",
      composeUrl: emailGmailCompose,
    },
    {
      icon: MessageSquare,
      title: "Live Chat",
      content: "Available 24/7",
      description: "Chat with our support team",
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col">
      <AnimatedBackground isMobile={isMobile} />

      <section className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12 sm:pb-16 z-10">
        <div className="max-w-6xl w-full">
          {/* Header */}
          <motion.div
            initial={isMobileAnim ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={isMobileAnim ? { duration: 0 } : { duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1
              className="text-4xl sm:text-5xl font-bold mb-4"
              style={{ color: "#2F3C96" }}
            >
              Get in Touch
            </h1>
            <p
              className="text-base sm:text-lg max-w-2xl mx-auto"
              style={{ color: "#787878" }}
            >
              Have questions or feedback? We'd love to hear from you.
            </p>
          </motion.div>

          {/* Contact Form - Centered */}
          <motion.div
            initial={isMobileAnim ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              isMobileAnim ? { duration: 0 } : { duration: 0.5, delay: 0.2 }
            }
            className="max-w-4xl mx-auto mb-8"
          >
            <div
              className="rounded-2xl border backdrop-blur-sm shadow-xl p-6 sm:p-8"
              style={{
                backgroundColor: "rgba(245, 242, 248, 0.95)",
                borderColor: "rgba(208, 196, 226, 0.5)",
              }}
            >
              <div className="mb-6">
                <h2
                  className="text-2xl sm:text-3xl font-bold mb-2"
                  style={{ color: "#2F3C96" }}
                >
                  Send us a Message
                </h2>
                <div
                  className="w-16 h-1 rounded-full"
                  style={{ backgroundColor: "#D0C4E2" }}
                />
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#2F3C96" }}
                    >
                      Name
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                        style={{ color: "#B8A5D5" }}
                        aria-hidden
                      />
                      <input
                        id="contact-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] transition-all duration-200"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.9)",
                          borderColor: "rgba(208, 196, 226, 0.5)",
                          color: "#1f2937",
                        }}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#2F3C96" }}
                    >
                      Email
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                        style={{ color: "#B8A5D5" }}
                        aria-hidden
                      />
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] transition-all duration-200"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.9)",
                          borderColor: "rgba(208, 196, 226, 0.5)",
                          color: "#1f2937",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#2F3C96" }}
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help you today?"
                    required
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] resize-none transition-all duration-200"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.9)",
                      borderColor: "rgba(208, 196, 226, 0.5)",
                      color: "#1f2937",
                    }}
                  />
                </div>

                <motion.button
                  type="submit"
                  whileHover={isMobileAnim ? undefined : { scale: 1.02 }}
                  whileTap={isMobileAnim ? undefined : { scale: 0.98 }}
                  className="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #2F3C96, #474F97)",
                    boxShadow: "0 4px 15px rgba(47, 60, 150, 0.3)",
                  }}
                >
                  <Send className="w-5 h-5" />
                  Send Message
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* Contact Information Cards - Below Form */}
          <motion.div
            initial={isMobileAnim ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              isMobileAnim ? { duration: 0 } : { duration: 0.5, delay: 0.4 }
            }
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          >
            {contactInfo.map((item, index) => {
              const isEmailCard = !!item.composeUrl;
              const cardStyle = {
                backgroundColor: "rgba(245, 242, 248, 0.95)",
                borderColor: "rgba(208, 196, 226, 0.5)",
              };
              const cardClassName =
                "rounded-xl border backdrop-blur-sm shadow-lg p-6 hover:shadow-xl transition-shadow duration-300";
              return (
                <motion.div
                  key={item.title}
                  initial={isMobileAnim ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    isMobileAnim
                      ? { duration: 0 }
                      : { duration: 0.5, delay: 0.5 + index * 0.1 }
                  }
                >
                  {isEmailCard ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        window.open(
                          item.composeUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          window.open(
                            item.composeUrl,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }
                      }}
                      className={
                        cardClassName +
                        " block cursor-pointer hover:border-[#2F3C96]/40"
                      }
                      style={cardStyle}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="p-3 rounded-lg"
                          style={{
                            backgroundColor: "rgba(47, 60, 150, 0.1)",
                          }}
                        >
                          <item.icon
                            className="w-6 h-6"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3
                            className="text-lg font-semibold mb-1 flex items-center gap-2"
                            style={{ color: "#2F3C96" }}
                          >
                            {item.title}
                            <ExternalLink
                              className="w-4 h-4 opacity-70"
                              aria-hidden
                            />
                          </h3>
                          <p
                            className="font-medium mb-1"
                            style={{ color: "#474F97" }}
                          >
                            {item.content}
                          </p>
                          <p className="text-sm" style={{ color: "#787878" }}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={cardClassName} style={cardStyle}>
                      <div className="flex items-start gap-4">
                        <div
                          className="p-3 rounded-lg"
                          style={{
                            backgroundColor: "rgba(47, 60, 150, 0.1)",
                          }}
                        >
                          <item.icon
                            className="w-6 h-6"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3
                            className="text-lg font-semibold mb-1"
                            style={{ color: "#2F3C96" }}
                          >
                            {item.title}
                          </h3>
                          <p
                            className="font-medium mb-1"
                            style={{ color: "#474F97" }}
                          >
                            {item.content}
                          </p>
                          <p className="text-sm" style={{ color: "#787878" }}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
