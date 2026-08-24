import { Router } from "express";
import { ChatController } from "../controllers/chat.controller.js";

const router = Router();

// Chat routes are protected by authMiddleware in app.ts, so req.user is guaranteed
router.get("/chat/conversations", ChatController.listConversations);
router.get("/chat/conversations/:id", ChatController.getConversation);
router.delete("/chat/conversations/:id", ChatController.deleteConversation);
router.post("/chat/messages", ChatController.sendMessage);
router.post("/chat", ChatController.sendMessage);

export default router;
