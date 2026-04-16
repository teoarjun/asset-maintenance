import express from "express";
import { z } from "zod";
import { authRequired } from "../middleware/auth";
import * as repo from "../services/taskRepository";

const router = express.Router();

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  machineryLabel: z.string().optional(),
  reporterId: z.coerce.number().int().optional(),
});

const assignSchema = z.object({
  assigneeId: z.coerce.number().int(),
});

const materialSchema = z.object({
  itemsText: z.string().min(1),
});

const decisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
});

router.use(authRequired);

router.get("/", async (req, res, next) => {
  try {
    const { search, status, limit, offset } = req.query;
    const result = await repo.listTasksForUser(req.user!, {
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? status : undefined,
      limit: typeof limit === "string" ? limit : undefined,
      offset: typeof offset === "string" ? offset : undefined,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const task = await repo.createReportedTask(req.user!, body);
    res.status(201).json(task);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const task = await repo.getTaskForUser(req.user!, req.params.id);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/assign", async (req, res, next) => {
  try {
    if (req.user!.role !== "MANAGER") {
      res.status(403).json({ error: "Managers only" });
      return;
    }
    const body = assignSchema.parse(req.body);
    const task = await repo.assignTask(req.user!, req.params.id, body.assigneeId);
    res.json(task);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/start", async (req, res, next) => {
  try {
    const task = await repo.startTask(req.user!, req.params.id);
    res.json(task);
  } catch (e) {
    next(e);
  }
});

router.post("/:id/material-requests", async (req, res, next) => {
  try {
    const body = materialSchema.parse(req.body);
    const task = await repo.requestMaterials(req.user!, req.params.id, body.itemsText);
    res.json(task);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/material-requests/:requestId", async (req, res, next) => {
  try {
    if (req.user!.role !== "MANAGER") {
      res.status(403).json({ error: "Managers only" });
      return;
    }
    const body = decisionSchema.parse(req.body);
    const task = await repo.decideMaterial(
      req.user!,
      req.params.id,
      req.params.requestId,
      body.decision
    );
    res.json(task);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/complete-work", async (req, res, next) => {
  try {
    const task = await repo.completeWork(req.user!, req.params.id);
    res.json(task);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/confirm-completion", async (req, res, next) => {
  try {
    if (req.user!.role !== "MANAGER") {
      res.status(403).json({ error: "Managers only" });
      return;
    }
    const task = await repo.confirmCompletion(req.user!, req.params.id);
    res.json(task);
  } catch (e) {
    next(e);
  }
});

export default router;
