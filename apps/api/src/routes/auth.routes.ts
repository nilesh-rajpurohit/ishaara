import { Router } from "express";
import { z } from "zod";
import * as authService from "../services/auth.service";
import { AppError } from "../middlewares/error.middleware";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  preferredLang: z.string().optional(),
  isDeaf: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.registerUser(
      body.email,
      body.password,
      body.name,
      body.preferredLang,
      body.isDeaf
    );
    res.status(201).json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.loginUser(body.email, body.password);
    res.json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError(400, "Refresh token required");
    const result = await authService.refreshTokens(refreshToken);
    res.json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logoutUser(refreshToken);
    res.json({ status: "success", message: "Logged out" });
  } catch (err) {
    next(err);
  }
});

export default router;
