import { Router } from "express";
import { requireRole } from "../lib/auth.js";
import { getPrisma } from "../lib/db.js";

export const providerRouter = Router();

providerRouter.get("/me", async (req, res) => {
  const profile = await requireRole(req, "provider");
  const provider = await getPrisma().provider.findUnique({
    where: { profileId: profile.id },
    include: { courses: { include: { enrollments: true } } },
  });
  if (!provider) return res.status(404).json({ error: "No provider" });
  res.json(provider);
});

providerRouter.get("/trainees", async (req, res) => {
  const profile = await requireRole(req, "provider");
  const prisma = getPrisma();
  const provider = await prisma.provider.findUnique({
    where: { profileId: profile.id },
    include: { courses: { include: { enrollments: { include: { trainee: { include: { skills: true, placements: true, targetJob: true } } } } } } },
  });
  if (!provider) return res.status(404).json({ error: "No provider" });
  const seen = new Set<string>();
  const trainees = [];
  for (const c of provider.courses) {
    for (const e of c.enrollments) {
      if (seen.has(e.traineeId)) continue;
      seen.add(e.traineeId);
      const t = e.trainee;
      trainees.push({
        id: t.id,
        name: t.name,
        state: t.state,
        district: t.district,
        course: c.name,
        cohort: e.cohort,
        status: e.status,
        avgSkill: t.skills.length ? Math.round(t.skills.reduce((a, s) => a + s.level, 0) / t.skills.length) : 0,
        placed: t.placements.length > 0,
        salary: t.placements[0]?.monthlySalary ?? null,
      });
    }
    if (trainees.length > 200) break;
  }
  res.json(trainees);
});

/** Curriculum signals: weakest skill areas across the provider's cohorts. */
providerRouter.get("/curriculum-signals", async (req, res) => {
  const profile = await requireRole(req, "provider");
  const prisma = getPrisma();
  const provider = await prisma.provider.findUnique({
    where: { profileId: profile.id },
    include: {
      courses: {
        include: {
          enrollments: { include: { trainee: { include: { skills: { include: { skill: true } }, targetJob: true } } } },
        },
      },
    },
  });
  if (!provider) return res.status(404).json({ error: "No provider" });
  const skillAgg = new Map<string, { total: number; count: number; below: number }>();
  for (const c of provider.courses) {
    for (const e of c.enrollments) {
      for (const s of e.trainee.skills) {
        const cur = skillAgg.get(s.skill.name) ?? { total: 0, count: 0, below: 0 };
        cur.total += s.level;
        cur.count++;
        if (s.level < 55) cur.below++;
        skillAgg.set(s.skill.name, cur);
      }
    }
  }
  const signals = [...skillAgg.entries()]
    .map(([skill, v]) => ({
      skill,
      avgLevel: Math.round(v.total / v.count),
      students: v.count,
      belowThresholdPct: Math.round((v.below / v.count) * 100),
    }))
    .filter((s) => s.students >= 3)
    .sort((a, b) => a.avgLevel - b.avgLevel)
    .slice(0, 8);
  res.json(signals);
});
