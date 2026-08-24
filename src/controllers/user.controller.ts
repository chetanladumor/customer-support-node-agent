import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

export class UserController {
  static async listUsers(_req: Request, res: Response) {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { orders: true, invoices: true, conversations: true },
        },
      },
    });

    res.json({ success: true, data: users });
  }
}
