"use client";

import { motion } from "framer-motion";
import { InfiniteMovingCards } from "./ui/infinite-moving-cards";

const TrustedNetworksMarquee = () => {
  const networks = [
    {
      name: "ClinicalTrials.gov",
      linkUrl: "#",
      imageUrl:
        "https://crir.ca/wp-content/uploads/2020/05/nihclinicaltrials.png",
    },
    {
      name: "PubMed",
      linkUrl: "#",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/US-NLM-PubMed-Logo.svg/1280px-US-NLM-PubMed-Logo.svg.png",
    },
    {
      name: "EU Clinical Trials Register",
      linkUrl: "#",
      imageUrl:
        "https://3d-hub-organoids.com/wp-content/uploads/2020/12/EU_CT-300x300.jpg",
    },
    {
      name: "PLOS Medicine",
      linkUrl: "#",
      imageUrl: "/Plos.png",
    },
    {
      name: "JAMA Psychiatry",
      linkUrl: "#",
      imageUrl: "/Jama.png",
    },
    {
      name: "Journal of Clinical Oncology",
      linkUrl: "#",
      imageUrl: "/Journal of Oncology.png",
    },
    {
      name: "Brain",
      linkUrl: "#",
      imageUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT828PSHJu-cFhjNimDJ--xv4d_0WwJ3QK7oQ&s",
    },
    {
      name: "Nature Medicine",
      linkUrl: "#",
      imageUrl: "/nature_medicine_v-Photoroom.png",
    },
    {
      name: "The Lancet",
      linkUrl: "#",
      imageUrl: "/TheLancet.png",
    },
    {
      name: "CellPress",
      linkUrl: "#",
      imageUrl:
        "https://yt3.googleusercontent.com/ytc/AIdro_kx8U3OIOWTTfOZy4qbb3l25bAQiakcI4ISlu4MRhZ1Rfk=s900-c-k-c0x00ffffff-no-rj",
    },
    {
      name: "European Medicines Agency",
      linkUrl: "#",
      imageUrl: "/european-medicines-agency.jpg",
    },
  ];

  const cardItems = networks.map((network) => ({
    quote: (
      <a
        href={network.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center transition-all hover:scale-105"
        style={{
          textDecoration: "none",
        }}
      >
        <img
          src={network.imageUrl}
          alt={network.name}
          className="h-13 md:h-16 w-auto object-contain"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </a>
    ),
    name: "",
    title: "",
  }));

  return (
    <section
      className="relative   sm:py-12 overflow-hidden "
      style={{ borderColor: "#D0C4E2", backgroundColor: "transparent" }}
    >
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mb-6"
        >
          <p
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "#787878" }}
          >
            Built on Trusted Research Networks
          </p>
        </motion.div>

        <div className="relative max-w-6xl mx-auto">
          <InfiniteMovingCards
            items={cardItems}
            direction="left"
            speed="slow"
            pauseOnHover={true}
            className="[&_li]:w-[200px] md:[&_li]:w-[250px] [&_li]:h-auto [&_li]:bg-transparent [&_li]:border-0 [&_li]:px-0 [&_li]:py-4 [&_ul]:gap-2"
          />
        </div>
      </div>
    </section>
  );
};

export default TrustedNetworksMarquee;
