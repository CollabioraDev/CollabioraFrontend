import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  ExternalLink,
  X,
} from "lucide-react";

const VISIBLE_INITIAL = 10;

export default function ManageProfilePublications({
  isOpen,
  onClose,
  baseUrl,
  token,
  existingSelected = [],
  onSaved,
}) {
  const [publications, setPublications] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [expandedCount, setExpandedCount] = useState(VISIBLE_INITIAL);

  const getPubKey = (p) => p.doi || p.pmid || p.openalexId || p.orcidWorkId || p.title;

  // Initialize selectedIds from existingSelected when modal opens
  useEffect(() => {
    if (isOpen) {
      const ids = new Set();
      (existingSelected || []).forEach((p) => {
        const id = getPubKey(p);
        if (id) ids.add(id);
      });
      setSelectedIds(ids);
      setExpandedCount(VISIBLE_INITIAL);
    }
  }, [isOpen, existingSelected]);

  async function handleFetch() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${baseUrl}/api/profile/publications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch publications");
      setPublications(data.publications || []);
      // Pre-select those already in existingSelected
      const ids = new Set();
      (existingSelected || []).forEach((p) => {
        const id = getPubKey(p);
        if (id) ids.add(id);
      });
      (data.publications || []).forEach((p) => {
        const id = getPubKey(p);
        if (id && existingSelected?.some((e) => getPubKey(e) === id)) ids.add(id);
      });
      setSelectedIds(ids);
    } catch (err) {
      setFetchError(err.message);
      setPublications([]);
    } finally {
      setLoading(false);
    }
  }

  function togglePublication(pub) {
    const id = getPubKey(pub);
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    const ids = new Set(publications.map((p) => getPubKey(p)).filter(Boolean));
    setSelectedIds(ids);
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  async function handleSave() {
    const selected = publications.filter((p) => {
      const id = getPubKey(p);
      return id && selectedIds.has(id);
    });
    setSaving(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userData?._id || userData?.id;
      const res = await fetch(`${baseUrl}/api/profile/${userId}/selected-publications`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedPublications: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      onSaved?.(selected);
      onClose();
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const visiblePubs = publications.slice(0, expandedCount);
  const hasMore = publications.length > expandedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#2F3C96]" />
            <h2 className="text-lg font-semibold text-slate-800">Select publications to display on your profile</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <p className="text-sm text-slate-600 mb-3">
            Publications are fetched from ORCID and OpenAlex (exact match by your ORCID). Choose which ones to show when patients or researchers visit your profile. Source is shown for each publication.
          </p>
          {!publications.length && !loading && (
            <button
              type="button"
              onClick={handleFetch}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2F3C96] text-white rounded-lg font-medium hover:bg-[#253075] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  Fetch my publications
                </>
              )}
            </button>
          )}
          {publications.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleFetch}
                disabled={loading}
                className="text-sm text-[#2F3C96] hover:underline disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh list"}
              </button>
              <span className="text-slate-400">|</span>
              <button type="button" onClick={selectAll} className="text-sm text-[#2F3C96] hover:underline">
                Select all
              </button>
              <button type="button" onClick={selectNone} className="text-sm text-[#2F3C96] hover:underline">
                Select none
              </button>
            </div>
          )}
          {fetchError && (
            <p className="mt-2 text-sm text-red-600">{fetchError}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[200px]">
          {loading && !publications.length ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#2F3C96]" />
            </div>
          ) : publications.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Add your ORCID in your profile first, then click &quot;Fetch my publications&quot;.
            </div>
          ) : (
            <div className="space-y-2">
              {visiblePubs.map((pub, idx) => {
                const id = getPubKey(pub) || idx;
                const isSelected = id && selectedIds.has(id);
                return (
                  <label
                    key={id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? "bg-[#2F3C96]/5 border-[#2F3C96]/30" : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={() => togglePublication(pub)}
                      className="mt-1 w-4 h-4 text-[#2F3C96 border-slate-300 rounded focus:ring-[#2F3C96]"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-slate-800 line-clamp-2">{pub.title || "Untitled"}</span>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                        {pub.year && <span>{pub.year}</span>}
                        {pub.journal && <span>{pub.journal}</span>}
                        {pub.authors?.length > 0 && (
                          <span className="truncate">{pub.authors.slice(0, 3).join(", ")}{pub.authors.length > 3 ? " et al." : ""}</span>
                        )}
                        {pub.source && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium" title="Source">
                            {pub.source}
                          </span>
                        )}
                      </div>
                      {pub.link && (
                        <a
                          href={pub.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-xs text-[#2F3C96] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-[#2F3C96] shrink-0" />
                    )}
                  </label>
                );
              })}
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setExpandedCount((c) => c + 20)}
                  className="w-full py-2 flex items-center justify-center gap-1 text-sm text-[#2F3C96] hover:bg-slate-50 rounded-lg"
                >
                  <ChevronDown className="w-4 h-4" />
                  Show more ({publications.length - expandedCount} remaining)
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !publications.length}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#2F3C96] text-white rounded-lg font-medium hover:bg-[#253075] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save ({selectedIds.size} selected)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
