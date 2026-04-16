import { httpError } from "../types/httpError";
import type { Role as PrismaRole } from "@prisma/client";

/**
 * Valid task state transitions and role checks (pure functions for unit tests).
 */

export const TaskStatus = {
  REPORTED: "REPORTED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  AWAITING_MATERIAL_APPROVAL: "AWAITING_MATERIAL_APPROVAL",
  PENDING_COMPLETION: "PENDING_COMPLETION",
  CLOSED: "CLOSED",
} as const;

export type TaskStatusKey = (typeof TaskStatus)[keyof typeof TaskStatus];

export const Role = {
  USER: "USER",
  MANAGER: "MANAGER",
  TECHNICIAN: "TECHNICIAN",
} as const;

export type RoleKey = (typeof Role)[keyof typeof Role];

type TransitionAction =
  | "assign"
  | "start"
  | "requestMaterials"
  | "approveMaterials"
  | "rejectMaterials"
  | "completeWork"
  | "confirmCompletion";

export function assertTransition(
  current: string,
  next: string,
  role: PrismaRole,
  action: TransitionAction
): void {
  const allowed = canTransition(current, next, role, action);
  if (!allowed.ok) {
    throw httpError(allowed.reason || "Invalid transition", 400);
  }
}

export function canTransition(
  current: string,
  next: string,
  role: PrismaRole,
  action: TransitionAction
): { ok: true } | { ok: false; reason?: string } {
  const rules = TRANSITIONS[action];
  if (!rules) {
    return { ok: false, reason: "Unknown action" };
  }
  const rule = rules.find((r) => r.from === current && r.to === next && r.roles.includes(role as RoleKey));
  if (!rule) {
    return { ok: false, reason: `Cannot ${action} from ${current} to ${next} as ${role}` };
  }
  return { ok: true };
}

const TRANSITIONS: Record<
  TransitionAction,
  Array<{ from: string; to: string; roles: readonly RoleKey[] }>
> = {
  assign: [
    {
      from: TaskStatus.REPORTED,
      to: TaskStatus.ASSIGNED,
      roles: [Role.MANAGER],
    },
  ],
  start: [
    {
      from: TaskStatus.ASSIGNED,
      to: TaskStatus.IN_PROGRESS,
      roles: [Role.TECHNICIAN],
    },
  ],
  requestMaterials: [
    {
      from: TaskStatus.IN_PROGRESS,
      to: TaskStatus.AWAITING_MATERIAL_APPROVAL,
      roles: [Role.TECHNICIAN],
    },
  ],
  approveMaterials: [
    {
      from: TaskStatus.AWAITING_MATERIAL_APPROVAL,
      to: TaskStatus.IN_PROGRESS,
      roles: [Role.MANAGER],
    },
  ],
  rejectMaterials: [
    {
      from: TaskStatus.AWAITING_MATERIAL_APPROVAL,
      to: TaskStatus.IN_PROGRESS,
      roles: [Role.MANAGER],
    },
  ],
  completeWork: [
    {
      from: TaskStatus.IN_PROGRESS,
      to: TaskStatus.PENDING_COMPLETION,
      roles: [Role.TECHNICIAN],
    },
  ],
  confirmCompletion: [
    {
      from: TaskStatus.PENDING_COMPLETION,
      to: TaskStatus.CLOSED,
      roles: [Role.MANAGER],
    },
  ],
};

export function validateCreateTask(role: PrismaRole): void {
  if (role !== Role.USER && role !== Role.MANAGER) {
    throw httpError("Only reporters or managers can create tasks", 403);
  }
}

export { TRANSITIONS };
