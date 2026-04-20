import React, { useState, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  Heart,
  Info,
  ListChecks,
  Loader2,
  MapPin,
  TrendingUp,
  User,
} from "lucide-react";
import Modal from "../ui/Modal.jsx";
import { getPublicationPath } from "../../utils/publicationRouting.js";
import { formatPublicationDateLine } from "../../utils/formatPublicationDate.js";

function normalizeKeywordList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string")
    return val
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

function normalizeTypeList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") return [val];
  return [];
}

function formatAuthorsLine(authors) {
  if (!authors) return "";
  if (Array.isArray(authors)) return authors.join(", ");
  return String(authors);
}

function authorsArrayLen(authors) {
  if (!authors) return 0;
  if (Array.isArray(authors)) return authors.length;
  return authors ? 1 : 0;
}

function PublicationKeyInsightsModal({
  isOpen,
  onClose,
  publication,
  loading,
  userId,
  userRole = "patient",
  onAddToFavorites,
}) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [savingFav, setSavingFav] = useState(false);

  const displayTitle = useMemo(
    () =>
      userRole === "patient" && publication?.simplifiedTitle
        ? publication.simplifiedTitle
        : publication?.title,
    [userRole, publication?.simplifiedTitle, publication?.title],
  );

  const keywordsList = useMemo(
    () => normalizeKeywordList(publication?.keywords),
    [publication?.keywords],
  );
  const meshList = useMemo(
    () => normalizeKeywordList(publication?.meshTerms),
    [publication?.meshTerms],
  );
  const typesList = useMemo(
    () => normalizeTypeList(publication?.publicationTypes),
    [publication?.publicationTypes],
  );
  const authorsLine = useMemo(
    () => formatAuthorsLine(publication?.authors),
    [publication?.authors],
  );
  const authorsCount = useMemo(
    () => authorsArrayLen(publication?.authors),
    [publication?.authors],
  );

  const handleViewFullPublication = () => {
    if (!publication) return;
    onClose();
    const route = getPublicationPath(publication);
    if (route) navigate(route);
    else if (publication.url) window.open(publication.url, "_blank", "noopener,noreferrer");
  };

  const handleAddToFavorites = async () => {
    if (!onAddToFavorites || !publication || !userId) return;
    setSavingFav(true);
    try {
      await onAddToFavorites("publication", {
        id: publication.pmid || publication.id,
        pmid: publication.pmid,
        title: publication.title,
        simplifiedTitle: publication.simplifiedTitle,
        authors: publication.authors,
        journal: publication.journal,
        year: publication.year,
        abstract: publication.abstract,
        url: publication.url,
      });
    } finally {
      setSavingFav(false);
    }
  };

  const showViewFull =
    publication &&
    (getPublicationPath(publication) || publication.url);

  const hasPublicationMetaBlock =
    publication &&
    (publication.year ||
      publication.month ||
      publication.volume ||
      publication.issue ||
      publication.Pages ||
      publication.language);

  const hasActionButtons = Boolean(
    publication &&
      (showViewFull || (userId && onAddToFavorites)),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("publications.modalDetailsTitle")}
      maxWidthClassName="max-w-2xl"
      performance
      footer={
        !loading && hasActionButtons ? (
          <div className="flex flex-wrap gap-3">
            {showViewFull && (
              <button
                type="button"
                onClick={handleViewFullPublication}
                className="flex-1 min-w-0 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                style={{
                  background: "linear-gradient(135deg, #2F3C96, #253075)",
                }}
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                {t("publications.viewFullPublication")}
              </button>
            )}
            {userId && onAddToFavorites && (
              <button
                type="button"
                onClick={handleAddToFavorites}
                disabled={savingFav}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border shadow-sm hover:shadow-md disabled:opacity-50"
                style={{
                  backgroundColor: "rgba(208, 196, 226, 0.2)",
                  borderColor: "rgba(208, 196, 226, 0.3)",
                  color: "#787878",
                }}
              >
                {savingFav ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Heart className="w-4 h-4" />
                )}
                {savingFav
                  ? t("publications.processing")
                  : t("publications.addToFavorites")}
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "#2F3C96" }}
          />
          <span className="ml-3 text-sm" style={{ color: "#787878" }}>
            {t("publications.loadingDetails")}
          </span>
        </div>
      ) : (
        publication && (
            <div className="space-y-6">
              <div
                className="pb-4 border-b"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h3
                  className="text-xl font-bold mb-3 leading-tight"
                  style={{ color: "#2F3C96" }}
                >
                  {displayTitle}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {publication.pmid && (
                    <span
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border"
                      style={{
                        backgroundColor: "rgba(47, 60, 150, 0.15)",
                        color: "#2F3C96",
                        borderColor: "rgba(47, 60, 150, 0.3)",
                      }}
                    >
                      <FileText className="w-3 h-3 mr-1.5" />
                      PMID: {publication.pmid}
                    </span>
                  )}
                  {publication.journal && (
                    <span
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border"
                      style={{
                        backgroundColor: "rgba(208, 196, 226, 0.2)",
                        color: "#787878",
                        borderColor: "rgba(208, 196, 226, 0.3)",
                      }}
                    >
                      <BookOpen className="w-3 h-3 mr-1.5" />
                      {publication.journal}
                    </span>
                  )}
                </div>
              </div>

              {(publication.simplifiedDetails?.abstract || publication.abstract) && (
                <div>
                  <div
                    className="rounded-xl p-5 border"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(208, 196, 226, 0.2), rgba(232, 224, 239, 0.2))",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                  >
                    <h4
                      className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                      style={{ color: "#2F3C96" }}
                    >
                      <Info className="w-4 h-4" />
                      {t("publications.abstract")}
                    </h4>
                    <p
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      style={{ color: "#787878" }}
                    >
                      {publication.simplifiedDetails?.abstract ||
                        publication.abstract}
                    </p>
                  </div>
                </div>
              )}

              {publication.simplifiedDetails?.methods && (
                <div>
                  <div
                    className="bg-white rounded-xl p-5 border shadow-sm"
                    style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                  >
                    <h4
                      className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                      style={{ color: "#2F3C96" }}
                    >
                      <ListChecks className="w-4 h-4" />
                      {t("publications.methods")}
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {publication.simplifiedDetails.methods}
                    </p>
                  </div>
                </div>
              )}

              {publication.simplifiedDetails?.results && (
                <div>
                  <div
                    className="bg-white rounded-xl p-5 border shadow-sm"
                    style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                  >
                    <h4
                      className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                      style={{ color: "#2F3C96" }}
                    >
                      <TrendingUp className="w-4 h-4" />
                      {t("publications.results")}
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {publication.simplifiedDetails.results}
                    </p>
                  </div>
                </div>
              )}

              {publication.simplifiedDetails?.conclusion && (
                <div>
                  <div
                    className="bg-white rounded-xl p-5 border shadow-sm"
                    style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                  >
                    <h4
                      className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                      style={{ color: "#2F3C96" }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {t("publications.conclusion")}
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {publication.simplifiedDetails.conclusion}
                    </p>
                  </div>
                </div>
              )}

              {publication.simplifiedDetails?.keyTakeaways?.length > 0 && (
                <div>
                  <div
                    className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(232, 224, 239, 0.4), rgba(245, 242, 248, 0.6))",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                  >
                    <h4
                      className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                      style={{ color: "#2F3C96" }}
                    >
                      <AlertCircle className="w-4 h-4" />
                      {t("publications.keyTakeaways")}
                    </h4>
                    <ul className="space-y-2">
                      {publication.simplifiedDetails.keyTakeaways.map(
                        (takeaway, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm"
                            style={{ color: "#787878" }}
                          >
                            <span
                              className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: "#2F3C96" }}
                            />
                            <span>{takeaway}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {authorsLine && (
                <div>
                  <div
                    className="bg-white rounded-xl p-5 border shadow-sm"
                    style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                  >
                    <h4
                      className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                      style={{ color: "#2F3C96" }}
                    >
                      <User className="w-4 h-4" />
                      {t("publications.authors")}
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {authorsLine}
                    </p>
                    {authorsCount > 1 && (
                      <p className="text-xs mt-2" style={{ color: "#787878" }}>
                        {t("publications.authorsCount", { count: authorsCount })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {hasPublicationMetaBlock && (
              <div>
                <div
                  className="bg-white rounded-xl p-5 border shadow-sm"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <h4
                    className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"
                    style={{ color: "#2F3C96" }}
                  >
                    <Calendar className="w-4 h-4" />
                    {t("publications.publicationInformation")}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(publication.year || publication.month) && (
                      <div
                        className="rounded-lg p-3 border"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.1)",
                          borderColor: "rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Calendar
                            className="w-3.5 h-3.5"
                            style={{ color: "#787878" }}
                          />
                          <span
                            className="text-xs font-medium uppercase tracking-wide"
                            style={{ color: "#787878" }}
                          >
                            {t("publications.published")}
                          </span>
                        </div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "#2F3C96" }}
                        >
                          {formatPublicationDateLine(
                            publication.month,
                            publication.year,
                            publication.day,
                          )}
                        </p>
                      </div>
                    )}

                    {(publication.volume || publication.issue) && (
                      <div
                        className="rounded-lg p-3 border"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.1)",
                          borderColor: "rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <BookOpen
                            className="w-3.5 h-3.5"
                            style={{ color: "#787878" }}
                          />
                          <span
                            className="text-xs font-medium uppercase tracking-wide"
                            style={{ color: "#787878" }}
                          >
                            Volume / Issue
                          </span>
                        </div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "#2F3C96" }}
                        >
                          {publication.volume || "N/A"}
                          {publication.issue
                            ? ` (Issue ${publication.issue})`
                            : ""}
                        </p>
                      </div>
                    )}

                    {publication.Pages && (
                      <div
                        className="rounded-lg p-3 border"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.1)",
                          borderColor: "rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <FileText
                            className="w-3.5 h-3.5"
                            style={{ color: "#787878" }}
                          />
                          <span
                            className="text-xs font-medium uppercase tracking-wide"
                            style={{ color: "#787878" }}
                          >
                            Pages
                          </span>
                        </div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "#2F3C96" }}
                        >
                          {publication.Pages}
                        </p>
                      </div>
                    )}

                    {publication.language && (
                      <div
                        className="rounded-lg p-3 border"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.1)",
                          borderColor: "rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-xs font-medium uppercase tracking-wide"
                            style={{ color: "#787878" }}
                          >
                            Language
                          </span>
                        </div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "#2F3C96" }}
                        >
                          {publication.language}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}

              {keywordsList.length > 0 && (
                <div>
                  <div
                    className="bg-white rounded-xl p-5 border shadow-sm"
                    style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                  >
                    <h4
                      className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                      style={{ color: "#2F3C96" }}
                    >
                      <TrendingUp className="w-4 h-4" />
                      {t("publications.keywords")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {keywordsList.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border"
                          style={{
                            backgroundColor: "rgba(47, 60, 150, 0.15)",
                            color: "#2F3C96",
                            borderColor: "rgba(47, 60, 150, 0.3)",
                          }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {meshList.length > 0 && (
                <div>
                  <div
                    className="bg-white rounded-xl p-5 border shadow-sm"
                    style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                  >
                    <h4
                      className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                      style={{ color: "#2F3C96" }}
                    >
                      <Info className="w-4 h-4" />
                      MeSH Terms
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {meshList.slice(0, 10).map((term, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.2)",
                            color: "#787878",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          {term}
                        </span>
                      ))}
                      {meshList.length > 10 && (
                        <span
                          className="px-3 py-1.5 text-xs"
                          style={{ color: "#787878" }}
                        >
                          +{meshList.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {publication.affiliations?.length > 0 && (
                <div>
                  <div
                    className="bg-white rounded-xl p-5 border shadow-sm"
                    style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                  >
                    <h4
                      className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                      style={{ color: "#2F3C96" }}
                    >
                      <MapPin className="w-4 h-4" />
                      {t("publications.affiliation")}
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {publication.affiliations[0]}
                    </p>
                  </div>
                </div>
              )}

              {typesList.length > 0 && (
                <div>
                  <div
                    className="bg-white rounded-xl p-5 border shadow-sm"
                    style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                  >
                    <h4
                      className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                      style={{ color: "#2F3C96" }}
                    >
                      <FileText className="w-4 h-4" />
                      {t("publications.publicationType")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {typesList.map((pt, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.2)",
                            color: "#787878",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          {pt}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
        )
      )}
    </Modal>
  );
}

export default memo(PublicationKeyInsightsModal);
