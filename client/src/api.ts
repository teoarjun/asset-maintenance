import type { AuthUser, Task, TaskListResponse } from "./types";

const API_BASE = "";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: string }).error)
        : res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

export type TaskListParams = Record<string, string | undefined>;

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch<{ user: AuthUser }>("/api/auth/me"),
  technicians: () => apiFetch<{ technicians: { id: number; name: string; email: string }[] }>(
    "/api/auth/technicians"
  ),
  tasks: (params: TaskListParams) => {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value == null) continue;
      const s = String(value).trim();
      if (!s || s === "undefined" || s === "null") continue;
      cleaned[key] = s;
    }
    const q = new URLSearchParams(cleaned).toString();
    return apiFetch<TaskListResponse>(`/api/tasks?${q}`);
  },
  task: (id: string | undefined) => apiFetch<Task>(`/api/tasks/${id}`),
  createTask: (body: {
    title: string;
    description: string;
    machineryLabel?: string;
    reporterId?: number;
  }) =>
    apiFetch<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  assignTask: (id: number, assigneeId: number) =>
    apiFetch<Task>(`/api/tasks/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assigneeId }),
    }),
  startTask: (id: number) => apiFetch<Task>(`/api/tasks/${id}/start`, { method: "PATCH" }),
  materialRequest: (id: number, itemsText: string) =>
    apiFetch<Task>(`/api/tasks/${id}/material-requests`, {
      method: "POST",
      body: JSON.stringify({ itemsText }),
    }),
  materialDecision: (taskId: number, requestId: number, decision: "APPROVE" | "REJECT") =>
    apiFetch<Task>(`/api/tasks/${taskId}/material-requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    }),
  completeWork: (id: number) =>
    apiFetch<Task>(`/api/tasks/${id}/complete-work`, { method: "PATCH" }),
  confirmCompletion: (id: number) =>
    apiFetch<Task>(`/api/tasks/${id}/confirm-completion`, { method: "PATCH" }),
};
