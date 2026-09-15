import { Router } from "express";
import { requireRole } from "../lib/auth.js";
import { getPrisma, jparse, jstring } from "../lib/db.js";
import { tickFollowUps } from "./dashboard.js";

export const adminRouter = Router();

adminRouter.use(async (req, res, next) => {
  try {
    await requireRole(req, "admin");
    next();
  } catch (e) {
    next(e);
  }
});

async function audit(entity: string, action: string, detail: string, entityId?: string) {
  await getPrisma().auditLog.create({
    data: { actorLabel: "admin", entity, action, detail, entityId },
  });
}

// ---- generic list endpoints ----
adminRouter.get("/trainees", async (_req, res) => {
  const rows = await getPrisma().trainee.findMany({
    include: { targetJob: true, placements: true, enrollments: { include: { course: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(rows);
});

adminRouter.get("/providers", async (_req, res) => {
  const rows = await getPrisma().provider.findMany({ include: { courses: { include: { enrollments: true } } } });
  res.json(rows);
});

adminRouter.get("/courses", async (_req, res) => {
  const rows = await getPrisma().course.findMany({ include: { provider: true, enrollments: true } });
  res.json(rows);
});

adminRouter.get("/jobs", async (_req, res) => {
  const rows = await getPrisma().job.findMany({ include: { recruiter: true }, orderBy: { postedAt: "desc" } });
  res.json(rows);
});

adminRouter.get("/skills", async (_req, res) => {
  res.json(await getPrisma().skill.findMany({ orderBy: { name: "asc" } }));
});

adminRouter.get("/resources", async (_req, res) => {
  const rows = await getPrisma().learningResource.findMany({ include: { skill: true } });
  res.json(rows.map((r) => ({ ...r, prerequisites: jparse<string[]>(r.prerequisites, []) })));
});

adminRouter.get("/placements", async (_req, res) => {
  const rows = await getPrisma().placement.findMany({
    include: { trainee: { select: { name: true, state: true, district: true } }, followUps: true },
    orderBy: { joiningDate: "desc" },
  });
  res.json(rows);
});

adminRouter.get("/audit", async (_req, res) => {
  res.json(await getPrisma().auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
});

// ---- CRUD: jobs ----
adminRouter.post("/jobs", async (req, res) => {
  const prisma = getPrisma();
  const b = req.body as Record<string, string | number | boolean>;
  const job = await prisma.job.create({
    data: {
      title: String(b.title),
      company: String(b.company),
      state: String(b.state),
      district: String(b.district),
      salaryMin: Number(b.salaryMin),
      salaryMax: Number(b.salaryMax ?? b.salaryMin),
      source: String(b.source ?? "platform"),
      requiredSkills: jstring(b.requiredSkills ?? []),
      description: b.description ? String(b.description) : undefined,
    },
  });
  await audit("Job", "create", `${job.title} @ ${job.company}`, job.id);
  res.json(job);
});

adminRouter.patch("/jobs/:id", async (req, res) => {
  const prisma = getPrisma();
  const b = req.body as Record<string, string | number | boolean>;
  const data: Record<string, unknown> = {};
  for (const k of ["title", "company", "state", "district", "source", "description"]) {
    if (b[k] !== undefined) data[k] = String(b[k]);
  }
  for (const k of ["salaryMin", "salaryMax"]) {
    if (b[k] !== undefined) data[k] = Number(b[k]);
  }
  if (b.active !== undefined) data.active = Boolean(b.active);
  const job = await prisma.job.update({ where: { id: req.params.id }, data });
  await audit("Job", "update", `${job.title} @ ${job.company}`, job.id);
  res.json(job);
});

adminRouter.delete("/jobs/:id", async (req, res) => {
  const prisma = getPrisma();
  await prisma.job.update({ where: { id: req.params.id }, data: { active: false } });
  await audit("Job", "retire", req.params.id);
  res.json({ ok: true });
});

// ---- CRUD: skills & target jobs ----
adminRouter.post("/skills", async (req, res) => {
  const b = req.body as { name: string; category?: string; aliases?: string[] };
  const skill = await getPrisma().skill.create({
    data: { name: b.name, category: b.category ?? "General", aliases: jstring(b.aliases ?? []) },
  });
  await audit("Skill", "create", b.name, skill.id);
  res.json(skill);
});

adminRouter.post("/target-jobs", async (req, res) => {
  const prisma = getPrisma();
  const b = req.body as { title: string; family?: string; requiredSkills: Array<{ skillId: string; weight: number; minLevel: number }> };
  const tj = await prisma.targetJob.create({
    data: {
      title: b.title,
      family: b.family ?? "General",
      requiredSkills: jstring(b.requiredSkills),
    },
  });
  await audit("TargetJob", "create", b.title, tj.id);
  res.json(tj);
});

// ---- CRUD: learning resources ----
adminRouter.post("/resources", async (req, res) => {
  const prisma = getPrisma();
  const b = req.body as Record<string, string | number>;
  const resource = await prisma.learningResource.create({
    data: {
      skillId: String(b.skillId),
      title: String(b.title),
      platform: String(b.platform),
      url: String(b.url),
      language: String(b.language ?? "English"),
      cost: String(b.cost ?? "free"),
      durationHours: Number(b.durationHours ?? 10),
      prerequisites: jstring(b.prerequisites ?? []),
      rating: Number(b.rating ?? 4.5),
      format: String(b.format ?? "course"),
    },
  });
  await audit("LearningResource", "create", resource.title, resource.id);
  res.json(resource);
});

adminRouter.patch("/resources/:id", async (req, res) => {
  const prisma = getPrisma();
  const b = req.body as Record<string, string | number>;
  const data: Record<string, unknown> = {};
  for (const k of ["title", "platform", "url", "language", "cost", "format"]) {
    if (b[k] !== undefined) data[k] = String(b[k]);
  }
  for (const k of ["durationHours", "rating"]) {
    if (b[k] !== undefined) data[k] = Number(b[k]);
  }
  const resource = await prisma.learningResource.update({ where: { id: req.params.id }, data });
  await audit("LearningResource", "update", resource.title, resource.id);
  res.json(resource);
});

adminRouter.delete("/resources/:id", async (req, res) => {
  await getPrisma().learningResource.delete({ where: { id: req.params.id } });
  await audit("LearningResource", "delete", req.params.id);
  res.json({ ok: true });
});

// ---- CRUD: providers & courses ----
adminRouter.post("/providers", async (req, res) => {
  const b = req.body as { name: string; state: string; city?: string; type?: string };
  const provider = await getPrisma().provider.create({
    data: { name: b.name, state: b.state, city: b.city, type: b.type },
  });
  await audit("Provider", "create", b.name, provider.id);
  res.json(provider);
});

adminRouter.post("/courses", async (req, res) => {
  const prisma = getPrisma();
  const b = req.body as { providerId: string; name: string; category?: string; durationMonths?: number };
  const course = await prisma.course.create({
    data: {
      providerId: b.providerId,
      name: b.name,
      category: b.category,
      durationMonths: b.durationMonths ?? 3,
    },
  });
  await audit("Course", "create", b.name, course.id);
  res.json(course);
});

// ---- placements: verify ----
adminRouter.patch("/placements/:id/verify", async (req, res) => {
  const prisma = getPrisma();
  const placement = await prisma.placement.update({
    where: { id: req.params.id },
    data: { employerVerified: true },
  });
  await audit("Placement", "verify", `${placement.employer} / ${placement.jobTitle}`, placement.id);
  res.json(placement);
});

// ---- follow-ups: run tick ----
adminRouter.post("/followups/tick", async (_req, res) => {
  const n = await tickFollowUps();
  await audit("FollowUp", "tick", `${n} due follow-ups processed`);
  res.json({ processed: n });
});

adminRouter.get("/followups/overdue", async (_req, res) => {
  const rows = await getPrisma().followUp.findMany({
    where: { completedAt: null, dueAt: { lt: new Date() } },
    include: { placement: { include: { trainee: { select: { name: true, phone: true, state: true } } } } },
    orderBy: { dueAt: "asc" },
  });
  res.json(rows);
});

// ---- consent / deletion ----
adminRouter.get("/consent", async (_req, res) => {
  const prisma = getPrisma();
  const [total, tracking, recruiterVisible] = await Promise.all([
    prisma.trainee.count(),
    prisma.trainee.count({ where: { consentTracking: true } }),
    prisma.trainee.count({ where: { consentRecruiterVisible: true } }),
  ]);
  const logs = await prisma.consentLog.findMany({
    include: { trainee: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ total, tracking, recruiterVisible, logs });
});

adminRouter.post("/consent/deletion-request/:traineeId", async (req, res) => {
  const prisma = getPrisma();
  const t = await prisma.trainee.findUnique({ where: { id: req.params.traineeId } });
  if (!t) return res.status(404).json({ error: "Not found" });
  await prisma.trainee.update({
    where: { id: t.id },
    data: { consentTracking: false, consentRecruiterVisible: false },
  });
  await prisma.consentLog.create({
    data: { traineeId: t.id, action: "deletion-request", detail: "Data deletion requested via admin" },
  });
  await audit("Trainee", "deletion-request", t.name, t.id);
  res.json({ ok: true });
});
