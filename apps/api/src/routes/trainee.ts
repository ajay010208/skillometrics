import { Router } from "express";
import { requireRole, requireProfile } from "../lib/auth.js";
import { getPrisma, jparse, jstring } from "../lib/db.js";
import { aiPost } from "../lib/ai.js";
import { scoreJobForTrainee, type SkillReq } from "../lib/match.js";

export const traineeRouter = Router();

// ---- helpers ----
export async function getTraineeForProfile(profileId: string, role: string) {
  const prisma = getPrisma();
  if (role === "admin") {
    return prisma.trainee.findFirst({ include: { targetJob: true, skills: { include: { skill: true } } } });
  }
  const t = await prisma.trainee.findUnique({
    where: { profileId },
    include: { targetJob: true, skills: { include: { skill: true } } },
  });
  return t;
}

function readinessFrom(trainee: {
  skills: Array<{ skillId: string; level: number }>;
  targetJob: { requiredSkills: string } | null;
}): number {
  if (!trainee.targetJob) return 0;
  const reqs = jparse<SkillReq[]>(trainee.targetJob.requiredSkills, []);
  if (reqs.length === 0) return 0;
  const levelBySkill = new Map(trainee.skills.map((s) => [s.skillId, s.level]));
  let sum = 0;
  let total = 0;
  for (const r of reqs) {
    const lvl = levelBySkill.get(r.skillId) ?? 0;
    sum += Math.min(100, Math.round((lvl / Math.max(1, r.minLevel)) * 100)) * r.weight;
    total += r.weight;
  }
  return total > 0 ? Math.round(sum / total) : 0;
}

export { readinessFrom };

// ---- routes ----

/** Demo persona login bridge: resolves email -> profile id. */
traineeRouter.post("/auth/demo-login", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email required" });
  const profile = await getPrisma().profile.findUnique({ where: { email } });
  if (!profile) return res.status(404).json({ error: "No profile for that email" });
  res.json({ id: profile.id, email: profile.email, name: profile.name, role: profile.role });
});

/** List demo personas for the login screen. */
traineeRouter.get("/auth/personas", async (_req, res) => {
  const profiles = await getPrisma().profile.findMany({
    where: { email: { contains: "demo" } },
    take: 8,
  });
  res.json(profiles.map((p) => ({ id: p.id, email: p.email, name: p.name, role: p.role })));
});

traineeRouter.get("/auth/me", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  let trainee = null;
  let recruiter = null;
  let provider = null;
  if (profile.role === "trainee") {
    trainee = await prisma.trainee.findUnique({
      where: { profileId: profile.id },
      include: { targetJob: true, skills: { include: { skill: true } } },
    });
  } else if (profile.role === "recruiter") {
    recruiter = await prisma.recruiter.findUnique({ where: { profileId: profile.id } });
  } else if (profile.role === "provider") {
    provider = await prisma.provider.findUnique({ where: { profileId: profile.id } });
  }
  res.json({ profile, trainee, recruiter, provider });
});

/** Onboarding: create/update trainee with consent + target job or resume text. */
traineeRouter.post("/trainees/onboard", async (req, res) => {
  const profile = requireProfile(req);
  if (profile.role !== "trainee") return res.status(403).json({ error: "Trainee role required" });
  const prisma = getPrisma();
  const {
    name,
    phone,
    state,
    district,
    age,
    gender,
    category,
    education,
    weeklyHours,
    consentTracking,
    targetJobTitle,
    resumeText,
    resumeFileName,
    linkedinUrl,
    githubUrl,
    portfolioUrl,
  } = req.body as Record<string, string | number | boolean | undefined>;

  const str = (v: string | number | boolean | undefined): string | undefined =>
    typeof v === "string" ? v : undefined;
  const num = (v: string | number | boolean | undefined): number | undefined =>
    typeof v === "number" ? v : undefined;

  let trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  const data: Record<string, unknown> = {
    name: str(name) || profile.name,
    phone: str(phone),
    state: str(state) ?? trainee?.state ?? "Maharashtra",
    district: str(district) ?? trainee?.district ?? "Pune",
    age: num(age),
    gender: str(gender),
    category: str(category),
    education: str(education),
    weeklyHours: num(weeklyHours) || trainee?.weeklyHours || 10,
    consentTracking: consentTracking !== false,
    linkedinUrl: str(linkedinUrl),
    githubUrl: str(githubUrl),
    portfolioUrl: str(portfolioUrl),
  };
  // Skills passed as [{name, level}] — upserted after the trainee row is saved.
  const incomingSkills = Array.isArray(req.body?.skills)
    ? (req.body.skills as Array<{ name: string; level?: number }>)
    : [];
  if (!trainee) {
    trainee = await prisma.trainee.create({
      data: {
        profileId: profile.id,
        name: (data.name as string) || profile.name,
        state: (data.state as string) || "Maharashtra",
        district: (data.district as string) || "Pune",
        phone: data.phone as string | undefined,
        age: data.age as number | undefined,
        gender: data.gender as string | undefined,
        category: data.category as string | undefined,
        education: data.education as string | undefined,
        weeklyHours: (data.weeklyHours as number) || 10,
        consentTracking: data.consentTracking as boolean,
        linkedinUrl: data.linkedinUrl as string | undefined,
        githubUrl: data.githubUrl as string | undefined,
        portfolioUrl: data.portfolioUrl as string | undefined,
      },
    });
  } else {
    trainee = await prisma.trainee.update({ where: { id: trainee.id }, data });
  }

  // consent log
  if (consentTracking !== false) {
    await prisma.consentLog.create({
      data: { traineeId: trainee.id, action: "granted", detail: "Onboarding consent" },
    });
  }

  // target job path
  const chosenJobTitle = typeof targetJobTitle === "string" ? targetJobTitle : undefined;
  if (chosenJobTitle) {
    const tj = await prisma.targetJob.findUnique({ where: { title: chosenJobTitle } });
    if (tj) {
      await prisma.trainee.update({ where: { id: trainee.id }, data: { targetJobId: tj.id } });
    }
  }

  // resume path: parse via AI (fallback handled by AI service)
  if (resumeText) {
    const resume = await prisma.resume.create({
      data: {
        traineeId: trainee.id,
        fileName: str(resumeFileName) || "resume.txt",
        extractedText: resumeText as string,
        parsedSkills: "[]",
      },
    });
    const parsed = await aiPost<{ skills: Array<{ name: string; level: number }>; experienceMonths: number }>(
      "/ai/parse-resume",
      { text: resumeText, targetJob: targetJobTitle ?? null }
    );
    if (parsed.data) {
      await prisma.resume.update({
        where: { id: resume.id },
        data: { parsedSkills: jstring(parsed.data.skills), experienceMonths: parsed.data.experienceMonths ?? 0 },
      });
      // upsert trainee skills from resume
      for (const s of parsed.data.skills) {
        const skill = await findOrCreateSkill(s.name);
        await prisma.traineeSkill.upsert({
          where: { traineeId_skillId: { traineeId: trainee.id, skillId: skill.id } },
          create: { traineeId: trainee.id, skillId: skill.id, level: s.level, source: "resume" },
          update: { level: Math.max(s.level, 30), source: "resume" },
        });
      }
    }
    // If a target job was chosen alongside resume, also seed gap baseline vs requirements
    if (chosenJobTitle) {
      const tj = await prisma.targetJob.findUnique({ where: { title: chosenJobTitle } });
      if (tj) await ensureBaselineSkills(trainee.id, tj);
    }
  }

  // upsert declared skills (from onboarding chips / profile editor)
  for (const s of incomingSkills) {
    if (!s?.name) continue;
    const skill = await findOrCreateSkill(s.name);
    const level = Math.max(5, Math.min(100, Math.round(s.level ?? 40)));
    const existing = await prisma.traineeSkill.findUnique({
      where: { traineeId_skillId: { traineeId: trainee.id, skillId: skill.id } },
    });
    if (existing) {
      await prisma.traineeSkill.update({ where: { id: existing.id }, data: { level: Math.max(existing.level, level), source: existing.source === "seed" ? "resume" : existing.source } });
    } else {
      await prisma.traineeSkill.create({
        data: { traineeId: trainee.id, skillId: skill.id, level, source: "resume" },
      });
    }
  }

  const updated = await prisma.trainee.findUnique({
    where: { id: trainee.id },
    include: { targetJob: true, skills: { include: { skill: true } } },
  });
  res.json({ trainee: updated });
});

async function findOrCreateSkill(name: string) {
  const prisma = getPrisma();
  const clean = name.trim();
  const all = await prisma.skill.findMany();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.]/g, "");
  const found = all.find(
    (s) => norm(s.name) === norm(clean) || jparse<string[]>(s.aliases, []).some((a) => norm(a) === norm(clean))
  );
  if (found) return found;
  return prisma.skill.create({ data: { name: clean, category: "General", aliases: "[]" } });
}

async function ensureBaselineSkills(traineeId: string, tj: { requiredSkills: string }) {
  const prisma = getPrisma();
  const reqs = jparse<SkillReq[]>(tj.requiredSkills, []);
  for (const r of reqs) {
    const existing = await prisma.traineeSkill.findUnique({
      where: { traineeId_skillId: { traineeId, skillId: r.skillId } },
    });
    if (!existing) {
      await prisma.traineeSkill.create({
        data: { traineeId, skillId: r.skillId, level: 0, source: "resume" },
      });
      // wait—level 0 means no evidence; use small baseline so gap is visible
      await prisma.traineeSkill.update({
        where: { traineeId_skillId: { traineeId, skillId: r.skillId } },
        data: { level: 0 },
      });
    }
  }
}

/** Skill analysis + reality check for the logged-in trainee. */
traineeRouter.get("/skill-analysis", async (req, res) => {
  const profile = requireProfile(req);
  const trainee = await getTraineeForProfile(profile.id, profile.role);
  if (!trainee) return res.status(404).json({ error: "Complete onboarding first" });
  const prisma = getPrisma();

  const targetJob = trainee.targetJob;
  if (!targetJob) return res.status(400).json({ error: "No target job set" });

  const reqs = jparse<SkillReq[]>(targetJob.requiredSkills, []);
  const levelBySkill = new Map(trainee.skills.map((s) => [s.skillId, s.level]));
  const skillRows = await Promise.all(
    reqs.map(async (r) => {
      const skill = await prisma.skill.findUnique({ where: { id: r.skillId }, include: { resources: true } });
      const level = levelBySkill.get(r.skillId) ?? 0;
      return {
        skillId: r.skillId,
        name: skill?.name ?? "?",
        category: skill?.category ?? "?",
        level,
        minLevel: r.minLevel,
        weight: r.weight,
        gap: Math.max(0, r.minLevel - level),
        met: level >= r.minLevel,
        resources: (skill?.resources ?? []).map((res) => ({
          id: res.id,
          title: res.title,
          platform: res.platform,
          url: res.url,
          language: res.language,
          cost: res.cost,
          durationHours: res.durationHours,
          prerequisites: jparse<string[]>(res.prerequisites, []),
          rating: res.rating,
          format: res.format,
        })),
      };
    })
  );

  // Reality check: benchmark vs live job market for this role in trainee's state
  const jobs = await prisma.job.findMany({
    where: { active: true, title: { contains: targetJob.title.split(" ")[0] } },
  });
  const jobsInState = jobs.filter((j) => j.state === trainee.state);
  const benchmark = skillRows.map((s) => {
    const demandPct = jobs.length
      ? Math.round(
          (jobs.filter((j) => jparse<SkillReq[]>(j.requiredSkills, []).some((r) => r.skillId === s.skillId)).length /
            jobs.length) *
            100
        )
      : 0;
    return { skillId: s.skillId, name: s.name, demandPct, traineeLevel: s.level };
  });

  const readiness = readinessFrom(trainee);
  const missing = skillRows.filter((s) => !s.met);
  const totalGapHours = missing.reduce((acc, s) => {
    const cheapest = s.resources.filter((r) => r.cost === "free").sort((a, b) => a.durationHours - b.durationHours)[0];
    return acc + (cheapest?.durationHours ?? 12);
  }, 0);
  const weeks = Math.max(1, Math.ceil(totalGapHours / Math.max(1, trainee.weeklyHours)));
  const etaDate = new Date(Date.now() + weeks * 7 * 86400_000);

  res.json({
    targetJob: { id: targetJob.id, title: targetJob.title, family: targetJob.family },
    readiness,
    hireableToday: readiness >= 70 && missing.length === 0,
    skills: skillRows,
    benchmark,
    realityCheck: {
      requirementsMet: skillRows.length - missing.length,
      requirementsTotal: skillRows.length,
      biggestGaps: missing.sort((a, b) => b.gap - a.gap).slice(0, 3).map((s) => s.name),
      totalGapHours,
      weeklyHours: trainee.weeklyHours,
      estimatedWeeks: weeks,
      etaDate: etaDate.toISOString(),
      jobsAnalyzed: jobs.length,
      jobsInState: jobsInState.length,
    },
    source: "computed",
  });
});

/** Trainee's own skill profile (all skills, any source). */
traineeRouter.get("/trainees/me/skills", async (req, res) => {
  const profile = requireProfile(req);
  const trainee = await getTraineeForProfile(profile.id, profile.role);
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  res.json(trainee.skills.map((s) => ({ ...s, skill: { id: s.skill.id, name: s.skill.name, category: s.skill.category } })));
});

/** Update profile: LinkedIn/GitHub, recruiter visibility, consent, weekly hours. */
traineeRouter.patch("/trainees/me", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof b.linkedinUrl === "string") data.linkedinUrl = b.linkedinUrl;
  if (typeof b.githubUrl === "string") data.githubUrl = b.githubUrl;
  if (typeof b.portfolioUrl === "string") data.portfolioUrl = b.portfolioUrl;
  if (typeof b.weeklyHours === "number") data.weeklyHours = b.weeklyHours;
  if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
  if (typeof b.phone === "string") data.phone = b.phone;
  if (typeof b.state === "string" && b.state) data.state = b.state;
  if (typeof b.district === "string") data.district = b.district;
  if (typeof b.education === "string") data.education = b.education;
  if (typeof b.age === "number") data.age = b.age;
  if (typeof b.gender === "string") data.gender = b.gender;
  if (typeof b.category === "string") data.category = b.category;
  if (typeof b.targetJobTitle === "string" && b.targetJobTitle) {
    const tj = await prisma.targetJob.findUnique({ where: { title: b.targetJobTitle } });
    if (tj) data.targetJobId = tj.id;
  }
  if (typeof b.consentTracking === "boolean") {
    data.consentTracking = b.consentTracking;
    await prisma.consentLog.create({
      data: {
        traineeId: trainee.id,
        action: b.consentTracking ? "granted" : "revoked",
        detail: "Updated from profile",
      },
    });
  }
  if (typeof b.consentRecruiterVisible === "boolean") {
    data.consentRecruiterVisible = b.consentRecruiterVisible;
    await prisma.consentLog.create({
      data: {
        traineeId: trainee.id,
        action: b.consentRecruiterVisible ? "recruiter-visible" : "recruiter-hidden",
        detail: "Updated from profile",
      },
    });
  }
  const updated = await prisma.trainee.update({ where: { id: trainee.id }, data });
  res.json(updated);
});

// ---- Roadmap ----

/** Build/refresh roadmap from skill gaps with real resource referrals + durations. */
traineeRouter.post("/roadmap/build", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({
    where: { profileId: profile.id },
    include: { skills: true, targetJob: true },
  });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const { weeklyHours } = (req.body ?? {}) as { weeklyHours?: number };
  const wh = weeklyHours ?? trainee.weeklyHours;

  if (!trainee.targetJob) return res.status(400).json({ error: "No target job set" });
  const reqs = jparse<SkillReq[]>(trainee.targetJob.requiredSkills, []);
  const levelBySkill = new Map(trainee.skills.map((s) => [s.skillId, s.level]));
  const gaps = reqs
    .map((r) => ({ ...r, level: levelBySkill.get(r.skillId) ?? 0 }))
    .filter((r) => r.level < r.minLevel)
    .sort((a, b) => b.weight * (b.minLevel - b.level) - a.weight * (a.minLevel - a.level));

  // clear pending items, keep completed ones
  await prisma.roadmapItem.deleteMany({ where: { traineeId: trainee.id, status: { not: "done" } } });

  let order = await prisma.roadmapItem.count({ where: { traineeId: trainee.id } });
  const items = [];
  let cursor = Date.now();
  for (const gap of gaps) {
    const resources = await prisma.learningResource.findMany({
      where: { skillId: gap.skillId },
      orderBy: [{ cost: "asc" }, { rating: "desc" }],
    });
    // rank: free-first, language English/Hindi, shortest that covers the gap
    const ranked = [...resources].sort((a, b) => {
      const costScore = (r: typeof a) => (r.cost === "free" ? 0 : r.cost === "freemium" ? 1 : 2);
      return costScore(a) - costScore(b) || b.rating - a.rating;
    });
    const pick = ranked[0];
    const estHours = pick ? Math.min(pick.durationHours, Math.max(6, gap.minLevel - gap.level)) : Math.max(6, gap.minLevel - gap.level);
    const targetWeeks = Math.max(1, Math.ceil(estHours / wh));
    const est = new Date(cursor + targetWeeks * 7 * 86400_000);
    cursor = est.getTime();
    items.push({
      traineeId: trainee.id,
      skillId: gap.skillId,
      resourceId: pick?.id ?? null,
      estHours,
      weeklyHours: wh,
      targetWeeks,
      estCompletionDate: est,
      order: order++,
    });
  }
  await prisma.roadmapItem.createMany({ data: items });
  const roadmap = await prisma.roadmapItem.findMany({
    where: { traineeId: trainee.id },
    include: { skill: true, resource: true },
    orderBy: { order: "asc" },
  });
  res.json({ items: roadmap, weeklyHours: wh });
});

traineeRouter.get("/roadmap", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const roadmap = await prisma.roadmapItem.findMany({
    where: { traineeId: trainee.id },
    include: { skill: true, resource: true },
    orderBy: { order: "asc" },
  });
  res.json({ items: roadmap, weeklyHours: trainee.weeklyHours });
});

/** Progress a roadmap item: pending -> in-progress -> done. */
traineeRouter.patch("/roadmap/:id", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const item = await prisma.roadmapItem.findUnique({ where: { id: req.params.id } });
  if (!item || item.traineeId !== trainee.id) return res.status(404).json({ error: "Not found" });
  const { status } = req.body as { status?: string };
  if (!status || !["pending", "in-progress", "done"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const updated = await prisma.roadmapItem.update({ where: { id: item.id }, data: { status } });
  res.json(updated);
});

// ---- Assessments ----

/** Start an assessment for a skill: AI-generated or bank fallback. */
traineeRouter.post("/assessments/start", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const { skillId } = req.body as { skillId?: string };
  const skill = await prisma.skill.findUnique({ where: { id: skillId } });
  if (!skill) return res.status(404).json({ error: "Skill not found" });

  const gen = await aiPost<{ questions: Array<{ q: string; options: string[]; answerIdx: number }> }>(
    "/ai/generate-quiz",
    { skill: skill.name, level: "mixed" }
  );
  const questions = gen.data?.questions ?? [];
  const assessment = await prisma.assessment.create({
    data: {
      traineeId: trainee.id,
      skillId: skill.id,
      questions: jstring(questions),
    },
  });
  // return without answerIdx
  res.json({
    id: assessment.id,
    skill: { id: skill.id, name: skill.name },
    questions: questions.map(({ q, options }) => ({ q, options })),
    source: gen.source,
  });
});

/** Submit answers; score updates TraineeSkill.level. */
traineeRouter.post("/assessments/:id/submit", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const assessment = await prisma.assessment.findUnique({ where: { id: req.params.id } });
  if (!assessment || assessment.traineeId !== trainee.id) return res.status(404).json({ error: "Not found" });
  const { answers } = req.body as { answers?: number[] };
  const questions = jparse<Array<{ q: string; options: string[]; answerIdx: number }>>(assessment.questions, []);
  if (!answers || answers.length !== questions.length) {
    return res.status(400).json({ error: `Expected ${questions.length} answers` });
  }
  const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.answerIdx ? 1 : 0), 0);
  const score = Math.round((correct / questions.length) * 100);
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { answers: jstring(answers), score },
  });
  // update skill level (assessment evidence)
  const newLevel = Math.max(
    0,
    Math.min(100, score)
  );
  const existing = await prisma.traineeSkill.findUnique({
    where: { traineeId_skillId: { traineeId: trainee.id, skillId: assessment.skillId } },
  });
  if (existing) {
    await prisma.traineeSkill.update({
      where: { id: existing.id },
      data: { level: Math.max(existing.level, newLevel), source: "assessment" },
    });
  } else {
    await prisma.traineeSkill.create({
      data: { traineeId: trainee.id, skillId: assessment.skillId, level: newLevel, source: "assessment" },
    });
  }
  res.json({ score, correct, total: questions.length });
});

// ---- Projects ----

traineeRouter.post("/projects", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const { title, description, repoUrl, liveUrl } = req.body as Record<string, string>;
  if (!title || !description) return res.status(400).json({ error: "title and description required" });
  const project = await prisma.projectSubmission.create({
    data: { traineeId: trainee.id, title, description, repoUrl, liveUrl },
  });
  // evaluate via AI (fallback inside AI service)
  const traineeSkills = await prisma.traineeSkill.findMany({ where: { traineeId: trainee.id }, include: { skill: true } });
  const ev = await aiPost<{ evaluation: Array<{ skillId: string; verdict: string; feedback: string }> }>(
    "/ai/evaluate-project",
    {
      title,
      description,
      skills: traineeSkills.map((s) => ({ id: s.skillId, name: s.skill.name })),
      targetJob: trainee.targetJobId,
    }
  );
  if (ev.data?.evaluation?.length) {
    await prisma.projectSubmission.update({
      where: { id: project.id },
      data: { evaluation: jstring(ev.data.evaluation) },
    });
    for (const v of ev.data.evaluation) {
      if (v.verdict === "validated") {
        const existing = await prisma.traineeSkill.findUnique({
          where: { traineeId_skillId: { traineeId: trainee.id, skillId: v.skillId } },
        });
        if (existing) {
          await prisma.traineeSkill.update({
            where: { id: existing.id },
            data: { level: Math.max(existing.level, 75), source: "project" },
          });
        } else {
          await prisma.traineeSkill.create({
            data: { traineeId: trainee.id, skillId: v.skillId, level: 75, source: "project" },
          });
        }
      }
    }
  }
  const updated = await prisma.projectSubmission.findUnique({ where: { id: project.id } });
  res.json(updated);
});

traineeRouter.get("/projects", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const projects = await prisma.projectSubmission.findMany({
    where: { traineeId: trainee.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(projects);
});

// ---- Jobs & matching ----

/** Ranked job matches with explainable breakdowns. */
traineeRouter.get("/jobs/matches", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const jobs = await prisma.job.findMany({ where: { active: true }, include: { recruiter: true } });
  const scored = await Promise.all(
    jobs.map(async (job) => {
      const breakdown = await scoreJobForTrainee(trainee.id, job.id);
      const match = await prisma.match.findUnique({
        where: { traineeId_jobId: { traineeId: trainee.id, jobId: job.id } },
      });
      return { job, match, breakdown };
    })
  );
  scored.sort((a, b) => (b.breakdown?.score ?? 0) - (a.breakdown?.score ?? 0));
  res.json(scored);
});

/** Apply / withdraw / mark status on a match. */
traineeRouter.post("/jobs/:id/apply", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const job = await prisma.job.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ error: "Job not found" });
  const match = await prisma.match.upsert({
    where: { traineeId_jobId: { traineeId: trainee.id, jobId: job.id } },
    create: { traineeId: trainee.id, jobId: job.id, score: 0, status: "applied" },
    update: { status: "applied" },
  });
  res.json(match);
});

/** Record a placement (self-reported; employer verification via admin/recruiter). */
traineeRouter.post("/placements", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const {
    employer,
    jobTitle,
    joiningDate,
    monthlySalary,
    district,
    type,
  } = req.body as Record<string, string>;
  if (!employer || !jobTitle || !joiningDate || !monthlySalary) {
    return res.status(400).json({ error: "employer, jobTitle, joiningDate, monthlySalary required" });
  }
  const placement = await prisma.placement.create({
    data: {
      traineeId: trainee.id,
      employer,
      jobTitle,
      joiningDate: new Date(joiningDate as string),
      monthlySalary: Number(monthlySalary),
      state: trainee.state,
      district: (district as string) || trainee.district,
      type: (type as string) || "job",
      sourceMatchId: null,
    },
  });
  await prisma.trainee.update({ where: { id: trainee.id }, data: { currentStatus: "placed" } });

  // generate follow-up schedule 3/6/12 months
  const joining = new Date(joiningDate);
  const milestones = [3, 6, 12];
  for (const m of milestones) {
    await prisma.followUp.create({
      data: {
        placementId: placement.id,
        milestone: m,
        dueAt: new Date(joining.getTime() + m * 30 * 86400_000),
      },
    });
  }
  res.json(placement);
});

traineeRouter.get("/placements", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const placements = await prisma.placement.findMany({
    where: { traineeId: trainee.id },
    include: { followUps: { orderBy: { milestone: "asc" } }, reviews: true },
  });
  res.json(placements);
});

// ---- Company reviews ----

/** Create a review — only allowed if trainee has a placement at that company. */
traineeRouter.post("/reviews", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const {
    placementId,
    overallRating,
    interviewDifficulty,
    interviewQuestions,
    preparationTips,
    workCultureRating,
    salaryNegotiationNotes,
    wouldRecommend,
    text,
  } = req.body as Record<string, unknown>;
  const placement = await prisma.placement.findUnique({ where: { id: placementId as string } });
  if (!placement || placement.traineeId !== trainee.id) {
    return res.status(403).json({ error: "You can only review companies where you were placed" });
  }
  const review = await prisma.companyReview.create({
    data: {
      placementId: placement.id,
      companyName: placement.employer,
      overallRating: Number(overallRating),
      interviewDifficulty: Number(interviewDifficulty),
      interviewQuestions: jstring(interviewQuestions ?? []),
      preparationTips: preparationTips as string,
      workCultureRating: Number(workCultureRating),
      salaryNegotiationNotes: salaryNegotiationNotes as string,
      wouldRecommend: wouldRecommend !== false,
      text: text as string,
    },
  });
  res.json(review);
});

/** Reviews for a company (public to logged-in users). */
traineeRouter.get("/reviews/company/:name", async (req, res) => {
  const prisma = getPrisma();
  const reviews = await prisma.companyReview.findMany({
    where: { companyName: { contains: req.params.name } },
    include: { placement: { include: { trainee: { select: { name: true, district: true, state: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    reviews.map((r) => ({
      ...r,
      verified: true,
      placedOn: r.placement.joiningDate,
      trainee: r.placement.trainee,
      interviewQuestions: jparse<string[]>(r.interviewQuestions, []),
    }))
  );
});

// ---- Follow-ups (trainee view) ----

traineeRouter.get("/followups", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const followUps = await prisma.followUp.findMany({
    where: { placement: { traineeId: trainee.id } },
    include: { placement: true },
    orderBy: { dueAt: "asc" },
  });
  res.json(followUps);
});

/** Trainee completes a follow-up check-in. */
traineeRouter.post("/followups/:id/complete", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = await prisma.trainee.findUnique({ where: { profileId: profile.id } });
  if (!trainee) return res.status(404).json({ error: "No trainee" });
  const fu = await prisma.followUp.findUnique({ where: { id: req.params.id }, include: { placement: true } });
  if (!fu || fu.placement.traineeId !== trainee.id) return res.status(404).json({ error: "Not found" });
  const { stillEmployed, currentSalary, skillUsage, notes } = req.body as Record<string, unknown>;
  const updated = await prisma.followUp.update({
    where: { id: fu.id },
    data: {
      completedAt: new Date(),
      stillEmployed: Boolean(stillEmployed),
      currentSalary: currentSalary ? Number(currentSalary) : fu.placement.monthlySalary,
      skillUsage: skillUsage ? Number(skillUsage) : null,
      notes: notes as string,
      channel: "self-serve",
    },
  });
  if (stillEmployed === false) {
    await prisma.placement.update({ where: { id: fu.placementId }, data: { active: false } });
  }
  res.json(updated);
});
