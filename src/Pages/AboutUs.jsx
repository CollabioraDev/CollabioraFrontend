"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Heart, Target, Sparkles } from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import Footer from "../components/Footer";

export default function AboutUs() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const values = [
    {
      icon: <Target className="w-4 h-4" />,
      title: "Transparency",
      description: "Open, understandable research for everyone",
    },
    {
      icon: <Heart className="w-4 h-4" />,
      title: "Ethics",
      description: "Integrity at every step",
    },
    {
      icon: <Users className="w-4 h-4" />,
      title: "Collaboration",
      description: "Bringing researchers, clinicians, and patients together",
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col">
      <AnimatedBackground isMobile={isMobile} />

      <section className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 sm:pb-10 lg:pb-14 z-10">
        <div className="max-w-6xl w-full">
          {/* Header */}
          <motion.div
            initial={isMobile ? false : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={isMobile ? { duration: 0 } : { duration: 0.6 }}
            className="text-center mb-8 lg:mb-10"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-3">
              About Us
            </h1>
            <div className="w-20 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full mx-auto" />
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column - Story */}
            <motion.div
              initial={isMobile ? false : { opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={isMobile ? { duration: 0 } : { duration: 0.6, delay: 0.2 }}
              className="lg:col-span-7 space-y-6"
            >
              {/* Our Story Card */}
              <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-5 sm:p-6 lg:p-7 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    Our Story
                  </h2>
                </div>

                <div className="space-y-3.5 text-foreground/90">
                  <p className="text-base sm:text-lg font-semibold text-foreground leading-relaxed">
                    Collabiora began with patients.
                  </p>

                  <p className="text-sm sm:text-base leading-relaxed">
                    As a physician-scientist caring for individuals with
                    complex, often untreatable neurologic disease, Sanskriti saw
                    firsthand how hard it was for patients and families to
                    navigate their illness, especially when the latest research
                    felt distant, inaccessible, or impossible to interpret.
                  </p>

                  <p className="text-sm sm:text-base leading-relaxed">
                    As a policy advisor and researcher leading patient-centered
                    studies across hospitals in the Netherlands, Esther worked
                    closely with patients and saw how they drove scientific
                    progress, even though the research they helped create was
                    rarely shared in language they could understand.
                  </p>

                  <div className="my-5 pl-4 border-l-4 border-primary/40">
                    <p className="text-sm font-semibold text-foreground mb-1.5">
                      We kept asking the same question:
                    </p>
                    <p className="text-base sm:text-lg font-medium text-primary italic leading-relaxed">
                      Why does so much valuable research struggle to reach the
                      people it is meant to help?
                    </p>
                  </div>

                  <p className="text-base sm:text-lg font-semibold text-foreground">
                    Collabiora was created to close that gap.
                  </p>

                  <p className="text-sm sm:text-base leading-relaxed">
                    We are reimagining how health research is communicated and
                    connected, making it more transparent, collaborative, and
                    accessible to patients, clinicians, and researchers alike.
                  </p>

                  <p className="text-sm sm:text-base leading-relaxed font-medium">
                    Innovation slows when we work in silos. Discovery
                    accelerates when knowledge flows openly and every voice
                    matters.
                  </p>

                  <p className="text-sm sm:text-base leading-relaxed">
                    We are building a new model for health research, one rooted
                    in collaboration, clarity, and human experience.
                  </p>

                  <p className="text-sm sm:text-base font-semibold text-foreground pt-1">
                    We are excited to share this journey with you.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Founders & Values */}
            <motion.div
              initial={isMobile ? false : { opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={isMobile ? { duration: 0 } : { duration: 0.6, delay: 0.3 }}
              className="lg:col-span-5 space-y-6"
            >
              {/* Founders Card */}
              <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-5 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                  Our Founders
                </h2>

                {/* Founder Image */}
                <motion.div
                  initial={isMobile ? false : { opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={isMobile ? undefined : { scale: 1.03 }}
                  transition={isMobile ? { duration: 0 } : {
                    duration: 0.5,
                    delay: 0.4,
                    type: "spring",
                    stiffness: 150,
                  }}
                  className="relative mb-5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-2xl" />
                  <div className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border/50">
                    <img
                      src="/founders.jpeg"
                      alt="Founders - Sanskriti Sasikumar and Esther Feldman"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </motion.div>

                {/* Founders Info */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-xl p-4 border border-primary/10">
                    <p className="text-lg font-bold text-foreground mb-0.5">
                      Sanskriti Sasikumar
                    </p>
                    <p className="text-sm text-muted-foreground font-medium">
                      MD, PhD
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-xl p-4 border border-primary/10">
                    <p className="text-lg font-bold text-foreground mb-0.5">
                      Esther Feldman
                    </p>
                    <p className="text-sm text-muted-foreground font-medium">
                      MSc
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* What We Stand For - Full Width Below Both Columns */}
            <motion.div
              initial={isMobile ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={isMobile ? { duration: 0 } : { duration: 0.6, delay: 0.4 }}
              className="lg:col-span-12"
            >
              <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-5 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-500">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4">
                  What We Stand For
                </h3>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {values.map((value, index) => (
                    <motion.div
                      key={index}
                      initial={isMobile ? false : { opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={isMobile ? { duration: 0 } : { duration: 0.4, delay: 0.5 + index * 0.1 }}
                      whileHover={isMobile ? undefined : { x: 4 }}
                      className="group bg-gradient-to-r from-primary/5 to-transparent border border-border/50 rounded-xl p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors duration-300">
                          {value.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-bold text-foreground mb-0.5">
                            {value.title}
                          </h4>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {value.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}