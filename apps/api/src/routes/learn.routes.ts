import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { AppError } from "../middlewares/error.middleware";

const router = Router();

router.get("/modules", async (_req, res, next) => {
  try {
    const modules = await prisma.module.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      include: { _count: { select: { lessons: true } } },
    });
    res.json({ status: "success", data: modules });
  } catch (err) { next(err); }
});

router.get("/modules/:moduleId/lessons", async (req, res, next) => {
  try {
    const lessons = await prisma.lesson.findMany({
      where: { moduleId: req.params.moduleId, isPublished: true },
      orderBy: { order: "asc" },
    });
    res.json({ status: "success", data: lessons });
  } catch (err) { next(err); }
});

router.post("/progress", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { moduleId, lessonId, completed, score } = req.body;
    const progress = await prisma.learningProgress.upsert({
      where: { userId_moduleId_lessonId: { userId: req.userId!, moduleId, lessonId } },
      update: { completed, score, attempts: { increment: 1 }, completedAt: completed ? new Date() : null },
      create: { userId: req.userId!, moduleId, lessonId, completed, score, attempts: 1, completedAt: completed ? new Date() : null },
    });

    if (completed) {
      await prisma.userStreak.upsert({
        where: { userId: req.userId! },
        update: { currentStreak: { increment: 1 }, lastActiveAt: new Date() },
        create: { userId: req.userId!, currentStreak: 1, longestStreak: 1 },
      });
    }

    res.json({ status: "success", data: progress });
  } catch (err) { next(err); }
});

router.get("/progress", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const progress = await prisma.learningProgress.findMany({
      where: { userId: req.userId! },
      include: { lesson: true },
    });
    const streak = await prisma.userStreak.findUnique({ where: { userId: req.userId! } });
    res.json({ status: "success", data: { progress, streak } });
  } catch (err) { next(err); }
});

router.post("/quiz", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { lessonId, score, maxScore } = req.body;
    const passed = score >= maxScore * 0.7;
    const attempt = await prisma.quizAttempt.create({
      data: { userId: req.userId!, lessonId, score, maxScore, passed },
    });
    res.json({ status: "success", data: { ...attempt, passed, percentage: Math.round((score / maxScore) * 100) } });
  } catch (err) { next(err); }
});

export default router;
