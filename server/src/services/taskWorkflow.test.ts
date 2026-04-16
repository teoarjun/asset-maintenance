import { assertTransition, canTransition, TaskStatus, validateCreateTask } from "./taskWorkflow";

describe("taskWorkflow", () => {
  test("manager can assign REPORTED -> ASSIGNED", () => {
    expect(canTransition(TaskStatus.REPORTED, TaskStatus.ASSIGNED, "MANAGER", "assign").ok).toBe(
      true
    );
  });

  test("technician cannot assign", () => {
    expect(
      canTransition(TaskStatus.REPORTED, TaskStatus.ASSIGNED, "TECHNICIAN", "assign").ok
    ).toBe(false);
  });

  test("technician can start ASSIGNED -> IN_PROGRESS", () => {
    expect(
      canTransition(TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, "TECHNICIAN", "start").ok
    ).toBe(true);
  });

  test("assertTransition throws on invalid move", () => {
    expect(() =>
      assertTransition(TaskStatus.CLOSED, TaskStatus.IN_PROGRESS, "MANAGER", "assign")
    ).toThrow();
  });

  test("validateCreateTask allows user and manager", () => {
    expect(() => validateCreateTask("USER")).not.toThrow();
    expect(() => validateCreateTask("MANAGER")).not.toThrow();
  });

  test("validateCreateTask rejects technician", () => {
    expect(() => validateCreateTask("TECHNICIAN")).toThrow();
  });
});
