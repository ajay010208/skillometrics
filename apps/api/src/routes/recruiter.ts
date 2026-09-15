import { Router } from "express";
import { requireRole } from "../lib/auth.js";
import { getPrisma, jparse, jstring } from "../lib/db.js";
import { scoreJobForTrainee } from "../lib/match.js";

export const recruiterRouter = Router();

async function me(req: { profile?: { id: string } | null }) {
  if (!req.profile) return null;
  return getPrisma().recruiter.findUnique({ where: { profileId: req.profile.id } });
}

/** Talent search over consented trainees. */
recruiterRouter.get("/search", async (req, res) => {
  await requireRole(req, "recruiter", "admin");
  const prisma = getPrisma();
  const { skill, state, district, minReadiness, q } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = { consentRecruiterVisible: true };
  if (state) where.state = state;
  if (district) where.district = district;
  let trainees = await prisma.trainee.findMany({
    where,
    include: {
      skills: { include: { skill: true } },
      targetJob: true,
      projects: true,
      enrollments: { include: { course: true } },
    },
    take: 300,
  });
  if (skill) {
    const want = skill.toLowerCase();
    trainees = trainees.filter((t) => t.skills.some((s) => s.skill.name.toLowerCase().includes(want)));
  }
  if (q) {
    const needle = q.toLowerCase();
    trainees = trainees.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        (t.targetJob?.title ?? "").toLowerCase().includes(needle) ||
        t.projects.some((p) => p.title.toLowerCase().includes(needle))
    );
  }
  const results = [];
  for (const t of trainees) {
    const readiness = t.targetJob
      ? Math.round(
          (t.skills.reduce((acc, s) => acc + s.level, 0) / Math.max(1, t.skills.length)) || 0
        )
      : 0;
    if (minReadiness && readiness < Number(minReadiness)) continue;
    const validated = t.skills.filter((s) => s.source === "assessment" || s.source === "project");
    results.push({
      id: t.id,
      name: t.name,
      state: t.state,
      district: t.district,
      education: t.education,
      targetRole: t.targetJob?.title ?? null,
      readiness,
      linkedinUrl: t.linkedinUrl,
      githubUrl: t.githubUrl,
      portfolioUrl: t.portfolioUrl,
      topSkills: t.skills.sort((a, b) => b.level - a.level).slice(0, 6)
        .map((s) => ({ name: s.skill.name, level: s.level, validated: s.source !== "resume" && s.source !== "seed" })),
      projectCount: t.projects.length,
      assessmentValidated: validated.length,
      course: t.enrollments[0]?.course.name ?? null,
    });
  }
  results.sort((a, b) => b.readiness - a.readiness);
  res.json(results.slice(0, 60));
});

/** Full candidate profile for recruiters: skills, projects (with GitHub), assessments. */
recruiterRouter.get("/candidate/:id", async (req, res) => {
  await requireRole(req, "recruiter", "admin");
  const prisma = getPrisma();
  const t = await prisma.trainee.findUnique({
    where: { id: req.params.id },
    include: {
      skills: { include: { skill: true } },
      projects: true,
      assessments: true,
      targetJob: true,
      enrollments: { include: { course: { include: { provider: true } } } },
      placements: true,
    },
  });
  if (!t || !t.consentRecruiterVisible) return res.status(404).json({ error: "Candidate not visible" });
  res.json({
    id: t.id,
    name: t.name,
    state: t.state,
    district: t.district,
    education: t.education,
    email: t.email,
    phone: t.consentRecruiterVisible ? t.phone : null,
    linkedinUrl: t.linkedinUrl,
    githubUrl: t.githubUrl,
    portfolioUrl: t.portfolioUrl,
    targetRole: t.targetJob?.title ?? null,
    skills: t.skills.map((s) => ({
      name: s.skill.name,
      level: s.level,
      source: s.source,
      validated: s.source === "assessment" || s.source === "project",
    })),
    projects: t.projects.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      repoUrl: p.repoUrl,
      liveUrl: p.liveUrl,
      evaluation: jparse(p.evaluation, null),
      createdAt: p.createdAt,
    })),
    assessments: t.assessments
      .filter((a) => a.score !== null)
      .map((a) => ({ skillId: a.skillId, score: a.score, takenAt: a.takenAt })),
    educationHistory: t.enrollments.map((e) => ({
      course: e.course.name,
      provider: e.course.provider.name,
      cohort: e.cohort,
      status: e.status,
    })),
    placements: t.placements.map((p) => ({ employer: p.employer, jobTitle: p.jobTitle, joiningDate: p.joiningDate })),
  });
});

/** Pipeline board data. */
recruiterRouter.get("/pipeline", async (req, res) => {
  const recruiter = await me(req);
  if (!recruiter) return res.status(403).json({ error: "No recruiter" });
  const rows = await getPrisma().shortlist.findMany({
    where: { recruiterId: recruiter.id },
    include: {
      trainee: { include: { targetJob: true, skills: { include: { skill: true } } } },
      job: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  res.json(rows);
});

/** Shortlist a candidate (optionally for a job). */
recruiterRouter.post("/shortlist", async (req, res) => {
  const recruiter = await me(req);
  if (!recruiter) return res.status(403).json({ error: "No recruiter" });
  const { traineeId, jobId, notes } = req.body as Record<string, string>;
  const prisma = getPrisma();
  const sl = await prisma.shortlist.create({
    data: { recruiterId: recruiter.id, traineeId, jobId: jobId || null, notes },
  });
  res.json(sl);
});

/** Move pipeline stage; hiring auto-creates a Placement + follow-ups + review nudge. */
recruiterRouter.patch("/shortlist/:id", async (req, res) => {
  const recruiter = await me(req);
  if (!recruiter) return res.status(403).json({ error: "No recruiter" });
  const prisma = getPrisma();
  const sl = await prisma.shortlist.findUnique({ where: { id: req.params.id }, include: { trainee: true } });
  if (!sl || sl.recruiterId !== recruiter.id) return res.status(404).json({ error: "Not found" });
  const { status, notes } = req.body as { status?: string; notes?: string };
  if (status && !["shortlisted", "interviewed", "offer", "hired"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const updated = await prisma.shortlist.update({ where: { id: sl.id }, data: { status, notes } });

  if (status === "hired" && sl.trainee) {
    const job = sl.jobId ? await prisma.job.findUnique({ where: { id: sl.jobId } }) : null;
    const salary = job ? Math.round((job.salaryMin + job.salaryMax) / 2) : 25000;
    const joining = new Date();
    const placement = await prisma.placement.create({
      data: {
        traineeId: sl.traineeId,
        employer: job?.company ?? recruiter.company,
        jobTitle: job?.title ?? "Software Engineer",
        joiningDate: joining,
        monthlySalary: salary,
        state: sl.trainee.state,
        district: sl.trainee.district,
        sourceMatchId: null,
      },
    });
    for (const m of [3, 6, 12]) {
      await prisma.followUp.create({
        data: {
          placementId: placement.id,
          milestone: m,
          dueAt: new Date(joining.getTime() + m * 30 * 86400_000),
        },
      });
    }
    await prisma.trainee.update({ where: { id: sl.traineeId }, data: { currentStatus: "placed" } });
  }
  res.json(updated);
});

/** Recruiter posts a job (enters matching engine immediately). */
recruiterRouter.post("/jobs", async (req, res) => {
  const recruiter = await me(req);
  if (!recruiter) return res.status(403).json({ error: "No recruiter" });
  const prisma = getPrisma();
  const { title, state, district, salaryMin, salaryMax, skills, description } = req.body as {
    title: string;
    state: string;
    district: string;
    salaryMin: number;
    salaryMax: number;
    skills: Array<{ name: string; weight: number; minLevel: number }>;
    description?: string;
  };
  if (!title || !state || !district || !salaryMin) {
    return res.status(400).json({ error: "title, state, district, salaryMin required" });
  }
  // resolve skill names -> ids (create if new)
  const reqs = [];
  for (const s of skills ?? []) {
    const found = await prisma.skill.findFirst({ where: { name: { contains: s.name } } });
    const skillRow =
      found ??
      (await prisma.skill.create({ data: { name: s.name, category: "General", aliases: "[]" } }));
    reqs.push({ skillId: skillRow.id, weight: s.weight ?? 1, minLevel: s.minLevel ?? 50 });
  }
  const job = await prisma.job.create({
    data: {
      recruiterId: recruiter.id,
      title,
      company: recruiter.company,
      state,
      district,
      salaryMin,
      salaryMax: salaryMax || salaryMin,
      source: "Recruiter",
      requiredSkills: jstring(reqs),
      description,
    },
  });
  res.json(job);
});

recruiterRouter.get("/jobs", async (req, res) => {
  const recruiter = await me(req);
  if (!recruiter) return res.status(403).json({ error: "No recruiter" });
  const jobs = await getPrisma().job.findMany({
    where: { recruiterId: recruiter.id },
    include: { shortlists: true },
    orderBy: { postedAt: "desc" },
  });
  res.json(jobs);
});
