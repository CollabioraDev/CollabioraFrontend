import React from "react";

export default function HowItWorks() {
  const placeholderVideos = [
    {
      id: 1,
      title: "Overview of Collabiora",
      description: "High-level walkthrough of how Collabiora supports patients and researchers.",
    },
    {
      id: 2,
      title: "Finding the Right Trial",
      description: "Step-by-step guide to exploring and matching with clinical trials.",
    },
    {
      id: 3,
      title: "Collaborating with Experts",
      description: "How to connect with experts and participate in research safely.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7FC]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ color: "#2F3C96" }}>
            How It Works
          </h1>
          <p className="text-sm sm:text-base max-w-2xl" style={{ color: "#555" }}>
            Learn how Collabiora helps you discover trustworthy research, connect with experts, and make
            confident decisions about your health. We&apos;ll add short explainer videos here soon — for now,
            these cards act as placeholders where each video will live.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {placeholderVideos.map((video) => (
            <div
              key={video.id}
              className="rounded-2xl bg-white border border-[#E1DCF4] shadow-sm overflow-hidden flex flex-col"
            >
              <div className="relative bg-[#E9E4FA] aspect-video flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-[#2F3C96] text-white shadow-md"
                  >
                    <span className="ml-0.5 text-sm font-semibold">▶</span>
                  </button>
                  <p className="text-xs text-center px-4" style={{ color: "#4B4B4B" }}>
                    Video placeholder • We&apos;ll embed the final video link here.
                  </p>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h2 className="text-base sm:text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
                  {video.title}
                </h2>
                <p className="text-xs sm:text-sm mb-3" style={{ color: "#555" }}>
                  {video.description}
                </p>
                <p className="mt-auto text-[11px] sm:text-xs" style={{ color: "#8A8A8A" }}>
                  Placeholder note: once you share your video URLs, we&apos;ll replace this area with an
                  embedded player (e.g. YouTube, Loom, or mp4).
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

