import type { Role } from "@prisma/client";
import { baseWhereForRole, canAccessTask, mergeTaskFilters } from "./taskVisibility";

describe("taskVisibility", () => {
  const user = { id: 1, role: "USER" as Role };
  const tech = { id: 2, role: "TECHNICIAN" as Role };
  const mgr = { id: 3, role: "MANAGER" as Role };

  test("user sees only own reports", () => {
    expect(baseWhereForRole(user)).toEqual({ reporterId: 1 });
  });

  test("technician sees only assigned", () => {
    expect(baseWhereForRole(tech)).toEqual({ assigneeId: 2 });
  });

  test("manager has unrestricted base filter", () => {
    expect(baseWhereForRole(mgr)).toEqual({});
  });

  test("canAccessTask rules", () => {
    expect(canAccessTask(mgr, { reporterId: 9, assigneeId: 2 })).toBe(true);
    expect(canAccessTask(user, { reporterId: 1, assigneeId: 2 })).toBe(true);
    expect(canAccessTask(user, { reporterId: 9, assigneeId: 2 })).toBe(false);
    expect(canAccessTask(tech, { reporterId: 1, assigneeId: 2 })).toBe(true);
    expect(canAccessTask(tech, { reporterId: 1, assigneeId: 9 })).toBe(false);
  });

  test("mergeTaskFilters combines search and status", () => {
    const base = { reporterId: 1 };
    const merged = mergeTaskFilters(base, { search: "pump", status: "REPORTED" });
    expect(merged.AND).toBeDefined();
    expect((merged as { AND: unknown[] }).AND.length).toBeGreaterThanOrEqual(2);
  });
});
