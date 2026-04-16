import express from "express";
import { z } from "zod";
import { publicApiKey } from "../middleware/auth";
import * as repo from "../services/taskRepository";

const router = express.Router();

const createPublicSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  machineryLabel: z.string().optional(),
  reporterEmail: z.string().email(),
});

router.use(publicApiKey);

router.get("/tasks/:taskCode", async (req, res, next) => {
  try {
    const task = await repo.getTaskByCodePublic(req.params.taskCode);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (e) {
    next(e);
  }
});

router.post("/tasks", async (req, res, next) => {
  try {
    const body = createPublicSchema.parse(req.body);
    const reporter = await repo.prisma.user.findUnique({
      where: { email: body.reporterEmail },
    });
    if (!reporter || reporter.role !== "USER") {
      res.status(400).json({
        error: "reporterEmail must reference an existing user with role USER",
      });
      return;
    }
    const task = await repo.createTaskWithUniqueCode({
      title: body.title,
      description: body.description,
      machineryLabel: body.machineryLabel ?? null,
      reporterId: reporter.id,
    });
    res.status(201).json(task);
  } catch (e) {
    next(e);
  }
});

export default router;
