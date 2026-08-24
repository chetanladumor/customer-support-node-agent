import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../middleware/errorHandler.js";
import { ChatService } from "../services/chat.service.js";
import { RouterAgent } from "../agents/router.agent.js";

export class ChatController {
  static async listConversations(req: Request, res: Response) {
    const userId = req.user?.id; // Provided by authMiddleware
    if (!userId) throw new ApiError(401, "User ID is required");

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });

    res.json({ success: true, data: conversations });
  }

  static async getConversation(req: Request, res: Response) {
    const id = req.params.id as string;
    const userId = req.user?.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!conversation) throw new ApiError(404, "Conversation not found");
    if (conversation.userId !== userId) throw new ApiError(403, "Access denied");

    res.json({ success: true, data: conversation });
  }

  static async deleteConversation(req: Request, res: Response) {
    const id = req.params.id as string;
    const userId = req.user?.id;

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    
    if (!conversation) throw new ApiError(404, "Conversation not found");
    if (conversation.userId !== userId) throw new ApiError(403, "Access denied");

    await prisma.conversation.delete({ where: { id } });
    res.json({ success: true, data: null });
  }

  static async sendMessage(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "User ID is required");

    // The AI SDK sends the message array inside 'messages' for streaming, or content if it's the old format
    const messages = req.body.messages;
    const content = req.body.content || (messages ? messages[messages.length - 1].content : null);
    const conversationId = req.body.conversationId || req.body.id; // useChat sends id

    if (!content) throw new ApiError(400, "Message content is required");

    // 1. Get or create conversation
    const conversation = await ChatService.getOrCreateConversation(conversationId, userId);

    // 2. Save user message to database
    await ChatService.saveMessage({
      conversationId: conversation.id,
      role: "user",
      content,
    });

    // 3. Hand off to the Orchestration Engine for streaming
    const stream = await RouterAgent.handleIncomingMessageStream(
      conversation.id,
      userId,
      content
    );

    // 4. Stream the response back to the client using Vercel AI SDK Data Stream Protocol
    res.setHeader("x-conversation-id", conversation.id);
    stream.pipeUIMessageStreamToResponse(res);
  }
}
