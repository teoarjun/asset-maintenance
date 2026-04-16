import { Prisma, PrismaClient } from "@prisma/client";
import { generateTaskCode } from "./taskCode";
import * as taskWorkflow from "./taskWorkflow";
import * as visibility from "./taskVisibility";
import { httpError } from "../types/httpError";

const prisma = new PrismaClient();

type CreateTaskData = {
  title: string;
  description: string;
  machineryLabel: string | null;
  reporterId: number;
};

export async function createTaskWithUniqueCode(data: CreateTaskData) {
  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i += 1) {
    const taskCode = generateTaskCode();
    try {
      return await prisma.task.create({
        data: {
          ...data,
          taskCode,
          status: "REPORTED",
        },
        include: taskInclude(),
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const target = e.meta?.target;
        if (Array.isArray(target) && target.includes("taskCode")) {
          continue;
        }
      }
      throw e;
    }
  }
  throw new Error("Could not allocate unique task code");
}

function taskInclude(): Prisma.TaskInclude {
  return {
    reporter: { select: { id: true, name: true, email: true } },
    assignee: { select: { id: true, name: true, email: true } },
    materialRequests: { orderBy: { id: "desc" }, take: 5 },
  };
}

export async function listTasksForUser(
  user: { id: number; role: import("@prisma/client").Role },
  query: visibility.TaskListQuery
) {
  const base = visibility.baseWhereForRole(user);
  const where = visibility.mergeTaskFilters(base, query);
  const limit = Math.min(Number(query.limit) || 50, 100);
  const offset = Number(query.offset) || 0;

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      include: taskInclude(),
    }),
    prisma.task.count({ where }),
  ]);

  return { items, total, limit, offset };
}

export async function getTaskForUser(user: { id: number; role: import("@prisma/client").Role }, id: string) {
  const task = await prisma.task.findUnique({
    where: { id: Number(id) },
    include: {
      ...taskInclude(),
      materialRequests: { orderBy: { id: "desc" } },
    },
  });
  if (!task) return null;
  if (!visibility.canAccessTask(user, task)) return null;
  return task;
}

export async function getTaskByCodePublic(taskCode: string) {
  return prisma.task.findUnique({
    where: { taskCode },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      materialRequests: { orderBy: { id: "desc" } },
    },
  });
}

export async function assignTask(
  actor: { id: number; role: import("@prisma/client").Role },
  taskId: string,
  assigneeId: number
) {
  const task = await prisma.task.findUnique({ where: { id: Number(taskId) } });
  if (!task) {
    throw httpError("Task not found", 404);
  }
  if (!visibility.canAccessTask(actor, task)) {
    throw httpError("Forbidden", 403);
  }
  taskWorkflow.assertTransition(task.status, taskWorkflow.TaskStatus.ASSIGNED, actor.role, "assign");
  const tech = await prisma.user.findUnique({ where: { id: Number(assigneeId) } });
  if (!tech || tech.role !== "TECHNICIAN") {
    throw httpError("Assignee must be a technician", 400);
  }
  return prisma.task.update({
    where: { id: task.id },
    data: {
      assigneeId: tech.id,
      status: "ASSIGNED",
    },
    include: taskInclude(),
  });
}

export async function startTask(actor: { id: number; role: import("@prisma/client").Role }, taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: Number(taskId) } });
  if (!task) {
    throw httpError("Task not found", 404);
  }
  if (!visibility.canAccessTask(actor, task)) {
    throw httpError("Forbidden", 403);
  }
  taskWorkflow.assertTransition(task.status, taskWorkflow.TaskStatus.IN_PROGRESS, actor.role, "start");
  return prisma.task.update({
    where: { id: task.id },
    data: { status: "IN_PROGRESS" },
    include: taskInclude(),
  });
}

export async function requestMaterials(
  actor: { id: number; role: import("@prisma/client").Role },
  taskId: string,
  itemsText: string
) {
  const task = await prisma.task.findUnique({
    where: { id: Number(taskId) },
    include: { materialRequests: true },
  });
  if (!task) {
    throw httpError("Task not found", 404);
  }
  if (!visibility.canAccessTask(actor, task)) {
    throw httpError("Forbidden", 403);
  }
  const pending = task.materialRequests.find((m) => m.status === "PENDING");
  if (pending) {
    throw httpError("A material request is already pending approval", 400);
  }
  taskWorkflow.assertTransition(
    task.status,
    taskWorkflow.TaskStatus.AWAITING_MATERIAL_APPROVAL,
    actor.role,
    "requestMaterials"
  );

  await prisma.$transaction([
    prisma.materialRequest.create({
      data: { taskId: task.id, itemsText, status: "PENDING" },
    }),
    prisma.task.update({
      where: { id: task.id },
      data: { status: "AWAITING_MATERIAL_APPROVAL" },
    }),
  ]);

  return prisma.task.findUnique({
    where: { id: task.id },
    include: taskInclude(),
  });
}

export async function decideMaterial(
  actor: { id: number; role: import("@prisma/client").Role },
  taskId: string,
  requestId: string,
  decision: "APPROVE" | "REJECT"
) {
  const task = await prisma.task.findUnique({
    where: { id: Number(taskId) },
    include: { materialRequests: true },
  });
  if (!task) {
    throw httpError("Task not found", 404);
  }
  if (!visibility.canAccessTask(actor, task)) {
    throw httpError("Forbidden", 403);
  }
  const mr = task.materialRequests.find((m) => m.id === Number(requestId));
  if (!mr || mr.status !== "PENDING") {
    throw httpError("Material request not found or already processed", 400);
  }
  const action = decision === "APPROVE" ? "approveMaterials" : "rejectMaterials";
  taskWorkflow.assertTransition(task.status, taskWorkflow.TaskStatus.IN_PROGRESS, actor.role, action);

  await prisma.$transaction([
    prisma.materialRequest.update({
      where: { id: mr.id },
      data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED" },
    }),
    prisma.task.update({
      where: { id: task.id },
      data: { status: "IN_PROGRESS" },
    }),
  ]);

  return prisma.task.findUnique({
    where: { id: task.id },
    include: taskInclude(),
  });
}

export async function completeWork(actor: { id: number; role: import("@prisma/client").Role }, taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: Number(taskId) } });
  if (!task) {
    throw httpError("Task not found", 404);
  }
  if (!visibility.canAccessTask(actor, task)) {
    throw httpError("Forbidden", 403);
  }
  taskWorkflow.assertTransition(
    task.status,
    taskWorkflow.TaskStatus.PENDING_COMPLETION,
    actor.role,
    "completeWork"
  );
  return prisma.task.update({
    where: { id: task.id },
    data: { status: "PENDING_COMPLETION" },
    include: taskInclude(),
  });
}

export async function confirmCompletion(
  actor: { id: number; role: import("@prisma/client").Role },
  taskId: string
) {
  const task = await prisma.task.findUnique({ where: { id: Number(taskId) } });
  if (!task) {
    throw httpError("Task not found", 404);
  }
  if (!visibility.canAccessTask(actor, task)) {
    throw httpError("Forbidden", 403);
  }
  taskWorkflow.assertTransition(task.status, taskWorkflow.TaskStatus.CLOSED, actor.role, "confirmCompletion");
  return prisma.task.update({
    where: { id: task.id },
    data: { status: "CLOSED" },
    include: taskInclude(),
  });
}

export async function createReportedTask(
  actor: { id: number; role: import("@prisma/client").Role },
  {
    title,
    description,
    machineryLabel,
    reporterId,
  }: { title: string; description: string; machineryLabel?: string; reporterId?: number }
) {
  taskWorkflow.validateCreateTask(actor.role);
  let rid: number;
  if (actor.role === "USER") {
    rid = actor.id;
  } else if (actor.role === "MANAGER") {
    if (reporterId != null) {
      rid = Number(reporterId);
    } else {
      const firstUser = await prisma.user.findFirst({
        where: { role: "USER" },
        orderBy: { id: "asc" },
      });
      if (!firstUser) {
        throw httpError("No user account available to assign as reporter", 400);
      }
      rid = firstUser.id;
    }
  } else {
    rid = actor.id;
  }
  if (actor.role === "USER" && rid !== actor.id) {
    throw httpError("Users can only create tasks as themselves", 403);
  }
  const reporter = await prisma.user.findUnique({ where: { id: rid } });
  if (!reporter || reporter.role !== "USER") {
    throw httpError("Reporter must be a user account", 400);
  }
  return createTaskWithUniqueCode({
    title,
    description,
    machineryLabel: machineryLabel || null,
    reporterId: reporter.id,
  });
}

export { prisma };
