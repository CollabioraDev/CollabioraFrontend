/**
 * Dummy forum threads for patient forums — official-looking Q&A by community.
 * One thread per community is left unanswered. Authors are randomized (patients, researchers, forum helper).
 */

export const DUMMY_FORUM_HELPER_ID = "__collabiora_forum_helper__";

export function isDummyThreadId(id) {
  return typeof id === "string" && id.startsWith("dummy-thread-");
}

export function isDummyUserId(id) {
  return typeof id === "string" && (id === DUMMY_FORUM_HELPER_ID || id.startsWith("dummy-user-") || id.startsWith("dummy-researcher-"));
}

// Random patient usernames (display as authors)
const PATIENT_USERNAMES = [
  "hope_warrior_42",
  "living_with_it",
  "care_giver_mom",
  "survivor_2024",
  "day_by_day",
  "mindful_heart",
  "strong_today",
  "patient_voice_7",
  "wellness_seeker",
  "new_dx_here",
  "finding_balance",
  "one_step_today",
  "courage_and_tea",
  "patient_advocate_9",
  "calm_mind_22",
];

// Random researcher display names
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

let patientIndex = 0;
let researcherIndex = 0;
function nextPatient() {
  const u = PATIENT_USERNAMES[patientIndex % PATIENT_USERNAMES.length];
  patientIndex += 1;
  return { id: `dummy-user-${patientIndex}`, username: u, handle: u, role: "patient" };
}
function nextResearcher() {
  const n = RESEARCHER_NAMES[researcherIndex % RESEARCHER_NAMES.length];
  researcherIndex += 1;
  const handle = n.replace(/^Dr\.\s*/, "").replace(/\s+/, "_").toLowerCase();
  return { id: `dummy-researcher-${researcherIndex}`, username: n, handle, role: "researcher" };
}
function forumHelper() {
  return {
    id: DUMMY_FORUM_HELPER_ID,
    username: "collabiora_forum",
    handle: "collabiora_forum",
    role: "patient",
  };
}

// Build one thread entry: { slug, title, body, author, reply?: { body, author }, unanswered?: true }
function t(slug, title, body, author, reply, unanswered = false) {
  return { slug, title, body, author, reply, unanswered };
}

// Raw content per category — we'll assign authors when building
const CANCER = [
  {
    title: "What should I look for when reading about a \"breakthrough\" cancer treatment?",
    body: "When you see the word \"breakthrough,\" what should I actually look for in the article or study?",
    answer: null, // unanswered
  },
  {
    title: "I keep seeing headlines about a new cancer breakthrough. How do I know if it's actually meaningful?",
    body: "Headlines are so confusing. How can I tell if a breakthrough is real or just hype?",
    answer: `Great question — headlines often simplify complex research. When you see "breakthrough," check:

· What phase the study is in (early trials are more exploratory)
· How many people were included
· What outcome improved (tumor size vs overall survival)
· How large the benefit was

A treatment can be promising but still need more evidence before it changes standard care.`,
  },
  {
    title: "If a study says survival improved by 2 months, is that considered significant?",
    body: "I read that a treatment extended survival by 2 months. Is that a lot or a little?",
    answer: `It depends. In some advanced cancers, even a few months can be meaningful — especially if quality of life is maintained.
But it's important to ask:

· Were side effects manageable?
· Did most patients benefit, or just a small group?
· Was overall survival improved or just progression-free survival?

Context matters.`,
  },
];

const HEART = [
  {
    title: "What does it mean if a heart study uses a \"composite endpoint\"?",
    body: "I keep seeing \"composite endpoint\" in heart study summaries. What does that mean for me?",
    answer: null,
  },
  {
    title: "I read that a medication reduces heart risk by 20%. What does that actually mean?",
    body: "Does 20% risk reduction mean 20% fewer heart attacks, or something else?",
    answer: `That often refers to "relative risk reduction." For example, if 10 out of 100 people would normally have a heart event, and the medication reduces that to 8 out of 100, that's a 20% relative reduction — but only a 2% absolute reduction.

Looking at both numbers helps you understand the real impact.`,
  },
  {
    title: "How do I know if I would've qualified for this heart study?",
    body: "The study sounds relevant but I'm not sure if I would have been included.",
    answer: `Every study has inclusion and exclusion criteria. These usually include:

· Age range
· Specific diagnoses
· Other medical conditions
· Medications

If the participants were very different from you, the results may not fully apply.`,
  },
];

const NEUROLOGY = [
  {
    title: "Why do some neurological trials show improvement in biomarkers but not symptoms?",
    body: "I read about a trial where brain scans improved but patients didn't feel better. Why?",
    answer: null,
  },
  {
    title: "Why do some Alzheimer's drugs get approved even if they don't seem to help symptoms much?",
    body: "How can a drug be approved if it doesn't clearly help people feel better?",
    answer: `Some drugs show improvement in biomarkers (like amyloid levels in the brain) before showing strong symptom changes. Regulators may approve them based on biological evidence, especially when few treatment options exist.

But researchers continue studying whether those biological changes lead to meaningful long-term benefits.`,
  },
  {
    title: "What's the difference between slowing disease and improving symptoms?",
    body: "My doctor said the treatment might \"slow progression\" but not improve how I feel now.",
    answer: `Improving symptoms means someone feels better now.
Slowing disease progression means the condition worsens more slowly over time.

Some treatments may not make symptoms noticeably better, but they may delay decline.`,
  },
];

const AUTOIMMUNE = [
  {
    title: "How do biologic therapies differ from traditional immune-suppressing drugs?",
    body: "I'm trying to understand the difference between biologics and older immunosuppressants.",
    answer: null,
  },
  {
    title: "Why are biologics so expensive? Are they really that different from older drugs?",
    body: "The cost is overwhelming. What makes them so different?",
    answer: `Biologics are complex therapies made from living cells and are designed to target specific immune pathways. They often require specialized manufacturing and storage.

They can be more precise than older immune-suppressing drugs, but whether they're "better" depends on the condition and individual response.`,
  },
  {
    title: "How do researchers decide which immune pathway to target?",
    body: "How do they choose which part of the immune system to focus on?",
    answer: `They study the biology of the disease — identifying which immune signals are overactive or dysfunctional. Lab research and early clinical trials help determine whether blocking a specific pathway improves symptoms safely.`,
  },
];

const DIABETES = [
  {
    title: "What's the difference between lowering blood sugar and improving long-term outcomes?",
    body: "My doctor said we want to lower glucose but also protect my heart. How are those related?",
    answer: null,
  },
  {
    title: "If my blood sugar improves, does that automatically mean fewer complications?",
    body: "If my HbA1c is better, am I less likely to get heart or kidney problems?",
    answer: `Not always. Lowering blood sugar (like improving HbA1c) is important, but researchers also look at long-term outcomes such as:

· Heart disease
· Kidney function
· Nerve damage

Some medications improve both glucose and cardiovascular outcomes — others may not.`,
  },
  {
    title: "Why do some diabetes drugs focus on heart health too?",
    body: "Why would a diabetes medication be studied for heart outcomes?",
    answer: `Because cardiovascular disease is a major risk for people with diabetes. Newer diabetes medications are often studied not just for glucose control, but also for heart and kidney protection.`,
  },
];

const MENTAL_HEALTH = [
  {
    title: "Why do mental health studies sometimes show modest effect sizes?",
    body: "I read that the improvement in the study was \"modest.\" What does that mean for me?",
    answer: null,
  },
  {
    title: "Why do antidepressants take so long to work?",
    body: "I've been on medication for two weeks and don't feel different yet.",
    answer: `Although these medications affect brain chemicals quickly, mood improvement often takes weeks. Researchers believe this delay may involve gradual changes in brain signaling and neural adaptation.`,
  },
  {
    title: "How do researchers measure something like \"mood\" in a study?",
    body: "How can you measure mood in a reliable way for research?",
    answer: `They use standardized questionnaires and rating scales completed by patients and clinicians. While these tools aren't perfect, they allow researchers to measure changes in a structured way.`,
  },
];

const CHRONIC_PAIN = [
  {
    title: "How do researchers measure pain in clinical trials?",
    body: "Pain is so subjective. How do trials measure it?",
    answer: null,
  },
  {
    title: "How do you test pain relief if pain is different for everyone?",
    body: "My pain isn't like anyone else's. How do studies account for that?",
    answer: `Most trials use standardized pain scales (like rating pain from 0–10). They also measure function, sleep, and quality of life. Combining multiple outcomes helps provide a fuller picture.`,
  },
  {
    title: "Why are some pain medications studied but never approved?",
    body: "I heard about a drug that did well in trials but wasn't approved. Why?",
    answer: `Some drugs may not show enough benefit compared to placebo, may have safety concerns, or may not demonstrate meaningful improvement in larger trials.`,
  },
];

const NUTRITION = [
  {
    title: "Why do nutrition studies often seem to contradict each other?",
    body: "One week coffee is good, the next it's bad. Why?",
    answer: null,
  },
  {
    title: "Every week there's a new diet study. Why do they always contradict each other?",
    body: "How do I know what to believe when studies conflict?",
    answer: `Many nutrition studies are observational, meaning they look at patterns rather than testing cause-and-effect. Differences in populations, reporting accuracy, and study design can lead to conflicting headlines.`,
  },
  {
    title: "How strong is the evidence behind supplements?",
    body: "Should I take supplements based on what I read?",
    answer: `It varies widely. Some supplements have strong randomized trial evidence. Others rely on small or observational studies. It's important to look for large, controlled trials rather than marketing claims.`,
  },
];

const CLINICAL_TRIALS = [
  {
    title: "What are the different phases of a clinical trial?",
    body: "What do Phase 1, 2, 3 mean?",
    answer: null,
  },
  {
    title: "Is it risky to join a clinical trial?",
    body: "I'm considering joining a trial. What are the risks?",
    answer: `All clinical trials follow strict safety protocols and ethical review. Risks vary depending on the study phase and treatment being tested. Participants are informed of potential risks before enrolling.`,
  },
  {
    title: "What does \"placebo-controlled\" actually mean?",
    body: "What does it mean when a study is placebo-controlled?",
    answer: `It means one group receives the treatment and another receives an inactive version (placebo). This helps researchers determine whether improvements are truly due to the treatment.`,
  },
];

const GENERAL_HEALTH = [
  {
    title: "What does it mean when a study shows correlation but not causation?",
    body: "I see \"linked to\" and \"associated with\" a lot. What's the difference from \"causes\"?",
    answer: null,
  },
  {
    title: "How can I tell if a study is trustworthy?",
    body: "What should I look for to know if a study is reliable?",
    answer: `Look for:

· Peer-reviewed publication
· Clear study design
· Adequate sample size
· Transparent funding disclosure
· Measured, not exaggerated, conclusions`,
  },
  {
    title: "What's the difference between a small study and a large one?",
    body: "Why does study size matter?",
    answer: `Larger studies generally provide more reliable results because they reduce the chance that findings occurred randomly. Small studies can be useful early on but often need confirmation.`,
  },
];

// Author assignment: mix of patient (question), researcher or forum helper (answer). One unanswered per category.
const CATEGORIES = [
  {
    slug: "cancer-support",
    name: "Cancer Support",
    threads: [
      { title: CANCER[0].title, body: CANCER[0].body, answer: null, unanswered: true },
      { title: CANCER[1].title, body: CANCER[1].body, answer: CANCER[1].answer },
      { title: CANCER[2].title, body: CANCER[2].body, answer: CANCER[2].answer },
    ],
  },
  {
    slug: "heart-health",
    name: "Heart & Cardiology",
    threads: [
      { title: HEART[0].title, body: HEART[0].body, answer: null, unanswered: true },
      { title: HEART[1].title, body: HEART[1].body, answer: HEART[1].answer },
      { title: HEART[2].title, body: HEART[2].body, answer: HEART[2].answer },
    ],
  },
  {
    slug: "neurology",
    name: "Neurology",
    threads: [
      { title: NEUROLOGY[0].title, body: NEUROLOGY[0].body, answer: null, unanswered: true },
      { title: NEUROLOGY[1].title, body: NEUROLOGY[1].body, answer: NEUROLOGY[1].answer },
      { title: NEUROLOGY[2].title, body: NEUROLOGY[2].body, answer: NEUROLOGY[2].answer },
    ],
  },
  {
    slug: "autoimmune-conditions",
    name: "Autoimmune Conditions",
    threads: [
      { title: AUTOIMMUNE[0].title, body: AUTOIMMUNE[0].body, answer: null, unanswered: true },
      { title: AUTOIMMUNE[1].title, body: AUTOIMMUNE[1].body, answer: AUTOIMMUNE[1].answer },
      { title: AUTOIMMUNE[2].title, body: AUTOIMMUNE[2].body, answer: AUTOIMMUNE[2].answer },
    ],
  },
  {
    slug: "diabetes-management",
    name: "Diabetes Management",
    threads: [
      { title: DIABETES[0].title, body: DIABETES[0].body, answer: null, unanswered: true },
      { title: DIABETES[1].title, body: DIABETES[1].body, answer: DIABETES[1].answer },
      { title: DIABETES[2].title, body: DIABETES[2].body, answer: DIABETES[2].answer },
    ],
  },
  {
    slug: "mental-health",
    name: "Mental Health",
    threads: [
      { title: MENTAL_HEALTH[0].title, body: MENTAL_HEALTH[0].body, answer: null, unanswered: true },
      { title: MENTAL_HEALTH[1].title, body: MENTAL_HEALTH[1].body, answer: MENTAL_HEALTH[1].answer },
      { title: MENTAL_HEALTH[2].title, body: MENTAL_HEALTH[2].body, answer: MENTAL_HEALTH[2].answer },
    ],
  },
  {
    slug: "chronic-pain",
    name: "Chronic Pain",
    threads: [
      { title: CHRONIC_PAIN[0].title, body: CHRONIC_PAIN[0].body, answer: null, unanswered: true },
      { title: CHRONIC_PAIN[1].title, body: CHRONIC_PAIN[1].body, answer: CHRONIC_PAIN[1].answer },
      { title: CHRONIC_PAIN[2].title, body: CHRONIC_PAIN[2].body, answer: CHRONIC_PAIN[2].answer },
    ],
  },
  {
    slug: "nutrition-diet",
    name: "Nutrition & Lifestyle",
    threads: [
      { title: NUTRITION[0].title, body: NUTRITION[0].body, answer: null, unanswered: true },
      { title: NUTRITION[1].title, body: NUTRITION[1].body, answer: NUTRITION[1].answer },
      { title: NUTRITION[2].title, body: NUTRITION[2].body, answer: NUTRITION[2].answer },
    ],
  },
  {
    slug: "clinical-trials",
    name: "Clinical Trials",
    threads: [
      { title: CLINICAL_TRIALS[0].title, body: CLINICAL_TRIALS[0].body, answer: null, unanswered: true },
      { title: CLINICAL_TRIALS[1].title, body: CLINICAL_TRIALS[1].body, answer: CLINICAL_TRIALS[1].answer },
      { title: CLINICAL_TRIALS[2].title, body: CLINICAL_TRIALS[2].body, answer: CLINICAL_TRIALS[2].answer },
    ],
  },
  {
    slug: "general-health",
    name: "General Health",
    threads: [
      { title: GENERAL_HEALTH[0].title, body: GENERAL_HEALTH[0].body, answer: null, unanswered: true },
      { title: GENERAL_HEALTH[1].title, body: GENERAL_HEALTH[1].body, answer: GENERAL_HEALTH[1].answer },
      { title: GENERAL_HEALTH[2].title, body: GENERAL_HEALTH[2].body, answer: GENERAL_HEALTH[2].answer },
    ],
  },
];

// Build thread list with randomized authors. Returns array of { slug, threadId, title, body, author, reply?, communityName }.
// Author: { id, username, handle, role }. Reply author same shape.
export function buildDummyThreadsForMerge(communities, selectedCommunitySlug = null) {
  patientIndex = 0;
  researcherIndex = 0;
  const now = new Date();
  const baseDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const result = [];
  const slugSet = selectedCommunitySlug ? new Set([selectedCommunitySlug]) : null;

  CATEGORIES.forEach((cat) => {
    if (slugSet && !slugSet.has(cat.slug)) return;
    const community = communities?.find((c) => (c.slug || "").toLowerCase() === cat.slug);
    const communityId = community ? { _id: community._id, name: community.name, slug: community.slug } : { _id: `dummy-community-${cat.slug}`, name: cat.name, slug: cat.slug };

    cat.threads.forEach((item, idx) => {
      const threadId = `dummy-thread-${cat.slug}-${idx}`;
      const questionAuthor = nextPatient();
      const reply = item.answer
        ? (() => {
            const useForumHelper = (cat.slug.length + idx) % 3 === 0;
            const answerAuthor = useForumHelper ? forumHelper() : nextResearcher();
            return {
              _id: `dummy-reply-${cat.slug}-${idx}`,
              body: item.answer,
              authorUserId: { _id: answerAuthor.id, username: answerAuthor.username, handle: answerAuthor.handle, role: answerAuthor.role },
              authorRole: answerAuthor.role,
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
        body: "", // Question is the title only; answer is in the reply
        authorUserId: { _id: questionAuthor.id, username: questionAuthor.username, handle: questionAuthor.handle, role: questionAuthor.role },
        authorRole: "patient",
        createdAt: new Date(baseDate.getTime() + idx * 24 * 60 * 60 * 1000).toISOString(),
        voteScore: 2 + (idx % 4),
        viewCount: 10 + idx * 5,
        replyCount: reply ? 1 : 0,
        hasResearcherReply: reply ? reply.authorRole === "researcher" || reply.authorUserId?._id === DUMMY_FORUM_HELPER_ID : false,
        onlyResearchersCanReply: false,
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

export function getDummyThreadDetails(threadId, threads) {
  if (!isDummyThreadId(threadId)) return null;
  const thread = threads.find((t) => t._id === threadId);
  if (!thread || !thread.isDummy) return null;
  return {
    ...thread,
    replies: thread.dummyReplies || [],
  };
}

/**
 * Build only the unanswered patient dummy threads (one per category) for the
 * Researcher Forums "Patient questions" section — so researchers see sample
 * questions waiting for reply.
 */
export function buildUnansweredPatientDummyThreadsForResearcher(communities) {
  patientIndex = 0;
  const baseDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const result = [];

  CATEGORIES.forEach((cat, catIdx) => {
    const item = cat.threads[0];
    if (!item || item.answer != null) return;
    const community = communities?.find((c) => (c.slug || "").toLowerCase() === cat.slug);
    const communityId = community
      ? { _id: community._id, name: community.name, slug: community.slug }
      : { _id: `dummy-community-${cat.slug}`, name: cat.name, slug: cat.slug };
    const questionAuthor = nextPatient();
    const threadId = `dummy-thread-${cat.slug}-0`;

    result.push({
      _id: threadId,
      communityId,
      title: item.title,
      body: item.body || "",
      authorUserId: { _id: questionAuthor.id, username: questionAuthor.username, handle: questionAuthor.handle, role: questionAuthor.role },
      authorRole: "patient",
      createdAt: new Date(baseDate.getTime() + catIdx * 24 * 60 * 60 * 1000).toISOString(),
      voteScore: 1,
      viewCount: 5 + catIdx,
      replyCount: 0,
      hasResearcherReply: false,
      onlyResearchersCanReply: true,
      upvotes: [],
      downvotes: [],
      tags: [cat.name],
      conditions: [],
      isDummy: true,
      dummyReplies: [],
    });
  });

  return result;
}
