import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Site colours: primary #2F3C96, secondary #253075, lavender #D0C4E2, #E8E0EF, #F5F2F8
const COLORS = {
  primary: "#2F3C96",
  primaryDark: "#253075",
  lavender: "#D0C4E2",
  lavenderLight: "#E8E0EF",
  lavenderBg: "#F5F2F8",
  lavenderBgAlt: "#EEF1FA",
  border: "#D0C4E2",
  borderLight: "rgba(208, 196, 226, 0.5)",
  text: "#2F3C96",
  textMuted: "#787878",
  textDark: "#253075",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    padding: 35,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: COLORS.white,
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-45deg)",
    fontSize: 48,
    color: COLORS.lavenderBgAlt,
    fontWeight: "bold",
    opacity: 0.4,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    paddingBottom: 15,
    borderBottom: `2px solid ${COLORS.primary}`,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "normal",
  },
  reportInfo: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: "right",
  },
  section: {
    marginBottom: 25,
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${COLORS.borderLight}`,
  },
  sectionHeader: {
    backgroundColor: COLORS.primary,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeaderText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 8,
  },
  sectionContent: {
    padding: 18,
    backgroundColor: COLORS.lavenderBg,
  },
  patientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  patientItem: {
    width: "48%",
    marginBottom: 8,
  },
  patientLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  patientValue: {
    fontSize: 10,
    color: COLORS.textDark,
    fontWeight: "semibold",
  },
  itemCard: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 6,
    border: `1px solid ${COLORS.borderLight}`,
    marginBottom: 20,
    boxShadow: "0 1px 3px rgba(47, 60, 150, 0.08)",
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.textDark,
    marginBottom: 6,
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  itemField: {
    width: "48%",
    marginBottom: 8,
  },
  label: {
    fontSize: 8,
    fontWeight: "bold",
    color: COLORS.textMuted,
    marginBottom: 1,
  },
  value: {
    fontSize: 9,
    color: COLORS.textDark,
    lineHeight: 1.3,
  },
  publicationItem: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 6,
    border: `1px solid ${COLORS.borderLight}`,
    marginBottom: 15,
  },
  publicationTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  trialEligibility: {
    backgroundColor: COLORS.lavenderBgAlt,
    padding: 12,
    borderRadius: 4,
    border: `1px solid ${COLORS.borderLight}`,
    marginTop: 10,
    marginBottom: 8,
  },
  eligibilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  eligibilityItem: {
    width: "48%",
  },
  list: {
    marginLeft: 15,
    marginTop: 4,
  },
  listItem: {
    fontSize: 8,
    color: COLORS.textDark,
    marginBottom: 2,
    lineHeight: 1.3,
  },
  notesSection: {
    backgroundColor: COLORS.lavenderBgAlt,
    padding: 15,
    borderRadius: 8,
    border: `1px solid ${COLORS.borderLight}`,
  },
  notesBox: {
    backgroundColor: COLORS.white,
    padding: 12,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    minHeight: 60,
    marginBottom: 10,
  },
  notesText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: COLORS.textMuted,
    borderTop: `1px solid ${COLORS.borderLight}`,
    paddingTop: 10,
  },
  footerMain: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 2,
  },
  badge: {
    backgroundColor: COLORS.primaryDark,
    color: COLORS.white,
    fontSize: 7,
    padding: "2px 6px",
    borderRadius: 10,
    marginLeft: 4,
  },
  iconContainer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 8,
    color: COLORS.primary,
    fontWeight: "bold",
  },
});

// Icons as text (since we can't use Lucide icons in PDF)
const Icons = {
  Patient: "👤",
  Expert: "👥",
  Publication: "📄",
  Trial: "🔬",
  Notes: "📝",
  Calendar: "📅",
  Location: "📍",
  Check: "✓",
};

// Helper component to render page header
const PageHeader = ({ report }) => (
  <>
    <Text style={styles.watermark}>collabiora AI</Text>
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.title}>Medical Research Summary Report</Text>
        <Text style={styles.subtitle}>
          collabiora- Personalized Medical Insights
        </Text>
      </View>
      <View style={styles.reportInfo}>
        <Text>
          Generated on {new Date(report.generatedAt).toLocaleDateString()}
        </Text>
        <Text>at {new Date(report.generatedAt).toLocaleTimeString()}</Text>
      </View>
    </View>
  </>
);

// Helper component to render section header
const SectionHeader = ({ icon, title, count, trialNumbers }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.iconContainer}>
      <Text style={styles.iconText}>{icon}</Text>
    </View>
    <Text style={styles.sectionHeaderText}>
      {title}
      {count !== undefined && <Text style={styles.badge}> {count}</Text>}
      {trialNumbers && trialNumbers.length > 0 && (
        <Text style={styles.badge}> ({trialNumbers.join(", ")})</Text>
      )}
    </Text>
  </View>
);

// Helper component to render footer
const PageFooter = ({ report, pageNumber, totalPages }) => (
  <View style={styles.footer}>
    <Text style={styles.footerMain}>
      collabiora - AI Powered Healthcare Platform
    </Text>
    <Text>Generated Summary Report • Confidential Medical Document</Text>
    <Text>
      Page {pageNumber} of {totalPages} •{" "}
      {new Date(report.generatedAt).toLocaleDateString()}
    </Text>
  </View>
);

/**
 * Enhanced PDF Report Document Component
 * Renders professional medical report with collabiora branding
 * Each publication, trial, and expert appears on its own page
 */
// Do not show Contact for global experts/collaborators (e.g. "Contact Request via CuraLink Admin")
function shouldShowExpertContact(expert) {
  if (!expert) return false;
  if (expert.isGlobalExpert === true) return false;
  const c = (expert.contact || "").trim();
  if (!c || c === "Not specified") return false;
  if (/curalink\s*admin|contact\s*request\s*via\s*curalink/i.test(c)) return false;
  return true;
}

export default function PDFReportDocument({ report, patientFacingLabels = false }) {
  if (!report) return null;
  const sectionTitles = patientFacingLabels
    ? { experts: "Health Experts", publications: "Health Library", trials: "New Treatments" }
    : { experts: "Medical Experts", publications: "Research Publications", trials: "Clinical Trials" };

  // Calculate total pages
  const totalPages =
    1 + // Patient context page (may include first item)
    Math.max(0, (report.experts?.length || 0) - 1) + // Remaining experts (first one on patient context page)
    Math.max(
      0,
      (report.publications?.length || 0) - (report.experts?.length > 0 ? 0 : 1)
    ) + // Remaining publications
    Math.max(
      0,
      (report.trials?.length || 0) -
        (report.experts?.length > 0 || report.publications?.length > 0 ? 0 : 1)
    ) + // Remaining trials
    1; // Doctor notes page

  // Determine which section has the first item
  const hasExperts = report.experts?.length > 0;
  const hasPublications = report.publications?.length > 0;
  const hasTrials = report.trials?.length > 0;
  const firstItemType = hasExperts
    ? "expert"
    : hasPublications
    ? "publication"
    : hasTrials
    ? "trial"
    : null;

  let currentPage = 1;

  return (
    <Document>
      {/* Page 1: Patient Context + First Item (if any) */}
      <Page size="A4" style={styles.page}>
        <PageHeader report={report} />
        <View style={styles.section}>
          <SectionHeader icon={Icons.Patient} title="Patient Context" />
          <View style={styles.sectionContent}>
            <View style={styles.patientGrid}>
              <View style={styles.patientItem}>
                <Text style={styles.patientLabel}>Patient Name</Text>
                <Text style={styles.patientValue}>
                  {report.patientContext?.name || "Not specified"}
                </Text>
              </View>
              <View style={styles.patientItem}>
                <Text style={styles.patientLabel}>Medical Condition</Text>
                <Text style={styles.patientValue}>
                  {report.patientContext?.condition || "Not specified"}
                </Text>
              </View>
              <View style={styles.patientItem}>
                <Text style={styles.patientLabel}>Location</Text>
                <Text style={styles.patientValue}>
                  {report.patientContext?.location || "Not specified"}
                </Text>
              </View>
              {report.patientContext?.keyConcerns?.length > 0 && (
                <View style={styles.patientItem}>
                  <Text style={styles.patientLabel}>Key Concerns</Text>
                  <Text style={styles.patientValue}>
                    {report.patientContext.keyConcerns.join(", ")}
                  </Text>
                </View>
              )}
              {report.patientContext?.interests?.length > 0 && (
                <View style={styles.patientItem}>
                  <Text style={styles.patientLabel}>Medical Interests</Text>
                  <Text style={styles.patientValue}>
                    {report.patientContext.interests.join(", ")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* First Expert on same page if exists */}
        {firstItemType === "expert" && report.experts?.[0] && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <SectionHeader
              icon={Icons.Expert}
              title={sectionTitles.experts}
              count={report.experts.length}
            />
            <View style={styles.sectionContent}>
              <View style={styles.itemCard}>
                <Text style={styles.itemTitle}>
                  {report.experts[0].name || "Unknown Expert"}
                </Text>
                <View style={styles.itemGrid}>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Affiliation</Text>
                    <Text style={styles.value}>
                      {report.experts[0].affiliation || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Specialty</Text>
                    <Text style={styles.value}>
                      {report.experts[0].specialty || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Key Expertise</Text>
                    <Text style={styles.value}>
                      {report.experts[0].keyExpertise || "Not specified"}
                    </Text>
                  </View>
                  {shouldShowExpertContact(report.experts[0]) && (
                    <View style={styles.itemField}>
                      <Text style={styles.label}>Contact</Text>
                      <Text style={styles.value}>
                        {report.experts[0].contact}
                      </Text>
                    </View>
                  )}
                </View>

                {report.experts[0].topPublications?.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.label}>Top Relevant Publications:</Text>
                    <View style={styles.list}>
                      {report.experts[0].topPublications.map((pub, pIdx) => (
                        <Text key={pIdx} style={styles.listItem}>
                          •{" "}
                          <Text style={{ fontWeight: "bold" }}>
                            {pub.title}
                          </Text>{" "}
                          ({pub.year}) – {pub.significance}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                <View style={{ marginTop: 10 }}>
                  <Text style={styles.label}>Relevance Assessment:</Text>
                  <Text style={styles.value}>
                    {report.experts[0].relevance || "Not specified"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* First Publication on same page if no experts */}
        {firstItemType === "publication" && report.publications?.[0] && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <SectionHeader
              icon={Icons.Publication}
              title={sectionTitles.publications}
              count={report.publications.length}
            />
            <View style={styles.sectionContent}>
              <View style={styles.publicationItem}>
                <Text style={styles.publicationTitle}>
                  {report.publications[0].title || "Untitled Publication"}
                  {report.publications[0].referenceNumber && (
                    <Text style={{ fontSize: 8, fontWeight: "normal", color: COLORS.textMuted }}>
                      {" "}[DOI: {report.publications[0].referenceNumber}]
                    </Text>
                  )}
                </Text>
                <View style={styles.itemGrid}>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Authors</Text>
                    <Text style={styles.value}>
                      {report.publications[0].authors || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Journal & Year</Text>
                    <Text style={styles.value}>
                      {report.publications[0].journal || "Not specified"} (
                      {report.publications[0].year || "N/A"})
                    </Text>
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Key Finding</Text>
                    <Text style={styles.value}>
                      {report.publications[0].keyFinding || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Evidence Level</Text>
                    <Text style={styles.value}>
                      {report.publications[0].evidenceLevel || "Not specified"}
                    </Text>
                  </View>
                </View>
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>Clinical Relevance:</Text>
                  <Text style={styles.value}>
                    {report.publications[0].clinicalRelevance ||
                      "Not specified"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* First Trial on same page if no experts or publications */}
        {firstItemType === "trial" && report.trials?.[0] && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <SectionHeader
              icon={Icons.Trial}
              title={sectionTitles.trials}
              count={report.trials.length}
              trialNumbers={report.trials.map(t => t.referenceNumber || t.trialNumber || t.id || t._id).filter(Boolean)}
            />
            <View style={styles.sectionContent}>
              <View style={styles.itemCard}>
                <Text style={styles.itemTitle}>
                  {report.trials[0].title || "Untitled Trial"}
                  {(report.trials[0].referenceNumber || report.trials[0].trialNumber || report.trials[0].id || report.trials[0]._id) && (
                    <Text style={{ fontSize: 8, fontWeight: "normal", color: COLORS.textMuted }}>
                      {" "}[NCT: {report.trials[0].referenceNumber || report.trials[0].trialNumber || report.trials[0].id || report.trials[0]._id}]
                    </Text>
                  )}
                </Text>

                <View style={styles.itemGrid}>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Trial Number</Text>
                    <Text style={styles.value}>
                      {report.trials[0].trialNumber || report.trials[0].id || report.trials[0]._id || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Phase</Text>
                    <Text style={styles.value}>
                      {report.trials[0].phase || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Status</Text>
                    <Text style={styles.value}>
                      {report.trials[0].status || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Condition</Text>
                    <Text style={styles.value}>
                      {report.trials[0].condition || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Location</Text>
                    <Text style={styles.value}>
                      {report.trials[0].location || "Not specified"}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>Intervention</Text>
                  <Text style={styles.value}>
                    {report.trials[0].intervention || "Not specified"}
                  </Text>
                </View>

                {report.trials[0].eligibilitySnapshot && (
                  <View style={styles.trialEligibility}>
                    <Text style={{ ...styles.label, marginBottom: 6 }}>
                      Eligibility Snapshot:
                    </Text>
                    <View style={styles.eligibilityGrid}>
                      <View style={styles.eligibilityItem}>
                        <Text style={styles.label}>Age Range</Text>
                        <Text style={styles.value}>
                          {report.trials[0].eligibilitySnapshot.age || "N/A"}
                        </Text>
                      </View>
                      <View style={styles.eligibilityItem}>
                        <Text style={styles.label}>Gender</Text>
                        <Text style={styles.value}>
                          {report.trials[0].eligibilitySnapshot.gender || "N/A"}
                        </Text>
                      </View>
                      <View style={styles.eligibilityItem}>
                        <Text style={styles.label}>Key Inclusion</Text>
                        <Text style={styles.value}>
                          {report.trials[0].eligibilitySnapshot.keyInclusion ||
                            "N/A"}
                        </Text>
                      </View>
                      <View style={styles.eligibilityItem}>
                        <Text style={styles.label}>Key Exclusion</Text>
                        <Text style={styles.value}>
                          {report.trials[0].eligibilitySnapshot.keyExclusion ||
                            "N/A"}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={{ marginTop: 10 }}>
                  <Text style={styles.label}>Study Goal:</Text>
                  <Text style={styles.value}>
                    {report.trials[0].goal || "Not specified"}
                  </Text>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>Patient Relevance:</Text>
                  <Text style={styles.value}>
                    {report.trials[0].relevance || "Not specified"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <PageFooter
          report={report}
          pageNumber={currentPage++}
          totalPages={totalPages}
        />
      </Page>

      {/* Remaining Experts - Each on its own page */}
      {report.experts?.slice(1).map((expert, idx) => (
        <Page key={`expert-${idx}`} size="A4" style={styles.page}>
          <PageHeader report={report} />
          <View style={styles.section}>
            <SectionHeader
              icon={Icons.Expert}
              title={sectionTitles.experts}
              count={report.experts.length}
            />
            <View style={styles.sectionContent}>
              <View style={styles.itemCard}>
                <Text style={styles.itemTitle}>
                  {expert.name || "Unknown Expert"}
                </Text>
                <View style={styles.itemGrid}>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Affiliation</Text>
                    <Text style={styles.value}>
                      {expert.affiliation || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Specialty</Text>
                    <Text style={styles.value}>
                      {expert.specialty || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.label}>Key Expertise</Text>
                    <Text style={styles.value}>
                      {expert.keyExpertise || "Not specified"}
                    </Text>
                  </View>
                  {shouldShowExpertContact(expert) && (
                    <View style={styles.itemField}>
                      <Text style={styles.label}>Contact</Text>
                      <Text style={styles.value}>
                        {expert.contact}
                      </Text>
                    </View>
                  )}
                </View>

                {expert.topPublications?.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.label}>Top Relevant Publications:</Text>
                    <View style={styles.list}>
                      {expert.topPublications.map((pub, pIdx) => (
                        <Text key={pIdx} style={styles.listItem}>
                          •{" "}
                          <Text style={{ fontWeight: "bold" }}>
                            {pub.title}
                          </Text>{" "}
                          ({pub.year}) – {pub.significance}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                <View style={{ marginTop: 10 }}>
                  <Text style={styles.label}>Relevance Assessment:</Text>
                  <Text style={styles.value}>
                    {expert.relevance || "Not specified"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <PageFooter
            report={report}
            pageNumber={currentPage++}
            totalPages={totalPages}
          />
        </Page>
      ))}

      {/* Remaining Publications - Each on its own page */}
      {report.publications
        ?.slice(firstItemType === "publication" ? 1 : 0)
        .map((pub, idx) => (
          <Page key={`pub-${idx}`} size="A4" style={styles.page}>
            <PageHeader report={report} />
            <View style={styles.section}>
              <SectionHeader
                icon={Icons.Publication}
                title={sectionTitles.publications}
                count={report.publications.length}
              />
              <View style={styles.sectionContent}>
                <View style={styles.publicationItem}>
                  <Text style={styles.publicationTitle}>
                    {pub.title || "Untitled Publication"}
                    {pub.referenceNumber && (
                      <Text style={{ fontSize: 8, fontWeight: "normal", color: COLORS.textMuted }}>
                        {" "}[DOI: {pub.referenceNumber}]
                      </Text>
                    )}
                  </Text>
                  <View style={styles.itemGrid}>
                    <View style={styles.itemField}>
                      <Text style={styles.label}>Authors</Text>
                      <Text style={styles.value}>
                        {pub.authors || "Not specified"}
                      </Text>
                    </View>
                    <View style={styles.itemField}>
                      <Text style={styles.label}>Journal & Year</Text>
                      <Text style={styles.value}>
                        {pub.journal || "Not specified"} ({pub.year || "N/A"})
                      </Text>
                    </View>
                    <View style={styles.itemField}>
                      <Text style={styles.label}>Key Finding</Text>
                      <Text style={styles.value}>
                        {pub.keyFinding || "Not specified"}
                      </Text>
                    </View>
                    <View style={styles.itemField}>
                      <Text style={styles.label}>Evidence Level</Text>
                      <Text style={styles.value}>
                        {pub.evidenceLevel || "Not specified"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.label}>Clinical Relevance:</Text>
                    <Text style={styles.value}>
                      {pub.clinicalRelevance || "Not specified"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <PageFooter
              report={report}
              pageNumber={currentPage++}
              totalPages={totalPages}
            />
          </Page>
        ))}

      {/* Remaining Clinical Trials - Each on its own page */}
      {report.trials
        ?.slice(firstItemType === "trial" ? 1 : 0)
        .map((trial, idx) => (
          <Page key={`trial-${idx}`} size="A4" style={styles.page}>
            <PageHeader report={report} />
            <View style={styles.section}>
              <SectionHeader
                icon={Icons.Trial}
                title={sectionTitles.trials}
                count={report.trials.length}
                trialNumbers={report.trials.map(t => t.referenceNumber || t.trialNumber || t.id || t._id).filter(Boolean)}
              />
              <View style={styles.sectionContent}>
                <View style={styles.itemCard}>
                  <Text style={styles.itemTitle}>
                    {trial.title || "Untitled Trial"}
                    {(trial.referenceNumber || trial.trialNumber || trial.id || trial._id) && (
                      <Text style={{ fontSize: 8, fontWeight: "normal", color: COLORS.textMuted }}>
                        {" "}[NCT: {trial.referenceNumber || trial.trialNumber || trial.id || trial._id}]
                      </Text>
                    )}
                  </Text>

                  <View style={styles.itemGrid}>
                    <View style={styles.itemField}>
                      <Text style={styles.label}>Trial Number</Text>
                      <Text style={styles.value}>
                        {trial.trialNumber || trial.id || trial._id || "Not specified"}
                      </Text>
                    </View>
                    <View style={styles.itemField}>
                      <Text style={styles.label}>Phase</Text>
                      <Text style={styles.value}>
                        {trial.phase || "Not specified"}
                      </Text>
                    </View>
                    <View style={styles.itemField}>
                      <Text style={styles.label}>Status</Text>
                      <Text style={styles.value}>
                        {trial.status || "Not specified"}
                      </Text>
                    </View>
                    <View style={styles.itemField}>
                      <Text style={styles.label}>Condition</Text>
                      <Text style={styles.value}>
                        {trial.condition || "Not specified"}
                      </Text>
                    </View>
                    <View style={styles.itemField}>
                      <Text style={styles.label}>Location</Text>
                      <Text style={styles.value}>
                        {trial.location || "Not specified"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.label}>Intervention</Text>
                    <Text style={styles.value}>
                      {trial.intervention || "Not specified"}
                    </Text>
                  </View>

                  {trial.eligibilitySnapshot && (
                    <View style={styles.trialEligibility}>
                      <Text style={{ ...styles.label, marginBottom: 6 }}>
                        Eligibility Snapshot:
                      </Text>
                      <View style={styles.eligibilityGrid}>
                        <View style={styles.eligibilityItem}>
                          <Text style={styles.label}>Age Range</Text>
                          <Text style={styles.value}>
                            {trial.eligibilitySnapshot.age || "N/A"}
                          </Text>
                        </View>
                        <View style={styles.eligibilityItem}>
                          <Text style={styles.label}>Gender</Text>
                          <Text style={styles.value}>
                            {trial.eligibilitySnapshot.gender || "N/A"}
                          </Text>
                        </View>
                        <View style={styles.eligibilityItem}>
                          <Text style={styles.label}>Key Inclusion</Text>
                          <Text style={styles.value}>
                            {trial.eligibilitySnapshot.keyInclusion || "N/A"}
                          </Text>
                        </View>
                        <View style={styles.eligibilityItem}>
                          <Text style={styles.label}>Key Exclusion</Text>
                          <Text style={styles.value}>
                            {trial.eligibilitySnapshot.keyExclusion || "N/A"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.label}>Study Goal:</Text>
                    <Text style={styles.value}>
                      {trial.goal || "Not specified"}
                    </Text>
                  </View>

                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.label}>Patient Relevance:</Text>
                    <Text style={styles.value}>
                      {trial.relevance || "Not specified"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <PageFooter
              report={report}
              pageNumber={currentPage++}
              totalPages={totalPages}
            />
          </Page>
        ))}

      {/* Last Page: Doctor Notes */}
      <Page size="A4" style={styles.page}>
        <PageHeader report={report} />
        <View style={styles.section}>
          <SectionHeader
            icon={Icons.Notes}
            title="Clinical Notes & Recommendations"
          />
          <View style={styles.notesSection}>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>
                [Space for clinical assessment and treatment recommendations]
              </Text>
            </View>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>
                [Additional notes on patient management and follow-up]
              </Text>
            </View>
          </View>
        </View>
        <PageFooter
          report={report}
          pageNumber={currentPage}
          totalPages={totalPages}
        />
      </Page>
    </Document>
  );
}
