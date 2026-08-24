import type { Request, Response, NextFunction } from "express";
import { ApiError } from "./errorHandler.js";

// ---------------------------------------------------------------------------
// Sliding-Window Rate Limiter (In-Memory)
// ---------------------------------------------------------------------------
// Replaces Hono rate limiter. Uses an in-memory Map to track request counts
// per IP address over a sliding window.
// ---------------------------------------------------------------------------

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function createRateLimiter(options: {
  maxRequests: number;
  windowMs: number;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Identify the client IP
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : undefined) ||
      (req.headers["x-real-ip"] as string) ||
      req.ip ||
      "local_client";

    const key = `rate_limit:${ip}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    // 2. Check or initialize the rate limit record
    if (!record || record.resetAt < now) {
      // New window
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
    } else {
      // Existing window
      record.count += 1;
      
      if (record.count > options.maxRequests) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        
        // Express uses res.set() for headers (Hono used c.header())
        res.set("Retry-After", String(retryAfter));
        
        return next(
          new ApiError(
            429,
            `Too Many Requests. Rate limit of ${options.maxRequests} requests per ${options.windowMs / 1000}s exceeded. Please try again in ${retryAfter}s.`
          )
        );
      }
    }

    // 3. Set informational headers for the client
    res.set("X-RateLimit-Limit", String(options.maxRequests));
    res.set(
      "X-RateLimit-Remaining",
      String(Math.max(0, options.maxRequests - (record ? record.count : 1)))
    );

    next();
  };
}
