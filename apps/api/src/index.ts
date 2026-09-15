// Must be the first import so every module below sees the loaded env.
import "./env.js";

import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { API_PORT } from "./lib/config.js";
import { setPrisma } from "./lib/db.js";
import { authMiddleware } from "./lib/auth.js";
import { apiRouter } from "./routes/index.js";

const prisma = new PrismaClient();
setPrisma(prisma);

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(authMiddleware);

app.get("/health", (_req, res) => res.json({ ok: true, service: "api" }));

app.use("/api", apiRouter);

// error handler
app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const status = err.status ?? 500;
    console.error("[api:error]", err.message);
    res.status(status).json({ error: err.message });
  }
);

app.listen(API_PORT, () => {
  console.log(`✔ API listening on http://localhost:${API_PORT}`);
});
