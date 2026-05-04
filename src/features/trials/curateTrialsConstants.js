export const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

/** Shown in paste slots and in “Copy example format” for curators. */
export const PASTE_FORMAT_EXAMPLE = `NEULARK — NEU-411 (LRRK2 Inhibitor, Phase 2)

NEU-411-PD201 Recruiting Phase 2

📋 Study Purpose

This study tests whether NEU-411 can safely slow the progression of early Parkinson's disease...

⚕ What Happens
...

📌 Key Eligibility Criteria

Inclusion:
• Levodopa-naïve OR on stable MAO-B inhibitor only

Exclusion:
• Currently on levodopa or dopamine agonists

✅ Who Can Join

GENDER All genders AGE RANGE 40 – 80 ENROLLMENT Enrolling

✉ Contact Information

Principal Investigator: Dr. Jeff Bronstein, MD, PhD
Email: example@mednet.ucla.edu`;

export const PLACEHOLDER = PASTE_FORMAT_EXAMPLE;

export const editFieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400";
