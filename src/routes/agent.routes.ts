import { Router } from "express";
import { AgentController } from "../controllers/agent.controller.js";

const router = Router();

router.get("/agents", AgentController.listAgents);
router.get("/agents/:type/capabilities", AgentController.getCapabilities);

export default router;
