import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../services/taskRepository";
import { signToken, authRequired } from "../middleware/auth";

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/me", authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true },
  });
  res.json({ user });
});

router.get("/technicians", authRequired, async (req, res) => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Managers only" });
    return;
  }
  const technicians = await prisma.user.findMany({
    where: { role: "TECHNICIAN" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  res.json({ technicians });
});

export default router;
