import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import Footer from "../components/Footer";

const DEMO_VIDEO_URL =
  "https://res.cloudinary.com/dtgmjvfms/video/upload/v1773933937/collabiora-demo_Oo8ls0s0_kqkxvz.mp4";

const RESEARCHER_VIDEO_URL =
  "https://res.cloudinary.com/dtgmjvfms/video/upload/v1774506185/collabiora-researcher-demo_CSuvgG1G_cu8bhk.mp4";

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-0 w-full">
            <motion.div
              initial={isMobile ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={isMobile ? { duration: 0 } : { duration: 0.6, delay: 0.15 }}
              className="text-center pb-10 border-b border-border/60 md:pb-0 md:border-b-0 md:border-r md:pr-8 lg:pr-10"
            >
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-4">
                General Public
              </h2>
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/90">
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

            <motion.div
              initial={isMobile ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={isMobile ? { duration: 0 } : { duration: 0.6, delay: 0.25 }}
              className="text-center md:pl-8 lg:pl-10"
            >
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Researchers
              </h2>
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/90">
                <video
                  className="w-full h-full"
                  controls
                  preload="metadata"
                  src={RESEARCHER_VIDEO_URL}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

