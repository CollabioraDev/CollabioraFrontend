import React, { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

export default function SubmitWorkModal({ isOpen, onClose, baseUrl, token }) {
  const [type, setType] = useState("publication");
  const [submitting, setSubmitting] = useState(false);

  const [publication, setPublication] = useState({
    title: "",
    year: "",
    journal: "",
    doi: "",
    pmid: "",
    link: "",
    authors: "",
  });

  const [trial, setTrial] = useState({
    title: "",
    trialStatus: "",
    phase: "",
    location: "",
    eligibility: "",
    description: "",
  });

  if (!isOpen) return null;

  const resetForm = () => {
    setType("publication");
    setPublication({
      title: "",
      year: "",
      journal: "",
      doi: "",
      pmid: "",
      link: "",
      authors: "",
    });
    setTrial({
      title: "",
      trialStatus: "",
      phase: "",
      location: "",
      eligibility: "",
      description: "",
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const payload =
      type === "publication"
        ? {
            type,
            title: publication.title.trim(),
            year: publication.year ? Number(publication.year) : undefined,
            journal: publication.journal.trim(),
            doi: publication.doi.trim(),
            pmid: publication.pmid.trim(),
            link: publication.link.trim(),
            authors: publication.authors
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean),
            source: "manual",
          }
        : {
            type,
            title: trial.title.trim(),
            trialStatus: trial.trialStatus.trim(),
            phase: trial.phase.trim(),
            location: trial.location.trim(),
            eligibility: trial.eligibility.trim(),
            description: trial.description.trim(),
          };

    if (!payload.title) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/work-submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit work");
      toast.success("Submitted for admin verification");
      handleClose();
    } catch (error) {
      toast.error(error.message || "Could not submit work");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Submit your work for profile display
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Your submission will be reviewed by admin before it appears publicly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("publication")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                type === "publication"
                  ? "bg-[#2F3C96] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Publication
            </button>
            <button
              type="button"
              onClick={() => setType("trial")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                type === "trial"
                  ? "bg-[#2F3C96] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Trial
            </button>
          </div>

          {type === "publication" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={publication.title}
                onChange={(e) =>
                  setPublication((p) => ({ ...p, title: e.target.value }))
                }
                className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Publication title *"
              />
              <input
                value={publication.year}
                onChange={(e) =>
                  setPublication((p) => ({ ...p, year: e.target.value }))
                }
                className="px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Year"
              />
              <input
                value={publication.journal}
                onChange={(e) =>
                  setPublication((p) => ({ ...p, journal: e.target.value }))
                }
                className="px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Journal"
              />
              <input
                value={publication.doi}
                onChange={(e) =>
                  setPublication((p) => ({ ...p, doi: e.target.value }))
                }
                className="px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="DOI"
              />
              <input
                value={publication.pmid}
                onChange={(e) =>
                  setPublication((p) => ({ ...p, pmid: e.target.value }))
                }
                className="px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="PMID"
              />
              <input
                value={publication.link}
                onChange={(e) =>
                  setPublication((p) => ({ ...p, link: e.target.value }))
                }
                className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Publication link"
              />
              <input
                value={publication.authors}
                onChange={(e) =>
                  setPublication((p) => ({ ...p, authors: e.target.value }))
                }
                className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Authors (comma separated)"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={trial.title}
                onChange={(e) => setTrial((p) => ({ ...p, title: e.target.value }))}
                className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Trial title *"
              />
              <input
                value={trial.trialStatus}
                onChange={(e) =>
                  setTrial((p) => ({ ...p, trialStatus: e.target.value }))
                }
                className="px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Status"
              />
              <input
                value={trial.phase}
                onChange={(e) => setTrial((p) => ({ ...p, phase: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Phase"
              />
              <input
                value={trial.location}
                onChange={(e) => setTrial((p) => ({ ...p, location: e.target.value }))}
                className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Location"
              />
              <textarea
                value={trial.eligibility}
                onChange={(e) =>
                  setTrial((p) => ({ ...p, eligibility: e.target.value }))
                }
                className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg min-h-[80px]"
                placeholder="Eligibility"
              />
              <textarea
                value={trial.description}
                onChange={(e) =>
                  setTrial((p) => ({ ...p, description: e.target.value }))
                }
                className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg min-h-[100px]"
                placeholder="Description"
              />
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-[#2F3C96] text-white font-semibold disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit for review"}
          </button>
        </div>
      </div>
    </div>
  );
}
