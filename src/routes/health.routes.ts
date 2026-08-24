import { Router } from "express";
import { HealthController } from "../controllers/health.controller.js";

const router = Router();

// Notice: we don't need app.get() here, we just use router.get()
router.get("/health", HealthController.check);

export default router;
