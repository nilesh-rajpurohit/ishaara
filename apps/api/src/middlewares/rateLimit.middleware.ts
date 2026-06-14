import type { Request, Response, NextFunction } from "express";
import { createClient } from "redis";
import { AppError } from "./error.middleware";

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  identifier?: string;
}

export const rateLimit = (options: RateLimitOptions) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const key = `rate_limit:${options.identifier || req.path}:${ip}`;

      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, options.windowSeconds);
      }

      if (current > options.maxRequests) {
        throw new AppError(
          429,
          `Too many requests. Try again in ${options.windowSeconds} seconds.`
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export const authRateLimit = rateLimit({
  windowSeconds: 60,
  maxRequests: 10,
  identifier: "auth",
});

export const globalRateLimit = rateLimit({
  windowSeconds: 60,
  maxRequests: 100,
  identifier: "global",
});
