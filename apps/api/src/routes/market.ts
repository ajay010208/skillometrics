/**
 * Location-based salary trends + market demand insights.
 * Computed from seeded jobs + placements for the trainee's target role.
 */
import { Router } from "express";
import { requireProfile } from "../lib/auth.js";
import { getPrisma, jparse } from "../lib/db.js";
import type { SkillReq } from "../lib/match.js";
import { districtsFor } from "../lib/locations.js";

export const marketRouter = Router();

marketRouter.get("/market/insights", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({
    where: { profileId: profile.id },
    include: { targetJob: true, skills: { include: { skill: true } } },
  });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const { state: queryState } = req.query as Record<string, string | undefined>;
  const state = queryState || trainee.state;
  const roleTitle = trainee.targetJob?.title ?? "";
  const roleKey = roleTitle.split(" ")[0].toLowerCase();

  // Jobs for this role (title prefix match, same as skill-analysis)
  const allJobs = await prisma.job.findMany({
    where: { active: true, title: { contains: roleKey } },
  });
  const nationalJobs = allJobs;
  const stateJobs = allJobs.filter((j) => j.state === state);
  const localJobs = stateJobs.filter((j) => districtsFor(state).some((d) => d === j.district));

  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

  // national + state salary bands
  const band = (jobs: typeof allJobs) => {
    if (!jobs.length) return null;
    const mids = jobs.map((j) => Math.round((j.salaryMin + j.salaryMax) / 2));
    return {
      min: Math.min(...jobs.map((j) => j.salaryMin)),
      max: Math.max(...jobs.map((j) => j.salaryMax)),
      avg: avg(mids),
      count: jobs.length,
    };
  };

  // district breakdown within state
  const byDistrict = new Map<string, number[]>();
  for (const j of stateJobs) {
    const mids = byDistrict.get(j.district) ?? [];
    mids.push(Math.round((j.salaryMin + j.salaryMax) / 2));
    byDistrict.set(j.district, mids);
  }
  const districts = [...byDistrict.entries()]
    .map(([district, mids]) => ({ district, jobs: mids.length, avgSalary: avg(mids) }))
    .sort((a, b) => b.jobs - a.jobs);

  // in-demand skills for this role nationally (top 8 by demand)
  const demand = new Map<string, number>();
  const skillNameById = new Map(
    (await prisma.skill.findMany()).map((s) => [s.id, s.name])
  );
  for (const j of nationalJobs) {
    for (const r of jparse<SkillReq[]>(j.requiredSkills, [])) {
      const name = skillNameById.get(r.skillId);
      if (name) demand.set(name, (demand.get(name) ?? 0) + 1);
    }
  }
  const topSkills = [...demand.entries()]
    .map(([skill, count]) => ({
      skill,
      pct: nationalJobs.length ? Math.round((count / nationalJobs.length) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8);

  // actual placement salaries for this role from placements (approx via jobTitle key)
  const placements = await prisma.placement.findMany({ where: { type: "job" } });
  const rolePlacements = placements.filter((p) => p.jobTitle.toLowerCase().includes(roleKey));
  const placedInState = rolePlacements.filter((p) => p.state === state);
  const placedAvg = (xs: typeof rolePlacements) => avg(xs.map((p) => p.monthlySalary));

  // the trainee's position vs market: readiness & skill fit vs avg required min levels
  const readinessSkillGaps = trainee.targetJob
    ? jparse<SkillReq[]>(trainee.targetJob.requiredSkills, []).map((r) => {
        const level = trainee.skills.find((s) => s.skillId === r.skillId)?.level ?? 0;
        return {
          skill: skillNameById.get(r.skillId) ?? "?",
          marketPct: nationalJobs.length
            ? Math.round(
                (nationalJobs.filter((j) =>
                  jparse<SkillReq[]>(j.requiredSkills, []).some((x) => x.skillId === r.skillId)
                ).length /
                  nationalJobs.length) *
                  100
              )
            : 0,
          yourLevel: level,
          requiredLevel: r.minLevel,
        };
      })
    : [];

  res.json({
    role: roleTitle,
    state,
    national: band(nationalJobs),
    stateBand: band(stateJobs),
    local: band(localJobs),
    districts,
    topSkills,
    placedSample: {
      national: rolePlacements.length,
      state: placedInState.length,
      nationalAvgSalary: placedAvg(rolePlacements),
      stateAvgSalary: placedAvg(placedInState),
    },
    readinessSkillGaps,
  });
});

/** Local jobs for the trainee's state (used by dashboard "jobs in your state" card). */
marketRouter.get("/market/local-jobs", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const { state: queryState } = req.query as Record<string, string | undefined>;
  const state = queryState || trainee.state;
  const jobs = await prisma.job.findMany({
    where: { active: true, state },
    orderBy: { postedAt: "desc" },
    take: 30,
  });
  res.json(jobs);
});
