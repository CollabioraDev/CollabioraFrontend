import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import Footer from "../components/Footer";

const DEMO_VIDEO_URL =
  "https://res.cloudinary.com/dtgmjvfms/video/upload/v1773933937/collabiora-demo_Oo8ls0s0_kqkxvz.mp4";

export default function HowItWorks() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col">
      <AnimatedBackground isMobile={isMobile} />

      <section className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12 sm:pb-16 z-10">
        <div className="max-w-6xl w-full">
          <motion.div
            initial={isMobile ? false : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={isMobile ? { duration: 0 } : { duration: 0.6 }}
            className="text-center mb-8 lg:mb-10"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-3">
              How It Works
            </h1>
            <div className="w-20 h-1 bg-linear-to-r from-primary/50 via-primary to-primary/50 rounded-full mx-auto mb-4" />
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
              Watch a quick walkthrough of the collabiora platform and how it
              helps patients and researchers collaborate more effectively.
            </p>
          </motion.div>

          <motion.div
            initial={isMobile ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={isMobile ? { duration: 0 } : { duration: 0.6, delay: 0.15 }}
            className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl hover:shadow-2xl transition-all duration-500"
          >
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-border/50 bg-black/90">
              <video
                className="w-full h-full"
                controls
                preload="metadata"
                src={DEMO_VIDEO_URL}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

