import { Router } from "express";
import { requireRole } from "../lib/auth.js";
import { getPrisma, jparse } from "../lib/db.js";
import { aiPost } from "../lib/ai.js";

export const dashboardRouter = Router();

/** Aggregate helpers shared by all dashboard endpoints. */
async function loadBase(filters: {
  state?: string;
  district?: string;
  providerId?: string;
  courseId?: string;
  gender?: string;
  category?: string;
}) {
  const prisma = getPrisma();
  const traineeWhere: Record<string, unknown> = {};
  if (filters.state) traineeWhere.state = filters.state;
  if (filters.district) traineeWhere.district = filters.district;
  if (filters.gender) traineeWhere.gender = filters.gender;
  if (filters.category) traineeWhere.category = filters.category;

  let trainees = await prisma.trainee.findMany({
    where: traineeWhere,
    include: {
      placements: { include: { followUps: true } },
      enrollments: { include: { course: true } },
      skills: true,
      targetJob: true,
    },
  });

  if (filters.providerId || filters.courseId) {
    trainees = trainees.filter((t) =>
      t.enrollments.some(
        (e) =>
          (!filters.providerId || e.course.providerId === filters.providerId) &&
          (!filters.courseId || e.courseId === filters.courseId)
      )
    );
  }
  return { prisma, trainees };
}

dashboardRouter.get("/kpis", async (req, res) => {
  await requireRole(req, "admin", "provider");
  const { state, district, providerId, courseId, gender, category } = req.query as Record<string, string | undefined>;
  const { trainees } = await loadBase({ state, district, providerId, courseId, gender, category });
  const tracked = trainees.filter((t) => t.consentTracking);
  const placements = tracked.flatMap((t) => t.placements);
  const activePlacements = placements.filter((p) => p.active);
  const placed = new Set(tracked.filter((t) => t.placements.length > 0).map((t) => t.id));

  const salaries = activePlacements.map((p) => p.monthlySalary).sort((a, b) => a - b);
  const avgSalary = salaries.length ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : 0;
  const medianSalary = salaries.length ? salaries[Math.floor(salaries.length / 2)] : 0;

  // retention at 3/6/12 from completed follow-ups
  const ret = (m: number) => {
    const fus = placements.flatMap((p) => p.followUps).filter((f) => f.milestone === m && f.completedAt);
    if (!fus.length) return null;
    return Math.round((fus.filter((f) => f.stillEmployed).length / fus.length) * 100);
  };

  // wage progression: avg salary at placement vs at latest completed follow-up
  const withFus = placements.filter((p) => p.followUps.some((f) => f.completedAt && f.currentSalary));
  let wageGrowth = null;
  if (withFus.length) {
    const start = withFus.reduce((a, p) => a + p.monthlySalary, 0) / withFus.length;
    const latest = withFus.map((p) => {
      const done = p.followUps.filter((f) => f.completedAt && f.currentSalary).sort((a, b) => b.milestone - a.milestone);
      return done[0].currentSalary!;
    });
    const latestAvg = latest.reduce((a, b) => a + b, 0) / latest.length;
    wageGrowth = Math.round(((latestAvg - start) / start) * 100);
  }

  res.json({
    traineesTotal: tracked.length,
    placedCount: placed.size,
    placementPct: tracked.length ? Math.round((placed.size / tracked.length) * 100) : 0,
    avgSalary,
    medianSalary,
    selfEmployed: placements.filter((p) => p.type === "self-employment").length,
    apprenticeships: placements.filter((p) => p.type === "apprenticeship").length,
    retention: { m3: ret(3), m6: ret(6), m12: ret(12) },
    wageGrowthPct: wageGrowth,
    selfEmploymentPct: placements.length
      ? Math.round((placements.filter((p) => p.type !== "job").length / placements.length) * 100)
      : 0,
  });
});

dashboardRouter.get("/outcomes", async (req, res) => {
  await requireRole(req, "admin", "provider");
  const { state, district, providerId, courseId, gender, category } = req.query as Record<string, string | undefined>;
  const { trainees } = await loadBase({ state, district, providerId, courseId, gender, category });
  const tracked = trainees.filter((t) => t.consentTracking);
  const placed = tracked.filter((t) => t.placements.some((p) => p.type === "job")).length;
  const selfEmp = tracked.filter((t) => t.placements.some((p) => p.type === "self-employment")).length;
  const apprent = tracked.filter((t) => t.placements.some((p) => p.type === "apprenticeship")).length;
  const studying = tracked.filter((t) => t.currentStatus === "studying").length;
  const dropped = tracked.filter((t) => t.enrollments.some((e) => e.status === "dropped")).length;
  const notPlaced = Math.max(0, tracked.length - placed - selfEmp - apprent);
  res.json([
    { name: "Placed (jobs)", value: placed },
    { name: "Self-employment", value: selfEmp },
    { name: "Apprenticeship", value: apprent },
    { name: "Not placed yet", value: notPlaced },
    { name: "Dropped out", value: dropped },
  ]);
});

dashboardRouter.get("/retention-curve", async (req, res) => {
  await requireRole(req, "admin", "provider");
  const { state, district, providerId, courseId, gender, category } = req.query as Record<string, string | undefined>;
  const { trainees } = await loadBase({ state, district, providerId, courseId, gender, category });
  const fus = trainees.flatMap((t) => t.placements.flatMap((p) => p.followUps));
  const out = [0, 3, 6, 12].map((m) => {
    if (m === 0) {
      return { months: m, retentionPct: 100 };
    }
    const relevant = fus.filter((f) => f.milestone === m && f.completedAt);
    const still = relevant.filter((f) => f.stillEmployed).length;
    return { months: m, retentionPct: relevant.length ? Math.round((still / relevant.length) * 100) : null };
  });
  res.json(out);
});

dashboardRouter.get("/salary-progressions", async (req, res) => {
  await requireRole(req, "admin", "provider");
  const { state, district, providerId, courseId, gender, category } = req.query as Record<string, string | undefined>;
  const { trainees } = await loadBase({ state, district, providerId, courseId, gender, category });
  const placements = trainees.flatMap((t) => t.placements);
  const rows = [0, 3, 6, 12].map((m) => {
    const atM: Array<{ currentSalary: number }> =
      m === 0
        ? placements.map((p) => ({ currentSalary: p.monthlySalary }))
        : placements
            .flatMap((p) => p.followUps)
            .filter((f) => f.milestone === m && f.completedAt && typeof f.currentSalary === "number")
            .map((f) => ({ currentSalary: f.currentSalary as number }));
    const values = atM.map((f) => f.currentSalary);
    const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
    return { months: m, avgSalary: avg, sample: values.length };
  });
  res.json(rows);
});

dashboardRouter.get("/state-comparison", async (req, res) => {
  await requireRole(req, "admin");
  const prisma = getPrisma();
  const trainees = await prisma.trainee.findMany({
    include: { placements: { where: { active: true } } },
  });
  const byState = new Map<string, { total: number; placed: number; salaries: number[] }>();
  for (const t of trainees.filter((x) => x.consentTracking)) {
    const cur = byState.get(t.state) ?? { total: 0, placed: 0, salaries: [] };
    cur.total++;
    if (t.placements.length) {
      cur.placed++;
      cur.salaries.push(t.placements[0].monthlySalary);
    }
    byState.set(t.state, cur);
  }
  res.json(
    [...byState.entries()]
      .map(([state, v]) => ({
        state,
        trainees: v.total,
        placementPct: v.total ? Math.round((v.placed / v.total) * 100) : 0,
        avgSalary: v.salaries.length ? Math.round(v.salaries.reduce((a, b) => a + b, 0) / v.salaries.length) : 0,
      }))
      .sort((a, b) => b.trainees - a.trainees)
  );
});

dashboardRouter.get("/skill-demand", async (req, res) => {
  await requireRole(req, "admin");
  const prisma = getPrisma();
  const jobs = await prisma.job.findMany({ where: { active: true } });
  const counts = new Map<string, number>();
  for (const j of jobs) {
    for (const r of jparse<Array<{ skillId: string; weight: number }>>(j.requiredSkills, [])) {
      counts.set(r.skillId, (counts.get(r.skillId) ?? 0) + 1);
    }
  }
  const skills = await prisma.skill.findMany();
  const nameById = new Map(skills.map((s) => [s.id, s.name]));
  res.json(
    [...counts.entries()]
      .map(([id, n]) => ({ skill: nameById.get(id) ?? id, demand: n }))
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 12)
  );
});

/** AI insights: why people aren't getting jobs (computed + narrated). */
dashboardRouter.get("/insights", async (req, res) => {
  await requireRole(req, "admin", "provider");
  const prisma = getPrisma();
  const { state, providerId } = req.query as Record<string, string | undefined>;
  const trainees = await prisma.trainee.findMany({
    where: state ? { state } : undefined,
    include: { targetJob: true, skills: true, enrollments: true, placements: true },
  });
  const notPlaced = trainees.filter((t) => t.consentTracking && t.placements.length === 0);
  const reasonCounts = new Map<string, number>();
  for (const t of notPlaced) {
    const reason = t.nonPlacementReason ?? inferReason(t);
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }
  const total = Math.max(1, notPlaced.length);
  const breakdown = [...reasonCounts.entries()]
    .map(([reason, n]) => ({ reason, count: n, pct: Math.round((n / total) * 100) }))
    .sort((a, b) => b.count - a.count);
  const label: Record<string, string> = {
    "skill-gap": "Skill gap vs market requirements",
    "lack-experience": "Lack of hands-on experience / projects",
    location: "Location — few local openings in district",
    certification: "Missing recognized certification",
    communication: "Communication / interview skills",
  };
  const stats = breakdown.map((b) => ({ ...b, label: label[b.reason] ?? b.reason }));
  const narrative = await aiPost<{ insights: string[] }>("/ai/insights", { stats, context: { state } });
  res.json({ stats, insights: narrative.data?.insights ?? [], source: narrative.source });
});

function inferReason(t: {
  skills: Array<{ level: number }>;
  enrollments: Array<{ status: string }>;
}): string {
  const avgLevel = t.skills.length
    ? t.skills.reduce((a, s) => a + s.level, 0) / t.skills.length
    : 0;
  if (t.enrollments.some((e) => e.status === "dropped")) return "location";
  if (avgLevel < 45) return "skill-gap";
  if (!t.skills.some((s) => s.level >= 70)) return "lack-experience";
  return "communication";
}

/** Consent stats + audit trail for the govt privacy story. */
dashboardRouter.get("/consent-stats", async (req, res) => {
  await requireRole(req, "admin");
  const prisma = getPrisma();
  const [total, tracking, recruiterVisible] = await Promise.all([
    prisma.trainee.count(),
    prisma.trainee.count({ where: { consentTracking: true } }),
    prisma.trainee.count({ where: { consentRecruiterVisible: true } }),
  ]);
  const logs = await prisma.consentLog.findMany({
    include: { trainee: { select: { name: true, state: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ total, tracking, recruiterVisible, logs });
});

/** Trigger the follow-up tick (also available to admin). */
dashboardRouter.post("/followups-tick", async (req, res) => {
  await requireRole(req, "admin");
  tickFollowUps();
  res.json({ ok: true });
});

/** Simulated follow-up dispatch cycle (automated → whatsapp → assisted ladder). */
export async function tickFollowUps() {
  const prisma = getPrisma();
  const due = await prisma.followUp.findMany({
    where: { completedAt: null, dueAt: { lte: new Date() } },
    include: { placement: true },
    take: 50,
  });
  for (const fu of due) {
    // simulate channel: automated-call first, then whatsapp, then assisted
    const channel = fu.milestone === 3 ? "automated-call" : fu.milestone === 6 ? "whatsapp" : "assisted";
    await prisma.followUp.update({
      where: { id: fu.id },
      data: { channel },
    });
  }
  return due.length;
}
