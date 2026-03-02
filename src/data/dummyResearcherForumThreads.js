/**
 * Dummy forum threads for researcher forums — one researcher replies to another.
 * Title only (no body); answer in reply. One unanswered per community. Same Follow modal for forum helper.
 */

import { DUMMY_FORUM_HELPER_ID } from "./dummyForumThreads.js";

export { DUMMY_FORUM_HELPER_ID };

export function isDummyResearcherThreadId(id) {
  return typeof id === "string" && id.startsWith("dummy-rthread-");
}

// Re-export for modal (forum helper / sample participant)
export { isDummyUserId } from "./dummyForumThreads.js";

const RESEARCHER_NAMES = [
  "Dr. M. Patel, MD, PhD",
  "Dr. A Kim, MD",
  "Dr. D Alvarez, PhD",
  "Dr. T Okoye, MD, PhD",
  "Dr. L Weiss, MD",
  "Dr. T Rossi, MBBS",
  "Dr. D Chen, PhD",
  "Dr. R Hassan, MD",
  "Dr. R O'Connor, MD, PhD",
  "Dr. P Shah, MD",
];

let researcherIndex = 0;
function nextResearcher() {
  const n = RESEARCHER_NAMES[researcherIndex % RESEARCHER_NAMES.length];
  researcherIndex += 1;
  return { id: `dummy-researcher-${researcherIndex}`, displayName: n, role: "researcher" };
}

function forumHelper() {
  return {
    id: DUMMY_FORUM_HELPER_ID,
    username: "collabiora_forum",
    handle: "collabiora_forum",
    role: "researcher",
  };
}

// 1. Basic & Preclinical Research
const BASIC_PRECLINICAL = [
  { title: "When is it worth switching animal models mid-project?", answer: null },
  {
    title: "When does a strong in vitro finding justify moving to in vivo models?",
    answer: `For us, it requires reproducibility across multiple cell lines and evidence of mechanistic plausibility. Effect size alone isn't enough — we look for pathway consistency and biological coherence. Even then, we treat early in vivo work as exploratory, given the translational gap.`,
  },
  {
    title: "Our in vitro results are promising, but replication across batches has been inconsistent. How do you troubleshoot variability without burning funding?",
    answer: `We ran into this last year. What helped was systematically auditing each step — reagent lot numbers, passage number, incubation timing, even minor temperature fluctuations. We also started freezing larger master stocks to reduce drift. Before expanding the project, we allocated a small "replication budget" line item specifically for confirming core findings. It slowed us down short term but saved money long term.`,
  },
];

// 2. Translational & Clinical Research
const TRANSLATIONAL_CLINICAL = [
  { title: "How have others bridged the funding gap to first-in-human trials?", answer: null },
  {
    title: "How do you build clinical buy-in early?",
    answer: `Involve clinicians before the protocol is finalized. If they feel ownership in design decisions, they're more likely to champion the study. We also made sure our endpoints aligned with what clinicians actually consider meaningful.`,
  },
  {
    title: "How do you handle strong results in only a subset?",
    answer: `We've started building stratification hypotheses early instead of treating heterogeneity as a nuisance. If the subset signal is consistent biologically, it may represent the true responsive population rather than a statistical artifact.`,
  },
];

// 3. Clinical Trial Design
const CLINICAL_TRIAL_DESIGN = [
  { title: "Recruitment is slower than projected. What's worked?", answer: null },
  {
    title: "Managing protocol amendments?",
    answer: `Document everything clearly and assess impact on statistical power before implementing. Frequent amendments can undermine confidence, so we try to cluster changes when possible.`,
  },
  {
    title: "Sponsors want narrow criteria. How do you balance this?",
    answer: `We try to preserve internal validity for regulatory approval but advocate for post-approval pragmatic trials to broaden applicability. It's often a phased compromise.`,
  },
];

// 4. Data Science & AI
const DATA_SCIENCE_AI = [
  { title: "Performance drops externally. How have you handled this?", answer: null },
  {
    title: "Improving interpretability?",
    answer: `We've integrated feature attribution tools and simplified output to clinically intuitive risk categories. Trust increases when clinicians can understand the "why," even partially.`,
  },
  {
    title: "Securing labeled datasets?",
    answer: `Strong institutional partnerships and data-use agreements are essential. We also anonymize aggressively and involve compliance teams early to avoid setbacks.`,
  },
];

// 5. Genomics & Precision Medicine
const GENOMICS_PRECISION = [
  { title: "Managing expectations around uncertain variants?", answer: null },
  {
    title: "Handling multi-omics overload?",
    answer: `We now define a primary biological hypothesis before running integrative analyses. Otherwise, signal chasing becomes overwhelming and statistically risky.`,
  },
  {
    title: "Justifying genomic testing costs?",
    answer: `We frame it around long-term outcome data and cost offsets where available. Payers respond better to health economics data than mechanistic arguments.`,
  },
];

// 6. Public Health & Implementation
const PUBLIC_HEALTH = [
  { title: "Low uptake in community clinics?", answer: null },
  {
    title: "Balancing fidelity and flexibility?",
    answer: `We define "core components" that must remain intact and allow peripheral adaptation. That distinction has helped preserve outcomes while enabling local tailoring.`,
  },
  {
    title: "Navigating short-term funding expectations?",
    answer: `We've built milestone-based reporting that demonstrates incremental progress, even if full implementation takes years.`,
  },
];

// 7. Imaging & Diagnostics
const IMAGING_DIAGNOSTICS = [
  {
    title: "What sample size considerations are unique to imaging studies compared to drug trials?",
    answer: null,
  },
  {
    title: "How are you validating quantitative MRI metrics across field strengths (1.5T vs 3T)?",
    answer: `Field strength differences introduce both signal-to-noise variation and systematic shifts in quantitative metrics. In our work, we've approached validation in three steps:

1. Phantom calibration across scanners to quantify baseline drift.
2. Test-retest reliability studies at both field strengths to assess within-scanner stability.
3. Cross-field normalization models, sometimes using harmonization approaches like ComBat.

Even then, some parameters (e.g., T1 mapping values) remain field-strength dependent. Rather than forcing absolute equivalence, we sometimes report field-specific reference ranges.

The bigger challenge is multi-center studies where scanner vendor and coil differences compound field effects. Prospective harmonization protocols help, but retrospective harmonization is still imperfect.

I'd argue quantitative MRI across field strengths is feasible — but only with explicit modeling of systematic bias rather than assuming equivalence.`,
  },
  {
    title: "Is radiomics ready for prospective clinical trials?",
    answer: `Radiomics has shown impressive retrospective performance, but prospective readiness depends on several factors:

· Feature stability across acquisition settings
· External validation across independent cohorts
· Standardized preprocessing pipelines
· Demonstrated incremental value over existing clinical predictors

In our experience, many radiomic signatures lose performance when applied outside the original training environment due to acquisition variability.

That said, I do think radiomics is ready for carefully designed prospective trials — particularly when:
· The model is locked before trial initiation
· Imaging acquisition protocols are standardized
· The primary endpoint tests whether radiomics changes clinical decision-making

The key shift is moving from "prediction accuracy" to "clinical utility."
Until we consistently demonstrate improved outcomes or decision efficiency, adoption will remain cautious.`,
  },
];

// 8. Bioethics & Regulatory Science
const BIOETHICS_REGULATORY = [
  { title: "Streamlining IRB timelines?", answer: null },
  {
    title: "Simplifying complex consent?",
    answer: `Layered consent formats — summary first, technical details second — improved comprehension without oversimplifying.`,
  },
  {
    title: "Responding to late regulatory endpoint requests?",
    answer: `We assess feasibility and statistical impact quickly, then negotiate timelines. Transparency with regulators tends to help.`,
  },
];

// 9. Funding & Career Development
const FUNDING_CAREER = [
  { title: "After two unfunded R01s, pivot or persist?", answer: null },
  {
    title: "Balancing productivity and mentorship?",
    answer: `Time blocking and clear delegation have helped. Mentorship is long-term investment, but without boundaries it can erode research momentum.`,
  },
  {
    title: "Multiple small grants or one large one?",
    answer: `Early in career, diversified smaller funding streams can reduce risk. Larger grants provide stability but are higher variance.`,
  },
];

// 10. Publication & Peer Review
const PUBLICATION_PEER_REVIEW = [
  { title: "Pushing back on excessive reviewer demands?", answer: null },
  {
    title: "Publishing negative data?",
    answer: `We've had success with specialty journals and preprint servers. Framing the study around the question rather than the outcome helps.`,
  },
  {
    title: "Handling authorship disputes?",
    answer: `We now define authorship criteria at project initiation. Early clarity prevents later conflict.`,
  },
];

// First answer for Basic & Preclinical (answered thread)
const BASIC_PRECLINICAL_ANSWER_1 = `Painful but sometimes necessary. If repeated experiments show discordance with known human pathology, we reassess. We try to pilot a smaller validation cohort in the new model before fully pivoting. It's resource-intensive, but translational failure later is even more expensive.`;

const TRANSLATIONAL_ANSWER_1 = `We combined institutional seed funding with disease foundation grants to generate just enough translational data to approach investors. Strategic partnerships early — even informal advisory roles from clinicians — helped strengthen credibility when pitching.`;

const CLINICAL_TRIAL_ANSWER_1 = `We underestimated site variability. Expanding to additional sites helped, but so did simplifying eligibility criteria. We also found that regular engagement with site coordinators — not just PIs — made a measurable difference.`;

const DATA_SCIENCE_ANSWER_1 = `We discovered that local data preprocessing assumptions didn't generalize. Re-training on more heterogeneous datasets improved stability. External validation early — even if performance drops — is humbling but necessary.`;

const GENOMICS_ANSWER_1 = `Clear communication is key. We emphasize that many variants lack definitive interpretation and may be reclassified over time. Overstating certainty erodes trust.`;

const PUBLIC_HEALTH_ANSWER_1 = `We underestimated workflow burden. Adjusting the intervention to fit existing systems rather than imposing new ones improved adoption significantly.`;

const IMAGING_ANSWER_1 = `Imaging studies often face different statistical pressures than drug trials. In therapeutic trials, outcomes are typically clinical endpoints (survival, event rates), and variability is often patient-driven. In imaging studies, variability is frequently technical — scanner differences, reconstruction algorithms, reader variability, and acquisition parameters all contribute.

This means:
· Measurement reproducibility needs to be quantified separately (test-retest reliability).
· Effect sizes may be smaller because imaging biomarkers are often surrogate markers.
· Multi-site imaging studies sometimes require larger samples to account for inter-scanner heterogeneity.
· Conversely, early technical validation studies may be smaller but require repeated measures per subject.

Another difference is clustering — if images are nested within sites or scanners, hierarchical modeling becomes important.

In short, imaging sample size isn't just about biological variability — it's also about technical variance.`;

const BIOETHICS_ANSWER_1 = `Pre-IRB consultations and templated documentation reduced back-and-forth significantly. Early engagement prevents later delays.`;

const FUNDING_ANSWER_1 = `We analyzed reviewer critiques carefully. If feedback converges on fixable weaknesses, we revise. If critiques challenge the core premise, it may signal a need to pivot.`;

const PUBLICATION_ANSWER_1 = `We respond respectfully but clearly explain scope limitations. When additional experiments don't alter conclusions, we justify why they're beyond study intent.`;

const CATEGORIES = [
  { slug: "basic-preclinical-research", name: "Basic & Preclinical Research", threads: [
    { title: BASIC_PRECLINICAL[0].title, answer: null },
    { title: BASIC_PRECLINICAL[1].title, answer: BASIC_PRECLINICAL[1].answer },
    { title: BASIC_PRECLINICAL[2].title, answer: BASIC_PRECLINICAL[2].answer },
  ]},
  { slug: "translational-clinical-research", name: "Translational & Clinical Research", threads: [
    { title: TRANSLATIONAL_CLINICAL[0].title, answer: null },
    { title: TRANSLATIONAL_CLINICAL[1].title, answer: TRANSLATIONAL_CLINICAL[1].answer },
    { title: TRANSLATIONAL_CLINICAL[2].title, answer: TRANSLATIONAL_CLINICAL[2].answer },
  ]},
  { slug: "clinical-trial-design", name: "Clinical Trial Design", threads: [
    { title: CLINICAL_TRIAL_DESIGN[0].title, answer: null },
    { title: CLINICAL_TRIAL_DESIGN[1].title, answer: CLINICAL_TRIAL_DESIGN[1].answer },
    { title: CLINICAL_TRIAL_DESIGN[2].title, answer: CLINICAL_TRIAL_DESIGN[2].answer },
  ]},
  { slug: "data-science-ai", name: "Data Science & AI", threads: [
    { title: DATA_SCIENCE_AI[0].title, answer: null },
    { title: DATA_SCIENCE_AI[1].title, answer: DATA_SCIENCE_AI[1].answer },
    { title: DATA_SCIENCE_AI[2].title, answer: DATA_SCIENCE_AI[2].answer },
  ]},
  { slug: "genomics-precision-medicine", name: "Genomics & Precision Medicine", threads: [
    { title: GENOMICS_PRECISION[0].title, answer: null },
    { title: GENOMICS_PRECISION[1].title, answer: GENOMICS_PRECISION[1].answer },
    { title: GENOMICS_PRECISION[2].title, answer: GENOMICS_PRECISION[2].answer },
  ]},
  { slug: "public-health-implementation", name: "Public Health & Implementation", threads: [
    { title: PUBLIC_HEALTH[0].title, answer: null },
    { title: PUBLIC_HEALTH[1].title, answer: PUBLIC_HEALTH[1].answer },
    { title: PUBLIC_HEALTH[2].title, answer: PUBLIC_HEALTH[2].answer },
  ]},
  { slug: "imaging-diagnostics", name: "Imaging & Diagnostics", threads: [
    { title: IMAGING_DIAGNOSTICS[0].title, answer: null },
    { title: IMAGING_DIAGNOSTICS[1].title, answer: IMAGING_DIAGNOSTICS[1].answer },
    { title: IMAGING_DIAGNOSTICS[2].title, answer: IMAGING_DIAGNOSTICS[2].answer },
  ]},
  { slug: "bioethics-regulatory-science", name: "Bioethics & Regulatory Science", threads: [
    { title: BIOETHICS_REGULATORY[0].title, answer: null },
    { title: BIOETHICS_REGULATORY[1].title, answer: BIOETHICS_REGULATORY[1].answer },
    { title: BIOETHICS_REGULATORY[2].title, answer: BIOETHICS_REGULATORY[2].answer },
  ]},
  { slug: "funding-career-development", name: "Funding & Career Development", threads: [
    { title: FUNDING_CAREER[0].title, answer: null },
    { title: FUNDING_CAREER[1].title, answer: FUNDING_CAREER[1].answer },
    { title: FUNDING_CAREER[2].title, answer: FUNDING_CAREER[2].answer },
  ]},
  { slug: "publication-peer-review", name: "Publication & Peer Review", threads: [
    { title: PUBLICATION_PEER_REVIEW[0].title, answer: null },
    { title: PUBLICATION_PEER_REVIEW[1].title, answer: PUBLICATION_PEER_REVIEW[1].answer },
    { title: PUBLICATION_PEER_REVIEW[2].title, answer: PUBLICATION_PEER_REVIEW[2].answer },
  ]},
];

export function buildDummyResearcherThreadsForMerge(communities, selectedCommunity = null) {
  researcherIndex = 0;
  const baseDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const result = [];

  function slugMatch(c, catSlug) {
    const s = (c.slug || "").toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
    const n = (c.name || "").toLowerCase().replace(/\s*&\s*/g, "-").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return s === catSlug || n === catSlug;
  }

  /** When no community selected: add all categories. When one selected: add only categories that match it by slug or name. */
  function categoryIncluded(cat) {
    if (!selectedCommunity) return true;
    return slugMatch(selectedCommunity, cat.slug);
  }

  CATEGORIES.forEach((cat) => {
    if (!categoryIncluded(cat)) return;
    const community = communities?.find((c) => slugMatch(c, cat.slug));
    const communityId = community
      ? { _id: community._id, name: community.name, slug: community.slug }
      : { _id: `dummy-rcommunity-${cat.slug}`, name: cat.name, slug: cat.slug };

    cat.threads.forEach((item, idx) => {
      const threadId = `dummy-rthread-${cat.slug}-${idx}`;
      const questionAuthor = nextResearcher();
      const reply = item.answer
        ? (() => {
            const useForumHelper = (cat.slug.length + idx) % 4 === 0;
            const answerAuthor = useForumHelper ? forumHelper() : nextResearcher();
            return {
              _id: `dummy-rreply-${cat.slug}-${idx}`,
              body: item.answer,
              authorUserId: {
              _id: answerAuthor.id,
              role: answerAuthor.role,
              ...(answerAuthor.displayName && { displayName: answerAuthor.displayName }),
              ...(answerAuthor.username && { username: answerAuthor.username }),
              ...(answerAuthor.handle && { handle: answerAuthor.handle }),
            },
              authorRole: "researcher",
              createdAt: new Date(baseDate.getTime() + (idx + 1) * 24 * 60 * 60 * 1000).toISOString(),
              upvotes: [],
              downvotes: [],
              voteScore: 0,
              children: [],
            };
          })()
        : undefined;

      result.push({
        _id: threadId,
        communityId,
        title: item.title,
        body: "",
        authorUserId: {
        _id: questionAuthor.id,
        role: questionAuthor.role,
        ...(questionAuthor.displayName && { displayName: questionAuthor.displayName }),
        ...(questionAuthor.username && { username: questionAuthor.username }),
        ...(questionAuthor.handle && { handle: questionAuthor.handle }),
      },
        authorRole: "researcher",
        createdAt: new Date(baseDate.getTime() + idx * 24 * 60 * 60 * 1000).toISOString(),
        voteScore: 2 + (idx % 4),
        viewCount: 10 + idx * 5,
        replyCount: reply ? 1 : 0,
        hasResearcherReply: !!reply,
        onlyResearchersCanReply: true,
        isResearcherForum: true,
        upvotes: [],
        downvotes: [],
        tags: [cat.name],
        conditions: [],
        isDummy: true,
        dummyReplies: reply ? [reply] : [],
      });
    });
  });

  return result;
}

export function getDummyResearcherThreadDetails(threadId, threads) {
  if (!isDummyResearcherThreadId(threadId)) return null;
  const thread = threads.find((t) => t._id === threadId);
  if (!thread || !thread.isDummy) return null;
  return {
    ...thread,
    replies: thread.dummyReplies || [],
  };
}