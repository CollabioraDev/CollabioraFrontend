import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";

export default function ManageTrials() {
  const { t } = useTranslation("common");
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [list, setList] = useState([]);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [phase, setPhase] = useState("");
  const [location, setLocation] = useState("");
  const [eligibility, setEligibility] = useState("");

  async function load() {
    const qs = new URLSearchParams();
    if (user?._id || user?.id) qs.set("ownerResearcherId", user._id || user.id);
    const data = await fetch(`${base}/api/trials?${qs.toString()}`).then((r) =>
      r.json()
    );
    setList(data.trials || []);
  }

  async function createTrial() {
    const payload = {
      ownerResearcherId: user._id || user.id,
      title,
      status,
      phase,
      location,
      eligibility,
    };
    await fetch(`${base}/api/trials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setTitle("");
    setStatus("");
    setPhase("");
    setLocation("");
    setEligibility("");
    load();
  }

  async function updateTrial(id, field, value) {
    const body = { [field]: value };
    await fetch(`${base}/api/trials/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      <h2 className="text-2xl font-semibold text-orange-700 mb-4">
        {t("manageTrials.heading")}
      </h2>
      <div className="grid md:grid-cols-6 gap-3 mb-6">
        <div className="md:col-span-2">
          <Input
            placeholder={t("manageTrials.placeholderTitle")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <Input
          placeholder={t("manageTrials.placeholderStatus")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <Input
          placeholder={t("manageTrials.placeholderPhase")}
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
        />
        <Input
          placeholder={t("manageTrials.placeholderLocation")}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Input
          placeholder={t("manageTrials.placeholderEligibility")}
          value={eligibility}
          onChange={(e) => setEligibility(e.target.value)}
        />
        <Button onClick={createTrial}>{t("manageTrials.add")}</Button>
      </div>
      <div className="space-y-3">
        {list.map((trial) => (
          <Card
            key={trial._id}
            title={trial.title}
            subtitle={`${trial.status || ""} ${trial.phase ? "• " + trial.phase : ""}`}
          >
            <div className="grid md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="label">{t("manageTrials.labelStatus")}</label>
                <Input
                  value={trial.status || ""}
                  onChange={(e) => updateTrial(trial._id, "status", e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t("manageTrials.labelPhase")}</label>
                <Input
                  value={trial.phase || ""}
                  onChange={(e) => updateTrial(trial._id, "phase", e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t("manageTrials.labelLocation")}</label>
                <Input
                  value={trial.location || ""}
                  onChange={(e) =>
                    updateTrial(trial._id, "location", e.target.value)
                  }
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
