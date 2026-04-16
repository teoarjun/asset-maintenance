import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

export default function NewTask() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [machineryLabel, setMachineryLabel] = useState("");
  const [reporterId, setReporterId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.role === "TECHNICIAN") {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setBusy(true);
    try {
      const body: {
        title: string;
        description: string;
        machineryLabel?: string;
        reporterId?: number;
      } = {
        title,
        description,
        machineryLabel: machineryLabel || undefined,
      };
      if (user.role === "MANAGER" && reporterId !== "") {
        body.reporterId = Number(reporterId);
      }
      const task = await api.createTask(body);
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return <div className="muted">Loading…</div>;
  }

  return (
    <div className="page narrow">
      <h1>Report machinery issue</h1>
      <form className="card form" onSubmit={onSubmit}>
        {error && <div className="error-banner">{error}</div>}
        {user.role === "MANAGER" && (
          <label>
            Reporter user ID (optional)
            <input
              type="number"
              min={1}
              placeholder="Defaults to a seeded user if empty"
              value={reporterId}
              onChange={(e) => setReporterId(e.target.value)}
            />
            <span className="muted small">
              Leave empty to default to user id 1 if present, or set explicitly.
            </span>
          </label>
        )}
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Description
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label>
          Machinery / asset label
          <input
            value={machineryLabel}
            onChange={(e) => setMachineryLabel(e.target.value)}
            placeholder="e.g. Line 3 — hydraulic press"
          />
        </label>
        <div className="actions">
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Submitting…" : "Create task"}
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
