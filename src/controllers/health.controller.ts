import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { AgentType } from "../shared/types.js";

export class HealthController {
  static async check(_req: Request, res: Response) {
    let dbStatus: "connected" | "disconnected" = "disconnected";

    try {
      // Fast query to verify database is alive
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch (err) {
      console.error("Health check DB error:", err);
    }

    res.json({
      success: true,
      data: {
        status: dbStatus === "connected" ? "ok" : "degraded",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: dbStatus,
        agentsAvailable: [
          "ROUTER",
          "SUPPORT",
          "ORDER",
          "BILLING",
          "FALLBACK",
        ] as AgentType[],
      },
    });
  }
}
