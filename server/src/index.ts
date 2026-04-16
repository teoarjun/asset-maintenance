import dotenv from "dotenv";
dotenv.config();

import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { ZodError } from "zod";

import authRoutes from "./routes/authRoutes";
import taskRoutes from "./routes/taskRoutes";
import publicRoutes from "./routes/publicRoutes";
import { isHttpError } from "./types/httpError";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

if (!process.env.JWT_SECRET) {
  console.warn("Warning: JWT_SECRET is not set; auth will fail until it is configured.");
}

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/public", publicRoutes);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation error", details: err.flatten() });
    return;
  }
  const status = isHttpError(err) ? err.statusCode : 500;
  const message =
    status === 500
      ? "Internal server error"
      : err instanceof Error
        ? err.message
        : "Request failed";
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({ error: message });
};

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
