import { Router } from "express";
import { requireProfile } from "../lib/auth.js";
import { getPrisma } from "../lib/db.js";
import { aiPost } from "../lib/ai.js";

export const chatRouter = Router();

/** Chat history for the logged-in profile. */
chatRouter.get("/history", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = profile.role === "trainee"
    ? await prisma.trainee.findUnique({ where: { profileId: profile.id } })
    : null;
  const messages = await prisma.chatMessage.findMany({
    where: trainee ? { traineeId: trainee.id } : { profileId: profile.id },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  res.json(messages);
});

/** Send a message to the AI Career Counsellor (proxied to FastAPI agent). */
chatRouter.post("/", async (req, res) => {
  const profile = requireProfile(req);
  const prisma = getPrisma();
  const trainee = profile.role === "trainee"
    ? await prisma.trainee.findUnique({
        where: { profileId: profile.id },
        include: { skills: { include: { skill: true } }, targetJob: true, placements: true },
      })
    : null;

  // Pre-compute real tool data so the agent answers from platform state.
  let agentContext: Record<string, unknown> = {};
  if (trainee) {
    const { scoreJobForTrainee } = await import("../lib/match.js");
    const { readinessFrom } = await import("./trainee.js");
    const jobs = await prisma.job.findMany({ where: { active: true }, take: 30 });
    const scored = await Promise.all(
      jobs.map(async (j) => ({ j, b: await scoreJobForTrainee(trainee.id, j.id) }))
    );
    const recentMatches = scored
      .filter((s) => s.b)
      .sort((a, b) => (b.b!.score ?? 0) - (a.b!.score ?? 0))
      .slice(0, 4)
      .map((s) => ({
        title: s.j.title,
        company: s.j.company,
        district: s.j.district,
        salaryMin: s.j.salaryMin,
        salaryMax: s.j.salaryMax,
        score: s.b!.score,
      }));
    const nextItem = await prisma.roadmapItem.findFirst({
      where: { traineeId: trainee.id, status: { not: "done" } },
      include: { skill: true, resource: true },
      orderBy: { order: "asc" },
    });
    const gapSkills = trainee.skills.filter((s) => s.level < 60).slice(0, 2);
    const suggestedResources = gapSkills.length
      ? await prisma.learningResource.findMany({
          where: { skillId: { in: gapSkills.map((s) => s.skillId) }, cost: "free" },
          take: 4,
          orderBy: { rating: "desc" },
        })
      : [];
    agentContext = {
      trainee: {
        state: trainee.state,
        district: trainee.district,
        targetJob: trainee.targetJob?.title ?? null,
        skills: trainee.skills.map((s) => ({ name: s.skill.name, level: s.level })),
        readiness: readinessFrom(trainee),
        placed: trainee.placements.length > 0,
        recentMatches,
        nextRoadmapItem: nextItem
          ? {
              advice: nextItem.resource
                ? `Work on ${nextItem.skill.name} using "${nextItem.resource.title}" on ${nextItem.resource.platform} (~${nextItem.resource.durationHours}h, ${nextItem.resource.cost}) — about ${nextItem.targetWeeks} week(s) at ${trainee.weeklyHours}h/week.`
                : `Practice ${nextItem.skill.name} — then take its assessment.`,
              resource: nextItem.resource
                ? { title: nextItem.resource.title, platform: nextItem.resource.platform, cost: nextItem.resource.cost, durationHours: nextItem.resource.durationHours, weeks: nextItem.targetWeeks }
                : null,
            }
          : { advice: "All roadmap items done — take pending assessments and start applying to jobs." },
        suggestedResources: suggestedResources.map((r) => ({
          title: r.title, platform: r.platform, url: r.url, cost: r.cost, durationHours: r.durationHours, language: r.language,
        })),
      },
    };
  }

  const { message } = req.body as { message?: string };
  if (!message) return res.status(400).json({ error: "message required" });

  await prisma.chatMessage.create({
    data: {
      profileId: trainee ? null : profile.id,
      traineeId: trainee?.id ?? null,
      role: "user",
      content: message,
    },
  });

  const reply = await aiPost<{ reply: string; toolsUsed: string[] }>(
    "/ai/agent/chat",
    {
      message,
      profile: {
        role: profile.role,
        name: profile.name,
        ...agentContext,
      },
    },
    60000
  );

  const replyText =
    reply.data?.reply ??
    "I'm the SkilloMetrics career counsellor. I'm running in fallback mode right now, so my answers are limited — but I can still point you to your Skill Analysis, Roadmap, and Jobs pages. Try: \"What should I do this week?\"";

  await prisma.chatMessage.create({
    data: {
      profileId: trainee ? null : profile.id,
      traineeId: trainee?.id ?? null,
      role: "agent",
      content: replyText,
    },
  });
  res.json({ reply: replyText, source: reply.source, toolsUsed: reply.data?.toolsUsed ?? [] });
});
