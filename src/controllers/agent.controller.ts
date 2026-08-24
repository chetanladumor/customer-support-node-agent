import type { Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { AgentService } from "../services/agent.service.js";

export class AgentController {
  static listAgents(_req: Request, res: Response) {
    const agents = AgentService.getAllAgents();
    res.json({ success: true, data: agents });
  }

  static getCapabilities(req: Request, res: Response) {
    const type = (req.params.type as string)?.toUpperCase();
    const agent = AgentService.getAgentByType(type || "");
    
    if (!agent) {
      throw new ApiError(404, `Agent of type ${type} not found`);
    }

    res.json({ success: true, data: agent });
  }
}
