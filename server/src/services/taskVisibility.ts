import type { Prisma, TaskStatus } from "@prisma/client";
import type { Role as RoleEnum } from "@prisma/client";

/**
 * Composes Prisma `where` clauses so each role only sees allowed rows.
 * (Assessment: "XPath constraints for data visibility")
 */

export const Role = {
  USER: "USER",
  MANAGER: "MANAGER",
  TECHNICIAN: "TECHNICIAN",
} as const;

export function baseWhereForRole(user: { id: number; role: RoleEnum } | null): Prisma.TaskWhereInput {
  if (!user) {
    return { id: -1 };
  }
  if (user.role === Role.MANAGER) {
    return {};
  }
  if (user.role === Role.USER) {
    return { reporterId: user.id };
  }
  if (user.role === Role.TECHNICIAN) {
    return { assigneeId: user.id };
  }
  return { id: -1 };
}

export function canAccessTask(
  user: { id: number; role: RoleEnum },
  task: { reporterId: number; assigneeId: number | null }
): boolean {
  if (user.role === Role.MANAGER) return true;
  if (user.role === Role.USER && task.reporterId === user.id) return true;
  if (user.role === Role.TECHNICIAN && task.assigneeId === user.id) return true;
  return false;
}

export type TaskListQuery = {
  search?: string;
  status?: string;
  limit?: string;
  offset?: string;
};

/**
 * Merge search/filter params with visibility (AND).
 */
export function mergeTaskFilters(
  baseWhere: Prisma.TaskWhereInput,
  { search, status }: TaskListQuery
): Prisma.TaskWhereInput {
  const and: Prisma.TaskWhereInput[] = [{ ...baseWhere }];
  const normalizedStatus = normalizeOptional(status);
  const normalizedSearch = normalizeOptional(search);

  if (normalizedStatus) {
    and.push({ status: normalizedStatus as TaskStatus });
  }

  if (normalizedSearch) {
    const q = normalizedSearch;
    and.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { taskCode: { contains: q } },
        { machineryLabel: { contains: q } },
      ],
    });
  }

  if (and.length === 1) return and[0] as Prisma.TaskWhereInput;
  return { AND: and };
}

function normalizeOptional(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const v = String(value).trim();
  if (!v) return undefined;
  if (v === "undefined" || v === "null") return undefined;
  return v;
}
