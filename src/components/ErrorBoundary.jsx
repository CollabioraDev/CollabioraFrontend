import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AnimatedBackground from "./ui/AnimatedBackground";

function ErrorFallbackView({ onGoHome }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col">
      <AnimatedBackground isMobile={isMobile} />

      <section className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 sm:pb-16 z-10">
        <div className="max-w-xl w-full flex flex-col items-center text-center">
          {/* Yori outline on deep blue circle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative mb-6"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="inline-flex items-center justify-center rounded-full bg-brand-blue-700 p-4 sm:p-5 shadow-lg"
            >
              <img
                src="/Yori's Face Outline.png"
                alt="Yori – CuraLink's friendly assistant"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
              />
            </motion.div>
          </motion.div>

          {/* Error badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-purple-100/80 text-[#2F3C96] text-sm font-semibold mb-4 border border-[#D0C4E2]/60"
          >
            <span className="text-base font-bold">Oops</span>
            <span className="text-[#787878]">·</span>
            <span>Something went wrong</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2"
          >
            Something went wrong
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="text-[#787878] text-base sm:text-lg max-w-sm mx-auto mb-8"
          >
            We're sorry, but something unexpected happened. Please try
            refreshing the page.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            <button
              type="button"
              onClick={onGoHome}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-purple-200 text-[#2F3C96] font-semibold text-base shadow-lg shadow-[#D0C4E2]/40 hover:shadow-xl hover:bg-brand-purple-300 hover:text-brand-blue-700 active:scale-[0.98] transition-all duration-200"
            >
              Go to Home
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallbackView onGoHome={this.handleGoHome} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
