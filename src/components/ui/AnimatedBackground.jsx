import React from "react";

export default function AnimatedBackground({ isMobile = false }) {
  const blobOpacity = isMobile ? 0.1 : 1;

  return (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-[#F5F2F8] via-white to-[#E8E0EF] ">
        {/* Optimized Gradient Blobs - Reduced from 6 to 3 for better performance */}
        {/* Large primary blob - top right (reduced blur for performance) */}
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br rounded-full blur-xl"
          style={{
            background: `linear-gradient(to bottom right, rgba(208, 196, 226, ${
              0.3 * blobOpacity
            }), rgba(47, 60, 150, ${0.2 * blobOpacity}), rgba(208, 196, 226, ${
              0.25 * blobOpacity
            }))`,
          }}
        />

        {/* Medium blob - bottom left (reduced blur) */}
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr rounded-full blur-xl"
          style={{
            background: `linear-gradient(to top right, rgba(47, 60, 150, ${
              0.25 * blobOpacity
            }), rgba(208, 196, 226, ${0.2 * blobOpacity}), rgba(47, 60, 150, ${
              0.3 * blobOpacity
            }))`,
          }}
        />

        {/* Small accent blob - top center (reduced blur) */}
        <div
          className="absolute top-1/4 left-1/2 w-[300px] h-[300px] bg-gradient-to-br rounded-full blur-xl opacity-70"
          style={{
            background: `linear-gradient(to bottom right, rgba(208, 196, 226, ${
              0.2 * blobOpacity
            }), rgba(208, 196, 226, ${0.25 * blobOpacity}))`,
          }}
        />
      </div>
    </>
  );
}
