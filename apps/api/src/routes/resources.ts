import { Router } from "express";
import { getPrisma, jparse } from "../lib/db.js";

export const resourcesRouter = Router();

/** Browse the full learning-resource catalog (optionally filter by skill). */
resourcesRouter.get("/", async (req, res) => {
  const prisma = getPrisma();
  const { skillId, platform, language, cost, q } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (skillId) where.skillId = skillId;
  if (platform) where.platform = platform;
  if (language) where.language = language;
  if (cost) where.cost = cost;
  let resources = await prisma.learningResource.findMany({
    where,
    include: { skill: true },
    orderBy: [{ cost: "asc" }, { rating: "desc" }],
  });
  if (q) {
    const needle = q.toLowerCase();
    resources = resources.filter(
      (r) => r.title.toLowerCase().includes(needle) || r.skill.name.toLowerCase().includes(needle)
    );
  }
  res.json(
    resources.map((r) => ({ ...r, prerequisites: jparse<string[]>(r.prerequisites, []) }))
  );
});

/** Distinct platforms for filter chips. */
resourcesRouter.get("/platforms", async (_req, res) => {
  const rows = await getPrisma().learningResource.findMany({
    distinct: ["platform"],
    select: { platform: true },
  });
  res.json(rows.map((r) => r.platform));
});
