import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import type { Task } from "../types";

type TechOption = { id: number; name: string; email: string };

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [technicians, setTechnicians] = useState<TechOption[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [materialText, setMaterialText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    if (!id) return;
    const t = await api.task(id);
    setTask(t);
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .task(id)
      .then((t) => {
        if (!cancelled) setTask(t);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (user?.role !== "MANAGER") return;
    api
      .technicians()
      .then((d) => setTechnicians(d.technicians))
      .catch(() => {});
  }, [user]);

  async function run(_label: string, fn: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await fn();
      await reload();
      setMaterialText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !task) {
    return (
      <div className="page">
        <div className="error-banner">{error}</div>
        <Link to="/">Back to list</Link>
      </div>
    );
  }

  if (!task || !user) {
    return <div className="muted">Loading…</div>;
  }

  const pendingMr = task.materialRequests?.find((m) => m.status === "PENDING");

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/">Tasks</Link> / {task.taskCode}
      </p>
      <div className="page-header">
        <div>
          <h1>{task.title}</h1>
          <p className="muted">
            <span className={`pill status-${task.status}`}>{task.status}</span>{" "}
            <span className="mono">{task.taskCode}</span>
          </p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="grid-two">
        <section className="card">
          <h2>Details</h2>
          <dl className="dl">
            <dt>Machinery</dt>
            <dd>{task.machineryLabel || "—"}</dd>
            <dt>Reporter</dt>
            <dd>
              {task.reporter?.name} ({task.reporter?.email})
            </dd>
            <dt>Assignee</dt>
            <dd>
              {task.assignee ? `${task.assignee.name} (${task.assignee.email})` : "—"}
            </dd>
            <dt>Description</dt>
            <dd className="pre">{task.description}</dd>
          </dl>
        </section>

        <section className="card">
          <h2>Actions</h2>
          {user.role === "MANAGER" && task.status === "REPORTED" && (
            <div className="action-block">
              <label>
                Assign technician
                <div className="row">
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy || !assigneeId}
                    onClick={() =>
                      run("assign", () => api.assignTask(task.id, Number(assigneeId)))
                    }
                  >
                    Assign
                  </button>
                </div>
              </label>
            </div>
          )}

          {user.role === "TECHNICIAN" && task.status === "ASSIGNED" && (
            <div className="action-block">
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => run("start", () => api.startTask(task.id))}
              >
                Start work (pick task)
              </button>
            </div>
          )}

          {user.role === "TECHNICIAN" && task.status === "IN_PROGRESS" && (
            <div className="action-block">
              <label>
                Request materials
                <textarea
                  rows={3}
                  value={materialText}
                  onChange={(e) => setMaterialText(e.target.value)}
                  placeholder="Parts, quantities, supplier notes…"
                />
              </label>
              <button
                type="button"
                className="btn secondary"
                disabled={busy || !materialText.trim()}
                onClick={() =>
                  run("mat", () => api.materialRequest(task.id, materialText.trim()))
                }
              >
                Submit material request
              </button>
            </div>
          )}

          {user.role === "MANAGER" &&
            task.status === "AWAITING_MATERIAL_APPROVAL" &&
            pendingMr && (
              <div className="action-block">
                <p className="small">
                  Pending request #{pendingMr.id}: {pendingMr.itemsText}
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={() =>
                      run("appr", () =>
                        api.materialDecision(task.id, pendingMr.id, "APPROVE")
                      )
                    }
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={busy}
                    onClick={() =>
                      run("rej", () =>
                        api.materialDecision(task.id, pendingMr.id, "REJECT")
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

          {user.role === "TECHNICIAN" && task.status === "IN_PROGRESS" && (
            <div className="action-block">
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => run("done", () => api.completeWork(task.id))}
              >
                Mark work complete
              </button>
            </div>
          )}

          {user.role === "MANAGER" && task.status === "PENDING_COMPLETION" && (
            <div className="action-block">
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => run("confirm", () => api.confirmCompletion(task.id))}
              >
                Confirm completion & close
              </button>
            </div>
          )}

          {task.status === "CLOSED" && <p className="muted">This task is closed.</p>}
        </section>
      </div>

      <section className="card">
        <h2>Material requests</h2>
        {task.materialRequests?.length ? (
          <ul className="list-plain">
            {task.materialRequests.map((m) => (
              <li key={m.id}>
                <strong>#{m.id}</strong> — {m.status} — {m.itemsText}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">None yet.</p>
        )}
      </section>
    </div>
  );
}
