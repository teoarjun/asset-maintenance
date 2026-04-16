import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import type { TaskListResponse, TaskStatus } from "../types";

const STATUSES: Array<"" | TaskStatus> = [
  "",
  "REPORTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "AWAITING_MATERIAL_APPROVAL",
  "PENDING_COMPLETION",
  "CLOSED",
];

export default function TaskList() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | TaskStatus>("");
  const [data, setData] = useState<TaskListResponse>({ items: [], total: 0, limit: 50, offset: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const params = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      limit: "50",
      offset: "0",
    }),
    [search, status]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .tasks(params)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params]);

  const canCreate = user?.role === "USER" || user?.role === "MANAGER";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p className="muted">
            {user?.role === "MANAGER" && "All maintenance tasks in the factory."}
            {user?.role === "USER" && "Issues you reported."}
            {user?.role === "TECHNICIAN" && "Work assigned to you."}
          </p>
        </div>
        {canCreate && (
          <Link to="/tasks/new" className="btn primary">
            Report issue
          </Link>
        )}
      </div>

      <div className="filters card">
        <label className="grow">
          Search
          <input
            type="search"
            placeholder="Code, title, machinery…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as "" | TaskStatus)}>
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="muted">Loading…</div>}

      {!loading && !error && (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/tasks/${t.id}`} className="link-mono">
                      {t.taskCode}
                    </Link>
                  </td>
                  <td>{t.title}</td>
                  <td>
                    <span className={`pill status-${t.status}`}>{t.status}</span>
                  </td>
                  <td className="muted small">{new Date(t.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <p className="empty muted">No tasks match your filters.</p>}
          <p className="muted small pad">
            Showing {data.items.length} of {data.total}
          </p>
        </div>
      )}
    </div>
  );
}
